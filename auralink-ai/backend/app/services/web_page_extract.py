"""
Fetch public HTTPS product pages and extract description-like text (JSON-LD Product,
Open Graph, meta description). Used to ground listing copy in real page content instead
of model-paraphrased blurbs.

SSRF: HTTPS only, block localhost/metadata hosts, reject resolved private/link-local IPs.
"""
from __future__ import annotations

import html as html_module
import ipaddress
import json
import logging
import re
import socket
from typing import Optional
from urllib.parse import urlparse

import httpx

# Hosts that usually wrap product copy in marketplace SEO (downrank vs brand PDP).
_AGGREGATOR_HOST_MARKERS = (
    "goat.com",
    "stockx.com",
    "grailed.com",
    "depop.com",
    "mercari.com",
    "ebay.",
    "etsy.com",
    "poshmark.com",
    "vestiaire",
    "therealreal.com",
)

logger = logging.getLogger(__name__)

USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 SyncLystFetcher/1.0"
)

# Phrases that strongly suggest generic LLM / template listing copy (not brand PDP text).
GENERIC_MARKETING_PHRASES = (
    "designed for those who appreciate",
    "ideal for urban exploration",
    "unpredictable weather",
    "stay protected from the elements",
    "perfect for everyday wear",
    "makes a statement",
    "elevate your",
    "must-have",
    "stand out from the crowd",
    "whether you're heading",
    "crafted with care",
    "timeless style meets",
    "experience the perfect blend",
    "this jacket features a striking",
    "this product features",
    "bold streetwear and functional",
    "bold streetwear and functional outerwear",
    "advanced weather protection",
)

# Lines / snippets typical of reseller marketplaces, not product facts.
_MARKETPLACE_SUBSTRINGS = (
    "buyer protection guaranteed",
    "buyer protection",
    "curated styles from",
    "shop the ",
    " on goat",
    " on stockx",
    "stockx verified",
    "verified authentic",
    "authenticity guarantee",
    "money back guarantee",
    "shop similar",
    "free returns on all purchases",
    "items ship from",
    "sold by ",
)

# Often copied from site-wide og:description / parked pages — not product copy.
_NON_PRODUCT_SITE_BOILERPLATE = (
    "obtain the domain you want",
    "affordable options for you to obtain",
    "register your domain",
    "buy this domain",
    "domain is for sale",
    "this domain may be for sale",
)

_BLOCKED_HOST_SUBSTRINGS = (
    "localhost",
    "127.0.0.1",
    "0.0.0.0",
    "metadata.google.internal",
    "metadata.google",
    "169.254.169.254",
)


def _host_blocked(host: str) -> bool:
    h = (host or "").lower().strip(".")
    if not h:
        return True
    for s in _BLOCKED_HOST_SUBSTRINGS:
        if s in h:
            return True
    return False


def url_is_safe_for_fetch(url: str) -> bool:
    """Allow only https URLs whose host resolves to a public routable address."""
    try:
        parsed = urlparse(url.strip())
    except Exception:
        return False
    if parsed.scheme.lower() != "https":
        return False
    host = parsed.hostname
    if not host or _host_blocked(host):
        return False
    try:
        infos = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    except OSError as e:
        logger.debug("DNS resolve failed for %s: %s", host, e)
        return False
    for info in infos:
        sockaddr = info[4]
        if not sockaddr:
            continue
        ip_str = sockaddr[0]
        try:
            addr = ipaddress.ip_address(ip_str)
        except ValueError:
            continue
        if (
            addr.is_private
            or addr.is_link_local
            or addr.is_loopback
            or addr.is_multicast
            or addr.is_reserved
            or addr.is_unspecified
        ):
            logger.warning("Blocked fetch to %s (resolved to non-public %s)", host, ip_str)
            return False
    return True


def _brand_alnum(brand: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (brand or "").lower())


def _host_alnum(host: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (host or "").lower())


def source_quality_tier(url: str, brand_hint: Optional[str] = None) -> int:
    """
    0 = host likely official brand shop (brand token appears in domain).
    1 = conventional retailer or unknown.
    2 = marketplace aggregator — prefer only when no tier-0/1 fetch succeeded.
    """
    try:
        host = (urlparse(url).hostname or "").lower()
    except Exception:
        return 1
    if not host:
        return 1
    b = _brand_alnum(brand_hint or "")
    h = _host_alnum(host)
    if len(b) >= 3 and b in h:
        return 0
    for m in _AGGREGATOR_HOST_MARKERS:
        if m in host:
            return 2
    return 1


def marketplace_boilerplate_score(text: str) -> float:
    """Higher when copy is marketplace framing (GOAT/StockX intros), not product facts."""
    if not text or not text.strip():
        return 0.0
    low = text.lower()
    hits = sum(1 for p in _MARKETPLACE_SUBSTRINGS if p in low)
    if re.search(r"\bshop the\b.+\b(?:on|from)\s+goat\b", low):
        hits += 2
    if "other curated styles" in low and "goat" in low:
        hits += 2
    words = max(len(text.split()), 1)
    return min(1.0, hits / (words / 40.0 + 0.75))


def strip_marketplace_boilerplate(text: str) -> str:
    """Strip reseller marketplace wrapper lines; keep substantive product copy."""
    if not text or not text.strip():
        return text
    t = text.strip()
    t = re.sub(
        r"(?is)^\s*shop the [^.]{10,240}?\.\s*(?:buyer protection[^.]*\.\s*)?",
        "",
        t,
        count=1,
    )
    # Site-wide / parked-domain og:description (often one or two sentences before real copy).
    t = re.sub(
        r"(?is)^[^\n]{0,320}?obtain the domain you want[^\n]{0,320}?(?:\n|$)",
        "",
        t,
        count=1,
    )
    t = re.sub(
        r"(?is)^[^\n]{0,200}?safe and secure shopping\.?\s*(?:\n|$)",
        "",
        t,
        count=1,
    )
    paragraphs = re.split(r"\n\s*\n+", t)
    kept: list[str] = []
    for para in paragraphs:
        p = para.strip()
        if not p:
            continue
        low = p.lower()
        if "buyer protection guaranteed" in low or "buyer protection" == low.strip():
            continue
        if "other curated styles from" in low and ("goat" in low or "stockx" in low):
            continue
        if low.startswith("shop the ") and ("goat" in low or "stockx" in low or "grailed" in low):
            continue
        if any(s in low for s in _NON_PRODUCT_SITE_BOILERPLATE):
            continue
        if "safe and secure shopping" in low and ("domain" in low or "website" in low or "hosting" in low):
            continue
        kept.append(p)
    out = "\n\n".join(kept).strip()
    # If we removed junk and only specs remain, keep them even when short (e.g. "Material: Gore-Tex").
    if kept:
        return out
    return text.strip()


def _strip_tags_keep_paragraphs(html: str, max_chars: int = 12000) -> str:
    """Cheap HTML → text for fallback blocks (no external parser)."""
    t = re.sub(r"(?is)<script[^>]*>.*?</script>", " ", html)
    t = re.sub(r"(?is)<style[^>]*>.*?</style>", " ", t)
    t = re.sub(r"(?is)<br\s*/?>", "\n", t)
    t = re.sub(r"(?is)</p\s*>", "\n\n", t)
    t = re.sub(r"<[^>]+>", " ", t)
    t = html_module.unescape(t)
    t = re.sub(r"[ \t\r\f\v]+", " ", t)
    t = re.sub(r"\n{3,}", "\n\n", t)
    t = t.strip()
    if len(t) > max_chars:
        t = t[: max_chars - 1] + "…"
    return t


def _extract_meta_property(html: str, prop: str) -> Optional[str]:
    prop_esc = re.escape(prop)
    patterns = (
        rf'<meta[^>]+property=["\']{prop_esc}["\'][^>]+content=["\']([^"\']*)["\']',
        rf'<meta[^>]+content=["\']([^"\']*)["\'][^>]+property=["\']{prop_esc}["\']',
    )
    for pat in patterns:
        m = re.search(pat, html, re.IGNORECASE)
        if m:
            raw = html_module.unescape(m.group(1).strip())
            if raw and len(raw) > 8:
                return raw
    return None


def _extract_meta_name(html: str, name: str) -> Optional[str]:
    name_esc = re.escape(name)
    patterns = (
        rf'<meta[^>]+name=["\']{name_esc}["\'][^>]+content=["\']([^"\']*)["\']',
        rf'<meta[^>]+content=["\']([^"\']*)["\'][^>]+name=["\']{name_esc}["\']',
    )
    for pat in patterns:
        m = re.search(pat, html, re.IGNORECASE)
        if m:
            raw = html_module.unescape(m.group(1).strip())
            if raw and len(raw) > 8:
                return raw
    return None


def _walk_json_ld_for_product(node, descriptions: list[str], names: list[str]) -> None:
    if isinstance(node, dict):
        types = node.get("@type")
        typelist: list[str] = []
        if isinstance(types, list):
            typelist = [str(x) for x in types if x]
        elif types:
            typelist = [str(types)]
        if any(t in ("Product", "ProductModel", "IndividualProduct") for t in typelist):
            d = node.get("description")
            if isinstance(d, str) and len(d.strip()) > 15:
                descriptions.append(d.strip())
            elif isinstance(d, list):
                parts = [str(x).strip() for x in d if x and str(x).strip()]
                if parts:
                    descriptions.append("\n\n".join(parts))
            n = node.get("name")
            if isinstance(n, str) and n.strip():
                names.append(n.strip())
        for v in node.values():
            _walk_json_ld_for_product(v, descriptions, names)
    elif isinstance(node, list):
        for item in node:
            _walk_json_ld_for_product(item, descriptions, names)


def _extract_json_ld_product(html: str) -> tuple[Optional[str], Optional[str]]:
    descriptions: list[str] = []
    names: list[str] = []
    for m in re.finditer(
        r'<script[^>]+type=["\']application/ld\+json["\'][^>]*>(.*?)</script>',
        html,
        re.DOTALL | re.IGNORECASE,
    ):
        raw = m.group(1).strip()
        if not raw:
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        _walk_json_ld_for_product(data, descriptions, names)
    if not descriptions:
        return None, names[0] if names else None
    # Prefer longest substantive description block
    descriptions.sort(key=len, reverse=True)
    best = descriptions[0]
    return best, names[0] if names else None


def _extract_rte_product_block(html: str) -> Optional[str]:
    """Common Shopify / theme patterns for product body HTML."""
    candidates: list[str] = []
    for pat in (
        r'class=["\'][^"\']*product[_-]?description[^"\']*["\'][^>]*>(.*?)</(?:div|section)>',
        r'class=["\'][^"\']*product-content[^"\']*["\'][^>]*>(.*?)</(?:div|section)>',
        r'data-product-description=["\']1["\'][^>]*>(.*?)</',
        r'id=["\']productDescription["\'][^>]*>(.*?)</(?:div|section)>',
    ):
        for m in re.finditer(pat, html, re.DOTALL | re.IGNORECASE):
            inner = m.group(1)
            text = _strip_tags_keep_paragraphs(inner, max_chars=8000)
            if len(text) > 80:
                candidates.append(text)
    if not candidates:
        return None
    candidates.sort(key=len, reverse=True)
    return candidates[0]


def extract_product_page_text(html: str, page_url: str) -> Optional[str]:
    """
    Pull the best available long-form product copy from HTML.
    Priority: JSON-LD Product description > og:description > rte block > meta description.
    """
    if not html or len(html) < 200:
        return None
    ld_desc, _ = _extract_json_ld_product(html)
    og_desc = _extract_meta_property(html, "og:description")
    og_title = _extract_meta_property(html, "og:title")
    meta_desc = _extract_meta_name(html, "description")
    rte = _extract_rte_product_block(html)

    chunks: list[tuple[int, str]] = []
    if ld_desc:
        chunks.append((4, ld_desc))
    if og_desc and (not ld_desc or len(og_desc) > len(ld_desc) * 0.5):
        chunks.append((3, og_desc))
    if rte:
        chunks.append((2, rte))
    if meta_desc and len(meta_desc) > 40:
        chunks.append((1, meta_desc))

    if not chunks:
        # Very sparse pages: never use full body (nav noise); optional tiny og:title line
        if og_title and len(og_title) > 10:
            return og_title.strip()
        return None

    chunks.sort(key=lambda x: (x[0], len(x[1])), reverse=True)
    best = chunks[0][1]

    # If JSON-LD is short but rte is much longer and substantive, merge (brand sites).
    if ld_desc and rte and len(rte) > len(ld_desc) + 80:
        if generic_marketing_score(rte) <= generic_marketing_score(ld_desc) + 0.05:
            best = ld_desc.strip() + "\n\n" + rte.strip()

    best = re.sub(r"\n{3,}", "\n\n", best).strip()
    if len(best) < 40:
        return None
    logger.debug("Extracted %d chars from %s", len(best), page_url[:80])
    return best


def _clean_ecommerce_title(raw: str) -> str:
    """Drop trailing site name from og:title (e.g. 'Jacket | Brand Shop')."""
    t = raw.strip()
    if not t:
        return t
    if " | " in t:
        left, right = t.split(" | ", 1)
        if len(left.strip()) >= 12 and len(right.strip()) <= len(left.strip()) + 8:
            return left.strip()
    if " – " in t and t.count(" – ") == 1:
        left, right = t.split(" – ", 1)
        if len(left.strip()) >= 12:
            return left.strip()
    return t


def extract_product_page_title(html: str) -> Optional[str]:
    """Product name from og:title (usually cleanest), JSON-LD Product name, or twitter:title."""
    if not html:
        return None
    candidates: list[str] = []
    og = _extract_meta_property(html, "og:title")
    if og and len(og.strip()) > 4:
        candidates.append(_clean_ecommerce_title(og))
    _, ld_name = _extract_json_ld_product(html)
    if ld_name and len(ld_name.strip()) > 4:
        candidates.append(_clean_ecommerce_title(ld_name))
    tw = _extract_meta_property(html, "twitter:title")
    if tw and len(tw.strip()) > 4:
        candidates.append(_clean_ecommerce_title(tw))
    if not candidates:
        return None
    candidates.sort(key=len, reverse=True)
    best = candidates[0].strip()
    if len(best) < 8 or len(best) > 300:
        return None
    return best[:200]


def generic_marketing_score(text: str) -> float:
    """
    0 = likely factual / PDP-style; higher = more generic template phrases.
    Normalized roughly to [0, 1] by phrase hits vs length.
    """
    if not text or not text.strip():
        return 1.0
    low = text.lower()
    hits = sum(1 for p in GENERIC_MARKETING_PHRASES if p in low)
    # Penalize "this X features" / "this brand jacket features" template openers
    if re.search(r"\bthis\s+.+?\s+jacket\s+features\b", low):
        hits += 2
    elif re.search(r"\bthis\s+\w+\s+features\b", low):
        hits += 1
    words = max(len(text.split()), 1)
    # ~1 hit per 75 words → approaches 1.0
    raw = hits / (words / 75.0 + 0.5)
    return min(1.0, raw)


def fetch_page_html(url: str, timeout_sec: float, max_bytes: int) -> Optional[str]:
    """GET url; return response text or None."""
    if not url_is_safe_for_fetch(url):
        return None
    try:
        with httpx.Client(
            timeout=timeout_sec,
            follow_redirects=True,
            headers={"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8"},
        ) as client:
            r = client.get(url)
            if r.status_code != 200:
                logger.debug("Fetch %s → HTTP %s", url[:100], r.status_code)
                return None
            text = r.text
            if len(text.encode("utf-8", errors="ignore")) > max_bytes:
                text = text[:max_bytes]
            return text
    except Exception as e:
        logger.debug("Fetch failed %s: %s", url[:100], e)
        return None


def fetch_and_extract_description(url: str, timeout_sec: float, max_bytes: int) -> tuple[Optional[str], Optional[str]]:
    """Returns (description, page_title)."""
    desc, title = fetch_and_extract_product_copy(url, timeout_sec, max_bytes)
    return desc, title


def fetch_and_extract_product_copy(
    url: str, timeout_sec: float, max_bytes: int
) -> tuple[Optional[str], Optional[str]]:
    """Fetch PDP HTML; return (description_text, product_title) for merging into listing."""
    html = fetch_page_html(url, timeout_sec, max_bytes)
    if not html:
        return None, None
    text = extract_product_page_text(html, url)
    ptitle = extract_product_page_title(html)
    if text:
        text = strip_marketplace_boilerplate(text)
    if ptitle:
        ptitle = strip_marketplace_boilerplate(ptitle)
    return text, ptitle
