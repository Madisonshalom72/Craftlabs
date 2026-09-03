"""Auto-generate /app/frontend/public/sitemap.xml from category definitions.
Run this whenever categories are added/removed."""
import os
import xml.sax.saxutils as sax
from datetime import datetime, timezone
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

# Use the same site URL as the frontend
SITE_URL = os.environ.get("SITE_URL") or "https://fixit-ai-6.preview.emergentagent.com"
SITE_URL = SITE_URL.rstrip("/")

# Import CATEGORY_CONTENT keys from the server module directly for a single source of truth
import importlib.util
spec = importlib.util.spec_from_file_location("_srv", Path(__file__).parent / "server.py")
# Load only the needed constants without booting the app
with open(Path(__file__).parent / "server.py") as f:
    src = f.read()
ns = {}
# Extract just the CATEGORY_CONTENT dict via a safe exec pattern
start = src.index("CATEGORY_CONTENT = {")
# Find the matching closing brace at the top level
depth = 0
i = src.index("{", start)
end = i
while i < len(src):
    ch = src[i]
    if ch == "{": depth += 1
    elif ch == "}":
        depth -= 1
        if depth == 0:
            end = i + 1
            break
    i += 1
exec(src[start:end], ns)
CATEGORY_SLUGS = list(ns["CATEGORY_CONTENT"].keys())

TODAY = datetime.now(timezone.utc).date().isoformat()

def url(loc, priority="0.8", changefreq="weekly"):
    return (
        "  <url>\n"
        f"    <loc>{sax.escape(loc)}</loc>\n"
        f"    <lastmod>{TODAY}</lastmod>\n"
        f"    <changefreq>{changefreq}</changefreq>\n"
        f"    <priority>{priority}</priority>\n"
        "  </url>"
    )

urls = [
    url(f"{SITE_URL}/",         priority="1.0", changefreq="daily"),
    url(f"{SITE_URL}/login",    priority="0.6", changefreq="monthly"),
    url(f"{SITE_URL}/blog",     priority="0.8", changefreq="weekly"),
]
for slug in CATEGORY_SLUGS:
    urls.append(url(f"{SITE_URL}/services/{slug}", priority="0.9", changefreq="weekly"))
for slug in CATEGORY_SLUGS:
    urls.append(url(f"{SITE_URL}/blog/{slug}",     priority="0.7", changefreq="monthly"))

xml = (
    '<?xml version="1.0" encoding="UTF-8"?>\n'
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + "\n".join(urls) +
    "\n</urlset>\n"
)

out_dir = Path("/app/frontend/public")
out_dir.mkdir(parents=True, exist_ok=True)

(out_dir / "sitemap.xml").write_text(xml)

robots = (
    "User-agent: *\n"
    "Allow: /\n"
    "Disallow: /dashboard\n"
    "Disallow: /handyman\n"
    "Disallow: /payment/\n"
    f"\nSitemap: {SITE_URL}/sitemap.xml\n"
)
(out_dir / "robots.txt").write_text(robots)

print(f"Wrote sitemap.xml with {len(urls)} URLs and robots.txt")
print(f"Site URL: {SITE_URL}")
print(f"Categories: {', '.join(CATEGORY_SLUGS)}")
