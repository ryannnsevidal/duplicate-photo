/**
 * Perceptual Hash Utilities for Duplicate Image Detection
 * 
 * This module provides utilities for generating perceptual hashes of images
 * using various algorithms to detect duplicate and similar images.
 */

// Note: In a real browser environment, we'll use Web APIs
// For server-side processing, we can use image-hash or sharp

export interface ImageHash {
  phash: string;
  dhash: string;
  avgHash: string;
  colorHash: string;
  metadata: {
    width: number;
    height: number;
    fileSize: number;
    format: string;
    timestamp: number;
  };
}

export interface DuplicateMatch {
  similarity: number;
  algorithm: 'phash' | 'dhash' | 'avgHash' | 'colorHash';
  file1: string;
  file2: string;
  threshold: number;
}

/**
 * Calculate Hamming distance between two hash strings
 */
export function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    throw new Error('Hash strings must be of equal length');
  }

  let distance = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      distance++;
    }
  }
  return distance;
}

/**
 * Calculate similarity percentage between two hashes
 */
export function calculateSimilarity(hash1: string, hash2: string): number {
  const distance = hammingDistance(hash1, hash2);
  const maxDistance = hash1.length;
  return ((maxDistance - distance) / maxDistance) * 100;
}

/**
 * Generate perceptual hash for image using Canvas API (browser-side)
 */
export async function generateImageHashBrowser(file: File): Promise<ImageHash> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    img.onload = () => {
      const size = 32; // Standard size for perceptual hashing
      canvas.width = size;
      canvas.height = size;

      // Draw and resize image
      ctx.drawImage(img, 0, 0, size, size);

      // Get image data
      const imageData = ctx.getImageData(0, 0, size, size);
      const pixels = imageData.data;

      // Calculate different hash types
      const phash = generatePerceptualHash(pixels, size);
      const dhash = generateDifferenceHash(pixels, size);
      const avgHash = generateAverageHash(pixels, size);
      const colorHash = generateColorHash(pixels, size);

      resolve({
        phash,
        dhash,
        avgHash,
        colorHash,
        metadata: {
          width: img.naturalWidth,
          height: img.naturalHeight,
          fileSize: file.size,
          format: file.type,
          timestamp: Date.now()
        }
      });
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Generate perceptual hash (pHash) - robust against minor modifications
 */
function generatePerceptualHash(pixels: Uint8ClampedArray, size: number): string {
  const grayPixels: number[] = [];

  // Convert to grayscale
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = Math.floor(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
    grayPixels.push(gray);
  }

  // Apply DCT (simplified version)
  const dctResult = simpleDCT(grayPixels, size);

  // Get average of top-left 8x8 (excluding DC component)
  let sum = 0;
  for (let i = 1; i < 64; i++) {
    sum += dctResult[i];
  }
  const average = sum / 63;

  // Generate binary hash
  let hash = '';
  for (let i = 1; i < 64; i++) {
    hash += dctResult[i] > average ? '1' : '0';
  }

  return hash;
}

/**
 * Generate difference hash (dHash) - good for detecting crops and minor edits
 */
function generateDifferenceHash(pixels: Uint8ClampedArray, size: number): string {
  const grayPixels: number[] = [];

  // Convert to grayscale
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = Math.floor(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
    grayPixels.push(gray);
  }

  let hash = '';
  // Compare adjacent pixels horizontally
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size - 1; col++) {
      const current = grayPixels[row * size + col];
      const next = grayPixels[row * size + col + 1];
      hash += current > next ? '1' : '0';
    }
  }

  return hash;
}

/**
 * Generate average hash (aHash) - fast but less robust
 */
function generateAverageHash(pixels: Uint8ClampedArray, size: number): string {
  const grayPixels: number[] = [];
  let sum = 0;

  // Convert to grayscale and calculate sum
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = Math.floor(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
    grayPixels.push(gray);
    sum += gray;
  }

  const average = sum / grayPixels.length;

  // Generate binary hash
  let hash = '';
  for (const pixel of grayPixels) {
    hash += pixel > average ? '1' : '0';
  }

  return hash;
}

/**
 * Generate color hash - detects images with similar color distribution
 */
function generateColorHash(pixels: Uint8ClampedArray, size: number): string {
  const colorBuckets = new Array(64).fill(0); // 4x4x4 RGB buckets

  // Quantize colors into buckets
  for (let i = 0; i < pixels.length; i += 4) {
    const r = Math.floor(pixels[i] / 64);
    const g = Math.floor(pixels[i + 1] / 64);
    const b = Math.floor(pixels[i + 2] / 64);
    const bucket = r * 16 + g * 4 + b;
    colorBuckets[bucket]++;
  }

  // Find median bucket count
  const sortedBuckets = [...colorBuckets].sort((a, b) => a - b);
  const median = sortedBuckets[Math.floor(sortedBuckets.length / 2)];

  // Generate binary hash
  let hash = '';
  for (const count of colorBuckets) {
    hash += count > median ? '1' : '0';
  }

  return hash;
}

/**
 * Simplified DCT implementation for perceptual hashing
 */
function simpleDCT(pixels: number[], size: number): number[] {
  const result = new Array(size * size).fill(0);

  for (let u = 0; u < size; u++) {
    for (let v = 0; v < size; v++) {
      let sum = 0;
      for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
          sum += pixels[x * size + y] *
            Math.cos(((2 * x + 1) * u * Math.PI) / (2 * size)) *
            Math.cos(((2 * y + 1) * v * Math.PI) / (2 * size));
        }
      }

      const cu = u === 0 ? 1 / Math.sqrt(2) : 1;
      const cv = v === 0 ? 1 / Math.sqrt(2) : 1;
      result[u * size + v] = 0.25 * cu * cv * sum;
    }
  }

  return result;
}

/**
 * Find duplicate images based on hash similarity
 */
export function findDuplicates(
  hashes: Array<{ id: string; hash: ImageHash }>,
  threshold: number = 95
): DuplicateMatch[] {
  const duplicates: DuplicateMatch[] = [];

  const algorithms: Array<keyof Omit<ImageHash, 'metadata'>> = ['phash', 'dhash', 'avgHash', 'colorHash'];

  for (let i = 0; i < hashes.length; i++) {
    for (let j = i + 1; j < hashes.length; j++) {
      const hash1 = hashes[i];
      const hash2 = hashes[j];

      for (const algorithm of algorithms) {
        const similarity = calculateSimilarity(hash1.hash[algorithm], hash2.hash[algorithm]);

        if (similarity >= threshold) {
          duplicates.push({
            similarity,
            algorithm,
            file1: hash1.id,
            file2: hash2.id,
            threshold
          });
        }
      }
    }
  }

  return duplicates;
}

/**
 * Get the best hash algorithm for specific use cases
 */
export function getBestHashForUseCase(useCase: 'exact' | 'similar' | 'crops' | 'colors'): keyof Omit<ImageHash, 'metadata'> {
  switch (useCase) {
    case 'exact':
      return 'avgHash'; // Fast for exact or near-exact matches
    case 'similar':
      return 'phash'; // Robust against modifications
    case 'crops':
      return 'dhash'; // Good for detecting crops and rotations
    case 'colors':
      return 'colorHash'; // Focuses on color distribution
    default:
      return 'phash';
  }
}

/**
 * Validate image file before processing
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const maxSize = 50 * 1024 * 1024; // 50MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];

  if (file.size > maxSize) {
    return { valid: false, error: 'File size exceeds 50MB limit' };
  }

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Unsupported file type. Please use JPEG, PNG, GIF, WebP, or BMP.' };
  }

  return { valid: true };
}

/**
 * Batch process multiple files for hash generation
 */
export async function batchGenerateHashes(files: File[]): Promise<Array<{ file: File; hash: ImageHash | null; error?: string }>> {
  const results = await Promise.allSettled(
    files.map(async (file) => {
      const validation = validateImageFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      const hash = await generateImageHashBrowser(file);
      return { file, hash, error: undefined };
    })
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return {
        file: files[index],
        hash: null,
        error: result.reason.message
      };
    }
  });
}
