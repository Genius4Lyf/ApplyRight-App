import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, FileText, Cpu, Megaphone, UserCheck, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import logo from '../assets/logo/applyright-icon.png';

const LAST_UPDATED = 'May 31, 2026';
const SUPPORT_EMAIL = 'support@applyright.com.ng';

const PrivacyPolicy = () => {
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
              <Shield size={32} />
            </div>
            <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">Privacy Policy</h1>
            <p className="text-lg text-slate-600">Last Updated: {LAST_UPDATED}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8 md:p-12 space-y-10">
            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <FileText className="text-indigo-500" size={24} />
                1. Introduction
              </h2>
              <p className="text-slate-600 leading-relaxed">
                Welcome to ApplyRight ("we," "our," or "us"). ApplyRight is an AI-powered job
                application assistant available as a website and as an Android mobile application
                (together, the "Service"). We are committed to protecting your personal information
                and your right to privacy. This Privacy Policy explains what information we collect,
                how we use it, who we share it with, and the choices you have. If you have any
                questions, contact us at {SUPPORT_EMAIL}.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Eye className="text-indigo-500" size={24} />
                2. Information We Collect
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                We collect information that you provide directly, information generated as you use
                the Service, and information collected automatically by us and our third-party
                partners.
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-600">
                <li>
                  <strong>Account Information:</strong> Your name, email address, and password
                  (passwords are stored in hashed form).
                </li>
                <li>
                  <strong>Resume &amp; CV Content:</strong> The CVs and resumes you create or
                  upload, including your work history, education, skills, projects, and any other
                  details you enter. This content is processed by AI providers to generate
                  suggestions, scores, and documents (see Section 4).
                </li>
                <li>
                  <strong>Application Data:</strong> The jobs and applications you track within the
                  Service, including job descriptions, statuses, and notes.
                </li>
                <li>
                  <strong>Credit &amp; Activity Data:</strong> Your credit balance, transactions,
                  ad-watching activity (ad streaks), and referral activity used to operate our
                  credit-based freemium model.
                </li>
                <li>
                  <strong>Payment Data:</strong> If and when you purchase credits, payment is
                  handled by a third-party payment processor. We do not store full card numbers on
                  our servers.
                </li>
                <li>
                  <strong>Device &amp; Usage Data:</strong> Device identifiers (including the mobile
                  advertising ID on Android), IP address, app version, log data, and usage analytics
                  collected automatically.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Cpu className="text-indigo-500" size={24} />
                3. How We Use Your Information
              </h2>
              <ul className="list-disc pl-6 space-y-2 text-slate-600">
                <li>To create and manage your account and authenticate your sessions.</li>
                <li>
                  To provide core features: building CVs, analyzing resumes, generating bullets,
                  skills, summaries, cover letters, and ATS scores, and producing downloadable PDFs.
                </li>
                <li>
                  To operate the credit system, including credits earned from ads and referrals.
                </li>
                <li>To process purchases and maintain transaction records.</li>
                <li>
                  To serve advertisements in our Android app and reward ad engagement (see Section
                  5).
                </li>
                <li>To respond to your inquiries and provide customer support.</li>
                <li>To monitor usage, prevent fraud and abuse, and secure the Service.</li>
                <li>To send service-related and, where permitted, promotional communications.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Cpu className="text-indigo-500" size={24} />
                4. AI Processing of Your Content
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                ApplyRight uses third-party artificial intelligence providers — currently{' '}
                <strong>Google (Gemini)</strong> and, as a fallback, <strong>OpenAI</strong> — to
                power features such as content generation, resume analysis, and ATS scoring. When
                you use these features, the relevant portions of your resume and CV content are
                transmitted to the applicable AI provider to generate a response.
              </p>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                <p className="text-slate-600 text-sm">
                  These providers process your content under their own privacy and data-use terms.
                  We send only what is needed to fulfil your request. AI-generated output may be
                  inaccurate or incomplete, and you are responsible for reviewing it before use. Do
                  not include information you do not wish to be processed by these providers.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Megaphone className="text-indigo-500" size={24} />
                5. Advertising &amp; Tracking Technologies
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Our credit-based model lets you earn credits by engaging with advertisements in our
                Android app. Our website does not display ads. We work with the following partners,
                each of which may collect data under their own policies:
              </p>
              <div className="space-y-4">
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                  <h3 className="font-bold text-slate-900 mb-2">Google AdMob (Android App)</h3>
                  <p className="text-slate-600 text-sm">
                    In our Android app, rewarded video ads are served by Google AdMob. AdMob may
                    collect your device's advertising ID and related device data to serve and
                    measure ads. You can reset or limit ad personalization in your device settings.
                    Credits for rewarded ads are granted only after the ad network confirms a valid
                    view.
                  </p>
                </div>
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                  <h3 className="font-bold text-slate-900 mb-2">Google Analytics</h3>
                  <p className="text-slate-600 text-sm">
                    We use Google Analytics to understand how the Service is used. We operate Google
                    Consent Mode, which defaults advertising and analytics storage to "denied" until
                    consent is given where required.
                  </p>
                </div>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Lock className="text-indigo-500" size={24} />
                6. How We Share Your Information
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                We do not sell your personal information. We share it only with:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-600">
                <li>
                  <strong>Service providers</strong> that operate the Service on our behalf,
                  including AI providers (Google, OpenAI), our database and hosting providers, and
                  our payment processor.
                </li>
                <li>
                  <strong>Advertising partners</strong> (Google AdMob, Google Analytics) as
                  described in Section 5.
                </li>
                <li>
                  <strong>Legal and safety</strong> recipients where disclosure is required by law
                  or necessary to protect our rights, users, or the public.
                </li>
                <li>
                  <strong>Business transfers</strong>, such as a merger, acquisition, or sale of
                  assets, in which case we will notify you of any change.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">
                7. Data Retention &amp; Security
              </h2>
              <p className="text-slate-600 leading-relaxed">
                We retain your information for as long as your account is active or as needed to
                provide the Service, comply with our legal obligations, resolve disputes, and
                enforce our agreements. When you delete your account, we delete or anonymize your
                personal information within a reasonable period, except where retention is legally
                required. We use technical and organizational safeguards — including encrypted
                connections and hashed passwords — to protect your information, but no method of
                transmission or storage is completely secure.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                <UserCheck className="text-indigo-500" size={24} />
                8. Your Rights &amp; Choices
              </h2>
              <p className="text-slate-600 leading-relaxed mb-4">
                Depending on where you live, you may have the right to access, correct, export, or
                delete your personal information, and to object to or restrict certain processing.
                You can:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-slate-600">
                <li>Access and edit most of your data directly within your account.</li>
                <li>Request account and data deletion by contacting {SUPPORT_EMAIL}.</li>
                <li>Reset or limit your advertising ID through your device settings.</li>
                <li>Opt out of promotional emails using the unsubscribe link.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">9. Children's Privacy</h2>
              <p className="text-slate-600 leading-relaxed">
                The Service is not directed to children, and you must meet the minimum age of legal
                majority in your jurisdiction to use it. We do not knowingly collect personal
                information from children. If you believe a child has provided us information,
                please contact us so we can remove it.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">10. International Users</h2>
              <p className="text-slate-600 leading-relaxed">
                We and our service providers may process and store your information in countries
                other than your own. By using the Service, you understand that your information may
                be transferred to and processed in those locations, which may have data-protection
                laws different from yours.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">11. Changes to This Policy</h2>
              <p className="text-slate-600 leading-relaxed">
                We may update this Privacy Policy from time to time. When we do, we will revise the
                "Last Updated" date above and, where appropriate, provide additional notice. Your
                continued use of the Service after changes take effect constitutes acceptance of the
                updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">12. Contact Us</h2>
              <p className="text-slate-600 leading-relaxed">
                If you have questions or comments about this policy, or wish to exercise your
                privacy rights, you may email us at {SUPPORT_EMAIL}.
              </p>
            </section>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default PrivacyPolicy;
