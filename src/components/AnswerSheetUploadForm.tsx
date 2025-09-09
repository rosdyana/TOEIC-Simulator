import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, X, FileImage, Loader2, Info } from 'lucide-react';
import { parseAnswerSheetFromImage, preprocessImageForOCR } from '@/lib/ocr';
import { validateImageFile } from '@/lib/ocrGuidelines';
import { fileStorage } from '@/lib/fileStorage';
import { Simulation, UploadedFile } from '@/types';

interface AnswerSheetUploadFormProps {
  onSimulationCreated: (simulation: Simulation) => void;
}

export function AnswerSheetUploadForm({ onSimulationCreated }: AnswerSheetUploadFormProps) {
  const [title, setTitle] = useState('');
  const [answerSheet, setAnswerSheet] = useState<UploadedFile | null>(null);
  const [startNumber, setStartNumber] = useState(101);
  const [endNumber, setEndNumber] = useState(200);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualAnswers, setManualAnswers] = useState('');

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

  const removeAnswerSheet = () => {
    if (answerSheet) {
      URL.revokeObjectURL(answerSheet.preview);
      setAnswerSheet(null);
    }
  };

  const createSimulationFromManualAnswers = () => {
    if (!title.trim()) {
      setError('Please enter a title for the simulation');
      return;
    }

    if (!manualAnswers.trim()) {
      setError('Please enter the answers');
      return;
    }

    if (startNumber >= endNumber) {
      setError('Start number must be less than end number');
      return;
    }

    try {
      // Parse manual answers (expecting format like "101 B, 102 D, 103 C" or "B D C A B...")
      const answers = manualAnswers.trim().split(/[,\s]+/).filter(answer => answer.trim());
      const totalQuestions = endNumber - startNumber + 1;
      
      if (answers.length !== totalQuestions) {
        setError(`Expected ${totalQuestions} answers, but got ${answers.length}. Please check your input.`);
        return;
      }

      // Validate answers
      const validAnswers = answers.every(answer => /^[ABCD]$/i.test(answer.trim()));
      if (!validAnswers) {
        setError('All answers must be A, B, C, or D');
        return;
      }

      // Create simulation
      const questions = answers.map((answer, index) => ({
        id: startNumber + index,
        type: 'answer-key' as const,
        question: `Question ${startNumber + index} - Answer key only (to be added later)`,
        options: ['A', 'B', 'C', 'D'],
        answer: answer.trim().toUpperCase(),
        answerGrid: [{ questionNumber: startNumber + index, answer: answer.trim().toUpperCase() }]
      }));

      const simulation: Simulation = {
        id: Math.random().toString(36).substr(2, 9),
        title: title || 'TOEIC Answer Sheet Test',
        questions,
        createdAt: new Date().toISOString(),
        isAnswerKeyOnly: true
      };

      fileStorage.saveSimulation(simulation);
      onSimulationCreated(simulation);

      // Reset form
      setTitle('');
      setManualAnswers('');
      setStartNumber(101);
      setEndNumber(200);
      setShowManualInput(false);
    } catch (err) {
      setError('Failed to create simulation from manual answers.');
      console.error('Manual input error:', err);
    }
  };

  const handleSubmit = async () => {
    if (showManualInput) {
      createSimulationFromManualAnswers();
      return;
    }

    if (!title.trim()) {
      setError('Please enter a title for the simulation');
      return;
    }

    if (!answerSheet) {
      setError('Please upload an answer sheet');
      return;
    }

    if (startNumber >= endNumber) {
      setError('Start number must be less than end number');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      // Preprocess image for better OCR results
      const processedAnswerSheet = await preprocessImageForOCR(answerSheet.file);
      
      const simulation = await parseAnswerSheetFromImage(
        processedAnswerSheet,
        title,
        startNumber,
        endNumber
      );

      fileStorage.saveSimulation(simulation);
      onSimulationCreated(simulation);

      // Clean up object URL
      if (answerSheet) {
        URL.revokeObjectURL(answerSheet.preview);
      }

      // Reset form
      setTitle('');
      setAnswerSheet(null);
      setStartNumber(101);
      setEndNumber(200);
    } catch (err) {
      setError('Failed to process answer sheet. Please try again.');
      console.error('Upload error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-blue-800">
            <p className="font-medium mb-1">Answer Sheet Upload</p>
            <p>Upload an answer sheet image with answers in the format "101 (B)", "102 (D)", etc. The system will create a test with correct answers only. You can add questions later through the admin panel.</p>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="title">Simulation Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., TOEIC Practice Test - Answer Sheet Only"
          className="mt-1"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startNumber">Start Question Number</Label>
          <Input
            id="startNumber"
            type="number"
            value={startNumber}
            onChange={(e) => setStartNumber(parseInt(e.target.value) || 101)}
            min="1"
            max="999"
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="endNumber">End Question Number</Label>
          <Input
            id="endNumber"
            type="number"
            value={endNumber}
            onChange={(e) => setEndNumber(parseInt(e.target.value) || 200)}
            min="1"
            max="999"
            className="mt-1"
          />
        </div>
      </div>

      <div>
        <Label>Answer Sheet Image</Label>
        <div className="mt-2">
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="answer-sheet"
              className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-8 h-8 mb-4 text-gray-500" />
                <p className="mb-2 text-sm text-gray-500">
                  <span className="font-semibold">Click to upload</span> answer sheet
                </p>
                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                <p className="text-xs text-blue-600 mt-1">Format: "101 (B)", "102 (D)", etc.</p>
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

      {/* Manual Input Option */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium">Alternative: Manual Input</h3>
            <p className="text-sm text-gray-600">If OCR fails, you can manually enter the answers</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowManualInput(!showManualInput)}
          >
            {showManualInput ? 'Hide Manual Input' : 'Show Manual Input'}
          </Button>
        </div>

        {showManualInput && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="manualAnswers">Answers (separated by spaces or commas)</Label>
              <Textarea
                id="manualAnswers"
                value={manualAnswers}
                onChange={(e) => setManualAnswers(e.target.value)}
                placeholder="B D C A B D C A B D C A B D C A..."
                className="mt-1"
                rows={4}
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter {endNumber - startNumber + 1} answers (A, B, C, or D) separated by spaces or commas
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="flex space-x-4">
        <Button
          onClick={handleSubmit}
          disabled={isProcessing || !title || (!answerSheet && !showManualInput) || (showManualInput && !manualAnswers)}
          className="flex-1"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processing Answer Sheet...
            </>
          ) : showManualInput ? (
            'Create Test from Manual Input'
          ) : (
            'Create Answer Sheet Test'
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setTitle('');
            setAnswerSheet(null);
            setStartNumber(101);
            setEndNumber(200);
            setError('');
            setShowManualInput(false);
            setManualAnswers('');
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
