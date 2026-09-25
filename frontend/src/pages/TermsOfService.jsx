import Navbar from "@/components/Navbar";
import useSEO from "@/hooks/useSEO";
import { FileText } from "lucide-react";

export default function TermsOfService() {
  useSEO({
    title: "Terms of Service — Craft Master Labs",
    description: "The rules of the road for using Craft Master Labs's handyman marketplace, subscription services, and payments.",
  });
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <div className="max-w-3xl mx-auto px-5 lg:px-8 py-14" data-testid="tos-page">
        <div className="ai-badge mb-3"><FileText className="w-3.5 h-3.5" /> Legal</div>
        <h1 className="font-heading font-bold text-4xl lg:text-5xl leading-tight mb-3">Terms of Service</h1>
        <p className="text-slate-400 mb-10">Last updated: February 2026</p>

        <div className="prose prose-invert prose-slate max-w-none space-y-6 text-slate-300">
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">1. Who we are</h2>
            <p>Craft Master Labs (&ldquo;Craft Master Labs&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is an AI-assisted marketplace connecting homeowners with independent local craftsmen. By creating an account, posting a job, or providing services through Craft Master Labs, you agree to these Terms.</p>
          </section>
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">2. Marketplace role</h2>
            <p>Craft Master Labs is a technology platform. We are not a party to the service agreement between homeowners and craftsmen, and we do not perform the physical work ourselves. Craftsmen operate as independent contractors and are solely responsible for the quality, safety, licensing, insurance, and legality of the services they provide.</p>
          </section>
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">3. Accounts</h2>
            <p>You must be at least 18 to use Craft Master Labs. Sign-in is provided via Google OAuth. You are responsible for the security of the Google account linked to your Craft Master Labs profile. You may not create accounts using automated means or misrepresent your identity.</p>
          </section>
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">4. Payments &amp; escrow</h2>
            <p>Payments are processed by Stripe, Inc. By making a payment, you also agree to Stripe&apos;s Terms of Service. When a homeowner accepts a craftsman&apos;s quote, the full quoted amount is charged immediately and held by Craft Master Labs in a platform-managed Stripe balance (&ldquo;escrow&rdquo;). Funds are released to the craftsman only after the homeowner approves the completed work &mdash; or automatically after 72 hours of no response. Craft Master Labs retains a flat 10% platform fee out of every completed job; the homeowner sees no add-on to the quoted price and the craftsman receives 90%. Refunds are routed back to the original payment method for the homeowner. Partial refunds and dispute resolutions are handled by our support team on a case-by-case basis.</p>
          </section>
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">5. Contractor subscription &amp; cancellation</h2>
            <p>Craftsmen may accept and be matched to paid jobs only while holding an active Craft Master Labs Contractor subscription. New contractors receive a 14-day free trial (card captured, no charge). After the trial we authorize the then-current monthly rate of $50 per month. You may cancel anytime from the billing portal; access continues until the end of the paid period. Failed payments trigger a 3-day grace period with automatic retry before your account downgrades to read-only. Contractors who joined Craft Master Labs before this plan launched are granted a first-month free comp on the new rate.</p>
          </section>
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">6. Payouts</h2>
            <p>Craftsmen receive payouts through Stripe Connect Express and must complete Stripe&apos;s KYC and bank/debit setup before they can be paid. Standard payouts land in the linked bank account in 2 business days at no cost. An optional &ldquo;Instant Payout&rdquo; option delivers funds to a linked debit card in approximately 30 minutes for a 1% Stripe pass-through fee. Craft Master Labs does not add any surcharge to payouts.</p>
          </section>
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">7. AI features</h2>
            <p>Our diagnostic and chat features use large language models. They provide estimates and suggestions only, not professional advice. Always verify safety-critical repairs (electrical, gas, structural) with a licensed professional in person.</p>
          </section>
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">8. Prohibited conduct</h2>
            <ul className="list-disc list-inside space-y-1 marker:text-amber-500">
              <li>Fraud, abuse, or bypassing platform payments to solicit off-platform</li>
              <li>Uploading unlawful, infringing, or harmful content</li>
              <li>Scraping, reverse-engineering, or automated access without written permission</li>
              <li>Impersonation or false representation of qualifications</li>
            </ul>
          </section>
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">9. Reviews</h2>
            <p>Reviews must reflect a genuine experience. We may remove reviews that are fake, defamatory, or that reveal personal information without consent.</p>
          </section>
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">10. Limitation of liability</h2>
            <p>To the maximum extent permitted by law, Craft Master Labs is not liable for indirect, incidental, or consequential damages. Our total liability for any claim is limited to the fees you paid us in the 90 days preceding the claim.</p>
          </section>
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">11. Changes</h2>
            <p>We may update these Terms. Material changes will be announced by email or in-app notification. Continued use after changes means you accept them.</p>
          </section>
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">12. Contact</h2>
            <p>Questions? Email <a href="mailto:loans24funding@gmail.com" className="text-amber-400 underline">loans24funding@gmail.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
