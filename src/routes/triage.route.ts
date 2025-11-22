import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { MedagenAgent } from '../agent/agent-executor.js';
import { SupabaseService } from '../services/supabase.service.js';
import { MapsService } from '../services/maps.service.js';
import { ConversationHistoryService } from '../services/conversation-history.service.js';
import { ToolExecutionTrackerService } from '../services/tool-execution-tracker.service.js';
import { ToolTrackingHelper } from '../utils/tool-tracking-helper.js';
import { logger } from '../utils/logger.js';
import type { HealthCheckRequest, HealthCheckResponse } from '../types/index.js';

// Validation schema - text OR image_url must be provided
const healthCheckSchema = z.object({
  text: z.string().optional(),
  image_url: z.string()
    .optional()
    .refine((val) => {
      // If provided, must be empty string or valid URL
      if (!val || val.trim() === '') return true;
      try {
        new URL(val);
        return true;
      } catch {
        return false;
      }
    }, { message: 'image_url must be a valid URL or empty' }),
  user_id: z.string().min(1, 'User ID is required'),
  session_id: z.string().optional(), // For conversation history
  location: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional()
}).refine((data) => {
  // At least one of text or image_url must be provided and non-empty
  const hasText = data.text && data.text.trim().length > 0;
  const hasImage = data.image_url && data.image_url.trim().length > 0;
  return hasText || hasImage;
}, {
  message: 'Either text or image_url must be provided and non-empty',
  path: ['text']
});

export async function triageRoutes(
  fastify: FastifyInstance,
  agent: MedagenAgent,
  supabaseService: SupabaseService,
  mapsService: MapsService
) {
  // Initialize conversation history service and tool tracker
  const conversationService = new ConversationHistoryService(supabaseService.getClient());
  const toolTracker = new ToolExecutionTrackerService(supabaseService.getClient());
  fastify.post('/api/health-check', {
    schema: {
      description: 'Endpoint chính để xử lý triage y tế. Sử dụng ReAct Agent với Gemini 2.5Flash để phân tích triệu chứng và đưa ra khuyến nghị. Hỗ trợ conversation history để xử lý multi-turn conversations.',
      tags: ['triage'],
      body: {
        type: 'object',
        required: ['user_id'],
        properties: {
          text: {
            type: 'string',
            description: 'Mô tả triệu chứng của người dùng (bắt buộc nếu không có image_url)'
          },
          image_url: {
            type: 'string',
            description: 'URL của hình ảnh (bắt buộc nếu không có text). Có thể để trống hoặc không gửi nếu chỉ có text. Nếu gửi, phải là URL hợp lệ.'
          },
          user_id: {
            type: 'string',
            description: 'ID của người dùng'
          },
          session_id: {
            type: 'string',
            description: 'Session ID để theo dõi lịch sử hội thoại (tùy chọn, tự động tạo nếu không có)'
          },
          location: {
            type: 'object',
            description: 'Vị trí của người dùng (tùy chọn, nhưng CẦN THIẾT để tìm bệnh viện gần nhất khi user hỏi "đi khám ở đâu" hoặc triage level là emergency/urgent). Sẽ được truyền vào MCP hospital tool nếu cần. Format: {"lat": 10.762622, "lng": 106.660172}',
            properties: {
              lat: { 
                type: 'number',
                description: 'Vĩ độ (latitude), ví dụ: 10.762622'
              },
              lng: { 
                type: 'number',
                description: 'Kinh độ (longitude), ví dụ: 106.660172'
              }
            }
          }
        }
      },
      response: {
        200: {
          description: 'Kết quả triage thành công',
          type: 'object',
          properties: {
            triage_level: {
              type: 'string',
              enum: ['emergency', 'urgent', 'routine', 'self-care']
            },
            symptom_summary: { type: 'string' },
            red_flags: {
              type: 'array',
              items: { type: 'string' }
            },
            suspected_conditions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  source: { type: 'string' },
                  confidence: { type: 'string' }
                }
              }
            },
            cv_findings: {
              type: 'object',
              properties: {
                model_used: { type: 'string' },
                raw_output: { type: 'object', additionalProperties: true }
              }
            },
            recommendation: {
              type: 'object',
              properties: {
                action: { type: 'string' },
                timeframe: { type: 'string' },
                home_care_advice: { type: 'string' },
                warning_signs: { type: 'string' }
              }
            },
            nearest_clinic: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                distance_km: { type: 'number' },
                address: { type: 'string' },
                rating: { type: 'number' }
              }
            },
            session_id: {
              type: 'string',
              description: 'Session ID for conversation tracking'
            },
            message: {
              type: 'string',
              description: 'Markdown response từ LLM (natural language, không bị giới hạn bởi JSON structure)'
            }
          }
        },
        400: {
          description: 'Request không hợp lệ',
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: {
              type: 'array',
              items: { type: 'object', additionalProperties: true }
            }
          }
        },
        500: {
          description: 'Lỗi server',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (
    request: FastifyRequest<{ Body: HealthCheckRequest }>,
    reply: FastifyReply
  ) => {
    try {
      logger.info('Health check request received');

      // Validate request body
      const validationResult = healthCheckSchema.safeParse(request.body);
      
      if (!validationResult.success) {
        logger.warn({ error: validationResult.error }, 'Invalid request body');
        return reply.status(400).send({
          error: 'Invalid request',
          details: validationResult.error.errors
        });
      }

      const { text, image_url, user_id, session_id, location } = validationResult.data;
      
      // Normalize empty strings to undefined and validate URLs
      let normalizedImageUrl: string | undefined = undefined;
      if (image_url && typeof image_url === 'string' && image_url.trim()) {
        // Validate URL format
        try {
          new URL(image_url);
          normalizedImageUrl = image_url;
        } catch (error) {
          return reply.status(400).send({
            error: 'Validation Error',
            message: 'image_url must be a valid URL'
          });
        }
      }
      
      const normalizedText = text && typeof text === 'string' && text.trim() ? text : undefined;
      
      // Final check: at least one must be provided
      if (!normalizedText && !normalizedImageUrl) {
        return reply.status(400).send({
          error: 'Validation Error',
          message: 'Either text or image_url must be provided and non-empty'
        });
      }

      // Optional: Verify JWT token
      // const authHeader = request.headers.authorization;
      // if (authHeader) {
      //   const token = authHeader.replace('Bearer ', '');
      //   const user = await supabaseService.verifyToken(token);
      //   if (!user || user.user_id !== user_id) {
      //     return reply.status(401).send({ error: 'Unauthorized' });
      //   }
      // }

      logger.info(`Processing triage for user: ${user_id}`);

      // Get or create conversation session
      const activeSessionId = await conversationService.getOrCreateSession(user_id, session_id);

      // Get conversation context
      const conversationContext = await conversationService.getContextString(activeSessionId, 5);

      // Add user message to history
      const userMessage = await conversationService.addUserMessage(activeSessionId, user_id, normalizedText, normalizedImageUrl);

      // Start tracking tool executions for this message
      toolTracker.startTracking(userMessage.id);
      const startTime = Date.now();

      // Process triage with agent (pass conversation context and location)
      const triageResult = await agent.processTriage(
        normalizedText || 'Da tôi bị gì thế này',
        normalizedImageUrl,
        user_id,
        conversationContext, // Pass context separately for better agent handling
        location // Pass location for hospital finding
      );

      const totalExecutionTime = Date.now() - startTime;

      // Add assistant response to conversation history
      try {
        // Use markdown message if available, otherwise fallback to recommendation.action
        const assistantMessage = (triageResult as any).message || triageResult.recommendation.action;
        await conversationService.addAssistantMessage(
          activeSessionId,
          user_id,
          assistantMessage,
          triageResult
        );
      } catch (error) {
        logger.error({ error }, 'Failed to save conversation history');
        // Continue even if saving fails
      }

      // Track tool executions for Report Generation (non-blocking)
      try {
        logger.info('[REPORT] Starting tool execution tracking for report generation...');
        
        // Track CV execution if applicable
        if (triageResult.cv_findings.model_used !== 'none') {
          logger.info('[REPORT] Tracking CV tool execution...');
          await ToolTrackingHelper.trackCVExecution(
            toolTracker,
            activeSessionId,
            userMessage.id,
            triageResult,
            Math.floor(totalExecutionTime * 0.3) // Estimate 30% of time for CV
          );
          logger.info(`[REPORT] ✓ CV tool tracked: ${triageResult.cv_findings.model_used}`);
        } else {
          logger.info('[REPORT] CV tool not executed (no image or model_used=none)');
        }

        // Track Triage Rules execution
        logger.info('[REPORT] Tracking Triage Rules execution...');
        await ToolTrackingHelper.trackTriageRulesExecution(
          toolTracker,
          activeSessionId,
          userMessage.id,
          triageResult,
          normalizedText || 'Image analysis',
          Math.floor(totalExecutionTime * 0.2) // Estimate 20% of time
        );
        logger.info(`[REPORT] ✓ Triage Rules tracked: level=${triageResult.triage_level}`);

        // Track RAG execution - extract actual guidelines count from agent result
        const guidelinesCount = (triageResult as any).guidelines_count || 3; // Captured from agent execution
        logger.info('[REPORT] Tracking RAG/Guidelines execution...');
        await ToolTrackingHelper.trackRAGExecution(
          toolTracker,
          activeSessionId,
          userMessage.id,
          triageResult,
          normalizedText || 'Image analysis',
          Math.floor(totalExecutionTime * 0.3), // Estimate 30% of time
          guidelinesCount
        );
        logger.info(`[REPORT] ✓ RAG tool tracked: ${guidelinesCount} guidelines retrieved`);

        // Track Maps/Hospital execution if hospital was found
        const nearestClinic = (triageResult as any).nearest_clinic;
        if (nearestClinic) {
          logger.info('[REPORT] Tracking Hospital/Maps tool execution...');
          const condition = triageResult.suspected_conditions?.[0]?.name;
          await ToolTrackingHelper.trackMapsExecution(
            toolTracker,
            activeSessionId,
            userMessage.id,
            nearestClinic,
            condition,
            Math.floor(totalExecutionTime * 0.2) // Estimate 20% of time
          );
          logger.info(`[REPORT] ✓ Hospital tool tracked: ${nearestClinic.name} (${nearestClinic.distance_km}km)`);
        } else {
          if (location) {
            logger.info(`[REPORT] Hospital tool not executed: triage_level=${triageResult.triage_level} (only called for emergency/urgent or explicit request)`);
          } else {
            logger.info('[REPORT] Hospital tool not executed: no location provided');
          }
        }

        logger.info('[REPORT] ✓ All tool executions tracked successfully for report generation');
      } catch (error) {
        logger.error({ error }, '[REPORT] Failed to track tool executions');
        // Continue even if tracking fails
      }

      // Save session to database (for backward compatibility)
      try {
        await supabaseService.saveSession({
          user_id,
          input_text: normalizedText || '[Image only]',
          image_url: normalizedImageUrl,
          triage_result: triageResult,
          location
        });
      } catch (error) {
        logger.error({ error }, 'Failed to save session');
        // Continue even if saving fails
      }

      // Agent already finds nearest hospital if emergency/urgent or user requested
      // Use nearest_clinic from triageResult if available, otherwise fallback to finding clinic
      let nearestClinic = (triageResult as any).nearest_clinic;
      if (!nearestClinic && location) {
        try {
          nearestClinic = await mapsService.findNearestClinic(location);
        } catch (error) {
          logger.error({ error }, 'Failed to find nearest clinic');
          // Continue without clinic info
        }
      }

      // Build response
      const response: HealthCheckResponse & { session_id: string } = {
        ...triageResult,
        nearest_clinic: nearestClinic || undefined,
        session_id: activeSessionId // Return session_id for future messages
      };

      logger.info(`Triage completed: ${triageResult.triage_level}, session: ${activeSessionId}`);
      logger.info('='.repeat(80));
      logger.info('[API] FINAL RESPONSE TO CLIENT:');
      logger.info(JSON.stringify(response, null, 2));
      logger.info('='.repeat(80));

      return reply.status(200).send(response);
    } catch (error) {
      logger.error({ error }, 'Health check error');
      
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to process health check'
      });
    }
  });
}

