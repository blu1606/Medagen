import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { SupabaseService } from '../services/supabase.service.js';
import { logger } from '../utils/logger.js';

export async function sessionsRoutes(
  fastify: FastifyInstance,
  supabaseService: SupabaseService
) {
  fastify.get('/api/sessions/:id', {
    schema: {
      description: 'Lấy thông tin session theo ID',
      tags: ['sessions'],
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: {
            type: 'string',
            description: 'Session ID (UUID)'
          }
        }
      },
      response: {
        200: {
          description: 'Thông tin session',
          type: 'object',
          properties: {
            id: { type: 'string' },
            user_id: { type: 'string' },
            input_text: { type: 'string' },
            image_url: { type: 'string' },
            triage_level: { type: 'string' },
            triage_result: { type: 'object', additionalProperties: true },
            location: { type: 'object', additionalProperties: true },
            created_at: { type: 'string', format: 'date-time' }
          }
        },
        404: {
          description: 'Session không tồn tại',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) => {
    try {
      const { id } = request.params;

      const session = await supabaseService.getSession(id);

      if (!session) {
        return reply.status(404).send({
          error: 'Not found',
          message: 'Session không tồn tại'
        });
      }

      return reply.status(200).send(session);
    } catch (error) {
      logger.error({ error }, 'Get session endpoint error');
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to get session'
      });
    }
  });
}

