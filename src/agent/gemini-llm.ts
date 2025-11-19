import { LLM } from '@langchain/core/language_models/llms';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import type { CallbackManagerForLLMRun } from '@langchain/core/callbacks/manager';
import type { LLMResult } from '@langchain/core/outputs';

export class GeminiLLM extends LLM {
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

  async _generate(
    prompts: string[],
    options?: this['ParsedCallOptions'],
    runManager?: CallbackManagerForLLMRun
  ): Promise<LLMResult> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.modelName });
      
      logger.info(`Calling Gemini ${this.modelName}...`);
      
      const generations = await Promise.all(
        prompts.map(async (prompt) => {
          const result = await model.generateContent(prompt);
          const response = await result.response;
          const text = response.text();
          
          return {
            text,
            generationInfo: {}
          };
        })
      );
      
      logger.info('Gemini response received');
      
      return {
        generations: [generations]
      };
    } catch (error) {
      logger.error('Error calling Gemini API:', error);
      throw new Error(`Gemini API error: ${error}`);
    }
  }
}

