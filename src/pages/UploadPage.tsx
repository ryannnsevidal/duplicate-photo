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
  analysisData?: {
    total_files: number;
    duplicates_found: number;
    potential_savings_bytes: number;
    processing_time_ms: number;
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
      const uploadedFileIds: string[] = [];
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');
      
      // 1. Upload all files to Supabase storage first
      for (const file of selectedFiles) {
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.name}`;
        
        console.log(`📤 Uploading file: ${file.name} as ${fileName}`);
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('uploaded_files')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (uploadError) {
          console.error('❌ Upload error:', uploadError);
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
        }
        
        uploadedFiles.push(fileName);
        console.log(`✅ Successfully uploaded: ${fileName}`);
      }

      // 2. Log all uploads to database for tracking
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        const fileName = uploadedFiles[i];
        
        const { data: uploadLog, error: logError } = await supabase
          .from('file_upload_logs')
          .insert({
            user_id: user.id,
            original_filename: file.name,
            file_type: file.type,
            file_size_bytes: file.size,
            upload_status: 'uploaded',
            cloud_provider: 'supabase',
            cloud_path: fileName,
            metadata: {
              upload_timestamp: new Date().toISOString(),
              user_agent: navigator.userAgent
            }
          })
          .select('id')
          .single();
        
        if (logError) {
          console.error('⚠️ Failed to log upload:', logError);
        } else {
          uploadedFileIds.push(uploadLog.id);
          console.log(`📝 Logged upload with ID: ${uploadLog.id}`);
        }
      }

      // 3. **TRIGGER REAL DUPLICATE ANALYSIS** using Supabase Edge Function
      console.log('🔍 Starting duplicate analysis...');
      
      const { data: { session } } = await supabase.auth.getSession();
      const analysisResponse = await supabase.functions.invoke('dedup-analyzer', {
        body: {
          action: 'analyze_uploaded_files',
          user_id: user.id,
          file_ids: uploadedFileIds
        },
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      if (analysisResponse.error) {
        console.error('❌ Analysis error:', analysisResponse.error);
        throw new Error(`Duplicate analysis failed: ${analysisResponse.error.message}`);
      }

      const analysisResults = analysisResponse.data;
      console.log('✅ Analysis completed:', analysisResults);

      // 4. Transform results for UI
      const transformedResults: UploadResponse = {
        duplicates: analysisResults.duplicate_groups?.map((group: any) => ({
          filename: group.files?.[0] || 'Unknown',
          score: (group.similarity || 0) / 100
        })) || [],
        best: analysisResults.duplicate_groups?.length > 0 ? {
          filename: analysisResults.duplicate_groups[0].files?.[0] || 'Unknown',
          score: (analysisResults.duplicate_groups[0].similarity || 0) / 100
        } : undefined,
        // Add analysis metadata
        analysisData: {
          total_files: analysisResults.total_files,
          duplicates_found: analysisResults.duplicates_found,
          potential_savings_bytes: analysisResults.potential_savings_bytes,
          processing_time_ms: analysisResults.processing_time_ms
        }
      };

      // 5. Store final duplicate check record
      const { data: duplicateCheck, error: dbError } = await supabase
        .from('duplicate_checks')
        .insert({
          user_id: user.id,
          original_filename: selectedFiles[0].name,
          file_path: uploadedFiles[0],
          duplicates: transformedResults.duplicates.map(d => d.filename),
          metadata: {
            upload_count: selectedFiles.length,
            analysis_timestamp: new Date().toISOString(),
            analysis_results: analysisResults
          }
        })
        .select()
        .single();

      if (dbError) {
        console.error('⚠️ Failed to save duplicate check:', dbError);
      }

      // 6. Pass results to parent component
      onResults(transformedResults);
      
      // 7. Log successful operation
      await logSecurityEvent({
        action: 'file_upload_and_analysis_success',
        resource: 'upload_page',
        success: true,
        metadata: { 
          file_count: selectedFiles.length,
          total_size_mb: (selectedFiles.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024).toFixed(2),
          duplicates_found: analysisResults.duplicates_found,
          processing_time_ms: analysisResults.processing_time_ms,
          duplicate_check_id: duplicateCheck?.id
        }
      });
      
      toast({
        title: "Upload & Analysis Complete!",
        description: `Processed ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}, found ${analysisResults.duplicates_found} duplicate${analysisResults.duplicates_found !== 1 ? 's' : ''}`,
      });
      
    } catch (error: any) {
      console.error('❌ Upload/Analysis error:', error);
      
      await logSecurityEvent({
        action: 'file_upload_failed',
        resource: 'upload_page',
        success: false,
        metadata: { 
          file_count: selectedFiles.length,
          error_message: error.message
        }
      });
      
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