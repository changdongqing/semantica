---
title: "Microsoft Dynamics 365 集成"
description: "使用 Dataverse Web API 将 Microsoft Dynamics 365 的实体记录摄取到 Semantica 的知识图谱流水线中。"
icon: "microsoft"
sourceHash: "c43822e38bb8af97b73e49d69e6130cfa389fc2284fc0115ff74a719fc573870"
---

> 使用 Azure AD 客户端凭据认证，将客户、联系人、商机以及任意自定义实体从 Dynamics 365 拉取到 Semantica 中。

## 安装

```bash
# Install with Dynamics 365 support
pip install "semantica[ingest-dynamics365]"

# Or install the dependency separately
pip install msal>=1.20
```

## 基本用法

```python
import os
from semantica.ingest import Dynamics365Ingestor

ingestor = Dynamics365Ingestor(
    tenant_id=os.getenv("DYNAMICS_TENANT_ID"),
    client_id=os.getenv("DYNAMICS_CLIENT_ID"),
    client_secret=os.getenv("DYNAMICS_CLIENT_SECRET"),
    org_url=os.getenv("DYNAMICS_ORG_URL"),  # e.g. https://myorg.crm.dynamics.com
)

data = ingestor.ingest_entity("accounts", select=["accountid", "name", "statecode"])
print(f"Retrieved {data.row_count} records")

docs = ingestor.export_as_documents(data)
```

<Tip>
使用环境变量（或配合 `python-dotenv` 的 `.env` 文件）可避免将凭据写入源代码。不带参数的 `Dynamics365Ingestor()` 会自动从 `DYNAMICS_*` 环境变量中读取配置。
</Tip>

## 认证

Dynamics 365 通过 MSAL 使用 Azure AD 客户端凭据（应用对应用）认证。你需要一个 **Azure AD 应用注册**，并通过管理员同意为其授予 Dynamics 365 `user_impersonation`（或 `Dynamics CRM` API）权限。

```python
ingestor = Dynamics365Ingestor(
    tenant_id="your-azure-tenant-id",
    client_id="your-app-client-id",
    client_secret=os.getenv("DYNAMICS_CLIENT_SECRET"),
    org_url="https://myorg.crm.dynamics.com",
)
```

## 环境变量

| 变量 | 说明 |
|---|---|
| `DYNAMICS_TENANT_ID` | Azure AD 租户 ID |
| `DYNAMICS_CLIENT_ID` | Azure AD 应用（客户端）ID |
| `DYNAMICS_CLIENT_SECRET` | Azure AD 应用客户端密钥 |
| `DYNAMICS_ORG_URL` | Dynamics 365 组织基础 URL（例如 `https://myorg.crm.dynamics.com`） |

## 摄取方法

### 摄取实体

```python
# Basic — all fields
data = ingestor.ingest_entity("accounts")

# With OData $select, $filter, $top
data = ingestor.ingest_entity(
    "contacts",
    select=["contactid", "fullname", "emailaddress1"],
    filter="statecode eq 0",
    top=500,
)
```

### 列出可用实体

```python
entity_names = ingestor.list_entities()
print(entity_names[:10])
```

## 导出为文档

```python
docs = ingestor.export_as_documents(data)
# Each doc: {"id": str, "text": str, "metadata": {"source": "dynamics365", "entity_name": ..., ...}}
```

## 上下文管理器

```python
with Dynamics365Ingestor(
    tenant_id=os.getenv("DYNAMICS_TENANT_ID"),
    client_id=os.getenv("DYNAMICS_CLIENT_ID"),
    client_secret=os.getenv("DYNAMICS_CLIENT_SECRET"),
    org_url=os.getenv("DYNAMICS_ORG_URL"),
) as d:
    accounts = d.ingest_entity("accounts")
    contacts = d.ingest_entity("contacts")
```

## Dynamics365Data 参考

| 字段 | 类型 | 说明 |
|---|---|---|
| `records` | `list[dict]` | 来自 Web API 的原始记录字典 |
| `entity_name` | `str` | 实体集的逻辑名称 |
| `row_count` | `int` | 记录数量 |
| `columns` | `list[str]` | 各记录中出现的字段名 |
| `org_url` | `str` | Dynamics 365 组织基础 URL |
| `ingested_at` | `datetime` | 摄取时间戳 |