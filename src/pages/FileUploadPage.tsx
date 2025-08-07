import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Upload, 
  FileText, 
  Image, 
  Files, 
  Cloud, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  X
} from 'lucide-react';

interface UploadedFile {
  file: File;
  id: string;
  preview?: string;
}

interface DuplicateResult {
  filename: string;
  similarity_score: number;
  file_id: string;
  cloud_path: string;
}

interface UploadResponse {
  success: boolean;
  file_id?: string;
  cloud_path?: string;
  duplicates: DuplicateResult[];
  is_duplicate: boolean;
  message: string;
}

export function FileUploadPage() {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [selectedFiles, setSelectedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [cloudProvider, setCloudProvider] = useState<string>('other');
  const [remoteName, setRemoteName] = useState('default');
  const [uploadResults, setUploadResults] = useState<UploadResponse[]>([]);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/signin');
    }
  }, [user, loading, navigate]);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;

    const newFiles: UploadedFile[] = [];
    
    Array.from(files).forEach((file) => {
      // Validate file type
      const validTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml',
        'application/pdf',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'text/csv'
      ];

      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: `${file.name} is not a supported file type`,
          variant: "destructive",
        });
        return;
      }

      // Validate file size (50MB limit)
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 50MB limit`,
          variant: "destructive",
        });
        return;
      }

      const fileWithId: UploadedFile = {
        file,
        id: crypto.randomUUID(),
      };

      // Create preview for images
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          fileWithId.preview = e.target?.result as string;
          setSelectedFiles(prev => [...prev]);
        };
        reader.readAsDataURL(file);
      }

      newFiles.push(fileWithId);
    });

    setSelectedFiles(prev => [...prev, ...newFiles]);
  }, [toast]);

  const removeFile = (id: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  }, [handleFileSelect]);

  const uploadFiles = async () => {
    if (!selectedFiles.length || !session) return;

    setIsUploading(true);
    const results: UploadResponse[] = [];

    try {
      for (const fileItem of selectedFiles) {
        const formData = new FormData();
        formData.append('file', fileItem.file);
        formData.append('cloudProvider', cloudProvider);
        formData.append('remoteName', remoteName);

        const { data, error } = await supabase.functions.invoke('file-upload-manager', {
          body: formData,
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (error) {
          toast({
            title: "Upload failed",
            description: `Failed to upload ${fileItem.file.name}: ${error.message}`,
            variant: "destructive",
          });
          results.push({
            success: false,
            duplicates: [],
            is_duplicate: false,
            message: `Upload failed: ${error.message}`
          });
        } else {
          results.push(data);
          toast({
            title: data.is_duplicate ? "Duplicate detected" : "Upload successful",
            description: data.message,
            variant: data.is_duplicate ? "destructive" : "default",
          });
        }
      }

      setUploadResults(results);
      setShowResults(true);
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "An unexpected error occurred during upload",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const resetUpload = () => {
    setSelectedFiles([]);
    setUploadResults([]);
    setShowResults(false);
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg'].includes(ext || '')) {
      return <Image className="h-6 w-6 text-blue-500" />;
    } else if (ext === 'pdf') {
      return <FileText className="h-6 w-6 text-red-500" />;
    } else {
      return <Files className="h-6 w-6 text-gray-500" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (showResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-4xl mx-auto pt-8"
        >
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl font-bold flex items-center gap-2">
                <Cloud className="h-6 w-6" />
                Upload Results
              </CardTitle>
              <CardDescription>
                File upload and duplicate detection completed
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {uploadResults.map((result, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border rounded-lg p-4"
                >
                  <div className="flex items-center gap-3 mb-3">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    )}
                    <span className="font-medium">
                      {selectedFiles[index]?.file.name}
                    </span>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {result.message}
                  </p>

                  {result.cloud_path && (
                    <div className="bg-accent/20 p-3 rounded text-sm">
                      <strong>Cloud Path:</strong> {result.cloud_path}
                    </div>
                  )}

                  {result.duplicates.length > 0 && (
                    <div className="mt-3">
                      <h4 className="font-medium text-sm mb-2">Similar Files:</h4>
                      <div className="space-y-2">
                        {result.duplicates.map((dup, dupIndex) => (
                          <div
                            key={dupIndex}
                            className="flex justify-between items-center bg-orange-50 dark:bg-orange-900/20 p-2 rounded text-sm"
                          >
                            <span>{dup.filename}</span>
                            <span className="font-medium">
                              {(dup.similarity_score * 100).toFixed(1)}% similar
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}

              <Button onClick={resetUpload} className="w-full" size="lg">
                Upload More Files
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl mx-auto pt-8"
      >
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl font-bold flex items-center gap-2">
              <Upload className="h-6 w-6" />
              Universal File Upload & Sync
            </CardTitle>
            <CardDescription>
              Upload files with industry-grade duplicate detection and cloud sync via Rclone
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Cloud Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cloud-provider">Cloud Provider</Label>
                <Select value={cloudProvider} onValueChange={setCloudProvider}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select cloud provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="s3">Amazon S3</SelectItem>
                    <SelectItem value="gdrive">Google Drive</SelectItem>
                    <SelectItem value="dropbox">Dropbox</SelectItem>
                    <SelectItem value="onedrive">OneDrive</SelectItem>
                    <SelectItem value="other">Other/Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="remote-name">Rclone Remote Name</Label>
                <Input
                  id="remote-name"
                  value={remoteName}
                  onChange={(e) => setRemoteName(e.target.value)}
                  placeholder="default"
                />
              </div>
            </div>

            {/* File Upload Area */}
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`
                relative border-2 border-dashed rounded-xl p-8 text-center transition-colors
                ${dragActive 
                  ? 'border-primary bg-primary/10' 
                  : 'border-border hover:border-primary/50'
                }
              `}
            >
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.doc,.docx,.txt,.csv"
                onChange={(e) => handleFileSelect(e.target.files)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              
              <div className="space-y-4">
                <div className="flex justify-center">
                  <Upload className="h-12 w-12 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-lg font-medium">
                    Drop files here or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Supports images, PDFs, and documents up to 50MB
                  </p>
                </div>
              </div>
            </div>

            {/* Selected Files */}
            <AnimatePresence>
              {selectedFiles.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <h3 className="font-medium">Selected Files ({selectedFiles.length})</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedFiles.map((fileItem) => (
                      <motion.div
                        key={fileItem.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="flex items-center gap-3 p-3 bg-accent/20 rounded-lg"
                      >
                        {fileItem.preview ? (
                          <img
                            src={fileItem.preview}
                            alt={fileItem.file.name}
                            className="w-10 h-10 object-cover rounded"
                          />
                        ) : (
                          getFileIcon(fileItem.file.name)
                        )}
                        
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{fileItem.file.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(fileItem.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(fileItem.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Upload Button */}
            <Button
              onClick={uploadFiles}
              disabled={selectedFiles.length === 0 || isUploading}
              className="w-full"
              size="lg"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Uploading & Detecting Duplicates...
                </>
              ) : (
                <>
                  <Cloud className="h-5 w-5 mr-2" />
                  Upload to Cloud & Check Duplicates
                </>
              )}
            </Button>

            {/* User Info */}
            <div className="text-center text-sm text-muted-foreground">
              Signed in as: <span className="font-medium">{user.email}</span>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}