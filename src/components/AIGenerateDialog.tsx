import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Loader2, Sparkles } from 'lucide-react';

interface AIGenerateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (count: number) => Promise<void>;
}

export function AIGenerateDialog({ isOpen, onClose, onGenerate }: AIGenerateDialogProps) {
  const [problemCount, setProblemCount] = useState<string>('10');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async () => {
    const count = parseInt(problemCount, 10);
    
    if (isNaN(count) || count < 1 || count > 100) {
      setError('Please enter a number between 1 and 100');
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      await onGenerate(count);
      setProblemCount('10'); // Reset for next time
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate questions');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating) {
      setProblemCount('10');
      setError(null);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-purple-600" />
              <CardTitle>Generate by AI</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isGenerating}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription>
            Create TOEIC reading comprehension questions using AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="problemCount">Number of Problems</Label>
            <Input
              id="problemCount"
              type="number"
              min="1"
              max="100"
              value={problemCount}
              onChange={(e) => {
                setProblemCount(e.target.value);
                setError(null);
              }}
              disabled={isGenerating}
              placeholder="Enter number of problems (1-100)"
            />
            <p className="text-sm text-gray-500">
              Enter how many reading comprehension questions you want to generate
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isGenerating}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !problemCount}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

