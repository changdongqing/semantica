---
title: "Snowflake 集成"
description: "将 Snowflake 表和查询中的结构化数据摄取到 Semantica 的 KG 流水线中。"
icon: "snowflake"
sourceHash: "09a2807676c304e97d4c1b069e7d69e59ad068d1bef60df65e88629a9e275b5b"
---

> 使用密码、密钥对、OAuth 和 SSO 认证将 Snowflake 数据提取到 Semantica。


## 安装

```bash
# Install with Snowflake support
pip install "semantica[db-snowflake]"

# Or install the connector separately
pip install snowflake-connector-python
```


## 基本用法

```python
from semantica.ingest import SnowflakeIngestor
import os

ingestor = SnowflakeIngestor(
    account=os.getenv("SNOWFLAKE_ACCOUNT"),
    user=os.getenv("SNOWFLAKE_USER"),
    password=os.getenv("SNOWFLAKE_PASSWORD"),
    warehouse=os.getenv("SNOWFLAKE_WAREHOUSE"),
    database=os.getenv("SNOWFLAKE_DATABASE"),
    schema=os.getenv("SNOWFLAKE_SCHEMA"),
)

data = ingestor.ingest_table("CUSTOMERS")
print(f"Retrieved {data.row_count} rows: columns: {data.columns}")
```

<Tip>
使用环境变量（或配合 `python-dotenv` 的 `.env` 文件）可让凭据不出现在源码中。不带参数调用 `SnowflakeIngestor()` 时，会自动从 `SNOWFLAKE_*` 环境变量读取配置。
</Tip>


## 认证方式

<Tabs>
  <Tab title="密码">
    ```python
    ingestor = SnowflakeIngestor(
        account="myaccount",
        user="myuser",
        password="mypassword",
        warehouse="COMPUTE_WH",
    )
    ```
  </Tab>
  <Tab title="密钥对（推荐）">
    ```python
    ingestor = SnowflakeIngestor(
        account="myaccount",
        user="myuser",
        private_key_path="/path/to/rsa_key.p8",
        warehouse="COMPUTE_WH",
    )
    ```
    生产环境首选：配置中不存储密码。
  </Tab>
  <Tab title="OAuth">
    ```python
    ingestor = SnowflakeIngestor(
        account="myaccount",
        user="myuser",
        authenticator="oauth",
        token="your_oauth_token",
        warehouse="COMPUTE_WH",
    )
    ```
  </Tab>
  <Tab title="SSO">
    ```python
    ingestor = SnowflakeIngestor(
        account="myaccount",
        user="myuser",
        authenticator="externalbrowser",
        warehouse="COMPUTE_WH",
    )
    ```
  </Tab>
</Tabs>


## 查询

### 带过滤条件摄取表

```python
data = ingestor.ingest_table(
    "CUSTOMERS",
    where="COUNTRY = 'USA' AND CREATED_DATE > '2024-01-01'",
    order_by="CREATED_DATE DESC",
    limit=10000,
)
```

### 自定义 SQL

```python
data = ingestor.ingest_query("""
    SELECT CUSTOMER_ID, SUM(AMOUNT) AS TOTAL_AMOUNT
    FROM SALES
    WHERE DATE >= '2024-01-01'
    GROUP BY CUSTOMER_ID
""")
```

### Schema 内省

```python
schema = ingestor.get_table_schema("CUSTOMERS")
for column in schema["columns"]:
    print(f"{column['name']}: {column['type']}")
```


## 导出为 Semantica 文档

```python
documents = ingestor.export_as_documents(
    data,
    id_field="CUSTOMER_ID",
    text_fields=["NAME", "EMAIL", "NOTES"],
)
print(f"Created {len(documents)} documents for processing")
```


## 大表批处理

```python
PAGE_SIZE = 5000
for page in range(total_pages):
    data = ingestor.ingest_table(
        "LARGE_TABLE",
        limit=PAGE_SIZE,
        offset=page * PAGE_SIZE,
    )
    process_batch(data)
```

或使用内置的 `batch_size` 参数：

```python
data = ingestor.ingest_query(
    "SELECT * FROM LARGE_TABLE",
    batch_size=5000,
)
```


## 故障排查

```python
from semantica.ingest import SnowflakeConnector

connector = SnowflakeConnector(account="myaccount", user="myuser", password="mypassword")
if not connector.test_connection():
    print("Connection failed: check credentials and account identifier")
```


## 另请参阅

- [摄取模块](../reference/ingest) — 完整的 SnowflakeIngestor 及所有其他摄取器。
- [Databricks 集成](/zh/integrations/databricks) — 适用于 Snowflake + Databricks 混合环境的配套连接器。
- [流水线](../reference/pipeline) — 将 Snowflake 摄取用作流水线步骤。
- [安装](../installation) — 所有可选依赖扩展。
- [知识图谱](../reference/kg) — 从摄取的 Snowflake 数据构建 KG。