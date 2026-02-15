# Variant Templates Feature (Growth Plan)

## Overview
A premium feature for Growth Plan users that allows them to define variant templates (sizes, colors) that automatically apply to scanned products.

## User Flow

### 1. Variant Template Setup (One-time)
**Location:** Dashboard Settings → Variant Templates

```
┌──────────────────────────────────┐
│  Variant Templates               │
├──────────────────────────────────┤
│                                  │
│  📏 Size Template                │
│  ☑ Enabled                       │
│  Sizes: S, M, L, XL, XXL         │
│  [Edit]                          │
│                                  │
│  🎨 Color Template                │
│  ☑ Enabled                       │
│  Colors: Black, White, Navy,     │
│           Grey, Red              │
│  [Edit]                          │
│                                  │
│  [+ Add Custom Template]         │
└──────────────────────────────────┘
```

### 2. During Product Review
When reviewing a scanned product, users see:

```
┌──────────────────────────────────┐
│  Product Details                 │
├──────────────────────────────────┤
│  Title: Blue Cotton Shirt        │
│  Price: $29.99                   │
│                                  │
│  🔥 Auto-Variants Available      │
│  ☑ Apply Size variants (S-XXL)   │
│  ☑ Apply Color variants          │
│                                  │
│  Preview:                        │
│  • Blue / S  - $29.99            │
│  • Blue / M  - $29.99            │
│  • Blue / L  - $29.99            │
│  • ... (15 variants total)       │
│                                  │
│  [Customize] [List Product]      │
└──────────────────────────────────┘
```

### 3. Auto-Population Logic
- AI detects product category (e.g., "Clothing")
- System suggests relevant templates
- User can enable/disable with one click
- Variants created automatically when listing to Shopify

## Technical Implementation

### Database Schema
```prisma
model VariantTemplate {
  id          String   @id @default(uuid())
  shop        String
  name        String   // "Size", "Color", "Material"
  values      String   // JSON array: ["S","M","L"]
  enabled     Boolean  @default(true)
  category    String?  // "Clothing", "Shoes", etc.
  createdAt   DateTime @default(now())
}
```

### API Flow
```typescript
1. GET /api/variant-templates
   → Returns user's templates

2. POST /api/apply-variants
   {
     productId: "xxx",
     templates: ["size", "color"]
   }
   → Creates variants on Shopify
   → Returns variant IDs

3. PUT /api/variant-templates/:id
   → Update template settings
```

### Shopify Variant Creation
```graphql
mutation {
  productVariantsBulkCreate(
    productId: "gid://...",
    variants: [
      { options: ["Blue", "S"], price: "29.99", sku: "SHIRT-BLU-S" }
      { options: ["Blue", "M"], price: "29.99", sku: "SHIRT-BLU-M" }
      ...
    ]
  )
}
```

## Pricing Tier Logic

### FREE Plan
- ❌ No variant templates
- Manual variant creation only

### Starter Plan ($9.99/mo)
- ❌ No variant templates
- Manual variant creation only

### Growth Plan ($29.99/mo) ✨
- ✅ Up to 3 variant templates
- ✅ Auto-apply to scanned products
- ✅ Template management UI
- ✅ Bulk variant creation

### Power Plan ($99.99/mo)
- ✅ Unlimited variant templates
- ✅ Advanced rules (category-based auto-apply)
- ✅ Custom template sharing
- ✅ CSV import for variant data

## UI Components Needed

1. **Settings Page: Template Manager**
   - List of templates
   - Add/Edit/Delete templates
   - Enable/Disable toggle
   - Category assignment

2. **Review Modal: Variant Toggle**
   - Checkbox to enable variants
   - Preview of generated variants
   - Customize button for exceptions

3. **Upgrade Prompt (Free/Starter)**
   - "Unlock Variant Templates" banner
   - Shows feature benefits
   - Link to upgrade page

## SKU Generation with Variants
```typescript
// Base SKU: SHIRT-1234
// With variants:
// - SHIRT-1234-BLU-S
// - SHIRT-1234-BLU-M
// - SHIRT-1234-RED-S
// etc.

function generateVariantSKU(baseSKU: string, options: string[]): string {
  const optionCodes = options.map(opt => 
    opt.substring(0, 3).toUpperCase()
  ).join('-');
  return `${baseSKU}-${optionCodes}`;
}
```

## Inventory Management with Variants
- Default: 10 units per variant
- User can override in review modal
- Inventory split equally across variants
- Example: 50 total → 10 per variant (5 variants)

## Benefits
1. **Speed**: One-click variant creation
2. **Consistency**: Standardized options across products
3. **Scalability**: Bulk product listing simplified
4. **Accuracy**: Reduces manual entry errors

## Implementation Phases

### Phase 1: Foundation (3-4 hours)
- [ ] Database schema
- [ ] Template CRUD APIs
- [ ] Settings page UI

### Phase 2: Integration (3-4 hours)
- [ ] Detect in review modal
- [ ] Apply variants logic
- [ ] Shopify variant creation

### Phase 3: Polish (2-3 hours)
- [ ] Preview variants
- [ ] SKU auto-generation for variants
- [ ] Inventory distribution
- [ ] Error handling

**Total Estimate:** 8-11 hours of development

## Future Enhancements
- Import templates from CSV
- AI-suggested variant options based on product image
- Variant-specific pricing rules
- Inventory forecasting per variant
