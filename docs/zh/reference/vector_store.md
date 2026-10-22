---
title: "向量存储模块"
description: "为 FAISS、Pinecone、Weaviate、Qdrant、Milvus 和 PgVector 提供统一接口，并支持混合搜索。"
icon: "database"
sourceHash: "82f020926cabfa8ceff74eced2ee6eddd916653dd0785179ff2ef840bc000dbf"
---

`semantica.vector_store` 为所有主流后端提供统一的向量嵌入存储与搜索 API：

- 只需修改一行即可切换后端：无需改动应用代码
- `HybridSearch` 通过 RRF 或加权平均，将稠密向量相似度与元数据过滤融合
- `NamespaceManager` 用于多租户的结构化隔离
- `FAISSStore` 支持 flat、ivf、hnsw 和 pq 索引类型
- 使用并行 worker 批量嵌入与存储；更新元数据无需重新嵌入


## 导出的类

| 类 | 作用 |
| :--- | :--- |
| `VectorStore` | 统一接口：`store_vectors`、`search_vectors`、`update_vectors`、`delete_vectors` |
| `HybridSearch` | 通过 RRF 或加权平均，将稠密向量相似度与元数据过滤融合 |
| `MetadataFilter` | 可链式调用的过滤器构建器：`.eq("type", "person").gt("year", 2020).in_list("tag", [...])` |
| `NamespaceManager` | 多租户隔离：按项目或用户划分独立的索引命名空间 |
| `FAISSStore` | 本地磁盘或内存：flat、ivf、hnsw 和 pq 索引类型 |
| `WeaviateStore` | 云端或自托管，支持 schema |
| `QdrantStore` | 云端或自托管，支持基于 payload 的过滤 |
| `PineconeStore` | 托管云向量数据库，支持 serverless 与 pod 模式 |
| `MilvusStore` | 可扩展的自托管向量数据库 |
| `PgVectorStore` | 带 `pgvector` 扩展的 PostgreSQL：无需额外基础设施 |
| `MetadataStore` | 独立的元数据索引与查询 |
| `SearchRanker` | RRF 与加权平均的结果融合 |

## 你能获得什么

- **VectorStore** — 跨 FAISS、Pinecone、Weaviate、Qdrant、Milvus、PgVector 的统一接口
  - 一行代码切换后端：无需改动应用代码
  - `add_documents()` 自动嵌入；`store_vectors()` 用于预先计算好的嵌入
- **HybridSearch** — 稠密向量相似度结合元数据过滤
  - RRF 或加权平均融合策略
  - 跨独立集合的多源融合
- **MetadataStore** — 按字段值建立丰富的元数据索引
  - 无需重新嵌入即可更新元数据字段
  - OR 与 AND 查询运算符
- **NamespaceManager** — 按租户进行结构化命名空间隔离
  - 查询更快（每个租户的搜索空间更小）
  - 比仅靠元数据过滤的隔离方式更安全
- **批量操作** — 批量添加、删除与元数据更新
  - 通过可配置的 `batch_size` 和 `workers` 并行嵌入
  - 就地更新向量，无需全量重建索引
- **FAISS 索引类型** — flat、ivf、hnsw 和 pq 索引类型
  - 通过 `FAISSStore.create_index()` 完全掌控配置
  - `save()` / `load()` 实现磁盘持久化


## 快速上手

**`VectorStore`** 是主要入口。开发时使用 `"inmemory"`，**本地生产**使用 `"faiss"`：

```python
from semantica.vector_store import VectorStore

# In-memory (development / testing: no persistence)
store = VectorStore(backend="inmemory", dimension=384)

# FAISS (local, persists to disk via save/load)
store = VectorStore(backend="faiss", dimension=384)

# Add plain text documents (auto-embedded)
ids = store.add_documents(
    documents=["Apple was founded by Steve Jobs.", "Microsoft was co-founded by Bill Gates."],
    metadata=[{"source": "wiki"}, {"source": "wiki"}]
)

# Search by text query (auto-embedded)
results = store.search("technology company founders", limit=5)
for r in results:
    print(f"{r['id']}: score: {r['score']:.3f}")
```

<Warning>
  **向量维度必须与嵌入模型匹配。** `dimension` 参数必须与嵌入模型的输出尺寸完全一致：`BAAI/bge-small-en-v1.5` = 384，`all-MiniLM-L6-v2` = 384，`all-mpnet-base-v2` = 768，`bge-large-en-v1.5` = 1024。维度不匹配会在插入时抛出错误。
</Warning>

<Tip>
  **文本使用 `add_documents()`，预先计算好的嵌入使用 `store_vectors()`。** `add_documents()` 会并行分批自动嵌入。如果你的嵌入已经计算完成（例如来自微调模型），可直接使用 `store_vectors()` 跳过重复嵌入。
</Tip>

## 快速开始

<Steps>
  <Step title="创建向量存储">
    ```python
    from semantica.vector_store import VectorStore

    # In-memory (development)
    store = VectorStore(backend="inmemory", dimension=384)

    # FAISS (local production)
    store = VectorStore(backend="faiss", dimension=384)
    ```
  </Step>
  <Step title="添加向量">
    ```python
    # Add text documents (auto-embedded in batches)
    ids = store.add_documents(
        documents=["text one", "text two"],
        metadata=[{"title": "Document 1"}, {"title": "Document 2"}]
    )

    # Add pre-computed vectors directly
    ids = store.store_vectors(
        vectors=[embedding1, embedding2],
        metadata=[{"title": "Document 1"}, {"title": "Document 2"}]
    )
    ```
  </Step>
  <Step title="按语义相似度搜索">
    ```python
    # Search by text query (auto-embeds the query)
    results = store.search("machine learning", limit=10)

    # Search by pre-computed vector
    results = store.search_vectors(query_vector, k=10)

    for r in results:
        print(f"{r['id']}: score: {r['score']:.3f}")
    ```
  </Step>
  <Step title="按元数据过滤结果">
    ```python
    from semantica.vector_store import HybridSearch, MetadataFilter

    mf = MetadataFilter().eq("category", "research").gt("year", 2022)

    # Pass vector_store to the constructor: search() resolves vectors automatically
    search  = HybridSearch(vector_store=store)
    results = search.search(query=query_vector, k=10, metadata_filter=mf)
    ```
  </Step>
</Steps>

## 后端

<Tabs>
  <Tab title="内存 / FAISS">

```python
# In-memory: no persistence, for development and testing
store = VectorStore(backend="inmemory", dimension=384)

# FAISS: local disk persistence via save() / load()
store = VectorStore(backend="faiss", dimension=384)
store.save("./my_store")   # save to directory
store.load("./my_store")   # restore from directory
```

无需安装或 API key。FAISS 需要 `pip install faiss-cpu`。

  </Tab>
  <Tab title="Pinecone">

```bash
pip install "semantica[vectorstore-pinecone]"
```

```python
import os
store = VectorStore(
    backend="pinecone",
    dimension=768,
    api_key=os.getenv("PINECONE_API_KEY"),
    index_name="semantica-index",
    environment="us-east-1-aws"
)
```

  </Tab>
  <Tab title="Weaviate">

```bash
pip install "semantica[vectorstore-weaviate]"
```

```python
store = VectorStore(
    backend="weaviate",
    dimension=768,
    url="http://localhost:8080",
    class_name="Document"
)
```

  </Tab>
  <Tab title="Qdrant">

```bash
pip install "semantica[vectorstore-qdrant]"
```

```python
store = VectorStore(
    backend="qdrant",
    dimension=768,
    url="http://localhost:6333",
    collection_name="semantica"
)
```

  </Tab>
  <Tab title="PgVector">

```bash
pip install "semantica[vectorstore-pgvector]"
```

```python
store = VectorStore(
    backend="pgvector",
    dimension=768,
    connection_string="postgresql://user:pass@localhost/db",
    table_name="embeddings"
)
```

`connection_string` 为必填项：如果缺失，存储在构造时会抛出 `ValueError`。

  </Tab>
  <Tab title="Milvus">

```bash
pip install pymilvus
```

```python
store = VectorStore(
    backend="milvus",
    dimension=768,
    host="localhost",
    port=19530,
    collection_name="semantica"
)
```

  </Tab>
</Tabs>

## 后端选型指南

| 后端 | 部署方式 | API Key | 持久化 | 适用场景 |
| :------- | :---------- | :------- | :----------- | :-------- |
| `inmemory` | 进程内 | 否 | 否 | 开发、单元测试 |
| `faiss` | 本地 | 否 | 通过 `save()`/`load()` | 本地部署、离线生产 |
| `pinecone` | 云端 | 是 | 托管 | 托管云、serverless |
| `weaviate` | 自托管 / 云端 | 可选 | 托管 | 丰富的元数据过滤 |
| `qdrant` | 自托管 / 云端 | 可选 | 托管 | 高性能过滤 |
| `milvus` | 自托管 | 否 | 托管 | 大规模生产 |
| `pgvector` | PostgreSQL | 否 | 托管 | 与 Postgres 原生集成 |

## HybridSearch

`HybridSearch` 将向量相似度与元数据过滤结合。在构造时传入 `vector_store`，即可避免每次调用都提供原始向量：

```python
from semantica.vector_store import HybridSearch, MetadataFilter

# With vector_store: search() pulls vectors from the store automatically
search = HybridSearch(vector_store=store)
mf     = MetadataFilter().eq("category", "research").gt("year", 2022)

results = search.search(
    query=query_vector,   # np.ndarray or query string (auto-embedded)
    k=10,
    metadata_filter=mf
)

for r in results:
    print(f"{r['id']}: score: {r['score']:.3f}  metadata: {r['metadata']}")
```

如果没有 `vector_store`，则需显式传入向量：

```python
search = HybridSearch()
results = search.search(
    query=query_vector,
    vectors=my_vectors,
    metadata=my_metadata,
    vector_ids=my_ids,
    k=10,
    metadata_filter=mf,
)
```

跨独立集合的多源融合：

```python
sources = [
    {"vectors": v1, "metadata": m1, "ids": ids1},
    {"vectors": v2, "metadata": m2, "ids": ids2},
]
fused = search.multi_source_search(query_vector, sources, k=10)
```

<Tip>
  **使用 `HybridSearch(vector_store=store)` 可避免每次调用都传入原始向量。** 设置 `vector_store` 后，`search()` 会自动从存储中获取向量和元数据：你只需传入查询和过滤器。
</Tip>

## 元数据过滤

`MetadataFilter` 支持链式条件：所有条件之间为 AND 关系：

```python
from semantica.vector_store import MetadataFilter

mf = MetadataFilter().eq("author", "John Smith")          # equality
mf = MetadataFilter().ne("status", "archived")            # not equal
mf = MetadataFilter().gt("year", 2022).lte("year", 2024)  # range
mf = MetadataFilter().in_list("tag", ["ai", "ml"])        # set membership
mf = MetadataFilter().contains("title", "neural")         # substring / list contains

# Multiple conditions: all must match (AND)
mf = (
    MetadataFilter()
    .eq("category", "research")
    .gt("year", 2022)
    .contains("title", "language model")
)
```

### MetadataFilter 方法

| 方法 | 运算符 | 说明 |
| :------ | :-------- | :----------- |
| `.eq(field, value)` | `==` | 精确相等 |
| `.ne(field, value)` | `!=` | 不等于 |
| `.gt(field, value)` | `>` | 大于 |
| `.gte(field, value)` | `>=` | 大于或等于 |
| `.lt(field, value)` | `<` | 小于 |
| `.lte(field, value)` | `<=` | 小于或等于 |
| `.in_list(field, values)` | `in` | 字段值位于列表中 |
| `.contains(field, value)` | 子串 | 字符串包含或列表包含 |

## SearchRanker

`SearchRanker` 融合来自多个排序列表的结果：

```python
from semantica.vector_store import SearchRanker

# Reciprocal Rank Fusion: robust to score scale differences
ranker  = SearchRanker(strategy="reciprocal_rank_fusion")
fused   = ranker.rank([results_list_1, results_list_2])

# Weighted average: requires normalised scores on the same scale
ranker  = SearchRanker(strategy="weighted_average")
fused   = ranker.rank([results_list_1, results_list_2], weights=[0.7, 0.3])
```

| 融合策略 | 说明 |
| :--------------- | :----------- |
| `reciprocal_rank_fusion` | 基于排名的 RRF 组合：对分数量纲差异更稳健（默认） |
| `weighted_average` | 分数的加权求和：向 `rank()` 传入 `weights=[...]` |

## 命名空间隔离

使用 `NamespaceManager` 将向量分配到具名命名空间，以实现多租户隔离：

```python
from semantica.vector_store import NamespaceManager, VectorStore

store      = VectorStore(backend="inmemory", dimension=384)
ns_manager = NamespaceManager()

ns_manager.create_namespace("tenant_a", description="Customer A data")
ns_manager.create_namespace("tenant_b", description="Customer B data")

# Store vectors, then assign them to a namespace
ids_a = store.store_vectors(embeddings_a, metadata=metadata_a)
for vid in ids_a:
    ns_manager.add_vector_to_namespace(vid, "tenant_a")

# List all namespace names
for name in ns_manager.list_namespaces():     # returns List[str]
    print(name)

# Get all vectors in a namespace
vectors_in_a = ns_manager.get_namespace_vectors("tenant_a")

# Look up which namespace a vector belongs to
ns = ns_manager.get_vector_namespace("vec_0")

ns_manager.delete_namespace("tenant_a")
```

<Tip>
  **多租户应用请使用 `NamespaceManager`。** 将所有租户的向量存放在同一个集合中、并在查询时按元数据过滤，不仅速度慢，一旦遗漏过滤条件还会带来数据泄漏风险。命名空间隔离既更快（搜索空间更小），也更安全（结构性隔离）。
</Tip>

## 批量操作

```python
# Batch add text documents: parallel embedding with configurable workers
ids = store.add_documents(
    documents=large_doc_list,
    metadata=large_meta_list,
    batch_size=32,     # texts per embedding batch
    parallel=True,     # use ThreadPoolExecutor
)

# Batch add pre-computed vectors
ids = store.store_vectors(vectors=embeddings_list, metadata=meta_list)

# Delete by vector ID list
store.delete_vectors(vector_ids=["vec_0", "vec_1", "vec_2"])

# Update vectors in-place (rebuilds index for inmemory backend)
store.update_vectors(
    vector_ids=["vec_0"],
    new_vectors=[new_embedding]
)
```

## 持久化（FAISS 与内存后端）

```python
store = VectorStore(backend="faiss", dimension=384)
store.add_documents(documents=docs, metadata=meta)

# Save to a directory: creates index.bin and store_data.pkl
store.save("./vector_store_backup")

# Restore in a new process
store2 = VectorStore(backend="faiss", dimension=384)
store2.load("./vector_store_backup")
```

<Note>
  云后端（Pinecone、Weaviate、Qdrant、Milvus、PgVector）自行管理持久化。`save()`/`load()` 仅适用于内存后端和 FAISS 后端。
</Note>

<Warning>
  **inmemory 和 faiss 后端在未调用 `save()` 的情况下会随进程退出而丢失数据。** 添加向量后请调用 `store.save(path)`。云后端（Pinecone、Qdrant、Weaviate、Milvus、PgVector）会自动持久化。
</Warning>

## MetadataStore

`MetadataStore` 为结构化元数据建立索引，让你无需向量即可按字段值查询：

```python
from semantica.vector_store import MetadataStore

meta_store = MetadataStore()

# Store and retrieve metadata
meta_store.store_metadata("doc1", {"author": "Alice", "year": 2024, "category": "research"})
meta_store.store_metadata("doc2", {"author": "Bob",   "year": 2023, "category": "review"})

# Query: returns List[str] of matching vector IDs
ids = meta_store.query_metadata({"category": "research", "year": 2024})

# OR query
ids = meta_store.query_metadata({"category": "research"}, operator="OR")

# Get and update metadata for a specific vector
meta = meta_store.get_metadata("doc1")
meta_store.update_metadata("doc1", {"score": 0.92})

# Get all unique values for a field
years = meta_store.get_field_values("year")

# Statistics
stats = meta_store.get_stats()
# {"total_vectors": 2, "indexed_fields": 3, "field_counts": {...}}
```

<Tip>
  **无需重新嵌入即可更新元数据。** `MetadataStore.update_metadata(id, {...})` 可修改附加字段（状态、标签、审核日期），而无需重新运行嵌入模型。适用于不影响语义内容的状态变更。
</Tip>

## FAISS 索引类型参考

FAISS 索引类型需直接创建 `FAISSStore` 并调用 `create_index()` 进行配置。请使用小写类型名：

```python
from semantica.vector_store import FAISSStore

store = FAISSStore(dimension=384)

# flat: brute-force exact search
store.create_index(index_type="flat", metric="L2")

# ivf: inverted file index
store.create_index(index_type="ivf", metric="L2", nlist=100)

# hnsw: hierarchical navigable small world graph
store.create_index(index_type="hnsw", metric="L2", M=32)

# pq: product quantization for memory efficiency
store.create_index(index_type="pq", metric="L2", m=8)
```

| 索引 | 内存 | 速度 | 精度 | 适用场景 |
| :----- | :------ | :----- | :-------- | :----------- |
| `flat` | 高 | 慢 | 精确（100%） | 少于 100K 向量，正确性至关重要 |
| `ivf` | 中 | 快 | ~95–98% | 100K–10M 向量，均衡之选 |
| `hnsw` | 中高 | 极快 | ~97–99% | 低延迟的生产检索 |
| `pq` | 低 | 快 | ~90–95% | 数百万向量，内存受限 |

<Warning>
  **FAISS 索引类型名称为小写。** `FAISSStore.create_index()` 方法要求传入 `"flat"`、`"ivf"`、`"hnsw"`、`"pq"`，而不是 `"Flat"`、`"IVF"`、`"HNSW"`、`"PQ"`。传入大写值会抛出 `ValidationError`。
</Warning>

<Note>
  使用 `VectorStore(backend="faiss")` 时，底层 `FAISSStore` 默认以 flat 索引初始化。如需使用 ivf/hnsw/pq，请直接构造 `FAISSStore` 并以所需类型调用 `create_index()`。
</Note>

## 常见工作流

<Tabs>
  <Tab title="语义检索流水线">
    ```python
    from semantica.vector_store import VectorStore

    store = VectorStore(backend="faiss", dimension=384)

    # Index documents
    store.add_documents(
        documents=corpus_texts,
        metadata=[{"source": src} for src in sources],
        batch_size=64,
    )

    # Persist
    store.save("./corpus_index")

    # Query
    results = store.search("What is knowledge graph construction?", limit=5)
    for r in results:
        print(f"[{r['score']:.3f}] {r['metadata']['source']}")
    ```
  </Tab>
  <Tab title="带过滤的检索">
    ```python
    from semantica.vector_store import VectorStore, HybridSearch, MetadataFilter

    store  = VectorStore(backend="inmemory", dimension=384)
    search = HybridSearch(vector_store=store)

    # Only return results from 2023+ with category "research"
    mf = MetadataFilter().gte("year", 2023).eq("category", "research")
    results = search.search(query=query_vector, k=10, metadata_filter=mf)
    ```
  </Tab>
  <Tab title="多源融合">
    ```python
    from semantica.vector_store import HybridSearch, SearchRanker

    search = HybridSearch()
    sources = [
        {"vectors": v1, "metadata": m1, "ids": ids1},
        {"vectors": v2, "metadata": m2, "ids": ids2},
    ]
    fused = search.multi_source_search(query_vector, sources, k=10)

    # Custom fusion weights
    ranker = SearchRanker(strategy="weighted_average")
    fused  = ranker.rank([results_a, results_b], weights=[0.7, 0.3])
    ```
  </Tab>
  <Tab title="多租户命名空间">
    ```python
    from semantica.vector_store import VectorStore, NamespaceManager

    store = VectorStore(backend="inmemory", dimension=384)
    ns    = NamespaceManager()

    ns.create_namespace("project_a")
    ns.create_namespace("project_b")

    ids = store.add_documents(docs_a, metadata=meta_a)
    for vid in ids:
        ns.add_vector_to_namespace(vid, "project_a")

    # Check ownership
    print(ns.get_vector_namespace(ids[0]))  # "project_a"
    print(ns.get_namespace_stats("project_a"))
    ```
  </Tab>
</Tabs>

- [嵌入](/zh/reference/embeddings) — 生成此处存储的向量。
- [上下文](/zh/reference/context) — AgentContext 使用 VectorStore 进行记忆检索。
- [分块](/zh/reference/split) — 在嵌入与存储之前对文档进行分块。
- [摄取](/zh/reference/ingest) — 在嵌入与存储之前摄取文档。