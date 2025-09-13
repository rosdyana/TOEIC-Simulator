import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Clock, ArrowLeft, ArrowRight, CheckCircle, Pause, Play } from 'lucide-react';
import { fileStorage } from '@/lib/fileStorage';
import { storage } from '@/lib/storage';
import { Simulation, StatsRecord } from '@/types';
import { formatTime, calculateScore } from '@/lib/utils';
import { QuestionCard } from '@/components/QuestionCard';
import { ResultsPage } from '@/components/ResultsPage';

export function SimulationPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionSaved, setSessionSaved] = useState(false);

  useEffect(() => {
    if (id) {
      const sim = fileStorage.getSimulation(id);
      if (sim) {
        setSimulation(sim);
        
        // Try to load saved session
        const savedSession = fileStorage.getSession(id);
        if (savedSession) {
          setCurrentQuestion(savedSession.currentQuestion);
          setAnswers(savedSession.answers);
          setTimeElapsed(savedSession.timeElapsed);
          setIsPaused(savedSession.isPaused);
          setSessionSaved(true);
        }
      } else {
        navigate('/');
      }
    }
  }, [id, navigate]);

  useEffect(() => {
    if (!simulation || isCompleted || isPaused) return;

    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [simulation, isCompleted, isPaused]);

  const handleAnswerSelect = (questionId: number, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handlePause = () => {
    setIsPaused(true);
    saveSession();
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const saveSession = () => {
    if (!simulation) return;
    
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
  };

  const handleNext = () => {
    if (simulation && currentQuestion < simulation.questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
    }
  };

  const handleSubmit = () => {
    if (!simulation) return;

    const answerRecords = simulation.questions.map(q => ({
      id: q.id,
      selected: answers[q.id] || '',
      correct: q.answer,
      options: q.options
    }));

    const score = calculateScore(answerRecords);

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
  };

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
    return (
      <ResultsPage
        simulation={simulation}
        answers={answers}
        timeElapsed={timeElapsed}
        onRetake={() => {
          setCurrentQuestion(0);
          setAnswers({});
          setTimeElapsed(0);
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
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{simulation.title}</CardTitle>
              <p className="text-gray-600 mt-1">
                Question {currentQuestion + 1} of {simulation.questions.length}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-lg font-mono">
                <Clock className="h-5 w-5" />
                <span>{formatTime(timeElapsed)}</span>
                {isPaused && <span className="text-orange-600 text-sm">(Paused)</span>}
              </div>
              {sessionSaved && (
                <div className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                  Session Saved
                </div>
              )}
            </div>
          </div>
          <Progress value={progress} className="mt-4" />
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
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentQuestion === 0}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            <div className="flex items-center space-x-4">
              {isPaused ? (
                <Button onClick={handleResume} variant="outline">
                  <Play className="h-4 w-4 mr-2" />
                  Resume
                </Button>
              ) : (
                <Button onClick={handlePause} variant="outline">
                  <Pause className="h-4 w-4 mr-2" />
                  Pause & Save
                </Button>
              )}
              
              <Button onClick={saveSession} variant="outline" size="sm">
                Save Progress
              </Button>
            </div>

            <Button
              onClick={handleNext}
              disabled={!answers[question.id]}
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
