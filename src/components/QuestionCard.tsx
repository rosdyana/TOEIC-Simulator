import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ImageZoom } from '@/components/ui/image-zoom';
import { Question } from '@/types';

interface QuestionCardProps {
  question: Question;
  selectedAnswer: string;
  onAnswerSelect: (answer: string) => void;
}

export function QuestionCard({ question, selectedAnswer, onAnswerSelect }: QuestionCardProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">
          Question {question.id}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {/* Reading Passage */}
        {question.type === 'reading' && question.passage && (
          <div className="bg-gray-50 border rounded-lg p-3 sm:p-4 mb-4">
            <Label className="text-xs sm:text-sm font-semibold text-gray-700 mb-2 block">Reading Passage:</Label>
            <div className="prose max-w-none">
              <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">{question.passage}</p>
            </div>
          </div>
        )}

        {/* Question Text */}
        <div className="prose max-w-none">
          <p className="text-base sm:text-lg leading-relaxed">{question.question}</p>
        </div>

        {/* Question Image */}
        {question.type === 'image' && question.image && (
          <div className="flex justify-center">
            <ImageZoom
              src={question.image}
              alt={`Question ${question.id}`}
              className="max-w-full h-auto rounded-lg shadow-md border"
              style={{ maxHeight: '400px' }}
            />
          </div>
        )}

        {/* Answer Options */}
        <div className="space-y-2 sm:space-y-3">
          <Label className="text-sm sm:text-base font-medium">Select your answer:</Label>
          <RadioGroup
            value={selectedAnswer}
            onValueChange={onAnswerSelect}
            className="space-y-2 sm:space-y-3"
          >
            {question.options.map((option, index) => (
              <div key={index} className="flex items-start sm:items-center space-x-2 sm:space-x-3">
                <RadioGroupItem value={option} id={`option-${index}`} className="mt-1 sm:mt-0" />
                <Label
                  htmlFor={`option-${index}`}
                  className="flex-1 cursor-pointer p-3 sm:p-3 rounded-lg border hover:bg-gray-50 transition-colors text-sm sm:text-base min-h-[44px] flex items-center"
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
}
