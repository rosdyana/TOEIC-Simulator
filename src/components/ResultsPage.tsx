import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Trophy, RotateCcw, Home } from 'lucide-react';
import { Simulation } from '@/types';
import { calculateScore, formatTime } from '@/lib/utils';

interface ResultsPageProps {
  simulation: Simulation;
  answers: { [key: number]: string };
  timeElapsed: number;
  onRetake: () => void;
  onGoHome: () => void;
}

export function ResultsPage({ 
  simulation, 
  answers, 
  timeElapsed, 
  onRetake, 
  onGoHome 
}: ResultsPageProps) {
  const answerRecords = simulation.questions.map(q => ({
    id: q.id,
    selected: answers[q.id] || '',
    correct: q.answer
  }));

  const score = calculateScore(answerRecords);
  const correctAnswers = answerRecords.filter(a => a.selected === a.correct).length;
  const totalQuestions = answerRecords.length;

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreMessage = (score: number) => {
    if (score >= 90) return 'Excellent! Outstanding performance!';
    if (score >= 80) return 'Great job! Well done!';
    if (score >= 70) return 'Good work! Keep practicing!';
    if (score >= 60) return 'Not bad! Room for improvement.';
    return 'Keep studying! You can do better!';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Score Summary */}
      <Card className="text-center">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className={`p-4 rounded-full ${score >= 80 ? 'bg-green-100' : score >= 60 ? 'bg-yellow-100' : 'bg-red-100'}`}>
              <Trophy className={`h-12 w-12 ${getScoreColor(score)}`} />
            </div>
          </div>
          <CardTitle className="text-3xl mb-2">Test Completed!</CardTitle>
          <div className={`text-4xl font-bold ${getScoreColor(score)}`}>
            {score}%
          </div>
          <p className="text-lg text-gray-600 mt-2">
            {getScoreMessage(score)}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {correctAnswers}
              </div>
              <div className="text-sm text-gray-500">Correct Answers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {totalQuestions - correctAnswers}
              </div>
              <div className="text-sm text-gray-500">Incorrect Answers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatTime(timeElapsed)}
              </div>
              <div className="text-sm text-gray-500">Time Spent</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Results */}
      <Card>
        <CardHeader>
          <CardTitle>Answer Review</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {answerRecords.map((answer) => {
              const isCorrect = answer.selected === answer.correct;
              const question = simulation.questions.find(q => q.id === answer.id);
              
              return (
                <div
                  key={answer.id}
                  className={`p-4 rounded-lg border ${
                    isCorrect ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {isCorrect ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">
                        Question {answer.id}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {question?.question}
                      </div>
                      <div className="mt-2 space-y-1">
                        <div className="text-sm">
                          <span className="font-medium">Your answer:</span>{' '}
                          <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                            {answer.selected || 'No answer'}
                          </span>
                        </div>
                        {!isCorrect && (
                          <div className="text-sm">
                            <span className="font-medium">Correct answer:</span>{' '}
                            <span className="text-green-600">{answer.correct}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={onRetake} variant="outline" size="lg">
              <RotateCcw className="h-4 w-4 mr-2" />
              Retake Test
            </Button>
            <Button onClick={onGoHome} size="lg">
              <Home className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
