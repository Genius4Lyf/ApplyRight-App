import React, { useState, useEffect } from 'react';
import AriaLoader from './ui/AriaLoader';
import useMedia from '../hooks/useMedia';

/**
 * LoadingScreen - Full-screen loading overlay with a rotating message and an
 * optional progress bar. Shown during longer async operations (e.g. loading a
 * CV for review). No tips card - see /cv-tips for that content instead.
 */
const LoadingScreen = ({
  messages = ['Processing...'],
  showProgress = false,
  onComplete = null,
  duration = 10000,
}) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  // 48px was sized for desktop and never revisited for a phone screen — every other
  // full-screen route loader in the app tops out at 40 (see AriaLoader's callers), so 48
  // was already the outlier. Below the 640px breakpoint this app already treats as
  // "mobile" elsewhere, drop to the same 32px those loaders use.
  const isMobile = useMedia('(max-width: 639px)');
  const markSize = isMobile ? 32 : 48;

  const MESSAGE_ROTATION_TIME = 3500;

  useEffect(() => {
    if (messages.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentMessageIndex((prev) => (prev + 1) % messages.length);
    }, MESSAGE_ROTATION_TIME);
    return () => clearInterval(interval);
  }, [messages.length]);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (showProgress) {
        setProgress(Math.min((elapsed / duration) * 100, 95));
      }
      if (elapsed >= duration && onComplete) {
        onComplete();
      }
    }, 100);
    return () => clearInterval(interval);
  }, [showProgress, onComplete, duration]);

  const currentMessage = messages[currentMessageIndex];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none bg-[#f6f6f3] dark:bg-slate-950"></div>

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full">
        <AriaLoader inline size={markSize} label="Working…" className="mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
          {currentMessage}
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-2">This will only take a moment</p>

        {showProgress && (
          <div className="w-full mt-6 bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
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
