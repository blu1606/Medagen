import { BaseLLM } from '@langchain/core/language_models/llms';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import type { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';

export class GeminiLLM extends BaseLLM {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor() {
    super({});
    this.genAI = new GoogleGenerativeAI(config.gemini.apiKey);
    this.modelName = config.gemini.model;
  }

  _llmType(): string {
    return 'gemini';
  }

  async _call(
    prompt: string,
    options?: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun
  ): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      
      logger.info(`Calling Gemini ${this.modelName}...`);
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      logger.info('Gemini response received');
      
      return text;
    } catch (error) {
      logger.error('Error calling Gemini API:', error);
      throw new Error(`Gemini API error: ${error}`);
    }
  }
}

