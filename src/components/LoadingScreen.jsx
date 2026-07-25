import React, { useState, useEffect } from 'react';
import AriaLoader from './ui/AriaLoader';

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
      {/* Solid ground matching App.jsx — warm off-white / deep navy. */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[#f6f6f3] dark:bg-slate-950"></div>

      <div className="relative z-10 w-full max-w-3xl max-h-full overflow-y-auto p-6 bg-white dark:bg-slate-900 rounded-xl sm:p-8 sm:m-4 shadow-xl sm:shadow-2xl border border-slate-150 dark:border-slate-800/85">
        {/* Loading indicator */}
        <div className="flex flex-col items-center mb-8">
          <AriaLoader inline size={48} label="Working…" className="mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 text-center">
            {currentMessage}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-2">This will only take a moment</p>
        </div>

        {/* ApplyRight Pro Tip card */}
        <div className="my-6">
          <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col md:flex-row items-center gap-6">
            {/* Icon */}
            <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <svg
                className="w-8 h-8 text-slate-500 dark:text-slate-400"
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
            <div className="flex-1 text-center md:text-left">
              <h3 className="font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500 mb-1">
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
              className="bg-slate-900 dark:bg-white h-2 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;
