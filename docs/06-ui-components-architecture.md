# UI Components Architecture

**Purpose**: Modern, accessible, and responsive component system for medical UI

---

## Overview

Medagen's frontend follows **atomic design principles** with a component hierarchy optimized for medical UX.

**Design Philosophy**:
- 🎯 **Clarity over cleverness**: Medical UI must be obvious, not creative
- 🚨 **Safety-first**: Red flags visually prominent, critical actions confirmed
- 📱 **Mobile-first**: 70% of Vietnam users on mobile
- ♿ **Accessible**: Screen reader support, high contrast, keyboard nav

---

## Component Hierarchy

```
atoms/       → Basic building blocks (buttons, badges, inputs)
molecules/   → Simple combinations (ChatInput, BodyMapSelector)
organisms/   → Complex features (ChatWindow, WizardIntake)
templates/   → Page layouts (ChatLayout, IntakeLayout)
pages/       → Actual Next.js routes
```

---

## Design System Foundation

### Technology Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router) |
| **Styling** | Tailwind CSS 4 |
| **Components** | shadcn/ui (Radix UI primitives) |
| **Animation** | Framer Motion |
| **Icons** | Lucide React |
| **Forms** | React Hook Form + Zod |

### Theme Configuration

**File**: `frontend/tailwind.config.ts`

```typescript
export default {
  theme: {
    extend: {
      colors: {
        // Medical severity colors
        emergency: 'hsl(0, 84%, 60%)',      // Red
        urgent: 'hsl(25, 95%, 53%)',        // Orange
        routine: 'hsl(142, 71%, 45%)',      // Green
        selfCare: 'hsl(200, 98%, 39%)',     // Blue
        
        // Semantic colors
        success: 'hsl(142, 71%, 45%)',
        warning: 'hsl(38, 92%, 50%)',
        error: 'hsl(0, 84%, 60%)',
        info: 'hsl(200, 98%, 39%)',
      },
      
      animation: {
        'thinking-pulse': 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
}
```

---

## Key Atoms

### 1. StatusBadge

**File**: `frontend/components/atoms/StatusBadge.tsx`

**Purpose**: Display triage level with color-coded severity

```typescript
interface StatusBadgeProps {
  level: 'emergency' | 'urgent' | 'routine' | 'self_care';
  size?: 'sm' | 'md' | 'lg';
}

export function StatusBadge({ level, size = 'md' }: StatusBadgeProps) {
  const colors = {
    emergency: 'bg-emergency text-white',
    urgent: 'bg-urgent text-white',
    routine: 'bg-routine text-white',
    self_care: 'bg-selfCare text-white',
  };
  
  const sizes = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-semibold',
      colors[level],
      sizes[size]
    )}>
      <AlertCircle size={16} />
      {level.toUpperCase().replace('_', ' ')}
    </span>
  );
}
```

### 2. ConfidenceMeter

**File**: `frontend/components/atoms/ConfidenceMeter.tsx`

**Purpose**: Visualize AI confidence (never show >90% to users)

```typescript
export function ConfidenceMeter({ confidence }: { confidence: number }) {
  const cappedConfidence = Math.min(confidence, 0.9); // Cap at 90%
  const color = cappedConfidence > 0.7 ? 'bg-success' : 
                cappedConfidence > 0.4 ? 'bg-warning' : 'bg-error';
  
  return (
    <div className="w-full">
      <div className="flex justify-between text-sm mb-1">
        <span>Confidence</span>
        <span>{Math.round(cappedConfidence * 100)}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <motion.div
          className={cn('h-2 rounded-full', color)}
          initial={{ width: 0 }}
          animate={{ width: `${cappedConfidence * 100}%` }}
          transition={{ duration: 0.5 }}
        />
      </div>
    </div>
  );
}
```

---

## Key Molecules

### 1. ChatInput

**File**: `frontend/components/molecules/ChatInput.tsx`

**Features**:
- Text + image upload
- Enter to send (Shift+Enter for newline)
- Character count
- Disabled while AI responding

```typescript
export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [text, setText] = useState('');
  const [image, setImage] = useState<File | null>(null);
  
  const handleSubmit = () => {
    if (text.trim() || image) {
      onSend(text, image);
      setText('');
      setImage(null);
    }
  };
  
  return (
    <div className="border-t bg-white p-4">
      {/* Image preview */}
      {image && (
        <ImagePreview 
          file={image} 
          onRemove={() => setImage(null)} 
        />
      )}
      
      {/* Input area */}
      <div className="flex gap-2">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Describe your symptoms..."
          disabled={disabled}
          className="flex-1"
        />
        
        {/* Image upload button */}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setImage(e.target.files?.[0] || null)}
          className="hidden"
          id="image-upload"
        />
        <label htmlFor="image-upload">
          <Button variant="outline" size="icon" as Component="div">
            <Image size={20} />
          </Button>
        </label>
        
        {/* Send button */}
        <Button onClick={handleSubmit} disabled={disabled || (!text && !image)}>
          <Send size={20} />
        </Button>
      </div>
      
      {/* Character count */}
      <div className="text-xs text-gray-500 mt-1">
        {text.length}/500
      </div>
    </div>
  );
}
```

### 2. ThinkingIndicator

**File**: `frontend/components/molecules/ThinkingIndicator.tsx`

**Purpose**: Show AI is processing (displays streamed thoughts)

```typescript
export function ThinkingIndicator({ thought }: { thought?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg"
    >
      {/* Animated icon */}
      <Loader2 className="animate-spin text-blue-600 mt-1" size={20} />
      
      <div className="flex-1">
        <div className="font-semibold text-blue-900 mb-1">AI is thinking...</div>
        {thought && (
          <div className="text-sm text-blue-700 italic">
            💭 {thought}
          </div>
        )}
      </div>
    </motion.div>
  );
}
```

### 3. QuickReplies

**File**: `frontend/components/molecules/QuickReplies.tsx`

**Purpose**: Suggest common follow-up questions

```typescript
interface QuickReply {
  text: string;
  icon?: React.ReactNode;
}

export function QuickReplies({ 
  replies, 
  onSelect 
}: { 
  replies: QuickReply[];
  onSelect: (text: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 p-4">
      {replies.map((reply, i) => (
        <Button
          key={i}
          variant="outline"
          size="sm"
          onClick={() => onSelect(reply.text)}
          className="text-sm"
        >
          {reply.icon}
          {reply.text}
        </Button>
      ))}
    </div>
  );
}

// Usage
<QuickReplies
  replies={[
    { text: "How severe is this?", icon: <AlertCircle size={14} /> },
    { text: "What should I do?", icon: <HelpCircle size={14} /> },
    { text: "Find nearby clinic", icon: <MapPin size={14} /> },
  ]}
  onSelect={(text) => sendMessage(text)}
/>
```

---

## Key Organisms

### 1. ChatWindow

**File**: `frontend/components/organisms/ChatWindow.tsx`

**Features**:
- Message list with auto-scroll
- Real-time ReAct flow visualization
- Typing indicators
- Session context awareness

```typescript
export function ChatWindow({ sessionId }: { sessionId: string }) {
  const { messages, sendMessage, isConnected } = useWebSocket(sessionId);
  const [reactSteps, setReactSteps] = useState<ReactStep[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, reactSteps]);
  
  return (
    <div className="flex flex-col h-full">
      {/* Header: Session info */}
      <div className="border-b p-4 bg-gray-50">
        <div className="flex justify-between">
          <h2 className="font-semibold">Health Assessment</h2>
          <div className={cn(
            "flex items-center gap-2",
            isConnected ? "text-green-600" : "text-gray-400"
          )}>
            <Circle size={8} className="fill-current" />
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>
      </div>
      
      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        
        {/* ReAct flow (if active) */}
        {reactSteps.length > 0 && (
          <ReActFlowContainer steps={reactSteps} />
        )}
        
        <div ref={messagesEndRef} />
      </ScrollArea>
      
      {/* Input */}
      <ChatInput onSend={sendMessage} disabled={!isConnected} />
    </div>
  );
}
```

### 2. TriageResultCard

**File**: `frontend/components/organisms/TriageResultCard.tsx`

**Purpose**: Display comprehensive triage assessment

```typescript
export function TriageResultCard({ result }: { result: TriageResult }) {
  return (
    <Card className="p-6">
      {/* Header with severity badge */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Assessment Result</h3>
        <StatusBadge level={result.triage_level} size="lg" />
      </div>
      
      {/* Red flags (if any) */}
      {result.red_flags.length > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Red Flags Detected</AlertTitle>
          <AlertDescription>
            <ul className="list-disc pl-4 mt-2">
              {result.red_flags.map((flag, i) => (
                <li key={i}>{flag}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
      
      {/* Symptom summary */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2">Symptoms</h4>
        <p className="text-gray-700">{result.symptom_summary}</p>
      </div>
      
      {/* Suspected conditions */}
      <div className="mb-4">
        <h4 className="font-semibold mb-2">Possible Conditions</h4>
        {result.suspected_conditions.map((condition, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <span className="font-medium">{condition.name}</span>
            <Badge variant="outline">{condition.source}</Badge>
            <ConfidenceMeter confidence={
              condition.confidence === 'high' ? 0.8 :
              condition.confidence === 'medium' ? 0.6 : 0.4
            } />
          </div>
        ))}
      </div>
      
      {/* Recommendation */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold mb-2">Recommended Action</h4>
        <p className="mb-2">{result.recommendation.action}</p>
        <p className="text-sm text-gray-600">
          <strong>Timeframe:</strong> {result.recommendation.timeframe}
        </p>
      </div>
      
      {/* Actions */}
      <div className="flex gap-2 mt-4">
        <Button variant="outline">
          <Download size={16} />
          Download Report
        </Button>
        <Button>
          <MapPin size={16} />
          Find Nearby Clinic
        </Button>
      </div>
    </Card>
  );
}
```

### 3. ReActFlowContainer

**File**: `frontend/components/organisms/ReActFlowContainer.tsx`

**Purpose**: Visualize AI reasoning process in real-time

```typescript
export function ReActFlowContainer({ steps }: { steps: ReactStep[] }) {
  return (
    <div className="space-y-3 my-4">
      {steps.map((step, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.1 }}
        >
          {step.type === 'thought' && (
            <ThoughtBubble>{step.content}</ThoughtBubble>
          )}
          
          {step.type === 'action' && (
            <ToolExecutionCard toolName={step.toolName} input={step.input} />
          )}
          
          {step.type === 'observation' && (
            <ObservationPanel result={step.content} />
          )}
        </motion.div>
      ))}
    </div>
  );
}
```

---

## State Management

### Zustand Stores

**Session Store** (`frontend/store/sessionStore.ts`):

```typescript
interface SessionStore {
  currentSessionId: string | null;
  sessions: Session[];
  setCurrentSession: (id: string) => void;
  addSession: (session: Session) => void;
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set) => ({
      currentSessionId: null,
      sessions: [],
      
      setCurrentSession: (id) => set({ currentSessionId: id }),
      
      addSession: (session) => set((state) => ({
        sessions: [...state.sessions, session],
        currentSessionId: session.id,
      })),
    }),
    { name: 'medagen-sessions' }
  )
);
```

---

## Responsive Design

### Breakpoints

```typescript
// Mobile-first approach
const breakpoints = {
  sm: '640px',  // Small phones
  md: '768px',  // Tablets
  lg: '1024px', // Desktops
  xl: '1280px', // Large screens
};
```

### Mobile Optimizations

```tsx
<div className="
  flex-col      // Mobile: stack vertically
  md:flex-row   // Desktop: side-by-side
  gap-4
">
  <Sidebar className="
    w-full        // Mobile: full width
    md:w-64       // Desktop: fixed width
  " />
  
  <ChatWindow className="flex-1" />
</div>
```

---

## Accessibility

### Screen Reader Support

```tsx
<Button aria-label="Send message" onClick={handleSend}>
  <Send size={20} aria-hidden="true" />
</Button>

<StatusBadge 
  level="emergency"
  aria-label="Emergency severity level"
/>
```

### Keyboard Navigation

```tsx
<Chatinput
  onKeyDown={(e) => {
    if (e.key === 'Escape') closeChat();
    if (e.key === 'Enter' && !e.shiftKey) sendMessage();
  }}
/>
```

### High Contrast Mode

```css
@media (prefers-contrast: high) {
  .status-badge-emergency {
    border: 2px solid black;
  }
}
```

---

## Animation Strategy

### Purposeful Motion

```tsx
// Entrance animation
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  <TriageResultCard />
</motion.div>

// Loading state
<motion.div
  animate={{ rotate: 360 }}
  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
>
  <Loader2 />
</motion.div>
```

**Accessibility**: Respect `prefers-reduced-motion`:

```tsx
const shouldReduceMotion = useReducedMotion();

<motion.div
  animate={shouldReduceMotion ? {} : { opacity: 1, y: 0 }}
>
```

---

## Performance

### Code Splitting

```tsx
// Lazy load heavy components
const BodyMapSelector = dynamic(
  () => import('@/components/molecules/BodyMapSelector'),
  { ssr: false, loading: () => <Skeleton className="h-96" /> }
);
```

### Memoization

```tsx
const MemoizedTriageCard = React.memo(
  TriageResultCard,
  (prev, next) => prev.result.id === next.result.id
);
```

---

## Future Enhancements

-  **Dark mode**: System-aware theme switching
- **Offline UI**: Show cached data when disconnected
- **Voice UI**: Voice input/output for accessibility
- **PWA**: Install as native app on mobile
