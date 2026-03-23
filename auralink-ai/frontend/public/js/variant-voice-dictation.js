/**
 * Variant option voice input: continuous dictation, tap mic again to stop.
 * Parses sizes like "UK 7, UK 8" and letter sizes "XS S M L".
 */
(function (g) {
  var MAX_LEN = 50;

  function parseVariantVoiceTokens(text) {
    if (!text || typeof text !== "string") return [];
    var normalized = text
      .replace(/\s+and\s+/gi, ",")
      .replace(/[;,]+/g, ",")
      .replace(/\s*,\s*/g, ",");
    var segments = normalized.split(",").map(function (s) {
      return s.trim();
    }).filter(Boolean);
    var out = [];
    segments.forEach(function (seg) {
      var reShoe = /\b(UK|US|EU)\s*(\d{1,2}(?:\.\d)?)\b/gi;
      var shoeMatches = seg.match(reShoe);
      if (shoeMatches && shoeMatches.length) {
        reShoe.lastIndex = 0;
        var m;
        while ((m = reShoe.exec(seg)) !== null) {
          var tok = (m[1] + " " + m[2]).replace(/\s+/g, " ");
          if (tok.length && tok.length < MAX_LEN) out.push(tok);
        }
        return;
      }
      seg.split(/\s+/).forEach(function (w) {
        w = w.trim();
        if (w && w.length < MAX_LEN) out.push(w);
      });
    });
    return out;
  }

  /**
   * @param {HTMLButtonElement} btn
   * @param {string} optionName
   * @param {function(string, string): void} addValueToOption
   * @param {function(): void} [onApplied] runs after tokens are added (e.g. refresh listing quality)
   */
  function defaultDictationTitle(optionName) {
    if (optionName === "Color") return "Dictate colors";
    if (optionName === "Size") return "Dictate sizes";
    return "Dictate values";
  }

  function bindVariantMicButton(btn, optionName, addValueToOption, onApplied) {
    if (!btn || btn.getAttribute("data-variant-mic-bound") === "1") return;
    btn.setAttribute("data-variant-mic-bound", "1");
    var idleTitle = defaultDictationTitle(optionName);

    btn.addEventListener("click", function () {
      var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert("Voice input is not supported in this browser. Try Chrome or Edge.");
        return;
      }

      if (btn._variantVoiceRec && btn._variantVoiceListening) {
        try {
          btn._variantVoiceRec.stop();
        } catch (e) {}
        return;
      }

      var rec = new SpeechRecognition();
      var finalTexts = [];
      rec.continuous = true;
      rec.interimResults = false;
      rec.lang = navigator.language || "en-GB";

      btn._variantVoiceRec = rec;
      btn._variantVoiceListening = true;

      btn.classList.add("ring-2", "ring-amber-400", "ring-offset-1", "opacity-90");
      var icon = btn.querySelector("i");
      if (icon) {
        icon.setAttribute("data-lucide", "square");
        if (typeof lucide !== "undefined") lucide.createIcons();
      }
      btn.setAttribute("title", "Tap to stop and add what you said");
      btn.setAttribute("aria-label", "Stop listening and apply");

      rec.onresult = function (event) {
        var i;
        for (i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            var t = (event.results[i][0] && event.results[i][0].transcript) || "";
            t = t.trim();
            if (t) finalTexts.push(t);
          }
        }
      };

      function cleanupIcon() {
        btn.classList.remove("ring-2", "ring-amber-400", "ring-offset-1", "opacity-90");
        if (icon) {
          icon.setAttribute("data-lucide", "mic");
          if (typeof lucide !== "undefined") lucide.createIcons();
        }
        btn.setAttribute("title", idleTitle);
        btn.setAttribute("aria-label", "Dictate");
      }

      function applyTranscript() {
        var full = finalTexts.join(" ").trim();
        var tokens = parseVariantVoiceTokens(full);
        if (tokens.length === 0 && full) {
          full.split(/[\s,;]+/).forEach(function (word) {
            var w = word.trim();
            if (w.length > 0 && w.length < MAX_LEN) tokens.push(w);
          });
        }
        tokens.forEach(function (tok) {
          addValueToOption(optionName, tok);
        });
        if (typeof onApplied === "function") onApplied();
      }

      rec.onend = function () {
        btn._variantVoiceListening = false;
        btn._variantVoiceRec = null;
        cleanupIcon();
        applyTranscript();
      };

      rec.onerror = function () {
        try {
          rec.stop();
        } catch (e) {}
      };

      try {
        rec.start();
      } catch (err) {
        btn._variantVoiceListening = false;
        btn._variantVoiceRec = null;
        cleanupIcon();
      }
    });
  }

  g.parseVariantVoiceTokens = parseVariantVoiceTokens;
  g.bindVariantMicButton = bindVariantMicButton;
})(typeof window !== "undefined" ? window : globalThis);
