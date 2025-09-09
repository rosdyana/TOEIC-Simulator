export interface Question {
  id: number;
  type: 'image' | 'text' | 'reading' | 'multi-document' | 'answer-key';
  question: string;
  image?: string;
  options: string[];
  answer: string;
  // For reading comprehension
  passage?: string;
  insertionPoints?: { position: number; text: string }[];
  // For multi-document questions
  documents?: Document[];
  // For answer key questions
  answerGrid?: { questionNumber: number; answer: string }[];
}

export interface Document {
  id: string;
  type: 'invoice' | 'email' | 'notice' | 'review' | 'advertisement' | 'other';
  title: string;
  content: string;
  image?: string;
}

export interface Simulation {
  id: string;
  title: string;
  questions: Question[];
  createdAt: string;
  isAnswerKeyOnly?: boolean; // Flag to indicate if this simulation was created from answer sheet only
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
