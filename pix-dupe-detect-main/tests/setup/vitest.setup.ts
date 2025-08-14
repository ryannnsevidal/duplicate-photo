import '@testing-library/jest-dom';

// Force a stable TZ for snapshots/timestamps if any
process.env.TZ = 'America/Los_Angeles';

// --- JSDOM polyfills/mocks for unit tests ---

// Basic Image mock
(global as any).Image = class {
  onload: null | (() => void) = null;
  onerror: null | ((e: any) => void) = null;
  set src(_v: string) {
    // Trigger load immediately in tests
    if (typeof this.onload === 'function') this.onload();
  }
} as any;

// createImageBitmap is not in JSDOM by default
(global as any).createImageBitmap = async (_blob: any) => {
  return {} as ImageBitmap; // we don't need real bitmap for logic tests
};

// Ensure Blob has arrayBuffer in older Node/JSDOM combos
if (typeof Blob !== 'undefined' && !(Blob.prototype as any).arrayBuffer) {
  (Blob.prototype as any).arrayBuffer = async function () {
    const parts: any[] = (this as any).parts || [];
    let total = 0;
    for (const p of parts) {
      if (p instanceof ArrayBuffer) total += p.byteLength;
      else if (ArrayBuffer.isView(p)) total += p.byteLength;
      else if (typeof p === 'string') total += p.length;
    }
    const buffer = new ArrayBuffer(total || 8);
    return buffer;
  };
}

// Basic Blob mock for tests if missing
if (typeof global.Blob === 'undefined') {
  (global as any).Blob = class MockBlob {
    constructor(public parts: any[], public options?: any) {}
    async arrayBuffer() {
      return new ArrayBuffer(8);
    }
    get size() { return 8; }
    get type() { return 'image/jpeg'; }
  } as any;
}
