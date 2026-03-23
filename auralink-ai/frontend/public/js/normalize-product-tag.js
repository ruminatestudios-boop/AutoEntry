(function (global) {
  function normalizeProductTag(raw) {
    var s = String(raw == null ? "" : raw).trim();
    if (!s) return "";
    return s
      .split(/\s+/)
      .map(function (part) {
        return part
          .split("-")
          .map(function (seg) {
            return seg.length === 0 ? seg : seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase();
          })
          .join("-");
      })
      .join(" ");
  }
  function normalizeProductTagsList(arr) {
    if (!Array.isArray(arr)) return [];
    var seen = {};
    var out = [];
    arr.forEach(function (raw) {
      var n = normalizeProductTag(raw);
      if (!n) return;
      var k = n.toLowerCase();
      if (seen[k]) return;
      seen[k] = true;
      out.push(n);
    });
    return out;
  }
  global.normalizeProductTag = normalizeProductTag;
  global.normalizeProductTagsList = normalizeProductTagsList;
})(typeof window !== "undefined" ? window : this);
