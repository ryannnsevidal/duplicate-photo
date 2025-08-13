import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CloudIcon, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ImportResult {
  name: string;
  success: boolean;
  cloud_path?: string;
  size?: number;
  error?: string;
}

interface ImportJobSummary {
  total: number;
  successful: number;
  failed: number;
}

interface SecureCloudIntegrationProps {
  onImportComplete?: (results: ImportResult[], summary: ImportJobSummary) => void;
  disabled?: boolean;
}

export function SecureCloudIntegration({ onImportComplete, disabled }: SecureCloudIntegrationProps) {
  const [loading, setLoading] = useState({ google: false, dropbox: false, photos: false });
  const [error, setError] = useState<string | null>(null);
  const [importResults, setImportResults] = useState<ImportResult[] | null>(null);
  const [importSummary, setImportSummary] = useState<ImportJobSummary | null>(null);
  const { toast } = useToast();

  const resetResults = useCallback(() => {
    setImportResults(null);
    setImportSummary(null);
    setError(null);
  }, []);

  const handleGoogleDriveImport = useCallback(async () => {
    setLoading(prev => ({ ...prev, google: true }));
    setError(null);
    resetResults();

    try {
      // Get Google credentials for picker
      const { data: credentials, error: credError } = await supabase.functions.invoke('cloud-credentials', {
        body: { action: 'get_google_credentials' }
      });

      if (credError || !credentials?.success) {
        throw new Error('Google Drive credentials not available');
      }

      const { client_id: clientId, api_key: apiKey } = credentials;

      // Load Google APIs
      if (!window.gapi) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://apis.google.com/js/api.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      // Initialize Google APIs
      await new Promise((resolve) => {
        window.gapi.load('auth2:picker', resolve);
      });

      // Initialize auth
      const authInstance = await window.gapi.auth2.init({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.readonly'
      });

      // Sign in user
      const user = await authInstance.signIn();
      const accessToken = user.getAuthResponse().access_token;

      // Open file picker
      const picker = new window.google.picker.PickerBuilder()
        .addView(window.google.picker.ViewId.DOCS)
        .setOAuthToken(accessToken)
        .setDeveloperKey(apiKey)
        .setCallback(async (data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            const items = data.docs.map((doc: any) => ({
              id: doc.id,
              name: doc.name,
              mimeType: doc.mimeType,
              size: doc.sizeBytes
            }));

            // Import files securely via edge function
            await importFiles('google-drive', items, accessToken);
          }
        })
        .build();

      picker.setVisible(true);

    } catch (error: any) {
      console.error('Google Drive import error:', error);
      setError('Failed to initialize Google Drive import');
      toast({
        title: "Google Drive Error",
        description: error.message || "Failed to connect to Google Drive",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, google: false }));
    }
  }, [toast, resetResults]);

  const handleDropboxImport = useCallback(async () => {
    setLoading(prev => ({ ...prev, dropbox: true }));
    setError(null);
    resetResults();

    try {
      // Get Dropbox credentials
      const { data: credentials, error: credError } = await supabase.functions.invoke('cloud-credentials', {
        body: { action: 'get_dropbox_credentials' }
      });

      if (credError || !credentials?.success) {
        throw new Error('Dropbox credentials not available');
      }

      const { app_key: appKey } = credentials;

      // Load Dropbox Chooser
      if (!window.Dropbox) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://www.dropbox.com/static/api/2/dropins.js';
          script.setAttribute('data-app-key', appKey);
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      // Open Dropbox Chooser
      window.Dropbox.choose({
        success: async (files: any[]) => {
          const items = files.map(file => ({
            link: file.link,
            name: file.name,
            size: file.bytes
          }));

          // Import files securely via edge function
          await importFiles('dropbox', items);
        },
        linkType: 'direct',
        multiselect: true,
        extensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt', '.doc', '.docx'],
      });

    } catch (error: any) {
      console.error('Dropbox import error:', error);
      setError('Failed to initialize Dropbox import');
      toast({
        title: "Dropbox Error",
        description: error.message || "Failed to connect to Dropbox",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, dropbox: false }));
    }
  }, [toast, resetResults]);

  const importFiles = async (provider: string, items: any[], accessToken?: string) => {
    try {
      setLoading(prev => ({ ...prev, [provider.split('-')[0]]: true }));

      const { data: result, error } = await supabase.functions.invoke('secure-cloud-import', {
        body: {
          provider,
          items,
          accessToken
        }
      });

      if (error) {
        throw new Error(`Import failed: ${error.message}`);
      }

      if (!result.success) {
        throw new Error(result.error || 'Import failed');
      }

      setImportResults(result.results);
      setImportSummary(result.summary);
      
      if (onImportComplete) {
        onImportComplete(result.results, result.summary);
      }

      toast({
        title: "Import Completed",
        description: `Successfully imported ${result.summary.successful} of ${result.summary.total} files`,
        variant: result.summary.failed > 0 ? "default" : "default",
      });

    } catch (error: any) {
      console.error('File import error:', error);
      setError(`Import failed: ${error.message}`);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import files",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ 
        ...prev, 
        google: false, 
        dropbox: false, 
        photos: false 
      }));
    }
  };

  if (importResults && importSummary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Import Results
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Badge variant="default">
              {importSummary.successful} Successful
            </Badge>
            {importSummary.failed > 0 && (
              <Badge variant="destructive">
                {importSummary.failed} Failed
              </Badge>
            )}
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2">
            {importResults.map((result, index) => (
              <div key={index} className="flex items-center gap-2 p-2 border rounded">
                {result.success ? (
                  <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{result.name}</div>
                  {result.success && result.size && (
                    <div className="text-sm text-muted-foreground">
                      {(result.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  )}
                  {!result.success && result.error && (
                    <div className="text-sm text-red-600">{result.error}</div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <Button onClick={resetResults} variant="outline" className="w-full">
            Import More Files
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Google Drive */}
        <Button
          onClick={handleGoogleDriveImport}
          disabled={disabled || loading.google}
          variant="outline"
          className="h-auto p-6 flex flex-col items-center gap-3"
        >
          {loading.google ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <CloudIcon className="h-8 w-8 text-blue-600" />
          )}
          <div className="text-center">
            <div className="font-semibold">Google Drive</div>
            <div className="text-sm text-muted-foreground">
              Securely import files from Google Drive
            </div>
          </div>
        </Button>

        {/* Dropbox */}
        <Button
          onClick={handleDropboxImport}
          disabled={disabled || loading.dropbox}
          variant="outline"
          className="h-auto p-6 flex flex-col items-center gap-3"
        >
          {loading.dropbox ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <CloudIcon className="h-8 w-8 text-blue-500" />
          )}
          <div className="text-center">
            <div className="font-semibold">Dropbox</div>
            <div className="text-sm text-muted-foreground">
              Securely import files from Dropbox
            </div>
          </div>
        </Button>
      </div>

      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
        🔒 Files are processed securely through our servers and stored in encrypted storage. 
        Your cloud credentials are never exposed to the browser.
      </div>
    </div>
  );
}