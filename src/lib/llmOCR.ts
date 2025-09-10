import { GoogleGenerativeAI } from '@google/generative-ai';
import OpenAI from 'openai';
import { llmConfigManager, LLMConfig } from './llmConfig';
import { Simulation, Question } from '@/types';
import { generateId } from './utils';

export interface LLMOCRResult {
  success: boolean;
  questions?: Question[];
  error?: string;
  rawResponse?: string;
}

export interface QuestionExtractionResult {
  question: string;
  options: string[];
  answer?: string;
  questionNumber?: number;
}

export class LLMOCRService {
  private config: LLMConfig;

  constructor() {
    this.config = llmConfigManager.getCurrentConfig();
  }

  private updateConfig(): void {
    this.config = llmConfigManager.getCurrentConfig();
  }

  private async convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get just the base64 string
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private async processWithGemini(imageBase64: string, prompt: string): Promise<string> {
    const genAI = new GoogleGenerativeAI(this.config.apiKey);
    const model = genAI.getGenerativeModel({ model: this.config.model });

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: 'image/png'
      }
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    return response.text();
  }

  private async processWithAzureOpenAI(imageBase64: string, prompt: string): Promise<string> {
    const client = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: `${this.config.endpoint}/openai/deployments/${this.config.deploymentName}`,
      defaultQuery: { 'api-version': '2024-02-15-preview' },
      dangerouslyAllowBrowser: true
    });

    const response = await client.chat.completions.create({
      model: this.config.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/png;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 4000,
      temperature: 0.1
    });

    return response.choices[0]?.message?.content || '';
  }

  private createQuestionExtractionPrompt(): string {
    return `You are an expert at extracting TOEIC test questions from images. 

Please analyze this image and extract ALL questions and their answer choices. The image may contain:
1. Multiple questions with answer choices (A, B, C, D)
2. Answer keys or answer sheets
3. Reading passages with questions

For each question found, provide:
- Question number (if visible)
- The complete question text
- All answer choices (A, B, C, D)
- The correct answer (if it's an answer key)

IMPORTANT: Return your response in the following JSON format:
{
  "questions": [
    {
      "questionNumber": 1,
      "question": "What is the main topic of the passage?",
      "options": [
        "Option A text",
        "Option B text", 
        "Option C text",
        "Option D text"
      ],
      "answer": "B"
    }
  ],
  "type": "questions" | "answer_key" | "mixed"
}

If this is an answer key image, return:
{
  "questions": [
    {
      "questionNumber": 101,
      "answer": "B"
    },
    {
      "questionNumber": 102, 
      "answer": "C"
    }
  ],
  "type": "answer_key"
}

Be thorough and extract ALL questions/answers visible in the image. If text is unclear, make your best interpretation.`;
  }

  private createAnswerSheetPrompt(): string {
    return `You are an expert at extracting answer keys from TOEIC test answer sheets.

Please analyze this answer sheet image and extract ALL question numbers and their corresponding correct answers.

The answer sheet typically shows:
- Question numbers (101, 102, 103, etc.)
- Corresponding answer letters (A, B, C, D)

Return your response in the following JSON format:
{
  "questions": [
    {
      "questionNumber": 101,
      "answer": "B"
    },
    {
      "questionNumber": 102,
      "answer": "C"
    }
  ],
  "type": "answer_key"
}

Extract ALL visible question-answer pairs. If a question number is visible but the answer is unclear, use "A" as default.`;
  }

  private parseLLMResponse(response: string): QuestionExtractionResult[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Check if the response indicates no content found
        if (response.toLowerCase().includes('blank') || 
            response.toLowerCase().includes('no content') ||
            response.toLowerCase().includes('no visible') ||
            response.toLowerCase().includes('white image')) {
          throw new Error('No content found in image - please upload a clear image with visible text');
        }
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.questions || !Array.isArray(parsed.questions)) {
        throw new Error('Invalid response format: missing questions array');
      }

      return parsed.questions.map((q: any) => ({
        questionNumber: q.questionNumber,
        question: q.question || `Question ${q.questionNumber}`,
        options: q.options || ['A', 'B', 'C', 'D'],
        answer: q.answer || 'A'
      }));
    } catch (error) {
      console.error('Failed to parse LLM response:', error);
      console.log('Raw response:', response);
      
      // If it's a "no content" error, don't try fallback extraction
      if (error instanceof Error && error.message.includes('No content found')) {
        throw error;
      }
      
      // Fallback: try to extract questions using regex patterns
      return this.fallbackQuestionExtraction(response);
    }
  }

  private fallbackQuestionExtraction(response: string): QuestionExtractionResult[] {
    const questions: QuestionExtractionResult[] = [];
    
    // Look for question patterns
    const questionPatterns = [
      /Question\s+(\d+)[:\s]+(.+?)(?=Question|\d+\.|$)/gi,
      /(\d+)\.\s*(.+?)(?=\d+\.|$)/gi,
      /Q(\d+)[:\s]+(.+?)(?=Q\d+|$)/gi
    ];

    for (const pattern of questionPatterns) {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        const questionNumber = parseInt(match[1], 10);
        const questionText = match[2].trim();
        
        if (questionNumber && questionText) {
          questions.push({
            questionNumber,
            question: questionText,
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            answer: 'A'
          });
        }
      }
    }

    return questions;
  }

  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      this.updateConfig();
      
      if (!llmConfigManager.isConfigured()) {
        return {
          success: false,
          error: 'LLM configuration is incomplete. Please configure API keys in admin settings.'
        };
      }

      console.log('Testing LLM connection...');
      console.log('Using provider:', this.config.provider);
      console.log('Using model:', this.config.model);

      // Create a simple test prompt without image
      const testPrompt = "Please respond with a simple JSON: {\"status\": \"connected\", \"message\": \"LLM is working\"}";
      
      let response: string;
      
      if (this.config.provider === 'gemini') {
        const genAI = new GoogleGenerativeAI(this.config.apiKey);
        const model = genAI.getGenerativeModel({ model: this.config.model });
        const result = await model.generateContent([testPrompt]);
        const responseObj = await result.response;
        response = responseObj.text();
      } else {
        const client = new OpenAI({
          apiKey: this.config.apiKey,
          baseURL: `${this.config.endpoint}/openai/deployments/${this.config.deploymentName}`,
          defaultQuery: { 'api-version': '2024-02-15-preview' },
          dangerouslyAllowBrowser: true
        });

        const result = await client.chat.completions.create({
          model: this.config.model,
          messages: [{ role: 'user', content: testPrompt }],
          max_tokens: 100,
          temperature: 0.1
        });

        response = result.choices[0]?.message?.content || '';
      }

      console.log('LLM test response received:', response);

      // Check if response contains expected content
      if (response.toLowerCase().includes('connected') || response.includes('status')) {
        return { success: true };
      } else {
        return { success: false, error: 'Unexpected response format' };
      }

    } catch (error) {
      console.error('LLM connection test failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async extractQuestionsFromImage(imageFile: File, imageUrl?: string): Promise<LLMOCRResult> {
    try {
      this.updateConfig();
      
      if (!llmConfigManager.isConfigured()) {
        return {
          success: false,
          error: 'LLM configuration is incomplete. Please configure API keys in admin settings.'
        };
      }

      console.log('Starting LLM-based question extraction...');
      console.log('Using provider:', this.config.provider);
      console.log('Using model:', this.config.model);

      const imageBase64 = await this.convertFileToBase64(imageFile);
      const prompt = this.createQuestionExtractionPrompt();

      let response: string;
      
      if (this.config.provider === 'gemini') {
        response = await this.processWithGemini(imageBase64, prompt);
      } else {
        response = await this.processWithAzureOpenAI(imageBase64, prompt);
      }

      console.log('LLM response received:', response.substring(0, 200) + '...');

      const extractedQuestions = this.parseLLMResponse(response);
      
      if (extractedQuestions.length === 0) {
        return {
          success: false,
          error: 'No questions could be extracted from the image. Please ensure the image contains clear text.',
          rawResponse: response
        };
      }

      const questions: Question[] = extractedQuestions.map((q, index) => ({
        id: q.questionNumber || index + 1,
        type: 'image',
        question: q.question,
        image: imageUrl || URL.createObjectURL(imageFile),
        options: q.options,
        answer: q.answer || 'A'
      }));

      console.log(`Successfully extracted ${questions.length} questions`);

      return {
        success: true,
        questions,
        rawResponse: response
      };

    } catch (error) {
      console.error('LLM OCR extraction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async extractAnswerSheetFromImage(imageFile: File, startNumber: number = 101, _endNumber: number = 200): Promise<LLMOCRResult> {
    try {
      this.updateConfig();
      
      if (!llmConfigManager.isConfigured()) {
        return {
          success: false,
          error: 'LLM configuration is incomplete. Please configure API keys in admin settings.'
        };
      }

      console.log('Starting LLM-based answer sheet extraction...');
      console.log('Using provider:', this.config.provider);
      console.log('Using model:', this.config.model);

      const imageBase64 = await this.convertFileToBase64(imageFile);
      const prompt = this.createAnswerSheetPrompt();

      let response: string;
      
      if (this.config.provider === 'gemini') {
        response = await this.processWithGemini(imageBase64, prompt);
      } else {
        response = await this.processWithAzureOpenAI(imageBase64, prompt);
      }

      console.log('LLM response received:', response.substring(0, 200) + '...');

      const extractedAnswers = this.parseLLMResponse(response);
      
      if (extractedAnswers.length === 0) {
        return {
          success: false,
          error: 'No answers could be extracted from the answer sheet. Please ensure the image is clear.',
          rawResponse: response
        };
      }

      // Create answer key questions
      const questions: Question[] = extractedAnswers.map((q) => ({
        id: q.questionNumber || startNumber,
        type: 'answer-key',
        question: `Question ${q.questionNumber || startNumber} - Answer key only`,
        options: ['A', 'B', 'C', 'D'],
        answer: q.answer || 'A',
        answerGrid: [{ questionNumber: q.questionNumber || startNumber, answer: q.answer || 'A' }]
      }));

      console.log(`Successfully extracted ${questions.length} answers`);

      return {
        success: true,
        questions,
        rawResponse: response
      };

    } catch (error) {
      console.error('LLM answer sheet extraction failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async parseTestFromImages(
    problemImages: File[],
    answerSheetImage: File,
    title: string,
    cloudinaryFiles?: any[] // CloudinaryFile[] - using any to avoid circular import
  ): Promise<Simulation> {
    try {
      console.log('Starting LLM-based test parsing...');
      console.log('Problem images:', problemImages.length);
      console.log('Answer sheet:', answerSheetImage.name);

      const questions: Question[] = [];
      
      // Process answer sheet first
      const answerSheetResult = await this.extractAnswerSheetFromImage(answerSheetImage);
      if (!answerSheetResult.success) {
        throw new Error(`Failed to process answer sheet: ${answerSheetResult.error}`);
      }

      const answerMap = new Map<number, string>();
      answerSheetResult.questions?.forEach(q => {
        if (q.answerGrid) {
          q.answerGrid.forEach(grid => {
            answerMap.set(grid.questionNumber, grid.answer);
          });
        }
      });

      // Process each problem image
      for (let i = 0; i < problemImages.length; i++) {
        console.log(`Processing problem image ${i + 1}/${problemImages.length}...`);
        
        const image = problemImages[i];
        const cloudinaryUrl = cloudinaryFiles?.[i]?.secureUrl;
        const result = await this.extractQuestionsFromImage(image, cloudinaryUrl);
        
        if (result.success && result.questions) {
          // Add the correct answer from the answer sheet
          result.questions.forEach(q => {
            const correctAnswer = answerMap.get(q.id) || 'A';
            q.answer = correctAnswer;
          });
          
          questions.push(...result.questions);
        } else {
          console.warn(`Failed to process image ${i + 1}:`, result.error);
          // Create a fallback question
          questions.push({
            id: i + 1,
            type: 'image',
            question: `Question ${i + 1}: Please answer based on the content shown.`,
            image: cloudinaryUrl || URL.createObjectURL(image),
            options: ['Option A', 'Option B', 'Option C', 'Option D'],
            answer: answerMap.get(i + 1) || 'A'
          });
        }
      }

      const simulation: Simulation = {
        id: generateId(),
        title: title || 'TOEIC Practice Test',
        questions,
        createdAt: new Date().toISOString()
      };

      console.log('LLM-based test parsing completed successfully');
      return simulation;

    } catch (error) {
      console.error('LLM test parsing failed:', error);
      throw new Error('Failed to parse images using LLM. Please check your configuration and try again.');
    }
  }
}

// Singleton instance
export const llmOCRService = new LLMOCRService();
