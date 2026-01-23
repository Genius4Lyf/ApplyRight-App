import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Layers, ArrowRight, FileText, Search, Zap, CheckCircle, AlertCircle, XCircle } from 'lucide-react';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { motion, AnimatePresence } from "framer-motion";

const LandingPage = () => {
    const [init, setInit] = useState(false);
    const [textIndex, setTextIndex] = useState(0);
    const phrases = ["the ATS", "the Robots", "the Black Hole", "Rejection"];

    useEffect(() => {
        const interval = setInterval(() => {
            setTextIndex((prev) => (prev + 1) % phrases.length);
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        initParticlesEngine(async (engine) => {
            await loadSlim(engine);
        }).then(() => {
            setInit(true);
        });
    }, []);

    // Animation Variants
    const fadeInUp = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
    };

    const ParticleBackground = React.memo(({ init }) => {
        const particlesOptions = useMemo(() => ({
            fullScreen: { enable: false },
            background: { color: { value: "transparent" } },
            fpsLimit: 120,
            interactivity: {
                events: {
                    onHover: { enable: true, mode: "repulse" },
                    onClick: { enable: true, mode: "push" },
                    resize: true
                },
                modes: {
                    repulse: { distance: 100, duration: 0.4 },
                    push: { quantity: 4 }
                }
            },
            particles: {
                color: { value: "#4F46E5" }, // Indigo
                links: { color: "#4F46E5", distance: 150, enable: true, opacity: 0.4, width: 1 },
                move: {
                    enable: true,
                    speed: 1, // Smooth continuous flow
                    direction: "none",
                    random: false,
                    straight: false,
                    outModes: "out"
                },
                number: { density: { enable: true, area: 800 }, value: 80 },
                opacity: { value: 0.5 },
                shape: { type: "circle" },
                size: { value: { min: 1, max: 4 } },
            },
        }), []);

        if (!init) return null;

        return (
            <Particles
                id="tsparticles"
                className="absolute inset-0"
                options={particlesOptions}
            />
        );
    });

    return (
        <div className="min-h-screen font-sans text-slate-900 selection:bg-indigo-100 selection:text-indigo-900">

            {/* Fixed Background Layer */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                {/* Solid Background Base */}
                <div className="absolute inset-0 bg-white"></div>

                {/* Ambient Light Blobs */}
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-50/60 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-70"></div>
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-violet-50/60 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 opacity-70"></div>

                {/* Particles */}
                <ParticleBackground init={init} />
            </div>

            {/* Scrollable Content Layer */}
            <div className="relative z-10">
                {/* Navigation */}
                <nav className="fixed w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
                    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                        <Link to="/" className="flex items-center gap-2 group">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                                <Layers size={18} />
                            </div>
                            <span className="text-xl font-bold font-heading text-slate-900">ApplyRight</span>
                        </Link>
                        <div className="flex items-center gap-4">
                            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Login</Link>
                            <Link to="/register" className="btn-primary py-2 px-4 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
                                Get Started
                            </Link>
                        </div>
                    </div>
                </nav>

                {/* Hero Section */}
                <section className="pt-32 pb-20 lg:pt-40 lg:pb-24 relative px-6 text-center">
                    <motion.div
                        initial="hidden"
                        animate="visible"
                        variants={fadeInUp}
                        className="max-w-4xl mx-auto"
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-700 text-xs font-semibold uppercase tracking-wide mb-8">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                            Did you know? 75% of resumes are never read.
                        </div>

                        <h1 className="text-5xl md:text-7xl font-bold font-heading tracking-tight text-slate-900 mb-6 leading-tight">
                            Beat <span className="relative inline-block text-left min-w-[300px] md:min-w-[420px] align-top">
                                {/* Invisible spacer */}
                                <span className="invisible h-0">the Resume Black Hole.</span>
                                <AnimatePresence mode="wait">
                                    <motion.span
                                        key={textIndex}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -20 }}
                                        transition={{ duration: 0.3 }}
                                        className="absolute inset-0 text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600"
                                    >
                                        {phrases[textIndex]}.
                                    </motion.span>
                                </AnimatePresence>
                            </span>
                            <br className="hidden md:block" />
                            Land Your Dream Job.
                        </h1>

                        <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
                            The "Resume Black Hole" isn't bad luck—it's technology. <br className="hidden md:block" />
                            We teach you how the system works, then we give you the tool to beat it.
                        </p>

                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link to="/register" className="btn-primary py-4 px-8 text-lg w-full sm:w-auto bg-indigo-600 text-white rounded-xl shadow-lg hover:shadow-indigo-500/20 transition-all">
                                Optimize My CV Free
                            </Link>
                            <Link to="#education" className="btn-secondary py-4 px-8 text-lg w-full sm:w-auto border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 transition-all">
                                How Application Review Works
                            </Link>
                        </div>
                    </motion.div>
                </section>

                {/* EDUCATIONAL SECTION: The Problem */}
                <section id="education" className="py-24 bg-slate-50/80 backdrop-blur-sm border-y border-slate-200">
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center mb-16">
                            <h2 className="text-indigo-600 font-semibold tracking-wide uppercase text-sm mb-3">The Invisible Barrier</h2>
                            <h3 className="text-3xl md:text-5xl font-bold text-slate-900">Why Good Candidates Get Rejected</h3>
                            <p className="mt-4 text-xl text-slate-600 max-w-3xl mx-auto">
                                It's not about your skills. It's about your keywords.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 gap-12 items-center">
                            {/* The Diagram Visual */}
                            <div className="relative bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
                                <div className="absolute -top-4 -right-4 bg-red-100 text-red-600 px-4 py-2 rounded-lg font-bold text-sm shadow-sm rotate-3">
                                    TYPICAL PROCESS
                                </div>

                                <div className="space-y-6">
                                    <div className="flex items-center gap-4 opacity-50">
                                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                                            <FileText className="text-slate-400" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-700">You apply</h4>
                                            <p className="text-sm text-slate-500">Generic Resume sent</p>
                                        </div>
                                    </div>
                                    <div className="h-8 border-l-2 border-dashed border-slate-200 ml-6"></div>

                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center relative">
                                            <Search className="text-red-600" />
                                            <div className="absolute -right-1 -top-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse"></div>
                                        </div>
                                        <div className="flex-1 p-4 bg-red-50 rounded-lg border border-red-100">
                                            <h4 className="font-bold text-red-900">ATS Filtration (The Killer)</h4>
                                            <p className="text-sm text-red-700 mt-1">
                                                The bot scans for specific keywords from the Job Description. <br />
                                                <strong>No match? Auto-Reject.</strong>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="h-8 border-l-2 border-dashed border-slate-200 ml-6"></div>

                                    <div className="flex items-center gap-4 opacity-30 grayscale">
                                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                                            <XCircle className="text-slate-400" />
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-700">Human Review</h4>
                                            <p className="text-sm text-slate-500">Never sees your resume.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* The Explanation */}
                            <div className="space-y-8">
                                <div>
                                    <h4 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                                        <AlertCircle className="text-indigo-600" /> What is an ATS?
                                    </h4>
                                    <p className="text-slate-600 leading-relaxed">
                                        Applicant Tracking Systems (ATS) are software used by 99% of Fortune 500 companies. They filter thousands of applications automatically. If your resume doesn't <span className="font-semibold text-slate-900">exactly match</span> the language of the job description, you are filtered out before a human ever clicks "Open".
                                    </p>
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
                                        <AlertCircle className="text-indigo-600" /> The "Spray and Pray" Mistake
                                    </h4>
                                    <p className="text-slate-600 leading-relaxed">
                                        Sending the same generic CV to 100 jobs guarantees 100 rejections. Each job description is unique, with its own required skills and "magic words".
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SOLUTION SECTION: "Why ApplyRight" */}
                <section className="py-24 relative">
                    {/* Add a subtle glass effect or just keep transparent (particles visible) */}
                    <div className="max-w-7xl mx-auto px-6">
                        <div className="text-center mb-16">
                            <h2 className="text-indigo-600 font-semibold tracking-wide uppercase text-sm mb-3">The Solution</h2>
                            <h3 className="text-3xl md:text-5xl font-bold text-slate-900">We Tailor Your CV for Every Single Job.</h3>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8 text-center">
                            <div className="p-8 bg-white/60 backdrop-blur-md rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg hover:border-indigo-100 transition-all group">
                                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600 group-hover:scale-110 transition-transform">
                                    <Search size={32} />
                                </div>
                                <h4 className="text-xl font-bold text-slate-900 mb-3">1. We Scan the Job</h4>
                                <p className="text-slate-600">
                                    Paste the job link. Our AI reads it like an ATS would, finding the critical keywords, skills, and requirements hidden in the text.
                                </p>
                            </div>

                            <div className="p-8 bg-white/60 backdrop-blur-md rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg hover:border-indigo-100 transition-all group">
                                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600 group-hover:scale-110 transition-transform">
                                    <Zap size={32} />
                                </div>
                                <h4 className="text-xl font-bold text-slate-900 mb-3">2. We Re-Write Your CV</h4>
                                <p className="text-slate-600">
                                    We don't just add keywords. We rewrite your bullet points to highlight the <em>relevant</em> experience that matches <em>this specific job</em>.
                                </p>
                            </div>

                            <div className="p-8 bg-white/60 backdrop-blur-md rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg hover:border-indigo-100 transition-all group">
                                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600 group-hover:scale-110 transition-transform">
                                    <CheckCircle size={32} />
                                </div>
                                <h4 className="text-xl font-bold text-slate-900 mb-3">3. You Pass the Filter</h4>
                                <p className="text-slate-600">
                                    You get a tailored PDF for that specific application. The ATS sees a 95%+ match, and your resume lands on the recruiter's desk.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-20 bg-slate-900 text-white overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2"></div>
                    <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
                        <h2 className="text-3xl md:text-5xl font-bold mb-6">Stop Guessing. Start Interviewing.</h2>
                        <p className="text-xl text-indigo-200 mb-10">
                            Join thousands of job seekers who stopped fighting the system and started making it work for them.
                        </p>
                        <Link to="/register" className="inline-flex items-center justify-center bg-white text-indigo-900 hover:bg-indigo-50 font-bold py-4 px-10 rounded-xl shadow-lg transition-transform active:scale-95">
                            Create Free Account
                        </Link>
                        <p className="mt-6 text-sm text-slate-500">No credit card required • Optimized specifically for ATS</p>
                    </div>
                </section>

                {/* Footer */}
                <footer className="bg-white border-t border-slate-200 py-12">
                    <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center text-white">
                                <Layers size={14} />
                            </div>
                            <span className="text-lg font-bold text-slate-900">ApplyRight</span>
                        </div>
                        <div className="text-slate-500 text-sm">
                            © {new Date().getFullYear()} ApplyRight. All rights reserved.
                        </div>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default LandingPage;
