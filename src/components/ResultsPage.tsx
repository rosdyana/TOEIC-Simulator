import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Trophy, RotateCcw, Home, Filter } from 'lucide-react';
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
  const [filter, setFilter] = useState<'all' | 'correct' | 'wrong'>('all');

  const answerRecords = simulation.questions.map(q => ({
    id: q.id,
    selected: answers[q.id] || '',
    correct: q.answer,
    options: q.options
  }));

  const score = calculateScore(answerRecords);
  const correctAnswers = answerRecords.filter(a => {
    // If we have options, convert selected text to letter index for comparison
    if (a.options && a.options.length > 0) {
      const selectedIndex = a.options.findIndex(option => option === a.selected);
      const selectedLetter = selectedIndex >= 0 ? String.fromCharCode(65 + selectedIndex) : '';
      return selectedLetter === a.correct;
    }
    // Fallback to direct comparison for backward compatibility
    return a.selected === a.correct;
  }).length;
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
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
      {/* Score Summary */}
      <Card className="text-center">
        <CardHeader>
          <div className="flex justify-center mb-3 sm:mb-4">
            <div className={`p-3 sm:p-4 rounded-full ${score >= 80 ? 'bg-green-100' : score >= 60 ? 'bg-yellow-100' : 'bg-red-100'}`}>
              <Trophy className={`h-8 w-8 sm:h-12 sm:w-12 ${getScoreColor(score)}`} />
            </div>
          </div>
          <CardTitle className="text-2xl sm:text-3xl mb-2">Test Completed!</CardTitle>
          <div className={`text-3xl sm:text-4xl font-bold ${getScoreColor(score)}`}>
            {score}%
          </div>
          <p className="text-base sm:text-lg text-gray-600 mt-2 px-4">
            {getScoreMessage(score)}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 sm:mt-6">
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Answer Review
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
              >
                All ({totalQuestions})
              </Button>
              <Button
                variant={filter === 'correct' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('correct')}
                className={filter === 'correct' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                Correct ({correctAnswers})
              </Button>
              <Button
                variant={filter === 'wrong' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('wrong')}
                className={filter === 'wrong' ? 'bg-red-600 hover:bg-red-700' : ''}
              >
                Wrong ({totalQuestions - correctAnswers})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {answerRecords.filter((answer) => {
              if (filter === 'all') return true;
              
              // Calculate if answer is correct
              const isCorrect = (() => {
                if (answer.options && answer.options.length > 0) {
                  const selectedIndex = answer.options.findIndex(option => option === answer.selected);
                  const selectedLetter = selectedIndex >= 0 ? String.fromCharCode(65 + selectedIndex) : '';
                  return selectedLetter === answer.correct;
                }
                return answer.selected === answer.correct;
              })();
              
              return filter === 'correct' ? isCorrect : !isCorrect;
            }).map((answer) => {
              // Calculate if answer is correct using the same logic as scoring
              const isCorrect = (() => {
                if (answer.options && answer.options.length > 0) {
                  const selectedIndex = answer.options.findIndex(option => option === answer.selected);
                  const selectedLetter = selectedIndex >= 0 ? String.fromCharCode(65 + selectedIndex) : '';
                  return selectedLetter === answer.correct;
                }
                return answer.selected === answer.correct;
              })();
              
              const question = simulation.questions.find(q => q.id === answer.id);
              
              // Get the selected answer letter and text for display
              const getSelectedAnswerInfo = () => {
                if (answer.options && answer.options.length > 0) {
                  const selectedIndex = answer.options.findIndex(option => option === answer.selected);
                  if (selectedIndex >= 0) {
                    return {
                      letter: String.fromCharCode(65 + selectedIndex),
                      text: answer.selected
                    };
                  }
                }
                return {
                  letter: 'No answer',
                  text: answer.selected || 'No answer'
                };
              };

              // Get the correct answer text for display
              const getCorrectAnswerText = () => {
                if (answer.options && answer.options.length > 0) {
                  // Convert the correct letter (A, B, C, D) to index
                  const correctIndex = answer.correct.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
                  if (correctIndex >= 0 && correctIndex < answer.options.length) {
                    return answer.options[correctIndex];
                  }
                }
                return answer.correct;
              };
              
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
                            {(() => {
                              const selectedInfo = getSelectedAnswerInfo();
                              return selectedInfo.letter !== 'No answer' 
                                ? `${selectedInfo.letter} - ${selectedInfo.text}`
                                : selectedInfo.letter;
                            })()}
                          </span>
                        </div>
                        {!isCorrect && (
                          <div className="text-sm">
                            <span className="font-medium">Correct answer:</span>{' '}
                            <span className="text-green-600">
                              {answer.correct} - {getCorrectAnswerText()}
                            </span>
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
        <CardContent className="pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Button onClick={onRetake} variant="outline" size="lg" className="w-full sm:w-auto">
              <RotateCcw className="h-4 w-4 mr-2" />
              Retake Test
            </Button>
            <Button onClick={onGoHome} size="lg" className="w-full sm:w-auto">
              <Home className="h-4 w-4 mr-2" />
              Back to Home
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
