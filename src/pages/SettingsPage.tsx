import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Trash2, Edit, Plus, FileText, Image, FileImage, Grid3X3, 
  Download, Play, HelpCircle, GripVertical, Copy, Sparkles, 
  CheckSquare, Square, Loader2
} from 'lucide-react';
import { fileStorage } from '@/lib/fileStorage';
import { llmOCRService } from '@/lib/llmOCR';
import { Simulation, Question } from '@/types';
import { QuestionBuilder } from '@/components/QuestionBuilder';
import { LLMSettings } from '@/components/LLMSettings';
import { KeyMappingSettings } from '@/components/KeyMappingSettings';
import { NewTestMethodDialog } from '@/components/NewTestMethodDialog';
import { ImageZoom } from '@/components/ui/image-zoom';
import { useOnboarding, OnboardingStep } from '@/hooks/useOnboarding';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const settingsPageOnboardingSteps: OnboardingStep[] = [
  {
    element: 'h1',
    intro: 'Welcome to the Settings Panel! Here you can create, manage, and edit your TOEIC simulations.',
    title: 'Settings Panel Overview',
  },
  {
    element: '[data-onboarding="tab-navigation"]',
    intro: 'Switch between Simulations and LLM Settings tabs. Simulations is where you create and edit tests, while LLM Settings configures AI features.',
    title: 'Navigation Tabs',
    position: 'bottom',
  },
  {
    element: '[data-onboarding="simulations-list"]',
    intro: 'View all your created simulations. Each simulation shows the number of questions and question types. Click on a simulation to edit its questions.',
    title: 'Simulations List',
    position: 'right',
  },
  {
    element: '[data-onboarding="simulation-actions"]',
    intro: 'For each simulation, you can: Start the test, Export to JSON, or Delete the simulation. The Start button takes you directly to the test.',
    title: 'Simulation Actions',
    position: 'left',
  },
  {
    element: '[data-onboarding="create-simulation"]',
    intro: 'Create a new simulation using various methods: Manual, AI Generation, OCR Upload, Answer Sheet, or Import.',
    title: 'Create New Simulation',
    position: 'left',
  },
  {
    element: '[data-onboarding="selected-simulation"]',
    intro: 'When you select a simulation, you can see all its questions here. Drag to reorder, or use the action buttons to edit, duplicate, or delete.',
    title: 'Edit Selected Simulation',
    position: 'left',
  },
  {
    element: '[data-onboarding="question-actions"]',
    intro: 'Each question has actions: Edit, Duplicate, and Delete. You can also drag questions to reorder them.',
    title: 'Question Actions',
    position: 'bottom',
  },
  {
    element: '[data-onboarding="bulk-actions"]',
    intro: 'Select multiple questions and delete them at once, or add AI-generated questions to your simulation.',
    title: 'Bulk Actions',
    position: 'bottom',
  },
  {
    element: '[data-onboarding="llm-settings"]',
    intro: 'Configure AI settings for question generation and OCR processing. Set your API keys and adjust parameters.',
    title: 'LLM Settings',
    position: 'top',
  },
];

interface SortableQuestionItemProps {
  question: Question;
  isSelected: boolean;
  onToggleSelect: (id: number) => void;
  onEdit: (question: Question) => void;
  onDuplicate: (question: Question) => void;
  onDelete: (questionId: number) => void;
  getQuestionTypeIcon: (type: Question['type']) => JSX.Element;
  getQuestionTypeLabel: (type: Question['type']) => string;
}

function SortableQuestionItem({
  question,
  isSelected,
  onToggleSelect,
  onEdit,
  onDuplicate,
  onDelete,
  getQuestionTypeIcon,
  getQuestionTypeLabel,
}: SortableQuestionItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`p-4 border rounded-lg transition-colors ${
        isSelected ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
      } ${isDragging ? 'shadow-lg' : ''}`}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className="mt-1 cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="h-5 w-5" />
        </div>

        {/* Selection Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleSelect(question.id);
          }}
          className="mt-1 text-gray-400 hover:text-blue-600"
        >
          {isSelected ? (
            <CheckSquare className="h-5 w-5 text-blue-600" />
          ) : (
            <Square className="h-5 w-5" />
          )}
        </button>

        {/* Question Content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onEdit(question)}>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {getQuestionTypeIcon(question.type)}
            <span className="font-medium">Question {question.id}</span>
            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {getQuestionTypeLabel(question.type)}
            </span>
          </div>
          <div className="text-sm text-gray-600 mb-2 line-clamp-2">
            {question.question}
          </div>
          <div className="text-sm mb-2">
            <span className="font-medium">Correct Answer:</span>{' '}
            <span className="text-green-600">{question.answer}</span>
          </div>

          {/* Show additional info based on question type */}
          {question.type === 'reading' && question.passage && (
            <div className="text-xs text-gray-500 mb-2">
              Passage: {question.passage.substring(0, 80)}...
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
                className="w-24 h-16 object-cover rounded border"
              />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-1" data-onboarding="question-actions">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit(question);
            }}
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(question);
            }}
            title="Duplicate"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(question.id);
            }}
            title="Delete"
            className="text-red-500 hover:text-red-700"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SettingsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [selectedSimulation, setSelectedSimulation] = useState<Simulation | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<'simulations' | 'llm-settings' | 'keyboard'>('simulations');
  const [showNewTestDialog, setShowNewTestDialog] = useState(false);
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<Set<number>>(new Set());
  
  // AI Generate for existing simulation
  const [showAIGenerateInput, setShowAIGenerateInput] = useState(false);
  const [aiGenerateCount, setAiGenerateCount] = useState('5');
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const { startTour } = useOnboarding(settingsPageOnboardingSteps, 'settings');

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const loadedSimulations = fileStorage.getSimulations();
    setSimulations(loadedSimulations);

    // Check for newTest query param
    if (searchParams.get('newTest') === 'true') {
      setShowNewTestDialog(true);
      // Remove the query param
      searchParams.delete('newTest');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const refreshSimulations = () => {
    const updatedSimulations = fileStorage.getSimulations();
    setSimulations(updatedSimulations);
    if (selectedSimulation) {
      setSelectedSimulation(updatedSimulations.find(s => s.id === selectedSimulation.id) || null);
    }
  };

  const handleDeleteSimulation = (id: string) => {
    if (confirm('Are you sure you want to delete this simulation?')) {
      fileStorage.deleteSimulation(id);
      setSimulations(prev => prev.filter(s => s.id !== id));
      if (selectedSimulation?.id === id) {
        setSelectedSimulation(null);
      }
      toast.success('Simulation deleted');
    }
  };

  const handleSimulationCreated = (simulation: Simulation) => {
    refreshSimulations();
    setSelectedSimulation(simulation);
    setShowNewTestDialog(false);
  };

  const handleCreateQuestion = () => {
    setEditingQuestion(null);
    setIsCreating(true);
    setIsEditing(true);
  };

  const getNextQuestionId = (): number => {
    if (!selectedSimulation || selectedSimulation.questions.length === 0) {
      return 1;
    }
    return Math.max(...selectedSimulation.questions.map(q => q.id)) + 1;
  };

  const handleSaveQuestion = async (question: Question) => {
    if (!selectedSimulation) return;

    try {
      if (isCreating) {
        await fileStorage.addQuestion(selectedSimulation.id, question);
        toast.success('Question added');
      } else {
        fileStorage.updateQuestion(selectedSimulation.id, question.id, question);
        toast.success('Question updated');
      }

      refreshSimulations();
      setIsEditing(false);
      setIsCreating(false);
      setEditingQuestion(null);
    } catch (error) {
      console.error('Failed to save question:', error);
      toast.error('Failed to save question');
    }
  };

  const handleExportSimulation = (simulationId: string) => {
    try {
      const simulation = simulations.find(s => s.id === simulationId);
      const data = fileStorage.exportSimulation(simulationId);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${simulation?.title || 'simulation'}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Simulation exported');
    } catch (error) {
      console.error('Failed to export simulation:', error);
      toast.error('Failed to export simulation');
    }
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion({ ...question });
    setIsCreating(false);
    setIsEditing(true);
  };

  const handleDuplicateQuestion = async (question: Question) => {
    if (!selectedSimulation) return;

    try {
      const newQuestion = {
        ...question,
        id: getNextQuestionId(),
      };
      await fileStorage.addQuestion(selectedSimulation.id, newQuestion);
      refreshSimulations();
      toast.success('Question duplicated');
    } catch (error) {
      console.error('Failed to duplicate question:', error);
      toast.error('Failed to duplicate question');
    }
  };

  const handleDeleteQuestion = (questionId: number) => {
    if (!selectedSimulation) return;

    if (confirm('Are you sure you want to delete this question?')) {
      try {
        fileStorage.deleteQuestion(selectedSimulation.id, questionId);
        refreshSimulations();
        setSelectedQuestionIds(prev => {
          const next = new Set(prev);
          next.delete(questionId);
          return next;
        });
        toast.success('Question deleted');
      } catch (error) {
        console.error('Failed to delete question:', error);
        toast.error('Failed to delete question');
      }
    }
  };

  const handleBulkDelete = () => {
    if (!selectedSimulation || selectedQuestionIds.size === 0) return;

    if (confirm(`Are you sure you want to delete ${selectedQuestionIds.size} questions?`)) {
      try {
        selectedQuestionIds.forEach(id => {
          fileStorage.deleteQuestion(selectedSimulation.id, id);
        });
        refreshSimulations();
        setSelectedQuestionIds(new Set());
        toast.success(`Deleted ${selectedQuestionIds.size} questions`);
      } catch (error) {
        console.error('Failed to delete questions:', error);
        toast.error('Failed to delete questions');
      }
    }
  };

  const handleToggleSelectQuestion = (questionId: number) => {
    setSelectedQuestionIds(prev => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!selectedSimulation) return;
    
    if (selectedQuestionIds.size === selectedSimulation.questions.length) {
      setSelectedQuestionIds(new Set());
    } else {
      setSelectedQuestionIds(new Set(selectedSimulation.questions.map(q => q.id)));
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !selectedSimulation || active.id === over.id) return;

    const oldIndex = selectedSimulation.questions.findIndex(q => q.id === active.id);
    const newIndex = selectedSimulation.questions.findIndex(q => q.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const newQuestions = arrayMove(selectedSimulation.questions, oldIndex, newIndex);
      
      // Update the simulation with new question order
      const updatedSimulation = {
        ...selectedSimulation,
        questions: newQuestions,
      };
      
      fileStorage.saveSimulation(updatedSimulation);
      refreshSimulations();
      toast.success('Question order updated');
    }
  };

  const handleAIGenerateForSimulation = async () => {
    if (!selectedSimulation) return;

    const count = parseInt(aiGenerateCount, 10);
    if (isNaN(count) || count < 1 || count > 50) {
      toast.error('Please enter a number between 1 and 50');
      return;
    }

    setIsGeneratingAI(true);
    try {
      const questions = await llmOCRService.generateReadingQuestions(count);
      
      // Add questions to the simulation with proper IDs
      for (const question of questions) {
        // Remove id from question before passing to addQuestion (it auto-assigns)
        const { id, ...questionWithoutId } = question;
        await fileStorage.addQuestion(selectedSimulation.id, questionWithoutId);
      }
      
      refreshSimulations();
      setShowAIGenerateInput(false);
      setAiGenerateCount('5');
      
      if (questions.length < count) {
        toast.warning(`Added ${questions.length} of ${count} requested questions`);
      } else {
        toast.success(`Added ${questions.length} AI-generated questions`);
      }
    } catch (error) {
      console.error('Failed to generate questions:', error);
      toast.error('Failed to generate questions. Check your LLM settings.');
    } finally {
      setIsGeneratingAI(false);
    }
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
      case 'text': return 'Text';
      case 'image': return 'Image';
      case 'reading': return 'Reading';
      case 'multi-document': return 'Multi-doc';
      case 'answer-key': return 'Answer Key';
      default: return 'Unknown';
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="text-center px-2 relative">
        <div className="absolute top-0 right-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={startTour}
            className="text-gray-500 hover:text-gray-700"
            title="Take a tour of the settings"
          >
            <HelpCircle className="h-5 w-5 mr-2" />
            Help
          </Button>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Settings Panel</h1>
        <p className="text-sm sm:text-base text-gray-600">Create and manage TOEIC simulations with multiple question types</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex justify-center" data-onboarding="tab-navigation">
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
          <button
            onClick={() => setActiveTab('keyboard')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'keyboard'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
              }`}
          >
            Keyboard
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'simulations' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Simulations List */}
          <div className="lg:col-span-1">
            <Card data-onboarding="simulations-list">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Simulations</CardTitle>
                    <CardDescription>
                      Select to edit questions
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => setShowNewTestDialog(true)}
                    size="sm"
                    data-onboarding="create-simulation"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    New
                  </Button>
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
                      onClick={() => {
                        setSelectedSimulation(simulation);
                        setSelectedQuestionIds(new Set());
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium truncate">{simulation.title}</h3>
                          <p className="text-sm text-gray-500">
                            {simulation.questions.length} questions
                          </p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {Array.from(new Set(simulation.questions.map(q => q.type))).slice(0, 3).map(type => (
                              <span key={type} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                                {getQuestionTypeLabel(type)}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-1 ml-2" data-onboarding="simulation-actions">
                          <Link to={`/simulate/${simulation.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => e.stopPropagation()}
                              title="Start Test"
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          </Link>
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
                      <p>No simulations yet</p>
                      <Button
                        variant="link"
                        onClick={() => setShowNewTestDialog(true)}
                        className="mt-2"
                      >
                        Create your first simulation
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Questions List */}
          <div className="lg:col-span-2">
            {selectedSimulation ? (
              <Card data-onboarding="selected-simulation">
                <CardHeader>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="min-w-0">
                      <CardTitle className="truncate">{selectedSimulation.title}</CardTitle>
                      <CardDescription>
                        Drag to reorder, click to edit
                      </CardDescription>
                    </div>
                    <div className="flex gap-2 flex-wrap" data-onboarding="bulk-actions">
                      {/* Bulk Actions */}
                      {selectedQuestionIds.size > 0 && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleBulkDelete}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete ({selectedQuestionIds.size})
                        </Button>
                      )}
                      
                      {/* AI Generate Input */}
                      {showAIGenerateInput ? (
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            min="1"
                            max="50"
                            value={aiGenerateCount}
                            onChange={(e) => setAiGenerateCount(e.target.value)}
                            className="w-20 h-9"
                            placeholder="Count"
                            disabled={isGeneratingAI}
                          />
                          <Button
                            size="sm"
                            onClick={handleAIGenerateForSimulation}
                            disabled={isGeneratingAI}
                            className="bg-purple-600 hover:bg-purple-700"
                          >
                            {isGeneratingAI ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Add'
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowAIGenerateInput(false)}
                            disabled={isGeneratingAI}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAIGenerateInput(true)}
                          className="text-purple-600 border-purple-200 hover:bg-purple-50"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          AI Generate
                        </Button>
                      )}
                      
                      <Button onClick={handleCreateQuestion} size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Question
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedSimulation.questions.length > 0 && (
                    <div className="mb-4 flex items-center gap-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleSelectAll}
                        className="text-gray-600"
                      >
                        {selectedQuestionIds.size === selectedSimulation.questions.length ? (
                          <>
                            <CheckSquare className="h-4 w-4 mr-2" />
                            Deselect All
                          </>
                        ) : (
                          <>
                            <Square className="h-4 w-4 mr-2" />
                            Select All
                          </>
                        )}
                      </Button>
                      <span className="text-sm text-gray-500">
                        {selectedSimulation.questions.length} questions
                      </span>
                    </div>
                  )}
                  
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={selectedSimulation.questions.map(q => q.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-3">
                        {selectedSimulation.questions.map((question) => (
                          <SortableQuestionItem
                            key={question.id}
                            question={question}
                            isSelected={selectedQuestionIds.has(question.id)}
                            onToggleSelect={handleToggleSelectQuestion}
                            onEdit={handleEditQuestion}
                            onDuplicate={handleDuplicateQuestion}
                            onDelete={handleDeleteQuestion}
                            getQuestionTypeIcon={getQuestionTypeIcon}
                            getQuestionTypeLabel={getQuestionTypeLabel}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>

                  {selectedSimulation.questions.length === 0 && (
                    <div className="text-center py-12 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-20" />
                      <p className="font-medium">No questions yet</p>
                      <p className="text-sm mt-1">Add questions manually or generate with AI</p>
                      <div className="flex justify-center gap-3 mt-4">
                        <Button onClick={handleCreateQuestion} size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Manually
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowAIGenerateInput(true)}
                          className="text-purple-600 border-purple-200 hover:bg-purple-50"
                        >
                          <Sparkles className="h-4 w-4 mr-2" />
                          AI Generate
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="text-center py-16">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-gray-200" />
                  <p className="text-gray-500 font-medium">Select a simulation</p>
                  <p className="text-sm text-gray-400 mt-1">Choose from the list or create a new one</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* LLM Settings Tab */}
      {activeTab === 'llm-settings' && (
        <div data-onboarding="llm-settings">
          <LLMSettings />
        </div>
      )}

      {/* Keyboard Shortcuts Tab */}
      {activeTab === 'keyboard' && (
        <div>
          <KeyMappingSettings />
        </div>
      )}

      {/* New Test Method Dialog */}
      <NewTestMethodDialog
        isOpen={showNewTestDialog}
        onClose={() => setShowNewTestDialog(false)}
        onSimulationCreated={handleSimulationCreated}
      />

      {/* Question Builder Modal */}
      {isEditing && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50"
          onClick={(e) => {
            // Close when clicking the backdrop
            if (e.target === e.currentTarget) {
              handleCancelEdit();
            }
          }}
        >
          <div className="w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto my-4 bg-gray-50 rounded-lg">
            <QuestionBuilder
              question={editingQuestion || undefined}
              nextId={getNextQuestionId()}
              onSave={handleSaveQuestion}
              onCancel={handleCancelEdit}
            />
          </div>
        </div>
      )}
    </div>
  );
}
