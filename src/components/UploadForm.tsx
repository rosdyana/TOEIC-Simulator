import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, FileImage, Loader2 } from 'lucide-react';
import { llmOCRService } from '@/lib/llmOCR';
import { validateImageFile } from '@/lib/ocrGuidelines';
import { fileStorage } from '@/lib/fileStorage';
import { Simulation, UploadedFile } from '@/types';

interface UploadFormProps {
  onSimulationCreated: (simulation: Simulation) => void;
}

export function UploadForm({ onSimulationCreated }: UploadFormProps) {
  const [title, setTitle] = useState('');
  const [problemImages, setProblemImages] = useState<UploadedFile[]>([]);
  const [answerSheet, setAnswerSheet] = useState<UploadedFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleProblemImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: UploadedFile[] = [];
    
    files.forEach(file => {
      const validation = validateImageFile(file);
      if (validation.valid) {
        validFiles.push({
          file,
          preview: URL.createObjectURL(file)
        });
      } else {
        setError(validation.error || 'Invalid file');
      }
    });
    
    setProblemImages(prev => [...prev, ...validFiles]);
  };

  const handleAnswerSheetUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validation = validateImageFile(file);
      if (validation.valid) {
        setAnswerSheet({
          file,
          preview: URL.createObjectURL(file)
        });
        setError(''); // Clear any previous errors
      } else {
        setError(validation.error || 'Invalid file');
      }
    }
  };

  const removeProblemImage = (index: number) => {
    setProblemImages(prev => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].preview);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const removeAnswerSheet = () => {
    if (answerSheet) {
      URL.revokeObjectURL(answerSheet.preview);
      setAnswerSheet(null);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      setError('Please enter a title for the simulation');
      return;
    }

    if (problemImages.length === 0) {
      setError('Please upload at least one problem image');
      return;
    }

    if (!answerSheet) {
      setError('Please upload an answer sheet');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const simulation = await llmOCRService.parseTestFromImages(
        problemImages.map(img => img.file),
        answerSheet.file,
        title
      );

      fileStorage.saveSimulation(simulation);
      onSimulationCreated(simulation);

      // Clean up object URLs
      problemImages.forEach(img => URL.revokeObjectURL(img.preview));
      if (answerSheet) {
        URL.revokeObjectURL(answerSheet.preview);
      }

      // Reset form
      setTitle('');
      setProblemImages([]);
      setAnswerSheet(null);
    } catch (err) {
      setError('Failed to process images. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="title">Simulation Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., TOEIC Practice Test 1"
          className="mt-1"
        />
      </div>

      <div>
        <Label>Problem Images</Label>
        <div className="mt-2">
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="problem-images"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-4 text-gray-500" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> problem images
                </p>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB each</p>
                <p className="text-xs text-blue-600 mt-1">Tip: Use clear, high-resolution images for better AI recognition</p>
              </div>
              <input
                id="problem-images"
                type="file"
                className="hidden"
                multiple
                accept="image/*"
                onChange={handleProblemImageUpload}
              />
            </label>
          </div>
        </div>

        {problemImages.length > 0 && (
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            {problemImages.map((img, index) => (
              <div key={index} className="relative">
                <img
                  src={img.preview}
                  alt={`Problem ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border"
                />
                <button
                  onClick={() => removeProblemImage(index)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <Label>Answer Sheet</Label>
        <div className="mt-2">
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="answer-sheet"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <FileImage className="w-8 h-8 mb-4 text-gray-500" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> answer sheet
                </p>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                <p className="text-xs text-blue-600 mt-1">Tip: AI can recognize various answer sheet formats</p>
              </div>
              <input
                id="answer-sheet"
                type="file"
                className="hidden"
                accept="image/*"
                onChange={handleAnswerSheetUpload}
              />
            </label>
          </div>
        </div>

        {answerSheet && (
          <div className="mt-4">
            <div className="relative inline-block">
              <img
                src={answerSheet.preview}
                alt="Answer sheet"
                className="w-48 h-32 object-cover rounded-lg border"
              />
              <button
                onClick={removeAnswerSheet}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex space-x-4">
        <Button
          onClick={handleSubmit}
          disabled={isProcessing || !title || problemImages.length === 0 || !answerSheet}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing with AI...
            </>
          ) : (
            'Create Simulation'
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setTitle('');
            setProblemImages([]);
            setAnswerSheet(null);
            setError('');
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
