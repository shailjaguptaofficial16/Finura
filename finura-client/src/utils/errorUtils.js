/**
 * Error extraction utility for Finura Client
 *
 * Safely extracts a user-facing string error message from any error shape,
 * preventing Minified React Error #31 ("Objects are not valid as a React child")
 * when rendering error states in JSX.
 */

export function extractErrorMessage(
  error,
  fallback = 'An unexpected error occurred. Please try again.'
) {
  if (!error) return fallback;
  if (typeof error === 'string') return error;

  const data = error.response?.data;

  // 1. Plain text response body
  if (typeof data === 'string' && data.trim()) {
    // If it's HTML (e.g. 502/504 gateway error page), sanitize it
    if (data.startsWith('<') && data.includes('html')) {
      return `Server error (${error.response.status || 500}). The service is temporarily unavailable.`;
    }
    return data;
  }

  // 2. Structured JSON response body
  if (data && typeof data === 'object') {
    // Standard Finura backend format: { success: false, message: "..." }
    if (typeof data.message === 'string' && data.message.trim()) {
      return data.message;
    }

    // Direct error string: { error: "..." }
    if (typeof data.error === 'string' && data.error.trim()) {
      return data.error;
    }

    // Vercel Serverless / Cloud error object: { error: { code: "500", message: "..." } }
    if (data.error && typeof data.error === 'object') {
      if (typeof data.error.message === 'string' && data.error.message.trim()) {
        return data.error.message;
      }
      if (typeof data.error.code === 'string' || typeof data.error.code === 'number') {
        return `Server error (${data.error.code}): ${data.error.message || 'Function execution failed'}`;
      }
    }

    // Direct code + message object: { code: "500", message: "..." }
    if (typeof data.code !== 'undefined' && typeof data.message === 'string' && data.message.trim()) {
      return data.message;
    }

    // Express validator / schema errors: { errors: [{ message: "..." }] }
    if (Array.isArray(data.errors) && data.errors.length > 0) {
      const first = data.errors[0];
      if (typeof first === 'string') return first;
      if (first && typeof first.message === 'string') return first.message;
      if (first && typeof first.msg === 'string') return first.msg;
    }

    // Generic msg field: { msg: "..." }
    if (typeof data.msg === 'string' && data.msg.trim()) {
      return data.msg;
    }
  }

  // 3. HTTP status-based informative message when data has no readable text
  if (error.response?.status) {
    const status = error.response.status;
    if (status === 400) return 'Invalid request. Please check your input.';
    if (status === 401) return 'Invalid credentials. Please verify your email and password.';
    if (status === 403) return 'Access denied. You do not have permission to perform this action.';
    if (status === 404) return 'The requested resource or endpoint was not found.';
    if (status === 500) return 'Server error (500). Please check your backend deployment or try again later.';
    if (status === 502 || status === 503 || status === 504) {
      return `Server gateway error (${status}). The backend service is starting up or temporarily offline.`;
    }
  }

  // 4. Standard JavaScript Error object
  if (typeof error.message === 'string' && error.message.trim()) {
    if (error.message.toLowerCase().includes('network error') || error.code === 'ERR_NETWORK') {
      return 'Unable to reach the server. Please check your internet connection or backend URL.';
    }
    return error.message;
  }

  return fallback;
}
