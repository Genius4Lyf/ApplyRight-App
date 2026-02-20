import React, { forwardRef } from 'react';
import applyRightIcon from '../../assets/logo/applyright-icon.png';

const AdReportTemplate = forwardRef(({ stats }, ref) => {
    if (!stats) return null;

    return (
        <div className="absolute left-0 top-0 overflow-hidden w-0 h-0 pointer-events-none">
            <div
                ref={ref}
                className="w-[1080px] h-[1080px] bg-slate-900 flex flex-col justify-between overflow-hidden font-sans relative"
                style={{ fontFamily: 'Inter, sans-serif' }}
            >
                {/* Background elements for visual flair */}
                <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-primary/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3"></div>
                <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/20 rounded-full blur-[100px] translate-y-1/3 -translate-x-1/3"></div>

                <div className="relative z-10 p-16 flex flex-col h-full">

                    {/* Header / Brand */}
                    <div className="flex items-center gap-4 mb-24">
                        <img src={applyRightIcon} alt="ApplyRight" className="w-16 h-16 object-contain" />
                        <span className="text-4xl font-bold text-white tracking-tight" style={{ fontFamily: 'Outfit, sans-serif' }}>ApplyRight</span>
                    </div>

                    {/* Main Headline */}
                    <div className="max-w-3xl mb-auto">
                        <h1 className="text-7xl font-extrabold text-white leading-tight mb-6" style={{ fontFamily: 'Outfit, sans-serif' }}>
                            Join the <span className="text-primary">fastest growing</span> career platform.
                        </h1>
                        <p className="text-2xl text-slate-300">
                            Thousands of professionals are already building their futures with ApplyRight. Don't get left behind.
                        </p>
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-3 gap-8 mb-24">
                        {/* Metric 1 */}
                        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-10 border border-white/10 shadow-2xl">
                            <div className="text-primary font-medium text-xl mb-2 uppercase tracking-wider">Community</div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-6xl font-black text-white">{stats.totalUsers?.toLocaleString() || '0'}+</span>
                            </div>
                            <div className="text-slate-400 mt-2 text-lg">Active Professionals</div>
                        </div>

                        {/* Metric 2 */}
                        <div className="bg-primary backdrop-blur-md rounded-3xl p-10 border border-white/20 shadow-2xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -translate-y-1/2 translate-x-1/3"></div>
                            <div className="text-white/80 font-medium text-xl mb-2 uppercase tracking-wider relative z-10">Success</div>
                            <div className="flex items-baseline gap-2 relative z-10">
                                <span className="text-6xl font-black text-white">{stats.totalResumes?.toLocaleString() || '0'}+</span>
                            </div>
                            <div className="text-white/90 mt-2 text-lg relative z-10">Resumes Generated</div>
                        </div>

                        {/* Metric 3 */}
                        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-10 border border-white/10 shadow-2xl">
                            <div className="text-primary font-medium text-xl mb-2 uppercase tracking-wider">Momentum</div>
                            <div className="flex items-baseline gap-2">
                                <span className="text-6xl font-black text-white">+{stats.newUsersLastMonth?.toLocaleString() || '0'}</span>
                            </div>
                            <div className="text-slate-400 mt-2 text-lg">New Users This Month</div>
                        </div>
                    </div>

                    {/* Footer / CTA */}
                    <div className="flex items-end justify-between">
                        <div>
                            <div className="text-3xl font-bold text-white mb-2">Ready to level up?</div>
                            <div className="text-xl text-primary font-medium">Start for free today &rarr;</div>
                        </div>
                        <div className="text-2xl font-bold text-white/50 tracking-widest uppercase">
                            applyright.com.ng
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default AdReportTemplate;
