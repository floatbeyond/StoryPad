import { useState, useEffect } from 'react';
import { authManager } from '../utils/auth';

const SessionStatus = () => {
  const [showWarning, setShowWarning] = useState(false);
  const [minutesLeft, setMinutesLeft] = useState(0);

  useEffect(() => {
    const handleSessionWarning = (event) => {
      setMinutesLeft(event.detail.minutesLeft);
      setShowWarning(true);
      
      // Auto-hide warning after 30 seconds
      setTimeout(() => setShowWarning(false), 30000);
    };

    window.addEventListener('sessionWarning', handleSessionWarning);

    return () => {
      window.removeEventListener('sessionWarning', handleSessionWarning);
    };
  }, []);

  // Only show session warnings, not expired messages
  if (showWarning) {
    return (
      <div className="bg-yellow-100 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-3 mx-4 my-2 rounded">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-4 w-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Session expires in {minutesLeft} minute{minutesLeft !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button 
            onClick={() => setShowWarning(false)}
            className="text-yellow-700 dark:text-yellow-300 hover:text-yellow-900 dark:hover:text-yellow-100"
          >
            ✕
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default SessionStatus;
