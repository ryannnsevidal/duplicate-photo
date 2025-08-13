import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, Copy, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface DuplicateResult {
  filename: string;
  score: number;
}

interface UploadResponse {
  duplicates: DuplicateResult[];
}

interface ResultsDisplayProps {
  results: UploadResponse;
  onReset: () => void;
}

export function ResultsDisplay({ results, onReset }: ResultsDisplayProps) {
  const hasDuplicates = results.duplicates.length > 0;

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'bg-red-500';
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
    <Card className="w-full max-w-2xl mx-auto animate-fade-in">
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
          {hasDuplicates 
            ? `Found ${results.duplicates.length} potential duplicate${results.duplicates.length > 1 ? 's' : ''}`
            : 'Your image appears to be unique in your collection!'
          }
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {hasDuplicates ? (
          <div className="space-y-3">
            {results.duplicates.map((duplicate, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
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
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-6xl mb-4">🎉</div>
            <p className="text-muted-foreground">
              This image is unique and doesn't match any existing files in your collection.
            </p>
          </div>
        )}
        
        <Button 
          variant="outline" 
          className="w-full" 
          onClick={onReset}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Check Another Image
        </Button>
      </CardContent>
    </Card>
  );
}