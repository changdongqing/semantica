"""Report translation coverage and staleness for docs/{language} mirrors.

Default mode is a report (exit 0). Pass --strict to fail when English nav
pages have no translated counterpart or a translated page's recorded source
hash no longer matches the English source.
"""
from __future__ import annotations

import hashlib
import json
import os
import re
import sys
from typing import Any

DOCS = "docs"
TARGET = "zh"


def read(path: str) -> str:
    return open(path, encoding="utf-8").read()


def nav_pages(objects: Any) -> list[str]:
    result: list[str] = []
    if isinstance(objects, dict):
        for page in objects.get("pages", []):
            if isinstance(page, str):
                result.append(page)
            else:
                result.extend(nav_pages(page))
        for value in objects.values():
            if isinstance(value, (dict, list)):
                result.extend(nav_pages(value))
    elif isinstance(objects, list):
        for item in objects:
            result.extend(nav_pages(item))
    return result


def language_nav(config: dict[str, Any], language: str) -> dict[str, Any] | None:
    for entry in config.get("navigation", {}).get("languages", []):
        if entry.get("language") == language:
            return entry
    return None


def sha256(path: str) -> str:
    return hashlib.sha256(open(path, "rb").read()).hexdigest()


def frontmatter(path: str) -> dict[str, str]:
    text = read(path)
    if not text.startswith("---"):
        return {}
    end = text.find("\n---", 3)
    if end == -1:
        return {}
    result: dict[str, str] = {}
    for line in text[3:end].splitlines():
        match = re.match(r"^([A-Za-z][\w-]*):\s*(.*)$", line.strip())
        if match:
            result[match.group(1)] = match.group(2).strip().strip('"').strip("'")
    return result


def main(argv: list[str]) -> int:
    strict = "--strict" in argv
    config = json.loads(read(os.path.join(DOCS, "docs.json")))
    en = language_nav(config, "en")
    target = language_nav(config, "zh-Hans")
    if not en or not target:
        print("locale check: navigation.languages must define en and zh-Hans")
        return 1

    en_pages = sorted({p for p in nav_pages(en) if not p.startswith("http")})
    target_pages = {p for p in nav_pages(target) if not p.startswith("http")}
    # Translated pages live under docs/<target>/ and drop that prefix in the
    # English namespace: zh/index -> index.
    target_by_source = {
        p[len(TARGET) + 1:] if p.startswith(TARGET + "/") else p: p
        for p in target_pages
    }

    missing = [p for p in en_pages if p not in target_by_source]
    translated = [p for p in en_pages if p in target_by_source]
    stale: list[str] = []
    unverified: list[str] = []

    for page in translated:
        zh_path = os.path.join(DOCS, target_by_source[page] + ".md")
        source_path = os.path.join(DOCS, page + ".md")
        if not os.path.exists(source_path):
            continue
        recorded = frontmatter(zh_path).get("sourceHash")
        if not recorded:
            unverified.append(page)
        elif recorded != sha256(source_path):
            stale.append(page)

    total = len(en_pages)
    coverage = len(translated) / total * 100 if total else 100.0
    print("locale coverage")
    print(f"  english nav pages: {total}")
    print(f"  translated:        {len(translated)} ({coverage:.1f}%)")
    print(f"  missing:           {len(missing)}")
    print(f"  stale:             {len(stale)}")
    print(f"  unverified:        {len(unverified)}")
    for page in missing[:25]:
        print(f"    missing     {page}")
    if len(missing) > 25:
        print(f"    … {len(missing) - 25} more missing")
    for page in stale:
        print(f"    stale       {page}")
    for page in unverified:
        print(f"    unverified  {page}")

    if strict and (missing or stale):
        print("\nFAIL: translation coverage/staleness (strict mode).")
        return 1
    print("\nOK" + (" (strict)." if strict else " (report mode; pass --strict to fail on missing/stale)."))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
