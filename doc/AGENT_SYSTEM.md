# Agent System Documentation

This document provides in-depth details about the LangChain ReAct agent implementation in Medagen.

## Table of Contents

- [Overview](#overview)
- [ReAct Pattern](#react-pattern)
- [Agent Components](#agent-components)
- [System Prompt](#system-prompt)
- [Tools](#tools)
- [Conversation Context](#conversation-context)
- [Output Parsing](#output-parsing)
- [Error Handling](#error-handling)

## Overview

The Medagen agent is built using **LangChain JS** and follows the **ReAct (Reasoning + Acting)** pattern. It uses **Google Gemini 2.5 Flash** as the underlying LLM and has access to 5 specialized tools.

**Key Files:**
- [src/agent/agent-executor.ts](../src/agent/agent-executor.ts) - Main agent orchestrator
- [src/agent/system-prompt.ts](../src/agent/system-prompt.ts) - Agent instructions
- [src/agent/gemini-llm.ts](../src/agent/gemini-llm.ts) - Custom Gemini wrapper
- [src/agent/gemini-embedding.ts](../src/agent/gemini-embedding.ts) - Embedding model

## ReAct Pattern

ReAct stands for **Reasoning + Acting**. The agent alternates between thinking (reasoning) and acting (using tools) until it reaches a final answer.

### ReAct Loop

```
┌─────────────────────────────────────────┐
│  1. Input: User symptom description    │
└────────────────┬────────────────────────┘
                 ↓
         ┌───────────────┐
         │   THOUGHT     │ ← "I need to analyze the image"
         └───────┬───────┘
                 ↓
         ┌───────────────┐
         │    ACTION     │ ← Use "derm_cv" tool
         └───────┬───────┘
                 ↓
         ┌───────────────┐
         │  OBSERVATION  │ ← Tool returns results
         └───────┬───────┘
                 ↓
         ┌───────────────┐
         │   THOUGHT     │ ← "Now I need to check severity"
         └───────┬───────┘
                 ↓
         ┌───────────────┐
         │    ACTION     │ ← Use "triage_rules" tool
         └───────┬───────┘
                 ↓
         ┌───────────────┐
         │  OBSERVATION  │ ← Tool returns triage level
         └───────┬───────┘
                 ↓
         ┌───────────────┐
         │   THOUGHT     │ ← "I have enough information"
         └───────┬───────┘
                 ↓
┌─────────────────────────────────────────┐
│  Final Answer: JSON triage result      │
└─────────────────────────────────────────┘
```

### Implementation

```typescript
// src/agent/agent-executor.ts
export class MedagenAgent {
  private llm: GeminiLLM;
  private tools: DynamicTool[];
  private agentExecutor: AgentExecutor;

  constructor(/* dependencies */) {
    // Initialize LLM
    this.llm = new GeminiLLM({
      apiKey: config.geminiApiKey,
      modelName: 'gemini-2.5-flash'
    });

    // Initialize tools
    this.tools = [
      cvTools.dermCVTool,
      cvTools.eyeCVTool,
      cvTools.woundCVTool,
      triageTool,
      ragTool
    ];

    // Create ReAct agent
    const agent = createReactAgent({
      llm: this.llm,
      tools: this.tools,
      prompt: ChatPromptTemplate.fromMessages([
        ['system', SYSTEM_PROMPT],
        ['human', '{input}'],
        ['assistant', '{agent_scratchpad}']
      ])
    });

    // Wrap in executor with max iterations
    this.agentExecutor = new AgentExecutor({
      agent,
      tools: this.tools,
      maxIterations: 5,
      verbose: true
    });
  }
}
```

## Agent Components

### 1. GeminiLLM Wrapper

Custom LangChain LLM implementation for Gemini:

```typescript
// src/agent/gemini-llm.ts
export class GeminiLLM extends BaseLLM {
  private genAI: GoogleGenerativeAI;
  private modelName: string = 'gemini-2.5-flash';

  async _call(prompt: string): Promise<string> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName
    });

    const result = await model.generateContent(prompt);
    return result.response.text();
  }

  _llmType(): string {
    return 'gemini';
  }
}
```

### 2. Embedding Model

Used for RAG guideline retrieval:

```typescript
// src/agent/gemini-embedding.ts
export class GeminiEmbedding extends Embeddings {
  private genAI: GoogleGenerativeAI;
  private modelName: string = 'text-embedding-004';

  async embedQuery(text: string): Promise<number[]> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName
    });

    const result = await model.embedContent(text);
    return result.embedding.values;
  }

  async embedDocuments(documents: string[]): Promise<number[][]> {
    return Promise.all(
      documents.map(doc => this.embedQuery(doc))
    );
  }
}
```

## System Prompt

The system prompt defines the agent's behavior, constraints, and output format.

**Full Prompt:** [src/agent/system-prompt.ts](../src/agent/system-prompt.ts)

### Key Instructions

```typescript
export const SYSTEM_PROMPT = `
Bạn là trợ lý y tế AI thông minh, chuyên phân loại mức độ cấp cứu...

QUAN TRỌNG - CÁC NGUYÊN TẮC AN TOÀN:
1. KHÔNG BAO GIỜ chẩn đoán bệnh cụ thể
2. KHÔNG BAO GIỜ kê đơn thuốc hoặc liều lượng
3. LUÔN khuyến nghị người dùng gặp bác sĩ khi không chắc chắn
4. Khi có nghi ngờ, LUÔN phân loại cao hơn về mức độ nghiêm trọng

BẠN CÓ QUYỀN TRUY CẬP CÁC CÔNG CỤ:
- derm_cv: Phân tích hình ảnh da liễu
- eye_cv: Phân tích hình ảnh mắt
- wound_cv: Phân tích vết thương
- triage_rules: Áp dụng quy tắc phân loại
- guideline_retrieval: Truy xuất hướng dẫn y tế

CHỈ DẪN SỬ DỤNG CÔNG CỤ:
1. Nếu có image_url, SỬ DỤNG công cụ CV phù hợp TRƯỚC
2. SAU ĐÓ, SỬ DỤNG triage_rules để đánh giá mức độ nghiêm trọng
3. Nếu cần thêm thông tin, SỬ DỤNG guideline_retrieval

ĐỊNH DẠNG ĐẦU RA - JSON:
{
  "triage_level": "emergency" | "urgent" | "routine" | "self_care",
  "symptom_summary": "Tóm tắt triệu chứng",
  "red_flags": ["Các dấu hiệu nguy hiểm"],
  "suspected_conditions": ["Các tình trạng nghi ngờ"],
  "cv_findings": { /* Nếu có sử dụng CV */ },
  "recommendation": "Khuyến nghị cụ thể"
}
`;
```

### Safety Constraints

1. **Never Diagnose**: Agent cannot provide specific medical diagnoses
2. **Never Prescribe**: No medication recommendations or dosages
3. **Always Recommend Doctor**: When uncertain, advise seeing a physician
4. **Over-Triage**: When in doubt, escalate severity level

### Triage Level Definitions

```typescript
// Defined in system prompt
{
  "emergency": "Cần cấp cứu ngay lập tức (đau ngực, khó thở nghiêm trọng, mất ý thức)",
  "urgent": "Cần khám trong 24 giờ (sốt cao kéo dài, đau dữ dội, vết thương sâu)",
  "routine": "Cần khám trong vài ngày (triệu chứng nhẹ đến trung bình)",
  "self_care": "Có thể tự chăm sóc tại nhà với theo dõi"
}
```

## Tools

The agent has access to 5 tools. Each tool is a `DynamicTool` instance.

### 1. Dermatology CV Tool

**File:** [src/mcp_tools/cv-tools.ts](../src/mcp_tools/cv-tools.ts:5-25)

```typescript
export const dermCVTool = new DynamicTool({
  name: "derm_cv",
  description: `
    Sử dụng công cụ này khi bạn cần phân tích hình ảnh da liễu.

    Input: JSON string với cấu trúc:
    {
      "image_url": "https://..."
    }

    Output: Kết quả phân tích da liễu (JSON)
  `,
  func: async (input: string) => {
    try {
      const { image_url } = JSON.parse(input);
      const result = await cvService.analyzeDermatology(image_url);
      return JSON.stringify(result);
    } catch (error) {
      return JSON.stringify({ error: "Không thể phân tích hình ảnh" });
    }
  }
});
```

### 2. Eye CV Tool

Similar to dermatology but for eye conditions.

**File:** [src/mcp_tools/cv-tools.ts](../src/mcp_tools/cv-tools.ts:27-47)

### 3. Wound CV Tool

Similar to dermatology but for wound/injury analysis.

**File:** [src/mcp_tools/cv-tools.ts](../src/mcp_tools/cv-tools.ts:49-69)

### 4. Triage Rules Tool

**File:** [src/mcp_tools/triage-tool.ts](../src/mcp_tools/triage-tool.ts)

```typescript
export const triageTool = new DynamicTool({
  name: "triage_rules",
  description: `
    Sử dụng công cụ này để áp dụng quy tắc phân loại cấp cứu.

    Input: JSON string với cấu trúc:
    {
      "symptoms": ["đau đầu", "sốt"],
      "symptom_severity": "mild" | "moderate" | "severe",
      "duration_days": 3,
      "vital_signs": {
        "temperature_celsius": 38.5
      },
      "patient_info": {
        "age": 45,
        "chronic_conditions": ["đái tháo đường"]
      }
    }

    Output: Mức độ phân loại và giải thích (JSON)
  `,
  func: async (input: string) => {
    try {
      const data = JSON.parse(input);
      const result = await triageRulesService.evaluateTriage(data);
      return JSON.stringify(result);
    } catch (error) {
      // Safe fallback: always return "urgent" on error
      return JSON.stringify({
        triage_level: "urgent",
        reasoning: "Không thể đánh giá chính xác, khuyến nghị gặp bác sĩ"
      });
    }
  }
});
```

**Red Flag Detection:**

```typescript
// src/services/triage-rules.service.ts
private checkRedFlags(data: TriageInput): string[] {
  const redFlags: string[] = [];

  // Critical symptoms
  if (data.symptoms.includes('chest_pain')) {
    redFlags.push('chest_pain');
  }
  if (data.symptoms.includes('difficulty_breathing')) {
    redFlags.push('breathing_difficulty');
  }
  if (data.symptoms.includes('vision_loss')) {
    redFlags.push('vision_loss');
  }

  // High fever
  if (data.vital_signs?.temperature_celsius >= 39.0) {
    redFlags.push('high_fever');
  }

  // Severe symptoms
  if (data.symptom_severity === 'severe') {
    redFlags.push('severe_symptoms');
  }

  return redFlags;
}
```

### 5. Guideline Retrieval Tool (RAG)

**File:** [src/mcp_tools/rag-tool.ts](../src/mcp_tools/rag-tool.ts)

```typescript
export const ragTool = new DynamicTool({
  name: "guideline_retrieval",
  description: `
    Sử dụng công cụ này để truy xuất hướng dẫn y tế từ cơ sở tri thức.

    Input: JSON string với cấu trúc:
    {
      "query": "cách xử lý vết thương hở",
      "top_k": 5
    }

    Output: Danh sách các đoạn hướng dẫn liên quan (JSON)
  `,
  func: async (input: string) => {
    const { query, top_k = 5 } = JSON.parse(input);
    const results = await ragService.search(query, top_k);
    return JSON.stringify({ guidelines: results });
  }
});
```

**RAG Service Implementation:**

```typescript
// src/services/rag.service.ts
class RAGService {
  private embeddingModel: GeminiEmbedding;

  async search(query: string, topK: number = 5): Promise<string[]> {
    // Create vector store
    const vectorStore = await SupabaseVectorStore.fromExistingIndex(
      this.embeddingModel,
      {
        client: supabase,
        tableName: 'guidelines',
        queryName: 'match_guidelines'
      }
    );

    // Perform similarity search
    const results = await vectorStore.similaritySearch(query, topK);

    // Return page contents
    return results.map(doc => doc.pageContent);
  }

  async seedGuidelines(documents: Document[]): Promise<void> {
    // Embed and store in Supabase pgvector
    await SupabaseVectorStore.fromDocuments(
      documents,
      this.embeddingModel,
      {
        client: supabase,
        tableName: 'guidelines'
      }
    );
  }
}
```

## Conversation Context

The agent receives conversation history from previous turns to understand context.

### Implementation

```typescript
// src/agent/agent-executor.ts
async processTriage(request: TriageRequest): Promise<TriageResult> {
  // Build context with conversation history
  const conversationContext = await this.conversationHistoryService
    .getConversationContext(request.session_id, request.user_id);

  // Build full input
  const input = `
${conversationContext}

Current request:
- Text: ${request.text || 'N/A'}
- Image URL: ${request.image_url || 'N/A'}
- User ID: ${request.user_id}
`;

  // Run agent
  const agentResult = await this.agentExecutor.invoke({ input });

  // Save conversation
  await this.conversationHistoryService.saveMessage(
    request.session_id || uuidv4(),
    request.user_id,
    'user',
    request.text || '[Image]'
  );

  await this.conversationHistoryService.saveMessage(
    request.session_id || uuidv4(),
    request.user_id,
    'assistant',
    agentResult.output
  );

  return this.parseTriageResult(agentResult.output);
}
```

### Conversation History Service

```typescript
// src/services/conversation-history.service.ts
class ConversationHistoryService {
  async getConversationContext(
    sessionId?: string,
    userId?: string
  ): Promise<string> {
    if (!sessionId || !userId) {
      return "Đây là cuộc trò chuyện đầu tiên.";
    }

    // Retrieve last 5 messages
    const { data: messages } = await supabase
      .from('conversation_history')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (!messages || messages.length === 0) {
      return "Đây là cuộc trò chuyện đầu tiên.";
    }

    // Format as conversation
    const conversation = messages
      .reverse()
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');

    return `Lịch sử hội thoại:\n${conversation}\n`;
  }
}
```

## Output Parsing

The agent returns a JSON string which must be parsed into a structured `TriageResult`.

### Parser Implementation

```typescript
// src/agent/agent-executor.ts
private parseTriageResult(output: string): TriageResult {
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = output.match(/```json\n([\s\S]*?)\n```/);
    const jsonString = jsonMatch ? jsonMatch[1] : output;

    // Parse JSON
    const parsed = JSON.parse(jsonString);

    // Validate required fields
    if (!parsed.triage_level || !parsed.symptom_summary) {
      throw new Error('Missing required fields');
    }

    return {
      triage_level: parsed.triage_level,
      symptom_summary: parsed.symptom_summary,
      red_flags: parsed.red_flags || [],
      suspected_conditions: parsed.suspected_conditions || [],
      cv_findings: parsed.cv_findings,
      recommendation: parsed.recommendation || 'Vui lòng gặp bác sĩ'
    };
  } catch (error) {
    logger.error({ error, output }, 'Failed to parse agent output');

    // Safe fallback
    return {
      triage_level: 'urgent',
      symptom_summary: 'Không thể phân tích chính xác',
      red_flags: [],
      suspected_conditions: [],
      recommendation: 'Vui lòng đến cơ sở y tế để được khám'
    };
  }
}
```

### Example Agent Output

```json
{
  "triage_level": "urgent",
  "symptom_summary": "Bệnh nhân bị đau đầu kéo dài 3 ngày kèm sốt cao 38.5°C",
  "red_flags": ["high_fever", "prolonged_headache"],
  "suspected_conditions": [
    "Nhiễm trùng hô hấp",
    "Viêm xoang"
  ],
  "cv_findings": null,
  "recommendation": "Bạn nên đến cơ sở y tế trong vòng 24 giờ để được khám và điều trị. Sốt cao kéo dài cần được đánh giá bởi bác sĩ để loại trừ các nhiễm trùng nghiêm trọng."
}
```

## Error Handling

### Graceful Degradation

```typescript
// src/agent/agent-executor.ts
async processTriage(request: TriageRequest): Promise<TriageResult> {
  try {
    // Build context
    const context = await this.buildContext(request);

    // Run agent with timeout
    const agentResult = await Promise.race([
      this.agentExecutor.invoke({ input: context }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), 30000)
      )
    ]);

    return this.parseTriageResult(agentResult.output);
  } catch (error) {
    logger.error({ error }, 'Agent execution failed');

    // CRITICAL: Always return safe fallback
    return {
      triage_level: 'urgent',
      symptom_summary: 'Không thể phân tích chính xác triệu chứng',
      red_flags: [],
      suspected_conditions: [],
      recommendation: 'Vui lòng đến cơ sở y tế để được bác sĩ thăm khám trực tiếp. Hệ thống không thể đánh giá chính xác trong trường hợp này.'
    };
  }
}
```

### Tool Error Handling

Each tool has its own error handling:

```typescript
// Example: CV Tool error handling
func: async (input: string) => {
  try {
    const { image_url } = JSON.parse(input);
    const result = await cvService.analyzeDermatology(image_url);
    return JSON.stringify(result);
  } catch (error) {
    logger.warn({ error }, 'CV analysis failed');

    // Return empty result, agent can continue without it
    return JSON.stringify({
      error: "Không thể phân tích hình ảnh",
      predictions: []
    });
  }
}
```

### Logging

All agent actions are logged:

```typescript
logger.info({ request }, 'Starting triage processing');
logger.debug({ tools: this.tools.map(t => t.name) }, 'Available tools');
logger.info({ output: agentResult.output }, 'Agent completed');
logger.error({ error }, 'Agent execution failed');
```

---

## Agent Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     User Request                            │
│  - text: "Tôi bị đau đầu và sốt"                            │
│  - image_url: null                                          │
│  - user_id: "user_123"                                      │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│               Get Conversation Context                      │
│  - Retrieve last 5 messages from DB                         │
│  - Format as conversation string                            │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                  Build Agent Input                          │
│  - Prepend conversation history                             │
│  - Add current request                                      │
│  - Add system prompt                                        │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                   ReAct Loop Start                          │
└────────────────────┬────────────────────────────────────────┘
                     ↓
         ┌───────────────────────┐
         │   THOUGHT             │
         │  "Cần kiểm tra mức độ │
         │   nghiêm trọng"       │
         └───────┬───────────────┘
                 ↓
         ┌───────────────────────┐
         │   ACTION              │
         │  Use: triage_rules    │
         │  Input: {             │
         │    symptoms: [...],   │
         │    severity: "mod"    │
         │  }                    │
         └───────┬───────────────┘
                 ↓
         ┌───────────────────────┐
         │  OBSERVATION          │
         │  {                    │
         │    triage_level:      │
         │      "urgent",        │
         │    red_flags: [...]   │
         │  }                    │
         └───────┬───────────────┘
                 ↓
         ┌───────────────────────┐
         │   THOUGHT             │
         │  "Cần thêm hướng dẫn" │
         └───────┬───────────────┘
                 ↓
         ┌───────────────────────┐
         │   ACTION              │
         │  Use: guideline_...   │
         │  Input: {             │
         │    query: "đau đầu    │
         │             sốt"      │
         │  }                    │
         └───────┬───────────────┘
                 ↓
         ┌───────────────────────┐
         │  OBSERVATION          │
         │  {                    │
         │    guidelines: [...]  │
         │  }                    │
         └───────┬───────────────┘
                 ↓
         ┌───────────────────────┐
         │   THOUGHT             │
         │  "Đủ thông tin"       │
         └───────┬───────────────┘
                 ↓
┌─────────────────────────────────────────────────────────────┐
│                     Final Answer                            │
│  {                                                          │
│    triage_level: "urgent",                                  │
│    symptom_summary: "Đau đầu kèm sốt",                      │
│    red_flags: ["high_fever"],                               │
│    recommendation: "Gặp bác sĩ trong 24h"                   │
│  }                                                          │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                  Parse JSON Output                          │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│              Save to Conversation History                   │
└────────────────────┬────────────────────────────────────────┘
                     ↓
┌─────────────────────────────────────────────────────────────┐
│                  Return to Client                           │
└─────────────────────────────────────────────────────────────┘
```

---

**Next:** Read [DEPLOYMENT.md](DEPLOYMENT.md) for deployment instructions.
