import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  Cloud, 
  FileIcon, 
  CheckCircle, 
  AlertTriangle, 
  Loader2,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { CloudIntegration } from '@/components/CloudIntegration';
import { UploadConfirmation, AnalysisResults, UploadProgress } from '@/components/UploadConfirmation';

interface UploadStats {
  totalFiles: number;
  totalSize: number;
  successCount: number;
  failureCount: number;
  duplicateCount: number;
}

interface AdminCloudUploadProps {
  onUploadComplete?: (stats: UploadStats) => void;
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  progress: number;
  source: 'local' | 'google-drive' | 'dropbox';
  error?: string;
}

interface CloudFile {
  id: string;
  name: string;
  size: number;
  downloadUrl: string;
  source: 'google-drive' | 'dropbox';
}

interface LocalFile {
  name: string;
  size: number;
  source: 'local';
  file: File;
}

type PendingFile = LocalFile | CloudFile;

export function AdminCloudUpload({ onUploadComplete }: AdminCloudUploadProps) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [uploadStats, setUploadStats] = useState<UploadStats>({
    totalFiles: 0,
    totalSize: 0,
    successCount: 0,
    failureCount: 0,
    duplicateCount: 0
  });
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Handle cloud file selection - show confirmation first
  const handleCloudFileSelected = useCallback(async (cloudFile: CloudFile) => {
    console.log('🎯 Admin cloud file selected:', cloudFile);
    
    setPendingFiles([cloudFile]);
    setShowConfirmation(true);
  }, []);

  // Handle local file selection - show confirmation first  
  const handleFileSelect = useCallback((acceptedFiles: File[]) => {
    const fileData: LocalFile[] = acceptedFiles.map(file => ({
      name: file.name,
      size: file.size,
      source: 'local',
      file
    }));

    setPendingFiles(fileData);
    setShowConfirmation(true);
  }, []);

  // Confirm and start upload process
  const confirmUpload = async () => {
    setShowConfirmation(false);
    setShowProgress(true);

    for (const fileData of pendingFiles) {
      if ('file' in fileData) {
        await uploadLocalFile(fileData);
      } else {
        const uploadFile: UploadedFile = {
          id: `${fileData.source}-${Date.now()}`,
          name: fileData.name,
          size: fileData.size,
          status: 'pending',
          progress: 0,
          source: fileData.source
        };
        setFiles(prev => [...prev, uploadFile]);
        await uploadCloudFile(uploadFile, fileData);
      }
    }

    setShowProgress(false);
    setShowResults(true);
  };

  // Upload local file
  const uploadLocalFile = async (fileData: LocalFile) => {
    try {
      const uploadFile: UploadedFile = {
        id: `local-${Date.now()}`,
        name: fileData.name,
        size: fileData.size,
        status: 'uploading',
        progress: 25,
        source: 'local'
      };

      setFiles(prev => [...prev, uploadFile]);

      // Upload to Supabase storage
      const fileExt = fileData.name.split('.').pop();
      const filePath = `admin-uploads/${user!.id}/${uploadFile.id}.${fileExt}`;

      const { error: storageError } = await supabase.storage
        .from('uploads')
        .upload(filePath, fileData.file, {
          cacheControl: '3600',
          upsert: false,
          metadata: {
            originalName: fileData.name,
            uploadedBy: user!.id,
            uploadedAt: new Date().toISOString(),
            source: 'local',
            adminUpload: true
          }
        });

      if (storageError) throw storageError;

      // Log to database
      await supabase.from('file_upload_logs').insert({
        user_id: user!.id,
        original_filename: fileData.name,
        file_size_bytes: fileData.size,
        file_type: 'image',
        cloud_provider: 'other',
        cloud_path: filePath,
        rclone_remote: 'supabase-storage',
        sha256_hash: `admin_local_${uploadFile.id}`,
        upload_status: 'uploaded'
      });

      // Complete upload
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploaded', progress: 100 }
          : f
      ));

      // Update stats
      setUploadStats(prev => ({
        ...prev,
        totalFiles: prev.totalFiles + 1,
        totalSize: prev.totalSize + fileData.size,
        successCount: prev.successCount + 1
      }));

    } catch (error: unknown) {
      console.error('❌ Local upload failed:', error);
      setUploadStats(prev => ({
        ...prev,
        totalFiles: prev.totalFiles + 1,
        failureCount: prev.failureCount + 1
      }));
    }
  };

  // Upload cloud file  
  const uploadCloudFile = async (uploadFile: UploadedFile, cloudFile: CloudFile) => {
    setUploading(true);
    
    try {
      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 25 } : f
      ));

      console.log('🔄 Downloading from cloud:', cloudFile.downloadUrl);

      // Download file from cloud provider
      const response = await fetch(cloudFile.downloadUrl);
      if (!response.ok) throw new Error(`Failed to download from ${cloudFile.source}`);
      
      const blob = await response.blob();
      const file = new File([blob], cloudFile.name, { type: blob.type });
      
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, progress: 50 } : f
      ));

      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const filePath = `admin-uploads/${user!.id}/${uploadFile.id}.${fileExt}`;

      const { error: storageError } = await supabase.storage
        .from('uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          metadata: {
            originalName: file.name,
            uploadedBy: user!.id,
            uploadedAt: new Date().toISOString(),
            source: cloudFile.source,
            adminUpload: true
          }
        });

      if (storageError) throw storageError;

      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, progress: 75 } : f
      ));

      // Log to database
      const { error: dbError } = await supabase
        .from('file_upload_logs')
        .insert({
          user_id: user!.id,
          original_filename: file.name,
          file_size_bytes: file.size,
          file_type: 'image',
          cloud_provider: cloudFile.source === 'google-drive' ? 'gdrive' : 'dropbox',
          cloud_path: filePath,
          rclone_remote: 'supabase-storage',
          sha256_hash: `admin_${uploadFile.id}`,
          upload_status: 'uploaded'
        });

      if (dbError) console.warn('Database logging failed:', dbError);

      // Complete upload
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploaded', progress: 100 }
          : f
      ));

      // Update stats
      setUploadStats(prev => ({
        ...prev,
        totalFiles: prev.totalFiles + 1,
        totalSize: prev.totalSize + file.size,
        successCount: prev.successCount + 1
      }));

      toast({
        title: "Upload Complete",
        description: `${cloudFile.name} uploaded successfully from ${cloudFile.source}!`,
      });

    } catch (error: unknown) {
      console.error('❌ Cloud upload failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : "Failed to upload file from cloud storage.";

      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'error', error: errorMessage, progress: 100 }
          : f
      ));

      setUploadStats(prev => ({
        ...prev,
        totalFiles: prev.totalFiles + 1,
        failureCount: prev.failureCount + 1
      }));
      
      toast({
        title: "Upload Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      
      // Call completion callback
      if (onUploadComplete) {
        onUploadComplete(uploadStats);
      }
    }
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Dropzone config
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileSelect,
    multiple: true,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.csv']
    },
    maxSize: 100 * 1024 * 1024 // 100MB
  });

  return (
    <div className="space-y-6">
      {/* Upload Stats */}
      {uploadStats.totalFiles > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Upload Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{uploadStats.totalFiles}</div>
                <div className="text-sm text-muted-foreground">Total Files</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatFileSize(uploadStats.totalSize)}</div>
                <div className="text-sm text-muted-foreground">Total Size</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{uploadStats.successCount}</div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{uploadStats.failureCount}</div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cloud Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-5 w-5" />
            Cloud Storage Upload
          </CardTitle>
          <CardDescription>
            Upload files from Google Drive, Dropbox, or your computer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CloudIntegration 
            onFileSelected={handleCloudFileSelected}
            disabled={uploading}
          />
        </CardContent>
      </Card>

      {/* Local File Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Local File Upload
          </CardTitle>
          <CardDescription>
            Upload files directly from your computer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
            `}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-lg">Drop files here...</p>
            ) : (
              <div>
                <p className="text-lg mb-2">Drag & drop files here, or click to select</p>
                <p className="text-sm text-muted-foreground">
                  Supports: Images, PDFs, Documents (max 100MB each)
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* File Status List */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Status</CardTitle>
            <CardDescription>
              Track your file uploads and view results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {files.map((file) => (
                <div key={file.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <FileIcon className="h-5 w-5" />
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(file.size)} • {file.source}
                        </p>
                      </div>
                    </div>
                    
                    <Badge variant={
                      file.status === 'uploaded' ? 'default' :
                      file.status === 'error' ? 'destructive' :
                      file.status === 'uploading' ? 'secondary' : 'outline'
                    }>
                      {file.status === 'uploaded' && <CheckCircle className="h-3 w-3 mr-1" />}
                      {file.status === 'error' && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {file.status === 'uploading' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                      {file.status}
                    </Badge>
                  </div>
                  
                  {file.status === 'uploading' && (
                    <Progress value={file.progress} className="mt-2" />
                  )}
                  
                  {file.error && (
                    <Alert className="mt-2">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        {file.error}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upload Confirmation Modal */}
      {showConfirmation && (
        <UploadConfirmation
          files={pendingFiles}
          onConfirm={confirmUpload}
          onCancel={() => {
            setShowConfirmation(false);
            setPendingFiles([]);
          }}
        />
      )}

      {/* Upload Progress Modal */}
      {showProgress && (
        <UploadProgress
          message="Uploading and analyzing files..."
          progress={75}
        />
      )}

      {/* Analysis Results Modal */}
      {showResults && (
        <AnalysisResults
          stats={uploadStats}
          onContinue={() => {
            setShowResults(false);
            if (onUploadComplete) {
              onUploadComplete(uploadStats);
            }
          }}
        />
      )}
    </div>
  );
}