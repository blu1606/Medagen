# Report API - Integration Guide

## Endpoint

```
GET /api/reports/:session_id?type=full|summary|tools_only
```

## Response Format

Trả về `MedicalReport` (JSON) - chỉ chứa dữ liệu y tế có ý nghĩa.

## JSON Mẫu

```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "user123",
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-15T10:35:00Z",
  
  "concerns": [
    {
      "description": "Da tôi bị nổi mẩn đỏ và ngứa",
      "timestamp": "2024-01-15T10:30:00Z",
      "has_image": true
    }
  ],
  
  "image_analysis": {
    "top_conditions": [
      {
        "condition_name": "Viêm da dị ứng",
        "confidence_percent": "85.3%",
        "probability": 0.853
      },
      {
        "condition_name": "Chàm",
        "confidence_percent": "72.1%",
        "probability": 0.721
      }
    ],
    "model_type": "derm_cv"
  },
  
  "triage_assessment": [
    {
      "level": "routine",
      "timestamp": "2024-01-15T10:30:00Z",
      "red_flags": [],
      "reasoning": "Triệu chứng nhẹ, không có dấu hiệu nguy hiểm"
    }
  ],
  
  "suspected_conditions": [
    {
      "condition_name": "Viêm da dị ứng",
      "source": "cv_model",
      "confidence": "high",
      "occurrences": 1
    }
  ],
  
  "medical_guidelines": [
    {
      "content": "Điều trị viêm da dị ứng: Tránh tiếp xúc với chất gây dị ứng, sử dụng kem dưỡng ẩm...",
      "relevance_score": 0.92,
      "source": "Bộ Y Tế"
    }
  ],
  
  "recommendations": [
    {
      "action": "Đến khám bác sĩ da liễu trong vòng 1-2 ngày",
      "timeframe": "1-2 ngày",
      "home_care_advice": "Tránh gãi, dùng kem dưỡng ẩm",
      "warning_signs": "Nếu vùng da lan rộng hoặc có mủ",
      "timestamp": "2024-01-15T10:30:00Z"
    }
  ],
  
  "suggested_hospitals": [
    {
      "name": "Bệnh viện Da Liễu Trung ương",
      "distance_km": 2.5,
      "address": "123 Đường ABC, Quận XYZ",
      "rating": 4.5,
      "specialty_match": "high",
      "condition": "Viêm da dị ứng"
    }
  ]
}
```

## Ví dụ Sử dụng

```javascript
// Lấy report cho session
const response = await fetch('/api/reports/550e8400-e29b-41d4-a716-446655440000');
const medicalReport = await response.json();

// Sử dụng dữ liệu
console.log('Mối quan tâm:', medicalReport.concerns);
console.log('Bệnh nghi ngờ:', medicalReport.suspected_conditions);
console.log('Bệnh viện:', medicalReport.suggested_hospitals);
```

## Lưu ý

- Tất cả dữ liệu đều có ý nghĩa y tế (không có metadata kỹ thuật)
- `image_analysis` chỉ có khi có hình ảnh
- `suggested_hospitals` chỉ có khi emergency/urgent hoặc user yêu cầu

