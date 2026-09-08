import {
  createBrowserRouter,
  RouterProvider,
  useLocation,
  useOutlet,
  Navigate,
} from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { cloneElement, Suspense, useEffect } from 'react';
import { Toaster } from 'sonner';
import Login from './pages/Login';
import Register from './pages/Register';
import MobileHomeRedirect from './components/MobileHomeRedirect';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { waitForReady } from './utils/splash';
import api from './services/api';
import { hydrateCreditCosts, hydrateSignupCredits } from './lib/credits';
import { hydrateLaunch } from './lib/launch';
import { hydratePromos } from './lib/promos';
import { syncLangFromStoredUser } from './lib/lang';
import { hydrateModels } from './lib/models';
import ErrorBoundary from './components/ErrorBoundary';
import { isMobile } from './utils/platform';
import MaintenanceGuard from './components/MaintenanceGuard';
import RouteSeo from './components/RouteSeo';
import useIdleTimeout from './hooks/useIdleTimeout';
import SessionTimeoutModal from './components/SessionTimeoutModal';
import TopProgressBar from './components/TopProgressBar';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { isDarkEligibleRoute } from './utils/theme';
import { homePathFor, SEEKER_HOME } from './lib/home';
import { lazyWithRetry } from './lib/lazyWithRetry';
import AppUpdateGate from './components/AppUpdateGate';

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
//
// `/dashboard` stays on this list even though the page is gone. It is a redirect to
// /aria-studio now, and an agent following an old bookmark must be turned around HERE
// rather than being forwarded into the Studio they are held out of.
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

// Guest Route Component (redirects home if already authenticated)
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
    return <Navigate to={SEEKER_HOME} replace />;
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
    return <Navigate to={homePathFor(user)} replace />;
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
    // without leaving the builder would no longer remount. The builder's own sidebar
    // CAN do exactly that — a row switches CVs in place — so CVBuilderLayout has to
    // refetch on an :id change rather than relying on a remount to do it for it.)
    return pathname.startsWith('/cv-builder') ? '/cv-builder' : pathname;
  };

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <SessionManager>
      {/* Route-level title and description for every page. Pages that render their own
          <Seo> are excluded by seoKeyForPath, so exactly one of the two ever writes to
          a given path — the precedence is by construction, not by ordering luck. */}
      <RouteSeo />
      <TopProgressBar />
      {/* Deploys do not reach tabs that are already open. This is what does. */}
      <AppUpdateGate />

      {/* No bottom tab bar, on either platform. It began as four tabs; two pointed at list
          pages that are sidebars now, and the last two were a whole bar for Home and Aria
          Studio — both of which every page already reaches from its top bar. Nothing to
          clear at the bottom of the page any more, so the padding went with it. */}
      <div className="relative z-0">
        {/* Every lazily-loaded route resolves here. TopProgressBar above already
            signals navigation, so this fallback only has to hold the space without
            flashing — a spinner for the fraction of a second a chunk takes on a warm
            connection would read as jank, not feedback. */}
        <Suspense fallback={<div className="min-h-screen" aria-busy="true" />}>
          <AnimatePresence mode="wait">
            {element && cloneElement(element, { key: getPageKey(location.pathname) })}
          </AnimatePresence>
        </Suspense>
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
    return <Navigate to={homePathFor(user)} replace />;
  }

  return children;
};

// ─── ADMIN + AGENT: LOADED ON DEMAND ────────────────────────────────────────────
//
// These thirteen pages were static imports, so every visitor downloaded the entire
// admin console before they could see a login form. They also drag `recharts` in with
// them — a charting library nobody outside these pages uses, and 84 KB gzipped on its
// own, roughly a tenth of the whole first load.
//
// They are the safest routes in the app to split: reached only behind AdminRoute, by a
// handful of people, who can afford one extra request. The comment that used to sit
// here said "for now direct import is fine" — it stopped being fine when users started
// reporting that the app took seconds to open.
const AdminDashboard = lazyWithRetry(
  () => import('./pages/Admin/AdminDashboard'),
  'AdminDashboard'
);
const AdminUsers = lazyWithRetry(() => import('./pages/Admin/AdminUsers'), 'AdminUsers');
const AdminTransactions = lazyWithRetry(
  () => import('./pages/Admin/AdminTransactions'),
  'AdminTransactions'
);
const AdminPayments = lazyWithRetry(() => import('./pages/Admin/AdminPayments'), 'AdminPayments');
const AdminAnalytics = lazyWithRetry(
  () => import('./pages/Admin/AdminAnalytics'),
  'AdminAnalytics'
);
const AdminUserDetails = lazyWithRetry(
  () => import('./pages/Admin/AdminUserDetails'),
  'AdminUserDetails'
);
const AdminSettings = lazyWithRetry(() => import('./pages/Admin/AdminSettings'), 'AdminSettings');
const AdminLaunch = lazyWithRetry(() => import('./pages/Admin/AdminLaunch'), 'AdminLaunch');
const AdminReportStudio = lazyWithRetry(
  () => import('./pages/Admin/AdminReportStudio'),
  'AdminReportStudio'
);
const SecretAdminAuth = lazyWithRetry(
  () => import('./pages/Admin/SecretAdminAuth'),
  'SecretAdminAuth'
);
const AdminAIFeedback = lazyWithRetry(
  () => import('./pages/Admin/AdminAIFeedback'),
  'AdminAIFeedback'
);

// CV-agent pages (separate CV-only workspace)
const AgentDashboard = lazyWithRetry(
  () => import('./pages/Agent/AgentDashboard'),
  'AgentDashboard'
);
const AgentEarnings = lazyWithRetry(() => import('./pages/Agent/AgentEarnings'), 'AgentEarnings');

// ─── ROUTE-LEVEL CODE SPLITTING ────────────────────────────────────────────────
//
// Every page below used to be a static import, which put the WHOLE application into
// the first download: 3.65 MB, 977 KB gzipped, before anything could paint. Users
// reported it as "the app takes time to open and shows no information", which is
// literally what an empty #root and a megabyte of JavaScript produce on mobile data.
//
// What is NOT here is the important half. Login, Register and Dashboard stay static:
// they are the first paint, and making them a second round trip would move the delay
// rather than remove it. Everything below is reached from one of those, by a user who
// has already seen the app respond.

// Content, guides and legal — read rarely, never on the way to the dashboard.
const PrivacyPolicy = lazyWithRetry(() => import('./pages/PrivacyPolicy'), 'PrivacyPolicy');
const TermsOfService = lazyWithRetry(() => import('./pages/TermsOfService'), 'TermsOfService');
const Contact = lazyWithRetry(() => import('./pages/Contact'), 'Contact');
const ATSGuide = lazyWithRetry(() => import('./pages/ATSGuide'), 'ATSGuide');
const Pricing = lazyWithRetry(() => import('./pages/Pricing'), 'Pricing');
const HowATSRecruitersWork = lazyWithRetry(
  () => import('./pages/HowATSRecruitersWork'),
  'HowATSRecruitersWork'
);
const CVBuilderGuide = lazyWithRetry(() => import('./pages/CVBuilderGuide'), 'CVBuilderGuide');
const AriaStudioGuide = lazyWithRetry(() => import('./pages/AriaStudioGuide'), 'AriaStudioGuide');
const CVHealth = lazyWithRetry(() => import('./pages/CVHealth'), 'CVHealth');
const CVTips = lazyWithRetry(() => import('./pages/CVTips'), 'CVTips');
const HowToAceYourInterview = lazyWithRetry(
  () => import('./pages/HowToAceYourInterview'),
  'HowToAceYourInterview'
);
const FeedbackPage = lazyWithRetry(() => import('./pages/FeedbackPage'), 'FeedbackPage');
const FeedbackDashboard = lazyWithRetry(
  () => import('./pages/FeedbackDashboard'),
  'FeedbackDashboard'
);
const ApplicationReview = lazyWithRetry(
  () => import('./pages/ApplicationReview'),
  'ApplicationReview'
);

// The landing page and its particle background — see the note above.
const LandingPage = lazyWithRetry(() => import('./pages/LandingPage'), 'LandingPage');
const MobileWelcome = lazyWithRetry(() => import('./pages/mobile/MobileWelcome'), 'MobileWelcome');
const PreLaunch = lazyWithRetry(() => import('./pages/PreLaunch'), 'PreLaunch');

// Billing surfaces — entered deliberately, from a link, never on the critical path.
const Upgrade = lazyWithRetry(() => import('./pages/Upgrade'), 'Upgrade');
const BillingReturn = lazyWithRetry(() => import('./pages/BillingReturn'), 'BillingReturn');
const CreditStore = lazyWithRetry(() => import('./pages/CreditStore'), 'CreditStore');
const Profile = lazyWithRetry(() => import('./pages/Profile'), 'Profile');
const Onboarding = lazyWithRetry(() => import('./pages/Onboarding'), 'Onboarding');
const ForgotPassword = lazyWithRetry(() => import('./pages/ForgotPassword'), 'ForgotPassword');
const JobSearch = lazyWithRetry(() => import('./pages/JobSearch'), 'JobSearch');

// Live interview — the heaviest surfaces in the app, and reached from a prep page.
const InterviewPrepDetail = lazyWithRetry(
  () => import('./pages/InterviewPrepDetail'),
  'InterviewPrepDetail'
);
const InterviewPracticePage = lazyWithRetry(
  () => import('./pages/InterviewPracticePage'),
  'InterviewPracticePage'
);
const PreCallBrief = lazyWithRetry(() => import('./pages/PreCallBrief'), 'PreCallBrief');
const MockInterviewPage = lazyWithRetry(
  () => import('./pages/MockInterviewPage'),
  'MockInterviewPage'
);
const InterviewPrepIndex = lazyWithRetry(
  () => import('./pages/InterviewPrepIndex'),
  'InterviewPrepIndex'
);

// The CV workspaces. Big, and entered from the dashboard — never before it.
const ResumeReview = lazyWithRetry(() => import('./pages/ResumeReview'), 'ResumeReview');
const AriaStudio = lazyWithRetry(() => import('./pages/AriaStudio/AriaStudio'), 'AriaStudio');
const CvStudioIndex = lazyWithRetry(() => import('./pages/CvStudioIndex'), 'CvStudioIndex');
const CVBuilderLayout = lazyWithRetry(
  () => import('./pages/CVBuilder/CVBuilderLayout'),
  'CVBuilderLayout'
);
const CvBuilderIndex = lazyWithRetry(
  () => import('./pages/CVBuilder/CvBuilderIndex'),
  'CvBuilderIndex'
);
const TargetJob = lazyWithRetry(() => import('./pages/CVBuilder/TargetJob'), 'TargetJob');
const Heading = lazyWithRetry(() => import('./pages/CVBuilder/Heading'), 'Heading');
const ProfessionalSummary = lazyWithRetry(
  () => import('./pages/CVBuilder/ProfessionalSummary'),
  'ProfessionalSummary'
);
const History = lazyWithRetry(() => import('./pages/CVBuilder/History'), 'History');
const Projects = lazyWithRetry(() => import('./pages/CVBuilder/Projects'), 'Projects');
const Education = lazyWithRetry(() => import('./pages/CVBuilder/Education'), 'Education');
const Skills = lazyWithRetry(() => import('./pages/CVBuilder/Skills'), 'Skills');
const Finalize = lazyWithRetry(() => import('./pages/CVBuilder/Finalize'), 'Finalize');

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
      // THE DASHBOARD IS GONE. It was a page of cards pointing at the four places you
      // might want to be — and every one of those is now a row in the sidebar that each
      // signed-in surface carries. So it had become a stop on the way to somewhere, on
      // the first screen after sign-in. Aria Studio is home instead: the work itself.
      //
      // Kept as a redirect rather than deleted, for the same reason /my-cvs and /history
      // are. It was the post-login landing for the app's whole life — it is in bookmarks,
      // in browser history, and in the back stack of the installed Android app. A dead
      // link is a worse answer than the place the thing actually went.
      //
      // Still inside ProtectedRoute: a signed-out visitor with the old bookmark must land
      // on /login, not be bounced to a Studio that would only bounce them again. And
      // AGENT_BLOCKED_PREFIXES still lists it, so an agent is turned around here rather
      // than forwarded into the Studio they are held out of.
      {
        path: '/dashboard',
        element: (
          <ProtectedRoute>
            <Navigate to={SEEKER_HOME} replace />
          </ProtectedRoute>
        ),
      },
      {
        // Aria Studio — standalone agentic tailor chat, and HOME since the dashboard was
        // removed. Deliberately NOT nested under /cv-builder: it owns its own document
        // via AriaStudioProvider.
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
      // The studio with no document open. /resume/:id is the studio ITSELF, which means
      // it had no address that did not already name a CV — so nothing could link to it.
      // Same shape as /cv-builder and /interview-prep.
      {
        path: '/cv-studio',
        element: (
          <MaintenanceGuard>
            <ProtectedRoute>
              <CvStudioIndex />
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
          hydratePromos(res?.data?.templates);
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
      {/* No HelmetProvider. react-helmet-async emits no meta tags on React 19 (see
          components/Seo.jsx), and a provider sitting here made <Helmet> look supported
          — the next person to reach for it would have got the same silent no-op. With
          the provider gone it throws loudly instead. */}
      <ThemeProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
