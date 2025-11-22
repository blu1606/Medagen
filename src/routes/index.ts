import { FastifyInstance } from 'fastify';
import { healthRoutes } from './health.route.js';
import { triageRoutes } from './triage.route.js';
import { cvRoutes } from './cv.route.js';
import { triageRulesRoutes } from './triage-rules.route.js';
import { ragRoutes } from './rag.route.js';
import { mapsRoutes } from './maps.route.js';
import { sessionsRoutes } from './sessions.route.js';
import { conversationRoutes } from './conversation.route.js';
import { websocketRoutes } from './websocket.route.js';
import { MedagenAgent } from '../agent/agent-executor.js';
import { SupabaseService } from '../services/supabase.service.js';
import { MapsService } from '../services/maps.service.js';

export async function registerRoutes(
  fastify: FastifyInstance,
  agent: MedagenAgent,
  supabaseService: SupabaseService,
  mapsService: MapsService
) {
  // Register health routes
  await healthRoutes(fastify);

  // Register WebSocket routes
  await websocketRoutes(fastify);

  // Register triage routes
  await triageRoutes(fastify, agent, supabaseService, mapsService);

  // Register CV routes
  await cvRoutes(fastify);

  // Register triage rules routes
  await triageRulesRoutes(fastify);

  // Register RAG routes
  await ragRoutes(fastify, supabaseService);

  // Register maps routes
  await mapsRoutes(fastify);

  // Register sessions routes
  await sessionsRoutes(fastify, supabaseService);
  await conversationRoutes(fastify, supabaseService);
}

