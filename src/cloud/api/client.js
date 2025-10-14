/**
 * Base API client for Splitmark Cloud
 * Handles authentication, rate limiting, and error handling
 */

import fetch from 'node-fetch';
import { getToken } from '../storage/credentials.js';

// Rate limit tracking
const rateLimitState = {
  requests: [],
  limits: {
    auth: { maxRequests: 5, windowMs: 60000 }, // 5 per minute
    api: { maxRequests: 100, windowMs: 60000 }, // 100 per minute
    files: { maxRequests: 10, windowMs: 60000 }, // 10 per minute
    strict: { maxRequests: 3, windowMs: 60000 }, // 3 per minute
  },
};

class SplitmarkAPIClient {
  /**
   * Create API client instance
   * @param {string} baseUrl - API base URL
   * @param {string} token - Optional JWT token (will auto-load if not provided)
   */
  constructor(baseUrl, token = null) {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.token = token;
  }

  /**
   * Set authentication token
   * @param {string} token
   */
  setToken(token) {
    this.token = token;
  }

  /**
   * Get current token (load from storage if needed)
   * @returns {Promise<string|null>}
   */
  async getToken() {
    if (!this.token) {
      this.token = await getToken();
    }
    return this.token;
  }

  /**
   * Clear token
   */
  clearToken() {
    this.token = null;
  }

  /**
   * Check rate limit for endpoint type
   * @param {string} type - Endpoint type: auth, api, files, strict
   * @returns {boolean} True if within limit
   */
  checkRateLimit(type = 'api') {
    const limit = rateLimitState.limits[type] || rateLimitState.limits.api;
    const now = Date.now();
    const windowStart = now - limit.windowMs;

    // Clean old requests
    rateLimitState.requests = rateLimitState.requests.filter(
      (req) => req.timestamp > windowStart && req.type === type
    );

    // Check if at limit
    if (rateLimitState.requests.length >= limit.maxRequests) {
      return false;
    }

    // Add current request
    rateLimitState.requests.push({ timestamp: now, type });
    return true;
  }

  /**
   * Wait for rate limit to reset
   * @param {string} type - Endpoint type
   * @returns {Promise<void>}
   */
  async waitForRateLimit(type = 'api') {
    const limit = rateLimitState.limits[type] || rateLimitState.limits.api;
    const now = Date.now();
    const oldestRequest = rateLimitState.requests.find((req) => req.type === type);

    if (oldestRequest) {
      const waitTime = limit.windowMs - (now - oldestRequest.timestamp);
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }
    }
  }

  /**
   * Make HTTP request to API
   * @param {string} endpoint - API endpoint (without base URL)
   * @param {object} options - Fetch options
   * @param {string} rateLimitType - Rate limit type
   * @returns {Promise<object>} Response data
   */
  async request(endpoint, options = {}, rateLimitType = 'api') {
    // Check rate limit
    if (!this.checkRateLimit(rateLimitType)) {
      console.warn(`Rate limit reached for ${rateLimitType}, waiting...`);
      await this.waitForRateLimit(rateLimitType);
    }

    const url = `${this.baseUrl}${endpoint}`;

    const token = await this.getToken();

    // Build headers
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add authorization if token available
    if (token && !options.skipAuth) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Make request with retry logic
    const maxRetries = 3;
    let lastError;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(url, {
          ...options,
          headers,
        });


        // Handle different status codes
        if (response.status === 429) {
          // Rate limited by server
          const retryAfter = response.headers.get('Retry-After');
          const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 60000;
          console.warn(`Server rate limit, retrying after ${waitTime}ms`);
          await new Promise((resolve) => setTimeout(resolve, waitTime));
          continue;
        }

        if (response.status === 401) {
          // Unauthorized - token may be expired
          this.clearToken();
          const error = await this.parseErrorResponse(response);
          throw new AuthenticationError(error.message || 'Authentication failed');
        }

        if (response.status === 403) {
          const error = await this.parseErrorResponse(response);
          throw new AuthorizationError(error.message || 'Forbidden');
        }

        if (response.status === 404) {
          const error = await this.parseErrorResponse(response);
          console.log(`[DEBUG] 404 Error details:`, error);
          throw new NotFoundError(error.message || 'Resource not found');
        }

        if (response.status === 409) {
          const error = await this.parseErrorResponse(response);
          throw new ConflictError(error.message || 'Resource conflict');
        }

        if (response.status === 413) {
          const error = await this.parseErrorResponse(response);
          throw new PayloadTooLargeError(error.message || 'File too large');
        }

        // Handle 400 Bad Request - could be OAuth errors that need special handling
        if (response.status === 400) {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            console.log(`[DEBUG] 400 Response data:`, JSON.stringify(data, null, 2));

            // For OAuth device flow, return the error data instead of throwing
            // The calling code will check for authorization_pending, access_denied, etc.
            if (data.error === 'authorization_pending' ||
                data.error === 'access_denied' ||
                data.error === 'expired_token' ||
                data.error === 'slow_down') {
              return data;
            }

            // For other 400 errors, throw
            throw new APIError(
              data.error_description || data.message || data.error || 'Bad request',
              400
            );
          }
        }

        if (!response.ok) {
          const error = await this.parseErrorResponse(response);
          throw new APIError(
            error.message || `Request failed with status ${response.status}`,
            response.status
          );
        }

        // Success - parse JSON response
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          console.log(`[DEBUG] Response data:`, JSON.stringify(data, null, 2));
          return data;
        }

        return { success: true };
      } catch (error) {
        console.log(`[DEBUG] Request error (attempt ${attempt + 1}/${maxRetries}):`, error.message);
        lastError = error;

        // Don't retry on client errors (4xx)
        if (
          error instanceof AuthenticationError ||
          error instanceof AuthorizationError ||
          error instanceof NotFoundError ||
          error instanceof ConflictError ||
          error instanceof PayloadTooLargeError
        ) {
          throw error;
        }

        // Retry on network errors or server errors (5xx)
        if (attempt < maxRetries - 1) {
          const backoff = Math.pow(2, attempt) * 1000; // Exponential backoff
          console.warn(`Request failed, retrying in ${backoff}ms...`);
          await new Promise((resolve) => setTimeout(resolve, backoff));
          continue;
        }
      }
    }

    // All retries failed
    throw lastError || new APIError('Request failed after retries');
  }

  /**
   * Parse error response from API
   * @param {Response} response
   * @returns {Promise<object>}
   */
  async parseErrorResponse(response) {
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      return { error: await response.text() };
    } catch (error) {
      return { error: 'Unknown error occurred' };
    }
  }

  /**
   * Make GET request
   * @param {string} endpoint
   * @param {object} options
   * @returns {Promise<object>}
   */
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  /**
   * Make POST request
   * @param {string} endpoint
   * @param {object} data
   * @param {object} options
   * @returns {Promise<object>}
   */
  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Make PUT request
   * @param {string} endpoint
   * @param {object} data
   * @param {object} options
   * @returns {Promise<object>}
   */
  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Make DELETE request
   * @param {string} endpoint
   * @param {object} options
   * @returns {Promise<object>}
   */
  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

// Custom error classes
class APIError extends Error {
  constructor(message, statusCode = null) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
  }
}

class AuthenticationError extends APIError {
  constructor(message) {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends APIError {
  constructor(message) {
    super(message, 403);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends APIError {
  constructor(message) {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

class ConflictError extends APIError {
  constructor(message) {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

class PayloadTooLargeError extends APIError {
  constructor(message) {
    super(message, 413);
    this.name = 'PayloadTooLargeError';
  }
}

export {
  SplitmarkAPIClient,
  APIError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  PayloadTooLargeError,
};

export default SplitmarkAPIClient;
