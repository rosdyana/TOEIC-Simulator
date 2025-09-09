import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Plus, Clock, Users, Settings, FileText, Image, Upload, Link as LinkIcon } from 'lucide-react';
import { fileStorage } from '@/lib/fileStorage';
import { Simulation } from '@/types';
import { UploadForm } from '@/components/UploadForm';
import { AnswerSheetUploadForm } from '@/components/AnswerSheetUploadForm';
import { QuestionTypeDemo } from '@/components/QuestionTypeDemo';

export function HomePage() {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showAnswerSheetForm, setShowAnswerSheetForm] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    // Load simulations from the enhanced storage system
    const enhancedSimulations = fileStorage.getSimulations();
    setSimulations(enhancedSimulations);
  }, []);

  const handleSimulationCreated = (newSimulation: Simulation) => {
    setSimulations(prev => [...prev, newSimulation]);
    setShowUploadForm(false);
    setShowAnswerSheetForm(false);
    setShowImportForm(false);
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const jsonData = e.target?.result as string;
        const simulation = fileStorage.importSimulation(jsonData);
        setSimulations(prev => [...prev, simulation]);
        alert(`Successfully imported simulation: ${simulation.title}`);
      } catch (error) {
        console.error('Failed to import simulation:', error);
        alert('Failed to import simulation. Please check that the file is a valid simulation JSON.');
      }
    };
    
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleUrlImport = async () => {
    if (!importUrl.trim()) {
      alert('Please enter a valid URL');
      return;
    }

    setIsImporting(true);
    try {
      const response = await fetch(importUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const jsonData = await response.text();
      const simulation = fileStorage.importSimulation(jsonData);
      setSimulations(prev => [...prev, simulation]);
      setImportUrl('');
      setShowImportForm(false);
      alert(`Successfully imported simulation: ${simulation.title}`);
    } catch (error) {
      console.error('Failed to import simulation from URL:', error);
      alert('Failed to import simulation from URL. Please check the URL and try again.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          TOEIC Test Simulator
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
          Practice for your TOEIC test with our comprehensive simulation platform. 
          Upload test materials, take practice tests, and track your progress.
        </p>
      </div>

      {/* Action Cards */}
      <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Play className="h-6 w-6 text-green-600" />
              <span>Take Test</span>
            </CardTitle>
            <CardDescription>
              Choose from your available practice tests and start taking the exam
            </CardDescription>
          </CardHeader>
          <CardContent>
            {simulations.length > 0 ? (
              <div className="space-y-3">
                {simulations.slice(0, 3).map((simulation) => (
                  <div
                    key={simulation.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <h3 className="font-medium">{simulation.title}</h3>
                      <p className="text-sm text-gray-500">
                        {simulation.questions.length} questions
                      </p>
                    </div>
                    <Link to={`/simulate/${simulation.id}`}>
                      <Button size="sm">Start</Button>
                    </Link>
                  </div>
                ))}
                {simulations.length > 3 && (
                  <div className="text-center">
                    <Link to="/admin">
                      <Button variant="outline" size="sm">
                        View All ({simulations.length})
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No simulations available</p>
                <p className="text-sm">Create your first simulation to get started</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Image className="h-6 w-6 text-blue-600" />
              <span>Full OCR Upload</span>
            </CardTitle>
            <CardDescription>
              Upload test images and answer sheets for complete OCR processing
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showUploadForm ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                <p className="mb-4">Upload test materials for OCR</p>
                <Button onClick={() => setShowUploadForm(true)}>
                  Upload Images
                </Button>
              </div>
            ) : (
              <UploadForm onSimulationCreated={handleSimulationCreated} />
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <FileText className="h-6 w-6 text-orange-600" />
              <span>Answer Sheet Only</span>
            </CardTitle>
            <CardDescription>
              Upload answer sheet to create test with correct answers only
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showAnswerSheetForm ? (
              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto mb-4 text-orange-600" />
                <p className="mb-4">Upload answer sheet only</p>
                <Button onClick={() => setShowAnswerSheetForm(true)}>
                  Upload Answer Sheet
                </Button>
              </div>
            ) : (
              <AnswerSheetUploadForm onSimulationCreated={handleSimulationCreated} />
            )}
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="h-6 w-6 text-purple-600" />
              <span>Manual Creation</span>
            </CardTitle>
            <CardDescription>
              Create complex questions manually with reading passages, multi-documents, and more
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Settings className="h-12 w-12 mx-auto mb-4 text-purple-600" />
              <p className="mb-4">Advanced question builder</p>
              <Link to="/admin">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Manually
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-6 w-6 text-indigo-600" />
              <span>Import Test</span>
            </CardTitle>
            <CardDescription>
              Import existing tests from JSON files or URLs
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showImportForm ? (
              <div className="text-center py-8">
                <Upload className="h-12 w-12 mx-auto mb-4 text-indigo-600" />
                <p className="mb-4">Import from file or URL</p>
                <Button onClick={() => setShowImportForm(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Import Test
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center">
                  <h3 className="font-medium mb-4">Import Simulation</h3>
                </div>
                
                {/* File Upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Upload JSON File:</label>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileImport}
                    className="w-full p-2 border rounded-md text-sm"
                  />
                </div>
                
                <div className="text-center text-sm text-gray-500">OR</div>
                
                {/* URL Import */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Import from URL:</label>
                  <Input
                    type="url"
                    placeholder="https://example.com/simulation.json"
                    value={importUrl}
                    onChange={(e) => setImportUrl(e.target.value)}
                    className="text-sm"
                  />
                  <Button 
                    onClick={handleUrlImport}
                    disabled={isImporting || !importUrl.trim()}
                    className="w-full"
                    size="sm"
                  >
                    {isImporting ? (
                      <>
                        <Clock className="h-4 w-4 mr-2 animate-spin" />
                        Importing...
                      </>
                    ) : (
                      <>
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Import from URL
                      </>
                    )}
                  </Button>
                </div>
                
                <Button 
                  variant="outline" 
                  onClick={() => setShowImportForm(false)}
                  className="w-full"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {simulations.length}
              </div>
              <div className="text-sm text-gray-500">Available Tests</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {simulations.reduce((total, sim) => total + sim.questions.length, 0)}
              </div>
              <div className="text-sm text-gray-500">Total Questions</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                0
              </div>
              <div className="text-sm text-gray-500">Completed Tests</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question Types Demo */}
      <QuestionTypeDemo />
    </div>
  );
}
