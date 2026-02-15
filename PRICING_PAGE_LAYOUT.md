# Updated Pricing Page - Visual Layout

## Main Pricing Tiers (4 Cards in One Row)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              PLANS & PRICING                                         │
├──────────────┬──────────────┬─────────────────┬──────────────┐
│    FREE      │   STARTER    │  GROWTH         │    POWER     │
│              │              │  [Most Popular] │              │
│              │              │                 │              │
│    $0        │   $19.99     │   $49.99        │   $99.99     │
│  per month   │  per month   │  per month      │  per month   │
│              │              │                 │              │
│ 3 Scans/mo   │ 100 Scans/mo │ 500 Scans/mo    │ 1,000 Scans  │
│              │              │                 │              │
│ Test the app │ Small        │ Growing stores  │ High-volume  │
│              │ boutiques    │                 │              │
│              │              │                 │              │
│ ✓ Features:  │ ✓ Features:  │ ✓ Features:     │ ✓ Features:  │
│ • AI product │ • Everything │ • Everything in │ • Everything │
│   scanning   │   in Free    │   Starter       │   in Growth  │
│ • Auto SKU   │ • 100 scans  │ • 500 scans     │ • 1,000 scans│
│   generation │ • Batch      │ • 🎤 Voice      │ • API access │
│ • Inventory  │   scanning   │   variants      │ • Custom     │
│   tracking   │ • Priority   │ • Analytics     │   integration│
│ • Draft      │   support    │ • Bulk ops      │ • Dedicated  │
│   creation   │ • Shopify    │                 │   support    │
│ • 3 monthly  │   export     │                 │              │
│   scans      │              │                 │              │
│              │              │                 │              │
│  [Current]   │  [Upgrade]   │   [Upgrade]     │  [Upgrade]   │
└──────────────┴──────────────┴─────────────────┴──────────────┘
```

## Scan Top-Ups Section (Below Main Plans)

```
┌─────────────────────────────────────────────────────────────────┐
│                     🔋 SCAN TOP-UPS                             │
│                                                                 │
│  Need more scans this month? Purchase one-time top-ups          │
│  that never expire.                                             │
│                                                                 │
├──────────────────┬─────────────────────┬───────────────────────┤
│   100 SCANS      │   500 SCANS         │   1,000 SCANS        │
│                  │   [Best Value]      │                      │
│                  │                     │                      │
│   $9.99          │   $39.99            │   $69.99             │
│   $0.10/scan     │   $0.08/scan        │   $0.07/scan         │
│                  │                     │                      │
│   [Buy Now]      │   [Buy Now]         │   [Buy Now]          │
└──────────────────┴─────────────────────┴───────────────────────┘
```

## Key Improvements

### 1. **4-Column Grid Layout**
- All 4 pricing tiers fit in one row
- Fixed width columns: `repeat(4, 1fr)`
- Consistent card heights
- Clean spacing: 16px gap

### 2. **Feature Bullet Lists**
Each plan now shows **5 bullet points** clearly explaining:
- FREE: Basic features (AI scanning, SKU, inventory, drafts, 3 scans)
- STARTER: Everything in Free + 100 scans + batch + support + export
- GROWTH: Everything in Starter + 500 scans + Voice + analytics + bulk
- POWER: Everything in Growth + 1K scans + API + custom + dedicated

### 3. **Visual Hierarchy**
- Plan name: `headingMd`
- Price: `headingXl` (bold, prominent)
- "per month": subdued small text
- Scan badge: info tone
- Description: subdued bodySm
- Features: bullet list with bodySm text
- CTA button: full width

### 4. **Value Communication**
Users can now clearly see:
- ✅ What they get in each tier
- ✅ Feature progression (everything in lower tier +)
- ✅ Exact scan limits
- ✅ Premium features (🎤 Voice variants in Growth+)
- ✅ Per-scan cost in top-ups

### 5. **Mobile Responsiveness**
The grid uses `repeat(4, 1fr)` for desktop. On mobile/tablet, Polaris's responsive design will stack cards vertically automatically.

## Feature Highlights

### FREE (Entry)
- Basic AI functionality
- Test before committing
- 3 scans to try the app

### STARTER ($19.99)
- For small boutiques
- 100 scans = ~25 products/week
- Batch scanning capability
- Priority support

### GROWTH ($49.99) ⭐ MOST POPULAR
- For active resellers
- 500 scans = ~125 products/week
- **🎤 Voice variants** (exclusive)
- Advanced analytics
- Bulk operations

### POWER ($99.99)
- For high-volume stores
- 1,000 scans = ~250 products/week
- API access for integrations
- Custom workflows
- Dedicated support team

## Top-Up Economics

| Package | Price | Scans | Per-Scan | Savings vs Starter |
|---------|-------|-------|-----------|--------------------|
| 100     | $9.99 | 100   | $0.10     | 50% more expensive |
| 500     | $39.99| 500   | $0.08     | Same value ✅       |
| 1,000   | $69.99| 1,000 | $0.07     | 30% cheaper ✅      |

**Strategy**: Top-ups are best for seasonal spikes, not regular use. Encourages plan upgrades!

## Conversion Funnel

```
FREE (Try it)
  ↓ Reach 3 scans
STARTER (Buy in)
  ↓ Growth + need more features
GROWTH (Primary target) ← 500 scans + voice variants
  ↓ High volume needs
POWER (Enterprise)
  ↓ Seasonal spikes
TOP-UPS (One-time)
```

## Next Steps

User can now:
1. ✅ See all plans at once
2. ✅ Compare features side-by-side
3. ✅ Understand value progression
4. ✅ Purchase top-ups when needed
5. ✅ Spot "Most Popular" recommendation

**Ready to test the new pricing page!** 🎨
