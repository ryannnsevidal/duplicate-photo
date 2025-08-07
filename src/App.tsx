import { Database, LogOut, Settings, Shield, User } from "lucide-react";
import { useState } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthForm } from "./components/AuthForm";
import { DuplicateResults } from "./components/DuplicateResults";
import { ImageUpload } from "./components/ImageUpload";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import { useAuth } from "./hooks/useAuth";
import { AuthCallbackPage } from "./pages/AuthCallbackPage";

interface UploadResponse {
  success: boolean;
  file_id: string;
  duplicates: Array<{
    filename: string;
    similarity: number;
    file_id: string;
    upload_date: string;
  }>;
  hashes: {
    phash: string;
    dhash: string;
    avgHash: string;
    colorHash: string;
  };
}

function MainApp() {
  const { user, profile, loading, signOut, isAdmin } = useAuth();
  const [uploadResults, setUploadResults] = useState<UploadResponse | null>(null);

  // Check if we're in demo mode
  const isDemoMode = !import.meta.env.VITE_SUPABASE_URL || 
    import.meta.env.VITE_SUPABASE_URL.includes('your-project') || 
    import.meta.env.VITE_SUPABASE_URL.includes('demo-project');

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Duplicate Photo Detector
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Advanced perceptual hashing technology to find duplicate images in your collection.
              Secure, fast, and privacy-focused.
            </p>
          </div>
          <AuthForm />
        </div>
      </div>
    );
  }

  const handleNewUpload = () => {
    setUploadResults(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="bg-yellow-50 border-b border-yellow-200 p-3">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center gap-2 text-yellow-800">
              <Settings className="h-4 w-4" />
              <span className="text-sm font-medium">
                Demo Mode: Configure your Supabase credentials in .env to enable full functionality
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Duplicate Photo Detector
              </h1>
              {isAdmin && (
                <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <User className="h-4 w-4" />
                <span>{profile?.full_name || user?.email || 'Demo User'}</span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut()}
                className="flex items-center gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {uploadResults ? (
          <DuplicateResults
            results={uploadResults}
            onNewUpload={handleNewUpload}
          />
        ) : (
          <div className="space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-gray-900 mb-4">
                Upload Image for Duplicate Detection
              </h2>
              <p className="text-gray-600 max-w-xl mx-auto">
                Our advanced perceptual hashing algorithms will analyze your image
                and compare it against your existing collection to find potential duplicates.
              </p>
            </div>

            <ImageUpload onResults={setUploadResults} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
              <div className="text-center p-6 bg-white rounded-lg shadow-sm">
                <Database className="h-8 w-8 text-blue-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Secure Storage</h3>
                <p className="text-sm text-gray-600">
                  Your images are stored securely with enterprise-grade encryption
                </p>
              </div>

              <div className="text-center p-6 bg-white rounded-lg shadow-sm">
                <Settings className="h-8 w-8 text-green-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Advanced Analysis</h3>
                <p className="text-sm text-gray-600">
                  Multiple hashing algorithms ensure accurate duplicate detection
                </p>
              </div>

              <div className="text-center p-6 bg-white rounded-lg shadow-sm">
                <Shield className="h-8 w-8 text-purple-600 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 mb-2">Privacy First</h3>
                <p className="text-sm text-gray-600">
                  Your data is private and secure with row-level security policies
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-gray-600 text-sm">
            <p>
              Powered by Supabase, React, and advanced perceptual hashing algorithms
            </p>
            <p className="mt-2">
              © 2024 Duplicate Photo Detector. Built with privacy and security in mind.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

const App = () => {
  return (
    <>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainApp />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
      <Toaster position="top-right" />
    </>
  );
};

export default App;
