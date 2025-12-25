import { Simulation, StatsRecord, KeyMapping, DEFAULT_KEY_MAPPING } from '@/types';
import { generateId } from '@/lib/utils';

const SIMULATIONS_KEY = 'toeic_simulations';
const STATS_KEY = 'toeic_stats';
const KEY_MAPPING_KEY = 'toeic_key_mapping';

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
    // Ensure stats has an ID
    const statsWithId = { ...stats, id: stats.id || generateId() };
    allStats.push(statsWithId);
    localStorage.setItem(STATS_KEY, JSON.stringify(allStats));
  },

  getStatsById(id: string): StatsRecord | null {
    const allStats = this.getStats();
    return allStats.find(s => s.id === id) || null;
  },

  getStatsBySimulation(simulationId: string): StatsRecord[] {
    const allStats = this.getStats();
    return allStats.filter(s => s.simulationId === simulationId);
  },

  clearAllStats(): void {
    localStorage.removeItem(STATS_KEY);
  },

  // Key Mappings
  getKeyMapping(): KeyMapping {
    try {
      const data = localStorage.getItem(KEY_MAPPING_KEY);
      if (data) {
        // Merge with defaults to ensure all keys exist
        return { ...DEFAULT_KEY_MAPPING, ...JSON.parse(data) };
      }
      return DEFAULT_KEY_MAPPING;
    } catch {
      return DEFAULT_KEY_MAPPING;
    }
  },

  saveKeyMapping(mapping: KeyMapping): void {
    localStorage.setItem(KEY_MAPPING_KEY, JSON.stringify(mapping));
  },

  resetKeyMapping(): void {
    this.saveKeyMapping(DEFAULT_KEY_MAPPING);
  }
};
