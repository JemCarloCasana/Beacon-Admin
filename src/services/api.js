/**
 * API Service Layer
 *
 * Provides a centralized, clean fetch wrapper for all backend communication.
 * Features:
 * - Environment-based base URL configuration
 * - Automatic timeout handling
 * - Error handling with logging
 * - Request/response interceptors
 * - Helper methods for common HTTP verbs (GET, POST, PATCH, DELETE)
 * - ✅ Auto Bearer token for /admin/* endpoints
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";
const REQUEST_TIMEOUT = parseInt(import.meta.env.VITE_REQUEST_TIMEOUT || "10000", 10);

/**
 * Custom error class for API errors
 */
class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

/**
 * Configure request options with timeout controller
 */
const createFetchOptions = (options = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  return {
    ...options,
    signal: controller.signal,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    timeoutId,
    controller,
  };
};

/**
 * ✅ Request interceptor
 * Adds Authorization header for /admin/* routes if admin_token exists
 */
const requestInterceptor = async (url, options) => {
  const headers = { ...(options.headers || {}) };

  // Only attach admin token for admin endpoints
  // (adjust if your backend uses a different prefix)
  const isAdminEndpoint = url.includes("/admin");

  if (isAdminEndpoint) {
    const token = localStorage.getItem("admin_token");
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return {
    url,
    options: {
      ...options,
      headers,
    },
  };
};

/**
 * Response interceptor - handle responses globally
 */
const responseInterceptor = (response, data) => {
  if (import.meta.env.DEV) {
    console.log(`[API] ${response.status} ${response.statusText}`, data);
  }
  return data;
};

/**
 * Error interceptor - handle errors globally
 */
const errorInterceptor = (error, statusCode) => {
  if (import.meta.env.DEV) {
    console.error(`[API Error] ${statusCode}`, error);
  }

  // ✅ If unauthorized, clear token so app doesn't keep failing
  if (statusCode === 401) {
    try {
      localStorage.removeItem("admin_token");
      localStorage.removeItem("admin_me"); // optional if you still store it
      // optional: notify app to redirect
      window.dispatchEvent(new Event("auth:logout"));
    } catch (e) {
      // ignore
    }
  }

  throw error;
};

/**
 * Main fetch wrapper function
 */
const request = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const fetchOptions = createFetchOptions(options);
  const { timeoutId, controller, ...cleanOptions } = fetchOptions;

  try {
    // Apply request interceptor
    const { url: finalUrl, options: finalOptions } = await requestInterceptor(url, cleanOptions);

    // Perform the fetch
    const response = await fetch(finalUrl, finalOptions);

    // Clear timeout since request completed
    clearTimeout(timeoutId);

    // Parse response body
    let data = null;
    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else if (response.ok) {
      data = await response.text();
    } else {
      // try to read text body for errors too
      try {
        const text = await response.text();
        data = text ? { message: text } : null;
      } catch {
        data = null;
      }
    }

    // Handle HTTP errors
    if (!response.ok) {
      const error = new ApiError(data?.message || `HTTP ${response.status}`, response.status, data);
      return errorInterceptor(error, response.status);
    }

    // Apply response interceptor
    return responseInterceptor(response, data);
  } catch (error) {
    clearTimeout(timeoutId);

    // Handle abort (timeout)
    if (error.name === "AbortError") {
      const timeoutError = new ApiError(`Request timeout (${REQUEST_TIMEOUT}ms)`, 408, null);
      return errorInterceptor(timeoutError, 408);
    }

    // Handle network errors
    const networkError = new ApiError(error.message || "Network error", 0, null);
    return errorInterceptor(networkError, 0);
  }
};

/**
 * GET request helper
 */
export const apiGet = (endpoint, options = {}) =>
  request(endpoint, {
    ...options,
    method: "GET",
  });

/**
 * POST request helper
 */
export const apiPost = (endpoint, data, options = {}) =>
  request(endpoint, {
    ...options,
    method: "POST",
    body: JSON.stringify(data),
  });

/**
 * PATCH request helper
 */
export const apiPatch = (endpoint, data, options = {}) =>
  request(endpoint, {
    ...options,
    method: "PATCH",
    body: JSON.stringify(data),
  });

/**
 * DELETE request helper
 */
export const apiDelete = (endpoint, options = {}) =>
  request(endpoint, {
    ...options,
    method: "DELETE",
  });

/**
 * Export base request function for custom use cases
 */
export const apiRequest = request;

/**
 * Export configuration for testing/debugging
 */
export const apiConfig = {
  API_BASE_URL,
  REQUEST_TIMEOUT,
};

export default {
  get: apiGet,
  post: apiPost,
  patch: apiPatch,
  delete: apiDelete,
  request: apiRequest,
  config: apiConfig,
};
