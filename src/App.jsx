import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import JobHistory from './pages/JobHistory';
import Profile from './pages/Profile';
import LandingPage from './pages/LandingPage';
import ResumeReview from './pages/ResumeReview';
import CVBuilderLayout from './pages/CVBuilder/CVBuilderLayout';
import TargetJob from './pages/CVBuilder/TargetJob';
import Heading from './pages/CVBuilder/Heading';
import ProfessionalSummary from './pages/CVBuilder/ProfessionalSummary';
import History from './pages/CVBuilder/History';
import Projects from './pages/CVBuilder/Projects';
import Education from './pages/CVBuilder/Education';
import Skills from './pages/CVBuilder/Skills';
import Finalize from './pages/CVBuilder/Finalize';
import ErrorBoundary from './components/ErrorBoundary';
import { useState, useEffect } from 'react';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

const AnimatedRoutes = () => {
  const location = useLocation();

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

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={getPageKey(location.pathname)}>
        {/* Landing Page Route */}
        <Route path="/" element={<LandingPage />} />

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <JobHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ErrorBoundary>
                <Profile />
              </ErrorBoundary>
            </ProtectedRoute>
          }
        />
        <Route
          path="/resume/:id"
          element={
            <ProtectedRoute>
              <ResumeReview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/cv-builder/:id/*"
          element={
            <ProtectedRoute>
              <CVBuilderLayout />
            </ProtectedRoute>
          }
        >
          <Route path="target-job" element={<TargetJob />} />
          <Route path="heading" element={<Heading />} />
          <Route path="summary" element={<ProfessionalSummary />} />
          <Route path="history" element={<History />} />
          <Route path="projects" element={<Projects />} />
          <Route path="education" element={<Education />} />
          <Route path="skills" element={<Skills />} />
          <Route path="finalize" element={<Finalize />} />
        </Route>

        {/* Fallback to Landing Page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AnimatePresence>
  );
};

import { Toaster } from 'sonner';

function App() {
  return (
    <Router>
      <Toaster position="bottom-right" richColors />
      <AnimatedRoutes />
    </Router>
  );
}

export default App;
