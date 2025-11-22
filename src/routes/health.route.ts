import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
// import { CVService } from '../services/cv.service.js'; // Unused for now, can be used for future health checks
import { config } from '../utils/config.js';
import { logger } from '../utils/logger.js';

export async function healthRoutes(fastify: FastifyInstance) {
  // CV service can be used for health checks in the future
  // const cvService = new CVService();

  fastify.get('/health', {
    schema: {
      description: 'Health check endpoint để kiểm tra trạng thái của server và các services',
      tags: ['health'],
      response: {
        200: {
          description: 'Server đang hoạt động bình thường',
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string', format: 'date-time' },
            llm: { type: 'string' },
            cv_services: {
              type: 'object',
              properties: {
                derm_cv: { type: 'string' },
                eye_cv: { type: 'string' },
                wound_cv: { type: 'string' }
              }
            }
          }
        },
        500: {
          description: 'Server error',
          type: 'object',
          properties: {
            status: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (_request: FastifyRequest, reply: FastifyReply) => {
    try {
      logger.info('Health check requested');

      // Basic health status
      const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        llm: config.gemini.model,
        cv_services: {
          derm_cv: 'unknown',
          eye_cv: 'unknown',
          wound_cv: 'unknown'
        }
      };

      // Optional: Check CV services (can be slow)
      // Uncomment if you want to verify CV services on health check
      /*
      try {
        await Promise.all([
          cvService.callDermCV('test').catch(() => null),
          cvService.callEyeCV('test').catch(() => null),
          cvService.callWoundCV('test').catch(() => null)
        ]);
        health.cv_services = {
          derm_cv: 'ok',
          eye_cv: 'ok',
          wound_cv: 'ok'
        };
      } catch (error) {
        logger.warn('CV services check failed');
      }
      */

      return reply.status(200).send(health);
    } catch (error) {
      logger.error({ error }, 'Health check error');
      return reply.status(500).send({
        status: 'error',
        message: 'Health check failed'
      });
    }
  });
}

