import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CloudIcon, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface CloudFile {
  name: string;
  size: number;
  downloadUrl: string;
  source: 'google-drive' | 'dropbox';
}

interface EnhancedCloudIntegrationProps {
  onFileSelected: (file: CloudFile) => void;
  disabled?: boolean;
}

export function EnhancedCloudIntegration({ onFileSelected, disabled }: EnhancedCloudIntegrationProps) {
  const [loading, setLoading] = useState({ google: false, dropbox: false });
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const loadGooglePicker = useCallback(async () => {
    setLoading(prev => ({ ...prev, google: true }));
    setError(null);

    try {
      console.log('🔄 Fetching Google credentials...');
      console.log('🔍 Testing cloud-credentials function...');
      // Get credentials from Supabase
      const { data: credentials, error } = await supabase.functions.invoke('cloud-credentials', {
        body: { action: 'get_google_credentials' }
      });

      console.log('📥 Raw response from cloud-credentials:', { data: credentials, error });

      let clientId = credentials?.client_id as string | undefined;
      let apiKey = credentials?.api_key as string | undefined;

      if (error || !credentials?.success || !clientId || !apiKey) {
        console.warn('⚠️ Falling back to VITE_ env vars for Google credentials');
        clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || clientId;
        apiKey = import.meta.env.VITE_GOOGLE_API_KEY || apiKey;
      }

      if (!clientId || !apiKey) {
        const message = error?.message || credentials?.error || 'Failed to load Google credentials';
        throw new Error(message);
      }

      console.log('✅ Google credentials loaded:', { clientId: !!clientId, apiKey: !!apiKey });

      // Load Google Identity Services (new approach)
      if (!window.google?.accounts) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      // Also ensure gapi client is available
      if (!window.gapi) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://apis.google.com/js/api.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      // Validate credentials before use
      if (!clientId) {
        throw new Error('Google Client ID is missing or invalid');
      }
      if (!apiKey) {
        throw new Error('Google API Key is missing or invalid');
      }
      
      console.log('🔧 Initializing Google APIs and OAuth...');

      // Mark OAuth popup start to prevent session timeout
      document.body.setAttribute('data-oauth-popup', 'google');

      // Load gapi client and picker modules
      await new Promise<void>((resolve) => {
        window.gapi.load('picker', () => resolve());
      });

      // Use Google Identity Services token client to obtain access token
      // @ts-ignore
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/drive.readonly',
        callback: () => {},
      });

      const oauthToken: string = await new Promise((resolve, reject) => {
        let resolved = false;
        // Replace callback to capture the token directly
        // @ts-ignore
        tokenClient.callback = (resp: any) => {
          if (resp && resp.access_token) {
            resolved = true;
            resolve(resp.access_token);
          } else {
            reject(new Error('Failed to obtain access token'));
          }
        };
        try {
          tokenClient.requestAccessToken({ prompt: 'consent' });
          // Timeout guard
          setTimeout(() => {
            if (!resolved) {
              reject(new Error('Timed out obtaining Google access token'));
            }
          }, 15000);
        } catch (e) {
          reject(e);
        }
      });

      if (!oauthToken) {
        throw new Error('Failed to obtain Google OAuth token');
      }
      
      console.log('✅ Obtained Google OAuth token');

      // Build and show the Picker with OAuth token
      const docsView = new window.google.picker.DocsView()
        .setIncludeFolders(true)
        .setSelectFolderEnabled(true);

      const picker = new window.google.picker.PickerBuilder()
        .addView(docsView)
        .addView(window.google.picker.ViewId.DOCS)
        .addView(window.google.picker.ViewId.DOCS_IMAGES)
        .addView(window.google.picker.ViewId.DOCS_VIDEOS)
        .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
        .enableFeature(window.google.picker.Feature.SIMPLE_UPLOAD_ENABLED)
        .setDeveloperKey(apiKey)
        .setOAuthToken(oauthToken)
        .setCallback((data: any) => {
          // Remove OAuth popup marker and resume session timeout
          document.body.removeAttribute('data-oauth-popup');

          if (data.action === window.google.picker.Action.PICKED) {
            const files = data.docs || [];
            files.forEach((file: any) => {
              onFileSelected({
                name: file.name,
                size: file.sizeBytes || 0,
                downloadUrl: file.downloadUrl || file.embedUrl,
                source: 'google-drive'
              });
            });
          }
        })
        .build();

      picker.setVisible(true);

    } catch (error: any) {
      console.error('Google Drive integration error:', error);
      setError('Failed to initialize Google Drive. Please try again.');
      toast({
        title: "Google Drive Error",
        description: error.message || "Failed to connect to Google Drive",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, google: false }));
    }
  }, [onFileSelected, toast]);

  const loadDropboxChooser = useCallback(async () => {
    setLoading(prev => ({ ...prev, dropbox: true }));
    setError(null);

    try {
      console.log('🔄 Fetching Dropbox credentials...');
      console.log('🔍 Testing cloud-credentials function for Dropbox...');
      // Get credentials from Supabase
      const { data: credentials, error } = await supabase.functions.invoke('cloud-credentials', {
        body: { action: 'get_dropbox_credentials' }
      });

      console.log('📥 Raw Dropbox response from cloud-credentials:', { data: credentials, error });

      let appKey = credentials?.app_key as string | undefined;
      if (error || !credentials?.success || !appKey) {
        console.warn('⚠️ Falling back to VITE_ env var for Dropbox app key');
        appKey = import.meta.env.VITE_DROPBOX_APP_KEY || appKey;
      }

      if (!appKey) {
        const message = error?.message || credentials?.error || 'Failed to load Dropbox credentials';
        throw new Error(message);
      }

      console.log('✅ Dropbox credentials loaded:', { appKey: !!appKey });

      // Validate credentials before use
      if (!appKey) {
        throw new Error('Dropbox App Key is missing or invalid');
      }
      
      console.log('🔧 Loading Dropbox with app key:', appKey);
      
      // Ensure we load dropins.js with the correct app key
      const existing = document.querySelector('script[src*="dropins.js"]') as HTMLScriptElement | null;
      if (existing) {
        const existingKey = existing.getAttribute('data-app-key');
        if (existingKey !== appKey) {
          console.warn('🔁 Replacing existing Dropbox script with correct app key');
          existing.remove();
          // Reset global to force reload
          // @ts-ignore
          window.Dropbox = undefined;
        }
      }

      // Load Dropbox Chooser if not already loaded (or after replacement)
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

      // Validate Dropbox API is available
      if (!window.Dropbox || !window.Dropbox.choose) {
        throw new Error('Dropbox API failed to load properly');
      }

      // Open Dropbox Chooser with app key validation
      console.log('🔧 Opening Dropbox chooser...');
      // Mark OAuth popup start to prevent session timeout
      document.body.setAttribute('data-oauth-popup', 'dropbox');
      window.Dropbox.choose({
        success: (files: any[]) => {
          // Remove OAuth popup marker and resume session timeout
          document.body.removeAttribute('data-oauth-popup');
          console.log('✅ Dropbox files selected:', files.length);
          files.forEach(file => {
            onFileSelected({
              name: file.name,
              size: file.bytes,
              downloadUrl: file.link,
              source: 'dropbox'
            });
          });
        },
        cancel: () => {
          // Remove OAuth popup marker and resume session timeout
          document.body.removeAttribute('data-oauth-popup');
          console.log('❌ Dropbox chooser cancelled');
        },
        linkType: 'direct',
        multiselect: true,
        // Allow any file type by omitting extensions filter
        folderselect: false,
      });

    } catch (error: any) {
      console.error('Dropbox integration error:', error);
      setError('Failed to initialize Dropbox. Please try again.');
      toast({
        title: "Dropbox Error",
        description: error.message || "Failed to connect to Dropbox",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, dropbox: false }));
    }
  }, [onFileSelected, toast]);

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
          onClick={loadGooglePicker}
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
              Select files from your Google Drive
            </div>
          </div>
        </Button>

        {/* Dropbox */}
        <Button
          onClick={loadDropboxChooser}
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
              Select files from your Dropbox
            </div>
          </div>
        </Button>
      </div>
    </div>
  );
}