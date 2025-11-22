# MEDAGEN Backend

Backend API cho hệ thống AI Triage Assistant, sử dụng LangChain ReAct Agent với Gemini 2.5Flash.

## 🎯 Tính năng

- ✅ ReAct Agent với Gemini 2.5Flash
- ✅ Computer Vision Tools (Dermatology, Eye, Wound)
- ✅ Triage Rules Engine (deterministic safety rules)
- ✅ RAG với Supabase Vector (Guideline-based recommendations)
- ✅ Google Maps integration (nearest clinic finder)
- ✅ Supabase integration (Auth, Database, Storage)

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Framework**: Fastify
- **Agent**: LangChainJS
- **LLM**: Gemini 2.5Flash (Google AI Studio)
- **Embedding**: Gemini text-embedding-004
- **Vector DB**: Supabase pgvector
- **Database**: Supabase Postgres
- **Language**: TypeScript

## 📁 Project Structure

```
src/
├── agent/              # LangChain Agent (GeminiLLM, System Prompt)
├── mcp_tools/          # Tools for Agent (CV, Triage, RAG)
├── services/           # External APIs & Database services
├── routes/             # HTTP API routes
├── scripts/            # Migration & Seeding scripts
├── types/              # TypeScript types
└── utils/              # Configuration & Logger
```

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone <repo-url>
cd Medagen
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp env.example .env
```

Required environment variables:
- `GEMINI_API_KEY`: Google AI Studio API key
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_KEY`: Supabase service role key
- `SUPABASE_ANON_KEY`: Supabase anon key
- `GOOGLE_MAPS_API_KEY`: Google Maps API key (optional)
- `DERM_CV_API_URL`: Dermatology CV model endpoint (optional)
- `EYE_CV_API_URL`: Eye CV model endpoint (optional)
- `WOUND_CV_API_URL`: Wound CV model endpoint (optional)

### 3. Database Migration

Run Supabase migration to create tables:

```bash
npm run migrate
```

### 4. Seed Guidelines (Optional)

Seed sample medical guidelines:

```bash
npm run seed
```

### 5. Start Development Server

```bash
kill -9 $(lsof -t -i :7860)
npm run dev
```

Server will start at `http://localhost:3000`

## 📡 API Endpoints

### Health Check

```bash
GET /health
```

Response:
```json
{
  "status": "ok",
  "llm": "gemini-2.5-flash",
  "cv_services": {
    "derm_cv": "unknown",
    "eye_cv": "unknown",
    "wound_cv": "unknown"
  }
}
```

### Triage Request

```bash
POST /api/health-check
Content-Type: application/json

{
  "text": "Mắt trái đỏ và hơi mờ 2 ngày nay",
  "image_url": "https://supabase.../image.jpg",
  "user_id": "abc123",
  "location": {
    "lat": 10.78,
    "lng": 106.7
  }
}
```

Response:
```json
{
  "triage_level": "urgent",
  "symptom_summary": "Mắt đỏ kèm giảm thị lực nhẹ kéo dài 2 ngày",
  "red_flags": ["Thay đổi thị lực nhẹ"],
  "suspected_conditions": [
    {
      "name": "Viêm kết mạc",
      "source": "cv_model",
      "confidence": "medium"
    }
  ],
  "cv_findings": {
    "model_used": "eye_cv",
    "raw_output": {}
  },
  "recommendation": {
    "action": "Khám bác sĩ chuyên khoa mắt",
    "timeframe": "Trong vòng 24 giờ",
    "home_care_advice": "Vệ sinh mắt bằng nước muối sinh lý",
    "warning_signs": "Nếu thị lực giảm nhiều hơn, đến cấp cứu ngay"
  },
  "nearest_clinic": {
    "name": "Bệnh viện Mắt TP.HCM",
    "distance_km": 2.5,
    "address": "280 Điện Biên Phủ, Q3",
    "rating": 4.5
  }
}
```

## 🧪 Testing

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test triage endpoint
curl -X POST http://localhost:3000/api/health-check \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Đau đầu nhẹ",
    "user_id": "test123"
  }'
```

## 📦 Deployment

### Hugging Face Spaces

1. Create a new Space (SDK: Docker or Node.js)
2. Add environment secrets in Settings
3. Push code to the Space repository
4. Space will auto-build and deploy

### Docker

```bash
docker build -t medagen-backend .
docker run -p 3000:3000 --env-file .env medagen-backend
```

## 🔒 Safety Features

- ❌ Never diagnoses diseases
- ❌ Never prescribes medication
- ✅ Only provides triage level and safe recommendations
- ✅ Always over-triages when uncertain
- ✅ Guideline-based responses only

## 📝 Development

```bash
# Install dependencies
npm install

# Run in development mode (with hot reload)
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Run migration
npm run migrate

# Seed sample data
npm run seed
```

## 🤝 Contributing

This is a medical AI system. All changes must be reviewed for safety and accuracy.

## 📄 License

MIT

