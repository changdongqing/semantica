---
title: "BigQuery 集成"
description: "从 Google BigQuery 表和查询中摄取结构化数据到 Semantica 的知识图谱流水线。"
icon: "google"
sourceHash: "4c7b17d8941693659cc1f24c458514bf5432fc9277c3df2b8725ed52bc2b83ac"
---

> 使用 Application Default Credentials 或服务账号密钥文件认证，从 BigQuery 表、查询和 schema 中提取数据到 Semantica。


## 安装

```bash
# Install with BigQuery support
pip install "semantica[db-bigquery]"

# Or install the connector separately
pip install google-cloud-bigquery>=3.0.0
```


## 基本用法

```python
import os
from semantica.ingest import BigQueryIngestor

ingestor = BigQueryIngestor(
    project=os.getenv("BIGQUERY_PROJECT"),
    dataset=os.getenv("BIGQUERY_DATASET"),
)

data = ingestor.ingest_table("orders", limit=1000)
print(f"Retrieved {data.row_count} rows, columns: {data.columns}")
```

<Tip>
使用环境变量（或配合 `python-dotenv` 使用 `.env` 文件）可以避免将配置写入源代码。设置 `BIGQUERY_PROJECT` 后，不带参数的 `BigQueryIngestor()` 会自动读取 `BIGQUERY_*` 环境变量。
</Tip>


## 认证

<Tabs>
  <Tab title="Application Default Credentials（推荐）">
    ```python
    import os
    from semantica.ingest import BigQueryIngestor

    ingestor = BigQueryIngestor(
        project=os.getenv("BIGQUERY_PROJECT"),
        dataset=os.getenv("BIGQUERY_DATASET"),
    )
    ```

    在环境中设置 `BIGQUERY_PROJECT`，并按需设置 `BIGQUERY_DATASET`：

    ```bash
    export BIGQUERY_PROJECT="my-gcp-project"
    export BIGQUERY_DATASET="my_dataset"
    ```

    ADC 会按以下顺序自动从环境中解析凭据：
    1. `GOOGLE_APPLICATION_CREDENTIALS` 环境变量（密钥文件路径）
    2. gcloud 默认凭据（`gcloud auth application-default login`）
    3. 附加的服务账号（GKE、Cloud Run、Vertex AI、Compute Engine）

    本地开发时：

    ```bash
    gcloud auth application-default login
    ```

    在生产环境中，如果工作负载身份已附加到服务账号，则无需凭据文件。
  </Tab>
  <Tab title="服务账号密钥文件">
    ```python
    import os
    from semantica.ingest import BigQueryIngestor

    ingestor = BigQueryIngestor(
        project=os.getenv("BIGQUERY_PROJECT"),
        dataset=os.getenv("BIGQUERY_DATASET"),
        credentials_file=os.getenv("BIGQUERY_CREDENTIALS_FILE"),
    )
    ```

    ```bash
    export BIGQUERY_PROJECT="my-gcp-project"
    export BIGQUERY_DATASET="my_dataset"
    export BIGQUERY_CREDENTIALS_FILE="/run/secrets/sa-key.json"
    ```

    在 GCP 控制台的
    **IAM & Admin → Service Accounts → [你的服务账号] → Keys** 中下载 JSON 密钥文件。
    请将其存放在版本控制之外，并通过密钥管理器或挂载卷注入。

    该服务账号至少需要项目上的 **BigQuery Data Viewer**
    （`roles/bigquery.dataViewer`）和 **BigQuery Job User**
    （`roles/bigquery.jobUser`）角色。
  </Tab>
</Tabs>


## 环境变量

所有构造函数参数都有对应的环境变量作为回退值：

| 变量 | 参数 | 默认值 |
|---|---|---|
| `BIGQUERY_PROJECT` | `project` | —（必填） |
| `BIGQUERY_DATASET` | `dataset` | — |
| `BIGQUERY_LOCATION` | `location` | 项目默认值 |
| `BIGQUERY_CREDENTIALS_FILE` | `credentials_file` | ADC |


## 表摄取

### 带筛选条件摄取表

```python
data = ingestor.ingest_table(
    "orders",
    where="status = 'shipped' AND created_date >= '2024-01-01'",
    order_by="created_date DESC",
    limit=50000,
)
print(f"Fetched {data.row_count} rows from {data.table_name}")
```

<Warning>
`where` 和 `order_by` 接受原始 SQL 片段。它们会经过黑名单校验（语句分隔符、UNION、DML/DDL 关键字、注释序列），但仅适用于可信的、由运维人员控制的输入。请勿将原始最终用户文本直接传给这些参数。
</Warning>

### 按调用覆盖 project 和 dataset

```python
data = ingestor.ingest_table(
    "transactions",
    project="analytics-project-456",
    dataset="finance",
    limit=10000,
)
```

### 从完全限定表名摄取

```python
# project and dataset on the ingestor default to the connector's values;
# you can override them at the call site for cross-project queries.
data = ingestor.ingest_table(
    "daily_sales",
    project="reporting-project",
    dataset="warehouse",
)
```


## 自定义 SQL 查询

```python
data = ingestor.ingest_query("""
    SELECT
        customer_id,
        SUM(amount) AS total_amount,
        COUNT(*) AS order_count
    FROM `my-project`.`sales`.`orders`
    WHERE DATE(created_at) >= '2024-01-01'
    GROUP BY customer_id
    ORDER BY total_amount DESC
    LIMIT 1000
""")
print(f"Query returned {data.row_count} rows")
```

查询字符串会原样传给 BigQuery。调用方需自行负责 SQL 的正确性与安全性。

### 参数化查询

```python
from google.cloud import bigquery

job_config = bigquery.QueryJobConfig(
    query_parameters=[
        bigquery.ScalarQueryParameter("min_amount", "FLOAT64", 100.0),
    ]
)

data = ingestor.ingest_query(
    "SELECT id, amount FROM `my-project`.`sales`.`orders` WHERE amount >= @min_amount",
    job_config=job_config,
)
```


## Schema 检查

```python
# Inspect columns for a table
schema = ingestor.get_table_schema("orders")

print(f"Row count: {schema['num_rows']}")
print(f"Clustering fields: {schema['clustering_fields']}")
for col in schema["columns"]:
    nullable = "NULLABLE" if col["nullable"] else "REQUIRED"
    print(f"  {col['name']}: {col['type']} ({nullable})")
```

### 列出 dataset 中的表

```python
tables = ingestor.list_tables()
print(f"Tables in dataset: {tables}")
# ['customers', 'orders', 'products', 'returns']

# Or specify a different dataset
tables = ingestor.list_tables(dataset="analytics", project="my-other-project")
```


## 导出为 Semantica 文档

将摄取的行转换为 Semantica 文档格式，以便与 `GraphBuilder` 配合使用：

```python
documents = ingestor.export_as_documents(
    data,
    id_field="order_id",              # field to use as document ID
    text_fields=["customer_name", "product_name", "notes"],
)

print(f"Created {len(documents)} documents")
# Each document:
# {
#   "id": "ORD-12345",
#   "text": "Alice Smith Widget Pro Shipped on time",
#   "metadata": {
#     "source": "bigquery",
#     "table": "orders",
#     "project": "my-gcp-project",
#     "dataset": "sales",
#     "location": "US",
#     "row_data": { ... full original row ... }
#   }
# }
```

将文档直接传入 `GraphBuilder`：

```python
from semantica.kg import GraphBuilder

builder = GraphBuilder()
kg = builder.build(documents)
```

省略 `text_fields` 时，每行中所有 `str` 类型的列值会被拼接成文档文本。Integer、float、Decimal 和 `None` 值不参与默认的文本组合。


## 上下文管理器

批量查询建议使用上下文管理器——它在进入时打开一个客户端、退出时关闭，因此 `with` 块内的每次调用都会复用同一已认证会话：

```python
import os
from semantica.ingest import BigQueryIngestor

with BigQueryIngestor(
    project=os.getenv("BIGQUERY_PROJECT"),
    dataset=os.getenv("BIGQUERY_DATASET"),
) as bq:
    orders = bq.ingest_table("orders", limit=10000)
    customers = bq.ingest_table("customers", limit=5000)
    tables = bq.list_tables()
    schema = bq.get_table_schema("orders")
```

在上下文管理器之外，每次方法调用都会独立打开并关闭一个临时客户端。


## 连接测试

```python
import os
from semantica.ingest import BigQueryConnector

connector = BigQueryConnector(
    project=os.getenv("BIGQUERY_PROJECT"),
)
if connector.test_connection():
    print("Connected to BigQuery successfully.")
else:
    print("Connection failed — check project ID and credentials.")
```


## 故障排查

**`ImportError: BigQuery ingestion requires optional dependency 'google-cloud-bigquery'`**

安装可选依赖项：

```bash
pip install "semantica[db-bigquery]"
```

**`google.auth.exceptions.DefaultCredentialsError`**

环境中未找到凭据。可以：
- 本地开发时运行 `gcloud auth application-default login`，或
- 将 `GOOGLE_APPLICATION_CREDENTIALS` 设置为服务账号 JSON 密钥文件的路径，或
- 将 `BIGQUERY_CREDENTIALS_FILE` 设置为服务账号 JSON 密钥文件的路径。

**`google.api_core.exceptions.Forbidden`**

服务账号或用户账号没有访问该 dataset 或表的权限。请确保该账号至少具备：
- dataset 或项目上的 `roles/bigquery.dataViewer`
- 项目上的 `roles/bigquery.jobUser`

**`ValidationError: Invalid BigQuery project ID`**

Project ID 只能包含字母、数字、连字符和下划线，且必须以字母开头。仅含数字或以连字符开头的 Project ID 会被拒绝。

**`ValidationError: Invalid table_name`**

表名和 dataset 名必须以字母或下划线开头，且只能包含字母、数字和下划线。表名和 dataset 名中不允许使用连字符（请改用下划线）。

**查询缓慢**

使用 `limit` 和 `where` 限制拉取的行数。对于大型分析查询，考虑使用 `ingest_query()` 配合预聚合的 SQL 语句，而不是摄取原始表行。


## 另请参阅

- [Ingest 模块](../reference/ingest) — 完整的 `BigQueryIngestor` API 以及所有其他摄取器。
- [Snowflake 集成](/zh/integrations/snowflake) — 设计类似的数仓连接器。
- [Redshift 集成](/zh/integrations/redshift) — AWS Redshift 连接器。
- [Databricks 集成](/zh/integrations/databricks) — Lakehouse 连接器。
- [安装](../installation) — 所有可选依赖项。
- [知识图谱](../reference/kg) — 从摄取的 BigQuery 数据构建知识图谱。