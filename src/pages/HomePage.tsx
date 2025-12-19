import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Users, Settings, FileText, Image, Upload, Link as LinkIcon, Sparkles, HelpCircle, ArrowRight } from 'lucide-react';
import { fileStorage } from '@/lib/fileStorage';
import { Simulation } from '@/types';
import { UploadForm } from '@/components/UploadForm';
import { AnswerSheetUploadForm } from '@/components/AnswerSheetUploadForm';
import { QuestionTypeDemo } from '@/components/QuestionTypeDemo';
import { AIGenerateDialog } from '@/components/AIGenerateDialog';
import { llmOCRService } from '@/lib/llmOCR';
import { useOnboarding, OnboardingStep } from '@/hooks/useOnboarding';

const homePageOnboardingSteps: OnboardingStep[] = [
  {
    element: 'h1',
    intro: 'Welcome to TOEIC Test Simulator! This app helps you practice for your TOEIC exam with realistic test conditions.',
    title: 'Welcome to TOEIC Simulator',
  },
  {
    element: '[data-onboarding="ai-generate"]',
    intro: 'Generate authentic TOEIC reading comprehension questions automatically using AI. Perfect for creating practice tests quickly.',
    title: 'AI Question Generation',
    position: 'right',
  },
  {
    element: '[data-onboarding="take-test"]',
    intro: 'Take practice tests from your available simulations. Click "Start" to begin a test, or "View All" to see more options in Settings.',
    title: 'Take Practice Tests',
    position: 'right',
  },
  {
    element: '[data-onboarding="full-ocr"]',
    intro: 'Upload test images and answer sheets for complete OCR processing. This creates new simulations from scanned TOEIC materials.',
    title: 'Full OCR Upload',
    position: 'left',
  },
  {
    element: '[data-onboarding="answer-sheet-only"]',
    intro: 'Upload answer sheets only to create test questions. Useful when you have answer keys but no question images.',
    title: 'Answer Sheet Upload',
    position: 'left',
  },
  {
    element: '[data-onboarding="manual-creation"]',
    intro: 'Create complex questions manually with reading passages, multi-documents, and more. Access the full question builder here.',
    title: 'Manual Question Creation',
    position: 'top',
  },
  {
    element: '[data-onboarding="import-test"]',
    intro: 'Import existing tests from JSON files or URLs. Share tests with others or backup your work.',
    title: 'Import Tests',
    position: 'top',
  },
  {
    element: '[data-onboarding="question-types-demo"]',
    intro: 'Explore all supported question types including reading comprehension, image questions, and multi-document tasks.',
    title: 'Question Types Demo',
    position: 'top',
  },
  {
    element: '[data-onboarding="quick-stats"]',
    intro: 'Track your progress with quick statistics showing available tests and total questions.',
    title: 'Quick Overview',
    position: 'top',
  },
];

export function HomePage() {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showAnswerSheetForm, setShowAnswerSheetForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [showAIGenerateDialog, setShowAIGenerateDialog] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const { startTour } = useOnboarding(homePageOnboardingSteps, 'homepage');

  useEffect(() => {
    // Load simulations from the enhanced storage system
    const enhancedSimulations = fileStorage.getSimulations();
    setSimulations(enhancedSimulations);
  }, []);

  const handleSimulationCreated = (newSimulation: Simulation) => {
    setSimulations(prev => [...prev, newSimulation]);
    setShowUploadForm(false);
    setShowAnswerSheetForm(false);
    setShowImportForm(false);
    setShowAIGenerateDialog(false);
  };

  const handleAIGenerate = async (count: number) => {
    try {
      // The system will automatically fill missing questions
      const questions = await llmOCRService.generateReadingQuestions(count);

      // Show a message if we got fewer than requested (after retries)
      if (questions.length < count) {
        const missing = count - questions.length;
        alert(
          `Generated ${questions.length} out of ${count} requested questions.\n` +
          `${missing} questions could not be generated after multiple attempts.\n\n` +
          `The simulation will be created with ${questions.length} questions.`
        );
      } else {
        alert(`Successfully generated all ${count} reading comprehension questions!`);
      }

      const simulation = await fileStorage.createSimulation(
        `AI Generated TOEIC Reading Test (${questions.length} questions)`,
        questions
      );
      handleSimulationCreated(simulation);
    } catch (error) {
      console.error('Failed to generate questions:', error);
      throw error;
    }
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = e.target?.result as string;
        const simulation = fileStorage.importSimulation(jsonData);
        setSimulations(prev => [...prev, simulation]);
        alert(`Successfully imported simulation: ${simulation.title}`);
      } catch (error) {
        console.error('Failed to import simulation:', error);
        alert('Failed to import simulation. Please check that the file is a valid simulation JSON.');
      }
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  const handleUrlImport = async () => {
    if (!importUrl.trim()) {
      alert('Please enter a valid URL');
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
      setSimulations(prev => [...prev, simulation]);
      setImportUrl('');
      setShowImportForm(false);
      alert(`Successfully imported simulation: ${simulation.title}`);
    } catch (error) {
      console.error('Failed to import simulation from URL:', error);
      alert('Failed to import simulation from URL. Please check the URL and try again.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-12 sm:space-y-16 max-w-6xl mx-auto">
      {/* Header */}
      <div className="text-center relative py-12 px-4 sm:px-6 rounded-3xl bg-white shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
        <div className="absolute top-0 right-0 p-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={startTour}
            className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
            title="Take a tour of the app"
          >
            <HelpCircle className="h-5 w-5 mr-2" />
            <span className="font-medium">Guide</span>
          </Button>
        </div>
        
        {/* Background blobs for premium feel */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-100/40 rounded-full blur-3xl -z-10" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-100/40 rounded-full blur-3xl -z-10" />

        <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold mb-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
          <Sparkles className="h-4 w-4 mr-2" />
          The Ultimate Test Prep Experience
        </div>
        
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 mb-6 tracking-tight leading-tight animate-in fade-in slide-in-from-bottom-3 duration-700 delay-100">
          TOEIC Test <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Simulator</span>
        </h1>
        
        <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          Master your English proficiency with our AI-powered simulation platform.
          Professional tools for professional results.
        </p>
      </div>

      {/* Main Action Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* AI Generate */}
        <Card className="premium-card group bg-white border-none shadow-lg shadow-slate-200/50" data-onboarding="ai-generate">
          <CardHeader className="pb-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300">
              <Sparkles className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900">AI Generation</CardTitle>
            <CardDescription className="text-slate-500 line-clamp-2">
              Create authentic TOEIC reading sections using advanced AI models.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full h-12 rounded-xl bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-200 premium-button" 
              onClick={() => setShowAIGenerateDialog(true)}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Section
            </Button>
          </CardContent>
        </Card>

        {/* Take Test */}
        <Card className="premium-card group bg-white border-none shadow-lg shadow-slate-200/50" data-onboarding="take-test">
          <CardHeader className="pb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300">
              <Play className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900">Resume & Start</CardTitle>
            <CardDescription className="text-slate-500 line-clamp-2">
              Jump back into your practice tests or start a new challenge.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {simulations.length > 0 ? (
              <div className="space-y-3">
                {simulations.slice(0, 2).map((simulation) => (
                  <Link key={simulation.id} to={`/simulate/${simulation.id}`} className="block">
                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50 hover:border-blue-200 transition-all group/item">
                      <div className="min-w-0 flex-1 pr-4">
                        <h3 className="font-semibold text-slate-800 truncate text-sm">{simulation.title}</h3>
                        <p className="text-xs text-slate-400 mt-0.5">{simulation.questions.length} Questions</p>
                      </div>
                      <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg group-hover/item:bg-emerald-600 group-hover/item:text-white transition-colors">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </Link>
                ))}
                <Link to="/settings" className="block mt-2">
                  <Button variant="ghost" className="w-full text-slate-500 hover:text-blue-600 hover:bg-blue-50 text-sm font-semibold rounded-xl">
                    View Library ({simulations.length})
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No simulations available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Full OCR */}
        <Card className="premium-card group bg-white border-none shadow-lg shadow-slate-200/50" data-onboarding="full-ocr">
          <CardHeader className="pb-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300">
              <Image className="h-6 w-6" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-900">OCR Upload</CardTitle>
            <CardDescription className="text-slate-500 line-clamp-2">
              Convert physical test papers into digital simulations instantly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showUploadForm ? (
              <Button 
                className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 premium-button" 
                onClick={() => setShowUploadForm(true)}
              >
                <Upload className="h-4 w-4 mr-2" />
                Scan Documents
              </Button>
            ) : (
              <UploadForm onSimulationCreated={handleSimulationCreated} />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Answer Sheet Only */}
        <Card className="premium-card bg-white border-none shadow-lg shadow-slate-200/50 md:col-span-1" data-onboarding="answer-sheet-only">
          <CardHeader>
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center mb-3">
              <FileText className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg font-bold">Smart Keys</CardTitle>
            <CardDescription className="text-sm">Create test structures from answer sheets.</CardDescription>
          </CardHeader>
          <CardContent>
            {!showAnswerSheetForm ? (
              <Button variant="outline" className="w-full rounded-xl border-slate-200 hover:border-orange-300 hover:bg-orange-50 text-slate-600 h-10" onClick={() => setShowAnswerSheetForm(true)}>
                Quick Import
              </Button>
            ) : (
              <AnswerSheetUploadForm onSimulationCreated={handleSimulationCreated} />
            )}
          </CardContent>
        </Card>

        {/* Manual Creation */}
        <Card className="premium-card bg-white border-none shadow-lg shadow-slate-200/50 md:col-span-1" data-onboarding="manual-creation">
          <CardHeader>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mb-3">
              <Settings className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg font-bold">Expert Builder</CardTitle>
            <CardDescription className="text-sm">Manually craft complex multi-doc tasks.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/settings">
              <Button variant="outline" className="w-full rounded-xl border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 h-10">
                Open Editor
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Import Test */}
        <Card className="premium-card bg-white border-none shadow-lg shadow-slate-200/50 md:col-span-1" data-onboarding="import-test">
          <CardHeader>
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center mb-3">
              <Upload className="h-5 w-5" />
            </div>
            <CardTitle className="text-lg font-bold">Cloud Sync</CardTitle>
            <CardDescription className="text-sm">Sync tests from JSON files or web URLs.</CardDescription>
          </CardHeader>
          <CardContent>
            {!showImportForm ? (
              <Button variant="outline" className="w-full rounded-xl border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 h-10" onClick={() => setShowImportForm(true)}>
                Sync Now
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="space-y-3">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileImport}
                    className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <LinkIcon className="h-3 w-3 text-slate-400" />
                    </div>
                    <Input
                      type="url"
                      placeholder="Simulation URL..."
                      value={importUrl}
                      onChange={(e) => setImportUrl(e.target.value)}
                      className="pl-9 h-10 text-xs rounded-xl border-slate-200"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleUrlImport} disabled={isImporting || !importUrl.trim()} className="flex-1 h-9 rounded-lg text-xs" size="sm">
                    Import
                  </Button>
                  <Button variant="ghost" onClick={() => setShowImportForm(false)} className="h-9 rounded-lg text-xs" size="sm">
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Stats */}
      <Card className="bg-slate-900 text-white border-none shadow-2xl overflow-hidden relative rounded-3xl" data-onboarding="quick-stats">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-1/3 h-full bg-blue-600/10 skew-x-12 -mr-16" />
        
        <CardHeader className="relative pb-0 pt-8 px-8">
          <CardTitle className="text-2xl font-black tracking-tight">Practice Insights</CardTitle>
          <CardDescription className="text-slate-400">Your current training inventory at a glance.</CardDescription>
        </CardHeader>
        <CardContent className="relative p-8 pt-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div className="space-y-2 group">
              <div className="text-4xl lg:text-5xl font-black text-blue-500 group-hover:scale-110 transition-transform origin-left">
                {simulations.length}
              </div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Available Sections</div>
            </div>
            <div className="space-y-2 group">
              <div className="text-4xl lg:text-5xl font-black text-emerald-500 group-hover:scale-110 transition-transform origin-left">
                {simulations.reduce((total, sim) => total + sim.questions.length, 0)}
              </div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Total Exercises</div>
            </div>
            <div className="space-y-2 group">
              <div className="text-4xl lg:text-5xl font-black text-indigo-500 group-hover:scale-110 transition-transform origin-left">
                0
              </div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">Completed Sessions</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Section */}
      <div data-onboarding="question-types-demo" className="py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Interactive Formats</h2>
          <p className="text-slate-500 max-w-xl mx-auto">Explore the rich question types supported by our simulator.</p>
        </div>
        <QuestionTypeDemo />
      </div>

      {/* AI Generate Dialog */}
      <AIGenerateDialog
        isOpen={showAIGenerateDialog}
        onClose={() => setShowAIGenerateDialog(false)}
        onGenerate={handleAIGenerate}
      />
    </div>
  );
}
