import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
// import { z } from 'zod'; // Unused for now, can be used for future validation
import { TriageRulesService } from '../services/triage-rules.service.js';
import { logger } from '../utils/logger.js';
import type { TriageInput } from '../types/index.js';

// Schema for triage input validation (can be used for future validation)
// const triageInputSchema = z.object({
//   symptoms: z.object({
//     main_complaint: z.string().min(1),
//     duration: z.string().optional(),
//     pain_severity: z.enum(['nhẹ', 'vừa', 'nặng']).optional(),
//     fever: z.boolean().optional(),
//     vision_changes: z.boolean().optional(),
//     bleeding: z.boolean().optional(),
//     breathing_difficulty: z.boolean().optional(),
//     chest_pain: z.boolean().optional(),
//     severe_headache: z.boolean().optional(),
//     confusion: z.boolean().optional()
//   }),
//   cv_results: z.any().optional()
// });

export async function triageRulesRoutes(fastify: FastifyInstance) {
  const triageService = new TriageRulesService();

  fastify.post('/api/triage/rules', {
    schema: {
      description: 'Đánh giá triage level dựa trên triệu chứng và quy tắc an toàn',
      tags: ['triage'],
      body: {
        type: 'object',
        required: ['symptoms'],
        properties: {
          symptoms: {
            type: 'object',
            required: ['main_complaint'],
            properties: {
              main_complaint: { type: 'string' },
              duration: { type: 'string' },
              pain_severity: { type: 'string', enum: ['nhẹ', 'vừa', 'nặng'] },
              fever: { type: 'boolean' },
              vision_changes: { type: 'boolean' },
              bleeding: { type: 'boolean' },
              breathing_difficulty: { type: 'boolean' },
              chest_pain: { type: 'boolean' },
              severe_headache: { type: 'boolean' },
              confusion: { type: 'boolean' }
            }
          },
          cv_results: { type: 'object', additionalProperties: true }
        }
      },
      response: {
        200: {
          description: 'Kết quả đánh giá triage',
          type: 'object',
          properties: {
            triage: {
              type: 'string',
              enum: ['emergency', 'urgent', 'routine', 'self-care']
            },
            red_flags: {
              type: 'array',
              items: { type: 'string' }
            },
            reasoning: { type: 'string' }
          }
        },
        400: {
          description: 'Request không hợp lệ',
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'array', items: { type: 'object', additionalProperties: true } }
          }
        }
      }
    }
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Fastify schema validation will handle validation automatically
      // If validation fails, Fastify will return 400 before reaching here
      const result = triageService.evaluateSymptoms(request.body as TriageInput);
      return reply.status(200).send(result);
    } catch (error) {
      logger.error({ error }, 'Triage rules endpoint error');
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to evaluate triage rules'
      });
    }
  });
}

