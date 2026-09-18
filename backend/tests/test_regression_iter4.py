"""Iteration 4 regression tests after code-review fixes.
Covers: health, handymen list, demo-login+me, onboarding, admin flow,
blog related, sitemap (API & static), push vapid, skills, match, jobs.
"""
import os
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
API = f"{BASE_URL}/api"


def _login(role):
    r = requests.post(f"{API}/auth/demo-login", json={"role": role}, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def customer():
    d = _login("customer")
    return {"token": d["session_token"], "user": d["user"],
            "h": {"Authorization": f"Bearer {d['session_token']}"}}


@pytest.fixture(scope="module")
def handyman():
    d = _login("handyman")
    return {"token": d["session_token"], "user": d["user"],
            "h": {"Authorization": f"Bearer {d['session_token']}"}}


# ---------- Basics ----------
def test_root_ok():
    r = requests.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    # response body should reference ok/status
    j = r.json()
    assert "ok" in str(j).lower() or j.get("status") in ("ok", "healthy") or "message" in j


def test_handymen_list_returns_approved():
    r = requests.get(f"{API}/handymen", timeout=20)
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) >= 12, f"expected >=12 approved handymen, got {len(data)}"
    # endpoint filters to approved-only server-side; verified flag exposed
    for h in data:
        assert h.get("verified") is True or h.get("verification_status") == "approved"


# ---------- Auth ----------
def test_demo_login_customer_returns_token_and_me(customer):
    assert "session_token" in customer["token"] or isinstance(customer["token"], str)
    r = requests.get(f"{API}/auth/me", headers=customer["h"], timeout=15)
    assert r.status_code == 200, r.text
    me = r.json()
    # Jamie Rivera expected
    assert "jamie" in me.get("name", "").lower() or me.get("email", "").startswith("demo.customer")


# ---------- Onboarding ----------
def test_handyman_onboarding_put(handyman):
    payload = {
        "onboarded": True,
        "license_type": "NYC Master Electrician",
        "license_number": "1234",
        "license_base64": "data:image/jpeg;base64,dGVzdA==",
        "agreement_accepted": True,
    }
    r = requests.put(f"{API}/handymen/me", json=payload, headers=handyman["h"], timeout=20)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("verification_status") in ("approved", "pending")


# ---------- Admin ----------
def test_admin_me_and_pending_and_bulk(customer):
    r = requests.get(f"{API}/admin/me", headers=customer["h"], timeout=15)
    assert r.status_code == 200, r.text
    assert r.json().get("is_admin") is True

    r2 = requests.get(f"{API}/admin/pending-craftsmen", params={"status": "pending"},
                      headers=customer["h"], timeout=15)
    assert r2.status_code == 200, r2.text
    assert isinstance(r2.json(), list)

    r3 = requests.post(f"{API}/admin/approve-bulk", json={"user_ids": []},
                       headers=customer["h"], timeout=15)
    assert r3.status_code == 200, r3.text
    body = r3.json()
    assert body.get("approved") == 0
    assert body.get("matched") == 0


# ---------- Blog ----------
def test_blog_related_windows():
    r = requests.get(f"{API}/blog/related/windows", timeout=30)
    assert r.status_code == 200, r.text
    data = r.json()
    # accept list or dict with items
    items = data if isinstance(data, list) else data.get("items") or data.get("related") or []
    assert len(items) == 5, f"expected 5 related items, got {len(items)}"
    for it in items:
        assert "position" in it, f"missing position field: {it}"


# ---------- Sitemap ----------
def test_api_sitemap_xml():
    r = requests.get(f"{API}/sitemap.xml", timeout=20)
    assert r.status_code == 200
    ct = r.headers.get("content-type", "")
    assert "xml" in ct, f"content-type={ct}"
    body = r.text
    assert "/services/" in body
    assert "/blog/" in body
    assert "/authors/" in body
    url_count = body.count("<url>")
    assert url_count >= 30, f"only {url_count} <url> entries"


def test_static_frontend_sitemap():
    r = requests.get(f"{BASE_URL}/sitemap.xml", timeout=20)
    assert r.status_code == 200
    body = r.text
    url_count = body.count("<url>")
    assert url_count == 39, f"static sitemap has {url_count} urls, expected 39"


# ---------- Push ----------
def test_push_vapid_public():
    r = requests.get(f"{API}/push/vapid-public", timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert isinstance(d.get("public_key"), str) and len(d["public_key"]) > 10


# ---------- Skills ----------
def test_skills_list():
    r = requests.get(f"{API}/skills", timeout=15)
    assert r.status_code == 200
    data = r.json()
    names = data if isinstance(data, list) else data.get("skills") or []
    # extract strings
    flat = [s if isinstance(s, str) else s.get("name") for s in names]
    distinct = set(x for x in flat if x)
    assert len(distinct) >= 40, f"only {len(distinct)} distinct skills"


# ---------- Job match with skills ----------
def test_match_with_skills(customer):
    payload = {
        "category": "Electrical",
        "title": "TEST_ match skills",
        "description": "smart home wiring",
        "urgency": "normal",
        "budget": 400,
        "location": "Brooklyn, NY",
    }
    r = requests.post(f"{API}/jobs", json=payload, headers=customer["h"], timeout=20)
    assert r.status_code == 200, r.text
    jid = r.json()["job_id"]

    r2 = requests.post(f"{API}/jobs/{jid}/match",
                       params={"max_distance": 15, "skills": "Electrical,Smart Home"},
                       headers=customer["h"], timeout=30)
    assert r2.status_code == 200, r2.text
    data = r2.json()
    matches = data if isinstance(data, list) else data.get("handymen") or data.get("matches") or []
    assert len(matches) > 0, "no matches returned"
    # matched_skills must be present on each match
    for m in matches:
        assert "matched_skills" in m, f"missing matched_skills: {m.keys()}"
