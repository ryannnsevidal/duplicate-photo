import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
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
  Shield,
  Link as LinkIcon
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { motion, AnimatePresence } from 'framer-motion';
import { CaptchaWrapper } from '@/components/CaptchaWrapper';
import { SecureCloudIntegration } from '@/components/SecureCloudIntegration';
import { AnalyzeFilesButton } from '@/components/AnalyzeFilesButton';

// Declare global types for Google APIs and Dropbox
declare global {
  interface Window {
// Remove duplicate global declarations - using the ones from global.d.ts
  }
}

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  status: 'uploading' | 'uploaded' | 'duplicate' | 'error';
  progress: number;
  source: 'local' | 'google-drive' | 'dropbox';
  url?: string;
  duplicates?: any[];
  error?: string;
}

interface UploadSource {
  id: 'local' | 'google-drive' | 'dropbox';
  label: string;
  icon: React.ReactNode;
  description: string;
  enabled: boolean;
  comingSoon?: boolean;
}

export function MultiSourceUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [sessionVerified, setSessionVerified] = useState(false);
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [rateLimitWarning, setRateLimitWarning] = useState<string | null>(null);

  const { user, session } = useAuth();
  const { toast } = useToast();

  // Upload sources configuration
  const uploadSources: UploadSource[] = [
    {
      id: 'local',
      label: 'Local Device',
      icon: <HardDrive className="h-6 w-6" />,
      description: 'Upload files from your computer',
      enabled: true
    },
    {
      id: 'google-drive',
      label: 'Google Drive',
      icon: <Cloud className="h-6 w-6" />,
      description: 'Select files from Google Drive',
      enabled: true
    },
    {
      id: 'dropbox',
      label: 'Dropbox',
      icon: <Cloud className="h-6 w-6" />,
      description: 'Select files from Dropbox',
      enabled: true
    }
  ];

  // Verify session on mount
  useEffect(() => {
    const verifySession = async () => {
      if (!user) {
        setSessionVerified(false);
        return;
      }

      try {
        const { data: sessionData, error } = await supabase.auth.getSession();
        
        if (error || !sessionData.session) {
          toast({
            title: "Session Expired",
            description: "Please sign in again to upload files.",
            variant: "destructive",
          });
          setSessionVerified(false);
          return;
        }

        setSessionVerified(true);
        console.log('✅ Session verified for file uploads');
      } catch (error) {
        console.error('Session verification failed:', error);
        setSessionVerified(false);
      }
    };

    verifySession();
  }, [user, toast]);

  // Check rate limits and security
  const checkUploadSecurity = async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('enhanced-security-manager', {
        body: {
          action: 'check_enhanced_rate_limit',
          action_type: 'file_upload',
          max_attempts: 10,
          window_minutes: 60,
          severity_level: 2
        }
      });

      if (error) throw error;

      if (!data?.allowed) {
        if (data?.captcha_required) {
          setCaptchaRequired(true);
          setRateLimitWarning("Security verification required due to upload volume.");
          return false;
        }
        
        toast({
          title: "Upload Limit Reached",
          description: `Please wait ${data?.retry_after_seconds || 60} seconds before uploading again.`,
          variant: "destructive",
        });
        return false;
      }

      if (data?.attempts_remaining <= 3) {
        setRateLimitWarning(`${data.attempts_remaining} uploads remaining this hour.`);
      }

      return true;
    } catch (error) {
      console.error('Security check failed:', error);
      return true; // Don't block uploads if security check fails
    }
  };

  // Handle file upload to Supabase Storage
  const uploadFileToStorage = async (file: File, fileId: string): Promise<{ success: boolean; path?: string; error?: string }> => {
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user!.id}/${fileId}.${fileExt}`;

      const { error } = await supabase.storage
        .from('uploads')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          metadata: {
            originalName: file.name,
            uploadedBy: user!.id,
            uploadedAt: new Date().toISOString()
          }
        });

      if (error) throw error;

      return { success: true, path: filePath };
    } catch (error: any) {
      console.error('Storage upload failed:', error);
      return { success: false, error: error.message };
    }
  };

  // Log upload to database
  const logUploadToDatabase = async (file: UploadedFile, storagePath: string) => {
    try {
      const { error } = await supabase
        .from('file_upload_logs')
        .insert({
          user_id: user!.id,
          original_filename: file.name,
          file_size_bytes: file.size,
          file_type: 'image', // Simplified for now
          cloud_provider: 'other',
          cloud_path: storagePath,
          rclone_remote: 'supabase-storage',
          sha256_hash: `temp_${file.id}` // Would be calculated in production
        });

      if (error) throw error;
    } catch (error) {
      console.error('Failed to log upload:', error);
    }
  };

  // Handle cloud file selection
  const handleCloudFileSelected = useCallback(async (cloudFile: any) => {
    console.log('🔄 Cloud file selected:', cloudFile);
    
    if (!sessionVerified) {
      toast({
        title: "Session Required",
        description: "Please refresh the page and sign in again.",
        variant: "destructive",
      });
      return;
    }

    // Check security before upload
    const securityPassed = await checkUploadSecurity();
    if (!securityPassed && captchaRequired && !captchaToken) {
      toast({
        title: "Security Verification Required",
        description: "Please complete the CAPTCHA to continue uploading.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    
    const fileId = `${Date.now()}-cloud`;
    const uploadFile: UploadedFile = {
      id: fileId,
      name: cloudFile.name,
      size: cloudFile.size || 0,
      uploadedAt: new Date().toISOString(),
      status: 'uploading',
      progress: 0,
      source: cloudFile.source
    };

    setFiles(prev => [...prev, uploadFile]);

    try {
      // Download file from cloud provider
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, progress: 25 } : f
      ));

      const response = await fetch(cloudFile.downloadUrl);
      if (!response.ok) throw new Error(`Failed to download from ${cloudFile.source}`);
      
      const blob = await response.blob();
      const file = new File([blob], cloudFile.name, { type: blob.type });
      
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, progress: 50 } : f
      ));

      // Upload to storage
      const storageResult = await uploadFileToStorage(file, fileId);
      
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, progress: 75 } : f
      ));

      if (!storageResult.success) {
        setFiles(prev => prev.map(f => 
          f.id === fileId 
            ? { ...f, status: 'error', error: storageResult.error, progress: 100 }
            : f
        ));
        return;
      }

      // Log to database
      await logUploadToDatabase(uploadFile, storageResult.path!);

      // Complete upload
      setFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, status: 'uploaded', progress: 100 }
          : f
      ));

      toast({
        title: "File Uploaded Successfully",
        description: `${cloudFile.name} has been uploaded from ${cloudFile.source}.`,
      });

      // Reset CAPTCHA after successful upload
      setCaptchaRequired(false);
      setCaptchaToken(null);
      setRateLimitWarning(null);

    } catch (error: any) {
      setFiles(prev => prev.map(f => 
        f.id === fileId 
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
  }, [sessionVerified, captchaRequired, captchaToken, checkUploadSecurity, uploadFileToStorage, logUploadToDatabase, toast]);

  // Handle local file uploads
  const handleLocalUpload = useCallback(async (acceptedFiles: File[]) => {
    if (!sessionVerified) {
      toast({
        title: "Session Required",
        description: "Please refresh the page and sign in again.",
        variant: "destructive",
      });
      return;
    }

    // Check security before upload
    const securityPassed = await checkUploadSecurity();
    if (!securityPassed && captchaRequired && !captchaToken) {
      toast({
        title: "Security Verification Required",
        description: "Please complete the CAPTCHA to continue uploading.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    const newFiles: UploadedFile[] = acceptedFiles.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      name: file.name,
      size: file.size,
      uploadedAt: new Date().toISOString(),
      status: 'uploading',
      progress: 0,
      source: 'local'
    }));

    setFiles(prev => [...prev, ...newFiles]);

    try {
      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i];
        const uploadFile = newFiles[i];

        // Update progress
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, progress: 25 }
            : f
        ));

        // Upload to storage
        const storageResult = await uploadFileToStorage(file, uploadFile.id);
        
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, progress: 75 }
            : f
        ));

        if (!storageResult.success) {
          setFiles(prev => prev.map(f => 
            f.id === uploadFile.id 
              ? { ...f, status: 'error', error: storageResult.error, progress: 100 }
              : f
          ));
          continue;
        }

        // Log to database
        await logUploadToDatabase(uploadFile, storageResult.path!);

        // Complete upload
        setFiles(prev => prev.map(f => 
          f.id === uploadFile.id 
            ? { ...f, status: 'uploaded', progress: 100 }
            : f
        ));

        toast({
          title: "File Uploaded Successfully",
          description: `${file.name} has been uploaded securely.`,
        });
      }

      // Reset CAPTCHA after successful upload
      setCaptchaRequired(false);
      setCaptchaToken(null);
      setRateLimitWarning(null);

    } catch (error: any) {
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload files.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }, [user, sessionVerified, captchaRequired, captchaToken, toast]);

  // Load Google Drive API
  const loadGoogleAPI = useCallback(() => {
    return new Promise<void>((resolve, reject) => {
      if (window.gapi) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google API'));
      document.head.appendChild(script);
    });
  }, []);

  // Handle Google Drive upload
  const handleGoogleDriveUpload = useCallback(async () => {
    setUploading(true);
    try {
      // Get credentials from Supabase secrets
      const { data: credentials, error } = await supabase.functions.invoke('enhanced-security-manager', {
        body: {
          action: 'get_google_credentials'
        }
      });

      if (error || !credentials?.client_id || !credentials?.api_key) {
        toast({
          title: "Configuration Error",
          description: "Google Drive credentials not properly configured. Please contact administrator.",
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      await loadGoogleAPI();
      
      // Load auth2 and picker APIs
      await new Promise<void>((resolve) => {
        window.gapi.load('auth2:picker', () => resolve());
      });

      // Initialize auth2
      await window.gapi.auth2.init({
        client_id: credentials.client_id
      });

      const authInstance = window.gapi.auth2.getAuthInstance();
      
      // Sign in with required scopes
      const user = await authInstance.signIn({
        scope: 'https://www.googleapis.com/auth/drive.readonly'
      });

      const authResponse = user.getAuthResponse();
      
      if (authResponse && authResponse.access_token) {
        // Create and show picker
        const picker = new window.google.picker.PickerBuilder()
          .addView(window.google.picker.ViewId.DOCS)
          .addView(window.google.picker.ViewId.DOCS_IMAGES)
          .addView(window.google.picker.ViewId.DOCS_VIDEOS)
          .setOAuthToken(authResponse.access_token)
          .setDeveloperKey(credentials.api_key)
          .setCallback(async (data: any) => {
            if (data.action === window.google.picker.Action.PICKED) {
              const file = data.docs[0];
              toast({
                title: "File Selected",
                description: `Selected: ${file.name}`,
              });
              await handleCloudFileUpload(file, 'google-drive');
            } else if (data.action === window.google.picker.Action.CANCEL) {
              setUploading(false);
            }
          })
          .build();
        
        picker.setVisible(true);
      } else {
        throw new Error('Failed to authenticate with Google');
      }
    } catch (error: any) {
      console.error('Google Drive error:', error);
      toast({
        title: "Google Drive Error",
        description: error.message || "Failed to access Google Drive. Please check your credentials.",
        variant: "destructive",
      });
      setUploading(false);
    }
  }, [loadGoogleAPI, toast]);

  // Handle Dropbox upload
  const handleDropboxUpload = useCallback(() => {
    if (!window.Dropbox) {
      const script = document.createElement('script');
      script.src = 'https://www.dropbox.com/static/api/2/dropins.js';
      script.setAttribute('data-app-key', 'sdy1fc5l8164aua');
      script.onload = () => {
        window.Dropbox.choose({
          success: async (files: any[]) => {
            const file = files[0];
            await handleCloudFileUpload(file, 'dropbox');
          },
          linkType: "direct",
          multiselect: false,
          extensions: ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt', '.csv']
        });
      };
      document.head.appendChild(script);
    } else {
      window.Dropbox.choose({
        success: async (files: any[]) => {
          const file = files[0];
          await handleCloudFileUpload(file, 'dropbox');
        },
        linkType: "direct",
        multiselect: false,
        extensions: ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt', '.csv']
      });
    }
  }, []);

  // Handle cloud file upload (Google Drive or Dropbox)
  const handleCloudFileUpload = useCallback(async (file: any, source: 'google-drive' | 'dropbox') => {
    if (!sessionVerified) {
      toast({
        title: "Session Required",
        description: "Please refresh the page and sign in again.",
        variant: "destructive",
      });
      return;
    }

    // Check security before upload
    const securityPassed = await checkUploadSecurity();
    if (!securityPassed && captchaRequired && !captchaToken) {
      toast({
        title: "Security Verification Required",
        description: "Please complete the CAPTCHA to continue uploading.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    
    const fileId = `${Date.now()}-cloud`;
    const fileName = source === 'google-drive' ? file.name : file.name;
    const uploadFile: UploadedFile = {
      id: fileId,
      name: fileName,
      size: source === 'google-drive' ? (file.sizeBytes || 0) : (file.bytes || 0),
      uploadedAt: new Date().toISOString(),
      status: 'uploading',
      progress: 0,
      source
    };

    setFiles(prev => [...prev, uploadFile]);

    try {
      // Download file from cloud provider
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, progress: 25 } : f
      ));

      let downloadUrl: string;
      if (source === 'google-drive') {
        const authInstance = window.gapi.auth2.getAuthInstance();
        const token = authInstance.currentUser.get().getAuthResponse().access_token;
        downloadUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`;
        
        const response = await fetch(downloadUrl, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) throw new Error('Failed to download from Google Drive');
        const blob = await response.blob();
        
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, progress: 50 } : f
        ));

        // Upload to Supabase storage
        const storageResult = await uploadBlobToStorage(blob, fileName, fileId);
        
        if (!storageResult.success) {
          throw new Error(storageResult.error);
        }

        await logUploadToDatabase(uploadFile, storageResult.path!);
        
      } else if (source === 'dropbox') {
        const response = await fetch(file.link);
        if (!response.ok) throw new Error('Failed to download from Dropbox');
        
        const blob = await response.blob();
        
        setFiles(prev => prev.map(f => 
          f.id === fileId ? { ...f, progress: 50 } : f
        ));

        // Upload to Supabase storage
        const storageResult = await uploadBlobToStorage(blob, fileName, fileId);
        
        if (!storageResult.success) {
          throw new Error(storageResult.error);
        }

        await logUploadToDatabase(uploadFile, storageResult.path!);
      }

      // Complete upload
      setFiles(prev => prev.map(f => 
        f.id === fileId ? { ...f, status: 'uploaded', progress: 100 } : f
      ));

      toast({
        title: "Cloud File Uploaded Successfully",
        description: `${fileName} from ${source} has been uploaded securely.`,
      });

      // Reset CAPTCHA after successful upload
      setCaptchaRequired(false);
      setCaptchaToken(null);
      setRateLimitWarning(null);

    } catch (error: any) {
      console.error('Cloud upload failed:', error);
      
      setFiles(prev => prev.map(f => 
        f.id === fileId 
          ? { ...f, status: 'error', error: error.message, progress: 100 }
          : f
      ));

      toast({
        title: "Cloud Upload Failed",
        description: error.message || `Failed to upload from ${source}.`,
        variant: "destructive",
      });

      // Log security event for failed uploads
      try {
        await supabase.functions.invoke('enhanced-security-manager', {
          body: {
            action: 'log_security_event',
            event_type: 'cloud_upload_failed',
            resource: 'file_uploads',
            success: false,
            error_message: error.message,
            metadata: {
              source,
              filename: fileName,
              user_id: user?.id
            }
          }
        });
      } catch (logError) {
        console.error('Failed to log security event:', logError);
      }
    } finally {
      setUploading(false);
    }
  }, [user, sessionVerified, captchaRequired, captchaToken, toast, checkUploadSecurity]);

  // Upload blob to Supabase Storage
  const uploadBlobToStorage = async (blob: Blob, fileName: string, fileId: string): Promise<{ success: boolean; path?: string; error?: string }> => {
    try {
      const fileExt = fileName.split('.').pop();
      const filePath = `${user!.id}/${fileId}.${fileExt}`;

      const { error } = await supabase.storage
        .from('uploads')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: false,
          metadata: {
            originalName: fileName,
            uploadedBy: user!.id,
            uploadedAt: new Date().toISOString()
          }
        });

      if (error) throw error;

      return { success: true, path: filePath };
    } catch (error: any) {
      console.error('Storage upload failed:', error);
      return { success: false, error: error.message };
    }
  };

  // Handle source selection
  const handleSourceSelect = (sourceId: string) => {
    switch (sourceId) {
      case 'local':
        // Trigger file input
        document.getElementById('file-input')?.click();
        break;
      case 'google-drive':
        handleGoogleDriveUpload();
        break;
      case 'dropbox':
        handleDropboxUpload();
        break;
    }
    setShowSourcePicker(false);
  };

  // Setup dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: handleLocalUpload,
    disabled: uploading || !sessionVerified,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/csv': ['.csv']
    },
    maxSize: 100 * 1024 * 1024, // 100MB
    multiple: true
  });

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string, progress: number) => {
    switch (status) {
      case 'uploading': return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
      case 'uploaded': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'duplicate': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error': return <X className="h-4 w-4 text-red-600" />;
      default: return <FileIcon className="h-4 w-4" />;
    }
  };

  // Session loading state
  if (!user) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            <Shield className="h-5 w-5" />
            Authentication Required
          </CardTitle>
          <CardDescription>
            Please sign in to access the secure upload system.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!sessionVerified) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <CardTitle>Verifying Session Security</CardTitle>
          <CardDescription>
            Establishing secure connection for file uploads...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Rate Limit Warning */}
      {rateLimitWarning && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{rateLimitWarning}</AlertDescription>
        </Alert>
      )}

      {/* CAPTCHA Verification */}
      {captchaRequired && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <Shield className="h-5 w-5" />
              Security Verification Required
            </CardTitle>
            <CardDescription>
              Please complete the verification to continue uploading files.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CaptchaWrapper
              onVerify={(token) => setCaptchaToken(token)}
              action="file_upload"
              className="flex justify-center"
            />
          </CardContent>
        </Card>
      )}

      {/* Upload Area */}
      <Card className="shadow-elegant border-primary/20">
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
          {/* Cloud Integration */}
          <SecureCloudIntegration
            onImportComplete={(results, summary) => {
              // Files are already processed and stored by the edge function
              // Add them to the UI display
              const newFiles: UploadedFile[] = results.map((result, index) => ({
                id: `cloud-${Date.now()}-${index}`,
                name: result.name,
                size: result.size || 0,
                uploadedAt: new Date().toISOString(),
                status: result.success ? 'uploaded' : 'error',
                progress: 100,
                source: 'google-drive', // Will be properly detected by the edge function
                error: result.error
              }));
              
              setFiles(prev => [...prev, ...newFiles]);
              
              toast({
                title: "Cloud Import Complete",
                description: `Successfully imported ${summary.successful} of ${summary.total} files`,
                variant: summary.failed > 0 ? "default" : "default",
              });
            }}
            disabled={uploading || !sessionVerified}
          />

          {/* Drag & Drop Area */}
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="text-lg font-medium mb-2">Or upload from your device</h3>
              <p className="text-sm text-muted-foreground">Drag and drop files or click to browse</p>
            </div>
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragActive 
                  ? 'border-primary bg-primary/5' 
                  : 'border-muted-foreground/25 hover:border-primary/50'
              } ${uploading || !sessionVerified ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <input {...getInputProps()} />
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-lg">Drop the files here...</p>
              ) : (
                <div>
                  <p className="text-lg mb-2">Drag & drop files here, or click to select</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Supports: Images, PDFs, Text files, CSV (up to 100MB each)
                  </p>
                  <Button 
                    type="button"
                    variant="outline" 
                    className="mb-4"
                    disabled={uploading || !sessionVerified}
                    onClick={(e) => {
                      e.stopPropagation();
                      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
                      input?.click();
                    }}
                  >
                    <HardDrive className="h-4 w-4 mr-2" />
                    Choose Files
                  </Button>
                  <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    <span>End-to-end encrypted • Enterprise security</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Queue */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Upload Queue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {files.map((file) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="flex items-center justify-between p-3 border rounded-lg bg-gradient-to-r from-background to-muted/20"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {getStatusIcon(file.status, file.progress)}
                        <div className="flex-1">
                          <p className="font-medium">{file.name}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>{formatFileSize(file.size)}</span>
                            <Badge variant="outline" className="text-xs">
                              {file.source === 'local' ? 'Local' : file.source}
                            </Badge>
                            {file.status === 'duplicate' && (
                              <Badge variant="secondary">Duplicate</Badge>
                            )}
                          </div>
                          {file.status === 'uploading' && (
                            <Progress value={file.progress} className="w-full mt-2" />
                          )}
                          {file.error && (
                            <p className="text-sm text-red-600 mt-1">{file.error}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(file.id)}
                        disabled={file.status === 'uploading'}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analysis Button - Show when files are available */}
      {files.length > 0 && (
        <div className="flex justify-center">
          <AnalyzeFilesButton 
            fileCount={files.filter(f => f.status === 'uploaded').length}
            disabled={uploading || files.some(f => f.status === 'uploading')}
            onAnalysisComplete={(results) => {
              console.log('Analysis results:', results);
              toast({
                title: "Analysis Results Ready",
                description: "Check the admin dashboard for detailed insights.",
              });
            }}
          />
        </div>
      )}
    </div>
  );
}