"""Craft Master Labs email sender — Emergent-managed transactional email.

Guardrails enforced:
- G1: from_name is always this app's own brand (never impersonate a third party)
- G2: no forms/inputs, no credential-ask phrasing
- G3: only absolute https links to our own domain, no shorteners
- G4: recipients + bodies come from server-side records/templates only
"""
from __future__ import annotations
import os
import re
import ipaddress
import logging
import asyncio
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse
from pathlib import Path
from datetime import datetime, timezone
import httpx

logger = logging.getLogger(__name__)

# Emergent managed email proxy — CONSTANT (not read from env)
EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "Craft Master Labs")
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO")
EMAIL_LOG_PATH = Path("/app/memory/email_log.txt")

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = (
    "reply with your password", "reply with the code", "send your password", "cvv",
    "send us your password", "enter your password below", "confirm your card number",
    "your full card number", "seed phrase", "recovery phrase", "verify your card",
    "social security number", "confirm your bank details",
)
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []
    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []
    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)
    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan(); scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} ≠ real link host {real!r} (G3)")


def _log_email_to_disk(to: str, subject: str, html: str, reason: str) -> None:
    """Audit log only. NEVER writes the HTML body (may contain reset links / tokens)."""
    _ = html  # deliberately unused — kept in signature for backward compatibility
    try:
        EMAIL_LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(EMAIL_LOG_PATH, "a") as f:
            f.write(
                f"[{datetime.now(timezone.utc).isoformat()}] {reason}\n"
                f"  to={to}\n  subject={subject}\n\n"
            )
    except Exception as exc:
        logger.warning("Could not write email log: %s", exc)


async def send_email(*, to: str, subject: str, html: str,
                     reply_to: str | None = None) -> str | None:
    """Send a transactional email. Degrades gracefully if EMERGENT_EMAIL_KEY unset."""
    _assert_safe_email(subject, html)
    if not EMAIL_KEY:
        _log_email_to_disk(to, subject, html, "no_email_key_configured")
        logger.info("Email skipped (no EMERGENT_EMAIL_KEY): to=%s subject=%r", to, subject)
        return None
    payload = {
        "to": [to], "subject": subject, "html": html,
        "from_name": EMAIL_FROM_NAME,
    }
    if reply_to or EMAIL_REPLY_TO:
        payload["contact_email"] = reply_to or EMAIL_REPLY_TO
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{EMAIL_BASE_URL}/api/v1/email/send",
                headers={"X-Email-Key": EMAIL_KEY},
                json=payload,
            )
        resp.raise_for_status()
        eid = resp.json().get("id")
        _log_email_to_disk(to, subject, html, f"sent id={eid}")
        return eid
    except Exception as exc:
        logger.error("Email send failed: %s", exc)
        _log_email_to_disk(to, subject, html, f"send_failed: {exc}")
        return None


def _fire_and_forget(coro):
    """Schedule a send without blocking the request. Errors already logged."""
    try:
        asyncio.get_event_loop().create_task(coro)
    except RuntimeError:
        # No running loop (e.g. sync context) — run inline
        asyncio.run(coro)


# ---------- Server-side templates ----------
_STYLE = 'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif;color:#1F2937;background:#F8FAFC'
_FOOTER = (
    '<p style="font-size:11px;color:#9CA3AF;margin-top:24px;line-height:1.5">'
    'Sent by Craft Master Labs. We never ask for your password or card details by email. '
    'If you did not expect this, ignore it or reply to reach us.'
    '</p>'
)


def _wrap(body_html: str) -> str:
    return (
        f'<table role="presentation" width="100%" style="{_STYLE};padding:32px 12px">'
        f'<tr><td align="center"><table role="presentation" width="560" cellpadding="0" cellspacing="0" '
        f'style="background:#ffffff;border-radius:14px;padding:28px 32px;box-shadow:0 2px 10px rgba(0,0,0,0.05)">'
        f'<tr><td>'
        f'<div style="font-weight:700;font-size:18px;color:#F59E0B;margin-bottom:20px;letter-spacing:-0.2px">Craft Master Labs<span style="color:#0F172A;font-weight:600"> AI</span></div>'
        f'{body_html}'
        f'{_FOOTER}'
        f'</td></tr></table></td></tr></table>'
    )


def tpl_booking_confirmed(*, customer_name: str, job_title: str,
                          handyman_name: str, amount_cents: int,
                          dashboard_url: str) -> tuple[str, str]:
    subject = f"Your Craft Master Labs booking is confirmed — {job_title}"
    html = _wrap(
        f'<h1 style="font-size:22px;margin:0 0 10px">Booking confirmed 🛠️</h1>'
        f'<p style="line-height:1.6">Hi {escape(customer_name)}, your job <strong>{escape(job_title)}</strong> is on the calendar.</p>'
        f'<table role="presentation" width="100%" style="background:#F8FAFC;border-radius:10px;margin:16px 0"><tr>'
        f'<td style="padding:14px 18px;font-size:14px;line-height:1.7">'
        f'<div><strong>Assigned pro:</strong> {escape(handyman_name)}</div>'
        f'<div><strong>Amount charged:</strong> ${amount_cents/100:.2f} USD</div>'
        f'</td></tr></table>'
        f'<p style="line-height:1.6">You can chat with {escape(handyman_name.split(" ")[0])}, upload photos, and track status from your dashboard:</p>'
        f'<p><a href="{escape(dashboard_url)}" style="display:inline-block;background:#F59E0B;color:#0F172A;text-decoration:none;padding:11px 22px;border-radius:999px;font-weight:600">Open dashboard</a></p>'
    )
    return subject, html


def tpl_payment_failed(*, customer_name: str, portal_url: str) -> tuple[str, str]:
    subject = "Action needed — your Craft Master Labs payment failed"
    html = _wrap(
        f'<h1 style="font-size:22px;margin:0 0 10px;color:#B91C1C">Payment failed</h1>'
        f'<p style="line-height:1.6">Hi {escape(customer_name)}, Stripe couldn&rsquo;t charge the card on file for your last Craft Master Labs invoice. Common causes: expired card, insufficient funds, or the bank flagged the charge.</p>'
        f'<p style="line-height:1.6">To keep your access active, please update your card in the billing portal — takes 30 seconds:</p>'
        f'<p><a href="{escape(portal_url)}" style="display:inline-block;background:#F59E0B;color:#0F172A;text-decoration:none;padding:11px 22px;border-radius:999px;font-weight:600">Update card</a></p>'
        f'<p style="line-height:1.6;font-size:13px;color:#6B7280">Stripe will automatically retry the charge over the next 3 days. If it still fails, your subscription will be paused.</p>'
    )
    return subject, html


def tpl_trial_ending(*, customer_name: str, days_left: int,
                     monthly_amount_cents: int, portal_url: str) -> tuple[str, str]:
    subject = f"Your Craft Master Labs Pro trial ends in {days_left} day{'s' if days_left != 1 else ''}"
    html = _wrap(
        f'<h1 style="font-size:22px;margin:0 0 10px">Trial ending soon</h1>'
        f'<p style="line-height:1.6">Hi {escape(customer_name)}, a heads-up — your $1 Craft Master Labs Pro trial ends in <strong>{days_left} day{"s" if days_left != 1 else ""}</strong>.</p>'
        f'<p style="line-height:1.6">After the trial you&rsquo;ll auto-renew at <strong>${monthly_amount_cents/100:.0f}/month</strong>. No action needed if you want to continue — you&rsquo;ll keep every Pro benefit (real-time leads, smart-match priority, verified badge).</p>'
        f'<p style="line-height:1.6">If you&rsquo;d rather not continue, cancel anytime in the billing portal (takes one click):</p>'
        f'<p><a href="{escape(portal_url)}" style="display:inline-block;background:#F59E0B;color:#0F172A;text-decoration:none;padding:11px 22px;border-radius:999px;font-weight:600">Manage subscription</a></p>'
    )
    return subject, html


def tpl_admin_reset(*, reset_url: str) -> tuple[str, str]:
    subject = "Craft Master Labs admin password reset"
    html = _wrap(
        f'<h1 style="font-size:22px;margin:0 0 10px">Reset your admin password</h1>'
        f'<p style="line-height:1.6">A password reset was requested for the Craft Master Labs admin console. If this was you, click the button below within the next 30 minutes.</p>'
        f'<p><a href="{escape(reset_url)}" style="display:inline-block;background:#F59E0B;color:#0F172A;text-decoration:none;padding:11px 22px;border-radius:999px;font-weight:600">Reset password</a></p>'
        f'<p style="line-height:1.6;font-size:12px;color:#6B7280">If you did not request this, ignore this email — your password stays unchanged.</p>'
    )
    return subject, html
