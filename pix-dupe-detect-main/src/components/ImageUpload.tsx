import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Image, Camera, FileImage } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DuplicateResult {
  filename: string;
  score: number;
}

interface UploadResponse {
  duplicates: DuplicateResult[];
}

interface ImageUploadProps {
  onResults: (results: UploadResponse) => void;
}

export function ImageUpload({ onResults }: ImageUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (file: File) => {
    // Validate file types (images and PDFs)
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf'];
    const maxSizeMB = 10;
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select an image (JPG, PNG, WebP, HEIC) or PDF file",
        variant: "destructive",
      });
      return;
    }
    
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `File size must be less than ${maxSizeMB}MB`,
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
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
    if (!selectedFile) return;
    
    setIsUploading(true);
    
    try {
      // Upload to Supabase storage
      const fileName = `${Date.now()}-${selectedFile.name}`;
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, selectedFile);
      
      if (uploadError) throw uploadError;
      
      // Call edge function to check for duplicates
      const { data, error } = await supabase.functions.invoke('check-duplicates', {
        body: { fileName }
      });
      
      if (error) throw error;
      
      onResults(data);
      
      toast({
        title: "Upload successful!",
        description: "Image processed and checked for duplicates.",
      });
      
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to process image",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
          <Image className="h-6 w-6" />
          Upload Image
        </CardTitle>
        <CardDescription>
          Upload an image to check for duplicates in your collection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-primary bg-primary/5' 
              : selectedFile 
                ? 'border-green-500 bg-green-50' 
                : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          {selectedFile ? (
            <div className="space-y-2">
              <div className="text-green-600 font-medium">
                ✓ {selectedFile.name}
              </div>
              <div className="text-sm text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <p className="text-lg font-medium">Drop your image here</p>
                <p className="text-sm text-muted-foreground">
                  or click to browse files
                </p>
              </div>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => document.getElementById('file-input')?.click()}
          >
            <FileImage className="w-4 h-4 mr-2" />
            Browse Files
          </Button>
          
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => document.getElementById('photo-input')?.click()}
          >
            <Camera className="w-4 h-4 mr-2" />
            Camera/Photos
          </Button>
          
          <Button
            className="flex-1"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
          >
            {isUploading ? 'Processing...' : 'Check Duplicates'}
          </Button>
        </div>
        
        {/* Standard file picker */}
        <input
          id="file-input"
          type="file"
          accept="image/*,application/pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileSelect(file);
          }}
        />
        
        {/* Camera/Photos picker - on iOS Safari this will show "Camera" and "Photo Library" options */}
        <input
          id="photo-input"
          type="file"
          accept="image/*,application/pdf,.doc,.docx"
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