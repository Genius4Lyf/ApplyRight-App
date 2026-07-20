import {
  createBrowserRouter,
  RouterProvider,
  useLocation,
  useOutlet,
  Navigate,
} from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
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
import api from './services/api';
import { hydrateCreditCosts } from './lib/credits';
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
import CVBuilderGuide from './pages/CVBuilderGuide';
import CVHealth from './pages/CVHealth';
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
  const { theme } = useTheme();

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
    // Keep ONE stable key for the whole builder so neither switching steps NOR the
    // 'new'→realId swap (create-on-entry) remounts CVBuilderLayout — the swap would
    // otherwise flash a refetch/remount. (A direct /cv-builder/A→/cv-builder/B jump
    // without leaving the builder would no longer remount, but CV switches go via the
    // dashboard, so that flow doesn't occur.)
    return pathname.startsWith('/cv-builder') ? '/cv-builder' : pathname;
  };

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const showNav = shouldShowBottomNav(location.pathname);

  return (
    <SessionManager>
      <TopProgressBar />

      {/* Global solid ground — warm off-white in light, deep navy in dark. */}
      <div className="fixed inset-0 z-[-1] pointer-events-none bg-[#f6f6f3] dark:bg-slate-950"></div>

      <div
        className={`relative z-0 ${
          showNav
            ? // The bottom bar clears the content: on native it's always visible;
              // on web it's mobile-only (md:hidden), so drop the padding at md+.
              `pb-[calc(4rem+env(safe-area-inset-bottom))]${isMobile() ? '' : ' md:pb-0'}`
            : ''
        }`}
      >
        <AnimatePresence mode="wait">
          {element && cloneElement(element, { key: getPageKey(location.pathname) })}
        </AnimatePresence>
      </div>

      {/* Sibling of the z-0 page-content wrapper (not inside it) so page content
          can never paint over the tabs — content scrolls cleanly underneath.
          Modals are portaled to document.body at z-50, so they still stack above
          this z-40 nav. */}
      <MobileBottomNav />
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
import AdminPayments from './pages/Admin/AdminPayments';
import AdminAnalytics from './pages/Admin/AdminAnalytics';
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
        path: '/cv-builder-guide',
        element: <CVBuilderGuide />,
      },
      {
        path: '/cv-health',
        element: <CVHealth />,
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
        path: '/admin/payments',
        element: (
          <AdminRoute>
            <AdminPayments />
          </AdminRoute>
        ),
      },
      {
        path: '/admin/analytics',
        element: (
          <AdminRoute>
            <AdminAnalytics />
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
  // Hydrate the credit-cost table from the backend (real defaults + any admin
  // overrides) so preflight checks reflect live prices. Runs on all platforms;
  // on failure the offline fallback in lib/credits.js stays in effect.
  useEffect(() => {
    api
      .get('/auth/config')
      .then((res) => hydrateCreditCosts(res?.data?.creditCosts))
      .catch(() => {});
  }, []);

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
