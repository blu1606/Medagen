import { DynamicTool } from '@langchain/core/tools';
import { CVService } from '../services/cv.service.js';
import { logger } from '../utils/logger.js';

export function createDermCVTool(cvService: CVService): DynamicTool {
  return new DynamicTool({
    name: 'derm_cv',
    description: 
      'Use this to analyze skin-related images (rash, spots, lesions, dermatological conditions). ' +
      'Input must be a public image URL string. Returns top predicted skin conditions with probabilities.',
    func: async (url: string) => {
      try {
        logger.info('Tool derm_cv called');
        const result = await cvService.callDermCV(url);
        return JSON.stringify(result);
      } catch (error) {
        logger.error('derm_cv tool error:', error);
        return JSON.stringify({ error: 'Failed to analyze dermatology image' });
      }
    }
  });
}

export function createEyeCVTool(cvService: CVService): DynamicTool {
  return new DynamicTool({
    name: 'eye_cv',
    description: 
      'Use this to analyze eye-related images (red eye, conjunctivitis, eye conditions). ' +
      'Input must be a public image URL string. Returns top predicted eye conditions with probabilities.',
    func: async (url: string) => {
      try {
        logger.info('Tool eye_cv called');
        const result = await cvService.callEyeCV(url);
        return JSON.stringify(result);
      } catch (error) {
        logger.error('eye_cv tool error:', error);
        return JSON.stringify({ error: 'Failed to analyze eye image' });
      }
    }
  });
}

export function createWoundCVTool(cvService: CVService): DynamicTool {
  return new DynamicTool({
    name: 'wound_cv',
    description: 
      'Use this to analyze wound-related images (cuts, burns, injuries, wounds). ' +
      'Input must be a public image URL string. Returns wound assessment with severity and type.',
    func: async (url: string) => {
      try {
        logger.info('Tool wound_cv called');
        const result = await cvService.callWoundCV(url);
        return JSON.stringify(result);
      } catch (error) {
        logger.error('wound_cv tool error:', error);
        return JSON.stringify({ error: 'Failed to analyze wound image' });
      }
    }
  });
}

