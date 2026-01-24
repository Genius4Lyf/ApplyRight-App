import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import Preview from './Preview';
import { Calendar, Briefcase, Building, Sparkles, ArrowLeft, Trash2 } from 'lucide-react';

import FitScoreCard from '../components/FitScoreCard';
import TemplateSelector from '../components/TemplateSelector';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

const JobHistory = () => {
    const [applications, setApplications] = useState([]);
    const [selectedApp, setSelectedApp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [regenerating, setRegenerating] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState('modern');
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [applicationToDelete, setApplicationToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);

    // Get user from local storage
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const res = await api.get('/applications');
            setApplications(res.data);
        } catch (error) {
            console.error('Failed to fetch history', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (e, appId) => {
        e.stopPropagation();
        setApplicationToDelete(appId);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!applicationToDelete) return;

        setIsDeleting(true);
        try {
            await api.delete(`/applications/${applicationToDelete}`);
            setApplications(applications.filter(app => app._id !== applicationToDelete));
            if (selectedApp?._id === applicationToDelete) {
                setSelectedApp(null);
            }
            setDeleteModalOpen(false);
            setApplicationToDelete(null);
        } catch (error) {
            console.error('Failed to delete application', error);
            alert('Failed to delete application. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />

            <main className="flex-1 max-w-7xl mx-auto w-full px-4 pt-8 pb-0">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold text-slate-900">Application History</h1>
                    <p className="text-slate-500">Track and manage your generated applications.</p>
                </div>

                {loading ? (
                    <div className="text-center py-12">
                        <div className="w-8 h-8 border-4 border-indigo-200 border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-400">Loading history...</p>
                    </div>
                ) : applications.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-slate-200 shadow-sm">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Briefcase className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 mb-2">No applications yet</h3>
                        <p className="text-slate-500 mb-6 max-w-sm mx-auto">Start by generating your first tailored CV and cover letter in the "Get Hired" section.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                        {/* List Column: Hidden on mobile if an app is selected */}
                        <div className={`lg:col-span-1 space-y-4 ${selectedApp ? 'hidden lg:block' : 'block'} lg:sticky lg:top-24 lg:h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-2 custom-scrollbar pb-8`}>
                            {applications.map((app) => (
                                <div
                                    key={app._id}
                                    onClick={() => {
                                        setSelectedApp(app);
                                        setSelectedTemplate(app.templateId || 'modern');
                                        // Scroll to top on mobile when selecting
                                        if (window.innerWidth < 1024) {
                                            window.scrollTo({ top: 0, behavior: 'smooth' });
                                        }
                                    }}
                                    className={`
                                        p-4 rounded-xl border cursor-pointer transition-all hover:shadow-md
                                        ${selectedApp?._id === app._id
                                            ? 'bg-white border-primary shadow-md ring-1 ring-primary/20'
                                            : 'bg-white border-slate-200 hover:border-indigo-300'}
                                    `}
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-semibold text-slate-900 line-clamp-1">{app.jobId?.title || 'Unknown Role'}</h3>
                                        <span className="text-xs font-medium text-slate-400 whitespace-nowrap">
                                            {new Date(app.createdAt).toLocaleDateString('en-US', {
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                                        <Building className="w-3 h-3" />
                                        <span className="line-clamp-1">{app.jobId?.company || 'Unknown Company'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 justify-between">
                                        <div className="flex gap-2">
                                            <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
                                                CV
                                            </span>
                                            <span className="inline-flex items-center px-2 py-1 rounded bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
                                                Cover Letter
                                            </span>
                                        </div>
                                        {app.fitScore !== undefined && (
                                            <span className={`
                                                flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold
                                                ${app.fitScore >= 80 ? 'bg-emerald-100 text-emerald-700' :
                                                    app.fitScore >= 50 ? 'bg-amber-100 text-amber-700' :
                                                        'bg-red-100 text-red-700'}
                                            `}>
                                                <Sparkles className="w-3 h-3" />
                                                {app.fitScore}% Match
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={(e) => handleDelete(e, app._id)}
                                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors mt-2 w-full flex justify-center items-center bg-slate-50 border border-slate-100"
                                        title="Delete application"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>

                        {/* Preview Column: Hidden on mobile if NO app is selected */}
                        <div className={`lg:col-span-2 ${selectedApp ? 'block' : 'hidden lg:block'} lg:sticky lg:top-24 lg:h-[calc(100vh-6rem)]`}>
                            {selectedApp ? (
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px] animate-in slide-in-from-right-4 duration-300 lg:animate-none lg:h-full lg:flex lg:flex-col lg:mb-8">
                                    <div className={`p-4 border-b transition-all duration-200 z-10 ${isScrolled ? 'shadow-md border-transparent bg-white/95 backdrop-blur-sm' : 'border-slate-200 bg-slate-50'} flex items-center gap-4 sticky top-0`}>
                                        {/* Back Button (Mobile Only) */}
                                        <button
                                            onClick={() => setSelectedApp(null)}
                                            className="lg:hidden p-2 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-200 rounded-full transition-colors"
                                        >
                                            <ArrowLeft className="w-5 h-5" />
                                        </button>

                                        <div className="flex-1 flex justify-between items-center">
                                            <h2 className="font-semibold text-slate-900">Application Details</h2>
                                            <span className="text-xs text-slate-500 hidden sm:inline">
                                                Generated on {new Date(selectedApp.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div
                                        className="p-6 space-y-8 lg:overflow-y-auto custom-scrollbar lg:flex-1"
                                        onScroll={(e) => setIsScrolled(e.target.scrollTop > 0)}
                                    >
                                        {selectedApp.fitAnalysis && (
                                            <div className="mb-8">
                                                <h3 className="text-lg font-bold text-slate-900 mb-4 items-center flex gap-2">
                                                    <Sparkles className="w-5 h-5 text-indigo-500" />
                                                    Snapshot Analysis
                                                </h3>
                                                <FitScoreCard
                                                    fitScore={selectedApp.fitScore}
                                                    fitAnalysis={selectedApp.fitAnalysis}
                                                    actionPlan={selectedApp.actionPlan}
                                                />
                                            </div>
                                        )}

                                        <div>
                                            <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-lg font-bold text-slate-900 items-center flex gap-2">
                                                    <Briefcase className="w-5 h-5 text-indigo-500" />
                                                    Generated Documents
                                                </h3>
                                                <button
                                                    onClick={async () => {
                                                        setRegenerating(true);
                                                        try {
                                                            const res = await api.post('/analysis/analyze', {
                                                                resumeId: selectedApp.resumeId,
                                                                jobId: selectedApp.jobId,
                                                                templateId: selectedTemplate
                                                            });
                                                            // Update local state with new data
                                                            setSelectedApp({ ...res.data, jobId: selectedApp.jobId });
                                                            // Refresh list to show updated timestamp if needed (optional)
                                                            fetchHistory();
                                                        } catch (error) {
                                                            console.error("Regeneration failed", error);
                                                            alert("Failed to regenerate. Please try again.");
                                                        } finally {
                                                            setRegenerating(false);
                                                        }
                                                    }}
                                                    disabled={regenerating}
                                                    className="btn-primary px-4 py-2 text-xs flex items-center"
                                                >
                                                    {regenerating ? (
                                                        <>
                                                            <div className="w-3 h-3 border-2 border-indigo-200 border-t-white rounded-full animate-spin mr-2"></div>
                                                            Updating...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Sparkles className="w-3 h-3 mr-2" />
                                                            Regenerate
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                            <div className="mb-6">
                                                <TemplateSelector
                                                    selectedTemplate={selectedTemplate}
                                                    onSelect={setSelectedTemplate}
                                                    userPlan={user.plan || 'free'}
                                                />
                                            </div>

                                            <Preview application={selectedApp} templateId={selectedTemplate} />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200">
                                    <Briefcase className="w-12 h-12 mb-4 opacity-50" />
                                    <p>Select an application to view details</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <DeleteConfirmationModal
                    isOpen={deleteModalOpen}
                    onClose={() => {
                        if (!isDeleting) {
                            setDeleteModalOpen(false);
                            setApplicationToDelete(null);
                        }
                    }}
                    onConfirm={confirmDelete}
                    isDeleting={isDeleting}
                />
            </main>
        </div>
    );
};

export default JobHistory;
