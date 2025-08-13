import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertTriangle, Cloud, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

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
  onAnalysisComplete?: (results: unknown) => void;
  disabled?: boolean;
}

export function CloudIntegration({ onFileSelected, onAnalysisComplete, disabled }: CloudIntegrationProps) {
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
      
      let appKey = import.meta.env.VITE_DROPBOX_APP_KEY;

      if (!appKey) {
        const { data: credentials, error } = await supabase.functions.invoke('cloud-credentials', {
          body: { action: 'get_dropbox_credentials' }
        });

        if (credentials?.app_key) {
          appKey = credentials.app_key;
        } else {
          console.warn('⚠️ Backend Dropbox credentials failed, using environment fallback:', error);
        }
      }

      if (!appKey) {
        console.error('❌ Dropbox credentials error:', error);
        console.warn('⚠️ Dropbox not configured, API key missing');
        setDropboxApiLoaded(false);
        return;
      }

      console.log('✅ Dropbox credentials retrieved, app_key found:', appKey?.slice(0, 10) + '...');

      return new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://www.dropbox.com/static/api/2/dropins.js';
        script.setAttribute('data-app-key', appKey);
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
  }, [loadDropboxAPI, loadGoogleAPI]);

  // Initialize Google Drive Picker
  const initializeGoogleDrive = useCallback(async () => {
    try {
      if (googleInitialized) return;
      
      setLoading(true);
      
      await loadGoogleAPI();
      
      let clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      let apiKey = import.meta.env.VITE_GOOGLE_API_KEY;
      
      if (!clientId || !apiKey) {
        const { data: credentials, error } = await supabase.functions.invoke('cloud-credentials', {
          body: { action: 'get_google_credentials' }
        });

        if (credentials) {
          clientId = credentials.client_id;
          apiKey = credentials.api_key;
        } else {
          console.warn('⚠️ Backend credentials failed, using environment fallback:', error);
        }
      }

      if (!clientId || !apiKey) {
        throw new Error('Google Drive credentials not configured. Please ensure VITE_GOOGLE_CLIENT_ID and VITE_GOOGLE_API_KEY are set.');
      }

      console.log('✅ Using Google credentials:', { clientId: clientId?.slice(0, 20) + '...', hasApiKey: !!apiKey });

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
          client_id: clientId
        });
      }
      
      setGoogleInitialized(true);

    } catch (error: unknown) {
      console.error('Google Drive initialization failed:', error);
      const message = error instanceof Error ? error.message : "Failed to initialize Google Drive";
      toast({
        title: "Google Drive Error",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [loadGoogleAPI, toast, googleInitialized]);

  // Process cloud file selection and trigger analysis
  const processCloudFile = useCallback(async (cloudFile: CloudFile) => {
    try {
      console.log('🔄 Processing cloud file:', cloudFile.name);
      
      // First call the file selection callback
      onFileSelected(cloudFile);
      
      // If analysis callback is provided, download file and analyze
      if (onAnalysisComplete) {
        setLoading(true);
        
        // Download file from cloud URL
        const response = await fetch(cloudFile.downloadUrl);
        if (!response.ok) {
          throw new Error(`Failed to download file: ${response.statusText}`);
        }
        
        const blob = await response.blob();
        const file = new File([blob], cloudFile.name, { type: blob.type });
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');
        
        // Upload to Supabase storage
        const fileName = `${Date.now()}-cloud-${cloudFile.id}-${cloudFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('uploaded_files')
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: false
          });
        
        if (uploadError) throw uploadError;
        
        // Log upload
        const { data: uploadLog, error: logError } = await supabase
          .from('file_upload_logs')
          .insert({
            user_id: user.id,
            original_filename: cloudFile.name,
            file_type: file.type,
            file_size_bytes: cloudFile.size,
            upload_status: 'uploaded',
            cloud_provider: cloudFile.source,
            cloud_path: fileName,
            metadata: {
              upload_timestamp: new Date().toISOString(),
              source: cloudFile.source,
              original_cloud_id: cloudFile.id
            }
          })
          .select('id')
          .single();
        
        if (logError) {
          console.error('⚠️ Failed to log upload:', logError);
          return;
        }
        
        // Trigger analysis
        const { data: { session } } = await supabase.auth.getSession();
        const analysisResponse = await supabase.functions.invoke('dedup-analyzer', {
          body: {
            action: 'analyze_uploaded_files',
            user_id: user.id,
            file_ids: [uploadLog.id]
          },
          headers: {
            'Authorization': `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json'
          }
        });

        if (analysisResponse.error) {
          throw new Error(`Analysis failed: ${analysisResponse.error.message}`);
        }

        console.log('✅ Cloud file analysis completed:', analysisResponse.data);
        if (onAnalysisComplete) {
          onAnalysisComplete(analysisResponse.data);
        }
        
        toast({
          title: "Cloud File Analyzed",
          description: `${cloudFile.name} from ${cloudFile.source} analyzed successfully`,
        });
      }
      
    } catch (error: unknown) {
      console.error('❌ Cloud file processing error:', error);
      const message = error instanceof Error ? error.message : "Failed to process cloud file";
      toast({
        title: "Processing Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [onFileSelected, onAnalysisComplete, toast]);

  // Open Google Drive Picker
  const openGoogleDrivePicker = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Opening Google Drive picker...');

      if (!googleInitialized) {
        await initializeGoogleDrive();
      }

      if (!window.gapi?.auth2) {
        throw new Error('Google API not ready - please wait for initialization');
      }

      if (!window.google?.picker) {
        throw new Error('Google Picker API not loaded');
      }

      const authInstance = window.gapi.auth2.getAuthInstance();
      
      if (!authInstance) {
        throw new Error('Google Auth instance not available');
      }
      
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

      // Get API key - try backend first, fallback to env
      let pickerApiKey = import.meta.env.VITE_GOOGLE_API_KEY;
      try {
        const { data: credentials } = await supabase.functions.invoke('cloud-credentials', {
          body: { action: 'get_google_credentials' }
        });
        if (credentials?.api_key) {
          pickerApiKey = credentials.api_key;
        }
      } catch (error) {
        console.warn('Using environment API key as fallback');
      }

      // Create and show picker
      const picker = new window.google.picker.PickerBuilder()
        .addView(window.google.picker.ViewId.DOCS)
        .addView(window.google.picker.ViewId.DOCS_IMAGES)
        .setOAuthToken(authResponse.access_token)
        .setDeveloperKey(pickerApiKey)
        .setCallback((data: { action: string; docs: GoogleDriveFile[] }) => {
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
            
            // Process the cloud file (this will trigger analysis if callback provided)
            processCloudFile(cloudFile);
          }
          setLoading(false);
        })
        .build();
      
      picker.setVisible(true);

    } catch (error: unknown) {
      // Remove OAuth popup marker on error
      document.body.removeAttribute('data-oauth-popup');
      
      console.error('❌ Google Drive picker error:', error);
      const message = error instanceof Error ? error.message : "Could not open Google Drive picker.";
      toast({
        title: "Google Drive Error",
        description: message,
        variant: "destructive",
      });
      setLoading(false);
    }
  }, [googleInitialized, initializeGoogleDrive, toast, processCloudFile]);

  // Open Dropbox Chooser
  const openDropboxChooser = useCallback(async () => {
    try {
      setLoading(true);
      console.log('🔄 Opening Dropbox chooser...');
      
      await loadDropboxAPI();

      if (!window.Dropbox) {
        throw new Error('Dropbox API not loaded - please check your network connection');
      }

      if (typeof window.Dropbox.choose !== 'function') {
        throw new Error('Dropbox Chooser API not available');
      }

      // Mark OAuth popup start to prevent session timeout
      document.body.setAttribute('data-oauth-popup', 'dropbox');
      console.log('🔐 OAuth popup starting - session timeout paused');

      window.Dropbox.choose({
        success: (files: DropboxFile[]) => {
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
          
          // Process the cloud file (this will trigger analysis if callback provided)
          processCloudFile(cloudFile);
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

    } catch (error: unknown) {
      // Remove OAuth popup marker on error
      document.body.removeAttribute('data-oauth-popup');
      
      console.error('❌ Dropbox chooser error:', error);
      const message = error instanceof Error ? error.message : "Could not open Dropbox chooser.";
      toast({
        title: "Dropbox Error",
        description: message,
        variant: "destructive",
      });
      setLoading(false);
    }
  }, [loadDropboxAPI, toast, processCloudFile]);

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

interface GoogleDriveFile {
  id: string;
  name: string;
  sizeBytes: number;
}

interface DropboxFile {
  id: string;
  name: string;
  bytes: number;
  link: string;
}