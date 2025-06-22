const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

class AuthManager {
  constructor() {
    this.refreshTimeout = null;
    this.sessionCheckInterval = null;
    this.setupTokenRefresh();
    this.setupSessionCheck();
    this.sessionExpired = false; // Track session expired state
  }

  // Check if user is authenticated
  isAuthenticated() {
    const token = localStorage.getItem('token');
    const expiresAt = localStorage.getItem('tokenExpiresAt');
    
    if (!token || !expiresAt) return false;
    
    return new Date() < new Date(expiresAt);
  }

  // Get valid token (refresh if needed)
  async getValidToken() {
    const token = localStorage.getItem('token');
    const expiresAt = localStorage.getItem('tokenExpiresAt');
    
    if (!token) return null;
    
    // If token expires in less than 5 minutes, refresh it
    const fiveMinutes = 5 * 60 * 1000;
    if (new Date(expiresAt) - new Date() < fiveMinutes) {
      return await this.refreshToken();
    }
    
    return token;
  }

  // Setup periodic session validation
  setupSessionCheck() {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
    }

    // Check session every 5 minutes
    this.sessionCheckInterval = setInterval(() => {
      this.checkSessionValidity();
    }, 5 * 60 * 1000);
  }

  // Check if session is still valid
  checkSessionValidity() {
    const sessionExpiresAt = localStorage.getItem('sessionExpiresAt');
    if (!sessionExpiresAt) return;

    const sessionExpiry = new Date(sessionExpiresAt);
    const now = new Date();
    const timeUntilExpiry = sessionExpiry.getTime() - now.getTime();

    // If session expires in less than 10 minutes, show warning
    if (timeUntilExpiry > 0 && timeUntilExpiry < 10 * 60 * 1000) {
      this.showSessionWarning(Math.floor(timeUntilExpiry / 60000));
    }

    // If session has expired, silently mark as expired but don't show message
    if (timeUntilExpiry <= 0) {
      this.sessionExpired = true;
      this.clearSessionData();
      // Don't dispatch any events - just silently expire
    }
  }

  // Show session expiration warning
  showSessionWarning(minutesLeft) {
    const event = new CustomEvent('sessionWarning', {
      detail: { minutesLeft }
    });
    window.dispatchEvent(event);
  }

  // Handle session expiry - completely silent
  handleSessionExpiry() {
    this.sessionExpired = true;
    this.clearSessionData();
    // Remove all event dispatching - no UI notifications
  }

  // Refresh access token
  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        this.logout();
        return null;
      }

      const response = await fetch(`${API_BASE_URL}/api/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refreshToken })
      });

      const data = await response.json();

      if (data.success) {
        // Update stored tokens and session info
        localStorage.setItem('token', data.token);
        localStorage.setItem('tokenExpiresAt', data.expiresAt);
        localStorage.setItem('sessionExpiresAt', data.sessionExpiresAt);
        localStorage.setItem('user', JSON.stringify(data.user));

        this.setupTokenRefresh();
        return data.token;
      } else {
        // Check if session expired
        if (data.sessionExpired) {
          this.handleSessionExpiry();
        } else {
          this.logout();
        }
        return null;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.logout();
      return null;
    }
  }

  // Login with session management
  async login(credentials) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (data.success) {
        // Store all session-related data
        localStorage.setItem('token', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('tokenExpiresAt', data.expiresAt);
        localStorage.setItem('refreshExpiresAt', data.refreshExpiresAt);
        localStorage.setItem('sessionExpiresAt', data.sessionExpiresAt);
        localStorage.setItem('maxSessionDuration', data.maxSessionDuration);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('username', data.user.username);
        localStorage.setItem('userId', data.user.id);

        // Setup automatic refresh and session checking
        this.setupTokenRefresh();
        this.setupSessionCheck();

        return { success: true, user: data.user };
      } else {
        return { success: false, message: data.message };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, message: 'Network error' };
    }
  }

  // Logout and clear session
  async logout() {
    try {
      // 1. Tell server to invalidate refresh token
      const token = localStorage.getItem('token');
      if (token) {
        await fetch(`${API_BASE_URL}/api/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // 2. Clear ALL local data
      localStorage.clear();

      // 3. Stop all timers
      if (this.refreshTimeout) clearTimeout(this.refreshTimeout);
      if (this.sessionCheckInterval) clearInterval(this.sessionCheckInterval);

      // 4. Redirect to login
      window.location.href = '/login';
    }
  }

  // Check session validity on app load
  checkSession() {
    const refreshToken = localStorage.getItem('refreshToken');
    const refreshExpiresAt = localStorage.getItem('refreshExpiresAt');

    if (!refreshToken || !refreshExpiresAt) {
      this.logout();
      return false;
    }

    // Check if refresh token is expired
    if (new Date() >= new Date(refreshExpiresAt)) {
      this.logout();
      return false;
    }

    // Setup token refresh if needed
    this.setupTokenRefresh();
    return true;
  }

  // Setup automatic token refresh
  setupTokenRefresh() {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    const expiresAt = localStorage.getItem('tokenExpiresAt');
    if (!expiresAt) return;

    const expirationTime = new Date(expiresAt).getTime();
    const currentTime = new Date().getTime();
    const timeUntilRefresh = expirationTime - currentTime - (5 * 60 * 1000); // Refresh 5 minutes before expiry

    if (timeUntilRefresh > 0) {
      this.refreshTimeout = setTimeout(() => {
        this.refreshToken();
      }, timeUntilRefresh);
    }
  }

  // Check session status with proper token handling
  async checkSessionStatus() {
    try {
      const token = await this.getValidToken(); // Use getValidToken to ensure we have a valid token
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/api/test/session-status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        return data.sessionInfo;
      }
    } catch (error) {
      console.error('Failed to check session status:', error);
    }
  }

  // Force expire session with proper token handling
  async forceExpireSession() {
    try {
      const token = await this.getValidToken();
      if (!token) return;

      await fetch(`${API_BASE_URL}/api/test/expire-session`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      return { success: true, message: 'Session force expired' };
    } catch (error) {
      console.error('Failed to expire session:', error);
      return { success: false, message: 'Failed to expire session' };
    }
  }

  // Clear session data without logout
  clearSessionData() {
    localStorage.removeItem('token');
    localStorage.removeItem('tokenExpiresAt');
    localStorage.removeItem('sessionExpiresAt');
    localStorage.removeItem('user');
    // Add any other keys that need to be cleared on session expiry
  }
}

export const authManager = new AuthManager();
export default authManager;
