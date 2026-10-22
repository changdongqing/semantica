---
title: "归一化模块"
description: "文本清洗、实体规范化、日期归一化、数字转换、语言检测与编码修复：在抽取运行之前完成。"
icon: "broom"
sourceHash: "731b483c24c338f986916122d4c459a023b0f0a1460f600d658f5a930909cd50"
---

**`semantica.normalize`** 在**抽取与图构建之前**对原始数据进行标准化：

- 文本清洗：Unicode NFC/NFKC、空白折叠、弯引号与破折号规范化
- 实体规范化：通过可配置的别名映射完成别名解析与消歧
- 日期归一化：任意格式 → ISO 8601，包括相对日期
- 数字转换：`"$1.2B"` → `1200000000.0`，支持单位与货币处理
- 语言检测与编码修复，应对不一致的源数据

所有归一化器都同时提供便捷函数（一行式调用）与有状态的类实例（完全控制）。


## 为什么要在抽取前归一化

非结构化数据天然不一致。若不进行归一化，同一个现实世界实体会在你的图中以数十种变体出现：

- `"Apple Inc."`、`"Apple Computer Inc."`、`"APPLE INC."`：多个节点，同一家公司
- `"Jan 1st, 2020"`、`"01/01/2020"`、`"2020-01-01"`：三种格式，同一个日期
- `"$1.2B"`、`"1,200,000,000"`、`"1.2 billion USD"`：三个字符串，同一个数字
- `"Hello World"` 与 `"Hello World"`：一个不换行空格，导致字符串匹配失败

归一化会在任何抽取器、去重器或图构建器看到数据之前，先将这些变体折叠统一。

## 导出的类

| 类 | 作用 |
| :--- | :--- |
| `TextNormalizer` | Unicode 形式（NFC/NFKC）、空白折叠、弯引号与破折号规范化 |
| `EntityNormalizer` | 使用可配置的别名映射进行别名解析与实体消歧 |
| `DateNormalizer` | 将任意日期字符串格式解析为 ISO 8601；处理相对日期 |
| `NumberNormalizer` | `"$1.2B"` → `1200000000.0`；单位换算；货币解析 |
| `DataCleaner` | 检测并移除重复项、处理缺失值、校验记录 |
| `LanguageDetector` | `detect(text)` → 语言代码 `str`；`detect_with_confidence(text)` → `(code, score)` 元组 |
| `EncodingHandler` | `detect(bytes)` → `(encoding, confidence)` 元组；`convert_to_utf8(bytes)` → `str` |

## 快速开始

```python
from semantica.normalize import (
    TextNormalizer,
    DateNormalizer,
    NumberNormalizer,
    LanguageDetector,
    EncodingHandler,
)

# Text: normalize unicode, collapse whitespace, replace smart quotes
normalizer = TextNormalizer()
clean = normalizer.normalize_text("  Hello,  World…  ")
# → "Hello, World..."

# Date
date_norm = DateNormalizer()
date = date_norm.normalize_date("Jan 1st, 2020")
# → "2020-01-01T00:00:00+00:00"

# Number
num_norm = NumberNormalizer()
num = num_norm.normalize_number("$1.2B")
# → 1200000000.0

# Language: returns a language code string
detector = LanguageDetector()
lang = detector.detect("Bonjour le monde")
# → "fr"

# Encoding: returns (encoding_name, confidence) tuple
handler = EncodingHandler()
encoding, confidence = handler.detect(raw_bytes)
utf8_text = handler.convert_to_utf8(raw_bytes)
```

## 推荐的处理顺序

<Steps>
  <Step title="EncodingHandler：先修复编码">
    破损的字节会污染下游的一切。务必在任何其他处理之前运行它。

    ```python
    from semantica.normalize import EncodingHandler

    handler = EncodingHandler()
    # detect returns (encoding_name, confidence_score)
    encoding, confidence = handler.detect(raw_bytes)
    # convert_to_utf8 returns a str
    utf8_text = handler.convert_to_utf8(raw_bytes)
    ```

    <Warning>
      **务必先执行编码修复。** UTF-8 流中哪怕只有一个 cp1252 字符，也会在无声无息中破坏其周围的文本。请先调用 `handler.convert_to_utf8(raw_bytes)`，再让任何其他归一化器接触数据。
    </Warning>
  </Step>
  <Step title="TextNormalizer：Unicode、空白、特殊字符">
    ```python
    from semantica.normalize import TextNormalizer

    normalizer = TextNormalizer()
    # normalize_text takes per-call options, not constructor params
    clean_text = normalizer.normalize_text(
        utf8_text,
        unicode_form="NFC",
        case="preserve",
    )
    ```

    <Warning>
      **不要在 NER 之前转为小写。** 在实体抽取之前调用 `normalize_text(text, case="lower")` 会破坏 NER 所依赖的大小写信号。如需大小写归一化，请在抽取完成之后再进行。
    </Warning>
  </Step>
  <Step title="EntityNormalizer：规范化实体名称">
    ```python
    from semantica.normalize import EntityNormalizer

    # Provide aliases in config so the resolver can map variants
    normalizer = EntityNormalizer(alias_map={
        "apple computer inc.": "Apple Inc.",
        "apple computer, inc.": "Apple Inc.",
    })
    canonical = normalizer.normalize_entity(
        "Apple Computer, Inc.", entity_type="Organization"
    )
    # → "Apple Inc." (if the alias_map contains it, else title-cased input)
    ```

    <Warning>
      **`EntityNormalizer` 没有内置的企业后缀扩展。** 它不会自动把 `"Apple Computer Inc."` 映射为 `"Apple Inc."`。要规范化公司名称，请提供显式的 `alias_map`，其键为小写形式：`EntityNormalizer(alias_map={"apple computer inc.": "Apple Inc."})`。
    </Warning>
  </Step>
  <Step title="DateNormalizer 与 NumberNormalizer：解析结构化值">
    ```python
    from semantica.normalize import DateNormalizer, NumberNormalizer

    date_norm = DateNormalizer()
    num_norm  = NumberNormalizer()

    # format and timezone are passed to normalize_date(), not to the constructor
    date = date_norm.normalize_date("Jan 1st, 2020", format="ISO8601", timezone="UTC")
    # → "2020-01-01T00:00:00+00:00"

    num = num_norm.normalize_number("$1.2B")
    # → 1200000000.0
    ```
  </Step>
  <Step title="LanguageDetector：在干净文本上检测语言">
    ```python
    from semantica.normalize import LanguageDetector

    detector = LanguageDetector()

    # detect() returns a language code string
    lang = detector.detect("Bonjour le monde")
    # → "fr"

    # detect_with_confidence() returns (code, score) tuple
    lang, confidence = detector.detect_with_confidence("Bonjour le monde")
    # → ("fr", 0.98)
    ```
  </Step>
</Steps>

## 便捷函数

最快的路径：一次导入，一次调用：

```python
from semantica.normalize import (
    normalize_text, normalize_entity, normalize_date,
    normalize_number, clean_data, detect_language, handle_encoding,
)

clean  = normalize_text("  Hello,   World  ")
# → "Hello, World"

entity = normalize_entity("John Doe", entity_type="Person")
# → "John Doe" (title-cased; alias resolution requires alias_map)

date   = normalize_date("Jan 1st, 2020")
# → "2020-01-01T00:00:00+00:00"

num    = normalize_number("$1.2B")
# → 1200000000.0

# detect_language returns a language code string by default
lang   = detect_language("Bonjour le monde")
# → "fr"

# handle_encoding with operation="detect" returns (encoding, confidence) tuple
encoding, confidence = handle_encoding(raw_bytes, operation="detect")

# handle_encoding with operation="convert" returns a UTF-8 string
utf8_text = handle_encoding(raw_bytes, operation="convert")
```

## 规范化器

<Tabs>
  <Tab title="TextNormalizer">
    `TextNormalizer` 的构造函数接收 `config=None, **kwargs`。规范化选项按调用传给 `normalize_text()`：

    ```python
    from semantica.normalize import TextNormalizer

    normalizer = TextNormalizer()

    # normalize_text options
    normalized = normalizer.normalize_text(
        raw_text,
        unicode_form="NFC",       # "NFC" | "NFD" | "NFKC" | "NFKD"
        case="preserve",          # "preserve" | "lower" | "upper" | "title"
        normalize_diacritics=False,
        line_break_type="unix",   # "unix" | "windows"
    )

    # HTML stripping and text cleaning: separate clean_text() method
    cleaned = normalizer.clean_text(html_text, remove_html=True)

    # Batch normalization
    results = normalizer.process_batch(
        ["  hello  ", "WORLD", "café"],
        unicode_form="NFKC",
        case="lower",
    )

    # normalize() accepts str or List[Dict] (parsed docs from DocumentParser)
    docs = [{"content": "Hello world"}, {"content": "test text"}]
    normalized_docs = normalizer.normalize(docs)
    ```

    | `normalize_text()` 参数 | 类型 | 默认值 | 描述 |
    | :----------------------------- | :---- | :------- | :----------- |
    | `unicode_form` | `str` | `"NFC"` | Unicode 形式：`"NFC"` / `"NFD"` / `"NFKC"` / `"NFKD"` |
    | `case` | `str` | `"preserve"` | `"preserve"` / `"lower"` / `"upper"` / `"title"` |
    | `normalize_diacritics` | `bool` | `False` | 去除变音符号 |
    | `line_break_type` | `str` | `"unix"` | `"unix"` (`\n`) 或 `"windows"` (`\r\n`) |

    **Unicode 形式指南：**

    | 形式 | 适用场景 |
    | :---- | :-------- |
    | `NFC` | 默认：最适合存储和显示 |
    | `NFKC` | 搜索索引：规范化连字、全角字符和分数 |
    | `NFD` | 去除变音符号：将 é 拆分为 e + 组合重音，然后去除重音 |
    | `NFKD` | 与 NFD 相同，但还会分解兼容字符 |

    **用于精细控制的子规范化器：**

    ```python
    from semantica.normalize import (
        UnicodeNormalizer, WhitespaceNormalizer, SpecialCharacterProcessor
    )

    unicode_norm = UnicodeNormalizer()
    text = unicode_norm.normalize_unicode("café", form="NFC")

    ws_norm = WhitespaceNormalizer()
    text    = ws_norm.normalize_whitespace("Hello\t\t World\n\n")
    # → "Hello  World\n\n"

    processor = SpecialCharacterProcessor()
    text      = processor.normalize_punctuation("‘Hello’")
    # → "'Hello'"
    ```
  </Tab>
  <Tab title="EntityNormalizer">
    `EntityNormalizer` 执行以下操作：空白清理、可选的别名解析（需要显式提供 `alias_map`）以及名称格式规范化。

    ```python
    from semantica.normalize import EntityNormalizer

    # With alias map: resolves exact matches (lowercase key lookup)
    normalizer = EntityNormalizer(alias_map={
        "apple computer inc.": "Apple Inc.",
        "ms": "Microsoft",
        "ml":  "Machine Learning",
    })

    normalizer.normalize_entity("Apple Computer Inc.", entity_type="Organization")
    # → "Apple Inc."

    # Without alias map: only whitespace/format cleanup
    normalizer2 = EntityNormalizer()
    normalizer2.normalize_entity("apple inc", entity_type="Organization")
    # → "apple inc"  (no built-in suffix expansion)

    # Person: title-cased
    normalizer2.normalize_entity("john doe", entity_type="Person")
    # → "John Doe"
    ```

    **关键行为：**
    - 别名映射使用**小写键查找**：以小写形式注册别名
    - `entity_type="Person"` 会对名称激活 `title()` 大小写转换
    - 没有内置的企业后缀规范化（Inc → Incorporated 等）：如有需要，请手动将这些映射添加到 `alias_map`

    **子规范化器：**

    ```python
    from semantica.normalize import AliasResolver, EntityDisambiguator, NameVariantHandler

    # alias_map keys must be lowercase
    resolver = AliasResolver(alias_map={
        "ml":  "Machine Learning",
        "nlp": "Natural Language Processing",
    })
    resolved = resolver.resolve_aliases("ml")
    # → "Machine Learning" or None if not in map

    disambiguator = EntityDisambiguator()
    result = disambiguator.disambiguate(
        "Apple",
        entity_type="Organization",
        context="Steve Jobs founded Apple in Cupertino in 1976",
    )
    # → {"entity_name": "Apple", "entity_type": "Organization", "confidence": 0.8, "candidates": ["Apple"]}

    handler   = NameVariantHandler()
    canonical = handler.normalize_name_format("Dr. JOHN P. SMITH Jr.")
    # → "John P. Smith Jr." (removes leading title)
    ```

    <Tip>
      **`AliasResolver` 使用小写键查找。** 即使规范形式采用标题大小写，也请使用小写键注册别名。解析器会在查找前将输入转换为小写。
    </Tip>
  </Tab>
  <Tab title="DateNormalizer">
    `DateNormalizer` 接收 `config=None, **kwargs`。`format` 和 `timezone` 选项会传给 `normalize_date()`，而不是构造函数：

    ```python
    from semantica.normalize import DateNormalizer

    normalizer = DateNormalizer()

    dates = [
        "January 1st, 2020",
        "01/01/2020",
        "2020-01-01T00:00:00Z",
        "yesterday",
        "3 weeks ago",
    ]

    for d in dates:
        print(normalizer.normalize_date(d, format="ISO8601", timezone="UTC"))
    ```

    需要 `python-dateutil`：`pip install python-dateutil`。如果未安装，则回退到 `datetime.fromisoformat()`。

    **子规范化器：**

    ```python
    from semantica.normalize import TimeZoneNormalizer, RelativeDateProcessor, TemporalExpressionParser
    from datetime import datetime

    # TimeZoneNormalizer takes a datetime object, not a string
    tz_norm = TimeZoneNormalizer()
    dt_naive = datetime(2024, 1, 1, 9, 0)
    utc_dt = tz_norm.convert_to_utc(dt_naive)
    tz_dt  = tz_norm.normalize_timezone(dt_naive, target_timezone="America/New_York")

    # RelativeDateProcessor: reference_date is passed to process_relative_expression(),
    # not to the constructor
    processor = RelativeDateProcessor()
    ref = datetime(2025, 1, 15)
    result = processor.process_relative_expression("3 days ago", reference_date=ref)
    # → datetime(2025, 1, 12)

    parser = TemporalExpressionParser()
    result = parser.parse_temporal_expression("from January 2020 to March 2021")
    # → {"date": ..., "time": ..., "range": {"start": ..., "end": ...}, "relative": False}
    ```
  </Tab>
  <Tab title="NumberNormalizer">
    将带单位、货币和缩写的数字字符串转换为 `int` 或 `float`：

    ```python
    from semantica.normalize import NumberNormalizer

    normalizer = NumberNormalizer()

    normalizer.normalize_number("$1,234.56")  # → 1234.56
    normalizer.normalize_number("42K")         # → 42000.0
    normalizer.normalize_number("$1.2B")       # → 1200000000.0
    normalizer.normalize_number("3.14e-2")     # → 0.0314
    normalizer.normalize_number("42%")         # → 0.42
    ```

    **单位和货币转换：**

    ```python
    from semantica.normalize import UnitConverter, CurrencyNormalizer

    converter = UnitConverter()
    result    = converter.convert_units(100, from_unit="kg", to_unit="pound")
    # → 220.46...

    normalized_unit = converter.normalize_unit("km")
    # → "kilometer"

    currency_norm = CurrencyNormalizer()
    result = currency_norm.normalize_currency("$42.50")
    # → {"amount": 42.50, "currency": "USD", "original": "$42.50"}

    result = currency_norm.normalize_currency("$5M")
    # → {"amount": 5000000.0, "currency": "USD", "original": "$5M"}
    ```
  </Tab>
  <Tab title="语言与编码">
    ### LanguageDetector

    识别文本字符串的语言。需要 `langdetect`：`pip install langdetect`。

    ```python
    from semantica.normalize import LanguageDetector

    detector = LanguageDetector()

    # detect() returns a language code string
    lang = detector.detect("Bonjour le monde")
    # → "fr"

    # detect_with_confidence() returns (code, confidence) tuple
    lang, confidence = detector.detect_with_confidence("Bonjour le monde")
    # → ("fr", 0.98)

    # detect_multiple() returns List[(code, confidence)]
    results = detector.detect_multiple("This might be mixed", top_n=3)
    # → [("en", 0.85), ...]

    # Batch: returns List[str]
    codes = detector.detect_batch(["Hello", "Hola", "Bonjour", "Ciao"])

    # Check specific language
    is_english = detector.is_language(text, "en", min_confidence=0.8)
    ```

    <Note>
      `detect()` 会跳过短于 `min_text_length`（默认：去除空白后 10 个字符）的文本检测，并改为返回 `default_language`。回退值默认为 `"en"`（向后兼容）。传入 `default_language=UNKNOWN_LANGUAGE` 可得到显式的 `"unknown"` 信号，它区别于所有 ISO 语言代码。`default_language` 和 `min_text_length` 都可在实例级或调用级配置：

      ```python
      # Lower the threshold for CJK, where 10 characters is far more than needed
      detector = LanguageDetector(min_text_length=4)
      detector.detect("短いテキスト")            # → "ja"

      # Per-call override
      LanguageDetector().detect("短いテキスト", min_text_length=4)   # → "ja"

      # Opt into an unambiguous out-of-band sentinel instead of the "en" default
      LanguageDetector(default_language="unknown").detect("Hi")     # → "unknown"
      ```
    </Note>

    <Warning>
      **`LanguageDetector.detect()` 返回 `str`，而不是 dict。** 使用 `detect_with_confidence()` 获取 `(language_code, confidence)` 元组，或使用 `detect_multiple()` 获取 `List[(code, confidence)]`。
    </Warning>

    ### EncodingHandler

    检测并修复字符编码问题。需要 `chardet`：`pip install chardet`。

    ```python
    from semantica.normalize import EncodingHandler

    handler = EncodingHandler()

    # detect() returns (encoding_name, confidence_score) tuple
    encoding, confidence = handler.detect(raw_bytes)
    # → ("windows-1252", 0.73)

    # convert_to_utf8() returns a str
    utf8_text = handler.convert_to_utf8(raw_bytes)
    utf8_text = handler.convert_to_utf8(raw_bytes, source_encoding="cp1252")

    # remove_bom() returns same type as input (str or bytes) with BOM stripped
    clean = handler.remove_bom(text_with_bom)

    # Detect and convert a file on disk
    utf8_content = handler.convert_file_to_utf8("input.txt", output_path="output.txt")
    ```

    **关键行为：**
    - `detect()` 内部使用 `chardet`：输入越长，准确率越高
    - 如果未提供 `source_encoding`，`convert_to_utf8()` 会自动检测编码，然后依次回退到 `latin-1`、`cp1252`、`iso-8859-1`
    - 请始终先运行 `EncodingHandler`：损坏的字节会导致每个下游规范化器发生级联失败

    <Warning>
      **`EncodingHandler.detect()` 返回 `(str, float)` 元组，而不是 dict。** 使用 `encoding, confidence = handler.detect(data)` 解包。
    </Warning>
  </Tab>
</Tabs>

## DataCleaner

清洗结构化记录集：在加载到向量存储或图存储之前使用非常有用：

```python
from semantica.normalize import DataCleaner, DataValidator, DuplicateDetector

cleaner = DataCleaner()

# clean_data: remove_duplicates, validate, and handle_missing in one pass
cleaned = cleaner.clean_data(
    records,
    remove_duplicates=True,
    validate=True,
    handle_missing=True,
    missing_strategy="remove",  # "remove" | "fill" | "impute"
)

# detect_duplicates: returns List[DuplicateGroup]
groups = cleaner.detect_duplicates(records, threshold=0.9)
for group in groups:
    print(f"Duplicate group: {len(group.records)} records, similarity={group.similarity_score:.2f}")
    print(f"  Canonical: {group.canonical_record}")

# handle_missing_values: standalone missing-value handling
processed = cleaner.handle_missing_values(records, strategy="fill", fill_value="")

# validate_data: validate against a schema dict
result = cleaner.validate_data(
    records,
    schema={"fields": {
        "name":   {"type": str,  "required": True},
        "age":    {"type": int,  "required": False},
        "active": {"type": bool, "required": False},
    }},
)
# ValidationResult has .valid (bool), .errors (list), .warnings (list)
print(f"Valid:    {result.valid}")
print(f"Errors:   {len(result.errors)}")
print(f"Warnings: {len(result.warnings)}")
```

### DataCleaner 方法

| 方法 | 返回 | 描述 |
| :------ | :------- | :----------- |
| `clean_data(dataset, remove_duplicates, validate, handle_missing, **options)` | `List[Dict]` | 组合式清洗流水线 |
| `detect_duplicates(dataset, threshold, key_fields)` | `List[DuplicateGroup]` | 返回相似度阈值以上的重复组 |
| `validate_data(dataset, schema)` | `ValidationResult` | 依据 schema 字典校验记录 |
| `handle_missing_values(dataset, strategy)` | `List[Dict]` | 移除、填充或推算缺失值 |

<Tip>
  **`DataCleaner.remove_duplicates()` 并非独立方法。** 可改用 `detect_duplicates()` 获取 `DuplicateGroup` 对象，或调用 `clean_data(records, remove_duplicates=True)` 就地移除重复项。
</Tip>

<Tip>
  **`DataCleaner` 作用于扁平记录，而非图实体。** 如需实体级语义去重，请改用去重模块中的 `DuplicateDetector`。
</Tip>

## 流水线集成

```python
from semantica.pipeline import PipelineBuilder, ExecutionEngine
from semantica.ingest import FileIngestor
from semantica.normalize import TextNormalizer
from semantica.semantic_extract import NERExtractor

ingestor   = FileIngestor()
normalizer = TextNormalizer()
extractor  = NERExtractor(method="ml")

builder = PipelineBuilder()
# TextNormalizer.normalize() accepts both str and List[Dict] from DocumentParser
builder.add_step("ingest",    "file_ingest",    handler=ingestor.ingest_file)
builder.add_step("normalize", "text_normalize", handler=normalizer.normalize)
builder.add_step("extract",   "ner_extract",    handler=extractor.extract)
builder.connect_steps("ingest",    "normalize")
builder.connect_steps("normalize", "extract")

pipeline = builder.build("normalize_pipeline")
result   = ExecutionEngine().execute_pipeline(pipeline, data="data/documents/")
```

## 自定义归一化器

在方法注册表中注册自定义归一化器：

```python
from semantica.normalize.registry import method_registry

def my_normalizer(text, **kwargs):
    return text.replace("Inc.", "Incorporated")

method_registry.register("text", "expand_suffixes", my_normalizer)

from semantica.normalize import normalize_text
normalized = normalize_text("Apple Inc.", method="expand_suffixes")
# → "Apple Incorporated"
```

- [解析](/zh/reference/parse) — 在归一化之前解析文档。
- [切分](/zh/reference/split) — 对归一化后的文本进行分块以便嵌入。
- [去重](/zh/reference/deduplication) — 在归一化之后消解重复实体。
- [流水线](/zh/reference/pipeline) — 将归一化作为具名流水线步骤纳入其中。