import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AuthForm } from '@/components/AuthForm';
import { ImageUpload } from '@/components/ImageUpload';
import { ResultsDisplay } from '@/components/ResultsDisplay';
import { User, Session } from '@supabase/supabase-js';

interface UploadResponse {
  duplicates: Array<{
    filename: string;
    score: number;
  }>;
}

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [results, setResults] = useState<UploadResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setIsLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setResults(null);
  };

  const handleAuthSuccess = () => {
    // Auth state will be updated by the listener
  };

  const handleResults = (uploadResults: UploadResponse) => {
    setResults(uploadResults);
  };

  const handleReset = () => {
    setResults(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <Image className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Duplicate Photo Detector</h1>
          </div>
          
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {user.email}
              </span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          )}
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          {!user ? (
            <div className="flex items-center justify-center min-h-[60vh]">
              <AuthForm onAuthSuccess={handleAuthSuccess} />
            </div>
          ) : results ? (
            <ResultsDisplay results={results} onReset={handleReset} />
          ) : (
            <div className="flex items-center justify-center min-h-[60vh]">
              <ImageUpload onResults={handleResults} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
