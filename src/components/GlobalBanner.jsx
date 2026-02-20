import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { AlertTriangle, Info, X, Megaphone, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GlobalBanner = () => {
    const [banner, setBanner] = useState(null);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const res = await api.get('/auth/config');

                if (res.data.announcement && res.data.announcement.enabled) {
                    setBanner(res.data.announcement);
                    setIsVisible(true);
                } else {
                    setBanner(null);
                }
            } catch (error) {
                console.error("Failed to fetch global banner", error);
            }
        };

        fetchSettings();

        window.addEventListener('settings_updated', fetchSettings);
        return () => window.removeEventListener('settings_updated', fetchSettings);
    }, []);

    if (!banner || !isVisible) return null;

    const themes = {
        info: {
            gradient: 'from-indigo-600 via-indigo-500 to-violet-600',
            icon: Megaphone,
            iconBg: 'bg-white/15',
            closeBg: 'hover:bg-white/15',
            shimmer: 'from-transparent via-white/10 to-transparent',
        },
        warning: {
            gradient: 'from-amber-500 via-amber-400 to-orange-500',
            icon: AlertTriangle,
            iconBg: 'bg-white/20',
            closeBg: 'hover:bg-white/20',
            shimmer: 'from-transparent via-white/10 to-transparent',
        },
        critical: {
            gradient: 'from-rose-600 via-red-500 to-rose-600',
            icon: ShieldAlert,
            iconBg: 'bg-white/15',
            closeBg: 'hover:bg-white/15',
            shimmer: 'from-transparent via-white/10 to-transparent',
        },
    };

    const theme = themes[banner.type] || themes.info;
    const Icon = theme.icon;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="relative overflow-hidden"
                >
                    {/* Gradient background */}
                    <div className={`bg-gradient-to-r ${theme.gradient}`}>
                        {/* Subtle animated shimmer overlay */}
                        <div
                            className={`absolute inset-0 bg-gradient-to-r ${theme.shimmer} animate-pulse opacity-50`}
                            style={{ animationDuration: '3s' }}
                        />

                        {/* Decorative dots */}
                        <div className="absolute inset-0 opacity-[0.07]"
                            style={{
                                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                                backgroundSize: '20px 20px',
                            }}
                        />

                        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-center">
                            <div className="flex items-center gap-3">
                                {/* Icon badge */}
                                <div className={`flex-shrink-0 w-7 h-7 rounded-lg ${theme.iconBg} backdrop-blur-sm flex items-center justify-center`}>
                                    <Icon className="w-3.5 h-3.5 text-white" />
                                </div>

                                {/* Message */}
                                <p className="text-sm font-medium text-white/95 tracking-wide">
                                    {banner.message}
                                </p>
                            </div>

                            {/* Dismiss button */}
                            <button
                                onClick={() => setIsVisible(false)}
                                className={`absolute right-4 sm:right-6 p-1.5 rounded-lg ${theme.closeBg} text-white/70 hover:text-white transition-all duration-200`}
                                aria-label="Dismiss notification"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default GlobalBanner;
