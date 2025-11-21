# Medagen Backend Architecture

This document provides a comprehensive overview of the Medagen backend architecture, design patterns, and technical implementation.

## Table of Contents

- [System Overview](#system-overview)
- [Technology Stack](#technology-stack)
- [Architecture Patterns](#architecture-patterns)
- [Component Details](#component-details)
- [Data Flow](#data-flow)
- [Security & Safety](#security--safety)

## System Overview

Medagen is a medical AI triage assistant that analyzes user symptoms and provides triage level recommendations using an AI agent powered by Google Gemini 2.5 Flash and LangChain's ReAct pattern.

### Core Capabilities

1. **Text-based Symptom Analysis** - Natural language understanding of health complaints
2. **Image Analysis** - Computer vision for dermatology, eye conditions, and wounds
3. **Rule-based Triage** - Deterministic red flag detection for safety
4. **Guideline Retrieval** - RAG system with Vietnamese medical guidelines
5. **Conversation Context** - Multi-turn conversations with memory
6. **Clinic Recommendations** - Location-based nearest healthcare facility finder

## Technology Stack

### Backend Framework
- **Fastify 5.2.0** - High-performance web framework (faster than Express)
- **TypeScript 5.7.2** - Type-safe development with ES2022 modules
- **Node.js 18+** - JavaScript runtime

### AI/ML Stack
```
┌─────────────────────────────────────┐
│   LangChain JS (v0.3.7)             │
│   ├─ Agent Orchestration            │
│   └─ Tool Management                │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   Google Gemini 2.5 Flash           │
│   ├─ LLM (gemini-2.5-flash)         │
│   └─ Embeddings (text-embedding-004)│
└─────────────────────────────────────┘
```

### Database & Storage
- **Supabase** - Backend-as-a-Service platform
  - Postgres (primary database)
  - pgvector (vector embeddings for RAG)
  - Supabase Storage (image hosting)
  - Supabase Auth (user authentication)

### External Integrations
- **Google Maps API** - Clinic/hospital finder
- **Computer Vision APIs** - Three specialized models:
  - Dermatology CV (skin conditions)
  - Eye CV (ocular conditions)
  - Wound CV (injury assessment)

## Architecture Patterns

### 1. Layered Architecture

```
┌───────────────────────────────────────┐
│         Routes Layer (HTTP)           │
│  - Request validation (Zod)           │
│  - Response formatting                │
│  - Error handling                     │
└──────────────┬────────────────────────┘
               ↓
┌───────────────────────────────────────┐
│        Agent Layer (AI)               │
│  - MedagenAgent (ReAct orchestrator)  │
│  - System prompt & constraints        │
│  - Tool invocation                    │
└──────────────┬────────────────────────┘
               ↓
┌───────────────────────────────────────┐
│         Tools Layer (MCP)             │
│  - CV Tools (3 models)                │
│  - Triage Rules Tool                  │
│  - RAG Tool (guidelines)              │
└──────────────┬────────────────────────┘
               ↓
┌───────────────────────────────────────┐
│       Services Layer (Business)       │
│  - CV Service                         │
│  - Triage Rules Service               │
│  - RAG Service                        │
│  - Maps Service                       │
│  - Conversation History Service       │
│  - Supabase Service                   │
└──────────────┬────────────────────────┘
               ↓
┌───────────────────────────────────────┐
│      External APIs & Database         │
│  - Google Gemini                      │
│  - Supabase Postgres                  │
│  - Google Maps                        │
│  - CV Model APIs                      │
└───────────────────────────────────────┘
```

### 2. ReAct Agent Pattern

The core of Medagen is a **ReAct (Reasoning + Acting)** agent that follows this loop:

```
1. THINK: Analyze the current situation
   ↓
2. ACT: Choose and invoke a tool
   ↓
3. OBSERVE: Receive tool result
   ↓
4. REPEAT: Continue until solution found (max 5 iterations)
   ↓
5. FINAL ANSWER: Return structured JSON triage result
```

**Implementation:** [src/agent/agent-executor.ts](../src/agent/agent-executor.ts)

```typescript
class MedagenAgent {
  async processTriage(request: TriageRequest): Promise<TriageResult> {
    // Build context with conversation history
    const context = await this.buildContext(request);

    // Run ReAct loop with tools
    const agentResult = await this.agentExecutor.invoke({
      input: context
    });

    // Parse JSON output
    return this.parseTriageResult(agentResult.output);
  }
}
```

### 3. Tool Pattern (MCP - Model Context Protocol)

Each tool follows the MCP pattern:

```typescript
const triageRulesTool = new DynamicTool({
  name: "triage_rules",
  description: "When to use this tool: [clear instructions for agent]",
  func: async (input: string) => {
    // Parse input
    const data = JSON.parse(input);

    // Execute logic
    const result = await triageRulesService.evaluateTriage(data);

    // Return stringified result
    return JSON.stringify(result);
  }
});
```

**Available Tools:**
1. `derm_cv` - Analyze skin conditions from images
2. `eye_cv` - Analyze eye conditions from images
3. `wound_cv` - Analyze wounds/injuries from images
4. `triage_rules` - Apply deterministic safety rules
5. `guideline_retrieval` - Retrieve relevant medical guidelines

### 4. RAG (Retrieval Augmented Generation)

```
┌─────────────────────────────────────────┐
│  1. Medical Guidelines (.txt files)     │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  2. Chunking (~500 chars per chunk)     │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  3. Embedding (text-embedding-004)      │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  4. Storage (Supabase pgvector)         │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  5. Semantic Search (cosine similarity) │
└────────────────┬────────────────────────┘
                 ↓
┌─────────────────────────────────────────┐
│  6. Return Top-5 Relevant Chunks        │
└─────────────────────────────────────────┘
```

**Implementation:** [src/services/rag.service.ts](../src/services/rag.service.ts)

### 5. Conversation Context Pattern

Multi-turn conversations are supported via session management:

```
Session ID
    ↓
┌─────────────────────────────────────────┐
│  Conversation History (last 5 messages) │
│  ├─ User: "Tôi bị đau đầu"              │
│  ├─ AI: "Đau đầu kéo dài bao lâu?"      │
│  ├─ User: "3 ngày rồi"                  │
│  ├─ AI: "Có sốt không?"                 │
│  └─ User: "Có, 38.5 độ"                 │
└────────────────┬────────────────────────┘
                 ↓
         Prepended to Agent Prompt
                 ↓
         Agent Understands Context
```

**Implementation:** [src/services/conversation-history.service.ts](../src/services/conversation-history.service.ts)

## Component Details

### Directory Structure

```
src/
├── agent/                  # AI Agent Core
│   ├── agent-executor.ts   # Main orchestrator (148 lines)
│   ├── gemini-llm.ts       # Custom Gemini wrapper (56 lines)
│   ├── gemini-embedding.ts # Embedding model (45 lines)
│   └── system-prompt.ts    # Agent instructions (57 lines)
│
├── mcp_tools/              # Agent Tools
│   ├── index.ts            # Tool aggregator
│   ├── cv-tools.ts         # 3 CV models (61 lines)
│   ├── triage-tool.ts      # Rule-based triage (60 lines)
│   └── rag-tool.ts         # Guideline retrieval (41 lines)
│
├── services/               # Business Logic
│   ├── supabase.service.ts         # DB client (minimal)
│   ├── cv.service.ts               # CV APIs (117 lines)
│   ├── triage-rules.service.ts     # Triage logic (110 lines)
│   ├── rag.service.ts              # Vector search (147 lines)
│   ├── maps.service.ts             # Google Maps (90 lines)
│   └── conversation-history.service.ts # Chat history (219 lines)
│
├── routes/                 # HTTP Endpoints
│   ├── index.ts            # Route registry
│   ├── health.route.ts     # Health check
│   ├── triage.route.ts     # Main triage (290 lines)
│   ├── cv.route.ts         # Direct CV access
│   ├── triage-rules.route.ts # Direct rules access
│   ├── rag.route.ts        # Direct RAG access
│   ├── maps.route.ts       # Clinic finder
│   ├── sessions.route.ts   # Session management
│   └── conversation.route.ts # Chat history (203 lines)
│
├── scripts/
│   └── seed-guidelines.ts  # Populate vector DB (206 lines)
│
├── types/
│   └── index.ts            # TypeScript types
│
├── utils/
│   ├── config.ts           # Environment config (69 lines)
│   ├── logger.ts           # Pino logger setup
│   └── swagger.ts          # OpenAPI schema (271 lines)
│
└── index.ts                # Application entry point (120 lines)
```

### Key Components

#### 1. Agent Executor ([src/agent/agent-executor.ts](../src/agent/agent-executor.ts:1))

```typescript
export class MedagenAgent {
  private llm: GeminiLLM;
  private tools: DynamicTool[];
  private agentExecutor: AgentExecutor;

  async processTriage(request: TriageRequest): Promise<TriageResult> {
    // Build context with conversation history
    const conversationContext = await this.conversationHistoryService
      .getConversationContext(request.session_id, request.user_id);

    // Run agent
    const agentResult = await this.agentExecutor.invoke({
      input: `${conversationContext}\n\nCurrent request: ${JSON.stringify(request)}`
    });

    // Parse JSON output
    return this.parseTriageResult(agentResult.output);
  }
}
```

#### 2. Triage Rules Service ([src/services/triage-rules.service.ts](../src/services/triage-rules.service.ts:1))

Implements deterministic safety rules:

```typescript
class TriageRulesService {
  evaluateTriage(data: TriageInput): TriageResult {
    // Red flag detection
    const redFlags = this.checkRedFlags(data);

    if (redFlags.includes('vision_loss') ||
        redFlags.includes('chest_pain') ||
        redFlags.includes('breathing_difficulty')) {
      return { triage_level: 'emergency', ... };
    }

    // Severity evaluation
    if (data.symptom_severity === 'severe') {
      return { triage_level: 'urgent', ... };
    }

    // Default to routine care
    return { triage_level: 'routine', ... };
  }
}
```

#### 3. RAG Service ([src/services/rag.service.ts](../src/services/rag.service.ts:1))

Vector search implementation:

```typescript
class RAGService {
  async search(query: string, topK: number = 5): Promise<string[]> {
    const vectorStore = await SupabaseVectorStore.fromExistingIndex(
      this.embeddingModel,
      { client: supabase, tableName: 'guidelines' }
    );

    const results = await vectorStore.similaritySearch(query, topK);

    return results.map(doc => doc.pageContent);
  }
}
```

## Data Flow

### Main Triage Request Flow

```
1. POST /api/health-check
   Body: { text, image_url?, user_id, session_id?, location? }
   ↓
2. Validate Input (Zod)
   ↓
3. Get or Create Session
   ↓
4. Retrieve Conversation History (last 5 messages)
   ↓
5. Build Agent Context
   ↓
6. Agent ReAct Loop:
   a. Think: Analyze symptoms
   b. Act: Choose tool (CV / Rules / RAG)
   c. Observe: Get tool result
   d. Repeat (max 5 iterations)
   e. Final Answer: JSON triage result
   ↓
7. Save Conversation History
   ↓
8. Save Session to Database
   ↓
9. Find Nearest Clinic (if location provided)
   ↓
10. Return Response:
    {
      triage_level: "urgent" | "emergency" | "routine" | "self_care",
      symptom_summary: string,
      red_flags: string[],
      suspected_conditions: string[],
      cv_findings?: object,
      recommendation: string,
      nearest_clinic?: object,
      session_id: string
    }
```

### Agent Tool Invocation Flow

```
Agent Decides to Use Tool
   ↓
Tool Name + Input (JSON string)
   ↓
Tool Executor (DynamicTool.func)
   ↓
Service Layer (Business Logic)
   ↓
External API / Database
   ↓
Result (JSON string)
   ↓
Back to Agent (Observation)
   ↓
Agent Continues ReAct Loop
```

## Security & Safety

### Safety-First Design Principles

1. **Never Diagnose** - Agent is instructed never to provide medical diagnosis
2. **Never Prescribe** - No medication recommendations
3. **Over-Triage When Uncertain** - Err on side of caution
4. **Deterministic Red Flags** - Critical symptoms trigger automatic escalation
5. **Graceful Degradation** - Safe fallback responses on errors

### Error Handling Strategy

```typescript
try {
  const agentResult = await this.agentExecutor.invoke({ input });
  return this.parseTriageResult(agentResult.output);
} catch (error) {
  logger.error({ error }, 'Agent execution failed');

  // SAFE FALLBACK: Always return "urgent" on error
  return {
    triage_level: 'urgent',
    symptom_summary: 'Không thể phân tích chính xác',
    recommendation: 'Vui lòng đến cơ sở y tế để được thăm khám'
  };
}
```

### Input Validation

Three layers of validation:

1. **TypeScript Compile-Time** - Type checking
2. **Zod Runtime Validation** - Schema enforcement
3. **Fastify Schema Validation** - OpenAPI compliance

### Authentication & Authorization

- Supabase Auth integration ([src/services/supabase.service.ts](../src/services/supabase.service.ts:1))
- JWT support via `@fastify/jwt`
- User ID required for all triage requests

### Rate Limiting & Monitoring

- Structured logging with Pino ([src/utils/logger.ts](../src/utils/logger.ts:1))
- Request/response logging on all endpoints
- Health check endpoint: `GET /health`

## Performance Considerations

### Optimization Strategies

1. **Parallel Tool Calls** - Multiple independent CV models can run concurrently
2. **Vector Search Indexing** - pgvector provides fast similarity search
3. **Conversation History Limit** - Only last 5 messages retrieved
4. **Gemini 2.5 Flash** - Optimized for speed (vs Gemini Pro)
5. **Fastify Framework** - 2-3x faster than Express.js

### Caching Strategy

- RAG guidelines cached in Supabase vector store
- Session data cached in Supabase database
- No in-memory caching (stateless design for horizontal scaling)

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│         Docker Container                │
│  - Node.js 18 Alpine                    │
│  - Multi-stage build                    │
│  - Health check endpoint                │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│      Environment Variables              │
│  - Supabase credentials                 │
│  - Gemini API key                       │
│  - Google Maps API key                  │
│  - CV model endpoints                   │
└──────────────┬──────────────────────────┘
               ↓
┌─────────────────────────────────────────┐
│      External Services                  │
│  - Supabase (DB + Auth + Storage)       │
│  - Google AI Studio (Gemini)            │
│  - Google Maps API                      │
│  - CV Model APIs                        │
└─────────────────────────────────────────┘
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed deployment instructions.

---

**Next:** Read [API_REFERENCE.md](API_REFERENCE.md) for endpoint documentation.
