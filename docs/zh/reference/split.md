---
title: "分块模块"
description: "使用递归、语义、实体感知、关系感知、结构化和滑动窗口策略进行文本分块。"
icon: "scissors"
sourceHash: "38627817593e496f6aa1d2c8d5e26c496a5b6ee2becfb14f822d7b90f2cdd0bb"
---

**`semantica.split`** 将文档切分为**保留语义上下文**的分块：

- 六种分块策略：递归、语义、实体感知、关系感知、滑动窗口、结构化
- `SemanticChunker` 使用基于嵌入的主题偏移检测，仅在内容发生变化时切分
- `EntityAwareChunker` 确保实体提及跨越分块边界时保持完整
- `RelationAwareChunker` 将主语-谓语-宾语三元组保留在单个分块内
- 分块质量直接决定下游嵌入准确性和实体抽取质量


## 为什么分块很重要

大多数 LLM 和嵌入模型具有固定的上下文窗口。大于该窗口的文档必须拆分。但简单切分（每 500 个字符，无论结构如何）会破坏语义上下文：

- 类似“Apple Inc.”这样的实体提及被拆到两个分块中，会在两个分块中都丢失上下文
- 类似“Steve Jobs founded Apple”这样的关系三元组在“Steve Jobs”处切分，会留下悬空主语
- 对混合两个不相关主题的分块进行嵌入，会生成一个与两者都不匹配的质心向量

Semantica 的分块方法旨在避免这些失败模式。

## 导出的类

| 类 | 作用 |
| :--- | :--- |
| `TextSplitter` | 统一入口：无需更改下游代码即可切换 `method=` |
| `Chunk` | `{text, start_index, end_index, metadata, id}` |
| `SemanticChunker` | 基于嵌入的主题偏移检测：仅在内容实际发生变化时切分 |
| `StructuralChunker` | 使用结构化文本分析基于标题/章节进行切分 |
| `EntityAwareChunker` | 防止命名实体提及被拆分到分块边界两侧 |
| `RelationAwareChunker` | 将主语-谓语-宾语三元组完整保留在单个分块内 |
| `HierarchicalChunker` | 多层级分块，生成父/子分块关系 |

**`TextSplitter` 可用的 `method=` 值：**

| 方法 | 最适合 |
| :--- | :--- |
| `recursive` | 通用文本：按段落、句子、单词顺序切分 |
| `sentence` | 对话文本、问答 |
| `paragraph` | 段落完整性重要的长文本 |
| `token` | LLM 上下文窗口限制 |
| `semantic_transformer` | 具有主题偏移的长文档 |
| `entity_aware` | KG 抽取流水线 |
| `relation_aware` | 三元组完整性重要的 KG 流水线 |
| `structural` | 具有标题/段落结构的文本 |
| `sliding_window` | 用于双编码器检索的密集重叠 |

## 你将获得

- **TextSplitter** — 11 种分块策略的统一接口：无需更改下游代码即可切换方法。
- **语义分块** — 基于嵌入的主题偏移检测：仅在主题实际发生变化时切分。
- **实体感知分块** — 实体跨度绝不会跨越分块边界：通过边界调整保证。
- **关系感知分块** — 将主语–谓语–宾语三元组保留在单个分块内，适用于 KG 流水线。
- **分块对象** — 输出数据类，包含文本、字符偏移量、可选 id 以及特定于方法的元数据。

## 快速开始

<Steps>
  <Step title="选择分块方法">
    ```python
    from semantica.split import TextSplitter

    splitter = TextSplitter(
        method="recursive",   # see Splitting Methods table
        chunk_size=1000,
        chunk_overlap=200,
    )
    ```
  </Step>
  <Step title="切分原始文本">
    ```python
    chunks = splitter.split(text)

    for chunk in chunks:
        print(f"  Start: {chunk.start_index}, End: {chunk.end_index}")
        print(f"  Method: {chunk.metadata.get('method')}")
        print(f"  Preview: {chunk.text[:80]}...")
    ```
  </Step>
  <Step title="或切分文档对象">
    ```python
    # split_documents() accepts any object with a .text attribute,
    # or a plain string: no specific document class required.
    class Doc:
        def __init__(self, text, metadata=None):
            self.text = text
            self.metadata = metadata or {}

    doc = Doc(text="Annual report content...", metadata={"source": "annual_report.pdf"})

    splitter = TextSplitter(method="structural")
    chunks   = splitter.split_documents([doc])

    for chunk in chunks:
        print(f"  {chunk.text[:80]}...")
    ```
  </Step>
  <Step title="批量切分文档列表">
    ```python
    # split_documents() returns a flat List[Chunk] across all inputs
    all_chunks = splitter.split_documents(docs)

    for chunk in all_chunks:
        print(chunk.text[:80])
    ```
  </Step>
</Steps>

## 分块方法

| 方法 | 切分方式 | 最适合 |
| :------ | :------------- | :-------- |
| `recursive` | 段落 → 句子 → 单词（级联回退） | 通用默认 |
| `semantic_transformer` | 对句子进行嵌入，在余弦相似度下降处切分 | RAG：主题连贯性重要 |
| `entity_aware` | 调整边界，确保实体跨度绝不会被切断 | NER 流水线 |
| `relation_aware` | 将主语–谓语–宾语三元组保留在一个分块内 | KG 构建 |
| `sentence` | 句子边界检测（regex、NLTK、spaCy） | 短文档、问答 |
| `paragraph` | 段落边界切分 | 长篇文章、报告 |
| `token` | 通过 tiktoken 或 transformers 统计 token 数量；硬截断 | LLM 上下文窗口准备 |
| `word` | 带重叠的单词计数 | 简单的 token 近似切分 |
| `character` | 带重叠的固定字符数；最快，无需 NLP | 简单批处理任务 |
| `sliding_window` | 固定大小窗口按步长前进；可配置重叠 | 密集检索（ColBERT、DPR） |
| `structural` | 标题/段落结构检测 | 具有显式标题层级的文本 |
| `embedding_semantic` | 嵌入相似度边界（`semantic_transformer` 的别名） | 基于嵌入连贯性的 RAG |
| `hierarchical` | 多层级章节 → 段落 → 句子分块 | 多粒度检索 |

## 选择策略

在选择方法之前，请使用以下决策树：

- **构建 KG？** → `relation_aware`（保持三元组完整），然后对纯 NER 使用 `entity_aware`
- **检索质量最重要的 RAG 系统？** → `semantic_transformer`
- **用于双编码器检索的密集重叠（ColBERT、DPR）？** → `sliding_window`
- **为固定窗口 LLM 准备提示词？** → `token`
- **具有标题的结构化文本？** → `structural`
- **段落级连贯性？** → `paragraph` 或 `sentence`
- **无 NLP 开销的快速切分？** → `recursive` 或 `character`

## TextSplitter 构造函数

```python
from semantica.split import TextSplitter

splitter = TextSplitter(
    method="semantic_transformer",   # chunking strategy: see Splitting Methods table
    chunk_size=1000,                 # target size in characters
    chunk_overlap=200,               # character overlap between adjacent chunks
    similarity_threshold=0.7,        # cosine similarity cutoff (semantic_transformer only)
    model="all-MiniLM-L6-v2",        # sentence-transformers model name (semantic_transformer only)
    ner_method="ml",                 # NER method (entity_aware only)
    relation_method="ml",            # relation extraction method (relation_aware only)
)
```

| 参数 | 类型 | 默认值 | 描述 |
| :--------- | :---- | :------- | :----------- |
| `method` | `str \| list[str]` | `"recursive"` | 分块策略，或作为回退链的方法列表 |
| `chunk_size` | `int` | `1000` | 目标大小，以**字符**为单位（不是 token：如果你之前使用基于 token 的大小，请乘以约 4 以近似相同的边界） |
| `chunk_overlap` | `int` | `200` | 相邻分块之间的字符重叠 |
| `similarity_threshold` | `float` | `0.7` | `semantic_transformer` 的余弦相似度阈值：越低 = 切分越多 |
| `model` | `str` | `"all-MiniLM-L6-v2"` | 用于 `semantic_transformer` 的 sentence-transformers 模型名称 |
| `ner_method` | `str` | `"ml"` | 用于 `entity_aware` 的 NER 方法：`"pattern"` \| `"regex"` \| `"ml"` \| `"huggingface"` \| `"llm"` |
| `relation_method` | `str` | `"ml"` | 用于 `relation_aware` 的关系抽取方法：`"ml"` \| `"llm"` \| `"huggingface"` |
| `tokenizer` | `str` | `"gpt-4"` | 用于 `token` 方法的 tiktoken 模型名称：无法识别的名称会回退到 `cl100k_base` |

<Warning>
  **`chunk_overlap` 太小。** 没有重叠时，跨分块边界的事实会在两个分块中都不可见。相对于 `chunk_size` 的 10–20% 重叠是安全的最小值：对于 `chunk_size=1000`，将 `chunk_overlap` 设置为 `100` 到 `200`。
</Warning>

## 分块方法详情

<Tabs>
  <Tab title="递归（默认）">
    先尝试段落边界，再尝试句子边界，最后尝试单词边界：仅在分块超过 `chunk_size` 时回退：

    ```python
    splitter = TextSplitter(method="recursive", chunk_size=1000, chunk_overlap=200)
    chunks   = splitter.split(text)
    ```

    **关键行为：**
    - 尽可能保留段落和句子结构
    - 优雅回退：绝不会生成大于 `chunk_size` 的分块
    - 重叠确保跨分块边界的上下文连续性
    - 当不确定使用哪种方法时，这是良好的起点
  </Tab>
  <Tab title="语义">
    使用 sentence-transformers 模型对每个句子进行嵌入，然后每当连续句子之间的余弦相似度低于 `similarity_threshold` 时进行切分。每个分块覆盖一个连贯主题：

    ```python
    from semantica.split import TextSplitter

    splitter = TextSplitter(
        method="semantic_transformer",
        model="all-MiniLM-L6-v2",      # any sentence-transformers model name
        similarity_threshold=0.7,       # 0.6 = more splits, 0.8 = fewer splits
        chunk_size=800,
        chunk_overlap=0,                # not needed: chunks are already coherent
    )
    chunks = splitter.split(text)
    ```

    **关键行为：**
    - 需要 `sentence-transformers` 包：默认使用 `all-MiniLM-L6-v2`，可通过 `model=` 配置
    - 生成可变长度的分块：有些主题较短，有些较长
    - 如果未安装 `sentence-transformers`，则回退到句子切分
    - 由于嵌入计算，比 `recursive` 更慢；对重复切分缓存嵌入

    <Tip>
      **语义切分需要足够的句子。** `semantic_transformer` 需要多个句子来检测主题偏移。对于短于约 300 个单词的文档，它的行为类似于 `sentence` 切分：请改用 `recursive`。
    </Tip>
  </Tab>
  <Tab title="实体感知">
    在内部运行 NER，然后调整分块边界，确保没有实体提及被拆分到两个分块中：

    ```python
    from semantica.split import TextSplitter
    import os

    # ner_method is passed through to the internal NERExtractor.
    # Use "llm" for highest accuracy, "ml" (default) for speed.
    splitter = TextSplitter(
        method="entity_aware",
        chunk_size=512,
        chunk_overlap=50,
        ner_method="ml",   # "pattern" | "regex" | "ml" | "huggingface" | "llm"
    )
    chunks = splitter.split(text)

    for chunk in chunks:
        print(f"  entities in chunk: {chunk.metadata.get('entity_count', 0)}")
        print(f"  preview: {chunk.text[:80]}...")
    ```

    **关键行为：**
    - NER 在内部运行：实体抽取会在切分器内部自动发生
    - 每个分块的实体对象可在 `chunk.metadata["entities"]` 中获取
    - 分块大小与 `chunk_size` 略有不同：边界调整不超过一个句子
    - 适用于所有实体类型：PERSON、ORGANIZATION、LOCATION、DATE、自定义类型
  </Tab>
  <Tab title="关系感知">
    将主语–谓语–宾语三元组保留在同一个分块内：这对 KG 流水线至关重要：

    ```python
    from semantica.split import TextSplitter

    # relation_method is passed through to the internal RelationExtractor.
    # Use "llm" for highest accuracy, "ml" (default) for speed.
    splitter = TextSplitter(
        method="relation_aware",
        chunk_size=512,
        relation_method="ml",   # "ml" | "llm" | "huggingface"
    )
    chunks = splitter.split(text)

    for chunk in chunks:
        print(f"  relations in chunk: {chunk.metadata.get('relation_count', 0)}")
        for rel in chunk.metadata.get("relationships", []):
            print(f"  {rel}")
    ```

    **关键行为：**
    - 关系抽取在内部运行：无需预先计算实体或三元组
    - 每个分块的关系对象可在 `chunk.metadata["relationships"]` 中获取
    - 隐含实体感知行为：三元组中的两个实体也都会保持完整
    - 最适合作为 `Parse → Split → Extract → Build KG` 流水线中的切分步骤
  </Tab>
  <Tab title="结构化">
    基于标题和段落边界的结构分析来切分文本。每个标题或段落组都会成为一个分块边界：

    ```python
    from semantica.split import TextSplitter

    splitter = TextSplitter(method="structural")
    chunks   = splitter.split(text)

    for chunk in chunks:
        print(f"  {chunk.text[:80]}...")
        print(f"  start: {chunk.start_index}, end: {chunk.end_index}")
    ```

    **关键行为：**
    - 处理纯文本：无需结构化文档格式
    - 遵循标题层级（以 `#` 开头的行或全大写标题）和段落分隔  
    - 使用 `max_chunk_size=` 参数而不是标准的 `chunk_size=` 来控制最大大小
    - 如果 `StructuralChunker` 不可用，则回退到 `recursive`
  </Tab>
</Tabs>

## 分块 Schema

<AccordionGroup>
  <Accordion title="Chunk 数据类">

```python
@dataclass
class Chunk:
    text:        str                    # the chunk's text content
    start_index: int                    # character offset of start in source text
    end_index:   int                    # character offset of end in source text
    metadata:    Dict[str, Any]         # method-specific fields: see table below
    id:          Optional[str] = None   # optional chunk identifier
```

  </Accordion>
  <Accordion title="Chunk 元数据字段">

元数据键因方法而异。此处仅列出实现中实际设置的键。

| Field | Type | Set by | Description |
| :----- | :---- | :------ | :----------- |
| `method` | `str` | 所有方法 | 生成此分块的切分方法 |
| `chunk_size` | `int` | 大多数方法 | 此分块的字符长度 |
| `sentence_count` | `int` | `sentence`、`semantic_transformer`、spaCy 路径 | 此分块中的句子数量 |
| `paragraph_count` | `int` | `paragraph` | 此分块中的段落数量 |
| `word_count` | `int` | `word` | 此分块中的单词数量 |
| `token_count` | `int` | `token`；当 spaCy 可用时的 `sentence`/`semantic_transformer` | Token 计数：并非总是存在 |
| `entity_count` | `int` | `entity_aware` | 边界落入此分块的实体数量 |
| `entities` | `list` | `entity_aware` | 边界落入此分块的实体对象 |
| `relation_count` | `int` | `relation_aware` | 此分块中的关系三元组数量 |
| `relationships` | `list` | `relation_aware` | 此分块中的关系对象 |
| `element_count` | `int` | `structural` | 归组到此分块的结构元素数量 |
| `element_types` | `list[str]` | `structural` | 元素类型：`"heading"`、`"paragraph"`、`"list"` 等 |

  </Accordion>
</AccordionGroup>

## 分词器选项

`token` 方法接受 `tokenizer=` 关键字参数，该参数会传递给 `tiktoken.encoding_for_model()`。该值应为 tiktoken 模型名称。无法识别的名称会自动回退到 `cl100k_base`。

| Value | Encoding used |
| :----- | :------------- |
| `"gpt-4"`（默认） | `cl100k_base` |
| `"gpt-3.5-turbo"` | `cl100k_base` |
| `"text-embedding-ada-002"` | `cl100k_base` |
| 任何无法识别的字符串 | 回退到 `cl100k_base` |

如果未安装 `tiktoken`，`token` 方法会回退为按以空白分隔的单词切分。

<Warning>
  **分词器错误。** `token` 方法会将 `tokenizer=` 的值传递给 `tiktoken.encoding_for_model()`。如果 tiktoken 无法识别该模型名称，它会静默回退到 `cl100k_base`。请传入有效的 tiktoken 模型名称（例如 `"gpt-4"`、`"gpt-3.5-turbo"`）以获得确定的行为。
</Warning>

## Pipeline 集成

`TextSplitter` 可以单独使用，也可以与其他 Semantica 模块手动组合。以下示例展示了一种顺序模式：解析文件、切分文本，然后从每个分块中提取实体：

```python
from semantica.parse import DocumentParser
from semantica.split import TextSplitter
from semantica.semantic_extract import NERExtractor

# Parse
parser = DocumentParser()
parsed = parser.parse("data/report.pdf")   # returns a dict with "full_text" key

# Split
splitter = TextSplitter(method="semantic_transformer", chunk_size=512)
chunks   = splitter.split(parsed["full_text"])

# Extract from each chunk
ner = NERExtractor(method="ml")

for chunk in chunks:
    entities = ner.extract(chunk.text)
    print(f"  {len(entities)} entities in chunk starting at {chunk.start_index}")
```

有关完整的 pipeline 编排 API，请参阅 [Pipeline reference](/zh/reference/pipeline)。

- [Parse](/zh/reference/parse) — 在分块前解析文档：生成章节和元数据。
- [Embeddings](/zh/reference/embeddings) — 为分块生成嵌入，用于向量搜索和语义分块。
- [Semantic Extract](/zh/reference/semantic_extract) — 从各个分块中提取实体和关系。
- [Pipeline](/zh/reference/pipeline) — 将切分集成为命名的 pipeline 步骤。