# API Reference

Complete API documentation for the Medagen Backend.

## Base URL

```
http://localhost:7860
```

## API Documentation (Swagger)

Interactive API documentation is available at:

```
http://localhost:7860/docs
```

## Authentication

Most endpoints require authentication via Supabase Auth. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

---

## Endpoints

### Health Check

#### GET /health

Check if the server is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-21T10:30:00.000Z"
}
```

---

### Main Triage Endpoint

#### POST /api/health-check

Primary endpoint for health symptom triage analysis.

**Request Body:**
```typescript
{
  text: string;                    // Symptom description (required if no image)
  image_url?: string;              // Image URL for visual analysis
  user_id: string;                 // User identifier (required)
  session_id?: string;             // Conversation session ID (auto-generated if not provided)
  location?: {
    latitude: number;              // For finding nearest clinic
    longitude: number;
  }
}
```

**Example Request:**
```json
{
  "text": "Tôi bị đau đầu và sốt 38.5 độ trong 3 ngày",
  "user_id": "user_123",
  "location": {
    "latitude": 10.762622,
    "longitude": 106.660172
  }
}
```

**Example Request with Image:**
```json
{
  "text": "Tôi có vết nổi đỏ trên da",
  "image_url": "https://example.com/images/skin-rash.jpg",
  "user_id": "user_123",
  "session_id": "existing_session_id"
}
```

**Response:**
```typescript
{
  triage_level: "emergency" | "urgent" | "routine" | "self_care";
  symptom_summary: string;
  red_flags: string[];
  suspected_conditions: string[];
  cv_findings?: {
    dermatology?: object;
    eye?: object;
    wound?: object;
  };
  recommendation: string;
  nearest_clinic?: {
    name: string;
    address: string;
    distance_km: number;
    latitude: number;
    longitude: number;
    types: string[];
    rating?: number;
    user_ratings_total?: number;
  };
  session_id: string;
}
```

**Example Response:**
```json
{
  "triage_level": "urgent",
  "symptom_summary": "Đau đầu kéo dài 3 ngày kèm sốt cao 38.5°C",
  "red_flags": ["high_fever", "prolonged_headache"],
  "suspected_conditions": ["Nhiễm trùng hô hấp", "Viêm xoang"],
  "recommendation": "Bạn nên đến cơ sở y tế trong vòng 24 giờ để được khám và điều trị. Sốt cao kéo dài cần được đánh giá bởi bác sĩ.",
  "nearest_clinic": {
    "name": "Phòng khám Đa khoa Quận 1",
    "address": "123 Nguyễn Huệ, Quận 1, TP.HCM",
    "distance_km": 1.2,
    "latitude": 10.7631,
    "longitude": 106.6601,
    "types": ["hospital", "health"],
    "rating": 4.5,
    "user_ratings_total": 320
  },
  "session_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Triage Levels:**

| Level | Description | Action Required |
|-------|-------------|-----------------|
| `emergency` | Life-threatening symptoms | Immediate medical attention (call emergency or go to ER) |
| `urgent` | Serious symptoms requiring prompt care | See doctor within 24 hours |
| `routine` | Non-urgent health concerns | Schedule appointment within a few days |
| `self_care` | Minor issues manageable at home | Self-care with monitoring |

**Status Codes:**
- `200` - Success
- `400` - Bad request (invalid input)
- `500` - Server error (agent failure)

---

### Computer Vision Endpoints

Direct access to CV models without agent orchestration.

#### POST /api/cv/derm

Analyze dermatology conditions from an image.

**Request Body:**
```json
{
  "image_url": "https://example.com/skin-image.jpg"
}
```

**Response:**
```json
{
  "predictions": [
    {
      "condition": "Eczema",
      "confidence": 0.85,
      "severity": "moderate"
    }
  ],
  "raw_result": { /* Full API response */ }
}
```

#### POST /api/cv/eye

Analyze eye conditions from an image.

**Request Body:**
```json
{
  "image_url": "https://example.com/eye-image.jpg"
}
```

#### POST /api/cv/wound

Analyze wound/injury from an image.

**Request Body:**
```json
{
  "image_url": "https://example.com/wound-image.jpg"
}
```

---

### Triage Rules Endpoint

#### POST /api/triage-rules

Apply deterministic triage rules (without AI agent).

**Request Body:**
```typescript
{
  symptoms: string[];              // List of symptoms
  symptom_severity: "mild" | "moderate" | "severe";
  duration_days: number;
  vital_signs?: {
    temperature_celsius?: number;
  };
  patient_info?: {
    age?: number;
    chronic_conditions?: string[];
  };
}
```

**Example Request:**
```json
{
  "symptoms": ["chest_pain", "shortness_of_breath"],
  "symptom_severity": "severe",
  "duration_days": 0,
  "vital_signs": {
    "temperature_celsius": 37.0
  },
  "patient_info": {
    "age": 45
  }
}
```

**Response:**
```json
{
  "triage_level": "emergency",
  "red_flags": ["chest_pain", "breathing_difficulty"],
  "reasoning": "Chest pain with breathing difficulty requires immediate medical attention"
}
```

---

### RAG (Guideline Retrieval) Endpoint

#### POST /api/rag/search

Search medical guidelines using semantic similarity.

**Request Body:**
```json
{
  "query": "cách xử lý vết thương hở",
  "top_k": 5
}
```

**Response:**
```json
{
  "results": [
    {
      "content": "Vết thương hở cần được làm sạch bằng nước sạch...",
      "relevance_score": 0.92
    },
    {
      "content": "Băng bó vết thương đúng cách giúp...",
      "relevance_score": 0.88
    }
  ]
}
```

---

### Maps (Clinic Finder) Endpoint

#### POST /api/maps/nearest-clinic

Find nearest healthcare facilities based on location.

**Request Body:**
```json
{
  "latitude": 10.762622,
  "longitude": 106.660172,
  "radius": 5000
}
```

**Response:**
```json
{
  "clinics": [
    {
      "name": "Bệnh viện Chợ Rẫy",
      "address": "201B Nguyễn Chí Thanh, Quận 5",
      "distance_km": 2.3,
      "latitude": 10.7543,
      "longitude": 106.6598,
      "types": ["hospital", "health"],
      "rating": 4.2,
      "user_ratings_total": 1250,
      "place_id": "ChIJ..."
    }
  ],
  "total_results": 15
}
```

---

### Conversation History Endpoints

#### GET /api/conversations/:session_id

Retrieve conversation history for a specific session.

**Parameters:**
- `session_id` (path) - UUID of the conversation session

**Response:**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user_123",
  "messages": [
    {
      "role": "user",
      "content": "Tôi bị đau đầu",
      "timestamp": "2025-11-21T10:00:00Z"
    },
    {
      "role": "assistant",
      "content": "Đau đầu của bạn kéo dài bao lâu?",
      "timestamp": "2025-11-21T10:00:05Z"
    },
    {
      "role": "user",
      "content": "3 ngày rồi",
      "timestamp": "2025-11-21T10:00:15Z"
    }
  ],
  "created_at": "2025-11-21T10:00:00Z",
  "updated_at": "2025-11-21T10:00:15Z"
}
```

#### GET /api/conversations/user/:user_id

Get all conversation sessions for a user.

**Parameters:**
- `user_id` (path) - User identifier

**Response:**
```json
{
  "user_id": "user_123",
  "sessions": [
    {
      "session_id": "550e8400-e29b-41d4-a716-446655440000",
      "created_at": "2025-11-21T10:00:00Z",
      "updated_at": "2025-11-21T10:00:15Z",
      "message_count": 5,
      "last_message_preview": "3 ngày rồi"
    },
    {
      "session_id": "660e8400-e29b-41d4-a716-446655440111",
      "created_at": "2025-11-20T14:30:00Z",
      "updated_at": "2025-11-20T14:35:00Z",
      "message_count": 3,
      "last_message_preview": "Cảm ơn bác sĩ"
    }
  ],
  "total_sessions": 2
}
```

---

### Session Management Endpoints

#### POST /api/sessions

Create a new conversation session.

**Request Body:**
```json
{
  "user_id": "user_123"
}
```

**Response:**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user_123",
  "created_at": "2025-11-21T10:00:00Z"
}
```

#### GET /api/sessions/:session_id

Get session details.

**Response:**
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user_123",
  "created_at": "2025-11-21T10:00:00Z",
  "updated_at": "2025-11-21T10:05:00Z",
  "status": "active"
}
```

#### PUT /api/sessions/:session_id

Update session (e.g., mark as completed).

**Request Body:**
```json
{
  "status": "completed"
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation error: text or image_url is required"
}
```

**Common Error Codes:**

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - Invalid input parameters |
| 401 | Unauthorized - Missing or invalid authentication |
| 404 | Not Found - Resource not found |
| 500 | Internal Server Error - Agent or service failure |
| 503 | Service Unavailable - External API down |

---

## Rate Limiting

Currently no rate limiting is enforced. Consider implementing rate limiting in production:

- 100 requests per minute per user (recommended)
- 1000 requests per hour per user (recommended)

---

## Webhook Events

Future feature: Webhooks for async triage completion.

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:7860',
  headers: {
    'Authorization': 'Bearer YOUR_JWT_TOKEN'
  }
});

async function triageSymptom(text: string, userId: string) {
  const response = await client.post('/api/health-check', {
    text,
    user_id: userId
  });

  return response.data;
}

// Usage
const result = await triageSymptom(
  'Tôi bị đau đầu và sốt',
  'user_123'
);

console.log(result.triage_level); // "urgent"
console.log(result.recommendation);
```

### Python

```python
import requests

class MedagenClient:
    def __init__(self, base_url, jwt_token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {jwt_token}',
            'Content-Type': 'application/json'
        }

    def triage_symptom(self, text, user_id, session_id=None):
        payload = {
            'text': text,
            'user_id': user_id
        }
        if session_id:
            payload['session_id'] = session_id

        response = requests.post(
            f'{self.base_url}/api/health-check',
            json=payload,
            headers=self.headers
        )

        return response.json()

# Usage
client = MedagenClient('http://localhost:7860', 'YOUR_JWT_TOKEN')
result = client.triage_symptom('Tôi bị đau đầu và sốt', 'user_123')

print(result['triage_level'])
print(result['recommendation'])
```

### cURL

```bash
# Health check
curl http://localhost:7860/health

# Triage request
curl -X POST http://localhost:7860/api/health-check \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "text": "Tôi bị đau đầu và sốt 38.5 độ",
    "user_id": "user_123"
  }'

# Get conversation history
curl http://localhost:7860/api/conversations/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## Best Practices

### 1. Session Management

Always reuse session IDs for multi-turn conversations:

```typescript
// First request
const result1 = await triageSymptom('Tôi bị đau đầu', 'user_123');
const sessionId = result1.session_id;

// Follow-up request (uses context)
const result2 = await triageSymptom('Đau kéo dài 3 ngày', 'user_123', sessionId);
```

### 2. Image Analysis

For image-based triage:
- Upload image to Supabase Storage first
- Pass the public URL to the triage endpoint
- Supported formats: JPEG, PNG, WebP
- Max file size: 10MB (recommended)

### 3. Error Handling

Always implement retry logic with exponential backoff:

```typescript
async function triageWithRetry(text: string, userId: string, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await triageSymptom(text, userId);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
    }
  }
}
```

### 4. Location Services

Provide user location for better clinic recommendations:
- Request location permission from user
- Use HTML5 Geolocation API or native mobile GPS
- Fallback to IP geolocation if permission denied

---

**Next:** Read [AGENT_SYSTEM.md](AGENT_SYSTEM.md) for agent implementation details.
