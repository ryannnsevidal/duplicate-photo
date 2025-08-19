import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, AlertCircle, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  progress: number;
  error?: string;
}

interface EnhancedUploadProps {
  onUploadComplete?: (files: UploadedFile[]) => void;
  onAnalysisReady?: (files: UploadedFile[]) => void;
}

export function EnhancedUpload({ onUploadComplete, onAnalysisReady }: EnhancedUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Enhanced error handling
  const handleUploadError = (error: any) => {
    let message = "Upload failed";
    let title = "Upload Error";
    
    if (error.message?.includes('bucket not found')) {
      title = "Storage Error";
      message = "Storage not configured. Please contact support.";
    } else if (error.message?.includes('rate limit')) {
      title = "Rate Limit";
      message = "Too many uploads. Please wait a moment.";
    } else if (error.message?.includes('file size')) {
      title = "File Too Large";
      message = "File too large. Maximum size is 50MB.";
    } else if (error.message?.includes('file type')) {
      title = "Invalid File Type";
      message = "Invalid file type. Please upload images or PDFs.";
    } else if (error.message?.includes('authentication')) {
      title = "Authentication Error";
      message = "Please sign in again to upload files.";
    }
    
    toast({
      title,
      description: message,
      variant: "destructive",
    });
  };

  // File count validation
  const validateFileCount = (files: File[]) => {
    if (files.length === 1) {
      toast({
        title: "More photos needed",
        description: "Please upload at least 2 photos to detect duplicates",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  // File validation
  const validateFile = (file: File) => {
    const validTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
      'application/pdf',
      'text/plain', 'text/csv'
    ];

    if (!validTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: `${file.name} is not a supported file type`,
        variant: "destructive",
      });
      return false;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `${file.name} exceeds 50MB limit`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (!validateFileCount(acceptedFiles)) {
      return;
    }

    const validFiles = acceptedFiles.filter(validateFile);
    
    if (validFiles.length === 0) {
      return;
    }

    const newFiles: UploadedFile[] = validFiles.map(file => ({
      id: crypto.randomUUID(),
      file,
      status: 'pending',
      progress: 0
    }));

    setFiles(prev => [...prev, ...newFiles]);
  }, [toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp', '.bmp', '.svg'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv']
    },
    maxSize: 50 * 1024 * 1024, // 50MB
    multiple: true
  });

  const uploadFiles = async () => {
    if (files.length === 0) return;
    
    if (files.length === 1) {
      toast({
        title: "More photos needed",
        description: "Please upload at least 2 photos to detect duplicates",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload files",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      const uploadPromises = files.map(async (fileData) => {
        const { file } = fileData;
        
        // Update status to uploading
        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { ...f, status: 'uploading', progress: 0 } : f
        ));

        try {
          // Create preview for images
          let preview: string | undefined;
          if (file.type.startsWith('image/')) {
            preview = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onload = (e) => resolve(e.target?.result as string);
              reader.readAsDataURL(file);
            });
          }

          // Upload to Supabase Storage
          const fileExt = file.name.split('.').pop();
          const filePath = `${user.id}/${fileData.id}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('uploads')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false,
              metadata: {
                originalName: file.name,
                uploadedBy: user.id,
                uploadedAt: new Date().toISOString()
              }
            });

          if (uploadError) throw uploadError;

          // Log to database
          const { error: logError } = await supabase
            .from('file_upload_logs')
            .insert({
              user_id: user.id,
              original_filename: file.name,
              file_type: file.type,
              file_size_bytes: file.size,
              cloud_path: filePath,
              upload_status: 'uploaded'
            });

          if (logError) {
            console.error('Failed to log upload:', logError);
          }

          // Update user statistics
          await supabase.rpc('update_user_statistics', {
            _user_id: user.id,
            _files_uploaded: 1,
            _files_deleted: 0,
            _space_saved: 0
          });

          // Update file status
          setFiles(prev => prev.map(f => 
            f.id === fileData.id ? { 
              ...f, 
              status: 'uploaded', 
              progress: 100,
              preview 
            } : f
          ));

        } catch (error) {
          console.error('Upload error:', error);
          handleUploadError(error);
          
          setFiles(prev => prev.map(f => 
            f.id === fileData.id ? { 
              ...f, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Upload failed'
            } : f
          ));
        }
      });

      await Promise.all(uploadPromises);

      const uploadedFiles = files.filter(f => f.status === 'uploaded');
      
      if (uploadedFiles.length > 0) {
        toast({
          title: "Upload Complete",
          description: `${uploadedFiles.length} file(s) uploaded successfully!`,
        });

        onUploadComplete?.(uploadedFiles);
        
        // Check if we have enough files for analysis
        if (uploadedFiles.length >= 2) {
          onAnalysisReady?.(uploadedFiles);
        }
      }

    } catch (error) {
      console.error('Upload failed:', error);
      handleUploadError(error);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearAll = () => {
    setFiles([]);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Upload Files
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 hover:border-gray-400'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          {isDragActive ? (
            <p className="text-blue-600">Drop the files here...</p>
          ) : (
            <div>
              <p className="text-lg font-medium">Drag & drop files here</p>
              <p className="text-sm text-gray-500">or click to select files</p>
              <p className="text-xs text-gray-400 mt-2">
                Supports: Images, PDFs, Text files (max 50MB each)
              </p>
            </div>
          )}
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Selected Files ({files.length})</h3>
              <Button variant="outline" size="sm" onClick={clearAll}>
                Clear All
              </Button>
            </div>
            
            {files.length === 1 && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <p className="text-sm text-yellow-800">
                    Please upload at least 2 photos to detect duplicates
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {files.map((fileData) => (
                <div
                  key={fileData.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  {fileData.preview && (
                    <img
                      src={fileData.preview}
                      alt={fileData.file.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {fileData.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(fileData.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    
                    {fileData.status === 'uploading' && (
                      <Progress value={fileData.progress} className="mt-1" />
                    )}
                    
                    {fileData.status === 'error' && (
                      <p className="text-xs text-red-600 mt-1">
                        {fileData.error}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {fileData.status === 'uploaded' && (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    )}
                    {fileData.status === 'error' && (
                      <AlertCircle className="h-4 w-4 text-red-500" />
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(fileData.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Upload Button */}
        {files.length > 0 && (
          <Button
            onClick={uploadFiles}
            disabled={uploading || files.length < 2}
            className="w-full"
          >
            {uploading ? 'Uploading...' : `Upload ${files.length} Files`}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
