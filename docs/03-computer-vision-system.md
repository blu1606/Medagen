# Computer Vision System

**Purpose**: 3-tier medical image analysis for dermatology, ophthalmology, and wound assessment

---

## Overview

Medagen's Computer Vision system uses a **cascade architecture** - three specialized detection layers that progressively refine diagnosis like a funnel:

```
Tier 1: Body Region → "This is skin on the arm"
Tier 2: Specialty → "Route to Dermatology model"
Tier 3: Pathology → "Likely Contact Dermatitis (72%)"
```

**Why 3 Tiers?**
- ❌ Single model can't specialize in all medical domains
- ✅ Specialized models achieve higher accuracy in their domain
- ✅ Router prevents using wrong model (e.g., eye model on skin)
- ✅ Scalable - add new specialties without retraining everything

---

## 3-Tier Architecture

### Tier 1: Body Region Classification

**Purpose**: Identify anatomical location in image

**Model**: `CV_Body_Classifier` (lightweight ResNet or MobileNet)

**Output Examples**:
- `thorax` - Chest area
- `face` - Facial region
- `skin_surface` - General skin
- `extremity` - Arm/leg
- `eye_closeup` - Eye-specific view

**Training Data**: ~50k labeled medical images across body regions

```python
# Pseudocode for Tier 1
def classify_body_region(image):
    features = extract_features(image)
    region = body_classifier.predict(features)
    confidence = get_confidence_score(region)
    
    return {
        'region': region,                    # e.g., "face"
        'confidence': confidence,            # e.g., 0.94
        'alternate_regions': get_top_3()    # fallback options
    }
```

**Special Case: Reject Non-Medical**
```python
if confidence < 0.3 or region in ['vehicle', 'landscape', 'animal']:
    return {
        'status': 'rejected',
        'reason': 'Image does not appear to be medical in nature'
    }
```

---

### Tier 2: Specialty Routing

**Purpose**: Map body region + symptom context → medical specialty

**Routing Table**:

| Region | Symptom Keywords | Specialty | Model |
|--------|-----------------|-----------|-------|
| `face` | rash, acne, mole, lesion | Dermatology | `derm_cv` |
| `eye_closeup` | red, blurry, discharge | Ophthalmology | `eye_cv` |
| `skin_surface` | wound, cut, burn, ulcer | Wound Care | `wound_cv` |
| `thorax` + "lump" | mass, tumor | Oncology | `onco_cv` (future) |
| `bone_xray` | fracture, pain | Orthopedics | `ortho_cv` (future) |

**Algorithm** (file: `src/services/cv.service.ts`):

```typescript
function routeToSpecialty(
  bodyRegion: string,
  userText: string,
  imageUrl: string
): CVModel {
  const symptoms = extractSymptomKeywords(userText);
  
  // Priority 1: Explicit specialty keywords
  if (symptoms.includes('eye') || bodyRegion === 'eye_closeup') {
    return 'eye_cv';
  }
  
  // Priority 2: Wound-specific indicators
  if (['wound', 'cut', 'burn', 'ulcer'].some(kw => symptoms.includes(kw))) {
    return 'wound_cv';
  }
  
  // Priority 3: Skin conditions (default for skin surfaces)
  if (bodyRegion.includes('skin') || bodyRegion === 'face') {
    return 'derm_cv';
  }
  
  // Fallback: General dermatology
  return 'derm_cv';
}
```

---

### Tier 3: Pathology Detection

**Purpose**: Identify specific medical conditions within specialty domain

#### Model 1: `derm_cv` (Dermatology)

**API Endpoint**: External Gradio service
**Input**: Image URL
**Output**: Top N conditions with probabilities

**Conditions Detected** (~50 classes):
- Acne Vulgaris
- Eczema / Atopic Dermatitis
- Psoriasis
- Contact Dermatitis
- Fungal Infections (Tinea)
- Melanoma (skin cancer screening)
- Rosacea  
- Seborrheic Dermatitis
- Vitiligo
- ...

**Example Call**:

```typescript
// File: src/services/cv.service.ts
export class CVService {
  async callDermCV(imageUrl: string) {
    const response = await axios.post(
      process.env.DERM_CV_ENDPOINT,
      { data: [imageUrl] }
    );
    
    // Response format:
    // {
    //   data: [{
    //     label: "Acne Vulgaris",
    //     score: 0.78
    //   }, ...]
    // }
    
    const predictions = response.data.data[0];
    
    return {
      model_used: 'derm_cv',
      top_conditions: predictions.slice(0, 5).map(p => ({
        name: p.label,
        prob: p.score,
        confidence: p.score > 0.7 ? 'high' : p.score > 0.4 ? 'medium' : 'low'
      })),
      raw_output: predictions,
    };
  }
}
```

**Confidence Interpretation**:
- `high` (>70%): Strong match, use as primary suspect
- `medium` (40-70%): Possible match, mention as differential
- `low` (<40%): Low confidence, don't emphasize

---

#### Model 2: `eye_cv` (Ophthalmology)

**Conditions Detected** (~30 classes):
- Conjunctivitis (pink eye)
- Subconjunctival Hemorrhage
- Hordeolum (stye)
- Chalazion
- Blepharitis
- Keratitis
- Pterygium
- Cataracts (visible)
- Glaucoma indicators
- ...

**Implementation** (similar to derm_cv):

```typescript
async callEyeCV(imageUrl: string) {
  const response = await axios.post(
    process.env.EYE_CV_ENDPOINT,
    { data: [imageUrl] }
  );
  
  return {
    model_used: 'eye_cv',
    top_conditions: response.data.data[0].slice(0, 5).map(p => ({
      name: p.label,
      prob: p.score,
      confidence: this.getConfidenceLevel(p.score),
    })),
  };
}
```

---

#### Model 3: `wound_cv` (Wound Assessment)

**Conditions Detected** (~25 classes):
- Superficial Abrasion
- Laceration (shallow/deep)
- Avulsion
- Puncture Wound
- Thermal Burn (1st/2nd/3rd degree)
- Chemical Burn
- Pressure Ulcer (Stage I-IV)
- Diabetic Ulcer
- Infected Wound (signs of)
- ...

**Additional Metrics**:
```typescript
{
  wound_type: "Laceration",
  severity: "moderate",
  infection_risk: "low",
  healing_stage: "inflammatory",
  size_estimate: "2-3 cm", // if detectable
}
```

---

## Integration with Agent

### Flow Example: Skin Rash Analysis

**User Input**:
- Text: "Red itchy rash on my arm for 3 days"
- Image: [uploads photo]

**Execution**:

```typescript
// Step 1: Intent classifier routes to triage workflow
const intent = intentClassifier.classify(text, hasImage: true);
// Result: { type: 'triage', confidence: 'high' }

// Step 2: Agent decides to use CV tool
💭 Thought: User provided image of skin condition. Should analyze visually.

🔧 Action: tool_cv_derm
   Input: { image_url: "https://..." }

// Step 3: CV Service executes 3-tier cascade
// Tier 1: Body classifier
const region = bodyClassifier.predict(image);
// Result: { region: 'extremity', confidence: 0.89 }

// Tier 2: Route to specialty
const specialty = routeToSpecialty(region, text, image);
// Result: 'derm_cv' (skin condition keywords + extremity region)

// Tier 3: Pathology detection
const conditions = await callDermCV(imageUrl);
// Result: [
//   { name: "Contact Dermatitis", prob: 0.72, confidence: "high" },
//   { name: "Eczema", prob: 0.18, confidence: "low" },
//   { name: "Fungal Infection", prob: 0.08, confidence: "low" }
// ]

// Step 4: Agent receives observation
👁️ Observation: {
     "model_used": "derm_cv",
     "top_conditions": [
       {"name": "Contact Dermatitis", "probability": 0.72, "confidence": "high"}
     ]
   }

// Step 5: Agent validates with RAG
🔧 Action: tool_rag_search
   Input: { query: "contact dermatitis treatment guidelines" }

// Step 6: Agent synthesizes final answer
✅ Final Answer: {
     "suspected_conditions": [
       {
         "name": "Contact Dermatitis",
         "confidence": "medium",
         "source": "cv_model"
       }
     ],
     "cv_findings": {
       "model_used": "derm_cv",
       "raw_output": { ... }
     },
     "recommendation": {
       "action": "Likely contact dermatitis. Avoid suspected allergen...",
       "timeframe": "If no improvement in 3-5 days, see dermatologist"
     }
   }
```

---

## Confidence Calibration

### Why Not Trust 100%?

CV models are assistive tools, not diagnostic devices. We apply **confidence dampening**:

```typescript
function calibrateConfidence(cvProb: number): string {
  // Never claim >90% confidence to users, even if model says 99%
  if (cvProb > 0.8) return 'This image may show signs consistent with...';
  if (cvProb > 0.5) return 'Possible indication of...';
  return 'Image analysis suggests considering...';
}
```

### Multi-Source Validation

CV results gain trust when corroborated:

```
CV says: Contact Dermatitis (72%)
+ RAG guideline: "Contact dermatitis presents as red, itchy rash..."
+ User symptoms: "Red, itchy rash"
= HIGH confidence this is accurate
```

---

## Error Handling

### CV Service Unavailable

```typescript
async function resilientCVCall(imageUrl: string, modelType: string) {
  try {
    return await cvService.call(modelType, imageUrl);
  } catch (error) {
    logger.error(`CV model ${modelType} failed:`, error);
    
    // Graceful degradation
    return {
      model_used: 'none',
      error: 'Image analysis temporarily unavailable',
      fallback_advice: 'Please describe your visible symptoms in text',
      raw_output: null,
    };
  }
}
```

### Image Quality Issues

```typescript
// Pre-flight checks before sending to model
function validateImage(image: File): ValidationResult {
  if (image.size > 10MB) {
    return { valid: false, reason: 'Image too large (>10MB)' };
  }
  
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(image.type)) {
    return { valid: false, reason: 'Unsupported format. Use JPG/PNG/WebP' };
  }
  
  // Check minimum resolution (simulated)
  if (image.width < 224 || image.height < 224) {
    return { valid: false, reason: 'Image resolution too low. Min 224x224px' };
  }
  
  return { valid: true };
}
```

---

## Model Performance Metrics

### Dermatology Model (`derm_cv`)

**Training Data**: 100,000+ labeled dermatology images
**Architecture**: EfficientNet-B4 fine-tuned
**Performance** (internal validation):
- **Top-1 Accuracy**: 76%
- **Top-3 Accuracy**: 91%
- **Precision (high-confidence predictions)**: 84%
- **Recall (emergency conditions)**: 92%

**Limitations**:
- Struggles with rare conditions (<100 training examples)
- Performance degrades with poor lighting
- May misclassify with overlapping symptoms (eczema vs. psoriasis)

### Eye Model (`eye_cv`)

**Training Data**: 50,000+ ophthalmic images
**Architecture**: ResNet-50 + attention mechanism
**Performance**:
- **Top-1 Accuracy**: 72%
- **Top-3 Accuracy**: 88%
- **Red-Flag Detection**: 95% (conjunctivitis, hemorrhage)

**Limitations**:
- Requires close-up, well-lit images
- Cannot detect internal eye conditions
- May miss subtle early-stage cataracts

### Wound Model (`wound_cv`)

**Training Data**: 40,000+ wound images
**Architecture**: U-Net for segmentation + ResNet for classification
**Performance**:
- **Wound Type Accuracy**: 79%
- **Severity Staging (ulcers)**: 82%
- **Infection Risk Assessment**: 75%

**Limitations**:
- Size estimation only works with scale reference
- Cannot assess wound depth from photos
- Lighting dramatically affects severity classification

---

## Privacy & Security

### Image Handling

**Client-Side**:
- Images compressed before upload (target: <500KB)
- No images stored in browser cache after session ends

**Server-Side**:
- Images uploaded to **temporary storage** (Supabase Storage)
- TTL: 24 hours, then auto-deleted
- Access: Signed URLs with 1-hour expiration
- No permanent image retention (HIPAA/GDPR compliance)

**CV Model API**:
- Stateless inference (no image retention)
- Images purged from memory after processing
- No training on patient data without consent

```typescript
// Image lifecycle
const imageUrl = await uploadImage(file);  // → Supabase temp storage
const cvResult = await callDermCV(imageUrl); // → CV API inference → purged
// After 24h: imageUrl expires & file deleted
```

---

## Future Enhancements

### Tier 0: Privacy-Preserving Pre-Filter

**Goal**: Detect non-medical/inappropriate images before sending to CV
**Model**: Lightweight on-device classifier (TensorFlow.js)
**Categories**: Medical / Non-medical / Inappropriate

```javascript
// Client-side filtering
const preCheck = await clientSideClassifier.predict(image);
if (preCheck.category === 'non-medical') {
  alert('Please upload a medical image (skin, wound, eye, etc.)');
  return;
}
```

### Multi-Modal Fusion

Combine image + text for better accuracy:

```python
# Pseudocode
text_embedding = embed(user_text)  # "red itchy rash"
image_embedding = extract_cv_features(image)

fused_embedding = concat([text_embedding, image_embedding])
prediction = fusion_model.predict(fused_embedding)
```

### Explainability (Grad-CAM)

Show users which part of image influenced diagnosis:

```
Original Image + Heatmap Overlay
→ Highlights: "Model focused on this red patch"
```

### Offline CV (Edge Deployment)

**Challenge**: Current models run on cloud GPUs
**Solution**: Quantized TensorFlow Lite models for on-device inference
**Benefit**: Works in areas with no internet (rural Vietnam)

```
Medagen App: 120MB (app + lightweight CV models)
→ Basic dermatology detection offline
→ Sync with cloud when online for advanced analysis
```

---

## Testing & Validation

### Unit Tests

```typescript
describe('CV Service', () => {
  it('calls derm_cv with correct payload', async () => {
    const imageUrl = 'https://example.com/rash.jpg';
    const result = await cvService.callDermCV(imageUrl);
    
    expect(result.model_used).toBe('derm_cv');
    expect(result.top_conditions).toHaveLength(5);
    expect(result.top_conditions[0]).toHaveProperty('name');
    expect(result.top_conditions[0]).toHaveProperty('prob');
  });
});
```

### Integration Tests

```typescript
describe('3-Tier CV Cascade', () => {
  it('routes skin image to derm_cv', async () => {
    const testImage = loadTestImage('skin_rash.jpg');
    
    // Tier 1
    const region = await bodyClassifier.predict(testImage);
    expect(region).toBe('skin_surface');
    
    // Tier 2
    const specialty = routeToSpecialty(region, 'itchy rash', testImage);
    expect(specialty).toBe('derm_cv');
    
    // Tier 3
    const result = await cvService.callDermCV(testImage);
    expect(result.top_conditions[0].name).toContain('Dermatitis');
  });
});
```

### Clinical Validation

**Gold Standard**: Board-certified dermatologist/ophthalmologist review

**Process**:
1. Collect 1000 real patient images (de-identified)
2. CV Model predicts top-3 conditions
3. Specialist reviews and labels ground truth
4. Calculate concordance rate

**Target Concordance**:
- Top-1: ≥75% match with specialist
- Top-3: ≥90% match with specialist

---

## API Reference

### POST /api/cv/derm

**Request**:
```json
{
  "image_url": "https://storage.googleapis.com/..."
}
```

**Response**:
```json
{
  "model_used": "derm_cv",
  "top_conditions": [
    {
      "name": "Acne Vulgaris",
      "prob": 0.78,
      "confidence": "high"
    },
    {
      "name": "Rosacea",
      "prob": 0.15,
      "confidence": "low"
    }
  ],
  "raw_output": { ... }
}
```

### POST /api/cv/eye

Similar structure, returns ophthalmology conditions.

### POST /api/cv/wound

Similar structure, includes additional wound-specific metrics.

---

**All CV models are assistive tools, not diagnostic devices. Results must be validated by healthcare professionals.**
