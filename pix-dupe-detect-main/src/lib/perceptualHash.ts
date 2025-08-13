// Perceptual hash utility that works in both browser and Node environments

function simpleAverageHashFromBuffer(buffer: ArrayBuffer): string {
  // Simple deterministic hash for testing and basic functionality
  const view = new Uint8Array(buffer);
  let hash = '';
  
  // Create 8x8 grid of average values (64-bit hash)
  const chunkSize = Math.max(1, Math.floor(view.length / 64));
  
  for (let i = 0; i < 64; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, view.length);
    let sum = 0;
    let count = 0;
    
    for (let j = start; j < end; j++) {
      sum += view[j];
      count++;
    }
    
    const avg = count > 0 ? sum / count : 0;
    hash += avg > 128 ? '1' : '0';
  }
  
  return hash;
}

/**
 * Generates a perceptual hash from various input types
 * Works in both browser and Node environments with appropriate fallbacks
 */
export async function perceptualHash(input: Blob | ArrayBuffer | Buffer): Promise<string> {
  // Node.js Buffer path (for server-side processing)
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) {
    return simpleAverageHashFromBuffer(input.buffer);
  }
  
  // ArrayBuffer path (direct binary data)
  if (input instanceof ArrayBuffer) {
    return simpleAverageHashFromBuffer(input);
  }
  
  // Blob path (browser File API)
  if (input instanceof Blob) {
    const arrayBuffer = await input.arrayBuffer();
    return simpleAverageHashFromBuffer(arrayBuffer);
  }
  
  throw new Error('Unsupported input type for perceptual hash');
}

/**
 * Calculates Hamming distance between two hash strings
 * Used to determine similarity between perceptual hashes
 */
export function calculateHashSimilarity(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    return 0;
  }
  
  let differences = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) {
      differences++;
    }
  }
  
  // Return similarity as percentage (lower Hamming distance = higher similarity)
  const similarity = ((hash1.length - differences) / hash1.length) * 100;
  return Math.round(similarity);
}