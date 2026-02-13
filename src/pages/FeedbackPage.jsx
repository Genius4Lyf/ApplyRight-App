import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import axios from 'axios';
import logo from '../assets/logo/applyright-icon.png';
import Particles, { initParticlesEngine } from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import { Handshake } from 'lucide-react';

const FeedbackPage = () => {
    const [step, setStep] = useState(1); // 1: Input, 2: Feedback Form or Sign Up
    const [contactValue, setContactValue] = useState('');
    const [userFound, setUserFound] = useState(false);
    const [userData, setUserData] = useState(null);
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [init, setInit] = useState(false);

    useEffect(() => {
        initParticlesEngine(async (engine) => {
            await loadSlim(engine);
        }).then(() => {
            setInit(true);
        });
    }, []);

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
                color: { value: "#4F46E5" },
                links: { color: "#4F46E5", distance: 150, enable: true, opacity: 0.3, width: 1 },
                move: {
                    enable: true,
                    speed: 1,
                    direction: "none",
                    random: false,
                    straight: false,
                    outModes: "out"
                },
                number: { density: { enable: true, area: 800 }, value: 90 },
                opacity: { value: 0.4 },
                shape: { type: "circle" },
                size: { value: { min: 1, max: 3 } },
            },
        }), []);

        if (!init) return null;

        return (
            <Particles
                id="feedback-particles"
                className="absolute inset-0"
                options={particlesOptions}
            />
        );
    });

    const checkUser = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/feedback/check-user`, { contactValue });
            if (res.data.success) {
                setUserFound(true);
                setUserData(res.data.data);
                setStep(2);
            }
        } catch (err) {
            if (err.response && err.response.status === 404) {
                setUserFound(false);
                setStep(2);
            } else {
                setError(err.response?.data?.error || 'Something went wrong. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    const submitFeedback = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const res = await axios.post(`${import.meta.env.VITE_API_URL}/feedback`, {
                contactValue,
                message
            });
            if (res.data.success) {
                setSuccess(true);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to submit feedback.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen relative">
            {/* Fixed Background Layer */}
            <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
                {/* Solid Background Base */}
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-gray-100"></div>

                {/* Particles */}
                <ParticleBackground init={init} />
            </div>

            {/* Fixed Header with Logo */}
            <header className="fixed top-0 left-0 right-0 z-20">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <Link to="/" className="inline-flex items-center gap-2 group">
                        <img src={logo} alt="ApplyRight Logo" className="h-8 w-auto" />
                        <span className="text-xl font-bold text-slate-900 tracking-tight group-hover:text-indigo-600 transition-colors">
                            ApplyRight
                        </span>
                    </Link>
                </div>
            </header>

            {/* Content Layer */}
            <div className="relative z-10 min-h-screen flex items-center justify-center p-4 pt-24">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden p-8 border border-slate-100">
                    <div className="text-center mb-8">
                        <div className="mx-auto w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-4 ring-1 ring-indigo-100">
                            <Handshake className="w-6 h-6 text-indigo-600" />
                        </div>
                        <h2 className="text-3xl font-extrabold text-gray-900 mb-2">We Value Your Feedback</h2>
                        <p className="text-gray-500">Help us improve ApplyRight for everyone.</p>
                    </div>

                    <AnimatePresence mode="wait">
                        {success ? (
                            <motion.div
                                key="success"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="text-center"
                            >
                                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                                    <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">Thank You!</h3>
                                <p className="text-gray-600 mb-6">Your feedback has been submitted successfully.</p>
                                <Link to="/" className="text-blue-600 hover:text-blue-800 font-medium">
                                    Return to Home
                                </Link>
                            </motion.div>
                        ) : step === 1 ? (
                            <motion.form
                                key="step1"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                onSubmit={checkUser}
                                className="space-y-6"
                            >
                                <div className="space-y-2">
                                    <label htmlFor="contact" className="block text-sm font-semibold text-slate-700">
                                        Email or Phone Number
                                    </label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                            </svg>
                                        </div>
                                        <input
                                            id="contact"
                                            type="text"
                                            required
                                            className="w-full pl-11 pr-4 py-3.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 placeholder-slate-400 bg-slate-50 focus:bg-white"
                                            placeholder="Enter your registered email or phone"
                                            value={contactValue}
                                            onChange={(e) => setContactValue(e.target.value)}
                                        />
                                    </div>
                                    <p className="text-xs text-slate-500 flex items-center gap-1">
                                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        We verify you're a registered user to ensure quality feedback
                                    </p>
                                </div>

                                {error && (
                                    <div className="text-red-500 text-sm bg-red-50 p-3 rounded-md">
                                        {error}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
                                >
                                    {loading ? 'Checking...' : 'Continue'}
                                </button>
                            </motion.form>
                        ) : (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                            >
                                {userFound ? (
                                    <form onSubmit={submitFeedback} className="space-y-6">
                                        <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                                {userData?.firstName?.[0] || 'U'}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-slate-900">
                                                    Logged in as {userData?.firstName} {userData?.lastName}
                                                </p>
                                                <p className="text-xs text-indigo-600">Verified User</p>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label htmlFor="message" className="block text-sm font-semibold text-slate-700">
                                                    Your Feedback
                                                </label>
                                                <span className={`text-xs ${message.length >= 300 ? 'text-red-500 font-medium' : 'text-slate-400'}`}>
                                                    {message.length}/300
                                                </span>
                                            </div>
                                            <textarea
                                                id="message"
                                                rows={5}
                                                required
                                                maxLength={300}
                                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all text-slate-900 placeholder-slate-400 bg-slate-50 focus:bg-white resize-none"
                                                placeholder="What's on your mind? We'd love to hear your thoughts..."
                                                value={message}
                                                onChange={(e) => setMessage(e.target.value)}
                                            />
                                        </div>

                                        {error && (
                                            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-4 rounded-xl border border-red-100">
                                                <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                {error}
                                            </div>
                                        )}

                                        <div className="flex gap-3 pt-2">
                                            <button
                                                type="button"
                                                onClick={() => setStep(1)}
                                                className="px-6 py-3.5 border border-slate-200 rounded-xl text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-200 transition-all hover:border-slate-300"
                                            >
                                                Back
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="flex-1 flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-indigo-200 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 transition-all transform hover:-translate-y-0.5"
                                            >
                                                {loading ? (
                                                    <>
                                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Submitting...
                                                    </>
                                                ) : 'Submit Feedback'}
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <div className="text-center py-4">
                                        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-orange-50 mb-4 ring-8 ring-orange-50/50">
                                            <svg className="h-8 w-8 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 mb-2">Account Not Found</h3>
                                        <p className="text-slate-500 mb-8 max-w-sm mx-auto">
                                            We check for an account to prevent spam and ensure quality feedback. Please sign up to continue.
                                        </p>

                                        <Link
                                            to="/register"
                                            className="block w-full py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-200 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all transform hover:-translate-y-0.5 mb-4"
                                        >
                                            Sign Up Now
                                        </Link>

                                        <button
                                            onClick={() => setStep(1)}
                                            className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
                                        >
                                            Try a different email or phone
                                        </button>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default FeedbackPage;
