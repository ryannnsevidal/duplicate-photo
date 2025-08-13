import '@testing-library/jest-dom';

// Minimal mocks for image/canvas APIs used by perceptualHash in CI
class MockImage {
  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;
  src = '';
  width = 64;
  height = 64;
  
  constructor() {
    // no-op
  }
  
  // Simulate async load when src is set
  setSrc(v: string) {
    this.src = v;
    setTimeout(() => this.onload && this.onload(), 0);
  }
}

Object.defineProperty(global, 'Image', {
  writable: true,
  value: MockImage,
});

// createImageBitmap mock returns a simple object
Object.defineProperty(global, 'createImageBitmap', {
  writable: true,
  value: async (_blob: Blob | ImageBitmapSource) => ({ width: 64, height: 64 }),
});

// Canvas mocks
function mockCanvas() {
  return {
    width: 64,
    height: 64,
    getContext: (_: string) => ({
      drawImage: () => {},
      getImageData: () => ({ data: new Uint8ClampedArray(64 * 64 * 4) }),
      putImageData: () => {},
    }),
    toDataURL: () => 'data:image/png;base64,xxx',
  };
}

Object.defineProperty(global, 'HTMLCanvasElement', {
  writable: true,
  value: class MockHTMLCanvasElement {
    width = 64;
    height = 64;
    getContext(_: string) {
      return {
        drawImage: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(64 * 64 * 4) }),
        putImageData: () => {},
      };
    }
    toDataURL() {
      return 'data:image/png;base64,xxx';
    }
  },
});

// Mock document.createElement for canvas
const originalCreateElement = document.createElement;
document.createElement = function(tagName: string) {
  if (tagName === 'canvas') {
    return mockCanvas() as any;
  }
  return originalCreateElement.call(this, tagName);
};

// Mock OffscreenCanvas if needed
Object.defineProperty(global, 'OffscreenCanvas', {
  writable: true,
  value: class MockOffscreenCanvas {
    width = 64;
    height = 64;
    getContext(_: string) {
      return {
        drawImage: () => {},
        getImageData: () => ({ data: new Uint8ClampedArray(64 * 64 * 4) }),
        putImageData: () => {},
      };
    }
    convertToBlob() {
      return Promise.resolve(new Blob());
    }
  },
});