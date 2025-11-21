import axios from 'axios';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import type { CVResult } from '../types/index.js';

export class CVService {
  /**
   * Parse markdown response from CV API to extract predictions
   */
  private parseMarkdownResponse(markdown: string): CVResult {
    try {
      const lines = markdown.split('\n');
      const top_conditions: Array<{ name: string; prob: number }> = [];

      // Find "Top Predictions:" section
      const predictionStartIndex = lines.findIndex(line => line.includes('**Top Predictions:**'));
      
      if (predictionStartIndex === -1) {
        logger.warn('Could not find Top Predictions in response');
        return { top_conditions: [] };
      }

      // Parse predictions (format: **1.** Condition Name - **98.7%**)
      for (let i = predictionStartIndex + 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || !line.match(/^\*\*\d+\.\*\*/)) break;

        // Extract condition name and probability
        // Format: **1.** Acne and Rosacea Photos - **98.7%**
        const match = line.match(/\*\*\d+\.\*\*\s+(.+?)\s+-\s+\*\*(.+?)%\*\*/);
        if (match) {
          const name = match[1].trim();
          const prob = parseFloat(match[2]) / 100; // Convert percentage to decimal
          top_conditions.push({ name, prob });
        }
      }

      logger.info(`Parsed ${top_conditions.length} predictions from CV response`);
      return { top_conditions };
    } catch (error) {
      logger.error('Error parsing markdown response:', error);
      return { top_conditions: [] };
    }
  }

  /**
   * Call the unified CV API endpoint
   */
  private async callCVAPI(imageUrl: string, modelType: 'dermnet' | 'teeth' | 'nail', topK: number = 3): Promise<CVResult> {
    try {
      if (!config.cvModels.endpoint) {
        logger.warn('CV_ENDPOINT not configured');
        return { top_conditions: [] };
      }

      const endpoint = `${config.cvModels.endpoint.replace(/\/$/, '')}/run/predict_image`;
      
      logger.info(`Calling CV API: ${endpoint} with model: ${modelType}`);

      const response = await axios.post(
        endpoint,
        {
          data: [
            { path: imageUrl },
            modelType,
            topK
          ]
        },
        {
          headers: { 'Content-Type': 'application/json' },
          timeout: 30000
        }
      );

      logger.info('CV API response received');

      // Parse response
      if (response.data && Array.isArray(response.data.data) && response.data.data.length > 0) {
        const markdownResult = response.data.data[0];
        return this.parseMarkdownResponse(markdownResult);
      }

      logger.warn('CV API returned unexpected response format');
      return { top_conditions: [] };
    } catch (error) {
      logger.error('CV API error:', error);
      return { top_conditions: [] };
    }
  }

  async callDermCV(imageUrl: string): Promise<CVResult> {
    try {
      logger.info('Calling Dermatology CV model...');
      return await this.callCVAPI(imageUrl, 'dermnet', 3);
    } catch (error) {
      logger.error('Derm CV error:', error);
      return { top_conditions: [] };
    }
  }

  async callEyeCV(imageUrl: string): Promise<CVResult> {
    try {
      logger.info('Calling Eye CV model...');
      // Eye conditions are also analyzed by dermnet model
      return await this.callCVAPI(imageUrl, 'dermnet', 3);
    } catch (error) {
      logger.error('Eye CV error:', error);
      return { top_conditions: [] };
    }
  }

  async callWoundCV(imageUrl: string): Promise<CVResult> {
    try {
      logger.info('Calling Wound CV model...');
      // Wound conditions are also analyzed by dermnet model
      return await this.callCVAPI(imageUrl, 'dermnet', 3);
    } catch (error) {
      logger.error('Wound CV error:', error);
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

