import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { AlertTriangle, Info, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const GlobalBanner = () => {
    const [banner, setBanner] = useState(null);
    const [isVisible, setIsVisible] = useState(true);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                // Determine API URL based on environment (simplified for now)
                const apiUrl = 'http://localhost:5000/api/v1/admin/settings';

                // We need a public endpoint or we just use the protected one if user is Admin?
                // Actually, settings like announcements should be public or accessible via a separate public config endpoint.
                // For MVP, we'll assume the user is logged in or we make a public config endpoint.
                // LET'S CREATE A PUBLIC CONFIG ENDPOINT in Auth or similar.
                // OR: Just hardcode for now if we can't change backend easily? 
                // No, we must do it right.
                // For now, let's try to fetch active-banner from a new public route we'll add.

                // TEMPORARY: using the admin endpoint will fail for normal users (401).
                // So I need to add a public endpoint for "system-config" or similar.
                // I will add that to the backend plan/task.

                // MOCKING FOR NOW TO SHOW UI
                // setBanner({
                //     message: "System maintenance scheduled for Saturday 10 PM UTC.",
                //     type: "warning"
                // });

                // Real fetch (once public endpoint exists)
                const res = await axios.get('http://localhost:5000/api/auth/config');
                if (res.data.announcement && res.data.announcement.enabled) {
                    setBanner(res.data.announcement);
                }

            } catch (error) {
                // Silently fail if no config (normal)
                // console.error(error);
            }
        };

        fetchSettings();
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
