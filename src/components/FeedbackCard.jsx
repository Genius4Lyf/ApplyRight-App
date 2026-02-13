import React from 'react';
import { motion } from 'framer-motion';
import { User, MessageSquare, Download, Star, Shield, Calendar } from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
import logo from '../assets/logo/applyright-icon.png';

const FeedbackCard = ({ feedback, index = 0, isAdmin = false, onToggleFeature, onDownload, hideActions = false }) => {

    const handleDownloadClick = async (e) => {
        e.stopPropagation();
        if (onDownload) {
            onDownload(feedback._id);
        } else {
            // Default download behavior if not provided
            const cardElement = document.getElementById(`feedback-card-${feedback._id}`);
            if (!cardElement) return;

            try {
                const toastId = toast.loading('Generating high-quality image...');
                await new Promise(resolve => setTimeout(resolve, 100));

                const rect = cardElement.getBoundingClientRect();
                const width = rect.width;
                const height = rect.height;

                const wrapper = document.createElement('div');
                wrapper.style.padding = '50px';
                wrapper.style.backgroundColor = 'transparent';
                wrapper.style.position = 'fixed';
                wrapper.style.top = '0';
                wrapper.style.left = '0';
                wrapper.style.zIndex = '-9999';
                wrapper.style.width = `${width + 100}px`;
                wrapper.style.height = `${height + 100}px`;

                document.body.appendChild(wrapper);

                const clonedCard = cardElement.cloneNode(true);
                clonedCard.style.width = `${width}px`;
                clonedCard.style.height = `${height}px`;
                clonedCard.style.transform = 'none';
                clonedCard.style.margin = '0';
                clonedCard.style.maxWidth = 'none';
                clonedCard.removeAttribute('id');

                const downloadBtn = clonedCard.querySelector('.download-btn');
                if (downloadBtn) downloadBtn.style.display = 'none';

                // Hide feature button in clone too
                const featureBtn = clonedCard.querySelector('.feature-btn');
                if (featureBtn) featureBtn.style.display = 'none';

                wrapper.appendChild(clonedCard);
                await new Promise(resolve => setTimeout(resolve, 50));

                const dataUrl = await toPng(wrapper, {
                    quality: 1.0,
                    pixelRatio: 3,
                    backgroundColor: null,
                    width: width + 100,
                    height: height + 100,
                });

                document.body.removeChild(wrapper);

                const link = document.createElement('a');
                const filename = `ApplyRight-Feedback-${feedback?.user?.firstName || 'User'}-${feedback._id.slice(-4)}.png`;
                link.href = dataUrl;
                link.download = filename;
                link.click();

                toast.dismiss(toastId);
                toast.success('Image downloaded successfully!');
            } catch (error) {
                console.error('Download error:', error);
                toast.dismiss();
                toast.error('Failed to generate image');
            }
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className={`group relative bg-[#F8FAFC] rounded-sm p-8 shadow-[8px_8px_0px_0px_rgba(79,70,229,0.2)] border-l-4 border-indigo-600 transition-all duration-300 transform -translate-y-1 overflow-hidden ${!hideActions && feedback.isFeatured ? 'ring-2 ring-yellow-400' : ''}`}
            id={`feedback-card-${feedback._id}`}
        >
            {/* Paper Texture Effect */}
            <div className="absolute inset-0 bg-white opacity-40 mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>

            {/* Watermark Logo */}
            <div className="absolute bottom-4 right-4 opacity-[0.08] transition-opacity duration-500 scale-150 pointer-events-none">
                <img src={logo} alt="ApplyRight" className="w-32 h-32 grayscale" />
            </div>

            {/* Header: User Info */}
            <div className="relative z-10 flex items-center justify-between mb-6 border-b border-slate-100 pb-4 border-dashed">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 font-bold font-serif text-sm">
                        {feedback.user?.firstName?.[0] || ''}{feedback.user?.lastName?.[0] || ''}
                    </div>
                    <div>
                        <h3 className="text-slate-900 font-serif font-bold text-lg tracking-tight leading-none">
                            {feedback.user?.firstName} {feedback.user?.lastName}
                        </h3>
                        <div className="flex items-center gap-1 text-indigo-500/80 text-xs font-medium uppercase tracking-wider mt-1">
                            <span>Verified User</span>
                            <Shield className="w-3 h-3" />
                        </div>
                    </div>
                </div>

                {/* Actions Section */}
                <div className="flex items-center gap-2">
                    {/* Admin Feature Toggle */}
                    {isAdmin && onToggleFeature && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleFeature(feedback._id);
                            }}
                            className={`feature-btn p-2 rounded-full transition-all ${feedback.isFeatured ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200' : 'text-slate-300 hover:text-yellow-500 hover:bg-yellow-50'}`}
                            title={feedback.isFeatured ? "Unfeature" : "Feature"}
                        >
                            <Star className={`w-4 h-4 ${feedback.isFeatured ? 'fill-current' : ''}`} />
                        </button>
                    )}

                    {/* Download Button */}
                    {!hideActions && (
                        <button
                            onClick={handleDownloadClick}
                            className="download-btn p-2 text-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                            title="Download as Image"
                        >
                            <Download className="w-5 h-5" />
                        </button>
                    )}

                    <div className="text-indigo-300">
                        <MessageSquare className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Metadata Row */}
            <div className="relative z-10 flex items-center gap-2 text-xs font-mono text-slate-400 mb-4 pl-1">
                <Calendar className="w-3 h-3 text-indigo-300" />
                <span>
                    {new Date(feedback.createdAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    })}
                </span>
                <span className="w-1 h-1 rounded-full bg-indigo-200 mx-1"></span>
                <span className="text-indigo-400">ApplyRight Feedback</span>
            </div>

            {/* Body: Handwritten/Typewriter Vibe */}
            <div className="relative z-10 mb-8 min-h-[80px]">
                <p className="text-slate-700 text-lg leading-relaxed font-serif italic">
                    "{feedback.message}"
                </p>
            </div>


        </motion.div>
    );
};

export default FeedbackCard;
