/**
 * Auth Context
 * 
 * Provides comprehensive authentication state management including:
 * - Automatic logout on browser close (sessionStorage)
 * - Session timeout (30 minutes of inactivity)
 * - Token refresh handling
 * - Protected route support
 * 
 * IMPORTANT: Uses sessionStorage instead of localStorage
 * This ensures users are logged out when browser is closed/restarted
 */

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import API, { API_BASE_URL } from '../utils/api';

const AuthContext = createContext(null);

// Session timeout configuration (30 minutes of inactivity)
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const WARNING_BEFORE_TIMEOUT = 2 * 60 * 1000; // 2 minutes before logout

/**
 * Generate a unique session ID for guest users
 * Stored in sessionStorage - cleared on browser close
 */
const generateSessionId = () => {
  const existingSessionId = sessionStorage.getItem('guestSessionId');
  if (existingSessionId) return existingSessionId;
  
  const newSessionId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  sessionStorage.setItem('guestSessionId', newSessionId);
  return newSessionId;
};

/**
 * Check if token is expired
 */
const isTokenExpired = (token) => {
  try {
    // Token format: header.payload.signature
    const payload = token.split('.')[1];
    if (!payload) return true;
    
    const decoded = JSON.parse(atob(payload));
    const currentTime = Date.now() / 1000;
    
    return decoded.exp < currentTime;
  } catch {
    return true;
  }
};

/**
 * Get token expiry time
 */
const getTokenExpiry = (token) => {
  try {
    const payload = token.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.exp * 1000; // Convert to milliseconds
  } catch {
    return null;
  }
};

/**
 * AuthProvider Component
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessionWarning, setSessionWarning] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  
  // Stable guest session ID - stored in sessionStorage and memoized
  const [guestSessionId] = useState(() => {
    const existingSessionId = sessionStorage.getItem('guestSessionId');
    if (existingSessionId) return existingSessionId;
    
    const newSessionId = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    sessionStorage.setItem('guestSessionId', newSessionId);
    return newSessionId;
  });

  // Refs for timeout management
  const activityTimeoutRef = useRef(null);
  const warningTimeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const handleLogoutRef = useRef(null);
  
  const navigate = useNavigate();

  const clearAuthState = useCallback(() => {
    clearAuthData();
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    setSessionWarning(false);
    setPendingAction(null);

    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
      activityTimeoutRef.current = null;
    }

    delete API.defaults.headers.common['Authorization'];
    API.defaults.headers.common['X-Session-ID'] = generateSessionId();
  }, []);

  /**
   * Store auth data in sessionStorage (cleared on browser close)
   */
  const storeAuthData = (authToken, authUser) => {
    sessionStorage.setItem('token', authToken);
    sessionStorage.setItem('user', JSON.stringify(authUser));
  };

  /**
   * Clear auth data from sessionStorage
   */
  const clearAuthData = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('pendingAction');
  };

  /**
   * Update the API headers with the current token
   */
  const updateApiHeaders = useCallback((authToken) => {
    API.defaults.headers.common['X-Session-ID'] = generateSessionId();
    if (authToken) {
      API.defaults.headers.common['Authorization'] = `Bearer ${authToken}`;
    } else {
      delete API.defaults.headers.common['Authorization'];
    }
  }, []);

  /**
   * Reset activity timer (called on user interaction)
   */
  const resetActivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    
    // Clear existing timeouts
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
      activityTimeoutRef.current = null;
    }
    
    // Hide warning
    setSessionWarning(false);
    
    // Set new timeout
    if (token && isAuthenticated) {
      const timeSinceLastActivity = Date.now() - lastActivityRef.current;
      const remainingTime = SESSION_TIMEOUT - timeSinceLastActivity;
      
      if (remainingTime > WARNING_BEFORE_TIMEOUT) {
        // Schedule warning
        warningTimeoutRef.current = setTimeout(() => {
          setSessionWarning(true);
        }, SESSION_TIMEOUT - WARNING_BEFORE_TIMEOUT - timeSinceLastActivity);
        
        // Schedule logout
        activityTimeoutRef.current = setTimeout(() => {
          if (handleLogoutRef.current) {
            handleLogoutRef.current(true);
          }
        }, remainingTime);
      } else {
        // Already in warning period or close to timeout
        setSessionWarning(true);
      }
    }
  }, [token, isAuthenticated]);

  /**
   * Track user activity
   */
  const trackActivity = useCallback(() => {
    // Skip if not authenticated
    if (!isAuthenticated) return;
    
    // Update last activity time
    lastActivityRef.current = Date.now();
  }, [isAuthenticated]);

  /**
   * Store pending action to resume after login
   */
  const storePendingAction = useCallback((action) => {
    if (action) {
      sessionStorage.setItem('pendingAction', JSON.stringify(action));
      setPendingAction(action);
    } else {
      sessionStorage.removeItem('pendingAction');
      setPendingAction(null);
    }
  }, []);

  /**
   * Get and clear pending action
   */
  const getAndClearPendingAction = useCallback(() => {
    const action = sessionStorage.getItem('pendingAction');
    if (action) {
      const parsed = JSON.parse(action);
      sessionStorage.removeItem('pendingAction');
      setPendingAction(null);
      return parsed;
    }
    return null;
  }, []);

  const resumePendingAction = useCallback(async (pending) => {
    if (!pending) return false;

    if (pending.redirect) {
      navigate(pending.redirect);
      return true;
    }

    if (typeof pending.action === 'function') {
      pending.action();
      return true;
    }

    if (!pending.productId) {
      return false;
    }

    const payload = {
      productId: pending.productId,
      quantity: Number(pending.quantity) > 0 ? Number(pending.quantity) : 1,
      size: pending.size || "",
      color: pending.color || "",
    };

    await API.post('/api/cart', payload);

    if (pending.action === 'buyNow') {
      navigate('/checkout');
      return true;
    }

    if (pending.action === 'addToCart') {
      navigate('/cart');
      return true;
    }

    return false;
  }, [navigate]);

  /**
   * Handle login
   * NOTE: For direct API calls (like from Login.jsx), use setAuthData() to sync state
   */
  const login = useCallback(async (email, password) => {
    try {
      setLoading(true);
      const normalizedEmail = String(email || '').trim().toLowerCase();
      const normalizedPassword = String(password || '');
      
      const { data } = await API.post('/api/users/login', { email: normalizedEmail, password: normalizedPassword });

      // Store token and user in sessionStorage (cleared on browser close)
      storeAuthData(data.token, data.user);

      setToken(data.token);
      setUser(data.user);
      setIsAuthenticated(true);

      // Update API headers
      updateApiHeaders(data.token);

      // Reset activity timer
      resetActivityTimer();

      console.log('AUTH: Login successful');

      // Check for pending action and navigate if exists
      const pending = getAndClearPendingAction();
      if (pending) {
        console.log('AUTH: Resuming pending action:', pending);
        try {
          const resumed = await resumePendingAction(pending);
          if (resumed) {
            return { success: true };
          }
        } catch (resumeErr) {
          console.warn('AUTH: failed to resume pending action', resumeErr);
        }
      }

      // Navigate based on role after a short delay to ensure state is updated
      setTimeout(() => {
        try {
          const rolePath = data.user?.isAdmin ? '/admin' : '/';
          navigate(rolePath, { replace: true });
        } catch (navErr) {
          console.warn('AUTH: navigation after login failed', navErr);
        }
      }, 100);

      return { success: true };
    } catch (err) {
      console.error('AUTH: Login failed:', err.response?.data || err.message || err);
      
      const errorMessage = err.response?.data?.message || err.message || 'Login failed. Please try again.';
      return { 
        success: false, 
        message: errorMessage,
        field: err.response?.data?.field 
      };
    } finally {
      setLoading(false);
    }
  }, [updateApiHeaders, resetActivityTimer, navigate, getAndClearPendingAction, resumePendingAction]);

  /**
   * Set auth data directly - used when login is handled externally
   * This syncs the AuthContext state with sessionStorage
   */
  const setAuthData = useCallback((authToken, authUser) => {
    storeAuthData(authToken, authUser);
    setToken(authToken);
    setUser(authUser);
    setIsAuthenticated(true);
    updateApiHeaders(authToken);
    resetActivityTimer();
    console.log('AUTH: Auth data set directly');
  }, [updateApiHeaders, resetActivityTimer]);

  /**
   * Handle registration
   */
  const register = useCallback(async (userData) => {
    try {
      setLoading(true);
      
      const { data } = await API.post('/api/users/register', userData);
      
      // Store token and user in sessionStorage
      storeAuthData(data.token, data.user);
      
      setToken(data.token);
      setUser(data.user);
      setIsAuthenticated(true);
      
      // Update API headers
      updateApiHeaders(data.token);
      
      // Reset activity timer
      resetActivityTimer();
      
      console.log('AUTH: Registration successful');
      
      // Check for pending action
      const pending = getAndClearPendingAction();
      if (pending) {
        console.log('AUTH: Resuming pending action after registration:', pending);
        try {
          await resumePendingAction(pending);
        } catch (resumeErr) {
          console.warn('AUTH: failed to resume pending action after registration', resumeErr);
        }
      }
      
      return { success: true };
    } catch (err) {
      console.error('AUTH: Registration failed:', err);
      
      const errorMessage = err.response?.data?.message || 'Registration failed. Please try again.';
      return { 
        success: false, 
        message: errorMessage,
        field: err.response?.data?.field 
      };
    } finally {
      setLoading(false);
    }
  }, [updateApiHeaders, resetActivityTimer, navigate, getAndClearPendingAction, resumePendingAction]);

  /**
   * Handle logout
   */
  const handleLogout = useCallback(async (autoLogout = false) => {
    try {
      // Try to notify server (but don't fail if it doesn't work)
      if (token) {
        try {
          await API.post('/api/users/logout');
        } catch {
          // Ignore server errors during logout
          console.log('AUTH: Server logout notification failed (ignoring)');
        }
      }
    } finally {
      // Always clear local state regardless of server response
      clearAuthState();
      console.log('AUTH: Logged out', autoLogout ? '(auto - session expired/browser closed)' : '');
    }
  }, [clearAuthState, token]);

  useEffect(() => {
    handleLogoutRef.current = handleLogout;
  }, [handleLogout]);

  /**
   * Extend session (reset timer without logging out)
   */
  const extendSession = useCallback(() => {
    resetActivityTimer();
  }, [resetActivityTimer]);

  /**
   * Initialize auth state on mount
   * IMPORTANT: Only restores session if within timeout window
   */
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Use sessionStorage - data is cleared when browser is closed
        const storedToken = sessionStorage.getItem('token');
        const storedUser = sessionStorage.getItem('user');
        const storedPendingAction = sessionStorage.getItem('pendingAction');
        
        if (!storedToken || !storedUser) {
          // No stored auth, generate guest session
          generateSessionId();
          if (storedPendingAction) {
            setPendingAction(JSON.parse(storedPendingAction));
          }
          setLoading(false);
          return;
        }
        
        // Check if token is expired
        if (isTokenExpired(storedToken)) {
          console.log('AUTH: Token expired on init - clearing session');
          clearAuthData();
          generateSessionId();
          setLoading(false);
          return;
        }
        
        // Restore auth state
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        setIsAuthenticated(true);
        updateApiHeaders(storedToken);
        
        if (storedPendingAction) {
          setPendingAction(JSON.parse(storedPendingAction));
        }
        
        // Initialize activity tracking
        resetActivityTimer();
        
        console.log('AUTH: Session restored from sessionStorage');
      } catch (err) {
        console.error('AUTH: Init error:', err);
        // Clear corrupted state
        clearAuthData();
      } finally {
        setLoading(false);
      }
    };
    
    initAuth();
  }, [updateApiHeaders, resetActivityTimer]);

  useEffect(() => {
    const handleAuthExpired = (event) => {
      clearAuthState();

      const redirectPath = event.detail?.redirectPath || `${window.location.pathname}${window.location.search}`
      const encoded = encodeURIComponent(redirectPath)
      if (!window.location.pathname.startsWith('/login')) {
        navigate(`/login?redirect=${encoded}&expired=true`, { replace: true })
      }
    }

    window.addEventListener('auth:expired', handleAuthExpired)
    return () => {
      window.removeEventListener('auth:expired', handleAuthExpired)
    }
  }, [clearAuthState, navigate]);

  /**
   * Set up activity listeners for session timeout
   */
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Track various user activities
    const activities = [
      'mousedown',
      'keydown',
      'scroll',
      'touchstart',
      'click',
      'mousemove'
    ];
    
    const handleActivity = () => trackActivity();
    
    // Add event listeners
    activities.forEach(activity => {
      document.addEventListener(activity, handleActivity, { passive: true });
    });
    
    // Cleanup
    return () => {
      activities.forEach(activity => {
        document.removeEventListener(activity, handleActivity);
      });
    };
  }, [isAuthenticated, trackActivity]);

  /**
   * Handle browser/tab close - auto logout
   */
  useEffect(() => {
    const handleBeforeUnload = () => {
      // This event fires when browser/tab is closing
      // sessionStorage will be cleared automatically by browser
      // but we ensure cleanup here
      console.log('AUTH: Browser closing - session will be cleared');
      
      // Notify server if needed (fire and forget)
      if (token) {
        const payload = new Blob([JSON.stringify({})], { type: 'application/json' })
        navigator.sendBeacon(`${API_BASE_URL}/api/users/logout`, payload);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Also handle visibility change (tab switch)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Tab is hidden - could track time away
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [token]);

  /**
   * Provide session info
   */
  const getSessionInfo = useCallback(() => {
    if (!token) return null;
    
    const expiry = getTokenExpiry(token);
    const timeRemaining = expiry ? expiry - Date.now() : 0;
    
    return {
      expiresAt: expiry,
      timeRemaining,
      isExpiringSoon: timeRemaining < WARNING_BEFORE_TIMEOUT
    };
  }, [token]);

  /**
   * Context value
   */
  const value = {
    // State
    user,
    token,
    loading,
    isAuthenticated,
    sessionWarning,
    pendingAction,
    guestSessionId,

    
    // Actions
    login,
    register,
    setAuthData, // NEW: For syncing auth state from external login
    logout: handleLogout,
    extendSession,
    getSessionInfo,
    storePendingAction,
    getAndClearPendingAction,
    
    // Utilities
    updateApiHeaders,
    resetActivityTimer,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

/**
 * Component to show session timeout warning
 */
export const SessionWarning = () => {
  const { sessionWarning, extendSession, logout } = useAuth();
  
  if (!sessionWarning) return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-yellow-50 border-t border-yellow-200 p-4 z-50 animate-fade-in-up">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-medium text-yellow-800">Your session will expire soon</p>
            <p className="text-sm text-yellow-600">Click "Stay Logged In" to continue</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={logout}
            className="px-4 py-2 text-yellow-700 hover:bg-yellow-100 rounded-lg transition"
          >
            Logout
          </button>
          <button
            onClick={extendSession}
            className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
          >
            Stay Logged In
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthContext;
