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
