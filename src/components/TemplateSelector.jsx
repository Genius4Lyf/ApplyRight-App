import React, { useState } from 'react';
import { TEMPLATES } from '../data/templates';
import { CheckCircle, Lock, Sparkles, Star } from 'lucide-react';

import { toast } from 'sonner';

const TemplateSelector = ({ selectedTemplate, onSelect, userPlan = 'free' }) => {

    const handleSelect = (template) => {
        if (template.isPro && userPlan === 'free') {
            // In a real app, this would trigger an upgrade modal
            toast.warning("This is a Premium Template. Upgrade to ApplyRight Pro to unlock!");
            return;
        }
        onSelect(template.id);
    };

    return (
        <div className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {TEMPLATES.map((template) => {
                    const isLocked = template.isPro && userPlan === 'free';
                    const isSelected = selectedTemplate === template.id;

                    return (
                        <div
                            key={template.id}
                            onClick={() => handleSelect(template)}
                            className={`
                                relative group cursor-pointer rounded-xl border-2 transition-all duration-300 overflow-hidden
                                ${isSelected
                                    ? 'border-indigo-600 ring-4 ring-indigo-50 shadow-xl scale-[1.02]'
                                    : 'border-slate-200 hover:border-indigo-300 hover:shadow-md'}
                                ${isLocked ? 'opacity-90' : ''}
                            `}
                        >
                            {/* Mock Thumbnail / Preview Area */}
                            <div className={`h-40 w-full ${template.thumbnail} flex items-center justify-center relative`}>
                                {/* Abstract lines for "document" look */}
                                <div className="w-16 h-20 bg-white shadow-sm flex flex-col gap-2 p-2">
                                    <div className="w-full h-2 bg-slate-200 rounded-full"></div>
                                    <div className="w-2/3 h-2 bg-slate-100 rounded-full"></div>
                                    <div className="w-full h-2 bg-slate-100 rounded-full mt-2"></div>
                                </div>

                                {template.isPro && (
                                    <div className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-full flex items-center shadow-sm">
                                        <Star className="w-3 h-3 mr-1 fill-white" /> Pro
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-4 bg-white relative">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h3 className="font-bold text-slate-800">{template.name}</h3>
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{template.description}</p>
                                    </div>
                                    {isSelected && (
                                        <CheckCircle className="w-6 h-6 text-indigo-600 fill-indigo-50 flex-shrink-0" />
                                    )}
                                    {isLocked && !isSelected && (
                                        <Lock className="w-5 h-5 text-slate-400 group-hover:text-amber-500 transition-colors" />
                                    )}
                                </div>
                            </div>

                            {/* Locked Overlay */}
                            {isLocked && (
                                <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                    <div className="bg-slate-900 text-white px-4 py-2 rounded-full font-bold text-sm flex items-center shadow-xl transform group-hover:scale-105 transition-transform">
                                        <Sparkles className="w-4 h-4 mr-2 text-amber-400" />
                                        Unlock Premium
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TemplateSelector;
