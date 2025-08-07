import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  FileIcon, 
  CheckCircle, 
  AlertTriangle, 
  History,
  Shield,
  Users
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useState as useStateEffect, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SessionSecurityDashboard } from '@/components/SessionSecurityDashboard';
import { SecureFileUpload } from '@/components/SecureFileUpload';
import { Link } from 'react-router-dom';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
  status: 'uploaded' | 'duplicate' | 'error';
  duplicates?: any[];
}

export function DashboardPage() {
  const [recentUploads, setRecentUploads] = useState<UploadedFile[]>([]);
  const [showSecurityDashboard, setShowSecurityDashboard] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch recent uploads
  const fetchRecentUploads = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('file_upload_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      
      const uploads: UploadedFile[] = data.map(file => ({
        id: file.id,
        name: file.original_filename,
        size: file.file_size_bytes,
        uploadedAt: file.created_at,
        status: file.duplicate_of ? 'duplicate' : 'uploaded',
        duplicates: file.duplicate_of ? [] : undefined
      }));
      
      setRecentUploads(uploads);
    } catch (error) {
      console.error('Failed to fetch uploads:', error);
    }
  }, [user]);

  useEffect(() => {
    fetchRecentUploads();
  }, [fetchRecentUploads]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploaded': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'duplicate': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'error': return <FileIcon className="h-4 w-4 text-red-600" />;
      default: return <FileIcon className="h-4 w-4" />;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/10 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>Please sign in to access the dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/signin">
              <Button className="w-full">Sign In</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/10">
      {/* Header */}
      <div className="border-b bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">File Upload Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, {user.email}</p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                onClick={() => setShowSecurityDashboard(!showSecurityDashboard)}
              >
                <Shield className="h-4 w-4 mr-2" />
                Security
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Security Dashboard */}
        {showSecurityDashboard && (
          <SessionSecurityDashboard className="mb-8" />
        )}

        {/* Upload Area */}
        <SecureFileUpload />

        {/* Recent Uploads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Uploads
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentUploads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No files uploaded yet</p>
                <p className="text-sm">Upload your first file using the area above</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentUploads.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(file.status)}
                      <div>
                        <p className="font-medium">{file.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatFileSize(file.size)} • {new Date(file.uploadedAt).toLocaleDateString()}
                          {file.status === 'duplicate' && (
                            <Badge variant="secondary" className="ml-2">
                              Duplicate
                            </Badge>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}