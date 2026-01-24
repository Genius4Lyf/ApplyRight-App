import React, { useState } from 'react';
import { Link2, Search, CheckCircle } from 'lucide-react';
import api from '../services/api';

const JobLinkInput = ({ onJobExtracted }) => {
    const [mode, setMode] = useState('url'); // 'url' or 'text'
    const [jobUrl, setJobUrl] = useState('');
    const [description, setDescription] = useState('');
    const [detectedUrl, setDetectedUrl] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Regex to find URLs
    const urlRegex = /(https?:\/\/[^\s]+)/g;

    const handleDescriptionChange = (e) => {
        const text = e.target.value;
        setDescription(text);

        // Check for URLs if we haven't already acted on one
        const found = text.match(urlRegex);
        if (found && found.length > 0 && found[0] !== detectedUrl) {
            setDetectedUrl(found[0]);
        } else if (!found) {
            setDetectedUrl(null);
        }
    };

    const switchToUrl = () => {
        if (detectedUrl) {
            setJobUrl(detectedUrl);
            setMode('url');
            setDescription(''); // access choice: clear text or keep it? Clearing seems cleaner for switching modes.
            setDetectedUrl(null);
        }
    };

    const ignoreUrl = () => {
        setDetectedUrl(null);
    };

    const handleExtract = async (e) => {
        e.preventDefault();

        // Validation
        if (mode === 'url' && !jobUrl) return;
        if (mode === 'text' && !description) return;

        setLoading(true);
        setError('');
        setSuccess(false);

        try {
            const payload = mode === 'url' ? { jobUrl } : { description };
            const res = await api.post('/jobs/extract', payload);
            setSuccess(true);
            if (onJobExtracted) {
                onJobExtracted(res.data);
            }
        } catch (err) {
            console.error(err);
            if (err.response?.status === 403) {
                setError("We couldn't access this link directly (access denied).");
            } else if (err.response?.status === 404) {
                setError("We couldn't find a job at this URL.");
            } else {
                setError('Failed to analyze. Please check your input and try again.');
            }
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
                    <p className="text-sm text-slate-500">Provide the job details for analysis</p>
                </div>
            </div>

            <div className="flex-grow flex flex-col">
                <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
                    <button
                        type="button"
                        onClick={() => setMode('url')}
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'url' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Paste URL
                    </button>
                    <button
                        type="button"
                        onClick={() => setMode('text')}
                        className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${mode === 'text' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        Paste Description
                    </button>
                </div>

                <p className="text-slate-600 text-sm mb-4 leading-relaxed">
                    {mode === 'url'
                        ? "Paste the link to the job posting. We'll extract the details automatically."
                        : "Paste the full job description text here depending on what you have available."
                    }
                </p>

                <form onSubmit={handleExtract} className="space-y-4 flex-grow flex flex-col">
                    {mode === 'url' ? (
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
                                required={mode === 'url'}
                                disabled={success || loading}
                            />
                        </div>
                    ) : (
                        <div className="relative flex-grow flex flex-col">
                            <textarea
                                className="input-field w-full p-4 min-h-[150px] resize-none flex-grow"
                                placeholder="Paste the job description (responsibilities, requirements, etc.)..."
                                value={description}
                                onChange={handleDescriptionChange}
                                required={mode === 'text'}
                                disabled={success || loading}
                            />
                            {detectedUrl && (
                                <div className="absolute bottom-2 right-2 left-2 bg-indigo-50 border border-indigo-100 p-3 rounded-lg flex items-start gap-3 shadow-md animate-in slide-in-from-bottom-2">
                                    <div className="flex-1">
                                        <p className="text-xs font-semibold text-indigo-900 mb-1">Link detected in text</p>
                                        <p className="text-xs text-indigo-700 line-clamp-1 mb-2">We found a URL. Would you like to scan this link directly?</p>
                                        <div className="flex gap-2">
                                            <button
                                                type="button"
                                                onClick={switchToUrl}
                                                className="px-2 py-1 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700 transition"
                                            >
                                                Yes, scan link
                                            </button>
                                            <button
                                                type="button"
                                                onClick={ignoreUrl}
                                                className="px-2 py-1 bg-white border border-slate-200 text-slate-600 text-xs rounded hover:bg-slate-50 transition"
                                            >
                                                No, keep text
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-auto pt-4">
                        <button
                            type="submit"
                            disabled={loading || success || (mode === 'url' ? !jobUrl : !description)}
                            className={`w-full h-12 px-6 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${success
                                ? 'bg-green-50 text-green-700 border border-green-100 cursor-default'
                                : loading || (mode === 'url' ? !jobUrl : !description)
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'btn-primary'
                                }`}
                        >
                            {loading && (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            )}
                            {loading
                                ? 'Analyzing Listing...'
                                : success
                                    ? 'Job Successfully Extracted'
                                    : mode === 'url' ? 'Analyze Job Link' : 'Analyze Description'
                            }
                        </button>
                    </div>
                </form>

                {error && (
                    <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm animate-in fade-in slide-in-from-bottom-2">
                        <div className="flex items-start gap-2">
                            <div className="flex-1">
                                {error}
                                {error.includes('access') && mode === 'url' && (
                                    <div className="mt-2 bg-white p-3 rounded border border-red-100 text-xs text-slate-600">
                                        <p className="mb-2 font-medium text-red-800">Why is this happening?</p>
                                        <p className="mb-2">Some websites (like LinkedIn or short links) block automated readers. Resolving this is easy:</p>
                                        <ol className="list-decimal pl-4 space-y-1 mb-3">
                                            <li>Click <a href={jobUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-600 font-medium hover:underline inline-flex items-center gap-1">this link <Link2 className="w-3 h-3" /></a> to open the job in a new tab</li>
                                            <li>Wait for the final page to load completely</li>
                                            <li>Copy the <strong>actual full URL</strong> from the browser address bar</li>
                                            <li>Paste that full URL here instead</li>
                                        </ol>
                                        <p>Or alternatively, switch to "Paste Description" and copy the text directly.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {success && (
                    <div className="mt-6 flex items-center gap-3 p-4 bg-green-50 rounded-xl border border-green-100 animate-in fade-in slide-in-from-bottom-2">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-green-600 shadow-sm">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-green-900">Analysis Complete</p>
                            <p className="text-xs text-green-700">We've identified the core competencies needed.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default JobLinkInput;
