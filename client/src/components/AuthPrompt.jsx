import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthPrompt = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [onLogin, setOnLogin] = useState(null);
  const [onCancel, setOnCancel] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthRequired = (event) => {
      const { message, onLogin, onCancel } = event.detail;
      setMessage(message);
      setOnLogin(() => onLogin);
      setOnCancel(() => onCancel);
      setIsVisible(true);
    };

    window.addEventListener('authRequired', handleAuthRequired);
    
    return () => {
      window.removeEventListener('authRequired', handleAuthRequired);
    };
  }, []);

  const handleLogin = () => {
    setIsVisible(false);
    navigate('/login');
    if (onLogin) onLogin();
  };

  const handleCancel = () => {
    setIsVisible(false);
    if (onCancel) onCancel();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-storypad-dark-surface rounded-lg p-6 max-w-md mx-4 border dark:border-gray-700">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-storypad-dark-text mb-2">
            Authentication Required
          </h3>
          <p className="text-gray-600 dark:text-storypad-dark-text-light">
            {message}
          </p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleLogin}
            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            Log In
          </button>
          <button
            onClick={handleCancel}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthPrompt;
