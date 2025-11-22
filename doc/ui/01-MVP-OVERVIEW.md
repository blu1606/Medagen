# MVP Overview - Medagen

**Medical AI Triage Assistant - Product Overview**

---

## User Persona

### Primary: Patient (End User)

**Demographics:**
- Age: 18-65
- Tech-savvy: Medium
- Health literacy: Varies
- Access: Smartphone or computer

**Goals:**
- Quick health assessment
- Understand urgency level
- Get clear recommendations
- Find nearby clinic if needed

**Pain Points:**
- Uncertain if symptoms need immediate attention
- Long wait times at clinics
- Limited medical knowledge
- Need guidance before doctor visit

---

## User Journey Map

```
1. AWARENESS
   User feels unwell, searches for health assessment
   ↓
2. ARRIVAL
   Lands on Medagen homepage
   ↓
3. ONBOARDING
   Reads brief intro about AI triage
   Clicks "Start Assessment"
   ↓
4. DATA COLLECTION (Patient Intake)
   Fills personal info
   Describes symptoms
   Uploads photo (optional)
   ↓
5. CONSULTATION (Chat Interface)
   AI asks follow-up questions
   User responds naturally
   Back-and-forth conversation
   ↓
6. DIAGNOSIS (Triage Result)
   Receives triage level (emergency/urgent/routine/self-care)
   Sees summary and recommendations
   Gets nearest clinic info
   ↓
7. ACTION
   Follows recommendation
   Books appointment or goes to ER
   Or continues self-care at home
```

---

## Complete User Flow

### Flow 1: First-Time User

```
[Landing Page] → "Start Assessment" button
    ↓
[Patient Intake Form]
├─ Personal Info: Name, Age, Gender
├─ Medical History: Conditions, Allergies, Medications
└─ Current Symptoms: Main complaint, Duration, Severity, Image
    ↓
"Submit & Start Chat" button
    ↓
[Chat Interface] - Initial message auto-sent with patient data
    ↓
AI responds with follow-up question
    ↓
User types response
    ↓
[Multiple turns of conversation]
    ↓
AI provides [Triage Result Card]
├─ Triage Level badge (colored)
├─ Symptom summary
├─ Red flags (if any)
├─ Suspected conditions
├─ Recommendations
└─ Nearest clinic (if location provided)
    ↓
User can continue conversation OR exit
```

### Flow 2: Error Handling

```
User submits form with missing required fields
    ↓
[Validation errors shown inline]
    ↓
User corrects errors
    ↓
Continues to chat

OR

API request fails during chat
    ↓
[Error toast shown]
    ↓
"Retry" button appears
    ↓
User clicks retry
    ↓
Request resent
```

### Flow 3: Image Upload

```
User clicks image upload button
    ↓
[File picker opens]
    ↓
User selects image
    ↓
[Image preview shown with loading spinner]
    ↓
Image uploaded to Supabase Storage
    ↓
Public URL returned
    ↓
Included in chat message
```

---

## Feature Requirements

### Must-Have (MVP)

#### 1. Patient Intake Form ⭐
**Description:** Multi-step form collecting patient information before chat

**Requirements:**
- Personal info fields (name, age, gender)
- Medical history (chronic conditions, allergies, medications)
- Current symptoms (main complaint, duration, severity)
- Optional image upload
- Field validation
- Responsive design
- Auto-save to localStorage (prevent data loss)

**Success Criteria:**
- Form completion rate >80%
- All validations working correctly
- No data loss on page refresh

#### 2. Chat Interface ⭐
**Description:** Real-time conversation with AI triage assistant

**Requirements:**
- Message display (user vs assistant styling)
- Text input with send button
- Image upload capability
- Typing indicator while AI responds
- Auto-scroll to latest message
- Loading states
- Error handling

**Success Criteria:**
- Messages sent/received without delay
- Typing indicator shows during AI processing
- Chat history persists in session

#### 3. Triage Result Display ⭐
**Description:** Structured display of triage assessment

**Requirements:**
- Triage level badge (emergency/urgent/routine/self-care)
- Color-coded based on severity
- Symptom summary
- Red flags list (if any)
- Suspected conditions with confidence
- Action recommendations
- Nearest clinic info with map link
- Print/share functionality

**Success Criteria:**
- Result clearly visible and readable
- User understands next steps
- Clinic link opens Google Maps

#### 4. Session Management
**Description:** Track user conversations across sessions

**Requirements:**
- Create new session on form submit
- Pass session_id through chat
- Retrieve conversation history
- Continue existing session

**Success Criteria:**
- Session ID properly tracked
- Messages persist across page refresh

#### 5. Responsive Design
**Description:** Works on all devices

**Requirements:**
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px)
- Touch-friendly buttons (min 44x44px)
- Readable text on small screens

**Success Criteria:**
- Usable on iPhone SE (375px width)
- Usable on iPad (768px width)
- Usable on desktop (1280px+ width)

### Nice-to-Have (Post-MVP)

- Voice input
- Multi-language support
- Dark mode
- Chat history view (past sessions)
- PDF export of triage result
- Push notifications
- User accounts/profiles

---

## Page Structure

### Page 1: Landing / Home
**Path:** `/`
**Purpose:** Introduction and CTA

**Sections:**
1. Hero: "Get AI-Powered Health Assessment"
2. Features: Quick, Accurate, Available 24/7
3. CTA: "Start Free Assessment" button → Patient Intake

### Page 2: Patient Intake
**Path:** `/intake`
**Purpose:** Collect patient information

**Sections:**
1. Header: Progress indicator
2. Form: Personal info, Medical history, Symptoms
3. Footer: "Cancel" and "Submit" buttons

### Page 3: Chat Interface
**Path:** `/chat?session=[id]`
**Purpose:** AI consultation

**Sections:**
1. Header: Patient name, session ID
2. Main: Chat messages area
3. Result: Triage result card (when ready)
4. Footer: Message input area

### Page 4: Result (Optional standalone)
**Path:** `/result?session=[id]`
**Purpose:** Detailed triage result view

**Sections:**
1. Header: Triage level badge
2. Main: Full result details
3. Actions: Print, Share, New Assessment buttons

---

## Technical Requirements

### Frontend Stack
- Next.js 14+ (App Router)
- React 18+
- TypeScript 5+
- Tailwind CSS + Shadcn/UI
- React Hook Form + Zod (form validation)
- React Query (API calls)
- Zustand (state management - optional)

### Backend Integration
- REST API endpoints (Fastify backend)
- POST `/api/health-check` - Main triage
- GET `/api/conversations/:session_id` - Chat history
- Supabase client for auth and storage

### Performance Targets
- First Contentful Paint: <1.5s
- Largest Contentful Paint: <2.5s
- Time to Interactive: <3.5s
- Form submission: <500ms
- Chat message send: <200ms
- AI response: <5s (backend processing)

### Browser Support
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile Safari (iOS 14+)
- Chrome Android

---

## Success Metrics

### User Engagement
- Form completion rate: >80%
- Average conversation length: 3-5 messages
- Result view rate: >95%

### Technical Performance
- Page load time: <3s
- API success rate: >99%
- Error rate: <1%

### User Satisfaction
- User understands triage level: >90%
- User follows recommendation: >80%
- Would use again: >75%

---

## MVP Scope

### In Scope ✅
- Patient intake form (3 sections)
- Chat interface (text + image)
- Triage result display
- Session management
- Responsive design (mobile + desktop)
- Basic error handling
- Loading states
- Form validation

### Out of Scope ❌
- User authentication (use anonymous sessions)
- Payment integration
- Multi-language (English only for MVP)
- Voice input
- Video consultation
- Prescription management
- Electronic health records (EHR) integration
- Insurance verification

---

## Design Principles

### 1. Trust
- Professional medical aesthetic
- Clear, honest communication
- No overpromising AI capabilities
- Disclaimers about AI limitations

### 2. Clarity
- Simple, jargon-free language
- Visual hierarchy (important info stands out)
- Progress indicators
- Clear next steps

### 3. Speed
- Fast page loads
- Instant feedback on actions
- No unnecessary steps
- Quick triage results

### 4. Accessibility
- WCAG 2.1 AA compliant
- Keyboard navigation
- Screen reader support
- High contrast colors

### 5. Empathy
- Friendly, supportive tone
- Reassuring messages
- Acknowledge user concerns
- Provide clear guidance

---

## Competitive Analysis

| Feature | Ada Health | Babylon | Medagen MVP |
|---------|-----------|---------|-------------|
| Patient intake | ✅ | ✅ | ✅ |
| Chat interface | ✅ | ✅ | ✅ |
| Image upload | ❌ | Limited | ✅ |
| Triage levels | ✅ | ✅ | ✅ (4 levels) |
| Clinic finder | Limited | ✅ | ✅ (Google Maps) |
| Free to use | Limited | ❌ | ✅ |
| Open source | ❌ | ❌ | ✅ (planned) |

**Differentiation:**
- Open source framework
- Multi-modal (text + image)
- Explainable AI (consultation chain)
- Community-driven

---

## Next Steps

After MVP launch:
1. Gather user feedback
2. Measure success metrics
3. Iterate on UX pain points
4. Add user accounts
5. Expand to multi-language
6. Add more specialized models

---

**Next:** [02-MVP-PATIENT-INTAKE.md](02-MVP-PATIENT-INTAKE.md) - Detailed form specification
