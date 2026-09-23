import Navbar from "@/components/Navbar";
import useSEO from "@/hooks/useSEO";
import { Lock } from "lucide-react";

export default function PrivacyPolicy() {
  useSEO({
    title: "Privacy Policy — CraftPulse AI",
    description: "How CraftPulse AI collects, uses, and protects your personal information across the marketplace, AI features, and payments.",
  });
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Navbar />
      <div className="max-w-3xl mx-auto px-5 lg:px-8 py-14" data-testid="privacy-page">
        <div className="ai-badge mb-3"><Lock className="w-3.5 h-3.5" /> Legal</div>
        <h1 className="font-heading font-bold text-4xl lg:text-5xl leading-tight mb-3">Privacy Policy</h1>
        <p className="text-slate-400 mb-10">Last updated: February 2026</p>

        <div className="prose prose-invert prose-slate max-w-none space-y-6 text-slate-300">
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">What we collect</h2>
            <ul className="list-disc list-inside space-y-1 marker:text-amber-500">
              <li><strong>Account:</strong> name, email, profile picture from Google when you sign in</li>
              <li><strong>Marketplace:</strong> job descriptions, photos you upload for AI diagnosis, chat messages</li>
              <li><strong>Payments:</strong> card details are handled entirely by Stripe — we never see or store card numbers. We store Stripe customer IDs and receipt metadata.</li>
              <li><strong>Location:</strong> optional GPS coordinates (only if you consent when onboarding as a craftsman). All map pins are fuzzed to a ~1 km radius before display.</li>
              <li><strong>Usage:</strong> pages visited, buttons clicked, referral codes used, for product improvement.</li>
              <li><strong>Cookies:</strong> a session cookie for login, an admin cookie if you access the admin console.</li>
            </ul>
          </section>
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">How we use it</h2>
            <ul className="list-disc list-inside space-y-1 marker:text-amber-500">
              <li>Run the marketplace: matching, messaging, payments, reviews.</li>
              <li>Provide AI features: your photos and text are sent to our LLM provider (Anthropic Claude via Emergent) to generate diagnostics.</li>
              <li>Send transactional emails: booking confirmations, trial reminders, payment issues. We do not send marketing without your consent.</li>
              <li>Fraud &amp; abuse prevention.</li>
            </ul>
          </section>
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">Who we share with</h2>
            <ul className="list-disc list-inside space-y-1 marker:text-amber-500">
              <li><strong>Stripe</strong> — payments &amp; subscriptions</li>
              <li><strong>Google</strong> — sign-in only (we receive your basic profile; Google does not receive job details)</li>
              <li><strong>Emergent</strong> — hosting + managed LLM/email routing</li>
              <li><strong>The other party in a booking</strong> — your name and job details are shared with the matched craftsman (or the homeowner). Exact coordinates are never shared before you accept a job.</li>
              <li><strong>Law enforcement</strong> — only if legally compelled or to protect safety.</li>
            </ul>
            <p>We do not sell your personal data.</p>
          </section>
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">Retention</h2>
            <p>Account data is kept while your account is active. Job records are retained for 7 years for tax and dispute-resolution purposes. You can request deletion of your account and identifiable job data at any time via the contact below.</p>
          </section>
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">Your rights</h2>
            <p>Depending on your jurisdiction, you may have rights to access, correct, export, or delete your personal data (GDPR, CCPA, etc.). Email us and we will respond within 30 days.</p>
          </section>
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">Security</h2>
            <p>Traffic is encrypted with HTTPS. Passwords (for admin accounts) are stored as bcrypt hashes. Card details are tokenized by Stripe and never touch our servers. No system is perfect — please report any suspected issue to us immediately.</p>
          </section>
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">Children</h2>
            <p>CraftPulse is not intended for anyone under 18.</p>
          </section>
          <section>
            <h2 className="font-heading text-2xl font-bold text-white">Contact</h2>
            <p>Privacy questions or data requests: <a href="mailto:loans24funding@gmail.com" className="text-amber-400 underline">loans24funding@gmail.com</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
