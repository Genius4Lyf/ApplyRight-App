import { Navigate } from 'react-router-dom';
import LandingPage from '../pages/LandingPage';
import { isMobile, hasSeenOnboarding } from '../utils/platform';

const MobileHomeRedirect = () => {
  if (!isMobile()) {
    return <LandingPage />;
  }
  if (hasSeenOnboarding()) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to="/welcome" replace />;
};

export default MobileHomeRedirect;
