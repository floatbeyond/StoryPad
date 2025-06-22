import { useState, useEffect } from 'react';
import { authManager } from '../utils/auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const SessionDebug = () => {
  const [sessionInfo, setSessionInfo] = useState(null);
  const [warnings, setWarnings] = useState([]);

  useEffect(() => {
    // Listen for session events
    const handleSessionWarning = (event) => {
      setWarnings(prev => [...prev, `Session expires in ${event.detail.minutesLeft} minutes`]);
    };

    const handleSessionExpired = () => {
      setWarnings(prev => [...prev, 'Session expired!']);
    };

    window.addEventListener('sessionWarning', handleSessionWarning);
    window.addEventListener('sessionExpired', handleSessionExpired);

    // Check session status periodically
    const interval = setInterval(checkSessionStatus, 10000); // Every 10 seconds

    return () => {
      window.removeEventListener('sessionWarning', handleSessionWarning);
      window.removeEventListener('sessionExpired', handleSessionExpired);
      clearInterval(interval);
    };
  }, []);

  const checkSessionStatus = async () => {
    try {
      const sessionInfo = await authManager.checkSessionStatus();
      if (sessionInfo) {
        setSessionInfo(sessionInfo);
      }
    } catch (error) {
      console.error('Failed to check session status:', error);
    }
  };

  const forceExpireSession = async () => {
    try {
      const result = await authManager.forceExpireSession();
      if (result.success) {
        setWarnings(prev => [...prev, result.message]);
        checkSessionStatus();
      }
    } catch (error) {
      console.error('Failed to expire session:', error);
    }
  };

  if (!sessionInfo && process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-4 rounded-lg text-xs max-w-sm z-50">
      <h4 className="font-bold mb-2">🔧 Session Debug</h4>
      
      {sessionInfo && (
        <div className="space-y-1 mb-3">
          <div>Start: {new Date(sessionInfo.sessionStart).toLocaleTimeString()}</div>
          <div>Expires: {new Date(sessionInfo.sessionExpiry).toLocaleTimeString()}</div>
          <div>Remaining: {sessionInfo.timeRemainingFormatted}</div>
          <div className={sessionInfo.isExpired ? 'text-red-400' : 'text-green-400'}>
            Status: {sessionInfo.isExpired ? 'EXPIRED' : 'ACTIVE'}
          </div>
        </div>
      )}

      <div className="space-y-1 mb-3">
        <div>Token: {localStorage.getItem('token') ? '✅' : '❌'}</div>
        <div>Refresh: {localStorage.getItem('refreshToken') ? '✅' : '❌'}</div>
        <div>Session End: {localStorage.getItem('sessionExpiresAt')?.substring(11, 19) || 'N/A'}</div>
      </div>

      {warnings.length > 0 && (
        <div className="mb-3">
          <div className="font-bold text-yellow-400">Warnings:</div>
          {warnings.slice(-3).map((warning, i) => (
            <div key={i} className="text-yellow-300">{warning}</div>
          ))}
        </div>
      )}

      <div className="space-x-2">
        <button 
          onClick={checkSessionStatus}
          className="bg-blue-600 px-2 py-1 rounded text-xs"
        >
          Refresh
        </button>
        <button 
          onClick={forceExpireSession}
          className="bg-red-600 px-2 py-1 rounded text-xs"
        >
          Force Expire
        </button>
        <button 
          onClick={() => setWarnings([])}
          className="bg-gray-600 px-2 py-1 rounded text-xs"
        >
          Clear
        </button>
      </div>
    </div>
  );
};

export default SessionDebug;
