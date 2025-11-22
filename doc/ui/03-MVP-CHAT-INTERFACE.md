# Chat Interface - Detailed Specification

**Path:** `/chat?session=[id]`

---

## Overview

The Chat Interface is where users interact with the AI triage assistant in a conversational format. The interface displays messages, handles user input, and shows the triage result when ready.

---

## Layout Structure

```
┌─────────────────────────────────────────┐
│  [←] John Doe | Session: abc123  [⋮]    │  ← Header (fixed)
├─────────────────────────────────────────┤
│                                         │
│  [Assistant Avatar]                     │
│  ┌─────────────────────────────────┐   │
│  │ Hello! I've reviewed your       │   │  ← Assistant message
│  │ information. Let me ask a few   │   │
│  │ follow-up questions...          │   │
│  └─────────────────────────────────┘   │
│                         10:30 AM        │
│                                         │
│                     [User Avatar] ●     │
│           ┌─────────────────────────┐   │  ← User message
│           │ The pain started        │   │
│           │ yesterday morning       │   │
│           └─────────────────────────┘   │
│                         10:31 AM        │
│                                         │
│  [Assistant Avatar]                     │
│  ┌─────────────────────────────────┐   │
│  │ ⋯⋯⋯ Typing...                 │   │  ← Typing indicator
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🏥 TRIAGE RESULT                │   │  ← Result card (when ready)
│  │ [Urgent] badge                  │   │
│  │ Summary, recommendations...     │   │
│  └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│  [📎] [Type a message...] [Send →]     │  ← Input area (fixed)
└─────────────────────────────────────────┘
```

---

## Components Breakdown

### 1. Chat Header

```tsx
<header className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center justify-between">
  <div className="flex items-center gap-3">
    <Button variant="ghost" size="icon" onClick={() => router.back()}>
      <ArrowLeft className="h-5 w-5" />
    </Button>
    <div>
      <h2 className="font-semibold">{patientName}</h2>
      <p className="text-xs text-muted-foreground">
        Session: {sessionId.slice(0, 8)}...
      </p>
    </div>
  </div>

  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon">
        <MoreVertical className="h-5 w-5" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={handleNewSession}>
        New Assessment
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleExport}>
        Export Conversation
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
</header>
```

---

### 2. Messages Container

```tsx
<div className="flex-1 overflow-y-auto p-4 space-y-4" ref={messagesEndRef}>
  {messages.map((message) => (
    <MessageBubble key={message.id} message={message} />
  ))}

  {isTyping && <TypingIndicator />}

  {triageResult && <TriageResultCard result={triageResult} />}

  <div ref={scrollAnchor} />
</div>
```

**Auto-scroll behavior:**
```typescript
useEffect(() => {
  scrollAnchor.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages, isTyping, triageResult]);
```

---

### 3. Message Bubble Component

```tsx
interface MessageBubbleProps {
  message: {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    image_url?: string;
    timestamp: string;
    status?: 'sending' | 'sent' | 'error';
  };
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn(
      'flex gap-2',
      isUser ? 'justify-end' : 'justify-start'
    )}>
      {!isUser && (
        <Avatar className="h-8 w-8">
          <AvatarImage src="/bot-avatar.png" />
          <AvatarFallback>AI</AvatarFallback>
        </Avatar>
      )}

      <div className={cn(
        'max-w-[75%] rounded-lg p-3',
        isUser
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted'
      )}>
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {message.image_url && (
          <img
            src={message.image_url}
            alt="Uploaded"
            className="mt-2 rounded-md max-w-full"
          />
        )}

        <div className="flex items-center justify-between mt-1 gap-2">
          <time className="text-xs opacity-70">
            {format(new Date(message.timestamp), 'p')}
          </time>

          {isUser && message.status === 'sending' && (
            <Loader2 className="h-3 w-3 animate-spin" />
          )}
          {isUser && message.status === 'sent' && (
            <Check className="h-3 w-3" />
          )}
          {isUser && message.status === 'error' && (
            <AlertCircle className="h-3 w-3 text-error" />
          )}
        </div>
      </div>

      {isUser && (
        <Avatar className="h-8 w-8">
          <AvatarFallback>{getInitials(patientName)}</AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}
```

---

### 4. Typing Indicator

```tsx
function TypingIndicator() {
  return (
    <div className="flex gap-2">
      <Avatar className="h-8 w-8">
        <AvatarImage src="/bot-avatar.png" />
        <AvatarFallback>AI</AvatarFallback>
      </Avatar>

      <div className="bg-muted rounded-lg p-3">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}
```

---

### 5. Triage Result Card

```tsx
interface TriageResultProps {
  result: {
    triage_level: 'emergency' | 'urgent' | 'routine' | 'self_care';
    symptom_summary: string;
    red_flags: string[];
    suspected_conditions: Array<{
      name: string;
      confidence: 'low' | 'medium' | 'high';
    }>;
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
  };
}

function TriageResultCard({ result }: TriageResultProps) {
  const triageConfig = {
    emergency: {
      color: 'emergency',
      icon: AlertTriangle,
      title: 'Emergency',
    },
    urgent: {
      color: 'urgent',
      icon: AlertCircle,
      title: 'Urgent',
    },
    routine: {
      color: 'routine',
      icon: Info,
      title: 'Routine',
    },
    self_care: {
      color: 'selfcare',
      icon: CheckCircle,
      title: 'Self-Care',
    },
  };

  const config = triageConfig[result.triage_level];
  const Icon = config.icon;

  return (
    <Card className="border-2" style={{ borderColor: `hsl(var(--${config.color}))` }}>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-6 w-6" style={{ color: `hsl(var(--${config.color}))` }} />
          <CardTitle>Triage Assessment</CardTitle>
        </div>
        <Badge variant={config.color as any} className="w-fit">
          {config.title}
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Symptom Summary */}
        <div>
          <h4 className="font-semibold mb-1">Symptom Summary</h4>
          <p className="text-sm text-muted-foreground">{result.symptom_summary}</p>
        </div>

        {/* Red Flags */}
        {result.red_flags.length > 0 && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Warning Signs Detected</AlertTitle>
            <AlertDescription>
              <ul className="list-disc list-inside space-y-1">
                {result.red_flags.map((flag, i) => (
                  <li key={i}>{flag}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Suspected Conditions */}
        {result.suspected_conditions.length > 0 && (
          <div>
            <h4 className="font-semibold mb-2">Possible Conditions</h4>
            <div className="flex flex-wrap gap-2">
              {result.suspected_conditions.map((condition, i) => (
                <Badge
                  key={i}
                  variant={
                    condition.confidence === 'high' ? 'default' :
                    condition.confidence === 'medium' ? 'secondary' : 'outline'
                  }
                >
                  {condition.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        <div className="bg-muted p-3 rounded-md space-y-2">
          <div>
            <span className="font-semibold">Action:</span> {result.recommendation.action}
          </div>
          <div>
            <span className="font-semibold">Timeframe:</span> {result.recommendation.timeframe}
          </div>
          {result.recommendation.home_care_advice && (
            <div>
              <span className="font-semibold">Home Care:</span> {result.recommendation.home_care_advice}
            </div>
          )}
          {result.recommendation.warning_signs && (
            <div>
              <span className="font-semibold">Warning Signs:</span> {result.recommendation.warning_signs}
            </div>
          )}
        </div>

        {/* Nearest Clinic */}
        {result.nearest_clinic && (
          <div className="border rounded-md p-3">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Nearest Healthcare Facility
            </h4>
            <div className="space-y-1 text-sm">
              <p className="font-medium">{result.nearest_clinic.name}</p>
              <p className="text-muted-foreground">{result.nearest_clinic.address}</p>
              <p className="text-muted-foreground">Distance: {result.nearest_clinic.distance_km} km</p>
              {result.nearest_clinic.rating && (
                <p className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {result.nearest_clinic.rating}/5
                </p>
              )}
            </div>
            <Button
              className="w-full mt-3"
              onClick={() => {
                window.open(
                  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(result.nearest_clinic.name)}`,
                  '_blank'
                );
              }}
            >
              <MapPin className="h-4 w-4 mr-2" />
              Open in Google Maps
            </Button>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" onClick={handleExport} className="flex-1">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={handleNewAssessment} className="flex-1">
            New Assessment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

### 6. Message Input Area

```tsx
<div className="sticky bottom-0 border-t bg-background p-4">
  <form onSubmit={handleSubmit} className="flex gap-2">
    {/* Image Upload Button */}
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={isLoading}
      onClick={() => fileInputRef.current?.click()}
    >
      <Paperclip className="h-4 w-4" />
    </Button>
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={handleImageSelect}
    />

    {/* Text Input */}
    <div className="flex-1 relative">
      <Textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        className="min-h-[44px] max-h-[120px] resize-none pr-10"
        disabled={isLoading}
      />

      {/* Character count */}
      <span className="absolute bottom-2 right-2 text-xs text-muted-foreground">
        {message.length}/500
      </span>
    </div>

    {/* Send Button */}
    <Button
      type="submit"
      size="icon"
      disabled={isLoading || (!message.trim() && !selectedImage)}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Send className="h-4 w-4" />
      )}
    </Button>
  </form>

  {/* Image Preview */}
  {selectedImage && (
    <div className="mt-2 relative inline-block">
      <img
        src={URL.createObjectURL(selectedImage)}
        alt="Selected"
        className="h-20 rounded-md"
      />
      <Button
        type="button"
        variant="destructive"
        size="icon"
        className="absolute -top-2 -right-2 h-6 w-6"
        onClick={() => setSelectedImage(null)}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  )}
</div>
```

---

## State Management

```typescript
// Chat state
const [messages, setMessages] = useState<Message[]>([]);
const [isTyping, setIsTyping] = useState(false);
const [triageResult, setTriageResult] = useState<TriageResult | null>(null);

// Input state
const [message, setMessage] = useState('');
const [selectedImage, setSelectedImage] = useState<File | null>(null);
const [isLoading, setIsLoading] = useState(false);

// Session state
const [sessionId, setSessionId] = useState<string>('');
const [patientData, setPatientData] = useState<PatientIntakeForm | null>(null);
```

---

## API Integration

```typescript
const sendMessage = async () => {
  if (!message.trim() && !selectedImage) return;

  // Optimistic update
  const userMessage: Message = {
    id: generateId(),
    role: 'user',
    content: message,
    timestamp: new Date().toISOString(),
    status: 'sending',
  };
  setMessages(prev => [...prev, userMessage]);

  try {
    setIsLoading(true);
    setIsTyping(true);

    // Upload image if selected
    let imageUrl = undefined;
    if (selectedImage) {
      imageUrl = await uploadImageToSupabase(selectedImage);
    }

    // Call backend API
    const response = await fetch('/api/health-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: message,
        image_url: imageUrl,
        user_id: userId,
        session_id: sessionId,
        location: await getUserLocation(),
      }),
    });

    if (!response.ok) throw new Error('API request failed');

    const data = await response.json();

    // Update user message status
    setMessages(prev =>
      prev.map(m => m.id === userMessage.id ? { ...m, status: 'sent' } : m)
    );

    // Add assistant response
    const assistantMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: generateResponseText(data),
      timestamp: new Date().toISOString(),
      status: 'sent',
    };
    setMessages(prev => [...prev, assistantMessage]);

    // Set triage result
    setTriageResult(data);
    setSessionId(data.session_id);

    // Clear input
    setMessage('');
    setSelectedImage(null);

  } catch (error) {
    console.error('Send message error:', error);

    // Mark message as error
    setMessages(prev =>
      prev.map(m => m.id === userMessage.id ? { ...m, status: 'error' } : m)
    );

    toast.error('Failed to send message. Please try again.');
  } finally {
    setIsLoading(false);
    setIsTyping(false);
  }
};
```

---

## Keyboard Shortcuts

```typescript
const handleKeyDown = (e: React.KeyboardEvent) => {
  // Send on Enter (without Shift)
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }

  // Shift + Enter = new line (default behavior)
};
```

---

## Accessibility

- Chat messages announced to screen readers
- Typing indicator has `aria-live="polite"`
- Input has proper label (`aria-label="Type a message"`)
- Keyboard navigation works throughout
- Focus management (auto-focus input after send)

---

**Next:** [04-MVP-COMPONENTS.md](04-MVP-COMPONENTS.md)
