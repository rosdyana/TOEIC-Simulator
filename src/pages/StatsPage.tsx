import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Clock, Target, Trash2 } from 'lucide-react';
import { storage } from '@/lib/storage';
import { StatsRecord, Simulation } from '@/types';

export function StatsPage() {
  const [stats, setStats] = useState<StatsRecord[]>([]);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [selectedSimulation, setSelectedSimulation] = useState<string>('all');

  useEffect(() => {
    const loadedStats = storage.getStats();
    const loadedSimulations = storage.getSimulations();
    setStats(loadedStats);
    setSimulations(loadedSimulations);
  }, []);

  const filteredStats = selectedSimulation === 'all' 
    ? stats 
    : stats.filter(stat => stat.simulationId === selectedSimulation);

  const getSimulationTitle = (simulationId: string) => {
    const simulation = simulations.find(s => s.id === simulationId);
    return simulation ? simulation.title : 'Unknown Simulation';
  };

  const getAverageScore = () => {
    if (filteredStats.length === 0) return 0;
    const total = filteredStats.reduce((sum, stat) => sum + stat.score, 0);
    return Math.round(total / filteredStats.length);
  };

  const getBestScore = () => {
    if (filteredStats.length === 0) return 0;
    return Math.max(...filteredStats.map(stat => stat.score));
  };

  const getTotalTimeSpent = () => {
    if (filteredStats.length === 0) return '00:00:00';
    
    const totalSeconds = filteredStats.reduce((total, stat) => {
      const [hours, minutes, seconds] = stat.timeSpent.split(':').map(Number);
      return total + (hours * 3600) + (minutes * 60) + seconds;
    }, 0);

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const getChartData = () => {
    return filteredStats.map((stat, index) => ({
      attempt: index + 1,
      score: stat.score,
      date: new Date(stat.date).toLocaleDateString()
    }));
  };

  const getScoreDistribution = () => {
    const ranges = [
      { range: '0-20', count: 0 },
      { range: '21-40', count: 0 },
      { range: '41-60', count: 0 },
      { range: '61-80', count: 0 },
      { range: '81-100', count: 0 }
    ];

    filteredStats.forEach(stat => {
      if (stat.score <= 20) ranges[0].count++;
      else if (stat.score <= 40) ranges[1].count++;
      else if (stat.score <= 60) ranges[2].count++;
      else if (stat.score <= 80) ranges[3].count++;
      else ranges[4].count++;
    });

    return ranges;
  };

  const handleClearStats = () => {
    if (confirm('Are you sure you want to clear all statistics? This action cannot be undone.')) {
      storage.clearAllStats();
      setStats([]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Statistics</h1>
        <p className="text-gray-600">Track your progress and performance</p>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium">Filter by simulation:</label>
              <select
                value={selectedSimulation}
                onChange={(e) => setSelectedSimulation(e.target.value)}
                className="px-3 py-1 border rounded-md"
              >
                <option value="all">All Simulations</option>
                {simulations.map(simulation => (
                  <option key={simulation.id} value={simulation.id}>
                    {simulation.title}
                  </option>
                ))}
              </select>
            </div>
            {stats.length > 0 && (
              <Button variant="outline" onClick={handleClearStats}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear All Stats
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {filteredStats.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Target className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Statistics Available</h3>
            <p className="text-gray-500">Complete some practice tests to see your statistics here.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Average Score</p>
                    <p className="text-2xl font-bold text-blue-600">{getAverageScore()}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Target className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Best Score</p>
                    <p className="text-2xl font-bold text-green-600">{getBestScore()}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <Clock className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Total Time</p>
                    <p className="text-2xl font-bold text-purple-600">{getTotalTimeSpent()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center">
                  <div className="h-8 w-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 font-bold">#</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500">Tests Taken</p>
                    <p className="text-2xl font-bold text-orange-600">{filteredStats.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Score Progress</CardTitle>
                <CardDescription>Your scores over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="attempt" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip 
                      formatter={(value: number) => [`${value}%`, 'Score']}
                      labelFormatter={(label) => `Attempt ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="score" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Score Distribution</CardTitle>
                <CardDescription>Distribution of your scores</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={getScoreDistribution()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Recent Tests */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Tests</CardTitle>
              <CardDescription>Your latest test attempts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredStats
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 10)
                  .map((stat, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <h3 className="font-medium">{getSimulationTitle(stat.simulationId)}</h3>
                        <p className="text-sm text-gray-500">
                          {new Date(stat.date).toLocaleDateString()} at {new Date(stat.date).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <div className={`text-lg font-bold ${
                            stat.score >= 80 ? 'text-green-600' : 
                            stat.score >= 60 ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {stat.score}%
                          </div>
                          <div className="text-xs text-gray-500">Score</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-blue-600">
                            {stat.timeSpent}
                          </div>
                          <div className="text-xs text-gray-500">Time</div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
