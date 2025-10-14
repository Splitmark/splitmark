/**
 * Tests for device flow authentication
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';

// Mock the API client constructor function
const mockPost = jest.fn();
const MockSplitmarkAPIClient = jest.fn().mockImplementation(() => ({
  post: mockPost,
}));

// Mock the credentials module
const mockSaveToken = jest.fn();
const mockClearToken = jest.fn();

// Use unstable_mockModule to properly mock ES modules
jest.unstable_mockModule('../../../src/cloud/api/client.js', () => ({
  default: MockSplitmarkAPIClient,
}));

jest.unstable_mockModule('../../../src/cloud/storage/credentials.js', () => ({
  saveToken: mockSaveToken,
  clearToken: mockClearToken,
}));

// Import the functions to test after mocking
const {
  initiateDeviceFlow,
  pollDeviceToken,
  completeDeviceFlow,
  loginWithDeviceFlow,
} = await import('../../../src/cloud/api/auth.js');

describe('Device Flow Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initiateDeviceFlow', () => {
    it('should initiate device flow and return codes', async () => {
      mockPost.mockResolvedValue({
        device_code: 'device_123',
        user_code: 'ABCD-1234',
        verification_uri: 'https://splitmark.app/cli-auth',
        expires_in: 600,
        interval: 5,
      });

      const result = await initiateDeviceFlow('https://api.splitmark.app');

      expect(result).toEqual({
        deviceCode: 'device_123',
        userCode: 'ABCD-1234',
        verificationUrl: 'https://splitmark.app/cli-auth',
        verificationUrlComplete: null,
        expiresIn: 600,
        interval: 5,
      });

      expect(mockPost).toHaveBeenCalledWith(
        '/auth/cli/device-code',
        {},
        { skipAuth: true, rateLimitType: 'auth' }
      );
    });

    it('should handle verificationUrlComplete', async () => {
      mockPost.mockResolvedValue({
        device_code: 'device_123',
        user_code: 'ABCD-1234',
        verification_uri: 'https://splitmark.app/cli-auth',
        verification_uri_complete: 'https://splitmark.app/cli-auth?code=ABCD-1234',
        expires_in: 600,
        interval: 5,
      });

      const result = await initiateDeviceFlow('https://api.splitmark.app');

      expect(result.verificationUrlComplete).toBe('https://splitmark.app/cli-auth?code=ABCD-1234');
    });

    it('should handle API errors', async () => {
      mockPost.mockRejectedValue(new Error('Network error'));

      await expect(initiateDeviceFlow('https://api.splitmark.app')).rejects.toThrow(
        'Failed to initiate device flow'
      );
    });
  });

  describe('pollDeviceToken', () => {
    it('should return pending when authorization is pending', async () => {
      mockPost.mockResolvedValue({
        error: 'authorization_pending',
      });

      const result = await pollDeviceToken('https://api.splitmark.app', 'device_123');

      expect(result).toEqual({ pending: true });
    });

    it('should return token and user on success', async () => {
      mockPost.mockResolvedValue({
        token: 'jwt_token_123',
        user: {
          id: 'user_123',
          email: 'test@example.com',
          username: 'testuser',
        },
      });

      const result = await pollDeviceToken('https://api.splitmark.app', 'device_123');

      expect(result).toEqual({
        token: 'jwt_token_123',
        user: {
          id: 'user_123',
          email: 'test@example.com',
          username: 'testuser',
        },
      });

      expect(mockSaveToken).toHaveBeenCalledWith('jwt_token_123', expect.any(Object));
    });

    it('should throw error on expired token', async () => {
      mockPost.mockResolvedValue({
        error: 'expired_token',
      });


      await expect(
        pollDeviceToken('https://api.splitmark.app', 'device_123')
      ).rejects.toThrow('Device code expired');
    });

    it('should throw error on access denied', async () => {
      mockPost.mockResolvedValue({
        error: 'access_denied',
      });


      await expect(
        pollDeviceToken('https://api.splitmark.app', 'device_123')
      ).rejects.toThrow('Authorization was denied');
    });
  });

  describe('completeDeviceFlow', () => {
    it('should poll until success', async () => {
      const { default: SplitmarkAPIClient } = await import('../../../src/cloud/api/client.js');
      let callCount = 0;

      mockPost.mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({ error: 'authorization_pending' });
        }
        return Promise.resolve({
          token: 'jwt_token_123',
          user: { username: 'testuser' },
        });
      });


      const progressUpdates = [];
      const onProgress = (progress) => progressUpdates.push(progress);

      const result = await completeDeviceFlow(
        'https://api.splitmark.app',
        'device_123',
        0.1, // Very short interval for testing
        10,
        onProgress
      );

      expect(result.token).toBe('jwt_token_123');
      expect(result.user.username).toBe('testuser');
      expect(progressUpdates.some((p) => p.status === 'waiting')).toBe(true);
      expect(progressUpdates.some((p) => p.status === 'success')).toBe(true);
    });

    it('should timeout after expiration', async () => {
      mockPost.mockResolvedValue({
        error: 'authorization_pending',
      });


      await expect(
        completeDeviceFlow(
          'https://api.splitmark.app',
          'device_123',
          0.1,
          0.5 // Very short timeout for testing
        )
      ).rejects.toThrow('Device flow timed out');
    }, 10000);

    it('should call onProgress with correct status', async () => {
      mockPost.mockResolvedValue({
        token: 'jwt_token_123',
        user: { username: 'testuser' },
      });


      const progressUpdates = [];
      const onProgress = (progress) => progressUpdates.push(progress);

      await completeDeviceFlow(
        'https://api.splitmark.app',
        'device_123',
        0.1,
        10,
        onProgress
      );

      expect(progressUpdates).toContainEqual(
        expect.objectContaining({
          status: 'success',
          user: { username: 'testuser' },
        })
      );
    });
  });

  describe('loginWithDeviceFlow', () => {
    it('should complete full device flow', async () => {
      let requestCount = 0;

      mockPost.mockImplementation((endpoint) => {
        if (endpoint === '/auth/cli/device-code') {
          return Promise.resolve({
            device_code: 'device_123',
            user_code: 'ABCD-1234',
            verification_uri: 'https://splitmark.app/cli-auth',
            expires_in: 600,
            interval: 0.1,
          });
        } else if (endpoint === '/auth/cli/token') {
          requestCount++;
          if (requestCount < 2) {
            return Promise.resolve({ error: 'authorization_pending' });
          }
          return Promise.resolve({
            token: 'jwt_token_123',
            user: { username: 'testuser' },
          });
        }
      });


      const progressUpdates = [];
      const onProgress = (progress) => progressUpdates.push(progress);

      const result = await loginWithDeviceFlow('https://api.splitmark.app', onProgress);

      expect(result.token).toBe('jwt_token_123');
      expect(progressUpdates).toContainEqual(
        expect.objectContaining({
          status: 'initiated',
          userCode: 'ABCD-1234',
        })
      );
      expect(progressUpdates).toContainEqual(
        expect.objectContaining({
          status: 'success',
        })
      );
    });
  });
});
