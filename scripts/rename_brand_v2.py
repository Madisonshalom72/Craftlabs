"""Rename Handy Fix AI / Handy Fix → Craft Master Labs across user-visible surfaces.

Preserves domain / package / storage-prefix tokens (unchanged from previous rename script).
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


def rename(text: str) -> tuple[str, int]:
    before = text
    # Order: longer/qualified strings first
    text = text.replace("Handy Fix AI", "Craft Master Labs")
    text = text.replace("Handy Fix", "Craft Master Labs")
    text = text.replace("handyFix", "craftMasterLabs")
    text = text.replace("handy-fix", "craft-master-labs")
    return text, 1 if text != before else 0


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
