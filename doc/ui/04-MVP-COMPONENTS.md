# Component Library - MVP

**Reusable Components for Medagen Frontend**

---

## Component Hierarchy

```
Atoms (Base elements)
├─ Button
├─ Input
├─ Badge
├─ Avatar
└─ Icon

Molecules (Simple combinations)
├─ FormField
├─ MessageBubble
├─ StatusBadge
└─ ImageUpload

Organisms (Complex components)
├─ PatientIntakeForm
├─ ChatWindow
├─ TriageResultCard
└─ ClinicCard

Templates (Page layouts)
├─ FormLayout
└─ ChatLayout
```

---

## Atoms

### Button
**From:** Shadcn/UI
**Variants:** primary, secondary, outline, ghost, destructive, link

```tsx
import { Button } from '@/components/ui/button';

<Button>Primary</Button>
<Button variant="outline">Secondary</Button>
<Button variant="destructive">Delete</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
<Button disabled>Disabled</Button>
```

### Input
**From:** Shadcn/UI

```tsx
<Input type="text" placeholder="Enter text" />
<Input type="email" placeholder="email@example.com" />
<Input type="number" min={0} max={120} />
<Input disabled />
```

### Badge
**Custom variants for triage levels**

```tsx
<Badge variant="emergency">Emergency</Badge>
<Badge variant="urgent">Urgent</Badge>
<Badge variant="routine">Routine</Badge>
<Badge variant="selfcare">Self-Care</Badge>
```

### Avatar
**From:** Shadcn/UI

```tsx
<Avatar>
  <AvatarImage src="/user.jpg" />
  <AvatarFallback>JD</AvatarFallback>
</Avatar>
```

---

## Molecules

### FormField Component

```tsx
interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  description?: string;
  children: React.ReactNode;
}

export function FormField({
  label,
  error,
  required,
  description,
  children
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required && <span className="text-error ml-1">*</span>}
      </Label>
      {children}
      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {error && (
        <p className="text-sm text-error flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}
```

### StatusBadge Component

```tsx
interface StatusBadgeProps {
  status: 'sending' | 'sent' | 'error';
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const config = {
    sending: { icon: Loader2, className: 'animate-spin' },
    sent: { icon: Check, className: 'text-success' },
    error: { icon: AlertCircle, className: 'text-error' },
  };

  const { icon: Icon, className } = config[status];

  return <Icon className={cn('h-3 w-3', className)} />;
}
```

### ImageUpload Component

```tsx
interface ImageUploadProps {
  value?: File;
  onChange: (file: File | null) => void;
  maxSize?: number; // in MB
  disabled?: boolean;
}

export function ImageUpload({
  value,
  onChange,
  maxSize = 10,
  disabled
}: ImageUploadProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSize * 1024 * 1024) {
      toast.error(`File must be less than ${maxSize}MB`);
      return;
    }

    onChange(file);
  };

  return (
    <div className="space-y-2">
      <Input
        type="file"
        accept="image/*"
        onChange={handleChange}
        disabled={disabled}
      />
      {value && (
        <div className="relative inline-block">
          <img
            src={URL.createObjectURL(value)}
            alt="Preview"
            className="max-w-xs rounded-md"
          />
          <Button
            size="sm"
            variant="destructive"
            className="absolute top-2 right-2"
            onClick={() => onChange(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
```

---

## Organisms

### PatientIntakeForm

See [02-MVP-PATIENT-INTAKE.md](02-MVP-PATIENT-INTAKE.md) for full implementation.

**Key props:**
```tsx
interface PatientIntakeFormProps {
  onSubmit: (data: PatientIntakeForm) => Promise<void>;
  initialData?: Partial<PatientIntakeForm>;
}
```

### ChatWindow

See [03-MVP-CHAT-INTERFACE.md](03-MVP-CHAT-INTERFACE.md) for full implementation.

**Key props:**
```tsx
interface ChatWindowProps {
  sessionId: string;
  patientData: PatientIntakeForm;
  onTriageComplete: (result: TriageResult) => void;
}
```

### TriageResultCard

See [03-MVP-CHAT-INTERFACE.md](03-MVP-CHAT-INTERFACE.md#5-triage-result-card) for full implementation.

**Key props:**
```tsx
interface TriageResultCardProps {
  result: TriageResult;
  onExport?: () => void;
  onNewAssessment?: () => void;
}
```

### ClinicCard Component

```tsx
interface ClinicCardProps {
  clinic: {
    name: string;
    address: string;
    distance_km: number;
    rating?: number;
    user_ratings_total?: number;
  };
}

export function ClinicCard({ clinic }: ClinicCardProps) {
  const handleOpenMaps = () => {
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clinic.name)}`;
    window.open(url, '_blank');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          {clinic.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">{clinic.address}</p>
        <p className="text-sm">Distance: {clinic.distance_km} km away</p>
        {clinic.rating && (
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm">{clinic.rating}/5</span>
            {clinic.user_ratings_total && (
              <span className="text-sm text-muted-foreground">
                ({clinic.user_ratings_total} reviews)
              </span>
            )}
          </div>
        )}
        <Button onClick={handleOpenMaps} className="w-full mt-2">
          Open in Google Maps
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

## Templates

### FormLayout

```tsx
interface FormLayoutProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function FormLayout({ title, description, children }: FormLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-2">{description}</p>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
```

### ChatLayout

```tsx
interface ChatLayoutProps {
  header: React.ReactNode;
  messages: React.ReactNode;
  input: React.ReactNode;
}

export function ChatLayout({ header, messages, input }: ChatLayoutProps) {
  return (
    <div className="flex flex-col h-screen">
      {header}
      <div className="flex-1 overflow-hidden">
        {messages}
      </div>
      {input}
    </div>
  );
}
```

---

## Utility Components

### LoadingSpinner

```tsx
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  return <Loader2 className={cn('animate-spin', sizeClass[size])} />;
}
```

### EmptyState

```tsx
interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon = FileQuestion,
  title,
  description,
  action
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center">
      <Icon className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground mt-2">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
```

### ErrorBoundary

```tsx
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Something went wrong</AlertTitle>
          <AlertDescription>
            {this.state.error?.message || 'An unexpected error occurred'}
          </AlertDescription>
        </Alert>
      );
    }

    return this.props.children;
  }
}
```

---

## Component Organization

```
components/
├── ui/                    # Shadcn components
│   ├── button.tsx
│   ├── input.tsx
│   ├── card.tsx
│   └── ...
├── atoms/
│   ├── StatusBadge.tsx
│   └── LoadingSpinner.tsx
├── molecules/
│   ├── FormField.tsx
│   ├── MessageBubble.tsx
│   └── ImageUpload.tsx
├── organisms/
│   ├── PatientIntakeForm.tsx
│   ├── ChatWindow.tsx
│   ├── TriageResultCard.tsx
│   └── ClinicCard.tsx
├── templates/
│   ├── FormLayout.tsx
│   └── ChatLayout.tsx
└── utility/
    ├── EmptyState.tsx
    └── ErrorBoundary.tsx
```

---

**Next:** [05-BACKEND-INTEGRATION.md](05-BACKEND-INTEGRATION.md)
