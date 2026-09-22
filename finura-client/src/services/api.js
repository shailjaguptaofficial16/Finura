import axios from 'axios';
import { toast } from 'react-toastify';

const getStorage = (storage) => {
  try {
    return typeof window !== 'undefined' ? window[storage] : null;
  } catch (error) {
    return null;
  }
};

const getStoredAuthValue = (key) => {
  const sessionStorageRef = getStorage('sessionStorage');
  const localStorageRef = getStorage('localStorage');

  if (sessionStorageRef && sessionStorageRef.getItem(key) !== null) {
    return sessionStorageRef.getItem(key);
  }
  if (localStorageRef) {
    return localStorageRef.getItem(key);
  }
  return null;
};

const clearStoredAuthData = () => {
  const sessionStorageRef = getStorage('sessionStorage');
  const localStorageRef = getStorage('localStorage');

  const keys = [
    'token',
    'user',
    'finura-user',
    'finura-user-name',
    'finura-user-email',
    'finura-user-phone',
    'finura-user-occupation',
    'finura-user-avatar',
  ];

  keys.forEach((key) => {
    if (sessionStorageRef) sessionStorageRef.removeItem(key);
    if (localStorageRef) localStorageRef.removeItem(key);
  });
};

const getApiBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (!envUrl) return '/api';
  const cleanUrl = envUrl.replace(/\/$/, '');
  return cleanUrl.endsWith('/api') ? cleanUrl : `${cleanUrl}/api`;
};

// Create central Axios instance
const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Automatically attach JWT token from sessionStorage.
api.interceptors.request.use(
  (config) => {
    const token = getStoredAuthValue('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle global 401 Unauthorized responses cleanly
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const currentPath = window.location.pathname;
      if (
        !currentPath.includes('/login') &&
        !currentPath.includes('/signup') &&
        !currentPath.includes('/forgot-password') &&
        !currentPath.includes('/reset-password')
      ) {
        clearStoredAuthData();

        if (!toast.isActive('session-expired')) {
          toast.error('Session expired. Please log in again.', {
            toastId: 'session-expired',
            position: 'top-right',
            autoClose: 3000,
          });
        }

        setTimeout(() => {
          window.location.href = '/login';
        }, 1500);
      }
    }
    return Promise.reject(error);
  }
);

export { clearStoredAuthData };
export default api;
