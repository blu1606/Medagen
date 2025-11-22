# Health Check API - Integration Guide

## Endpoint

```
POST /api/health-check
```

## Request Body

```json
{
  "text": "tôi bị đau mũi, có nổi mụt nhọt",
  "image_url": "https://example.com/image.jpg",
  "user_id": "user123",
  "session_id": "optional-session-id",
  "location": {
    "lat": 10.762622,
    "lng": 106.660172
  }
}
```

## Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `text` | string | No* | Mô tả triệu chứng (bắt buộc nếu không có image_url) |
| `image_url` | string | No* | URL hình ảnh (bắt buộc nếu không có text) |
| `user_id` | string | Yes | ID của người dùng |
| `session_id` | string | No | Session ID để theo dõi lịch sử hội thoại |
| `location` | object | No | Vị trí của người dùng (lat, lng) - **Cần thiết để tìm bệnh viện** |

### Location Object

```json
{
  "lat": 10.762622,  // Vĩ độ (latitude)
  "lng": 106.660172   // Kinh độ (longitude)
}
```

## Response

```json
{
  "triage_level": "routine",
  "symptom_summary": "tôi bị đau mũi, có nổi mụt nhọt",
  "suspected_conditions": [...],
  "recommendation": {...},
  "nearest_clinic": {
    "name": "Bệnh viện Da Liễu Trung ương",
    "distance_km": 2.5,
    "address": "123 Đường ABC, Quận XYZ",
    "rating": 4.5
  },
  "message": "..."
}
```

## Lưu ý

- **Location là tùy chọn** nhưng **cần thiết** để tìm bệnh viện gần nhất
- Khi user hỏi "tôi nên đi khám ở đâu" hoặc triage level là emergency/urgent, cần có location để gọi MCP hospital tool
- Location được truyền trực tiếp vào MCP hospital tool khi cần

