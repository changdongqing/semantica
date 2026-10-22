#!/usr/bin/env python3
"""Extract candidate translatable UI strings from explorer/src."""
import csv, json, os, re, sys
from collections import Counter, defaultdict

ROOT = sys.argv[1] if len(sys.argv) > 1 else "explorer/src"
OUTDIR = sys.argv[2] if len(sys.argv) > 2 else "/tmp/i18n_work"

HUMAN_ATTRS = {
    "title", "label", "placeholder", "aria-label", "aria-description", "alt",
    "tooltip", "description", "helpertext", "helptext", "emptymessage",
    "emptystate", "caption", "subtitle", "name", "text",
}

CODE_WORDS = {
    "Content-Type", "content-type", "Authorization", "Accept", "accept",
    "Fira Code", "JetBrains Mono", "IBM Plex Sans", "Space Grotesk",
    "Cascadia Code", "sans-serif", "Segoe UI", "Inter",
    "application/x-www-form-urlencoded", "multipart/form-data",
    "button", "submit", "reset", "primary", "secondary", "tertiary", "danger",
    "success", "warning", "info", "error", "text", "outline", "ghost", "link",
    "GET", "POST", "PUT", "PATCH", "DELETE", "json", "utf-8", "utf8",
    "application/json", "text/plain", "text/html", "image/png", "image/svg+xml",
    "asc", "desc", "left", "right", "top", "bottom", "center", "start", "end",
    "horizontal", "vertical", "row", "column", "flex", "grid", "block", "inline",
    "relative", "absolute", "fixed", "sticky", "hidden", "visible", "none",
    "auto", "pointer", "default", "inherit", "transparent", "currentColor",
    "true", "false", "null", "undefined", "object", "string", "number",
    "boolean", "array", "function", "div", "span", "svg", "path", "circle",
    "rdf", "rdfs", "owl", "skos", "sparql", "turtle", "jsonld", "n-triples",
    "ttl", "nt", "csv", "tsv", "parquet", "graphml", "cypher", "aql",
    "loading", "idle", "active", "inactive", "open", "closed", "close", "open",
    "dark", "light", "system", "auto", "click", "change", "input", "keydown",
    "mouseover", "mouseenter", "mouseleave", "scroll", "resize", "focus", "blur",
    "monospace", "sans-serif", "serif", "space-between", "space-around",
}

CSS_RE = re.compile(r"^(var\(|rgba?\(|hsla?\(|#|\.\.?/|/|[\d.]+(px|rem|em|%|vh|vw|s|ms)?$)")
URL_RE = re.compile(r"^(https?:|data:|mailto:|wss?:|/+|[a-z]+://)")
IDENT_RE = re.compile(r"^[A-Za-z_$][A-Za-z0-9_$-]*$")
HAMMER_RE = re.compile(r"(^|[-_/])(ws|ui|kg|btn|icon|pill|eyebrow|node|edge|tab|panel|row|col|card|menu|list|item|title|label)([-_/]|$)")
ENUM_RE = re.compile(r"^[A-Z][A-Z0-9_]{2,}$")
HAS_LETTER_RE = re.compile(r"[A-Za-z一-鿿]")


CODE_KEYWORD_RE = re.compile(
    r"\b(const|let|var|return|useState|useEffect|useMemo|useRef|useCallback|"
    r"response|Promise|async|await|function|import|export|fetch|AbortError|"
    r"undefined|null|true|false|typeof|instanceof|classList|querySelector)\b"
)
JSX_CODE_CHARS_RE = re.compile(r"[(){}\[\]`;|=]")
CALL_RE = re.compile(r"\w\.\w+\s*\(")
CSS_VALUE_RE = re.compile(r"^(\d|#|\.\d)")
CSS_DECL_RE = re.compile(r":[^;]*;")
CMP_BEFORE_RE = re.compile(r"(===|!==|==|!=|\.name\s*===)\s*$")
CSS_PROP_RE = re.compile(
    r"^[\s,;]*(height|width|min-|max-|border|color|background|margin|padding|font|"
    r"display|gap|left|top|right|bottom|opacity|z-index|transform|transition|"
    r"box-shadow|flex|grid|line-height|letter-spacing|overflow|cursor|position)\b[\w-]*\s*:"
)
FONT_BEFORE_RE = re.compile(r"(fontFamily|font-family|font)\s*[:=]\s*$")
SVG_PATH_RE = re.compile(r"^M[\d.,+\-\s]*[A-Za-z]")
REGEX_LITERAL_RE = re.compile(r"(\\[bdw]|\(\?:|^/?\^|\$$)")
CSS_ANIM_RE = re.compile(r"^[\d.]+m?s\s+(linear|ease|ease-in|ease-out|infinite)|linear infinite")
CLASS_LIST_RE = re.compile(r"(^|\s)(ws|ui|kg|sem|graph|explore)-[a-z]")
TRANSITION_RE = re.compile(
    r"^(all|background|color|border|opacity|transform|width|height|top|left|right|"
    r"bottom|box-shadow|fill|stroke|filter|visibility)[\w-]*\s+[\d.]+m?s"
    r"(\s+(ease|linear|ease-in|ease-out|ease-in-out|infinite))?$"
)
LOG_TAG_RE = re.compile(r"^\[[A-Za-z][\w:-]*[:\]]")
DEMO_DATA_RE = re.compile(r"^[a-zA-Z_]+\w*\([^)]*,\s*[^)]*\)")


def strip_comments_and_collect_strings(src):
    """Return (masked_src, strings, jsx_ranges). Masked src blanks comments and
    string contents but keeps newlines so line numbers stay valid."""
    out = list(src)
    strings = []  # (start, end, raw_inner, quote, line, context)
    i, n = 0, len(src)
    while i < n:
        c = src[i]
        nxt = src[i + 1] if i + 1 < n else ""
        if c == "/" and nxt == "/":
            j = src.find("\n", i)
            j = n if j == -1 else j
            for k in range(i, j):
                out[k] = " "
            i = j
        elif c == "/" and nxt == "*":
            j = src.find("*/", i + 2)
            j = n if j == -1 else j + 2
            for k in range(i, j):
                if out[k] != "\n":
                    out[k] = " "
            i = j
        elif c in "'\"`":
            quote = c
            j = i + 1
            while j < n:
                if src[j] == "\\":
                    j += 2
                    continue
                if src[j] == quote:
                    break
                j += 1
            inner = src[i + 1:j]
            line = src.count("\n", 0, i) + 1
            # find attribute name if this string is an attribute value
            pre = src[max(0, i - 120):i]
            m = re.search(r"([A-Za-z_][\w-]*)\s*=\s*$", pre)
            attr = m.group(1).lower() if m else None
            strings.append({
                "start": i, "end": j + 1, "inner": inner, "quote": quote,
                "line": line, "attr": attr, "template": quote == "`",
            })
            for k in range(i + 1, min(j, n)):
                if out[k] != "\n":
                    out[k] = " "
            i = j + 1
        else:
            i += 1
    return "".join(out), strings


def jsx_text_nodes(masked):
    nodes = []
    for m in re.finditer(r">\s*([^<>{}]+?)\s*<", masked):
        text = m.group(1)
        if not text.strip():
            continue
        line = masked.count("\n", 0, m.start(1)) + 1
        nodes.append({"text": text, "line": line})
    # also multi-line text nodes (rare) handled by the same regex since [^<>{}]* matches \n
    return nodes


def clean(s):
    s = re.sub(r"\s+", " ", s).strip()
    s = s.replace("&amp;", "&").replace("&nbsp;", " ").replace("&mdash;", "—")
    return s


def classify(text, kind, attr=None, before="", after=""):
    s = clean(text)
    if not s or not HAS_LETTER_RE.search(s):
        return None
    if s in CODE_WORDS:
        return "exclude"
    if CMP_BEFORE_RE.search(before or ""):
        return "exclude"
    if FONT_BEFORE_RE.search(before or ""):
        return "exclude"
    if s.startswith(",") or s.startswith("[]") or CSS_PROP_RE.match(s):
        return "exclude"
    if SVG_PATH_RE.match(s) or REGEX_LITERAL_RE.search(s) or CSS_ANIM_RE.search(s):
        return "exclude"
    if CLASS_LIST_RE.search(s) or "--" in s:
        return "exclude"
    if TRANSITION_RE.match(s) or LOG_TAG_RE.match(s) or DEMO_DATA_RE.match(s):
        return "exclude"
    if "console." in (before or ""):
        return "exclude"
    if not re.sub(r"[\s·—:,.%/()\-]", "", re.sub(r"\{\{\w+\}\}", "", s)):
        return "exclude"
    if re.search(r"\{\{\w+\}\}\s*px", s):
        return "exclude"
    if kind != "jsx_text" and re.search(r"(\|\||&&|=>|\.startsWith\(|String\()", s):
        return "exclude"
    if attr and attr.startswith("data-"):
        return "exclude"
    if CSS_RE.match(s) or URL_RE.match(s):
        return "exclude"
    if ";" in s:
        return "exclude"
    if re.search(r"[{}]", re.sub(r"\{\{\w+\}\}", "", s)):
        return "exclude"
    if ENUM_RE.match(s):
        return "exclude"
    if attr in HUMAN_ATTRS and not CSS_RE.match(s):
        words = s.split()
        return "high" if (len(words) >= 2 or len(s) >= 8) else "medium"
    if kind == "jsx_text":
        if JSX_CODE_CHARS_RE.search(s) or CALL_RE.search(s) or CODE_KEYWORD_RE.search(s):
            return "exclude"
        if s.startswith(("=", ":", "-", "/", "?")):
            return "exclude"
        words = s.split()
        if len(words) >= 2 or len(s) >= 6:
            return "high"
        if s[:1].isupper():
            return "medium"
        return "exclude"
    # string literal
    if kind == "string":
        if CSS_DECL_RE.search(s) and (";" in s or "{" in s):
            return "exclude"
        if CSS_VALUE_RE.match(s):
            return "exclude"
        if CALL_RE.search(s) and len(s) < 60:
            return "exclude"
        if re.search(r"\b(solid|dashed|dotted)\b", s) and re.search(r"\d", s):
            return "exclude"
        if re.search(r"(class|className|style)\s*=", s):
            return "exclude"
    words = s.split()
    if len(words) >= 3 or (len(words) == 2 and len(s) >= 10):
        return "high"
    if len(words) == 2:
        return "medium"
    if s[:1].isupper() and s.isalpha() and len(s) >= 3:
        return "medium"
    if len(s) >= 3 and IDENT_RE.match(s) and s[:1].isupper():
        return "medium"
    return "exclude"


def slugify(s, maxlen=40):
    s = clean(s).lower()
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    if not s:
        s = "text"
    if len(s) > maxlen:
        s = s[:maxlen].rstrip("-")
    return s


records = []
for dirpath, _, files in os.walk(ROOT):
    for fn in sorted(files):
        if not fn.endswith((".ts", ".tsx")):
            continue
        path = os.path.join(dirpath, fn)
        # The i18n runtime and switcher hold catalog metadata, not untranslated UI copy.
        if "/i18n/" in path or path.endswith("LanguageSwitcher.tsx"):
            continue
        src = open(path, encoding="utf-8").read()
        masked, strings = strip_comments_and_collect_strings(src)
        # JSX text: only meaningful in .tsx
        if fn.endswith(".tsx"):
            for node in jsx_text_nodes(masked):
                conf = classify(node["text"], "jsx_text")
                if conf in ("high", "medium"):
                    records.append({
                        "file": path, "line": node["line"], "kind": "jsx_text",
                        "confidence": conf, "text": clean(node["text"]), "attr": "",
                    })
        for st in strings:
            text = st["inner"]
            templated = False
            if st["template"] and "${" in text:
                templated = True
                text = re.sub(r"\$\{[^}]*\}", "{{var}}", text)
            before = src[max(0, st["start"] - 40):st["start"]]
            after = src[st["end"]:st["end"] + 20]
            kind = "attr" if st["attr"] in HUMAN_ATTRS else "string"
            conf = classify(text, kind, st["attr"], before, after)
            if templated and conf == "medium" and len(clean(text)) >= 12:
                conf = "high"
            if conf in ("high", "medium"):
                records.append({
                    "file": path, "line": st["line"], "kind": kind,
                    "confidence": conf, "text": clean(text), "attr": st["attr"] or "",
                    "templated": templated,
                })

# dedupe by (file, line, text)
seen = set()
uniq = []
for r in records:
    k = (r["file"], r["line"], r["text"], r["kind"])
    if k in seen:
        continue
    seen.add(k)
    uniq.append(r)

# assign suggested keys
for r in uniq:
    rel = os.path.relpath(r["file"], ROOT)
    parts = rel.replace("\\", "/").split("/")
    if parts[-1].startswith("index"):
        parts = parts[:-1]
    else:
        parts[-1] = os.path.splitext(parts[-1])[0]
    ns = ".".join(p.lower() for p in parts if p not in ("src",))
    r["key"] = f"{ns}.{slugify(r['text'], 32)}"

os.makedirs(OUTDIR, exist_ok=True)
csv_path = os.path.join(OUTDIR, "frontend-i18n-inventory.csv")
with open(csv_path, "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=["file", "line", "kind", "confidence", "attr", "text", "key"])
    w.writeheader()
    for r in sorted(uniq, key=lambda x: (x["file"], x["line"])):
        w.writerow({k: r[k] for k in w.fieldnames})

# unique string catalog
uniq_map = {}
for r in uniq:
    k = r["text"]
    e = uniq_map.setdefault(k, {"text": k, "kind": set(), "confidence": r["confidence"],
                                "files": set(), "occurrences": 0, "templated": False})
    e["kind"].add(r["kind"])
    e["files"].add(os.path.relpath(r["file"], ROOT))
    e["occurrences"] += 1
    e["templated"] = e["templated"] or r.get("templated", False)
    if r["confidence"] == "high":
        e["confidence"] = "high"
with open(os.path.join(OUTDIR, "frontend-i18n-unique.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["text", "confidence", "kinds", "occurrences", "files", "templated"])
    for e in sorted(uniq_map.values(), key=lambda x: (-x["occurrences"], x["text"])):
        w.writerow([e["text"], e["confidence"], "/".join(sorted(e["kind"])),
                    e["occurrences"], len(e["files"]), e["templated"]])

# summary
by_conf = Counter(r["confidence"] for r in uniq)
by_kind = Counter(r["kind"] for r in uniq)
by_file = Counter(r["file"] for r in uniq)
unique_texts = {(r["text"], r["kind"]) for r in uniq}
unique_texts_ci = {r["text"].lower() for r in uniq}
area = Counter()
for r in uniq:
    rel = os.path.relpath(r["file"], ROOT).replace("\\", "/")
    parts = rel.split("/")
    area["/".join(parts[:2]) if len(parts) > 1 else "root"] += 1
summary = {
    "files_scanned": sum(1 for d, _, fs in os.walk(ROOT) for f in fs if f.endswith((".ts", ".tsx"))),
    "files_with_strings": len(by_file),
    "total_occurrences": len(uniq),
    "unique_strings": len(unique_texts_ci),
    "by_confidence": dict(by_conf),
    "by_kind": dict(by_kind),
    "by_area": dict(area.most_common()),
    "top_files": [{"file": k, "count": v} for k, v in by_file.most_common(20)],
    "high_unique": len({r["text"] for r in uniq if r["confidence"] == "high"}),
    "unique_all": len(uniq_map),
    "unique_high_medium": len(uniq_map),
    "unique_by_confidence": {
        c: sum(1 for e in uniq_map.values() if e["confidence"] == c) for c in ("high", "medium")
    },
    "total_occurrences_unique": sum(e["occurrences"] for e in uniq_map.values()),
}
with open(os.path.join(OUTDIR, "frontend-i18n-summary.json"), "w", encoding="utf-8") as f:
    json.dump(summary, f, ensure_ascii=False, indent=2)

print(json.dumps(summary, ensure_ascii=False, indent=2))
print("\nCSV:", csv_path)
print("\n--- top high-confidence samples ---")
for r in [x for x in uniq if x["confidence"] == "high"][:40]:
    print(f'{os.path.relpath(r["file"], ROOT)}:{r["line"]}  [{r["kind"]}]  {r["text"][:90]}')
print("\n--- sanity: excluded-ish lookalikes that passed ---")
for r in [x for x in uniq if x["confidence"] == "medium"][:40]:
    print(f'{os.path.relpath(r["file"], ROOT)}:{r["line"]}  [{r["kind"]}]  {r["text"][:90]}')
