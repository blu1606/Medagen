import axios from 'axios';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import type { CVResult } from '../types/index.js';

export class CVService {
  async callDermCV(imageUrl: string): Promise<CVResult> {
    try {
      logger.info('Calling Dermatology CV model (DermNet API)...');

      if (!config.cvModels.dermCV) {
        logger.warn('Derm CV API URL not configured');
        return { top_conditions: [] };
      }

      // 1. Download image từ URL (Supabase Storage, S3, ...)
      const imgResponse = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 15000,
      });

      const form = new FormData();
      form.append('image', Buffer.from(imgResponse.data), 'image.jpg');

      // 2. Gửi file sang Python API /predict
      const response = await axios.post(
        `${config.cvModels.dermCV}/predict`,
        form,
        {
          headers: form.getHeaders(),
          timeout: 20000,
        }
      );

      const data = response.data;

      // 3. Nếu success → map predictions → CVResult
      if (data.status === 'success' && Array.isArray(data.predictions)) {
        const top_conditions = data.predictions.map((p: any) => ({
          name: p.class,
          prob:
            typeof p.confidence === 'number'
              ? p.confidence
              : (p.confidence_percent ?? 0) / 100,
        }));

        return { top_conditions };
      }

      // 4. Out-of-domain hoặc status khác → không trả condition nào
      logger.warn(
        `DermNet returned non-success status: ${data.status || 'unknown'}`
      );
      return { top_conditions: [] };
    } catch (error) {
      logger.error('Derm CV API error:', error);
      return { top_conditions: [] };
    }
  }

  async callEyeCV(imageUrl: string): Promise<CVResult> {
    try {
      logger.info('Calling Eye CV model...');
      
      if (!config.cvModels.eyeCV) {
        logger.warn('Eye CV API URL not configured');
        return { top_conditions: [] };
      }

      const response = await axios.post(
        config.cvModels.eyeCV,
        { image_url: imageUrl },
        { timeout: 30000 }
      );

      logger.info('Eye CV response received');
      return response.data;
    } catch (error) {
      logger.error('Eye CV API error:', error);
      return { top_conditions: [] };
    }
  }

  async callWoundCV(imageUrl: string): Promise<CVResult> {
    try {
      logger.info('Calling Wound CV model...');
      
      if (!config.cvModels.woundCV) {
        logger.warn('Wound CV API URL not configured');
        return { top_conditions: [] };
      }

      const response = await axios.post(
        config.cvModels.woundCV,
        { image_url: imageUrl },
        { timeout: 30000 }
      );

      logger.info('Wound CV response received');
      return response.data;
    } catch (error) {
      logger.error('Wound CV API error:', error);
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

