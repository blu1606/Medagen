# Report Generation API - Integration Guide

## Tổng quan
API tạo báo cáo tổng hợp đầy đủ từ conversation session, bao gồm tất cả thông tin từ tools (CV top 3, RAG guidelines, triage results, hospital suggestions) mà response message thường bỏ qua.

## Endpoints

### 1. Generate/Get Full Report
```
GET /api/reports/:session_id?type=full|summary|tools_only
```

**Response:**
```json
{
  "session_id": "uuid",
  "report_type": "full",
  "generated_at": "2024-01-01T00:00:00Z",
  "report": {
    "report_content": { /* Full structured data */ },
    "report_markdown": "# BÁO CÁO TỔNG HỢP..." 
  }
}
```

### 2. Get Markdown Only
```
GET /api/reports/:session_id/markdown
```
Trả về markdown report đã format sẵn, dễ hiển thị.

### 3. Get JSON Only
```
GET /api/reports/:session_id/json
```
Trả về structured data (conversation timeline, tool executions, summary).

## Cách sử dụng

```javascript
// Sau khi có session_id từ /api/health-check
const sessionId = "abc-123-def";

// Generate full report
const response = await fetch(`/api/reports/${sessionId}?type=full`);
const { report } = await response.json();

// Hiển thị markdown
console.log(report.report_markdown);

// Hoặc parse structured data
const { conversation_timeline, tool_executions, summary } = report.report_content;
```

## Lưu ý
- Report được cache, gọi lại sẽ trả về cached version
- `type=full`: Báo cáo đầy đủ (default)
- `type=summary`: Chỉ tóm tắt
- `type=tools_only`: Chỉ tool executions

