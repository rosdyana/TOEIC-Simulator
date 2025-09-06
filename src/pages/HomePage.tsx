import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Plus, Clock, Users } from 'lucide-react';
import { storage } from '@/lib/storage';
import { Simulation } from '@/types';
import { UploadForm } from '@/components/UploadForm';

export function HomePage() {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [showUploadForm, setShowUploadForm] = useState(false);

  useEffect(() => {
    const loadedSimulations = storage.getSimulations();
    setSimulations(loadedSimulations);
  }, []);

  const handleSimulationCreated = (newSimulation: Simulation) => {
    setSimulations(prev => [...prev, newSimulation]);
    setShowUploadForm(false);
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
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Play className="h-6 w-6 text-green-600" />
              <span>Load Simulation</span>
            </CardTitle>
            <CardDescription>
              Choose from your available practice tests and start taking the exam
            </CardDescription>
          </CardHeader>
          <CardContent>
            {simulations.length > 0 ? (
              <div className="space-y-3">
                {simulations.map((simulation) => (
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
                      <Button size="sm">Start Test</Button>
                    </Link>
                  </div>
                ))}
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
              <Plus className="h-6 w-6 text-blue-600" />
              <span>Create Simulation</span>
            </CardTitle>
            <CardDescription>
              Upload test images and answer sheets to create a new practice test
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!showUploadForm ? (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto mb-4 text-blue-600" />
                <p className="mb-4">Ready to create a new simulation?</p>
                <Button onClick={() => setShowUploadForm(true)}>
                  Upload Test Materials
                </Button>
              </div>
            ) : (
              <UploadForm onSimulationCreated={handleSimulationCreated} />
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
                {storage.getStats().length}
              </div>
              <div className="text-sm text-gray-500">Completed Tests</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
