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
      <Toaster position="bottom-right" richColors />
      <AnimatePresence mode="wait">
        {element && cloneElement(element, { key: getPageKey(location.pathname) })}
      </AnimatePresence>
    </>
  );
};

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
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
          <ProtectedRoute>
            <FeedbackDashboard />
          </ProtectedRoute>
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
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        ),
      },
      {
        path: "/onboarding",
        element: (
          <ProtectedRoute>
            <Onboarding />
          </ProtectedRoute>
        ),
      },
      {
        path: "/history",
        element: (
          <ProtectedRoute>
            <JobHistory />
          </ProtectedRoute>
        ),
      },
      {
        path: "/profile",
        element: (
          <ProtectedRoute>
            <ErrorBoundary>
              <Profile />
            </ErrorBoundary>
          </ProtectedRoute>
        ),
      },
      {
        path: "/upgrade",
        element: (
          <ProtectedRoute>
            <Upgrade />
          </ProtectedRoute>
        ),
      },
      {
        path: "/credits",
        element: (
          <ProtectedRoute>
            <CreditStore />
          </ProtectedRoute>
        ),
      },
      {
        path: "/resume/:id",
        element: (
          <ProtectedRoute>
            <ResumeReview />
          </ProtectedRoute>
        ),
      },
      {
        path: "/cv-builder/:id",
        element: (
          <ProtectedRoute>
            <CVBuilderLayout />
          </ProtectedRoute>
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
