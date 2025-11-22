import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';
import { ConversationHistoryService } from './conversation-history.service.js';
import { ToolExecutionTrackerService } from './tool-execution-tracker.service.js';
import { GeminiLLM } from '../agent/gemini-llm.js';
import { v4 as uuidv4 } from 'uuid';

export interface ComprehensiveReport {
  session_id: string;
  user_id: string;
  report_type: 'full' | 'summary' | 'tools_only';
  report_content: {
    session_info: {
      session_id: string;
      created_at: string;
      updated_at: string;
      message_count: number;
    };
    conversation_timeline: Array<{
      message_id: string;
      role: 'user' | 'assistant';
      content: string;
      image_url?: string;
      timestamp: string;
      triage_result?: any;
    }>;
    tool_executions: Array<{
      tool_name: string;
      tool_display_name: string;
      execution_order: number;
      input_data: any;
      output_data: any;
      execution_time_ms: number;
      status: string;
    }>;
    summary: {
      main_concerns: string[];
      top_conditions_suggested: Array<{
        name: string;
        source: string;
        confidence: string;
        occurrences: number;
      }>;
      triage_levels_identified: Array<{
        level: string;
        count: number;
      }>;
      hospitals_suggested: Array<{
        name: string;
        distance_km: number;
        address: string;
      }>;
      key_guidelines_retrieved: number;
    };
  };
  report_markdown: string;
}

export class ReportGenerationService {
  private supabaseClient: SupabaseClient;
  private conversationService: ConversationHistoryService;
  private toolTracker: ToolExecutionTrackerService;
  private llm: GeminiLLM;

  constructor(
    supabaseClient: SupabaseClient,
    conversationService: ConversationHistoryService,
    toolTracker: ToolExecutionTrackerService
  ) {
    this.supabaseClient = supabaseClient;
    this.conversationService = conversationService;
    this.toolTracker = toolTracker;
    this.llm = new GeminiLLM();
  }

  /**
   * Generate comprehensive report for a session
   */
  async generateReport(
    sessionId: string,
    userId: string,
    reportType: 'full' | 'summary' | 'tools_only' = 'full'
  ): Promise<ComprehensiveReport> {
    try {
      logger.info(`Generating ${reportType} report for session ${sessionId}`);

      // Get session info
      const { data: sessionData, error: sessionError } = await this.supabaseClient
        .from('conversation_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError || !sessionData) {
        throw new Error(`Session not found: ${sessionId}`);
      }

      // Get conversation history
      const conversationHistory = await this.conversationService.getHistory(sessionId, 1000);
      
      // Get all tool executions for this session
      const toolExecutions = await this.toolTracker.getToolExecutionsForSession(sessionId);

      // Build report content
      const reportContent = await this.buildReportContent(
        sessionData,
        conversationHistory,
        toolExecutions,
        reportType
      );

      // Generate markdown report using LLM
      const reportMarkdown = await this.generateMarkdownReport(reportContent, reportType);

      const report: ComprehensiveReport = {
        session_id: sessionId,
        user_id: userId,
        report_type: reportType,
        report_content: reportContent,
        report_markdown: reportMarkdown
      };

      // Save report to database
      await this.saveReport(report);

      logger.info(`Report generated successfully for session ${sessionId}`);
      return report;
    } catch (error) {
      logger.error({ error }, 'Error generating report');
      throw error;
    }
  }

  /**
   * Build structured report content
   */
  private async buildReportContent(
    sessionData: any,
    conversationHistory: any[],
    toolExecutions: any[],
    _reportType: string
  ): Promise<ComprehensiveReport['report_content']> {
    // Extract summary data
    const mainConcerns: string[] = [];
    const conditionsMap = new Map<string, { source: string; confidence: string; count: number }>();
    const triageLevelsMap = new Map<string, number>();
    const hospitals: Array<{ name: string; distance_km: number; address: string }> = [];
    let guidelinesCount = 0;

    // Process conversation history
    conversationHistory.forEach(msg => {
      if (msg.role === 'user') {
        mainConcerns.push(msg.content);
      }

      if (msg.triage_result) {
        const triageLevel = msg.triage_result.triage_level;
        triageLevelsMap.set(triageLevel, (triageLevelsMap.get(triageLevel) || 0) + 1);

        // Extract suspected conditions
        if (msg.triage_result.suspected_conditions) {
          msg.triage_result.suspected_conditions.forEach((cond: any) => {
            const key = cond.name;
            if (conditionsMap.has(key)) {
              conditionsMap.get(key)!.count++;
            } else {
              conditionsMap.set(key, {
                source: cond.source,
                confidence: cond.confidence,
                count: 1
              });
            }
          });
        }

        // Extract hospital info
        if (msg.triage_result.nearest_clinic) {
          hospitals.push({
            name: msg.triage_result.nearest_clinic.name,
            distance_km: msg.triage_result.nearest_clinic.distance_km,
            address: msg.triage_result.nearest_clinic.address
          });
        }
      }
    });

    // Process tool executions
    toolExecutions.forEach(exec => {
      if (exec.tool_name === 'rag_query' || exec.tool_name === 'guideline_retrieval') {
        if (exec.output_data?.guidelines) {
          guidelinesCount += exec.output_data.guidelines.length;
        }
      }
    });

    return {
      session_info: {
        session_id: sessionData.id,
        created_at: sessionData.created_at,
        updated_at: sessionData.updated_at,
        message_count: conversationHistory.length
      },
      conversation_timeline: conversationHistory.map(msg => ({
        message_id: msg.id,
        role: msg.role,
        content: msg.content,
        image_url: msg.image_url,
        timestamp: msg.created_at,
        triage_result: msg.triage_result
      })),
      tool_executions: toolExecutions.map(exec => ({
        tool_name: exec.tool_name,
        tool_display_name: exec.tool_display_name,
        execution_order: exec.execution_order,
        input_data: exec.input_data,
        output_data: exec.output_data,
        execution_time_ms: exec.execution_time_ms,
        status: exec.status
      })),
      summary: {
        main_concerns: mainConcerns,
        top_conditions_suggested: Array.from(conditionsMap.entries())
          .map(([name, data]) => ({
            name,
            source: data.source,
            confidence: data.confidence,
            occurrences: data.count
          }))
          .sort((a, b) => b.occurrences - a.occurrences),
        triage_levels_identified: Array.from(triageLevelsMap.entries())
          .map(([level, count]) => ({ level, count })),
        hospitals_suggested: hospitals,
        key_guidelines_retrieved: guidelinesCount
      }
    };
  }

  /**
   * Generate markdown report using LLM
   */
  private async generateMarkdownReport(
    reportContent: ComprehensiveReport['report_content'],
    reportType: string
  ): Promise<string> {
    const prompt = `Bạn là trợ lý y tế chuyên nghiệp. Hãy tạo một báo cáo tổng hợp đầy đủ về cuộc trò chuyện y tế dựa trên dữ liệu sau.

LOẠI BÁO CÁO: ${reportType === 'full' ? 'Báo cáo đầy đủ' : reportType === 'summary' ? 'Tóm tắt' : 'Chỉ công cụ'}

THÔNG TIN PHIÊN:
- Session ID: ${reportContent.session_info.session_id}
- Thời gian bắt đầu: ${reportContent.session_info.created_at}
- Thời gian cập nhật: ${reportContent.session_info.updated_at}
- Số lượng tin nhắn: ${reportContent.session_info.message_count}

LỊCH SỬ HỘI THOẠI:
${reportContent.conversation_timeline.map((msg, idx) => `
${idx + 1}. [${msg.role === 'user' ? 'Người dùng' : 'Hệ thống'}] (${msg.timestamp})
   ${msg.role === 'user' ? 'Câu hỏi/Triệu chứng:' : 'Phản hồi:'}
   ${msg.content}
   ${msg.image_url ? '📷 [Có hình ảnh đính kèm]' : ''}
   ${msg.triage_result ? `\n   Mức độ khẩn cấp: ${msg.triage_result.triage_level}` : ''}
`).join('\n')}

THỰC THI CÔNG CỤ (TOOL EXECUTIONS):
${reportContent.tool_executions.map((exec, idx) => `
${idx + 1}. ${exec.tool_display_name || exec.tool_name}
   - Thứ tự: ${exec.execution_order}
   - Trạng thái: ${exec.status}
   - Thời gian: ${exec.execution_time_ms}ms
   - Input: ${JSON.stringify(exec.input_data, null, 2)}
   - Output: ${JSON.stringify(exec.output_data, null, 2)}
`).join('\n')}

TÓM TẮT:
- Mối quan tâm chính: ${reportContent.summary.main_concerns.join(', ')}
- Các bệnh được đề xuất: ${reportContent.summary.top_conditions_suggested.map(c => `${c.name} (${c.confidence}, xuất hiện ${c.occurrences} lần)`).join(', ')}
- Mức độ khẩn cấp: ${reportContent.summary.triage_levels_identified.map(t => `${t.level} (${t.count} lần)`).join(', ')}
- Bệnh viện được đề xuất: ${reportContent.summary.hospitals_suggested.map(h => `${h.name} (${h.distance_km}km)`).join(', ') || 'Không có'}
- Số guideline đã truy xuất: ${reportContent.summary.key_guidelines_retrieved}

YÊU CẦU:
1. Tạo báo cáo markdown CHUYÊN NGHIỆP, DỄ ĐỌC, CẤU TRÚC RÕ RÀNG
2. Bao gồm TẤT CẢ thông tin quan trọng từ tools (CV top 3, RAG guidelines đầy đủ, triage reasoning)
3. Sử dụng tiếng Việt hoàn toàn
4. Format đẹp với markdown (tiêu đề, danh sách, bảng nếu cần)
5. Nhấn mạnh các thông tin quan trọng mà response message có thể đã bỏ qua
6. Bao gồm disclaimer y tế phù hợp

CẤU TRÚC BÁO CÁO:
# BÁO CÁO TỔNG HỢP - PHIÊN TƯ VẤN Y TẾ

## 1. THÔNG TIN PHIÊN
[Session info]

## 2. TÓM TẮT CUỘC HỘI THOẠI
[Summary of main concerns, conditions, triage levels]

## 3. CHI TIẾT HỘI THOẠI
[Full conversation timeline]

## 4. PHÂN TÍCH CÔNG CỤ (TOOLS ANALYSIS)
[Detailed tool execution results - CV top 3, RAG guidelines, etc.]

## 5. KẾT LUẬN VÀ KHUYẾN NGHỊ
[Final recommendations]

**Lưu ý:** Thông tin chỉ mang tính tham khảo, không thay thế bác sĩ.`;

    try {
      const generations = await this.llm._generate([prompt]);
      return generations.generations[0][0].text.trim();
    } catch (error) {
      logger.error({ error }, 'Error generating markdown report');
      // Fallback to simple markdown
      return this.generateFallbackMarkdown(reportContent);
    }
  }

  /**
   * Generate fallback markdown if LLM fails
   */
  private generateFallbackMarkdown(
    reportContent: ComprehensiveReport['report_content']
  ): string {
    return `# BÁO CÁO TỔNG HỢP - PHIÊN TƯ VẤN Y TẾ

## 1. THÔNG TIN PHIÊN
- **Session ID:** ${reportContent.session_info.session_id}
- **Thời gian bắt đầu:** ${reportContent.session_info.created_at}
- **Thời gian cập nhật:** ${reportContent.session_info.updated_at}
- **Số lượng tin nhắn:** ${reportContent.session_info.message_count}

## 2. TÓM TẮT CUỘC HỘI THOẠI

### Mối quan tâm chính:
${reportContent.summary.main_concerns.map(c => `- ${c}`).join('\n')}

### Các bệnh được đề xuất:
${reportContent.summary.top_conditions_suggested.map(c => 
  `- **${c.name}** (${c.confidence}, xuất hiện ${c.occurrences} lần, nguồn: ${c.source})`
).join('\n')}

### Mức độ khẩn cấp:
${reportContent.summary.triage_levels_identified.map(t => 
  `- **${t.level}**: ${t.count} lần`
).join('\n')}

### Bệnh viện được đề xuất:
${reportContent.summary.hospitals_suggested.length > 0
  ? reportContent.summary.hospitals_suggested.map(h => 
      `- **${h.name}** (${h.distance_km}km) - ${h.address}`
    ).join('\n')
  : '- Không có bệnh viện nào được đề xuất'
}

### Số guideline đã truy xuất:
- ${reportContent.summary.key_guidelines_retrieved} guideline snippets

## 3. CHI TIẾT HỘI THOẠI

${reportContent.conversation_timeline.map((msg, idx) => `
### Tin nhắn ${idx + 1} - ${msg.role === 'user' ? 'Người dùng' : 'Hệ thống'}

**Thời gian:** ${msg.timestamp}

**Nội dung:**
${msg.content}

${msg.image_url ? '📷 *Có hình ảnh đính kèm*' : ''}

${msg.triage_result ? `
**Kết quả phân tích:**
- Mức độ khẩn cấp: ${msg.triage_result.triage_level}
- Tóm tắt triệu chứng: ${msg.triage_result.symptom_summary}
${msg.triage_result.suspected_conditions?.length > 0 ? `
- Bệnh nghi ngờ:
${msg.triage_result.suspected_conditions.map((c: any) => `  - ${c.name} (${c.confidence}, nguồn: ${c.source})`).join('\n')}
` : ''}
` : ''}
`).join('\n')}

## 4. PHÂN TÍCH CÔNG CỤ (TOOLS ANALYSIS)

${reportContent.tool_executions.map((exec, idx) => `
### ${idx + 1}. ${exec.tool_display_name || exec.tool_name}

**Thứ tự thực thi:** ${exec.execution_order}
**Trạng thái:** ${exec.status}
**Thời gian:** ${exec.execution_time_ms}ms

**Input:**
\`\`\`json
${JSON.stringify(exec.input_data, null, 2)}
\`\`\`

**Output:**
\`\`\`json
${JSON.stringify(exec.output_data, null, 2)}
\`\`\`
`).join('\n')}

## 5. KẾT LUẬN VÀ KHUYẾN NGHỊ

Dựa trên phân tích toàn bộ cuộc hội thoại và kết quả từ các công cụ, đây là báo cáo tổng hợp đầy đủ về phiên tư vấn y tế.

**Lưu ý quan trọng:** Thông tin trong báo cáo này chỉ mang tính tham khảo giáo dục, không thay thế việc khám và chẩn đoán của bác sĩ. Nếu bạn có triệu chứng nghiêm trọng, hãy đến cơ sở y tế ngay lập tức.`;
  }

  /**
   * Save report to database
   */
  private async saveReport(report: ComprehensiveReport): Promise<void> {
    try {
      const { error } = await this.supabaseClient
        .from('comprehensive_reports')
        .insert({
          id: uuidv4(),
          session_id: report.session_id,
          user_id: report.user_id,
          report_type: report.report_type,
          report_content: report.report_content,
          report_markdown: report.report_markdown,
          generated_at: new Date().toISOString(),
          created_at: new Date().toISOString()
        });

      if (error) {
        logger.error({ error }, 'Failed to save report');
        throw error;
      }
    } catch (error) {
      logger.error({ error }, 'Error saving report');
      throw error;
    }
  }

  /**
   * Get existing report for a session
   */
  async getReport(sessionId: string): Promise<ComprehensiveReport | null> {
    try {
      const { data, error } = await this.supabaseClient
        .from('comprehensive_reports')
        .select('*')
        .eq('session_id', sessionId)
        .order('generated_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        session_id: data.session_id,
        user_id: data.user_id,
        report_type: data.report_type,
        report_content: data.report_content,
        report_markdown: data.report_markdown
      };
    } catch (error) {
      logger.error({ error }, 'Error getting report');
      return null;
    }
  }
}

