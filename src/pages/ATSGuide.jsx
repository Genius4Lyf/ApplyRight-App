import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FileText, CheckCircle, Smartphone, Zap, ArrowRight, XCircle, AlertTriangle, Search, Eye } from 'lucide-react';
import PublicNavbar from '../components/PublicNavbar';
import { Link } from 'react-router-dom';

const ATSGuide = () => {

    useEffect(() => {
        window.scrollTo(0, 0);
    }, []);

    const fadeIn = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
    };

    return (
        <div className="min-h-screen bg-white font-sans text-slate-900">
            <PublicNavbar />

            {/* Hero Section */}
            <section className="relative pt-32 pb-24 lg:pt-48 lg:pb-32 overflow-hidden bg-slate-50">
                {/* Background Elements */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-60"></div>
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-sky-100/50 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 opacity-60"></div>

                <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={fadeIn}
                    >
                        <span className="inline-block py-1 px-3 rounded-full bg-indigo-100 text-indigo-700 text-sm font-bold mb-6">
                            Ultimate Guide & Walkthrough
                        </span>
                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-8 leading-tight">
                            How to Beat the <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-sky-500">Resume Robots</span>
                        </h1>
                        <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
                            75% of resumes are rejected by Applicant Tracking Systems (ATS) before they’re ever seen by a human. Here is exactly how to fix yours.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* What is ATS? - Visual Explanation */}
            <section className="py-24 bg-white relative">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true }}
                        variants={fadeIn}
                        className="text-center mb-16"
                    >
                        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Inside the "Black Hole"</h2>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                            Understanding how the system works is the first step to beating it.
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Step 1 */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="bg-slate-50 rounded-2xl p-8 border border-slate-100"
                        >
                            <div className="w-16 h-16 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 text-indigo-600">
                                <FileText size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">1. Parsing</h3>
                            <p className="text-slate-600">
                                The ATS strips your resume of all design. It looks for text. If you used columns, graphics, or weird fonts, your resume turns into digital gibberish.
                            </p>
                        </motion.div>

                        {/* Step 2 */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="bg-slate-50 rounded-2xl p-8 border border-slate-100"
                        >
                            <div className="w-16 h-16 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 text-indigo-600">
                                <Search size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">2. Keyword Matching</h3>
                            <p className="text-slate-600">
                                The recruiter sets required skills (e.g., "React", "Project Management"). The system scans your parsed text. No keywords? 0% match score.
                            </p>
                        </motion.div>

                        {/* Step 3 */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.3 }}
                            className="bg-slate-50 rounded-2xl p-8 border border-slate-100"
                        >
                            <div className="w-16 h-16 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 text-indigo-600">
                                <Eye size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">3. Ranking</h3>
                            <p className="text-slate-600">
                                Candidates are ranked by score. Recruiters usually only look at the top 10-20%. The rest are auto-rejected without a glance.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Do's and Don'ts */}
            <section className="py-24 bg-slate-900 text-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">The Golden Rules</h2>
                        <p className="text-indigo-200">What keeps the robots happy (and what makes them angry).</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12">
                        {/* The Don'ts */}
                        <div className="space-y-6">
                            <h3 className="text-2xl font-bold flex items-center gap-3 text-red-400">
                                <XCircle className="fill-red-400/20" /> The Don'ts
                            </h3>
                            <ul className="space-y-4">
                                {[
                                    "Don't use two-column layouts (confuses parsers)",
                                    "Don't use headers/footers for important info",
                                    "Don't use charts, graphs, or rating bars for skills",
                                    "Don't place contact info in text boxes",
                                    "Don't use complex fonts or symbols"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 text-slate-300">
                                        <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* The Do's */}
                        <div className="space-y-6">
                            <h3 className="text-2xl font-bold flex items-center gap-3 text-green-400">
                                <CheckCircle className="fill-green-400/20" /> The Do's
                            </h3>
                            <ul className="space-y-4">
                                {[
                                    "Use a clean, single-column layout",
                                    "Use standard section headings (Experience, Education)",
                                    "Use standard fonts (Arial, Calibri, Roboto)",
                                    "Include keywords exactly as they appear in the job ad",
                                    "Save as a standard PDF or DOCX"
                                ].map((item, i) => (
                                    <li key={i} className="flex items-start gap-3 text-slate-300">
                                        <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                                        {item}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Guide: How ApplyRight Helps */}
            <GuideSection />

            {/* CTA */}
            <section className="py-24 bg-gradient-to-br from-indigo-900 to-indigo-800 text-white text-center">
                <div className="max-w-4xl mx-auto px-6">
                    <h2 className="text-3xl md:text-5xl font-bold text-white mb-8">Ready to get past the robots?</h2>
                    <p className="text-xl text-indigo-100 mb-10 max-w-2xl mx-auto">
                        Build your professional, ATS-optimized resume in minutes with ApplyRight.
                    </p>
                    <Link to="/register" className="inline-flex items-center gap-2 bg-white text-indigo-900 font-bold py-4 px-10 rounded-xl hover:bg-indigo-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1">
                        Build My Resume Now <ArrowRight className="w-5 h-5" />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-slate-200 py-12">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-slate-900">ApplyRight</span>
                    </div>

                    <div className="flex gap-6 text-sm font-medium text-slate-600">
                        <Link to="/privacy" className="hover:text-indigo-600 transition-colors">Privacy Policy</Link>
                        <Link to="/terms" className="hover:text-indigo-600 transition-colors">Terms of Service</Link>
                        <Link to="/contact" className="hover:text-indigo-600 transition-colors">Contact Us</Link>
                        <Link to="/ats-guide" className="hover:text-indigo-600 transition-colors">ATS Guide</Link>
                    </div>

                    <div className="text-slate-500 text-sm">
                        © {new Date().getFullYear()} ApplyRight. All rights reserved.
                    </div>
                </div>
            </footer>

        </div>
    );
};

const GuideSection = () => {
    const [mode, setMode] = useState('scratch'); // 'scratch' or 'upload'

    return (
        <section className="py-24 bg-white">
            <div className="max-w-5xl mx-auto px-6">
                <div className="text-center mb-10">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">How ApplyRight Works</h2>
                    <p className="text-lg text-slate-600">The Step-by-Step Method.</p>
                </div>

                {/* Toggle */}
                <div className="flex justify-center mb-16">
                    <div className="inline-flex bg-slate-100 p-1 rounded-full">
                        <button
                            onClick={() => setMode('scratch')}
                            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${mode === 'scratch' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Start From Scratch
                        </button>
                        <button
                            onClick={() => setMode('upload')}
                            className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${mode === 'upload' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Upload Existing Resume
                        </button>
                    </div>
                </div>

                <div className="space-y-16">
                    {mode === 'scratch' ? (
                        <>
                            {/* Scratch Step 1 */}
                            <div className="flex flex-col md:flex-row gap-8 items-center">
                                <div className="w-full md:w-1/2">
                                    <div className="aspect-video bg-indigo-50 rounded-2xl flex items-center justify-center border-2 border-indigo-100 p-8 shadow-sm">
                                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-md">
                                            <Search className="w-10 h-10 text-indigo-600" />
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full md:w-1/2">
                                    <div className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 font-bold rounded-full text-sm mb-4">Step 1</div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-4">Choose Your Aspiring Role</h3>
                                    <p className="text-slate-600 mb-6">
                                        Tell us the job title you are targeting (e.g., "Product Manager" or "Software Engineer"). This helps our AI tailor the experience to your specific career path.
                                    </p>
                                </div>
                            </div>

                            {/* Scratch Step 2 */}
                            <div className="flex flex-col md:flex-row-reverse gap-8 items-center">
                                <div className="w-full md:w-1/2">
                                    <div className="aspect-video bg-indigo-50 rounded-2xl flex items-center justify-center border-2 border-indigo-100 p-8 shadow-sm">
                                        <div className="space-y-3 w-3/4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-white text-xs">AI</div>
                                                <div className="h-2 bg-indigo-200 rounded w-full"></div>
                                            </div>
                                            <div className="h-2 bg-white rounded w-full"></div>
                                            <div className="h-2 bg-white rounded w-5/6"></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full md:w-1/2">
                                    <div className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 font-bold rounded-full text-sm mb-4">Step 2</div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-4">AI-Assisted Content Entry</h3>
                                    <p className="text-slate-600 mb-6">
                                        Fill out your CV fields with confidence. Our AI co-pilot assists you in real-time, suggesting impactful action verbs and optimizing your bullet points for maximum ATS readability.
                                    </p>
                                </div>
                            </div>

                            {/* Scratch Step 3 */}
                            <div className="flex flex-col md:flex-row gap-8 items-center">
                                <div className="w-full md:w-1/2">
                                    <div className="aspect-video bg-indigo-50 rounded-2xl flex items-center justify-center border-2 border-indigo-100 p-8 shadow-sm">
                                        <div className="relative">
                                            <FileText className="w-20 h-24 text-indigo-300" />
                                            <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full p-2">
                                                <CheckCircle className="w-6 h-6" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full md:w-1/2">
                                    <div className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 font-bold rounded-full text-sm mb-4">Step 3</div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-4">Review & Download</h3>
                                    <p className="text-slate-600 mb-6">
                                        Preview your resume with our professional, ATS-verified templates. Once you're satisfied with the review, simply click submit to download your perfect CV.
                                    </p>
                                    <Link to="/register" className="text-indigo-600 font-bold hover:gap-2 transition-all inline-flex items-center">
                                        Start Building <ArrowRight className="w-4 h-4 ml-1" />
                                    </Link>
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Upload Step 1 */}
                            <div className="flex flex-col md:flex-row gap-8 items-center">
                                <div className="w-full md:w-1/2">
                                    <div className="aspect-video bg-sky-50 rounded-2xl flex items-center justify-center border-2 border-sky-100 p-8 shadow-sm">
                                        <div className="w-24 h-32 border-2 border-dashed border-sky-300 rounded-lg flex items-center justify-center bg-white relative">
                                            <FileText className="w-10 h-10 text-sky-400" />
                                            <div className="absolute top-0 right-0 -mt-2 -mr-2 w-6 h-6 bg-sky-500 rounded-full animate-ping"></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full md:w-1/2">
                                    <div className="inline-block px-3 py-1 bg-sky-100 text-sky-700 font-bold rounded-full text-sm mb-4">Step 1</div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-4">Upload & Scan</h3>
                                    <p className="text-slate-600 mb-6">
                                        Upload your existing PDF or DOCX resume. ApplyRight instantly scans the document, parsing your data and identifying formatting issues that might trap you in the ATS filter.
                                    </p>
                                </div>
                            </div>

                            {/* Upload Step 2 */}
                            <div className="flex flex-col md:flex-row-reverse gap-8 items-center">
                                <div className="w-full md:w-1/2">
                                    <div className="aspect-video bg-sky-50 rounded-2xl flex items-center justify-center border-2 border-sky-100 p-8 shadow-sm">
                                        <div className="bg-white p-6 rounded-xl shadow-lg border border-sky-100 flex flex-col gap-3">
                                            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                                                <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center"><Smartphone size={16} /></span>
                                                <span className="font-semibold text-slate-700">Edit Manually</span>
                                            </div>
                                            <div className="flex items-center gap-3 text-sky-600">
                                                <span className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center"><Zap size={16} /></span>
                                                <span className="font-bold">ATS Optimized Version</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-full md:w-1/2">
                                    <div className="inline-block px-3 py-1 bg-sky-100 text-sky-700 font-bold rounded-full text-sm mb-4">Step 2</div>
                                    <h3 className="text-2xl font-bold text-slate-900 mb-4">Edit or Optimize</h3>
                                    <p className="text-slate-600 mb-6">
                                        You have full control. You can manually edit the parsed data to refine details, OR simply click to get an <strong>ATS Optimized Version</strong> of your resume automatically generated for you.
                                    </p>
                                    <Link to="/register" className="text-sky-600 font-bold hover:gap-2 transition-all inline-flex items-center">
                                        Upload Resume <ArrowRight className="w-4 h-4 ml-1" />
                                    </Link>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
};

export default ATSGuide;
