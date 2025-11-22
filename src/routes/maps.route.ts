import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
// import { z } from 'zod'; // Unused for now, can be used for future validation
import { MapsService } from '../services/maps.service.js';
import { logger } from '../utils/logger.js';
import type { Location } from '../types/index.js';

// Schema for location validation (can be used for future validation)
// const locationSchema = z.object({
//   lat: z.number().min(-90).max(90),
//   lng: z.number().min(-180).max(180),
//   keyword: z.string().optional()
// });

export async function mapsRoutes(fastify: FastifyInstance) {
  const mapsService = new MapsService();

  fastify.get('/api/maps/clinic', {
    schema: {
      description: 'Tìm cơ sở y tế gần nhất dựa trên vị trí',
      tags: ['maps'],
      querystring: {
        type: 'object',
        required: ['lat', 'lng'],
        properties: {
          lat: {
            type: 'number',
            description: 'Vĩ độ',
            minimum: -90,
            maximum: 90
          },
          lng: {
            type: 'number',
            description: 'Kinh độ',
            minimum: -180,
            maximum: 180
          },
          keyword: {
            type: 'string',
            description: 'Từ khóa tìm kiếm (mặc định: phòng khám bệnh viện)'
          }
        }
      },
      response: {
        200: {
          description: 'Thông tin cơ sở y tế gần nhất',
          type: 'object',
          properties: {
            name: { type: 'string' },
            distance_km: { type: 'number' },
            address: { type: 'string' },
            rating: { type: 'number' }
          }
        },
        400: {
          description: 'Request không hợp lệ',
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'array', items: { type: 'object', additionalProperties: true } }
          }
        },
        404: {
          description: 'Không tìm thấy cơ sở y tế',
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, async (request: FastifyRequest<{ Querystring: { lat: number; lng: number; keyword?: string } }>, reply: FastifyReply) => {
    try {
      // Fastify schema validation handles validation automatically
      const { lat, lng, keyword } = request.query;

      const location: Location = {
        lat,
        lng
      };

      const clinic = await mapsService.findNearestClinic(location, keyword);

      if (!clinic) {
        return reply.status(404).send({
          error: 'Not found',
          message: 'Không tìm thấy cơ sở y tế gần nhất'
        });
      }

      return reply.status(200).send(clinic);
    } catch (error) {
      logger.error({ error }, 'Maps endpoint error');
      return reply.status(500).send({
        error: 'Internal server error',
        message: 'Failed to find nearest clinic'
      });
    }
  });
}

