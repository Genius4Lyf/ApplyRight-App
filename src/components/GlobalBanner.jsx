import React, { useState, useEffect } from 'react';
import api from '../services/api'; // Use centralized API service
import { AlertTriangle, Info, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GlobalBanner = () => {
    const [banner, setBanner] = useState(null);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                // Fetch public config
                const res = await api.get('/auth/config');

                if (res.data.announcement && res.data.announcement.enabled) {
                    setBanner(res.data.announcement);
                }
            } catch (error) {
                console.error("Failed to fetch global banner", error);
            }
        };

        fetchSettings();

        // Listen for real-time updates from Admin Settings
        window.addEventListener('settings_updated', fetchSettings);
        return () => window.removeEventListener('settings_updated', fetchSettings);
    }, []);

    if (!banner || !isVisible) return null;

    const styles = {
        info: { bg: 'bg-indigo-600', icon: Info },
        warning: { bg: 'bg-amber-500', icon: AlertTriangle },
        critical: { bg: 'bg-red-600', icon: XCircle }
    };

    const style = styles[banner.type] || styles.info;
    const Icon = style.icon;

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className={`${style.bg} text-white relative z-50`}
                >
                    <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-sm font-medium">
                            <Icon className="w-5 h-5 flex-shrink-0" />
                            <span>{banner.message}</span>
                        </div>
                        <button
                            onClick={() => setIsVisible(false)}
                            className="p-1 hover:bg-white/20 rounded-full transition-colors"
                        >
                            <XCircle className="w-5 h-5" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default GlobalBanner;
