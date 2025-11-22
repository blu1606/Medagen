import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
// import { z } from 'zod'; // Unused for now, can be used for future validation
import { CVService } from '../services/cv.service.js';
import { logger } from '../utils/logger.js';

// Schema for image URL validation (can be used for future validation)
// const imageUrlSchema = z.object({
//   image_url: z.string().url('Image URL must be a valid URL')
// });

export async function cvRoutes(fastify: FastifyInstance) {
  const cvService = new CVService();

  fastify.post('/api/cv/derm', {
    schema: {
      description: 'Phân tích hình ảnh da liễu sử dụng CV model',
      tags: ['cv'],
      body: {
        type: 'object',
        required: ['image_url'],
        properties: {
          image_url: {
            type: 'string',
            format: 'uri',
            description: 'URL của hình ảnh da liễu'
          }
        }
      },
      response: {
        200: {
          description: 'Kết quả phân tích da liễu',
          type: 'object',
          properties: {
            top_conditions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  prob: { type: 'number' }
                }
              }
            }
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
  }, async (request: FastifyRequest<{ Body: { image_url: string } }>, reply: FastifyReply) => {
    try {
      // Fastify schema validation handles validation automatically
      const result = await cvService.callDermCV(request.body.image_url);
      return reply.status(200).send(result);
    } catch (error) {
      logger.error({ error }, 'Derm CV endpoint error');
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to analyze dermatology image'
      });
    }
  });

  fastify.post('/api/cv/eye', {
    schema: {
      description: 'Phân tích hình ảnh mắt sử dụng CV model',
      tags: ['cv'],
      body: {
        type: 'object',
        required: ['image_url'],
        properties: {
          image_url: {
            type: 'string',
            format: 'uri',
            description: 'URL của hình ảnh mắt'
          }
        }
      },
      response: {
        200: {
          description: 'Kết quả phân tích mắt',
          type: 'object',
          properties: {
            top_conditions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  prob: { type: 'number' }
                }
              }
            }
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
  }, async (request: FastifyRequest<{ Body: { image_url: string } }>, reply: FastifyReply) => {
    try {
      const result = await cvService.callEyeCV(request.body.image_url);
      return reply.status(200).send(result);
    } catch (error) {
      logger.error({ error }, 'Eye CV endpoint error');
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to analyze eye image'
      });
    }
  });

  fastify.post('/api/cv/wound', {
    schema: {
      description: 'Phân tích hình ảnh vết thương sử dụng CV model',
      tags: ['cv'],
      body: {
        type: 'object',
        required: ['image_url'],
        properties: {
          image_url: {
            type: 'string',
            format: 'uri',
            description: 'URL của hình ảnh vết thương'
          }
        }
      },
      response: {
        200: {
          description: 'Kết quả phân tích vết thương',
          type: 'object',
          properties: {
            top_conditions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  prob: { type: 'number' }
                }
              }
            }
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
  }, async (request: FastifyRequest<{ Body: { image_url: string } }>, reply: FastifyReply) => {
    try {
      const result = await cvService.callWoundCV(request.body.image_url);
      return reply.status(200).send(result);
    } catch (error) {
      logger.error({ error }, 'Wound CV endpoint error');
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to analyze wound image'
      });
    }
  });
}

