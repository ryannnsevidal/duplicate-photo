import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Brain, CheckCircle, FileText, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';

interface AnalysisResult {
  totalFiles: number;
  duplicateGroups: Array<{
    files: string[];
    similarityScore: number;
  }>;
  uniqueFiles: number;
  duplicateFiles: number;
  processingTime: number;
  recommendations: string[];
}

interface AnalyzeFilesButtonProps {
  fileCount: number;
  onAnalysisComplete?: (results: AnalysisResult) => void;
  disabled?: boolean;
}

export function AnalyzeFilesButton({ fileCount, onAnalysisComplete, disabled }: AnalyzeFilesButtonProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(null);
  const [currentStep, setCurrentStep] = useState('');
  const { toast } = useToast();

  const startAnalysis = async () => {
    if (fileCount === 0) {
      toast({
        title: "No Files to Analyze",
        description: "Please upload some files before running analysis.",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    setShowDialog(true);
    setProgress(0);
    setAnalysisResults(null);

    try {
      // Step 1: Initialize analysis
      setCurrentStep('Preparing file analysis...');
      setProgress(10);
      await new Promise(resolve => setTimeout(resolve, 500));

      // Step 2: Fetch uploaded files
      setCurrentStep('Fetching uploaded files...');
      setProgress(25);
      
      const { data: uploadedFiles, error: fetchError } = await supabase
        .from('file_upload_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (fetchError) throw fetchError;

      // Step 3: Send to analysis engine
      setCurrentStep('Running AI deduplication analysis...');
      setProgress(50);

      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('dedup-analyzer', {
        body: {
          action: 'analyze_files',
          files: uploadedFiles || [],
          user_id: (await supabase.auth.getUser()).data.user?.id
        }
      });

      if (analysisError) throw analysisError;

      // Step 4: Process results
      setCurrentStep('Processing analysis results...');
      setProgress(75);
      await new Promise(resolve => setTimeout(resolve, 800));

      // Step 5: Complete
      setCurrentStep('Analysis complete!');
      setProgress(100);

      const results: AnalysisResult = {
        totalFiles: uploadedFiles?.length || 0,
        duplicateGroups: analysisData.duplicateGroups || [],
        uniqueFiles: analysisData.uniqueFiles || 0,
        duplicateFiles: analysisData.duplicateFiles || 0,
        processingTime: analysisData.processingTime || 0,
        recommendations: analysisData.recommendations || []
      };

      setAnalysisResults(results);
      onAnalysisComplete?.(results);

      toast({
        title: "Analysis Complete",
        description: `Found ${results.duplicateFiles} duplicate files out of ${results.totalFiles} total files.`,
      });

    } catch (error: any) {
      console.error('Analysis failed:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze files. Please try again.",
        variant: "destructive",
      });
      setShowDialog(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <>
      <Button 
        onClick={startAnalysis}
        disabled={disabled || fileCount === 0 || isAnalyzing}
        className="bg-gradient-primary hover:opacity-90 text-white"
      >
        {isAnalyzing ? (
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        ) : (
          <Brain className="h-4 w-4 mr-2" />
        )}
        Analyze Files
        {fileCount > 0 && (
          <Badge variant="secondary" className="ml-2">
            {fileCount}
          </Badge>
        )}
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI File Analysis
            </DialogTitle>
            <DialogDescription>
              Analyzing your uploaded files for duplicates and optimizations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Progress Section */}
            {isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{currentStep}</span>
                  <span className="font-medium">{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </motion.div>
            )}

            {/* Results Section */}
            {analysisResults && !isAnalyzing && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Analysis Complete</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="font-medium">Total Files</div>
                    <div className="text-xl font-bold">{analysisResults.totalFiles}</div>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="font-medium">Duplicates Found</div>
                    <div className="text-xl font-bold text-orange-600">{analysisResults.duplicateFiles}</div>
                  </div>
                </div>

                {analysisResults.duplicateGroups.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Duplicate Groups:</h4>
                    <div className="max-h-32 overflow-y-auto space-y-1">
                      {analysisResults.duplicateGroups.map((group, index) => (
                        <div key={index} className="p-2 bg-orange-50 border border-orange-200 rounded text-xs">
                          <div className="font-medium">{group.files.length} similar files</div>
                          <div className="text-muted-foreground">
                            {Math.round(group.similarityScore * 100)}% similarity
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {analysisResults.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm flex items-center gap-1">
                      <AlertCircle className="h-4 w-4" />
                      Recommendations:
                    </h4>
                    <ul className="text-xs space-y-1 text-muted-foreground">
                      {analysisResults.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-start gap-1">
                          <span className="mt-0.5">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <Button 
                    onClick={() => setShowDialog(false)}
                    className="w-full"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    View Detailed Report
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}