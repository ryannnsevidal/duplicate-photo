import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Create all mocks before importing
const mockUseAuth = {
  user: { id: '123', email: 'test@example.com' },
  loading: false,
  isAdmin: false,
};

const mockSupabase = {
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({
        data: { path: 'uploads/test.jpg' },
        error: null,
      }),
      getPublicUrl: vi.fn().mockReturnValue({
        data: { publicUrl: 'https://example.com/test.jpg' },
      }),
    })),
  },
  from: vi.fn(() => ({
    insert: vi.fn().mockResolvedValue({
      data: { id: '123' },
      error: null,
    }),
  })),
};

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
};

// Mock modules
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockUseAuth,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: mockSupabase,
}));

vi.mock('sonner', () => ({
  toast: mockToast,
}));

vi.mock('@/utils/perceptualHash', () => ({
  generateImageHashBrowser: vi.fn().mockResolvedValue({
    phash: 'mockhash1',
    dhash: 'mockhash2',
    avgHash: 'mockhash3',
    colorHash: 'mockhash4',
    metadata: {
      width: 100,
      height: 100,
      fileSize: 1000,
      format: 'jpeg',
      timestamp: Date.now(),
    },
  }),
  validateImageFile: vi.fn().mockReturnValue({ valid: true }),
}));

// Now import component
import { ImageUpload } from '@/components/ImageUpload';

describe('ImageUpload', () => {
  const mockOnResults = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render upload interface', () => {
    render(<ImageUpload onResults={mockOnResults} />);

    expect(screen.getByText('Upload Photos for Duplicate Detection')).toBeInTheDocument();
    expect(screen.getByText('Drop your photos here or click to upload')).toBeInTheDocument();
  });

  it('should accept file uploads', async () => {
    render(<ImageUpload onResults={mockOnResults} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /upload photos/i });

    // Simulate file selection
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockOnResults).toHaveBeenCalled();
    });
  });

  it('should show upload progress', async () => {
    const slowUpload = vi.fn(() => new Promise(resolve => setTimeout(resolve, 100)));
    mockSupabase.storage.from.mockReturnValue({
      upload: slowUpload,
      getPublicUrl: vi.fn(),
    });

    render(<ImageUpload onResults={mockOnResults} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /upload photos/i });

    fireEvent.change(input, { target: { files: [file] } });

    // Should show progress indicator
    await waitFor(() => {
      expect(screen.getByText(/uploading/i)).toBeInTheDocument();
    });
  });

  it('should validate file types', () => {
    render(<ImageUpload onResults={mockOnResults} />);

    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByRole('button', { name: /upload photos/i });

    fireEvent.change(input, { target: { files: [invalidFile] } });

    expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('valid image'));
  });

  it('should handle upload errors', async () => {
    mockSupabase.storage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Upload failed' },
      }),
      getPublicUrl: vi.fn(),
    });

    render(<ImageUpload onResults={mockOnResults} />);

    const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /upload photos/i });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(expect.stringContaining('Upload failed'));
    });
  });

  it('should show duplicate detection results', async () => {
    render(<ImageUpload onResults={mockOnResults} />);

    const file1 = new File(['test1'], 'test1.jpg', { type: 'image/jpeg' });
    const file2 = new File(['test2'], 'test2.jpg', { type: 'image/jpeg' });
    const input = screen.getByRole('button', { name: /upload photos/i });

    fireEvent.change(input, { target: { files: [file1, file2] } });

    await waitFor(() => {
      expect(mockOnResults).toHaveBeenCalled();
    });
  });

  it('should handle multiple file uploads', async () => {
    render(<ImageUpload onResults={mockOnResults} />);

    const files = [
      new File(['test1'], 'test1.jpg', { type: 'image/jpeg' }),
      new File(['test2'], 'test2.jpg', { type: 'image/jpeg' }),
      new File(['test3'], 'test3.jpg', { type: 'image/jpeg' }),
    ];
    const input = screen.getByRole('button', { name: /upload photos/i });

    fireEvent.change(input, { target: { files } });

    await waitFor(() => {
      expect(mockSupabase.storage.from().upload).toHaveBeenCalledTimes(3);
    });
  });
});
