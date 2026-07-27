import React from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageSquare } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import Footer from '../components/Footer';

const Contact = () => {
  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
      <PublicNavbar />

      <main className="flex-grow w-full max-w-4xl mx-auto px-6 pt-24 pb-12 md:pt-28 md:pb-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto"
        >
          <div className="text-center mb-12">
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.18em] text-indigo-800 mb-4">
              Support · we reply within 24h
            </p>
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-indigo-600 text-white mb-6">
              <Mail size={40} />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">Get in Touch</h1>
            <p className="text-xl text-slate-600">
              Have questions or feedback? We'd love to hear from you.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 md:p-12 text-center">
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Support & Inquiries</h2>
            <p className="text-slate-600 mb-8 leading-relaxed">
              For all support requests, business inquiries, or if you just want to say hello, please
              email us directly. We aim to respond to all messages within 24 hours.
            </p>

            <a
              href="mailto:careers@applyright.com.ng"
              className="inline-flex w-full sm:w-auto items-center justify-center gap-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-4 sm:px-8 py-4 rounded-xl text-base sm:text-lg font-bold transition-colors break-all"
            >
              <MessageSquare size={20} className="shrink-0" />
              careers@applyright.com.ng
            </a>

            <div className="mt-10 pt-10 border-t border-slate-100 text-sm text-slate-500">
              ApplyRight Inc.
              <br />
              40 Parkview, Apamini Drive
              <br />
              Port Harcourt, Nigeria
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
