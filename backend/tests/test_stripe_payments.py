"""Retest Stripe payments checkout endpoint - iteration_2"""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://fixit-ai-6.preview.emergentagent.com").rstrip("/")
ORIGIN_URL = "https://fixit-ai-6.preview.emergentagent.com"

LOOKUP_KEYS = ["standard_repair", "quick_fix", "emergency_call"]


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.mark.parametrize("lookup_key", LOOKUP_KEYS)
def test_checkout_creates_session(api, lookup_key):
    resp = api.post(
        f"{BASE_URL}/api/payments/checkout",
        json={"lookup_key": lookup_key, "origin_url": ORIGIN_URL},
        timeout=30,
    )
    print(f"[{lookup_key}] status={resp.status_code} body={resp.text[:400]}")
    assert resp.status_code == 200, f"Expected 200, got {resp.status_code}: {resp.text}"
    data = resp.json()
    assert "checkout_url" in data
    assert "session_id" in data
    assert data["checkout_url"].startswith("https://checkout.stripe.com/"), data["checkout_url"]
    assert isinstance(data["session_id"], str) and len(data["session_id"]) > 0

    # Verify payment_transactions record exists via status endpoint
    session_id = data["session_id"]
    status_resp = api.get(f"{BASE_URL}/api/payments/status/{session_id}", timeout=30)
    print(f"[{lookup_key}] status endpoint: {status_resp.status_code} body={status_resp.text[:400]}")
    assert status_resp.status_code == 200, f"status endpoint failed: {status_resp.text}"
    sdata = status_resp.json()
    # payment_status should be 'unpaid' or status 'pending' or 'open'
    combined = str(sdata).lower()
    assert "pending" in combined or "unpaid" in combined or "open" in combined, sdata
