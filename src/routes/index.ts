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
import { reportRoutes } from './report.route.js';
import { MedagenAgent } from '../agent/agent-executor.js';
import { SupabaseService } from '../services/supabase.service.js';
import { MapsService } from '../services/maps.service.js';
import { ConversationHistoryService } from '../services/conversation-history.service.js';
import { ToolExecutionTrackerService } from '../services/tool-execution-tracker.service.js';

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

  // Initialize services
  const conversationService = new ConversationHistoryService(supabaseService.getClient());
  const toolTracker = new ToolExecutionTrackerService(supabaseService.getClient());

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
  
  // Register report routes
  await reportRoutes(fastify, supabaseService, conversationService, toolTracker);
}

