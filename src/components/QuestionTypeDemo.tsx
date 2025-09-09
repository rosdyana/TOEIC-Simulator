import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Image, FileImage, Grid3X3, CheckCircle } from 'lucide-react';

export function QuestionTypeDemo() {
  const questionTypes = [
    {
      type: 'text',
      title: 'Simple Text Questions',
      description: 'Basic multiple choice questions with text-based options',
      icon: <FileText className="h-6 w-6" />,
      example: 'What is the main topic of the conversation?',
      features: ['Text-based questions', 'Multiple choice options', 'Quick to create']
    },
    {
      type: 'image',
      title: 'Image-based Questions',
      description: 'Questions that include images, charts, or visual content',
      icon: <Image className="h-6 w-6" />,
      example: 'Look at the graph. What does it show?',
      features: ['Image upload support', 'Visual content analysis', 'Chart interpretation']
    },
    {
      type: 'reading',
      title: 'Reading Comprehension',
      description: 'Long passages with multiple questions and insertion points',
      icon: <FileText className="h-6 w-6" />,
      example: 'Questions 168-171 refer to the following passage...',
      features: ['Long text passages', 'Insertion point questions', 'Multiple related questions']
    },
    {
      type: 'multi-document',
      title: 'Multi-document Questions',
      description: 'Questions based on multiple related documents (invoices, emails, notices)',
      icon: <FileImage className="h-6 w-6" />,
      example: 'Questions 196-200 refer to the following invoice, notice, and email...',
      features: ['Multiple document types', 'Cross-document analysis', 'Complex scenarios']
    },
    {
      type: 'answer-key',
      title: 'Answer Key Grid',
      description: 'Grid-based answer keys for bulk question sets',
      icon: <Grid3X3 className="h-6 w-6" />,
      example: '101 (B), 102 (D), 103 (C)...',
      features: ['Bulk answer management', 'Grid format', 'Quick answer entry']
    }
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Supported Question Types</h2>
        <p className="text-gray-600">
          Our enhanced system supports various TOEIC question formats
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {questionTypes.map((questionType) => (
          <Card key={questionType.type} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="text-blue-600">
                  {questionType.icon}
                </div>
                <span className="text-lg">{questionType.title}</span>
              </CardTitle>
              <CardDescription>
                {questionType.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 italic">
                  "{questionType.example}"
                </p>
              </div>
              
              <div>
                <h4 className="font-medium text-sm mb-2">Features:</h4>
                <ul className="space-y-1">
                  {questionType.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="text-center">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
              Perfect for Complex TOEIC Formats
            </h3>
            <p className="text-blue-700">
              Unlike simple OCR, our manual creation system can handle the complex layouts, 
              multi-document scenarios, and reading comprehension passages that are common 
              in real TOEIC tests.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
