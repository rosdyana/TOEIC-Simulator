import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, ArrowLeft, ArrowRight, CheckCircle, Pause, Play } from 'lucide-react';
import { fileStorage } from '@/lib/fileStorage';
import { storage } from '@/lib/storage';
import { Simulation, StatsRecord } from '@/types';
import { formatTime, calculateScore, calculateTOEICTimeLimit, isReadingOnlyTest } from '@/lib/utils';
import { QuestionCard } from '@/components/QuestionCard';
import { ResultsPage } from '@/components/ResultsPage';

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
  const [isPaused, setIsPaused] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);

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
          setIsPaused(savedSession.isPaused);
          setSessionSaved(true);
        } else {
          // Start with full time limit
          setTimeRemaining(limit);
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

  const handleResume = useCallback(() => {
    setIsPaused(false);
  }, []);

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
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-xl sm:text-2xl truncate">{simulation.title}</CardTitle>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Question {currentQuestion + 1} of {simulation.questions.length}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:space-x-4">
              <div className={`flex items-center space-x-2 text-base sm:text-lg font-mono ${
                timeRemaining <= 300 ? 'text-red-600 font-bold' : 
                timeRemaining <= 600 ? 'text-orange-600' : ''
              }`}>
                <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>{formatTime(timeRemaining)}</span>
                {isPaused && <span className="text-orange-600 text-xs sm:text-sm ml-1">(Paused)</span>}
              </div>
              {timeRemaining <= 0 && (
                <div className="text-xs sm:text-sm text-red-600 bg-red-50 px-2 py-1 rounded font-semibold">
                  Time's Up!
                </div>
              )}
              {sessionSaved && (
                <div className="text-xs sm:text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                  Session Saved
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Progress value={progress} />
            <div className="flex flex-col xs:flex-row justify-between gap-1 text-xs text-gray-500">
              <span>Progress: {currentQuestion + 1} / {simulation.questions.length}</span>
              <span>Time: {formatTime(timeRemaining)} / {formatTime(timeLimit)}</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Question */}
      <QuestionCard
        question={question}
        selectedAnswer={answers[question.id] || ''}
        onAnswerSelect={(answer) => handleAnswerSelect(question.id, answer)}
      />

      {/* Navigation */}
      <Card>
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:space-x-4">
              {isPaused ? (
                <Button onClick={handleResume} variant="outline" className="w-full sm:w-auto">
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </Button>
              ) : (
                <Button onClick={handlePause} variant="outline" className="w-full sm:w-auto">
                  <Pause className="h-4 w-4 mr-2" />
                  Pause & Save
                </Button>
              )}
              
              <Button onClick={saveSession} variant="outline" size="sm" className="w-full sm:w-auto">
                Save Progress
              </Button>
            </div>

            <Button
              onClick={handleNext}
              disabled={!answers[question.id]}
              className="w-full sm:w-auto"
            >
              {currentQuestion === simulation.questions.length - 1 ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Submit
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
