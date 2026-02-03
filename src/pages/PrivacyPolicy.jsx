import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Lock, Eye, FileText, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const PrivacyPolicy = () => {
    return (
        <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            <nav className="bg-white border-b border-slate-200">
                <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
                    <Link to="/" className="flex items-center gap-2 group text-slate-600 hover:text-indigo-600 transition-colors">
                        <ArrowLeft size={20} />
                        <span className="font-medium">Back to Home</span>
                    </Link>
                    <div className="font-bold text-xl tracking-tight text-indigo-600">ApplyRight</div>
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
                        <p className="text-lg text-slate-600">Last Updated: {new Date().toLocaleDateString()}</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12 space-y-10">
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <FileText className="text-indigo-500" size={24} />
                                1. Introduction
                            </h2>
                            <p className="text-slate-600 leading-relaxed">
                                Welcome to ApplyRight ("we," "our," or "us"). We are committed to protecting your personal information and your right to privacy. If you have any questions or concerns about this privacy notice, or our practices with regards to your personal information, please contact us.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Eye className="text-indigo-500" size={24} />
                                2. Information We Collect
                            </h2>
                            <p className="text-slate-600 leading-relaxed mb-4">
                                We collect personal information that you voluntarily provide to us when you register on the website, express an interest in obtaining information about us or our products and services, when you participate in activities on the website, or otherwise when you contact us.
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-slate-600">
                                <li>Personal Information Provided by You: Names, email addresses, passwords, and other similar information.</li>
                                <li>Resume Data: Information contained in the CVs/Resumes you upload for analysis.</li>
                                <li>Payment Data: We may collect data necessary to process your payment if you make purchases.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <Lock className="text-indigo-500" size={24} />
                                3. Use of Cookies and Tracking Technologies
                            </h2>
                            <p className="text-slate-600 leading-relaxed mb-4">
                                We use cookies and similar tracking technologies to access or store information. Specific information about how we use such technologies and how you can refuse certain cookies is set out in our Cookie Notice.
                            </p>
                            <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                                <h3 className="font-bold text-slate-900 mb-2">Google AdSense & DoubleClick Cookie</h3>
                                <p className="text-slate-600 text-sm">
                                    Google, as a third-party vendor, uses cookies to serve ads on our site. Google's use of the DoubleClick cookie enables it and its partners to serve ads to our users based on their visit to our site and/or other sites on the Internet. You may opt out of the use of the DoubleClick cookie for interest-based advertising by visiting user's <a href="https://adssettings.google.com" className="text-indigo-600 hover:underline" target="_blank" rel="noopener noreferrer">Ads Settings</a>.
                                </p>
                            </div>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">4. How We Use Your Information</h2>
                            <p className="text-slate-600 leading-relaxed">
                                We use personal information collected via our website for a variety of business purposes described below:
                            </p>
                            <ul className="list-disc pl-6 mt-4 space-y-2 text-slate-600">
                                <li>To facilitate account creation and logon process.</li>
                                <li>To send you marketing and promotional communications.</li>
                                <li>To fulfill and manage your orders.</li>
                                <li>To deliver and facilitate delivery of services to the user.</li>
                                <li>To respond to user inquiries/offer support to users.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Contact Us</h2>
                            <p className="text-slate-600 leading-relaxed">
                                If you have questions or comments about this policy, you may email us at support@applyright.com.
                            </p>
                        </section>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default PrivacyPolicy;
