# Medagen Backend Documentation

Welcome to the Medagen Backend documentation. This directory contains comprehensive documentation for the medical AI triage assistant system.

## Documentation Structure

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture, design patterns, and technical overview
- **[API_REFERENCE.md](API_REFERENCE.md)** - Complete API endpoint documentation
- **[AGENT_SYSTEM.md](AGENT_SYSTEM.md)** - LangChain ReAct agent implementation details
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment guide and configuration
- **[DEVELOPMENT.md](DEVELOPMENT.md)** - Development setup and guidelines

## Quick Overview

**Medagen** is a production-ready medical AI triage assistant backend built with:

- **Runtime:** Node.js 18+ with TypeScript
- **Framework:** Fastify v5 (high-performance web framework)
- **AI Stack:** LangChain + Google Gemini 2.5 Flash
- **Database:** Supabase (Postgres + pgvector)
- **Architecture:** ReAct Agent Pattern with RAG

## Key Features

- **AI-Powered Triage** - Intelligent symptom analysis and triage level recommendation
- **Multi-Modal Input** - Supports text descriptions and medical images
- **Computer Vision** - Specialized CV models for dermatology, eye conditions, and wounds
- **RAG System** - Retrieval-augmented generation with medical guidelines
- **Conversation Memory** - Multi-turn conversations with context awareness
- **Safety-First Design** - Never diagnoses, always errs on side of caution
- **Clinic Finder** - Integrated Google Maps for nearest healthcare facilities

## Getting Started

1. Review [ARCHITECTURE.md](ARCHITECTURE.md) for system overview
2. Follow [DEPLOYMENT.md](DEPLOYMENT.md) for setup instructions
3. Refer to [API_REFERENCE.md](API_REFERENCE.md) for endpoint usage
4. Read [DEVELOPMENT.md](DEVELOPMENT.md) if contributing to the codebase

## Project Statistics

- **Total Lines of Code:** ~3,080 lines of TypeScript
- **API Endpoints:** 9 route modules
- **Agent Tools:** 5 specialized tools
- **Services:** 6 external integrations
- **Language:** Vietnamese (medical content)

## Architecture Highlights

```
User Request → Fastify API → Agent Orchestrator → Tools → Services → External APIs
                                     ↓
                             [ReAct Loop]
                                     ↓
                          Triage Response + Clinic Info
```

## Safety Guarantees

- ✅ Never provides medical diagnosis
- ✅ Never prescribes medication
- ✅ Applies deterministic red flag rules
- ✅ Over-triages when uncertain
- ✅ Graceful error handling with safe fallbacks

## License

[Add your license information here]

## Support

For issues and questions, please refer to the project repository or contact the development team.

---

Last Updated: 2025-11-21
