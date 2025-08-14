import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  Cloud, 
  HardDrive, 
  FileIcon, 
  CheckCircle, 
  AlertTriangle, 
  X,
  Loader2,
  Play
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { EnhancedCloudIntegration } from '@/components/EnhancedCloudIntegration';
import { AnalyzeFilesButton } from '@/components/AnalyzeFilesButton';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  status: 'pending' | 'uploading' | 'uploaded' | 'error';
  progress: number;
  source: 'local' | 'google-drive' | 'dropbox';
  file?: File;
  url?: string;
  error?: string;
}

export function SecureFileUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection
  const handleFileSelect = useCallback((acceptedFiles: File[]) => {
    const newFiles: UploadedFile[] = acceptedFiles.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      status: 'pending',
      progress: 0,
      source: 'local',
      file
    }));

    setFiles(prev => [...prev, ...newFiles]);
    
    toast({
      title: "Files Ready",
      description: `${acceptedFiles.length} file(s) selected. Click "Upload Now" to proceed.`,
    });
  }, [toast]);

  // Handle cloud file selection  
  const handleCloudFileSelected = useCallback(async (cloudFile: any) => {
    console.log('🔄 Cloud file selected:', cloudFile);
    
    const uploadFile: UploadedFile = {
      id: `cloud-${Date.now()}`,
      name: cloudFile.name,
      size: cloudFile.size || 0,
      uploadedAt: new Date().toISOString(),
      status: 'pending',
      progress: 0,
      source: cloudFile.source
    };

    setFiles(prev => [...prev, uploadFile]);

    // Auto-upload cloud files immediately
    await uploadCloudFile(uploadFile, cloudFile);
  }, []);

  // Upload cloud file
  const uploadCloudFile = async (uploadFile: UploadedFile, cloudFile: any) => {
    setUploading(true);
    
    try {
      // Update status to uploading
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 25 } : f
      ));

      // Download file from cloud provider
      const response = await fetch(cloudFile.downloadUrl, {
        headers: cloudFile.downloadHeaders || {}
      });
      if (!response.ok) throw new Error(`Failed to download from ${cloudFile.source}`);
      
      const blob = await response.blob();
      const file = new File([blob], cloudFile.name, { type: blob.type });
      
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, progress: 50 } : f
      ));

      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const filePath = `${user!.id}/${uploadFile.id}.${fileExt}`;

      const { error } = await supabase.storage
        .from('uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          metadata: {
            originalName: file.name,
            uploadedBy: user!.id,
            uploadedAt: new Date().toISOString(),
            source: cloudFile.source
          }
        });

      if (error) throw error;

      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id ? { ...f, progress: 75 } : f
      ));

      // Log to database
      await supabase
        .from('file_upload_logs')
        .insert({
          user_id: user!.id,
          original_filename: file.name,
          file_size_bytes: file.size,
          file_type: (/^image\//.test(file.type) ? 'image' : (/^application\/pdf$/.test(file.type) ? 'pdf' : (/^application\//.test(file.type) || /^text\//.test(file.type) ? 'doc' : 'other'))),
          cloud_provider: 'other',
          cloud_path: filePath,
          rclone_remote: 'supabase-storage',
          sha256_hash: `temp_${uploadFile.id}`,
          upload_status: 'uploaded',
          upload_timestamp: new Date().toISOString(),
          metadata: {
            source: cloudFile.source,
            type: file.type,
          }
        });

      // Complete upload
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'uploaded', progress: 100 }
          : f
      ));

      toast({
        title: "Upload Complete",
        description: `${cloudFile.name} uploaded successfully from ${cloudFile.source}!`,
      });

    } catch (error: any) {
      setFiles(prev => prev.map(f => 
        f.id === uploadFile.id 
          ? { ...f, status: 'error', error: error.message, progress: 100 }
          : f
      ));
      
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file from cloud storage.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Upload all pending local files
  const uploadFiles = async () => {
    const pendingFiles = files.filter(f => f.status === 'pending' && f.source === 'local');
    
    if (pendingFiles.length === 0) {
      toast({
        title: "No Files",
        description: "No files are ready for upload.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      for (const uploadFile of pendingFiles) {
        if (!uploadFile.file) continue;

        // Update status to uploading
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { ...f, status: 'uploading', progress: 25 } : f
        ));

        // Upload to Supabase storage
        const fileExt = uploadFile.file.name.split('.').pop();
        const filePath = `${user!.id}/${uploadFile.id}.${fileExt}`;

        const { error } = await supabase.storage
          .from('uploads')
          .upload(filePath, uploadFile.file, {
            cacheControl: '3600',
            upsert: false,
            metadata: {
              originalName: uploadFile.file.name,
              uploadedBy: user!.id,
              uploadedAt: new Date().toISOString(),
              source: 'local'
            }
          });

        if (error) throw error;

        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id ? { ...f, progress: 75 } : f
        ));

        // Log to database
        await supabase
          .from('file_upload_logs')
          .insert({
            user_id: user!.id,
            original_filename: uploadFile.file.name,
            file_size_bytes: uploadFile.file.size,
            file_type: 'image',
            cloud_provider: 'other',
            cloud_path: filePath,
            rclone_remote: 'supabase-storage',
            sha256_hash: `temp_${uploadFile.id}`
          });

        // Complete upload
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'uploaded', progress: 100 }
            : f
        ));
      }

      toast({
        title: "Upload Complete",
        description: `${pendingFiles.length} file(s) uploaded successfully!`,
      });

    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload files.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  // Remove file from list
  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Dropzone config
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleFileSelect,
    multiple: true,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/pdf': ['.pdf'],
      'text/*': ['.txt', '.csv'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    noClick: false,
    noKeyboard: false
  });

  // Manual click handler for file input
  const handleManualClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const pendingLocalFiles = files.filter(f => f.status === 'pending' && f.source === 'local');

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Secure File Upload
          </CardTitle>
          <CardDescription>
            Choose your upload source. Files are encrypted and stored securely.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Local File Upload */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <HardDrive className="h-5 w-5" />
              Upload from Computer
            </h3>
            
            <div
              {...getRootProps()}
              onClick={handleManualClick}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
              `}
            >
              <input {...getInputProps()} ref={fileInputRef} data-testid="local-file-input" />
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

            {/* Upload Button */}
            {pendingLocalFiles.length > 0 && (
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileIcon className="h-5 w-5" />
                  <span>{pendingLocalFiles.length} file(s) ready to upload</span>
                </div>
                <Button 
                  onClick={uploadFiles}
                  disabled={uploading}
                  className="min-w-[120px]"
                  data-testid="upload-submit"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Upload Now
                </Button>
              </div>
            )}
          </div>

          {/* Cloud Integration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Cloud className="h-5 w-5" />
              Upload from Cloud Storage
            </h3>
            
            <EnhancedCloudIntegration 
              onFileSelected={handleCloudFileSelected}
              disabled={uploading}
            />
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {files.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Upload Status</CardTitle>
            <CardDescription>
              Track your file uploads and view results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <AnimatePresence>
                {files.map((file) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="border rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <FileIcon className="h-5 w-5" />
                        <div>
                          <p className="font-medium">{file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(file.size / 1024 / 1024).toFixed(2)} MB • {file.source}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
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
                        
                        {file.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeFile(file.id)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
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
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            
            {/* Analysis Section */}
            {files.filter(f => f.status === 'uploaded').length > 0 && (
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">File Analysis</h4>
                    <p className="text-sm text-muted-foreground">
                      Analyze uploaded files for duplicates and optimization opportunities
                    </p>
                  </div>
                  <AnalyzeFilesButton 
                    fileCount={files.filter(f => f.status === 'uploaded').length}
                    disabled={uploading}
                    onAnalysisComplete={(results) => {
                      console.log('Analysis complete:', results);
                      toast({
                        title: "Analysis Complete",
                        description: `Found ${results.duplicateFiles} duplicates out of ${results.totalFiles} files`,
                      });
                    }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}