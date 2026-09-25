"""Iter 7: Email/password auth + coexistence with Google OAuth and Admin JWT (regression)."""
import os
import time
import uuid
import pytest
import requests
from pymongo import MongoClient

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://fixit-ai-6.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

_mongo = MongoClient(MONGO_URL)
_db = _mongo[DB_NAME]

# Test-fixture password used for signup/login flows in this suite only.
# Not a real credential — override via env if the test suite runs against a shared env.
TEST_PASSWORD = os.environ.get("TEST_FIXTURE_PASSWORD", "SuperSecret1")  # nosec B105


def _uniq_email():
    # Server lowercases emails, so we generate lowercase to match DB lookups.
    return f"test_{uuid.uuid4().hex[:10]}@example.com"


@pytest.fixture
def s():
    return requests.Session()


# ---------------- SIGNUP ----------------
def test_signup_creates_user_bcrypt_and_verify_token(s):
    email = _uniq_email()
    r = s.post(f"{API}/auth/signup", json={"email": email, "password": TEST_PASSWORD, "name": "Testy McTest", "role": "customer"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body.get("ok") is True
    assert "check your email" in body.get("message", "").lower()

    user = _db.users.find_one({"email": email})
    assert user is not None
    assert user.get("email_verified") is False
    ph = user.get("password_hash", "")
    assert ph.startswith("$2b$"), f"expected bcrypt hash, got {ph[:10]}"
    assert user.get("auth_provider") == "email"

    tok = _db.email_verify_tokens.find_one({"user_id": user["user_id"], "used": False})
    assert tok is not None


def test_signup_same_email_twice_returns_generic_no_enumeration(s):
    email = _uniq_email()
    r1 = s.post(f"{API}/auth/signup", json={"email": email, "password": TEST_PASSWORD, "name": "A"})
    assert r1.status_code == 200
    r2 = s.post(f"{API}/auth/signup", json={"email": email, "password": "OtherPass2", "name": "B"})
    assert r2.status_code == 200, r2.text
    assert "check your email" in r2.json().get("message", "").lower()


def test_signup_short_password_rejected(s):
    r = s.post(f"{API}/auth/signup", json={"email": _uniq_email(), "password": "short", "name": "X"})
    assert r.status_code == 400


def test_signup_invalid_email_rejected(s):
    r = s.post(f"{API}/auth/signup", json={"email": "not-an-email", "password": TEST_PASSWORD, "name": "X"})
    assert r.status_code == 400


# ---------------- VERIFY ----------------
def test_login_unverified_returns_403(s):
    email = _uniq_email()
    s.post(f"{API}/auth/signup", json={"email": email, "password": TEST_PASSWORD, "name": "A"})
    r = s.post(f"{API}/auth/login-email", json={"email": email, "password": TEST_PASSWORD})
    assert r.status_code == 403, r.text
    assert "verify" in r.json().get("detail", "").lower()


def test_verify_marks_email_verified_and_burns_token(s):
    email = _uniq_email()
    s.post(f"{API}/auth/signup", json={"email": email, "password": TEST_PASSWORD, "name": "A"})
    user = _db.users.find_one({"email": email})
    tok_doc = _db.email_verify_tokens.find_one({"user_id": user["user_id"], "used": False})
    token = tok_doc["token"]

    r = s.get(f"{API}/auth/verify", params={"token": token})
    assert r.status_code == 200, r.text
    assert r.json().get("ok") is True

    user_after = _db.users.find_one({"email": email})
    assert user_after["email_verified"] is True

    tok_after = _db.email_verify_tokens.find_one({"token": token})
    assert tok_after["used"] is True

    # Reuse should fail
    r2 = s.get(f"{API}/auth/verify", params={"token": token})
    assert r2.status_code == 400


def test_verify_invalid_token_400(s):
    r = s.get(f"{API}/auth/verify", params={"token": "not-a-real-token"})
    assert r.status_code == 400


# ---------------- LOGIN ----------------
def _signup_and_verify(s, email, password=TEST_PASSWORD, name="Verified User", role="customer"):
    s.post(f"{API}/auth/signup", json={"email": email, "password": password, "name": name, "role": role})
    user = _db.users.find_one({"email": email})
    tok = _db.email_verify_tokens.find_one({"user_id": user["user_id"], "used": False})
    s.get(f"{API}/auth/verify", params={"token": tok["token"]})
    return user


def test_login_success_sets_httponly_cookie_and_me_strips_hash(s):
    email = _uniq_email()
    _signup_and_verify(s, email)
    r = s.post(f"{API}/auth/login-email", json={"email": email, "password": TEST_PASSWORD})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["user"]["email"] == email
    assert "password_hash" not in body["user"], "password_hash leaked in login response!"

    # cookie set
    ck = r.cookies.get("session_token") or s.cookies.get("session_token")
    assert ck, "session_token cookie not set"

    # /auth/me strips password_hash
    r2 = s.get(f"{API}/auth/me")
    assert r2.status_code == 200, r2.text
    me = r2.json()
    assert me["email"] == email
    assert "password_hash" not in me, "password_hash leaked in /auth/me!"


def test_login_wrong_password_generic_401(s):
    email = _uniq_email()
    _signup_and_verify(s, email)
    r = s.post(f"{API}/auth/login-email", json={"email": email, "password": "WrongPassword9"})
    assert r.status_code == 401
    assert "invalid" in r.json().get("detail", "").lower()


def test_login_unknown_email_same_generic_401(s):
    r = s.post(f"{API}/auth/login-email", json={"email": _uniq_email(), "password": "WhateverPass9"})
    assert r.status_code == 401
    assert "invalid" in r.json().get("detail", "").lower()


# ---------------- FORGOT / RESET ----------------
def test_forgot_generic_response_regardless(s):
    r1 = s.post(f"{API}/auth/forgot-password", json={"email": _uniq_email()})
    assert r1.status_code == 200
    assert "if that email" in r1.json().get("message", "").lower()

    email = _uniq_email()
    _signup_and_verify(s, email)
    r2 = s.post(f"{API}/auth/forgot-password", json={"email": email})
    assert r2.status_code == 200
    assert r1.json()["message"] == r2.json()["message"]


def test_reset_password_updates_hash_and_invalidates_sessions(s):
    email = _uniq_email()
    _signup_and_verify(s, email)
    # Login to create a session
    r = s.post(f"{API}/auth/login-email", json={"email": email, "password": TEST_PASSWORD})
    assert r.status_code == 200
    # Confirm /me works
    assert s.get(f"{API}/auth/me").status_code == 200

    # Trigger forgot
    s.post(f"{API}/auth/forgot-password", json={"email": email})
    user = _db.users.find_one({"email": email})
    doc = _db.password_reset_tokens.find_one({"user_id": user["user_id"], "used": False})
    assert doc is not None
    token = doc["token"]

    r2 = s.post(f"{API}/auth/reset-password", json={"token": token, "new_password": "BrandNewP@ss1"})
    assert r2.status_code == 200, r2.text

    # Old session should now be invalidated
    r3 = s.get(f"{API}/auth/me")
    assert r3.status_code == 401, f"session should be invalidated after reset, got {r3.status_code}"

    # Old password fails, new works
    s2 = requests.Session()
    assert s2.post(f"{API}/auth/login-email", json={"email": email, "password": TEST_PASSWORD}).status_code == 401
    assert s2.post(f"{API}/auth/login-email", json={"email": email, "password": "BrandNewP@ss1"}).status_code == 200

    # Token reuse blocked
    r4 = s2.post(f"{API}/auth/reset-password", json={"token": token, "new_password": "Another1234"})
    assert r4.status_code == 400


# ---------------- RATE LIMIT ----------------
def test_login_rate_limit_429_after_5_fails():
    # Fresh session (fresh cookies but rate-limit is IP-based, may leak from other tests)
    email = _uniq_email()
    sess = requests.Session()
    _signup_and_verify(sess, email)
    codes = []
    for _ in range(8):
        r = requests.post(f"{API}/auth/login-email", json={"email": email, "password": "WrongPass99"})
        codes.append(r.status_code)
    assert 429 in codes, f"expected 429 in rate-limit run, got {codes}"


# ---------------- REGRESSION: OAuth session endpoint & admin ----------------
def test_oauth_session_endpoint_unchanged():
    # POST with bogus session_id → should return 401 (endpoint still exists)
    r = requests.post(f"{API}/auth/session", json={"session_id": "not-a-real-session"})
    assert r.status_code in (400, 401, 500), f"OAuth session endpoint response {r.status_code} - {r.text[:200]}"
    # Not 404 means route is still registered
    assert r.status_code != 404


def test_admin_login_regression():
    r = requests.post(f"{API}/admin/login", json={"username": "Appfactory24", "password": "Datacap7$"})
    assert r.status_code == 200, r.text
    assert r.cookies.get("admin_token")


def test_demo_login_regression():
    r = requests.post(f"{API}/auth/demo-login", json={"role": "customer"})
    assert r.status_code == 200, r.text
    assert r.json()["user"]["role"] == "customer"
