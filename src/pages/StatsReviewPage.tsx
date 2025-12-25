import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { storage } from '@/lib/storage';
import { fileStorage } from '@/lib/fileStorage';
import { ResultsPage } from '@/components/ResultsPage';
import { StatsRecord, Simulation } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export function StatsReviewPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [statsRecord, setStatsRecord] = useState<StatsRecord | null>(null);
  const [simulation, setSimulation] = useState<Simulation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      const stats = storage.getStatsById(id);
      if (stats) {
        setStatsRecord(stats);
        const sim = fileStorage.getSimulation(stats.simulationId);
        if (sim) {
          setSimulation(sim);
        } else {
          setError('Simulation data not found. It may have been deleted.');
        }
      } else {
        setError('Stats record not found.');
      }
    }
    setLoading(false);
  }, [id]);

  // Parse timeSpent string back to seconds
  const parseTimeToSeconds = (timeStr: string): number => {
    try {
      if (!timeStr || typeof timeStr !== 'string') return 0;
      
      const parts = timeStr.split(':').map(Number);
      if (parts.some(isNaN)) return 0;
      
      if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
      }
      return 0;
    } catch {
      return 0;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading review...</p>
        </div>
      </div>
    );
  }

  if (error || !statsRecord) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">{error || 'Stats record not found.'}</p>
            <Button onClick={() => navigate('/stats')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Stats
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!simulation) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500 mb-4">
              The simulation for this test has been deleted. 
              Only the score and time data are available.
            </p>
            <div className="mb-6">
              <div className="text-3xl font-bold text-blue-600">{statsRecord.score}%</div>
              <div className="text-sm text-gray-500">Score</div>
              <div className="text-lg font-medium text-gray-700 mt-2">{statsRecord.timeSpent}</div>
              <div className="text-sm text-gray-500">Time Spent</div>
            </div>
            <Button onClick={() => navigate('/stats')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Stats
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Convert answers array back to { [key: number]: string } format
  const answersMap = statsRecord.answers.reduce((acc, ans) => {
    acc[ans.id] = ans.selected;
    return acc;
  }, {} as { [key: number]: string });

  return (
    <ResultsPage
      simulation={simulation}
      answers={answersMap}
      timeElapsed={parseTimeToSeconds(statsRecord.timeSpent)}
      onRetake={() => navigate(`/simulate/${simulation.id}`)}
      onGoHome={() => navigate('/stats')}
    />
  );
}
