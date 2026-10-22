---
title: "Salesforce 集成"
description: "从 Salesforce sObject 和 SOQL 查询中摄取 CRM 记录，送入 Semantica 的知识图谱流水线。"
icon: "cloud"
sourceHash: "b55635cb796a5ec9ed38f614c6cdf3d35973aae6e42d837afd5a199df0e7d63d"
---

> 通过用户名/密码/安全令牌、JWT bearer 或基于会话的认证方式，将 Salesforce 中的 Account、Contact、Opportunity 以及自定义对象提取到 Semantica。


## 安装

```bash
# Install with Salesforce support
pip install "semantica[db-salesforce]"

# Or install the connector separately
pip install simple-salesforce>=1.12.0
```


## 基本用法

```python
from semantica.ingest import SalesforceIngestor
import os

ingestor = SalesforceIngestor(
    username=os.getenv("SALESFORCE_USERNAME"),
    password=os.getenv("SALESFORCE_PASSWORD"),
    security_token=os.getenv("SALESFORCE_SECURITY_TOKEN"),
    domain=os.getenv("SALESFORCE_DOMAIN", "login"),   # "test" for sandbox
)

data = ingestor.ingest_sobject("Account", fields=["Id", "Name", "Industry"], limit=1000)
print(f"Retrieved {data.row_count} of {data.total_size} matching records")
print(f"Columns: {data.columns}")
```

<Tip>
使用环境变量（或配合 `python-dotenv` 使用 `.env` 文件）来避免将凭据写入源码。无参数调用 `SalesforceIngestor()` 时会自动从 `SALESFORCE_*` 环境变量中读取配置。
</Tip>


## 认证方式

<Tabs>
  <Tab title="用户名 / 密码 / 安全令牌">
    ```python
    import os
    from semantica.ingest import SalesforceIngestor

    ingestor = SalesforceIngestor(
        username=os.getenv("SALESFORCE_USERNAME"),
        password=os.getenv("SALESFORCE_PASSWORD"),
        security_token=os.getenv("SALESFORCE_SECURITY_TOKEN"),
        domain="login",   # production; use "test" for sandbox
    )
    ```
    在运行前设置所需的环境变量：
    ```bash
    export SALESFORCE_USERNAME="your-username@example.com"
    export SALESFORCE_PASSWORD="your-password"
    export SALESFORCE_SECURITY_TOKEN="your-security-token"
    ```
    这是标准的服务端认证流程。在 Salesforce SOAP 登录过程中，安全令牌会被
    追加到密码之后。你可以在
    **Settings → My Personal Information → Reset My Security Token** 下生成或重置它。
  </Tab>
  <Tab title="JWT Bearer（推荐用于 CI/CD）">
    ```python
    import os
    from semantica.ingest import SalesforceIngestor

    ingestor = SalesforceIngestor(
        username=os.getenv("SALESFORCE_USERNAME"),
        consumer_key=os.getenv("SALESFORCE_CONSUMER_KEY"),
        privatekey_file=os.getenv("SALESFORCE_PRIVATE_KEY_FILE"),
        domain="login",   # or "test" for sandbox
    )
    ```
    ```bash
    export SALESFORCE_USERNAME="your-username@example.com"
    export SALESFORCE_CONSUMER_KEY="your-connected-app-consumer-key"
    export SALESFORCE_PRIVATE_KEY_FILE="/path/to/server.key"
    ```
    JWT bearer 流程使用签名令牌进行认证——不会传输密码。
    它非常适合服务器到服务器的集成以及 CI/CD
    流水线。需要在 Salesforce 中配置一个连接应用，并启用
    **Use digital signatures**，同时在
    **Manage → Profiles / Permission Sets** 下列出预授权的用户。

    如果你希望以字符串形式而非文件路径传入密钥材料，
    可使用 `SALESFORCE_PRIVATE_KEY`（PEM 内容）来替代
    `SALESFORCE_PRIVATE_KEY_FILE`。
  </Tab>
  <Tab title="会话 ID + 实例 URL">
    ```python
    ingestor = SalesforceIngestor(
        session_id=os.getenv("SALESFORCE_SESSION_ID"),
        instance_url=os.getenv("SALESFORCE_INSTANCE_URL"),
    )
    ```
    当你的环境已经自行管理 OAuth 令牌的生命周期时（例如某个连接应用
    通过 web-server 或 device 流程获取令牌），请使用这种方式。将访问令牌作为
    `session_id` 传入，并将完整的实例 URL（例如 `https://myorg.my.salesforce.com`）
    作为 `instance_url` 传入。
  </Tab>
  <Tab title="沙盒">
    ```python
    import os
    from semantica.ingest import SalesforceIngestor

    ingestor = SalesforceIngestor(
        username=os.getenv("SALESFORCE_USERNAME"),
        password=os.getenv("SALESFORCE_PASSWORD"),
        security_token=os.getenv("SALESFORCE_SECURITY_TOKEN"),
        domain="test",   # routes to test.salesforce.com
    )
    ```
    ```bash
    export SALESFORCE_USERNAME="your-sandbox-username@example.com.sandbox"
    export SALESFORCE_PASSWORD="your-password"
    export SALESFORCE_SECURITY_TOKEN="your-security-token"
    export SALESFORCE_DOMAIN="test"
    ```
    将 `domain="login"` 替换为 `domain="test"`（或在环境中设置
    `SALESFORCE_DOMAIN=test`）即可连接到
    开发者沙盒或完整沙盒。
  </Tab>
</Tabs>

### 环境变量

所有构造参数都有对应的环境变量回退：

| 变量 | 参数 | 默认值 |
|---|---|---|
| `SALESFORCE_USERNAME` | `username` | — |
| `SALESFORCE_PASSWORD` | `password` | — |
| `SALESFORCE_SECURITY_TOKEN` | `security_token` | — |
| `SALESFORCE_DOMAIN` | `domain` | `"login"` |
| `SALESFORCE_INSTANCE_URL` | `instance_url` | — |
| `SALESFORCE_SESSION_ID` | `session_id` | — |
| `SALESFORCE_CONSUMER_KEY` | `consumer_key` | — |
| `SALESFORCE_PRIVATE_KEY_FILE` | `privatekey_file` | — |
| `SALESFORCE_PRIVATE_KEY` | `privatekey` | — |
| `SALESFORCE_API_VERSION` | `api_version` | 库默认值（`59.0`） |


## 对象摄取

### 摄取标准对象

```python
data = ingestor.ingest_sobject(
    "Account",
    fields=["Id", "Name", "Industry", "AnnualRevenue", "BillingCity"],
    where="Type = 'Customer' AND AnnualRevenue > 1000000",
    order_by="Name ASC",
    limit=5000,
)
print(f"Retrieved {data.row_count} of {data.total_size} matching records")
```

<Note>
`data.row_count` 是 `data.data` 中的记录数量（即应用任何 `limit` 之后实际返回的数量）。`data.total_size` 是 Salesforce 的 `totalSize`——即在应用 limit *之前* 匹配查询的记录数。对比两者即可判断是否获取到了全部结果。
</Note>

### 摄取自定义对象

自定义对象的 API 名称以 `__c` 结尾：

```python
data = ingestor.ingest_sobject(
    "My_Custom_Object__c",
    fields=["Id", "Name", "Custom_Field__c"],
)
```

也支持关系遍历字段（`Owner.Name`）：

```python
data = ingestor.ingest_sobject(
    "Contact",
    fields=["Id", "Name", "Email", "Account.Name", "Owner.Name"],
    limit=10000,
)
```

### 让 Semantica 选择字段

省略 `fields` 时，会通过 `describe()` 获取所有可选择的字段
（多一次 API 调用）。复合地址字段和地理位置字段（`type=address`、
`type=location`）会被自动排除——如果你需要这些字段，请改为逐个选择其组成字段
（`BillingStreet`、`BillingCity`、`Location__Latitude__s` 等）。

```python
data = ingestor.ingest_sobject("Opportunity")
```


## 原始 SOQL 摄取

原样传入任意合法的 SOQL 查询——分页会自动处理：

```python
data = ingestor.ingest_query("""
    SELECT Id, Name, StageName, Amount, CloseDate,
           Account.Name, Owner.Name
    FROM Opportunity
    WHERE IsClosed = false
    ORDER BY CloseDate ASC
""")
print(f"Open opportunities: {data.row_count}")
```

该查询会原样传递给 Salesforce REST API。调用方
需自行保证 SOQL 的正确性和安全性。

<Warning>
`ingest_query` 不会校验或清洗 SOQL 字符串。当从应用程序控制的输入构建查询时，请使用
`ingest_sobject`（它会校验 sObject 名称、字段名以及 WHERE/ORDER
BY 片段）。
</Warning>


## 文档导出

将摄取的记录转换为 Semantica 文档格式，以便与
`GraphBuilder` 配合使用：

```python
documents = ingestor.export_as_documents(
    data,
    id_field="Id",                            # default; Salesforce 18-char record Id
    text_fields=["Name", "Description"],      # omit to join all string fields
)

print(f"Created {len(documents)} documents")
# Each document:
# {
#   "id": "001xx000003GYk2AAG",
#   "text": "Acme Corp Enterprise software company",
#   "metadata": {
#     "source": "salesforce",
#     "sobject": "Account",
#     "instance_url": "https://myorg.my.salesforce.com",
#     "row_data": { ... full cleaned record ... }
#   }
# }
```

将文档直接送入 `GraphBuilder`：

```python
from semantica.kg import GraphBuilder

builder = GraphBuilder()
kg = builder.build(documents)
```


## 对象与 Schema 发现

```python
# List all accessible sObjects
sobject_names = ingestor.list_sobjects()
print(sobject_names[:10])   # ["Account", "Case", "Contact", ...]

# Inspect fields for a specific sObject
schema = ingestor.get_sobject_schema("Account")
for field in schema["fields"]:
    print(f"{field['name']}: {field['type']} (nillable={field['nillable']})")
```


## 上下文管理器

对于长时间运行的任务，推荐使用上下文管理器——它在进入时打开一个连接，
在退出时关闭它，因此 `with` 块内的每次摄取调用都会复用同一个已认证会话：

```python
with SalesforceIngestor(
    username=os.getenv("SALESFORCE_USERNAME"),
    password=os.getenv("SALESFORCE_PASSWORD"),
    security_token=os.getenv("SALESFORCE_SECURITY_TOKEN"),
) as sf:
    accounts = sf.ingest_sobject("Account", limit=10000)
    contacts = sf.ingest_sobject("Contact", limit=10000)
    sobjects = sf.list_sobjects()
```


## 便捷函数

使用 `ingest_salesforce()` 实现一行式摄取：

```python
from semantica.ingest import ingest_salesforce

# Fetch records
data = ingest_salesforce(
    method="sobject",
    sobject_name="Account",
    fields=["Id", "Name", "Industry"],
    limit=500,
)

# Execute raw SOQL (credentials from environment variables)
data = ingest_salesforce(
    method="query",
    soql="SELECT Id, Name FROM Contact WHERE IsActive = true",
)

# Ingest + export to documents in one step
docs = ingest_salesforce(
    method="documents",
    sobject_name="Account",
    text_fields=["Name", "Description"],
    limit=1000,
)

# List accessible sObjects
sobject_names = ingest_salesforce(method="list_sobjects")
```

或使用统一的 `ingest()` 调度器：

```python
from semantica.ingest import ingest

result = ingest(
    None,
    source_type="salesforce",
    method="sobject",
    sobject_name="Account",
    fields=["Id", "Name"],
    limit=500,
)
data = result["data"]   # SalesforceData
```


## 故障排查

```python
import os
from semantica.ingest import SalesforceConnector

connector = SalesforceConnector(
    username=os.getenv("SALESFORCE_USERNAME"),
    password=os.getenv("SALESFORCE_PASSWORD"),
    security_token=os.getenv("SALESFORCE_SECURITY_TOKEN"),
)
if not connector.test_connection():
    print("Connection failed: check username, password, security token, and domain")
```

认证失败的常见原因：

- **域名错误**：生产组织使用 `domain="login"`；沙盒使用 `domain="test"`。
- **安全令牌过期**：在 **Settings → Reset My Security Token** 下重置它。新令牌会通过电子邮件发送给你。
- **IP 限制**：你所在组织的可信 IP 范围可能阻止了来源 IP。请检查 **Setup → Network Access**。
- **API 访问被禁用**：请确保所连接的配置文件拥有 **API Enabled** 权限。


## 另见

- [摄取模块](../reference/ingest) —— 完整的 `SalesforceIngestor` API 以及所有其他摄取器。
- [Snowflake 集成](/zh/integrations/snowflake) —— 设计类似的关系型数仓连接器。
- [Databricks 集成](/zh/integrations/databricks) —— Lakehouse 连接器。
- [安装](../installation) —— 所有可选依赖扩展。
- [知识图谱](../reference/kg) —— 从已摄取的 Salesforce 数据构建知识图谱。