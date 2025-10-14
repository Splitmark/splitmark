/**
 * Tests for encryption utilities
 */

import {
  generateEncryptionKey,
  encryptContent,
  decryptContent,
  generateContentHash,
  verifyContentHash,
  encodeForTransmission,
  decodeFromTransmission,
  encryptForUpload,
  decryptFromDownload,
} from '../../../../src/cloud/encryption/crypto.js';

describe('Crypto utilities', () => {
  describe('generateEncryptionKey', () => {
    it('should generate a base64-encoded key', () => {
      const key = generateEncryptionKey();
      expect(key).toBeTruthy();
      expect(typeof key).toBe('string');
      expect(key.length).toBeGreaterThan(0);
    });

    it('should generate unique keys', () => {
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();
      expect(key1).not.toBe(key2);
    });
  });

  describe('encryptContent and decryptContent', () => {
    it('should encrypt and decrypt content correctly', () => {
      const plaintext = 'Hello, World!';
      const key = generateEncryptionKey();

      const encrypted = encryptContent(plaintext, key);
      expect(encrypted).toHaveProperty('encrypted');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('tag');
      expect(encrypted).toHaveProperty('salt');

      const decrypted = decryptContent(
        encrypted.encrypted,
        key,
        encrypted.iv,
        encrypted.tag
      );
      expect(decrypted).toBe(plaintext);
    });

    it('should fail to decrypt with wrong key', () => {
      const plaintext = 'Secret message';
      const key1 = generateEncryptionKey();
      const key2 = generateEncryptionKey();

      const encrypted = encryptContent(plaintext, key1);

      expect(() => {
        decryptContent(encrypted.encrypted, key2, encrypted.iv, encrypted.tag);
      }).toThrow();
    });

    it('should handle large content', () => {
      const plaintext = 'A'.repeat(100000);
      const key = generateEncryptionKey();

      const encrypted = encryptContent(plaintext, key);
      const decrypted = decryptContent(
        encrypted.encrypted,
        key,
        encrypted.iv,
        encrypted.tag
      );

      expect(decrypted).toBe(plaintext);
    });
  });

  describe('generateContentHash', () => {
    it('should generate consistent hash for same content', () => {
      const content = 'Test content';
      const hash1 = generateContentHash(content);
      const hash2 = generateContentHash(content);
      expect(hash1).toBe(hash2);
    });

    it('should generate different hashes for different content', () => {
      const content1 = 'Test content 1';
      const content2 = 'Test content 2';
      const hash1 = generateContentHash(content1);
      const hash2 = generateContentHash(content2);
      expect(hash1).not.toBe(hash2);
    });

    it('should be sensitive to content changes', () => {
      const content1 = 'Hello, World!';
      const content2 = 'Hello, World';
      const hash1 = generateContentHash(content1);
      const hash2 = generateContentHash(content2);
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('verifyContentHash', () => {
    it('should verify matching hash', () => {
      const content = 'Test content';
      const hash = generateContentHash(content);
      expect(verifyContentHash(content, hash)).toBe(true);
    });

    it('should reject mismatched hash', () => {
      const content = 'Test content';
      const wrongHash = generateContentHash('Different content');
      expect(verifyContentHash(content, wrongHash)).toBe(false);
    });
  });

  describe('encodeForTransmission and decodeFromTransmission', () => {
    it('should encode and decode encrypted data', () => {
      const plaintext = 'Test message';
      const key = generateEncryptionKey();
      const encrypted = encryptContent(plaintext, key);

      const encoded = encodeForTransmission(encrypted);
      expect(typeof encoded).toBe('string');

      const decoded = decodeFromTransmission(encoded);
      expect(decoded).toEqual({
        encrypted: encrypted.encrypted,
        iv: encrypted.iv,
        tag: encrypted.tag,
        salt: encrypted.salt,
      });
    });

    it('should fail on invalid encoded data', () => {
      expect(() => {
        decodeFromTransmission('invalid-base64');
      }).toThrow();
    });
  });

  describe('encryptForUpload and decryptFromDownload', () => {
    it('should perform full encryption workflow', () => {
      const plaintext = 'Markdown content to upload';
      const key = generateEncryptionKey();

      const uploadData = encryptForUpload(plaintext, key);
      expect(uploadData).toHaveProperty('content');
      expect(uploadData).toHaveProperty('contentHash');

      const decrypted = decryptFromDownload(
        uploadData.content,
        key,
        uploadData.contentHash
      );
      expect(decrypted).toBe(plaintext);
    });

    it('should throw error on hash mismatch', () => {
      const plaintext = 'Test content';
      const key = generateEncryptionKey();

      const uploadData = encryptForUpload(plaintext, key);
      const wrongHash = generateContentHash('Different content');

      expect(() => {
        decryptFromDownload(uploadData.content, key, wrongHash);
      }).toThrow(/hash verification failed/i);
    });
  });
});
