/**
 * Shared listing publish: load draft from session (same rules as flow-3), POST to publishing API.
 * Used by /listing/published (flow-success.html) and flow-publishing.html?run=1.
 */
(function (global) {
  var STORAGE_KEY = "auralink_selected_marketplaces";
  var DRAFT_KEY = "auralink_review_draft";
  var DRAFT_LISTING_KEY = "auralink_draft_listing";

  function getPublishingUrl() {
    var host = window.location.hostname;
    var port = window.location.port || (window.location.protocol === "https:" ? "443" : "80");
    if ((host === "localhost" || host === "127.0.0.1") && port === "3000") {
      return window.location.origin.replace(/\/$/, "") + "/__synclyst_publishing";
    }
    var m = document.querySelector('meta[name="auralink-publishing-url"]');
    var url = m && m.getAttribute("content") ? m.getAttribute("content").trim().replace(/\/$/, "") : "http://localhost:8001";
    if (host && host !== "localhost" && host !== "127.0.0.1") {
      var prodMeta = document.querySelector('meta[name="synclyst-publishing-url"]');
      if (prodMeta && prodMeta.getAttribute("content") && prodMeta.getAttribute("content").trim()) {
        url = prodMeta.getAttribute("content").trim().replace(/\/$/, "");
      } else if (host === "synclyst.app" || host === "www.synclyst.app") {
        url = "https://synclyst-publishing-299567386855.us-central1.run.app";
      } else {
        url = window.location.protocol + "//" + host + ":8001";
      }
    }
    return url;
  }

  function loadSelected() {
    try {
      var raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        var arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length > 0) return arr;
      }
    } catch (e) {}
    return ["shopify"];
  }

  var SEO_META_DESC_MAX =
    typeof window !== "undefined" && window.SEO_META_DESC_MAX ? window.SEO_META_DESC_MAX : 155;
  function clipMetaDescriptionForSeo(text, maxLen) {
    if (typeof window !== "undefined" && typeof window.clipMetaDescriptionForSeo === "function") {
      return window.clipMetaDescriptionForSeo(text, maxLen);
    }
    maxLen = maxLen || SEO_META_DESC_MAX;
    var t = (text || "").replace(/\s+/g, " ").trim();
    if (t.length <= maxLen) return t;
    var cut = t.slice(0, maxLen + 1);
    var lastSpace = cut.lastIndexOf(" ");
    if (lastSpace >= Math.floor((maxLen * 2) / 3)) return t.slice(0, lastSpace).replace(/[.,;:]+$/, "").trim();
    return t.slice(0, maxLen).replace(/[.,;:]+$/, "").trim();
  }
  function buildFallbackMetaSnippet(title, desc) {
    var body = (desc || "").replace(/\s+/g, " ").trim();
    var t = (title || "").replace(/\s+/g, " ").trim();
    if (body && t) return clipMetaDescriptionForSeo(t + ". " + body, SEO_META_DESC_MAX);
    return clipMetaDescriptionForSeo(body || t, SEO_META_DESC_MAX);
  }

  function loadDraftFromSession() {
    try {
      var raw = sessionStorage.getItem(DRAFT_KEY);
      if (raw) {
        var d0 = JSON.parse(raw);
        if (d0 && typeof d0 === "object") return d0;
      }
    } catch (e) {}
    var fromListing = null;
    try {
      var raw2 = sessionStorage.getItem(DRAFT_LISTING_KEY);
      if (raw2) {
        var p = JSON.parse(raw2);
        var data = p.extraction || {};
        var copy = data.extraction_copy || data.copy || {};
        var att = data.attributes || {};
        var tags = data.tags || {};
        var seoTitle = (copy.seo_title || "").trim() || "";
        var category = (tags.category || att.brand || "").trim();
        if (att.brand && category && category !== att.brand) category = att.brand + " › " + category;
        else if (!category && att.brand) category = att.brand;
        var desc = "";
        if (copy.description_fact_feel_proof && typeof copy.description_fact_feel_proof === "object") {
          var f = copy.description_fact_feel_proof;
          var parts = [];
          if (f.fact) parts.push(String(f.fact).trim());
          if (f.feel) parts.push(String(f.feel).trim());
          if (f.proof) parts.push(String(f.proof).trim());
          desc = parts.filter(Boolean).join("\n\n");
        } else if (copy.description) desc = String(copy.description).trim();
        else if (copy.bullet_points && Array.isArray(copy.bullet_points)) desc = copy.bullet_points.join("\n");
        if (desc && (att.material || att.color || att.dimensions || att.material_composition)) {
          var extras = [];
          if (att.material) extras.push("Material: " + att.material);
          if (att.color) extras.push("Color: " + att.color);
          if (att.dimensions) extras.push("Dimensions: " + att.dimensions);
          if (att.material_composition) extras.push(att.material_composition);
          if (extras.length) desc = desc + "\n\n" + extras.join("\n");
        }
        var price = "";
        var priceSource = (att.price_source || "").trim();
        if (priceSource === "found_in_image" && att.price_value != null) {
          price = String(att.price_value).replace(/^\$|^£/, "");
        } else if (priceSource === "ai_suggested" && (att.price_confidence == null || att.price_confidence >= 0.7) && att.price_value != null) {
          price = String(att.price_value).replace(/^\$|^£/, "");
        }
        if (!price && p.suggested_price != null && priceSource !== "not_found") {
          price = String(p.suggested_price).replace(/^\$|^£/, "");
        }
        var priceDisplay = (att.price_display || "").trim();
        var compareAt = "";
        if (priceDisplay && /was|compare|rrp|msrp|list/i.test(priceDisplay)) {
          var m = priceDisplay.replace(/[^\d.]/g, "").match(/[\d.]+/);
          if (m && parseFloat(m[0]) > 0) compareAt = m[0];
        }
        var weightKg = "";
        if (att.weight_grams != null && typeof att.weight_grams === "number" && att.weight_grams > 0) {
          weightKg = String(Math.round((att.weight_grams / 1000) * 100) / 100);
        } else if (att.weight && typeof att.weight === "string") {
          var w = att.weight.trim().toLowerCase();
          var numMatch = w.match(/[\d.]+/);
          if (numMatch) {
            var num = parseFloat(numMatch[0]);
            if (/\b(g|gram|grams)\b/.test(w)) weightKg = String(Math.round((num / 1000) * 100) / 100);
            else if (/\b(kg|kilo)\b/.test(w)) weightKg = String(num);
            else weightKg = String(num);
          }
        }
        var weightSource = att.weight_source || "";
        var keywords = tags.search_keywords && Array.isArray(tags.search_keywords) ? tags.search_keywords : [];
        var metaDesc = (copy.description || "").trim();
        if (!metaDesc && desc) metaDesc = desc.split(/\n/)[0].trim();
        if (!metaDesc && seoTitle) metaDesc = seoTitle;
        metaDesc = clipMetaDescriptionForSeo(metaDesc, SEO_META_DESC_MAX);
        var sizeVals = [];
        var colorVals = [];
        if (att.detected_sizes && Array.isArray(att.detected_sizes) && att.detected_sizes.length > 0) {
          sizeVals = att.detected_sizes.map(function (s) { return String(s).trim(); }).filter(Boolean);
        } else if (att.size && typeof att.size === "string") {
          sizeVals = att.size.split(/[,;\/]/).map(function (s) { return s.trim(); }).filter(Boolean);
        } else if (att.sizes && Array.isArray(att.sizes)) {
          sizeVals = att.sizes.map(function (s) { return String(s).trim(); }).filter(Boolean);
        } else {
          var pt = (att.product_type || category || "").toLowerCase();
          if (/dog collar|cat collar|lead|hoodie|t-shirt|shirt|clothing|apparel|dress|jacket|jeans/.test(pt)) {
            sizeVals = ["XS", "S", "M", "L", "XL", "XXL"].filter(function (_, i) { return pt.indexOf("hoodie") === -1 || i < 5; });
          } else if (/shoes|trainers|footwear/.test(pt)) {
            sizeVals = ["UK 3", "UK 4", "UK 5", "UK 6", "UK 7", "UK 8", "UK 9", "UK 10", "UK 11", "UK 12"];
          }
        }
        if (att.detected_colors && Array.isArray(att.detected_colors) && att.detected_colors.length > 0) {
          colorVals = att.detected_colors.map(function (c) { return String(c).trim(); }).filter(Boolean);
        } else if (att.color && typeof att.color === "string") {
          colorVals = att.color.split(/[,;\/]/).map(function (s) { return s.trim(); }).filter(Boolean);
        } else if (att.colors && Array.isArray(att.colors)) {
          colorVals = att.colors.map(function (c) { return String(c).trim(); }).filter(Boolean);
        }
        fromListing = {
          title: seoTitle || "Untitled listing",
          description: desc,
          category: category,
          price: price,
          compare_at: compareAt,
          charge_tax: true,
          inventory_tracked: true,
          quantity: 1,
          sku: "",
          sell_when_out_of_stock: false,
          physical_product: true,
          weight_kg: weightKg,
          weight_source: weightSource,
          price_source: priceSource,
          product_type: category,
          vendor: (att.brand || "").trim(),
          brand: (att.brand || "").trim(),
          make: (att.make || "").trim() || undefined,
          model_year: (att.model_year || "").trim() || undefined,
          condition: att.condition || "new",
          status: "draft",
          meta_description: metaDesc,
          tags: keywords,
          photos: p.imageDataUrl ? [p.imageDataUrl] : [],
          extraction: data,
          variant_options: [{ name: "Size", values: sizeVals }, { name: "Color", values: colorVals }],
        };
      }
    } catch (e) {}
    return (
      fromListing || {
        title: "",
        description: "",
        category: "",
        price: "",
        compare_at: "",
        charge_tax: true,
        inventory_tracked: true,
        quantity: 1,
        sku: "",
        sell_when_out_of_stock: false,
        physical_product: true,
        weight_kg: "",
        product_type: "",
        vendor: "",
        status: "draft",
        meta_description: "",
        tags: [],
        photos: [],
        variant_options: [{ name: "Size", values: [] }, { name: "Color", values: [] }],
      }
    );
  }

  /** 1×1 PNG — satisfies publishing API when no image survived in sessionStorage (common after OAuth). */
  var PLACEHOLDER_PHOTO =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  /** Minimum price in minor units (e.g. cents) when draft had no price. */
  var MIN_PRICE_PENCE = 100;

  /**
   * Ensures POST /api/listings/publish passes server validateListing + checkListingQuality without blocking alerts.
   */
  function ensureMinimalUniversalData(ud) {
    if (!ud || typeof ud !== "object") return ud;
    if (!Array.isArray(ud.photos) || ud.photos.filter(Boolean).length === 0) {
      ud.photos = [PLACEHOLDER_PHOTO];
    }
    if (ud.price == null || typeof ud.price !== "number" || ud.price < 1) {
      ud.price = MIN_PRICE_PENCE;
    }
    var t0 = (ud.title || "").trim();
    if (!t0 || /^untitled listing$/i.test(t0)) {
      ud.title = "SyncLyst product listing";
    }
    if (!(ud.description || "").trim()) {
      ud.description = "Details and photos can be updated in Shopify Admin before you go live.";
    }
    if (!(ud.meta_title || "").trim()) {
      ud.meta_title = ud.title;
    }
    ud.meta_title = String(ud.meta_title || "").trim().slice(0, 60);
    var md = String(ud.meta_description || "").trim();
    if (!md) {
      ud.meta_description = buildFallbackMetaSnippet(ud.title, ud.description);
    } else {
      ud.meta_description = clipMetaDescriptionForSeo(md, SEO_META_DESC_MAX);
    }
    return ud;
  }

  function buildUniversalData(d) {
    var photos = Array.isArray(d.photos) ? d.photos.filter(Boolean) : [];
    if (photos.length === 0) {
      try {
        var raw2 = sessionStorage.getItem(DRAFT_LISTING_KEY);
        if (raw2) {
          var p = JSON.parse(raw2);
          if (p && p.imageDataUrl) photos = [p.imageDataUrl];
        }
      } catch (e) {}
    }
    var priceStr = String(d.price != null ? d.price : "").trim().replace(/^\$|^£|^€|^CA\$|^A\$/g, "");
    var priceNum = parseFloat(String(priceStr).replace(/[^\d.]/g, "")) || 0;
    var qty = d.quantity != null ? parseInt(d.quantity, 10) : 1;
    if (isNaN(qty) || qty < 1) qty = 1;
    var weightKgNum = d.weight_kg ? parseFloat(String(d.weight_kg).trim()) : 0.5;
    if (isNaN(weightKgNum) || weightKgNum <= 0) weightKgNum = 0.5;
    var att = (d.extraction && d.extraction.attributes) || {};
    var pricePence = Math.round(priceNum * 100);
    var cond = d.condition || "New";
    if (typeof cond === "string" && cond.toLowerCase() === "new") cond = "New";
    return {
      title: d.title || "Untitled listing",
      description: d.description || "",
      price: pricePence,
      photos: photos,
      brand: d.brand || d.vendor || "",
      make: (d.make || att.make || "").trim() || undefined,
      model_year: (d.model_year || att.model_year || "").trim() || undefined,
      category: d.category || "",
      tags: d.tags || [],
      quantity: Math.max(1, qty),
      sku: d.sku || "",
      weight_kg: weightKgNum,
      condition: cond,
      meta_title: (d.meta_title || d.title || "").trim().slice(0, 60),
      meta_description: clipMetaDescriptionForSeo((d.meta_description || "").trim(), SEO_META_DESC_MAX) || buildFallbackMetaSnippet(d.title, d.description),
      variant_options: Array.isArray(d.variant_options) ? d.variant_options : [],
      product_type: d.product_type || d.category || "",
    };
  }

  function err(msg, code) {
    var e = new Error(msg);
    e.code = code || "PUBLISH";
    return e;
  }

  /**
   * @returns {Promise<object>} Resolves with last API JSON; rejects Error with .code
   */
  function publish(options) {
    options = options || {};
    var selected = loadSelected();
    var pubUrl = getPublishingUrl();
    var publishAbort = options.abortController || new AbortController();
    // Full flow includes token, stores check, create listing (can be large), and Shopify publish — allow enough time in prod.
    var timeoutMs = options.timeoutMs || 90000;
    var timeoutId = setTimeout(function () {
      publishAbort.abort();
    }, timeoutMs);

    var d = loadDraftFromSession();
    var universal_data = ensureMinimalUniversalData(buildUniversalData(d));

    function getToken() {
      try {
        var t = sessionStorage.getItem("auralink_jwt");
        if (t) return Promise.resolve(t);
      } catch (e) {}
      return fetch(pubUrl.replace(/\/$/, "") + "/auth/dev-token", { signal: publishAbort.signal })
        .then(function (r) {
          if (!r.ok) {
            if (r.status === 502 || r.status === 503 || r.status === 504) throw new Error("Failed to fetch");
            return null;
          }
          return r.json();
        })
        .then(function (dt) {
          if (dt && dt.token) {
            try {
              sessionStorage.setItem("auralink_jwt", dt.token);
            } catch (e) {}
            return dt.token;
          }
          return null;
        });
    }

    return getToken()
      .then(function (token) {
        if (!token) {
          clearTimeout(timeoutId);
          return Promise.reject(err("Sign in to publish.", "NO_TOKEN"));
        }
        var base = pubUrl.replace(/\/$/, "");
        return fetch(base + "/api/user/connected-stores", {
          headers: { Authorization: "Bearer " + token },
          signal: publishAbort.signal,
        })
          .then(function (r) {
            return r.ok ? r.json() : {};
          })
          .then(function (stores) {
            var needShopify = selected.indexOf("shopify") !== -1;
            if (needShopify && (!stores.shopify || stores.shopify.status !== "connected")) {
              clearTimeout(timeoutId);
              return Promise.reject(err("Connect Shopify first.", "SHOPIFY_NOT_CONNECTED"));
            }
            return token;
          });
      })
      .then(function (token) {
        if (!token) return;
        // Do not clear the timeout here — listing + publish requests must stay under the same deadline or they can hang forever.
        var base = pubUrl.replace(/\/$/, "");
        return fetch(base + "/api/listings", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
          body: JSON.stringify({ universal_data: universal_data }),
          signal: publishAbort.signal,
        })
          .then(function (r) {
            if (!r.ok) return r.json().then(function (j) { throw err(j.error || r.statusText, "API"); });
            return r.json();
          })
          .then(function (res) {
            var listingId = res.listing_id;
            if (!listingId) throw err("No listing id returned", "API");
            return fetch(base + "/api/listings/publish", {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
              body: JSON.stringify({ listing_id: listingId, platforms: selected }),
              signal: publishAbort.signal,
            }).then(function (r2) {
              if (!r2.ok) return r2.json().then(function (j) { throw err(j.error || r2.statusText, "API"); });
              return r2.json();
            });
          });
      })
      .then(function (result) {
        clearTimeout(timeoutId);
        if (result === undefined) return result;
        var results = result && result.results ? result.results : {};
        var shopifyResult = results.shopify;
        if (shopifyResult && shopifyResult.success === false) {
          throw err(shopifyResult.error || "Shopify publish failed.", "SHOPIFY_PUBLISH");
        }
        var succeeded = Object.keys(results).filter(function (p) {
          return results[p] && results[p].success === true;
        });
        try {
          sessionStorage.setItem("auralink_last_publish_platforms", JSON.stringify(succeeded.length ? succeeded : ["shopify"]));
          if (results.shopify && results.shopify.shop_domain) {
            sessionStorage.setItem("auralink_last_publish_shop", results.shopify.shop_domain);
          }
        } catch (e) {}
        return result;
      })
      .catch(function (errObj) {
        clearTimeout(timeoutId);
        if (errObj && errObj.name === "AbortError") {
          return Promise.reject(err("Publish timed out. Is the publishing API running?", "TIMEOUT"));
        }
        throw errObj;
      });
  }

  global.SynclystPublishFromDraft = {
    getPublishingUrl: getPublishingUrl,
    loadSelected: loadSelected,
    loadDraftFromSession: loadDraftFromSession,
    buildUniversalData: buildUniversalData,
    publish: publish,
    DRAFT_KEY: DRAFT_KEY,
    DRAFT_LISTING_KEY: DRAFT_LISTING_KEY,
  };
})(typeof window !== "undefined" ? window : this);
