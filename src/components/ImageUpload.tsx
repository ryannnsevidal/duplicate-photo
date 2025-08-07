import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { findDuplicates, generateImageHashBrowser } from '@/utils/perceptualHash';
import { AlertCircle, Camera, CheckCircle, FileImage, Image, Upload, Cloud, FolderOpen } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { CloudIntegration } from '@/components/CloudIntegration';

interface DuplicateResult {
  filename: string;
  similarity: number;
  file_id: string;
  upload_date: string;
}

interface UploadResponse {
  success: boolean;
  file_id: string;
  duplicates: DuplicateResult[];
  hashes: {
    phash: string;
    dhash: string;
    avgHash: string;
    colorHash: string;
  };
}

interface ImageUploadProps {
  onResults: (results: UploadResponse) => void;
}

interface CloudFile {
  id: string;
  name: string;
  size: number;
  downloadUrl: string;
  source: 'google-drive' | 'dropbox';
}

type UploadSource = 'local' | 'cloud' | 'camera';
type UploadState = 'idle' | 'uploading' | 'hashing' | 'checking' | 'complete' | 'error';

export function ImageUpload({ onResults }: ImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [cloudFile, setCloudFile] = useState<CloudFile | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadSource, setUploadSource] = useState<UploadSource>('local');
  const [showCloudOptions, setShowCloudOptions] = useState(false);
  const { user, isAdmin } = useAuth();

  const isProcessing = uploadState !== 'idle' && uploadState !== 'complete' && uploadState !== 'error';

  const handleFileSelect = (file: File) => {
    setErrorMessage(null);
    setCloudFile(null);
    setUploadSource('local');

    // Validate file types
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
    const maxSizeMB = 10;

    if (!allowedTypes.includes(file.type.toLowerCase())) {
      const errorMsg = "Please select a valid image file (JPG, PNG, WebP, HEIC)";
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      const errorMsg = `File size must be less than ${maxSizeMB}MB`;
      setErrorMessage(errorMsg);
      toast.error(errorMsg);
      return;
    }

    setSelectedFile(file);
    setUploadState('idle');
  };

  const handleCloudFileSelect = (cloudFileData: CloudFile) => {
    setErrorMessage(null);
    setSelectedFile(null);
    setUploadSource('cloud');
    setCloudFile(cloudFileData);
    setUploadState('idle');
    setShowCloudOptions(false);
    
    toast.success(`Selected ${cloudFileData.name} from ${cloudFileData.source.replace('-', ' ')}`);
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

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if ((!selectedFile && !cloudFile) || !user) {
      toast.error("Please select a file and sign in");
      return;
    }

    setErrorMessage(null);
    setUploadProgress(0);

    try {
      let fileToProcess: File;
      let fileName: string;

      if (uploadSource === 'cloud' && cloudFile) {
        // Download cloud file first
        setUploadState('uploading');
        setUploadProgress(10);

        const response = await fetch(cloudFile.downloadUrl);
        if (!response.ok) throw new Error(`Failed to download from ${cloudFile.source}`);
        
        const blob = await response.blob();
        fileToProcess = new File([blob], cloudFile.name, { type: blob.type });
        fileName = cloudFile.name;

        setUploadProgress(25);
      } else if (selectedFile) {
        fileToProcess = selectedFile;
        fileName = selectedFile.name;
        setUploadState('uploading');
        setUploadProgress(25);
      } else {
        throw new Error('No file selected');
      }

      // Upload to Supabase storage
      const fileNameWithUser = `${user.id}/${Date.now()}-${fileName}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(fileNameWithUser, fileToProcess, {
          cacheControl: '3600',
          upsert: false,
          metadata: {
            originalName: fileName,
            uploadSource: uploadSource,
            cloudProvider: cloudFile?.source || 'local'
          }
        });

      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

      setUploadProgress(50);

      // Step 2: Generate perceptual hashes
      setUploadState('hashing');

      const hashes = await generateImageHashBrowser(fileToProcess);
      setUploadProgress(75);

      // Step 3: Store file metadata and hashes
      const { data: fileRecord, error: dbError } = await supabase
        .from('file_upload_logs')
        .insert({
          user_id: user.id,
          filename: fileNameWithUser,
          original_name: fileName,
          file_size: fileToProcess.size,
          mime_type: fileToProcess.type,
          storage_path: uploadData.path,
          status: 'completed',
          metadata: {
            upload_source: uploadSource,
            cloud_provider: cloudFile?.source || 'local',
            user_agent: navigator.userAgent
          }
        })
        .select()
        .single();

      if (dbError) throw new Error(`Database error: ${dbError.message}`);

      // Step 4: Store hashes
      const { error: hashError } = await supabase
        .from('image_hashes')
        .insert({
          file_upload_id: fileRecord.id,
          user_id: user.id,
          phash: hashes.phash,
          dhash: hashes.dhash,
          avg_hash: hashes.avgHash,
          color_hash: hashes.colorHash,
          metadata: {
            image_dimensions: hashes.metadata,
            algorithm_versions: {
              phash: '1.0',
              dhash: '1.0',
              avgHash: '1.0',
              colorHash: '1.0'
            }
          }
        });

      if (hashError) throw new Error(`Hash storage error: ${hashError.message}`);

      // Step 5: Check for duplicates
      setUploadState('checking');
      setUploadProgress(90);

      // Get all existing hashes for the user (or all if admin)
      const { data: existingHashes, error: hashFetchError } = await supabase
        .from('image_hashes')
        .select(`
          phash, dhash, avg_hash, color_hash, file_upload_id,
          file_upload_logs!inner(filename, uploaded_at, user_id)
        `)
        .neq('file_upload_id', fileRecord.id);

      if (hashFetchError) {
        console.error('Error fetching existing hashes:', hashFetchError);
      }

      // Find duplicates using our utility
      const duplicates = existingHashes ?
        findDuplicates([
          { id: fileRecord.id, hash: hashes },
          ...existingHashes.map(h => ({
            id: h.file_upload_id,
            hash: {
              phash: h.phash,
              dhash: h.dhash,
              avgHash: h.avg_hash,
              colorHash: h.color_hash,
              metadata: hashes.metadata
            }
          }))
        ], 85) : [];

      // Store duplicate check results
      await supabase
        .from('duplicate_checks')
        .insert({
          file_upload_id: fileRecord.id,
          user_id: user.id,
          status: duplicates.length > 0 ? 'found_duplicates' : 'no_duplicates',
          duplicates_found: duplicates.length,
          results: duplicates,
          metadata: {
            check_algorithm: 'perceptual_hash_v1',
            threshold_used: 0.85
          }
        });

      setUploadProgress(100);
      setUploadState('complete');

      const response: UploadResponse = {
        success: true,
        file_id: fileRecord.id,
        duplicates: duplicates.map(d => {
          // Find the corresponding hash record to get metadata
          const matchedHash = existingHashes?.find(h => h.file_upload_id === d.file2);
          return {
            filename: matchedHash?.file_upload_logs.filename || 'Unknown',
            similarity: d.similarity / 100,
            file_id: d.file2,
            upload_date: matchedHash?.file_upload_logs.uploaded_at || new Date().toISOString()
          };
        }),
        hashes: {
          phash: hashes.phash,
          dhash: hashes.dhash,
          avgHash: hashes.avgHash,
          colorHash: hashes.colorHash
        }
      };

      onResults(response);

      toast.success(
        duplicates.length > 0
          ? `Upload complete! Found ${duplicates.length} potential duplicate(s)`
          : "Upload complete! No duplicates found"
      );

    } catch (error: any) {
      console.error('Upload error:', error);
      setUploadState('error');
      setErrorMessage(error.message);
      toast.error(`Upload failed: ${error.message}`);
    }
  };

  const getStateMessage = () => {
    switch (uploadState) {
      case 'uploading': return cloudFile ? 'Downloading from cloud and uploading...' : 'Uploading file to cloud storage...';
      case 'hashing': return 'Generating perceptual hashes...';
      case 'checking': return 'Checking for duplicates...';
      case 'complete': return 'Upload complete!';
      case 'error': return 'Upload failed';
      default: return '';
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
          <Image className="h-6 w-6" />
          Upload Image for Duplicate Detection
        </CardTitle>
        <CardDescription>
          Upload an image to check for duplicates using advanced perceptual hashing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
              ? 'border-primary bg-primary/5'
              : (selectedFile || cloudFile)
                ? uploadState === 'complete'
                  ? 'border-green-500 bg-green-50'
                  : uploadState === 'error'
                    ? 'border-red-500 bg-red-50'
                    : 'border-blue-500 bg-blue-50'
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {(selectedFile || cloudFile) ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                {uploadState === 'complete' && <CheckCircle className="h-5 w-5 text-green-600" />}
                {uploadState === 'error' && <AlertCircle className="h-5 w-5 text-red-600" />}
                {cloudFile && <Cloud className="h-5 w-5 text-blue-600" />}
                <div className={`font-medium ${uploadState === 'complete' ? 'text-green-600' :
                    uploadState === 'error' ? 'text-red-600' : 'text-blue-600'
                  }`}>
                  {selectedFile?.name || cloudFile?.name}
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {(selectedFile?.size || cloudFile?.size || 0) / 1024 / 1024} MB
                {cloudFile && ` • From ${cloudFile.source.replace('-', ' ')}`}
              </div>
              {isProcessing && (
                <div className="space-y-2">
                  <Progress value={uploadProgress} className="w-full" />
                  <div className="text-sm text-muted-foreground">
                    {getStateMessage()}
                  </div>
                </div>
              )}
              {errorMessage && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                  {errorMessage}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">Drop your image here</p>
                <p className="text-sm text-muted-foreground">
                  Supports JPG, PNG, WebP, HEIC • Max 10MB
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Or choose from cloud storage below
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => document.getElementById('file-input')?.click()}
              disabled={isProcessing}
            >
              <FileImage className="w-4 h-4 mr-2" />
              Browse Files
            </Button>

            <Button
              variant="outline"
              className="flex-1"
              onClick={() => document.getElementById('photo-input')?.click()}
              disabled={isProcessing}
            >
              <Camera className="w-4 h-4 mr-2" />
              Take Photo
            </Button>

            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowCloudOptions(!showCloudOptions)}
              disabled={isProcessing}
            >
              <Cloud className="w-4 h-4 mr-2" />
              Cloud Storage
            </Button>
          </div>

          {/* Cloud Options */}
          {showCloudOptions && (
            <div className="border rounded-lg p-4 bg-muted/50">
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Cloud className="h-4 w-4" />
                Select from Cloud Storage
              </h4>
              <CloudIntegration 
                onFileSelected={handleCloudFileSelect}
                disabled={isProcessing}
              />
            </div>
          )}

          <Button
            className="w-full"
            onClick={handleUpload}
            disabled={(!selectedFile && !cloudFile) || isProcessing || !user}
          >
            {isProcessing ? getStateMessage().split('...')[0] : 'Check for Duplicates'}
          </Button>
        </div>

        {!user && (
          <div className="text-center text-sm text-muted-foreground bg-yellow-50 p-3 rounded">
            Please sign in to upload and check for duplicates
          </div>
        )}

        {/* Hidden file inputs */}
        <input
          id="file-input"
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/heic"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
        />

        <input
          id="photo-input"
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
        />
      </CardContent>
    </Card>
  );
}