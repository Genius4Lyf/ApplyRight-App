import React from 'react';
import { motion } from 'framer-motion';
import { Scale, FileText, AlertCircle, Coins, Cpu, Ban, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo/applyright-icon.png';

const LAST_UPDATED = 'May 31, 2026';
const SUPPORT_EMAIL = 'support@applyright.com.ng';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 group text-slate-600 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="font-medium">Back to Home</span>
          </Link>
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="ApplyRight" className="h-7 w-auto" />
            <span className="font-brand text-base sm:text-lg font-semibold text-slate-900">
              ApplyRight
            </span>
          </Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-100 text-indigo-600 mb-6">
              <Scale size={32} />
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">Terms of Service</h1>
            <p className="text-lg text-slate-600">Last Updated: {LAST_UPDATED}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 md:p-12 space-y-10">
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="text-indigo-500" size={24} />
                1. Agreement to Terms
              </h2>
              <p className="text-slate-600 leading-relaxed">
                These Terms of Service ("Terms") constitute a legally binding agreement between you
                and ApplyRight ("we," "us," or "our") governing your access to and use of the
                ApplyRight website and Android mobile application, and all related features and
                content (collectively, the "Service"). By creating an account or using the Service,
                you agree to these Terms. If you do not agree, do not use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                2. Eligibility &amp; Accounts
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                By using the Service, you represent that:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-600">
                <li>You have reached the age of legal majority in your jurisdiction.</li>
                <li>The registration information you provide is true, accurate, and current.</li>
                <li>
                  You will keep your account credentials secure and are responsible for all activity
                  under your account.
                </li>
                <li>
                  You will not create multiple or fraudulent accounts to abuse credits, referrals,
                  or advertisements.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Cpu className="text-indigo-500" size={24} />
                3. The Service &amp; AI-Generated Content
              </h2>
              <p className="text-slate-600 leading-relaxed">
                ApplyRight provides tools to build CVs, analyze resumes, track applications, and
                generate content such as bullet points, skills, summaries, cover letters, and ATS
                scores using third-party artificial intelligence providers. AI-generated content is
                produced automatically and may be inaccurate, incomplete, or unsuitable for your
                situation. You are solely responsible for reviewing, editing, and verifying any
                output before relying on or submitting it. ApplyRight does not guarantee any job
                interview, offer, or employment outcome.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Coins className="text-indigo-500" size={24} />
                4. Credits, Ads &amp; Purchases
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-slate-600">
                <li>
                  The Service operates on a credit-based freemium model. Certain AI and PDF actions
                  consume credits.
                </li>
                <li>
                  Credits may be earned by engaging with advertisements (Google AdMob rewarded
                  videos in our Android app only; the website does not display ads) and through
                  referrals, or purchased where available. Credits earned from ads are granted only
                  after the ad network confirms a valid view.
                </li>
                <li>
                  Credits have no monetary value, are not transferable, cannot be redeemed for cash,
                  and may expire or be adjusted. Except where required by law, purchased credits are
                  non-refundable.
                </li>
                <li>
                  We may modify credit costs, earning rates, and ad availability at any time.
                  Abusing the credit, referral, or advertising systems — including using bots,
                  automation, or fraudulent views — may result in forfeiture of credits and account
                  termination.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                5. Your Content &amp; License
              </h2>
              <p className="text-slate-600 leading-relaxed">
                You retain ownership of the resumes, CVs, and other content you submit ("Your
                Content"). You grant us a limited, non-exclusive license to host, store, process,
                and transmit Your Content — including to third-party AI providers — solely to
                operate and provide the Service to you. You represent that you have the right to
                submit Your Content and that it does not infringe any third party's rights.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                6. Intellectual Property Rights
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Except for Your Content, the Service and all of its source code, software, designs,
                text, graphics, trademarks, and logos (the "Content" and "Marks") are owned or
                licensed by us and protected by intellectual property laws. You may not copy,
                modify, distribute, or create derivative works from the Service without our prior
                written permission.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Ban className="text-indigo-500" size={24} />
                7. Prohibited Activities
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">You agree not to:</p>
              <ul className="list-disc pl-6 space-y-2 text-slate-600">
                <li>Use the Service for any unlawful, fraudulent, or harmful purpose.</li>
                <li>
                  Attempt to gain unauthorized access to the Service, other accounts, or our
                  systems.
                </li>
                <li>
                  Manipulate, automate, or defraud the credit, referral, or advertising systems.
                </li>
                <li>
                  Reverse engineer, scrape, or interfere with the operation or security of the
                  Service.
                </li>
                <li>
                  Upload content that is unlawful, infringing, or that you do not have the right to
                  submit.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <AlertCircle className="text-indigo-500" size={24} />
                8. Disclaimers
              </h2>
              <p className="text-slate-600 leading-relaxed">
                The Service and all content, including AI-generated output, are provided "as is" and
                "as available" without warranties of any kind, whether express or implied. We do not
                warrant that the Service will be uninterrupted, error-free, or secure, or that any
                content is accurate or suitable. Nothing in the Service constitutes professional,
                legal, or career advice; you should obtain professional advice before acting on it.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Limitation of Liability</h2>
              <p className="text-slate-600 leading-relaxed">
                To the maximum extent permitted by law, ApplyRight and its affiliates will not be
                liable for any indirect, incidental, special, consequential, or punitive damages, or
                for any loss of profits, data, goodwill, or job opportunities, arising from or
                related to your use of the Service. Our total liability for any claim relating to
                the Service will not exceed the greater of the amount you paid us in the twelve
                months before the claim or USD 50.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">10. Indemnification</h2>
              <p className="text-slate-600 leading-relaxed">
                You agree to indemnify and hold harmless ApplyRight and its affiliates from any
                claims, damages, losses, and expenses (including reasonable legal fees) arising out
                of your use of the Service, Your Content, or your violation of these Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">11. Termination</h2>
              <p className="text-slate-600 leading-relaxed">
                We may suspend or terminate your access to the Service at any time, with or without
                notice, if you violate these Terms or misuse the Service. You may stop using the
                Service and request account deletion at any time. Provisions that by their nature
                should survive termination — including intellectual property, disclaimers,
                limitation of liability, and indemnification — will survive.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">12. Changes to These Terms</h2>
              <p className="text-slate-600 leading-relaxed">
                We may modify these Terms from time to time. When we do, we will update the "Last
                Updated" date above. Your continued use of the Service after changes take effect
                constitutes acceptance of the revised Terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">13. Governing Law</h2>
              <p className="text-slate-600 leading-relaxed">
                These Terms are governed by and construed in accordance with the laws applicable in
                our principal place of business, without regard to conflict-of-law principles. Any
                disputes will be subject to the exclusive jurisdiction of the competent courts in
                that location.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">14. Contact Us</h2>
              <p className="text-slate-600 leading-relaxed">
                To resolve a complaint or request further information about the Service, contact us
                at {SUPPORT_EMAIL}.
              </p>
            </section>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default TermsOfService;
