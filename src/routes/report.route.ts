import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../utils/logger.js';
import { ReportGenerationService } from '../services/report-generation.service.js';
import { ConversationHistoryService } from '../services/conversation-history.service.js';
import { ToolExecutionTrackerService } from '../services/tool-execution-tracker.service.js';
import { SupabaseService } from '../services/supabase.service.js';

export async function reportRoutes(
  fastify: FastifyInstance,
  supabaseService: SupabaseService,
  conversationService: ConversationHistoryService,
  toolTracker: ToolExecutionTrackerService
) {
  const reportService = new ReportGenerationService(
    supabaseService.getClient(),
    conversationService,
    toolTracker
  );

  // Generate comprehensive report for a session
  fastify.get('/api/reports/:session_id', async (
    request: FastifyRequest<{
      Params: { session_id: string };
      Querystring: { type?: 'full' | 'summary' | 'tools_only' };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { session_id } = request.params;
      const reportType = request.query.type || 'full';

      // Get session to verify ownership (optional - add auth later)
      const { data: sessionData, error: sessionError } = await supabaseService.getClient()
        .from('conversation_sessions')
        .select('user_id')
        .eq('id', session_id)
        .single();

      if (sessionError || !sessionData) {
        return reply.status(404).send({
          error: 'Session not found',
          message: `Session ${session_id} does not exist`
        });
      }

      // Check if report already exists
      const existingReport = await reportService.getReport(session_id);
      if (existingReport && existingReport.report_type === reportType) {
        logger.info(`Returning existing ${reportType} report for session ${session_id}`);
        return reply.status(200).send({
          session_id,
          report_type: existingReport.report_type,
          generated_at: new Date().toISOString(),
          report: existingReport
        });
      }

      // Generate new report
      logger.info(`Generating ${reportType} report for session ${session_id}`);
      const report = await reportService.generateReport(
        session_id,
        sessionData.user_id,
        reportType
      );

      return reply.status(200).send({
        session_id,
        report_type: report.report_type,
        generated_at: new Date().toISOString(),
        report
      });
    } catch (error) {
      logger.error({ error }, 'Error generating report');
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to generate report'
      });
    }
  });

  // Get report markdown only (for easy display)
  fastify.get('/api/reports/:session_id/markdown', async (
    request: FastifyRequest<{
      Params: { session_id: string };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { session_id } = request.params;

      const report = await reportService.getReport(session_id);
      if (!report) {
        // Generate if doesn't exist
        const { data: sessionData } = await supabaseService.getClient()
          .from('conversation_sessions')
          .select('user_id')
          .eq('id', session_id)
          .single();

        if (!sessionData) {
          return reply.status(404).send({
            error: 'Session not found'
          });
        }

        const newReport = await reportService.generateReport(session_id, sessionData.user_id);
        return reply.status(200).send({
          markdown: newReport.report_markdown
        });
      }

      return reply.status(200).send({
        markdown: report.report_markdown
      });
    } catch (error) {
      logger.error({ error }, 'Error getting report markdown');
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to get report markdown'
      });
    }
  });

  // Get report JSON only
  fastify.get('/api/reports/:session_id/json', async (
    request: FastifyRequest<{
      Params: { session_id: string };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { session_id } = request.params;

      const report = await reportService.getReport(session_id);
      if (!report) {
        const { data: sessionData } = await supabaseService.getClient()
          .from('conversation_sessions')
          .select('user_id')
          .eq('id', session_id)
          .single();

        if (!sessionData) {
          return reply.status(404).send({
            error: 'Session not found'
          });
        }

        const newReport = await reportService.generateReport(session_id, sessionData.user_id);
        return reply.status(200).send(newReport.report_content);
      }

      return reply.status(200).send(report.report_content);
    } catch (error) {
      logger.error({ error }, 'Error getting report JSON');
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to get report JSON'
      });
    }
  });

  logger.info('Report routes registered');
}

