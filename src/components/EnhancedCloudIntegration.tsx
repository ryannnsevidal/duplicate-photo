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

      if (error) {
        console.error('❌ Supabase function error:', error);
        throw new Error(`Failed to load Google credentials: ${error.message}`);
      }

      if (!credentials || !credentials.success) {
        console.error('❌ Invalid credentials response:', credentials);
        throw new Error(credentials?.error || 'Failed to load Google credentials');
      }

      const { client_id: clientId, api_key: apiKey } = credentials;
      
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

      // Validate credentials before use
      if (!clientId) {
        throw new Error('Google Client ID is missing or invalid');
      }
      if (!apiKey) {
        throw new Error('Google API Key is missing or invalid');
      }
      
      console.log('🔧 Initializing Google Identity Services...');
      
      // Initialize Google Identity Services
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: any) => {
          try {
            // Handle the Google sign-in response
            const credential = response.credential;
            
            // For file picking, we need the older Picker API with Drive scope
            // Load the Google API for Picker
            if (!window.gapi) {
              await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://apis.google.com/js/api.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
              });
            }

            await new Promise((resolve) => {
              window.gapi.load('picker', resolve);
            });

            // Use the OAuth token for Picker
            const picker = new window.google.picker.PickerBuilder()
              .addView(window.google.picker.ViewId.DOCS)
              .setDeveloperKey(apiKey)
              .setCallback((data: any) => {
                if (data.action === window.google.picker.Action.PICKED) {
                  const file = data.docs[0];
                  onFileSelected({
                    name: file.name,
                    size: file.sizeBytes || 0,
                    downloadUrl: file.downloadUrl || file.embedUrl,
                    source: 'google-drive'
                  });
                }
              })
              .build();

            picker.setVisible(true);
          } catch (error) {
            console.error('Google picker error:', error);
            throw error;
          }
        }
      });

      // Show the Google sign-in prompt
      window.google.accounts.id.prompt();

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

      if (error) {
        console.error('❌ Supabase function error:', error);
        throw new Error(`Failed to load Dropbox credentials: ${error.message}`);
      }

      if (!credentials || !credentials.success) {
        console.error('❌ Invalid credentials response:', credentials);
        throw new Error(credentials?.error || 'Failed to load Dropbox credentials');
      }

      const { app_key: appKey } = credentials;
      
      console.log('✅ Dropbox credentials loaded:', { appKey: !!appKey });

      // Validate credentials before use
      if (!appKey) {
        throw new Error('Dropbox App Key is missing or invalid');
      }
      
      console.log('🔧 Loading Dropbox with app key:', appKey);
      
      // Load Dropbox Chooser if not already loaded
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
      window.Dropbox.choose({
        success: (files: any[]) => {
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
          console.log('❌ Dropbox chooser cancelled');
        },
        linkType: 'direct',
        multiselect: true,
        extensions: ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.txt', '.doc', '.docx'],
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