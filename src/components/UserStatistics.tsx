import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart3, Trash2, Upload, HardDrive } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface UserStats {
  totalFiles: number;
  deletedFiles: number;
  spaceSaved: number;
  lastActivity: string | null;
}

export function UserStatistics() {
  const { user } = useAuth();
  const [stats, setStats] = useState<UserStats>({
    totalFiles: 0,
    deletedFiles: 0,
    spaceSaved: 0,
    lastActivity: null
  });
  const [loading, setLoading] = useState(true);

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  const fetchStats = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Fetch user statistics
      const { data: userStats, error: statsError } = await supabase
        .from('user_statistics')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (statsError && statsError.code !== 'PGRST116') {
        console.error('Error fetching user stats:', statsError);
      }

      // Fetch recent deleted files
      const { data: deletedFiles, error: deletedError } = await supabase
        .from('deleted_files_log')
        .select('*')
        .eq('user_id', user.id)
        .order('deleted_at', { ascending: false })
        .limit(10);

      if (deletedError) {
        console.error('Error fetching deleted files:', deletedError);
      }

      // Calculate total space saved from deleted files
      const totalSpaceSaved = deletedFiles?.reduce((sum, file) => sum + file.space_saved_bytes, 0) || 0;

      setStats({
        totalFiles: userStats?.total_files_uploaded || 0,
        deletedFiles: userStats?.total_files_deleted || 0,
        spaceSaved: totalSpaceSaved,
        lastActivity: userStats?.last_activity || null
      });

    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, [user]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Your Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
              <div className="h-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Your Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Upload className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-sm text-muted-foreground">Files Uploaded</p>
            <p className="text-2xl font-bold text-blue-600">{stats.totalFiles}</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Trash2 className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-sm text-muted-foreground">Files Deleted</p>
            <p className="text-2xl font-bold text-red-600">{stats.deletedFiles}</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <HardDrive className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-sm text-muted-foreground">Space Saved</p>
            <p className="text-2xl font-bold text-green-600">{formatBytes(stats.spaceSaved)}</p>
          </div>
          
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <BarChart3 className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-sm text-muted-foreground">Last Activity</p>
            <p className="text-sm font-medium text-purple-600">{formatDate(stats.lastActivity)}</p>
          </div>
        </div>

        {stats.totalFiles === 0 && (
          <div className="mt-4 text-center text-muted-foreground">
            <p>No files uploaded yet. Start by uploading some photos!</p>
          </div>
        )}

        {stats.deletedFiles > 0 && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              🎉 You've saved {formatBytes(stats.spaceSaved)} of storage space by removing {stats.deletedFiles} duplicate files!
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
