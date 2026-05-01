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
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { isMobile, shouldShowBottomNav } from './utils/platform';
import MobileBottomNav from './components/MobileBottomNav';
import ApplicationReview from './pages/ApplicationReview';
import ResumeReview from './pages/ResumeReview';
import CVBuilderLayout from './pages/CVBuilder/CVBuilderLayout';
import TargetJob from './pages/CVBuilder/TargetJob';
import Heading from './pages/CVBuilder/Heading';
import ProfessionalSummary from './pages/CVBuilder/ProfessionalSummary';
import Upgrade from './pages/Upgrade';
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
import FeedbackPage from './pages/FeedbackPage';
import FeedbackDashboard from './pages/FeedbackDashboard';
import MaintenanceGuard from './components/MaintenanceGuard';
import useIdleTimeout from './hooks/useIdleTimeout';
import SessionTimeoutModal from './components/SessionTimeoutModal';
import TopProgressBar from './components/TopProgressBar';

// Session Manager Component
const SessionManager = ({ children }) => {
  const location = useLocation(); // Force re-render on navigation
  const token = localStorage.getItem('token');
  // Safe parsing of user
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user'));
  } catch (e) {}

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

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Guest Route Component (redirects to dashboard if already authenticated)
const GuestRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

// Root Layout to handle global providers and animations
const RootLayout = () => {
  const location = useLocation();
  const element = useOutlet();

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
      <div className={showNav ? 'pb-[calc(4rem+env(safe-area-inset-bottom))]' : ''}>
        <AnimatePresence mode="wait">
          {element && cloneElement(element, { key: getPageKey(location.pathname) })}
        </AnimatePresence>
      </div>
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
import AdminUserDetails from './pages/Admin/AdminUserDetails';
import AdminSettings from './pages/Admin/AdminSettings';
import AdminJobSearches from './pages/Admin/AdminJobSearches';
import AdminReportStudio from './pages/Admin/AdminReportStudio';
import SecretAdminAuth from './pages/Admin/SecretAdminAuth';

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
        path: '/admin/job-searches',
        element: (
          <AdminRoute>
            <AdminJobSearches />
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
    StatusBar.setOverlaysWebView({ overlay: true }).catch(() => {});
    StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#ffffff00' }).catch(() => {}); // fully transparent — page bg shows through

    // Wake the Render backend before showing the app — splash stays up until
    // the first response lands or 8s passes, whichever happens first.
    const apiUrl = import.meta.env.VITE_API_URL || '';
    const wakeBackend = fetch(apiUrl, { method: 'GET' }).catch(() => {});
    const timeout = new Promise((resolve) => setTimeout(resolve, 8000));
    Promise.race([wakeBackend, timeout]).finally(() => {
      SplashScreen.hide().catch(() => {});
    });
  }, []);

  return (
    <ErrorBoundary>
      <HelmetProvider>
        <RouterProvider router={router} />
        <Toaster position="top-right" richColors />
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
