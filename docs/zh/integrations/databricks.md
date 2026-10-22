---
title: "Databricks 集成"
description: "从 Databricks 摄取 Unity Catalog 元数据与 Delta Lake 表到 Semantica 的 KG 流水线。"
icon: "cloud"
sourceHash: "eb5385f050e8cde47ee3042091feea568a51477a6f8098139fbcf4e6784f9c8e"
---

> 使用个人访问令牌或 OAuth M2M 认证，从 Databricks 提取 Delta Lake 表与 Unity Catalog 元数据（schema、血缘）到 Semantica。


## 安装

```bash
# Install with Databricks support
pip install "semantica[db-databricks]"

# Or install the connectors separately
pip install databricks-sdk databricks-sql-connector
```


## 基本用法

```python
from semantica.ingest import DatabricksIngestor
import os

ingestor = DatabricksIngestor(
    host=os.getenv("DATABRICKS_HOST"),           # e.g. https://adb-xxx.azuredatabricks.net
    token=os.getenv("DATABRICKS_TOKEN"),
    http_path=os.getenv("DATABRICKS_HTTP_PATH"),  # SQL warehouse or cluster HTTP path
    catalog=os.getenv("DATABRICKS_CATALOG", "main"),
    schema=os.getenv("DATABRICKS_SCHEMA", "default"),
)

data = ingestor.ingest_table("customers")
print(f"Retrieved {data.row_count} rows: columns: {data.columns}")
```

<Tip>
使用环境变量（或配合 `python-dotenv` 的 `.env` 文件）可避免将凭据写入源代码。不带参数调用 `DatabricksIngestor()` 时，会自动读取 `DATABRICKS_*` 环境变量。
</Tip>


## 认证方式

<Tabs>
  <Tab title="个人访问令牌">
    ```python
    ingestor = DatabricksIngestor(
        host="https://adb-xxx.azuredatabricks.net",
        token="dapi-xxxxxxxx",
        http_path="/sql/1.0/warehouses/xxxxxxxx",
    )
    ```
  </Tab>
  <Tab title="OAuth M2M（推荐）">
    ```python
    ingestor = DatabricksIngestor(
        host="https://adb-xxx.azuredatabricks.net",
        client_id="your_service_principal_client_id",
        client_secret="your_service_principal_client_secret",
        http_path="/sql/1.0/warehouses/xxxxxxxx",
    )
    ```
    生产环境首选：无需在配置中保存长期有效的个人令牌。
  </Tab>
</Tabs>

<Note>
`http_path` 指定用于执行查询的 SQL warehouse 或全用途集群。可在 Databricks UI 的 **SQL Warehouses → Connection details** 中找到它。Unity Catalog 元数据调用（`list_catalogs`、`get_table_schema`、`get_table_lineage` 等）仅需 `host` 和凭据——这些调用不需要 `http_path`。
</Note>


## 查询

### 带过滤条件摄取表

```python
data = ingestor.ingest_table(
    "customers",
    catalog="main",
    schema="default",
    where="country = 'USA' AND created_date > '2024-01-01'",
    order_by="created_date DESC",
    limit=10000,
)
```

### 自定义 SQL

```python
data = ingestor.ingest_query("""
    SELECT customer_id, SUM(amount) AS total_amount
    FROM main.default.sales
    WHERE date >= '2024-01-01'
    GROUP BY customer_id
""")
```


## Unity Catalog 元数据

### Schema 内省

```python
schema = ingestor.get_table_schema("customers")
for column in schema["columns"]:
    print(f"{column['name']}: {column['type']}")
```

### Catalog、Schema 与表

```python
catalogs = ingestor.list_catalogs()
schemas = ingestor.list_schemas(catalog="main")
tables = ingestor.list_tables(catalog="main", schema="default")
```

### 表级与列级血缘

```python
lineage = ingestor.get_table_lineage("customers", catalog="main", schema="default")
print(lineage["upstream"])    # tables that feed into `customers`
print(lineage["downstream"])  # tables derived from `customers`
```

使用 `get_table_lineage` 可直接基于 Unity Catalog 的血缘追踪，在知识图谱中构建 `Table --DEPENDS_ON--> Table` 边，无需再从查询日志中重新推导血缘。

<Tip>
传入 `include_column_lineage=True` 还可解析逐列的上游/下游引用（每列会额外发起一次 Unity Catalog 请求，因此为按需开启）：

```python
lineage = ingestor.get_table_lineage(
    "customers", catalog="main", schema="default", include_column_lineage=True,
)
print(lineage["columns"]["email"])
# {"upstream": ["main.default.raw_customers.email_address"], "downstream": []}
```

</Tip>


## 导出为 Semantica 文档

```python
documents = ingestor.export_as_documents(
    data,
    id_field="customer_id",
    text_fields=["name", "email", "notes"],
)
print(f"Created {len(documents)} documents for processing")
```


## 大批量表的批处理

```python
PAGE_SIZE = 5000
for page in range(total_pages):
    data = ingestor.ingest_table(
        "large_table",
        limit=PAGE_SIZE,
        offset=page * PAGE_SIZE,
    )
    process_batch(data)
```

或使用内置的 `batch_size` 参数：

```python
data = ingestor.ingest_query(
    "SELECT * FROM main.default.large_table",
    batch_size=5000,
)
```


## 故障排查

```python
from semantica.ingest import DatabricksConnector

connector = DatabricksConnector(
    host="https://adb-xxx.azuredatabricks.net",
    token="dapi-xxxxxxxx",
    http_path="/sql/1.0/warehouses/xxxxxxxx",
)
if not connector.test_connection():
    print("Connection failed: check host, http_path, and credentials")
```


## 另请参阅

- [Ingest 模块](../reference/ingest) — 完整的 DatabricksIngestor 及所有其他摄取器。
- [Snowflake 集成](/zh/integrations/snowflake) — 适用于 Snowflake + Databricks 混合环境的配套连接器。
- [流水线](../reference/pipeline) — 将 Databricks 摄取作为流水线步骤使用。
- [安装](../installation) — 所有可选依赖扩展。
- [知识图谱](../reference/kg) — 基于摄取的 Databricks 数据构建 KG。