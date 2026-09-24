"""Rename CraftPulse AI → Handy Fix AI across user-visible surfaces.

Preserves (case-insensitive) only these specific tokens by pre-swapping to placeholders:
  - craftpulse.app / craftpulse.ai / craftpulse.twa (any subdomain)
  - @craftpulse.* / @demo.craftpulse.*  (emails)
  - -craftpulse (linkedin slug suffix)
  - "craftpulse/"  (storage path prefix in comments/strings)
Then swaps CraftPulse AI/CraftPulse/craftpulse, then restores placeholders.
"""
import re
from pathlib import Path

FILES = [
    "/app/PLAY_STORE_LISTING.md",
    "/app/TWA_PUBLISHING.md",
    "/app/memory/PRD.md",
    "/app/memory/test_credentials.md",
    "/app/backend/server.py",
    "/app/backend/emailer.py",
    "/app/backend/setup_stripe.py",
    "/app/backend/seed.py",
    "/app/backend/.env",
    "/app/frontend/src/pages/TermsOfService.jsx",
    "/app/frontend/src/pages/CategoryPage.jsx",
    "/app/frontend/src/pages/BlogArticle.jsx",
    "/app/frontend/src/pages/BlogIndex.jsx",
    "/app/frontend/src/pages/ResetPassword.jsx",
    "/app/frontend/src/pages/Landing.jsx",
    "/app/frontend/src/pages/PrivacyPolicy.jsx",
    "/app/frontend/src/pages/VerifyEmail.jsx",
    "/app/frontend/src/pages/AuthorPage.jsx",
    "/app/frontend/src/pages/AccountRecover.jsx",
    "/app/frontend/src/pages/Login.jsx",
    "/app/frontend/src/pages/ForgotPassword.jsx",
    "/app/frontend/src/pages/AdminDashboard.jsx",
    "/app/frontend/src/pages/AdminLogin.jsx",
    "/app/frontend/src/pages/AdminLicenses.jsx",
    "/app/frontend/src/components/InstallPrompt.jsx",
    "/app/frontend/src/components/CraftsmanOnboarding.jsx",
    "/app/frontend/src/components/ReferralPanel.jsx",
    "/app/frontend/src/components/Navbar.jsx",
    "/app/frontend/public/service-worker.js",
    "/app/frontend/public/index.html",
    "/app/frontend/public/manifest.json",
]

# Targeted PRESERVE patterns (in priority order). Each captures ONLY a domain/email/package token.
PRESERVE_PATTERNS = [
    re.compile(r"[\w.-]*craftpulse\.(?:app|ai|twa)\b", re.IGNORECASE),  # x.craftpulse.app, ai.craftpulse.twa
    re.compile(r"@[\w.-]*craftpulse\.[\w.-]+", re.IGNORECASE),           # @demo.craftpulse.ai
    re.compile(r"-craftpulse\b", re.IGNORECASE),                          # linkedin slug '-craftpulse'
    re.compile(r"craftpulse/", re.IGNORECASE),                            # storage path prefix
]


def rename(text: str) -> tuple[str, int]:
    placeholders: dict[str, str] = {}

    def stash(m):
        tok = f"\x00PP{len(placeholders)}\x00"
        placeholders[tok] = m.group(0)
        return tok

    guarded = text
    for pat in PRESERVE_PATTERNS:
        guarded = pat.sub(stash, guarded)

    before = guarded
    guarded = guarded.replace("CraftPulse AI", "Handy Fix AI")
    guarded = guarded.replace("CraftPulse", "Handy Fix")
    guarded = guarded.replace("craftPulse", "handyFix")
    guarded = guarded.replace("craftpulse", "handy-fix")
    changed = 1 if guarded != before else 0

    for tok, orig in placeholders.items():
        guarded = guarded.replace(tok, orig)
    return guarded, changed


def main():
    total = 0
    for fp in FILES:
        p = Path(fp)
        if not p.exists():
            print(f"MISS {fp}")
            continue
        orig = p.read_text()
        new, changed = rename(orig)
        if changed:
            p.write_text(new)
            total += 1
            print(f"OK   {fp}")
        else:
            print(f"NOOP {fp}")
    print(f"\nTotal changed: {total}")


if __name__ == "__main__":
    main()
