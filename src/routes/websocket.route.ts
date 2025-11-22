/**
 * WebSocket Route for ReAct Flow Streaming
 * Endpoint: ws://localhost:8000/ws/chat?session={sessionId}
 */

import { FastifyInstance, FastifyRequest } from 'fastify';
import { SocketStream } from '@fastify/websocket';
import { wsConnectionManager } from '../services/websocket.service.js';
import { logger } from '../utils/logger.js';

interface WebSocketQueryString {
  session: string;
  token?: string;
}

export async function websocketRoutes(fastify: FastifyInstance) {
  // Register WebSocket route
  fastify.get(
    '/ws/chat',
    { websocket: true },
    async (connection: SocketStream, req: FastifyRequest) => {
      const { session, token } = req.query as WebSocketQueryString;

      // Validate session parameter
      if (!session || typeof session !== 'string') {
        logger.warn('WebSocket connection rejected: missing session parameter');
        connection.socket.close(1008, 'Session ID required');
        return;
      }

      // TODO: Add JWT authentication
      // if (token) {
      //   try {
      //     const decoded = await fastify.jwt.verify(token);
      //     // Validate session ownership
      //   } catch (error) {
      //     logger.warn(`WebSocket auth failed for session ${session}:`, error);
      //     connection.socket.close(1008, 'Authentication failed');
      //     return;
      //   }
      // }

      logger.info(`WebSocket connection request for session: ${session}`);

      // Add connection to manager
      wsConnectionManager.addConnection(session, connection.socket);

      // Send welcome message
      try {
        connection.socket.send(
          JSON.stringify({
            type: 'connected',
            message: 'WebSocket connected successfully',
            session_id: session,
            timestamp: new Date().toISOString(),
          })
        );
      } catch (error) {
        logger.error('Error sending welcome message:', error);
      }

      // Handle incoming messages (optional - mainly for keep-alive pings)
      connection.socket.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());

          // Handle ping/pong
          if (message.type === 'ping') {
            connection.socket.send(
              JSON.stringify({
                type: 'pong',
                timestamp: new Date().toISOString(),
              })
            );
          }

          // Handle auth if sent as first message
          if (message.type === 'auth' && message.token) {
            // TODO: Verify token
            logger.info(`Auth message received for session ${session}`);
          }
        } catch (error) {
          logger.error(`Error processing WebSocket message for session ${session}:`, error);
        }
      });

      // Connection will be managed by WebSocketConnectionManager
      // Cleanup happens automatically on 'close' event
    }
  );

  logger.info('WebSocket routes registered');
}
