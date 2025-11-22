# 🩺 MEDAGEN - AI Medical Triage Assistant

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.2-black.svg)](https://www.fastify.io/)

> **Intelligent medical triage system powered by LangChain ReAct Agent and Google Gemini 2.5 Flash**

An AI-powered backend API that provides safe, guideline-based medical triage recommendations using multi-modal analysis (text + images), retrieval-augmented generation (RAG), and deterministic safety rules.

## ✨ Features

- 🤖 **ReAct Agent** with Google Gemini 2.5 Flash for intelligent reasoning
- 👁️ **Computer Vision** integration for dermatology, eye, and wound analysis
- 📋 **Triage Rules Engine** with deterministic safety guardrails
- 📚 **RAG System** using Supabase pgvector for guideline-based recommendations
- 🗺️ **Location Services** to find nearest medical facilities
- 💬 **Multi-turn Conversations** with context awareness
- 🔒 **Safety-first Design** - never diagnoses, only triages

## 🏗️ Architecture

### Tech Stack

| Component | Technology |
|-----------|-----------|
| **Runtime** | Node.js 18+ |
| **Framework** | Fastify 5.2 |
| **Language** | TypeScript 5.7 |
| **AI Agent** | LangChain ReAct |
| **LLM** | Google Gemini 2.5 Flash |
| **Embeddings** | Gemini text-embedding-004 |
| **Vector DB** | Supabase pgvector |
| **Database** | PostgreSQL (Supabase) |
| **CV Models** | HuggingFace Spaces |
| **Maps** | Google Maps API |

### MCP Tools (Model Context Protocol)

1. **MCP CV** - Computer Vision analysis for medical images
2. **MCP RAG** - Retrieval-Augmented Generation for guidelines
3. **MCP CSDL** - Structured Knowledge Base queries
4. **Triage Rules** - Deterministic safety rules engine

## 📁 Project Structure

```
medagen-backend/
├── src/
│   ├── agent/              # LangChain ReAct Agent
│   │   ├── agent-executor.ts       # Main agent orchestrator
│   │   ├── gemini-llm.ts          # Gemini LLM wrapper
│   │   ├── gemini-embedding.ts    # Embedding service
│   │   ├── system-prompt.ts       # Agent system prompt
│   │   └── websocket-callback.handler.ts
│   ├── services/           # MCP Tools & External Services
│   │   ├── cv.service.ts          # MCP CV - Computer Vision
│   │   ├── rag.service.ts         # MCP RAG - Guidelines
│   │   ├── knowledge-base.service.ts  # MCP CSDL - Structured KB
│   │   ├── triage-rules.service.ts    # Deterministic rules
│   │   ├── intent-classifier.service.ts
│   │   ├── conversation-history.service.ts
│   │   ├── supabase.service.ts
│   │   └── maps.service.ts
│   ├── routes/             # API Routes
│   │   ├── triage.route.ts
│   │   ├── conversation.route.ts
│   │   └── websocket.route.ts
│   ├── scripts/            # Database & Seeding
│   │   └── seed-guidelines.ts
│   ├── types/              # TypeScript Definitions
│   ├── utils/              # Configuration & Utilities
│   │   ├── config.ts
│   │   ├── logger.ts
│   │   └── swagger.ts
│   └── index.ts            # Application Entry Point
├── data/                   # Medical Guidelines Data
├── migration.sql           # Supabase Database Schema
├── Dockerfile             # Docker Configuration
├── package.json
├── tsconfig.json
└── README.md
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Supabase account
- Google AI Studio API key

### Installation

```bash
# Clone repository
git clone https://github.com/your-username/medagen-backend.git
cd medagen-backend

# Install dependencies
npm install

# Copy environment template
cp env.example .env
```

### Environment Configuration

Create a `.env` file with the following variables:

```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# Optional
GOOGLE_MAPS_API_KEY=your_maps_api_key
CV_ENDPOINT=https://thuonguyenvan-medagenn.hf.space
PORT=7860
LOG_LEVEL=info
```

### Database Setup

1. **Run Migration**: Execute `migration.sql` in your Supabase SQL Editor

2. **Seed Data** (Optional):
```bash
npm run seed
```

### Development

```bash
# Start development server with hot reload
npm run dev

# Server runs at http://localhost:7860
```

### Production Build

```bash
# Build TypeScript
npm run build

# Start production server
npm start
```

## 📡 API Documentation

### Base URL
```
http://localhost:7860
```

### Endpoints

#### 1. Health Check
```http
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "llm": "gemini-2.5-flash",
  "cv_services": {
    "derm_cv": "connected"
  }
}
```

#### 2. Triage Request
```http
POST /api/health-check
Content-Type: application/json
```

**Request Body:**
```json
{
  "text": "Mặt nổi nhiều mụn trứng cá, đỏ và sưng",
  "image_url": "https://example.com/image.jpg",  // Optional
  "user_id": "user123",
  "session_id": "session-uuid",  // Optional, for multi-turn
  "location": {  // Optional
    "lat": 10.7769,
    "lng": 106.7009
  }
}
```

**Response:**
```json
{
  "triage_level": "routine",
  "symptom_summary": "Mụn trứng cá trên mặt với dấu hiệu viêm",
  "red_flags": [],
  "suspected_conditions": [
    {
      "name": "Acne and Rosacea",
      "source": "cv_model",
      "confidence": "high"
    }
  ],
  "cv_findings": {
    "model_used": "derm_cv",
    "raw_output": {
      "top_predictions": [
        {"condition": "Acne and Rosacea", "probability": 0.87}
      ]
    }
  },
  "recommendation": {
    "action": "Tham khảo bác sĩ da liễu để được tư vấn điều trị phù hợp",
    "timeframe": "Trong vòng 1-2 tuần",
    "home_care_advice": "Vệ sinh da sạch sẽ, tránh nặn mụn",
    "warning_signs": "Nếu mụn lan rộng hoặc sưng đau nhiều, hãy gặp bác sĩ sớm hơn"
  },
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "nearest_clinic": {
    "name": "Bệnh viện Da liễu TP.HCM",
    "distance_km": 3.2,
    "address": "2 Nguyễn Thông, Q3, TP.HCM",
    "rating": 4.5
  }
}
```

#### 3. Swagger Documentation
```http
GET /documentation
```

Interactive API documentation with Swagger UI.

## 🧪 Testing

### Manual Testing

```bash
# Health check
curl http://localhost:7860/health

# Triage request (text only)
curl -X POST http://localhost:7860/api/health-check \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Đau đầu nhẹ kèm sốt",
    "user_id": "test123"
  }'

# Triage with image
curl -X POST http://localhost:7860/api/health-check \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Da tay nổi mẩn đỏ ngứa",
    "image_url": "https://example.com/rash.jpg",
    "user_id": "test123"
  }'
```

### Automated Testing

```bash
# Run test suite
npx tsx test_api_usecases.js
```

## 🐳 Docker Deployment

### Build Image

```bash
docker build -t medagen-backend .
```

### Run Container

```bash
docker run -d \
  -p 7860:7860 \
  -e GEMINI_API_KEY=your_key \
  -e SUPABASE_URL=your_url \
  -e SUPABASE_SERVICE_KEY=your_key \
  -e SUPABASE_ANON_KEY=your_key \
  --name medagen \
  medagen-backend
```

### Docker Compose

```yaml
version: '3.8'
services:
  medagen:
    build: .
    ports:
      - "7860:7860"
    env_file:
      - .env
    restart: unless-stopped
```

## ☁️ Deployment to HuggingFace Spaces

### Method 1: Direct Push

1. Create a new Space on HuggingFace (SDK: Docker)
2. Clone the Space repository
3. Copy all files to the Space repo
4. Add secrets in Space Settings:
   - `GEMINI_API_KEY`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_KEY`
   - `SUPABASE_ANON_KEY`
   - `GOOGLE_MAPS_API_KEY` (optional)
5. Push to HuggingFace:
   ```bash
   git push
   ```

### Method 2: GitHub Sync

1. Push code to GitHub
2. Create HuggingFace Space
3. Link GitHub repository in Space settings
4. Add environment secrets
5. Space will auto-sync and deploy

### Required Files for HF Spaces

- ✅ `Dockerfile` - Container configuration
- ✅ `.dockerignore` - Exclude unnecessary files
- ✅ `README.md` - Space documentation
- ✅ All source code and dependencies

## 🔒 Safety & Compliance

### Medical Safety Guardrails

- ❌ **Never diagnoses** - Only provides triage levels
- ❌ **Never prescribes** - No medication recommendations
- ❌ **Never replaces doctors** - Always recommends professional consultation
- ✅ **Over-triages** - When uncertain, escalates to higher urgency
- ✅ **Guideline-based** - All responses backed by medical guidelines
- ✅ **Transparent** - Shows confidence levels and sources

### Disclaimer

⚠️ **This system is for educational and informational purposes only. It does not provide medical diagnosis or treatment. Always consult qualified healthcare professionals for medical advice.**

## 🛠️ Development

### Available Scripts

```bash
npm run dev      # Start development server with hot reload
npm run build    # Build TypeScript to JavaScript
npm start        # Run production server
npm run seed     # Seed medical guidelines database
```

### Code Structure

- **Agent Layer**: LangChain ReAct agent orchestration
- **MCP Tools**: Modular tools for CV, RAG, Knowledge Base
- **Services**: External API integrations
- **Routes**: HTTP API endpoints
- **Utils**: Configuration, logging, validation

### Adding New Medical Guidelines

1. Place guideline files in `data/` directory
2. Run seeding script:
   ```bash
   npm run seed
   ```
3. Guidelines will be embedded and stored in Supabase

## 🤝 Contributing

Contributions are welcome! Please ensure:

1. All medical content is accurate and sourced
2. Safety guardrails are maintained
3. Tests pass before submitting PR
4. Code follows TypeScript best practices

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- **Google Gemini** - LLM and embeddings
- **LangChain** - Agent framework
- **Supabase** - Database and vector storage
- **HuggingFace** - Computer vision models
- **Fastify** - Web framework

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Built with ❤️ for safer, more accessible healthcare**

