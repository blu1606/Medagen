import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
// import { z } from 'zod'; // Unused for now, can be used for future validation
import { RAGService } from '../services/rag.service.js';
import { SupabaseService } from '../services/supabase.service.js';
import { logger } from '../utils/logger.js';
import type { GuidelineQuery } from '../types/index.js';

// Schema for guideline query validation (can be used for future validation)
// const guidelineQuerySchema = z.object({
//   symptoms: z.string().min(1),
//   suspected_conditions: z.array(z.string()).optional(),
//   triage_level: z.string().optional()
// });

export async function ragRoutes(
  fastify: FastifyInstance,
  supabaseService: SupabaseService
) {
  const ragService = new RAGService(supabaseService);

  // Initialize RAG service
  await ragService.initialize();

  fastify.post('/api/rag/search', {
    schema: {
      description: 'Tìm kiếm hướng dẫn y tế sử dụng RAG với vector search',
      tags: ['rag'],
      body: {
        type: 'object',
        required: ['symptoms'],
        properties: {
          symptoms: {
            type: 'string',
            description: 'Mô tả triệu chứng'
          },
          suspected_conditions: {
            type: 'array',
            items: { type: 'string' },
            description: 'Danh sách tình trạng nghi ngờ'
          },
          triage_level: {
            type: 'string',
            description: 'Mức độ triage'
          }
        }
      },
      response: {
        200: {
          description: 'Kết quả tìm kiếm guidelines',
          type: 'object',
          properties: {
            guidelines: {
              type: 'array',
              items: { type: 'string' },
              description: 'Danh sách các đoạn guideline liên quan'
            },
            count: { type: 'number' }
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
  }, async (request: FastifyRequest<{ Body: { symptoms: string; suspected_conditions?: string[]; triage_level?: string } }>, reply: FastifyReply) => {
    try {
      // Fastify schema validation handles validation automatically
      const query: GuidelineQuery = {
        symptoms: request.body.symptoms,
        suspected_conditions: request.body.suspected_conditions || [],
        triage_level: request.body.triage_level || ''
      };

      const guidelines = await ragService.searchGuidelines(query);
      
      return reply.status(200).send({
        guidelines,
        count: guidelines.length
      });
    } catch (error) {
      logger.error({ error }, 'RAG search endpoint error');
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to search guidelines'
      });
    }
  });
}

