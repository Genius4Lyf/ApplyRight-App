import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, Mail, Download, Copy, Check, ArrowDownToLine, Share2, Sparkles, MessageCircle, HelpCircle } from 'lucide-react';

import Modal from '../components/Modal';

const Preview = ({ application, templateId = 'modern', isResumeModalOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState('cl'); // 'cl' or 'interview'
    const [copied, setCopied] = useState(false);

    if (!application) return null;

    const handleCopy = () => {
        const textToCopy = activeTab === 'cl' ? application.coverLetter : (application.interviewQuestions?.map(q => q.question).join('\n') || '');
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

            <div className="clean-card p-0 overflow-hidden border-slate-200 relative group">
                <div className="flex border-b border-slate-200 bg-slate-50/50">
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
                            {activeTab === 'cl' ? 'Tailored Cover Letter' : 'Interview Preparation'}
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
                        <div className="bg-slate-50 rounded-xl p-8 min-h-[500px] border border-slate-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Left Column: Questions to Answer */}
                                <div>
                                    <div className="flex items-center gap-2 mb-6">
                                        <HelpCircle className="w-5 h-5 text-indigo-600" />
                                        <h3 className="text-lg font-bold text-slate-800">Likely Interview Questions</h3>
                                    </div>

                                    {application.interviewQuestions && application.interviewQuestions.length > 0 ? (
                                        <div className="space-y-4">
                                            {application.interviewQuestions.map((q, idx) => (
                                                <div key={idx} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-indigo-500">
                                                    <p className="text-slate-800 font-medium">{q.question}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-slate-500 text-sm">No specific questions generated.</p>
                                    )}
                                </div>

                                {/* Right Column: Questions to Ask */}
                                <div>
                                    <div className="flex items-center gap-2 mb-6">
                                        <MessageCircle className="w-5 h-5 text-emerald-600" />
                                        <h3 className="text-lg font-bold text-slate-800">Questions You Should Ask</h3>
                                    </div>

                                    {application.questionsToAsk && application.questionsToAsk.length > 0 ? (
                                        <div className="space-y-4">
                                            {application.questionsToAsk.map((q, idx) => (
                                                <div key={idx} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
                                                    <p className="text-slate-800 font-medium">{q}</p>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-white p-6 rounded-lg border border-dashed border-slate-300 text-center">
                                            <p className="text-slate-500">Regenerate assets to see suggested questions.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
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
                            <div className="text-slate-700 leading-relaxed">
                                {activeTab === 'cl' && (
                                    <ReactMarkdown
                                        components={{
                                            h1: ({ node, ...props }) => <h1 className="text-xl font-bold mb-4 text-slate-900" {...props} />,
                                            h2: ({ node, ...props }) => <h2 className="text-lg font-semibold mb-3 mt-4 text-slate-800" {...props} />,
                                            p: ({ node, ...props }) => <p className="mb-4 text-slate-700 leading-relaxed whitespace-pre-line" {...props} />,
                                        }}
                                    >
                                        {application.coverLetter}
                                    </ReactMarkdown>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Modal
                isOpen={isResumeModalOpen}
                onClose={onClose}
                title="ApplyRight AI Resume"
                maxWidth="max-w-4xl"
                footer={
                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                            Close
                        </button>
                        <button
                            onClick={() => window.print()}
                            className="btn-primary flex items-center"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Download as PDF
                        </button>
                    </div>
                }
            >
                <div id="resume-content" className="p-8 bg-white min-h-[1000px]">
                    <ReactMarkdown
                        components={{
                            h1: ({ node, ...props }) => <h1 className="text-4xl font-extrabold text-slate-900 mb-6 tracking-tight leading-none" {...props} />,
                            h2: ({ node, ...props }) => (
                                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 mt-8 pb-2 border-b border-slate-200" {...props} />
                            ),
                            h3: ({ node, ...props }) => <h3 className="text-lg font-bold text-slate-900 mt-6 mb-1" {...props} />,
                            h4: ({ node, ...props }) => <h4 className="text-md font-semibold text-slate-700 mt-4 mb-1" {...props} />,
                            p: ({ node, ...props }) => <p className="text-sm text-slate-600 leading-relaxed mb-3" {...props} />,
                            ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-4 space-y-1 text-sm text-slate-600" {...props} />,
                            li: ({ node, ...props }) => <li className="pl-1 leading-normal" {...props} />,
                            strong: ({ node, ...props }) => <strong className="font-semibold text-slate-900" {...props} />,
                            a: ({ node, ...props }) => <a className="text-indigo-600 hover:text-indigo-800 underline underline-offset-2" {...props} />,
                            hr: ({ node, ...props }) => <hr className="my-6 border-slate-100" {...props} />,
                        }}
                    >
                        {application.optimizedCV}
                    </ReactMarkdown>
                </div>
            </Modal>
        </div>
    );
};

export default Preview;
