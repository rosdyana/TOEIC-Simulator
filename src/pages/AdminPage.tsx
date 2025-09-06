import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Trash2, Edit, Save, X, Plus } from 'lucide-react';
import { storage } from '@/lib/storage';
import { Simulation, Question } from '@/types';

export function AdminPage() {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [selectedSimulation, setSelectedSimulation] = useState<Simulation | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    const loadedSimulations = storage.getSimulations();
    setSimulations(loadedSimulations);
  }, []);

  const handleDeleteSimulation = (id: string) => {
    if (confirm('Are you sure you want to delete this simulation?')) {
      storage.deleteSimulation(id);
      setSimulations(prev => prev.filter(s => s.id !== id));
      if (selectedSimulation?.id === id) {
        setSelectedSimulation(null);
      }
    }
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion({ ...question });
    setIsEditing(true);
  };

  const handleSaveQuestion = () => {
    if (!editingQuestion || !selectedSimulation) return;

    const updatedSimulation = {
      ...selectedSimulation,
      questions: selectedSimulation.questions.map(q =>
        q.id === editingQuestion.id ? editingQuestion : q
      )
    };

    storage.saveSimulation(updatedSimulation);
    setSimulations(prev => prev.map(s => s.id === updatedSimulation.id ? updatedSimulation : s));
    setSelectedSimulation(updatedSimulation);
    setIsEditing(false);
    setEditingQuestion(null);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingQuestion(null);
  };

  const handleUpdateQuestionField = (field: keyof Question, value: any) => {
    if (!editingQuestion) return;
    setEditingQuestion(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleUpdateOption = (index: number, value: string) => {
    if (!editingQuestion) return;
    const newOptions = [...editingQuestion.options];
    newOptions[index] = value;
    setEditingQuestion(prev => prev ? { ...prev, options: newOptions } : null);
  };

  const handleAddOption = () => {
    if (!editingQuestion) return;
    setEditingQuestion(prev => prev ? { ...prev, options: [...prev.options, ''] } : null);
  };

  const handleRemoveOption = (index: number) => {
    if (!editingQuestion || editingQuestion.options.length <= 2) return;
    const newOptions = editingQuestion.options.filter((_, i) => i !== index);
    setEditingQuestion(prev => prev ? { ...prev, options: newOptions } : null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Panel</h1>
        <p className="text-gray-600">Manage your TOEIC simulations and questions</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Simulations List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Simulations</CardTitle>
              <CardDescription>
                Select a simulation to edit its questions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {simulations.map((simulation) => (
                  <div
                    key={simulation.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedSimulation?.id === simulation.id
                        ? 'bg-blue-50 border-blue-300'
                        : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedSimulation(simulation)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">{simulation.title}</h3>
                        <p className="text-sm text-gray-500">
                          {simulation.questions.length} questions
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSimulation(simulation.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
                {simulations.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <p>No simulations available</p>
                    <p className="text-sm">Create simulations from the home page</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Questions List */}
        <div className="lg:col-span-2">
          {selectedSimulation ? (
            <Card>
              <CardHeader>
                <CardTitle>{selectedSimulation.title}</CardTitle>
                <CardDescription>
                  Click on a question to edit it
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {selectedSimulation.questions.map((question) => (
                    <div
                      key={question.id}
                      className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleEditQuestion(question)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium mb-2">
                            Question {question.id}
                          </div>
                          <div className="text-sm text-gray-600 mb-2">
                            {question.question}
                          </div>
                          <div className="text-sm">
                            <span className="font-medium">Correct Answer:</span>{' '}
                            <span className="text-green-600">{question.answer}</span>
                          </div>
                          {question.type === 'image' && question.image && (
                            <div className="mt-2">
                              <img
                                src={question.image}
                                alt={`Question ${question.id}`}
                                className="w-32 h-20 object-cover rounded border"
                              />
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <p className="text-gray-500">Select a simulation to view its questions</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Question Modal */}
      {isEditing && editingQuestion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Edit Question {editingQuestion.id}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="question-text">Question Text</Label>
                <Input
                  id="question-text"
                  value={editingQuestion.question}
                  onChange={(e) => handleUpdateQuestionField('question', e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Question Type</Label>
                <RadioGroup
                  value={editingQuestion.type}
                  onValueChange={(value) => handleUpdateQuestionField('type', value)}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="text" id="type-text" />
                    <Label htmlFor="type-text">Text</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="image" id="type-image" />
                    <Label htmlFor="type-image">Image</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>Options</Label>
                <div className="space-y-2 mt-2">
                  {editingQuestion.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <Input
                        value={option}
                        onChange={(e) => handleUpdateOption(index, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                      />
                      {editingQuestion.options.length > 2 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOption(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddOption}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Option
                  </Button>
                </div>
              </div>

              <div>
                <Label htmlFor="correct-answer">Correct Answer</Label>
                <Input
                  id="correct-answer"
                  value={editingQuestion.answer}
                  onChange={(e) => handleUpdateQuestionField('answer', e.target.value)}
                  placeholder="e.g., A, B, C, D"
                  className="mt-1"
                />
              </div>

              <div className="flex space-x-4 pt-4">
                <Button onClick={handleSaveQuestion} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
                <Button variant="outline" onClick={handleCancelEdit} className="flex-1">
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
