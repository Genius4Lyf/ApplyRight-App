import React, { useState } from 'react';
import { Link2, Search, CheckCircle } from 'lucide-react';
import api from '../services/api';

const JobLinkInput = ({ onJobExtracted }) => {
    const [jobUrl, setJobUrl] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleExtract = async (e) => {
        e.preventDefault();
        if (!jobUrl) return;

        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            const res = await api.post('/jobs/extract', { jobUrl });
            setSuccess(true);
            if (onJobExtracted) {
                onJobExtracted(res.data);
            }
        } catch (err) {
            setError('Failed to extract. Try pasting job details manually.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="clean-card h-full flex flex-col">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Link2 className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-slate-900">Step 2: Job Listing</h3>
                    <p className="text-sm text-slate-500">Paste the URL for analysis</p>
                </div>
            </div>

            <div className="flex-grow flex flex-col justify-center">
                <p className="text-slate-600 text-sm mb-6 leading-relaxed">
                    Analyzing the job description helps our AI tailor your application specifically to the key requirements and company culture.
                </p>

                <form onSubmit={handleExtract} className="space-y-4">
                    <div className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-600 transition-colors">
                            <Search className="h-5 w-5" />
                        </div>
                        <input
                            type="url"
                            className="input-field w-full pl-11"
                            placeholder="e.g. https://linkedin.com/jobs/..."
                            value={jobUrl}
                            onChange={(e) => setJobUrl(e.target.value)}
                            required
                            disabled={success || loading}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading || success || !jobUrl}
                        className={`w-full h-12 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${success
                                ? 'bg-green-50 text-green-700 border border-green-100 cursor-default'
                                : loading || !jobUrl
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'btn-primary'
                            }`}
                    >
                        {loading && (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        )}
                        {loading ? 'Analyzing Listing...' : success ? 'Job Successfully Extracted' : 'Analyze Job Listing'}
                    </button>
                </form>

                {error && (
                    <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mt-6 flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100 animate-in fade-in slide-in-from-bottom-2">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-green-600 shadow-sm">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-green-900">Market Research Complete</p>
                            <p className="text-xs text-green-700">We've identified the core competencies needed.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JobLinkInput;
