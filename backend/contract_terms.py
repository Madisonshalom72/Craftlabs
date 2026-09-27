"""Standard T&C template for Craft Master Labs contracts.

Edit this file freely — no code change required. The contract renderer
inlines the sections in order. Every heading is auto-numbered.

⚠️  This is a standard handyman-marketplace template. Get a lawyer review
    before high-volume launch, especially for NY / CA / EU customers.
"""

BRAND = "Craft Master Labs"
PLATFORM_FEE_PCT = 10
AUTO_RELEASE_HOURS = 72

TERMS_TEMPLATE = [
    {
        "heading": "Scope of Work",
        "body": (
            "The Contractor agrees to perform the services described in the itemized "
            "scope of work above at the Customer's premises. Any work outside the "
            "itemized list requires a separate written change order signed by both "
            "parties before the additional work begins."
        ),
    },
    {
        "heading": "Payment & Escrow",
        "body": (
            f"The Customer's payment is held in escrow by {BRAND} until the Contractor "
            "marks the work complete and the Customer approves the release. Craft "
            f"Master Labs retains a flat {PLATFORM_FEE_PCT}% platform fee on release; "
            "the remainder is paid to the Contractor's Stripe Connect account."
        ),
    },
    {
        "heading": "Auto-Release",
        "body": (
            f"If the Customer does not approve or dispute within {AUTO_RELEASE_HOURS} "
            "hours after the Contractor marks the job complete, funds automatically "
            "release to the Contractor. Both parties will receive email notification "
            "when auto-release fires."
        ),
    },
    {
        "heading": "Dispute Process",
        "body": (
            "Either party may open a dispute before auto-release. Escrow funds are "
            f"frozen while a {BRAND} admin reviews evidence from both sides. The "
            "admin's decision (release, refund, or split) is final for this "
            "transaction. Nothing here limits the parties' legal rights outside the "
            "platform."
        ),
    },
    {
        "heading": "Warranty & Liability",
        "body": (
            "The Contractor warrants the workmanship for 30 days after completion. "
            "Materials are covered per the manufacturer's warranty. The Contractor "
            "maintains liability insurance appropriate to the licensed trade. Neither "
            "party is liable for indirect or consequential damages."
        ),
    },
    {
        "heading": "Cancellation",
        "body": (
            "The Customer may cancel and receive a full refund any time before the "
            "Contractor arrives on site. After work begins, cancellation triggers a "
            "pro-rata charge for hours completed plus non-returnable materials."
        ),
    },
    {
        "heading": "Digital Signature",
        "body": (
            "Both parties consent to sign electronically under the U.S. E-SIGN Act. "
            "A typed name, timestamp, and IP address constitute a valid signature. "
            "The signed contract PDF is stored by Craft Master Labs and available on "
            "request from either party for 7 years."
        ),
    },
    {
        "heading": "Governing Law & Arbitration",
        "body": (
            "This agreement is governed by the laws of the Customer's state of "
            "residence. Disputes not resolved via the platform's admin process shall "
            "be settled by binding arbitration under AAA Consumer Arbitration Rules, "
            "with a right to small-claims court for amounts under $5,000."
        ),
    },
]


def render_terms_html() -> str:
    """Return the T&C as an HTML fragment for embedding in the contract PDF."""
    parts = ['<div class="terms">']
    for i, s in enumerate(TERMS_TEMPLATE, start=1):
        parts.append(f'<h3>{i}. {s["heading"]}</h3>')
        parts.append(f'<p>{s["body"]}</p>')
    parts.append("</div>")
    return "".join(parts)
