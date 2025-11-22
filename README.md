---
title: Medagen Backend
emoji: 🏥
colorFrom: pink
colorTo: pink
sdk: docker
pinned: false
---

# Medagen - AI Medical Triage Assistant

**Intelligent, accessible, and transparent medical triage powered by AI**

> Democratizing healthcare access in Vietnam and emerging markets through AI-powered triage

---

## 📚 Documentation

**Comprehensive project documentation is available in the `/docs` folder:**

👉 **[View Full Documentation](./docs/README.md)** 👈

### Quick Links

- **[Problem Statement & Solution](./docs/README.md#-problem-statement)** - Healthcare challenges in Vietnam and how Medagen addresses them
- **[Patient Intake System](./docs/01-patient-intake-system.md)** - Interactive body map, image upload, multi-step wizard
- **[AI Triage Engine](./docs/02-ai-triage-engine.md)** - ReAct Agent with transparent reasoning (Gemini + LangChain)
- **[Computer Vision System](./docs/03-computer-vision-system.md)** - 3-tier medical image analysis (derm/eye/wound)
- **[RAG Knowledge System](./docs/04-rag-knowledge-system.md)** - Vector search, Vietnam medical guidelines
- **[Real-Time Chat & WebSocket](./docs/05-real-time-chat-websocket.md)** - Streaming ReAct flow, session management
- **[UI Components](./docs/06-ui-components-architecture.md)** - Design system, responsive mobile-first UI

---

## 🚀 Quick Start

### Backend

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with your API keys

# Run development server
npm run dev
```

**Access**: `http://localhost:7860`  
**API Docs**: `http://localhost:7860/docs`

### Frontend

```bash
cd frontend

# Install dependencies
pnpm install

# Run development server
pnpm dev
```

**Access**: `http://localhost:3000`

---

## 🎯 Key Features

- ✅ **AI-Powered Triage**: Gemini 2.5 Flash + ReAct framework for transparent reasoning
- ✅ **3-Tier Computer Vision**: Specialized models for dermatology, ophthalmology, wound care
- ✅ **RAG Knowledge System**: Vietnam Ministry of Health guidelines + WHO protocols
- ✅ **Real-Time Streaming**: WebSocket-based ReAct flow visualization
- ✅ **Visual Symptom Input**: Interactive body map + image upload
- ✅ **Multi-Language**: Vietnamese + English support
- ✅ **Session Memory**: Context-aware conversations

---

## 🛠️ Tech Stack

**Backend**: Fastify, LangChain, Gemini 2.5 Flash, Supabase (PostgreSQL + pgvector)  
**Frontend**: Next.js 16, TypeScript, Tailwind CSS, shadcn/ui, Framer Motion

---

## 📄 License

Private and proprietary.

---

**Built with ❤️ for accessible healthcare**

For detailed information, see the [documentation](./docs/README.md).

