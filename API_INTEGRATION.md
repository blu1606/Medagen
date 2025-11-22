# API Integration Guide

## Endpoint: Triage Health Check

**URL:** `POST /api/health-check`  
**Base URL:** `https://medagen-backend.hf.space` (hoặc URL của bạn)

### Request

```json
{
  "user_id": "string (required)",
  "text": "string (optional, required if no image_url)",
  "image_url": "string (optional, required if no text)",
  "session_id": "string (optional)",
  "location": {
    "lat": "number (optional)",
    "lng": "number (optional)"
  }
}
```

### Response

```json
{
  "triage_level": "emergency|urgent|routine|self-care",
  "symptom_summary": "string",
  "red_flags": ["string"],
  "suspected_conditions": [
    {
      "name": "string",
      "source": "cv_model|guideline|user_report",
      "confidence": "low|medium|high"
    }
  ],
  "cv_findings": {
    "model_used": "derm_cv|eye_cv|wound_cv|none",
    "raw_output": {}
  },
  "recommendation": {
    "action": "string",
    "timeframe": "string",
    "home_care_advice": "string",
    "warning_signs": "string"
  },
  "message": "string (markdown response)",
  "session_id": "string",
  "nearest_clinic": {
    "name": "string",
    "distance_km": "number",
    "address": "string",
    "rating": "number"
  }
}
```

### Example

```bash
curl -X POST https://medagen-backend.hf.space/api/health-check \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user123",
    "text": "đau mũi, có mụt nhọt",
    "image_url": "https://example.com/image.jpg"
  }'
```

### Notes

- `text` hoặc `image_url` phải có ít nhất một
- `session_id` tự động tạo nếu không có
- Response `message` chứa markdown tự nhiên từ LLM
- `triage_level` xác định mức độ khẩn cấp

