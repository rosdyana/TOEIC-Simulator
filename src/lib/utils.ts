import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Calculate TOEIC time limit based on number of questions
 * TOEIC Reading Section: 100 questions in 75 minutes
 * TOEIC Full Test: 200 questions in 120 minutes (100 Listening + 100 Reading)
 * 
 * For reading-only tests: 75 minutes per 100 questions
 * For mixed tests: 120 minutes per 200 questions (proportional)
 */
export function calculateTOEICTimeLimit(questionCount: number, isReadingOnly: boolean = true): number {
  if (isReadingOnly) {
    // Reading section: 75 minutes for 100 questions = 0.75 minutes per question
    // Convert to seconds: 75 * 60 / 100 = 45 seconds per question
    return Math.round((questionCount * 75 * 60) / 100);
  } else {
    // Full test: 120 minutes for 200 questions = 0.6 minutes per question
    // Convert to seconds: 120 * 60 / 200 = 36 seconds per question
    return Math.round((questionCount * 120 * 60) / 200);
  }
}

/**
 * Determine if a simulation is reading-only based on question types
 */
export function isReadingOnlyTest(questions: { type: string }[]): boolean {
  // If all questions are reading type, it's reading-only
  // Otherwise, treat as mixed (could include listening, image-based, etc.)
  const readingTypes = ['reading', 'text', 'multi-document'];
  const hasOnlyReadingTypes = questions.every(q => readingTypes.includes(q.type));
  return hasOnlyReadingTypes && questions.length > 0;
}

export function calculateScore(answers: { selected: string; correct: string; options?: string[] }[]): number {
  const correct = answers.filter(answer => {
    // If we have options, convert selected text to letter index for comparison
    if (answer.options && answer.options.length > 0) {
      const selectedIndex = answer.options.findIndex(option => option === answer.selected);
      const selectedLetter = selectedIndex >= 0 ? String.fromCharCode(65 + selectedIndex) : '';
      return selectedLetter === answer.correct;
    }
    // Fallback to direct comparison for backward compatibility
    return answer.selected === answer.correct;
  }).length;
  return Math.round((correct / answers.length) * 100);
}
