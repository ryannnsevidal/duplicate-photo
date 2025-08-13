import { motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Copy, RotateCcw, AlertTriangle, Star } from 'lucide-react';

interface DuplicateResult {
  filename: string;
  score: number;
}

interface UploadResponse {
  duplicates: DuplicateResult[];
  best?: DuplicateResult;
}

interface LocationState {
  results: UploadResponse;
  filename: string;
}

export function TestResultsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state as LocationState;

  if (!state || !state.results) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 flex items-center justify-center p-4">
        <Card className="shadow-lg">
          <CardContent className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
            <p className="text-lg font-medium mb-2">No results found</p>
            <p className="text-muted-foreground mb-4">
              Please upload an image first to see results.
            </p>
            <Button onClick={() => navigate('/upload')}>
              Go to Upload
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { results, filename } = state;
  const hasDuplicates = results.duplicates.length > 0;

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'bg-destructive';
    if (score >= 0.7) return 'bg-orange-500';
    return 'bg-yellow-500';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.9) return 'Very High';
    if (score >= 0.7) return 'High';
    if (score >= 0.5) return 'Medium';
    return 'Low';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-accent/20 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto pt-8"
      >
        <Card className="shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              {hasDuplicates ? (
                <>
                  <Copy className="h-6 w-6 text-orange-500" />
                  Duplicates Found
                </>
              ) : (
                <>
                  <CheckCircle className="h-6 w-6 text-green-500" />
                  No Duplicates Found
                </>
              )}
            </CardTitle>
            <CardDescription>
              Results for: <span className="font-medium">{filename}</span>
            </CardDescription>
            <CardDescription>
              {hasDuplicates 
                ? `Found ${results.duplicates.length} potential duplicate${results.duplicates.length > 1 ? 's' : ''}`
                : 'Your image appears to be unique in your collection!'
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {results.best && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="p-4 bg-primary/10 border border-primary/20 rounded-xl"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-5 w-5 text-primary" />
                  <h3 className="font-semibold text-primary">Best Match</h3>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{results.best.filename}</p>
                    <p className="text-sm text-muted-foreground">
                      Confidence: {(results.best.score * 100).toFixed(1)}%
                    </p>
                  </div>
                  <Badge 
                    variant="secondary"
                    className={`${getConfidenceColor(results.best.score)} text-white`}
                  >
                    {getConfidenceLabel(results.best.score)}
                  </Badge>
                </div>
              </motion.div>
            )}

            {hasDuplicates ? (
              <div className="space-y-3">
                <h3 className="font-semibold">All Duplicates</h3>
                {results.duplicates.map((duplicate, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.05 }}
                    className="flex items-center justify-between p-4 border rounded-xl hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm truncate">
                        {duplicate.filename}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Confidence: {(duplicate.score * 100).toFixed(1)}%
                      </div>
                    </div>
                    
                    <Badge 
                      variant="secondary"
                      className={`${getConfidenceColor(duplicate.score)} text-white`}
                    >
                      {getConfidenceLabel(duplicate.score)}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                className="text-center py-8"
              >
                <div className="text-6xl mb-4">🎉</div>
                <p className="text-muted-foreground">
                  This image is unique and doesn't match any existing files in your collection.
                </p>
              </motion.div>
            )}
            
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex-1" 
                onClick={() => navigate('/upload')}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Check Another Image
              </Button>
              
              <Button 
                variant="secondary" 
                onClick={() => navigate('/signin')}
              >
                Back to Home
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}