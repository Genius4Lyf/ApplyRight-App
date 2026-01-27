import React from 'react';

const TemplateThumbnail = ({ type, className = "" }) => {
    // Base card style - added className prop for flexibility
    const cardBase = `w-full h-full bg-white shadow-sm border border-slate-200 relative overflow-hidden text-[0px] flex flex-col ${className}`;

    switch (type) {
        case 'ats-clean':
            return (
                <div className={`${cardBase} p-2`}>
                    <div className="w-3/4 h-2 bg-slate-900 mb-2"></div>
                    <div className="w-full h-px bg-slate-200 mb-2"></div>
                    <div className="space-y-1">
                        <div className="w-full h-1 bg-slate-300"></div>
                        <div className="w-5/6 h-1 bg-slate-300"></div>
                        <div className="w-full h-1 bg-slate-300"></div>
                    </div>
                    <div className="w-1/2 h-1.5 bg-slate-800 mt-3 mb-1"></div>
                    <div className="space-y-1">
                        <div className="w-full h-1 bg-slate-300"></div>
                        <div className="w-full h-1 bg-slate-300"></div>
                    </div>
                </div>
            );

        case 'student-ats':
            return (
                <div className={`${cardBase} p-2`}>
                    <div className="text-center mb-2">
                        <div className="w-1/2 h-2 bg-slate-900 mx-auto"></div>
                        <div className="w-1/3 h-1 bg-slate-400 mx-auto mt-1"></div>
                    </div>
                    <div className="w-full h-px bg-slate-200 mb-2"></div>
                    {/* Education First */}
                    <div className="w-1/3 h-1.5 bg-slate-800 mb-1"></div>
                    <div className="w-full h-px bg-slate-200 mb-1"></div>
                    <div className="w-full h-1 bg-slate-300 mb-2"></div>
                    {/* Experience */}
                    <div className="w-1/3 h-1.5 bg-slate-800 mb-1"></div>
                    <div className="w-full h-px bg-slate-200 mb-1"></div>
                    <div className="w-full h-1 bg-slate-300"></div>
                </div>
            );

        case 'modern-professional':
            return (
                <div className={`${cardBase} flex-row`}>
                    {/* Sidebar */}
                    <div className="w-1/3 bg-slate-100 h-full p-1 flex flex-col gap-1 border-r border-slate-200">
                        <div className="w-8 h-8 rounded-full bg-slate-300 mb-1 mx-auto"></div>
                        <div className="flex-1 space-y-1">
                            <div className="w-full h-0.5 bg-slate-300"></div>
                            <div className="w-full h-0.5 bg-slate-300"></div>
                        </div>
                    </div>
                    {/* Main */}
                    <div className="w-2/3 p-1.5 flex flex-col gap-1.5">
                        <div className="w-3/4 h-2 bg-slate-800"></div>
                        <div className="w-1/2 h-1 bg-indigo-500"></div>
                        <div className="w-full h-0.5 bg-slate-200 my-0.5"></div>
                        <div className="space-y-0.5">
                            <div className="w-full h-1 bg-slate-300"></div>
                            <div className="w-full h-1 bg-slate-300"></div>
                            <div className="w-5/6 h-1 bg-slate-300"></div>
                        </div>
                    </div>
                </div>
            );

        case 'modern':
            return (
                <div className={`${cardBase}`}>
                    {/* Top Banner */}
                    <div className="w-full h-6 bg-indigo-600 mb-2"></div>
                    <div className="px-2">
                        <div className="w-1/2 h-2 bg-slate-900 mb-2"></div>
                        <div className="flex gap-1 mb-2">
                            <div className="w-1/3 h-1 bg-indigo-500"></div>
                            <div className="w-1/3 h-1 bg-slate-300"></div>
                        </div>
                        <div className="space-y-1">
                            <div className="w-full h-1 bg-slate-300"></div>
                            <div className="w-full h-1 bg-slate-300"></div>
                        </div>
                    </div>
                </div>
            );

        case 'minimal':
            return (
                <div className={`${cardBase} p-3 items-center text-center`}>
                    <div className="w-16 h-16 rounded-full border border-slate-100 mb-2 flex items-center justify-center">
                        <div className="w-1/2 h-2 bg-slate-800"></div>
                    </div>
                    <div className="w-1/3 h-1 bg-slate-400 mb-3"></div>
                    <div className="w-full space-y-1">
                        <div className="w-full h-px bg-slate-200"></div>
                        <div className="w-full h-1 bg-slate-50"></div>
                        <div className="w-2/3 h-1 bg-slate-100 mx-auto"></div>
                    </div>
                </div>
            );

        case 'minimal-serif':
            return (
                <div className={`${cardBase} p-3 items-center text-center`}>
                    {/* Serif header vibe */}
                    <div className="w-3/4 h-3 bg-slate-900 mb-2 font-serif"></div>
                    <div className="w-1/4 h-1 bg-slate-400 mb-4 italic"></div>
                    <div className="w-full space-y-1.5 text-justify">
                        <div className="w-full h-1 bg-slate-300"></div>
                        <div className="w-full h-1 bg-slate-300"></div>
                        <div className="w-5/6 h-1 bg-slate-300 mx-auto"></div>
                        <div className="w-full h-1 bg-slate-300 mt-2"></div>
                    </div>
                </div>
            );

        case 'minimal-grid':
            return (
                <div className={`${cardBase} flex-row`}>
                    {/* Sidebar Grid */}
                    <div className="w-1/3 bg-slate-50 h-full border-r border-slate-200 p-1 pt-2">
                        <div className="w-full h-2 bg-slate-900 mb-2"></div>
                        <div className="w-1/2 h-1 bg-indigo-200 mb-4"></div>
                        <div className="w-full h-0.5 bg-slate-200 mb-0.5"></div>
                        <div className="w-3/4 h-0.5 bg-slate-200 mb-0.5"></div>
                    </div>
                    {/* Content */}
                    <div className="w-2/3 p-2">
                        <div className="w-1/4 h-1 bg-slate-400 mb-2 mt-2 uppercase"></div>
                        <div className="w-full h-1 bg-slate-300 mb-1"></div>
                        <div className="w-3/4 h-1 bg-slate-300 mb-1"></div>
                        <div className="w-1/4 h-1 bg-slate-400 mb-2 mt-3 uppercase"></div>
                        <div className="w-full h-1 bg-slate-300"></div>
                    </div>
                </div>
            );

        case 'minimal-mono':
            return (
                <div className={`${cardBase} p-2 font-mono`}>
                    <div className="border-b border-dashed border-slate-300 pb-2 mb-2">
                        <div className="w-3/4 h-2 bg-slate-900 mb-1"></div>
                        <div className="w-1/2 h-1 bg-slate-500"></div>
                    </div>
                    <div className="space-y-2">
                        <div className="bg-slate-50 p-0.5 w-1/3 h-1.5 mb-1"></div>
                        <div className="w-full h-1 bg-slate-300"></div>
                        <div className="pl-1 border-l-2 border-slate-300">
                            <div className="w-3/4 h-1 bg-slate-300"></div>
                        </div>
                    </div>
                </div>
            );

        case 'creative':
            return (
                <div className={`${cardBase} p-2`}>
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 to-purple-500"></div>
                    <div className="mt-2 w-3/4 h-3 bg-slate-900 mb-1"></div>
                    <div className="w-1/4 h-1 bg-purple-500 mb-3"></div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <div className="w-full h-1 bg-slate-300"></div>
                            <div className="w-full h-1 bg-slate-300"></div>
                        </div>
                        <div className="space-y-1">
                            <div className="w-full h-1 bg-purple-100"></div>
                            <div className="w-3/4 h-1 bg-purple-100"></div>
                        </div>
                    </div>
                </div>
            );

        case 'executive':
            return (
                <div className={`${cardBase} flex-row`}>
                    <div className="w-1/4 bg-slate-800 h-full"></div>
                    <div className="w-3/4 p-2">
                        <div className="w-full h-px bg-slate-300 my-1"></div>
                        <div className="w-3/4 h-2 bg-slate-900 font-serif mb-1"></div>
                        <div className="w-full h-px bg-slate-300 my-1"></div>
                        <div className="space-y-1 mt-2">
                            <div className="w-full h-1 bg-slate-400"></div>
                            <div className="w-full h-1 bg-slate-400"></div>
                        </div>
                    </div>
                </div>
            );

        case 'swiss':
            return (
                <div className={`${cardBase} flex-row `}>
                    {/* Gradient Sidebar */}
                    <div className="w-1.5 h-full bg-gradient-to-b from-indigo-600 via-purple-600 to-indigo-800"></div>
                    <div className="p-2 flex-1">
                        <div className="w-full h-6 bg-transparent text-slate-900 font-black text-[8px] leading-none mb-2">
                            JOHN<br />DOE
                        </div>
                        <div className="w-fill border-t-2 border-indigo-600 pt-1">
                            <div className="w-1/2 h-1.5 bg-slate-800 mb-1"></div>
                            <div className="w-full h-1 bg-slate-300"></div>
                        </div>
                    </div>
                </div>
            );

        case 'luxury':
            return (
                <div className={`${cardBase} bg-[#fcfbf9] border-[#e5dcc5] p-2 items-center`}>
                    <div className="w-full h-px bg-[#c5a059] mb-2"></div>
                    <div className="text-center mb-1">
                        <div className="w-2/3 h-2 bg-slate-900 mx-auto italic font-serif"></div>
                    </div>
                    <div className="w-full h-px bg-[#e5dcc5] mb-2"></div>
                    <div className="space-y-1 w-full px-1 text-center">
                        <div className="w-1/2 h-0.5 bg-[#c5a059] mx-auto mb-1"></div>
                        <div className="w-full h-0.5 bg-slate-400"></div>
                        <div className="w-3/4 h-0.5 bg-slate-400 mx-auto"></div>
                    </div>
                </div>
            );

        case 'tech':
            return (
                <div className={`${cardBase} bg-slate-900 border-indigo-500`}>
                    <div className="bg-slate-800 w-full h-4 mb-2 flex items-center px-1 gap-0.5">
                        <div className="w-1 h-1 rounded-full bg-red-500"></div>
                        <div className="w-1 h-1 rounded-full bg-yellow-500"></div>
                        <div className="w-1 h-1 rounded-full bg-green-500"></div>
                    </div>
                    <div className="px-2 space-y-1.5">
                        <div className="w-1/2 h-1.5 bg-blue-400"></div>
                        <div className="w-3/4 h-1 bg-slate-500"></div>
                        <div className="w-full h-0.5 bg-slate-600 mt-2"></div>
                        <div className="w-5/6 h-1 bg-green-400 opacity-60"></div>
                    </div>
                </div>
            );

        default:
            return (
                <div className={`${cardBase} p-2`}>
                    <div className="w-1/2 h-2 bg-slate-200 mb-2"></div>
                    <div className="w-full h-1 bg-slate-100 mb-1"></div>
                    <div className="w-3/4 h-1 bg-slate-100"></div>
                </div>
            );
    }
};

export default TemplateThumbnail;
