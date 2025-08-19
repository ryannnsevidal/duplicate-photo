import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { UserStatistics } from '@/components/UserStatistics';
import { EnhancedUpload } from '@/components/EnhancedUpload';

export function AuthTest() {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [authStatus, setAuthStatus] = useState<string>('Checking...');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setLoading(true);
      setAuthStatus('Checking authentication...');

      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Auth error:', error);
        setAuthStatus('Error: ' + error.message);
        setUser(null);
        setSession(null);
      } else if (session) {
        console.log('Session found:', session);
        setSession(session);
        setUser(session.user);
        setAuthStatus('Authenticated');
      } else {
        console.log('No session found');
        setSession(null);
        setUser(null);
        setAuthStatus('Not authenticated');
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setAuthStatus('Failed to check auth');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    try {
      setAuthStatus('Signing in...');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin + '/auth/callback'
        }
      });
      
      if (error) {
        console.error('Sign in error:', error);
        setAuthStatus('Sign in failed: ' + error.message);
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      setAuthStatus('Sign in failed');
    }
  };

  const signOut = async () => {
    try {
      setAuthStatus('Signing out...');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('Sign out error:', error);
        setAuthStatus('Sign out failed: ' + error.message);
      } else {
        setUser(null);
        setSession(null);
        setAuthStatus('Signed out');
      }
    } catch (error) {
      console.error('Sign out failed:', error);
      setAuthStatus('Sign out failed');
    }
  };

  const testDatabaseConnection = async () => {
    try {
      setAuthStatus('Testing database...');
      
      // Test basic query
      const { data, error } = await supabase
        .from('file_upload_logs')
        .select('count')
        .limit(1);
      
      if (error) {
        console.error('Database test error:', error);
        setAuthStatus('Database error: ' + error.message);
      } else {
        console.log('Database test success:', data);
        setAuthStatus('Database connection working');
      }
    } catch (error) {
      console.error('Database test failed:', error);
      setAuthStatus('Database test failed');
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Authentication Test Page</h1>
      
      {/* Auth Status */}
      <Card>
        <CardHeader>
          <CardTitle>Authentication Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant={user ? "default" : "destructive"}>
              {user ? "✅" : "❌"}
            </Badge>
            <span>Status: {authStatus}</span>
          </div>
          
          {user && (
            <div className="space-y-2">
              <p><strong>User ID:</strong> {user.id}</p>
              <p><strong>Email:</strong> {user.email}</p>
              <p><strong>Provider:</strong> {user.app_metadata?.provider}</p>
            </div>
          )}
          
          <div className="flex gap-2">
            {!user ? (
              <Button onClick={signIn} disabled={loading}>
                Sign In with Google
              </Button>
            ) : (
              <Button onClick={signOut} disabled={loading}>
                Sign Out
              </Button>
            )}
            <Button onClick={checkAuth} disabled={loading}>
              Refresh Auth
            </Button>
            <Button onClick={testDatabaseConnection} disabled={loading}>
              Test Database
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Components Test */}
      {user && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>User Statistics Component</CardTitle>
            </CardHeader>
            <CardContent>
              <UserStatistics />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enhanced Upload Component</CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedUpload 
                onUploadComplete={(files) => {
                  console.log('Upload complete:', files);
                }}
                onAnalysisReady={(files) => {
                  console.log('Analysis ready:', files);
                }}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* Environment Variables */}
      <Card>
        <CardHeader>
          <CardTitle>Environment Variables</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p><strong>VITE_SUPABASE_URL:</strong> {import.meta.env.VITE_SUPABASE_URL ? '✅ Set' : '❌ Missing'}</p>
            <p><strong>VITE_SUPABASE_ANON_KEY:</strong> {import.meta.env.VITE_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}</p>
            <p><strong>VITE_FEATURE_SUPABASE:</strong> {import.meta.env.VITE_FEATURE_SUPABASE}</p>
            <p><strong>VITE_GOOGLE_CLIENT_ID:</strong> {import.meta.env.VITE_GOOGLE_CLIENT_ID ? '✅ Set' : '❌ Missing'}</p>
            <p><strong>VITE_DROPBOX_APP_KEY:</strong> {import.meta.env.VITE_DROPBOX_APP_KEY ? '✅ Set' : '❌ Missing'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
