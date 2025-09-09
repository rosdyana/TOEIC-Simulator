import { Simulation, Question, Document } from '@/types';
import { generateId } from './utils';

// Enhanced storage system with file management capabilities
export const fileStorage = {
  // File management
  async saveImage(file: File, simulationId: string, questionId?: number): Promise<string> {
    const fileName = questionId 
      ? `${simulationId}_q${questionId}_${Date.now()}.${file.name.split('.').pop()}`
      : `${simulationId}_${Date.now()}.${file.name.split('.').pop()}`;
    
    // In a real implementation, this would save to a server
    // For now, we'll use object URLs and store the file reference
    const objectUrl = URL.createObjectURL(file);
    
    // Store file reference in localStorage for persistence
    const fileRef = {
      fileName,
      objectUrl,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified
    };
    
    const fileRefs = this.getFileReferences();
    fileRefs[fileName] = fileRef;
    localStorage.setItem('toeic_file_references', JSON.stringify(fileRefs));
    
    return objectUrl;
  },

  getFileReferences(): Record<string, any> {
    try {
      const data = localStorage.getItem('toeic_file_references');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  // Enhanced simulation management
  async createSimulation(title: string, questions: Question[] = []): Promise<Simulation> {
    const simulation: Simulation = {
      id: generateId(),
      title,
      questions,
      createdAt: new Date().toISOString()
    };
    
    this.saveSimulation(simulation);
    return simulation;
  },

  saveSimulation(simulation: Simulation): void {
    const simulations = this.getSimulations();
    const existingIndex = simulations.findIndex(s => s.id === simulation.id);
    
    if (existingIndex >= 0) {
      simulations[existingIndex] = simulation;
    } else {
      simulations.push(simulation);
    }
    
    localStorage.setItem('toeic_simulations', JSON.stringify(simulations));
  },

  getSimulations(): Simulation[] {
    try {
      const data = localStorage.getItem('toeic_simulations');
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  getSimulation(id: string): Simulation | null {
    const simulations = this.getSimulations();
    return simulations.find(s => s.id === id) || null;
  },

  deleteSimulation(id: string): void {
    const simulations = this.getSimulations();
    const filtered = simulations.filter(s => s.id !== id);
    localStorage.setItem('toeic_simulations', JSON.stringify(filtered));
    
    // Clean up associated files
    this.cleanupSimulationFiles(id);
  },

  cleanupSimulationFiles(simulationId: string): void {
    const fileRefs = this.getFileReferences();
    const filesToRemove = Object.keys(fileRefs).filter(fileName => 
      fileName.startsWith(simulationId)
    );
    
    filesToRemove.forEach(fileName => {
      if (fileRefs[fileName]?.objectUrl) {
        URL.revokeObjectURL(fileRefs[fileName].objectUrl);
      }
      delete fileRefs[fileName];
    });
    
    localStorage.setItem('toeic_file_references', JSON.stringify(fileRefs));
  },

  // Question management
  async addQuestion(simulationId: string, question: Omit<Question, 'id'>): Promise<Question> {
    const simulation = this.getSimulation(simulationId);
    if (!simulation) {
      throw new Error('Simulation not found');
    }

    const newQuestion: Question = {
      ...question,
      id: Math.max(...simulation.questions.map(q => q.id), 0) + 1
    };

    simulation.questions.push(newQuestion);
    this.saveSimulation(simulation);
    return newQuestion;
  },

  updateQuestion(simulationId: string, questionId: number, updates: Partial<Question>): void {
    const simulation = this.getSimulation(simulationId);
    if (!simulation) {
      throw new Error('Simulation not found');
    }

    const questionIndex = simulation.questions.findIndex(q => q.id === questionId);
    if (questionIndex === -1) {
      throw new Error('Question not found');
    }

    simulation.questions[questionIndex] = {
      ...simulation.questions[questionIndex],
      ...updates
    };

    this.saveSimulation(simulation);
  },

  deleteQuestion(simulationId: string, questionId: number): void {
    const simulation = this.getSimulation(simulationId);
    if (!simulation) {
      throw new Error('Simulation not found');
    }

    simulation.questions = simulation.questions.filter(q => q.id !== questionId);
    this.saveSimulation(simulation);
  },

  // Document management for multi-document questions
  async addDocument(simulationId: string, questionId: number, document: Omit<Document, 'id'>): Promise<Document> {
    const simulation = this.getSimulation(simulationId);
    if (!simulation) {
      throw new Error('Simulation not found');
    }

    const question = simulation.questions.find(q => q.id === questionId);
    if (!question) {
      throw new Error('Question not found');
    }

    const newDocument: Document = {
      ...document,
      id: generateId()
    };

    if (!question.documents) {
      question.documents = [];
    }
    question.documents.push(newDocument);
    
    this.saveSimulation(simulation);
    return newDocument;
  },

  updateDocument(simulationId: string, questionId: number, documentId: string, updates: Partial<Document>): void {
    const simulation = this.getSimulation(simulationId);
    if (!simulation) {
      throw new Error('Simulation not found');
    }

    const question = simulation.questions.find(q => q.id === questionId);
    if (!question || !question.documents) {
      throw new Error('Question or documents not found');
    }

    const documentIndex = question.documents.findIndex(d => d.id === documentId);
    if (documentIndex === -1) {
      throw new Error('Document not found');
    }

    question.documents[documentIndex] = {
      ...question.documents[documentIndex],
      ...updates
    };

    this.saveSimulation(simulation);
  },

  deleteDocument(simulationId: string, questionId: number, documentId: string): void {
    const simulation = this.getSimulation(simulationId);
    if (!simulation) {
      throw new Error('Simulation not found');
    }

    const question = simulation.questions.find(q => q.id === questionId);
    if (!question || !question.documents) {
      throw new Error('Question or documents not found');
    }

    question.documents = question.documents.filter(d => d.id !== documentId);
    this.saveSimulation(simulation);
  },

  // Import/Export functionality
  exportSimulation(simulationId: string): string {
    const simulation = this.getSimulation(simulationId);
    if (!simulation) {
      throw new Error('Simulation not found');
    }

    return JSON.stringify(simulation, null, 2);
  },

  importSimulation(jsonData: string): Simulation {
    try {
      const parsed = JSON.parse(jsonData);
      
      // Validate the structure
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid JSON structure');
      }
      
      if (!parsed.title || typeof parsed.title !== 'string') {
        throw new Error('Simulation must have a valid title');
      }
      
      if (!Array.isArray(parsed.questions)) {
        throw new Error('Simulation must have a questions array');
      }
      
      // Validate each question
      for (let i = 0; i < parsed.questions.length; i++) {
        const question = parsed.questions[i];
        if (!question || typeof question !== 'object') {
          throw new Error(`Question ${i + 1} is invalid`);
        }
        
        if (typeof question.id !== 'number') {
          throw new Error(`Question ${i + 1} must have a valid ID`);
        }
        
        if (!question.type || !['text', 'image', 'reading', 'multi-document', 'answer-key'].includes(question.type)) {
          throw new Error(`Question ${i + 1} must have a valid type`);
        }
        
        if (!question.question || typeof question.question !== 'string') {
          throw new Error(`Question ${i + 1} must have a valid question text`);
        }
        
        if (!Array.isArray(question.options)) {
          throw new Error(`Question ${i + 1} must have an options array`);
        }
        
        if (!question.answer || typeof question.answer !== 'string') {
          throw new Error(`Question ${i + 1} must have a valid answer`);
        }
      }
      
      const simulation: Simulation = {
        id: generateId(), // Generate new ID to avoid conflicts
        title: parsed.title,
        questions: parsed.questions,
        createdAt: new Date().toISOString(),
        isAnswerKeyOnly: parsed.isAnswerKeyOnly || false
      };
      
      this.saveSimulation(simulation);
      return simulation;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Import failed: ${error.message}`);
      }
      throw new Error('Invalid simulation data');
    }
  },

  // Session management
  saveSession(sessionData: any): void {
    try {
      const sessions = this.getSessions();
      sessions[sessionData.simulationId] = sessionData;
      localStorage.setItem('toeic_sessions', JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  },

  getSession(simulationId: string): any | null {
    try {
      const sessions = this.getSessions();
      return sessions[simulationId] || null;
    } catch {
      return null;
    }
  },

  getSessions(): Record<string, any> {
    try {
      const data = localStorage.getItem('toeic_sessions');
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  },

  clearSession(simulationId: string): void {
    try {
      const sessions = this.getSessions();
      delete sessions[simulationId];
      localStorage.setItem('toeic_sessions', JSON.stringify(sessions));
    } catch (error) {
      console.error('Failed to clear session:', error);
    }
  }
};
