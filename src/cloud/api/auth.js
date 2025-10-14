/**
 * Authentication API methods
 * Handles login, signup, and profile management
 */

import SplitmarkAPIClient from './client.js';
import { saveToken, clearToken } from '../storage/credentials.js';

/**
 * Sign up a new user
 * @param {string} baseUrl - API base URL
 * @param {string} email
 * @param {string} password
 * @param {string} username
 * @returns {Promise<object>} { token, user }
 */
export async function signup(baseUrl, email, password, username) {
  const client = new SplitmarkAPIClient(baseUrl);

  try {
    const response = await client.post(
      '/signup',
      { email, password, username },
      { skipAuth: true, rateLimitType: 'auth' }
    );

    // Save token and user data
    if (response.token) {
      await saveToken(response.token, response.user);
    }

    return {
      token: response.token,
      user: response.user,
      message: response.message,
    };
  } catch (error) {
    throw new Error(`Signup failed: ${error.message}`);
  }
}

/**
 * Log in existing user
 * @param {string} baseUrl - API base URL
 * @param {string} email
 * @param {string} password
 * @returns {Promise<object>} { token, user }
 */
export async function login(baseUrl, email, password) {
  const client = new SplitmarkAPIClient(baseUrl);

  try {
    const response = await client.post(
      '/login',
      { email, password },
      { skipAuth: true, rateLimitType: 'auth' }
    );

    // Save token and user data
    if (response.token) {
      await saveToken(response.token, response.user);
    }

    return {
      token: response.token,
      user: response.user,
      message: response.message,
    };
  } catch (error) {
    throw new Error(`Login failed: ${error.message}`);
  }
}

/**
 * Log out current user (clear credentials)
 * @returns {Promise<void>}
 */
export async function logout() {
  try {
    await clearToken();
  } catch (error) {
    throw new Error(`Logout failed: ${error.message}`);
  }
}

/**
 * Get current user profile
 * @param {string} baseUrl - API base URL
 * @param {string} token - JWT token
 * @returns {Promise<object>} User profile data
 */
export async function getProfile(baseUrl, token) {
  const client = new SplitmarkAPIClient(baseUrl, token);

  try {
    const response = await client.get('/profile');
    return response.user;
  } catch (error) {
    throw new Error(`Failed to get profile: ${error.message}`);
  }
}

/**
 * Update user profile
 * @param {string} baseUrl - API base URL
 * @param {string} token - JWT token
 * @param {object} updates - Fields to update { username, email }
 * @returns {Promise<object>} Updated user data
 */
export async function updateProfile(baseUrl, token, updates) {
  const client = new SplitmarkAPIClient(baseUrl, token);

  try {
    const response = await client.put('/profile', updates);
    return response.user;
  } catch (error) {
    throw new Error(`Failed to update profile: ${error.message}`);
  }
}

/**
 * Get user's public key for encryption
 * @param {string} baseUrl - API base URL
 * @param {string} token - JWT token
 * @param {string} username - Target username
 * @returns {Promise<object>} { publicKey, username }
 */
export async function getUserPublicKey(baseUrl, token, username) {
  const client = new SplitmarkAPIClient(baseUrl, token);

  try {
    const response = await client.get(`/users/${username}/public-key`);
    return {
      publicKey: response.publicKey,
      username: response.username,
    };
  } catch (error) {
    throw new Error(`Failed to get public key: ${error.message}`);
  }
}

/**
 * Get Google OAuth URL
 * @param {string} baseUrl - API base URL
 * @param {string} redirectUri - Optional redirect URI
 * @returns {string} OAuth URL
 */
export function getGoogleAuthUrl(baseUrl, redirectUri = null) {
  const url = new URL(`${baseUrl}/auth/google`);
  if (redirectUri) {
    url.searchParams.set('redirect_uri', redirectUri);
  }
  return url.toString();
}

/**
 * Get GitHub OAuth URL
 * @param {string} baseUrl - API base URL
 * @param {string} redirectUri - Optional redirect URI
 * @returns {string} OAuth URL
 */
export function getGithubAuthUrl(baseUrl, redirectUri = null) {
  const url = new URL(`${baseUrl}/auth/github`);
  if (redirectUri) {
    url.searchParams.set('redirect_uri', redirectUri);
  }
  return url.toString();
}

/**
 * Initiate device flow authentication
 * @param {string} baseUrl - API base URL
 * @returns {Promise<object>} { deviceCode, userCode, verificationUrl, expiresIn, interval }
 */
export async function initiateDeviceFlow(baseUrl) {
  const client = new SplitmarkAPIClient(baseUrl);

  try {
    const response = await client.post(
      '/auth/cli/device-code',
      {},
      { skipAuth: true, rateLimitType: 'auth' }
    );

    return {
      deviceCode: response.device_code || response.deviceCode,
      userCode: response.user_code || response.userCode,
      verificationUrl: response.verification_uri || response.verificationUrl,
      verificationUrlComplete: response.verification_uri_complete || response.verificationUrlComplete || null,
      expiresIn: response.expires_in || response.expiresIn,
      interval: response.interval || 5,
    };
  } catch (error) {
    throw new Error(`Failed to initiate device flow: ${error.message}`);
  }
}

/**
 * Poll for device flow token
 * @param {string} baseUrl - API base URL
 * @param {string} deviceCode - Device code from initiateDeviceFlow
 * @returns {Promise<object>} { token, user } or { pending: true } or { error: string }
 */
export async function pollDeviceToken(baseUrl, deviceCode) {
  const client = new SplitmarkAPIClient(baseUrl);

  try {
    const response = await client.post(
      '/auth/cli/token',
      {
        device_code: deviceCode,
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code'
      },
      { skipAuth: true, rateLimitType: 'auth' }
    );

    // Check if authorization is pending (HTTP 400 with error field)
    if (response.error === 'authorization_pending') {
      return { pending: true };
    }

    // Check if we should slow down polling
    if (response.error === 'slow_down') {
      return { pending: true, slowDown: true };
    }

    // Check if code expired (HTTP 400 with error field)
    if (response.error === 'expired_token') {
      const message = response.error_description || 'Device code expired. Please try again.';
      throw new Error(message);
    }

    // Check if access was denied (HTTP 400 with error field)
    if (response.error === 'access_denied') {
      const message = response.error_description || 'Authorization was denied.';
      throw new Error(message);
    }

    // Check for other OAuth errors
    if (response.error) {
      const message = response.error_description || response.error;
      throw new Error(message);
    }

    // Success - save token and user data (HTTP 200)
    // Response uses access_token instead of token
    const token = response.access_token || response.token;
    const user = response.user;

    if (token) {
      await saveToken(token, user);
    }

    return {
      token: token,
      user: user,
    };
  } catch (error) {
    // If it's already our error, rethrow
    if (error.message.includes('expired') || error.message.includes('denied')) {
      throw error;
    }
    throw new Error(`Failed to poll for token: ${error.message}`);
  }
}

/**
 * Complete device flow authentication
 * Polls until authorized or timeout
 * @param {string} baseUrl - API base URL
 * @param {string} deviceCode - Device code
 * @param {number} interval - Polling interval in seconds
 * @param {number} expiresIn - Expiration time in seconds
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<object>} { token, user }
 */
export async function completeDeviceFlow(
  baseUrl,
  deviceCode,
  interval = 5,
  expiresIn = 600,
  onProgress = null
) {
  let pollInterval = interval * 1000; // Convert to milliseconds
  const timeout = expiresIn * 1000;
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const result = await pollDeviceToken(baseUrl, deviceCode);

      // If pending, wait and try again
      if (result.pending) {
        // If server requests us to slow down, increase interval
        if (result.slowDown) {
          pollInterval = Math.min(pollInterval + 1000, 10000); // Add 1s, max 10s
        }

        if (onProgress) {
          const elapsed = Math.floor((Date.now() - startTime) / 1000);
          const remaining = Math.floor((timeout - (Date.now() - startTime)) / 1000);
          onProgress({ status: 'waiting', elapsed, remaining });
        }
        await new Promise((resolve) => setTimeout(resolve, pollInterval));
        continue;
      }

      // Success!
      if (result.token) {
        if (onProgress) {
          onProgress({ status: 'success', user: result.user });
        }
        return result;
      }
    } catch (error) {
      if (onProgress) {
        onProgress({ status: 'error', error: error.message });
      }
      throw error;
    }
  }

  throw new Error('Device flow timed out. Please try again.');
}

/**
 * Login using device flow (recommended for CLI)
 * @param {string} baseUrl - API base URL
 * @param {Function} onProgress - Progress callback
 * @returns {Promise<object>} { token, user }
 */
export async function loginWithDeviceFlow(baseUrl, onProgress = null) {
  try {
    // Step 1: Initiate device flow
    const deviceFlow = await initiateDeviceFlow(baseUrl);

    if (onProgress) {
      onProgress({
        status: 'initiated',
        userCode: deviceFlow.userCode,
        verificationUrl: deviceFlow.verificationUrl,
        verificationUrlComplete: deviceFlow.verificationUrlComplete,
      });
    }

    // Step 2: Poll for authorization
    const result = await completeDeviceFlow(
      baseUrl,
      deviceFlow.deviceCode,
      deviceFlow.interval,
      deviceFlow.expiresIn,
      onProgress
    );

    return result;
  } catch (error) {
    throw new Error(`Device flow login failed: ${error.message}`);
  }
}

export default {
  signup,
  login,
  logout,
  getProfile,
  updateProfile,
  getUserPublicKey,
  getGoogleAuthUrl,
  getGithubAuthUrl,
  initiateDeviceFlow,
  pollDeviceToken,
  completeDeviceFlow,
  loginWithDeviceFlow,
};
