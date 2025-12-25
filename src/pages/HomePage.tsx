import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Settings, FileText, Plus, HelpCircle, ArrowRight, BarChart3, Trophy } from 'lucide-react';
import { fileStorage } from '@/lib/fileStorage';
import { Simulation } from '@/types';
import { QuestionTypeDemo } from '@/components/QuestionTypeDemo';
import { NewTestMethodDialog } from '@/components/NewTestMethodDialog';
import { useOnboarding, OnboardingStep } from '@/hooks/useOnboarding';

const homePageOnboardingSteps: OnboardingStep[] = [
  {
    element: 'h1',
    intro: 'Welcome to TOEIC Test Simulator! This app helps you practice for your TOEIC exam with realistic test conditions.',
    title: 'Welcome to TOEIC Simulator',
  },
  {
    element: '[data-onboarding="quick-create"]',
    intro: 'Quickly create a new test using various methods: AI Generation, OCR Upload, Manual Creation, and more.',
    title: 'Quick Create',
    position: 'right',
  },
  {
    element: '[data-onboarding="take-test"]',
    intro: 'Jump into your available practice tests. Click on any test to start practicing immediately.',
    title: 'Take Practice Tests',
    position: 'right',
  },
  {
    element: '[data-onboarding="manage-tests"]',
    intro: 'Access the full Settings panel to manage your simulations, edit questions, and configure AI settings.',
    title: 'Manage Your Tests',
    position: 'left',
  },
  {
    element: '[data-onboarding="quick-stats"]',
    intro: 'Track your progress with quick statistics showing available tests and total questions.',
    title: 'Quick Overview',
    position: 'top',
  },
  {
    element: '[data-onboarding="question-types-demo"]',
    intro: 'Explore all supported question types including reading comprehension, image questions, and multi-document tasks.',
    title: 'Question Types Demo',
    position: 'top',
  },
];

export function HomePage() {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [showNewTestDialog, setShowNewTestDialog] = useState(false);
  const navigate = useNavigate();

  const { startTour } = useOnboarding(homePageOnboardingSteps, 'homepage');

  useEffect(() => {
    const enhancedSimulations = fileStorage.getSimulations();
    setSimulations(enhancedSimulations);
  }, []);

  const handleSimulationCreated = (newSimulation: Simulation) => {
    setSimulations(prev => [...prev, newSimulation]);
    setShowNewTestDialog(false);
    // Navigate to settings to manage the new simulation
    navigate(`/settings`);
  };

  // Get stats
  const totalQuestions = simulations.reduce((total, sim) => total + sim.questions.length, 0);

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
        
        {/* Background blobs */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-100/40 rounded-full blur-3xl -z-10" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-indigo-100/40 rounded-full blur-3xl -z-10" />

        <div className="inline-flex items-center px-4 py-2 rounded-full bg-blue-50 text-blue-700 text-sm font-semibold mb-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
          <Trophy className="h-4 w-4 mr-2" />
          The Ultimate Test Prep Experience
        </div>
        
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 mb-6 tracking-tight leading-tight animate-in fade-in slide-in-from-bottom-3 duration-700 delay-100">
          TOEIC Test <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">Simulator</span>
        </h1>
        
        <p className="text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
          Master your English proficiency with our AI-powered simulation platform.
        </p>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mt-8 animate-in fade-in slide-in-from-bottom-5 duration-700 delay-300">
          <Button 
            size="lg"
            className="h-12 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200"
            onClick={() => setShowNewTestDialog(true)}
            data-onboarding="quick-create"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create New Test
          </Button>
          <Link to="/settings">
            <Button 
              size="lg"
              variant="outline"
              className="h-12 px-6 rounded-xl border-slate-200 hover:border-slate-300"
              data-onboarding="manage-tests"
            >
              <Settings className="h-5 w-5 mr-2" />
              Manage Tests
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Available Tests */}
        <Card className="lg:col-span-2 bg-white border-none shadow-lg shadow-slate-200/50" data-onboarding="take-test">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Play className="h-5 w-5 text-emerald-600" />
                  Available Tests
                </CardTitle>
                <CardDescription className="text-slate-500">
                  Select a test to start practicing
                </CardDescription>
              </div>
              <Link to="/settings">
                <Button variant="ghost" size="sm" className="text-slate-500 hover:text-blue-600">
                  View All
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {simulations.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {simulations.slice(0, 4).map((simulation) => (
                  <Link key={simulation.id} to={`/simulate/${simulation.id}`} className="block group">
                    <div className="p-4 rounded-xl border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all bg-gradient-to-br from-slate-50 to-white">
                      <div className="flex items-start justify-between">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-semibold text-slate-800 truncate">{simulation.title}</h3>
                          <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
                            <span className="flex items-center gap-1">
                              <FileText className="h-4 w-4" />
                              {simulation.questions.length} Questions
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {Array.from(new Set(simulation.questions.map(q => q.type))).slice(0, 2).map(type => (
                              <span key={type} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                {type === 'reading' ? 'Reading' : type === 'image' ? 'Image' : type === 'text' ? 'Text' : type === 'multi-document' ? 'Multi-doc' : 'Answer Key'}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors ml-3">
                          <Play className="h-4 w-4" />
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="font-medium text-slate-500">No tests available</p>
                <p className="text-sm mt-1">Create your first test to get started</p>
                <Button 
                  onClick={() => setShowNewTestDialog(true)}
                  className="mt-4"
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Test
                </Button>
              </div>
            )}
            
            {simulations.length > 4 && (
              <div className="mt-4 text-center">
                <Link to="/settings">
                  <Button variant="ghost" className="text-slate-500 hover:text-blue-600">
                    View all {simulations.length} tests
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="space-y-6">
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-lg" data-onboarding="quick-stats">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-400" />
                Quick Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/10">
                <span className="text-slate-300">Total Tests</span>
                <span className="text-2xl font-bold text-blue-400">{simulations.length}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-white/10">
                <span className="text-slate-300">Total Questions</span>
                <span className="text-2xl font-bold text-emerald-400">{totalQuestions}</span>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links */}
          <Card className="bg-white border-none shadow-lg shadow-slate-200/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-bold text-slate-900">Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/settings" className="block">
                <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-blue-600 hover:bg-blue-50">
                  <Settings className="h-4 w-4 mr-3" />
                  Settings & Management
                </Button>
              </Link>
              <Link to="/stats" className="block">
                <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-blue-600 hover:bg-blue-50">
                  <BarChart3 className="h-4 w-4 mr-3" />
                  View Statistics
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-slate-600 hover:text-purple-600 hover:bg-purple-50"
                onClick={() => setShowNewTestDialog(true)}
              >
                <Plus className="h-4 w-4 mr-3" />
                Create New Test
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Demo Section */}
      <div data-onboarding="question-types-demo" className="py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Supported Question Types</h2>
          <p className="text-slate-500 max-w-xl mx-auto">Explore the rich variety of question formats supported by our simulator.</p>
        </div>
        <QuestionTypeDemo />
      </div>

      {/* New Test Method Dialog */}
      <NewTestMethodDialog
        isOpen={showNewTestDialog}
        onClose={() => setShowNewTestDialog(false)}
        onSimulationCreated={handleSimulationCreated}
      />
    </div>
  );
}
