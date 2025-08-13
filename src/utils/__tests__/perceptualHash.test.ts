import { calculateSimilarity, findDuplicates, generateImageHashBrowser, hammingDistance, validateImageFile } from '@/utils/perceptualHash';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock canvas context for testing
const mockCanvas = {
  width: 100,
  height: 100,
  getContext: vi.fn(() => ({
    drawImage: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(100 * 100 * 4).fill(128), // Gray image
      width: 100,
      height: 100,
    })),
  })),
};

// Mock document.createElement
beforeEach(() => {
  vi.spyOn(document, 'createElement').mockImplementation((tagName) => {
    if (tagName === 'canvas') {
      return mockCanvas as any;
    }
    return {} as any;
  });
});

describe('Perceptual Hash Utility', () => {
  describe('generateImageHashBrowser', () => {
    it('should generate hash for valid image file', async () => {
      // Create a mock file with proper size
      const mockFile = new File(['fake-image-data'], 'test.jpg', { type: 'image/jpeg' });
      Object.defineProperty(mockFile, 'size', { value: 1000 });

      const result = await generateImageHashBrowser(mockFile);

      expect(result).toBeDefined();
      expect(result.phash).toBeDefined();
      expect(result.dhash).toBeDefined();
      expect(result.avgHash).toBeDefined();
      expect(result.colorHash).toBeDefined();
      expect(result.metadata).toBeDefined();
      expect(result.metadata.fileSize).toBe(1000);
      expect(result.metadata.format).toBe('image/jpeg');
    });

    it('should handle image load error gracefully', async () => {
      const mockFile = new File(['fake-data'], 'test.txt', { type: 'text/plain' });

      // Mock URL.createObjectURL to return a non-image URL that will trigger onerror
      const originalCreateObjectURL = URL.createObjectURL;
      URL.createObjectURL = vi.fn(() => 'invalid-url');

      try {
        await expect(generateImageHashBrowser(mockFile)).rejects.toThrow('Failed to load image');
      } finally {
        // Restore original implementation
        URL.createObjectURL = originalCreateObjectURL;
      }
    });
  });

  describe('hammingDistance', () => {
    it('should calculate correct hamming distance', () => {
      const hash1 = 'abc123';
      const hash2 = 'abc456';

      const distance = hammingDistance(hash1, hash2);
      expect(distance).toBe(3); // Last 3 characters are different
    });

    it('should return 0 for identical hashes', () => {
      const hash1 = 'abc123';
      const hash2 = 'abc123';

      const distance = hammingDistance(hash1, hash2);
      expect(distance).toBe(0);
    });

    it('should throw error for different length hashes', () => {
      const hash1 = 'abc';
      const hash2 = 'abcdef';

      expect(() => hammingDistance(hash1, hash2)).toThrow('Hash strings must be of equal length');
    });
  });

  describe('calculateSimilarity', () => {
    it('should return similarity percentage', () => {
      const hash1 = 'abc123';
      const hash2 = 'abc123';

      const similarity = calculateSimilarity(hash1, hash2);
      expect(similarity).toBe(100); // Identical hashes should return 100%
    });

    it('should return lower similarity for different hashes', () => {
      const hash1 = 'abc123';
      const hash2 = 'xyz789';

      const similarity = calculateSimilarity(hash1, hash2);
      expect(similarity).toBeLessThan(100);
      expect(similarity).toBeGreaterThanOrEqual(0);
    });
  });

  describe('validateImageFile', () => {
    it('should validate image files', () => {
      const imageFile = new File(['data'], 'test.jpg', { type: 'image/jpeg' });
      const result = validateImageFile(imageFile);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject non-image files', () => {
      const textFile = new File(['data'], 'test.txt', { type: 'text/plain' });
      const result = validateImageFile(textFile);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should reject files that are too large', () => {
      // Create a large file (>50MB)
      const largeFile = new File(['x'.repeat(51 * 1024 * 1024)], 'large.jpg', { type: 'image/jpeg' });
      const result = validateImageFile(largeFile);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('50MB limit');
    });
  });

  describe('findDuplicates', () => {
    it('should find duplicate images', () => {
      const mockHashedImages = [
        {
          id: 'image1',
          hash: {
            phash: 'abc123def456',
            dhash: 'def456ghi789',
            avgHash: 'ghi789jkl012',
            colorHash: 'jkl012mno345',
            metadata: { width: 100, height: 100, fileSize: 1000, format: 'jpeg', timestamp: Date.now() }
          }
        },
        {
          id: 'image2',
          hash: {
            phash: 'abc123def456', // Same as image1
            dhash: 'def456ghi789',
            avgHash: 'ghi789jkl012',
            colorHash: 'jkl012mno345',
            metadata: { width: 100, height: 100, fileSize: 1000, format: 'jpeg', timestamp: Date.now() }
          }
        },
        {
          id: 'image3',
          hash: {
            phash: 'xyz999uvw888',
            dhash: 'uvw888rst777',
            avgHash: 'rst777opq666',
            colorHash: 'opq666nml555',
            metadata: { width: 100, height: 100, fileSize: 1000, format: 'jpeg', timestamp: Date.now() }
          }
        },
      ];

      const duplicates = findDuplicates(mockHashedImages, 95);

      expect(duplicates.length).toBeGreaterThan(0);
      expect(duplicates[0].file1).toBe('image1');
      expect(duplicates[0].file2).toBe('image2');
      expect(duplicates[0].similarity).toBe(100);
    });

    it('should not find duplicates when similarity is below threshold', () => {
      const mockHashedImages = [
        {
          id: 'image1',
          hash: {
            phash: 'abc123def456',
            dhash: 'def456ghi789',
            avgHash: 'ghi789jkl012',
            colorHash: 'jkl012mno345',
            metadata: { width: 100, height: 100, fileSize: 1000, format: 'jpeg', timestamp: Date.now() }
          }
        },
        {
          id: 'image2',
          hash: {
            phash: 'xyz999uvw888',
            dhash: 'uvw888rst777',
            avgHash: 'rst777opq666',
            colorHash: 'opq666nml555',
            metadata: { width: 100, height: 100, fileSize: 1000, format: 'jpeg', timestamp: Date.now() }
          }
        },
      ];

      const duplicates = findDuplicates(mockHashedImages, 95);
      expect(duplicates).toHaveLength(0);
    });
  });
});
