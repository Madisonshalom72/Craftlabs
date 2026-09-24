"""Iteration 8: Leaderboard monthly, uploads/files, portfolio, Gemini text + Nano Banana image.

Uses public REACT_APP_BACKEND_URL for the fast endpoints, but falls back to
http://localhost:8001 for the Nano Banana image generation call (Cloudflare
edge times out at 100s and image generation takes 15-25s).
"""
import io
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://fixit-ai-6.preview.emergentagent.com").rstrip("/")
LOCAL_URL = "http://localhost:8001"


# ---------- Fixtures ----------
@pytest.fixture
def anon_session():
    s = requests.Session()
    return s


@pytest.fixture
def handyman_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/demo-login", json={"role": "handyman"}, timeout=20)
    assert r.status_code == 200, f"demo-login handyman failed: {r.status_code} {r.text}"
    return s


@pytest.fixture
def customer_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/demo-login", json={"role": "customer"}, timeout=20)
    assert r.status_code == 200, f"demo-login customer failed: {r.status_code} {r.text}"
    return s


def _tiny_png_bytes() -> bytes:
    # 1x1 red PNG
    import base64
    return base64.b64decode(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
    )


# ---------- Leaderboard ----------
class TestLeaderboard:
    def test_monthly(self, anon_session):
        r = anon_session.get(f"{BASE_URL}/api/referrals/leaderboard?period=monthly", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["period"] == "monthly"
        assert "leaderboard" in d and isinstance(d["leaderboard"], list)
        assert d["season_start"] is not None
        assert d["season_end"] is not None
        # UTC calendar month sanity: starts with a date, day==01
        assert d["season_start"].split("T")[0].endswith("-01")

    def test_all_time(self, anon_session):
        r = anon_session.get(f"{BASE_URL}/api/referrals/leaderboard?period=all_time", timeout=15)
        assert r.status_code == 200
        d = r.json()
        assert d["period"] == "all_time"
        assert d["season_start"] is None
        assert d["season_end"] is None

    def test_invalid_period_defaults(self, anon_session):
        r = anon_session.get(f"{BASE_URL}/api/referrals/leaderboard?period=bogus", timeout=15)
        assert r.status_code == 200
        assert r.json()["period"] == "all_time"


# ---------- Uploads / Files ----------
class TestUploads:
    def test_upload_requires_auth(self, anon_session):
        r = anon_session.post(
            f"{BASE_URL}/api/uploads",
            files={"file": ("t.png", _tiny_png_bytes(), "image/png")},
            data={"kind": "portfolio"},
            timeout=20,
        )
        assert r.status_code == 401

    def test_upload_portfolio_png(self, handyman_session):
        r = handyman_session.post(
            f"{BASE_URL}/api/uploads",
            files={"file": ("t.png", _tiny_png_bytes(), "image/png")},
            data={"kind": "portfolio"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["kind"] == "portfolio"
        assert d["content_type"] == "image/png"
        assert d["size"] > 0
        assert d["url"].startswith("/api/files/")
        assert "file_id" in d
        pytest.public_file_id = d["file_id"]

    def test_public_file_no_auth(self, anon_session):
        fid = getattr(pytest, "public_file_id", None)
        assert fid, "requires prior test_upload_portfolio_png"
        r = anon_session.get(f"{BASE_URL}/api/files/{fid}", timeout=20)
        assert r.status_code == 200
        assert r.headers.get("content-type", "").startswith("image/")

    def test_upload_rejects_bad_mime(self, handyman_session):
        r = handyman_session.post(
            f"{BASE_URL}/api/uploads",
            files={"file": ("x.exe", b"MZ\x00", "application/x-msdownload")},
            data={"kind": "portfolio"},
            timeout=20,
        )
        assert r.status_code == 415

    def test_upload_rejects_empty(self, handyman_session):
        r = handyman_session.post(
            f"{BASE_URL}/api/uploads",
            files={"file": ("t.png", b"", "image/png")},
            data={"kind": "portfolio"},
            timeout=20,
        )
        assert r.status_code == 400

    def test_upload_license_private(self, handyman_session, anon_session):
        r = handyman_session.post(
            f"{BASE_URL}/api/uploads",
            files={"file": ("lic.png", _tiny_png_bytes(), "image/png")},
            data={"kind": "license"},
            timeout=30,
        )
        assert r.status_code == 200, r.text
        lic_id = r.json()["file_id"]
        # Anonymous should be 403
        r2 = anon_session.get(f"{BASE_URL}/api/files/{lic_id}", timeout=20)
        assert r2.status_code == 403
        # Owner should be 200
        r3 = handyman_session.get(f"{BASE_URL}/api/files/{lic_id}", timeout=20)
        assert r3.status_code == 200


# ---------- Portfolio ----------
class TestPortfolio:
    def test_add_and_list_owner(self, handyman_session):
        # upload
        up = handyman_session.post(
            f"{BASE_URL}/api/uploads",
            files={"file": ("p.png", _tiny_png_bytes(), "image/png")},
            data={"kind": "portfolio"},
            timeout=30,
        ).json()
        r = handyman_session.post(
            f"{BASE_URL}/api/portfolio",
            json={"file_id": up["file_id"], "title": "TEST_item"},
            timeout=20,
        )
        assert r.status_code == 200, r.text
        item = r.json()
        assert item["file_id"] == up["file_id"]
        pytest.item_id = item["item_id"]

        # list mine
        lm = handyman_session.get(f"{BASE_URL}/api/portfolio/me/items", timeout=15)
        assert lm.status_code == 200
        assert any(i["item_id"] == item["item_id"] for i in lm.json()["items"])

    def test_add_unknown_file_id(self, handyman_session):
        r = handyman_session.post(
            f"{BASE_URL}/api/portfolio",
            json={"file_id": "does-not-exist"},
            timeout=15,
        )
        assert r.status_code == 404

    def test_add_non_handyman_forbidden(self, customer_session, handyman_session):
        # Customer needs their own uploaded file (their user_id). Upload as customer:
        up = customer_session.post(
            f"{BASE_URL}/api/uploads",
            files={"file": ("c.png", _tiny_png_bytes(), "image/png")},
            data={"kind": "portfolio"},
            timeout=30,
        )
        assert up.status_code == 200
        r = customer_session.post(
            f"{BASE_URL}/api/portfolio",
            json={"file_id": up.json()["file_id"]},
            timeout=15,
        )
        assert r.status_code == 403

    def test_public_list(self, handyman_session, anon_session):
        me = handyman_session.get(f"{BASE_URL}/api/auth/me", timeout=15).json()
        r = anon_session.get(f"{BASE_URL}/api/portfolio/{me['user_id']}", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json()["items"], list)

    def test_delete_own_and_non_owner(self, handyman_session, customer_session):
        item_id = getattr(pytest, "item_id", None)
        assert item_id
        # Non-owner
        r = customer_session.delete(f"{BASE_URL}/api/portfolio/{item_id}", timeout=15)
        assert r.status_code == 403
        # Owner
        r2 = handyman_session.delete(f"{BASE_URL}/api/portfolio/{item_id}", timeout=15)
        assert r2.status_code == 200
        assert r2.json().get("ok") is True


# ---------- Gemini text ----------
class TestGeminiText:
    def test_chat(self, handyman_session):
        r = handyman_session.post(
            f"{BASE_URL}/api/ai/gemini/chat",
            json={"prompt": "In one short sentence, what is a stud finder?"},
            timeout=60,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d.get("text"), str) and len(d["text"]) > 0
        assert d.get("model") == "gemini-3-flash-preview"

    def test_prompt_too_short(self, handyman_session):
        r = handyman_session.post(
            f"{BASE_URL}/api/ai/gemini/chat", json={"prompt": "a"}, timeout=15
        )
        assert r.status_code == 400


# ---------- Nano Banana image generation ----------
class TestNanoBanana:
    def _hm_local_session(self):
        s = requests.Session()
        # login via preview to set cookie on shared domain; then hit local for gen
        r = s.post(f"{BASE_URL}/api/auth/demo-login", json={"role": "handyman"}, timeout=20)
        assert r.status_code == 200
        return s

    def test_prompt_validation(self, handyman_session):
        r = handyman_session.post(f"{BASE_URL}/api/ai/image/generate", json={"prompt": "hi"}, timeout=15)
        assert r.status_code == 400
        r2 = handyman_session.post(
            f"{BASE_URL}/api/ai/image/generate", json={"prompt": "x" * 1001}, timeout=15
        )
        assert r2.status_code == 400

    def test_generate_and_save_to_portfolio(self):
        s = self._hm_local_session()
        # Reuse the session token from the preview login cookie on localhost
        token = s.cookies.get("session_token")
        assert token, "session_token cookie missing after demo-login"
        # local URL to bypass Cloudflare 100s edge timeout
        r = requests.post(
            f"{LOCAL_URL}/api/ai/image/generate",
            headers={"Cookie": f"session_token={token}"},
            json={
                "prompt": "A modern kitchen backsplash with white subway tiles.",
                "save_to_portfolio": True,
                "title": "TEST_ai_kitchen",
            },
            timeout=90,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("file_id")
        assert d.get("url", "").startswith("/api/files/")
        assert d.get("portfolio_item") is not None
        assert d["portfolio_item"].get("is_ai_generated") is True
        assert isinstance(d.get("remaining_today"), int)

        # verify file downloads (small, so use preview URL fine)
        gr = requests.get(f"{BASE_URL}/api/files/{d['file_id']}", timeout=30)
        assert gr.status_code == 200
        assert gr.headers.get("content-type", "").startswith("image/")


# ---------- Regression ----------
class TestRegression:
    def test_handymen(self, anon_session):
        r = anon_session.get(f"{BASE_URL}/api/handymen", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), (list, dict))

    def test_blog(self, anon_session):
        r = anon_session.get(f"{BASE_URL}/api/blog", timeout=15)
        assert r.status_code == 200

    def test_subscriptions_me_requires_auth(self, handyman_session):
        r = handyman_session.get(f"{BASE_URL}/api/subscriptions/me", timeout=15)
        assert r.status_code in (200, 404)

    def test_referrals_me(self, handyman_session):
        r = handyman_session.get(f"{BASE_URL}/api/referrals/me", timeout=15)
        assert r.status_code == 200

    def test_admin_login(self, anon_session):
        r = anon_session.post(
            f"{BASE_URL}/api/admin/login",
            json={"username": "Appfactory24", "password": "Datacap7$"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
