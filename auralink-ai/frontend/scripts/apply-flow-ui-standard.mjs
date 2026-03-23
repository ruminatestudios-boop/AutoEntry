/**
 * One-time / maintenance: inject shared flow stylesheet, page transitions
 * (flow-page-transition.css + .js), and normalize headings to match public/home.html.
 *
 * Usage: node scripts/apply-flow-ui-standard.mjs
 * Run from auralink-ai/frontend
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");

const EXCLUDE_NAMES = new Set(["landing.html", "landing-old.html"]);

const LINK = '\n  <link rel="stylesheet" href="/css/synclyst-flow.css" />\n';
const PAGE_TRANSITION_BLOCK =
  '\n  <link rel="stylesheet" href="/css/flow-page-transition.css" />\n  <script src="/js/flow-page-transition.js"></script>\n';

const VIEW_TRANSITION_META = '\n    <meta name="view-transition" content="same-origin" />';

const TAILWIND_SNIPPETS = [
  '<script src="https://cdn.tailwindcss.com"></script>',
  "<script src=\"https://cdn.tailwindcss.com\"></script>",
];

const FONT_REPLACEMENTS = [
  [
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:ital,wght@0,400;0,600;0,700&display=swap",
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  ],
];

const TEXT_REPLACEMENTS = [
  [
    'class="font-serif text-xl font-bold text-zinc-900',
    'class="text-xl font-semibold tracking-tight text-zinc-900',
  ],
  ['class="font-serif text-xl font-bold text-center', 'class="text-xl font-semibold tracking-tight text-center'],
  ['class="font-serif text-xl font-bold text-zinc-900 mb-1 text-center"', 'class="text-xl font-semibold tracking-tight text-zinc-900 mb-1 text-center"'],
  ['class="font-serif text-xl font-bold text-zinc-900 mb-2 text-center"', 'class="text-xl font-semibold tracking-tight text-zinc-900 mb-2 text-center"'],
  ['class="font-serif text-xl font-bold text-zinc-900 mb-4 text-center"', 'class="text-xl font-semibold tracking-tight text-zinc-900 mb-4 text-center"'],
  ['class="font-serif text-xl font-bold text-zinc-900 mb-2"', 'class="text-xl font-semibold tracking-tight text-zinc-900 mb-2"'],
];

function processHtml(content, filePath) {
  let s = content;
  let changed = false;

  if (!s.includes("synclyst-flow.css")) {
    let inserted = false;
    for (const tw of TAILWIND_SNIPPETS) {
      if (s.includes(tw)) {
        s = s.replace(tw, tw + LINK);
        inserted = true;
        changed = true;
        break;
      }
    }
    if (!inserted && filePath.includes("public")) {
      console.warn("skip link (no tailwind cdn):", filePath);
    }
  }

  for (const [a, b] of FONT_REPLACEMENTS) {
    if (s.includes(a)) {
      s = s.split(a).join(b);
      changed = true;
    }
  }
  for (const [a, b] of TEXT_REPLACEMENTS) {
    if (s.includes(a)) {
      s = s.split(a).join(b);
      changed = true;
    }
  }

  if (s.includes("tailwind.config") && s.includes("serif:")) {
    const next = s.replace(
      /fontFamily:\s*\{\s*sans:\s*\['Inter',\s*'system-ui',\s*'sans-serif'\],\s*serif:\s*\[[^\]]+\]\s*\}/,
      "fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] }"
    );
    if (next !== s) {
      s = next;
      changed = true;
    }
    const next2 = s.replace(
      /,\s*serif:\s*\[[^\]]+\]/g,
      ""
    );
    if (next2 !== s) {
      s = next2;
      changed = true;
    }
  }

  const beforeSerif = s;
  s = s.replace(/\bfont-serif\s+/g, "");
  if (s !== beforeSerif) changed = true;

  if (s.includes("synclyst-flow.css") && !s.includes("flow-page-transition.css")) {
    s = s.replace(
      '<link rel="stylesheet" href="/css/synclyst-flow.css" />',
      '<link rel="stylesheet" href="/css/synclyst-flow.css" />' + PAGE_TRANSITION_BLOCK
    );
    changed = true;
  }

  if (s.includes("flow-page-transition.css") && !s.includes('name="view-transition"')) {
    const withVt = s.replace(
      /<meta[^>]*name=["']viewport["'][^>]*>/i,
      (m) => m + VIEW_TRANSITION_META
    );
    if (withVt !== s) {
      s = withVt;
      changed = true;
    }
  }

  return { s, changed };
}

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) out.push(...walk(p));
    else if (name.endsWith(".html") && !EXCLUDE_NAMES.has(name)) out.push(p);
  }
  return out;
}

function main() {
  const files = walk(PUBLIC);
  let n = 0;
  for (const filePath of files) {
    const raw = fs.readFileSync(filePath, "utf8");
    const { s, changed } = processHtml(raw, filePath);
    if (s !== raw) {
      fs.writeFileSync(filePath, s);
      n++;
      console.log("updated", path.relative(ROOT, filePath));
    }
  }
  console.log("done,", n, "files modified");
}

main();
