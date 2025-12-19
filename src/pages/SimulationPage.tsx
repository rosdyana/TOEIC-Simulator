import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, ArrowLeft, ArrowRight, CheckCircle, Pause, Play, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fileStorage } from '@/lib/fileStorage';
import { storage } from '@/lib/storage';
import { Simulation, StatsRecord } from '@/types';
import { formatTime, calculateScore, calculateTOEICTimeLimit, isReadingOnlyTest } from '@/lib/utils';
import { QuestionCard } from '@/components/QuestionCard';
import { ResultsPage } from '@/components/ResultsPage';
import { useOnboarding, OnboardingStep } from '@/hooks/useOnboarding';

const simulationPageOnboardingSteps: OnboardingStep[] = [
  {
    element: '[data-onboarding="test-header"]',
    intro: 'This shows your test progress, remaining time, and current question number. The timer counts down according to TOEIC rules.',
    title: 'Test Header & Timer',
  },
  {
    element: '[data-onboarding="progress-bar"]',
    intro: 'Visual progress indicator showing how many questions you\'ve completed out of the total.',
    title: 'Progress Tracking',
    position: 'bottom',
  },
  {
    element: '[data-onboarding="question-area"]',
    intro: 'The current question is displayed here. Read carefully and select your answer from the options below.',
    title: 'Question Display',
  },
  {
    element: '[data-onboarding="answer-options"]',
    intro: 'Click on your answer choice, or use keyboard shortcuts: 1=A, 2=B, 3=C, 4=D. These work even when typing in input fields.',
    title: 'Answer Selection',
  },
  {
    element: '[data-onboarding="navigation-buttons"]',
    intro: 'Navigate between questions with Previous/Next buttons, or use keyboard shortcuts: P=Previous, N=Next.',
    title: 'Question Navigation',
    position: 'top',
  },
  {
    element: '[data-onboarding="control-buttons"]',
    intro: 'Pause & Save your progress to continue later, or Save Progress to backup your current answers.',
    title: 'Test Controls',
    position: 'top',
  },
  {
    intro: '⚡ <strong>Keyboard Shortcuts:</strong><br/>• 1,2,3,4 = Select answers A,B,C,D<br/>• N = Next question<br/>• P = Previous question<br/>• S = Save progress<br/>• X = Pause/Resume test<br/><br/>Use these shortcuts for faster test-taking!',
    title: 'Keyboard Shortcuts',
  },
  {
    element: '[data-onboarding="submit-button"]',
    intro: 'When you\'re done with all questions, click Submit to finish the test and see your results.',
    title: 'Submit Test',
    position: 'top',
  },
];

export function SimulationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timeLimit, setTimeLimit] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isPaused, setIsPaused] = useState(true);
  const [sessionSaved, setSessionSaved] = useState(false);

  const handleResume = useCallback(() => {
    setIsPaused(false);
  }, []);

  const { startTour, isOnboardingComplete } = useOnboarding(simulationPageOnboardingSteps, 'simulation', {
    onComplete: () => {
      console.log('Tour Complete - Resuming');
      handleResume();
    },
    onExit: () => {
      console.log('Tour Exit - Resuming');
      handleResume();
    },
  });

  useEffect(() => {
    if (simulation && !isOnboardingComplete && isPaused) {
      const timer = setTimeout(() => {
        startTour();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [simulation, isOnboardingComplete, startTour, isPaused]);

  useEffect(() => {
    if (id) {
      const sim = fileStorage.getSimulation(id);
      if (sim) {
        setSimulation(sim);
        
        // Calculate time limit based on TOEIC rules
        const readingOnly = isReadingOnlyTest(sim.questions);
        const limit = calculateTOEICTimeLimit(sim.questions.length, readingOnly);
        setTimeLimit(limit);
        
        // Try to load saved session
        const savedSession = fileStorage.getSession(id);
        if (savedSession) {
          setCurrentQuestion(savedSession.currentQuestion);
          setAnswers(savedSession.answers);
          // Convert timeElapsed to timeRemaining
          const elapsed = savedSession.timeElapsed || 0;
          setTimeRemaining(Math.max(0, limit - elapsed));
          // Start paused by default on entry
          setIsPaused(true);
          setSessionSaved(true);
        } else {
          // Start with full time limit and paused
          setTimeRemaining(limit);
          setIsPaused(true);
        }
      } else {
        navigate('/');
      }
    }
  }, [id, navigate]);

  const saveSession = useCallback(() => {
    if (!simulation) return;

    // Calculate elapsed time from remaining time
    const timeElapsed = timeLimit - timeRemaining;

    const sessionData = {
      simulationId: simulation.id,
      currentQuestion,
      answers,
      timeElapsed,
      isPaused,
      savedAt: new Date().toISOString()
    };

    fileStorage.saveSession(sessionData);
    setSessionSaved(true);
  }, [simulation, timeLimit, timeRemaining, currentQuestion, answers, isPaused]);

  const handleSubmit = useCallback(() => {
    if (!simulation) return;

    const answerRecords = simulation.questions.map(q => ({
      id: q.id,
      selected: answers[q.id] || '',
      correct: q.answer,
      options: q.options
    }));

    const score = calculateScore(answerRecords);

    // Calculate elapsed time from remaining time
    const timeElapsed = timeLimit - timeRemaining;
    
    const statsRecord: StatsRecord = {
      simulationId: simulation.id,
      score,
      timeSpent: formatTime(timeElapsed),
      date: new Date().toISOString(),
      answers: answerRecords
    };

    storage.saveStats(statsRecord);
    fileStorage.clearSession(simulation.id); // Clear saved session after completion
    setIsCompleted(true);
    setShowResults(true);
  }, [simulation, answers, timeLimit, timeRemaining]);

  useEffect(() => {
    if (!simulation || isCompleted || isPaused || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev - 1;
        if (newTime <= 0) {
          // Time's up - auto submit
          handleSubmit();
          return 0;
        }
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [simulation, isCompleted, isPaused, timeRemaining, handleSubmit]);

  const handleAnswerSelect = useCallback((questionId: number, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  }, []);

  const handlePause = useCallback(() => {
    setIsPaused(true);
    saveSession();
  }, [saveSession]);

  const handleNext = useCallback(() => {
    if (simulation && currentQuestion < simulation.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      handleSubmit();
    }
  }, [simulation, currentQuestion, handleSubmit]);

  const handlePrevious = useCallback(() => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  }, [currentQuestion]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ignore if typing in an input field
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = event.key.toLowerCase();
      const currentQuestionData = simulation?.questions[currentQuestion];

      if (!currentQuestionData) return;

      switch (key) {
        case '1':
          if (currentQuestionData.options.length >= 1) {
            handleAnswerSelect(currentQuestionData.id, currentQuestionData.options[0]);
          }
          break;
        case '2':
          if (currentQuestionData.options.length >= 2) {
            handleAnswerSelect(currentQuestionData.id, currentQuestionData.options[1]);
          }
          break;
        case '3':
          if (currentQuestionData.options.length >= 3) {
            handleAnswerSelect(currentQuestionData.id, currentQuestionData.options[2]);
          }
          break;
        case '4':
          if (currentQuestionData.options.length >= 4) {
            handleAnswerSelect(currentQuestionData.id, currentQuestionData.options[3]);
          }
          break;
        case 'n':
          event.preventDefault();
          handleNext();
          break;
        case 'p':
          event.preventDefault();
          handlePrevious();
          break;
        case 's':
          event.preventDefault();
          saveSession();
          break;
        case 'x':
          event.preventDefault();
          if (isPaused) {
            handleResume();
          } else {
            handlePause();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [simulation, currentQuestion, isPaused, handleAnswerSelect, handleNext, handlePrevious, saveSession, handlePause, handleResume]);

  if (!simulation) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading simulation...</p>
        </div>
      </div>
    );
  }

  if (showResults) {
    const timeElapsed = timeLimit - timeRemaining;
    return (
      <ResultsPage
        simulation={simulation}
        answers={answers}
        timeElapsed={timeElapsed}
        onRetake={() => {
          setCurrentQuestion(0);
          setAnswers({});
          setTimeRemaining(timeLimit);
          setIsCompleted(false);
          setShowResults(false);
        }}
        onGoHome={() => navigate('/')}
      />
    );
  }

  const question = simulation.questions[currentQuestion];
  const progress = ((currentQuestion + 1) / simulation.questions.length) * 100;

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <Card data-onboarding="test-header" className="border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
        <CardHeader className="pb-8 pt-10 px-8 sm:px-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 relative">
            <div className="absolute -top-4 -right-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={startTour}
                className="text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                title="Test taking guide"
              >
                <HelpCircle className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-3 uppercase tracking-wider">
                TOEIC Simulation Mode
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight truncate">
                {simulation.title}
              </CardTitle>
            </div>
            
            <div className="flex items-center gap-4 self-end sm:self-center">
              <div className={cn(
                "flex items-center space-x-3 px-6 py-4 rounded-2xl font-black tabular-nums transition-all duration-300",
                timeRemaining <= 300 
                  ? 'bg-red-50 text-red-600 shadow-inner' 
                  : 'bg-slate-900 text-white shadow-xl shadow-slate-200'
              )}>
                <Clock className={cn("h-5 w-5", timeRemaining <= 300 && "animate-pulse")} />
                <span className="text-xl sm:text-2xl tracking-tighter">{formatTime(timeRemaining)}</span>
              </div>
            </div>
          </div>

          <div className="mt-10 space-y-4" data-onboarding="progress-bar">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Progress</span>
                <p className="text-lg font-black text-slate-900">
                  Question {currentQuestion + 1} <span className="text-slate-300 font-medium">/ {simulation.questions.length}</span>
                </p>
              </div>
              {sessionSaved && (
                <div className="flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full animate-in fade-in zoom-in duration-300">
                  <CheckCircle className="h-3 w-3 mr-1.5" />
                  Progress Saved
                </div>
              )}
            </div>
            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 transition-all duration-500 ease-out rounded-full shadow-lg shadow-blue-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Question */}
      <div data-onboarding="question-area" className="animate-in slide-in-from-bottom-4 duration-500 delay-150">
        <QuestionCard
          question={question}
          selectedAnswer={answers[question.id] || ''}
          onAnswerSelect={(answer) => handleAnswerSelect(question.id, answer)}
        />
      </div>

      {/* Navigation */}
      <Card className="border-none shadow-xl shadow-slate-200/50 rounded-3xl bg-white overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" data-onboarding="navigation-buttons">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              className="h-14 px-8 rounded-2xl border-slate-200 text-slate-600 font-bold hover:bg-slate-50 premium-button order-2 sm:order-1"
            >
              <ArrowLeft className="h-5 w-5 mr-2" />
              Previous
            </Button>

            <div className="flex items-center gap-3 order-3 sm:order-2" data-onboarding="control-buttons">
              {isPaused ? (
                <Button onClick={handleResume} variant="secondary" className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 hover:bg-amber-100 p-0 shadow-sm premium-button" title="Resume Test">
                  <Play className="h-6 w-6" />
                </Button>
              ) : (
                <Button onClick={handlePause} variant="secondary" className="h-14 w-14 rounded-2xl bg-slate-100 text-slate-600 hover:bg-slate-200 p-0 shadow-sm premium-button" title="Pause Test">
                  <Pause className="h-6 w-6" />
                </Button>
              )}
              
              <Button onClick={saveSession} variant="secondary" className="h-14 px-6 rounded-2xl bg-blue-50 text-blue-600 hover:bg-blue-100 font-bold premium-button">
                Save
              </Button>
            </div>

            <Button
              onClick={handleNext}
              disabled={!answers[question.id]}
              className={cn(
                "h-14 px-10 rounded-2xl font-black text-lg shadow-lg premium-button order-1 sm:order-3",
                currentQuestion === simulation.questions.length - 1 
                  ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200" 
                  : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
              )}
              data-onboarding="submit-button"
            >
              {currentQuestion === simulation.questions.length - 1 ? (
                <>
                  Complete
                  <CheckCircle className="h-6 w-6 ml-2" />
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-6 w-6 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
