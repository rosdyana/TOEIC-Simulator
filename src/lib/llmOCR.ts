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
          error: 'LLM configuration is incomplete. Please configure API keys in settings.'
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
          error: 'LLM configuration is incomplete. Please configure API keys in settings.'
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
          error: 'LLM configuration is incomplete. Please configure API keys in settings.'
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

  /**
   * Generate TOEIC reading comprehension questions using AI
   * Uses batching for large question counts to avoid token limits
   * Automatically generates missing questions to fulfill the requested count
   */
  async generateReadingQuestions(count: number): Promise<Question[]> {
    try {
      this.updateConfig();

      if (!llmConfigManager.isConfigured()) {
        throw new Error('LLM configuration is incomplete. Please configure API keys in settings.');
      }

      // For large counts, generate in batches to avoid token limits
      const batchSize = 20; // Generate 20 questions per batch
      const allQuestions: Question[] = [];
      const maxRetries = 3; // Maximum retries for filling missing questions

      // Initial generation phase
      const initialBatches = Math.ceil(count / batchSize);

      for (let i = 0; i < initialBatches; i++) {
        const remainingCount = count - allQuestions.length;
        const currentBatchSize = Math.min(batchSize, remainingCount);
        const startId = allQuestions.length + 1;

        console.log(`Generating batch ${i + 1}/${initialBatches} (${currentBatchSize} questions)...`);

        const batchQuestions = await this.generateBatch(currentBatchSize, startId);
        allQuestions.push(...batchQuestions);

        // If we got fewer questions than requested, log it
        if (batchQuestions.length < currentBatchSize) {
          console.warn(`Batch ${i + 1} generated ${batchQuestions.length} questions, expected ${currentBatchSize}`);
        }

        // Small delay between batches to avoid rate limiting
        if (i < initialBatches - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Fill missing questions phase
      let retryCount = 0;
      while (allQuestions.length < count && retryCount < maxRetries) {
        const missingCount = count - allQuestions.length;
        console.log(`Filling ${missingCount} missing questions (attempt ${retryCount + 1}/${maxRetries})...`);

        // Generate missing questions in smaller batches to be more precise
        const fillBatchSize = Math.min(10, missingCount); // Use smaller batches for filling
        const startId = allQuestions.length + 1;

        try {
          const fillQuestions = await this.generateBatch(fillBatchSize, startId);
          allQuestions.push(...fillQuestions);

          if (fillQuestions.length < fillBatchSize) {
            console.warn(`Fill batch generated ${fillQuestions.length} questions, expected ${fillBatchSize}`);
            retryCount++;
          } else {
            retryCount = 0; // Reset retry count on success
          }

          // Small delay between fill attempts
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`Error filling missing questions:`, error);
          retryCount++;
          if (retryCount >= maxRetries) {
            console.warn(`Stopped trying to fill missing questions after ${maxRetries} attempts`);
            break;
          }
        }
      }

      // Ensure we don't exceed the requested count
      if (allQuestions.length > count) {
        return allQuestions.slice(0, count);
      }

      // Final check - if we still have fewer, log it
      if (allQuestions.length < count) {
        const missing = count - allQuestions.length;
        console.warn(`Generated ${allQuestions.length} out of ${count} requested questions (${missing} missing after ${maxRetries} retry attempts)`);
      } else {
        console.log(`Successfully generated all ${count} questions!`);
      }

      return allQuestions;
    } catch (error) {
      console.error('Failed to generate reading questions:', error);
      throw error instanceof Error ? error : new Error('Failed to generate reading questions');
    }
  }

  /**
   * Generate a single batch of questions
   */
  private async generateBatch(batchSize: number, startId: number): Promise<Question[]> {
    const prompt = this.createReadingGenerationPrompt(batchSize, startId);

    let response: string;

    if (this.config.provider === 'gemini') {
      const genAI = new GoogleGenerativeAI(this.config.apiKey);
      const model = genAI.getGenerativeModel({ model: this.config.model });
      const result = await model.generateContent([prompt]);
      const responseObj = await result.response;
      response = responseObj.text();
    } else {
      const client = new OpenAI({
        apiKey: this.config.apiKey,
        baseURL: `${this.config.endpoint}/openai/deployments/${this.config.deploymentName}`,
        defaultQuery: { 'api-version': '2024-02-15-preview' },
        dangerouslyAllowBrowser: true
      });

      // Increase max_tokens for larger batches
      const maxTokens = Math.min(16000, batchSize * 200);

      // Force JSON format for Azure OpenAI
      // Note: response_format requires API version 2024-02-15-preview or later
      const requestParams: any = {
        model: this.config.model,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant designed to output JSON. Always respond with valid JSON format only, no additional text or explanations.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: maxTokens,
        temperature: 0.7,
        response_format: { type: 'json_object' } // Force JSON mode - ensures response is valid JSON
      };

      const result = await client.chat.completions.create(requestParams);

      response = result.choices[0]?.message?.content || '';

      // Check if response was truncated
      if (result.choices[0]?.finish_reason === 'length') {
        console.warn('Response was truncated due to token limit. May need to reduce batch size.');
        // If truncated, the JSON might be incomplete - this will be caught in parsing
      }

      // Log if response_format was not respected (shouldn't happen with JSON mode)
      if (!response.trim().startsWith('{') && !response.trim().startsWith('[')) {
        console.warn('Response does not start with JSON. Response format may not be working correctly.');
      }
    }

    return this.parseReadingGenerationResponse(response, batchSize, startId);
  }

  private createReadingGenerationPrompt(count: number, startId: number = 1): string {
    return `You are an expert at creating authentic TOEIC Reading Comprehension test questions. 

Generate exactly ${count} TOEIC reading comprehension questions that match the real TOEIC test format. Each question should include:

1. A reading passage (150-300 words) on topics such as:
   - Business communications (emails, memos, letters)
   - Workplace announcements
   - Product descriptions
   - Travel and tourism
   - News articles
   - Advertisements
   - Instructions and notices

2. For each passage, create 2-4 questions that test:
   - Main idea comprehension
   - Detail understanding
   - Inference
   - Vocabulary in context
   - Purpose of the passage

3. Each question must have exactly 4 answer choices (A, B, C, D)
4. One answer must be clearly correct
5. Distractors should be plausible but incorrect

CRITICAL: You MUST generate exactly ${count} questions. Do not stop early.

CRITICAL: You MUST respond with ONLY valid JSON. No markdown, no code blocks, no explanations, just pure JSON.

Return your response in this EXACT JSON format (no other text):
{
  "questions": [
    {
      "id": ${startId},
      "passage": "Full reading passage text here...",
      "question": "What is the main purpose of this passage?",
      "options": [
        "To announce a new product launch",
        "To request customer feedback",
        "To explain company policies",
        "To advertise a job opening"
      ],
      "answer": "A"
    },
    {
      "id": ${startId + 1},
      "passage": "Same passage or new passage...",
      "question": "According to the passage, what should customers do?",
      "options": [
        "Contact customer service",
        "Visit the website",
        "Return the product",
        "Write a review"
      ],
      "answer": "B"
    }
  ]
}

Requirements:
- Questions are numbered sequentially starting from ${startId}
- Each question has a passage (can be shared across multiple questions from the same passage)
- All questions are authentic TOEIC-style
- Answers are one of: A, B, C, or D
- The JSON must be valid and complete
- You generate EXACTLY ${count} questions - no more, no less
- Escape all special characters in JSON strings (quotes, newlines, etc.)
- Do not include any text outside the JSON object

Generate exactly ${count} questions total.`;
  }

  private parseReadingGenerationResponse(response: string, expectedCount: number, startId: number = 1): Question[] {
    try {
      // Clean the response - remove markdown code blocks if present
      let cleanedResponse = response.trim();

      // Remove markdown code blocks (```json ... ``` or ``` ... ```)
      cleanedResponse = cleanedResponse.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');

      // Try to extract JSON from the response - handle both single object and array of objects
      let jsonMatch = cleanedResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        // Try to find JSON array
        jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
          throw new Error('No JSON found in LLM response');
        }
      }

      let jsonString = jsonMatch[0];
      let parsed: any;

      // First, try parsing as-is (since we're using JSON mode, it should be valid)
      try {
        parsed = JSON.parse(jsonString);
      } catch (parseError) {
        // If that fails, try minimal fixes only
        try {
          // Only fix trailing commas - don't touch string content
          jsonString = jsonString
            .replace(/,(\s*[}\]])/g, '$1'); // Remove trailing commas before } or ]

          parsed = JSON.parse(jsonString);
        } catch (secondError) {
          // Last resort: try to extract just the JSON object boundaries
          try {
            const startIdx = jsonString.indexOf('{');
            const endIdx = jsonString.lastIndexOf('}');
            if (startIdx >= 0 && endIdx > startIdx) {
              let extractedJson = jsonString.substring(startIdx, endIdx + 1);
              // Only fix trailing commas in extracted JSON
              extractedJson = extractedJson.replace(/,(\s*[}\]])/g, '$1');
              parsed = JSON.parse(extractedJson);
            } else {
              throw secondError;
            }
          } catch (finalError) {
            // Log detailed error information
            const errorPos = parseError instanceof SyntaxError ?
              (parseError as any).position || 'unknown' : 'unknown';
            const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown error';

            // Show context around the error position
            let context = '';
            if (typeof errorPos === 'number' && errorPos > 0) {
              const start = Math.max(0, errorPos - 100);
              const end = Math.min(jsonString.length, errorPos + 100);
              context = `\nContext around error (position ${errorPos}):\n${jsonString.substring(start, end)}`;
            }

            console.error('JSON parsing failed completely.');
            console.error('Error:', errorMessage);
            console.error('Position:', errorPos);
            console.error('Response length:', response.length);
            console.error('JSON string length:', jsonString.length);
            console.error('First 500 chars of response:', response.substring(0, 500));
            console.error('Last 500 chars of response:', response.substring(Math.max(0, response.length - 500)));
            console.error('First 500 chars of JSON:', jsonString.substring(0, 500));
            console.error('Last 500 chars of JSON:', jsonString.substring(Math.max(0, jsonString.length - 500)));
            if (context) console.error(context);

            throw new Error(`Failed to parse JSON: ${errorMessage}. Position: ${errorPos}${context}`);
          }
        }
      }

      // Handle both direct questions array and nested structure
      let questionsArray: any[] = [];
      if (Array.isArray(parsed)) {
        questionsArray = parsed;
      } else if (parsed.questions && Array.isArray(parsed.questions)) {
        questionsArray = parsed.questions;
      } else if (parsed.question && Array.isArray(parsed.question)) {
        questionsArray = parsed.question;
      } else {
        throw new Error('Invalid response format: missing questions array');
      }

      const questions: Question[] = questionsArray.map((q: any, index: number) => {
        // Validate required fields
        if (!q.passage || !q.question || !Array.isArray(q.options) || q.options.length !== 4) {
          throw new Error(`Invalid question format at index ${index}: missing required fields`);
        }

        if (!['A', 'B', 'C', 'D'].includes(q.answer)) {
          throw new Error(`Invalid answer format at question ${q.id || (startId + index)}: must be A, B, C, or D`);
        }

        return {
          id: q.id || (startId + index),
          type: 'reading' as const,
          question: q.question,
          passage: q.passage,
          options: q.options,
          answer: q.answer
        };
      });

      if (questions.length !== expectedCount) {
        console.warn(`Expected ${expectedCount} questions but got ${questions.length}`);
      }

      return questions;
    } catch (error) {
      console.error('Failed to parse reading generation response:', error);
      console.log('Raw response (first 1000 chars):', response.substring(0, 1000));
      throw new Error(`Failed to parse generated questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Singleton instance
export const llmOCRService = new LLMOCRService();
