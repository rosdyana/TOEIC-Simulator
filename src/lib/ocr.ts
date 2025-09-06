import Tesseract from 'tesseract.js';
import { Simulation, Question } from '@/types';
import { generateId } from './utils';

// Production OCR function with real Tesseract.js implementation
export async function parseTestFromImages(
  problemImages: File[],
  answerSheetImage: File,
  title: string
): Promise<Simulation> {
  try {
    console.log('Starting OCR processing...');
    console.log('Problem images:', problemImages.length);
    console.log('Answer sheet:', answerSheetImage.name);

    // Initialize Tesseract worker
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    // Configure OCR settings for better text recognition
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?()[]{}":;-\' ',
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
    });

    // Process answer sheet first to extract correct answers
    console.log('Processing answer sheet...');
    const answerSheetResult = await worker.recognize(answerSheetImage);
    const answerSheetText = answerSheetResult.data.text;
    console.log('Answer sheet text extracted:', answerSheetText.substring(0, 200) + '...');
    
    // Extract answers from answer sheet
    const answers = extractAnswersFromText(answerSheetText);
    console.log('Extracted answers:', answers);

    const questions: Question[] = [];
    
    // Process each problem image
    for (let i = 0; i < problemImages.length; i++) {
      console.log(`Processing problem image ${i + 1}/${problemImages.length}...`);
      
      const image = problemImages[i];
      const result = await worker.recognize(image);
      const text = result.data.text;
      
      console.log(`Problem ${i + 1} text extracted:`, text.substring(0, 200) + '...');
      
      // Extract question and options from text
      const questionData = extractQuestionFromText(text, i + 1);
      
      questions.push({
        id: i + 1,
        type: 'image',
        question: questionData.question,
        image: URL.createObjectURL(image),
        options: questionData.options,
        answer: answers[i] || 'A' // Default to A if answer not found
      });
    }

    // Terminate worker
    await worker.terminate();

    const simulation: Simulation = {
      id: generateId(),
      title: title || 'TOEIC Practice Test',
      questions,
      createdAt: new Date().toISOString()
    };

    console.log('OCR processing completed successfully');
    return simulation;

  } catch (error) {
    console.error('OCR parsing failed:', error);
    throw new Error('Failed to parse images. Please ensure images are clear and try again.');
  }
}


// Helper functions for text extraction from OCR results
function extractAnswersFromText(text: string): string[] {
  const answers: string[] = [];
  
  // Clean the text and normalize whitespace
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  // Look for common answer patterns
  const answerPatterns = [
    // Pattern: "1. A" or "1) A" or "1 A"
    /(\d+)[\.\)\s]+([ABCD])/gi,
    // Pattern: "Answer 1: A" or "Answer 1 A"
    /answer\s*(\d+)[:\s]+([ABCD])/gi,
    // Pattern: "Q1: A" or "Q1 A"
    /q(\d+)[:\s]+([ABCD])/gi,
    // Pattern: just "A B C D" sequence
    /([ABCD])\s+([ABCD])\s+([ABCD])\s+([ABCD])/gi
  ];
  
  // Try different patterns
  for (const pattern of answerPatterns) {
    const matches = [...cleanText.matchAll(pattern)];
    if (matches.length > 0) {
      matches.forEach(match => {
        if (match.length >= 3) {
          // Extract answer letter
          const answer = match[2] || match[1];
          if (answer && /[ABCD]/i.test(answer)) {
            answers.push(answer.toUpperCase());
          }
        } else if (match.length === 5) {
          // Handle "A B C D" pattern
          for (let i = 1; i < 5; i++) {
            if (match[i] && /[ABCD]/i.test(match[i])) {
              answers.push(match[i].toUpperCase());
            }
          }
        }
      });
      break;
    }
  }
  
  // If no patterns found, try to extract individual letters
  if (answers.length === 0) {
    const letterMatches = cleanText.match(/[ABCD]/gi);
    if (letterMatches) {
      answers.push(...letterMatches.map(letter => letter.toUpperCase()));
    }
  }
  
  // Ensure we have at least some answers
  if (answers.length === 0) {
    console.warn('No answers found in answer sheet, using default pattern');
    return ['A', 'B', 'C', 'D', 'A']; // Default fallback
  }
  
  return answers;
}

function extractQuestionFromText(text: string, questionNumber: number): { question: string; options: string[] } {
  // Clean the text
  const cleanText = text.replace(/\s+/g, ' ').trim();
  
  // Try to extract question text
  let question = '';
  let options: string[] = [];
  
  // Look for question patterns
  const questionPatterns = [
    // Pattern: "Question X:" or "Q X:" followed by text
    /(?:question|q)\s*\d*[:\s]+(.+?)(?=[ABCD]\)|$)/i,
    // Pattern: "What" or "How" or "When" questions
    /(what|how|when|where|why|which|who)\s+.+?(?=[ABCD]\)|$)/i,
    // Pattern: "Look at" or "Listen to" instructions
    /(look at|listen to|read|examine)\s+.+?(?=[ABCD]\)|$)/i
  ];
  
  for (const pattern of questionPatterns) {
    const match = cleanText.match(pattern);
    if (match && match[1]) {
      question = match[1].trim();
      break;
    }
  }
  
  // If no specific question found, use a generic one
  if (!question) {
    question = `Question ${questionNumber}: Please answer based on the content shown.`;
  }
  
  // Extract options (A), B), C), D) patterns)
  const optionPatterns = [
    // Pattern: "A) text" or "A. text"
    /([ABCD])[\.\)]\s*([^ABCD]+?)(?=[ABCD][\.\)]|$)/gi,
    // Pattern: "A text" (without parentheses)
    /([ABCD])\s+([^ABCD]+?)(?=[ABCD]\s|$)/gi
  ];
  
  for (const pattern of optionPatterns) {
    const matches = [...cleanText.matchAll(pattern)];
    if (matches.length >= 2) {
      options = matches.map(match => {
        const letter = match[1];
        const text = match[2].trim();
        return `${letter}) ${text}`;
      });
      break;
    }
  }
  
  // If no options found, create generic ones
  if (options.length === 0) {
    options = [
      'A) Option A',
      'B) Option B', 
      'C) Option C',
      'D) Option D'
    ];
  }
  
  // Ensure we have exactly 4 options
  while (options.length < 4) {
    const letter = String.fromCharCode(65 + options.length);
    options.push(`${letter}) Option ${letter}`);
  }
  
  // Limit to 4 options
  options = options.slice(0, 4);
  
  return {
    question: question.length > 200 ? question.substring(0, 200) + '...' : question,
    options
  };
}

// Additional utility function for image preprocessing
export function preprocessImageForOCR(file: File): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      // Set canvas size
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Draw image
      ctx?.drawImage(img, 0, 0);
      
      // Apply image enhancement for better OCR
      const imageData = ctx?.getImageData(0, 0, canvas.width, canvas.height);
      if (imageData) {
        const data = imageData.data;
        
        // Increase contrast and brightness
        for (let i = 0; i < data.length; i += 4) {
          // Convert to grayscale
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          
          // Apply contrast enhancement
          const enhanced = gray > 128 ? 255 : 0;
          
          data[i] = enhanced;     // Red
          data[i + 1] = enhanced; // Green
          data[i + 2] = enhanced; // Blue
          // Alpha channel remains unchanged
        }
        
        ctx?.putImageData(imageData, 0, 0);
      }
      
      // Convert back to file
      canvas.toBlob((blob) => {
        if (blob) {
          const processedFile = new File([blob], file.name, { type: 'image/png' });
          resolve(processedFile);
        } else {
          resolve(file);
        }
      }, 'image/png');
    };
    
    img.src = URL.createObjectURL(file);
  });
}
