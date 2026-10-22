---
title: "Embeddings 模块"
description: "文本与图嵌入生成（FastEmbed、Sentence-Transformers、OpenAI、BGE），支持多种池化策略与提供商无关的 API。"
icon: "vector-square"
sourceHash: "b997d9bcd7d8b55b6a3a28cfaaaf2b9e0fe32c9803ff356622938c5170175c85"
---

**`semantica.embeddings`** 将文本与图结构转换为**稠密向量表示**：

- 提供商无关的 API：FastEmbed（默认，ONNX，无需 GPU）、Sentence-Transformers、OpenAI、BGE
- 为语义搜索、实体消解、GraphRAG 检索和去重提供支持
- `GraphEmbeddingManager` 为图数据库后端嵌入知识图谱节点与边
- 五种池化策略：Mean（默认）、Max、CLS、Attention、Hierarchical
- `check_available_providers()` 显示当前环境中已安装哪些后端


## 为什么嵌入很重要

原始文本无法进行数学比较。嵌入将含义转换为几何：两个语义相近的句子生成的向量在高维空间中彼此接近，即使它们没有任何共同词汇。

Semantica 将嵌入用于：

- **语义搜索**：按含义而非仅按关键词查找知识图谱节点
- **实体消解**：识别出 "Apple Inc." 与 "Apple Computer" 指向同一实体
- **去重**：`semantic_v2` 策略通过嵌入距离度量实体相似度
- **GraphRAG 检索**：向量 + 图遍历的混合方式，为有依据的 LLM 回答提供支撑
- **语义分块**：在 `TextSplitter(method="semantic_transformer")` 中检测主题切换边界

## 导出的类

| 类 | 职责 |
| :--- | :--- |
| `EmbeddingGenerator` | 提供商无关的入口：处理批处理与提供商选择 |
| `TextEmbedder` | 带自动批处理的文本嵌入；默认使用 FastEmbed |
| `GraphEmbeddingManager` | 为 GraphRAG 与图数据库嵌入知识图谱节点和边 |
| `VectorEmbeddingManager` | 为向量数据库后端准备并格式化嵌入 |
| `OpenAIStore` | OpenAI `text-embedding-3-small` / `text-embedding-3-large` 提供商 |
| `BGEStore` | 通过 `sentence-transformers` 使用 BAAI/bge 模型 |
| `FastEmbedStore` | ONNX 加速的本地嵌入：**无需** CUDA |
| `LlamaStore` | 占位存储：尚未达到生产就绪；请勿用于嵌入 |
| `MeanPooling` | 默认池化策略：最适合检索与聚类 |

## 你将获得

- **EmbeddingGenerator**：提供商无关的主入口，可在所有后端之间自动处理批处理。
- **TextEmbedder**：面向文本的嵌入器，带自动批处理与进度跟踪。默认方法为 FastEmbed。
- **GraphEmbeddingManager**：面向图数据库（Neo4j、NetworkX、FalkorDB）的节点与边嵌入。
- **VectorEmbeddingManager**：为 FAISS、Weaviate、Qdrant 和 Milvus 准备、归一化并格式化嵌入。
- **提供商存储**：`OpenAIStore`、`BGEStore`、`FastEmbedStore` 和 `ProviderStoreFactory`。
- **池化策略**：Mean、Max、CLS、Attention 和 Hierarchical 控制 token 到向量的聚合方式。

## 提供商设置

<Tabs>
  <Tab title="FastEmbed（默认）">
    ONNX 加速的本地嵌入。无需 GPU，无需 API key。最佳起点。

    ```bash
    pip install "semantica[fastembed]"
    ```

    ```python
    from semantica.embeddings import EmbeddingGenerator

    # FastEmbed is the default: no config needed
    generator = EmbeddingGenerator()
    embedding = generator.generate_embeddings("Text about AI")
    ```

    <Check>
      默认模型为 `BAAI/bge-small-en-v1.5`。零成本、零 GPU，可在任何机器上运行。
    </Check>

    <Warning>
      **FastEmbed 会忽略 `device` 参数。** FastEmbed 使用 ONNX Runtime 并自行管理执行提供程序；传入 `device="cuda"` 不会产生任何效果。如果需要显式控制 GPU，请改用 `method="sentence_transformers"`。
    </Warning>
  </Tab>
  <Tab title="Sentence-Transformers">
    通过 HuggingFace 提供广泛的模型选择。本地运行，无需 API key。

    ```bash
    pip install semantica  # sentence-transformers included
    ```

    ```python
    from semantica.embeddings import EmbeddingGenerator

    generator = EmbeddingGenerator(config={
        "text": {
            "method": "sentence_transformers",
            "model_name": "all-MiniLM-L6-v2",
        }
    })
    ```

    常用模型：`all-MiniLM-L6-v2`（快速、小巧）、`all-mpnet-base-v2`（均衡）、`BAAI/bge-large-en-v1.5`（高准确度）。

    <Warning>
      **序列长度限制。** 大多数 sentence-transformers 模型有 512 token 的限制。超出部分的文本会被静默截断。对于长文档，请使用 `TextSplitter(method="hierarchical")` + `HierarchicalPooling`。
    </Warning>
  </Tab>
  <Tab title="BGE">
    通过 sentence-transformers 使用 BAAI/bge 模型。具备最先进的检索性能，可在本地运行。

    ```bash
    pip install semantica
    ```

    ```python
    from semantica.embeddings import BGEStore, EmbeddingGenerator

    store     = BGEStore(model="BAAI/bge-large-en-v1.5")
    embedding = store.embed("Text about AI")

    # Or switch model on an existing EmbeddingGenerator
    generator = EmbeddingGenerator()
    generator.set_text_model("sentence_transformers", "BAAI/bge-large-en-v1.5")
    ```
  </Tab>
  <Tab title="OpenAI">
    通过 OpenAI API 使用云端嵌入。质量最高，需要 API key。

    ```bash
    pip install "semantica[llm-openai]"
    export OPENAI_API_KEY="sk-..."
    ```

    ```python
    import os
    from semantica.embeddings import OpenAIStore

    store = OpenAIStore(
        api_key=os.getenv("OPENAI_API_KEY"),
        model="text-embedding-3-small",   # or text-embedding-3-large
    )
    embedding = store.embed("Text about AI")
    ```

    | 模型 | 维度 | 最适合 |
    | :---- | :--------- | :-------- |
    | `text-embedding-3-small` | 1536 | 成本高效的检索 |
    | `text-embedding-3-large` | 3072 | 最高准确度的工作负载 |
  </Tab>
</Tabs>

查看当前环境中已安装哪些提供商：

```python
from semantica.embeddings import check_available_providers

providers = check_available_providers()
# → {"sentence_transformers": True, "fastembed": True, "openai": False}
```

## 快速上手

`EmbeddingGenerator` 是获取嵌入最快捷的途径。默认方法为 FastEmbed（ONNX，无需 GPU）：

```python
from semantica.embeddings import EmbeddingGenerator

# Default: FastEmbed with BAAI/bge-small-en-v1.5
generator = EmbeddingGenerator()

# Embed a single text
embedding = generator.generate_embeddings("Text about AI")

# Embed a batch
embeddings = generator.generate_embeddings(["Text about AI", "Machine learning concepts"])

# Compare two embeddings (cosine similarity: 0.0 to 1.0)
score = generator.compare_embeddings(embeddings[0], embeddings[1], method="cosine")
print(f"Similarity: {score:.3f}")
```

<Tip>
  **索引与查询务必使用同一模型。** 不同模型产生的向量不可比较；它们位于不同的向量空间中。切换模型需要重新嵌入整个语料库。
</Tip>

在构造之后切换提供商：

```python
# Switch to a sentence-transformers model
generator.set_text_model("sentence_transformers", "all-MiniLM-L6-v2")

# Switch to BGE large
generator.set_text_model("sentence_transformers", "BAAI/bge-large-en-v1.5")
```

## 快速开始

<Steps>
  <Step title="安装并初始化提供商">
    ```python
    from semantica.embeddings import EmbeddingGenerator

    # Default: FastEmbed, free, runs locally with no GPU
    generator = EmbeddingGenerator()

    # Use sentence-transformers instead
    generator = EmbeddingGenerator(config={"text": {"method": "sentence_transformers", "model_name": "all-MiniLM-L6-v2"}})
    ```
  </Step>
  <Step title="生成嵌入">
    ```python
    # Single text → 1D array
    embedding = generator.generate_embeddings("Text about AI")

    # Batch → 2D array (n_texts, dim)
    embeddings = generator.generate_embeddings(["Text about AI", "Machine learning concepts"])
    ```
  </Step>
  <Step title="计算相似度">
    ```python
    # Cosine similarity: 0.0 (unrelated) to 1.0 (identical meaning)
    score = generator.compare_embeddings(embeddings[0], embeddings[1], method="cosine")
    print(f"Similarity: {score:.3f}")
    ```
  </Step>
  <Step title="为向量数据库做准备">
    ```python
    from semantica.embeddings import VectorEmbeddingManager
    import numpy as np

    manager = VectorEmbeddingManager()

    embeddings = np.array([...], dtype=np.float32)
    metadata   = [{"text": "doc 1"}, {"text": "doc 2"}]

    result = manager.prepare_for_vector_db(embeddings, metadata=metadata, backend="faiss")
    # result["vectors"]  → normalized float32 array
    # result["ids"]      → ["vec_0", "vec_1", ...]
    # result["metadata"] → formatted metadata list
    ```
  </Step>
</Steps>

## 支持的模型

| 提供商 | 模型 | 维度 | 速度 | 最适合 |
| :-------- | :----- | :--------- | :----- | :-------- |
| `fastembed` | `BAAI/bge-small-en-v1.5` | 384 | 极快 | **默认**：针对 CPU 优化，**无需** GPU |
| `sentence_transformers` | `all-MiniLM-L6-v2` | 384 | 快 | 速度与质量的良好平衡 |
| `sentence_transformers` | `all-mpnet-base-v2` | 768 | 中等 | 更高的检索质量 |
| `sentence_transformers` | `BAAI/bge-large-en-v1.5` | 1024 | 中等 | 最先进的检索准确度 |
| `openai` | `text-embedding-3-small` | 1536 | API | 成本高效的 OpenAI 嵌入 |
| `openai` | `text-embedding-3-large` | 3072 | API | 通过 OpenAI API 获得最高质量 |

## EmbeddingGenerator

<Tabs>
  <Tab title="FastEmbed（默认）">
    ```python
    from semantica.embeddings import EmbeddingGenerator

    # Default: FastEmbed with BAAI/bge-small-en-v1.5
    generator = EmbeddingGenerator()
    embeddings = generator.generate_embeddings(texts)
    similarity = generator.compare_embeddings(embeddings[0], embeddings[1])
    ```

    **最适合：** 仅用 CPU 的生产环境，以及无需 GPU 的最低延迟场景。默认配置开箱即用。
  </Tab>
  <Tab title="Sentence-Transformers">
    ```python
    from semantica.embeddings import EmbeddingGenerator

    generator = EmbeddingGenerator()
    generator.set_text_model("sentence_transformers", "all-MiniLM-L6-v2")
    embeddings = generator.generate_embeddings(texts)
    ```

    **最适合：** 有可用 GPU 时的更高质量检索，或需要使用微调模型的场景。
  </Tab>
  <Tab title="OpenAI">
    ```python
    from semantica.embeddings import OpenAIStore
    import os

    store     = OpenAIStore(api_key=os.getenv("OPENAI_API_KEY"), model="text-embedding-3-small")
    embedding = store.embed("Hello world")
    ```

    **最适合：** 追求最高质量（`text-embedding-3-large`），或需要与现有 OpenAI 流水线保持一致。
  </Tab>
  <Tab title="GPU 加速">
    ```python
    from semantica.embeddings import EmbeddingGenerator

    # Use CUDA via sentence-transformers
    generator = EmbeddingGenerator(config={"text": {"method": "sentence_transformers", "device": "cuda"}})

    # Apple Silicon (M1/M2/M3)
    generator = EmbeddingGenerator(config={"text": {"method": "sentence_transformers", "device": "mps"}})
    ```

    GPU 仅适用于 sentence-transformers。FastEmbed 使用 ONNX，不使用 `device`。
  </Tab>
</Tabs>

### 构造函数参数

| 参数 | 类型 | 默认值 | 说明 |
| :--------- | :---- | :------- | :----------- |
| `config` | `dict` | `None` | 配置字典；`config["text"]` 会被传给 `TextEmbedder` |
| `**kwargs` | | | 额外的键/值配置，会合并进 `config` |

使用 `generator.set_text_model(method, model_name)` 在构造之后切换嵌入模型。

## TextEmbedder

带批处理的直接文本嵌入：

```python
from semantica.embeddings import TextEmbedder

# Default: FastEmbed with BAAI/bge-small-en-v1.5
embedder = TextEmbedder()

# Single text → 1D array
embedding = embedder.embed_text("A knowledge graph connects entities with typed relationships.")

# Batch → 2D array (n_texts, dim)
embeddings = embedder.embed_batch(["First text", "Second text", "Third text"])

# Per-sentence embeddings
sentence_embeddings = embedder.embed_sentences("First sentence. Second sentence.")

# Get embedding dimension
dim = embedder.get_embedding_dimension()
```

### TextEmbedder 构造函数参数

| 参数 | 类型 | 默认值 | 说明 |
| :--------- | :---- | :------- | :----------- |
| `model_name` | `str` | `"BAAI/bge-small-en-v1.5"` | 要加载的模型名称 |
| `method` | `str` | `"fastembed"` | 嵌入方法：`"fastembed"` 或 `"sentence_transformers"` |
| `device` | `str` | `"cpu"` | 用于 sentence-transformers 的设备：`"cpu"`、`"cuda"`、`"mps"`。对 FastEmbed 忽略。 |
| `normalize` | `bool` | `True` | 对输出向量进行 L2 归一化 |

**关键行为：**
- 如果 FastEmbed 或 sentence-transformers 不可用，则回退到 128 维的基于哈希的嵌入。哈希嵌入具有确定性但不具备语义：请勿在生产环境中使用。
- 大批量会由底层库在内部进行分块，以避免 OOM。

<Warning>
  **维度不匹配。** 传递给向量存储的维度必须与嵌入模型的输出完全匹配。`BAAI/bge-small-en-v1.5` → 384，`all-MiniLM-L6-v2` → 384，`all-mpnet-base-v2` → 768，`BAAI/bge-large-en-v1.5` → 1024。创建存储前，请使用 `embedder.get_embedding_dimension()` 检查。
</Warning>

<Tip>
  **回退嵌入不具备语义。** 如果 FastEmbed 和 sentence-transformers 均未能成功加载，TextEmbedder 会静默回退到 128 维的 SHA-256 哈希嵌入。这些嵌入具有确定性，但不携带任何语义含义。检查 `embedder.get_method()`：如果返回 `"fallback"`，请安装你打算使用的提供商。
</Tip>

## 提供商存储

当需要对单个后端进行细粒度控制时，可直接使用提供商存储：

```python
from semantica.embeddings import (
    OpenAIStore, BGEStore, FastEmbedStore,
    ProviderStoreFactory,
)
import os

# OpenAI
store     = OpenAIStore(api_key=os.getenv("OPENAI_API_KEY"), model="text-embedding-3-small")
embedding = store.embed("Hello world")

# BGE (Sentence-Transformers wrapper): pass model_name= not model=
store     = BGEStore(model_name="BAAI/bge-large-en-v1.5")
embedding = store.embed("Hello world")

# FastEmbed: ONNX runtime, no CUDA required
store     = FastEmbedStore(model_name="BAAI/bge-small-en-v1.5")
embedding = store.embed("Hello world")
# FastEmbedStore also has an efficient batch method
embeddings = store.embed_batch(["text1", "text2", "text3"])

# Auto-select from a name string: useful in config-driven pipelines
# Supported providers: "openai", "bge", "fastembed"
store = ProviderStoreFactory.create(provider="bge", model_name="BAAI/bge-large-en-v1.5")
```

<Note>
  `LlamaStore` 存在于模块中，但只是一个占位符：它不会连接 Ollama，并且在嵌入时始终抛出 `ProcessingError`。请勿在生产环境中使用。
</Note>

<Warning>
  **LlamaStore 无法正常工作。** `LlamaStore` 存在于模块中，但不会连接 Ollama。它在嵌入时始终抛出 `ProcessingError`。请改用 `FastEmbedStore` 进行基于 ONNX 的本地嵌入，或使用 `BGEStore` 进行基于 sentence-transformers 的本地嵌入。
</Warning>

## 池化策略

池化将一组嵌入聚合为单个向量。当需要合并多个分块嵌入时非常有用：

<Tabs>
  <Tab title="MeanPooling（默认）">
    ```python
    from semantica.embeddings import MeanPooling

    pooler = MeanPooling()
    pooled = pooler.pool(token_embeddings)   # shape: (hidden_dim,)
    ```

    **最适合：** 检索、语义搜索和聚类。对所有贡献取平均值。
  </Tab>
  <Tab title="MaxPooling">
    ```python
    from semantica.embeddings import MaxPooling

    pooler = MaxPooling()
    pooled = pooler.pool(token_embeddings)
    ```

    **最适合：** 捕获任意特征的存在。按维度取最大激活值。
  </Tab>
  <Tab title="CLSPooling">
    ```python
    from semantica.embeddings import CLSPooling

    pooler = CLSPooling()
    pooled = pooler.pool(token_embeddings)
    ```

    **最适合：** 分类式任务；使用 CLS 池化显式训练的模型（BERT）。
  </Tab>
  <Tab title="HierarchicalPooling">
    ```python
    from semantica.embeddings import HierarchicalPooling

    pooler = HierarchicalPooling()
    # chunk_size is passed at pool time, not at construction
    pooled = pooler.pool(token_embeddings, chunk_size=10)
    ```

    **最适合：** 长文档（先进行分块级均值池化，再跨分块进行全局均值池化）。
  </Tab>
  <Tab title="策略比较">

    | 策略 | 使用场景 |
    | :-------- | :----------- |
    | `mean` | 检索、语义搜索和聚类的默认选择 |
    | `max` | 当需要捕获任意特征的存在，而不是平均存在时 |
    | `cls` | 分类式任务；使用 CLS 池化显式训练的模型（BERT） |
    | `attention` | 当 token 重要性差异显著时；速度较慢但更准确 |
    | `hierarchical` | 包含大量分块的长文档；组合分块级池化与全局池化 |

    ```python
    from semantica.embeddings import PoolingStrategyFactory

    pooler = PoolingStrategyFactory.create(strategy="mean")
    ```

  </Tab>
</Tabs>

## GraphEmbeddingManager

将图节点和边嵌入，以便存储到图数据库中：

```python
from semantica.embeddings import GraphEmbeddingManager

manager = GraphEmbeddingManager()

entities = [
    {"id": "e1", "text": "Apple Inc.", "type": "Organization"},
    {"id": "e2", "text": "Tim Cook",   "type": "Person"},
]
relationships = [
    {"source": "e2", "target": "e1", "type": "CEO_OF"}
]

# Embed entities → dict of {id: np.ndarray}
node_embeddings = manager.embed_entities(entities)

# Embed relationships → dict of {id: np.ndarray}
edge_embeddings = manager.embed_relationships(relationships)

# Or prepare everything at once for a graph DB backend
result = manager.prepare_for_graph_db(entities, relationships, backend="neo4j")
# result["node_embeddings"] → {id: np.ndarray}
# result["edge_embeddings"] → {id: np.ndarray}
# result["nodes"]           → entities with "embedding" field added
# result["edges"]           → relationships with "embedding" field added
```

**支持的后端：** `"neo4j"`、`"networkx"`、`"falkordb"`

## VectorEmbeddingManager

为向量数据库存储准备并验证嵌入：

```python
from semantica.embeddings import VectorEmbeddingManager
import numpy as np

manager    = VectorEmbeddingManager()
embeddings = np.random.rand(5, 384).astype(np.float32)
metadata   = [{"text": f"doc_{i}", "category": "science"} for i in range(5)]

# Prepare for FAISS
result = manager.prepare_for_vector_db(embeddings, metadata=metadata, backend="faiss")
# result["vectors"]  → L2-normalized float32 array
# result["ids"]      → ["vec_0", "vec_1", ...]
# result["metadata"] → formatted metadata list

# Validate dimensions before insertion
is_valid = manager.validate_dimensions(embeddings, backend="milvus")

# Prepare multiple batches at once
combined = manager.batch_prepare([embeddings_a, embeddings_b], backend="qdrant")
```

**支持的后端：** `"faiss"`、`"weaviate"`、`"qdrant"`、`"milvus"`

## 常见工作流

<Tabs>
  <Tab title="批量文本嵌入">
    ```python
    from semantica.embeddings import TextEmbedder

    embedder = TextEmbedder()   # default: FastEmbed

    texts = [
        "Apple Inc. was founded by Steve Jobs.",
        "Microsoft was co-founded by Bill Gates.",
        "Amazon was started by Jeff Bezos.",
    ]

    # All at once: more efficient than calling embed_text() per item
    embeddings = embedder.embed_batch(texts)
    print(f"Shape: {embeddings.shape}")   # (3, 384)
    ```
  </Tab>
  <Tab title="提供商比较">
    ```python
    from semantica.embeddings import check_available_providers, EmbeddingGenerator

    # Check what's installed
    available = check_available_providers()
    # → {"sentence_transformers": True, "fastembed": True, "openai": False}

    # Use the fastest available provider
    generator = EmbeddingGenerator()
    if available["fastembed"]:
        generator.set_text_model("fastembed", "BAAI/bge-small-en-v1.5")
    elif available["sentence_transformers"]:
        generator.set_text_model("sentence_transformers", "all-MiniLM-L6-v2")

    embeddings = generator.generate_embeddings(texts)
    ```
  </Tab>
  <Tab title="图节点嵌入">
    ```python
    from semantica.embeddings import GraphEmbeddingManager

    manager  = GraphEmbeddingManager()
    entities = [{"id": "n1", "text": "Python"}, {"id": "n2", "text": "Django"}]

    node_embeddings = manager.embed_entities(entities)
    # {"n1": array([...]), "n2": array([...])}
    ```
  </Tab>
  <Tab title="相似度搜索">
    ```python
    from semantica.embeddings import EmbeddingGenerator, calculate_similarity
    import numpy as np

    generator = EmbeddingGenerator()
    query     = generator.generate_embeddings("knowledge graph databases")
    corpus    = generator.generate_embeddings([
        "graph databases store relationships",
        "relational databases use tables",
        "knowledge graphs model entity relationships",
    ])

    scores = [calculate_similarity(query, doc, method="cosine") for doc in corpus]
    ranked = sorted(zip(scores, range(len(scores))), reverse=True)

    for score, idx in ranked:
        print(f"{score:.3f}  {['graph databases store...', 'relational databases...', 'knowledge graphs...'][idx]}")
    ```
  </Tab>
</Tabs>

## 相似度计算

```python
from semantica.embeddings import calculate_similarity

# Cosine similarity: direction only, not magnitude; most common for text
score = calculate_similarity(embedding_a, embedding_b, method="cosine")
# → 0.0 (orthogonal / unrelated) to 1.0 (identical direction)

# Euclidean distance converted to similarity
score = calculate_similarity(embedding_a, embedding_b, method="euclidean")
```

## 便捷函数

```python
from semantica.embeddings import (
    embed_text, generate_embeddings, calculate_similarity,
    pool_embeddings, check_available_providers,
)

# Single text: fastest path
emb = embed_text("Hello world", method="sentence_transformers")

# Batch
embs = generate_embeddings(["text1", "text2"], method="default")

# Pool multiple embeddings into one
pooled = pool_embeddings(embs, method="mean")

# Check which providers are installed
providers = check_available_providers()
# → {"sentence_transformers": True, "fastembed": True, "openai": False}
```

- [向量存储](/zh/reference/vector_store)：存储并搜索生成的嵌入。
- [Split](/zh/reference/split)：在嵌入前对文本进行分块，以提高检索质量。
- [KG 模块](/zh/reference/kg)：Distance Intelligence 使用图嵌入来构建语义邻域。
- [去重](/zh/reference/deduplication)：语义去重使用嵌入距离进行实体消解。