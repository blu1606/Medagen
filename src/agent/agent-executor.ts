import { initializeAgentExecutorWithOptions } from 'langchain/agents';
import { GeminiLLM } from './gemini-llm.js';
import { SYSTEM_PROMPT } from './system-prompt.js';
import { createAllTools } from '../mcp_tools/index.js';
import { CVService } from '../services/cv.service.js';
import { TriageRulesService } from '../services/triage-rules.service.js';
import { RAGService } from '../services/rag.service.js';
import { SupabaseService } from '../services/supabase.service.js';
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';
import type { TriageResult } from '../types/index.js';

export class MedagenAgent {
  private executor: any;
  private llm: GeminiLLM;
  private cvService: CVService;
  private triageService: TriageRulesService;
  private ragService: RAGService;
  private initialized: boolean = false;

  constructor(supabaseService: SupabaseService) {
    this.llm = new GeminiLLM();
    this.cvService = new CVService();
    this.triageService = new TriageRulesService();
    this.ragService = new RAGService(supabaseService);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      logger.info('Initializing Medagen Agent...');

      // Initialize RAG service
      await this.ragService.initialize();

      // Create tools
      const tools = createAllTools(
        this.cvService,
        this.triageService,
        this.ragService
      );

      // Initialize agent executor
      this.executor = await initializeAgentExecutorWithOptions(tools, this.llm, {
        agentType: 'zero-shot-react-description',
        verbose: config.agent.verbose,
        maxIterations: config.agent.maxIterations,
        returnIntermediateSteps: true
      });

      this.initialized = true;
      logger.info('Medagen Agent initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize agent:', error);
      throw error;
    }
  }

  async processTriage(
    userText: string,
    imageUrl?: string,
    userId?: string
  ): Promise<TriageResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      logger.info('Starting triage process...');

      // Build context for agent
      let context = `${SYSTEM_PROMPT}\n\nUser Input: ${userText}`;
      
      if (imageUrl) {
        context += `\n\nUser has uploaded an image at URL: ${imageUrl}`;
        context += '\nYou should analyze this image using the appropriate CV tool (derm_cv, eye_cv, or wound_cv) based on the symptoms described.';
      }

      // Run agent
      const result = await this.executor.call({
        input: context
      });

      logger.info('Agent processing complete');
      logger.debug('Agent output:', result.output);

      // Parse the agent's final output
      const triageResult = this.parseAgentOutput(result.output);

      return triageResult;
    } catch (error) {
      logger.error('Error processing triage:', error);
      
      // Return safe default
      return this.getSafeDefaultResponse(userText);
    }
  }

  private parseAgentOutput(output: string): TriageResult {
    try {
      // Try to extract JSON from output
      const jsonMatch = output.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        // Validate required fields
        if (parsed.triage_level && parsed.symptom_summary && parsed.recommendation) {
          return {
            triage_level: parsed.triage_level,
            symptom_summary: parsed.symptom_summary,
            red_flags: parsed.red_flags || [],
            suspected_conditions: parsed.suspected_conditions || [],
            cv_findings: parsed.cv_findings || { model_used: 'none', raw_output: {} },
            recommendation: parsed.recommendation
          };
        }
      }

      logger.warn('Failed to parse agent output, using safe default');
      throw new Error('Invalid agent output format');
    } catch (error) {
      logger.error('Error parsing agent output:', error);
      throw error;
    }
  }

  private getSafeDefaultResponse(userText: string): TriageResult {
    return {
      triage_level: 'urgent',
      symptom_summary: `Triệu chứng: ${userText}`,
      red_flags: ['Không thể phân tích tự động, cần đánh giá trực tiếp'],
      suspected_conditions: [],
      cv_findings: {
        model_used: 'none',
        raw_output: {}
      },
      recommendation: {
        action: 'Vui lòng đến cơ sở y tế để được bác sĩ khám và đánh giá trực tiếp',
        timeframe: 'Trong vòng 24 giờ',
        home_care_advice: 'Theo dõi triệu chứng và đến ngay nếu tình trạng xấu đi',
        warning_signs: 'Nếu triệu chứng nặng hơn, đến cấp cứu ngay lập tức'
      }
    };
  }
}

