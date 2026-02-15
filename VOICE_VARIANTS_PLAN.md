# Voice Variants Feature Implementation Summary

## ✅ Completed Features

### 1. Power Plan Cap (1,000 scans)
- Updated `PLAN_LIMITS` in `shopify.server.ts`
- Changed from `Infinity` to `1000` scans/month
- Updated pricing page display

### 2. Scan Top-Up Packages
**Three packages available:**
- **100 scans**: $9.99 ($0.10/scan)
- **500 scans**: $39.99  ($0.08/scan) - Best Value
- **1,000 scans**: $69.99 ($0.07/scan)

**Features:**
- One-time purchase (not subscription)
- Bonus scans never expire
- Added to `Shop Settings.bonusScans` field
- Automatically credited after purchase
- Success page with 3-second redirect

**Database Changes:**
- Added `bonusScans` field to `ShopSettings` model
- Migration: `20260209191411_add_bonus_scans`

**UI Updates:**
- New top-up section on pricing page
- "Best Value" badge on 500-scan package
- Shows per-scan cost
- Auto-credits scans on purchase

**Logic:**
- Scan limit = Plan limit + Bonus scans
- Bonus scans used after plan scans
- Error message shows breakdown when limit reached

---

## 🎤 Voice Variants Feature (Next Step)

### Overview
Allow users to dictate product variants using voice input on mobile after scanning.

### User Flow

```
1. Mobile: Scan product ✅ SUCCESS
   
2. Mobile: Choice screen
   ┌──────────────────────────────┐
   │  Product Scanned!            │
   ├──────────────────────────────┤
   │  Does this have variants?    │
   │                              │
   │  [🎤 Speak Variants]         │ ← NEW!
   │  [Skip - No Variants]        │
   │  [📸 Scan Another]           │
   └──────────────────────────────┘

3. Mobile: User taps "Speak Variants"
   ┌──────────────────────────────┐
   │  🎤 Recording...             │
   ├──────────────────────────────┤
   │     ●━━━━━ ◉ ━━━━━●         │
   │                              │
   │  Speak clearly:              │
   │  "Sizes small medium large   │
   │   colors black white navy"   │
   │                              │
   │  [⬛ Stop Recording]         │
   └──────────────────────────────┘

4. Mobile: AI processes speech
   ┌──────────────────────────────┐
   │  ✅ Variants Detected!       │
   ├──────────────────────────────┤
   │  📏 Sizes:                   │
   │     S, M, L                  │
   │                              │
   │  🎨 Colors:                  │
   │     Black, White, Navy       │
   │                              │
   │  ✨ 9 variants will be       │
   │     created                  │
   │                              │
   │  [✓ Looks Good] [🎤 Re-do]  │
   └──────────────────────────────┘

5. Mobile: Saved to database
   - Variants stored in `ScannedProduct.variants` JSON field
   - Desktop review will show variants for confirmation
```

### Technical Implementation

#### Phase 1: Database Schema
```prisma
model ScannedProduct {
  // ... existing fields
  variants        String?   // JSON: {"options": [{"name": "Size", "values": ["S","M","L"]}]}
}
```

#### Phase 2: Speech-to-Text API
**Option A: Web Speech API (Free, Basic)**
```javascript
const recognition = new webkitSpeechRecognition();
recognition.continuous = false;
recognition.interimResults = false;

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  // "sizes small medium large colors black white"
  parseVariants(transcript);
};
```

**Option B: Google Speech-to-Text (Paid, Better)**
```javascript
// Using Google Cloud Speech-to-Text API
const audio = captureAudio();
const response = await fetch('/api/speech-to-text', {
  method: 'POST',
  body: JSON.stringify({ audio })
});
```

**Recommendation:** Start with Web Speech API (free), upgrade to Google later if needed.

Cost: Web API = $0, Google = ~$0.008/scan

#### Phase 3: AI Variant Parsing
```javascript
// Use Gemini to parse natural speech into structured variants
const prompt = `
Parse this speech into product variants:
"${transcript}"

Return JSON:
{
  "variants": [
    {"name": "Size", "values": ["S", "M", "L"]},
    {"name": "Color", "values": ["Black", "White"]}
  ]
}
`;

const result = await gemini.generateContent(prompt);
```

Cost: $0.000075 per parse (negligible)

#### Phase 4: Mobile UI Components
**New Components:**
1. `VariantChoiceScreen` - Voice/Skip/ScanAnother buttons
2. `VoiceRecordingScreen` - Recording interface
3. `VariantConfirmationScreen` - Show detected variants
4. `VoiceButton` - Animated microphone button

#### Phase 5: Variant Creation on Shopify
**When listing product:**
```graphql
mutation createProductWithVariants {
  productCreate(product: {
    title: "Blue T-Shirt"
    options: ["Size", "Color"]
  }) {
    product { id }
  }
  
  productVariantsBulkCreate(
    productId: "gid://...",
    variants: [
      { options: ["S", "Black"], price: "29.99", sku: "SHIRT-S-BLK" }
      { options: ["S", "White"], price: "29.99", sku: "SHIRT-S-WHT" }
      { options: ["M", "Black"], price: "29.99", sku: "SHIRT-M-BLK" }
      ...
    ]
  )
}
```

### Implementation Time Estimate
- Phase 1 (Database): 15 min ✅
- Phase 2 (Speech API): 45 min
- Phase 3 (AI Parsing): 30 min
- Phase 4 (Mobile UI): 90 min
- Phase 5 (Shopify Integration): 45 min
**Total: ~3.5 hours**

### Growth Plan Feature Gating
```typescript
// Only Growth and Power plans get voice variants
const canUseVoice = ["Growth", "Power"].includes(userPlan);

if (!canUseVoice) {
  // Show upgrade prompt
  return <UpgradePrompt feature="Voice Variants" />;
}
```

### Files to Create/Modify
**New Files:**
- `app/routes/api.speech-to-text.ts` - Speech processing endpoint
- `app/routes/api.parse-variants.ts` - AI variant parsing
- `app/components/VoiceRecorder.tsx` - Recording UI component

**Modified Files:**
- `mobile.$sessionId.tsx` - Add voice workflow
- `schema.prisma` - Add variants field
- `product.adapter.ts` - Create variants on Shopify
- `app._index.tsx` - Show variants in review modal

### Testing Checklist
- [ ] Record voice variant dictation
- [ ] AI correctly parses speech
- [ ] Variants saved to database
- [ ] Desktop shows variants for review
- [ ] Variants created correctly on Shopify  
- [ ] SKUs generated per variant
- [ ] Inventory split across variants
- [ ] Free/Starter users see upgrade prompt

---

## Revenue Impact

### With Voice Variants Enabled

**Cost per scan:**
- Base AI: $0.000075
- Speech-to-Text: $0.008 (if using Google)
- Variant parsing: $0.000075
**Total: ~$0.008/scan**

**Growth Plan ($49.99) with 500 scans:**
```
Revenue:           $49.99
Shopify fee (20%): -$10.00
AI costs:          -$4.08  (500 × $0.008)
Fixed overhead:    -$2.00
──────────────────────────────
Profit:            $33.91  (67.8% margin)
```

Still highly profitable! ✅

### Alternative: Web Speech API (Free)
If using browser's Web Speech API:
```
Revenue:           $49.99
Shopify fee (20%): -$10.00
AI costs:          -$0.04  (500 × $0.000075, no speech cost)
Fixed overhead:    -$2.00
──────────────────────────────
Profit:            $37.95  (75.9% margin)
```

**Recommendation:** Start with Web Speech API, add Google as premium option later.

---

## Next Steps

Ready to implement voice variants? Shall I:
1. ✅ Start with Web Speech API (free, good enough)
2. ✅ Add variant field to database
3. ✅ Build mobile voice UI
4. ✅ Implement AI variant parsing
5. ✅ Update Shopify adapter for variants

**Estimated completion: 3-4 hours**

Say "implement voice variants" and I'll start building! 🚀
