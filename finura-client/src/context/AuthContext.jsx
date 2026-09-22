import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

const readStoredValue = (key) => {
  if (typeof window === 'undefined') return null;

  try {
    const sessionValue = sessionStorage.getItem(key);
    if (sessionValue !== null) return sessionValue;
  } catch (error) {
    console.warn(`Unable to read ${key} from sessionStorage:`, error);
  }

  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.warn(`Unable to read ${key} from localStorage:`, error);
    return null;
  }
};

const safeParseInitialUser = () => {
  try {
    const savedUser = readStoredValue('user') || readStoredValue('finura-user');
    return savedUser ? JSON.parse(savedUser) : null;
  } catch (error) {
    console.warn('Unable to parse initial user from storage:', error);
    return null;
  }
};

const sanitizeUser = (userObj) => {
  if (!userObj) return null;
  const sanitized = { ...userObj };
  delete sanitized.password;
  delete sanitized.passwordHash;
  delete sanitized.token;
  delete sanitized.accessToken;
  delete sanitized.refreshToken;
  delete sanitized.secret;
  delete sanitized.authSecret;

  // Harmonize avatar and avatarUrl
  const avatar = sanitized.avatarUrl || sanitized.avatar || '';
  sanitized.avatar = avatar;
  sanitized.avatarUrl = avatar;

  // Harmonize profession and occupation
  const profession = sanitized.profession || sanitized.occupation || '';
  sanitized.profession = profession;
  sanitized.occupation = profession;

  return sanitized;
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => readStoredValue('token') || null);

  const [user, setUser] = useState(() => {
    const savedUser = readStoredValue('user');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {
        console.warn('Error parsing user from storage:', e);
      }
    }
    return safeParseInitialUser();
  });

  const [isLoading, setIsLoading] = useState(false);

  // Sync token to localStorage and state
  const persistToken = (newToken) => {
    if (newToken) {
      sessionStorage.setItem('token', newToken);
      setToken(newToken);
    } else {
      sessionStorage.removeItem('token');
      localStorage.removeItem('token');
      setToken(null);
    }
  };

  // Persistent User Update: updates React state and syncs to localStorage
  const updateUser = useCallback((updatedUserData) => {
    if (updatedUserData) {
      const sanitized = sanitizeUser(updatedUserData);
      setUser(sanitized);
      sessionStorage.setItem('user', JSON.stringify(sanitized));
      sessionStorage.setItem('finura-user', JSON.stringify(sanitized));
      if (sanitized.name) sessionStorage.setItem('finura-user-name', sanitized.name);
      if (sanitized.email) sessionStorage.setItem('finura-user-email', sanitized.email);
      if (sanitized.phone) sessionStorage.setItem('finura-user-phone', sanitized.phone);
      if (sanitized.profession) sessionStorage.setItem('finura-user-occupation', sanitized.profession);
      if (sanitized.avatarUrl || sanitized.avatar) {
        sessionStorage.setItem('finura-user-avatar', sanitized.avatarUrl || sanitized.avatar);
      }

      localStorage.removeItem('user');
      localStorage.removeItem('finura-user');
      localStorage.removeItem('finura-user-name');
      localStorage.removeItem('finura-user-email');
      localStorage.removeItem('finura-user-phone');
      localStorage.removeItem('finura-user-occupation');
      localStorage.removeItem('finura-user-avatar');
    } else {
      setUser(null);
      sessionStorage.removeItem('user');
      sessionStorage.removeItem('finura-user');
      sessionStorage.removeItem('finura-user-name');
      sessionStorage.removeItem('finura-user-email');
      sessionStorage.removeItem('finura-user-phone');
      sessionStorage.removeItem('finura-user-occupation');
      sessionStorage.removeItem('finura-user-avatar');

      localStorage.removeItem('user');
      localStorage.removeItem('finura-user');
      localStorage.removeItem('finura-user-name');
      localStorage.removeItem('finura-user-email');
      localStorage.removeItem('finura-user-phone');
      localStorage.removeItem('finura-user-occupation');
      localStorage.removeItem('finura-user-avatar');
    }
  }, []);

  // Persistent Auth Check: on initial mount, trigger background refresh to sync with MongoDB
  // without wiping existing user state on failure
  const checkAuth = useCallback(async () => {
    const storedToken = readStoredValue('token');
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    try {
      let res;
      try {
        res = await api.get('/users/profile');
      } catch (err) {
        // Fallback to /user/profile if /users/profile is not available
        if (err.response && (err.response.status === 404 || err.response.status === 405)) {
          res = await api.get('/user/profile');
        } else {
          throw err;
        }
      }

      if (res && res.data) {
        updateUser(res.data);
      }
    } catch (error) {
      // Log error but DO NOT wipe existing user state on network / temporary failure
      console.warn('Background profile refresh failed:', error?.response?.data?.message || error.message);
    } finally {
      setIsLoading(false);
    }
  }, [updateUser]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Login method: Supports object/token payload or standard (email, password)
  const login = async (arg1, arg2) => {
    if (typeof arg1 === 'object' && arg1 !== null && arg1.token) {
      const { token: nextToken, user: authUser, name, email } = arg1;
      persistToken(nextToken);
      const resolvedUser = authUser || { name: name || 'Finura Member', email: email || '' };
      updateUser(resolvedUser);
      setIsLoading(false);
      return { token: nextToken, user: resolvedUser };
    }

    if (typeof arg1 === 'string' && arg2 && typeof arg2 === 'object') {
      persistToken(arg1);
      updateUser(arg2);
      setIsLoading(false);
      return { token: arg1, user: arg2 };
    }

    const email = arg1;
    const password = arg2;
    const { data } = await api.post('/auth/login', { email, password });

    if (data.token) {
      persistToken(data.token);
    }
    const resolved = data.user || { name: data.name, email };
    updateUser(resolved);
    setIsLoading(false);

    return data;
  };

  // Signup method: POST /auth/signup
  const signup = async (name, email, password, extraData = {}) => {
    const { data } = await api.post('/auth/signup', {
      name,
      fullName: name,
      email,
      password,
      ...extraData,
    });

    if (data.token) {
      persistToken(data.token);
    }
    const resolved = data.user || { name: data.name || name, email };
    updateUser(resolved);
    setIsLoading(false);

    return data;
  };

  // Logout method: Clear state and localStorage
  const logout = useCallback(() => {
    persistToken(null);
    updateUser(null);
    setIsLoading(false);
  }, [updateUser]);

  const isAuthenticated = useMemo(() => {
    return Boolean(token && typeof token === 'string' && token.length > 10);
  }, [token]);

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated,
      isLoading,
      isAuthLoading: isLoading,
      userName: user?.name || 'Finura Member',
      userEmail: user?.email || '',
      login,
      signup,
      logout,
      checkAuth,
      updateUser,
      setUser: updateUser, // Supports both updateUser and setUser
      setUserName: (name) => {
        if (user) updateUser({ ...user, name });
      },
      setUserEmail: (email) => {
        if (user) updateUser({ ...user, email });
      },
    }),
    [user, token, isAuthenticated, isLoading, logout, checkAuth, updateUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
