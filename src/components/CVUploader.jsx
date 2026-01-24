import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, XCircle, Trash2 } from 'lucide-react';
import api from '../services/api';

const CVUploader = ({ onUploadSuccess }) => {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState(null);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile) {
            setFile(selectedFile);
            setMessage(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('resume', file);

        try {
            const res = await api.post('/resumes/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            setMessage({ type: 'success', text: 'Uploaded successfully!' });
            if (onUploadSuccess) {
                onUploadSuccess(res.data);
            }
        } catch (error) {
            console.error(error);
            const errorMsg = error.response?.data?.message || error.message || 'Upload failed.';
            setMessage({ type: 'error', text: errorMsg });
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="clean-card h-full flex flex-col">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <FileText className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-lg font-semibold text-slate-900">Step 1: Resume</h3>
                    <p className="text-sm text-slate-500">Upload your latest CV or Portfolio</p>
                </div>
            </div>

            <div
                className={`
                    flex-1 flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl transition-all duration-200 relative
                    ${uploading ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer border-slate-200 hover:border-indigo-400 bg-slate-50/30'}
                `}
                onClick={() => !uploading && fileInputRef.current.click()}
            >
                <input
                    ref={fileInputRef}
                    id="cv-upload"
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    disabled={uploading}
                />

                {!file ? (
                    <div className="text-center pointer-events-none">
                        <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mx-auto mb-4 text-slate-400 group-hover:text-indigo-600 transition-colors">
                            <Upload className="w-6 h-6" />
                        </div>
                        <p className="text-slate-600 font-medium mb-1">Click or drag to upload</p>
                        <p className="text-xs text-slate-400">PDF, DOCX (Max 5MB)</p>
                    </div>
                ) : (
                    <div className="w-full text-center">
                        <div className="inline-flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-lg shadow-sm max-w-full">
                            <div className="w-10 h-10 rounded bg-green-50 flex items-center justify-center text-green-600">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <div className="text-left min-w-0 pr-4">
                                <p className="text-sm font-medium text-slate-900 truncate max-w-[150px]">{file.name}</p>
                                <p className="text-xs text-slate-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setFile(null);
                                    setMessage(null);
                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                }}
                                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                            >
                                <XCircle className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {uploading && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center rounded-xl z-20">
                        <div className="flex flex-col items-center">
                            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            <p className="mt-2 text-sm font-medium text-indigo-600">Processing Document...</p>
                        </div>
                    </div>
                )}
            </div>

            {message && (
                <div className={`mt-4 flex items-center p-3 rounded-lg border text-sm ${message.type === 'success'
                    ? 'bg-green-50 border-green-100 text-green-700'
                    : 'bg-red-50 border-red-100 text-red-700'
                    }`}>
                    {message.type === 'success' ? <CheckCircle className="w-4 h-4 mr-2" /> : <XCircle className="w-4 h-4 mr-2" />}
                    <span>{message.text}</span>
                </div>
            )}

            <button
                onClick={handleUpload}
                disabled={!file || uploading}
                className={`mt-4 w-full h-12 rounded-lg font-semibold transition-all ${!file || uploading
                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    : 'btn-primary'
                    }`}
            >
                {uploading ? 'Processing...' : 'Confirm Upload'}
            </button>
        </div>
    );
};

export default CVUploader;
