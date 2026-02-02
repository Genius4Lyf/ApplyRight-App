import React, { useEffect } from 'react';

const AdSenseBanner = ({ slot, style, format = 'auto', responsive = 'true' }) => {
    useEffect(() => {
        try {
            // Push the ad to the queue
            // We check if the script is loaded first or just try-catch standard implementation
            if (window.adsbygoogle) {
                (window.adsbygoogle = window.adsbygoogle || []).push({});
            }
        } catch (e) {
            console.error("AdSense Error:", e);
        }
    }, []);

    // Placeholder for development/localhost where AdSense might not show
    const isDev = window.location.hostname === 'localhost';

    return (
        <div className="adsense-container my-6 flex justify-center overflow-hidden" style={{ minHeight: '90px', ...style }}>
            {isDev && (
                <div className="absolute text-[10px] text-slate-300 bg-slate-50 border border-dashed border-slate-200 p-1 pointer-events-none">
                    AdSpace (Dev Mode)
                </div>
            )}
            <ins className="adsbygoogle"
                style={{ display: 'block', width: '100%', ...style }}
                data-ad-client="ca-pub-YOUR_CLIENT_ID_HERE"
                data-ad-slot={slot || "1234567890"}
                data-ad-format={format}
                data-full-width-responsive={responsive}></ins>
        </div>
    );
};

export default AdSenseBanner;
