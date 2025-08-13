import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileImage, Calendar, HardDrive, Hash } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/hooks/useAuth';
import { formatDistanceToNow } from 'date-fns';

interface UploadLog {
  id: string;
  original_filename: string;
  file_type: string;
  file_size_bytes: number;
  created_at: string;
  sha256_hash: string;
  perceptual_hash?: string;
  similarity_score?: number;
}

export function RecentUploads() {
  const [uploads, setUploads] = useState<UploadLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchUploads = async () => {
      try {
        const { data, error } = await supabase
          .from('file_upload_logs')
          .select('id, original_filename, file_type, file_size_bytes, created_at, sha256_hash, perceptual_hash, similarity_score')
          .order('created_at', { ascending: false })
          .limit(10);

        if (error) throw error;
        setUploads(data || []);
      } catch (error) {
        console.error('Error fetching uploads:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUploads();
  }, [user]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (fileType: string) => {
    return <FileImage className="h-4 w-4" />;
  };

  const getFileTypeBadge = (fileType: string) => {
    const variants: { [key: string]: 'default' | 'secondary' | 'destructive' | 'outline' } = {
      'image': 'default',
      'pdf': 'secondary',
      'doc': 'outline',
      'other': 'destructive'
    };
    return variants[fileType] || 'outline';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Uploads</CardTitle>
          <CardDescription>Your recently uploaded files</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Uploads</CardTitle>
        <CardDescription>Your recently uploaded files</CardDescription>
      </CardHeader>
      <CardContent>
        {uploads.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileImage className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No uploads yet</p>
            <p className="text-sm">Upload some files to see them here</p>
          </div>
        ) : (
          <div className="space-y-4" data-testid="recent-uploads">
            {uploads.map((upload) => (
              <div
                key={upload.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {getFileTypeIcon(upload.file_type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{upload.original_filename}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <HardDrive className="h-3 w-3" />
                        {formatFileSize(upload.file_size_bytes)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(upload.created_at), { addSuffix: true })}
                      </span>
                      {upload.perceptual_hash && (
                        <span className="flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          Hash: {upload.perceptual_hash.substring(0, 8)}...
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getFileTypeBadge(upload.file_type)}>
                    {upload.file_type}
                  </Badge>
                  {upload.similarity_score !== null && upload.similarity_score !== undefined && (
                    <Badge variant="secondary">
                      {Math.round(upload.similarity_score * 100)}% match
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}