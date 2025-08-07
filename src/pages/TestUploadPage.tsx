import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import axios from 'axios';

interface DuplicateResult {
  filename: string;
  score: number;
}

interface UploadResponse {
  duplicates: DuplicateResult[];
  best?: DuplicateResult;
}

export function TestUploadPage() {
  const { user, session, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/signin');
    }
  }, [user, loading, navigate]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
    } else {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !session) return;

    setIsUploading(true);
    try {
      // Get the ID token from Supabase session
      const idToken = session.access_token;

      // Create form data
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Call FastAPI backend
      const response = await axios.post<UploadResponse>(
        'https://your-fastapi-backend.com/upload/image', // Replace with your FastAPI URL
        formData,
        {
          headers: {
            'Authorization': `Bearer ${idToken}`,
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      // Navigate to results page with the response data
      navigate('/results', { 
        state: { 
          results: response.data,
          filename: selectedFile.name 
        } 
      });

    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload failed",
        description: axios.isAxiosError(error) 
          ? error.response?.data?.message || error.message
          : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto pt-8"
      >
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              Upload Image for Deduplication
            </CardTitle>
            <CardDescription>
              Upload an image to test the deduplication system
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-center w-full">
                <label 
                  htmlFor="file-upload" 
                  className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-primary/20 rounded-xl cursor-pointer bg-accent/10 hover:bg-accent/20 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <ImageIcon className="w-10 h-10 mb-3 text-muted-foreground" />
                    <p className="mb-2 text-sm text-muted-foreground">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG, GIF up to 10MB
                    </p>
                  </div>
                  <Input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileSelect}
                  />
                </label>
              </div>

              {selectedFile && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 bg-accent/50 rounded-xl"
                >
                  <div className="flex items-center space-x-3">
                    <ImageIcon className="h-8 w-8 text-primary" />
                    <div>
                      <p className="font-medium">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
              className="w-full"
              size="lg"
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Checking for duplicates...
                </>
              ) : (
                <>
                  <Upload className="h-5 w-5 mr-2" />
                  Check for Duplicates
                </>
              )}
            </Button>

            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Signed in as: <span className="font-medium">{user.email}</span>
              </p>
              <Button
                variant="link"
                size="sm"
                onClick={() => navigate('/signin')}
                className="mt-2"
              >
                Switch account
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}