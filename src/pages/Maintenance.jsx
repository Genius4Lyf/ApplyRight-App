import React from 'react';
import AppParticles from '../components/AppParticles';
import logo from '../assets/logo/applyright-icon.png';

const Maintenance = () => {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Background Particles */}
            <div className="absolute inset-0 z-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-50/60 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 opacity-70"></div>
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-violet-50/60 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 opacity-70"></div>
                <AppParticles />
            </div>

            <div className="relative z-10 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl max-w-lg w-full p-8 text-center animate-in fade-in zoom-in duration-300 border border-white/50">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm border border-slate-100 p-4">
                    <img src={logo} alt="ApplyRight Logo" className="w-full h-full object-contain" />
                </div>

                <h1 className="text-3xl font-bold text-slate-900 mb-4">Under Maintenance</h1>

                <div className="space-y-4">
                    <p className="text-slate-600 text-lg leading-relaxed">
                        We are currently ongoing maintenance and will let you know once the service is back on.
                    </p>
                    <p className="text-slate-500 text-sm">
                        Thank you for your patience.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Maintenance;
