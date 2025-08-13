import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Image, FileText, X, Shield } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSecurity } from '@/hooks/useSecurity';
import { useEnhancedSecurity } from '@/hooks/useEnhancedSecurity';

interface DuplicateResult {
  filename: string;
  score: number;
}

interface UploadResponse {
  duplicates: DuplicateResult[];
  best?: {
    filename: string;
    score: number;
  };
}

interface UploadPageProps {
  onResults: (results: UploadResponse) => void;
}

export function UploadPage({ onResults }: UploadPageProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();
  const { checkRateLimit, logSecurityEvent } = useSecurity();
  const { checkEnhancedRateLimit, getSecurityLevel } = useEnhancedSecurity();

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      toast({
        title: "Invalid files",
        description: "Please select image files (JPG, PNG, etc.)",
        variant: "destructive",
      });
      return;
    }

    setSelectedFiles(prev => [...prev, ...imageFiles]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    handleFileSelect(e.dataTransfer.files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    // Enhanced security check with severity assessment
    const userAgent = navigator.userAgent;
    const securityLevel = getSecurityLevel('file_upload', userAgent);
    
    const rateLimitResult = await checkEnhancedRateLimit({
      action_type: 'file_upload',
      max_attempts: 5,  // Reduced to 5 uploads per hour for security
      window_minutes: 60,
      severity_level: securityLevel
    });

    if (!rateLimitResult.allowed) {
      if (rateLimitResult.captcha_required) {
        toast({
          title: "Security verification required",
          description: "Please complete security verification to continue.",
          variant: "destructive",
        });
        // TODO: Show CAPTCHA modal here
        return;
      } else {
        toast({
          title: "Rate limit exceeded",
          description: `Too many uploads. Please wait ${Math.round((rateLimitResult.retry_after_seconds || 3600) / 60)} minutes.`,
          variant: "destructive",
        });
      }
      
      await logSecurityEvent({
        action: 'upload_rate_limit_exceeded',
        resource: 'upload_page',
        success: false,
        metadata: { 
          file_count: selectedFiles.length,
          severity_level: securityLevel,
          captcha_required: rateLimitResult.captcha_required
        }
      });
      return;
    }
    
    setIsUploading(true);
    
    try {
      const uploadedFiles: string[] = [];
      
      // Upload all files to Supabase storage
      for (const file of selectedFiles) {
        const fileName = `${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, file);
        
        if (uploadError) throw uploadError;
        uploadedFiles.push(fileName);
      }

      // Store duplicate check record
      const { data: duplicateCheck, error: dbError } = await supabase
        .from('duplicate_checks')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          original_filename: selectedFiles[0].name,
          file_path: uploadedFiles[0],
          duplicates: []
        })
        .select()
        .single();

      if (dbError) throw dbError;

      // Simulate duplicate detection results
      // In a real app, this would call your FastAPI backend
      const mockResults: UploadResponse = {
        duplicates: selectedFiles.length > 1 ? [
          { filename: selectedFiles[1].name, score: 0.95 },
          { filename: selectedFiles[0].name, score: 0.88 }
        ] : [],
        best: selectedFiles.length > 1 ? {
          filename: selectedFiles[1].name,
          score: 0.95
        } : undefined
      };

      onResults(mockResults);
      
      // Log successful upload
      await logSecurityEvent({
        action: 'file_upload_success',
        resource: 'upload_page',
        success: true,
        metadata: { 
          file_count: selectedFiles.length,
          total_size_mb: (selectedFiles.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024).toFixed(2),
          duplicate_check_id: duplicateCheck.id
        }
      });
      
      toast({
        title: "Upload successful!",
        description: `Processed ${selectedFiles.length} image${selectedFiles.length > 1 ? 's' : ''}`,
      });
      
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to process images",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-4xl mx-auto px-4 py-8"
    >
      <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center pb-8">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3">
              <Image className="h-8 w-8 text-primary" />
              Upload Images
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              Upload your images to detect duplicates with AI-powered analysis
            </CardDescription>
          </motion.div>
        </CardHeader>
        
        <CardContent className="space-y-8">
          {/* Drop Zone */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
              dragActive 
                ? 'border-primary bg-primary/5 scale-105' 
                : selectedFiles.length > 0
                  ? 'border-green-500 bg-green-50 dark:bg-green-950/20' 
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/20'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {selectedFiles.length > 0 ? (
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                className="space-y-4"
              >
                <div className="text-green-600 dark:text-green-400 font-medium text-lg">
                  ✓ {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                </div>
                <div className="text-sm text-muted-foreground">
                  Total size: {(selectedFiles.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024).toFixed(2)} MB
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ y: 10 }}
                animate={{ y: 0 }}
                className="space-y-6"
              >
                <Upload className="h-16 w-16 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-2xl font-medium mb-2">Drop your images here</p>
                  <p className="text-muted-foreground">
                    or click to browse files • Supports JPG, PNG, WebP
                  </p>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* File List */}
          {selectedFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.4 }}
              className="space-y-3"
            >
              <h3 className="font-semibold text-lg">Selected Files:</h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <div className="font-medium text-sm truncate max-w-[200px]">
                          {file.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-8 w-8 p-0 hover:bg-destructive/10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
          
          {/* Actions */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => document.getElementById('file-input')?.click()}
              disabled={isUploading}
            >
              <Upload className="h-4 w-4 mr-2" />
              Add More Files
            </Button>
            
            <Button
              className="flex-1 bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90"
              onClick={handleUpload}
              disabled={selectedFiles.length === 0 || isUploading}
            >
              {isUploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : (
                'Detect Duplicates'
              )}
            </Button>
          </motion.div>
          
          <input
            id="file-input"
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFileSelect(e.target.files)}
          />
        </CardContent>
      </Card>
    </motion.div>
  );
}