"""Regional rates (US state granularity) sourced from BLS-style public data.

Values are seeded into `db.pricing_rates` at startup if the row is missing.
Admin edits via `PUT /api/admin/pricing/rates/{state}` overwrite the row
and are picked up by all NEW quotes from that moment on. Signed contracts
lock the rate snapshot at booking time (see `pricing_snapshot` on jobs).

Labor $/hr is a blended handyman/general-trade rate (BLS 47-3011 cluster).
Materials markup is the platform's standard reseller margin on parts.
"""

# state → {labor_hourly_cents, materials_markup_pct}
STATE_RATES: dict[str, dict] = {
    "AL": {"labor_hourly_cents": 6500,  "materials_markup_pct": 15},
    "AK": {"labor_hourly_cents": 9500,  "materials_markup_pct": 20},
    "AZ": {"labor_hourly_cents": 7500,  "materials_markup_pct": 15},
    "AR": {"labor_hourly_cents": 6200,  "materials_markup_pct": 15},
    "CA": {"labor_hourly_cents": 11500, "materials_markup_pct": 18},
    "CO": {"labor_hourly_cents": 8500,  "materials_markup_pct": 15},
    "CT": {"labor_hourly_cents": 9500,  "materials_markup_pct": 18},
    "DE": {"labor_hourly_cents": 8000,  "materials_markup_pct": 15},
    "FL": {"labor_hourly_cents": 7500,  "materials_markup_pct": 15},
    "GA": {"labor_hourly_cents": 7000,  "materials_markup_pct": 15},
    "HI": {"labor_hourly_cents": 10500, "materials_markup_pct": 22},
    "ID": {"labor_hourly_cents": 7000,  "materials_markup_pct": 15},
    "IL": {"labor_hourly_cents": 8500,  "materials_markup_pct": 15},
    "IN": {"labor_hourly_cents": 7000,  "materials_markup_pct": 15},
    "IA": {"labor_hourly_cents": 7000,  "materials_markup_pct": 15},
    "KS": {"labor_hourly_cents": 6800,  "materials_markup_pct": 15},
    "KY": {"labor_hourly_cents": 6500,  "materials_markup_pct": 15},
    "LA": {"labor_hourly_cents": 6800,  "materials_markup_pct": 15},
    "ME": {"labor_hourly_cents": 7500,  "materials_markup_pct": 15},
    "MD": {"labor_hourly_cents": 9000,  "materials_markup_pct": 17},
    "MA": {"labor_hourly_cents": 10500, "materials_markup_pct": 18},
    "MI": {"labor_hourly_cents": 7500,  "materials_markup_pct": 15},
    "MN": {"labor_hourly_cents": 8500,  "materials_markup_pct": 15},
    "MS": {"labor_hourly_cents": 6000,  "materials_markup_pct": 15},
    "MO": {"labor_hourly_cents": 7000,  "materials_markup_pct": 15},
    "MT": {"labor_hourly_cents": 7000,  "materials_markup_pct": 15},
    "NE": {"labor_hourly_cents": 7000,  "materials_markup_pct": 15},
    "NV": {"labor_hourly_cents": 8000,  "materials_markup_pct": 15},
    "NH": {"labor_hourly_cents": 8500,  "materials_markup_pct": 15},
    "NJ": {"labor_hourly_cents": 10000, "materials_markup_pct": 18},
    "NM": {"labor_hourly_cents": 6800,  "materials_markup_pct": 15},
    "NY": {"labor_hourly_cents": 11500, "materials_markup_pct": 20},
    "NC": {"labor_hourly_cents": 7000,  "materials_markup_pct": 15},
    "ND": {"labor_hourly_cents": 7500,  "materials_markup_pct": 15},
    "OH": {"labor_hourly_cents": 7500,  "materials_markup_pct": 15},
    "OK": {"labor_hourly_cents": 6800,  "materials_markup_pct": 15},
    "OR": {"labor_hourly_cents": 8800,  "materials_markup_pct": 15},
    "PA": {"labor_hourly_cents": 8500,  "materials_markup_pct": 15},
    "RI": {"labor_hourly_cents": 9000,  "materials_markup_pct": 17},
    "SC": {"labor_hourly_cents": 6800,  "materials_markup_pct": 15},
    "SD": {"labor_hourly_cents": 6800,  "materials_markup_pct": 15},
    "TN": {"labor_hourly_cents": 6800,  "materials_markup_pct": 15},
    "TX": {"labor_hourly_cents": 7500,  "materials_markup_pct": 15},
    "UT": {"labor_hourly_cents": 7500,  "materials_markup_pct": 15},
    "VT": {"labor_hourly_cents": 8000,  "materials_markup_pct": 15},
    "VA": {"labor_hourly_cents": 8500,  "materials_markup_pct": 15},
    "WA": {"labor_hourly_cents": 9500,  "materials_markup_pct": 15},
    "WV": {"labor_hourly_cents": 6500,  "materials_markup_pct": 15},
    "WI": {"labor_hourly_cents": 7500,  "materials_markup_pct": 15},
    "WY": {"labor_hourly_cents": 7000,  "materials_markup_pct": 15},
    "DC": {"labor_hourly_cents": 11000, "materials_markup_pct": 18},
}

DEFAULT_STATE = "NY"


def price_item(hours: float, materials_cost_cents: int, quantity: int,
               labor_hourly_cents: int, materials_markup_pct: int) -> int:
    """Return the priced subtotal for a single line item, in cents."""
    labor_c = int(round(hours * labor_hourly_cents))
    materials_c = int(round(materials_cost_cents * (1 + materials_markup_pct / 100.0)))
    return max(0, quantity * (labor_c + materials_c))
