import { createBrowserRouter, RouterProvider, useLocation, useOutlet, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { cloneElement, useEffect } from 'react';
import { Toaster } from 'sonner';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import JobHistory from './pages/JobHistory';
import Profile from './pages/Profile';
import LandingPage from './pages/LandingPage';
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

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
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

  return (
    <>

      <AnimatePresence mode="wait">
        {element && cloneElement(element, { key: getPageKey(location.pathname) })}
      </AnimatePresence>
    </>
  );
};

// Admin Protected Route
const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  if (!token) {
    return <Navigate to="/login" replace />;
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
import SecretAdminAuth from './pages/Admin/SecretAdminAuth';

// ... existing router configuration ...

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      // ... existing routes ...
      {
        path: "/how-it-works",
        element: <ApplicationReview />,
      },
      {
        path: "/",
        element: <LandingPage />,
      },
      {
        path: "/privacy",
        element: <PrivacyPolicy />,
      },
      {
        path: "/terms",
        element: <TermsOfService />,
      },
      {
        path: "/contact",
        element: <Contact />,
      },
      {
        path: "/ats-guide",
        element: <ATSGuide />,
      },
      {
        path: "/feedback",
        element: <FeedbackPage />,
      },
      {
        path: "/feedback/dashboard",
        element: (
          <MaintenanceGuard>
            <ProtectedRoute>
              <FeedbackDashboard />
            </ProtectedRoute>
          </MaintenanceGuard>
        ),
      },
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/register",
        element: <Register />,
      },
      {
        path: "/forgot-password",
        element: <ForgotPassword />,
      },
      {
        path: "/dashboard",
        element: (
          <MaintenanceGuard>
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          </MaintenanceGuard>
        ),
      },
      {
        path: "/onboarding",
        element: (
          <MaintenanceGuard>
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          </MaintenanceGuard>
        ),
      },
      {
        path: "/history",
        element: (
          <MaintenanceGuard>
            <ProtectedRoute>
              <JobHistory />
            </ProtectedRoute>
          </MaintenanceGuard>
        ),
      },
      {
        path: "/profile",
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
        path: "/upgrade",
        element: (
          <MaintenanceGuard>
            <ProtectedRoute>
              <Upgrade />
            </ProtectedRoute>
          </MaintenanceGuard>
        ),
      },
      {
        path: "/credits",
        element: (
          <MaintenanceGuard>
            <ProtectedRoute>
              <CreditStore />
            </ProtectedRoute>
          </MaintenanceGuard>
        ),
      },
      {
        path: "/resume/:id",
        element: (
          <MaintenanceGuard>
            <ProtectedRoute>
              <ResumeReview />
            </ProtectedRoute>
          </MaintenanceGuard>
        ),
      },
      {
        path: "/cv-builder/:id",
        element: (
          <MaintenanceGuard>
            <ProtectedRoute>
              <CVBuilderLayout />
            </ProtectedRoute>
          </MaintenanceGuard>
        ),
        children: [
          { path: "target-job", element: <TargetJob /> },
          { path: "heading", element: <Heading /> },
          { path: "summary", element: <ProfessionalSummary /> },
          { path: "history", element: <History /> },
          { path: "projects", element: <Projects /> },
          { path: "education", element: <Education /> },
          { path: "skills", element: <Skills /> },
          { path: "finalize", element: <Finalize /> },
        ],
      },

      // Admin Routes
      {
        path: "/admin",
        element: (
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/users",
        element: (
          <AdminRoute>
            <AdminUsers />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/transactions",
        element: (
          <AdminRoute>
            <AdminTransactions />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/users/:id",
        element: (
          <AdminRoute>
            <AdminUserDetails />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/feedback",
        element: (
          <AdminRoute>
            <FeedbackDashboard />
          </AdminRoute>
        ),
      },
      {
        path: "/admin/settings",
        element: (
          <AdminRoute>
            <AdminSettings />
          </AdminRoute>
        ),
      },

      // Secret Admin Auth
      {
        path: "/secret-access-portal-v1",
        element: <SecretAdminAuth />
      },

      {
        path: "*",
        element: <Navigate to="/" replace />,
      },
    ],
  },
]);

import { HelmetProvider } from 'react-helmet-async';

function App() {
  return (
    <HelmetProvider>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </HelmetProvider>
  );
}

export default App;
