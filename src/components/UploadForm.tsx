import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, X } from 'lucide-react';
import { llmOCRService } from '@/lib/llmOCR';
import { fileStorage } from '@/lib/fileStorage';
import { Simulation } from '@/types';
import { CloudinaryFileUploader } from '@/components/CloudinaryFileUploader';
import { ImageZoom } from '@/components/ui/image-zoom';
import { CloudinaryFile } from '@/lib/cloudinaryStorage';

interface UploadFormProps {
  onSimulationCreated: (simulation: Simulation) => void;
}

export function UploadForm({ onSimulationCreated }: UploadFormProps) {
  const [title, setTitle] = useState('');
  const [problemImages, setProblemImages] = useState<CloudinaryFile[]>([]);
  const [answerSheet, setAnswerSheet] = useState<CloudinaryFile | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');

  const handleProblemImageUpload = (file: CloudinaryFile) => {
    setProblemImages(prev => [...prev, file]);
    setError(''); // Clear any previous errors
  };

  const handleAnswerSheetUpload = (file: CloudinaryFile) => {
    setAnswerSheet(file);
    setError(''); // Clear any previous errors
  };

  const removeProblemImage = (index: number) => {
    setProblemImages(prev => {
      const newImages = [...prev];
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const removeAnswerSheet = () => {
    setAnswerSheet(null);
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
      // Convert Cloudinary files to File objects for LLM processing
      const problemFiles = await Promise.all(
        problemImages.map(async (img) => {
          const response = await fetch(img.secureUrl);
          const blob = await response.blob();
          return new File([blob], img.name, { type: img.mimeType });
        })
      );

      const answerSheetFile = answerSheet ? (async () => {
        const response = await fetch(answerSheet.secureUrl);
        const blob = await response.blob();
        return new File([blob], answerSheet.name, { type: answerSheet.mimeType });
      })() : null;

      const simulation = await llmOCRService.parseTestFromImages(
        problemFiles,
        await answerSheetFile!,
        title,
        problemImages // Pass the original Cloudinary files for URL preservation
      );

      fileStorage.saveSimulation(simulation);
      onSimulationCreated(simulation);

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
        <div className="mt-2 space-y-3">
          <CloudinaryFileUploader
            onFileUploaded={handleProblemImageUpload}
            acceptedTypes="image/*"
            maxSize={10}
            multiple={true}
          />
          
          {problemImages.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {problemImages.map((img, index) => (
                <div key={index} className="relative">
                  <ImageZoom
                    src={img.secureUrl}
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
      </div>

      <div>
        <Label>Answer Sheet</Label>
        <div className="mt-2">
          <CloudinaryFileUploader
            onFileUploaded={handleAnswerSheetUpload}
            onFileRemoved={removeAnswerSheet}
            acceptedTypes="image/*"
            maxSize={10}
            multiple={false}
          />
        </div>
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
