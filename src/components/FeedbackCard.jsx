import React from 'react';
// `motion` is used only via <motion.div> in JSX; this eslint config lacks
// jsx-uses-vars so it reads as unused — suppress the false positive.
// eslint-disable-next-line no-unused-vars
import { motion } from 'framer-motion';
import { User, MessageSquare, Download, Star, Shield, Calendar } from 'lucide-react';
import { domToPng } from 'modern-screenshot';
import { toast } from 'sonner';

const FeedbackCard = ({
  feedback,
  index = 0,
  isAdmin = false,
  onToggleFeature,
  onDownload,
  hideActions = false,
}) => {
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
        await new Promise((resolve) => setTimeout(resolve, 100));

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
        await new Promise((resolve) => setTimeout(resolve, 50));

        const dataUrl = await domToPng(wrapper, {
          quality: 1.0,
          scale: 3,
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
      className={`group relative bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8 shadow-clean overflow-hidden transition-colors ${!hideActions && feedback.isFeatured ? 'ring-1 ring-amber-300 dark:ring-amber-500/40' : ''}`}
      id={`feedback-card-${feedback._id}`}
    >
      {/* Header: User Info */}
      <div className="relative z-10 flex items-center justify-between mb-6 border-b border-dashed border-slate-100 dark:border-slate-700 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-500/15 border border-indigo-100 dark:border-indigo-500/30 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-bold font-serif text-sm">
            {feedback.user?.firstName?.[0] || ''}
            {feedback.user?.lastName?.[0] || ''}
          </div>
          <div>
            <h3 className="text-slate-900 dark:text-slate-100 font-serif font-bold text-lg tracking-tight leading-none">
              {feedback.user?.firstName} {feedback.user?.lastName}
            </h3>
            <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500 text-xs font-medium uppercase tracking-wider mt-1">
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
              title={feedback.isFeatured ? 'Unfeature' : 'Feature'}
            >
              <Star className={`w-4 h-4 ${feedback.isFeatured ? 'fill-current' : ''}`} />
            </button>
          )}

          {/* Download Button */}
          {!hideActions && (
            <button
              onClick={handleDownloadClick}
              className="download-btn p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-500/15 rounded-full transition-colors"
              title="Download as Image"
            >
              <Download className="w-5 h-5" />
            </button>
          )}

          <div className="text-slate-300 dark:text-slate-600">
            <MessageSquare className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Metadata Row */}
      <div className="relative z-10 flex items-center gap-2 text-xs font-mono text-slate-400 mb-4 pl-1">
        <Calendar className="w-3 h-3 text-slate-400" />
        <span>
          {new Date(feedback.createdAt).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })}
        </span>
        <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 mx-1"></span>
        <span className="text-slate-400 dark:text-slate-500">ApplyRight Feedback</span>
      </div>

      {/* Body: Handwritten/Typewriter Vibe */}
      <div className="relative z-10 mb-8 min-h-[80px]">
        <p className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed font-serif italic">
          "{feedback.message}"
        </p>
      </div>
    </motion.div>
  );
};

export default FeedbackCard;
