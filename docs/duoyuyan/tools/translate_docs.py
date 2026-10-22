#!/usr/bin/env python3
"""Translate the English docs into docs/zh (zh-Hans) with Claude.

Usage:
    pip install anthropic
    export ANTHROPIC_API_KEY=...
    python docs/duoyuyan/tools/translate_docs.py --all --missing
    python docs/duoyuyan/tools/translate_docs.py installation quickstart

Writes drafts to /tmp/i18n_work/out by default. Post-process (add sourceHash and
copy into docs/zh) before running docs_check.py and docs_check_locale.py.
"""
import argparse, hashlib, json, os, re, sys, time
from concurrent.futures import ThreadPoolExecutor, as_completed
import anthropic

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
DOCS = os.path.join(ROOT, "docs")
MODEL = "claude-opus-5-5"

SYSTEM = """You are a senior technical translator for the Semantica open-source documentation (MIT licensed).

Translate the English source Markdown/MDX file into Simplified Chinese (zh-Hans).

STRICT RULES
1. Preserve every fenced code block and its contents byte-for-byte. Never translate code, comments inside code, identifiers, CLI flags, API names, file paths, URLs, JSON keys, or inline code spans.
2. Preserve all MDX/HTML component tags, technical attributes, props, component structure, image paths, table structure, and blank lines. Do not rename or reorder components.
   You SHOULD translate human-facing component props: `title` on Tab/Accordion/Card/Step, `description`, and `label`. Keep technical props (`icon`, `href`, `id`, `src`, `columns`, etc.) unchanged.
3. Translate the values of frontmatter `title` and `description`; keep all frontmatter keys and all other frontmatter values unchanged.
4. Preserve heading hierarchy exactly. Do not add commentary, summaries, or a wrapper code fence. Output only the translated file.
5. In Mermaid blocks, translate only human-readable labels; never change node IDs, arrows, or syntax.
6. Use this glossary consistently:
   Context Graph=上下文图; Knowledge Graph=知识图谱; Ontology=本体; Provenance=溯源;
   Decision Intelligence=决策智能; Entity Resolution=实体消解; Node=节点; Edge=边;
   Triplet=三元组; Ingest=摄取; Chunk=分块; Embedding=嵌入; Vector Store=向量存储;
   Graph Store=图存储; Workspace=工作区; Dossier=档案; Proposal=提案; Alignment=对齐;
   Vocabulary=词表; Scheme=词表方案; Registry=注册表; Lineage=血缘; Snapshot=快照;
   Deduplication=去重; Forward Chaining=前向链; Audit Trail=审计轨迹.
7. Do not translate product, standard, format, or vendor names: Semantica, Semantica Explorer,
   PROV-O, RDF, RDFS, OWL, SKOS, SPARQL, SHACL, JSON-LD, Turtle, N-Triples, Parquet, GraphML,
   Cypher, Neo4j, FalkorDB, Oxigraph, Qdrant, Weaviate, Milvus, Pinecone, pgvector, Databricks,
   Snowflake, SAP, Salesforce, PostgreSQL, MySQL, SQLite, Oracle, DuckDB, MongoDB, Kafka, Kinesis.
8. Chinese UI/documentation style: concise, technical, full-width punctuation for sentences; keep a
   space between Chinese and Latin text; do not add periods to headings or labels.
"""

def read(path):
    return open(path, encoding="utf-8").read()

def strip_wrapper(text):
    text = text.strip()
    m = re.match(r"^```(?:markdown|md|mdx)?\s*\n(.*)\n```$", text, re.S)
    return m.group(1) if m else text

def fences(text):
    lines = text.splitlines(keepends=True)
    blocks, cur, inside, marker = [], [], False, ""
    for line in lines:
        stripped = line.strip()
        m = re.match(r"^(`{3,}|~{3,})(.*)$", stripped)
        if not inside and m:
            inside, marker, cur = True, m.group(1), [line]
        elif inside:
            cur.append(line)
            if stripped.startswith(marker) and stripped == marker:
                blocks.append("".join(cur))
                inside, cur = False, []
    return [tuple(l.rstrip() for l in block.splitlines()) for block in blocks]

def tag_counts(text):
    names = ["AccordionGroup","Accordion","Steps","Step","CodeGroup","Tabs","Tab","CardGroup","Card","Expandable","Tip","Note","Warning","Info"]
    return {n: (len(re.findall(rf"<{n}[\s>]", text)), len(re.findall(rf"</{n}>", text))) for n in names}

def link_targets(text):
    return re.findall(r"\]\(([^)\s]+)\)", text)

ASSET_RE = re.compile(r"\.(?:png|jpe?g|gif|svg|webp|pdf|zip|json|ya?ml|csv|txt|ttl|rdf|owl|nt|parquet|graphml|md|mdx)$", re.I)

def localize_links(text):
    def md(m):
        bang, label, target, tail = m.group(1), m.group(2), m.group(3), m.group(4) or ""
        if bang or target.startswith(("http://", "https://", "mailto:", "#", "/assets/", "/zh/")):
            return m.group(0)
        if target.startswith("/") and not ASSET_RE.search(target):
            return f"[{label}](/zh{target}{tail})"
        return m.group(0)
    text = re.sub(r"(!?)\[([^\]]+)\]\(([^)\s]+)([^)]*)\)", md, text)

    def href(m):
        target = m.group(1)
        if target.startswith(("http://", "https://", "#", "/assets/", "/zh/")):
            return m.group(0)
        if target.startswith("/") and not ASSET_RE.search(target):
            return f'href="/zh{target}"'
        return m.group(0)
    return re.sub(r'href="([^"]+)"', href, text)

def frontmatter_title(text):
    m = re.match(r"^---\n(.*?)\n---", text, re.S)
    return m.group(1) if m else ""

def validate(src, out):
    problems = []
    if fences(src) != fences(out):
        problems.append("code fences changed")
    if tag_counts(src) != tag_counts(out):
        problems.append("MDX component counts changed")
    def normalize_targets(targets):
        return [re.sub(r"^/zh(?=/)", "", t) for t in targets]
    if normalize_targets(link_targets(src)) != normalize_targets(link_targets(out)):
        problems.append("link targets changed")
    def fm_keys(text):
        return re.findall(r"^([A-Za-z][\w-]*):", frontmatter_title(text), re.M)
    if fm_keys(src) != fm_keys(out):
        problems.append("frontmatter keys changed")
    return problems

CHUNK_CHARS = 12000

def split_source(src):
    if len(src) <= CHUNK_CHARS:
        return [src]
    lines = src.splitlines(keepends=True)
    chunks, cur, size = [], [], 0
    inside_fence, marker = False, ""
    for line in lines:
        cur.append(line)
        size += len(line)
        stripped = line.strip()
        m = re.match(r"^(`{3,}|~{3,})", stripped)
        if m:
            if not inside_fence:
                inside_fence, marker = True, m.group(1)
            elif stripped.startswith(marker) and stripped == marker:
                inside_fence = False
        if (not inside_fence and size >= CHUNK_CHARS
                and (line.startswith("#") or not line.strip())):
            chunks.append("".join(cur))
            cur, size = [], 0
    if cur:
        chunks.append("".join(cur))
    return chunks

def translate(client, rel, attempt=0):
    rel = rel[:-3] if rel.endswith(".md") else rel
    src = read(os.path.join(DOCS, rel + ".md"))
    parts = split_source(src)
    if len(parts) > 1:
        translated = []
        for index, part in enumerate(parts, 1):
            note = (
                f"This is part {index} of {len(parts)} of the file. Translate only this part. "
                "Do not add a summary, commentary, or extra frontmatter for parts after the first."
            )
            translated.append(translate_text(client, rel, part, note, attempt=0))
        text = "\n\n".join(translated)
        text = localize_links(strip_wrapper(text))
        problems = validate(src, text)
        if problems:
            os.makedirs("/tmp/i18n_work/fail", exist_ok=True)
            open(f"/tmp/i18n_work/fail/{rel.replace('/', '__')}", "w", encoding="utf-8").write(text)
            raise RuntimeError(f"{rel}: {', '.join(problems)}")
        return rel, text, usage_stub()

    return translate_text(client, rel, src, "", attempt)

def usage_stub():
    class U: input_tokens=0; output_tokens=0
    return U()

def translate_text(client, rel, src, note, attempt=0):
    user = f"<source path=\"{rel}.md\">\n{src}\n</source>\n{note}"
    msg = client.messages.create(
        model=MODEL,
        max_tokens=16000,
        output_config={"effort": "low"},
        system=SYSTEM,
        messages=[{"role": "user", "content": user}],
    )
    if msg.stop_reason == "max_tokens":
        raise RuntimeError(f"{rel}: output truncated at max_tokens (chunk {len(src)} chars)")
    text = "".join(b.text for b in msg.content if b.type == "text")
    text = localize_links(strip_wrapper(text))
    problems = validate(src, text)
    if problems:
        os.makedirs("/tmp/i18n_work/fail", exist_ok=True)
        open(f"/tmp/i18n_work/fail/{rel.replace('/', '__')}", "w", encoding="utf-8").write(text)
        if attempt == 0:
            return translate_text(client, rel, src, note, attempt=1)
        raise RuntimeError(f"{rel}: {', '.join(problems)}")
    return text

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("pages", nargs="*")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--missing", action="store_true")
    ap.add_argument("--out", default="/tmp/i18n_work/out")
    ap.add_argument("--root", default=None)
    args = ap.parse_args()
    global DOCS
    if args.root:
        DOCS = os.path.join(args.root, "docs")
    pages = args.pages
    if args.all:
        config = json.load(open(os.path.join(DOCS, "docs.json")))
        en = [l for l in config["navigation"]["languages"] if l["language"] == "en"][0]
        def walk(o):
            out=[]
            if isinstance(o, dict):
                for p in o.get("pages", []):
                    if isinstance(p, str): out.append(p)
                    else: out.extend(walk(p))
                for v in o.values():
                    if isinstance(v,(dict,list)): out.extend(walk(v))
            elif isinstance(o, list):
                for x in o: out.extend(walk(x))
            return out
        pages = sorted({p for p in walk(en) if not p.startswith("http")})
        pages = [p for p in pages if p != "index"]
    if args.missing:
        pages = [p for p in pages if not os.path.exists(os.path.join(args.out, p + ".md"))]
    os.makedirs(args.out, exist_ok=True)
    client = anthropic.Anthropic()
    results=[]; failures=[]
    with ThreadPoolExecutor(max_workers=6) as pool:
        futs = {pool.submit(translate, client, p): p for p in pages}
        for fut in as_completed(futs):
            p = futs[fut]
            try:
                result = fut.result()
                if isinstance(result, tuple):
                    rel, text, usage = result
                else:
                    rel, text, usage = p, result, usage_stub()
                path = os.path.join(args.out, rel + ".md")
                os.makedirs(os.path.dirname(path), exist_ok=True)
                open(path,"w",encoding="utf-8").write(text)
                results.append((rel, usage.input_tokens, usage.output_tokens))
                print(f"ok {rel} in={usage.input_tokens} out={usage.output_tokens}", flush=True)
            except Exception as e:
                failures.append((p, str(e)))
                print(f"FAIL {p}: {e}", flush=True)
    total_in=sum(r[1] for r in results); total_out=sum(r[2] for r in results)
    print(f"\ndone={len(results)} failed={len(failures)} input={total_in} output={total_out}", flush=True)
    if failures:
        for p,e in failures: print(f"  FAILED {p}: {e}", flush=True)
        raise SystemExit(1)

if __name__ == "__main__":
    main()
