import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Info } from 'lucide-react';
import { llmOCRService } from '@/lib/llmOCR';
import { fileStorage } from '@/lib/fileStorage';
import { Simulation } from '@/types';
import { CloudinaryFileUploader } from '@/components/CloudinaryFileUploader';
import { CloudinaryFile } from '@/lib/cloudinaryStorage';

interface AnswerSheetUploadFormProps {
  onSimulationCreated: (simulation: Simulation) => void;
}

export function AnswerSheetUploadForm({ onSimulationCreated }: AnswerSheetUploadFormProps) {
  const [title, setTitle] = useState('');
  const [answerSheet, setAnswerSheet] = useState<CloudinaryFile | null>(null);
  const [startNumber, setStartNumber] = useState(101);
  const [endNumber, setEndNumber] = useState(200);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualAnswers, setManualAnswers] = useState('');

  const handleAnswerSheetUpload = (file: CloudinaryFile) => {
    setAnswerSheet(file);
    setError(''); // Clear any previous errors
  };

  const removeAnswerSheet = () => {
    setAnswerSheet(null);
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
      // Convert Cloudinary file to File object for LLM processing
      const response = await fetch(answerSheet.secureUrl);
      const blob = await response.blob();
      const file = new File([blob], answerSheet.name, { type: answerSheet.mimeType });

      const result = await llmOCRService.extractAnswerSheetFromImage(
        file,
        startNumber,
        endNumber
      );

      if (!result.success) {
        throw new Error(result.error || 'Failed to process answer sheet');
      }

      const simulation: Simulation = {
        id: Math.random().toString(36).substr(2, 9),
        title: title || 'TOEIC Answer Sheet Test',
        questions: result.questions || [],
        createdAt: new Date().toISOString(),
        isAnswerKeyOnly: true
      };

      fileStorage.saveSimulation(simulation);
      onSimulationCreated(simulation);

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
            <p>Upload an answer sheet image and AI will extract the answers automatically. The system will create a test with correct answers only. You can add questions later through the settings panel.</p>
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

      {/* Manual Input Option */}
      <div className="border-t pt-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-medium">Alternative: Manual Input</h3>
            <p className="text-sm text-gray-600">If AI recognition fails, you can manually enter the answers</p>
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
              Processing with AI...
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
