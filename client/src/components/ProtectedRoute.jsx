import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authManager } from '../utils/auth';

const ProtectedRoute = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(null); // null = checking, true/false = result
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      // Check if user requires re-authentication
      if (authManager.requiresReauth && authManager.requiresReauth()) {
        // For protected routes, redirect immediately if session expired
        navigate('/login');
        return;
      }

      // Check if user has valid authentication
      const hasValidAuth = authManager.isAuthenticated();
      if (!hasValidAuth) {
        navigate('/login');
        return;
      }

      // Try to get a valid token (this will attempt refresh if needed)
      const token = await authManager.getValidToken();
      if (!token) {
        navigate('/login');
        return;
      }

      setIsAuthenticated(true);
    };

    checkAuth();

    // Listen for session expiry events
    const handleSessionExpired = () => {
      // For protected routes, we should redirect to login when session expires
      navigate('/login');
    };

    const handleAuthStateChange = () => {
      // Re-check auth when state changes
      checkAuth();
    };

    window.addEventListener('sessionExpired', handleSessionExpired);
    window.addEventListener('authStateChanged', handleAuthStateChange);

    return () => {
      window.removeEventListener('sessionExpired', handleSessionExpired);
      window.removeEventListener('authStateChanged', handleAuthStateChange);
    };
  }, [navigate]);

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-storypad-dark-bg flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // If authenticated, render the protected component
  return children;
};

export default ProtectedRoute;
