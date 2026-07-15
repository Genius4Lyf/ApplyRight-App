import React, { useState, useEffect } from 'react';
import { Loader } from 'lucide-react';

/**
 * LoadingScreen - Full-screen loading overlay with a rotating "ApplyRight Pro
 * Tip" card and an optional progress bar. Shown during longer async operations
 * (e.g. loading a CV for review, generating a PDF) so the wait feels productive.
 * It renders no ads.
 *
 * @param {string[]} messages - Array of loading messages to rotate through
 * @param {boolean} showProgress - Whether to show the progress bar
 * @param {function} onComplete - Callback when minimum display time reached
 * @param {number} duration - Minimum display time in ms (default 10000)
 */
const LoadingScreen = ({
  messages = ['Processing...'],
  showProgress = false,
  onComplete = null,
  duration = 10000, // Default to 10 seconds if not specified
}) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const MIN_DISPLAY_TIME = duration; // Use prop duration
  const MESSAGE_ROTATION_TIME = 3500; // Rotate messages every 3.5 seconds

  // Rotate through messages
  useEffect(() => {
    if (messages.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, MESSAGE_ROTATION_TIME);

    return () => clearInterval(interval);
  }, [messages.length]);

  // Track display time and progress
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;

      if (showProgress) {
        const progressPercent = Math.min((elapsed / duration) * 100, 95);
        setProgress(progressPercent);
      }

      if (elapsed >= MIN_DISPLAY_TIME && onComplete) {
        onComplete();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [showProgress, onComplete]);

  // Rotating Tips Logic
  const tips = [
    'Tailor your CV to every job description for better results.',
    "Use action verbs like 'Led', 'Created', and 'Optimized'.",
    'Keep your CV concise - 1-2 pages is usually best.',
    'Quantify your achievements with numbers and percentages.',
    'Proofread carefully! Typos can be a dealbreaker.',
    'Focus on results, not just responsibilities.',
    'Save your CV as a PDF to ensure formatting stays consistent.',
  ];

  // Random starting tip on each mount so users see different tips across loads.
  const [currentTipIndex, setCurrentTipIndex] = useState(() =>
    Math.floor(Math.random() * tips.length)
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTipIndex((prev) => (prev + 1) % tips.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const currentMessage = messages[currentMessageIndex];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      {/* App background matching App.jsx */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none bg-slate-50 dark:bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:24px_24px] opacity-60 dark:opacity-35"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-100/60 rounded-full blur-3xl mix-blend-multiply translate-x-1/3 -translate-y-1/3 dark:hidden"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-sky-100/50 rounded-full blur-3xl mix-blend-multiply -translate-x-1/4 translate-y-1/4 dark:hidden"></div>
      </div>

      <div className="relative z-10 w-full max-w-3xl max-h-full overflow-y-auto p-6 bg-white dark:bg-slate-900 rounded-3xl sm:p-8 sm:m-4 shadow-xl sm:shadow-2xl border border-slate-150 dark:border-slate-800/85">
        {/* Loading indicator */}
        <div className="flex flex-col items-center mb-8">
          <Loader className="w-12 h-12 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 text-center">
            {currentMessage}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">This will only take a moment</p>
        </div>

        {/* ApplyRight Pro Tip card */}
        <div className="my-6">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/20 dark:to-purple-950/20 rounded-2xl border border-indigo-100 dark:border-indigo-900/30 p-6 flex flex-col md:flex-row items-center gap-6 relative overflow-hidden">
            {/* Decorative Background */}
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-100 dark:bg-indigo-900/40 rounded-full blur-2xl opacity-50"></div>
            <div className="absolute bottom-0 left-0 -mb-4 -ml-4 w-24 h-24 bg-purple-100 dark:bg-purple-900/40 rounded-full blur-2xl opacity-50"></div>

            {/* Icon */}
            <div className="relative z-10 bg-white dark:bg-slate-800 p-3 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700/50">
              <svg
                className="w-8 h-8 text-indigo-600 dark:text-indigo-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            {/* Text */}
            <div className="relative z-10 flex-1 text-center md:text-left">
              <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider mb-1">
                ApplyRight Pro Tip
              </h3>
              <p className="text-slate-700 dark:text-slate-300 font-medium text-lg leading-relaxed">
                "{tips[currentTipIndex]}"
              </p>
            </div>
          </div>
        </div>

        {/* Apologetic message (Updated for tips) */}
        <p className="text-sm text-slate-400 dark:text-slate-500 text-center mb-6">
          Sit tight! We're optimizing your experience.
        </p>

        {/* Progress bar (optional) */}
        {showProgress && (
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-600 dark:bg-indigo-500 h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;
