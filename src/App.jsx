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
import Profile from './pages/Profile';
import LandingPage from './pages/LandingPage';
import MobileHomeRedirect from './components/MobileHomeRedirect';
import MobileWelcome from './pages/mobile/MobileWelcome';
import InterviewPrepDetail from './pages/InterviewPrepDetail';
import InterviewPracticePage from './pages/InterviewPracticePage';
import PreCallBrief from './pages/PreCallBrief';
import MockInterviewPage from './pages/MockInterviewPage';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { waitForReady } from './utils/splash';
import api from './services/api';
import { hydrateCreditCosts, hydrateSignupCredits } from './lib/credits';
import { hydrateLaunch } from './lib/launch';
import PreLaunch from './pages/PreLaunch';
import { syncLangFromStoredUser } from './lib/lang';
import { hydrateModels } from './lib/models';
import ApplicationReview from './pages/ApplicationReview';
import ResumeReview from './pages/ResumeReview';
import AriaStudio from './pages/AriaStudio/AriaStudio';
import CVBuilderLayout from './pages/CVBuilder/CVBuilderLayout';
import CvBuilderIndex from './pages/CVBuilder/CvBuilderIndex';
import InterviewPrepIndex from './pages/InterviewPrepIndex';
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
import AriaStudioGuide from './pages/AriaStudioGuide';
import CVHealth from './pages/CVHealth';
import CVTips from './pages/CVTips';
import HowToAceYourInterview from './pages/HowToAceYourInterview';
import FeedbackPage from './pages/FeedbackPage';
import FeedbackDashboard from './pages/FeedbackDashboard';
import { isMobile } from './utils/platform';
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
// CV-only workspace at /agent). Agents keep access to /cv-builder,
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
    if (user.role === 'agent') return <Navigate to="/agent" replace />;
    // An unfinished form first — same order as a fresh sign-in. Read from localStorage,
    // which is populated at login and so is available on this first render.
    if (user.onboardingCompleted !== true) return <Navigate to="/onboarding" replace />;
    // Deliberately NOT branching on LAUNCH here. This wrapper runs on the very first
    // render, before the /auth/config effect has hydrated the singleton, so the branch
    // could only ever read `false` and would be a comment describing something that
    // never happens. During the campaign MaintenanceGuard swaps the countdown in on
    // arrival; only the URL differs, and only on this one already-signed-in path.
    return <Navigate to="/dashboard" replace />;
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

  return (
    <SessionManager>
      <TopProgressBar />

      {/* No bottom tab bar, on either platform. It began as four tabs; two pointed at list
          pages that are sidebars now, and the last two were a whole bar for Home and Aria
          Studio — both of which every page already reaches from its top bar. Nothing to
          clear at the bottom of the page any more, so the padding went with it. */}
      <div className="relative z-0">
        <AnimatePresence mode="wait">
          {element && cloneElement(element, { key: getPageKey(location.pathname) })}
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
import AdminPayments from './pages/Admin/AdminPayments';
import AdminAnalytics from './pages/Admin/AdminAnalytics';
import AdminUserDetails from './pages/Admin/AdminUserDetails';
import AdminSettings from './pages/Admin/AdminSettings';
import AdminLaunch from './pages/Admin/AdminLaunch';
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
        path: '/aria-studio-guide',
        element: <AriaStudioGuide />,
      },
      {
        path: '/cv-health',
        element: <CVHealth />,
      },
      {
        path: '/cv-tips',
        element: <CVTips />,
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
        // Aria Studio — standalone agentic tailor chat. Deliberately NOT nested under
        // /cv-builder: it owns its own document via AriaStudioProvider.
        path: '/aria-studio',
        element: (
          <MaintenanceGuard>
            <ProtectedRoute>
              <AriaStudio />
            </ProtectedRoute>
          </MaintenanceGuard>
        ),
      },
      {
        path: '/pre-launch',
        element: <PreLaunch />,
      },
      {
        path: '/onboarding',
        element: (
          // The ONE route that stays reachable behind the pre-launch gate, and only for
          // someone who has not finished it — see MaintenanceGuard. A campaign signup
          // has to be able to hand over their details before the countdown.
          <MaintenanceGuard allowOnboarding>
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          </MaintenanceGuard>
        ),
      },
      {
        path: '/jobs',
        // Gated like every other app page. It was the only one that was not, which
        // during the campaign meant a URL anyone could type to get past the countdown
        // into a page whose every request 503s.
        element: (
          <MaintenanceGuard>
            <JobSearch />
          </MaintenanceGuard>
        ),
      },
      // Job analyses live in Aria Studio now — they are sessions in its Recents list
      // rather than a separate Applications page. These two routes are kept as redirects
      // rather than deleted: they were linked from the navbar, the mobile nav and a CV
      // modal for long enough to be in people's history and bookmarks, and a dead link is
      // a worse answer than the place the thing actually went.
      { path: '/history', element: <Navigate to="/aria-studio" replace /> },
      { path: '/compare/:idA/:idB', element: <Navigate to="/aria-studio" replace /> },
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
      // The standalone "interview me" flow — upload a CV, paste a job, talk to an
      // interviewer that had studied neither. Retired: the same live mock is a step of
      // the prep path, which arrives there having actually read the role. An old link
      // lands on that path with its first step already begun.
      {
        path: '/interview/start',
        element: <Navigate to="/aria-studio" state={{ start: 'prep' }} replace />,
      },
      // Interview prep with nothing open — the counterpart of /cv-builder, and the
      // address the prep sidebar's nav row points at. It briefly redirected to Aria
      // Studio, which was fine while nothing linked here and wrong the moment something
      // did: a row that returns you to the page you are on reads as broken.
      {
        path: '/interview-prep',
        element: (
          <MaintenanceGuard>
            <ProtectedRoute>
              <InterviewPrepIndex />
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
      // Old bookmarks, and every link that used to say "my CVs". The list moved into the
      // builder's sidebar, and /cv-builder is the address that opens it.
      { path: '/my-cvs', element: <Navigate to="/cv-builder" replace /> },
      // The builder with no CV open. "My CVs" needs an ADDRESS — the list lives in the
      // sidebar now, and a sidebar is not something you can link to, redirect to, or land
      // on after leaving the wizard.
      {
        path: '/cv-builder',
        element: (
          <MaintenanceGuard>
            <ProtectedRoute>
              <CvBuilderIndex />
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
        path: '/admin/launch',
        element: (
          <AdminRoute>
            <AdminLaunch />
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
  // Seed the app language from the stored user (interfaceLang) so a returning
  // user's saved choice sticks. Re-runs whenever the user blob is refreshed
  // (login, profile save, credit sync) via the same-tab userDataUpdated event.
  useEffect(() => {
    syncLangFromStoredUser();
    window.addEventListener('userDataUpdated', syncLangFromStoredUser);
    window.addEventListener('storage', syncLangFromStoredUser);
    return () => {
      window.removeEventListener('userDataUpdated', syncLangFromStoredUser);
      window.removeEventListener('storage', syncLangFromStoredUser);
    };
  }, []);

  // Hydrate the credit-cost table from the backend (real defaults + any admin
  // overrides) so preflight checks reflect live prices. Runs on all platforms;
  // on failure the offline fallback in lib/credits.js stays in effect.
  useEffect(() => {
    let cancelled = false;
    let retryTimer;
    const loadConfig = (attempt = 0) => {
      api
        .get('/auth/config')
        .then((res) => {
          if (cancelled) return;
          hydrateCreditCosts(res?.data?.creditCosts);
          hydrateModels(res?.data?.aiModels);
          hydrateSignupCredits(res?.data?.credits);
          hydrateLaunch(res?.data?.launch);
        })
        .catch(() => {
          // A local restart or Render cold start can make the first request lose the
          // race. Retry briefly instead of hiding model choices for the whole session.
          if (!cancelled && attempt < 2) {
            retryTimer = window.setTimeout(() => loadConfig(attempt + 1), 1500 * (attempt + 1));
          }
        });
    };
    loadConfig();
    return () => {
      cancelled = true;
      window.clearTimeout(retryTimer);
    };
  }, []);

  // Wake the (possibly spun-down) Render backend as early as the app loads, on
  // every platform — so the first real request after login isn't stuck behind a
  // cold start. Hits the root health route ('/'), not '/api'. Fire-and-forget.
  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const healthUrl = apiUrl.replace(/\/api\/?$/, '') || apiUrl;
    if (!healthUrl) return;
    fetch(healthUrl, { method: 'GET', cache: 'no-store' }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isMobile()) return;
    StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => {});

    // Init AdMob on Android — dynamic import so the plugin is never bundled
    // for web. Failure is swallowed so it can't block splash hide.
    import('./services/admob.service').then(({ initAdMob }) => initAdMob()).catch(() => {});

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
