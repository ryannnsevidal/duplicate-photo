import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  Users, 
  Activity, 
  AlertTriangle, 
  Database, 
  Cloud, 
  FileText,
  TrendingUp,
  Lock,
  Globe,
  Zap,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { AdminSessionManager } from '@/components/AdminSessionManager';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { AdminCloudUpload } from '@/components/AdminCloudUpload';
import { FileAnalysisWorkflow } from '@/components/FileAnalysisWorkflow';

interface SecurityLog {
  id: string;
  action: string;
  user_id: string;
  success: boolean;
  created_at: string;
  ip_address: unknown;
  error_message?: string;
}

interface UploadLog {
  id: string;
  user_id: string;
  original_filename: string;
  file_size_bytes: number;
  upload_status: string;
  similarity_score?: number;
  cloud_provider: string;
  created_at: string;
}

interface DashboardStats {
  totalUsers: number;
  totalUploads: number;
  totalSecurityEvents: number;
  duplicatesDetected: number;
  storageUsed: number;
}

export function AdminDashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalUploads: 0,
    totalSecurityEvents: 0,
    duplicatesDetected: 0,
    storageUsed: 0
  });
  const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
  const [uploadLogs, setUploadLogs] = useState<UploadLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [recentUploads, setRecentUploads] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/signin');
      return;
    }

    if (user) {
      fetchDashboardData();
    }
  }, [user, loading, navigate]);

  const handleCloudFileUpload = async (file: any) => {
    try {
      console.log('🔧 Starting cloud file upload:', file);
      
      // Call the upload handler edge function
      const { data, error } = await supabase.functions.invoke('upload-handler', {
        body: {
          file_name: file.name,
          file_size: file.size,
          download_url: file.downloadUrl,
          source: file.source,
          user_id: user?.id
        }
      });

      if (error) {
        console.error('❌ Cloud upload failed:', error);
        toast({
          title: "Upload Failed",
          description: error.message || "Failed to upload file from cloud",
          variant: "destructive",
        });
        return;
      }

      console.log('✅ Cloud upload successful:', data);
      toast({
        title: "Upload Successful", 
        description: `${file.name} uploaded successfully from ${file.source}`,
      });

      // Refresh dashboard data to show new upload
      fetchDashboardData();
      
    } catch (error) {
      console.error('❌ Unexpected cloud upload error:', error);
      toast({
        title: "Upload Error",
        description: "An unexpected error occurred during upload",
        variant: "destructive",
      });
    }
  };

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);

      // Fetch security logs with error handling
      const { data: securityData, error: securityError } = await supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (securityError) console.error('Security logs error:', securityError);

      // Fetch upload logs with error handling
      const { data: uploadData, error: uploadError } = await supabase
        .from('file_upload_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (uploadError) console.error('Upload logs error:', uploadError);

      // Calculate stats with proper count queries
      const { count: userCount, error: userError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (userError) console.error('User count error:', userError);

      const { count: uploadCount, error: uploadCountError } = await supabase
        .from('file_upload_logs')
        .select('*', { count: 'exact', head: true });

      if (uploadCountError) console.error('Upload count error:', uploadCountError);

      const { count: securityCount, error: securityCountError } = await supabase
        .from('security_audit_log')
        .select('*', { count: 'exact', head: true });

      if (securityCountError) console.error('Security count error:', securityCountError);

      const { count: duplicateCount, error: duplicateError } = await supabase
        .from('file_upload_logs')
        .select('*', { count: 'exact', head: true })
        .not('similarity_score', 'is', null);

      if (duplicateError) console.error('Duplicate count error:', duplicateError);

      const { data: storageData, error: storageError } = await supabase
        .from('file_upload_logs')
        .select('file_size_bytes');

      if (storageError) console.error('Storage data error:', storageError);

      const totalStorage = storageData?.reduce((sum, file) => sum + (file.file_size_bytes || 0), 0) || 0;

      console.log('Dashboard stats:', {
        userCount,
        uploadCount,
        securityCount,
        duplicateCount,
        totalStorage: totalStorage
      });

      setStats({
        totalUsers: userCount || 0,
        totalUploads: uploadCount || 0,
        totalSecurityEvents: securityCount || 0,
        duplicatesDetected: duplicateCount || 0,
        storageUsed: totalStorage
      });

      setSecurityLogs(securityData || []);
      setUploadLogs(uploadData || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="h-12 w-12 bg-gradient-to-br from-primary to-primary/80 rounded-full flex items-center justify-center mx-auto mb-4">
            <Activity className="h-6 w-6 animate-pulse text-primary-foreground" />
          </div>
          <p className="text-muted-foreground">Loading admin dashboard...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                <Shield className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">System monitoring and security overview</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                <CheckCircle className="h-3 w-3 mr-1" />
                System Healthy
              </Badge>
              <Button onClick={() => navigate('/api-validation')} variant="outline" size="sm" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                API Validation
              </Button>
              <Button onClick={() => navigate('/')} variant="outline">
                Back to App
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUsers}</div>
              <p className="text-xs text-muted-foreground">Active accounts</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">File Uploads</CardTitle>
              <Cloud className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalUploads}</div>
              <p className="text-xs text-muted-foreground">Total processed</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Duplicates Found</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.duplicatesDetected}</div>
              <p className="text-xs text-muted-foreground">AI detected</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Security Events</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalSecurityEvents}</div>
              <p className="text-xs text-muted-foreground">Logged events</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatBytes(stats.storageUsed)}</div>
              <p className="text-xs text-muted-foreground">Total files</p>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Monitoring */}
        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Cloud className="h-4 w-4" />
              Cloud Upload
            </TabsTrigger>
            <TabsTrigger value="analysis" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              AI Analysis
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Security Logs
            </TabsTrigger>
            <TabsTrigger value="uploads" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Upload Activity
            </TabsTrigger>
            <TabsTrigger value="system" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              System Health
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-6">
            <AdminCloudUpload 
              onUploadComplete={(stats) => {
                console.log('🎯 Admin upload completed with stats:', stats);
                toast({
                  title: "Upload Session Complete",
                  description: `${stats.successCount} files uploaded successfully, ${stats.failureCount} failed`,
                });
                
                // Refresh dashboard data to show new uploads
                fetchDashboardData();
                
                // Update recent uploads for analysis (using uploadLogs data instead)
                setRecentUploads(prev => [...prev, ...uploadLogs.slice(0, 5)]);
              }}
            />
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <FileAnalysisWorkflow 
              uploadedFiles={recentUploads}
              onAnalysisComplete={(results) => {
                console.log('🎯 Analysis completed with results:', results);
                toast({
                  title: "Analysis Complete",
                  description: `Found ${results.duplicatesFound} duplicates with ${results.potentialSavings} potential savings`,
                });
              }}
            />
          </TabsContent>

          <TabsContent value="security" className="space-y-6">
            <AdminSessionManager />
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Recent Security Events
                </CardTitle>
                <CardDescription>
                  Real-time security audit trail and authentication events
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {securityLogs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No security events found</p>
                  ) : (
                    securityLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          {log.success ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <div>
                            <div className="font-medium">{log.action}</div>
                            <div className="text-sm text-muted-foreground">
                               IP: {String(log.ip_address) || 'Unknown'}
                               {log.error_message && ` • ${log.error_message}`}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">{formatDate(log.created_at)}</div>
                          <Badge variant={log.success ? "default" : "destructive"} className="text-xs">
                            {log.success ? "Success" : "Failed"}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="uploads" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Cloud className="h-5 w-5" />
                  Recent File Uploads
                </CardTitle>
                <CardDescription>
                  File processing activity and deduplication results
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {uploadLogs.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No upload activity found</p>
                  ) : (
                    uploadLogs.map((log) => (
                      <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border">
                        <div className="flex items-center gap-3">
                          <FileText className="h-4 w-4 text-primary" />
                          <div>
                            <div className="font-medium truncate max-w-64">{log.original_filename}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatBytes(log.file_size_bytes)} • {log.cloud_provider}
                              {log.similarity_score && ` • ${(log.similarity_score * 100).toFixed(1)}% duplicate`}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm">{formatDate(log.created_at)}</div>
                          <Badge 
                            variant={log.upload_status === 'uploaded' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {log.upload_status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    System Status
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Database</span>
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Healthy
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Authentication</span>
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">File Processing</span>
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Operational
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Cloud Sync</span>
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Connected
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Platform Features
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">JWT Authentication</span>
                    <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                      Enabled
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Row Level Security</span>
                    <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Rate Limiting</span>
                    <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                      Enforced
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">AI Deduplication</span>
                    <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20">
                      <Zap className="h-3 w-3 mr-1" />
                      Powered
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}