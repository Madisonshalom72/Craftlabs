"""Tests for iteration_3 new features: booking chat, reviews, SSE real-time leads."""
import os
import time
import json
import threading
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
assert BASE_URL, "REACT_APP_BACKEND_URL must be set"
API = f"{BASE_URL}/api"


def _demo_login(role):
    r = requests.post(f"{API}/auth/demo-login", json={"role": role}, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    return d["session_token"], d["user"]


@pytest.fixture(scope="module")
def customer():
    tok, u = _demo_login("customer")
    return {"token": tok, "user": u, "h": {"Authorization": f"Bearer {tok}"}}


@pytest.fixture(scope="module")
def handyman():
    tok, u = _demo_login("handyman")
    return {"token": tok, "user": u, "h": {"Authorization": f"Bearer {tok}"}}


@pytest.fixture(scope="module")
def assigned_job(customer, handyman):
    # Create a job as customer
    payload = {
        "category": "Electrical",
        "title": "TEST_ Chat & Review flow",
        "description": "outlet not working",
        "urgency": "normal",
        "budget": 200,
        "location": "Brooklyn, NY",
    }
    r = requests.post(f"{API}/jobs", json=payload, headers=customer["h"], timeout=15)
    assert r.status_code == 200, r.text
    job = r.json()
    job_id = job["job_id"]

    # Handyman accepts
    r2 = requests.post(f"{API}/jobs/{job_id}/accept", headers=handyman["h"], timeout=15)
    assert r2.status_code == 200, r2.text
    j2 = r2.json()
    assert j2["assigned_handyman_id"] == handyman["user"]["user_id"]
    assert j2["status"] == "assigned"
    return j2


# ============ Booking Chat ============
class TestBookingChat:
    def test_chat_locked_before_assignment(self, customer):
        r = requests.post(f"{API}/jobs", json={
            "category": "Plumbing", "title": "TEST_ unassigned chat",
            "description": "leak", "urgency": "normal", "budget": 100,
            "location": "NYC"
        }, headers=customer["h"], timeout=15)
        assert r.status_code == 200
        jid = r.json()["job_id"]
        r2 = requests.post(f"{API}/jobs/{jid}/messages", json={"content": "hi"},
                           headers=customer["h"], timeout=15)
        assert r2.status_code == 400, r2.text

    def test_customer_and_handyman_can_message(self, customer, handyman, assigned_job):
        jid = assigned_job["job_id"]
        r1 = requests.post(f"{API}/jobs/{jid}/messages", json={"content": "hello from customer"},
                           headers=customer["h"], timeout=15)
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        assert d1["sender_role"] == "customer"
        assert "message_id" in d1

        r2 = requests.post(f"{API}/jobs/{jid}/messages", json={"content": "hello from handyman"},
                           headers=handyman["h"], timeout=15)
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["sender_role"] == "handyman"

    def test_get_messages_chronological(self, customer, assigned_job):
        jid = assigned_job["job_id"]
        r = requests.get(f"{API}/jobs/{jid}/messages", headers=customer["h"], timeout=15)
        assert r.status_code == 200
        msgs = r.json()
        assert len(msgs) >= 2
        times = [m["created_at"] for m in msgs]
        assert times == sorted(times)

    def test_non_participant_forbidden(self, assigned_job):
        # Try to fetch messages with no auth -> 401/403
        r = requests.get(f"{API}/jobs/{assigned_job['job_id']}/messages", timeout=15)
        assert r.status_code in (401, 403), r.text


# ============ Reviews ============
class TestReviews:
    def test_customer_can_review(self, customer, handyman, assigned_job):
        jid = assigned_job["job_id"]
        hid = handyman["user"]["user_id"]

        # Fetch handyman profile before
        r0 = requests.get(f"{API}/handymen/{hid}", timeout=15)
        assert r0.status_code == 200
        before = r0.json()
        before_count = before.get("reviews_count", 0)

        r = requests.post(f"{API}/jobs/{jid}/review",
                          json={"rating": 5, "comment": "great"},
                          headers=customer["h"], timeout=15)
        assert r.status_code == 200, r.text
        rev = r.json()
        assert rev["rating"] == 5

        # Profile updated
        r2 = requests.get(f"{API}/handymen/{hid}", timeout=15)
        after = r2.json()
        assert after["reviews_count"] == before_count + 1

        # List handyman reviews
        r3 = requests.get(f"{API}/handymen/{hid}/reviews", timeout=15)
        assert r3.status_code == 200
        reviews = r3.json()
        assert any(rr["job_id"] == jid for rr in reviews)

    def test_duplicate_review_400(self, customer, assigned_job):
        r = requests.post(f"{API}/jobs/{assigned_job['job_id']}/review",
                          json={"rating": 4, "comment": "again"},
                          headers=customer["h"], timeout=15)
        assert r.status_code == 400, r.text

    def test_invalid_rating_400(self, customer, handyman):
        # Create new job & assign for a clean review target
        payload = {"category": "Electrical", "title": "TEST_ bad rating",
                   "description": "x", "urgency": "normal", "budget": 100, "location": "NYC"}
        j = requests.post(f"{API}/jobs", json=payload, headers=customer["h"]).json()
        requests.post(f"{API}/jobs/{j['job_id']}/accept", headers=handyman["h"])
        r = requests.post(f"{API}/jobs/{j['job_id']}/review",
                          json={"rating": 6, "comment": "bad"},
                          headers=customer["h"], timeout=15)
        assert r.status_code in (400, 422), r.text

    def test_handyman_cannot_review(self, handyman, customer):
        payload = {"category": "Electrical", "title": "TEST_ handyman review",
                   "description": "x", "urgency": "normal", "budget": 100, "location": "NYC"}
        j = requests.post(f"{API}/jobs", json=payload, headers=customer["h"]).json()
        requests.post(f"{API}/jobs/{j['job_id']}/accept", headers=handyman["h"])
        r = requests.post(f"{API}/jobs/{j['job_id']}/review",
                          json={"rating": 5, "comment": "self"},
                          headers=handyman["h"], timeout=15)
        assert r.status_code == 403, r.text


# ============ Real-time SSE ============
class TestSSE:
    def test_sse_ready_and_receives_lead(self, customer, handyman):
        url = f"{API}/leads/stream?token={handyman['token']}"
        state = {"ready": False, "leads": [], "stop": False}

        def listen():
            with requests.get(url, stream=True, timeout=20) as resp:
                assert resp.status_code == 200
                for raw in resp.iter_lines(decode_unicode=True):
                    if state["stop"]:
                        return
                    if not raw or not raw.startswith("data: "):
                        continue
                    try:
                        obj = json.loads(raw[6:])
                    except Exception:
                        continue
                    if obj.get("ready"):
                        state["ready"] = True
                    elif "job_id" in obj:
                        state["leads"].append(obj)

        t = threading.Thread(target=listen, daemon=True)
        t.start()
        time.sleep(1.5)
        assert state["ready"], "SSE never sent ready"

        payload = {"category": "Electrical", "title": "TEST_ SSE match",
                   "description": "sparking outlet", "urgency": "urgent",
                   "budget": 300, "location": "Brooklyn, NY"}
        r = requests.post(f"{API}/jobs", json=payload, headers=customer["h"], timeout=15)
        assert r.status_code == 200
        new_job_id = r.json()["job_id"]

        # Wait up to 5s for the specific job to arrive
        deadline = time.time() + 5
        matched = None
        while time.time() < deadline:
            matched = next((l for l in state["leads"] if l.get("job_id") == new_job_id), None)
            if matched:
                break
            time.sleep(0.3)
        state["stop"] = True
        assert matched is not None, f"Target lead not received. Got: {[l.get('job_id') for l in state['leads']]}"
        assert "match_score" in matched
