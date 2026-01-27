import React, { useState } from 'react';
import { TEMPLATES } from '../data/templates';
import { CheckCircle, Star, FileText } from 'lucide-react';

import TemplateThumbnail from './TemplateThumbnail';

import { toast } from 'sonner';


const TemplateSelector = ({ selectedTemplate, onSelect, userPlan = 'free', onPreview }) => {

    const handleSelect = (template) => {
        // Allow selection of all templates, including pro templates
        onSelect(template.id);
    };

    return (
        <div className="w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {TEMPLATES.map((template) => {
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

                            `}
                        >
                            {/* View CV Overlay for all templates */}
                            <div className="absolute inset-0 z-20 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors duration-300 flex items-center justify-center">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(template); // Ensure it selects too
                                        if (onPreview) onPreview();
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 bg-white text-slate-900 px-4 py-2 rounded-full shadow-lg font-bold text-sm flex items-center hover:scale-105"
                                >
                                    <FileText className="w-4 h-4 mr-2 text-indigo-600" />
                                    View CV
                                </button>
                            </div>
                            {/* Mock Thumbnail / Preview Area */}
                            <div className={`h-40 w-full bg-slate-50 flex items-center justify-center relative overflow-hidden group-hover:bg-indigo-50/30 transition-colors`}>
                                <TemplateThumbnail type={template.id} />

                                {template.isPro && (
                                    <div className="absolute top-2 right-2 bg-gradient-to-r from-amber-500 to-amber-600 text-white text-[10px] uppercase font-bold px-2 py-1 rounded-full flex items-center shadow-sm z-10">
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

                                </div>
                            </div>


                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default TemplateSelector;
