import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Sparkles, Image, FileText, Upload, PenTool, Loader2, Link as LinkIcon, ArrowLeft } from 'lucide-react';
import { Simulation } from '@/types';
import { fileStorage } from '@/lib/fileStorage';
import { llmOCRService } from '@/lib/llmOCR';
import { UploadForm } from '@/components/UploadForm';
import { AnswerSheetUploadForm } from '@/components/AnswerSheetUploadForm';
import { toast } from 'sonner';

type CreationMethod = 'select' | 'manual' | 'ai' | 'ocr' | 'answer-sheet' | 'import';

interface NewTestMethodDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulationCreated: (simulation: Simulation) => void;
}

interface MethodCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  color: string;
}

function MethodCard({ icon, title, description, onClick, color }: MethodCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-xl border-2 border-transparent bg-gradient-to-br ${color} hover:border-blue-300 hover:shadow-lg transition-all duration-200 text-left group`}
    >
      <div className="flex items-start gap-4">
        <div className="p-2 rounded-lg bg-white/80 shadow-sm group-hover:scale-110 transition-transform">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-600 line-clamp-2">{description}</p>
        </div>
      </div>
    </button>
  );
}

export function NewTestMethodDialog({ isOpen, onClose, onSimulationCreated }: NewTestMethodDialogProps) {
  const [method, setMethod] = useState<CreationMethod>('select');
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  
  // AI Generation state
  const [problemCount, setProblemCount] = useState('10');
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Import state
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (!isCreating && !isGenerating && !isImporting) {
      setMethod('select');
      setTitle('');
      setProblemCount('10');
      setImportUrl('');
      onClose();
    }
  };

  const handleBack = () => {
    setMethod('select');
    setTitle('');
  };

  // Manual Creation
  const handleManualCreate = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title for the simulation');
      return;
    }

    setIsCreating(true);
    try {
      const simulation = await fileStorage.createSimulation(title);
      toast.success(`Created "${simulation.title}" - Add questions to get started!`);
      onSimulationCreated(simulation);
      handleClose();
    } catch (error) {
      console.error('Failed to create simulation:', error);
      toast.error('Failed to create simulation');
    } finally {
      setIsCreating(false);
    }
  };

  // AI Generation
  const handleAIGenerate = async () => {
    const count = parseInt(problemCount, 10);
    
    if (isNaN(count) || count < 1 || count > 100) {
      toast.error('Please enter a number between 1 and 100');
      return;
    }

    setIsGenerating(true);
    try {
      const questions = await llmOCRService.generateReadingQuestions(count);

      if (questions.length < count) {
        toast.warning(`Generated ${questions.length} out of ${count} requested questions`);
      } else {
        toast.success(`Successfully generated ${count} reading comprehension questions!`);
      }

      const simulation = await fileStorage.createSimulation(
        `AI Generated TOEIC Reading Test (${questions.length} questions)`,
        questions
      );
      onSimulationCreated(simulation);
      handleClose();
    } catch (error) {
      console.error('Failed to generate questions:', error);
      toast.error('Failed to generate questions. Please check your LLM settings.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Import from File
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = e.target?.result as string;
        const simulation = fileStorage.importSimulation(jsonData);
        toast.success(`Successfully imported "${simulation.title}"`);
        onSimulationCreated(simulation);
        handleClose();
      } catch (error) {
        console.error('Failed to import simulation:', error);
        toast.error('Failed to import simulation. Please check that the file is valid.');
      }
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  // Import from URL
  const handleUrlImport = async () => {
    if (!importUrl.trim()) {
      toast.error('Please enter a valid URL');
      return;
    }

    setIsImporting(true);
    try {
      const response = await fetch(importUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const jsonData = await response.text();
      const simulation = fileStorage.importSimulation(jsonData);
      toast.success(`Successfully imported "${simulation.title}"`);
      onSimulationCreated(simulation);
      handleClose();
    } catch (error) {
      console.error('Failed to import simulation from URL:', error);
      toast.error('Failed to import from URL. Please check the URL and try again.');
    } finally {
      setIsImporting(false);
    }
  };

  // Handle simulation created from sub-forms
  const handleSubFormSimulationCreated = (simulation: Simulation) => {
    onSimulationCreated(simulation);
    handleClose();
  };

  const renderMethodSelection = () => (
    <div className="space-y-3">
      <MethodCard
        icon={<PenTool className="h-5 w-5 text-slate-600" />}
        title="Manual Creation"
        description="Create an empty test and add questions one by one using the question builder."
        onClick={() => setMethod('manual')}
        color="from-slate-50 to-slate-100"
      />
      <MethodCard
        icon={<Sparkles className="h-5 w-5 text-purple-600" />}
        title="AI Generation"
        description="Automatically generate TOEIC reading comprehension questions using AI."
        onClick={() => setMethod('ai')}
        color="from-purple-50 to-purple-100"
      />
      <MethodCard
        icon={<Image className="h-5 w-5 text-blue-600" />}
        title="OCR Upload (Full Test)"
        description="Upload test images and answer sheets for complete OCR processing."
        onClick={() => setMethod('ocr')}
        color="from-blue-50 to-blue-100"
      />
      <MethodCard
        icon={<FileText className="h-5 w-5 text-orange-600" />}
        title="Answer Sheet Only"
        description="Upload just an answer sheet to create a test structure. Add questions later."
        onClick={() => setMethod('answer-sheet')}
        color="from-orange-50 to-orange-100"
      />
      <MethodCard
        icon={<Upload className="h-5 w-5 text-indigo-600" />}
        title="Import from File/URL"
        description="Import an existing test from a JSON file or web URL."
        onClick={() => setMethod('import')}
        color="from-indigo-50 to-indigo-100"
      />
    </div>
  );

  const renderManualCreation = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={handleBack} className="p-1">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h3 className="font-semibold text-gray-900">Manual Creation</h3>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="manual-title">Simulation Title</Label>
        <Input
          id="manual-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., TOEIC Practice Test 1"
          disabled={isCreating}
        />
        <p className="text-sm text-gray-500">
          Create an empty simulation, then add questions manually.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={handleBack} disabled={isCreating} className="flex-1">
          Back
        </Button>
        <Button onClick={handleManualCreate} disabled={isCreating || !title.trim()} className="flex-1">
          {isCreating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Test'
          )}
        </Button>
      </div>
    </div>
  );

  const renderAIGeneration = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={handleBack} className="p-1">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <h3 className="font-semibold text-gray-900">AI Generation</h3>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="problem-count">Number of Problems</Label>
        <Input
          id="problem-count"
          type="number"
          min="1"
          max="100"
          value={problemCount}
          onChange={(e) => setProblemCount(e.target.value)}
          disabled={isGenerating}
          placeholder="Enter number of problems (1-100)"
        />
        <p className="text-sm text-gray-500">
          AI will generate reading comprehension questions with passages and answer options.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="outline" onClick={handleBack} disabled={isGenerating} className="flex-1">
          Back
        </Button>
        <Button onClick={handleAIGenerate} disabled={isGenerating || !problemCount} className="flex-1 bg-purple-600 hover:bg-purple-700">
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
    </div>
  );

  const renderOCRUpload = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={handleBack} className="p-1">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Image className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">OCR Upload (Full Test)</h3>
        </div>
      </div>
      
      <UploadForm onSimulationCreated={handleSubFormSimulationCreated} />
    </div>
  );

  const renderAnswerSheetOnly = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={handleBack} className="p-1">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-orange-600" />
          <h3 className="font-semibold text-gray-900">Answer Sheet Only</h3>
        </div>
      </div>
      
      <AnswerSheetUploadForm onSimulationCreated={handleSubFormSimulationCreated} />
    </div>
  );

  const renderImport = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={handleBack} className="p-1">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-900">Import Test</h3>
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <Label>Import from File</Label>
          <input
            type="file"
            accept=".json"
            onChange={handleFileImport}
            className="w-full mt-2 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
          />
        </div>
        
        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink mx-4 text-gray-400 text-sm">or</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="import-url">Import from URL</Label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <LinkIcon className="h-4 w-4 text-gray-400" />
            </div>
            <Input
              id="import-url"
              type="url"
              placeholder="https://example.com/simulation.json"
              value={importUrl}
              onChange={(e) => setImportUrl(e.target.value)}
              className="pl-10"
              disabled={isImporting}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={handleBack} disabled={isImporting} className="flex-1">
            Back
          </Button>
          <Button 
            onClick={handleUrlImport} 
            disabled={isImporting || !importUrl.trim()} 
            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              'Import from URL'
            )}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (method) {
      case 'select':
        return renderMethodSelection();
      case 'manual':
        return renderManualCreation();
      case 'ai':
        return renderAIGeneration();
      case 'ocr':
        return renderOCRUpload();
      case 'answer-sheet':
        return renderAnswerSheetOnly();
      case 'import':
        return renderImport();
      default:
        return renderMethodSelection();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
      <Card className="w-full max-w-lg mx-2 sm:mx-4 my-4 max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-xl">
                {method === 'select' ? 'Create New Test' : ''}
              </CardTitle>
              {method === 'select' && (
                <CardDescription>
                  Choose how you want to create your TOEIC simulation
                </CardDescription>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              disabled={isCreating || isGenerating || isImporting}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
