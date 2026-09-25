"""Create Stripe catalog for Craft Master Labs service tiers."""
import os
import stripe
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")
stripe.api_key = os.environ["STRIPE_SECRET_KEY"]

CATALOG = [
    {"id": "quick_fix",       "name": "Quick Fix Service (30-60 min)",  "amount": 7500,  "lookup_key": "quick_fix",       "tax_code": "txcd_99999999"},
    {"id": "standard_repair", "name": "Standard Repair (1-3 hrs)",       "amount": 15000, "lookup_key": "standard_repair", "tax_code": "txcd_99999999"},
    {"id": "major_project",   "name": "Major Project (Half day+)",       "amount": 32500, "lookup_key": "major_project",   "tax_code": "txcd_99999999"},
    {"id": "emergency_call",  "name": "Emergency Same-Day Service",      "amount": 50000, "lookup_key": "emergency_call",  "tax_code": "txcd_99999999"},
    # ---- Subscription: Contractor $50/month with 14-day free trial ----
    {
        "id": "contractor_monthly",
        "name": "Craft Master Labs · Contractor Plan",
        "amount": 5000,
        "lookup_key": "contractor_monthly",
        "tax_code": "txcd_10103001",  # SaaS
        "recurring": {"interval": "month"},
        "trial_period_days": 14,
    },
    # ---- Legacy: Handyman Pro (grandfathered users) ----
    {
        "id": "handyman_pro",
        "name": "Handyman Pro Membership (legacy)",
        "amount": 4900,
        "lookup_key": "handyman_pro_monthly",
        "tax_code": "txcd_10103001",  # SaaS
        "recurring": {"interval": "month"},
    },
]

def get_or_create_product(entry):
    for p in stripe.Product.list(active=True, limit=100).auto_paging_iter():
        md = p.to_dict().get("metadata", {})
        if md.get("emergent_product_id") == entry["id"]:
            return p
    return stripe.Product.create(
        name=entry["name"],
        tax_code=entry.get("tax_code", "txcd_99999999"),
        metadata={"managed_by": "emergent", "emergent_product_id": entry["id"]},
    )

for e in CATALOG:
    product = get_or_create_product(e)
    existing = stripe.Price.list(lookup_keys=[e["lookup_key"]], active=True, limit=1).data
    if existing and (existing[0].unit_amount != e["amount"] or existing[0].currency != "usd"):
        stripe.Price.modify(existing[0].id, active=False)
        existing = []
    if not existing:
        kwargs = dict(
            product=product.id,
            unit_amount=e["amount"],
            currency="usd",
            lookup_key=e["lookup_key"],
            transfer_lookup_key=True,
        )
        if e.get("recurring"):
            kwargs["recurring"] = e["recurring"]
        stripe.Price.create(**kwargs)
    label = "recurring/mo" if e.get("recurring") else "one-time"
    print(f"OK: {e['lookup_key']} -> ${e['amount']/100:.2f} ({label})")
print("Catalog ready.")
