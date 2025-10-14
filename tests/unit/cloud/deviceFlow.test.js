/**
 * Tests for device flow authentication
 */

import {
  initiateDeviceFlow,
  pollDeviceToken,
  completeDeviceFlow,
  loginWithDeviceFlow,
} from '../../../src/cloud/api/auth.js';

// Mock the API client
jest.mock('../../../src/cloud/api/client.js', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      post: jest.fn(),
    })),
  };
});

// Mock credential storage
jest.mock('../../../src/cloud/storage/credentials.js', () => ({
  saveToken: jest.fn(),
}));

describe('Device Flow Authentication', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initiateDeviceFlow', () => {
    it('should initiate device flow and return codes', async () => {
      const SplitmarkAPIClient = require('../../../src/cloud/api/client.js').default;
      const mockPost = jest.fn().mockResolvedValue({
        deviceCode: 'device_123',
        userCode: 'ABCD-1234',
        verificationUrl: 'https://splitmark.app/cli-auth',
        expiresIn: 600,
        interval: 5,
      });

      SplitmarkAPIClient.mockImplementation(() => ({
        post: mockPost,
      }));

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
        '/cli/device-code',
        {},
        { skipAuth: true, rateLimitType: 'auth' }
      );
    });

    it('should handle verificationUrlComplete', async () => {
      const SplitmarkAPIClient = require('../../../src/cloud/api/client.js').default;
      const mockPost = jest.fn().mockResolvedValue({
        deviceCode: 'device_123',
        userCode: 'ABCD-1234',
        verificationUrl: 'https://splitmark.app/cli-auth',
        verificationUrlComplete: 'https://splitmark.app/cli-auth?code=ABCD-1234',
        expiresIn: 600,
        interval: 5,
      });

      SplitmarkAPIClient.mockImplementation(() => ({
        post: mockPost,
      }));

      const result = await initiateDeviceFlow('https://api.splitmark.app');

      expect(result.verificationUrlComplete).toBe('https://splitmark.app/cli-auth?code=ABCD-1234');
    });

    it('should handle API errors', async () => {
      const SplitmarkAPIClient = require('../../../src/cloud/api/client.js').default;
      const mockPost = jest.fn().mockRejectedValue(new Error('Network error'));

      SplitmarkAPIClient.mockImplementation(() => ({
        post: mockPost,
      }));

      await expect(initiateDeviceFlow('https://api.splitmark.app')).rejects.toThrow(
        'Failed to initiate device flow'
      );
    });
  });

  describe('pollDeviceToken', () => {
    it('should return pending when authorization is pending', async () => {
      const SplitmarkAPIClient = require('../../../src/cloud/api/client.js').default;
      const mockPost = jest.fn().mockResolvedValue({
        error: 'authorization_pending',
      });

      SplitmarkAPIClient.mockImplementation(() => ({
        post: mockPost,
      }));

      const result = await pollDeviceToken('https://api.splitmark.app', 'device_123');

      expect(result).toEqual({ pending: true });
    });

    it('should return token and user on success', async () => {
      const SplitmarkAPIClient = require('../../../src/cloud/api/client.js').default;
      const { saveToken } = require('../../../src/cloud/storage/credentials.js');

      const mockPost = jest.fn().mockResolvedValue({
        token: 'jwt_token_123',
        user: {
          id: 'user_123',
          email: 'test@example.com',
          username: 'testuser',
        },
      });

      SplitmarkAPIClient.mockImplementation(() => ({
        post: mockPost,
      }));

      const result = await pollDeviceToken('https://api.splitmark.app', 'device_123');

      expect(result).toEqual({
        token: 'jwt_token_123',
        user: {
          id: 'user_123',
          email: 'test@example.com',
          username: 'testuser',
        },
      });

      expect(saveToken).toHaveBeenCalledWith('jwt_token_123', expect.any(Object));
    });

    it('should throw error on expired token', async () => {
      const SplitmarkAPIClient = require('../../../src/cloud/api/client.js').default;
      const mockPost = jest.fn().mockResolvedValue({
        error: 'expired_token',
      });

      SplitmarkAPIClient.mockImplementation(() => ({
        post: mockPost,
      }));

      await expect(
        pollDeviceToken('https://api.splitmark.app', 'device_123')
      ).rejects.toThrow('Device code expired');
    });

    it('should throw error on access denied', async () => {
      const SplitmarkAPIClient = require('../../../src/cloud/api/client.js').default;
      const mockPost = jest.fn().mockResolvedValue({
        error: 'access_denied',
      });

      SplitmarkAPIClient.mockImplementation(() => ({
        post: mockPost,
      }));

      await expect(
        pollDeviceToken('https://api.splitmark.app', 'device_123')
      ).rejects.toThrow('Authorization was denied');
    });
  });

  describe('completeDeviceFlow', () => {
    it('should poll until success', async () => {
      const SplitmarkAPIClient = require('../../../src/cloud/api/client.js').default;
      let callCount = 0;

      const mockPost = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.resolve({ error: 'authorization_pending' });
        }
        return Promise.resolve({
          token: 'jwt_token_123',
          user: { username: 'testuser' },
        });
      });

      SplitmarkAPIClient.mockImplementation(() => ({
        post: mockPost,
      }));

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
      const SplitmarkAPIClient = require('../../../src/cloud/api/client.js').default;
      const mockPost = jest.fn().mockResolvedValue({
        error: 'authorization_pending',
      });

      SplitmarkAPIClient.mockImplementation(() => ({
        post: mockPost,
      }));

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
      const SplitmarkAPIClient = require('../../../src/cloud/api/client.js').default;
      const mockPost = jest.fn().mockResolvedValue({
        token: 'jwt_token_123',
        user: { username: 'testuser' },
      });

      SplitmarkAPIClient.mockImplementation(() => ({
        post: mockPost,
      }));

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
      const SplitmarkAPIClient = require('../../../src/cloud/api/client.js').default;
      let requestCount = 0;

      const mockPost = jest.fn().mockImplementation((endpoint) => {
        if (endpoint === '/cli/device-code') {
          return Promise.resolve({
            deviceCode: 'device_123',
            userCode: 'ABCD-1234',
            verificationUrl: 'https://splitmark.app/cli-auth',
            expiresIn: 600,
            interval: 0.1,
          });
        } else if (endpoint === '/cli/token') {
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

      SplitmarkAPIClient.mockImplementation(() => ({
        post: mockPost,
      }));

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
