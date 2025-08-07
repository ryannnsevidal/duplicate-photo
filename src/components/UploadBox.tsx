import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface UploadBoxProps {
  onFileUpload: (files: File[]) => Promise<void>;
  maxFiles?: number;
  maxSize?: number;
  acceptedTypes?: string[];
  disabled?: boolean;
  className?: string;
}

interface UploadedFile {
  file: File;
  preview: string;
  id: string;
}

export const UploadBox: React.FC<UploadBoxProps> = ({
  onFileUpload,
  maxFiles = 10,
  maxSize = 10 * 1024 * 1024, // 10MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  disabled = false,
  className,
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  const onDrop = useCallback(
    async (acceptedFiles: File[], rejectedFiles: any[]) => {
      // Handle rejected files
      if (rejectedFiles.length > 0) {
        rejectedFiles.forEach(({ file, errors }) => {
          errors.forEach((error: any) => {
            if (error.code === 'file-too-large') {
              toast.error(`File ${file.name} is too large. Max size is ${maxSize / 1024 / 1024}MB`);
            } else if (error.code === 'file-invalid-type') {
              toast.error(`File ${file.name} type not supported`);
            } else {
              toast.error(`Error with file ${file.name}: ${error.message}`);
            }
          });
        });
      }

      if (acceptedFiles.length === 0) return;

      // Check total file limit
      if (uploadedFiles.length + acceptedFiles.length > maxFiles) {
        toast.error(`Maximum ${maxFiles} files allowed`);
        return;
      }

      setIsLoading(true);
      setUploadProgress(0);

      try {
        // Create file objects with previews
        const newFiles: UploadedFile[] = acceptedFiles.map((file) => ({
          file,
          preview: URL.createObjectURL(file),
          id: Math.random().toString(36).substr(2, 9),
        }));

        setUploadedFiles(prev => [...prev, ...newFiles]);

        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => {
            if (prev >= 90) {
              clearInterval(progressInterval);
              return 90;
            }
            return prev + 10;
          });
        }, 100);

        // Upload files
        await onFileUpload(acceptedFiles);
        
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        toast.success(`Successfully uploaded ${acceptedFiles.length} file(s)`);
        
        // Reset progress after success
        setTimeout(() => {
          setUploadProgress(0);
        }, 1000);

      } catch (error) {
        console.error('Upload error:', error);
        toast.error('Failed to upload files. Please try again.');
        
        // Remove failed uploads
        setUploadedFiles(prev => 
          prev.filter(f => !acceptedFiles.includes(f.file))
        );
      } finally {
        setIsLoading(false);
      }
    },
    [uploadedFiles.length, maxFiles, maxSize, onFileUpload]
  );

  const removeFile = useCallback((fileId: string) => {
    setUploadedFiles(prev => {
      const fileToRemove = prev.find(f => f.id === fileId);
      if (fileToRemove) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return prev.filter(f => f.id !== fileId);
    });
  }, []);

  const clearAllFiles = useCallback(() => {
    uploadedFiles.forEach(f => URL.revokeObjectURL(f.preview));
    setUploadedFiles([]);
  }, [uploadedFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxSize,
    maxFiles,
    disabled: disabled || isLoading,
  });

  return (
    <div className={cn("w-full space-y-4", className)}>
      {/* Upload Area */}
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50",
          disabled || isLoading ? "cursor-not-allowed opacity-50" : "",
          uploadedFiles.length > 0 ? "border-green-300 bg-green-50" : ""
        )}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center justify-center space-y-4">
          {isLoading ? (
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          ) : (
            <Upload className="h-12 w-12 text-muted-foreground" />
          )}
          
          <div className="space-y-2">
            <p className="text-lg font-medium">
              {isDragActive
                ? "Drop files here..."
                : isLoading
                ? "Uploading files..."
                : uploadedFiles.length > 0
                ? "Drop more files or click to browse"
                : "Drop files here or click to browse"
              }
            </p>
            
            <p className="text-sm text-muted-foreground">
              Supports: {acceptedTypes.map(type => type.split('/')[1].toUpperCase()).join(', ')}
              <br />
              Max size: {maxSize / 1024 / 1024}MB per file
              <br />
              Max files: {maxFiles}
            </p>
          </div>
        </div>

        {/* Upload Progress */}
        {isLoading && uploadProgress > 0 && (
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
      </div>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">
              Uploaded Files ({uploadedFiles.length}/{maxFiles})
            </h3>
            <button
              onClick={clearAllFiles}
              className="text-sm text-red-600 hover:text-red-800 disabled:opacity-50"
              disabled={isLoading}
            >
              Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {uploadedFiles.map((uploadedFile) => (
              <div
                key={uploadedFile.id}
                className="relative border rounded-lg p-3 bg-card"
              >
                <div className="flex items-start space-x-3">
                  {uploadedFile.file.type.startsWith('image/') ? (
                    <img
                      src={uploadedFile.preview}
                      alt={uploadedFile.file.name}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <File className="w-12 h-12 text-muted-foreground" />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {uploadedFile.file.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>

                  <button
                    onClick={() => removeFile(uploadedFile.id)}
                    className="text-red-500 hover:text-red-700 disabled:opacity-50"
                    disabled={isLoading}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {uploadedFiles.length === 0 && !isLoading && (
        <div className="text-center py-4">
          <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            No files uploaded yet
          </p>
        </div>
      )}
    </div>
  );
};

export default UploadBox;
