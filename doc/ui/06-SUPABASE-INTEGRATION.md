# Supabase Integration Guide

**Database, Auth, and Storage Setup**

---

## Overview

Supabase provides:
- **Database** (PostgreSQL) - Store conversations, sessions
- **Auth** - User authentication
- **Storage** - Image uploads
- **Realtime** - Live updates (optional)

---

## Setup

### 1. Install Dependencies

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

### 2. Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 3. Create Supabase Client

```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
```

---

## Database Schema

### Tables

#### 1. conversation_history
```sql
CREATE TABLE conversation_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  image_url TEXT,
  triage_result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_session (session_id),
  INDEX idx_user (user_id),
  INDEX idx_created (created_at DESC)
);
```

#### 2. sessions
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_user_sessions (user_id),
  INDEX idx_status (status)
);
```

#### 3. guidelines (for RAG)
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE guidelines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  metadata JSONB,
  embedding VECTOR(768),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX idx_embedding ON guidelines USING ivfflat (embedding vector_cosine_ops)
);
```

---

## Row Level Security (RLS)

### Enable RLS

```sql
ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
```

### Policies

```sql
-- conversation_history policies
CREATE POLICY "Users can view own conversations"
  ON conversation_history FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own conversations"
  ON conversation_history FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

-- sessions policies
CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own sessions"
  ON sessions FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own sessions"
  ON sessions FOR UPDATE
  USING (auth.uid()::text = user_id);
```

---

## Authentication

### Anonymous Sessions (MVP Approach)

For MVP, use anonymous sessions without full authentication:

```typescript
// lib/auth.ts
import { supabase } from './supabase';

export async function getOrCreateAnonymousSession() {
  // Check if user already has a session
  let { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    // Sign in anonymously
    const { data, error } = await supabase.auth.signInAnonymously();

    if (error) {
      console.error('Anonymous auth error:', error);
      throw error;
    }

    session = data.session;
  }

  return session;
}

export function getUserId() {
  return supabase.auth.getUser().then(({ data }) => data.user?.id);
}
```

### Usage in Components

```typescript
// app/chat/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { getOrCreateAnonymousSession } from '@/lib/auth';

export default function ChatPage() {
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    getOrCreateAnonymousSession().then((session) => {
      setUserId(session.user.id);
    });
  }, []);

  if (!userId) {
    return <LoadingSpinner />;
  }

  return <ChatInterface userId={userId} />;
}
```

---

## Storage (Image Upload)

### Setup Storage Bucket

In Supabase Dashboard:
1. Go to Storage
2. Create new bucket: `patient-images`
3. Set to public (or use signed URLs)
4. Set file size limit: 10MB

### Upload Function

```typescript
// lib/storage.ts
import { supabase } from './supabase';

export async function uploadPatientImage(
  file: File,
  userId: string
): Promise<string> {
  const fileName = `${userId}/${Date.now()}-${file.name}`;

  const { data, error } = await supabase.storage
    .from('patient-images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Upload error:', error);
    throw new Error('Failed to upload image');
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('patient-images')
    .getPublicUrl(fileName);

  return publicUrl;
}
```

### Usage in Chat

```typescript
const handleSendMessage = async () => {
  let imageUrl = undefined;

  if (selectedImage) {
    setUploadingImage(true);
    try {
      imageUrl = await uploadPatientImage(selectedImage, userId);
    } catch (error) {
      toast.error('Failed to upload image');
      return;
    } finally {
      setUploadingImage(false);
    }
  }

  // Send message with imageUrl
  sendMessage({ text: message, image_url: imageUrl });
};
```

---

## Realtime Updates (Optional)

### Subscribe to Conversation Changes

```typescript
// hooks/useRealtimeConversation.ts
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export function useRealtimeConversation(sessionId: string) {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    // Subscribe to new messages
    const channel = supabase
      .channel(`conversation:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversation_history',
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return messages;
}
```

---

## Session Management

### Create Session

```typescript
export async function createSession(userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      user_id: userId,
      status: 'active',
    })
    .select('id')
    .single();

  if (error) {
    throw new Error('Failed to create session');
  }

  return data.id;
}
```

### Get User Sessions

```typescript
export async function getUserSessions(userId: string) {
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      id,
      created_at,
      updated_at,
      status
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error('Failed to fetch sessions');
  }

  return data;
}
```

### Save Message

```typescript
export async function saveMessage(
  sessionId: string,
  userId: string,
  role: 'user' | 'assistant',
  content: string,
  imageUrl?: string
) {
  const { error } = await supabase
    .from('conversation_history')
    .insert({
      session_id: sessionId,
      user_id: userId,
      role,
      content,
      image_url: imageUrl,
    });

  if (error) {
    console.error('Save message error:', error);
    throw error;
  }
}
```

---

## Complete Integration Example

```typescript
// hooks/useChatWithSupabase.ts
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { uploadPatientImage, saveMessage, createSession } from '@/lib/storage';

export function useChatWithSupabase(userId: string) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Create session on mount
  useEffect(() => {
    createSession(userId).then(setSessionId);
  }, [userId]);

  const sendMessage = async (text: string, image?: File) => {
    if (!sessionId) return;

    setIsLoading(true);

    try {
      // Upload image if provided
      let imageUrl = undefined;
      if (image) {
        imageUrl = await uploadPatientImage(image, userId);
      }

      // Save user message to Supabase
      await saveMessage(sessionId, userId, 'user', text, imageUrl);

      // Update local state
      setMessages(prev => [...prev, {
        role: 'user',
        content: text,
        image_url: imageUrl,
        timestamp: new Date().toISOString(),
      }]);

      // Call backend API for AI response
      const response = await fetch('/api/health-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          image_url: imageUrl,
          user_id: userId,
          session_id: sessionId,
        }),
      });

      const data = await response.json();

      // Save assistant response to Supabase
      await saveMessage(
        sessionId,
        userId,
        'assistant',
        JSON.stringify(data)
      );

      // Update local state
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: JSON.stringify(data),
        timestamp: new Date().toISOString(),
      }]);

      return data;

    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sessionId,
    messages,
    sendMessage,
    isLoading,
  };
}
```

---

## Best Practices

1. **Always use RLS** - Never expose service role key to frontend
2. **Validate file uploads** - Check size and type before upload
3. **Use signed URLs** - For sensitive images (not public bucket)
4. **Clean up old files** - Implement lifecycle policy in Storage
5. **Index frequently queried columns** - session_id, user_id, created_at
6. **Use connection pooling** - Supabase handles this automatically
7. **Monitor usage** - Check Supabase dashboard for quotas

---

## Troubleshooting

### RLS Blocking Queries?
- Check policies match user_id correctly
- Use `auth.uid()` for authenticated users
- Test with Supabase SQL editor

### Upload Failing?
- Check bucket permissions (public vs private)
- Verify file size < limit
- Check CORS settings in Storage

### Realtime Not Working?
- Enable Realtime in Supabase dashboard
- Check subscription filters are correct
- Verify RLS allows realtime events

---

**That's it! All 6 UI/UX documentation files are complete.** 🎉
