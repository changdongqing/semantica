---
title: "Power BI 集成"
description: "从 Power BI REST API 摄取工作区、数据集、报表和数据流元数据到 Semantica 的知识图谱流水线。"
icon: "chart-simple"
sourceHash: "18497b68d6eed29987c73d51dde577d2664e8915e3d1e6435623ce8d5e8cfc4b"
---

> 使用 REST API 并通过 Azure AD OAuth2 客户端凭据认证，将 Power BI 元数据拉取到 Semantica。


## 安装

```bash
pip install semantica
```

`requests` 作为核心依赖随 Semantica 一同发布，因此安装该包后此连接器即可使用——无需额外安装任何东西。该模块采用惰性导出：在首次访问 `PowerBIIngestor` 之前，`import semantica.ingest` 不会加载它。

<Note>
此连接器读取的是**元数据**——工作区、数据集、报表和数据流。它不执行 DAX 查询，也不导出数据集行；Power BI REST API 暴露的是目录信息，而非表数据。
</Note>


## 基本用法

```python
import os
from semantica.ingest import PowerBIIngestor

ingestor = PowerBIIngestor(
    tenant_id=os.getenv("POWERBI_TENANT_ID"),
    client_id=os.getenv("POWERBI_CLIENT_ID"),
    client_secret=os.getenv("POWERBI_CLIENT_SECRET"),
)

data = ingestor.ingest_workspace_metadata()
documents = ingestor.export_as_documents(data)

print(f"{len(documents)} documents — {data.metadata['dataset_count']} dataset(s)")
```

<Tip>
使用环境变量（或配合 `python-dotenv` 的 `.env` 文件）来避免凭据进入源代码。无参数的 `PowerBIIngestor()` 会自动从 `POWERBI_*` 环境变量读取配置。
</Tip>


## 认证

此连接器使用 Azure AD OAuth2 **客户端凭据**流程。请在 Azure AD 中注册应用，授予其访问 Power BI 服务的权限，并提供其租户、客户端 ID 和密钥。

必需配置：

| 配置项 | 参数 | 环境变量 |
| --- | --- | --- |
| Azure AD 租户 ID | `tenant_id` | `POWERBI_TENANT_ID` |
| 应用（客户端）ID | `client_id` | `POWERBI_CLIENT_ID` |
| 客户端密钥 | `client_secret` | `POWERBI_CLIENT_SECRET` |
| 工作区／组 ID（可选） | `workspace_id` | `POWERBI_WORKSPACE_ID` |

缺少前三项中的任意一项，都会在发起任何网络调用之前抛出 `ValidationError`。令牌会被缓存，并在即将过期前自动刷新。客户端密钥绝不会写入日志。


## 限定到单个工作区

传入工作区（组）ID 可读取单个工作区；省略它则会遍历服务主体可见的每一个工作区，从每个工作区收集数据集、报表和数据流，并为每条记录标记其来源的 `workspace_id`。这种逐工作区遍历是有意为之：不带作用域的 `myorg` 端点只覆盖“我的工作区”，而数据流没有不带作用域的端点。

```python
data = ingestor.ingest_workspace_metadata(workspace_id="00000000-0000-0000-0000-000000000000")
```

使用 `include` 仅选择所需的资源（传入空列表则不会拉取任何内容）：

```python
data = ingestor.ingest_workspace_metadata(include=["datasets", "reports"])
```


## 文档输出

`export_as_documents` 返回标准的 `{"id", "text", "metadata"}` 结构，因此输出可直接馈入 `GraphBuilder`：

```python
from semantica.kg import GraphBuilder

documents = ingestor.export_as_documents(data)
graph = GraphBuilder().build(documents)
```

每个文档的 `metadata` 都带有 `source: "powerbi"`、取值为 `workspace`、`dataset`、`report` 或 `dataflow` 的 `resource_type`，以及原始 API 字段。


## 安全

每一次出站 HTTP 调用——包括令牌请求——都会经过 Semantica 共享的 SSRF 防护，因此用户提供的端点无法访问私有、回环或链路本地地址空间。仅对确实需要它的自托管部署设置 `allow_private_ips=True`。