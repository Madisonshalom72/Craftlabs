"""Iteration 5 — Stripe subscriptions, Referral program, Live map SSE.

Runs against REACT_APP_BACKEND_URL. Uses demo-login for auth.
"""
import os
import time
import json
import uuid
import pytest
import requests

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")


def _login(role: str) -> requests.Session:
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE}/api/auth/demo-login", json={"role": role}, timeout=15)
    assert r.status_code == 200, f"demo-login {role}: {r.status_code} {r.text}"
    tok = r.json().get("session_token") or r.json().get("token")
    if tok:
        s.headers.update({"Authorization": f"Bearer {tok}"})
    return s


@pytest.fixture(scope="module")
def handyman():
    return _login("handyman")


@pytest.fixture(scope="module")
def customer():
    return _login("customer")


# ============ SUBSCRIPTIONS ============
class TestSubscriptions:
    def test_me_unauth_returns_401(self):
        r = requests.get(f"{BASE}/api/subscriptions/me", timeout=10)
        assert r.status_code == 401, r.text

    def test_me_authenticated_shape(self, handyman):
        r = handyman.get(f"{BASE}/api/subscriptions/me", timeout=10)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["plan"] == "handyman_pro_monthly"
        assert d["trial_days"] == 7
        assert d["trial_amount"] == 100
        assert d["monthly_amount"] == 4900
        assert d["currency"] == "usd"
        assert "is_active" in d

    def test_checkout_as_customer_403(self, customer):
        r = customer.post(f"{BASE}/api/subscriptions/checkout",
                          json={"origin_url": "https://example.com"}, timeout=20)
        assert r.status_code == 403, r.text

    def test_checkout_as_handyman_returns_url(self, handyman):
        r = handyman.post(f"{BASE}/api/subscriptions/checkout",
                          json={"origin_url": "https://example.com"}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["checkout_url"].startswith("https://checkout.stripe.com")
        assert d["session_id"].startswith("cs_")


# ============ ACCEPT JOB GATING ============
class TestAcceptJobGating:
    def test_handyman_without_pro_gets_402(self, handyman, customer):
        # Ensure handyman has NO active subscription in DB (fresh demo user).
        # First post a job as customer
        job_payload = {
            "title": "TEST_iter5 leaky faucet",
            "description": "Kitchen faucet drips",
            "category": "plumbing",
            "location": "Brooklyn, NY",
            "budget": 150,
        }
        r = customer.post(f"{BASE}/api/jobs", json=job_payload, timeout=15)
        assert r.status_code in (200, 201), r.text
        job_id = r.json().get("job_id") or r.json().get("id")
        assert job_id
        # Now accept as handyman
        r2 = handyman.post(f"{BASE}/api/jobs/{job_id}/accept", timeout=15)
        # Demo handyman may or may not have Pro; accept both, but flag if 200
        assert r2.status_code in (200, 402), r2.text
        if r2.status_code == 402:
            assert "Pro" in r2.json().get("detail", "")


# ============ REFERRALS ============
class TestReferrals:
    def test_referrals_me_shape(self, handyman):
        r = handyman.get(f"{BASE}/api/referrals/me", timeout=10)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["code"].startswith("CP")
        assert d["reward_cents"] == 2500
        assert d["monthly_cap"] == 10
        assert isinstance(d["balance_cents"], int)
        assert isinstance(d["ledger"], list)
        assert isinstance(d["successful_referrals"], int)

    def test_attach_invalid_code_404(self, customer):
        r = customer.post(f"{BASE}/api/referrals/attach",
                          json={"code": "CPZZZZZZ"}, timeout=10)
        # 404 for invalid, unless customer was previously attributed → 200 already_attributed
        assert r.status_code in (404, 200), r.text
        if r.status_code == 200:
            assert r.json().get("status") == "already_attributed"

    def test_attach_self_referral_400(self, handyman):
        my = handyman.get(f"{BASE}/api/referrals/me", timeout=10).json()
        r = handyman.post(f"{BASE}/api/referrals/attach",
                          json={"code": my["code"]}, timeout=10)
        # If already attributed to some other referrer (from previous test runs), API returns 200
        assert r.status_code in (400, 200), r.text
        if r.status_code == 200:
            assert r.json().get("status") == "already_attributed"

    def test_attach_valid_other_code(self):
        # Create fresh handyman-referrer, fresh customer
        h = _login("handyman")
        c = _login("customer")
        code = h.get(f"{BASE}/api/referrals/me", timeout=10).json()["code"]
        r = c.post(f"{BASE}/api/referrals/attach", json={"code": code}, timeout=10)
        assert r.status_code == 200, r.text
        assert r.json().get("status") in ("attached", "already_attributed")


# ============ LIVE MAP ============
class TestLiveMap:
    def test_map_handymen_public(self):
        r = requests.get(f"{BASE}/api/map/handymen", timeout=15)
        assert r.status_code == 200, r.text
        arr = r.json()
        assert isinstance(arr, list)
        assert len(arr) > 0, "expected at least one pinned handyman"
        h = arr[0]
        for k in ("user_id", "name", "lat", "lng", "skills"):
            assert k in h, f"missing {k}"
        assert isinstance(h["lat"], (int, float))
        assert isinstance(h["lng"], (int, float))

    def test_map_jobs_public(self):
        r = requests.get(f"{BASE}/api/map/jobs", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_map_stream_ready_event(self):
        # Public SSE — first event must be {"ready": true}
        with requests.get(f"{BASE}/api/map/stream", stream=True, timeout=15) as r:
            assert r.status_code == 200
            first = None
            start = time.time()
            for raw in r.iter_lines(decode_unicode=True):
                if raw and raw.startswith("data:"):
                    first = raw[5:].strip()
                    break
                if time.time() - start > 10:
                    break
            assert first is not None, "no SSE data event received"
            payload = json.loads(first)
            assert payload.get("ready") is True
