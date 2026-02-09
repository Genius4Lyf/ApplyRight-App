import React, { useState } from 'react';
import { TEMPLATES } from '../data/templates';
import { CheckCircle, Star, FileText, ArrowRight, Lock, PlayCircle, Loader, Zap, X } from 'lucide-react';

import TemplateThumbnail from './TemplateThumbnail';
import AdPlayer from './AdPlayer';
import api from '../services/api';

import { toast } from 'sonner';


const TemplateSelector = ({ selectedTemplate, onSelect, user = {}, onPreview, isCompact = false }) => {
    const [unlockModalOpen, setUnlockModalOpen] = useState(false);
    const [templateToUnlock, setTemplateToUnlock] = useState(null);
    const [adOpen, setAdOpen] = useState(false);
    const [unlocking, setUnlocking] = useState(false);

    // Helper to check if template is unlocked
    const isUnlocked = (template) => {
        if (!template.isPro) return true; // Free templates always unlocked
        if (user.plan === 'paid') return true; // Pro users unlock everything (assuming)
        if (user.unlockedTemplates && user.unlockedTemplates.includes(template.id)) return true;
        return false;
    };

    const handleSelect = (template) => {
        // Allow selection of all templates for preview
        onSelect(template.id);
    };

    const handleUnlock = async () => {
        if (!templateToUnlock) return;
        setUnlocking(true);
        try {
            const res = await api.post('/billing/unlock-template', {
                templateId: templateToUnlock.id,
                cost: templateToUnlock.cost
            });

            if (res.data.success) {
                toast.success("Template unlocked!");
                // Update user state - relies on parent updating or triggering reload. 
                // Ideally we dispatch an event or callback.
                // For now, let's assume parent might catch this or we dispatch a global event
                window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: { credits: res.data.credits, unlockedTemplates: res.data.unlockedTemplates } }));

                // Select the template
                onSelect(templateToUnlock.id);
                setUnlockModalOpen(false);
                setTemplateToUnlock(null);
            }
        } catch (error) {
            console.error("Unlock failed", error);
            if (error.response?.data?.error === 'INSUFFICIENT_CREDITS') {
                toast.error("Insufficient credits.");
                // We could switch to ad view here directly or let user click button
            } else {
                toast.error("Failed to unlock template");
            }
        } finally {
            setUnlocking(false);
        }
    };

    const handleAdComplete = async () => {
        setAdOpen(false);
        try {
            // Award credits
            await api.post('/billing/watch-ad');

            // We need to fetch updated profile to get new credits
            const res = await api.get('/auth/me');
            // Dispatch update
            window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: res.data }));
            toast.success("Credits earned! You can now unlock the template.");
        } catch (e) {
            console.error(e);
            toast.error("Failed to reward credits.");
        }
    };

    // Filter templates if isCompact is true
    const FEATURED_TEMPLATE_IDS = [
        'ats-clean',
        'student-ats',
        'energy-slb',
        'energy-nlng',
        'energy-total'
    ];

    const displayTemplates = isCompact
        ? TEMPLATES.filter(t => FEATURED_TEMPLATE_IDS.includes(t.id))
        : TEMPLATES;


    return (
        <div className="w-full relative">
            {adOpen && (
                <AdPlayer
                    onComplete={handleAdComplete}
                    onClose={() => setAdOpen(false)}
                />
            )}

            {unlockModalOpen && templateToUnlock && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl scale-100 animate-in zoom-in-95 duration-200 relative">
                        <button
                            onClick={() => setUnlockModalOpen(false)}
                            className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="text-center mb-6">
                            <div className="w-16 h-16 mx-auto mb-4 relative">
                                <TemplateThumbnail type={templateToUnlock.id} className="w-full h-full rounded-lg shadow-md object-cover" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg">
                                    <Lock className="w-8 h-8 text-white" />
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900">Unlock {templateToUnlock.name}</h3>
                            <p className="text-slate-500 mt-2">
                                This is a premium template. Unlock it to use it for your applications.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <button
                                onClick={handleUnlock}
                                disabled={unlocking || (user.credits || 0) < templateToUnlock.cost}
                                className={`w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${(user.credits || 0) >= templateToUnlock.cost
                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-100'
                                    : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    }`}
                            >
                                {unlocking ? (
                                    <Loader className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
                                        Unlock for {templateToUnlock.cost} Credits
                                    </>
                                )}
                            </button>

                            {(user.credits || 0) < templateToUnlock.cost && (
                                <div className="text-center">
                                    <p className="text-sm text-red-500 font-medium mb-3">
                                        Insufficient credits (Have: {user.credits || 0})
                                    </p>
                                    <div className="relative flex py-2 items-center mb-3">
                                        <div className="flex-grow border-t border-slate-200"></div>
                                        <span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase font-bold">OR</span>
                                        <div className="flex-grow border-t border-slate-200"></div>
                                    </div>
                                    <button
                                        onClick={() => setAdOpen(true)}
                                        className="w-full py-3 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                    >
                                        <PlayCircle className="w-5 h-5 text-green-500" />
                                        Watch Ad for +5 Credits
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayTemplates.map((template) => {
                    const isSelected = selectedTemplate === template.id;
                    const locked = !isUnlocked(template);

                    return (
                        <div
                            key={template.id}
                            onClick={() => handleSelect(template)}
                            className={`
                                relative group cursor-pointer rounded-xl border-2 transition-all duration-300 overflow-hidden
                                ${isSelected
                                    ? 'border-indigo-600 ring-4 ring-indigo-50 shadow-xl scale-[1.02]'
                                    : 'border-slate-200 hover:border-indigo-300 hover:shadow-md'}
                            `}
                        >
                            {/* Overlay */}
                            <div className="absolute inset-0 z-20 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors duration-300 flex items-center justify-center">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(template);
                                        if (onPreview) onPreview();
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 bg-white text-slate-900 px-4 py-2 rounded-full shadow-lg font-bold text-sm flex items-center hover:scale-105"
                                >
                                    <FileText className="w-4 h-4 mr-2 text-indigo-600" />
                                    {locked ? 'Preview' : 'View CV'}
                                </button>
                            </div>

                            {/* Thumbnail Area */}
                            <div className={`h-40 w-full bg-slate-50 flex items-center justify-center relative overflow-hidden group-hover:bg-indigo-50/30 transition-colors`}>
                                <TemplateThumbnail type={template.id} />

                                {template.isPro && !locked && (
                                    <div className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-full flex items-center shadow-sm z-10">
                                        <Star className="w-3 h-3 mr-1 fill-white" /> Pro
                                    </div>
                                )}
                                {locked && (
                                    <div className="absolute top-2 right-2 bg-slate-800 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-full flex items-center shadow-sm z-10">
                                        <Lock className="w-3 h-3 mr-1" /> {template.cost}
                                    </div>
                                )}
                                {template.isRecommended && (
                                    <div className="absolute top-2 left-2 bg-emerald-500 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-full flex items-center shadow-sm z-10">
                                        <Star className="w-3 h-3 mr-1 fill-white" /> Recommended
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-4 bg-white relative">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                            {template.name}
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{template.description}</p>
                                    </div>
                                    {isSelected && (
                                        <CheckCircle className="w-6 h-6 text-indigo-600 fill-indigo-50 flex-shrink-0" />
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {isCompact && (
                    <div
                        onClick={onPreview}
                        className="cursor-pointer rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all flex flex-col items-center justify-center p-6 h-full min-h-[200px]"
                    >
                        <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                            <FileText className="w-6 h-6" />
                        </div>
                        <h3 className="font-bold text-slate-800">View All Architecture</h3>
                        <p className="text-xs text-slate-500 text-center mt-2 px-4">Browse our full collection of professional templates</p>
                        <button className="mt-4 text-sm font-semibold text-indigo-600 flex items-center">
                            See All Templates <ArrowRight className="w-4 h-4 ml-1" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TemplateSelector;
