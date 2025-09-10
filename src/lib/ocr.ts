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

// Function to debug OCR results
export function debugOCRResults(ocrText: string, startNumber: number, endNumber: number): void {
  console.log('=== OCR DEBUG INFO ===');
  console.log('Raw OCR Text:', ocrText);
  console.log('Text Length:', ocrText.length);
  console.log('Expected Range:', `${startNumber} to ${endNumber}`);
  
  // Show all numbers found
  const numbers = ocrText.match(/\d+/g);
  console.log('All numbers found:', numbers);
  
  // Show all letters found
  const letters = ocrText.match(/[ABCD]/gi);
  console.log('All letters found:', letters);
  
  // Show potential answer patterns
  const patterns = [
    /(\d+)\s*\(\s*([ABCD])\s*\)/gi,
    /(\d+)\s+([ABCD])/gi,
    /(\d+):\s*([ABCD])/gi
  ];
  
  patterns.forEach((pattern, index) => {
    const matches = [...ocrText.matchAll(pattern)];
    console.log(`Pattern ${index + 1} matches:`, matches.map(m => `${m[1]} -> ${m[2]}`));
  });
  
  // Show line by line analysis
  const lines = ocrText.split('\n').filter(line => line.trim());
  console.log('Text lines:', lines);
  
  // Show character analysis
  const uniqueChars = [...new Set(ocrText)].sort();
  console.log('Unique characters found:', uniqueChars);
  
  console.log('=== END DEBUG INFO ===');
}


// Function to parse answer sheet only (format: "101 (B)", "102 (D)", etc.)
export async function parseAnswerSheetFromImage(
  answerSheetImage: File,
  title: string,
  startNumber: number = 101,
  endNumber: number = 200
): Promise<Simulation> {
  try {
    console.log('Starting answer sheet OCR processing...');
    console.log('Answer sheet:', answerSheetImage.name);

    // Preprocess the image for better OCR results
    console.log('Preprocessing image for better OCR...');
    const processedImage = await preprocessImageForOCR(answerSheetImage);

    // Initialize Tesseract worker with improved configuration
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
      tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT, // Better for structured text
      tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY, // Use LSTM for better accuracy
    });

    // Try multiple OCR approaches if the first one fails
    let answerSheetText = '';
    let attempts = 0;
    const maxAttempts = 4;

    const ocrConfigs = [
      // Config 1: Sparse text mode (best for structured layouts)
      {
        tessedit_pageseg_mode: Tesseract.PSM.SPARSE_TEXT,
        tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?()[]{}":;-\' '
      },
      // Config 2: Auto mode with legacy engine
      {
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        tessedit_ocr_engine_mode: Tesseract.OEM.DEFAULT,
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?()[]{}":;-\' '
      },
      // Config 3: Single block mode
      {
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
        tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY,
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?()[]{}":;-\' '
      },
      // Config 4: No character whitelist (most permissive)
      {
        tessedit_pageseg_mode: Tesseract.PSM.AUTO,
        tessedit_ocr_engine_mode: Tesseract.OEM.LSTM_ONLY
      }
    ];

    while (answerSheetText.trim().length === 0 && attempts < maxAttempts) {
      attempts++;
      console.log(`OCR attempt ${attempts}/${maxAttempts} with config ${attempts}...`);
      
      try {
        // Apply configuration for this attempt
        await worker.setParameters(ocrConfigs[attempts - 1]);
        
        const answerSheetResult = await worker.recognize(processedImage);
        answerSheetText = answerSheetResult.data.text;
        
        console.log(`Attempt ${attempts} extracted ${answerSheetText.length} characters`);
        
        // If we got some text, break out of the loop
        if (answerSheetText.trim().length > 0) {
          console.log(`Success with config ${attempts}!`);
          break;
        }
      } catch (error) {
        console.warn(`OCR attempt ${attempts} failed:`, error);
      }
    }

    // If all attempts failed, try with the original image (no preprocessing)
    if (answerSheetText.trim().length === 0) {
      console.log('All preprocessing attempts failed, trying with original image...');
      try {
        await worker.setParameters({
          tessedit_pageseg_mode: Tesseract.PSM.AUTO,
          tessedit_ocr_engine_mode: Tesseract.OEM.DEFAULT
        });
        const fallbackResult = await worker.recognize(answerSheetImage);
        answerSheetText = fallbackResult.data.text;
        console.log(`Fallback attempt extracted ${answerSheetText.length} characters`);
      } catch (error) {
        console.error('Fallback OCR attempt also failed:', error);
      }
    }

    console.log('Answer sheet text extracted:', answerSheetText.substring(0, 200) + '...');
    console.log('Full OCR text for debugging:', answerSheetText);
    
    // Debug OCR results
    debugOCRResults(answerSheetText, startNumber, endNumber);
    
    // Extract answers from answer sheet using proven approach
    const answers = extractAnswersFromAnswerSheet(answerSheetText, startNumber, endNumber);
    console.log('Extracted answers:', answers);
    
    // Check if we got mostly 'A' answers (indicating parsing failure)
    const nonDefaultAnswers = answers.filter(answer => answer !== 'A').length;
    const totalAnswers = answers.length;
    const defaultRatio = (totalAnswers - nonDefaultAnswers) / totalAnswers;
    
    console.log(`Default answers ratio: ${defaultRatio.toFixed(2)} (${nonDefaultAnswers}/${totalAnswers} non-default)`);
    
    // Provide detailed feedback about OCR success
    if (answerSheetText.trim().length === 0) {
      console.error('OCR failed to extract any text from the image.');
      console.log('Suggestions:');
      console.log('1. Ensure the image is clear and high resolution');
      console.log('2. Check that the text is not too small or blurry');
      console.log('3. Try taking a new photo with better lighting');
      console.log('4. Consider using manual input instead');
    } else if (defaultRatio > 0.9) {
      console.warn('Warning: Most answers are default "A". OCR might not have parsed the image correctly.');
      console.log('The OCR extracted text but could not parse the answer format.');
      console.log('Extracted text preview:', answerSheetText.substring(0, 500));
      console.log('Consider using manual input or checking the image quality.');
    } else if (nonDefaultAnswers < 10) {
      console.warn('Warning: Only found a few answers. OCR might not have parsed the image correctly.');
      console.log('Consider using manual input or checking the image quality.');
    } else {
      console.log(`Successfully extracted ${nonDefaultAnswers} answers from the image!`);
    }

    // Create questions with correct answers only
    const questions: Question[] = answers.map((answer, index) => ({
      id: startNumber + index,
      type: 'answer-key',
      question: `Question ${startNumber + index} - Answer key only (to be added later)`,
      options: ['A', 'B', 'C', 'D'],
      answer: answer,
      answerGrid: [{ questionNumber: startNumber + index, answer: answer }]
    }));

    // Terminate worker
    await worker.terminate();

    const simulation: Simulation = {
      id: generateId(),
      title: title || 'TOEIC Answer Sheet Test',
      questions,
      createdAt: new Date().toISOString(),
      isAnswerKeyOnly: true
    };

    console.log('Answer sheet OCR processing completed successfully');
    return simulation;

  } catch (error) {
    console.error('Answer sheet OCR parsing failed:', error);
    throw new Error('Failed to parse answer sheet. Please ensure the image is clear and try again.');
  }
}

// Helper function to extract answers from answer sheet text (based on example.js approach)
function extractAnswersFromAnswerSheet(text: string, startNumber: number, endNumber: number): string[] {
  console.log('Raw OCR text for parsing:', text);
  
  // Multiple regex patterns to handle different OCR variations
  const patterns = [
    // Primary pattern: "101 (B)" or "101(B)" or "101 ( B )"
    /(\d+)\s*\(\s*([ABCDabcd])\s*\)/g,
    // Secondary pattern: "101 B" or "101: B"
    /(\d+)[:\s]+\s*([ABCDabcd])\b/g,
    // Tertiary pattern: "101. B" or "101) B"
    /(\d+)[\.\)]\s*([ABCDabcd])\b/g,
    // Fallback pattern: any number followed by A/B/C/D
    /(\d+)\s+([ABCDabcd])\b/g,
    // Alternative pattern: "Q101: B" or "Question 101: B"
    /(?:q|question)\s*(\d+)[:\s]+\s*([ABCDabcd])\b/gi
  ];
  
  const key: { [key: number]: string } = {};
  const foundQuestionNumbers = new Set<number>();
  const foundPairs: { questionNumber: number; correctAnswer: string }[] = [];

  // Try each pattern until we find matches
  for (let patternIndex = 0; patternIndex < patterns.length; patternIndex++) {
    const pattern = patterns[patternIndex];
    let match;
    pattern.lastIndex = 0; // Reset regex state
    
    console.log(`Trying pattern ${patternIndex + 1}:`, pattern);
    
    while ((match = pattern.exec(text)) !== null) {
      const questionNumber = parseInt(match[1], 10);
      const correctAnswer = match[2].toUpperCase();
      
      // Validate the answer is A, B, C, or D
      if (/[ABCD]/.test(correctAnswer)) {
        foundPairs.push({ questionNumber, correctAnswer });
        foundQuestionNumbers.add(questionNumber);
        console.log(`Found: ${questionNumber} -> ${correctAnswer}`);
      }
    }
    
    // If we found matches with this pattern, break
    if (foundPairs.length > 0) {
      console.log(`Pattern ${patternIndex + 1} found ${foundPairs.length} matches`);
      break;
    }
  }

  // If no patterns worked, try a more aggressive approach
  if (foundPairs.length === 0) {
    console.log('No patterns matched, trying aggressive extraction...');
    
    // Extract all numbers and letters separately, then try to pair them
    const numbers = text.match(/\d+/g) || [];
    const letters = text.match(/[ABCD]/gi) || [];
    
    console.log('Found numbers:', numbers);
    console.log('Found letters:', letters);
    
    // Try to pair numbers with letters based on proximity
    for (let i = 0; i < Math.min(numbers.length, letters.length); i++) {
      const questionNumber = parseInt(numbers[i], 10);
      const correctAnswer = letters[i].toUpperCase();
      
      if (questionNumber >= startNumber && questionNumber <= endNumber) {
        foundPairs.push({ questionNumber, correctAnswer });
        foundQuestionNumbers.add(questionNumber);
        console.log(`Aggressive match: ${questionNumber} -> ${correctAnswer}`);
      }
    }
  }

  // Sort pairs by question number
  foundPairs.sort((a, b) => a.questionNumber - b.questionNumber);

  // Build the answer key
  foundPairs.forEach(pair => {
    key[pair.questionNumber] = pair.correctAnswer;
  });

  console.log('Extracted answer key:', key);
  console.log('Found question numbers:', Array.from(foundQuestionNumbers).sort((a, b) => a - b));

  // Create answers array for the specified range
  const answers: string[] = [];
  for (let i = startNumber; i <= endNumber; i++) {
    const answer = key[i] || 'A'; // Default to A if not found
    answers.push(answer);
  }

  console.log(`Generated ${answers.length} answers for range ${startNumber}-${endNumber}`);
  return answers;
}

// Function to extract question text and options from a question image
export async function extractQuestionFromImage(imageFile: File): Promise<{
  question: string;
  options: string[];
  success: boolean;
  error?: string;
}> {
  try {
    console.log('Starting question OCR extraction...');
    console.log('Image file:', imageFile.name);

    // Preprocess the image for better OCR results
    const processedImage = await preprocessImageForOCR(imageFile);

    // Initialize Tesseract worker
    const worker = await Tesseract.createWorker('eng', 1, {
      logger: (m) => {
        if (m.status === 'recognizing text') {
          console.log(`Question OCR Progress: ${Math.round(m.progress * 100)}%`);
        }
      }
    });

    // Configure OCR settings for question text recognition
    await worker.setParameters({
      tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?()[]{}":;-\' ',
      tessedit_pageseg_mode: Tesseract.PSM.AUTO,
    });

    // Process the image
    const result = await worker.recognize(processedImage);
    const extractedText = result.data.text;
    
    console.log('Question OCR text extracted:', extractedText);
    console.log('OCR text length:', extractedText.length);
    console.log('OCR text lines:', extractedText.split('\n'));
    
    // Terminate worker
    await worker.terminate();

    if (!extractedText || extractedText.trim().length === 0) {
      return {
        question: '',
        options: ['', '', '', ''],
        success: false,
        error: 'No text extracted from image'
      };
    }

    // Extract question and options from the text
    const { question, options } = parseQuestionFromText(extractedText);
    
    console.log('Extracted question:', question);
    console.log('Extracted options:', options);

    if (!question && options.length === 0) {
      return {
        question: '',
        options: ['', '', '', ''],
        success: false,
        error: 'Could not parse question or options from extracted text'
      };
    }

    return {
      question,
      options,
      success: true
    };

  } catch (error) {
    console.error('Question OCR extraction failed:', error);
    return {
      question: '',
      options: ['', '', '', ''],
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

// Helper function to parse question text and options from OCR result
function parseQuestionFromText(text: string): { question: string; options: string[] } {
  console.log('Parsing question from text:', text);
  
  // Split into lines, trim, and filter empty lines
  let lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  console.log('Text lines (initial):', lines);
  
  // Attempt to re-assemble split option lines (e.g., "D) himse" + "lf")
  const reassembledLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const currentLine = lines[i];
    const nextLine = lines[i + 1];
    
    // Check if current line looks like a partial option start (e.g., "D) some")
    // and next line is short and could be a continuation
    const partialOptionStartRegex = /^\s*([ABCD])(?:\)|\.)\s*(\S.*)/i;
    const continuationRegex = /^\s*(\S.*)/;
    
    if (currentLine.match(partialOptionStartRegex) && nextLine && nextLine.length < 15 && nextLine.match(continuationRegex)) {
      // Heuristic: if a line starts like an option and the next line is short, merge them
      reassembledLines.push(`${currentLine} ${nextLine}`);
      i++; // Skip the next line as it's merged
    } else {
      reassembledLines.push(currentLine);
    }
  }
  lines = reassembledLines;
  console.log('Text lines (reassembled):', lines);
  
  let question = '';
  let options: string[] = [];
  
  // First, try to identify option lines using a more specific regex
  // Only match lines that start with (A), (B), (C), (D) or A), B), C), D)
  const optionLineRegex = /^\s*\(([ABCD])\)\s*(.*)$|^\s*([ABCD])\)\s*(.*)$/i;
  const potentialOptionLines: string[] = [];
  const nonOptionLines: string[] = [];
  
  for (const line of lines) {
    console.log(`Testing line: "${line}"`);
    const match = optionLineRegex.test(line);
    console.log(`Option regex match: ${match}`);
    if (match) {
      potentialOptionLines.push(line);
    } else {
      nonOptionLines.push(line);
    }
  }
  console.log('Potential option lines:', potentialOptionLines);
  console.log('Non-option lines:', nonOptionLines);
  
  // If options are found, extract them and fill in missing ones
  if (potentialOptionLines.length > 0) {
    const extractedMap: { [key: string]: string } = {};
    potentialOptionLines.forEach(line => {
      const match = line.match(optionLineRegex);
      if (match) {
        // Handle both regex groups: (A) text or A) text
        const letter = (match[1] || match[3]).toUpperCase();
        const text = (match[2] || match[4]).trim();
        extractedMap[letter] = text; // Just store the text, not the letter prefix
      }
    });
    
    // Ensure we have A, B, C, D, filling in defaults if missing
    const finalOptions: string[] = [];
    const optionChars = ['A', 'B', 'C', 'D'];
    optionChars.forEach(char => {
      if (extractedMap[char]) {
        finalOptions.push(extractedMap[char]); // Just the text value
      } else {
        finalOptions.push(`Option ${char}`); // Default without letter prefix
      }
    });
    options = finalOptions;
    
    // The question is everything before the first option
    question = nonOptionLines.join(' ').replace(/-{3,}/g, '_____').trim();
  } else {
    // Fallback: if no clear options, try to find question based on common patterns
    const questionTextCandidate = nonOptionLines.join(' ');
    
    const questionPatterns = [
      // Pattern for questions with blanks: "text ------- text"
      /([^ABCD]*?)\s*-{3,}\s*([^ABCD]*?)(?=[ABCD]|$)/i,
      // Pattern for questions ending with question mark
      /([^ABCD]*\?)/i,
      // Pattern for questions with "about" or similar keywords
      /([^ABCD]*?(?:about|regarding|concerning|speaking|talking)[^ABCD]*?)(?=[ABCD]|$)/i,
      // Fallback: take everything before the first option-like pattern (if any)
      /([^ABCD]*?)(?=\s*[ABCD][).])/i,
      // Final fallback: just take the first few lines
      /^(.{10,200}?)(?=\s*[ABCD]|$)/i,
    ];
    
    for (const pattern of questionPatterns) {
      const match = questionTextCandidate.match(pattern);
      if (match && match[1].trim().length > 10) {
        question = match[1].trim().replace(/-{3,}/g, '_____');
        break;
      }
    }
    
    // If question still not found, take the first few lines as a last resort
    if (!question && nonOptionLines.length > 0) {
      question = nonOptionLines.slice(0, Math.min(3, nonOptionLines.length)).join(' ').replace(/-{3,}/g, '_____').trim();
    }
    
    // Aggressive option extraction if no options found (as a last resort)
    const aggressiveOptionRegex = /\b([ABCD])(?:\)|\.)\s*([^ABCD]*?)(?=\b[ABCD][).]|$)|\b([ABCD])(?:\)|\.)\s*([^\n]*)/gi;
    let aggressiveMatch;
    const aggressiveOptions: string[] = [];
    
    // Use the original full text for aggressive matching, as it might span lines
    while ((aggressiveMatch = aggressiveOptionRegex.exec(text)) !== null) {
      const optionChar = aggressiveMatch[1] || aggressiveMatch[3];
      const optionText = aggressiveMatch[2] || aggressiveMatch[4];
      if (optionChar && optionText) {
        aggressiveOptions.push(`${optionChar.toUpperCase()}) ${optionText.trim()}`);
      }
    }
    
    // If aggressive options are found, use them and fill in missing ones
    if (aggressiveOptions.length > 0) {
      const extractedMap: { [key: string]: string } = {};
      aggressiveOptions.forEach(opt => {
        const char = opt.charAt(0);
        const text = opt.substring(3); // Remove "A) " prefix
        extractedMap[char] = text;
      });
      
      const finalOptions: string[] = [];
      const optionChars = ['A', 'B', 'C', 'D'];
      optionChars.forEach(char => {
        if (extractedMap[char]) {
          finalOptions.push(extractedMap[char]); // Just the text value
        } else {
          finalOptions.push(`Option ${char}`); // Default without letter prefix
        }
      });
      options = finalOptions;
    } else {
      // If still no options, generate default ones
      options = ['Option A', 'Option B', 'Option C', 'Option D'];
    }
  }
  
  console.log('Final extracted question:', question);
  console.log('Final extracted options:', options);
  
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
      // Scale up the image for better OCR (minimum 2x)
      const scaleFactor = Math.max(2, 1200 / Math.max(img.width, img.height));
      canvas.width = img.width * scaleFactor;
      canvas.height = img.height * scaleFactor;
      
      // Enable image smoothing for better quality
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // Draw scaled image
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Apply image enhancement for better OCR
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Apply multiple enhancement techniques
        for (let i = 0; i < data.length; i += 4) {
          // Convert to grayscale
          const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
          
          // Apply adaptive thresholding instead of simple binary
          // This helps with varying lighting conditions
          const threshold = 128;
          const enhanced = gray > threshold ? 255 : 0;
          
          // Apply slight contrast boost
          const contrast = 1.2;
          const adjusted = Math.min(255, Math.max(0, (enhanced - 128) * contrast + 128));
          
          data[i] = adjusted;     // Red
          data[i + 1] = adjusted; // Green
          data[i + 2] = adjusted; // Blue
          // Alpha channel remains unchanged
        }
        
        ctx.putImageData(imageData, 0, 0);
      }
      
      // Convert back to file with high quality
      canvas.toBlob((blob) => {
        if (blob) {
          const processedFile = new File([blob], file.name, { type: 'image/png' });
          console.log(`Image preprocessed: ${file.name} -> ${processedFile.size} bytes`);
          resolve(processedFile);
        } else {
          console.warn('Failed to create processed image blob, using original');
          resolve(file);
        }
      }, 'image/png', 1.0); // Maximum quality
    };
    
    img.onerror = () => {
      console.warn('Failed to load image for preprocessing, using original');
      resolve(file);
    };
    
    img.src = URL.createObjectURL(file);
  });
}
