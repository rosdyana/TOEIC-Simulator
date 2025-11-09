import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Edit, Plus, FileText, Image, FileImage, Grid3X3, Upload, Download } from 'lucide-react';
import { fileStorage } from '@/lib/fileStorage';
import { Simulation, Question } from '@/types';
import { QuestionBuilder } from '@/components/QuestionBuilder';
import { LLMSettings } from '@/components/LLMSettings';
import { ImageZoom } from '@/components/ui/image-zoom';

export function SettingsPage() {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [selectedSimulation, setSelectedSimulation] = useState<Simulation | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newSimulationTitle, setNewSimulationTitle] = useState('');
  const [isCreatingSimulation, setIsCreatingSimulation] = useState(false);
  const [activeTab, setActiveTab] = useState<'simulations' | 'llm-settings'>('simulations');

  useEffect(() => {
    const loadedSimulations = fileStorage.getSimulations();
    setSimulations(loadedSimulations);
  }, []);

  const handleDeleteSimulation = (id: string) => {
    if (confirm('Are you sure you want to delete this simulation?')) {
      fileStorage.deleteSimulation(id);
      setSimulations(prev => prev.filter(s => s.id !== id));
      if (selectedSimulation?.id === id) {
        setSelectedSimulation(null);
      }
    }
  };

  const handleCreateSimulation = async () => {
    if (!newSimulationTitle.trim()) return;

    try {
      const simulation = await fileStorage.createSimulation(newSimulationTitle);
      setSimulations(prev => [...prev, simulation]);
      setSelectedSimulation(simulation);
      setNewSimulationTitle('');
      setIsCreatingSimulation(false);
    } catch (error) {
      console.error('Failed to create simulation:', error);
    }
  };

  const handleCreateQuestion = () => {
    setEditingQuestion(null);
    setIsCreating(true);
    setIsEditing(true);
  };

  const handleSaveQuestion = async (question: Question) => {
    if (!selectedSimulation) return;

    try {
      if (isCreating) {
        await fileStorage.addQuestion(selectedSimulation.id, question);
      } else {
        fileStorage.updateQuestion(selectedSimulation.id, question.id, question);
      }

      // Refresh simulations
      const updatedSimulations = fileStorage.getSimulations();
      setSimulations(updatedSimulations);
      setSelectedSimulation(updatedSimulations.find(s => s.id === selectedSimulation.id) || null);

      setIsEditing(false);
      setIsCreating(false);
      setEditingQuestion(null);
    } catch (error) {
      console.error('Failed to save question:', error);
    }
  };

  const handleExportSimulation = (simulationId: string) => {
    try {
      const data = fileStorage.exportSimulation(simulationId);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `simulation-${simulationId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export simulation:', error);
    }
  };

  const handleImportSimulation = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = e.target?.result as string;
        const simulation = fileStorage.importSimulation(jsonData);

        // Refresh simulations list
        const updatedSimulations = fileStorage.getSimulations();
        setSimulations(updatedSimulations);

        // Select the newly imported simulation
        setSelectedSimulation(simulation);

        alert(`Successfully imported simulation: ${simulation.title}`);
      } catch (error) {
        console.error('Failed to import simulation:', error);
        alert('Failed to import simulation. Please check that the file is a valid simulation JSON.');
      }
    };

    reader.readAsText(file);

    // Reset the input value so the same file can be selected again
    event.target.value = '';
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion({ ...question });
    setIsCreating(false);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setIsCreating(false);
    setEditingQuestion(null);
  };

  const getQuestionTypeIcon = (type: Question['type']) => {
    switch (type) {
      case 'text': return <FileText className="h-4 w-4" />;
      case 'image': return <Image className="h-4 w-4" />;
      case 'reading': return <FileText className="h-4 w-4" />;
      case 'multi-document': return <FileImage className="h-4 w-4" />;
      case 'answer-key': return <Grid3X3 className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getQuestionTypeLabel = (type: Question['type']) => {
    switch (type) {
      case 'text': return 'Text Question';
      case 'image': return 'Image Question';
      case 'reading': return 'Reading Comprehension';
      case 'multi-document': return 'Multi-document';
      case 'answer-key': return 'Answer Key';
      default: return 'Unknown';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center px-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Settings Panel</h1>
        <p className="text-sm sm:text-base text-gray-600">Create and manage complex TOEIC simulations with multiple question types</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center">
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('simulations')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'simulations'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Simulations
          </button>
          <button
            onClick={() => setActiveTab('llm-settings')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'llm-settings'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            LLM Settings
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'simulations' && (
        <>
          {/* Create New Simulation */}
          {isCreatingSimulation && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Create New Simulation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <Input
                    value={newSimulationTitle}
                    onChange={(e) => setNewSimulationTitle(e.target.value)}
                    placeholder="Enter simulation title..."
                    className="flex-1"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleCreateSimulation} disabled={!newSimulationTitle.trim()} className="flex-1 sm:flex-none">
                      Create
                    </Button>
                    <Button variant="outline" onClick={() => setIsCreatingSimulation(false)} className="flex-1 sm:flex-none">
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            {/* Simulations List */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Simulations</CardTitle>
                      <CardDescription>
                        Select a simulation to edit its questions
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportSimulation}
                        className="hidden"
                        id="import-simulation"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => document.getElementById('import-simulation')?.click()}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Import
                      </Button>
                      <Button
                        onClick={() => setIsCreatingSimulation(true)}
                        size="sm"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        New
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {simulations.map((simulation) => (
                      <div
                        key={simulation.id}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors ${selectedSimulation?.id === simulation.id
                          ? 'bg-blue-50 border-blue-300'
                          : 'hover:bg-gray-50'
                          }`}
                        onClick={() => setSelectedSimulation(simulation)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium">{simulation.title}</h3>
                            <p className="text-sm text-gray-500">
                              {simulation.questions.length} questions
                            </p>
                            <div className="flex gap-1 mt-1">
                              {Array.from(new Set(simulation.questions.map(q => q.type))).map(type => (
                                <span key={type} className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {getQuestionTypeLabel(type)}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportSimulation(simulation.id);
                              }}
                              title="Export"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteSimulation(simulation.id);
                              }}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    {simulations.length === 0 && (
                      <div className="text-center py-8 text-gray-500">
                        <p>No simulations available</p>
                        <p className="text-sm">Create your first simulation</p>
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
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{selectedSimulation.title}</CardTitle>
                        <CardDescription>
                          Click on a question to edit it
                        </CardDescription>
                      </div>
                      <Button onClick={handleCreateQuestion}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Question
                      </Button>
                    </div>
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
                              <div className="flex items-center gap-2 mb-2">
                                {getQuestionTypeIcon(question.type)}
                                <span className="font-medium">Question {question.id}</span>
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {getQuestionTypeLabel(question.type)}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600 mb-2">
                                {question.question}
                              </div>
                              <div className="text-sm mb-2">
                                <span className="font-medium">Correct Answer:</span>{' '}
                                <span className="text-green-600">{question.answer}</span>
                              </div>

                              {/* Show additional info based on question type */}
                              {question.type === 'reading' && question.passage && (
                                <div className="text-xs text-gray-500 mb-2">
                                  Passage: {question.passage.substring(0, 100)}...
                                </div>
                              )}

                              {question.type === 'multi-document' && question.documents && (
                                <div className="text-xs text-gray-500 mb-2">
                                  Documents: {question.documents.length} ({question.documents.map(d => d.type).join(', ')})
                                </div>
                              )}

                              {question.type === 'answer-key' && question.answerGrid && (
                                <div className="text-xs text-gray-500 mb-2">
                                  Answer Grid: {question.answerGrid.length} entries
                                </div>
                              )}

                              {question.image && (
                                <div className="mt-2">
                                  <ImageZoom
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

                      {selectedSimulation.questions.length === 0 && (
                        <div className="text-center py-8 text-gray-500">
                          <p>No questions yet</p>
                          <p className="text-sm">Click "Add Question" to create your first question</p>
                        </div>
                      )}
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
        </>
      )}

      {/* LLM Settings Tab */}
      {activeTab === 'llm-settings' && (
        <LLMSettings />
      )}

      {/* Question Builder Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto my-4">
            <QuestionBuilder
              question={editingQuestion || undefined}
              onSave={handleSaveQuestion}
              onCancel={handleCancelEdit}
            />
          </div>
        </div>
      )}
    </div>
  );
}
