import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Maintenance from '../pages/Maintenance';

const MaintenanceGuard = ({ children }) => {
    const [isMaintenance, setIsMaintenance] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkStatus = async () => {
            try {
                // Check local user role first
                const user = JSON.parse(localStorage.getItem('user') || '{}');
                const admin = user.role === 'admin';
                setIsAdmin(admin);

                // If admin, we can skip the maintenance check or just ignore it
                // But let's check it anyway so we know the state (maybe show a banner?)
                // For blocking purposes, if admin -> proceed immediately?
                // Actually, admins should see the site.

                if (admin) {
                    setLoading(false);
                    return;
                }

                // Check system status
                const { data } = await axios.get('http://localhost:5000/api/system/status');
                if (data.maintenance) {
                    setIsMaintenance(true);
                }
            } catch (error) {
                console.error("Failed to check maintenance status:", error);
                // Fail open or closed? 
                // If backend is down, maybe show maintenance?
            } finally {
                setLoading(false);
            }
        };

        checkStatus();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                {/* Optional loading state */}
            </div>
        );
    }

    if (isMaintenance && !isAdmin) {
        return <Maintenance />;
    }

    return children;
};

export default MaintenanceGuard;
