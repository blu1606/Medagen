# Design System - Medagen MVP

**Medical AI Triage Assistant - Design Foundation**

---

## Overview

This document defines the design system for Medagen's MVP frontend, built with Next.js 14+, Shadcn/UI, and Tailwind CSS. Our design prioritizes **trust, clarity, and accessibility** to create a professional medical interface.

---

## Technology Stack

### Core Framework
- **Next.js 14+** (App Router)
- **React 18+**
- **TypeScript 5+**

### UI Framework
- **Shadcn/UI** - Component library
- **Tailwind CSS** - Utility-first styling
- **Radix UI** - Headless components (Shadcn foundation)
- **Lucide React** - Icon library

### Utilities
- **clsx** / **cn** - Conditional class names
- **tailwind-merge** - Merge Tailwind classes
- **date-fns** - Date formatting

---

## Installation Guide

### 1. Initialize Next.js Project

```bash
npx create-next-app@latest medagen-frontend --typescript --tailwind --app
cd medagen-frontend
```

### 2. Install Shadcn/UI

```bash
npx shadcn-ui@latest init
```

**Configuration:**
```
? Would you like to use TypeScript (recommended)? yes
? Which style would you like to use? › Default
? Which color would you like to use as base color? › Blue
? Where is your global CSS file? › app/globals.css
? Would you like to use CSS variables for colors? › yes
? Are you using a custom tailwind prefix eg. tw-? (Leave blank if not) ›
? Where is your tailwind.config.js located? › tailwind.config.ts
? Configure the import alias for components: › @/components
? Configure the import alias for utils: › @/lib/utils
? Are you using React Server Components? › yes
```

### 3. Install Base Components

```bash
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add label
npx shadcn-ui@latest add card
npx shadcn-ui@latest add badge
npx shadcn-ui@latest add avatar
npx shadcn-ui@latest add textarea
npx shadcn-ui@latest add select
npx shadcn-ui@latest add toast
npx shadcn-ui@latest add dialog
npx shadcn-ui@latest add skeleton
npx shadcn-ui@latest add form
```

---

## Color Palette

### Medical Blue Theme

Our primary color is **Medical Blue** - trustworthy, calming, and associated with healthcare.

```css
/* tailwind.config.ts */
export default {
  theme: {
    extend: {
      colors: {
        // Primary - Medical Blue
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#0066cc',  // Main brand color
          600: '#0052a3',
          700: '#003d7a',
          800: '#002952',
          900: '#001429',
        },

        // Triage Levels
        emergency: {
          DEFAULT: '#dc2626', // Red-600
          foreground: '#ffffff',
        },
        urgent: {
          DEFAULT: '#f59e0b', // Amber-500
          foreground: '#ffffff',
        },
        routine: {
          DEFAULT: '#eab308', // Yellow-500
          foreground: '#000000',
        },
        selfcare: {
          DEFAULT: '#10b981', // Green-500
          foreground: '#ffffff',
        },

        // Semantic Colors
        success: {
          DEFAULT: '#10b981', // Green-500
          foreground: '#ffffff',
        },
        warning: {
          DEFAULT: '#f59e0b', // Amber-500
          foreground: '#ffffff',
        },
        error: {
          DEFAULT: '#ef4444', // Red-500
          foreground: '#ffffff',
        },
        info: {
          DEFAULT: '#3b82f6', // Blue-500
          foreground: '#ffffff',
        },
      },
    },
  },
}
```

### Color Usage Guidelines

| Color | Use Case | Example |
|-------|----------|---------|
| `primary-500` | Primary actions, links | Submit button, navigation links |
| `emergency` | Emergency triage | Red badge, urgent alerts |
| `urgent` | Urgent triage | Orange badge, warnings |
| `routine` | Routine triage | Yellow badge, reminders |
| `selfcare` | Self-care triage | Green badge, success states |
| `success` | Success states | Form submission success |
| `error` | Error states | Validation errors, failed requests |
| `warning` | Warning states | Cautionary messages |
| `info` | Informational | Helpful tips, guidance |

---

## Typography

### Font Family

```css
/* app/globals.css */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI',
               'Helvetica Neue', Arial, sans-serif;
}

body {
  font-family: var(--font-sans);
  font-feature-settings: 'cv11', 'ss01';
  font-variation-settings: 'opsz' 32;
}
```

### Type Scale

| Element | Size | Weight | Line Height | Usage |
|---------|------|--------|-------------|-------|
| h1 | 36px (2.25rem) | 700 | 1.2 | Page titles |
| h2 | 30px (1.875rem) | 600 | 1.3 | Section headers |
| h3 | 24px (1.5rem) | 600 | 1.4 | Card titles |
| h4 | 20px (1.25rem) | 600 | 1.5 | Subsection headers |
| body-lg | 18px (1.125rem) | 400 | 1.6 | Large body text |
| body | 16px (1rem) | 400 | 1.5 | Default body text |
| body-sm | 14px (0.875rem) | 400 | 1.5 | Small text, captions |
| caption | 12px (0.75rem) | 400 | 1.4 | Tiny labels, metadata |

### Tailwind Classes

```tsx
<h1 className="text-4xl font-bold">Page Title</h1>
<h2 className="text-3xl font-semibold">Section Header</h2>
<h3 className="text-2xl font-semibold">Card Title</h3>
<h4 className="text-xl font-semibold">Subsection</h4>
<p className="text-lg">Large body</p>
<p className="text-base">Body text</p>
<p className="text-sm">Small text</p>
<p className="text-xs">Caption</p>
```

---

## Spacing System

Based on **4px baseline grid**.

```css
/* Spacing scale */
0: 0px
1: 4px
2: 8px
3: 12px
4: 16px
5: 20px
6: 24px
8: 32px
10: 40px
12: 48px
16: 64px
20: 80px
24: 96px
```

### Usage

```tsx
<div className="p-4">Padding 16px</div>
<div className="m-6">Margin 24px</div>
<div className="gap-3">Gap 12px</div>
<div className="space-y-4">Vertical spacing 16px</div>
```

---

## Border Radius

```css
/* Border radius scale */
none: 0px
sm: 4px     /* Small elements */
DEFAULT: 6px /* Buttons, inputs */
md: 8px     /* Cards */
lg: 12px    /* Large cards */
xl: 16px    /* Modals */
2xl: 24px   /* Hero sections */
full: 9999px /* Pills, avatars */
```

---

## Shadows

```css
/* Shadow scale */
sm: 0 1px 2px 0 rgb(0 0 0 / 0.05)
DEFAULT: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)
md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)
lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)
xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)
```

---

## Component Theming

### Button Variants

```tsx
// Primary (Medical Blue)
<Button>Submit</Button>

// Secondary (Outline)
<Button variant="outline">Cancel</Button>

// Ghost (Minimal)
<Button variant="ghost">Learn More</Button>

// Destructive (Red)
<Button variant="destructive">Delete</Button>

// Link
<Button variant="link">View Details</Button>
```

### Badge Variants

```tsx
// Triage Level Badges
<Badge variant="emergency">Emergency</Badge>
<Badge variant="urgent">Urgent</Badge>
<Badge variant="routine">Routine</Badge>
<Badge variant="selfcare">Self-Care</Badge>

// Status Badges
<Badge variant="success">Completed</Badge>
<Badge variant="warning">Pending</Badge>
<Badge variant="error">Failed</Badge>
```

### Card Variants

```tsx
// Default card
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>

// With shadow
<Card className="shadow-lg">...</Card>

// Interactive card
<Card className="hover:shadow-md transition-shadow cursor-pointer">...</Card>
```

---

## Animation

### Transitions

```css
/* Duration */
transition-none: 0s
transition-all: 150ms
transition: 150ms
transition-colors: 150ms
transition-opacity: 150ms
transition-shadow: 150ms
transition-transform: 150ms

/* Easing */
ease-linear
ease-in
ease-out
ease-in-out
```

### Loading States

```tsx
// Skeleton loading
<Skeleton className="h-4 w-full" />
<Skeleton className="h-10 w-10 rounded-full" />

// Spinner
<Loader2 className="h-4 w-4 animate-spin" />
```

---

## Accessibility

### WCAG 2.1 AA Compliance

**Color Contrast:**
- Text on background: Minimum 4.5:1 ratio
- Large text (18px+): Minimum 3:1 ratio
- UI components: Minimum 3:1 ratio

**Focus States:**
```css
/* All interactive elements must have visible focus */
.focus-visible:focus-visible {
  outline: 2px solid hsl(var(--ring));
  outline-offset: 2px;
}
```

**Keyboard Navigation:**
- All interactive elements keyboard accessible
- Tab order logical and intuitive
- Skip links for main content

**Screen Readers:**
```tsx
// Always provide aria-labels for icons
<Button aria-label="Submit form">
  <CheckIcon />
</Button>

// Use semantic HTML
<main>
  <section aria-labelledby="title">
    <h2 id="title">Section Title</h2>
  </section>
</main>
```

### Accessibility Checklist

- [ ] Color contrast meets WCAG AA
- [ ] All images have alt text
- [ ] Forms have proper labels
- [ ] Focus indicators visible
- [ ] Keyboard navigation works
- [ ] Screen reader tested
- [ ] Error messages clear
- [ ] Loading states announced

---

## Responsive Design

### Breakpoints

```css
/* Tailwind breakpoints */
sm: 640px   /* Small tablets */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large desktops */
```

### Mobile-First Approach

```tsx
// Default mobile, then desktop
<div className="w-full md:w-1/2 lg:w-1/3">
  Responsive width
</div>

// Stack on mobile, side-by-side on desktop
<div className="flex flex-col md:flex-row gap-4">
  <div>Left</div>
  <div>Right</div>
</div>
```

### Container

```tsx
<div className="container mx-auto px-4 sm:px-6 lg:px-8">
  Responsive container
</div>
```

---

## Dark Mode (Optional for Future)

```tsx
// Enable dark mode in tailwind.config.ts
export default {
  darkMode: 'class', // or 'media'
}

// Usage
<div className="bg-white dark:bg-slate-900 text-black dark:text-white">
  Content
</div>
```

---

## Icons

### Lucide React

```tsx
import {
  AlertCircle,
  CheckCircle,
  Info,
  XCircle,
  Loader2,
  Upload,
  Send,
  MapPin,
  Phone,
  User
} from 'lucide-react';

// Usage
<AlertCircle className="h-4 w-4 text-error" />
<CheckCircle className="h-5 w-5 text-success" />
```

### Icon Sizes

| Size | Class | Pixels | Use Case |
|------|-------|--------|----------|
| XS | `h-3 w-3` | 12px | Inline with text |
| SM | `h-4 w-4` | 16px | Buttons, badges |
| MD | `h-5 w-5` | 20px | Default icons |
| LG | `h-6 w-6` | 24px | Headers, emphasis |
| XL | `h-8 w-8` | 32px | Large icons |
| 2XL | `h-10 w-10` | 40px | Hero sections |

---

## Form Elements

### Input Styling

```tsx
// Standard input
<Input
  type="text"
  placeholder="Enter name"
  className="w-full"
/>

// With error
<Input
  type="text"
  className="border-error focus-visible:ring-error"
  aria-invalid="true"
/>

// Disabled
<Input disabled />
```

### Form Labels

```tsx
<Label htmlFor="name" className="text-sm font-medium">
  Full Name <span className="text-error">*</span>
</Label>
<Input id="name" required />
```

### Form Validation

```tsx
// Error message
<p className="text-sm text-error mt-1">
  <AlertCircle className="inline h-3 w-3 mr-1" />
  This field is required
</p>

// Success message
<p className="text-sm text-success mt-1">
  <CheckCircle className="inline h-3 w-3 mr-1" />
  Input valid
</p>
```

---

## Layout Grid

### Page Layout

```tsx
<div className="min-h-screen bg-background">
  {/* Header */}
  <header className="border-b">
    <div className="container mx-auto px-4 py-4">
      <nav>Navigation</nav>
    </div>
  </header>

  {/* Main Content */}
  <main className="container mx-auto px-4 py-8">
    <div className="max-w-4xl mx-auto">
      {/* Page content */}
    </div>
  </main>

  {/* Footer */}
  <footer className="border-t mt-auto">
    <div className="container mx-auto px-4 py-6">
      Footer
    </div>
  </footer>
</div>
```

---

## Design Tokens Export

```typescript
// lib/design-tokens.ts
export const tokens = {
  colors: {
    primary: 'hsl(213, 100%, 40%)',
    emergency: 'hsl(0, 84%, 60%)',
    urgent: 'hsl(38, 92%, 50%)',
    routine: 'hsl(48, 96%, 53%)',
    selfcare: 'hsl(160, 84%, 39%)',
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  borderRadius: {
    sm: '4px',
    md: '6px',
    lg: '8px',
    xl: '12px',
  },
} as const;
```

---

## Best Practices

### Do's ✅
- Use Shadcn components as base
- Follow medical blue color scheme
- Maintain 4px spacing grid
- Ensure WCAG AA compliance
- Use semantic HTML
- Provide proper ARIA labels
- Test keyboard navigation

### Don'ts ❌
- Don't use inline styles
- Don't skip accessibility attributes
- Don't use tiny text (<12px)
- Don't ignore color contrast
- Don't create custom components without reason
- Don't use colors outside the palette

---

## Resources

- **Shadcn/UI:** https://ui.shadcn.com/
- **Tailwind CSS:** https://tailwindcss.com/
- **Radix UI:** https://www.radix-ui.com/
- **Lucide Icons:** https://lucide.dev/
- **WCAG Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/

---

**Next:** [01-MVP-OVERVIEW.md](01-MVP-OVERVIEW.md) - User flows and feature requirements
