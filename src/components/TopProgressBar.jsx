import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

const TopProgressBar = () => {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Start progress
    setVisible(true);
    setProgress(15);
    
    // Simulate network and render progress
    const timer1 = setTimeout(() => setProgress(65), 150);
    const timer2 = setTimeout(() => setProgress(100), 300);
    
    // Hide quickly after reaching 100%
    const timer3 = setTimeout(() => {
      setVisible(false);
      // Reset width to 0 *after* opacity fade out completes
      setTimeout(() => setProgress(0), 300); 
    }, 500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [location.pathname]);

  if (!visible && progress === 0) return null;

  return (
    <div 
      className={`fixed top-0 left-0 w-full z-[9999] pointer-events-none transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      <div 
        className="h-[3px] bg-indigo-600 shadow-[0_0_10px_#4f46e5,0_0_5px_#4f46e5] rounded-r-full transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};

export default TopProgressBar;
