import { Simulation, StatsRecord } from '@/types';

const SIMULATIONS_KEY = 'toeic_simulations';
const STATS_KEY = 'toeic_stats';

export const storage = {
  // Simulations
  getSimulations(): Simulation[] {
    try {
      const data = localStorage.getItem(SIMULATIONS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveSimulation(simulation: Simulation): void {
    const simulations = this.getSimulations();
    const existingIndex = simulations.findIndex(s => s.id === simulation.id);
    
    if (existingIndex >= 0) {
      simulations[existingIndex] = simulation;
    } else {
      simulations.push(simulation);
    }
    
    localStorage.setItem(SIMULATIONS_KEY, JSON.stringify(simulations));
  },

  getSimulation(id: string): Simulation | null {
    const simulations = this.getSimulations();
    return simulations.find(s => s.id === id) || null;
  },

  deleteSimulation(id: string): void {
    const simulations = this.getSimulations();
    const filtered = simulations.filter(s => s.id !== id);
    localStorage.setItem(SIMULATIONS_KEY, JSON.stringify(filtered));
  },

  // Stats
  getStats(): StatsRecord[] {
    try {
      const data = localStorage.getItem(STATS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveStats(stats: StatsRecord): void {
    const allStats = this.getStats();
    allStats.push(stats);
    localStorage.setItem(STATS_KEY, JSON.stringify(allStats));
  },

  getStatsBySimulation(simulationId: string): StatsRecord[] {
    const allStats = this.getStats();
    return allStats.filter(s => s.simulationId === simulationId);
  },

  clearAllStats(): void {
    localStorage.removeItem(STATS_KEY);
  }
};
