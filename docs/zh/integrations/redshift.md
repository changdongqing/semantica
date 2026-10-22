---
title: "Amazon Redshift 集成"
description: "将 Amazon Redshift 表与查询中的结构化数据摄取到 Semantica 的知识图谱流水线中。"
icon: "database"

sourceHash: "763d563d439091d54ecd3e178932d91084d04573fb0cd105da0781bc7a3c3b20"
---

> 使用密码/原生或 IAM 角色认证，通过 PostgreSQL 兼容的线协议将数据从 Amazon Redshift 抽取到 Semantica。


## 安装

```bash
# Install with Redshift support
pip install "semantica[db-redshift]"

# Or install the connector separately
pip install redshift-connector>=2.0.0
```

`redshift-connector` 是可选依赖。直接执行 `pip install semantica` 不会将其引入，`import semantica.ingest` 也不会立即加载它——只有在首次使用 `RedshiftConnector` 或 `RedshiftIngestor` 时才会导入该 SDK。

<Note>
此连接器通过 Redshift 数据库线协议进行读取摄取。COPY、UNLOAD、S3 集成、Spectrum 外部表和 Redshift Data API 不在本集成的当前范围内。
</Note>


## 基本用法

```python
from semantica.ingest import RedshiftIngestor
import os

ingestor = RedshiftIngestor(
    host=os.getenv("REDSHIFT_HOST"),
    database=os.getenv("REDSHIFT_DATABASE"),
    user=os.getenv("REDSHIFT_USER"),
    password=os.getenv("REDSHIFT_PASSWORD"),
)

data = ingestor.ingest_table("customers")
print(f"Retrieved {data.row_count} rows — columns: {data.columns}")
```

<Tip>
使用环境变量（或配合 `python-dotenv` 的 `.env` 文件）让凭据远离源代码。不带参数的 `RedshiftIngestor()` 会自动读取 `REDSHIFT_*` 环境变量。
</Tip>


## 认证

<Tabs>
  <Tab title="密码 / 原生">
    Redshift 数据库的标准用户名和密码：

    ```python
    import os
    from semantica.ingest import RedshiftIngestor

    ingestor = RedshiftIngestor(
        host=os.getenv("REDSHIFT_HOST"),       # e.g. cluster.abc.us-east-1.redshift.amazonaws.com
        database=os.getenv("REDSHIFT_DATABASE"),
        user=os.getenv("REDSHIFT_USER"),
        password=os.getenv("REDSHIFT_PASSWORD"),
        port=5439,    # default; omit to use the default
        ssl=True,     # default
    )
    ```

    必需的环境变量：

    ```bash
    export REDSHIFT_HOST="cluster.abc.us-east-1.redshift.amazonaws.com"
    export REDSHIFT_DATABASE="dev"
    export REDSHIFT_USER="awsuser"
    export REDSHIFT_PASSWORD="your-password"
    ```
  </Tab>
  <Tab title="IAM 角色（AWS 推荐）">
    使用 `iam=True` 通过 `GetClusterCredentials` 获取临时凭据。连接器将凭据解析完全委托给 `redshift-connector` / boto3 —— Semantica 从不直接调用 AWS API。

    **基于 profile**（读取 `~/.aws/credentials`）：

    ```python
    import os
    from semantica.ingest import RedshiftIngestor

    ingestor = RedshiftIngestor(
        host=os.getenv("REDSHIFT_HOST"),
        database=os.getenv("REDSHIFT_DATABASE"),
        iam=True,
        db_user=os.getenv("REDSHIFT_DB_USER"),
        cluster_identifier=os.getenv("REDSHIFT_CLUSTER_IDENTIFIER"),
        profile="default",   # AWS credentials-file profile
    )
    ```

    **显式 AWS 凭据**（例如用于 CI/CD 或使用短期密钥的 IAM 角色）：

    ```python
    ingestor = RedshiftIngestor(
        host=os.getenv("REDSHIFT_HOST"),
        database=os.getenv("REDSHIFT_DATABASE"),
        iam=True,
        db_user=os.getenv("REDSHIFT_DB_USER"),
        cluster_identifier=os.getenv("REDSHIFT_CLUSTER_IDENTIFIER"),
        region=os.getenv("REDSHIFT_REGION"),
        access_key_id=os.getenv("REDSHIFT_ACCESS_KEY_ID"),
        secret_access_key=os.getenv("REDSHIFT_SECRET_ACCESS_KEY"),
        session_token=os.getenv("REDSHIFT_SESSION_TOKEN"),  # only for temporary creds
    )
    ```

    当既未提供 `profile` 也未提供显式密钥时，`redshift-connector` 会回退到标准 AWS 凭据链：`AWS_*` 环境变量、实例配置文件元数据等。

    IAM 模式必需项：`host`、`database`、`db_user`、`cluster_identifier`。当可从凭据链或集群端点推断时，`region` 参数是可选的。
  </Tab>
</Tabs>


## 环境变量

所有构造函数参数都有对应的 `REDSHIFT_*` 环境变量回退值。显式传入的构造函数值始终优先。

| 变量 | 参数 | 默认值 |
|---|---|---|
| `REDSHIFT_HOST` | `host` | — |
| `REDSHIFT_DATABASE` | `database` | — |
| `REDSHIFT_USER` | `user` | — |
| `REDSHIFT_PASSWORD` | `password` | — |
| `REDSHIFT_PORT` | `port` | `5439` |
| `REDSHIFT_SCHEMA` | `schema` | `"public"` |
| `REDSHIFT_DB_USER` | `db_user` | — |
| `REDSHIFT_CLUSTER_IDENTIFIER` | `cluster_identifier` | — |
| `REDSHIFT_REGION` | `region` | — |
| `REDSHIFT_PROFILE` | `profile` | — |
| `REDSHIFT_ACCESS_KEY_ID` | `access_key_id` | — |
| `REDSHIFT_SECRET_ACCESS_KEY` | `secret_access_key` | — |
| `REDSHIFT_SESSION_TOKEN` | `session_token` | — |


## 查询

### 摄取表

```python
data = ingestor.ingest_table("orders")
print(f"{data.row_count} rows, columns: {data.columns}")
```

### Schema、过滤条件与分页

```python
data = ingestor.ingest_table(
    "orders",
    schema="sales",          # defaults to the ingestor's schema attribute ("public")
    database="analytics",    # defaults to the connector's database
    where="status = 'shipped' AND total > 100",
    order_by="created_at DESC",
    limit=5000,
    offset=0,
)
```

<Warning>
`where` 和 `order_by` 接受原始 SQL 片段，必须是可信的、由操作方控制的输入。不要在此传入原始终端用户字符串。它们会经过黑名单校验，拒绝语句分隔符、`UNION`、DML/DDL 关键字以及基于时间的注入模式，但这并不是完整的解析器。
</Warning>

### 自定义 SQL

```python
data = ingestor.ingest_query("""
    SELECT customer_id, SUM(total) AS lifetime_value
    FROM sales.orders
    WHERE status = 'completed'
    GROUP BY customer_id
    ORDER BY lifetime_value DESC
    LIMIT 1000
""")
print(f"{data.row_count} rows")
```

### 参数化查询

使用 `%s` 占位符（DB-API 2.0 `format` 参数风格，这也是 `redshift-connector` 的默认风格）：

```python
data = ingestor.ingest_query(
    "SELECT id, name FROM users WHERE region = %s AND active = %s",
    params=("us-east-1", True),
)
```

### 大批量结果集的分批获取

使用 `batch_size` 控制驱动程序的获取大小——行将按该大小从服务器分块获取，而不是一次性全部获取，每一块在请求下一块之前立即完成转换：

```python
data = ingestor.ingest_query(
    "SELECT * FROM large_events_table",
    batch_size=10000,
)
```

`batch_size` 控制驱动程序每次往返从 Redshift 读取的行数。返回的 `RedshiftData.data` 列表仍包含所有匹配行；如需限制结果总数，请在查询本身中使用 `LIMIT`/`OFFSET`。


## Schema 发现

### 列出 Schema 中的基础表

```python
tables = ingestor.list_tables(schema="public")
print(tables)  # ["customers", "orders", "products", ...]
```

视图会被排除；仅返回基础表。

### 检查列元数据

```python
schema = ingestor.get_table_schema("customers", schema="public")

for col in schema["columns"]:
    print(f"{col['name']}: {col['type']} (nullable={col['nullable']})")

print("Primary keys:", schema["primary_keys"])
```

每个列的 dict 包含：

| 键 | 类型 | 描述 |
|---|---|---|
| `name` | `str` | 列名 |
| `type` | `str` | Redshift 数据类型（如 `"integer"`、`"character varying"`） |
| `nullable` | `bool` | 该列是否接受 `NULL` |

`primary_keys` 是列名字符串列表（未定义主键时为空列表）。


## 导出为 Semantica 文档

将摄取的行转换为 `GraphBuilder` 使用的文档格式：

```python
documents = ingestor.export_as_documents(
    data,
    id_field="customer_id",        # column used as document ID; defaults to "id"
    text_fields=["name", "notes"], # columns joined as document text; omit to auto-select
)

print(f"Created {len(documents)} documents")
# Each document:
# {
#   "id": "12345",
#   "text": "Alice Acme customer notes here",
#   "metadata": {
#     "source": "redshift",
#     "table": "customers",
#     "database": "analytics",
#     "schema": "public",
#     "row_data": { ... full cleaned row ... }
#   }
# }
```

**ID 解析**：`str(row.get(id_field, row_index))` —— 当 `id_field` 列不存在时，使用整数行索引作为确定性的回退值。

**提供 `text_fields` 时的文本**：每个非 `None` 字段值都会转换为字符串，并用单个空格连接。

**`text_fields=None` 时的文本**：仅连接值本身已是 `str` 类型的列。整数、浮点数、布尔值和 `None` 值会被排除，与 Snowflake 和 Databricks 连接器的行为一致。

将文档直接传给 `GraphBuilder`：

```python
from semantica.kg import GraphBuilder

builder = GraphBuilder()
graph = builder.build(documents)
print(f"Entities: {graph['metadata']['num_entities']}")
```


## 上下文管理器

对于运行多个查询的任务，优先使用上下文管理器——它在进入时打开一个连接，在退出时关闭，因此 `with` 块内的每次调用都会复用同一个已认证会话：

```python
with RedshiftIngestor(
    host=os.getenv("REDSHIFT_HOST"),
    database=os.getenv("REDSHIFT_DATABASE"),
    user=os.getenv("REDSHIFT_USER"),
    password=os.getenv("REDSHIFT_PASSWORD"),
) as ingestor:
    customers = ingestor.ingest_table("customers", limit=50000)
    orders    = ingestor.ingest_table("orders",    limit=50000)
    schema    = ingestor.get_table_schema("customers")
    tables    = ingestor.list_tables()
# Connection closed automatically on exit, even if an exception is raised.
```

独立调用（不使用 `with`）会在每次调用时打开并关闭一个临时连接。


## 连接测试

```python
from semantica.ingest import RedshiftConnector

connector = RedshiftConnector(
    host="cluster.abc.us-east-1.redshift.amazonaws.com",
    database="dev",
    user="awsuser",
    password="your-password",
)
if connector.test_connection():
    print("Connection OK")
else:
    print("Connection failed — check host, credentials, and network access")
```


## 另见

- [Ingest 模块](../reference/ingest) —— 完整的 `RedshiftIngestor` 参考以及所有其他摄取器。
- [Snowflake 集成](/zh/integrations/snowflake) —— 具有类似表/查询摄取能力的 SQL 数据仓库连接器。
- [Databricks 集成](/zh/integrations/databricks) —— Delta Lake / Unity Catalog 连接器。
- [流水线](../reference/pipeline) —— 将 Redshift 摄取用作流水线步骤。
- [安装](../installation) —— 所有可选依赖 extra。
- [知识图谱](../reference/kg) —— 基于摄取的 Redshift 数据构建知识图谱。