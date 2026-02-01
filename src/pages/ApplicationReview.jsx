import React, { useState, useEffect, useMemo } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { Link } from 'react-router-dom';
import { Search, FileText, XCircle, CheckCircle, ArrowRight, Eye, AlertTriangle, UserCheck, Layers } from 'lucide-react';

const ApplicationReview = () => {
    const fadeInUp = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    const { scrollY } = useScroll();
    const [scrolled, setScrolled] = useState(false);

    useMotionValueEvent(scrollY, "change", (latest) => {
        setScrolled(latest > 50);
    });

    const [init, setInit] = useState(false);

    useEffect(() => {
        initParticlesEngine(async (engine) => {
            await loadSlim(engine);
        }).then(() => {
            setInit(true);
        });
    }, []);

    const ParticleBackground = React.memo(({ init, id }) => {
        const particlesOptions = useMemo(() => ({
            fullScreen: { enable: false },
            background: { color: { value: "transparent" } },
            fpsLimit: 120,
            interactivity: {
                events: {
                    onHover: { enable: true, mode: "repulse" },
                    resize: true
                },
                modes: {
                    repulse: { distance: 100, duration: 0.4 },
                }
            },
            particles: {
                color: { value: "#4F46E5" }, // Indigo
                links: { color: "#4F46E5", distance: 150, enable: true, opacity: 0.2, width: 1 },
                move: {
                    enable: true,
                    speed: 1,
                    direction: "none",
                    random: false,
                    straight: false,
                    outModes: "out"
                },
                number: { density: { enable: true, area: 800 }, value: 60 },
                opacity: { value: 0.3 },
                shape: { type: "circle" },
                size: { value: { min: 1, max: 3 } },
            },
        }), []);

        if (!init) return null;

        return (
            <Particles
                id={id}
                className="absolute inset-0"
                options={particlesOptions}
            />
        );
    });

    return (
        <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900 overflow-x-hidden">

            {/* Navigation (Floating) */}
            <motion.nav
                initial={{
                    width: "100%",
                    top: 0,
                    borderRadius: 0,
                    borderBottomWidth: 0,
                    borderBottomColor: "rgba(241, 245, 249, 0)",
                    backgroundColor: "rgba(255, 255, 255, 0)",
                    backdropFilter: "blur(0px)"
                }}
                animate={scrolled ? {
                    width: "90%",
                    maxWidth: "1080px",
                    top: 20,
                    borderRadius: "100px",
                    borderBottomWidth: 1,
                    borderBottomColor: "rgba(241, 245, 249, 1)",
                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)"
                } : {
                    width: "100%",
                    maxWidth: "100%",
                    top: 0,
                    borderRadius: 0,
                    borderBottomWidth: 0,
                    borderBottomColor: "rgba(241, 245, 249, 0)",
                    backgroundColor: "rgba(255, 255, 255, 0)",
                    backdropFilter: "blur(0px)",
                    boxShadow: "none"
                }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                className={`fixed z-50 left-0 right-0 mx-auto overflow-hidden`}
            >
                <div className={`mx-auto h-16 flex items-center justify-between transition-all duration-300 ${scrolled ? 'px-4 md:px-6' : 'max-w-7xl px-6'}`}>
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white transition-all group-hover:bg-indigo-700">
                            <Layers size={18} />
                        </div>
                        <span className="text-xl font-bold font-heading text-slate-900">ApplyRight</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link to="/login" className="hidden sm:block text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">Login</Link>
                        <Link to="/register" className="btn-primary py-2 px-4 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors">
                            Get Started
                        </Link>
                    </div>
                </div>
            </motion.nav>

            {/* HERO SECTION */}
            <section className="relative pt-32 pb-20 px-6 overflow-hidden">
                <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-[800px] h-[800px] bg-indigo-600/5 rounded-full blur-[120px]"></div>
                <div className="absolute top-40 left-0 -translate-x-1/2 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[100px]"></div>

                <div className="max-w-4xl mx-auto text-center relative z-10">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-100/50 border border-red-200 text-red-600 text-xs font-bold uppercase tracking-wide mb-6">
                            <AlertTriangle size={14} /> The Hard Truth
                        </div>
                        <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-8 leading-tight tracking-tight">
                            The Hiring Game is <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600">Rigged.</span> <br />
                            <span className="text-3xl md:text-5xl text-slate-500 font-medium block mt-2">(Unless You Know the Rules)</span>
                        </h1>
                        <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
                            You submitted your resume. You waited. You heard nothing. <br />
                            It wasn't a human who rejected you. It was a robot.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* STEP 1: THE BOT (ATS) */}
            <section className="py-24 bg-white relative overflow-hidden">
                <ParticleBackground init={init} id="ats-particles" />
                <div className="max-w-6xl mx-auto px-6 relative z-10">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={fadeInUp}
                        >
                            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-slate-900/20">
                                <span className="font-bold text-xl">1</span>
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-4">The Gatekeeper (ATS)</h2>
                            <h3 className="text-xl text-indigo-600 font-semibold mb-6">"No Keywords? No Interview."</h3>
                            <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                                99% of Fortune 500 companies use Applicant Tracking Systems. These bots scan your resume for specific keywords found in the job description.
                            </p>
                            <p className="text-lg text-slate-600 leading-relaxed border-l-4 border-red-500 pl-4 bg-red-50 p-4 rounded-r-lg">
                                <span className="font-bold text-red-700 block mb-1">The Reality:</span>
                                If you call yourself a "Customer Service Pro" but the job asks for a "Client Success Specialist", you get auto-rejected. Even if you're perfect for the job.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            whileInView={{ opacity: 1, scale: 1 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="relative"
                        >
                            {/* Visualizing the Filter */}
                            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 bg-red-100 text-red-600 text-xs font-bold px-3 py-1 rounded-bl-xl">AUTO-REJECTED</div>

                                <div className="flex items-center gap-4 mb-6 opacity-40">
                                    <div className="w-10 h-10 rounded-full bg-slate-200"></div>
                                    <div className="w-2/3 h-3 bg-slate-200 rounded"></div>
                                </div>
                                <div className="flex items-center gap-4 mb-6 opacity-40">
                                    <div className="w-10 h-10 rounded-full bg-slate-200"></div>
                                    <div className="w-1/2 h-3 bg-slate-200 rounded"></div>
                                </div>

                                {/* The User's Resume (Rejected) */}
                                <div className="flex items-center gap-4 mb-6 relative">
                                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400">
                                        <FileText size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="h-4 bg-slate-800 rounded w-32 mb-2"></div>
                                        <div className="h-2 bg-red-100 rounded w-full border border-red-200"></div>
                                    </div>
                                    <XCircle className="text-red-500 absolute right-0 animate-pulse" size={24} />
                                </div>

                                <div className="mt-8 pt-6 border-t border-slate-200 text-center">
                                    <div className="inline-block bg-slate-900 text-white px-4 py-2 rounded-lg font-mono text-sm">
                                        MATCH SCORE: 42%
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* STEP 2: THE HUMAN */}
            <section className="py-24 bg-slate-50 relative border-y border-slate-200">
                <div className="max-w-6xl mx-auto px-6">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        {/* Visual - 6 Seconds */}
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.8 }}
                            className="order-2 md:order-1 flex justify-center"
                        >
                            <div className="w-[300px] h-[300px] rounded-full flex items-center justify-center relative bg-white shadow-2xl">
                                <div className="text-center z-10">
                                    <span className="block text-9xl font-black text-slate-900 tracking-tighter leading-none">6</span>
                                    <span className="text-xl font-bold text-slate-400 uppercase tracking-[0.2em] mt-2 block">Seconds</span>
                                </div>
                                {/* Progress Indicator */}
                                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none overflow-visible">
                                    {/* Background Track */}
                                    <circle
                                        cx="150" cy="150" r="138"
                                        fill="none" stroke="#f1f5f9" strokeWidth="12"
                                    />
                                    {/* Animated Progress */}
                                    <motion.circle
                                        cx="150" cy="150" r="138"
                                        fill="none" stroke="#4f46e5" strokeWidth="12"
                                        strokeDasharray="867"
                                        initial={{ strokeDashoffset: 867 }}
                                        whileInView={{ strokeDashoffset: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 6, ease: "linear" }}
                                        strokeLinecap="round"
                                        className="drop-shadow-lg"
                                    />
                                </svg>
                            </div>
                        </motion.div>

                        <motion.div
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true }}
                            variants={fadeInUp}
                            className="order-1 md:order-2"
                        >
                            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white mb-6 shadow-lg shadow-indigo-600/20">
                                <span className="font-bold text-xl">2</span>
                            </div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-4">The Human Scan</h2>
                            <h3 className="text-xl text-indigo-600 font-semibold mb-6">"Make point quickly, or lose them forever."</h3>
                            <p className="text-lg text-slate-600 mb-6 leading-relaxed">
                                If you pass the bot, you reach the recruiter. But they are busy. Studies show they spend an average of <strong>6 seconds</strong> on a resume before deciding "Yes" or "No".
                            </p>
                            <p className="text-lg text-slate-600 leading-relaxed">
                                Cluttered layouts, walls of text, or confusing structures get skipped. You need clean, professional formatting that highlights your impact instantly.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* STEP 3: THE SOLUTION */}
            <section className="py-24 bg-indigo-900 text-white relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/30 rounded-full blur-[100px] pointer-events-none"></div>

                <div className="max-w-7xl mx-auto px-6 relative z-10 text-center mb-16">
                    <h2 className="text-indigo-400 font-bold tracking-widest uppercase text-sm mb-4">The Solution</h2>
                    <h3 className="text-4xl md:text-6xl font-bold mb-6 text-white">How ApplyRight Bridges the Gap</h3>
                    <p className="text-xl text-indigo-100 max-w-2xl mx-auto">
                        We built a tool that handles both hurdles automatically.
                    </p>
                </div>

                <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-2 gap-8 relative z-10">
                    <motion.div
                        whileHover={{ y: -10 }}
                        className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/10"
                    >
                        <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center text-green-400 mb-6">
                            <Search size={28} />
                        </div>
                        <h4 className="text-2xl font-bold mb-4 text-white">1. We Beat the Bot</h4>
                        <p className="text-indigo-50 leading-relaxed mb-6">
                            Our AI analyzes the job description, isolates the "must-have" keywords, and seamlessly weaves them into your skills and experience sections. Your Match Score goes from 42% to 95%.
                        </p>
                        <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                            <CheckCircle size={16} /> ATS COMPLIANT
                        </div>
                    </motion.div>

                    <motion.div
                        whileHover={{ y: -10 }}
                        className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/10"
                    >
                        <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center text-purple-400 mb-6">
                            <Eye size={28} />
                        </div>
                        <h4 className="text-2xl font-bold mb-4 text-white">2. We Impress the Human</h4>
                        <p className="text-indigo-50 leading-relaxed mb-6">
                            We output your optimized content into visually stunning, recruiter-approved templates. Clean lines, perfect hierarchy, and scannable bullet points that pass the 6-second test.
                        </p>
                        <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                            <CheckCircle size={16} /> RECRUITER APPROVED
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* CTA SECTION */}
            <section className="py-24 bg-white text-center relative overflow-hidden">
                <ParticleBackground init={init} id="cta-particles" />
                <div className="max-w-4xl mx-auto px-6 relative z-10">
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-8">Ready to Stop Getting Rejected?</h2>
                    <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto">
                        Don't let a robot decide your future. Take control of your application today.
                    </p>
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                    >
                        <Link
                            to="/register"
                            className="inline-flex items-center justify-center bg-indigo-600 text-white text-xl font-bold py-5 px-12 rounded-xl shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 hover:shadow-2xl transition-all"
                        >
                            Start Your Journey <ArrowRight className="ml-3" size={24} />
                        </Link>
                    </motion.div>
                    <p className="mt-6 text-sm text-slate-400 font-medium">
                        Free to try • No credit card required
                    </p>
                </div>
            </section>

        </div>
    );
};

export default ApplicationReview;
