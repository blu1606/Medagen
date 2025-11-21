# Deployment Guide

This document provides comprehensive deployment instructions for the Medagen Backend.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Local Development](#local-development)
- [Docker Deployment](#docker-deployment)
- [Production Deployment](#production-deployment)
- [Monitoring & Maintenance](#monitoring--maintenance)

## Prerequisites

### Required Software

- **Node.js** 18.0.0 or higher
- **npm** or **yarn** package manager
- **Git** for version control
- **Docker** (optional, for containerized deployment)

### Required Services

1. **Supabase Account**
   - Create a project at https://supabase.com
   - Note: Supabase URL, Anon Key, Service Role Key

2. **Google AI Studio API Key**
   - Create API key at https://makersuite.google.com/app/apikey
   - Enable Gemini API access

3. **Google Maps API Key** (optional)
   - Create API key at https://console.cloud.google.com
   - Enable Places API

4. **Computer Vision API Endpoints** (optional)
   - Dermatology CV endpoint
   - Eye CV endpoint
   - Wound CV endpoint

## Environment Configuration

### 1. Clone Repository

```bash
git clone <repository-url>
cd Medagen
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Create Environment File

Copy the example environment file:

```bash
cp env.example .env
```

### 4. Configure Environment Variables

Edit `.env` with your credentials:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google Gemini API
GEMINI_API_KEY=AIzaSy...

# Google Maps API (optional)
GOOGLE_MAPS_API_KEY=AIzaSy...

# Computer Vision Endpoints (optional)
DERM_CV_ENDPOINT=https://api.example.com/derm
EYE_CV_ENDPOINT=https://api.example.com/eye
WOUND_CV_ENDPOINT=https://api.example.com/wound

# Server Configuration
NODE_ENV=development
PORT=7860
```

### Environment Variables Reference

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `SUPABASE_URL` | Yes | Supabase project URL | - |
| `SUPABASE_ANON_KEY` | Yes | Supabase anonymous key | - |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key (admin) | - |
| `GEMINI_API_KEY` | Yes | Google Gemini API key | - |
| `GOOGLE_MAPS_API_KEY` | No | Google Maps API key for clinic finder | - |
| `DERM_CV_ENDPOINT` | No | Dermatology CV model endpoint | - |
| `EYE_CV_ENDPOINT` | No | Eye CV model endpoint | - |
| `WOUND_CV_ENDPOINT` | No | Wound CV model endpoint | - |
| `NODE_ENV` | No | Environment (development/production) | `development` |
| `PORT` | No | Server port | `7860` |

## Database Setup

### 1. Supabase Database Schema

Create the following tables in your Supabase SQL Editor:

#### Conversation History Table

```sql
CREATE TABLE IF NOT EXISTS conversation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_conversation_session ON conversation_history(session_id);
CREATE INDEX idx_conversation_user ON conversation_history(user_id);
CREATE INDEX idx_conversation_created ON conversation_history(created_at DESC);
```

#### Sessions Table

```sql
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user sessions
CREATE INDEX idx_sessions_user ON sessions(user_id);
```

#### Guidelines Table (for RAG)

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS guidelines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  metadata JSONB,
  embedding VECTOR(768),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for vector similarity search
CREATE INDEX idx_guidelines_embedding ON guidelines
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Match function for similarity search
CREATE OR REPLACE FUNCTION match_guidelines(
  query_embedding VECTOR(768),
  match_threshold FLOAT DEFAULT 0.5,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  metadata JSONB,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    guidelines.id,
    guidelines.content,
    guidelines.metadata,
    1 - (guidelines.embedding <=> query_embedding) AS similarity
  FROM guidelines
  WHERE 1 - (guidelines.embedding <=> query_embedding) > match_threshold
  ORDER BY guidelines.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;
```

### 2. Enable Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE guidelines ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own conversations
CREATE POLICY "Users can view own conversations"
  ON conversation_history FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own conversations"
  ON conversation_history FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can view own sessions
CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT
  USING (auth.uid()::text = user_id);

-- Policy: Anyone can read guidelines (public knowledge base)
CREATE POLICY "Anyone can read guidelines"
  ON guidelines FOR SELECT
  TO authenticated, anon
  USING (true);
```

### 3. Seed Medical Guidelines

Run the seeding script to populate the guidelines table:

```bash
npm run seed
```

This will:
1. Read `.txt` files from `data/` directory
2. Chunk text into ~500 character segments
3. Generate embeddings using Gemini text-embedding-004
4. Store in Supabase pgvector

**Guideline Files:**
- [data/viem-ket-mac.txt](../data/viem-ket-mac.txt) - Conjunctivitis guideline
- [data/cham-da.txt](../data/cham-da.txt) - Dermatology care
- [data/vet-thuong.txt](../data/vet-thuong.txt) - Wound care

## Local Development

### 1. Start Development Server

```bash
npm run dev
```

This starts the server with hot-reload using `tsx watch`.

**Output:**
```
[2025-11-21 10:00:00] INFO: Server listening on http://localhost:7860
[2025-11-21 10:00:00] INFO: Swagger docs available at http://localhost:7860/docs
```

### 2. Test Health Endpoint

```bash
curl http://localhost:7860/health
```

### 3. View API Documentation

Open http://localhost:7860/docs in your browser.

### 4. Test Triage Endpoint

```bash
curl -X POST http://localhost:7860/api/health-check \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Tôi bị đau đầu và sốt",
    "user_id": "test_user_123"
  }'
```

## Docker Deployment

### 1. Build Docker Image

```bash
docker build -t medagen-backend .
```

### 2. Run Container

```bash
docker run -d \
  --name medagen-backend \
  -p 3000:3000 \
  -e SUPABASE_URL=https://your-project.supabase.co \
  -e SUPABASE_ANON_KEY=your_anon_key \
  -e SUPABASE_SERVICE_KEY=your_service_key \
  -e GEMINI_API_KEY=your_gemini_key \
  medagen-backend
```

### 3. Check Logs

```bash
docker logs -f medagen-backend
```

### 4. Health Check

```bash
curl http://localhost:3000/health
```

### Docker Compose (Recommended)

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  medagen-backend:
    build: .
    container_name: medagen-backend
    ports:
      - "3000:3000"
    env_file:
      - .env
    environment:
      - NODE_ENV=production
      - PORT=3000
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
```

Start with Docker Compose:

```bash
docker-compose up -d
```

## Production Deployment

### Option 1: Cloud Platforms (Recommended)

#### Deploy to Railway

1. Create account at https://railway.app
2. Connect GitHub repository
3. Add environment variables in Railway dashboard
4. Deploy automatically on git push

#### Deploy to Render

1. Create account at https://render.com
2. Create new Web Service
3. Connect GitHub repository
4. Add environment variables
5. Deploy

#### Deploy to Google Cloud Run

```bash
# Build and push image
gcloud builds submit --tag gcr.io/PROJECT_ID/medagen-backend

# Deploy to Cloud Run
gcloud run deploy medagen-backend \
  --image gcr.io/PROJECT_ID/medagen-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "SUPABASE_URL=...,GEMINI_API_KEY=..."
```

### Option 2: VPS (DigitalOcean, AWS EC2, etc.)

#### 1. SSH into Server

```bash
ssh user@your-server-ip
```

#### 2. Install Dependencies

```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Docker (optional)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

#### 3. Clone and Setup

```bash
git clone <repository-url>
cd Medagen
npm install
npm run build
```

#### 4. Setup PM2 for Process Management

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start dist/index.js --name medagen-backend

# Save PM2 configuration
pm2 save

# Setup auto-restart on reboot
pm2 startup
```

#### 5. Setup Nginx Reverse Proxy

Install Nginx:

```bash
sudo apt-get install nginx
```

Create Nginx configuration:

```bash
sudo nano /etc/nginx/sites-available/medagen
```

Add configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:7860;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/medagen /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### 6. Setup SSL with Let's Encrypt

```bash
sudo apt-get install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

### Environment-Specific Configuration

#### Development

```bash
NODE_ENV=development
PORT=7860
LOG_LEVEL=debug
```

#### Production

```bash
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
```

## Monitoring & Maintenance

### Health Checks

Endpoint: `GET /health`

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-21T10:00:00.000Z"
}
```

Setup uptime monitoring:
- UptimeRobot (https://uptimerobot.com)
- Pingdom (https://www.pingdom.com)
- Better Uptime (https://betteruptime.com)

### Logging

Logs are structured JSON via Pino:

```json
{
  "level": 30,
  "time": 1700000000000,
  "pid": 12345,
  "hostname": "server",
  "msg": "Server listening on http://localhost:7860"
}
```

**Production Logging:**

```bash
# View logs with PM2
pm2 logs medagen-backend

# View last 100 lines
pm2 logs medagen-backend --lines 100

# Filter error logs
pm2 logs medagen-backend --err
```

**Docker Logging:**

```bash
# View logs
docker logs medagen-backend

# Follow logs
docker logs -f medagen-backend

# Last 100 lines
docker logs --tail 100 medagen-backend
```

### Performance Monitoring

Integrate with monitoring services:

1. **Application Performance Monitoring (APM)**
   - New Relic
   - Datadog
   - Sentry (error tracking)

2. **Infrastructure Monitoring**
   - Prometheus + Grafana
   - CloudWatch (AWS)
   - Google Cloud Monitoring

### Database Maintenance

#### Backup Supabase Database

```bash
# Using Supabase CLI
supabase db dump -f backup.sql
```

#### Clean Old Conversations

Run periodically to remove old sessions:

```sql
-- Delete conversations older than 90 days
DELETE FROM conversation_history
WHERE created_at < NOW() - INTERVAL '90 days';

-- Delete inactive sessions older than 30 days
DELETE FROM sessions
WHERE status = 'completed'
  AND updated_at < NOW() - INTERVAL '30 days';
```

### Updating Guidelines

To update medical guidelines:

1. Edit `.txt` files in `data/` directory
2. Run seeding script: `npm run seed`
3. Verify in Supabase dashboard

### Scaling Considerations

#### Horizontal Scaling

The application is stateless and can be scaled horizontally:

```bash
# Run multiple instances with PM2
pm2 start dist/index.js -i max --name medagen-backend
```

#### Load Balancing

Use Nginx or cloud load balancers:

```nginx
upstream medagen_backend {
    least_conn;
    server 127.0.0.1:7860;
    server 127.0.0.1:7861;
    server 127.0.0.1:7862;
}

server {
    location / {
        proxy_pass http://medagen_backend;
    }
}
```

#### Database Optimization

1. **Enable connection pooling** (Supabase provides this)
2. **Index optimization** (already configured)
3. **Query caching** for guidelines

### Security Checklist

- [ ] Environment variables secured (not committed to git)
- [ ] HTTPS enabled (SSL certificate)
- [ ] Supabase RLS policies configured
- [ ] Rate limiting implemented (recommended)
- [ ] CORS configured properly
- [ ] Secrets rotated regularly
- [ ] Logs don't contain sensitive data
- [ ] Dependencies updated (run `npm audit`)

### Troubleshooting

#### Server Won't Start

```bash
# Check logs
npm run dev

# Common issues:
# 1. Port already in use
lsof -i :7860
kill -9 <PID>

# 2. Missing environment variables
cat .env

# 3. Dependencies not installed
npm install
```

#### Agent Errors

```bash
# Check Gemini API key
curl https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash?key=$GEMINI_API_KEY

# Check Supabase connection
curl $SUPABASE_URL/rest/v1/ -H "apikey: $SUPABASE_ANON_KEY"
```

#### Database Connection Issues

```sql
-- Test connection in Supabase SQL Editor
SELECT NOW();

-- Check table existence
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';
```

---

## Deployment Checklist

Before deploying to production:

- [ ] All environment variables configured
- [ ] Database tables created
- [ ] Guidelines seeded
- [ ] Health endpoint working
- [ ] API documentation accessible
- [ ] Logs configured
- [ ] Monitoring setup
- [ ] Backups configured
- [ ] SSL certificate installed
- [ ] Domain configured
- [ ] Load testing completed
- [ ] Security audit passed

---

**Next:** Read [DEVELOPMENT.md](DEVELOPMENT.md) for development guidelines.
