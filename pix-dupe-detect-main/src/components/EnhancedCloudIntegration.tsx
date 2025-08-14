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
  source: 'google-drive' | 'dropbox' | 'google-photos';
  downloadHeaders?: Record<string, string>;
}

interface EnhancedCloudIntegrationProps {
  onFileSelected: (file: CloudFile) => void;
  disabled?: boolean;
}

export function EnhancedCloudIntegration({ onFileSelected, disabled }: EnhancedCloudIntegrationProps) {
  const [loading, setLoading] = useState({ google: false, dropbox: false, photos: false });
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [photosToken, setPhotosToken] = useState<string | null>(null);
  const [photosBrowserOpen, setPhotosBrowserOpen] = useState(false);
  const [photosAlbums, setPhotosAlbums] = useState<Array<{ id: string; title: string }>>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<string>('');
  const [photosItems, setPhotosItems] = useState<Array<{ id: string; filename: string; baseUrl: string; size?: number }>>([]);
  const [photosNextPageToken, setPhotosNextPageToken] = useState<string | null>(null);
  const [photosPrevTokens, setPhotosPrevTokens] = useState<string[]>([]);

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
            try { localStorage.setItem('googleDriveGranted', '1'); } catch {}
            resolved = true;
            resolve(resp.access_token);
          } else {
            reject(new Error('Failed to obtain access token'));
          }
        };
        try {
          const promptMode = (localStorage.getItem('googleDriveGranted') === '1') ? '' : 'consent';
          tokenClient.requestAccessToken({ prompt: promptMode as any });
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

      // Helper to expand folders into file items
      const expandGoogleSelection = async (docs: any[], token: string) => {
        const results: Array<{ id: string; name: string; sizeBytes?: number }> = [];
        const files: any[] = [];

        for (const d of docs) {
          const isFolder = d.mimeType === 'application/vnd.google-apps.folder' || d.type === 'folder';
          if (!isFolder) {
            results.push({ id: d.id, name: d.name, sizeBytes: d.sizeBytes });
            continue;
          }

          // List child files of the selected folder (non-trashed)
          try {
            const listUrl = `https://www.googleapis.com/drive/v3/files?q='${encodeURIComponent(d.id)}'+in+parents+and+trashed=false&fields=files(id,name,size,mimeType)`;
            const resp = await fetch(listUrl, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (resp.ok) {
              const data = await resp.json();
              (data.files || []).forEach((f: any) => {
                results.push({ id: f.id, name: f.name, sizeBytes: Number(f.size) || 0 });
              });
            }
          } catch (e) {
            console.warn('Failed to list folder contents:', e);
          }
        }

        return results;
      };

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
        .setCallback(async (data: any) => {
          // Remove OAuth popup marker and resume session timeout
          document.body.removeAttribute('data-oauth-popup');

          if (data.action === window.google.picker.Action.PICKED) {
            const pickedDocs = data.docs || [];
            // Expand folders into files
            const flat = await expandGoogleSelection(pickedDocs, oauthToken);
            // If no folders, fall back to docs directly
            const items = flat.length > 0 ? flat : pickedDocs.map((d: any) => ({ id: d.id, name: d.name, sizeBytes: d.sizeBytes }));

            items.forEach((f: any) => {
              const directUrl = `https://www.googleapis.com/drive/v3/files/${f.id}?alt=media`;
              onFileSelected({
                name: f.name,
                size: f.sizeBytes || 0,
                downloadUrl: directUrl,
                source: 'google-drive',
                downloadHeaders: { Authorization: `Bearer ${oauthToken}` }
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

  const loadGooglePhotos = useCallback(async () => {
    setLoading(prev => ({ ...prev, photos: true }));
    setError(null);

    try {
      console.log('🔄 Starting Google Photos import...');
      // Ensure GIS and gapi loaded
      if (!window.google?.accounts) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      document.body.setAttribute('data-oauth-popup', 'google-photos');

      // Get clientId (use same as Drive)
      const { data: credentials } = await supabase.functions.invoke('cloud-credentials', {
        body: { action: 'get_google_credentials' }
      });
      const clientId = credentials?.client_id || import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) throw new Error('Missing Google Client ID');

      // Acquire token for Google Photos Library API
      // @ts-ignore
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'https://www.googleapis.com/auth/photoslibrary.readonly',
        callback: () => {},
      });

      const photosToken: string = await new Promise((resolve, reject) => {
        let resolved = false;
        // @ts-ignore
        tokenClient.callback = (resp: any) => {
          if (resp && resp.access_token) {
            try { localStorage.setItem('googlePhotosGranted', '1'); } catch {}
            resolved = true;
            resolve(resp.access_token);
          } else {
            reject(new Error('Failed to obtain Google Photos access token'));
          }
        };
        try {
          const promptMode = (localStorage.getItem('googlePhotosGranted') === '1') ? '' : 'consent';
          tokenClient.requestAccessToken({ prompt: promptMode as any });
          setTimeout(() => { if (!resolved) reject(new Error('Timed out obtaining Google Photos token')); }, 15000);
        } catch (e) {
          reject(e);
        }
      });

      console.log('✅ Google Photos token acquired');
      setPhotosToken(photosToken);
      setPhotosBrowserOpen(true);

      // Load initial albums and first page
      const loadAlbums = async () => {
        try {
          const resp = await fetch('https://photoslibrary.googleapis.com/v1/albums?pageSize=50', {
            headers: { Authorization: `Bearer ${photosToken}` }
          });
          if (resp.ok) {
            const data = await resp.json();
            const albums = (data.albums || []).map((a: any) => ({ id: a.id, title: a.title }));
            setPhotosAlbums(albums);
          }
        } catch (e) {
          console.warn('Failed to fetch albums', e);
        }
      };

      const loadPage = async (pageToken?: string, albumId?: string) => {
        const body: any = {
          pageSize: 25,
          pageToken,
          filters: { mediaTypeFilter: { mediaTypes: ['PHOTO'] } }
        };
        if (albumId) {
          // For album filtering, the Photos API requires albumId at root, not in filters
          delete body.filters;
          body.albumId = albumId;
          body.pageSize = 25;
          body.pageToken = pageToken;
        }
        const resp = await fetch('https://photoslibrary.googleapis.com/v1/mediaItems:search', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${photosToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        });
        if (!resp.ok) throw new Error(`Google Photos API error: ${resp.status}`);
        const data = await resp.json();
        const items = (data.mediaItems || []).map((m: any) => ({ id: m.id, filename: m.filename, baseUrl: m.baseUrl, size: Number(m.mediaMetadata?.fileSize) || 0 }));
        setPhotosItems(items);
        setPhotosNextPageToken(data.nextPageToken || null);
      };

      await loadAlbums();
      await loadPage();

      // Handlers to navigate
      (loadGooglePhotos as any)._photosHandlers = {
        loadPage,
      };

    } catch (error: any) {
      console.error('Google Photos import error:', error);
      setError('Failed to import from Google Photos. Please try again.');
      toast({ title: 'Google Photos Error', description: error.message || 'Import failed', variant: 'destructive' });
    } finally {
      document.body.removeAttribute('data-oauth-popup');
      setLoading(prev => ({ ...prev, photos: false }));
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

  const handlePhotosAlbumChange = useCallback(async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newAlbumId = event.target.value;
    setSelectedAlbumId(newAlbumId);
    setPhotosPrevTokens([]);
    setPhotosNextPageToken(null);
    const handlers = (loadGooglePhotos as any)._photosHandlers;
    if (photosToken && handlers?.loadPage) {
      await handlers.loadPage(undefined, newAlbumId || undefined);
    }
  }, [photosToken, loadGooglePhotos]);

  const handlePhotosNext = useCallback(async () => {
    if (!photosNextPageToken) return;
    setPhotosPrevTokens(prev => [...prev, photosNextPageToken]);
    const handlers = (loadGooglePhotos as any)._photosHandlers;
    if (photosToken && handlers?.loadPage) {
      await handlers.loadPage(photosNextPageToken, selectedAlbumId || undefined);
    }
  }, [photosNextPageToken, photosToken, selectedAlbumId, loadGooglePhotos]);

  const handlePhotosPrev = useCallback(async () => {
    if (photosPrevTokens.length === 0) return;
    const newPrev = [...photosPrevTokens];
    const priorToken = newPrev.pop();
    setPhotosPrevTokens(newPrev);
    const handlers = (loadGooglePhotos as any)._photosHandlers;
    if (photosToken && handlers?.loadPage) {
      await handlers.loadPage(priorToken, selectedAlbumId || undefined);
    }
  }, [photosPrevTokens, photosToken, selectedAlbumId, loadGooglePhotos]);

  const handlePhotosAddPage = useCallback(() => {
    photosItems.forEach(item => {
      onFileSelected({
        name: item.filename,
        size: item.size || 0,
        downloadUrl: `${item.baseUrl}=d`,
        source: 'google-photos'
      });
    });
    toast({ title: 'Google Photos', description: `Queued ${photosItems.length} photo(s) for upload.` });
  }, [photosItems, onFileSelected, toast]);

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

        {/* Google Photos */}
        <Button
          onClick={loadGooglePhotos}
          disabled={disabled || loading.photos}
          variant="outline"
          className="h-auto p-6 flex flex-col items-center gap-3"
        >
          {loading.photos ? (
            <Loader2 className="h-8 w-8 animate-spin" />
          ) : (
            <CloudIcon className="h-8 w-8 text-pink-600" />
          )}
          <div className="text-center">
            <div className="font-semibold">Google Photos</div>
            <div className="text-sm text-muted-foreground">
              Import photos from your Google Photos
            </div>
          </div>
        </Button>
      </div>

      {photosBrowserOpen && (
        <div className="space-y-3 border rounded p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-medium">Google Photos Browser</span>
              <Button variant="ghost" onClick={() => setPhotosBrowserOpen(false)}>Close</Button>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Album:</label>
              <select className="border rounded px-2 py-1" value={selectedAlbumId} onChange={handlePhotosAlbumChange}>
                <option value="">All Photos</option>
                {photosAlbums.map(a => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePhotosPrev} disabled={photosPrevTokens.length === 0}>Prev</Button>
            <Button variant="outline" onClick={handlePhotosNext} disabled={!photosNextPageToken}>Next</Button>
            <div className="text-sm text-muted-foreground">Showing {photosItems.length} items</div>
            <Button onClick={handlePhotosAddPage}>Add these items</Button>
          </div>
        </div>
      )}
    </div>
  );
}