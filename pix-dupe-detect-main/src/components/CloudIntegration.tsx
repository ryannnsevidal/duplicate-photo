import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Cloud, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

// Declare global types
// Remove duplicate global declarations - using the ones from global.d.ts

interface CloudFile {
  id: string;
  name: string;
  size: number;
  downloadUrl: string;
  source: 'google-drive' | 'dropbox';
}

interface CloudIntegrationProps {
  onFileSelected: (file: CloudFile) => void;
  disabled?: boolean;
}

export function CloudIntegration({ onFileSelected, disabled }: CloudIntegrationProps) {
  const [googleInitialized, setGoogleInitialized] = useState(false);
  const [dropboxInitialized, setDropboxInitialized] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleApiLoaded, setGoogleApiLoaded] = useState(false);
  const [dropboxApiLoaded, setDropboxApiLoaded] = useState(false);
  const { toast } = useToast();

  // Load Google APIs
  const loadGoogleAPI = useCallback(async () => {
    if (window.gapi && googleApiLoaded) {
      return Promise.resolve();
    }

    if (window.gapi && !googleApiLoaded) {
      setGoogleApiLoaded(true);
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://apis.google.com/js/api.js';
      script.onload = () => {
        setGoogleApiLoaded(true);
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load Google API'))
      };
      document.head.appendChild(script);
    });
  }, [googleApiLoaded]);

  // Load Dropbox API dynamically with app key
  const loadDropboxAPI = useCallback(async () => {
    if (window.Dropbox || dropboxApiLoaded) {
      setDropboxApiLoaded(true);
      return;
    }

    try {
      console.log('🔧 Loading Dropbox credentials...');
      
      // Get Dropbox app key from backend
      const { data: credentials, error } = await supabase.functions.invoke('cloud-credentials', {
        body: { action: 'get_dropbox_credentials' }
      });

      if (error || !credentials?.app_key) {
        console.error('❌ Dropbox credentials error:', error);
        console.warn('⚠️ Dropbox not configured, API key missing');
        setDropboxApiLoaded(false);
        return;
      }

      console.log('✅ Dropbox credentials retrieved, app_key found');

      return new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://www.dropbox.com/static/api/2/dropins.js';
        script.setAttribute('data-app-key', credentials.app_key);
        script.onload = () => {
          console.log('✅ Dropbox API script loaded with app key');
          setDropboxApiLoaded(true);
          resolve();
        };
        script.onerror = () => {
          console.error('❌ Failed to load Dropbox API script');
          reject(new Error('Failed to load Dropbox API'))
        };
        document.head.appendChild(script);
      });
    } catch (error) {
      console.error('❌ Failed to load Dropbox credentials:', error);
      setDropboxApiLoaded(false);
    }
  }, [dropboxApiLoaded]);

  // Initialize APIs on mount - load in parallel for speed
  useEffect(() => {
    console.log('🔧 Initializing cloud APIs...');
    
    let isMounted = true;
    
    // Load both APIs simultaneously for faster initialization
    Promise.all([
      loadGoogleAPI().catch(err => {
        console.warn('⚠️ Google API load failed:', err);
        if (isMounted) setGoogleApiLoaded(false);
        return null;
      }),
      loadDropboxAPI().catch(err => {
        console.warn('⚠️ Dropbox API load failed:', err);
        if (isMounted) setDropboxApiLoaded(false);
        return null;
      })
    ]).then((results) => {
      if (isMounted) {
        console.log('✅ Cloud API initialization completed');
        console.log('Google loaded:', results[0] !== null);
        console.log('Dropbox loaded:', results[1] !== null);
        
        // Force re-render after all APIs are loaded
        setGoogleApiLoaded(prev => prev);
        setDropboxApiLoaded(prev => prev);
      }
    });
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Initialize Google Drive Picker
  const initializeGoogleDrive = useCallback(async () => {
    try {
      if (googleInitialized) return;
      
      setLoading(true);
      
      await loadGoogleAPI();
      
      // Get Google credentials from backend first
      const { data: credentials, error } = await supabase.functions.invoke('cloud-credentials', {
        body: { action: 'get_google_credentials' }
      });

      if (error || !credentials?.client_id || !credentials?.api_key) {
        throw new Error('Google Drive credentials not configured. Please contact administrator.');
      }

      // Load required Google APIs
      await new Promise<void>((resolve, reject) => {
        window.gapi.load('auth2:picker', {
          callback: resolve,
          onerror: reject
        });
      });

      // Initialize auth2
      if (!window.gapi.auth2.getAuthInstance()) {
        await window.gapi.auth2.init({
          client_id: credentials.client_id
        });
      }

      setGoogleInitialized(true);

    } catch (error: any) {
      console.error('Google Drive initialization failed:', error);
      toast({
        title: "Google Drive Error",
        description: error.message || "Failed to initialize Google Drive",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [loadGoogleAPI, toast, googleInitialized]);

  // Open Google Drive Picker
  const openGoogleDrivePicker = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Opening Google Drive picker...');

      if (!googleInitialized) {
        await initializeGoogleDrive();
      }

      if (!window.gapi?.auth2) {
        throw new Error('Google API not ready');
      }

      const authInstance = window.gapi.auth2.getAuthInstance();
      
  // Mark OAuth popup start to prevent session timeout
      document.body.setAttribute('data-oauth-popup', 'google');
      console.log('🔐 OAuth popup starting - session timeout paused');
      
      // Sign in with required scopes
      const user = await authInstance.signIn({
        scope: 'https://www.googleapis.com/auth/drive.readonly'
      });

      const authResponse = user.getAuthResponse();
      
      if (!authResponse?.access_token) {
        throw new Error('Failed to get Google access token');
      }

      // Get API key from backend
      const { data: credentials } = await supabase.functions.invoke('cloud-credentials', {
        body: { action: 'get_google_credentials' }
      });

      // Create and show picker
      const picker = new window.google.picker.PickerBuilder()
        .addView(window.google.picker.ViewId.DOCS)
        .addView(window.google.picker.ViewId.DOCS_IMAGES)
        .setOAuthToken(authResponse.access_token)
        .setDeveloperKey(credentials.api_key)
        .setCallback((data: any) => {
          // Remove OAuth popup marker and resume session timeout
          document.body.removeAttribute('data-oauth-popup');
          console.log('🔐 OAuth popup completed - session timeout resumed');
          
          if (data.action === window.google.picker.Action.PICKED) {
            const file = data.docs[0];
            const cloudFile = {
              id: file.id,
              name: file.name,
              size: file.sizeBytes || 0,
              downloadUrl: `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&access_token=${authResponse.access_token}`,
              source: 'google-drive' as const
            };
            
            console.log('✅ Google Drive file selected:', file.name);
            toast({
              title: "File Selected",
              description: `Selected: ${file.name} from Google Drive`,
            });
            
            onFileSelected(cloudFile);
          }
          setLoading(false);
        })
        .build();
      
      picker.setVisible(true);

    } catch (error: any) {
      // Remove OAuth popup marker on error
      document.body.removeAttribute('data-oauth-popup');
      
      console.error('❌ Google Drive picker error:', error);
      toast({
        title: "Google Drive Error",
        description: error.message || "Could not open Google Drive picker.",
        variant: "destructive",
      });
      setLoading(false);
    }
  }, [googleInitialized, initializeGoogleDrive, toast, onFileSelected]);

  // Open Dropbox Chooser
  const openDropboxChooser = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Opening Dropbox chooser...');
      
      await loadDropboxAPI();

      if (!window.Dropbox) {
        throw new Error('Dropbox API not loaded');
      }

      // Mark OAuth popup start to prevent session timeout
      document.body.setAttribute('data-oauth-popup', 'dropbox');
      console.log('🔐 OAuth popup starting - session timeout paused');

      window.Dropbox.choose({
        success: (files: any[]) => {
          // Remove OAuth popup marker and resume session timeout
          document.body.removeAttribute('data-oauth-popup');
          console.log('🔐 OAuth popup completed - session timeout resumed');
          
          const file = files[0];
          const cloudFile = {
            id: file.id || Date.now().toString(),
            name: file.name,
            size: file.bytes || 0,
            downloadUrl: file.link,
            source: 'dropbox' as const
          };
          
          console.log('✅ Dropbox file selected:', file.name);
          toast({
            title: "File Selected",
            description: `Selected: ${file.name} from Dropbox`,
          });
          
          onFileSelected(cloudFile);
          setLoading(false);
        },
        cancel: () => {
          // Remove OAuth popup marker and resume session timeout
          document.body.removeAttribute('data-oauth-popup');
          console.log('🔐 OAuth popup cancelled - session timeout resumed');
          setLoading(false);
        },
        linkType: "direct",
        multiselect: false,
        extensions: ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.txt', '.csv', '.doc', '.docx'],
        folderselect: false,
      });

    } catch (error: any) {
      // Remove OAuth popup marker on error
      document.body.removeAttribute('data-oauth-popup');
      
      console.error('❌ Dropbox chooser error:', error);
      toast({
        title: "Dropbox Error",
        description: error.message || "Could not open Dropbox chooser.",
        variant: "destructive",
      });
      setLoading(false);
    }
  }, [loadDropboxAPI, toast, onFileSelected]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Google Drive */}
        <div className="p-4 border rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-blue-600" />
              <span className="font-medium">Google Drive</span>
            </div>
            <Badge variant={googleApiLoaded ? "default" : "secondary"}>
              {googleApiLoaded ? "Ready" : "Loading..."}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Select files from your Google Drive
          </p>
          
          <Button
            onClick={openGoogleDrivePicker}
            disabled={disabled || loading || !googleApiLoaded}
            className="w-full"
            variant="outline"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Cloud className="h-4 w-4 mr-2" />
            )}
            Select from Google Drive
          </Button>
        </div>

        {/* Dropbox */}
        <div className="p-4 border rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cloud className="h-5 w-5 text-blue-700" />
              <span className="font-medium">Dropbox</span>
            </div>
            <Badge variant={dropboxApiLoaded ? "default" : "secondary"}>
              {dropboxApiLoaded ? "Ready" : "Loading..."}
            </Badge>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Select files from your Dropbox
          </p>
          
          <Button
            onClick={openDropboxChooser}
            disabled={disabled || loading || !dropboxApiLoaded}
            className="w-full"
            variant="outline"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Cloud className="h-4 w-4 mr-2" />
            )}
            Select from Dropbox
          </Button>
        </div>
      </div>

      {/* Loading status and API key status */}
      {(!googleApiLoaded || !dropboxApiLoaded) && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {!googleApiLoaded && !dropboxApiLoaded ? 
              "Initializing cloud services... This may take a moment." : 
              `${!googleApiLoaded ? 'Google Drive' : 'Dropbox'} service loading...`
            }
            {" APIs should load automatically. If this persists, please check your network connection."}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}