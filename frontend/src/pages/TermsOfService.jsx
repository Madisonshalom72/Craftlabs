import Navbar from "@/components/Navbar";
import useSEO from "@/hooks/useSEO";
import { FileText } from "lucide-react";

export default function TermsOfService() {
  useSEO({
    title: "Terms of Service — Handy Fix AI",
    description: "The rules of the road for using Handy Fix AI's handyman marketplace, subscription services, and payments.",
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
            <p>Handy Fix AI (&ldquo;Handy Fix&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is an AI-assisted marketplace connecting homeowners with independent local craftsmen. By creating an account, posting a job, or providing services through Handy Fix, you agree to these Terms.</p>
          </section>
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">2. Marketplace role</h2>
            <p>Handy Fix is a technology platform. We are not a party to the service agreement between homeowners and craftsmen, and we do not perform the physical work ourselves. Craftsmen operate as independent contractors and are solely responsible for the quality, safety, licensing, insurance, and legality of the services they provide.</p>
          </section>
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">3. Accounts</h2>
            <p>You must be at least 18 to use Handy Fix. Sign-in is provided via Google OAuth. You are responsible for the security of the Google account linked to your Handy Fix profile. You may not create accounts using automated means or misrepresent your identity.</p>
          </section>
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">4. Payments</h2>
            <p>Payments are processed by Stripe, Inc. By making a payment, you also agree to Stripe&apos;s Terms of Service. Homeowners are charged at booking; craftsmen may subscribe to Handyman Pro for a recurring monthly fee (with a $1 trial). Subscriptions renew automatically until canceled. Refunds are handled case-by-case at our discretion and are generally issued if a service was not delivered as described.</p>
          </section>
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">5. Subscription trial &amp; cancellation</h2>
            <p>The $1 trial for Handyman Pro grants full access for 7 days. If you do not cancel before the trial ends, you authorize us to charge the then-current monthly rate ($49/mo). You can cancel anytime from the billing portal; access continues until the end of the paid period.</p>
          </section>
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">6. AI features</h2>
            <p>Our diagnostic and chat features use large language models. They provide estimates and suggestions only, not professional advice. Always verify safety-critical repairs (electrical, gas, structural) with a licensed professional in person.</p>
          </section>
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">7. Prohibited conduct</h2>
            <ul className="list-disc list-inside space-y-1 marker:text-amber-500">
              <li>Fraud, abuse, or bypassing platform payments to solicit off-platform</li>
              <li>Uploading unlawful, infringing, or harmful content</li>
              <li>Scraping, reverse-engineering, or automated access without written permission</li>
              <li>Impersonation or false representation of qualifications</li>
            </ul>
          </section>
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">8. Reviews</h2>
            <p>Reviews must reflect a genuine experience. We may remove reviews that are fake, defamatory, or that reveal personal information without consent.</p>
          </section>
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">9. Limitation of liability</h2>
            <p>To the maximum extent permitted by law, Handy Fix is not liable for indirect, incidental, or consequential damages. Our total liability for any claim is limited to the fees you paid us in the 90 days preceding the claim.</p>
          </section>
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">10. Changes</h2>
            <p>We may update these Terms. Material changes will be announced by email or in-app notification. Continued use after changes means you accept them.</p>
          </section>
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">11. Contact</h2>
            <p>Questions? Email <a href="mailto:loans24funding@gmail.com" className="text-amber-400 underline">loans24funding@gmail.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
