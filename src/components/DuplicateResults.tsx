import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Copy,
  Database,
  FileX,
  Hash
} from 'lucide-react';

interface DuplicateResult {
  filename: string;
  similarity: number;
  file_id: string;
  upload_date: string;
}

interface UploadResponse {
  success: boolean;
  file_id: string;
  duplicates: DuplicateResult[];
  hashes: {
    phash: string;
    dhash: string;
    avgHash: string;
    colorHash: string;
  };
}

interface DuplicateResultsProps {
  results: UploadResponse;
  onNewUpload: () => void;
}

export function DuplicateResults({ results, onNewUpload }: DuplicateResultsProps) {
  const hasDuplicates = results.duplicates.length > 0;

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.95) return 'bg-red-500';
    if (similarity >= 0.90) return 'bg-orange-500';
    if (similarity >= 0.80) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getSimilarityLabel = (similarity: number) => {
    if (similarity >= 0.95) return 'Very High';
    if (similarity >= 0.90) return 'High';
    if (similarity >= 0.80) return 'Medium';
    return 'Low';
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Summary Card */}
      <Card className={`border-2 ${hasDuplicates ? 'border-orange-200 bg-orange-50' : 'border-green-200 bg-green-50'}`}>
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-3 text-xl">
            {hasDuplicates ? (
              <>
                <AlertTriangle className="h-6 w-6 text-orange-600" />
                <span className="text-orange-800">Potential Duplicates Found</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <span className="text-green-800">No Duplicates Found</span>
              </>
            )}
          </CardTitle>
          <CardDescription className={hasDuplicates ? 'text-orange-700' : 'text-green-700'}>
            {hasDuplicates
              ? `Found ${results.duplicates.length} potential duplicate${results.duplicates.length > 1 ? 's' : ''} in your collection`
              : 'This image appears to be unique in your collection'
            }
          </CardDescription>
        </CardHeader>

        {hasDuplicates && (
          <CardContent>
            <div className="space-y-4">
              {results.duplicates.map((duplicate, index) => (
                <div
                  key={duplicate.file_id}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {duplicate.filename.split('/').pop()}
                      </span>
                      <Badge
                        variant="secondary"
                        className={`text-white ${getSimilarityColor(duplicate.similarity)}`}
                      >
                        {(duplicate.similarity * 100).toFixed(1)}% Match
                      </Badge>
                      <Badge variant="outline">
                        {getSimilarityLabel(duplicate.similarity)}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        <span>
                          Uploaded {formatDistanceToNow(new Date(duplicate.upload_date), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Database className="h-4 w-4" />
                        <span>{duplicate.file_id.slice(0, 8)}...</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-900">
                        {(duplicate.similarity * 100).toFixed(1)}%
                      </div>
                      <div className="text-xs text-gray-500">
                        Similarity
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Technical Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Hash className="h-5 w-5" />
            Perceptual Hash Details
          </CardTitle>
          <CardDescription>
            Technical information about the image analysis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Perceptual Hash (pHash)</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 p-2 bg-gray-100 rounded text-xs font-mono">
                    {results.hashes.phash}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(results.hashes.phash)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Difference Hash (dHash)</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 p-2 bg-gray-100 rounded text-xs font-mono">
                    {results.hashes.dhash}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(results.hashes.dhash)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Average Hash (aHash)</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 p-2 bg-gray-100 rounded text-xs font-mono">
                    {results.hashes.avgHash}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(results.hashes.avgHash)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Color Hash</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 p-2 bg-gray-100 rounded text-xs font-mono">
                    {results.hashes.colorHash}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(results.hashes.colorHash)}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">How it works:</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• <strong>Perceptual Hash:</strong> Detects structural similarity regardless of size or minor edits</p>
              <p>• <strong>Difference Hash:</strong> Focuses on gradient changes, good for crops and rotations</p>
              <p>• <strong>Average Hash:</strong> Simple but effective for detecting basic duplicates</p>
              <p>• <strong>Color Hash:</strong> Compares color distribution for style variations</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-center">
        <Button onClick={onNewUpload} size="lg">
          <FileX className="h-4 w-4 mr-2" />
          Upload Another Image
        </Button>
      </div>
    </div>
  );
}
