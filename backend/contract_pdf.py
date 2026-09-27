"""Contract PDF renderer (reportlab).

Produces a one-page, itemized handyman contract with T&C, payment schedule,
escrow terms, and signature blocks. Stored to Emergent Object Storage after
generation; a URL is returned so the frontend can render it inline.
"""
from __future__ import annotations
import io
from datetime import datetime, timezone

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak,
)

from contract_terms import TERMS_TEMPLATE, PLATFORM_FEE_PCT, AUTO_RELEASE_HOURS, BRAND

ACCENT = colors.HexColor("#F59E0B")   # amber
INK    = colors.HexColor("#0F172A")   # dark slate
MUTED  = colors.HexColor("#64748B")


def _styles():
    ss = getSampleStyleSheet()
    ss.add(ParagraphStyle(name="Brand", parent=ss["Normal"], fontName="Helvetica-Bold",
                          fontSize=14, textColor=ACCENT))
    ss.add(ParagraphStyle(name="H1", parent=ss["Normal"], fontName="Helvetica-Bold",
                          fontSize=22, spaceAfter=4, textColor=INK))
    ss.add(ParagraphStyle(name="H2", parent=ss["Normal"], fontName="Helvetica-Bold",
                          fontSize=12, spaceAfter=6, spaceBefore=14, textColor=INK))
    ss.add(ParagraphStyle(name="H3", parent=ss["Normal"], fontName="Helvetica-Bold",
                          fontSize=10, spaceAfter=3, spaceBefore=8, textColor=INK))
    ss.add(ParagraphStyle(name="Body", parent=ss["Normal"], fontName="Helvetica",
                          fontSize=9, leading=13, textColor=INK))
    ss.add(ParagraphStyle(name="Muted", parent=ss["Normal"], fontName="Helvetica",
                          fontSize=8, textColor=MUTED))
    ss.add(ParagraphStyle(name="Sig", parent=ss["Normal"], fontName="Helvetica-Oblique",
                          fontSize=10, textColor=INK))
    return ss


def _money(cents: int) -> str:
    return f"${cents/100:,.2f}"


def render_contract_pdf(*, job: dict, customer: dict, contractor: dict | None,
                        items: list[dict], total_cents: int,
                        pricing_snapshot: dict,
                        signatures: dict | None = None) -> bytes:
    """Return the contract PDF as bytes. `signatures` may include either or both
    of {"customer": {typed_name, signed_at, ip}, "contractor": {...}}."""
    ss = _styles()
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=LETTER,
                            topMargin=0.6 * inch, bottomMargin=0.6 * inch,
                            leftMargin=0.7 * inch, rightMargin=0.7 * inch)
    story = []

    # Header
    story.append(Paragraph(BRAND, ss["Brand"]))
    story.append(Paragraph("Service Agreement", ss["H1"]))
    header_meta = (
        f'Contract ID <b>{job.get("job_id", "")}</b> · '
        f'Issued {datetime.now(timezone.utc).strftime("%B %-d, %Y")}'
    )
    story.append(Paragraph(header_meta, ss["Muted"]))
    story.append(Spacer(1, 10))

    # Parties
    story.append(Paragraph("Parties", ss["H2"]))
    parties_data = [
        [
            Paragraph("<b>Customer</b>", ss["Body"]),
            Paragraph("<b>Contractor</b>", ss["Body"]),
        ],
        [
            Paragraph(
                f"{customer.get('name', '—')}<br/>{customer.get('email', '')}",
                ss["Body"],
            ),
            Paragraph(
                (f"{contractor.get('name', '—')}<br/>{contractor.get('email', '')}"
                 if contractor else "To be assigned"),
                ss["Body"],
            ),
        ],
    ]
    t = Table(parties_data, colWidths=[3.5 * inch, 3.5 * inch])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("PADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t)

    # Scope
    story.append(Paragraph("Scope of Work", ss["H2"]))
    scope_head = ["#", "Description", "Category", "Qty", "Unit", "Subtotal"]
    scope_rows = [scope_head]
    for i, it in enumerate(items, start=1):
        scope_rows.append([
            str(i),
            Paragraph(it.get("label", ""), ss["Body"]),
            it.get("category", ""),
            str(it.get("quantity", 1)),
            _money(it.get("unit_price_cents", 0)),
            _money(it.get("subtotal_cents", 0)),
        ])
    scope_rows.append(["", "", "", "", Paragraph("<b>Total</b>", ss["Body"]),
                       Paragraph(f"<b>{_money(total_cents)}</b>", ss["Body"])])
    scope_table = Table(scope_rows, colWidths=[0.3 * inch, 2.7 * inch, 1.1 * inch,
                                               0.5 * inch, 1.1 * inch, 1.3 * inch])
    scope_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0F172A")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("ALIGN", (3, 1), (-1, -1), "RIGHT"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -2), [colors.white, colors.HexColor("#F8FAFC")]),
        ("BACKGROUND", (0, -1), (-1, -1), colors.HexColor("#FEF3C7")),
        ("BOX", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#E2E8F0")),
        ("PADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(scope_table)

    # Pricing snapshot
    story.append(Paragraph("Pricing Basis (locked at signing)", ss["H2"]))
    story.append(Paragraph(
        f'State {pricing_snapshot.get("state", "—")} · '
        f'Labor {_money(pricing_snapshot.get("labor_hourly_cents", 0))}/hr · '
        f'Materials markup {pricing_snapshot.get("materials_markup_pct", 0)}%',
        ss["Body"],
    ))

    # Payment schedule
    story.append(Paragraph("Payment Schedule", ss["H2"]))
    story.append(Paragraph(
        f"On contract signing the Customer funds {_money(total_cents)} into escrow "
        f"held by {BRAND}. The Contractor may not begin billable work until escrow "
        f"is funded. After the Contractor marks the job complete, funds auto-release "
        f"to the Contractor in {AUTO_RELEASE_HOURS} hours unless the Customer approves "
        f"or disputes sooner. {BRAND} retains a flat {PLATFORM_FEE_PCT}% platform fee.",
        ss["Body"],
    ))

    # Terms & Conditions
    story.append(PageBreak())
    story.append(Paragraph("Terms & Conditions", ss["H1"]))
    for i, s in enumerate(TERMS_TEMPLATE, start=1):
        story.append(Paragraph(f"{i}. {s['heading']}", ss["H3"]))
        story.append(Paragraph(s["body"], ss["Body"]))

    # Signatures
    story.append(Spacer(1, 18))
    story.append(Paragraph("Signatures", ss["H2"]))
    sig_data = [["Customer", "Contractor"]]
    sig_row = []
    for party in ("customer", "contractor"):
        s = (signatures or {}).get(party) or {}
        if s.get("typed_name"):
            when = s.get("signed_at", "")[:19].replace("T", " ")
            block = (
                f'<font face="Helvetica-Oblique" size="12" color="#0F172A">'
                f'{s["typed_name"]}</font><br/>'
                f'<font size="7" color="#64748B">Signed {when} UTC · '
                f'IP {s.get("ip", "—")}</font>'
            )
        else:
            block = '<font size="8" color="#64748B">— awaiting signature —</font>'
        sig_row.append(Paragraph(block, ss["Body"]))
    sig_data.append(sig_row)
    st = Table(sig_data, colWidths=[3.5 * inch, 3.5 * inch])
    st.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("PADDING", (0, 0), (-1, -1), 10),
        ("MINROWHEIGHTS", (0, 1), (-1, 1), 48),
    ]))
    story.append(st)

    story.append(Spacer(1, 10))
    story.append(Paragraph(
        f"Generated by {BRAND} · This contract is enforceable under the U.S. E-SIGN Act.",
        ss["Muted"],
    ))

    doc.build(story)
    return buf.getvalue()
