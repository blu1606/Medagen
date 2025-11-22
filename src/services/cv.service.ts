import axios from 'axios';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import type { CVResult } from '../types/index.js';

export class CVService {
  /**
   * Call the unified CV API endpoint using Gradio Client API
   * Updated to use /handle_prediction endpoint which returns JSON
   */
  private async callCVAPI(imageUrl: string, modelType: 'dermnet' | 'teeth' | 'nail', topK: number = 3): Promise<CVResult> {
    try {
      logger.info('='.repeat(80));
      logger.info('[MCP CV] INPUT:');
      logger.info(`  Image URL: ${imageUrl}`);
      logger.info(`  Model: ${modelType}`);
      logger.info(`  Top K: ${topK}`);

      if (!config.cvModels.endpoint) {
        logger.warn('[MCP CV] CV_ENDPOINT not configured');
        logger.info('='.repeat(80));
        return { top_conditions: [] };
      }

      // Use Gradio API format: /run/handle_prediction (synchronous)
      const endpoint = `${config.cvModels.endpoint.replace(/\/$/, '')}/run/handle_prediction`;
      
      logger.info(`[MCP CV] Calling CV API: ${endpoint}`);

      // Call synchronous API
      const response = await axios.post(
        endpoint,
        {
          data: [
            imageUrl,      // image_url (string)
            modelType,     // select_ai_model
            topK           // number_of_predictions
          ]
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000 // 30 seconds for CV processing
        }
      );

      logger.info('[MCP CV] Response received');

      // Parse response
      if (response.data && response.data.data && response.data.data.length > 0) {
        const jsonResultString = response.data.data[0];
        
        // Parse JSON response
        const jsonResult = typeof jsonResultString === 'string' 
          ? JSON.parse(jsonResultString) 
          : jsonResultString;

        logger.info('[MCP CV] OUTPUT:');
        logger.info(`  Success: ${jsonResult.success}`);
        logger.info(`  Model: ${jsonResult.model || 'N/A'}`);
        
        if (jsonResult.success && jsonResult.predictions) {
          const top_conditions = jsonResult.predictions.map((pred: any) => ({
            name: pred.class,
            prob: pred.confidence
          }));

          logger.info(`  Predictions: ${top_conditions.length}`);
          top_conditions.forEach((cond: any, idx: number) => {
            logger.info(`    ${idx + 1}. ${cond.name}: ${(cond.prob * 100).toFixed(1)}%`);
          });
          logger.info('='.repeat(80));

          return { top_conditions };
        } else {
          logger.error(`[MCP CV] ERROR: ${jsonResult.error || 'Unknown error'}`);
          logger.info('='.repeat(80));
          return { top_conditions: [] };
        }
      }

      logger.error('[MCP CV] Unexpected response format');
      logger.info('='.repeat(80));
      return { top_conditions: [] };

    } catch (error: any) {
      logger.error('[MCP CV] ERROR:');
      logger.error(`  Message: ${error.message}`);
      if (error.response) {
        logger.error(`  Status: ${error.response.status}`);
        logger.error(`  Data: ${JSON.stringify(error.response.data)}`);
      }
      logger.info('='.repeat(80));
      return { top_conditions: [] };
    }
  }

  async callDermCV(imageUrl: string): Promise<CVResult> {
    try {
      logger.info('[MCP CV] Calling Dermatology CV model...');
      return await this.callCVAPI(imageUrl, 'dermnet', 3);
    } catch (error) {
      logger.error({ error }, '[MCP CV] Derm CV error');
      return { top_conditions: [] };
    }
  }

  async callEyeCV(imageUrl: string): Promise<CVResult> {
    try {
      logger.info('[MCP CV] Calling Eye CV model...');
      // Eye conditions are also analyzed by dermnet model
      return await this.callCVAPI(imageUrl, 'dermnet', 3);
    } catch (error) {
      logger.error({ error }, '[MCP CV] Eye CV error');
      return { top_conditions: [] };
    }
  }

  async callWoundCV(imageUrl: string): Promise<CVResult> {
    try {
      logger.info('[MCP CV] Calling Wound CV model...');
      // Wound conditions are also analyzed by dermnet model
      return await this.callCVAPI(imageUrl, 'dermnet', 3);
    } catch (error) {
      logger.error({ error }, '[MCP CV] Wound CV error');
      return { top_conditions: [] };
    }
  }

  async analyzeImage(imageUrl: string, type?: 'derm' | 'eye' | 'wound'): Promise<CVResult> {
    // If type is specified, call that specific model
    if (type === 'derm') return this.callDermCV(imageUrl);
    if (type === 'eye') return this.callEyeCV(imageUrl);
    if (type === 'wound') return this.callWoundCV(imageUrl);

    // Otherwise, return empty result (agent will decide which model to use)
    return { top_conditions: [] };
  }
}

