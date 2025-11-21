# Development Guide

This document provides guidelines for developers contributing to the Medagen Backend project.

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [Adding New Features](#adding-new-features)
- [Debugging](#debugging)
- [Contributing](#contributing)

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Git installed
- VSCode (recommended) or any text editor
- Supabase account
- Google AI Studio API key

### Initial Setup

1. **Clone and Install**

```bash
git clone <repository-url>
cd Medagen
npm install
```

2. **Configure Environment**

```bash
cp env.example .env
# Edit .env with your credentials
```

3. **Setup Database**

Follow the database setup instructions in [DEPLOYMENT.md](DEPLOYMENT.md#database-setup).

4. **Seed Guidelines**

```bash
npm run seed
```

5. **Start Development Server**

```bash
npm run dev
```

Server should start at http://localhost:7860

## Project Structure

```
Medagen/
├── src/                          # Source code
│   ├── agent/                    # AI Agent (LangChain + Gemini)
│   │   ├── agent-executor.ts     # Main orchestrator
│   │   ├── gemini-llm.ts         # LLM wrapper
│   │   ├── gemini-embedding.ts   # Embedding model
│   │   └── system-prompt.ts      # Agent instructions
│   │
│   ├── mcp_tools/                # Agent tools (MCP pattern)
│   │   ├── index.ts              # Tool exports
│   │   ├── cv-tools.ts           # Computer Vision tools
│   │   ├── triage-tool.ts        # Triage rules tool
│   │   └── rag-tool.ts           # RAG guideline tool
│   │
│   ├── services/                 # Business logic layer
│   │   ├── supabase.service.ts
│   │   ├── cv.service.ts
│   │   ├── triage-rules.service.ts
│   │   ├── rag.service.ts
│   │   ├── maps.service.ts
│   │   └── conversation-history.service.ts
│   │
│   ├── routes/                   # HTTP endpoints
│   │   ├── index.ts              # Route registry
│   │   ├── health.route.ts
│   │   ├── triage.route.ts
│   │   ├── cv.route.ts
│   │   ├── triage-rules.route.ts
│   │   ├── rag.route.ts
│   │   ├── maps.route.ts
│   │   ├── sessions.route.ts
│   │   └── conversation.route.ts
│   │
│   ├── scripts/                  # Utility scripts
│   │   └── seed-guidelines.ts    # Database seeding
│   │
│   ├── types/                    # TypeScript types
│   │   └── index.ts
│   │
│   ├── utils/                    # Utilities
│   │   ├── config.ts             # Configuration
│   │   ├── logger.ts             # Logging
│   │   └── swagger.ts            # API docs
│   │
│   └── index.ts                  # Entry point
│
├── data/                         # Medical guidelines
│   ├── viem-ket-mac.txt
│   ├── cham-da.txt
│   └── vet-thuong.txt
│
├── dist/                         # Compiled output (gitignored)
├── node_modules/                 # Dependencies (gitignored)
├── doc/                          # Documentation
├── Dockerfile                    # Docker configuration
├── tsconfig.json                 # TypeScript config
├── package.json                  # Project manifest
└── .env                          # Environment (gitignored)
```

## Development Workflow

### Running the Server

```bash
# Development mode (hot reload)
npm run dev

# Build for production
npm run build

# Run production build
npm start
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Compile TypeScript to JavaScript |
| `npm start` | Run production build |
| `npm run seed` | Seed medical guidelines to database |

### Development Tools

**Recommended VSCode Extensions:**
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- Docker
- Thunder Client (API testing)

## Code Style

### TypeScript Guidelines

1. **Use Strict Mode**

All TypeScript strict mode features are enabled in `tsconfig.json`.

2. **Type Everything**

```typescript
// ✅ Good
function calculateAge(birthYear: number): number {
  return new Date().getFullYear() - birthYear;
}

// ❌ Bad
function calculateAge(birthYear) {
  return new Date().getFullYear() - birthYear;
}
```

3. **Use Interfaces for Complex Types**

```typescript
// ✅ Good
interface TriageRequest {
  text?: string;
  image_url?: string;
  user_id: string;
  session_id?: string;
}

// ❌ Bad
type TriageRequest = {
  text?: any;
  image_url?: any;
  user_id: any;
};
```

4. **Avoid `any` Type**

```typescript
// ✅ Good
function parseJSON<T>(json: string): T {
  return JSON.parse(json) as T;
}

// ❌ Bad
function parseJSON(json: string): any {
  return JSON.parse(json);
}
```

### Naming Conventions

- **Classes:** PascalCase (`MedagenAgent`)
- **Functions:** camelCase (`processTriage`)
- **Variables:** camelCase (`triageResult`)
- **Constants:** UPPER_SNAKE_CASE (`SYSTEM_PROMPT`)
- **Files:** kebab-case (`agent-executor.ts`)
- **Types/Interfaces:** PascalCase (`TriageResult`)

### Code Organization

1. **Imports Order**

```typescript
// 1. Node.js built-ins
import { readFile } from 'fs/promises';

// 2. External dependencies
import { FastifyInstance } from 'fastify';
import { z } from 'zod';

// 3. Internal modules
import { MedagenAgent } from '../agent/agent-executor';
import { TriageRequest } from '../types';
```

2. **Function Order**

```typescript
class MyService {
  // 1. Constructor
  constructor() {}

  // 2. Public methods
  public async mainMethod() {}

  // 3. Private methods
  private helperMethod() {}
}
```

### Error Handling

Always use try-catch with proper logging:

```typescript
// ✅ Good
async function riskyOperation() {
  try {
    const result = await externalAPI();
    return result;
  } catch (error) {
    logger.error({ error }, 'Operation failed');
    throw new Error('Failed to complete operation');
  }
}

// ❌ Bad
async function riskyOperation() {
  const result = await externalAPI(); // Unhandled error
  return result;
}
```

### Logging Best Practices

Use structured logging with Pino:

```typescript
// ✅ Good
logger.info({ userId, sessionId }, 'Triage request received');
logger.error({ error, context }, 'Agent execution failed');

// ❌ Bad
console.log('Triage request received for user:', userId);
console.error('Error:', error.message);
```

## Testing

### Manual Testing

1. **Health Check**

```bash
curl http://localhost:7860/health
```

2. **Triage Endpoint**

```bash
curl -X POST http://localhost:7860/api/health-check \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Tôi bị đau đầu và sốt",
    "user_id": "test_user"
  }'
```

3. **Using Swagger UI**

Open http://localhost:7860/docs and test endpoints interactively.

### Unit Testing (Future)

Framework recommendation: Jest or Vitest

```typescript
// Example test structure (to be implemented)
describe('TriageRulesService', () => {
  it('should return emergency for chest pain', () => {
    const service = new TriageRulesService();
    const result = service.evaluateTriage({
      symptoms: ['chest_pain'],
      symptom_severity: 'severe',
      duration_days: 0
    });

    expect(result.triage_level).toBe('emergency');
    expect(result.red_flags).toContain('chest_pain');
  });
});
```

### Integration Testing (Future)

Test full API endpoints with real dependencies.

## Adding New Features

### Adding a New Tool

1. **Create Tool File**

```typescript
// src/mcp_tools/my-new-tool.ts
import { DynamicTool } from '@langchain/core/tools';
import { logger } from '../utils/logger';

export const myNewTool = new DynamicTool({
  name: "my_new_tool",
  description: `
    Sử dụng công cụ này khi cần...

    Input: JSON string với cấu trúc:
    {
      "param1": "value"
    }

    Output: Kết quả (JSON)
  `,
  func: async (input: string) => {
    try {
      const { param1 } = JSON.parse(input);

      // Your logic here
      const result = await myService.doSomething(param1);

      return JSON.stringify(result);
    } catch (error) {
      logger.error({ error }, 'Tool execution failed');
      return JSON.stringify({ error: 'Failed' });
    }
  }
});
```

2. **Export Tool**

```typescript
// src/mcp_tools/index.ts
export { myNewTool } from './my-new-tool';
```

3. **Register Tool with Agent**

```typescript
// src/agent/agent-executor.ts
import { myNewTool } from '../mcp_tools';

this.tools = [
  // ... existing tools
  myNewTool
];
```

4. **Update System Prompt**

```typescript
// src/agent/system-prompt.ts
export const SYSTEM_PROMPT = `
  ...
  BẠN CÓ QUYỀN TRUY CẬP CÁC CÔNG CỤ:
  - ...
  - my_new_tool: Mô tả công cụ mới
`;
```

### Adding a New Route

1. **Create Route File**

```typescript
// src/routes/my-feature.route.ts
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { logger } from '../utils/logger';

const requestSchema = z.object({
  param1: z.string(),
  param2: z.number().optional()
});

export async function myFeatureRoute(fastify: FastifyInstance) {
  fastify.post('/api/my-feature', async (request, reply) => {
    try {
      // Validate request
      const data = requestSchema.parse(request.body);

      logger.info({ data }, 'My feature request received');

      // Your logic here
      const result = await myService.process(data);

      return reply.send(result);
    } catch (error) {
      logger.error({ error }, 'My feature request failed');
      return reply.status(500).send({
        error: 'Internal Server Error',
        message: 'Failed to process request'
      });
    }
  });
}
```

2. **Register Route**

```typescript
// src/routes/index.ts
import { myFeatureRoute } from './my-feature.route';

export async function registerRoutes(fastify: FastifyInstance) {
  // ... existing routes
  await fastify.register(myFeatureRoute);
}
```

3. **Add Swagger Schema**

```typescript
// src/utils/swagger.ts
const swaggerOptions = {
  swagger: {
    // ... existing definitions
    '/api/my-feature': {
      post: {
        tags: ['My Feature'],
        summary: 'Process my feature',
        requestBody: {
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  param1: { type: 'string' },
                  param2: { type: 'number' }
                },
                required: ['param1']
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Success',
            content: {
              'application/json': {
                schema: { type: 'object' }
              }
            }
          }
        }
      }
    }
  }
};
```

### Adding a New Service

1. **Create Service File**

```typescript
// src/services/my-service.ts
import { logger } from '../utils/logger';
import { supabase } from './supabase.service';

export class MyService {
  async doSomething(param: string): Promise<Result> {
    try {
      logger.debug({ param }, 'Doing something');

      // Your logic
      const { data, error } = await supabase
        .from('my_table')
        .select('*')
        .eq('param', param);

      if (error) throw error;

      return data;
    } catch (error) {
      logger.error({ error }, 'Service operation failed');
      throw error;
    }
  }
}

// Export singleton instance
export const myService = new MyService();
```

2. **Use Service**

```typescript
import { myService } from '../services/my-service';

const result = await myService.doSomething('value');
```

## Debugging

### VSCode Launch Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Server",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "skipFiles": ["<node_internals>/**"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Debugging Tips

1. **Enable Verbose Logging**

```typescript
// Set in .env
LOG_LEVEL=debug

// Or in code
logger.level = 'debug';
```

2. **Agent Debugging**

LangChain agent already has verbose logging enabled:

```typescript
this.agentExecutor = new AgentExecutor({
  agent,
  tools: this.tools,
  verbose: true // Shows agent thinking
});
```

3. **Inspect Network Requests**

Use tools like:
- Thunder Client (VSCode extension)
- Postman
- curl with `-v` flag

```bash
curl -v http://localhost:7860/api/health-check \
  -H "Content-Type: application/json" \
  -d '{"text":"test","user_id":"debug"}'
```

4. **Database Queries**

Check Supabase dashboard:
- Logs tab for query logs
- Database tab to inspect data
- API tab to test queries

## Contributing

### Git Workflow

1. **Create Feature Branch**

```bash
git checkout -b feature/my-new-feature
```

2. **Make Changes**

Follow code style guidelines above.

3. **Commit Changes**

```bash
git add .
git commit -m "feat: add my new feature"
```

Commit message format:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `test:` - Adding tests
- `chore:` - Maintenance tasks

4. **Push to Remote**

```bash
git push origin feature/my-new-feature
```

5. **Create Pull Request**

Open PR on GitHub/GitLab with description of changes.

### Code Review Checklist

Before submitting PR:

- [ ] Code follows style guidelines
- [ ] TypeScript types are properly defined
- [ ] Error handling is implemented
- [ ] Logging is added for important operations
- [ ] No sensitive data in logs
- [ ] Swagger documentation updated (if API changed)
- [ ] README updated (if needed)
- [ ] Manual testing completed
- [ ] No console.log() statements (use logger instead)

### Common Pitfalls

1. **Forgetting to Handle Errors**

Always wrap external API calls in try-catch.

2. **Not Using Structured Logging**

Use Pino logger with context objects.

3. **Hardcoding Values**

Use environment variables for configuration.

4. **Not Validating Input**

Always validate with Zod schemas.

5. **Blocking the Event Loop**

Use async/await, avoid synchronous operations.

---

## Quick Reference

### Essential Commands

```bash
# Development
npm run dev          # Start dev server with hot reload
npm run build        # Compile TypeScript
npm start            # Run production build

# Database
npm run seed         # Seed guidelines

# Testing
curl http://localhost:7860/health    # Health check
```

### Important Files

- [src/index.ts](../src/index.ts) - Entry point
- [src/agent/agent-executor.ts](../src/agent/agent-executor.ts) - Agent core
- [src/routes/triage.route.ts](../src/routes/triage.route.ts) - Main endpoint
- [src/utils/config.ts](../src/utils/config.ts) - Configuration
- [.env](../.env) - Environment variables

### Useful Resources

- [Fastify Documentation](https://fastify.dev/)
- [LangChain JS Docs](https://js.langchain.com/)
- [Gemini API Docs](https://ai.google.dev/docs)
- [Supabase Docs](https://supabase.com/docs)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Questions?** Check the [main README](README.md) or open an issue.
