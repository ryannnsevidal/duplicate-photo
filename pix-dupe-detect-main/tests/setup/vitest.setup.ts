import '@testing-library/jest-dom';

// Force a stable TZ for snapshots/timestamps if any
process.env.TZ = 'America/Los_Angeles';

// --- JSDOM polyfills/mocks for unit tests ---

// Basic Image mock
(globalThis as unknown as { Image: unknown }).Image = class {
  onload: null | (() => void) = null;
  onerror: null | ((e: unknown) => void) = null;
  set src(_v: string) {
    // Trigger load immediately in tests
    if (typeof this.onload === 'function') this.onload();
  }
} as unknown as typeof Image;

// createImageBitmap is not in JSDOM by default
(globalThis as unknown as { createImageBitmap: (blob: unknown) => Promise<ImageBitmap> }).createImageBitmap = async (_blob: unknown) => {
  return {} as ImageBitmap; // we don't need real bitmap for logic tests
};

// Ensure Blob has arrayBuffer in older Node/JSDOM combos
if (typeof Blob !== 'undefined' && !(Blob.prototype as unknown as { arrayBuffer?: () => Promise<ArrayBuffer> }).arrayBuffer) {
  (Blob.prototype as unknown as { arrayBuffer?: () => Promise<ArrayBuffer>; parts?: unknown[] }).arrayBuffer = async function () {
    const parts = (this as unknown as { parts?: unknown[] }).parts || [];
    let total = 0;
    for (const p of parts) {
      if (p instanceof ArrayBuffer) total += p.byteLength;
      else if (ArrayBuffer.isView(p as ArrayBufferView)) total += (p as ArrayBufferView).byteLength;
      else if (typeof p === 'string') total += p.length;
    }
    const buffer = new ArrayBuffer(total || 8);
    return buffer;
  };
}

// Basic Blob mock for tests if missing
if (typeof (globalThis as unknown as { Blob?: unknown }).Blob === 'undefined') {
  (globalThis as unknown as { Blob: unknown }).Blob = class MockBlob {
    constructor(public parts: unknown[], public options?: Record<string, unknown>) {}
    async arrayBuffer() {
      return new ArrayBuffer(8);
    }
    get size() { return 8; }
    get type() { return 'image/jpeg'; }
  } as unknown as typeof Blob;
}
