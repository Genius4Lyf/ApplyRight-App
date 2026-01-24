import React, { useState } from 'react';
import { FileText, Mail, Download, Copy, Check, ArrowDownToLine, Share2, Sparkles, MessageCircle, HelpCircle } from 'lucide-react';

const Preview = ({ application, templateId = 'modern' }) => {
    const [activeTab, setActiveTab] = useState('cv'); // 'cv' or 'cl'
    const [copied, setCopied] = useState(false);

    if (!application) return null;

    const handleCopy = () => {
        const textToCopy = activeTab === 'cv' ? application.optimizedCV : application.coverLetter;
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Sparkles className="w-6 h-6 text-indigo-600" />
                        Professional Assets
                    </h2>
                    <p className="text-slate-500 mt-1">Refined and ready for your next application.</p>
                </div>

                <div className="flex items-center gap-2">
                    <button className="btn-secondary h-10 px-4 text-sm border-slate-200">
                        <Share2 className="w-4 h-4 mr-2" /> Share
                    </button>
                    <button className="btn-primary h-10 px-4 text-sm">
                        <Download className="w-4 h-4 mr-2" /> Download All
                    </button>
                </div>
            </div>

            <div className="clean-card p-0 overflow-hidden border-slate-200">
                <div className="flex border-b border-slate-200 bg-slate-50/50">
                    <button
                        className={`flex-1 py-4 px-6 text-center font-semibold text-sm flex items-center justify-center transition-all ${activeTab === 'cv'
                            ? 'text-indigo-600 bg-white border-b-2 border-indigo-600'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                        onClick={() => setActiveTab('cv')}
                    >
                        <FileText className="w-4 h-4 mr-2" />
                        ApplyRight AI Resume
                    </button>
                    <button
                        className={`flex-1 py-4 px-6 text-center font-semibold text-sm flex items-center justify-center transition-all ${activeTab === 'cl'
                            ? 'text-indigo-600 bg-white border-b-2 border-indigo-600'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                        onClick={() => setActiveTab('cl')}
                    >
                        <Mail className="w-4 h-4 mr-2" />
                        Tailored Cover Letter
                    </button>
                    <button
                        className={`flex-1 py-4 px-6 text-center font-semibold text-sm flex items-center justify-center transition-all ${activeTab === 'interview'
                            ? 'text-indigo-600 bg-white border-b-2 border-indigo-600'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }`}
                        onClick={() => setActiveTab('interview')}
                    >
                        <MessageCircle className="w-4 h-4 mr-2" />
                        Interview Prep
                    </button>
                </div>

                <div className="p-8">
                    <div className="flex justify-between items-center mb-6">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {activeTab === 'cv' ? 'Resume Strategy' : 'Document Preview'}
                        </span>
                        <button
                            onClick={handleCopy}
                            className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 mr-2 text-green-600" /> : <Copy className="w-3.5 h-3.5 mr-2" />}
                            {copied ? 'Copied' : 'Copy Text'}
                        </button>
                    </div>

                    {activeTab === 'interview' ? (
                        <div className="bg-slate-50 rounded-xl p-8 min-h-[500px] max-h-[800px] overflow-y-auto custom-scrollbar border border-slate-100">
                            <div className="flex items-center gap-2 mb-6 sticky top-0 bg-slate-50 pb-4 z-10 border-b border-slate-200">
                                <HelpCircle className="w-5 h-5 text-indigo-600" />
                                <h3 className="text-lg font-bold text-slate-800">Likely Interview Questions</h3>
                            </div>

                            {application.interviewQuestions && application.interviewQuestions.length > 0 ? (
                                <div className="space-y-6">
                                    {application.interviewQuestions.map((q, idx) => (
                                        <div key={idx} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded mb-2 inline-block
                                                ${q.type === 'behavioral' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}
                                            `}>
                                                {q.type}
                                            </span>
                                            <p className="text-slate-800 font-medium text-lg">{q.question}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-slate-400">
                                    <p>No specific interview questions generated for this role yet.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className={`bg-slate-50 rounded-xl p-8 min-h-[500px] max-h-[800px] overflow-y-auto custom-scrollbar border border-slate-100 relative group
                          ${templateId === 'classic' ? 'font-serif' :
                                templateId === 'tech' ? 'font-mono' :
                                    templateId === 'creative' ? 'font-sans' : ''}
                     `}>
                            <div className={`absolute top-0 left-0 w-full h-1 transition-colors
                             ${templateId === 'modern' ? 'bg-indigo-600' :
                                    templateId === 'classic' ? 'bg-slate-800' :
                                        templateId === 'creative' ? 'bg-purple-600' :
                                            templateId === 'tech' ? 'bg-blue-600' :
                                                'bg-slate-400'}
                         `}></div>
                            <div className="whitespace-pre-wrap text-slate-700 leading-relaxed text-sm">
                                {activeTab === 'cv' ? application.optimizedCV : application.coverLetter}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Preview;
