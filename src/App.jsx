import {
  createBrowserRouter,
  RouterProvider,
  useLocation,
  useOutlet,
  Navigate,
} from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { cloneElement, useEffect } from 'react';
import { Toaster } from 'sonner';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import JobSearch from './pages/JobSearch';
import JobHistory from './pages/JobHistory';
import Compare from './pages/Compare';
import Profile from './pages/Profile';
import LandingPage from './pages/LandingPage';
import MobileHomeRedirect from './components/MobileHomeRedirect';
import MobileWelcome from './pages/mobile/MobileWelcome';
import InterviewPrepList from './pages/InterviewPrepList';
import InterviewPrepDetail from './pages/InterviewPrepDetail';
import InterviewPracticePage from './pages/InterviewPracticePage';
import PreCallBrief from './pages/PreCallBrief';
import MockInterviewPage from './pages/MockInterviewPage';
import InterviewStart from './pages/InterviewStart';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { isMobile, shouldShowBottomNav } from './utils/platform';
import { waitForReady } from './utils/splash';
import MobileBottomNav from './components/MobileBottomNav';
import ApplicationReview from './pages/ApplicationReview';
import ResumeReview from './pages/ResumeReview';
import MyCVs from './pages/MyCVs';
import CVBuilderLayout from './pages/CVBuilder/CVBuilderLayout';
import TargetJob from './pages/CVBuilder/TargetJob';
import Heading from './pages/CVBuilder/Heading';
import ProfessionalSummary from './pages/CVBuilder/ProfessionalSummary';
import Upgrade from './pages/Upgrade';
import BillingReturn from './pages/BillingReturn';
import CreditStore from './pages/CreditStore';
import History from './pages/CVBuilder/History';
import Projects from './pages/CVBuilder/Projects';
import Education from './pages/CVBuilder/Education';
import Skills from './pages/CVBuilder/Skills';
import Finalize from './pages/CVBuilder/Finalize';
import ErrorBoundary from './components/ErrorBoundary';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Contact from './pages/Contact';
import ATSGuide from './pages/ATSGuide';
import Pricing from './pages/Pricing';
import HowATSRecruitersWork from './pages/HowATSRecruitersWork';
import HowToAceYourInterview from './pages/HowToAceYourInterview';
import FeedbackPage from './pages/FeedbackPage';
import FeedbackDashboard from './pages/FeedbackDashboard';
import MaintenanceGuard from './components/MaintenanceGuard';
import useIdleTimeout from './hooks/useIdleTimeout';
import SessionTimeoutModal from './components/SessionTimeoutModal';
import TopProgressBar from './components/TopProgressBar';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { isDarkEligibleRoute } from './utils/theme';

// Session Manager Component
const SessionManager = ({ children }) => {
  const location = useLocation(); // Force re-render on navigation
  const token = localStorage.getItem('token');
  // Safe parsing of user
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch {
    user = null;
  }

  const handleIdle = () => {
    const isAdmin = user?.role === 'admin';
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = isAdmin ? '/secret-access-portal-v1' : '/login';
  };

  const { isWarning, remainingTime, resetTimer } = useIdleTimeout({
    idleTime: 1 * 60 * 1000,
    warningTime: 60 * 1000,
    onIdle: handleIdle,
    enabled: token && user?.role === 'admin' && location.pathname.startsWith('/admin'),
  });

  return (
    <>
      {children}
      {/* Only show warning if user is actually authenticated */}
      {token && (
        <SessionTimeoutModal
          isOpen={isWarning}
          remainingTime={remainingTime}
          onExtendSession={resetTimer}
          onLogout={handleIdle}
        />
      )}
    </>
  );
};

// Job-seeker-only routes that a CV agent should never land on (they have a
// CV-only workspace at /agent). Agents keep access to /my-cvs, /cv-builder,
// /upgrade and /profile, which they need to build and pay for client CVs.
const AGENT_BLOCKED_PREFIXES = ['/dashboard', '/history', '/interview-prep', '/jobs'];

const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const location = useLocation();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  // Bounce agents out of job-seeker pages into their own dashboard.
  const user = readUser();
  if (
    user.role === 'agent' &&
    AGENT_BLOCKED_PREFIXES.some((p) => location.pathname.startsWith(p))
  ) {
    return <Navigate to="/agent" replace />;
  }
  return children;
};

// Guest Route Component (redirects to dashboard if already authenticated)
const GuestRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (token) {
    const user = readUser();
    return <Navigate to={user.role === 'agent' ? '/agent' : '/dashboard'} replace />;
  }
  return children;
};

// Agent Protected Route — mirrors AdminRoute, for CV-agent accounts.
const AgentRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  const user = readUser();
  if (user.role !== 'agent') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

// Root Layout to handle global providers and animations
const RootLayout = () => {
  const location = useLocation();
  const element = useOutlet();
  const { theme, toggleTheme } = useTheme();

  // Dark mode is scoped to the authenticated user UI only. Toggle `.dark` on
  // <html> (so React portals rendered to document.body inherit it) whenever the
  // user prefers dark AND the current route is dark-eligible; remove it on any
  // public/auth/admin page. This is the single place that owns the class.
  useEffect(() => {
    const on = theme === 'dark' && isDarkEligibleRoute(location.pathname);
    document.documentElement.classList.toggle('dark', on);
  }, [location.pathname, theme]);

  // Custom key function to prevent CVBuilderLayout from remounting on step changes
  const getPageKey = (pathname) => {
    if (pathname.startsWith('/cv-builder')) {
      const parts = pathname.split('/');
      // parts: ['', 'cv-builder', 'id', 'step']
      // Return /cv-builder/id so switching steps doesn't trigger AnimatePresence remount
      if (parts.length >= 3) {
        return `/${parts[1]}/${parts[2]}`;
      }
    }
    return pathname;
  };

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const showNav = shouldShowBottomNav(location.pathname);

  return (
    <SessionManager>
      <TopProgressBar />

      {/* Global Educative / AI-themed Background */}
      <div className="fixed inset-0 z-[-1] pointer-events-none bg-slate-50 dark:bg-slate-950">
        {/* Subtle dot matrix pattern - slightly darker/more visible */}
        <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#475569_1px,transparent_1px)] [background-size:24px_24px] opacity-60 dark:opacity-35"></div>
        {/* Soft ambient gradients - hidden in dark mode for solid background */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-100/60 rounded-full blur-3xl mix-blend-multiply translate-x-1/3 -translate-y-1/3 dark:hidden"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-sky-100/50 rounded-full blur-3xl mix-blend-multiply -translate-x-1/4 translate-y-1/4 dark:hidden"></div>
      </div>

      <div
        className={`relative z-0 ${showNav ? 'pb-[calc(4rem+env(safe-area-inset-bottom))]' : ''}`}
      >
        <AnimatePresence mode="wait">
          {element && cloneElement(element, { key: getPageKey(location.pathname) })}
        </AnimatePresence>
        {/* Inside the wrapper so modals (z-50) can stack above the nav (z-40);
            otherwise the wrapper's z-0 traps modal z-index in its own stacking
            context and the nav punches through the backdrop on Android. */}
        <MobileBottomNav />

        {/* Floating Theme Toggle */}
        <AnimatePresence>
          {isDarkEligibleRoute(location.pathname) && (
            <motion.div
              className={`fixed right-6 z-40 flex items-center justify-center ${
                showNav
                  ? 'bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6'
                  : 'bottom-6'
              }`}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            >
              <motion.button
                type="button"
                onClick={toggleTheme}
                className={`relative w-10 h-10 rounded-full overflow-hidden flex items-center justify-center backdrop-blur-md border shadow-lg hover:shadow-xl transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  theme === 'light'
                    ? 'bg-gradient-to-b from-slate-900 via-slate-900 to-indigo-950 border-slate-800/80 text-slate-100 focus:ring-slate-500'
                    : 'bg-white/90 border-slate-200/60 text-slate-700 focus:ring-amber-400'
                }`}
                aria-label="Toggle dark mode"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {/* Twinkling stars background inside circle (active when theme is light, representing the night mode toggle) */}
                {theme === 'light' && (
                  <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none">
                    <div className="absolute top-1.5 left-2.5 w-[2px] h-[2px] bg-white rounded-full opacity-70 animate-[pulse_1.5s_infinite]" />
                    <div className="absolute top-3 right-2.5 w-[3px] h-[3px] bg-yellow-100 rounded-full opacity-50 animate-[pulse_2s_infinite]" />
                    <div className="absolute bottom-2 left-3.5 w-[2px] h-[2px] bg-white rounded-full opacity-85 animate-[pulse_1.2s_infinite]" />
                    <div className="absolute bottom-2.5 right-2 w-[2px] h-[2px] bg-white rounded-full opacity-60 animate-[pulse_1.8s_infinite]" />
                  </div>
                )}

                {/* Inner glowing radial effect */}
                {theme === 'light' ? (
                  <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.2)_0%,transparent_70%)] animate-[pulse_3s_ease-in-out_infinite] pointer-events-none" />
                ) : (
                  <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_center,rgba(251,191,36,0.35)_0%,transparent_70%)] animate-[pulse_2.5s_ease-in-out_infinite] pointer-events-none" />
                )}

                {theme === 'light' ? (
                  <Moon className="w-5 h-5 text-indigo-300 relative z-10" />
                ) : (
                  <Sun className="w-5 h-5 text-amber-500 relative z-10 animate-[spin_40s_linear_infinite]" />
                )}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </SessionManager>
  );
};

// Admin Protected Route
const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) {
    return <Navigate to="/secret-access-portal-v1" replace />;
  }

  if (user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Lazy load admin pages to avoid bloating main bundle if possible, but for now direct import is fine
import AdminDashboard from './pages/Admin/AdminDashboard';
import AdminUsers from './pages/Admin/AdminUsers';
import AdminTransactions from './pages/Admin/AdminTransactions';
import AdminUserDetails from './pages/Admin/AdminUserDetails';
import AdminSettings from './pages/Admin/AdminSettings';
import AdminReportStudio from './pages/Admin/AdminReportStudio';
import SecretAdminAuth from './pages/Admin/SecretAdminAuth';
import AdminAIFeedback from './pages/Admin/AdminAIFeedback';

// CV-agent pages (separate CV-only workspace)
import AgentDashboard from './pages/Agent/AgentDashboard';
import AgentEarnings from './pages/Agent/AgentEarnings';

// ... existing router configuration ...

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // ... existing routes ...
      {
        path: '/how-it-works',
        element: <ApplicationReview />,
      },
      {
        path: '/',
        element: (
          <GuestRoute>
            <MobileHomeRedirect />
          </GuestRoute>
        ),
      },
      {
        path: '/welcome',
        element: (
          <GuestRoute>
            <MobileWelcome />
          </GuestRoute>
        ),
      },
      {
        path: '/privacy',
        element: <PrivacyPolicy />,
      },
      {
        path: '/terms',
        element: <TermsOfService />,
      },
      {
        path: '/contact',
        element: <Contact />,
      },
      {
        path: '/ats-guide',
        element: <ATSGuide />,
      },
      {
        // Public, logged-out pricing page (the only place with the seeker/agent toggle).
        path: '/pricing',
        element: <Pricing />,
      },
      {
        path: '/how-ats-recruiters-work',
        element: <HowATSRecruitersWork />,
      },
      {
        path: '/how-to-ace-your-interview',
        element: <HowToAceYourInterview />,
      },
      {
        path: '/feedback',
        element: <FeedbackPage />,
      },
      {
        path: '/feedback/dashboard',
        element: (
          <MaintenanceGuard>
            <ProtectedRoute>
              <FeedbackDashboard />
            </ProtectedRoute>
          </MaintenanceGuard>
        ),
      },
      {
        path: '/login',
        element: (
          <GuestRoute>
            <Login />
          </GuestRoute>
        ),
      },
      {
        path: '/register',
        element: (
          <GuestRoute>
            <Register />
          </GuestRoute>
        ),
      },
      {
        path: '/forgot-password',
        element: <ForgotPassword />,
      },
      {
        path: '/dashboard',
        element: (
          <MaintenanceGuard>
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          </MaintenanceGuard>
        ),
      },
      {
        path: '/onboarding',
        element: (
          <MaintenanceGuard>
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          </MaintenanceGuard>
        ),
      },
      {
        path: '/jobs',
        element: <JobSearch />,
      },
      {
        path: '/history',
        element: (
          <MaintenanceGuard>
            <ProtectedRoute>
              <JobHistory />
            </ProtectedRoute>
          </MaintenanceGuard>
        ),
      },
      {
        path: '/compare/:idA/:idB',
        element: (
          <MaintenanceGuard>
            <ProtectedRoute>
              <Compare />
            </ProtectedRoute>
          </MaintenanceGuard>
        ),
      },
      {
        path: '/profile',
        element: (
          <MaintenanceGuard>
            <ProtectedRoute>
              <ErrorBoundary>
                <Profile />
              </ErrorBoundary>
            </ProtectedRoute>
          </MaintenanceGuard>
        ),
      },
      {
        path: '/upgrade',
        element: (
          <MaintenanceGuard>
            <ProtectedRoute>
              <Upgrade />
            </ProtectedRoute>
          </MaintenanceGuard>
        ),
      },
      {
        path: '/credits',
        element: (
          <MaintenanceGuard>
            <ProtectedRoute>
              <CreditStore />
            </ProtectedRoute>
          </MaintenanceGuard>
        ),
      },
      {
        // Flutterwave redirect-return target (verifies the payment).
        path: '/billing/return',
        element: (
          <ProtectedRoute>
            <BillingReturn />
          </ProtectedRoute>
        ),
      },
      {
        path: '/interview/start',
        element: (
          <MaintenanceGuard>
            <ProtectedRoute>
              <InterviewStart />
            </ProtectedRoute>
          </MaintenanceGuard>
        ),
      },
      {
        path: '/interview-prep',
        element: (
          <MaintenanceGuard>
            <ProtectedRoute>
              <InterviewPrepList />
            </ProtectedRoute>
          </MaintenanceGuard>
        ),
      },
      {
        path: '/interview-prep/:applicationId',
        element: (
          <MaintenanceGuard>
            <ProtectedRoute>
              <InterviewPrepDetail />
            </ProtectedRoute>
          </MaintenanceGuard>
        ),
      },
      {
        path: '/interview-prep/:applicationId/practice',
        element: (
          <MaintenanceGuard>
            <ProtectedRoute>
              <InterviewPracticePage />
            </ProtectedRoute>
          </MaintenanceGuard>
        ),
      },
      {
        path: '/interview-prep/:applicationId/brief',
        element: (
          <MaintenanceGuard>
            <ProtectedRoute>
              <PreCallBrief />
            </ProtectedRoute>
          </MaintenanceGuard>
        ),
      },
      {
        path: '/interview-prep/:applicationId/mock',
        element: (
          <MaintenanceGuard>
            <ProtectedRoute>
              <MockInterviewPage />
            </ProtectedRoute>
          </MaintenanceGuard>
        ),
      },
      {
        path: '/resume/:id',
        element: (
          <MaintenanceGuard>
            <ProtectedRoute>
              <ResumeReview />
            </ProtectedRoute>
          </MaintenanceGuard>
        ),
      },
      {
        path: '/my-cvs',
        element: (
          <MaintenanceGuard>
            <ProtectedRoute>
              <MyCVs />
            </ProtectedRoute>
          </MaintenanceGuard>
        ),
      },
      {
        path: '/cv-builder/:id',
        element: (
          <MaintenanceGuard>
            <ProtectedRoute>
              <CVBuilderLayout />
            </ProtectedRoute>
          </MaintenanceGuard>
        ),
        children: [
          { path: 'target-job', element: <TargetJob /> },
          { path: 'heading', element: <Heading /> },
          { path: 'summary', element: <ProfessionalSummary /> },
          { path: 'history', element: <History /> },
          { path: 'projects', element: <Projects /> },
          { path: 'education', element: <Education /> },
          { path: 'skills', element: <Skills /> },
          { path: 'finalize', element: <Finalize /> },
        ],
      },

      // CV-Agent Routes (overview + earnings; no interview/job-search)
      {
        path: '/agent',
        element: (
          <MaintenanceGuard>
            <AgentRoute>
              <AgentDashboard />
            </AgentRoute>
          </MaintenanceGuard>
        ),
      },
      {
        path: '/agent/earnings',
        element: (
          <MaintenanceGuard>
            <AgentRoute>
              <AgentEarnings />
            </AgentRoute>
          </MaintenanceGuard>
        ),
      },

      // Admin Routes
      {
        path: '/admin',
        element: (
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        ),
      },
      {
        path: '/admin/users',
        element: (
          <AdminRoute>
            <AdminUsers />
          </AdminRoute>
        ),
      },
      {
        path: '/admin/transactions',
        element: (
          <AdminRoute>
            <AdminTransactions />
          </AdminRoute>
        ),
      },
      {
        path: '/admin/users/:id',
        element: (
          <AdminRoute>
            <AdminUserDetails />
          </AdminRoute>
        ),
      },
      {
        path: '/admin/reports',
        element: (
          <AdminRoute>
            <AdminReportStudio />
          </AdminRoute>
        ),
      },
      {
        path: '/admin/feedback',
        element: (
          <AdminRoute>
            <FeedbackDashboard />
          </AdminRoute>
        ),
      },
      {
        path: '/admin/ai-feedback',
        element: (
          <AdminRoute>
            <AdminAIFeedback />
          </AdminRoute>
        ),
      },
      {
        path: '/admin/settings',
        element: (
          <AdminRoute>
            <AdminSettings />
          </AdminRoute>
        ),
      },

      // Secret Admin Auth
      {
        path: '/secret-access-portal-v1',
        element: <SecretAdminAuth />,
      },

      {
        path: '*',
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);

import { HelmetProvider } from 'react-helmet-async';

function App() {
  useEffect(() => {
    if (!isMobile()) return;
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => {});

    // Init AdMob on Android — dynamic import so the plugin is never bundled
    // for web. Failure is swallowed so it can't block splash hide.
    import('./services/admob.service').then(({ initAdMob }) => initAdMob()).catch(() => {});

    // Wake the Render backend in the background so the first real request is
    // warm by the time the destination page needs it.
    const apiUrl = import.meta.env.VITE_API_URL || '';
    fetch(apiUrl, { method: 'GET' }).catch(() => {});

    // Hold the splash until the destination route signals it has content
    // (via signalReady()), or the 8s safety net fires. This replaces the old
    // "race the backend ping" approach, which let the dashboard render empty
    // while its drafts fetch was still in flight.
    waitForReady(8000).finally(() => {
      SplashScreen.hide().catch(() => {});
    });
  }, []);

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <ThemeProvider>
          <RouterProvider router={router} />
          <Toaster position="top-right" richColors />
        </ThemeProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
