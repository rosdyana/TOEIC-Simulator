import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, X, Upload, Save, FileText, Image, FileImage, Grid3X3, Eye, Loader2 } from 'lucide-react';
import { Question, Document } from '@/types';
import { llmOCRService } from '@/lib/llmOCR';

interface QuestionBuilderProps {
  question?: Question;
  onSave: (question: Question) => void;
  onCancel: () => void;
}

export function QuestionBuilder({ question, onSave, onCancel }: QuestionBuilderProps) {
  const [questionData, setQuestionData] = useState<Question>(
    question || {
      id: 0,
      type: 'text',
      question: '',
      options: ['', '', '', ''],
      answer: 'A',
      passage: '',
      insertionPoints: [],
      documents: [],
      answerGrid: []
    }
  );

  const [newDocument, setNewDocument] = useState<Omit<Document, 'id'>>({
    type: 'other',
    title: '',
    content: '',
    image: ''
  });

  const [newInsertionPoint, setNewInsertionPoint] = useState({ position: 0, text: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExtractingText, setIsExtractingText] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const handleTypeChange = (type: Question['type']) => {
    setQuestionData(prev => ({
      ...prev,
      type,
      // Reset type-specific data when changing types
      passage: type === 'reading' ? prev.passage : '',
      insertionPoints: type === 'reading' ? prev.insertionPoints : [],
      documents: type === 'multi-document' ? prev.documents : [],
      answerGrid: type === 'answer-key' ? prev.answerGrid : []
    }));
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...questionData.options];
    newOptions[index] = value;
    setQuestionData(prev => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    setQuestionData(prev => ({
      ...prev,
      options: [...prev.options, '']
    }));
  };

  const removeOption = (index: number) => {
    if (questionData.options.length > 2) {
      const newOptions = questionData.options.filter((_, i) => i !== index);
      setQuestionData(prev => ({ ...prev, options: newOptions }));
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setQuestionData(prev => ({ ...prev, image: objectUrl }));
      setAiError(null); // Clear any previous errors
    }
  };

  const handleExtractTextFromImage = async () => {
    if (!questionData.image) {
      setAiError('Please upload an image first');
      return;
    }

    // Show confirmation if there's existing content
    if (questionData.question.trim() || questionData.options.some(opt => opt.trim())) {
      const confirmed = confirm(
        'This will overwrite the current question text and answer options. Are you sure you want to continue?'
      );
      if (!confirmed) {
        return;
      }
    }

    setIsExtractingText(true);
    setAiError(null);

    try {
      // Convert the image URL back to a File object for AI processing
      const response = await fetch(questionData.image);
      const blob = await response.blob();
      const file = new File([blob], 'question-image.png', { type: 'image/png' });

      const result = await llmOCRService.extractQuestionsFromImage(file);

      if (result.success && result.questions && result.questions.length > 0) {
        const firstQuestion = result.questions[0];
        setQuestionData(prev => ({
          ...prev,
          question: firstQuestion.question,
          options: firstQuestion.options
        }));
        console.log('Successfully extracted question text and options from image using AI');
      } else {
        setAiError(result.error || 'Failed to extract text from image');
      }
    } catch (error) {
      console.error('Error extracting text from image:', error);
      setAiError('An error occurred while processing the image');
    } finally {
      setIsExtractingText(false);
    }
  };

  const addDocument = () => {
    if (newDocument.title && newDocument.content) {
      const document: Document = {
        ...newDocument,
        id: Date.now().toString()
      };
      setQuestionData(prev => ({
        ...prev,
        documents: [...(prev.documents || []), document]
      }));
      setNewDocument({ type: 'other', title: '', content: '', image: '' });
    }
  };

  const removeDocument = (documentId: string) => {
    setQuestionData(prev => ({
      ...prev,
      documents: prev.documents?.filter(d => d.id !== documentId) || []
    }));
  };

  const addInsertionPoint = () => {
    if (newInsertionPoint.text) {
      setQuestionData(prev => ({
        ...prev,
        insertionPoints: [...(prev.insertionPoints || []), newInsertionPoint]
      }));
      setNewInsertionPoint({ position: 0, text: '' });
    }
  };

  const removeInsertionPoint = (index: number) => {
    setQuestionData(prev => ({
      ...prev,
      insertionPoints: prev.insertionPoints?.filter((_, i) => i !== index) || []
    }));
  };

  const addAnswerGridEntry = () => {
    setQuestionData(prev => ({
      ...prev,
      answerGrid: [...(prev.answerGrid || []), { questionNumber: 0, answer: 'A' }]
    }));
  };

  const updateAnswerGridEntry = (index: number, field: 'questionNumber' | 'answer', value: string | number) => {
    setQuestionData(prev => ({
      ...prev,
      answerGrid: prev.answerGrid?.map((entry, i) =>
        i === index ? { ...entry, [field]: value } : entry
      ) || []
    }));
  };

  const removeAnswerGridEntry = (index: number) => {
    setQuestionData(prev => ({
      ...prev,
      answerGrid: prev.answerGrid?.filter((_, i) => i !== index) || []
    }));
  };

  const handleSave = () => {
    if (!questionData.question.trim()) {
      alert('Please enter a question');
      return;
    }

    if (questionData.options.filter(opt => opt.trim()).length < 2) {
      alert('Please provide at least 2 options');
      return;
    }

    onSave(questionData);
  };

  const getTypeIcon = (type: Question['type']) => {
    switch (type) {
      case 'text': return <FileText className="h-4 w-4" />;
      case 'image': return <Image className="h-4 w-4" />;
      case 'reading': return <FileText className="h-4 w-4" />;
      case 'multi-document': return <FileImage className="h-4 w-4" />;
      case 'answer-key': return <Grid3X3 className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getTypeIcon(questionData.type)}
            Question Builder
          </CardTitle>
          <CardDescription>
            Create or edit a question for your TOEIC simulation.
            {questionData.type !== 'answer-key' && (
              <span className="block mt-1 text-sm text-blue-600">
                💡 Tip: Upload an image of a question to automatically extract the text and answer options!
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Question Type */}
          <div>
            <Label>Question Type</Label>
            <Select value={questionData.type} onValueChange={handleTypeChange}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Simple Text Question
                  </div>
                </SelectItem>
                <SelectItem value="image">
                  <div className="flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Image-based Question
                  </div>
                </SelectItem>
                <SelectItem value="reading">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Reading Comprehension
                  </div>
                </SelectItem>
                <SelectItem value="multi-document">
                  <div className="flex items-center gap-2">
                    <FileImage className="h-4 w-4" />
                    Multi-document Question
                  </div>
                </SelectItem>
                <SelectItem value="answer-key">
                  <div className="flex items-center gap-2">
                    <Grid3X3 className="h-4 w-4" />
                    Answer Key Grid
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Question Text */}
          <div>
            <Label htmlFor="question-text">Question Text</Label>
            <div className="mt-1 space-y-2">
              <Textarea
                id="question-text"
                value={questionData.question}
                onChange={(e) => setQuestionData(prev => ({ ...prev, question: e.target.value }))}
                placeholder="Enter your question here or upload an image to extract text automatically..."
                rows={3}
              />

              {/* OCR Extraction Button - Show for all question types except answer-key */}
              {questionData.type !== 'answer-key' && (
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleExtractTextFromImage}
                    disabled={isExtractingText || !questionData.image}
                    className="flex items-center gap-2"
                  >
                    {isExtractingText ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    {isExtractingText ? 'Extracting...' : 'Extract & Overwrite from Image'}
                  </Button>

                  {questionData.image && (
                    <span className="text-sm text-gray-500">
                      Image uploaded - click to extract and overwrite current text
                    </span>
                  )}
                </div>
              )}

              {/* AI Error Display */}
              {aiError && (
                <div className="text-sm text-red-600 bg-red-50 p-2 rounded border">
                  <strong>AI Error:</strong> {aiError}
                </div>
              )}
            </div>
          </div>

          {/* Reading Comprehension Passage */}
          {questionData.type === 'reading' && (
            <div>
              <Label htmlFor="passage">Reading Passage</Label>
              <Textarea
                id="passage"
                value={questionData.passage || ''}
                onChange={(e) => setQuestionData(prev => ({ ...prev, passage: e.target.value }))}
                placeholder="Enter the reading passage here..."
                className="mt-1"
                rows={8}
              />

              {/* Insertion Points */}
              <div className="mt-4">
                <Label>Insertion Points</Label>
                <div className="space-y-2 mt-2">
                  {questionData.insertionPoints?.map((point, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 border rounded">
                      <span className="text-sm font-medium">[{index + 1}]</span>
                      <span className="flex-1 text-sm">{point.text}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeInsertionPoint(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={newInsertionPoint.text}
                      onChange={(e) => setNewInsertionPoint(prev => ({ ...prev, text: e.target.value }))}
                      placeholder="Insertion point text..."
                      className="flex-1"
                    />
                    <Button onClick={addInsertionPoint} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Multi-document Management */}
          {questionData.type === 'multi-document' && (
            <div>
              <Label>Documents</Label>
              <div className="space-y-4 mt-2">
                {questionData.documents?.map((doc) => (
                  <Card key={doc.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{doc.title}</h4>
                        <p className="text-sm text-gray-600 mt-1">{doc.type}</p>
                        <p className="text-sm mt-2">{doc.content.substring(0, 100)}...</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeDocument(doc.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}

                <Card className="p-4 border-dashed">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="doc-title">Document Title</Label>
                        <Input
                          id="doc-title"
                          value={newDocument.title}
                          onChange={(e) => setNewDocument(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="e.g., Invoice, Email, Notice"
                        />
                      </div>
                      <div>
                        <Label htmlFor="doc-type">Document Type</Label>
                        <Select value={newDocument.type} onValueChange={(value: any) => setNewDocument(prev => ({ ...prev, type: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="invoice">Invoice</SelectItem>
                            <SelectItem value="email">Email</SelectItem>
                            <SelectItem value="notice">Notice</SelectItem>
                            <SelectItem value="review">Review</SelectItem>
                            <SelectItem value="advertisement">Advertisement</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="doc-content">Document Content</Label>
                      <Textarea
                        id="doc-content"
                        value={newDocument.content}
                        onChange={(e) => setNewDocument(prev => ({ ...prev, content: e.target.value }))}
                        placeholder="Enter document content..."
                        rows={4}
                      />
                    </div>
                    <Button onClick={addDocument} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Document
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          )}

          {/* Answer Key Grid */}
          {questionData.type === 'answer-key' && (
            <div>
              <Label>Answer Grid</Label>
              <div className="space-y-2 mt-2">
                {questionData.answerGrid?.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={entry.questionNumber}
                      onChange={(e) => updateAnswerGridEntry(index, 'questionNumber', parseInt(e.target.value) || 0)}
                      placeholder="Question #"
                      className="w-24"
                    />
                    <Select value={entry.answer} onValueChange={(value) => updateAnswerGridEntry(index, 'answer', value)}>
                      <SelectTrigger className="w-20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="D">D</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeAnswerGridEntry(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button onClick={addAnswerGridEntry} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Answer Entry
                </Button>
              </div>
            </div>
          )}

          {/* Image Upload - Available for all question types except answer-key */}
          {questionData.type !== 'answer-key' && (
            <div>
              <Label>Image Upload</Label>
              <div className="mt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Image
                </Button>
                {questionData.image && (
                  <div className="mt-2">
                    <img
                      src={questionData.image}
                      alt="Question image"
                      className="max-w-full h-32 object-contain border rounded"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Answer Options */}
          {questionData.type !== 'answer-key' && (
            <div>
              <Label>Answer Options</Label>
              <div className="space-y-2 mt-2">
                {questionData.options.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="w-6 text-sm font-medium">
                      {String.fromCharCode(65 + index)})
                    </span>
                    <Input
                      value={option}
                      onChange={(e) => handleOptionChange(index, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      className="flex-1"
                    />
                    {questionData.options.length > 2 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOption(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addOption}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </div>
            </div>
          )}

          {/* Correct Answer */}
          {questionData.type !== 'answer-key' && (
            <div>
              <Label htmlFor="correct-answer">Correct Answer</Label>
              <Select value={questionData.answer} onValueChange={(value) => setQuestionData(prev => ({ ...prev, answer: value }))}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {questionData.options.map((_, index) => (
                    <SelectItem key={index} value={String.fromCharCode(65 + index)}>
                      {String.fromCharCode(65 + index)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-4 pt-4">
            <Button onClick={handleSave} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              Save Question
            </Button>
            <Button variant="outline" onClick={onCancel} className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
