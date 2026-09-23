"""Iteration 6 — Admin auth, forgot/reset, multi-admin CRUD, analytics, email guardrails.

Runs against REACT_APP_BACKEND_URL. Uses root admin credentials from
/app/memory/test_credentials.md.
"""
import os
import re
import time
import uuid
from pathlib import Path

import pytest
import requests

BASE = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
ADMIN_USERNAME = "Appfactory24"
ADMIN_PASSWORD = "Datacap7$"
RECOVERY_EMAIL = "loans24funding@gmail.com"


# ---------- Fixtures ----------
@pytest.fixture(scope="module")
def admin_session():
    """Login as root admin — returns a session carrying the admin_token cookie."""
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    r = s.post(f"{BASE}/api/admin/login",
               json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
               timeout=15)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    body = r.json()
    assert body["ok"] is True
    assert body["role"] == "owner"
    return s


# ============ ADMIN LOGIN / SESSION ============
class TestAdminAuth:
    def test_login_bad_password_401(self):
        s = requests.Session()
        r = s.post(f"{BASE}/api/admin/login",
                   json={"username": ADMIN_USERNAME, "password": "wrong-password-xyz"},
                   timeout=10)
        assert r.status_code == 401, r.text

    def test_login_unknown_user_401(self):
        s = requests.Session()
        r = s.post(f"{BASE}/api/admin/login",
                   json={"username": f"ghost_{uuid.uuid4().hex[:6]}", "password": "whatever1"},
                   timeout=10)
        assert r.status_code == 401, r.text

    def test_login_success_sets_cookie(self, admin_session):
        # Cookie must be present after login
        cookies = admin_session.cookies.get_dict()
        assert "admin_token" in cookies, cookies
        # Token looks like a JWT (3 dot-separated b64 chunks)
        assert cookies["admin_token"].count(".") == 2

    def test_session_endpoint_authenticated(self, admin_session):
        r = admin_session.get(f"{BASE}/api/admin/session", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["authenticated"] is True
        assert d["username"] == ADMIN_USERNAME
        assert d["role"] == "owner"

    def test_session_endpoint_unauth(self):
        r = requests.get(f"{BASE}/api/admin/session", timeout=10)
        assert r.status_code == 200
        assert r.json() == {"authenticated": False}

    def test_admin_me_authenticated(self, admin_session):
        r = admin_session.get(f"{BASE}/api/admin/me", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d.get("is_admin") is True
        assert d.get("username") == ADMIN_USERNAME


# ============ ADMIN FORGOT / RESET ============
class TestAdminForgotReset:
    def test_forgot_generic_response_for_bad_identifier(self):
        r = requests.post(f"{BASE}/api/admin/forgot",
                          json={"identifier": f"nobody-{uuid.uuid4().hex[:6]}@example.com"},
                          timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["ok"] is True
        assert "reset link" in d["message"].lower()

    def test_forgot_valid_identifier_writes_token(self):
        # Read length of the recovery log BEFORE the request
        log = Path("/app/memory/admin_recovery.log")
        before = log.read_text() if log.exists() else ""
        r = requests.post(f"{BASE}/api/admin/forgot",
                          json={"identifier": RECOVERY_EMAIL},
                          timeout=10)
        assert r.status_code == 200
        # Give the fire-and-forget a moment
        time.sleep(0.5)
        after = log.read_text() if log.exists() else ""
        added = after[len(before):]
        assert "Token:" in added, "expected new reset token appended to log"
        # Extract token to verify it can be used
        m = re.search(r"Token:\s*([A-Za-z0-9_-]{20,})", added)
        assert m, f"no token extracted from log delta: {added!r}"
        self._token = m.group(1)

    def test_reset_password_invalid_token_400(self):
        r = requests.post(f"{BASE}/api/admin/reset-password",
                          json={"token": "not-a-real-token", "new_password": "xxxxxxxx"},
                          timeout=10)
        assert r.status_code == 400

    def test_reset_password_short_password_400(self):
        r = requests.post(f"{BASE}/api/admin/reset-password",
                          json={"token": "whatever", "new_password": "short"},
                          timeout=10)
        assert r.status_code == 400


# ============ ADMIN USERS CRUD ============
class TestAdminUsersCRUD:
    def test_list_admin_users_requires_auth(self):
        r = requests.get(f"{BASE}/api/admin/users", timeout=10)
        assert r.status_code == 401

    def test_list_admin_users_auth(self, admin_session):
        r = admin_session.get(f"{BASE}/api/admin/users", timeout=10)
        assert r.status_code == 200
        users = r.json()
        assert isinstance(users, list)
        assert any(u.get("username") == ADMIN_USERNAME for u in users), users

    def test_create_update_delete_reviewer(self, admin_session):
        uname = f"TEST_admin_{uuid.uuid4().hex[:6]}"
        # CREATE
        r = admin_session.post(f"{BASE}/api/admin/users",
                               json={"username": uname, "password": "TempPass123", "role": "reviewer"},
                               timeout=10)
        assert r.status_code == 200, r.text
        assert r.json()["ok"] is True

        # duplicate should 400
        r_dup = admin_session.post(f"{BASE}/api/admin/users",
                                   json={"username": uname, "password": "TempPass123", "role": "reviewer"},
                                   timeout=10)
        assert r_dup.status_code == 400

        # Verify present in list
        listed = admin_session.get(f"{BASE}/api/admin/users", timeout=10).json()
        assert any(u["username"] == uname for u in listed)

        # UPDATE: disable
        r_up = admin_session.patch(f"{BASE}/api/admin/users/{uname}",
                                   json={"disabled": True}, timeout=10)
        assert r_up.status_code == 200

        # New login attempt with the disabled admin → 403
        s = requests.Session()
        r_login = s.post(f"{BASE}/api/admin/login",
                         json={"username": uname, "password": "TempPass123"},
                         timeout=10)
        assert r_login.status_code == 403, r_login.text

        # DELETE
        r_del = admin_session.delete(f"{BASE}/api/admin/users/{uname}", timeout=10)
        assert r_del.status_code == 200
        assert r_del.json()["deleted"] == 1

        # Delete a second time → 200 deleted=0 (idempotent)
        r_del2 = admin_session.delete(f"{BASE}/api/admin/users/{uname}", timeout=10)
        assert r_del2.status_code == 200

    def test_cannot_delete_root_admin(self, admin_session):
        r = admin_session.delete(f"{BASE}/api/admin/users/{ADMIN_USERNAME}", timeout=10)
        assert r.status_code == 400

    def test_cannot_disable_root_admin(self, admin_session):
        r = admin_session.patch(f"{BASE}/api/admin/users/{ADMIN_USERNAME}",
                                json={"disabled": True}, timeout=10)
        assert r.status_code == 400


# ============ AUDIT LOG ============
class TestAdminAudit:
    def test_audit_list_requires_auth(self):
        r = requests.get(f"{BASE}/api/admin/audit", timeout=10)
        assert r.status_code == 401

    def test_audit_list_authenticated(self, admin_session):
        r = admin_session.get(f"{BASE}/api/admin/audit?limit=20", timeout=10)
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        # After the earlier login there should be at least one admin.login row
        actions = [row.get("action") for row in rows]
        assert any(a and a.startswith("admin.") for a in actions), actions


# ============ ANALYTICS ============
class TestAdminAnalytics:
    def test_analytics_requires_auth(self):
        r = requests.get(f"{BASE}/api/admin/analytics", timeout=10)
        assert r.status_code == 401

    def test_analytics_shape(self, admin_session):
        r = admin_session.get(f"{BASE}/api/admin/analytics", timeout=15)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("users", "subscriptions", "revenue", "jobs", "referrals", "pending_licenses"):
            assert k in d, f"missing analytics key {k}"
        assert isinstance(d["users"]["total"], int)
        assert isinstance(d["subscriptions"]["active"], int)
        assert isinstance(d["revenue"]["onetime_cents"], int)
        assert isinstance(d["jobs"]["total"], int)


# ============ EMAILER GUARDRAILS (unit) ============
class TestEmailerGuardrails:
    def test_rejects_forms(self):
        import sys
        sys.path.insert(0, "/app/backend")
        from emailer import _assert_safe_email
        with pytest.raises(ValueError, match="forms"):
            _assert_safe_email("Subj", "<form><input name=x></form>")

    def test_rejects_credential_ask(self):
        from emailer import _assert_safe_email
        with pytest.raises(ValueError):
            _assert_safe_email("Subj", "Please reply with your password so we can help.")

    def test_rejects_http_links(self):
        from emailer import _assert_safe_email
        with pytest.raises(ValueError, match="https"):
            _assert_safe_email("Subj", '<a href="http://example.com/x">click</a>')

    def test_rejects_shortener(self):
        from emailer import _assert_safe_email
        with pytest.raises(ValueError):
            _assert_safe_email("Subj", '<a href="https://bit.ly/abcd">click</a>')

    def test_rejects_anchor_text_impersonation(self):
        from emailer import _assert_safe_email
        with pytest.raises(ValueError):
            _assert_safe_email(
                "Subj",
                '<a href="https://evil.example/reset">https://accounts.google.com/reset</a>',
            )

    def test_allows_valid_reset_email(self):
        from emailer import tpl_admin_reset, _assert_safe_email
        subj, html = tpl_admin_reset(reset_url="https://fixit-ai-6.preview.emergentagent.com/admin/forgot?token=abc")
        _assert_safe_email(subj, html)


# ============ NEW PUBLIC ROUTES SMOKE ============
class TestPublicRoutes:
    """Frontend static pages are served by ingress; verify they respond 200."""

    @pytest.mark.parametrize("path", ["/terms", "/privacy", "/account/recover", "/admin/login", "/admin/forgot"])
    def test_frontend_route_reachable(self, path):
        r = requests.get(f"{BASE}{path}", timeout=15, allow_redirects=True)
        assert r.status_code == 200, f"{path}: {r.status_code}"

    def test_robots_txt(self):
        r = requests.get(f"{BASE}/robots.txt", timeout=10)
        assert r.status_code == 200
        body = r.text
        assert "Sitemap:" in body
        assert "Disallow: /admin" in body
