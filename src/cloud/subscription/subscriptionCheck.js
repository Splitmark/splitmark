/**
 * Subscription verification utilities
 * Checks if user has active premium subscription for cloud features
 */

import { getCredentials, getToken } from '../storage/credentials.js';
import { getProfile } from '../api/auth.js';
import { getApiUrl } from '../../utils/cloudConfig.js';

/**
 * Check if user has an active premium subscription
 * @param {object} config - App configuration
 * @returns {Promise<{hasSubscription: boolean, user: object|null, error: string|null}>}
 */
export async function checkSubscriptionStatus(config) {
  try {
    // First check if user is authenticated
    const token = await getToken();
    if (!token) {
      return {
        hasSubscription: false,
        user: null,
        error: 'Not authenticated'
      };
    }

    // Try to get user from stored credentials first
    let user = null;
    try {
      const credentials = await getCredentials();
      user = credentials?.user;
    } catch (error) {
      // If can't get from local storage, fetch from API
    }

    // If no user in local storage or user data is outdated, fetch from API
    if (!user || !user.hasOwnProperty('isPremium')) {
      try {
        const apiUrl = getApiUrl(config);
        const profile = await getProfile(apiUrl, token);
        user = profile;
      } catch (error) {
        return {
          hasSubscription: false,
          user: null,
          error: `Failed to verify subscription status: ${error.message}`
        };
      }
    }

    return {
      hasSubscription: !!user?.isPremium,
      user,
      error: null
    };
  } catch (error) {
    return {
      hasSubscription: false,
      user: null,
      error: error.message
    };
  }
}

/**
 * Verify subscription and throw error if not premium
 * @param {object} config - App configuration
 * @param {string} feature - Feature name for error message
 * @returns {Promise<object>} User object if premium
 */
export async function requirePremiumSubscription(config, feature = 'Cloud sync') {
  const result = await checkSubscriptionStatus(config);

  if (result.error) {
    throw new Error(result.error);
  }

  if (!result.hasSubscription) {
    throw new Error(
      `${feature} requires a premium subscription. Upgrade at https://splitmark.app/dashboard to access cloud features.`
    );
  }

  return result.user;
}

/**
 * Get user-friendly subscription status message
 * @param {object} config - App configuration
 * @returns {Promise<string>}
 */
export async function getSubscriptionMessage(config) {
  const result = await checkSubscriptionStatus(config);

  if (result.error) {
    return `❌ ${result.error}`;
  }

  if (result.hasSubscription) {
    return `✅ Premium subscription active`;
  } else {
    return `⚠️  Premium subscription required for cloud features`;
  }
}

export default {
  checkSubscriptionStatus,
  requirePremiumSubscription,
  getSubscriptionMessage
};