import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { ExternalLink, Settings, Key, Shield } from 'lucide-react';

export function CloudSetupGuide() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Cloud Integration Setup
          </CardTitle>
          <CardDescription>
            Configure Google Drive and Dropbox integrations for file uploads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Google Drive Setup */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-blue-600 flex items-center gap-2">
              <Key className="h-4 w-4" />
              Google Drive API Setup
            </h3>
            
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                These credentials will be stored securely in Supabase secrets and only accessible to authenticated users.
              </AlertDescription>
            </Alert>

            <div className="pl-4 space-y-3">
              <div className="text-sm">
                <p className="font-medium mb-2">Step 1: Create Google Cloud Project</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Go to <Button variant="link" className="p-0 h-auto text-blue-600" asChild>
                    <a href="https://console.cloud.google.com/" target="_blank">Google Cloud Console</a>
                  </Button></li>
                  <li>Create a new project or select existing one</li>
                  <li>Enable the Google Drive API and Google Picker API</li>
                </ol>
              </div>

              <div className="text-sm">
                <p className="font-medium mb-2">Step 2: Create OAuth Credentials</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Go to APIs & Services → Credentials</li>
                  <li>Click "Create Credentials" → "OAuth client ID"</li>
                  <li>Choose "Web application"</li>
                  <li>Add your domain to "Authorized JavaScript origins"</li>
                  <li>Copy the Client ID</li>
                </ol>
              </div>

              <div className="text-sm">
                <p className="font-medium mb-2">Step 3: Create API Key</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Click "Create Credentials" → "API key"</li>
                  <li>Restrict the key to Google Drive API and Google Picker API</li>
                  <li>Copy the API key</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Dropbox Setup */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-purple-600 flex items-center gap-2">
              <Key className="h-4 w-4" />
              Dropbox API Setup
            </h3>

            <div className="pl-4 space-y-3">
              <div className="text-sm">
                <p className="font-medium mb-2">Step 1: Create Dropbox App</p>
                <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
                  <li>Go to <Button variant="link" className="p-0 h-auto text-purple-600" asChild>
                    <a href="https://www.dropbox.com/developers/apps" target="_blank">Dropbox App Console</a>
                  </Button></li>
                  <li>Click "Create app"</li>
                  <li>Choose "Scoped access" → "Full Dropbox"</li>
                  <li>Name your app</li>
                  <li>Copy the App key from the settings page</li>
                </ol>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <Alert>
              <ExternalLink className="h-4 w-4" />
              <AlertDescription>
                After obtaining your API keys, configure them in your Supabase project secrets:
                <br />
                <strong>GOOGLE_CLIENT_ID</strong>, <strong>GOOGLE_API_KEY</strong>, and <strong>DROPBOX_APP_KEY</strong>
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}