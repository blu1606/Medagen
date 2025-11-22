import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ConversationHistoryService } from '../services/conversation-history.service.js';
import { SupabaseService } from '../services/supabase.service.js';
import { logger } from '../utils/logger.js';

export async function conversationRoutes(
  fastify: FastifyInstance,
  supabaseService: SupabaseService
) {
  const conversationService = new ConversationHistoryService(supabaseService.getClient());

  // Get conversation history for a session
  fastify.get('/api/conversations/:session_id', {
    schema: {
      description: 'Lấy lịch sử hội thoại cho một session cụ thể',
      tags: ['conversations'],
      params: {
        type: 'object',
        required: ['session_id'],
        properties: {
          session_id: {
            type: 'string',
            description: 'Session ID'
          }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Số lượng tin nhắn tối đa (mặc định: 20)',
            default: 20
          }
        }
      },
      response: {
        200: {
          description: 'Lịch sử hội thoại',
          type: 'object',
          properties: {
            session_id: { type: 'string' },
            messages: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  role: { type: 'string', enum: ['user', 'assistant'] },
                  content: { type: 'string' },
                  image_url: { type: 'string' },
                  triage_result: { type: 'object', additionalProperties: true },
                  created_at: { type: 'string', format: 'date-time' }
                }
              }
            },
            count: { type: 'number' }
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
    request: FastifyRequest<{
      Params: { session_id: string };
      Querystring: { limit?: number };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { session_id } = request.params;
      const limit = request.query.limit || 20;

      logger.info(`Getting conversation history for session: ${session_id}`);

      const messages = await conversationService.getHistory(session_id, limit);

      if (!messages || messages.length === 0) {
        return reply.status(404).send({
          error: 'Not found',
          message: 'Không tìm thấy lịch sử hội thoại'
        });
      }

      return reply.status(200).send({
        session_id,
        messages,
        count: messages.length
      });
    } catch (error) {
      logger.error({ error }, 'Get conversation history error');
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to get conversation history'
      });
    }
  });

  // Get user's recent sessions
  fastify.get('/api/conversations/user/:user_id', {
    schema: {
      description: 'Lấy danh sách sessions gần đây của user',
      tags: ['conversations'],
      params: {
        type: 'object',
        required: ['user_id'],
        properties: {
          user_id: {
            type: 'string',
            description: 'User ID'
          }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          limit: {
            type: 'number',
            description: 'Số lượng sessions tối đa (mặc định: 10)',
            default: 10
          }
        }
      },
      response: {
        200: {
          description: 'Danh sách sessions',
          type: 'object',
          properties: {
            user_id: { type: 'string' },
            sessions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  created_at: { type: 'string', format: 'date-time' },
                  updated_at: { type: 'string', format: 'date-time' },
                  message_count: { type: 'number' }
                }
              }
            },
            count: { type: 'number' }
          }
        }
      }
    }
  }, async (
    request: FastifyRequest<{
      Params: { user_id: string };
      Querystring: { limit?: number };
    }>,
    reply: FastifyReply
  ) => {
    try {
      const { user_id } = request.params;
      const limit = request.query.limit || 10;

      logger.info(`Getting sessions for user: ${user_id}`);

      const { data, error } = await supabaseService.getClient()
        .from('conversation_sessions')
        .select('id, created_at, updated_at')
        .eq('user_id', user_id)
        .order('updated_at', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      // Get message count for each session
      const sessions = await Promise.all(
        (data || []).map(async (session) => {
          const messages = await conversationService.getHistory(session.id, 1);
          return {
            ...session,
            message_count: messages.length
          };
        })
      );

      return reply.status(200).send({
        user_id,
        sessions,
        count: sessions.length
      });
    } catch (error) {
      logger.error({ error }, 'Get user sessions error');
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to get user sessions'
      });
    }
  });
}

