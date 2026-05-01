import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { markOnboardingComplete } from '../../utils/platform';

const SCREENS = [
  {
    image: '/onboarding/screen1.svg',
    title: 'Land more interviews',
    body: 'Stand out from hundreds of applicants with CVs and cover letters built to win.',
    cta: 'Next',
  },
  {
    image: '/onboarding/screen2.svg',
    title: 'AI tailored to every job',
    body: 'Our AI rewrites your CV and cover letter to match each job in seconds — no copy-paste.',
    cta: 'Next',
  },
  {
    image: '/onboarding/screen3.svg',
    title: 'Get started free',
    body: 'Sign up in under a minute and get your first AI-tailored CV today.',
    cta: 'Get Started',
  },
];

const MobileWelcome = () => {
  const [index, setIndex] = useState(0);
  const navigate = useNavigate();

  const finish = () => {
    markOnboardingComplete();
    navigate('/login', { replace: true });
  };

  const next = () => {
    if (index === SCREENS.length - 1) finish();
    else setIndex(index + 1);
  };

  const screen = SCREENS[index];

  return (
    <div className="min-h-screen flex flex-col bg-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex justify-end p-4">
        <button
          onClick={finish}
          className="text-gray-500 text-sm font-medium px-3 py-1"
        >
          Skip
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="space-y-6 flex flex-col items-center"
          >
            {screen.image && (
              <img
                src={screen.image}
                alt=""
                className="w-64 h-64 object-contain"
              />
            )}
            <h1 className="text-3xl font-bold text-gray-900">{screen.title}</h1>
            <p className="text-base text-gray-600 max-w-sm mx-auto">{screen.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="flex justify-center gap-2 pb-6">
        {SCREENS.map((_, i) => (
          <span
            key={i}
            className={`h-2 w-2 rounded-full transition-colors ${
              i === index ? 'bg-indigo-600' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      <div className="p-6 pb-10">
        <button
          onClick={next}
          className="w-full bg-indigo-600 text-white font-semibold py-4 rounded-xl active:bg-indigo-700 transition-colors"
        >
          {screen.cta}
        </button>
      </div>
    </div>
  );
};

export default MobileWelcome;
