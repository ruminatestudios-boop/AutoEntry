/**
 * Meta description helper for flow pages & publish script.
 * Clips to max length without ending on "& a", mid-conjunction, or mid-sentence where possible.
 */
(function (g) {
  var SEO_META_DESC_MAX = 155;

  function stripDanglingMetaFragment(s) {
    var x = (s || "").trim();
    var prev;
    do {
      prev = x;
      x = x.replace(/\s+&\s+\w{0,15}$/i, "").trim();
      x = x.replace(/\s+&\s*$/i, "").trim();
      x = x.replace(/\s+(and|or)\s+\w{0,15}$/i, "").trim();
    } while (x !== prev);
    x = x.replace(/\s*,\s*$/, "").trim();
    return x;
  }

  function clipMetaDescriptionForSeo(text, maxLen) {
    maxLen = maxLen || SEO_META_DESC_MAX;
    var t = (text || "").replace(/\s+/g, " ").trim();
    if (!t) return "";
    if (t.length <= maxLen) {
      var s0 = stripDanglingMetaFragment(t);
      if (s0 && !/[.!?]$/.test(s0) && s0.length + 1 <= maxLen) {
        s0 = s0.replace(/[.,;:]+$/, "").trim() + ".";
      }
      return s0.slice(0, maxLen).trim();
    }
    var segment = t.slice(0, maxLen + 1);
    var bestEnd = -1;
    var minPos = Math.floor(maxLen * 0.45);
    var i;
    for (i = segment.length - 1; i >= minPos; i--) {
      var c = segment[i];
      if (c === "!" || c === "?") {
        bestEnd = i + 1;
        break;
      }
      if (c === ".") {
        var nextCh = segment[i + 1];
        var prevCh = i > 0 ? segment[i - 1] : "";
        if (/\d/.test(prevCh) && /\d/.test(segment[i + 1] || "")) continue;
        if (nextCh === " " || nextCh === undefined) {
          if (nextCh === " " && i + 2 < segment.length && /[a-z]/.test(segment[i + 2])) continue;
          bestEnd = i + 1;
          break;
        }
      }
    }
    var out;
    if (bestEnd > 0 && bestEnd <= maxLen) {
      out = segment.slice(0, bestEnd).trim();
    } else {
      var lastSpace = segment.lastIndexOf(" ");
      if (lastSpace >= Math.floor((maxLen * 2) / 3)) {
        out = t.slice(0, lastSpace).trim();
      } else {
        out = t.slice(0, maxLen).trim();
      }
    }
    out = out.replace(/[.,;:]+$/, "").trim();
    out = stripDanglingMetaFragment(out);
    if (out && !/[.!?]$/.test(out) && out.length + 1 <= maxLen) {
      out = out.replace(/[.,;:]+$/, "").trim() + ".";
    }
    if (out.length > maxLen) {
      var sp = out.lastIndexOf(" ", maxLen);
      if (sp >= Math.floor((maxLen * 2) / 3)) out = out.slice(0, sp).trim();
      else out = out.slice(0, maxLen).trim();
      out = stripDanglingMetaFragment(out.replace(/[.,;:]+$/, "").trim());
    }
    return out;
  }

  g.SEO_META_DESC_MAX = SEO_META_DESC_MAX;
  g.stripDanglingMetaFragment = stripDanglingMetaFragment;
  g.clipMetaDescriptionForSeo = clipMetaDescriptionForSeo;
})(typeof window !== "undefined" ? window : globalThis);
