import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, AlertTriangle, RefreshCw, ExternalLink } from 'lucide-react';
import { APIValidator, ValidationResult } from '@/lib/apiValidation';

const validator = new APIValidator();

export function APIValidationDashboard() {
  const [results, setResults] = useState<ValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    const unsubscribe = validator.subscribe(setResults);
    return unsubscribe;
  }, []);

  const handleValidateAll = async () => {
    setIsValidating(true);
    await validator.validateAll();
    setIsValidating(false);
  };

  const getStatusIcon = (status: ValidationResult['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'testing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    }
  };

  const getStatusBadge = (status: ValidationResult['status']) => {
    const variants = {
      success: 'default',
      error: 'destructive',
      warning: 'secondary',
      testing: 'outline'
    } as const;

    return (
      <Badge variant={variants[status]} className="ml-2">
        {status}
      </Badge>
    );
  };

  const hasErrors = validator.hasErrors();
  const hasWarnings = validator.hasWarnings();
  const allPassed = results.length > 0 && !hasErrors && !hasWarnings;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">API Validation Dashboard</h2>
          <p className="text-muted-foreground">
            Validate all API keys and services before production deployment
          </p>
        </div>
        <Button 
          onClick={handleValidateAll} 
          disabled={isValidating}
          className="gap-2"
        >
          {isValidating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Validating...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Validate All APIs
            </>
          )}
        </Button>
      </div>

      {allPassed && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-700">
            ✅ All API services validated successfully! Your application is ready for production deployment.
          </AlertDescription>
        </Alert>
      )}

      {hasErrors && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>
            Some API services failed validation. Please fix these issues before deploying to production.
          </AlertDescription>
        </Alert>
      )}

      {hasWarnings && !hasErrors && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-500" />
          <AlertDescription className="text-yellow-700">
            Some API services have warnings. Review these before production deployment.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4">
        {results.length === 0 && !isValidating && (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Click "Validate All APIs" to test your API configurations
              </p>
            </CardContent>
          </Card>
        )}

        {results.map((result) => (
          <Card key={result.service}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  {getStatusIcon(result.status)}
                  {result.service}
                  {getStatusBadge(result.status)}
                </CardTitle>
                <span className="text-sm text-muted-foreground">
                  {result.timestamp.toLocaleTimeString()}
                </span>
              </div>
              <CardDescription>
                {result.message}
              </CardDescription>
            </CardHeader>
            {result.details && (
              <CardContent>
                <div className="text-sm text-muted-foreground bg-muted p-3 rounded">
                  {result.details}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Deployment Checklist for Render
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-semibold">Before deploying to Render:</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Ensure all API validations pass (green status)</li>
              <li>Set up environment variables in Render dashboard</li>
              <li>Configure your build command: <code className="text-xs bg-muted px-1 py-0.5 rounded">npm run build</code></li>
              <li>Set start command: <code className="text-xs bg-muted px-1 py-0.5 rounded">npm run preview</code></li>
              <li>Add your custom domain (if applicable)</li>
              <li>Enable auto-deploy from your Git repository</li>
            </ul>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-semibold">Required Environment Variables for Render:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <code className="bg-muted p-2 rounded">VITE_SUPABASE_URL</code>
              <code className="bg-muted p-2 rounded">VITE_SUPABASE_ANON_KEY</code>
              <code className="bg-muted p-2 rounded">VITE_GOOGLE_CLIENT_ID</code>
              <code className="bg-muted p-2 rounded">VITE_GOOGLE_API_KEY</code>
              <code className="bg-muted p-2 rounded">VITE_DROPBOX_APP_KEY</code>
              <code className="bg-muted p-2 rounded">VITE_RECAPTCHA_SITE_KEY</code>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Note: Backend secrets (like RECAPTCHA_SECRET_KEY, RESEND_API_KEY) are managed by Supabase Edge Functions
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}