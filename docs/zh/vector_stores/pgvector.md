---
title: "pgvector 存储"
description: "使用 pgvector 扩展的 PostgreSQL：支持余弦、L2 和内积相似度搜索，以及 IVFFlat 和 HNSW 索引。"
icon: "database"
sourceHash: "5a875d52c855f7f27dcaf7bbfc69f63bbcc51e5da7e9fedba6fb56a570bb77a5"
---

**`PgVectorStore`** 为 Semantica 增加了 PostgreSQL 原生向量存储与相似度搜索：无需专用向量数据库。


## 概述

**`PgVectorStore`** 使用 [pgvector](https://github.com/pgvector/pgvector) 扩展提供 PostgreSQL 原生向量存储。它支持**多种距离度量**（余弦相似度、L2/欧氏距离、内积）、索引类型（IVFFlat、HNSW），以及支持过滤的 JSONB 元数据存储。

## 功能

<Check>距离度量：余弦、L2（欧氏距离）、内积</Check>
<Check>索引类型：IVFFlat 和 HNSW，用于近似最近邻搜索</Check>
<Check>JSONB 元数据存储并支持过滤</Check>
<Check>通过 psycopg3/psycopg2 实现连接池</Check>
<Check>批量插入、更新和删除</Check>
<Check>幂等索引创建：可安全多次调用</Check>


## 设置

### 前提条件

1. PostgreSQL 13+，并已安装 pgvector 扩展
2. Python 依赖：`psycopg3`（首选）或 `psycopg2-binary`、`pgvector`

### 安装依赖

```bash
# Install with pgvector support
pip install semantica[vectorstore-pgvector]

# Or install manually
pip install psycopg[binary] pgvector
# Or for psycopg2
pip install psycopg2-binary pgvector
```

### PostgreSQL 设置

<Steps>
  <Step title="安装 pgvector 扩展">
    ```sql
    -- Debian/Ubuntu
    sudo apt-get install postgresql-16-pgvector

    -- macOS (Homebrew)
    brew install pgvector

    -- Or build from source: https://github.com/pgvector/pgvector
    ```
  </Step>
  <Step title="在数据库中创建扩展">
    ```sql
    CREATE EXTENSION vector;
    ```
  </Step>
  <Step title="验证安装">
    ```sql
    SELECT * FROM pg_extension WHERE extname = 'vector';
    ```
  </Step>
</Steps>

### Docker 快速开始

```bash
docker run -d \
    --name pgvector \
    -e POSTGRES_PASSWORD=postgres \
    -p 5432:5432 \
    ankane/pgvector:latest
```


## 连接字符串格式

标准 PostgreSQL 连接字符串：

```
postgresql://user:password@host:port/database
```

示例：

```python
# Local development
"postgresql://postgres:postgres@localhost:5432/semantica"

# With SSL
"postgresql://user:pass@host/db?sslmode=require"

# Connection parameters
"postgresql://user:pass@localhost/db?connect_timeout=10&application_name=semantica"
```


## 用法

### 基本用法

```python
from semantica.vector_store import PgVectorStore
import numpy as np

# Initialize store
store = PgVectorStore(
    connection_string="postgresql://postgres:postgres@localhost:5432/semantica",
    table_name="document_vectors",
    dimension=768,
    distance_metric="cosine",
    pool_size=10
)

# Add vectors
vectors = [np.random.rand(768).astype(np.float32) for _ in range(100)]
metadata = [{"doc_id": i, "category": "article"} for i in range(100)]
ids = store.add(vectors, metadata)

# Search
query = np.random.rand(768).astype(np.float32)
results = store.search(query, top_k=10)

# Results format: [{"id": "...", "score": 0.95, "metadata": {...}}, ...]
for result in results:
    print(f"ID: {result['id']}, Score: {result['score']:.4f}")

# Close store
store.close()
```

### 上下文管理器

```python
with PgVectorStore(
    connection_string="postgresql://...",
    table_name="vectors",
    dimension=768,
    distance_metric="cosine"
) as store:
    vectors = [np.random.rand(768).astype(np.float32)]
    ids = store.add(vectors, [{"source": "test"}])
    # Store automatically closed on exit
```

### 元数据过滤

```python
# Search with metadata filter
results = store.search(
    query_vector,
    top_k=10,
    filter={"category": "science", "published": True}
)
```

### 更新与删除

```python
# Update vectors and metadata.
# Returns the ids the UPDATE matched. Missing ids are omitted.
new_vectors = [np.random.rand(768).astype(np.float32)]
new_metadata = [{"updated": True}]
updated_ids = store.update(["vec_0"], new_vectors, new_metadata)

# Update metadata only
store.update(["vec_0"], metadata=[{"tag": "updated"}])

# Delete vectors
store.delete(["vec_0", "vec_1"])
```

### 按 ID 检索

```python
results = store.get(["vec_0", "vec_1"])
# Returns: [{"id": "vec_0", "vector": np.array(...), "metadata": {...}}, ...]
```

### 创建索引

```python
# Create HNSW index for approximate nearest neighbor search
store.create_index(
    index_type="hnsw",
    params={"m": 16, "ef_construction": 64}
)

# Create IVFFlat index
store.create_index(
    index_type="ivfflat",
    params={"lists": 100}
)
```

索引创建是幂等的：多次调用是安全的。

### 统计信息

```python
stats = store.get_stats()
# Returns: {
#     "table_name": "document_vectors",
#     "dimension": 768,
#     "distance_metric": "cosine",
#     "vector_count": 1000,
#     "indexes": [...],
#     "psycopg_version": "3"
# }
```

## 距离度量

| 度量 | 操作符 | 说明 | 使用场景 |
| :-------- | :---------- | :------------- | :---------- |
| `cosine` | `<=>` | 余弦距离（1 - 余弦相似度） | 语义相似度、文本嵌入 |
| `l2` | `<->` | 欧氏距离 | 几何距离、聚类 |
| `inner_product` | `<#>` | 负内积 | 最大内积搜索 |

**注意**：无论采用哪种度量，`search()` 返回的分数都会归一化为相似度（越高越好）。

## 索引类型

<Tabs>
  <Tab title="HNSW">
    **分层可导航小世界**：最适合需要高召回率的高维向量。

    | | |
    | :-- | :-- |
    | **优点** | 搜索速度快、召回率高、支持增量构建 |
    | **缺点** | 内存占用更高、构建时间更长 |

    ```python
    store.create_index(index_type="hnsw", params={
        "m": 16,               # connections per layer (default: 16)
        "ef_construction": 64  # build-time accuracy/speed tradeoff (default: 64)
    })
    ```
  </Tab>
  <Tab title="IVFFlat">
    **带 Flat 索引的倒排文件**：最适合内存受限环境中的大型数据集。

    | | |
    | :-- | :-- |
    | **优点** | 内存占用更低、速度/精度可调 |
    | **缺点** | 需要训练数据、增量更新较慢 |

    ```python
    store.create_index(index_type="ivfflat", params={
        "lists": 100  # number of inverted lists (default: 100)
    })
    ```

    <Note>IVFFlat 在训练前要求向量数量至少与 `lists` 相同。</Note>
  </Tab>
</Tabs>

## 表结构

向量表结构：

```sql
CREATE TABLE IF NOT EXISTS {table_name} (
    id TEXT PRIMARY KEY,
    vector VECTOR({dimension}),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW()
);
```

## 迁移说明

### 从其他向量存储迁移

```python
# Export from existing store
from semantica.vector_store import FAISSStore

faiss_store = FAISSStore(dimension=768)
# ... load existing index

# Migrate to PgVectorStore
pg_store = PgVectorStore(
    connection_string="postgresql://...",
    table_name="migrated_vectors",
    dimension=768,
    distance_metric="cosine"
)

# Get all vectors from source
all_ids = list(faiss_store.index.vector_ids)
all_vectors = [...]  # Get vectors from source
all_metadata = [faiss_store.index.metadata.get(id, {}) for id in all_ids]

# Batch insert
pg_store.add(all_vectors, all_metadata, all_ids)
```

### 备份与恢复

使用 PostgreSQL 原生备份工具：

```bash
# Backup
pg_dump -h localhost -U postgres -d semantica -t document_vectors > vectors_backup.sql

# Restore
psql -h localhost -U postgres -d semantica < vectors_backup.sql
```

## 配置

### 连接池设置

```python
store = PgVectorStore(
    connection_string="postgresql://...",
    table_name="vectors",
    dimension=768,
    distance_metric="cosine",
    pool_size=10,        # Max connections in pool
    max_overflow=10      # Extra connections beyond pool_size
)
```

### 环境变量

```bash
# Connection string via environment
export SEMANTICA_PGVECTOR_URL="postgresql://user:pass@host/db"
```

```python
import os

store = PgVectorStore(
    connection_string=os.getenv("SEMANTICA_PGVECTOR_URL"),
    table_name="vectors",
    dimension=768,
    distance_metric="cosine"
)
```

## 错误处理

常见错误及解决方案：

| 错误 | 原因 | 解决方案 |
| :------- | :------- | :---------- |
| `ProcessingError: pgvector extension is not installed` | PostgreSQL 中未安装 pgvector | 运行 `CREATE EXTENSION vector;` |
| `ValidationError: Unsupported distance metric` | 无效的度量 | 使用：`cosine`、`l2`、`inner_product` |
| `ValidationError: dimension mismatch` | 向量维度与存储维度不一致 | 确保维度一致 |
| `ProcessingError: Failed to initialize connection pool` | 连接问题 | 检查连接字符串和网络 |

## 性能调优

1. **为大型数据集使用索引**（>10k 个向量）
2. **调整 HNSW 参数**：更高的 `m` 和 `ef_construction` 意味着更好的召回率，但构建更慢
3. **连接池大小**：根据并发工作负载设置
4. **批量操作**：使用列表调用 `add()`，而不是逐条插入

## 测试

测试需要运行中的 PostgreSQL 并安装 pgvector：

```bash
# Start PostgreSQL with Docker
docker run -d \
    --name pgvector-test \
    -e POSTGRES_PASSWORD=postgres \
    -p 5432:5432 \
    ankane/pgvector:latest

# Run tests
pytest tests/vector_store/test_pgvector_store.py -v

# Or with specific connection string
TEST_PGVECTOR_URL="postgresql://postgres:postgres@localhost:5432/test" \
    pytest tests/vector_store/test_pgvector_store.py -v
```

## 另请参阅

- [pgvector 文档](https://github.com/pgvector/pgvector)
- [PgVector Python 客户端](https://github.com/pgvector/pgvector-python)
- [psycopg 文档](https://www.psycopg.org/)
- [向量存储模块](../reference/vector_store)