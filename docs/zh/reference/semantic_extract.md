---
title: "语义提取模块"
description: "命名实体识别、关系抽取、事件检测与三元组生成。"
icon: "magnifying-glass-chart"
sourceHash: "1a2554c81967ac60bc42c419ec5e8fbe9d3626b5ea1f8c81a69cbb20bc193793"
---

`semantica.semantic_extract` 从非结构化文本中抽取结构化信息：这是 Semantica 中每个知识图谱的基础：

- `NERExtractor`：带置信度分数与来源归属的命名实体识别
- `RelationExtractor`：类型化关系抽取（`founded_by`、`located_in` 以及自定义类型）
- `TripletExtractor`：为 RDF 输出直接生成 `(subject, predicate, object)` 三元组
- `EventDetector`：带参与者、时间上下文与置信度的事件检测
- 每个抽取器都支持三种抽取模式：`"pattern"`（无需 API key）、`"huggingface"`、`"llm"`


## 开始使用

### 前置条件与设置

**第 1 步：安装依赖**

```bash
# Basic extraction (pattern methods only)
pip install semantica

# HuggingFace models for advanced NER
pip install semantica[models-huggingface]

# LLM-based extraction (highest accuracy)
pip install semantica[llm-groq]    # or llm-openai
```

**第 2 步：设置 API Key**（仅 LLM 方法需要）

```bash
export GROQ_API_KEY="your_groq_key_here"
export OPENAI_API_KEY="your_openai_key_here"
```

**第 3 步：首次抽取**

```python
from semantica.semantic_extract import NERExtractor

# Start with pattern method (no setup required)
ner = NERExtractor(method="pattern")
entities = ner.extract("Apple Inc. was founded by Steve Jobs.")
print(f"Found {len(entities)} entities")
# Output: Found 2 entities

# Upgrade to LLM for better accuracy
from semantica.llms import Groq
import os

llm = Groq(api_key=os.getenv("GROQ_API_KEY"))
ner = NERExtractor(method="llm", llm_provider=llm)
entities = ner.extract("Apple Inc. was founded by Steve Jobs.")
```


## 导出的类

<Tip>
  **`NamedEntityRecognizer`** 是带置信度阈值与重叠合并的高层协调器。**`NERExtractor`** 是更底层的实现。对于大多数用例，可从 `NERExtractor` 入手以保持简单，或使用 `NamedEntityRecognizer` 获得细粒度控制。
</Tip>

| 类 | 角色 |
| :--- | :--- |
| `NamedEntityRecognizer` | 带置信度阈值与重叠合并的高层 NER |
| `NERExtractor` | 核心 NER 实现：直接使用以保持简单 |
| `RelationExtractor` | 类型化关系抽取（`founded_by`、`located_in` 等） |
| `TripletExtractor` | 为 RDF 输出直接生成 `(subject, predicate, object)` 三元组 |
| `EventDetector` | 带参与者、时间上下文与置信度分数的事件检测 |
| `CoreferenceResolver` | 将 "Apple" 与 "the company" 解析为同一规范实体 |
| `Entity` | `{id, text, type, confidence, start, end}` |
| `Relation` | `{subject, predicate, object, confidence}` |
| `Event` | `{type, participants, temporal, location, confidence}` |

## 方法选择指南

<Tabs>
  <Tab title="Pattern：无需设置">
    零依赖，无需 API key。使用 spaCy 规则与正则表达式匹配标准实体类型。

    | | |
    | :-- | :-- |
    | **设置** | 无：开箱即用 |
    | **成本** | 免费 |
    | **准确率** | 对标准实体类型效果良好 |
    | **适用场景** | 快速原型、批处理、隔离网络系统 |

    ```python
    from semantica.semantic_extract import NERExtractor, RelationExtractor

    ner = NERExtractor(method="pattern")
    entities = ner.extract("Apple Inc. was founded by Steve Jobs in Cupertino.")

    rel = RelationExtractor(method="pattern")
    relationships = rel.extract(text, entities=entities)
    ```
  </Tab>
  <Tab title="HuggingFace：自定义模型">
    使用任意预训练或微调的 Transformer 模型。免费推理，本地运行。

    | | |
    | :-- | :-- |
    | **设置** | `pip install semantica[models-huggingface]` |
    | **成本** | 免费（本地算力） |
    | **准确率** | 对领域特定 NER 表现出色 |
    | **适用场景** | 医疗 NER、自定义微调、无 API 成本 |

    ```python
    from semantica.semantic_extract import NERExtractor

    ner = NERExtractor(method="huggingface")

    # Pass model per-call
    entities = ner.extract(text, model="dslim/bert-base-NER", device="cpu")

    # Biomedical NER
    entities = ner.extract(text, model="d4data/biomedical-ner-all")
    ```
  </Tab>
  <Tab title="LLM：最佳准确率">
    对复杂 schema 与自定义实体类型具有最高准确率。需要 LLM API key。

    | | |
    | :-- | :-- |
    | **设置** | `pip install semantica[llm-groq]` + API key |
    | **成本** | 取决于提供商 |
    | **准确率** | 最高：可处理复杂类型与上下文 |
    | **适用场景** | 生产环境、自定义实体类型、复杂关系 schema |

    ```python
    import os
    from semantica.llms import Groq
    from semantica.semantic_extract import NERExtractor, RelationExtractor, TripletExtractor

    llm = Groq(model="llama-3.3-70b-versatile", api_key=os.getenv("GROQ_API_KEY"))

    ner  = NERExtractor(method="llm",  llm_provider=llm, max_retries=3)
    rel  = RelationExtractor(method="llm", llm_provider=llm)
    trip = TripletExtractor(method="llm", llm_provider=llm)

    entities      = ner.extract(text)
    relationships = rel.extract(text, entities=entities)
    triplets      = trip.extract(text)
    ```
  </Tab>
  <Tab title="回退链">
    按优先级顺序尝试各方法：即使首选方法不可用，也能保证结果非空。

    ```python
    from semantica.semantic_extract import NERExtractor, RelationExtractor

    # Try LLM first, fall back to pattern on error
    ner = NERExtractor(method=["llm", "pattern"])
    rel = RelationExtractor(method=["llm", "pattern"])

    # Always returns results: safe for production pipelines
    entities      = ner.extract(text)
    relationships = rel.extract(text, entities=entities)
    ```

    <Tip>
      在无法保证 API 可用性（限流、网络问题）的流水线中使用回退链。列表中的第一个方法总是最先尝试。
    </Tip>
  </Tab>
</Tabs>

### 各抽取器的方法可用性

| 抽取器 | `pattern` | `huggingface` | `llm` | 说明 |
| :----------- | :----------- | :--------------- | :------- | :------- |
| `NERExtractor` | ✅ | ✅ | ✅ | 完整方法支持 |
| `RelationExtractor` | ✅ | ✅ | ✅ | 还支持 `dependency`、`cooccurrence` |
| `TripletExtractor` | ✅ | ✅ | ✅ | 还支持 `rules` 方法 |
| `EventDetector` | ✅ | ❌ | ✅ | 仅 pattern 与 LLM |

### 方法回退链

为保证可靠性，抽取器支持回退链，按顺序尝试各方法直到有一个成功：

```python
# Try LLM first, fall back to pattern if it fails
ner = NERExtractor(method=["llm", "pattern"])
rel = RelationExtractor(method=["llm", "pattern"]) 
trip = TripletExtractor(method=["llm", "pattern"])

# Always returns results - guarantees non-empty extraction
entities = ner.extract(text)
```

### NER 合并策略

`NERExtractor` 默认使用 `merge_strategy="fallback"`，因此方法列表保持为有序回退链。要同时运行多个方法，请选择以下显式策略之一：

| 策略 | 行为 |
| :--- | :--- |
| `fallback` | 返回第一个非空的方法结果。 |
| `union` | 保留来自任意方法的候选。同标签的边界变体会被对齐，而不同标签则保持可用。 |
| `consensus` | 要求跨方法支持某个偏移对齐的候选。`min_votes` 默认为 `2`。 |

```python
from semantica.semantic_extract import NERExtractor

ner = NERExtractor(
    method=["spacy", "huggingface"],
    merge_strategy="consensus",
    min_votes=2,
    min_agreement=0.75,  # optional support-ratio requirement
    method_weights={"spacy": 0.8, "huggingface": 1.0},
)
entities = ner.extract(text)

for entity in entities:
    print(entity.metadata["supporting_methods"])
    print(entity.metadata["vote_count"], entity.metadata["agreement"])
```

共识会针对所配置的合格方法来统计支持，而不只统计发出了候选的方法。因此，空结果或失败的合格方法会被视为不支持票。当所配置的方法覆盖范围不同时，可使用 `eligible_methods=[...]` 限制共识的分母；对于互补的规则抽取器，可使用 `merge_strategy="union"`。`method_weights` 仅用于打破原本合格的精确跨度跨标签平局；它们绝不会把单个方法变成多票。

每个合并后的实体在其元数据中都包含 `supporting_methods`、`vote_count`、`eligible_method_count`、`agreement` 以及各方法的 `method_scores`。共识会将兼容的标签别名（如 `PER`/`PERSON` 与 `ORGANIZATION`/`ORG`）视为同一票。仅当最终跨度完全相同时，它才会依据方法权重、票数、置信度以及稳定的标签顺序来解决跨标签冲突；不同跨度上的嵌套实体仍然保留。`ml` 与 `spacy` 在投票与权重上是同一个后端，因此它们的权重可以互换（冲突值会被拒绝）。边界候选仅当其跨度 IoU 与该候选中的每个现有投票都不低于 0.5 时才进行一对一匹配；置信度相同的变体优先选择更长的跨度。如果某个提供方省略了偏移量，Semantica 会在合并前将其实体文本与文档中的整词匹配进行解析。这样可让文本相同的重复提及保持彼此区分，并防止一个宽跨度充当多次提及的投票。

`ensemble_voting=True` 已弃用，在迁移期间映射为 `merge_strategy="union"`。当需要方法间一致性时，请使用 `merge_strategy="consensus"`。

与 `fallback` 不同，`union` 与 `consensus` 在配置的方法没有返回候选之后，绝不会注入源自 pattern 的实体。因此在这些策略中空结果是有意义的。


## 快速开始

```python
from semantica.semantic_extract import NERExtractor, RelationExtractor, TripletExtractor
from semantica.llms import Groq
import os

text = "Apple Inc. was founded by Steve Jobs in Cupertino in 1976."
llm  = Groq(model="llama-3.3-70b-versatile", api_key=os.getenv("GROQ_API_KEY"))

entities      = NERExtractor(method="llm", llm_provider=llm).extract(text)
relationships = RelationExtractor(method="llm", llm_provider=llm).extract(text, entities=entities)
triplets      = TripletExtractor(method="llm", llm_provider=llm).extract(text)
```

<img src="/assets/img/diagrams/extraction-pipeline.svg" alt="语义提取流水线：原始文本分发给 NER、关系与共指抽取器，然后合并到三元组生成器" style={{ width: '100%', borderRadius: '12px', margin: '0 0 24px' }} />


## 抽取器方法

| 方法 | 返回 | 描述 |
| :------ | :------- | :----------- |
| `extract(text)` | `List[Entity]` / `List[Relation]` / `List[Triplet]` / `List[Event]` | 从单个文本输入中抽取 |
| `extract(texts)` | `List[List[...]]` | 处理多个文本（自动检测批处理） |


## NERExtractor

```python
from semantica.semantic_extract import NERExtractor
from semantica.llms import Groq
import os

# Pattern-based: fast, no API key, good for standard entity types
ner = NERExtractor(method="pattern")
entities = ner.extract("Apple Inc. was founded by Steve Jobs in Cupertino.")

# HuggingFace-based: custom models, no API cost
ner = NERExtractor(method="huggingface")
entities = ner.extract(text, model="dslim/bert-base-NER", device="cpu")

# LLM-based: best accuracy, handles complex schemas and custom types
llm = Groq(model="llama-3.3-70b-versatile", api_key=os.getenv("GROQ_API_KEY"))
ner = NERExtractor(method="llm", llm_provider=llm, max_retries=3)
entities = ner.extract(text)
```

输出格式：

```python
[
    {"text": "Apple Inc.",  "type": "ORGANIZATION", "confidence": 0.98, "start": 0,  "end": 10},
    {"text": "Steve Jobs",  "type": "PERSON",       "confidence": 0.99, "start": 27, "end": 37},
    {"text": "Cupertino",   "type": "LOCATION",     "confidence": 0.97, "start": 41, "end": 50}
]
```

### 自定义实体类型

```python
ner = NERExtractor(
    method="pattern",
    custom_entities={
        "DRUG": ["aspirin", "ibuprofen", "metformin"],
        "GENE": ["BRCA1", "TP53", "EGFR"]
    }
)
```

<Note>
  **v0.5.0 修复：** 在不兼容的自定义网关上，`NERExtractor(method="llm")` 不再静默回退到模式抽取。现在会针对不兼容的网关有条件地省略 `response_format=json_object` 参数，并自动应用纯 `generate()` + JSON 解析的回退方案。
</Note>

## RelationExtractor

```python
from semantica.semantic_extract import RelationExtractor

rel = RelationExtractor(method="llm", llm_provider=llm, max_retries=3)
relationships = rel.extract(text, entities=entities)
```

输出格式：

```python
[
    {"subject": "Steve Jobs", "predicate": "founded",    "object": "Apple Inc.", "confidence": 0.92},
    {"subject": "Apple Inc.", "predicate": "located_in", "object": "Cupertino",  "confidence": 0.89}
]
```

可用方法：

- `"pattern"`：基于规则的模式匹配
- `"dependency"`：spaCy 依存句法分析
- `"cooccurrence"`：基于邻近度的共现
- `"huggingface"`：自定义模型
- `"llm"`：准确率最高，需要 API key


## TripletExtractor

直接从文本生成 RDF 就绪的 `(subject, predicate, object)` 三元组：

```python
from semantica.semantic_extract import TripletExtractor

trip = TripletExtractor(method="llm", llm_provider=llm)
triplets = trip.extract(text)
# → [{"subject": "Steve Jobs", "predicate": "founded", "object": "Apple Inc.", ...}]
```

三元组适合直接加载到三元组存储或知识图谱中。


## EventDetector

检测带有参与者和时间上下文的事件：

```python
from typing import List
from semantica.semantic_extract import EventDetector, Event

extractor = EventDetector(method="llm", llm_provider=llm)
events: List[Event] = extractor.extract(text)

for event in events:
    print(f"Event type:   {event.type}")
    print(f"Participants: {event.participants}")
    print(f"Temporal:     {event.temporal}")
    print(f"Confidence:   {event.confidence:.2f}")
```

每个事件的输出字段：

- `type`：事件类别（例如 `"founding"`、`"acquisition"`）
- `participants`：带有角色的实体列表
- `temporal`：日期或时间引用
- `location`：地点实体（存在时）
- `confidence`：抽取置信度分数


## CoreferenceResolver

在抽取前将代词和别名引用消解为规范实体：

```python
from semantica.semantic_extract import CoreferenceResolver

resolver = CoreferenceResolver()
resolved_text = resolver.resolve(
    "Apple Inc. was founded in 1976. The company is headquartered in Cupertino."
)
# "Apple Inc." replaces "The company" for consistent downstream extraction
```


## 批量处理

所有抽取器都会自动检测批量输入，并高效地处理多个文本：

```python
# Batch processing with list input
texts = ["Apple Inc. was founded by Steve Jobs.", "Google was founded by Larry Page.", "Microsoft was founded by Bill Gates."]

ner = NERExtractor(method="llm", llm_provider=llm)
batch_results = ner.extract(texts)  # Returns List[List[Entity]]

# Process results
for i, doc_entities in enumerate(batch_results):
    print(f"Document {i}: {len(doc_entities)} entities")
    for entity in doc_entities:
        print(f"  - {entity.text} ({entity.label})")
```

**批量输入选项：**

```python
# Option 1: List of strings
texts = ["Text 1...", "Text 2...", "Text 3..."]
results = ner.extract(texts)

# Option 2: List of documents with IDs (adds provenance metadata)
documents = [
    {"id": "doc_1", "content": "Apple Inc. was founded by Steve Jobs."},
    {"id": "doc_2", "content": "Google was founded by Larry Page."}
]
results = ner.extract(documents)  # Entities include document_id in metadata
```

## 组合使用所有抽取器

标准抽取流水线：实体 → 关系 → 三元组：

```python
from semantica.semantic_extract import NERExtractor, RelationExtractor, TripletExtractor
from semantica.llms import Groq
import os

llm = Groq(model="llama-3.3-70b-versatile", api_key=os.getenv("GROQ_API_KEY"))

ner  = NERExtractor(method="llm",      llm_provider=llm, max_retries=3)
rel  = RelationExtractor(method="llm", llm_provider=llm, max_retries=3)
trip = TripletExtractor(method="llm",  llm_provider=llm, max_retries=3)

entities      = ner.extract(text)
relationships = rel.extract(text, entities=entities)
triplets      = trip.extract(text)
```

## 抽取方法对比

| 方法 | 速度 | 成本 | 准确率 | 自定义类型 |
| :------ | :----- | :---- | :-------- | :------------ |
| `pattern` | 非常快 | 免费 | 中等 | 是（字典） |
| `ml` | 快 | 免费 | 高 | 有限 |
| `llm` | 中等 | API 费用 | 最高 | 是（schema） |

- [LLM 提供商](/zh/reference/llms) — 配置用于抽取的 LLM。
- [知识图谱](/zh/reference/kg) — 从抽取的实体和关系构建图。
- [解析模块](/zh/reference/parse) — 在抽取前解析文档。
- [去重](/zh/reference/deduplication) — 在抽取后消解重复实体。