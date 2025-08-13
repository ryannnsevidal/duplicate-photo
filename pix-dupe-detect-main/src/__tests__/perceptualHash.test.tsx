import { describe, test, expect, beforeAll } from 'vitest';
import { perceptualHash, calculateHashSimilarity } from '../lib/perceptualHash';

describe('perceptualHash @smoke', () => {
  beforeAll(() => {
    // Ensure our mocks are in place for CI
    expect(global.Image).toBeDefined();
    expect(global.createImageBitmap).toBeDefined();
  });

  test('generates consistent hash for same input', async () => {
    const testData = new ArrayBuffer(1024);
    const view = new Uint8Array(testData);
    
    // Fill with deterministic pattern
    for (let i = 0; i < view.length; i++) {
      view[i] = i % 256;
    }
    
    const hash1 = await perceptualHash(testData);
    const hash2 = await perceptualHash(testData);
    
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
    expect(hash1).toMatch(/^[01]+$/);
  });

  test('generates different hashes for different inputs', async () => {
    const testData1 = new ArrayBuffer(1024);
    const testData2 = new ArrayBuffer(1024);
    
    const view1 = new Uint8Array(testData1);
    const view2 = new Uint8Array(testData2);
    
    // Fill with different patterns
    for (let i = 0; i < view1.length; i++) {
      view1[i] = i % 256;
      view2[i] = (i * 2) % 256;
    }
    
    const hash1 = await perceptualHash(testData1);
    const hash2 = await perceptualHash(testData2);
    
    expect(hash1).not.toBe(hash2);
  });

  test('works with Blob input in browser environment', async () => {
    const testData = new Uint8Array(512);
    for (let i = 0; i < testData.length; i++) {
      testData[i] = i % 256;
    }
    
    const blob = new Blob([testData]);
    const hash = await perceptualHash(blob);
    
    expect(hash).toHaveLength(64);
    expect(hash).toMatch(/^[01]+$/);
  });

  test('calculates hash similarity correctly', () => {
    const hash1 = '1010101010101010101010101010101010101010101010101010101010101010';
    const hash2 = '1010101010101010101010101010101010101010101010101010101010101010';
    const hash3 = '0101010101010101010101010101010101010101010101010101010101010101';
    
    // Identical hashes should have 100% similarity
    expect(calculateHashSimilarity(hash1, hash2)).toBe(100);
    
    // Completely different hashes should have 0% similarity
    expect(calculateHashSimilarity(hash1, hash3)).toBe(0);
    
    // Partially similar hashes
    const hash4 = '1010101010101010101010101010101010101010101010101010101010101001';
    const similarity = calculateHashSimilarity(hash1, hash4);
    expect(similarity).toBeGreaterThan(95);
    expect(similarity).toBeLessThan(100);
  });
});