import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { MedagenAgent } from '../agent/agent-executor.js';
import { SupabaseService } from '../services/supabase.service.js';
import { MapsService } from '../services/maps.service.js';
import { logger } from '../utils/logger.js';
import type { HealthCheckRequest, HealthCheckResponse } from '../types/index.js';

// Validation schema
const healthCheckSchema = z.object({
  text: z.string().min(1, 'Text is required'),
  image_url: z.string().url().optional(),
  user_id: z.string().min(1, 'User ID is required'),
  location: z.object({
    lat: z.number(),
    lng: z.number()
  }).optional()
});

export async function triageRoutes(
  fastify: FastifyInstance,
  agent: MedagenAgent,
  supabaseService: SupabaseService,
  mapsService: MapsService
) {
  fastify.post('/api/health-check', {
    schema: {
      description: 'Endpoint chính để xử lý triage y tế. Sử dụng ReAct Agent với Gemini 2.5Flash để phân tích triệu chứng và đưa ra khuyến nghị.',
      tags: ['triage'],
      body: {
        type: 'object',
        required: ['text', 'user_id'],
        properties: {
          text: {
            type: 'string',
            description: 'Mô tả triệu chứng của người dùng'
          },
          image_url: {
            type: 'string',
            format: 'uri',
            description: 'URL của hình ảnh (nếu có)'
          },
          user_id: {
            type: 'string',
            description: 'ID của người dùng'
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
        logger.warn('Invalid request body:', validationResult.error);
        return reply.status(400).send({
          error: 'Invalid request',
          details: validationResult.error.errors
        });
      }

      const { text, image_url, user_id, location } = validationResult.data;

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

      // Process triage with agent
      const triageResult = await agent.processTriage(text, image_url, user_id);

      // Save session to database
      try {
        await supabaseService.saveSession({
          user_id,
          input_text: text,
          image_url,
          triage_result: triageResult,
          location
        });
      } catch (error) {
        logger.error('Failed to save session:', error);
        // Continue even if saving fails
      }

      // Find nearest clinic if location provided
      let nearestClinic = null;
      if (location) {
        try {
          nearestClinic = await mapsService.findNearestClinic(location);
        } catch (error) {
          logger.error('Failed to find nearest clinic:', error);
          // Continue without clinic info
        }
      }

      // Build response
      const response: HealthCheckResponse = {
        ...triageResult,
        nearest_clinic: nearestClinic || undefined
      };

      logger.info(`Triage completed: ${triageResult.triage_level}`);

      return reply.status(200).send(response);
    } catch (error) {
      logger.error('Health check error:', error);
      
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to process health check'
      });
    }
  });
}

