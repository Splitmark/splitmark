/**
 * Onboarding detection utilities
 * Determines if user should see the cloud setup onboarding flow
 */

import { hasStoredCredentials } from '../storage/credentials.js';
import { checkSubscriptionStatus } from '../subscription/subscriptionCheck.js';
import { getAllFileStates } from '../storage/syncState.js';
import { getCloudConfig } from '../../utils/cloudConfig.js';

/**
 * Check if user should see onboarding flow
 * @param {object} config - App configuration
 * @returns {Promise<{shouldShowOnboarding: boolean, reason: string, step: string}>}
 */
export async function shouldShowOnboarding(config) {
  try {
    // Check if user has explicitly dismissed onboarding
    const cloudConfig = getCloudConfig(config);
    if (cloudConfig.onboardingCompleted) {
      return {
        shouldShowOnboarding: false,
        reason: 'User has completed onboarding',
        step: null
      };
    }

    // Check authentication status
    const isLoggedIn = await hasStoredCredentials();
    if (!isLoggedIn) {
      return {
        shouldShowOnboarding: true,
        reason: 'User not authenticated',
        step: 'login'
      };
    }

    // Check subscription status
    const subscription = await checkSubscriptionStatus(config);
    if (!subscription.hasSubscription) {
      return {
        shouldShowOnboarding: true,
        reason: 'User lacks premium subscription',
        step: 'subscription'
      };
    }

    // Check if cloud sync is enabled
    if (!cloudConfig.enabled) {
      return {
        shouldShowOnboarding: true,
        reason: 'Cloud sync not enabled',
        step: 'sync-setup'
      };
    }

    // Check if user has synced any files
    const fileStates = getAllFileStates();
    const hasSyncedFiles = Object.keys(fileStates).length > 0;
    if (!hasSyncedFiles) {
      return {
        shouldShowOnboarding: true,
        reason: 'No files have been synced yet',
        step: 'initial-sync'
      };
    }

    // User is fully set up
    return {
      shouldShowOnboarding: false,
      reason: 'User fully configured for cloud sync',
      step: null
    };
  } catch (error) {
    console.warn('Error checking onboarding status:', error.message);
    return {
      shouldShowOnboarding: true,
      reason: `Error checking setup: ${error.message}`,
      step: 'welcome'
    };
  }
}

/**
 * Mark onboarding as completed
 * @param {object} config - App configuration to update
 * @returns {object} Updated configuration
 */
export function markOnboardingCompleted(config) {
  const cloudConfig = getCloudConfig(config);
  const updatedCloudConfig = {
    ...cloudConfig,
    onboardingCompleted: true,
    completedAt: new Date().toISOString()
  };

  return {
    ...config,
    cloud: updatedCloudConfig
  };
}

/**
 * Reset onboarding state (for testing or re-onboarding)
 * @param {object} config - App configuration to update
 * @returns {object} Updated configuration
 */
export function resetOnboardingState(config) {
  const cloudConfig = getCloudConfig(config);
  const { onboardingCompleted, completedAt, ...cleanConfig } = cloudConfig;

  return {
    ...config,
    cloud: cleanConfig
  };
}

/**
 * Get onboarding progress summary
 * @param {object} config - App configuration
 * @returns {Promise<object>} Progress information
 */
export async function getOnboardingProgress(config) {
  try {
    const isLoggedIn = await hasStoredCredentials();
    const subscription = await checkSubscriptionStatus(config);
    const cloudConfig = getCloudConfig(config);
    const fileStates = getAllFileStates();
    const hasSyncedFiles = Object.keys(fileStates).length > 0;

    return {
      authenticated: isLoggedIn,
      hasPremiumSubscription: subscription.hasSubscription,
      cloudSyncEnabled: cloudConfig.enabled,
      syncOnSaveEnabled: cloudConfig.autoSync,
      hasSyncedFiles,
      onboardingCompleted: cloudConfig.onboardingCompleted,
      completedAt: cloudConfig.completedAt,
      user: subscription.user,
      totalSyncedFiles: Object.keys(fileStates).length
    };
  } catch (error) {
    console.warn('Error getting onboarding progress:', error.message);
    return {
      authenticated: false,
      hasPremiumSubscription: false,
      cloudSyncEnabled: false,
      syncOnSaveEnabled: false,
      hasSyncedFiles: false,
      onboardingCompleted: false,
      completedAt: null,
      user: null,
      totalSyncedFiles: 0,
      error: error.message
    };
  }
}

export default {
  shouldShowOnboarding,
  markOnboardingCompleted,
  resetOnboardingState,
  getOnboardingProgress
};