import { DynamicTool } from '@langchain/core/tools';
import { TriageRulesService } from '../services/triage-rules.service.js';
import { logger } from '../utils/logger.js';
import type { TriageInput } from '../types/index.js';

export function createTriageRulesTool(triageService: TriageRulesService): DynamicTool {
  return new DynamicTool({
    name: 'triage_rules',
    description: 
      'Use this to apply deterministic triage rules based on symptoms and CV results. ' +
      'Input must be a JSON string containing symptoms object (main_complaint, duration, pain_severity, fever, vision_changes, bleeding, etc.) ' +
      'and optionally cv_results. Returns triage level (emergency/urgent/routine/self-care), red flags, and reasoning.',
    func: async (inputJson: string) => {
      try {
        logger.info('Tool triage_rules called');
        
        const input: TriageInput = JSON.parse(inputJson);
        const result = triageService.evaluateSymptoms(input);
        
        return JSON.stringify(result);
      } catch (error) {
        logger.error('triage_rules tool error:', error);
        return JSON.stringify({ 
          error: 'Failed to evaluate triage rules',
          triage: 'urgent',
          red_flags: [],
          reasoning: 'Error in evaluation, defaulting to urgent for safety'
        });
      }
    }
  });
}

