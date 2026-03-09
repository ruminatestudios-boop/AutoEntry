"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { apiFetch, API_BASE } from "@/lib/api";

// --- Types matching the required output ---
export interface ListingPayload {
  listing: {
    photos: string[];
    title: string;
    description: string;
    brand: string;
    model: string;
    category: string;
    subcategory: string;
    condition: string;
    condition_notes: string;
    price: number;
    rrp: number;
    min_price: number;
    accepts_offers: boolean;
    colour: string;
    colour_secondary: string;
    material: string;
    size: string;
    weight_kg: number;
    dimensions: { l: number; w: number; h: number };
    age_group: string;
    gender: string;
    upc: string;
    asin: string;
    sku: string;
    shipping_type: "free" | "fixed" | "calculated";
    shipping_amount: number;
    dispatch_days: number;
    ships_from: string;
    international: boolean;
    returns: string;
    return_shipping: string;
    tags: string[];
    platforms: string[];
    schedule_time: string | null;
    auto_relist: boolean;
    // Shopify-specific (when pushing to Shopify)
    compare_at_price?: number;
    cost_per_item?: number;
    charge_tax?: boolean;
    inventory_tracked?: boolean;
    quantity?: number;
    barcode?: string;
    country_of_origin?: string;
    hs_code?: string;
    product_type?: string;
    vendor?: string;
    status?: "active" | "draft";
    meta_description?: string;
  };
}

const CATEGORIES = ["Electronics", "Clothing", "Home", "Sports", "Toys", "Books", "Beauty", "Garden", "Auto", "Other"] as const;
const SUBCATEGORIES: Record<string, string[]> = {
  Electronics: ["Audio", "Computers", "Phones", "Cameras", "Gaming", "Accessories", "Other"],
  Clothing: ["Men", "Women", "Kids", "Shoes", "Accessories", "Other"],
  Home: ["Furniture", "Kitchen", "Decor", "Garden", "Other"],
  Sports: ["Fitness", "Outdoor", "Cycling", "Other"],
  Toys: ["Action Figures", "Educational", "Outdoor", "Other"],
  Books: ["Fiction", "Non-Fiction", "Children", "Other"],
  Beauty: ["Skincare", "Makeup", "Hair", "Other"],
  Garden: ["Tools", "Plants", "Outdoor", "Other"],
  Auto: ["Parts", "Accessories", "Tools", "Other"],
  Other: ["General"],
};

const CONDITIONS = ["New", "Like new", "Good", "Fair", "Poor", "For parts"] as const;
const DISPATCH_OPTIONS = [
  { value: 0, label: "Same day" },
  { value: 1, label: "1 day" },
  { value: 3, label: "2-3 days" },
  { value: 5, label: "3-5 days" },
];
const RETURN_OPTIONS = ["No returns", "14 days", "30 days", "60 days"];
/** All possible platforms (labels). Enabled subset comes from API. */
const PLATFORMS = [
  { id: "amazon", label: "Amazon", demand: "High" },
  { id: "ebay", label: "eBay", demand: "High" },
  { id: "tiktok", label: "TikTok Shop", demand: "Growing" },
  { id: "shopify", label: "Shopify", demand: "Custom" },
  { id: "etsy", label: "Etsy", demand: "Medium" },
  { id: "vinted", label: "Vinted", demand: "Medium" },
  { id: "depop", label: "Depop", demand: "Medium" },
  { id: "gumtree", label: "Gumtree", demand: "Local" },
  { id: "facebook", label: "Facebook Marketplace", demand: "Local" },
];

function Section({
  title,
  openDefault = true,
  children,
}: {
  title: string;
  openDefault?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(openDefault);
  return (
    <div className="review-card overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full px-5 py-3 flex items-center justify-between text-left font-semibold text-[#333]"
      >
        {title}
        <span className="text-[#999] text-lg">{open ? "−" : "+"}</span>
      </button>
      {open && <div className="px-5 pb-5 pt-0 space-y-4 border-t border-[#eee]">{children}</div>}
    </div>
  );
}

function FieldLabel({
  label,
  badge,
  required,
  optional,
}: {
  label: string;
  badge?: "ai" | "scan" | "required";
  required?: boolean;
  optional?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap mb-0.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[#999]">{label}</p>
      {badge === "ai" && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#eee] text-[#666] font-medium">AI</span>
      )}
      {badge === "scan" && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#eee] text-[#666] font-medium">Scan</span>
      )}
      {badge === "required" && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#eee] text-[#666] font-medium">Required</span>
      )}
      {optional && <span className="text-[10px] text-[#999]">Optional</span>}
    </div>
  );
}

export default function ReviewListingScreen() {
  // --- Initial state (can be hydrated from extraction / draft) ---
  const [photos, setPhotos] = useState<string[]>([""]);
  const [title, setTitle] = useState("Sony WH-1000XM5 Wireless Headphones");
  const [description, setDescription] = useState(
    "Industry-leading noise cancelling with Dual Noise Sensor. LDAC, multipoint, Speak-to-Chat. Up to 30hr battery."
  );
  const [brand, setBrand] = useState("Sony");
  const [model, setModel] = useState("WH-1000XM5");
  const [category, setCategory] = useState("Electronics");
  const [subcategory, setSubcategory] = useState("Audio");
  const [condition, setCondition] = useState("New");
  const [conditionNotes, setConditionNotes] = useState("");
  const [price, setPrice] = useState(29);
  const [rrp, setRrp] = useState(0);
  const [minPrice, setMinPrice] = useState(0);
  const [acceptsOffers, setAcceptsOffers] = useState(false);
  const [colour, setColour] = useState("");
  const [colourSecondary, setColourSecondary] = useState("");
  const [material, setMaterial] = useState("");
  const [size, setSize] = useState("");
  const [weightKg, setWeightKg] = useState<number>(0);
  const [dimL, setDimL] = useState<number>(0);
  const [dimW, setDimW] = useState<number>(0);
  const [dimH, setDimH] = useState<number>(0);
  const [ageGroup, setAgeGroup] = useState("Adult");
  const [gender, setGender] = useState("Unisex");
  const [upc, setUpc] = useState("");
  const [asin, setAsin] = useState("");
  const [sku, setSku] = useState("");
  const [shippingType, setShippingType] = useState<"free" | "fixed" | "calculated">("free");
  const [shippingAmount, setShippingAmount] = useState(0);
  const [dispatchDays, setDispatchDays] = useState(1);
  const [shipsFrom, setShipsFrom] = useState("");
  const [international, setInternational] = useState(false);
  const [returns, setReturns] = useState("30 days");
  const [returnShipping, setReturnShipping] = useState("buyer");
  const [tags, setTags] = useState<string[]>(["headphones", "noise cancel", "sony", "wireless", "bluetooth"]);
  const [tagInput, setTagInput] = useState("");
  const [platforms, setPlatforms] = useState<string[]>(["shopify"]);
  const [enabledPlatformIds, setEnabledPlatformIds] = useState<string[]>(["shopify"]);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleTime, setScheduleTime] = useState("");
  const [autoRelist, setAutoRelist] = useState(false);

  // Shopify-specific fields (shown when user is connected to Shopify)
  const [compareAtPrice, setCompareAtPrice] = useState<number>(0);
  const [costPerItem, setCostPerItem] = useState<number>(0);
  const [chargeTax, setChargeTax] = useState(true);
  const [inventoryTracked, setInventoryTracked] = useState(true);
  const [quantity, setQuantity] = useState<number>(0);
  const [barcode, setBarcode] = useState("");
  const [countryOfOrigin, setCountryOfOrigin] = useState("");
  const [hsCode, setHsCode] = useState("");
  const [productType, setProductType] = useState("");
  const [vendor, setVendor] = useState("");
  const [status, setStatus] = useState<"active" | "draft">("draft");
  const [metaDescription, setMetaDescription] = useState("");
  const [isShopifyMode, setIsShopifyMode] = useState(false);
  const [isEtsyMode, setIsEtsyMode] = useState(false);

  // Etsy-specific fields (full listing form)
  const [domesticGlobalPricing, setDomesticGlobalPricing] = useState(false);
  const [personalisationItems, setPersonalisationItems] = useState<string[]>([]);
  const [itemTypeDisplay, setItemTypeDisplay] = useState("Physical item · A member of my shop · A finished product · 2020 - 2026");
  const [categorySearch, setCategorySearch] = useState("");
  const [categoryBreadcrumb, setCategoryBreadcrumb] = useState("Jewellery ▸ Necklaces ▸ Monogram & Name Necklaces");
  const [materialsAttr, setMaterialsAttr] = useState<string[]>([]);
  const [goldSolidity, setGoldSolidity] = useState<string[]>([]);
  const [goldPurity, setGoldPurity] = useState<string[]>([]);
  const [gemstone, setGemstone] = useState("");
  const [primaryColour, setPrimaryColour] = useState("");
  const [materialsTransparency, setMaterialsTransparency] = useState<string[]>([]);
  const [processingProfile, setProcessingProfile] = useState("Ready to dispatch 1-2 days");
  const [deliveryOption, setDeliveryOption] = useState("");
  const [returnsPolicy, setReturnsPolicy] = useState("Simple policy 30 days — Buyer is responsible for return postage costs and any loss in value if an item isn't returned in original condition.");
  const [shopSection, setShopSection] = useState("None");
  const [featureListing, setFeatureListing] = useState(false);
  const [etsyAds, setEtsyAds] = useState(false);
  const [renewalOption, setRenewalOption] = useState<"automatic" | "manual">("automatic");
  const [showAllAttributes, setShowAllAttributes] = useState(false);
  const ETSY_TITLE_MAX = 140;
  const ETSY_TAGS_MAX = 13;
  const ETSY_MATERIALS_MAX = 13;

  // Detect Shopify mode: sessionStorage (flow set channel) or query ?channel=shopify
  useEffect(() => {
    if (typeof window === "undefined") return;
    const channel = window.sessionStorage.getItem("auralink_primary_channel");
    const params = new URLSearchParams(window.location.search);
    const qChannel = params.get("channel");
    if (channel === "shopify" || qChannel === "shopify") {
      setIsShopifyMode(true);
      return;
    }
    if (channel === "etsy" || qChannel === "etsy") {
      setIsEtsyMode(true);
      return;
    }
    // Optional: if we have connected Shopify stores (signed-in), enable Shopify form
    const stored = window.sessionStorage.getItem("auralink_connected_shopify");
    if (stored === "true") setIsShopifyMode(true);
  }, []);

  // Fetch enabled platforms from publishing API (Shopify-only by default; add more later)
  useEffect(() => {
    const base = process.env.NEXT_PUBLIC_PUBLISHING_API_URL || API_BASE;
    fetch(`${base.replace(/\/$/, "")}/api/listings/enabled-platforms`)
      .then((r) => (r.ok ? r.json() : { platforms: ["shopify"] }))
      .then((data) => {
        const list = Array.isArray(data?.platforms) ? data.platforms : ["shopify"];
        setEnabledPlatformIds(list);
        setPlatforms((prev) => {
          const valid = prev.filter((p) => list.includes(p));
          return valid.length > 0 ? valid : list;
        });
      })
      .catch(() => {
        setEnabledPlatformIds(["shopify"]);
        setPlatforms(["shopify"]);
      });
  }, []);

  // Optional: fetch connected Shopify stores (when Clerk token available) to show Shopify form
  useEffect(() => {
    if (typeof window === "undefined" || isShopifyMode) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await apiFetch("/api/v1/shopify/stores", {});
        if (cancelled) return;
        const data = r.ok ? await r.json().catch(() => null) : null;
        const stores = data?.stores ?? [];
        if (stores.length > 0) {
          window.sessionStorage.setItem("auralink_connected_shopify", "true");
          setIsShopifyMode(true);
        }
      } catch {
        // Guest or no auth — keep generic form
      }
    })();
    return () => { cancelled = true; };
  }, [isShopifyMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.sessionStorage.getItem("auralink_draft_listing");
    if (!raw) return;
    try {
      const payload = JSON.parse(raw) as {
        extraction?: {
          copy?: { seo_title?: string; description?: string; bullet_points?: string[] };
          extraction_copy?: { seo_title?: string; description?: string; bullet_points?: string[] };
          attributes?: { brand?: string; exact_model?: string; material_composition?: string; condition?: string; price_value?: number; price_display?: string };
          tags?: { category?: string; search_keywords?: string[] };
        };
        suggested_price?: number;
        imageDataUrl?: string;
        photos?: string[];
      };
      const ext = payload.extraction;
      const copy = ext?.copy || ext?.extraction_copy || {};
      const att = ext?.attributes || {};
      const tagObj = ext?.tags || {};
      const suggestedPrice = typeof payload.suggested_price === "number"
        ? payload.suggested_price
        : (att?.price_value ?? (Number(payload.suggested_price) || 0));
      // Fallback: parse price_display (e.g. "$199") when no numeric price
      let priceToSet = suggestedPrice;
      if (priceToSet <= 0 && att?.price_display && typeof att.price_display === "string") {
        const match = att.price_display.replace(/[^\d.]/g, "").match(/[\d.]+/);
        if (match && parseFloat(match[0]) > 0) priceToSet = parseFloat(match[0]);
      }
      if (copy.seo_title) setTitle(copy.seo_title);
      else if (Array.isArray(copy.bullet_points) && copy.bullet_points[0]) setTitle(copy.bullet_points[0]);
      if (copy.description) setDescription(copy.description);
      else if (Array.isArray(copy.bullet_points) && copy.bullet_points.length > 0) setDescription(copy.bullet_points.join("\n"));
      if (att?.brand) {
        setBrand(att.brand);
        setVendor(att.brand);
      }
      if (att?.exact_model) setModel(att.exact_model);
      if (tagObj?.category) {
        const cat = tagObj.category.trim();
        const main = CATEGORIES.find((c) => cat.toLowerCase().startsWith(c.toLowerCase())) || "Other";
        setCategory(main);
        setProductType(main);
        const subs = SUBCATEGORIES[main];
        if (subs?.length) setSubcategory(subs[0]);
      }
      if (att?.condition) setCondition(att.condition);
      if (priceToSet > 0) setPrice(priceToSet);
      if (att?.material_composition) setMaterial(att.material_composition);
      if (Array.isArray(tagObj?.search_keywords) && tagObj.search_keywords.length > 0) setTags(tagObj.search_keywords.slice(0, 20));
      const urls: string[] = [];
      if (payload.imageDataUrl) urls.push(payload.imageDataUrl);
      if (Array.isArray(payload.photos)) urls.push(...payload.photos);
      if (urls.length > 0) setPhotos(urls);
    } catch (_) {}
  }, []);

  // Track which fields came from AI/scan for badges (simplified: title, brand, price, tags from "AI")
  const aiFilled = useMemo(
    () => new Set(["title", "brand", "model", "price", "tags", "category", "condition"]),
    []
  );
  const scanFilled = useMemo(() => new Set(["upc"]), []);

  const photoUrls = useMemo(() => photos.filter(Boolean), [photos]);
  const addPhoto = useCallback(() => {
    if (photos.length >= 12) return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        setPhotos((p) => {
          const filled = p.filter(Boolean);
          if (filled.length >= 12) return p;
          if (p[0] === "") return [dataUrl];
          return [...filled, dataUrl];
        });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, []);
  const removePhoto = useCallback((index: number) => {
    if (photoUrls.length <= 1) return;
    setPhotos((p) => {
      const next = p.filter((_, i) => i !== index);
      return next.length ? next : [""];
    });
  }, [photoUrls.length]);

  const addTag = useCallback(() => {
    const t = tagInput.trim();
    if (!t || tags.length >= 20) return;
    if (tags.includes(t)) return;
    setTags((prev) => [...prev, t]);
    setTagInput("");
  }, [tagInput, tags]);
  const removeTag = useCallback((index: number) => {
    setTags((p) => p.filter((_, i) => i !== index));
  }, []);

  const togglePlatform = useCallback((id: string) => {
    setPlatforms((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }, []);

  // Listing score 0–100
  const score = useMemo(() => {
    let s = 0;
    if (title.length >= 10) s += 15;
    if (title.length >= 50) s += 5;
    const words = description.trim().split(/\s+/).filter(Boolean).length;
    if (words >= 20) s += 15;
    if (words >= 100) s += 5;
    s += Math.min(photoUrls.length * 5, 25);
    s += Math.min(tags.length * 2, 20);
    if (brand) s += 5;
    if (category) s += 5;
    if (condition) s += 5;
    if (price > 0) s += 5;
    return Math.min(100, s);
  }, [title, description, photoUrls.length, tags.length, brand, category, condition, price]);

  const requiredFilled = useMemo(() => {
    const hasPhoto = photoUrls.length >= 1;
    const hasTitle = title.trim().length >= 1 && title.length <= (isEtsyMode ? ETSY_TITLE_MAX : 200);
    const hasDesc = description.trim().length >= 1 && description.length <= 2000;
    const hasCategory = category.length >= 1;
    if (isEtsyMode) return hasPhoto && hasTitle && hasDesc && hasCategory && price > 0;
    const hasBrand = brand.trim().length >= 1;
    const hasCondition = condition.length >= 1;
    const hasPrice = price > 0;
    return hasPhoto && hasTitle && hasDesc && hasBrand && hasCategory && hasCondition && hasPrice;
  }, [isEtsyMode, photoUrls.length, title, description, brand, category, condition, price]);

  const handlePushLive = useCallback(() => {
    const payload: ListingPayload = {
      listing: {
        photos: photoUrls,
        title: title.trim(),
        description: description.trim(),
        brand: brand.trim(),
        model: model.trim(),
        category,
        subcategory,
        condition: condition.toLowerCase().replace(/\s+/g, "_"),
        condition_notes: conditionNotes.trim(),
        price,
        rrp: rrp || 0,
        min_price: minPrice || 0,
        accepts_offers: acceptsOffers,
        colour: colour.trim(),
        colour_secondary: colourSecondary.trim(),
        material: material.trim(),
        size: size.trim(),
        weight_kg: weightKg || 0,
        dimensions: { l: dimL || 0, w: dimW || 0, h: dimH || 0 },
        age_group: ageGroup,
        gender,
        upc: upc.trim(),
        asin: asin.trim(),
        sku: sku.trim(),
        shipping_type: shippingType,
        shipping_amount: shippingAmount || 0,
        dispatch_days: dispatchDays,
        ships_from: shipsFrom.trim(),
        international,
        returns: returns.replace(/\s+/g, "_").toLowerCase(),
        return_shipping: returnShipping,
        tags: [...tags],
        platforms: [...platforms],
        schedule_time: scheduleEnabled && scheduleTime ? scheduleTime : null,
        auto_relist: autoRelist,
        ...(isShopifyMode && {
          compare_at_price: compareAtPrice || undefined,
          cost_per_item: costPerItem || undefined,
          charge_tax: chargeTax,
          inventory_tracked: inventoryTracked,
          quantity: quantity ?? undefined,
          barcode: barcode.trim() || undefined,
          country_of_origin: countryOfOrigin.trim() || undefined,
          hs_code: hsCode.trim() || undefined,
          product_type: (productType || category).trim() || undefined,
          vendor: (vendor || brand).trim() || undefined,
          status,
          meta_description: metaDescription.trim() || undefined,
        }),
      },
    };
    console.log(JSON.stringify(payload, null, 2));
    alert("Listing JSON logged to console. In production, send to API.");
  }, [
    photoUrls,
    title,
    description,
    brand,
    model,
    category,
    subcategory,
    condition,
    conditionNotes,
    price,
    rrp,
    minPrice,
    acceptsOffers,
    colour,
    colourSecondary,
    material,
    size,
    weightKg,
    dimL,
    dimW,
    dimH,
    ageGroup,
    gender,
    upc,
    asin,
    sku,
    shippingType,
    shippingAmount,
    dispatchDays,
    shipsFrom,
    international,
    returns,
    returnShipping,
    tags,
    platforms,
    scheduleEnabled,
    scheduleTime,
    autoRelist,
    isShopifyMode,
    compareAtPrice,
    costPerItem,
    chargeTax,
    inventoryTracked,
    quantity,
    barcode,
    countryOfOrigin,
    hsCode,
    productType,
    vendor,
    status,
    metaDescription,
  ]);

  const subcategoryOptions = SUBCATEGORIES[category] || SUBCATEGORIES.Other;

  return (
    <div className="review-scheme min-h-screen bg-[#e8e8e8] text-[#222] font-sans">
      <main className="review-main-with-bar min-h-screen pb-28">
        <div className="max-w-[680px] mx-auto px-4 py-6 sm:py-8">
          <div className="bg-white rounded-xl border border-[#e0e0e0] shadow-sm overflow-hidden">
            {/* Header inside card — centered */}
            <div className="relative px-6 sm:px-8 pt-8 pb-6 text-center border-b border-[#eee]">
              <h1 className="text-xl sm:text-2xl font-bold text-[#222]">{isShopifyMode ? "Review your listing" : "Confirm your listing"}</h1>
              <p className="text-sm text-[#666] mt-2">
                {isShopifyMode ? "Shopify product — fields match your store’s Add product form. Edit and push live." : "Review and edit any field, then push live."}
              </p>
              <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#999]">Score</span>
                <span className="text-lg font-bold text-[#333] tabular-nums">{score}</span>
                <span className="text-[#999] text-sm">/100</span>
              </div>
            </div>

            {!isShopifyMode && !isEtsyMode ? null : (
            /* Photo block: show for Shopify and Etsy modes only */
            <div className="px-6 sm:px-8 py-6 flex flex-wrap gap-6 items-start border-b border-[#eee]">
              <div className="flex-shrink-0 relative">
                <div className="w-28 h-28 rounded-lg bg-[#f0f0f0] border border-[#e0e0e0] flex items-center justify-center overflow-hidden">
                  {photoUrls[0] ? (
                    <img src={photoUrls[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[#999] text-sm">Photo</span>
                  )}
                </div>
                {photoUrls.length > 1 && (
                  <button
                    type="button"
                    onClick={() => { const idx = photos.indexOf(photoUrls[0]); if (idx !== -1) removePhoto(idx); }}
                    className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-[#444] text-white text-sm flex items-center justify-center border-2 border-white shadow"
                    aria-label="Remove photo"
                  >
                    ×
                  </button>
                )}
              </div>
              {photos.length < 12 && (
                <button
                  type="button"
                  onClick={addPhoto}
                  className="w-28 h-28 rounded-xl border-2 border-dashed border-[#d4d4d8] bg-[#fafafa] text-[#52525b] flex flex-col items-center justify-center gap-1 text-sm hover:bg-zinc-100 hover:border-[#a1a1aa] hover:text-[#18181b] transition-colors"
                >
                  <span className="text-2xl font-medium leading-none">+</span>
                  <span className="text-xs">Add more photos</span>
                </button>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-[#222] leading-tight">{title || "Product title"}</h2>
                <p className="text-sm text-[#666] mt-1">{category} &gt; {subcategory}</p>
              </div>
            </div>
            )}

            {isShopifyMode ? (
            <div className="px-6 sm:px-8 py-6 space-y-0">
              {/* Shopify: fields match Add product in Shopify admin */}
              <div className="border-b border-[#eee] pb-6 mb-6">
                <label className="review-label">Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value.slice(0, 200))} className="review-input mt-1" placeholder="Product title" />
                <p className="text-[11px] text-[#999] mt-1">{title.length}/200</p>
              </div>
              <div className="border-b border-[#eee] pb-6 mb-6">
                <label className="review-label">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 2000))} rows={4} className="review-input mt-1 resize-y min-h-[100px]" placeholder="Full product description" />
                <p className="text-[11px] text-[#999] mt-1">Max 2000 chars.</p>
              </div>
              <div className="border-b border-[#eee] pb-6 mb-6">
                <label className="review-label">Product category</label>
                <p className="text-[11px] text-[#999] mt-0.5 mb-1">Determines tax rates and adds metafields to improve search, filters, and cross-channel sales.</p>
                <select value={category} onChange={(e) => { setCategory(e.target.value); setProductType(e.target.value); setSubcategory(SUBCATEGORIES[e.target.value]?.[0] || ""); }} className="review-input mt-1">
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="border-b border-[#eee] pb-6 mb-6">
                <label className="review-label">Price</label>
                <div className="flex flex-wrap gap-4 mt-2">
                  <div>
                    <span className="text-[11px] text-[#999] block mb-0.5">Selling price</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[#222] font-bold">$</span>
                      <input type="number" min={0} step={0.01} value={price || ""} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} className="review-input max-w-[120px]" />
                    </div>
                  </div>
                  <div className="hidden">
                    <span className="text-[11px] text-[#999] block mb-0.5">Compare at price</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[#222] font-bold">$</span>
                      <input type="number" min={0} step={0.01} value={compareAtPrice || ""} onChange={(e) => setCompareAtPrice(parseFloat(e.target.value) || 0)} className="review-input max-w-[120px]" />
                    </div>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#999] block mb-0.5">Cost per item</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[#222] font-bold">$</span>
                      <input type="number" min={0} step={0.01} value={costPerItem || ""} onChange={(e) => setCostPerItem(parseFloat(e.target.value) || 0)} className="review-input max-w-[120px]" />
                    </div>
                  </div>
                  <div className="hidden items-center gap-2">
                    <input type="checkbox" id="charge-tax" checked={chargeTax} onChange={(e) => setChargeTax(e.target.checked)} />
                    <label htmlFor="charge-tax" className="text-sm text-[#666]">Charge tax</label>
                  </div>
                </div>
              </div>
              <div className="border-b border-[#eee] pb-6 mb-6">
                <label className="review-label">Inventory</label>
                <div className="flex items-center gap-2 mb-3">
                  <input type="checkbox" id="inv-tracked" checked={inventoryTracked} onChange={(e) => setInventoryTracked(e.target.checked)} />
                  <label htmlFor="inv-tracked" className="text-sm text-[#666]">Track quantity</label>
                </div>
                {inventoryTracked && (
                  <div className="space-y-3">
                    <div>
                      <span className="text-[11px] text-[#999] block mb-0.5">Quantity</span>
                      <input type="number" min={0} value={quantity ?? ""} onChange={(e) => setQuantity(parseInt(e.target.value, 10) || 0)} className="review-input max-w-[120px]" />
                    </div>
                    <div>
                      <span className="text-[11px] text-[#999] block mb-0.5">SKU</span>
                      <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className="review-input max-w-[200px]" placeholder="SKU" />
                    </div>
                    <div>
                      <span className="text-[11px] text-[#999] block mb-0.5">Barcode</span>
                      <input type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)} className="review-input max-w-[200px]" placeholder="UPC, EAN, etc." />
                    </div>
                  </div>
                )}
              </div>
              <div className="border-b border-[#eee] pb-6 mb-6">
                <label className="review-label">Shipping</label>
                <p className="text-[11px] text-[#999] mt-0.5 mb-2">Physical product — weight and origin</p>
                <div className="space-y-3">
                  <div>
                    <span className="text-[11px] text-[#999] block mb-0.5">Product weight (kg)</span>
                    <input type="number" min={0} step={0.001} value={weightKg || ""} onChange={(e) => setWeightKg(parseFloat(e.target.value) || 0)} className="review-input max-w-[120px]" />
                  </div>
                  <div>
                    <span className="text-[11px] text-[#999] block mb-0.5">Country of origin</span>
                    <input type="text" value={countryOfOrigin} onChange={(e) => setCountryOfOrigin(e.target.value)} className="review-input max-w-[200px]" placeholder="e.g. United Kingdom" />
                  </div>
                  <div>
                    <span className="text-[11px] text-[#999] block mb-0.5">HS code</span>
                    <input type="text" value={hsCode} onChange={(e) => setHsCode(e.target.value)} className="review-input max-w-[120px]" placeholder="Harmonized code" />
                  </div>
                </div>
              </div>
              <div className="border-b border-[#eee] pb-6 mb-6">
                <label className="review-label">Product organization</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
                  <div>
                    <span className="text-[11px] text-[#999] block mb-0.5">Type</span>
                    <input type="text" value={productType || category} onChange={(e) => setProductType(e.target.value)} className="review-input w-full" placeholder="Product type" />
                  </div>
                  <div>
                    <span className="text-[11px] text-[#999] block mb-0.5">Vendor</span>
                    <input type="text" value={vendor || brand} onChange={(e) => setVendor(e.target.value)} className="review-input w-full" placeholder="Vendor / brand" />
                  </div>
                </div>
                <div className="mt-3">
                  <span className="text-[11px] text-[#999] block mb-0.5">Tags</span>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tags.map((t, i) => (
                      <span key={i} className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-[#f5f5f5] text-[#666] border border-[#ddd]">
                        {t}
                        <button type="button" onClick={() => removeTag(i)} className="text-[#999] hover:text-[#333]">×</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag())} placeholder="Add tag…" className="flex-1 min-w-0 text-sm px-3 py-2 rounded-lg border border-[#ddd] bg-[#f5f5f5]" />
                    <button type="button" onClick={addTag} className="px-3 py-2 rounded-lg border border-[#ddd] bg-white text-[#666] font-medium text-sm">Add</button>
                  </div>
                </div>
              </div>
              <div className="border-b border-[#eee] pb-6 mb-6">
                <label className="review-label">Search engine listing</label>
                <p className="text-[11px] text-[#999] mt-0.5 mb-2">Add a title and description to see how this product might appear in search results.</p>
                <div className="space-y-3">
                  <div>
                    <span className="text-[11px] text-[#999] block mb-0.5">Page title</span>
                    <input type="text" value={title} readOnly className="review-input w-full bg-[#f9f9f9]" />
                    <p className="text-[11px] text-[#999] mt-0.5">Uses product title</p>
                  </div>
                  <div>
                    <span className="text-[11px] text-[#999] block mb-0.5">Meta description</span>
                    <textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value.slice(0, 320))} rows={2} className="review-input w-full" placeholder="Brief description for search engines" />
                    <p className="text-[11px] text-[#999] mt-0.5">{metaDescription.length}/320</p>
                  </div>
                </div>
              </div>
              <div className="pb-2">
                <label className="review-label">Status</label>
                <div className="flex gap-2 mt-2">
                  <button type="button" onClick={() => setStatus("active")} className={`px-4 py-2 rounded-lg text-sm font-medium ${status === "active" ? "review-selected" : "bg-white text-[#999] border border-[#ddd]"}`}>Active</button>
                  <button type="button" onClick={() => setStatus("draft")} className={`px-4 py-2 rounded-lg text-sm font-medium ${status === "draft" ? "review-selected" : "bg-white text-[#999] border border-[#ddd]"}`}>Draft</button>
                </div>
              </div>
            </div>
            ) : isEtsyMode ? (
            <div className="px-6 sm:px-8 py-6 space-y-8">
              {/* Stores */}
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-[#999] mb-2">Stores</p>
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-emerald-50 border border-emerald-200 text-emerald-800">
                    <span className="w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center text-white text-[10px] font-bold">E</span>
                    <span>✓</span>
                    <span>Etsy</span>
                  </span>
                </div>
              </div>

              {/* About */}
              <div className="border-b border-[#eee] pb-6">
                <h2 className="text-base font-semibold text-[#222] mb-0.5">About</h2>
                <p className="text-sm text-[#666] mb-4">Tell the world all about your item and why they love it.</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#666] mb-0.5">Title*</label>
                    <p className="text-[11px] text-[#666] mb-1">Make sure your title is easy to understand and clearly describes the items you're selling.</p>
                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value.slice(0, ETSY_TITLE_MAX))} className="review-input mt-1 w-full" placeholder="Product title" maxLength={ETSY_TITLE_MAX} />
                    <p className="text-[11px] text-[#999] mt-0.5">{title.length}/{ETSY_TITLE_MAX}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#666] mb-0.5">Photos and video*</label>
                    <p className="text-[11px] text-[#666] mb-1">Add up to 20 photos and 1 video.</p>
                    <p className="text-xs text-[#666]">Media: photos from the previous step are included. Upload or change them there.</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#666] mb-0.5">Description*</label>
                    <p className="text-[11px] text-[#666] mb-1">What makes your item special? Buyers will only see the first few lines unless they expand the description.</p>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value.slice(0, 2000))} rows={4} className="review-input mt-1 w-full resize-y min-h-[100px]" placeholder="Full product description" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#666] mb-0.5">Personalisation</label>
                    <p className="text-[11px] text-[#666] mb-1">Make it easier for buyers to add the info you need to personalise their item.</p>
                    <button type="button" className="text-sm font-medium text-[#222] border border-[#ddd] rounded-lg px-3 py-2 hover:bg-[#f5f5f5]">+ Add personalisation</button>
                  </div>
                </div>
              </div>

              {/* Price & Inventory */}
              <div className="border-b border-[#eee] pb-6">
                <h2 className="text-base font-semibold text-[#222] mb-0.5">Price &amp; Inventory</h2>
                <p className="text-sm text-[#666] mb-4">Set a price for your item and indicate how many are available for sale.</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#666] mb-1">Domestic and global pricing</label>
                    <p className="text-[11px] text-[#666] mb-2">Set prices for buyers in different locations.</p>
                    <button type="button" onClick={() => setDomesticGlobalPricing((p) => !p)} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${domesticGlobalPricing ? "bg-[#222]" : "bg-[#ddd]"}`}>
                      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${domesticGlobalPricing ? "translate-x-5" : "translate-x-1"}`} />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[#666] mb-0.5">Price*</label>
                      <div className="flex items-center gap-1 mt-1">
                        <input type="text" inputMode="decimal" value={price || ""} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} className="review-input flex-1 max-w-[120px]" placeholder="0.00" />
                        <span className="text-sm text-[#666]">GBP</span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#666] mb-0.5">Quantity*</label>
                      <input type="number" min={0} value={quantity ?? ""} onChange={(e) => setQuantity(parseInt(e.target.value, 10) ?? 0)} className="review-input mt-1 max-w-[120px]" />
                    </div>
                  </div>
                  <button type="button" className="text-sm font-medium text-[#222] border border-[#ddd] rounded-lg px-3 py-2 hover:bg-[#f5f5f5]">+ Add SKU</button>
                </div>
              </div>

              {/* Variations */}
              <div className="border-b border-[#eee] pb-6">
                <h2 className="text-base font-semibold text-[#222] mb-0.5">Variations</h2>
                <p className="text-sm text-[#666] mb-4">If your item is offered in different colours, sizes, materials, etc.</p>
                <button type="button" className="text-sm font-medium text-[#222] border border-[#ddd] rounded-lg px-3 py-2 hover:bg-[#f5f5f5]">+ Add variations</button>
              </div>

              {/* Details */}
              <div className="border-b border-[#eee] pb-6">
                <h2 className="text-base font-semibold text-[#222] mb-0.5">Details</h2>
                <p className="text-sm text-[#666] mb-4">Share a few more specifics about your item to make it easier to find in search, and to help buyers know what to expect.</p>
                <div className="space-y-4">
                  <div className="rounded-lg bg-[#f5f5f5] border border-[#e0e0e0] p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📦</span>
                      <div>
                        <p className="text-sm font-medium text-[#222]">Physical item</p>
                        <p className="text-xs text-[#666]">A member of my shop · A finished product · 2020 - 2026</p>
                      </div>
                    </div>
                    <button type="button" className="text-sm font-medium text-[#222] border border-[#ddd] rounded-lg px-3 py-1.5 hover:bg-white">Change</button>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#666] mb-0.5">Category*</label>
                    <input type="text" value={categorySearch || category} onChange={(e) => { setCategorySearch(e.target.value); setCategory(e.target.value); }} className="review-input mt-1 w-full" placeholder="Search for a category, e.g. Hats, Rings, Cushions, etc." />
                    {categoryBreadcrumb && (
                      <div className="mt-2 rounded-lg border border-[#e0e0e0] p-3 bg-white">
                        <p className="text-sm font-medium text-[#222]">{categoryBreadcrumb.split(" ▸ ").pop()}</p>
                        <p className="text-xs text-[#666] mt-0.5">{categoryBreadcrumb}</p>
                        <p className="text-[11px] text-[#666] mt-1">This listing will appear in all 3 categories shown.</p>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#666] mb-1 flex items-center gap-1">Attributes <span className="text-[#999]">ℹ</span></label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                      <div><label className="block text-[11px] text-[#666] mb-0.5">Materials <span className="text-[#999]">Select up to 5</span></label><input type="text" className="review-input w-full text-sm" placeholder="Type to search..." /></div>
                      <div><label className="block text-[11px] text-[#666] mb-0.5">Gold solidity <span className="text-[#999]">Select up to 4</span></label><input type="text" className="review-input w-full text-sm" placeholder="Type to search..." /></div>
                      <div><label className="block text-[11px] text-[#666] mb-0.5">Gold purity <span className="text-[#999]">Select up to 5</span></label><input type="text" className="review-input w-full text-sm" placeholder="Type to search..." /></div>
                      <div><label className="block text-[11px] text-[#666] mb-0.5">Gemstone</label><div className="flex gap-1"><input type="text" className="review-input flex-1 text-sm" placeholder="Type to search..." /><span className="text-xs text-[#666] self-center">Offer more than one →</span></div></div>
                      <div><label className="block text-[11px] text-[#666] mb-0.5">Primary colour</label><div className="flex gap-1"><input type="text" className="review-input flex-1 text-sm" placeholder="Type to search..." /><span className="text-xs text-[#666] self-center">Offer more than one →</span></div></div>
                    </div>
                    <button type="button" onClick={() => setShowAllAttributes((a) => !a)} className="mt-2 text-sm text-[#666] hover:text-[#222]">{showAllAttributes ? "Hide attributes" : "Show all attributes"}</button>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#666] mb-0.5">Tags</label>
                    <p className="text-[11px] text-[#666] mb-1">Add up to 13 tags to help people search for your listings.</p>
                    <div className="flex gap-2 mt-1">
                      <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), tags.length < ETSY_TAGS_MAX && tagInput.trim() && (setTags((t) => [...t, tagInput.trim()]), setTagInput("")))} className="review-input flex-1" placeholder="Shape, colour, style, function, etc." />
                      <button type="button" onClick={addTag} disabled={tags.length >= ETSY_TAGS_MAX} className="px-3 py-2 rounded-lg border border-[#ddd] bg-white text-sm font-medium disabled:opacity-50">Add</button>
                    </div>
                    <p className="text-[11px] text-[#999] mt-0.5">{ETSY_TAGS_MAX - tags.length} left</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">{tags.map((t, i) => (<span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#f0f0f0] text-xs"><span>{t}</span><button type="button" onClick={() => removeTag(i)} className="text-[#999] hover:text-[#222]">×</button></span>))}</div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#666] mb-0.5">Materials</label>
                    <p className="text-[11px] text-[#666] mb-1">Buyers value transparency — tell them what's used to make your item.</p>
                    <div className="flex gap-2 mt-1">
                      <input type="text" className="review-input flex-1" placeholder="Ingredients, components, etc." />
                      <button type="button" className="px-3 py-2 rounded-lg border border-[#ddd] bg-white text-sm font-medium">Add</button>
                    </div>
                    <p className="text-[11px] text-[#999] mt-0.5">{ETSY_MATERIALS_MAX} left</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#666] mb-0.5">GPSR manufacturer and safety information</label>
                    <p className="text-[11px] text-[#666] mb-2">If you're a seller selling to EEA states or Northern Ireland (NI), you may need to include manufacturer and safety info (for listings added after 13 December 2024) to comply with the General Product Safety Regulation (GPSR).</p>
                    <button type="button" className="text-sm font-medium text-[#222] border border-[#ddd] rounded-lg px-3 py-2 hover:bg-[#f5f5f5]">+ Add info</button>
                    <p className="text-[11px] text-[#666] mt-1">You can also choose to stop selling to these states in GPSR settings.</p>
                  </div>
                </div>
              </div>

              {/* Processing & Delivery */}
              <div className="border-b border-[#eee] pb-6">
                <h2 className="text-base font-semibold text-[#222] mb-0.5">Processing &amp; Delivery</h2>
                <p className="text-sm text-[#666] mb-4">Give shoppers clear expectations about delivery time and cost by making sure your delivery info is accurate, including the delivery profile and your order processing schedule. You can make updates any time in Delivery settings.</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#666] mb-0.5">Processing profile*</label>
                    <div className="flex items-center justify-between rounded-lg border border-[#e0e0e0] p-3 bg-[#fafafa] mt-1">
                      <span className="text-sm">{processingProfile}</span>
                      <button type="button" className="text-sm font-medium text-[#222] border border-[#ddd] rounded-lg px-3 py-1.5 hover:bg-white">Change profile</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#666] mb-0.5">Delivery option*</label>
                    <div className="flex gap-2 mt-1">
                      <button type="button" className="text-sm font-medium text-[#222] border border-[#ddd] rounded-lg px-3 py-2 hover:bg-[#f5f5f5]">+ Create option</button>
                      <button type="button" className="text-sm font-medium text-[#222] border border-[#ddd] rounded-lg px-3 py-2 hover:bg-[#f5f5f5]">Select profile</button>
                    </div>
                  </div>
                  <div><button type="button" className="text-sm text-[#666] hover:text-[#222] flex items-center gap-1">Preview postage cost <span className="text-[#999]">▼</span></button></div>
                </div>
              </div>

              {/* Settings */}
              <div>
                <h2 className="text-base font-semibold text-[#222] mb-0.5">Settings</h2>
                <p className="text-sm text-[#666] mb-4">Choose how this listing will display in your shop, how it will renew, and if you want it to be promoted in Etsy Ads.</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#666] mb-0.5">Returns and exchanges*</label>
                    <div className="rounded-lg bg-[#e8f4fc] border border-[#b8daff] p-3 mt-1">
                      <p className="text-xs text-[#333] mb-2">Let buyers know how you'll handle returns for this listing</p>
                      <p className="text-sm font-medium text-[#222]">Simple policy 30 days</p>
                      <p className="text-xs text-[#666] mt-0.5">Buyer is responsible for return postage costs and any loss in value if an item isn't returned in original condition.</p>
                      <button type="button" className="mt-2 text-sm font-medium text-[#222] border border-[#ddd] rounded-lg px-3 py-1.5 hover:bg-white">Apply this policy</button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#666] mb-0.5">Shop section</label>
                    <p className="text-[11px] text-[#666] mb-1">Use shop sections to organise your products into groups shoppers can explore.</p>
                    <select value={shopSection} onChange={(e) => setShopSection(e.target.value)} className="review-input mt-1 w-full max-w-[200px]">
                      <option value="None">None</option>
                      <option value="Necklaces">Necklaces</option>
                      <option value="Bracelets">Bracelets</option>
                      <option value="Earrings">Earrings</option>
                      <option value="Rings">Rings</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <label className="block text-xs font-medium text-[#666]">Feature this listing</label>
                      <p className="text-[11px] text-[#666]">Showcase this listing at the top of your shop's homepage to make it stand out.</p>
                    </div>
                    <button type="button" onClick={() => setFeatureListing((f) => !f)} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${featureListing ? "bg-[#222]" : "bg-[#ddd]"}`}><span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${featureListing ? "translate-x-5" : "translate-x-1"}`} /></button>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <div>
                      <label className="block text-xs font-medium text-[#666]">Etsy Ads</label>
                      <p className="text-[11px] text-[#666]">Promote this listing on Etsy as part of your Etsy Ads campaign.</p>
                    </div>
                    <button type="button" onClick={() => setEtsyAds((a) => !a)} className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${etsyAds ? "bg-[#222]" : "bg-[#ddd]"}`}><span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${etsyAds ? "translate-x-5" : "translate-x-1"}`} /></button>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#666] mb-0.5">Renewal options*</label>
                    <p className="text-[11px] text-[#666] mb-2">Each renewal lasts for four months or until the listing sells out. Get more details on auto-renewing.</p>
                    <div className="space-y-2">
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input type="radio" name="renewal" checked={renewalOption === "automatic"} onChange={() => setRenewalOption("automatic")} className="mt-1" />
                        <span className="text-sm"><strong>Automatic</strong> — This listing will renew as it expires for USD 0.20 each time (recommended).</span>
                      </label>
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input type="radio" name="renewal" checked={renewalOption === "manual"} onChange={() => setRenewalOption("manual")} className="mt-1" />
                        <span className="text-sm"><strong>Manual</strong> — I'll renew expired listings myself.</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            ) : (
            <>
            <div className="px-6 sm:px-8 py-6 space-y-6">
              {/* STORES — pill-shaped, with checkmarks when selected */}
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#666] mb-3">Stores</h2>
                <div className="flex flex-wrap gap-2">
                  {enabledPlatformIds.includes("amazon") && (
                    <button
                      type="button"
                      onClick={() => togglePlatform("amazon")}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border-2 transition-colors ${
                        platforms.includes("amazon")
                          ? "bg-[#095739] text-white border-[#095739]"
                          : "bg-white text-[#333] border-[#ddd]"
                      }`}
                    >
                      {platforms.includes("amazon") && <span className="text-white" aria-hidden>✓</span>}
                      <span className="w-5 h-5 flex items-center justify-center rounded bg-[#ddd] text-[10px] font-bold text-[#333]">a</span>
                      Amazon
                    </button>
                  )}
                  {enabledPlatformIds.includes("shopify") && (
                    <button
                      type="button"
                      onClick={() => togglePlatform("shopify")}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border-2 transition-colors ${
                        platforms.includes("shopify")
                          ? "bg-[#095739] text-white border-[#095739]"
                          : "bg-white text-[#333] border-[#ddd]"
                      }`}
                    >
                      {platforms.includes("shopify") && <span className="text-white" aria-hidden>✓</span>}
                      <span className="w-5 h-5 flex items-center justify-center rounded bg-[#ddd] text-[10px] font-bold text-[#333]">S</span>
                      Shopify
                    </button>
                  )}
                </div>
              </section>

              {/* PRODUCT INFORMATION */}
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#666] mb-4">Product information</h2>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-[#222]">Title</label>
                    <p className="text-xs text-red-600 mt-0.5">Required for Shopify</p>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value.slice(0, 200))}
                      className="mt-1 w-full px-3 py-2 border border-[#ddd] rounded-lg text-[#222]"
                      placeholder="Product title"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#222]">Description</label>
                    <p className="text-xs text-red-600 mt-0.5">Required for Shopify</p>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
                      rows={4}
                      className="mt-1 w-full px-3 py-2 border border-[#ddd] rounded-lg text-[#222] resize-y min-h-[100px]"
                      placeholder="Full product description"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#222]">Category</label>
                    <p className="text-[11px] text-[#666] mt-0.5 mb-1">Determines tax rates and adds metafields to improve search, filters, and cross-channel sales.</p>
                    <select
                      value={category}
                      onChange={(e) => { setCategory(e.target.value); setSubcategory(SUBCATEGORIES[e.target.value]?.[0] || ""); }}
                      className="mt-1 w-full px-3 py-2 border border-[#ddd] rounded-lg text-[#222] bg-white"
                    >
                      <option value="">Choose a product category</option>
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </section>

              {/* PRICE */}
              <section>
                <h2 className="text-xs font-semibold uppercase tracking-wider text-[#666] mb-3">Price</h2>
                <div className="flex items-baseline gap-1">
                  <span className="text-[#222] font-bold text-lg">$</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={price || ""}
                    onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                    className="w-full max-w-[140px] px-3 py-2 border border-[#ddd] rounded-lg text-lg font-semibold text-[#222]"
                  />
                </div>
              </section>
          </div>

        </>
        )}
        </div>
        </div>
      </main>

      {/* Sticky bottom: Score + Push live — safe area so not hidden by system nav */}
      <div className="review-bottom-bar fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-[#ddd] p-4 pt-3">
        <div className="max-w-[680px] mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-semibold text-[#666]">Score</span>
            <span className="text-xl font-bold text-[#222] tabular-nums">{score}</span>
          </div>
          <button
            type="button"
            onClick={handlePushLive}
            disabled={!requiredFilled}
            className={`flex-shrink-0 py-3 px-6 rounded-2xl font-semibold text-[15px] transition-colors ${
              requiredFilled
                ? "review-btn-primary"
                : "bg-[#eee] text-[#999] cursor-not-allowed"
            }`}
          >
            Push live
          </button>
        </div>
        {!requiredFilled && (
          <p className="text-xs text-[#666] max-w-[680px] mx-auto mt-1">
            Fill all required fields ({isEtsyMode ? "title, description, category, price, at least one photo" : "title, description, brand, category, condition, price, at least one photo"}).
          </p>
        )}
      </div>
    </div>
  );
}
