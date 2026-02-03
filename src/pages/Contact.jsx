import React from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

const Contact = () => {
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
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="max-w-2xl mx-auto"
                >
                    <div className="text-center mb-12">
                        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-indigo-600 text-white mb-6 shadow-xl shadow-indigo-200">
                            <Mail size={40} />
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">Get in Touch</h1>
                        <p className="text-xl text-slate-600">
                            Have questions or feedback? We'd love to hear from you.
                        </p>
                    </div>

                    <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-8 md:p-12 text-center">
                        <h2 className="text-2xl font-bold text-slate-900 mb-6">Support & Inquiries</h2>
                        <p className="text-slate-600 mb-8 leading-relaxed">
                            For all support requests, business inquiries, or if you just want to say hello, please email us directly. We aim to respond to all messages within 24 hours.
                        </p>

                        <a
                            href="mailto:support@applyright.com"
                            className="inline-flex items-center gap-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-8 py-4 rounded-xl text-lg font-bold transition-colors"
                        >
                            <MessageSquare size={20} />
                            support@applyright.com
                        </a>

                        <div className="mt-10 pt-10 border-t border-slate-100 text-sm text-slate-500">
                            ApplyRight Inc.<br />
                            123 Innovation Drive<br />
                            Tech City, TC 90210
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default Contact;
