import { GeminiLLM } from './gemini-llm.js';
import { CVService } from '../services/cv.service.js';
import { TriageRulesService } from '../services/triage-rules.service.js';
import { RAGService } from '../services/rag.service.js';
import { KnowledgeBaseService } from '../services/knowledge-base.service.js';
import { SupabaseService } from '../services/supabase.service.js';
import { logger } from '../utils/logger.js';
import type { TriageResult } from '../types/index.js';

export class MedagenAgent {
  private llm: GeminiLLM;
  private cvService: CVService;
  private triageService: TriageRulesService;
  private ragService: RAGService;
  private knowledgeBase: KnowledgeBaseService;
  private initialized: boolean = false;

  constructor(supabaseService: SupabaseService) {
    this.llm = new GeminiLLM();
    this.cvService = new CVService();
    this.triageService = new TriageRulesService();
    this.ragService = new RAGService(supabaseService);
    this.knowledgeBase = new KnowledgeBaseService(supabaseService);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      logger.info('Initializing Medagen Agent...');

      // Initialize RAG service
      await this.ragService.initialize();

      this.initialized = true;
      logger.info('Medagen Agent initialized successfully');
    } catch (error) {
      logger.error({ error }, 'Failed to initialize agent');
      throw error;
    }
  }

  async processTriage(
    userText: string,
    imageUrl?: string,
    _userId?: string,
    conversationContext?: string
  ): Promise<TriageResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      logger.info('Starting query processing...');
      logger.info(`User text: "${userText}"`);
      logger.info(`Has image: ${!!imageUrl}`);

      // Agent tự quyết định workflow dựa trên input
      // - Có image: luôn gọi CV + RAG + Triage Rules
      // - Không có image: Phân tích user text để quyết định gọi tools nào
      
      if (imageUrl) {
        // Có hình ảnh: luôn xử lý như triage với CV
        return await this.processTriageWithImage(userText, imageUrl, conversationContext);
      } else {
        // Không có hình ảnh: Agent tự quyết định dựa trên user text
        // Sử dụng LLM để phân tích và quyết định workflow
        return await this.processTriageTextOnly(userText, conversationContext);
      }
    } catch (error) {
      logger.error({ error }, 'Error processing query');
      
      // Return safe default
      return this.getSafeDefaultResponse(userText);
    }
  }

  /**
   * Handle out-of-scope queries (AI-Agent.md Section 2)
   */
  private handleOutOfScope(userText: string): TriageResult {
    return {
      triage_level: 'routine',
      symptom_summary: `Câu hỏi: "${userText}"`,
      red_flags: [],
      suspected_conditions: [],
      cv_findings: {
        model_used: 'none',
        raw_output: {}
      },
      recommendation: {
        action: 'Xin lỗi, câu hỏi này nằm ngoài phạm vi hỗ trợ của hệ thống. Chúng tôi chỉ cung cấp thông tin về các bệnh và triệu chứng dựa trên hướng dẫn của Bộ Y Tế.',
        timeframe: 'Không áp dụng',
        home_care_advice: 'Để biết thông tin về bảo hiểm y tế, chi phí, thủ tục hành chính, hoặc các phương pháp điều trị ngoài hướng dẫn BYT, vui lòng liên hệ trực tiếp với cơ sở y tế hoặc cơ quan chức năng.',
        warning_signs: 'Hệ thống không hỗ trợ nội dung này'
      }
    };
  }

  /**
   * Handle queries that need clarification (AI-Agent.md Section 5.1)
   */
  private handleNeedsClarification(userText: string, clarificationQuestion: string): TriageResult {
    return {
      triage_level: 'routine',
      symptom_summary: `Câu hỏi chưa rõ: "${userText}"`,
      red_flags: [],
      suspected_conditions: [],
      cv_findings: {
        model_used: 'none',
        raw_output: {}
      },
      recommendation: {
        action: clarificationQuestion,
        timeframe: 'Vui lòng cung cấp thêm thông tin',
        home_care_advice: 'Để tôi có thể hỗ trợ tốt hơn, hãy cho tôi biết cụ thể hơn về triệu chứng hoặc bệnh bạn quan tâm.',
        warning_signs: 'Nếu có triệu chứng nghiêm trọng, hãy đến cơ sở y tế ngay'
      }
    };
  }

  /**
   * Process educational query about disease
   * Agent tự quyết định khi nào cần gọi knowledge base vs RAG
   */
  private async processDiseaseInfoQuery(
    userText: string,
    conversationContext?: string
  ): Promise<TriageResult> {
    try {
      logger.info('='.repeat(80));
      logger.info('[AGENT WORKFLOW] processDiseaseInfoQuery STARTED');
      logger.info(`[AGENT] User text: "${userText}"`);

      // Agent tự quyết định: thử knowledge base trước, nếu không có thì dùng RAG
      let guidelines: any[] = [];

      // Step 1: Thử tìm disease name từ user text và query knowledge base
      logger.info('[AGENT] Step 1: Attempting structured knowledge search...');
      try {
        // Extract potential disease name from query (simple heuristic)
        const diseaseKeywords = userText.match(/(?:bệnh|về)\s+([^?.,!]+)/i);
        if (diseaseKeywords && diseaseKeywords[1]) {
          const potentialDisease = diseaseKeywords[1].trim();
          logger.info(`[AGENT] Potential disease name: ${potentialDisease}`);
          
          const disease = await this.knowledgeBase.findDisease(potentialDisease);
          if (disease) {
            logger.info(`[AGENT] Found disease: ${disease.name} (ID: ${disease.id})`);
            const structuredResults = await this.knowledgeBase.queryStructuredKnowledge({
              disease: disease.name,
              query: userText
            });
            if (structuredResults.length > 0) {
              guidelines = structuredResults;
              logger.info(`[AGENT] Retrieved ${guidelines.length} structured knowledge chunks from CSDL`);
            }
          }
        }
      } catch (error) {
        logger.warn({ error }, '[AGENT] Knowledge base search failed, will use RAG');
      }

      // Step 2: Fallback to RAG if no structured results
      if (guidelines.length === 0) {
        logger.info('[AGENT] Step 2: Using RAG for semantic search...');
        const guidelineQuery = {
          symptoms: userText,
          suspected_conditions: [],
          triage_level: 'routine'
        };

        logger.info(`[AGENT] Calling MCP RAG - searchGuidelines...`);
        guidelines = await this.ragService.searchGuidelines(guidelineQuery);
        logger.info(`[AGENT] Retrieved ${guidelines.length} guideline snippets from RAG`);
      }
      
      logger.info(`[AGENT] Total guidelines collected: ${guidelines.length}`);

      // Use LLM to synthesize educational response
      const prompt = `Bạn là trợ lý y tế giáo dục, dựa trên hướng dẫn của Bộ Y Tế.

User hỏi: ${userText}

${conversationContext ? `Context trước đó: ${conversationContext}` : ''}

Thông tin từ hướng dẫn BYT:
${guidelines.map((g, i) => `${i + 1}. ${g.content || g.snippet || g}`).join('\n')}

QUAN TRỌNG:
- Đây là câu hỏi giáo dục, KHÔNG PHẢI chẩn đoán cá nhân
- Trả lời dựa trên hướng dẫn BYT
- Giải thích rõ ràng, dễ hiểu
- Luôn nhấn mạnh: "Thông tin chỉ mang tính tham khảo, không thay thế bác sĩ"
- KHÔNG kê đơn, KHÔNG khuyến nghị liều thuốc cụ thể

Tạo response JSON (ONLY JSON, no markdown):
{
  "triage_level": "routine",
  "symptom_summary": "Tóm tắt câu hỏi của user",
  "red_flags": [],
  "suspected_conditions": [],
  "cv_findings": {"model_used": "none", "raw_output": {}},
  "recommendation": {
    "action": "Giải thích thông tin về bệnh/triệu chứng dựa trên BYT guideline",
    "timeframe": "Không áp dụng (vì đây là thông tin giáo dục)",
    "home_care_advice": "Thông tin hữu ích từ guideline",
    "warning_signs": "Luôn nhấn mạnh: Thông tin chỉ mang tính tham khảo. Nếu có triệu chứng, hãy đến bác sĩ để được khám và chẩn đoán chính xác."
  }
}`;

      const generations = await this.llm._generate([prompt]);
      const response = generations.generations[0][0].text;

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return parsed as TriageResult;
      }

      throw new Error('Failed to parse LLM response');
    } catch (error) {
      logger.error({ error }, 'Error processing disease info query');
      return this.getSafeDefaultResponse(userText);
    }
  }

  /**
   * Process general health query
   */
  private async processGeneralHealthQuery(
    userText: string,
    conversationContext?: string
  ): Promise<TriageResult> {
      // Use RAG to find relevant information
      logger.info('='.repeat(80));
      logger.info('[AGENT WORKFLOW] processGeneralHealthQuery STARTED');
      logger.info(`[AGENT] User text: "${userText}"`);
      
      const guidelineQuery = {
        symptoms: userText,
        suspected_conditions: [],
        triage_level: 'routine'
      };

      logger.info(`[AGENT] Calling MCP RAG - searchGuidelines...`);
      const guidelines = await this.ragService.searchGuidelines(guidelineQuery);
      logger.info(`[AGENT] Retrieved ${guidelines.length} guidelines from RAG`);

    const prompt = `Bạn là trợ lý y tế. User hỏi: ${userText}

${conversationContext ? `Context: ${conversationContext}` : ''}

Thông tin từ hướng dẫn:
${guidelines.map((g, i) => `${i + 1}. ${g}`).join('\n')}

Trả lời một cách hữu ích, giáo dục, an toàn. Nhấn mạnh không thay thế bác sĩ.

JSON response (ONLY JSON):
{
  "triage_level": "routine",
  "symptom_summary": "Câu hỏi về sức khỏe tổng quát",
  "red_flags": [],
  "suspected_conditions": [],
  "cv_findings": {"model_used": "none", "raw_output": {}},
  "recommendation": {
    "action": "Thông tin giáo dục phù hợp",
    "timeframe": "Không áp dụng",
    "home_care_advice": "Lời khuyên chung về sức khỏe",
    "warning_signs": "Nếu có triệu chứng bất thường, hãy gặp bác sĩ"
  }
}`;

    const generations = await this.llm._generate([prompt]);
    const response = generations.generations[0][0].text;

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as TriageResult;
    }

    return this.getSafeDefaultResponse(userText);
  }

  /**
   * Custom agent workflow when image is provided
   * This ensures CV tools are actually called, not hallucinated by LLM
   */
  private async processTriageWithImage(
    userText: string,
    imageUrl: string,
    conversationContext?: string
  ): Promise<TriageResult> {
    try {
      logger.info('Processing triage with image using custom workflow...');

      // Step 1: Call CV model directly based on user text
      logger.info('Step 1: Analyzing image with CV model...');
      const cvType = this.determineCVType(userText);
      const cvResult = await this.callCVModel(imageUrl, cvType);
      
      logger.info(`CV analysis complete. Top condition: ${cvResult.top_conditions[0]?.name || 'none'}`);

      // Step 2: Call triage rules with CV results
      logger.info('Step 2: Applying triage rules...');
      const triageInput = {
        symptoms: {
          main_complaint: userText || 'Triệu chứng dựa trên hình ảnh',
          context: conversationContext
        },
        cv_results: {
          model_used: cvType === 'derm' ? 'derm_cv' : cvType === 'eye' ? 'eye_cv' : 'wound_cv',
          raw_output: {
            top_predictions: cvResult.top_conditions.map(c => ({
              condition: c.name,
              probability: c.prob
            }))
          }
        }
      };

      const triageResult = this.triageService.evaluateSymptoms(triageInput);
      logger.info(`Triage level: ${triageResult.triage}`);

      // Step 3: Get guidelines from RAG
      logger.info('[AGENT] Step 3: Retrieving medical guidelines from RAG...');
      const suspectedConditions = cvResult.top_conditions.slice(0, 2).map(c => c.name);
      const guidelineInput = {
        symptoms: userText,
        suspected_conditions: suspectedConditions,
        triage_level: triageResult.triage
      };

      logger.info(`[AGENT] Calling MCP RAG - searchGuidelines...`);
      const guidelines = await this.ragService.searchGuidelines(guidelineInput);
      logger.info(`[AGENT] Retrieved ${guidelines.length} guideline snippets from RAG`);

      // Step 4: Use LLM to synthesize final response
      logger.info('Step 4: Synthesizing final response with LLM...');
      const finalResult = await this.synthesizeFinalResponse(
        userText,
        cvResult,
        triageResult,
        guidelines,
        conversationContext
      );

      return finalResult;
    } catch (error) {
      logger.error({ error }, 'Error in custom agent workflow');
      throw error;
    }
  }

  /**
   * Process text-only triage
   * Agent tự quyết định: nếu là câu hỏi giáo dục về bệnh thì dùng knowledge base/RAG
   * Nếu là triệu chứng cá nhân thì dùng triage rules + RAG
   */
  private async processTriageTextOnly(
    userText: string,
    conversationContext?: string
  ): Promise<TriageResult> {
    try {
      logger.info('Processing text-only query...');

      // Phân tích user text để quyết định workflow
      // Nếu có từ khóa "là gì", "như thế nào", "về" → câu hỏi giáo dục
      const lowerText = userText.toLowerCase();
      const isEducationalQuery = 
        lowerText.includes('là gì') || 
        lowerText.includes('như thế nào') || 
        lowerText.includes('về') ||
        lowerText.includes('giải thích') ||
        lowerText.includes('cho tôi biết');

      if (isEducationalQuery) {
        // Câu hỏi giáo dục: thử knowledge base trước, sau đó RAG
        logger.info('[AGENT] Detected educational query, using knowledge base/RAG workflow');
        return await this.processDiseaseInfoQuery(userText, conversationContext);
      }

      // Triệu chứng cá nhân: dùng triage workflow
      logger.info('[AGENT] Detected symptom query, using triage workflow');
      
      // Step 1: Apply triage rules
      const triageInput = {
        symptoms: {
          main_complaint: userText,
          context: conversationContext
        }
      };

      const triageResult = this.triageService.evaluateSymptoms(triageInput);
      
      // Step 2: Get guidelines from RAG
      const guidelineInput = {
        symptoms: userText,
        suspected_conditions: [],
        triage_level: triageResult.triage
      };

      const guidelines = await this.ragService.searchGuidelines(guidelineInput);

      // Step 3: Synthesize response
      return await this.synthesizeFinalResponse(
        userText,
        { top_conditions: [] },
        triageResult,
        guidelines,
        conversationContext
      );
    } catch (error) {
      logger.error({ error }, 'Error in text-only triage');
      throw error;
    }
  }

  /**
   * Determine which CV model to use based on user text
   */
  private determineCVType(userText: string): 'derm' | 'eye' | 'wound' {
    const lowerText = userText.toLowerCase();
    
    // Check for eye-related keywords
    if (lowerText.includes('mắt') || lowerText.includes('eye') || 
        lowerText.includes('nhìn') || lowerText.includes('đỏ mắt')) {
      return 'eye';
    }
    
    // Check for wound-related keywords
    if (lowerText.includes('vết thương') || lowerText.includes('wound') || 
        lowerText.includes('bỏng') || lowerText.includes('burn') ||
        lowerText.includes('chảy máu') || lowerText.includes('cắt')) {
      return 'wound';
    }
    
    // Default to dermatology
    return 'derm';
  }

  /**
   * Call appropriate CV model
   */
  private async callCVModel(imageUrl: string, type: 'derm' | 'eye' | 'wound') {
    switch (type) {
      case 'derm':
        return await this.cvService.callDermCV(imageUrl);
      case 'eye':
        return await this.cvService.callEyeCV(imageUrl);
      case 'wound':
        return await this.cvService.callWoundCV(imageUrl);
    }
  }

  /**
   * Use LLM to synthesize final structured response
   */
  private async synthesizeFinalResponse(
    userText: string,
    cvResult: any,
    triageResult: any,
    guidelines: any[],
    conversationContext?: string
  ): Promise<TriageResult> {
    const prompt = `Bạn là trợ lý y tế AI. Dựa trên thông tin sau, hãy tạo một phản hồi có cấu trúc:

User input: ${userText}

${conversationContext ? `Conversation context: ${conversationContext}` : ''}

${cvResult.top_conditions.length > 0 ? `
CV Analysis Results:
${cvResult.top_conditions.map((c: any, i: number) => `${i + 1}. ${c.name}: ${(c.prob * 100).toFixed(1)}%`).join('\n')}
` : ''}

Triage Level: ${triageResult.triage}
Red Flags: ${triageResult.red_flags?.join(', ') || 'Không có'}
Reasoning: ${triageResult.reasoning}

Medical Guidelines:
${guidelines.map((g, i) => `${i + 1}. ${g.content || g.snippet || g}`).join('\n')}

Hãy tạo response JSON với format sau (ONLY JSON, no markdown):
{
  "triage_level": "${triageResult.triage}",
  "symptom_summary": "Tóm tắt triệu chứng của người dùng bằng tiếng Việt",
  "red_flags": ${JSON.stringify(triageResult.red_flags || [])},
  "suspected_conditions": [
    ${cvResult.top_conditions.length > 0 ? cvResult.top_conditions.slice(0, 3).map((c: any) => 
      `{"name": "${c.name}", "source": "cv_model", "confidence": "${c.prob > 0.8 ? 'high' : c.prob > 0.5 ? 'medium' : 'low'}"}`
    ).join(',\n    ') : ''}
  ],
  "cv_findings": {
    "model_used": "${cvResult.top_conditions.length > 0 ? 'derm_cv' : 'none'}",
    "raw_output": ${JSON.stringify(cvResult.top_conditions.length > 0 ? {
      top_predictions: cvResult.top_conditions.map((c: any) => ({ condition: c.name, probability: c.prob }))
    } : {})}
  },
  "recommendation": {
    "action": "Hành động cụ thể người dùng nên làm tiếp theo",
    "timeframe": "Khung thời gian",
    "home_care_advice": "Lời khuyên chăm sóc tại nhà dựa trên guidelines",
    "warning_signs": "Dấu hiệu cảnh báo cần đi khám ngay"
  }
}`;

    const generations = await this.llm._generate([prompt]);
    const response = generations.generations[0][0].text;

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return parsed as TriageResult;
    }

    throw new Error('Failed to parse LLM response');
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

