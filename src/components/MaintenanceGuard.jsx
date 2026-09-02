import React, { useEffect, useState } from 'react';
import api from '../services/api';
import Maintenance from '../pages/Maintenance';

const MaintenanceGuard = ({ children }) => {
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // api.js attaches the bearer token itself, so a logged-in caller's request
        // already carries it — the backend decides bypass from THAT, not from
        // anything read here. Trusting the server's `bypass` (rather than a local
        // `user.role === 'admin'` check, as this used to) is what makes a
        // maintenanceAccess grant work: that user is not an admin, so a
        // localStorage-only check would still show them the Maintenance page even
        // though every real request they made would succeed.
        const { data } = await api.get('/system/status');
        if (data.maintenance && !data.bypass) {
          setIsMaintenance(true);
        }
      } catch (error) {
        console.error('Failed to check maintenance status:', error);
        // Fail open: an unreachable status check shouldn't lock everyone out.
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

  if (isMaintenance) {
    return <Maintenance />;
  }

  return children;
};

export default MaintenanceGuard;
