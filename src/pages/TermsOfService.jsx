import React from 'react';
import { motion } from 'framer-motion';
import { Scale, FileText, AlertCircle, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const TermsOfService = () => {
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
                            <Scale size={32} />
                        </div>
                        <h1 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">Terms of Service</h1>
                        <p className="text-lg text-slate-600">Last Updated: {new Date().toLocaleDateString()}</p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 md:p-12 space-y-10">
                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <FileText className="text-indigo-500" size={24} />
                                1. Agreement to Terms
                            </h2>
                            <p className="text-slate-600 leading-relaxed">
                                These Terms of Service constitute a legally binding agreement made between you, whether personally or on behalf of an entity ("you") and ApplyRight ("we," "us" or "our"), concerning your access to and use of the ApplyRight website as well as any other media form, media channel, mobile website or mobile application related, linked, or otherwise connected thereto (collectively, the "Site").
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Intellectual Property Rights</h2>
                            <p className="text-slate-600 leading-relaxed">
                                Unless otherwise indicated, the Site is our proprietary property and all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics on the Site (collectively, the "Content") and the trademarks, service marks, and logos contained therein (the "Marks") are owned or controlled by us or licensed to us, and are protected by copyright and trademark laws.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">3. User Representations</h2>
                            <p className="text-slate-600 leading-relaxed mb-4">
                                By using the Site, you represent and warrant that:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-slate-600">
                                <li>All registration information you submit will be true, accurate, current, and complete.</li>
                                <li>You will maintain the accuracy of such information and promptly update such registration information as necessary.</li>
                                <li>You have the legal capacity and you agree to comply with these Terms of Service.</li>
                                <li>You are not a minor in the jurisdiction in which you reside.</li>
                            </ul>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4 flex items-center gap-2">
                                <AlertCircle className="text-indigo-500" size={24} />
                                4. Disclaimers
                            </h2>
                            <p className="text-slate-600 leading-relaxed">
                                The content on our site is provided for general information only. It is not intended to amount to advice on which you should rely. You must obtain professional or specialist advice before taking, or refraining from, any action on the basis of the content on our site.
                            </p>
                        </section>

                        <section>
                            <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Contact Us</h2>
                            <p className="text-slate-600 leading-relaxed">
                                In order to resolve a complaint regarding the Site or to receive further information regarding use of the Site, please contact us at support@applyright.com.
                            </p>
                        </section>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default TermsOfService;
