import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Clock, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react';
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

  useEffect(() => {
    if (id) {
      const sim = storage.getSimulation(id);
      if (sim) {
        setSimulation(sim);
      } else {
        navigate('/');
      }
    }
  }, [id, navigate]);

  useEffect(() => {
    if (!simulation || isCompleted) return;

    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [simulation, isCompleted]);

  const handleAnswerSelect = (questionId: number, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
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
      correct: q.answer
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
              </div>
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

            <div className="flex space-x-2">
              {simulation.questions.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentQuestion(index)}
                  className={`w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                    index === currentQuestion
                      ? 'bg-blue-600 text-white'
                      : answers[simulation.questions[index].id]
                      ? 'bg-green-100 text-green-800 border border-green-300'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {index + 1}
                </button>
              ))}
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
