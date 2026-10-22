---
title: "ServiceNow 集成"
description: "通过 Table API 将 CMDB 配置项、事件、变更以及任何其他 ServiceNow 表摄取到 Semantica 的 KG 流水线中。"
icon: "server"

sourceHash: "05fc001b1a863f0648a44b3be95ac763c380e411b5fcfd928c52f63f48bfbe43"
---

> 使用 Table API 并配合 Basic 或 OAuth2 认证，将 ServiceNow 表记录拉取到 Semantica 中。


## 安装

```bash
pip install "semantica[ingest-servicenow]"
```

该连接器只需要 `requests`，而它已随 Semantica 核心一同提供，因此目前这个 extra 实际上是空操作；它的存在是为了显式声明该依赖。该模块采用惰性导出：`import semantica.ingest` 不会加载它，直到你首次访问 `ServiceNowIngestor`。


## 基本用法

```python
import os
from semantica.ingest import ServiceNowIngestor

ingestor = ServiceNowIngestor(
    instance_url=os.getenv("SERVICENOW_INSTANCE_URL"),
    username=os.getenv("SERVICENOW_USERNAME"),
    password=os.getenv("SERVICENOW_PASSWORD"),
)

data = ingestor.ingest_table("cmdb_ci_server", query="operational_status=1")
documents = ingestor.export_as_documents(data)

print(f"{data.count} record(s) from {data.table}")
```

<Tip>
使用环境变量（或配合 `python-dotenv` 使用 `.env` 文件）可避免凭据出现在源代码中。不带参数调用 `ServiceNowIngestor()` 时，会自动从 `SERVICENOW_*` 环境变量读取配置。
</Tip>


## 认证

| 设置 | 参数 | 环境变量 |
| --- | --- | --- |
| 实例 URL（`https://<instance>.service-now.com`） | `instance_url` | `SERVICENOW_INSTANCE_URL` |
| 认证流程（`basic` 或 `oauth2`，可选） | `auth` | `SERVICENOW_AUTH` |
| 用户名 | `username` | `SERVICENOW_USERNAME` |
| 密码 | `password` | `SERVICENOW_PASSWORD` |
| OAuth2 客户端 ID | `client_id` | `SERVICENOW_CLIENT_ID` |
| OAuth2 客户端密钥 | `client_secret` | `SERVICENOW_CLIENT_SECRET` |

- **Basic** —— 仅设置 `username`/`password` 时的默认方式。
- **OAuth2** —— 设置 `client_id` 时自动选用。当同时提供 `username`/`password` 时，会使用 `password` 授权从 `<instance_url>/oauth_token.do` 获取令牌，否则使用 `client_credentials`。

配置缺失会在发起任何网络调用之前抛出 `ValidationError`。


## 查询表

`ingest_table` 直接映射到 Table API 的查询参数：

```python
data = ingestor.ingest_table(
    "incident",
    query="active=true^priority=1",       # sysparm_query (encoded query)
    fields=["sys_id", "number", "short_description", "cmdb_ci"],
    limit=500,                            # stop after 500 rows
    batch_size=200,                       # sysparm_limit per request
    display_value="all",                  # raw + display values per field
)
```

分页基于偏移量（`sysparm_limit` / `sysparm_offset`），并会持续跟进，直到表被取尽或已收集到 `limit` 行。引用字段的 `link` 对象默认会被丢弃（`sysparm_exclude_reference_link=true`）；传入 `exclude_reference_link=False` 可保留它们。

CMDB 关系存放在 `cmdb_rel_ci` 中：

```python
rels = ingestor.ingest_table("cmdb_rel_ci", fields=["parent", "child", "type"])
```


## 文档输出

`export_as_documents` 会将每条记录展平为一个 dict，包含 `id`（记录的 `sys_id`）、`name`（从 `name`、`number` 或 `short_description` 解析而来）、`source`（实例 URL）和 `table`，以及 API 返回的每个字段，因此输出可直接送入 `GraphBuilder`：

```python
from semantica.kg import GraphBuilder

documents = ingestor.export_as_documents(data)
graph = GraphBuilder().build(documents)
```


## 安全

每一次出站 HTTP 调用——包括 OAuth2 令牌请求——都会经过 Semantica 共享的 SSRF 防护，因此用户提供的实例 URL 无法访问私有、回环或链路本地地址空间。仅当自托管部署确实需要时，才应设置 `allow_private_ips=True`。