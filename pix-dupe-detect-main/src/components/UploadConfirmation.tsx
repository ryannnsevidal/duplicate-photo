import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  Clock, 
  FileIcon, 
  BarChart3,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadStats {
  totalFiles: number;
  totalSize: number;
  successCount: number;
  failureCount: number;
  duplicateCount: number;
}

interface UploadConfirmationProps {
  files: Array<{
    name: string;
    size: number;
    source: string;
  }>;
  onConfirm: () => void;
  onCancel: () => void;
}

interface AnalysisResultsProps {
  stats: UploadStats;
  onContinue: () => void;
}

export function UploadConfirmation({ files, onConfirm, onCancel }: UploadConfirmationProps) {
  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Confirm Upload
          </CardTitle>
          <CardDescription>
            Review your files before uploading and analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total Files:</span>
              <span className="font-medium">{files.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total Size:</span>
              <span className="font-medium">{formatFileSize(totalSize)}</span>
            </div>
          </div>

          <div className="max-h-32 overflow-y-auto space-y-1">
            {files.map((file, index) => (
              <div key={index} className="flex items-center gap-2 text-sm p-2 bg-muted/50 rounded">
                <FileIcon className="h-4 w-4" />
                <span className="flex-1 truncate">{file.name}</span>
                <Badge variant="outline" className="text-xs">
                  {file.source}
                </Badge>
              </div>
            ))}
          </div>

          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Files will be uploaded and analyzed for duplicates. This may take a few moments.
            </AlertDescription>
          </Alert>

          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel} className="flex-1">
              Cancel
            </Button>
            <Button onClick={onConfirm} className="flex-1">
              <ArrowRight className="h-4 w-4 mr-2" />
              Upload & Analyze
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function AnalysisResults({ stats, onContinue }: AnalysisResultsProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Analysis Complete
          </CardTitle>
          <CardDescription>
            Files have been successfully uploaded and analyzed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{stats.successCount}</div>
              <div className="text-sm text-green-700">Uploaded</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-600">{stats.duplicateCount}</div>
              <div className="text-sm text-orange-700">Duplicates</div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Total Files Processed:</span>
              <span className="font-medium">{stats.totalFiles}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Total Size:</span>
              <span className="font-medium">{formatFileSize(stats.totalSize)}</span>
            </div>
            {stats.failureCount > 0 && (
              <div className="flex justify-between text-sm">
                <span>Failed:</span>
                <span className="font-medium text-red-600">{stats.failureCount}</span>
              </div>
            )}
          </div>

          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              {stats.duplicateCount > 0 
                ? `${stats.duplicateCount} duplicate(s) were found and skipped to save storage space.`
                : 'No duplicates detected. All files are unique.'
              }
            </AlertDescription>
          </Alert>

          <Button onClick={onContinue} className="w-full">
            <BarChart3 className="h-4 w-4 mr-2" />
            View Dashboard
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface UploadProgressProps {
  message: string;
  progress?: number;
}

export function UploadProgress({ message, progress }: UploadProgressProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Processing Files
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-muted-foreground">{message}</p>
          </div>
          
          {progress !== undefined && (
            <Progress value={progress} className="w-full" />
          )}
          
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Please wait while we upload and analyze your files for duplicates.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </motion.div>
  );
}