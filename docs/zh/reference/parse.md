---
title: "解析模块"
description: "文档解析与文本提取：用于标准格式的 DocumentParser 和用于复杂版式的 DoclingParser。"
icon: "file-lines"
sourceHash: "004bc17d7e7813312c4d5e434f1130bfec3ac9b790a7ad316fc12a59f1aee2dc"
---

**`semantica.parse`** 从非结构化文档中提取**结构化文本、版式、表格和元数据**：

- `DocumentParser`：广泛支持多种格式（PDF、DOCX、HTML、JSON、CSV、PPTX、XLSX），无需额外依赖
- `DoclingParser`：处理复杂版式、合并单元格表格、多栏 PDF、OCR（`pip install docling`）
- 两者均返回一致的 `dict`，包含 `full_text`、`metadata`、`pages` 和 `tables` 键
- `parse_batch()` 并行处理多个文件，支持可配置的错误处理


## 快速开始

### 安装

解析模块对标准格式开箱即用：

```python
from semantica.parse import DocumentParser

parser = DocumentParser()
result = parser.parse("document.pdf")
print(result["full_text"])  # Extracted text content
```

如需增强的表格提取和复杂版式处理，请安装 Docling 依赖：

```bash
pip install docling
```

```python
from semantica.parse import DoclingParser

parser = DoclingParser(export_format="markdown")
result = parser.parse("document.pdf", extract_tables=True)
print(result["tables"])  # Enhanced table extraction
```

### 首次文档解析

```python
from semantica.parse import DocumentParser

# Parse any supported format
parser = DocumentParser()
result = parser.parse("annual_report.pdf")

# Access extracted content
text = result["full_text"]           # Complete document text
metadata = result["metadata"]        # Document properties
pages = result.get("pages", [])      # Page-level content

print(f"Extracted {len(text)} characters from {metadata.get('page_count', 0)} pages")
```

## 解析器选择指南

<Tabs>
  <Tab title="DocumentParser：标准文档">
    零额外依赖。适用于干净的 PDF、Word 文档、HTML 和结构化格式。

    | | |
    | :-- | :-- |
    | **格式** | PDF、DOCX、HTML、TXT、JSON、CSV、PPTX、XLSX |
    | **速度** | 快 |
    | **环境准备** | 无：包含在基础安装中 |
    | **适用场景** | 干净文档、广泛的格式支持、生产流水线 |

    ```python
    from semantica.parse import DocumentParser

    parser = DocumentParser()
    result = parser.parse("contract.pdf")

    print(result["full_text"])        # Extracted text
    print(result["metadata"])         # Title, author, page count, ...
    print(len(result.get("pages", [])))  # Per-page breakdown
    ```
  </Tab>
  <Tab title="DoclingParser：复杂版式">
    更出色的表格提取、OCR、多栏 PDF。需要 `pip install docling`。

    | | |
    | :-- | :-- |
    | **格式** | PDF、DOCX、PPTX、XLSX、HTML、图像 |
    | **速度** | 较慢（深度版式分析） |
    | **环境准备** | `pip install docling` |
    | **适用场景** | 合并单元格表格、扫描文档、多栏版式 |

    ```python
    from semantica.parse import DoclingParser

    parser = DoclingParser(export_format="markdown")
    result = parser.parse(
        "financial_report.pdf",
        extract_tables=True,
        extract_text=True,
    )

    for i, table in enumerate(result["tables"]):
        print(f"Table {i+1}: {table['row_count']} rows × {table['col_count']} columns")
        print(f"  Page: {table['page_number']}")
        for row in table["rows"][:3]:
            print(" | ".join(row))
    ```

    <Tip>
      从 `DocumentParser` 开始。仅当你需要更好的表格提取，或遇到复杂的 PDF 版式时，才切换到 `DoclingParser`。
    </Tip>
  </Tab>
  <Tab title="批量处理">
    并行处理多个文件，并实现逐文件的错误隔离。

    ```python
    from semantica.parse import DocumentParser

    parser  = DocumentParser()
    results = parser.parse_batch(
        ["doc1.pdf", "doc2.docx", "doc3.html"],
        continue_on_error=True,   # skip failed files instead of raising
    )

    print(f"Parsed: {results['success_count']}/{results['total']}")

    for item in results["successful"]:
        print(f"{item['file_path']}: {len(item['result']['full_text'])} chars")

    for item in results["failed"]:
        print(f"FAILED: {item['file_path']}: {item['error']}")
    ```

    <Note>
      对于单个文件可能损坏或不受支持的生产环境批处理任务，建议使用 `continue_on_error=True`。
    </Note>
  </Tab>
</Tabs>

## 导出的类

| 类 | 职责 |
| :--- | :--- |
| `DocumentParser` | 自动检测格式：委派给特定格式的解析器（PDF、DOCX、HTML、JSON、CSV 等） |
| `DoclingParser` | 复杂版式、合并单元格表格、多栏 PDF 与 OCR（`pip install docling`） |
| `DoclingMetadata` | Docling 解析得到的文档元数据 |
| `PDFParser` | PDF 文本与元数据提取 |
| `WebParser` | URL 抓取 + HTML 解析 |
| `EmailParser` | `.eml` / `.msg` 邮件文件，支持附件提取 |
| `CodeParser` | 源代码文件，具备语法感知的块检测能力 |

## DocumentParser

用于干净、机器可读文档的标准解析器：

```python
from semantica.parse import DocumentParser

parser = DocumentParser()
result = parser.parse("data/report.pdf")

print(result["full_text"])      # Complete extracted text
print(result["metadata"])       # Document properties (title, author, page_count, etc.)
if "pages" in result:           # Page-level content (when available)
    print(f"Pages: {len(result['pages'])}")
```

支持的格式：PDF、DOCX、HTML、TXT、JSON、CSV、PPTX、XLSX。

## DoclingParser

基于 Docling 后端的高级解析器：可处理 `DocumentParser` 无法应对的版式：

```bash
pip install docling
```

```python
from semantica.parse import DoclingParser

parser = DoclingParser(
    export_format="markdown",      # Export format: "markdown" | "html" | "json"
    enable_ocr=False               # Enable OCR for scanned documents
)

result = parser.parse(
    "data/annual_report.pdf",
    extract_tables=True,           # Extract structured tables
    extract_images=False,          # Extract image regions
    extract_text=True              # Extract text content
)

print(result["full_text"])    # Complete extracted text
print(result["tables"])       # Structured table data
if "pages" in result:         # Page-level content
    print(f"Pages: {len(result['pages'])}")
```

以下场景请使用 `DoclingParser`：

- 多栏 PDF 版式
- 含合并单元格或复杂表头的表格
- 含嵌入图表的 PPTX 幻灯片
- 含公式的 XLSX 电子表格
- 需要 OCR 的扫描文档
- 学术论文与技术报告

## OCR 支持

```python
parser = DoclingParser(
    enable_ocr=True,           # Enable OCR via PdfPipelineOptions
    export_format="markdown"
)

result = parser.parse("data/scanned_contract.pdf")
print(result["full_text"])     # OCR-extracted text
```

## 支持的格式

| 格式 | 扩展名 | 使用的解析器 | 说明 |
| :------ | :--------- | :----------- | :----- |
| PDF | `.pdf` | `PDFParser` / `DoclingParser` | 文本、表格、元数据；Docling 额外提供 OCR |
| Word | `.docx` | 内置 | 文本、标题、表格、元数据 |
| HTML | `.html`、`.htm` | `HTMLParser` / `WebParser` | `WebParser` 可抓取远程 URL |
| Markdown | `.md` | 内置 | 保留标题层级 |
| 纯文本 | `.txt` | `TXTParser` | 元数据极少 |
| JSON | `.json` | `JSONParser` | 每行一个对象或以数组形式 |
| CSV / TSV | `.csv`、`.tsv` | `CSVParser` | 自动检测表头 |
| Excel | `.xlsx`、`.xls` | 内置 | 支持工作表选择 |
| PowerPoint | `.pptx` | 内置 | 嵌入图表请使用 `DoclingParser` |
| 电子邮件 | `.eml`、`.msg` | `EmailParser` | 提取附件 |
| XML | `.xml` | `XMLIngestor` | 防范 XXE，可选 XSD 校验 |
| 归档 | `.zip`、`.tar` | `FileIngestor` | 递归提取 |
| 源代码 | `.py`、`.js`、`.java` 等 | `CodeParser` | AST 感知的块检测 |

## 解析器输出结构

两种解析器均返回具有以下结构的字典：

```python
result = {
    "full_text": str,              # Complete extracted text
    "metadata": dict,              # Document properties and statistics
    "pages": List[dict],           # Page-level content (when available)
    "tables": List[dict],          # Structured table data (DoclingParser)
    "images": List[dict],          # Image regions (DoclingParser)
    "total_pages": int,            # Total page count
    "export_format": str           # Format used for text extraction (DoclingParser)
}
```

### 元数据结构

```python
metadata = {
    "file_path": str,              # Source file path
    "page_count": int,             # Number of pages
    "format": str,                 # File format ("pdf", "docx", etc.)
    # Additional fields vary by parser and document type
}
```

## DocumentParser 方法

| 方法 | 返回值 | 说明 |
| :------ | :------- | :----------- |
| `parse(source)` | `dict` | 自动检测格式并提取文本、元数据、表格 |
| `parse_batch(sources)` | `dict` | 并行处理多个来源 |
| `extract_text(path)` | `str` | 仅从文档中提取文本内容 |
| `extract_metadata(path)` | `dict` | 仅从文档中提取元数据 |

## 与 FileIngestor 集成

最常见的模式：先摄取目录，再解析每个来源：

```python
from semantica.ingest import FileIngestor
from semantica.parse import DoclingParser

ingestor = FileIngestor()
parser   = DoclingParser(export_format="markdown")

sources = ingestor.ingest("data/reports/")
for source in sources:
    result = parser.parse(source)
    # Access extracted content
    text = result["full_text"]
    tables = result["tables"] 
    metadata = result["metadata"]
```

<Note>
  Docling 是可选依赖。若未安装 `docling`，`DoclingParser` 会抛出 `ImportError` 并附带安装说明：`pip install docling`。`DocumentParser` 始终可用，无需任何额外组件。
</Note>

- [摄取](/zh/reference/ingest) — 在解析前加载文件。
- [拆分](/zh/reference/split) — 将解析后的文本分块，用于嵌入和抽取。
- [Docling 集成](../integrations/docling) — 完整的 Docling 集成配置指南。
- [语义抽取](/zh/reference/semantic_extract) — 从解析后的文本中抽取实体与关系。