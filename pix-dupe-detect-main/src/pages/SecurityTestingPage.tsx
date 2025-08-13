import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  FileText,
  Mail,
  Globe,
  User
} from 'lucide-react';
import { useState } from 'react';
import { useAdvancedInputValidation } from '@/hooks/useAdvancedInputValidation';
import { useToast } from '@/hooks/use-toast';

export function SecurityTestingPage() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    username: '',
    url: '',
    filename: '',
    textContent: ''
  });
  const [validationResults, setValidationResults] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const { validateInput, validateBatch, createSanitizedChangeHandler } = useAdvancedInputValidation();
  const { toast } = useToast();

  const getSecurityLevelIcon = (level: string) => {
    switch (level) {
      case 'low': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'medium': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'high': return <AlertTriangle className="h-4 w-4 text-orange-600" />;
      case 'critical': return <XCircle className="h-4 w-4 text-red-600" />;
      default: return <Shield className="h-4 w-4 text-gray-600" />;
    }
  };

  const getSecurityLevelColor = (level: string) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const handleInputChange = (field: string, type: 'email' | 'password' | 'username' | 'url' | 'filename' | 'text') => {
    return createSanitizedChangeHandler(type, (value) => {
      setFormData(prev => ({ ...prev, [field]: value }));
    });
  };

  const validateSingleField = async (field: string, type: 'email' | 'password' | 'username' | 'url' | 'filename' | 'text') => {
    const value = formData[field as keyof typeof formData];
    const result = await validateInput(value, type, `security_test_${field}`);
    
    setValidationResults(prev => ({
      ...prev,
      [field]: result
    }));

    if (result.securityLevel === 'critical') {
      toast({
        title: "Critical Security Threat Detected",
        description: `Dangerous input detected in ${field}. This has been logged for security review.`,
        variant: "destructive",
      });
    }
  };

  const validateAllFields = async () => {
    setLoading(true);
    try {
      const inputs = [
        { value: formData.email, type: 'email' as const, context: 'security_test_email' },
        { value: formData.password, type: 'password' as const, context: 'security_test_password' },
        { value: formData.username, type: 'username' as const, context: 'security_test_username' },
        { value: formData.url, type: 'url' as const, context: 'security_test_url' },
        { value: formData.filename, type: 'filename' as const, context: 'security_test_filename' },
        { value: formData.textContent, type: 'text' as const, context: 'security_test_text' }
      ];

      const results = await validateBatch(inputs);
      
      const resultMap = {
        email: results[0],
        password: results[1],
        username: results[2],
        url: results[3],
        filename: results[4],
        textContent: results[5]
      };

      setValidationResults(resultMap);
      
      const criticalCount = results.filter(r => r.securityLevel === 'critical').length;
      const highCount = results.filter(r => r.securityLevel === 'high').length;
      
      if (criticalCount > 0) {
        toast({
          title: "Critical Security Threats Detected",
          description: `${criticalCount} critical security threats found. All activity has been logged.`,
          variant: "destructive",
        });
      } else if (highCount > 0) {
        toast({
          title: "Security Warnings",
          description: `${highCount} high-risk patterns detected.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Validation Complete",
          description: "All inputs passed security validation.",
        });
      }
    } catch (error) {
      toast({
        title: "Validation Error",
        description: "Failed to complete security validation.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const testMaliciousInputs = () => {
    setFormData({
      email: '<script>alert("xss")</script>@test.com',
      password: "'; DROP TABLE users; --",
      username: 'user<iframe src="javascript:alert(1)">',
      url: 'javascript:alert("malicious")',
      filename: '../../../etc/passwd',
      textContent: '<script>document.location="http://evil.com"</script>'
    });
  };

  return (
    <div className="container max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Advanced Input Validation Testing
          </CardTitle>
          <CardDescription>
            Test the advanced input validation system with various security patterns.
            This demonstrates real-time XSS detection, SQL injection prevention, and input sanitization.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4">
            <Button onClick={validateAllFields} disabled={loading}>
              <Shield className="h-4 w-4 mr-2" />
              Validate All Fields
            </Button>
            <Button onClick={testMaliciousInputs} variant="outline">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Test with Malicious Inputs
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange('email', 'email')}
                placeholder="test@example.com"
                className={validationResults.email && !validationResults.email.isValid ? 'border-red-500' : ''}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => validateSingleField('email', 'email')}
              >
                Validate
              </Button>
              {validationResults.email && (
                <div className="flex items-center gap-2">
                  {getSecurityLevelIcon(validationResults.email.securityLevel)}
                  <Badge className={getSecurityLevelColor(validationResults.email.securityLevel)}>
                    {validationResults.email.securityLevel.toUpperCase()}
                  </Badge>
                  {validationResults.email.errors && (
                    <span className="text-sm text-red-600">
                      {validationResults.email.errors[0]}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={handleInputChange('password', 'password')}
                placeholder="Enter a strong password"
                className={validationResults.password && !validationResults.password.isValid ? 'border-red-500' : ''}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => validateSingleField('password', 'password')}
              >
                Validate
              </Button>
              {validationResults.password && (
                <div className="flex items-center gap-2">
                  {getSecurityLevelIcon(validationResults.password.securityLevel)}
                  <Badge className={getSecurityLevelColor(validationResults.password.securityLevel)}>
                    {validationResults.password.securityLevel.toUpperCase()}
                  </Badge>
                  {validationResults.password.errors && (
                    <span className="text-sm text-red-600">
                      {validationResults.password.errors[0]}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="username" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Username
              </Label>
              <Input
                id="username"
                value={formData.username}
                onChange={handleInputChange('username', 'username')}
                placeholder="username123"
                className={validationResults.username && !validationResults.username.isValid ? 'border-red-500' : ''}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => validateSingleField('username', 'username')}
              >
                Validate
              </Button>
              {validationResults.username && (
                <div className="flex items-center gap-2">
                  {getSecurityLevelIcon(validationResults.username.securityLevel)}
                  <Badge className={getSecurityLevelColor(validationResults.username.securityLevel)}>
                    {validationResults.username.securityLevel.toUpperCase()}
                  </Badge>
                  {validationResults.username.errors && (
                    <span className="text-sm text-red-600">
                      {validationResults.username.errors[0]}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* URL Field */}
            <div className="space-y-2">
              <Label htmlFor="url" className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                URL
              </Label>
              <Input
                id="url"
                value={formData.url}
                onChange={handleInputChange('url', 'url')}
                placeholder="https://example.com"
                className={validationResults.url && !validationResults.url.isValid ? 'border-red-500' : ''}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => validateSingleField('url', 'url')}
              >
                Validate
              </Button>
              {validationResults.url && (
                <div className="flex items-center gap-2">
                  {getSecurityLevelIcon(validationResults.url.securityLevel)}
                  <Badge className={getSecurityLevelColor(validationResults.url.securityLevel)}>
                    {validationResults.url.securityLevel.toUpperCase()}
                  </Badge>
                  {validationResults.url.errors && (
                    <span className="text-sm text-red-600">
                      {validationResults.url.errors[0]}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Filename Field */}
            <div className="space-y-2">
              <Label htmlFor="filename" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Filename
              </Label>
              <Input
                id="filename"
                value={formData.filename}
                onChange={handleInputChange('filename', 'filename')}
                placeholder="document.pdf"
                className={validationResults.filename && !validationResults.filename.isValid ? 'border-red-500' : ''}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => validateSingleField('filename', 'filename')}
              >
                Validate
              </Button>
              {validationResults.filename && (
                <div className="flex items-center gap-2">
                  {getSecurityLevelIcon(validationResults.filename.securityLevel)}
                  <Badge className={getSecurityLevelColor(validationResults.filename.securityLevel)}>
                    {validationResults.filename.securityLevel.toUpperCase()}
                  </Badge>
                  {validationResults.filename.errors && (
                    <span className="text-sm text-red-600">
                      {validationResults.filename.errors[0]}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Text Content Field */}
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="textContent" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Text Content
              </Label>
              <Textarea
                id="textContent"
                value={formData.textContent}
                onChange={(e) => setFormData(prev => ({ ...prev, textContent: e.target.value }))}
                placeholder="Enter any text content for security testing..."
                rows={4}
                className={validationResults.textContent && !validationResults.textContent.isValid ? 'border-red-500' : ''}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => validateSingleField('textContent', 'text')}
              >
                Validate
              </Button>
              {validationResults.textContent && (
                <div className="flex items-center gap-2">
                  {getSecurityLevelIcon(validationResults.textContent.securityLevel)}
                  <Badge className={getSecurityLevelColor(validationResults.textContent.securityLevel)}>
                    {validationResults.textContent.securityLevel.toUpperCase()}
                  </Badge>
                  {validationResults.textContent.errors && (
                    <span className="text-sm text-red-600">
                      {validationResults.textContent.errors[0]}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Security Testing Information:</strong> This page demonstrates the advanced input validation system.
          Try entering potentially malicious content like script tags, SQL injection attempts, or path traversal attacks.
          All suspicious activity is logged and rate limited automatically.
        </AlertDescription>
      </Alert>
    </div>
  );
}