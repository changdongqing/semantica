---
title: "Apache Cassandra 集成"
description: "将 Apache Cassandra 表中的结构化数据摄取到 Semantica 的知识图谱流程中。"
icon: "database"
sourceHash: "d126edec9bdc36a960cf0433b69dcbb3df518c0d7a9b07dd2ffc6856183bc25e"
---

> 使用官方 `cassandra-driver` 将 Apache Cassandra 表中的数据提取到 Semantica 中。

## 安装

```bash
# Install with Cassandra support
pip install "semantica[db-cassandra]"

# Or install the connector separately
pip install "cassandra-driver>=3.29.0"
```

`cassandra-driver` 是可选依赖。直接执行 `pip install semantica` 不会安装它，Cassandra 连接器会在首次使用时惰性加载。

## 基本用法

```python
import os
from semantica.ingest import CassandraIngestor

ingestor = CassandraIngestor(
    hosts=os.getenv("CASSANDRA_HOSTS", "127.0.0.1").split(","),
    port=int(os.getenv("CASSANDRA_PORT", "9042")),
    username=os.getenv("CASSANDRA_USERNAME"),
    password=os.getenv("CASSANDRA_PASSWORD"),
    keyspace=os.getenv("CASSANDRA_KEYSPACE"),
)

data = ingestor.ingest_table("users")

print(f"Retrieved {data.row_count} rows")
print(f"Columns: {data.columns}")
```

<Tip>
使用环境变量，避免将 Cassandra 凭据写入源代码。
</Tip>

## 身份验证

对于启用了身份验证的 Cassandra 集群：

```python
from semantica.ingest import CassandraIngestor

ingestor = CassandraIngestor(
    hosts=["127.0.0.1"],
    port=9042,
    username="cassandra",
    password="your-password",
    keyspace="my_keyspace",
)
```

对于未启用身份验证的集群：

```python
from semantica.ingest import CassandraIngestor

ingestor = CassandraIngestor(
    hosts=["127.0.0.1"],
    port=9042,
    keyspace="my_keyspace",
)
```

## 查询

### 摄取表

```python
data = ingestor.ingest_table("orders")
print(f"{data.row_count} rows, columns: {data.columns}")
```

### 限制返回行数

```python
data = ingestor.ingest_table(
    "orders",
    limit=1000,
)
```

`limit` 会被转换为 CQL 的 `LIMIT` 子句。

## 模式发现

```python
schema = ingestor.get_table_schema("users")

for column in schema["columns"]:
    print(
        f"{column['name']}: "
        f"{column['type']} "
        f"(nullable={column['nullable']})"
    )

print("Primary keys:", schema["primary_keys"])
```

每个列包含以下字段：

| 键 | 类型 | 描述 |
|---|---|---|
| `name` | `str` | 列名 |
| `type` | `str` | Cassandra CQL 类型 |
| `nullable` | `bool` | 该列是否可为空 |
| `primary_key` | `bool` | 该列是否为主键的一部分 |
| `static` | `bool` | 该列是否为静态列 |

`primary_keys` 按 Cassandra 中的顺序包含表的主键列名。

## 导出为 Semantica 文档

```python
documents = ingestor.export_as_documents(
    data,
    id_field="id",
    text_fields=["name", "city"],
)

print(f"Created {len(documents)} documents")
```

每个文档包含：

```python
{
    "id": "123",
    "text": "Alice Delhi",
    "metadata": {
        "source": "cassandra",
        "keyspace": "my_keyspace",
        "table": "users",
        "row_data": {}
    }
}
```

**ID 解析**：配置的 `id_field` 会被转换为字符串。若该字段不存在，则使用行索引作为确定性的回退值。

**提供 `text_fields` 时的文本**：非 `None` 的值会被转换为字符串，并使用单个空格连接。

**`text_fields=None` 时的文本**：文档文本中仅包含字符串类型的值。

## 连接测试

```python
from semantica.ingest import CassandraConnector

connector = CassandraConnector(
    hosts=["127.0.0.1"],
    port=9042,
    keyspace="my_keyspace",
)

if connector.test_connection():
    print("Connection OK")
else:
    print("Connection failed")
```

## 另请参阅

- [摄取模块](../reference/ingest)
- [Redshift 集成](/zh/integrations/redshift)
- [Databricks 集成](/zh/integrations/databricks)
- [安装](../installation)
- [知识图谱](../reference/kg)