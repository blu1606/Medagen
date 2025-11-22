import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config, validateConfig } from './utils/config.js';
import { logger } from './utils/logger.js';
import { swaggerOptions, swaggerUiOptions } from './utils/swagger.js';
import { MedagenAgent } from './agent/agent-executor.js';
import { SupabaseService } from './services/supabase.service.js';
import { MapsService } from './services/maps.service.js';
import { registerRoutes } from './routes/index.js';
import { wsConnectionManager } from './services/websocket.service.js';

async function startServer() {
  try {
    // Validate configuration
    logger.info('Validating configuration...');
    validateConfig();

    // Create Fastify instance
    const fastify = Fastify({
      logger: false, // Use custom logger
      requestIdLogLabel: 'reqId',
      disableRequestLogging: false,
      requestIdHeader: 'x-request-id'
    });

    // Register CORS
    await fastify.register(cors, {
      origin: true, // Allow all origins (adjust for production)
      credentials: true
    });

    // Register WebSocket
    await fastify.register(websocket, {
      options: {
        maxPayload: 10 * 1024, // 10KB max message size
        verifyClient: (_info, callback) => {
          // Optional: Add custom verification logic here
          callback(true);
        }
      }
    });

    // Register Swagger
    await fastify.register(swagger as any, swaggerOptions);
    await fastify.register(swaggerUi, swaggerUiOptions);

    // Initialize services
    logger.info('Initializing services...');
    const supabaseService = new SupabaseService();
    const mapsService = new MapsService();
    
    // Initialize agent
    logger.info('Initializing Medagen Agent...');
    const agent = new MedagenAgent(supabaseService);
    await agent.initialize();

    // Register routes
    logger.info('Registering routes...');
    await registerRoutes(fastify, agent, supabaseService, mapsService);

    // Add request logging
    fastify.addHook('onRequest', async (request) => {
      logger.info({
        method: request.method,
        url: request.url,
        ip: request.ip
      }, 'Incoming request');
    });

    // Add response logging
    fastify.addHook('onResponse', async (request, reply) => {
      logger.info({
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode
      }, 'Request completed');
    });

    // Error handler
    fastify.setErrorHandler((error, _request, reply) => {
      // Handle validation errors (Fastify schema validation)
      if (error && typeof error === 'object' && 'validation' in error && error.validation) {
        const validationError = error as { validation?: unknown; message?: string };
        logger.warn({ validation: error.validation }, 'Validation error');
        return reply.status(400).send({
          error: 'Validation Error',
          message: validationError.message || 'Validation failed',
          details: error.validation
        });
      }

      // Handle other errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({ error }, 'Unhandled error');
      
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: process.env.NODE_ENV === 'development' ? errorMessage : 'An error occurred'
      });
    });

    // Start server
    const port = config.port;
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });

    logger.info(`🚀 Medagen Backend is running on http://${host}:${port}`);
    logger.info(`📊 Health check: http://${host}:${port}/health`);
    logger.info(`🏥 Triage endpoint: http://${host}:${port}/api/health-check`);
    logger.info(`🔌 WebSocket endpoint: ws://${host}:${port}/ws/chat`);
    logger.info(`📚 Swagger docs: http://${host}:${port}/docs`);
  } catch (error) {
    logger.error({ error }, 'Failed to start server');
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  wsConnectionManager.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully...');
  wsConnectionManager.destroy();
  process.exit(0);
});

// Start the server
startServer();

