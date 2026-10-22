---
title: "Docling 集成"
description: "原生 Docling 集成，用于高保真解析 PDF、DOCX 和 PPTX，支持表格提取与 OCR。"
icon: "file-lines"
sourceHash: "4cd4c442fbe60c97fb81b8236f652341e7b1dcfe0d020369f86930759510b2aa"
---

> 解析复杂文档：PDF、DOCX、PPTX、HTML，具备高保真表格提取与内置 OCR。


## 概述

Docling 通过 **`DoclingParser`** 集成到 Semantica 的 `parse` 模块中。文档先经过 Docling 的**布局引擎**处理，然后直接进入 Semantica 的提取与 KG 流水线。

- **多格式** — PDF、DOCX、PPTX、HTML 等。
- **表格提取** — 高保真表格解析，支持表头检测。
- **OCR 支持** — 为扫描文档提供内置 OCR。
- **Markdown 导出** — 干净的 Markdown 输出，针对 LLM 消费优化。


## 安装

```bash
pip install semantica
# Docling is included as an optional dependency
# or install separately:
pip install docling
```


## 基本用法

```python
from semantica.parse import DoclingParser

parser = DoclingParser(enable_ocr=True)
result = parser.parse("financial_report.pdf")

print(result["full_text"][:200])
print(f"Found {len(result['tables'])} tables")
```


## 完整示例

```python
from semantica.parse import DoclingParser

parser = DoclingParser(
    enable_ocr=True,
    export_format="markdown",
)

result = parser.parse("complex_invoice.pdf")

# Full text content
print(result["full_text"])

# Extracted tables
for i, table in enumerate(result["tables"]):
    print(f"Table {i+1} headers: {table.get('headers', [])}")
    for row in table.get("rows", [])[:3]:
        print(f"  Row: {row}")

# Metadata
metadata = result["metadata"]
print(f"Title: {metadata.get('title')}")
print(f"Pages: {result.get('total_pages')}")
```


## DoclingParser 参数

| 参数 | 默认值 | 说明 |
| :----------- | :--------- | :------------- |
| `enable_ocr` | `False` | 为扫描页面启用 OCR |
| `export_format` | `"markdown"` | 输出格式：`"markdown"` 或 `"text"` |


## 解析结果结构

```python
{
    "full_text":    str,         # Clean document text
    "tables":       List[dict],  # Extracted tables (headers + rows)
    "metadata":     dict,        # Title, author, creation date, etc.
    "total_pages":  int,
}
```


## 另请参阅

- [Parse 模块](../reference/parse) — DocumentParser 与 DoclingParser 的完整参考。
- [Ingest 模块](../reference/ingest) — 在解析前加载文档。
- [语义提取](../reference/semantic_extract) — 对解析后文本进行 NER 与关系提取。
- [流水线](../reference/pipeline) — 在完整流水线中使用 DoclingParser。