import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock environment variables
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock Canvas and Image for image processing tests
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn().mockImplementation(() => ({
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    getImageData: vi.fn(() => ({
      data: new Uint8ClampedArray(64 * 64 * 4).fill(128), // Gray pixels for consistent hashing
      width: 64,
      height: 64,
    })),
    putImageData: vi.fn(),
    createImageData: vi.fn(),
    setTransform: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    fillText: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    closePath: vi.fn(),
    stroke: vi.fn(),
    translate: vi.fn(),
    scale: vi.fn(),
    rotate: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    transform: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
  })),
});

// Mock URL.createObjectURL and URL.revokeObjectURL
Object.defineProperty(URL, 'createObjectURL', {
  value: vi.fn(() => 'mocked-object-url'),
});

Object.defineProperty(URL, 'revokeObjectURL', {
  value: vi.fn(),
});

// Mock document.createElement for canvas
const originalCreateElement = document.createElement.bind(document);
document.createElement = vi.fn().mockImplementation((tagName: string) => {
  if (tagName === 'canvas') {
    return {
      width: 32,
      height: 32,
      getContext: vi.fn(() => ({
        drawImage: vi.fn(),
        getImageData: vi.fn(() => ({
          data: new Uint8ClampedArray(32 * 32 * 4).fill(128), // Gray pixels
          width: 32,
          height: 32,
        })),
      })),
    };
  }
  return originalCreateElement(tagName);
});

// Mock File and FileReader
global.FileReader = class MockFileReader {
  readAsDataURL = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  result = 'data:image/png;base64,test';
  static readonly EMPTY = 0;
  static readonly LOADING = 1;
  static readonly DONE = 2;
} as any;

// Mock Image constructor for image loading tests
global.Image = class MockImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 64;
  height = 64;
  naturalWidth = 64;
  naturalHeight = 64;
  private _src = '';

  set src(value: string) {
    this._src = value;
    // Simulate async image loading
    setTimeout(() => {
      // Only trigger onload for valid image formats or mock URLs
      if (value.includes('data:image/') || value.includes('blob:') || value.includes('mocked-object-url')) {
        this.onload?.();
      } else {
        // Trigger onerror for non-image files 
        this.onerror?.();
      }
    }, 0);
  }

  get src() {
    return this._src;
  }

  addEventListener(event: string, handler: () => void) {
    if (event === 'load') {
      this.onload = handler;
    } else if (event === 'error') {
      this.onerror = handler;
    }
  }
} as any;
