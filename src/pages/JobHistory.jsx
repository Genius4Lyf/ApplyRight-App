import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import Preview from './Preview';
import { Calendar, Briefcase, Building } from 'lucide-react';

const JobHistory = () => {
    const [applications, setApplications] = useState([]);
    const [selectedApp, setSelectedApp] = useState(null);
    const [loading, setLoading] = useState(true);

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

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            <Navbar />

            <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
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
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* List */}
                        <div className="lg:col-span-1 space-y-4">
                            {applications.map((app) => (
                                <div
                                    key={app._id}
                                    onClick={() => setSelectedApp(app)}
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
                                            {new Date(app.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-500 mb-3">
                                        <Building className="w-3 h-3" />
                                        <span className="line-clamp-1">{app.jobId?.company || 'Unknown Company'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="inline-flex items-center px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-xs font-medium">
                                            CV
                                        </span>
                                        <span className="inline-flex items-center px-2 py-1 rounded bg-indigo-50 text-indigo-700 text-xs font-medium">
                                            Cover Letter
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Preview */}
                        <div className="lg:col-span-2">
                            {selectedApp ? (
                                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[600px]">
                                    <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                                        <h2 className="font-semibold text-slate-900">Application Details</h2>
                                        <span className="text-xs text-slate-500">
                                            Generated on {new Date(selectedApp.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="p-6">
                                        <Preview application={selectedApp} />
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
            </main>
        </div>
    );
};

export default JobHistory;
