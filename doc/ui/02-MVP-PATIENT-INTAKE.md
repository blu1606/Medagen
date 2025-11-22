# Patient Intake Form - Detailed Specification

**Path:** `/intake`

---

## Overview

The Patient Intake Form is the first interaction point where users provide essential information before starting the AI chat consultation. This single-page form collects personal details, medical history, and current symptoms.

---

## Page Layout

```
┌─────────────────────────────────────────┐
│  [Logo] Patient Information Form        │  ← Header
├─────────────────────────────────────────┤
│                                         │
│  Progress: ███████░░░ 70% Complete      │  ← Progress bar
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Section 1: Personal Information   │ │
│  │ [Name field]                      │ │
│  │ [Age field] [Gender dropdown]     │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Section 2: Medical History        │ │
│  │ [Chronic conditions multi-select] │ │
│  │ [Allergies multi-select]          │ │
│  │ [Current medications textarea]    │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Section 3: Current Symptoms       │ │
│  │ [Main complaint textarea]         │ │
│  │ [Duration dropdown]               │ │
│  │ [Severity dropdown]               │ │
│  │ [Optional image upload]           │ │
│  └───────────────────────────────────┘ │
│                                         │
│  [Cancel]          [Submit & Continue] │  ← Footer actions
│                                         │
└─────────────────────────────────────────┘
```

---

## Data Structure

```typescript
interface PatientIntakeForm {
  // Section 1: Personal Information
  name: string;                    // Required, 2-50 characters
  age: number;                     // Required, 1-120
  gender: 'male' | 'female' | 'other' | 'prefer_not_to_say';  // Required

  // Section 2: Medical History
  chronic_conditions: string[];    // Optional, multi-select
  allergies: string[];            // Optional, multi-select
  current_medications?: string;    // Optional, free text

  // Section 3: Current Symptoms
  main_complaint: string;          // Required, 10-500 characters
  duration: string;                // Required, dropdown
  severity: 'mild' | 'moderate' | 'severe';  // Required
  symptom_image?: File;           // Optional, max 10MB
}
```

---

## Section 1: Personal Information

### Name Field
```tsx
<FormField
  control={form.control}
  name="name"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Full Name *</FormLabel>
      <FormControl>
        <Input
          placeholder="John Doe"
          {...field}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Validation:**
- Required
- Min length: 2 characters
- Max length: 50 characters
- Pattern: Letters, spaces, hyphens only
- Error messages:
  - Empty: "Name is required"
  - Too short: "Name must be at least 2 characters"
  - Invalid chars: "Name can only contain letters, spaces, and hyphens"

### Age Field
```tsx
<FormField
  control={form.control}
  name="age"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Age *</FormLabel>
      <FormControl>
        <Input
          type="number"
          placeholder="25"
          {...field}
        />
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Validation:**
- Required
- Min: 1
- Max: 120
- Type: Number
- Error messages:
  - Empty: "Age is required"
  - Out of range: "Age must be between 1 and 120"

### Gender Field
```tsx
<FormField
  control={form.control}
  name="gender"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Gender *</FormLabel>
      <Select onValueChange={field.onChange} defaultValue={field.value}>
        <FormControl>
          <SelectTrigger>
            <SelectValue placeholder="Select gender" />
          </SelectTrigger>
        </FormControl>
        <SelectContent>
          <SelectItem value="male">Male</SelectItem>
          <SelectItem value="female">Female</SelectItem>
          <SelectItem value="other">Other</SelectItem>
          <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
        </SelectContent>
      </Select>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Validation:**
- Required
- Must be one of: male, female, other, prefer_not_to_say

---

## Section 2: Medical History

### Chronic Conditions (Multi-Select)
```tsx
<FormField
  control={form.control}
  name="chronic_conditions"
  render={() => (
    <FormItem>
      <FormLabel>Chronic Conditions (Select all that apply)</FormLabel>
      <div className="space-y-2">
        {conditions.map((condition) => (
          <FormField
            key={condition.id}
            control={form.control}
            name="chronic_conditions"
            render={({ field }) => (
              <FormItem className="flex items-center space-x-2">
                <FormControl>
                  <Checkbox
                    checked={field.value?.includes(condition.id)}
                    onCheckedChange={(checked) => {
                      const updated = checked
                        ? [...field.value, condition.id]
                        : field.value.filter((v) => v !== condition.id);
                      field.onChange(updated);
                    }}
                  />
                </FormControl>
                <FormLabel className="font-normal">
                  {condition.label}
                </FormLabel>
              </FormItem>
            )}
          />
        ))}
      </div>
    </FormItem>
  )}
/>
```

**Options:**
- Diabetes
- Hypertension (High blood pressure)
- Asthma
- Heart disease
- Kidney disease
- Liver disease
- Cancer
- Autoimmune disorder
- None
- Other (with text field)

**Validation:**
- Optional
- If "Other" selected, require text input

### Allergies (Multi-Select)
**Options:**
- Drug allergies (specify)
- Food allergies (specify)
- Environmental allergies
- Latex allergy
- No known allergies

**Validation:**
- Optional
- If drug/food selected, require specification

### Current Medications (Textarea)
```tsx
<FormField
  control={form.control}
  name="current_medications"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Current Medications (Optional)</FormLabel>
      <FormControl>
        <Textarea
          placeholder="List any medications you're currently taking, including dosage if known"
          className="min-h-[100px]"
          {...field}
        />
      </FormControl>
      <FormDescription>
        Include prescription and over-the-counter medications
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Validation:**
- Optional
- Max length: 500 characters

---

## Section 3: Current Symptoms

### Main Complaint (Textarea)
```tsx
<FormField
  control={form.control}
  name="main_complaint"
  render={({ field }) => (
    <FormItem>
      <FormLabel>Main Complaint *</FormLabel>
      <FormControl>
        <Textarea
          placeholder="Describe your symptoms in detail. What's bothering you?"
          className="min-h-[120px]"
          {...field}
        />
      </FormControl>
      <FormDescription>
        {field.value?.length || 0}/500 characters (minimum 10)
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Validation:**
- Required
- Min length: 10 characters
- Max length: 500 characters
- Error messages:
  - Empty: "Please describe your symptoms"
  - Too short: "Please provide more details (at least 10 characters)"

### Duration (Dropdown)
```tsx
<Select>
  <SelectTrigger>
    <SelectValue placeholder="How long have you had these symptoms?" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="less_than_1_day">Less than 1 day</SelectItem>
    <SelectItem value="1_3_days">1-3 days</SelectItem>
    <SelectItem value="3_7_days">3-7 days</SelectItem>
    <SelectItem value="1_2_weeks">1-2 weeks</SelectItem>
    <SelectItem value="more_than_2_weeks">More than 2 weeks</SelectItem>
  </SelectContent>
</Select>
```

**Validation:**
- Required

### Severity (Dropdown)
```tsx
<Select>
  <SelectTrigger>
    <SelectValue placeholder="How severe are your symptoms?" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="mild">
      <div className="flex items-center gap-2">
        <Badge variant="selfcare">Mild</Badge>
        <span className="text-sm">Uncomfortable but manageable</span>
      </div>
    </SelectItem>
    <SelectItem value="moderate">
      <div className="flex items-center gap-2">
        <Badge variant="routine">Moderate</Badge>
        <span className="text-sm">Interfering with daily activities</span>
      </div>
    </SelectItem>
    <SelectItem value="severe">
      <div className="flex items-center gap-2">
        <Badge variant="urgent">Severe</Badge>
        <span className="text-sm">Significantly impacting life</span>
      </div>
    </SelectItem>
  </SelectContent>
</Select>
```

**Validation:**
- Required

### Image Upload (Optional)
```tsx
<FormField
  control={form.control}
  name="symptom_image"
  render={({ field: { value, onChange, ...field } }) => (
    <FormItem>
      <FormLabel>Upload Image (Optional)</FormLabel>
      <FormControl>
        <div className="space-y-2">
          <Input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                // Validate file size
                if (file.size > 10 * 1024 * 1024) {
                  toast.error('File size must be less than 10MB');
                  return;
                }
                onChange(file);
              }
            }}
            {...field}
          />
          {value && (
            <div className="relative">
              <img
                src={URL.createObjectURL(value)}
                alt="Preview"
                className="w-full max-w-xs rounded-md"
              />
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="absolute top-2 right-2"
                onClick={() => onChange(null)}
              >
                Remove
              </Button>
            </div>
          )}
        </div>
      </FormControl>
      <FormDescription>
        Upload a clear photo of the affected area (max 10MB)
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>
```

**Validation:**
- Optional
- Accepted formats: .jpg, .png, .webp
- Max file size: 10MB
- Error messages:
  - Too large: "File size must be less than 10MB"
  - Wrong format: "Please upload a JPG, PNG, or WebP image"

---

## Form Validation Schema (Zod)

```typescript
import { z } from 'zod';

const patientIntakeSchema = z.object({
  // Personal Information
  name: z.string()
    .min(2, 'Name must be at least 2 characters')
    .max(50, 'Name must be less than 50 characters')
    .regex(/^[a-zA-Z\s-]+$/, 'Name can only contain letters, spaces, and hyphens'),

  age: z.number()
    .min(1, 'Age must be at least 1')
    .max(120, 'Age must be less than 120'),

  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say'], {
    required_error: 'Please select a gender',
  }),

  // Medical History
  chronic_conditions: z.array(z.string()).optional(),
  allergies: z.array(z.string()).optional(),
  current_medications: z.string().max(500).optional(),

  // Current Symptoms
  main_complaint: z.string()
    .min(10, 'Please provide more details (at least 10 characters)')
    .max(500, 'Description must be less than 500 characters'),

  duration: z.enum([
    'less_than_1_day',
    '1_3_days',
    '3_7_days',
    '1_2_weeks',
    'more_than_2_weeks'
  ], {
    required_error: 'Please select symptom duration',
  }),

  severity: z.enum(['mild', 'moderate', 'severe'], {
    required_error: 'Please select symptom severity',
  }),

  symptom_image: z.instanceof(File).optional(),
});

type PatientIntakeForm = z.infer<typeof patientIntakeSchema>;
```

---

## Form Behavior

### Progressive Disclosure
- Show sections sequentially as user scrolls
- Or use accordion/tabs for each section

### Auto-Save
```typescript
useEffect(() => {
  // Save to localStorage every 2 seconds
  const timer = setTimeout(() => {
    localStorage.setItem('patient_intake_draft', JSON.stringify(form.getValues()));
  }, 2000);

  return () => clearTimeout(timer);
}, [form.watch()]);

// Restore on mount
useEffect(() => {
  const draft = localStorage.getItem('patient_intake_draft');
  if (draft) {
    const data = JSON.parse(draft);
    form.reset(data);
    toast.info('Draft restored');
  }
}, []);
```

### Submit Handler
```typescript
const onSubmit = async (data: PatientIntakeForm) => {
  try {
    // 1. Upload image if provided
    let imageUrl = undefined;
    if (data.symptom_image) {
      setUploadingImage(true);
      imageUrl = await uploadImageToSupabase(data.symptom_image);
    }

    // 2. Store form data in state/context
    setPatientData({
      ...data,
      image_url: imageUrl,
    });

    // 3. Clear draft
    localStorage.removeItem('patient_intake_draft');

    // 4. Navigate to chat
    router.push('/chat');

  } catch (error) {
    toast.error('Failed to submit form. Please try again.');
    console.error(error);
  } finally {
    setUploadingImage(false);
  }
};
```

---

## Loading States

### Form Submission
```tsx
<Button
  type="submit"
  disabled={isSubmitting || uploadingImage}
  className="w-full"
>
  {uploadingImage ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Uploading image...
    </>
  ) : isSubmitting ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Submitting...
    </>
  ) : (
    'Submit & Continue'
  )}
</Button>
```

### Image Upload Progress
```tsx
{uploadingImage && (
  <div className="space-y-2">
    <Progress value={uploadProgress} />
    <p className="text-sm text-muted-foreground">
      Uploading... {uploadProgress}%
    </p>
  </div>
)}
```

---

## Error Handling

### Field-Level Errors
```tsx
{errors.name && (
  <p className="text-sm text-error mt-1 flex items-center gap-1">
    <AlertCircle className="h-3 w-3" />
    {errors.name.message}
  </p>
)}
```

### Form-Level Errors
```tsx
{formError && (
  <Alert variant="destructive" className="mb-4">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Submission Failed</AlertTitle>
    <AlertDescription>{formError}</AlertDescription>
  </Alert>
)}
```

---

## Accessibility

- All form fields have proper labels
- Error messages linked via `aria-describedby`
- Required fields marked with `*` and `aria-required`
- Keyboard navigation works throughout
- Focus trap in form (can't tab outside)
- Clear focus indicators on all inputs

---

## Mobile Considerations

- Single column layout on mobile
- Large touch targets (min 44x44px)
- Native inputs for better UX (type="tel" for phone, etc.)
- Sticky submit button at bottom
- Prevent zoom on input focus (font-size: 16px minimum)

---

**Next:** [03-MVP-CHAT-INTERFACE.md](03-MVP-CHAT-INTERFACE.md)
