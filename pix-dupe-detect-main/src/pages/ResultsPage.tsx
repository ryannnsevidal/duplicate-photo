import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Copy, RotateCcw, Star, Trash2 } from 'lucide-react';

interface DuplicateResult {
  filename: string;
  score: number;
}

interface UploadResponse {
  duplicates: DuplicateResult[];
  best?: {
    filename: string;
    score: number;
  };
}

interface ResultsPageProps {
  results: UploadResponse;
  onReset: () => void;
}

export function ResultsPage({ results, onReset }: ResultsPageProps) {
  const hasDuplicates = results.duplicates.length > 0;

  const getConfidenceColor = (score: number) => {
    if (score >= 0.9) return 'bg-red-500 hover:bg-red-600';
    if (score >= 0.7) return 'bg-orange-500 hover:bg-orange-600';
    return 'bg-yellow-500 hover:bg-yellow-600';
  };

  const getConfidenceLabel = (score: number) => {
    if (score >= 0.9) return 'Very High';
    if (score >= 0.7) return 'High';
    if (score >= 0.5) return 'Medium';
    return 'Low';
  };

  const isBestMatch = (filename: string) => {
    return results.best?.filename === filename;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="max-w-4xl mx-auto px-4 py-8"
    >
      <Card className="shadow-xl border-0 bg-card/80 backdrop-blur-sm overflow-hidden">
        <CardHeader className="text-center pb-8 bg-gradient-to-r from-primary/10 via-blue-600/10 to-purple-600/10">
          <motion.div
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            <CardTitle className="text-3xl font-bold flex items-center justify-center gap-3">
              {hasDuplicates ? (
                <>
                  <Copy className="h-8 w-8 text-orange-500" />
                  Duplicates Detected
                </>
              ) : (
                <>
                  <CheckCircle className="h-8 w-8 text-green-500" />
                  No Duplicates Found
                </>
              )}
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              {hasDuplicates 
                ? `Found ${results.duplicates.length} potential duplicate${results.duplicates.length > 1 ? 's' : ''} in your images`
                : 'All your images appear to be unique!'
              }
            </CardDescription>
          </motion.div>
        </CardHeader>
        
        <CardContent className="space-y-6 p-8">
          {hasDuplicates ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-4"
            >
              {/* Best Match Callout */}
              {results.best && (
                <motion.div
                  initial={{ scale: 0.95 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3 }}
                  className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800 rounded-xl"
                >
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300 font-medium mb-2">
                    <Star className="h-5 w-5" />
                    Recommended to Keep
                  </div>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    <strong>{results.best.filename}</strong> has the highest quality score ({(results.best.score * 100).toFixed(1)}%)
                  </p>
                </motion.div>
              )}

              {/* Duplicates List */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Duplicate Files:</h3>
                {results.duplicates.map((duplicate, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className={`flex items-center justify-between p-4 border rounded-xl transition-all hover:shadow-md ${
                      isBestMatch(duplicate.filename) 
                        ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
                        : 'bg-muted/30 hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex-1 flex items-center gap-3">
                      {isBestMatch(duplicate.filename) && (
                        <Star className="h-5 w-5 text-green-500" />
                      )}
                      <div>
                        <div className="font-medium text-sm truncate max-w-[300px]">
                          {duplicate.filename}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Confidence: {(duplicate.score * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant="secondary"
                        className={`${getConfidenceColor(duplicate.score)} text-white border-0`}
                      >
                        {getConfidenceLabel(duplicate.score)}
                      </Badge>
                      
                      {!isBestMatch(duplicate.filename) && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-3 pt-4"
              >
                <Button 
                  variant="destructive" 
                  className="flex-1"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Selected Duplicates
                </Button>
                
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={onReset}
                >
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Check More Images
                </Button>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="text-center py-12"
            >
              <div className="text-8xl mb-6">🎉</div>
              <h3 className="text-2xl font-bold mb-4 text-green-600 dark:text-green-400">
                Perfect! No Duplicates Found
              </h3>
              <p className="text-muted-foreground max-w-md mx-auto mb-8">
                All your images are unique. Your photo collection is already optimized!
              </p>
              
              <Button 
                variant="outline" 
                onClick={onReset}
                className="mx-auto"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Check More Images
              </Button>
            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}