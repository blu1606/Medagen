import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { MedagenAgent } from '../agent/agent-executor.js';
import { SupabaseService } from '../services/supabase.service.js';
import { MapsService } from '../services/maps.service.js';
import { ConversationHistoryService } from '../services/conversation-history.service.js';
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
  // Initialize conversation history service
  const conversationService = new ConversationHistoryService(supabaseService.getClient());
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
            description: 'Vị trí của người dùng (tùy chọn)',
            properties: {
              lat: { type: 'number' },
              lng: { type: 'number' }
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
      await conversationService.addUserMessage(activeSessionId, user_id, normalizedText, normalizedImageUrl);

      // Process triage with agent (pass conversation context)
      const triageResult = await agent.processTriage(
        normalizedText || 'Da tôi bị gì thế này',
        normalizedImageUrl,
        user_id,
        conversationContext // Pass context separately for better agent handling
      );

      // Add assistant response to conversation history
      try {
        // Chỉ lấy recommendation.action, loại bỏ thông tin không cần thiết
        const assistantMessage = triageResult.recommendation.action;
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

      // Find nearest clinic if location provided
      let nearestClinic = null;
      if (location) {
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

