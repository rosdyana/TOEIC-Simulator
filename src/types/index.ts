export interface Question {
  id: number;
  type: 'image' | 'text';
  question: string;
  image?: string;
  options: string[];
  answer: string;
}

export interface Simulation {
  id: string;
  title: string;
  questions: Question[];
  createdAt: string;
}

export interface AnswerRecord {
  id: number;
  selected: string;
  correct: string;
}

export interface StatsRecord {
  simulationId: string;
  score: number;
  timeSpent: string;
  date: string;
  answers: AnswerRecord[];
}

export interface UploadedFile {
  file: File;
  preview: string;
}
