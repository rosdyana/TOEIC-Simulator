import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { ImageZoom } from '@/components/ui/image-zoom';
import { Question } from '@/types';
import { cn } from '@/lib/utils';

interface QuestionCardProps {
  question: Question;
  selectedAnswer: string;
  onAnswerSelect: (answer: string) => void;
}

export function QuestionCard({ question, selectedAnswer, onAnswerSelect }: QuestionCardProps) {
  return (
    <Card className="w-full border-none shadow-xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white">
      <CardHeader className="bg-slate-50/50 border-b border-slate-100 px-8 py-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black shadow-lg shadow-blue-200">
            {question.id}
          </div>
          <CardTitle className="text-xl font-black text-slate-900">
            Question Details
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-8 p-8 sm:p-10">
        {/* Reading Passage */}
        {question.type === 'reading' && question.passage && (
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 sm:p-8 mb-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
            <Label className="text-xs font-black uppercase tracking-widest text-blue-600 mb-4 block">Reading Passage</Label>
            <div className="prose prose-slate max-w-none">
              <p className="text-base sm:text-lg leading-relaxed text-slate-700 font-medium whitespace-pre-wrap">{question.passage}</p>
            </div>
          </div>
        )}

        {/* Question Text */}
        <div className="prose max-w-none">
          <p className="text-xl sm:text-2xl font-black text-slate-900 leading-tight tracking-tight">{question.question}</p>
        </div>

        {/* Question Image */}
        {question.type === 'image' && question.image && (
          <div className="flex justify-center py-4 bg-slate-50 rounded-3xl border border-slate-100 p-4">
            <ImageZoom
              src={question.image}
              alt={`Question ${question.id}`}
              className="max-w-full h-auto rounded-2xl shadow-xl border border-white"
              style={{ maxHeight: '450px' }}
            />
          </div>
        )}

        {/* Answer Options */}
        <div className="space-y-4 pt-4" data-onboarding="answer-options">
          <Label className="text-xs font-black uppercase tracking-widest text-slate-400">Select the correct option</Label>
          <RadioGroup
            value={selectedAnswer}
            onValueChange={onAnswerSelect}
            className="grid grid-cols-2 gap-4"
          >
            {question.options.map((option, index) => {
              const letter = String.fromCharCode(65 + index);
              const isSelected = selectedAnswer === option;
              
              return (
                <div key={index} className="relative group">
                  <RadioGroupItem value={option} id={`option-${index}`} className="sr-only" />
                  <Label
                    htmlFor={`option-${index}`}
                    className={cn(
                      "flex items-center space-x-3 cursor-pointer p-4 rounded-2xl border-2 transition-all duration-300 h-full",
                      isSelected 
                        ? "bg-blue-50 border-blue-600 shadow-lg shadow-blue-100" 
                        : "bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center font-black transition-colors shrink-0",
                      isSelected ? "bg-blue-600 text-white shadow-md shadow-blue-200" : "bg-slate-100 text-slate-500 group-hover:bg-slate-200"
                    )}>
                      {letter}
                    </div>
                    <span className={cn(
                      "text-base font-bold leading-tight",
                      isSelected ? "text-blue-900" : "text-slate-700"
                    )}>
                      {option}
                    </span>
                  </Label>
                </div>
              );
            })}
          </RadioGroup>
        </div>
      </CardContent>
    </Card>
  );
}
