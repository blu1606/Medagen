# Backend Integration Guide

**Connecting Next.js Frontend to Fastify Backend**

---

## API Endpoints

### Base URL
```typescript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7860';
```

---

## 1. Health Check (Main Triage Endpoint)

### Endpoint
```
POST /api/health-check
```

### Request
```typescript
interface HealthCheckRequest {
  text: string;                    // Required (or image_url)
  image_url?: string;              // Optional (from Supabase upload)
  user_id: string;                 // Required
  session_id?: string;             // Optional (for conversation continuity)
  location?: {
    lat: number;
    lng: number;
  };
}
```

### Response
```typescript
interface HealthCheckResponse {
  triage_level: 'emergency' | 'urgent' | 'routine' | 'self_care';
  symptom_summary: string;
  red_flags: string[];
  suspected_conditions: Array<{
    name: string;
    source: string;
    confidence: 'low' | 'medium' | 'high';
  }>;
  cv_findings: {
    model_used: string;
    raw_output: any;
  };
  recommendation: {
    action: string;
    timeframe: string;
    home_care_advice: string;
    warning_signs: string;
  };
  nearest_clinic?: {
    name: string;
    distance_km: number;
    address: string;
    rating?: number;
  };
  session_id: string;
}
```

### Implementation

```typescript
// lib/api.ts
export async function sendTriageRequest(data: HealthCheckRequest): Promise<HealthCheckResponse> {
  const response = await fetch(`${API_BASE_URL}/api/health-check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Triage request failed');
  }

  return response.json();
}
```

### React Query Hook

```typescript
// hooks/useTriageAPI.ts
import { useMutation } from '@tanstack/react-query';
import { sendTriageRequest } from '@/lib/api';

export function useHealthCheck() {
  return useMutation({
    mutationFn: sendTriageRequest,
    onError: (error) => {
      console.error('Triage error:', error);
      toast.error('Failed to process triage. Please try again.');
    },
  });
}

// Usage in component
const { mutate, isLoading, error, data } = useHealthCheck();

const handleSendMessage = async () => {
  mutate({
    text: message,
    image_url: imageUrl,
    user_id: userId,
    session_id: sessionId,
    location: userLocation,
  });
};
```

---

## 2. Conversation History

### Endpoint
```
GET /api/conversations/:session_id
```

### Response
```typescript
interface ConversationHistoryResponse {
  session_id: string;
  user_id: string;
  messages: Array<{
    id: string;
    role: 'user' | 'assistant';
    content: string;
    image_url?: string;
    timestamp: string;
  }>;
  created_at: string;
  updated_at: string;
}
```

### Implementation

```typescript
export async function getConversationHistory(sessionId: string) {
  const response = await fetch(
    `${API_BASE_URL}/api/conversations/${sessionId}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch conversation');
  }

  return response.json();
}
```

### React Query Hook

```typescript
export function useConversation(sessionId: string) {
  return useQuery({
    queryKey: ['conversation', sessionId],
    queryFn: () => getConversationHistory(sessionId),
    enabled: !!sessionId,
    refetchOnWindowFocus: false,
  });
}
```

---

## 3. User's Sessions List

### Endpoint
```
GET /api/conversations/user/:user_id
```

### Response
```typescript
interface UserSessionsResponse {
  user_id: string;
  sessions: Array<{
    session_id: string;
    created_at: string;
    updated_at: string;
    message_count: number;
    last_message_preview: string;
  }>;
  total_sessions: number;
}
```

### Implementation

```typescript
export async function getUserSessions(userId: string) {
  const response = await fetch(
    `${API_BASE_URL}/api/conversations/user/${userId}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch sessions');
  }

  return response.json();
}
```

---

## Error Handling

### Error Response Format

```typescript
interface ErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  details?: any;
}
```

### Global Error Handler

```typescript
// lib/api-client.ts
export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const error: ErrorResponse = await response.json();

      // Handle specific error codes
      switch (error.statusCode) {
        case 400:
          toast.error(`Invalid request: ${error.message}`);
          break;
        case 401:
          toast.error('Authentication required');
          // Redirect to login
          break;
        case 500:
          toast.error('Server error. Please try again later.');
          break;
        default:
          toast.error(error.message || 'An error occurred');
      }

      throw new Error(error.message);
    }

    return response.json();
  } catch (error) {
    if (error instanceof TypeError) {
      // Network error
      toast.error('Network error. Please check your connection.');
    }
    throw error;
  }
}
```

---

## Loading States

### Mutation Loading State

```tsx
const { mutate, isLoading } = useHealthCheck();

return (
  <Button onClick={() => mutate(data)} disabled={isLoading}>
    {isLoading ? (
      <>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Processing...
      </>
    ) : (
      'Send Message'
    )}
  </Button>
);
```

### Query Loading State

```tsx
const { data, isLoading, error } = useConversation(sessionId);

if (isLoading) {
  return <LoadingSpinner />;
}

if (error) {
  return <ErrorState error={error} />;
}

return <ChatMessages messages={data.messages} />;
```

---

## Optimistic Updates

```typescript
const { mutate } = useHealthCheck();
const queryClient = useQueryClient();

const handleSendMessage = () => {
  // Optimistic update
  const tempMessage = {
    id: 'temp-' + Date.now(),
    role: 'user' as const,
    content: message,
    timestamp: new Date().toISOString(),
  };

  queryClient.setQueryData(
    ['conversation', sessionId],
    (old: ConversationHistoryResponse) => ({
      ...old,
      messages: [...old.messages, tempMessage],
    })
  );

  // Actual API call
  mutate(
    {
      text: message,
      user_id: userId,
      session_id: sessionId,
    },
    {
      onSuccess: (data) => {
        // Replace temp message with real one
        queryClient.setQueryData(
          ['conversation', sessionId],
          (old: ConversationHistoryResponse) => ({
            ...old,
            messages: old.messages.filter((m) => m.id !== tempMessage.id),
          })
        );

        // Refetch conversation
        queryClient.invalidateQueries(['conversation', sessionId]);
      },
      onError: () => {
        // Remove temp message on error
        queryClient.setQueryData(
          ['conversation', sessionId],
          (old: ConversationHistoryResponse) => ({
            ...old,
            messages: old.messages.filter((m) => m.id !== tempMessage.id),
          })
        );
      },
    }
  );
};
```

---

## React Query Setup

### Provider Setup

```tsx
// app/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
            retry: 1,
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}
```

```tsx
// app/layout.tsx
import { Providers } from './providers';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:7860
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

---

## CORS Configuration

Backend already has CORS enabled:

```typescript
// Backend: src/index.ts
await fastify.register(cors, {
  origin: true, // Allow all origins (adjust for production)
  credentials: true
});
```

For production, specify allowed origins:

```typescript
await fastify.register(cors, {
  origin: [
    'https://your-frontend.com',
    'http://localhost:3000', // Development
  ],
  credentials: true
});
```

---

## Testing API Integration

### Manual Testing

```typescript
// Test in browser console
fetch('http://localhost:7860/api/health-check', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: 'I have a headache',
    user_id: 'test_user_123',
  }),
})
  .then(res => res.json())
  .then(console.log);
```

### Integration Test

```typescript
// __tests__/api.test.ts
import { sendTriageRequest } from '@/lib/api';

describe('Triage API', () => {
  it('should send triage request successfully', async () => {
    const result = await sendTriageRequest({
      text: 'Test symptom',
      user_id: 'test_user',
    });

    expect(result).toHaveProperty('triage_level');
    expect(result).toHaveProperty('session_id');
  });
});
```

---

## Best Practices

1. **Always handle errors gracefully**
2. **Show loading states for all async operations**
3. **Use React Query for caching and refetching**
4. **Implement retry logic for failed requests**
5. **Use optimistic updates for better UX**
6. **Validate data before sending to API**
7. **Use TypeScript interfaces for type safety**
8. **Log errors to monitoring service (e.g., Sentry)**

---

**Next:** [06-SUPABASE-INTEGRATION.md](06-SUPABASE-INTEGRATION.md)
