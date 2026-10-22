---
title: "Looker 集成"
description: "将 Looker 的 Look、仪表盘、LookML 模型、文件夹和项目元数据摄取到 Semantica 的知识图谱管道中。"
icon: "chart-line"
sourceHash: "798407cb21c93366e267e3eddaa47abfedfc6185ea069ac2f022c5156fe940f0"
---

> 使用 API 客户端凭据、官方 `looker-sdk` 和经过校验的实例端点，将 Looker 元数据提取到 Semantica。

## 安装

```bash
# Install with Looker support
pip install "semantica[ingest-looker]"

# Or install the connector separately
pip install looker-sdk>=24.0.0
```

`looker-sdk` 是可选依赖。直接执行 `pip install semantica` 不会将其引入，`import semantica.ingest` 也不会预先加载它——只有在你首次使用 `LookerConnector` 或 `LookerIngestor` 时才会导入该 SDK。`LookerData` 无需 SDK 即可导入，因此在没有 SDK 的环境中类型注解和数据类仍然可用。

<Note>
本连接器仅摄取 Looker 元数据——Look、仪表盘、LookML 模型（及其 Explore）、文件夹和项目。查询结果行、调度的计划、用户和用户组不在本集成的当前范围内。
</Note>

## 基本用法

```python
import os
from semantica.ingest import LookerIngestor

with LookerIngestor(
    base_url=os.getenv("LOOKERSDK_BASE_URL"),          # e.g. https://looker.example.com
    client_id=os.getenv("LOOKERSDK_CLIENT_ID"),
    client_secret=os.getenv("LOOKERSDK_CLIENT_SECRET"),
) as ingestor:
    looks = ingestor.ingest_looks()
    print(f"Retrieved {looks.row_count} looks — columns: {looks.columns}")

    documents = ingestor.export_as_documents(looks)
```

<Note>
`LookerIngestor` 在进入时打开一个已认证的会话，并在退出时关闭，因此 `with` 块内的每次调用都会复用这条经过校验的连接。独立调用（不使用 `with`）时，每次调用都会打开并关闭一个临时连接。
</Note>

<Tip>
使用环境变量（或配合 `python-dotenv` 使用 `.env` 文件）可避免把凭据写入源代码。不带参数的 `LookerIngestor()` 会自动读取 `LOOKERSDK_*` 环境变量。
</Tip>

## 认证

<Tabs>
  <Tab title="客户端 ID / 客户端密钥">
    Looker API 凭据是 Looker 为 API3 访问签发的 `client_id` 和 `client_secret`
    对（Admin → Users → API Keys）。可以显式传入，也可以让连接器读取
    `LOOKERSDK_CLIENT_ID` 和 `LOOKERSDK_CLIENT_SECRET` 环境变量：

    ```python
    import os
    from semantica.ingest import LookerIngestor

    ingestor = LookerIngestor(
        base_url=os.getenv("LOOKERSDK_BASE_URL"),   # must be https
        client_id=os.getenv("LOOKERSDK_CLIENT_ID"),
        client_secret=os.getenv("LOOKERSDK_CLIENT_SECRET"),
    )
    ```

    必需的环境变量：

    ```bash
    export LOOKERSDK_BASE_URL="https://looker.example.com"
    export LOOKERSDK_CLIENT_ID="your-client-id"
    export LOOKERSDK_CLIENT_SECRET="your-client-secret"
    ```

    端点必须使用 `https`。非 `https` 协议（例如
    `http://looker.internal`）会在构造任何客户端之前被拒绝并抛出
    `ValidationError`。
  </Tab>
  <Tab title="现有 looker.ini">
    连接器也接受 Looker SDK 配置文件。将 `config_file` 指向该文件，并可选择
    指定其中的 `section`：

    ```python
    from semantica.ingest import LookerIngestor

    ingestor = LookerIngestor(
        config_file="looker.ini",
        section="Looker",
    )
    ```

    `config_file` 默认为 `"looker.ini"`。当对应的构造函数参数或环境变量不存在
    时，会使用文件中已有的值。
  </Tab>
</Tabs>

<Warning>
连接到私有、回环或链路本地端点时必须设置 `allow_private_ips=True`，同时它还会
放宽 `https` 要求，从而接受非 `https` 协议。除非你确实要访问内部实例，否则请
保持关闭。
</Warning>

若显式的 `base_url` 与 `LOOKERSDK_BASE_URL` 或配置文件中的值冲突，连接器会抛出 `ValidationError`，而不会连接到你未经校验的主机。

## 环境变量

所有连接参数都有 `LOOKERSDK_*` 环境变量作为回退值，并通过 SDK 自身的 `ApiSettings` 解析。显式的构造函数值始终优先。

| 变量 | 参数 | 默认值 |
|---|---|---|
| `LOOKERSDK_BASE_URL` | `base_url` | — |
| `LOOKERSDK_CLIENT_ID` | `client_id` | — |
| `LOOKERSDK_CLIENT_SECRET` | `client_secret` | — |

`config_file` 和 `section` 是构造函数参数而非环境变量：

| 参数 | 描述 | 默认值 |
|---|---|---|
| `config_file` | 现有 `looker.ini` 文件的路径 | `"looker.ini"` |
| `section` | `config_file` 中的节名称 | — |
| `allow_private_ips` | 允许私有端点和非 `https` 协议 | `False` |

## 元数据摄取

每次读取都会返回一个 `LookerData` 对象，包含 `data`（规范化后的元数据字典）、`row_count`、`columns`、`content_type`、`base_url`、`metadata` 和 `ingested_at`。

| 方法 | SDK 读取 | `content_type` |
|---|---|---|
| `ingest_looks()` | `all_looks` | `"look"` |
| `ingest_dashboards()` | `all_dashboards` | `"dashboard"` |
| `ingest_lookml_models()` | `all_lookml_models` | `"lookml_model"` |
| `ingest_folders()` | `all_folders` | `"folder"` |
| `ingest_projects()` | `all_projects` | `"project"` |

读取使用 SDK 的 `all_*` 集合方法。每个方法都接受可选的关键字参数并将其转发给 SDK 调用——大多数读取支持 `transport_options` 和 `fields`，`ingest_lookml_models()` 还额外支持 `limit`/`offset`：

```python
looks = ingestor.ingest_looks(fields="id,title,description,model")
models = ingestor.ingest_lookml_models(limit=100)
```

<Note>
这是一个仅处理元数据的连接器。仪表盘以不含磁贴的 `DashboardBase` 记录读取，因此不会获取或存储任何查询结果行。
</Note>

### LookML 模型与 Explore

LookML 模型返回时，其 Explore 嵌套在父模型记录内部。Explore 自身不带父级引用，因此会将父级的 `project_name`/`name` 组合进每个嵌套标识符：

```python
models = ingestor.ingest_lookml_models()

for model in models.data:
    print(f"{model['project_name']}.{model['name']}")
    for explore in model["explores"]:
        print(f"  {explore['name']}")
```

## 导出为 Semantica 文档

`export_as_documents(data)` 会将 `LookerData` 结果转换为 `GraphBuilder` 所消费的 `{"id", "text", "metadata"}` 文档结构：

```python
documents = ingestor.export_as_documents(looks)

print(f"Created {len(documents)} documents")
# Each document:
# {
#   "id": "looker:look:42",
#   "text": "Monthly Revenue Revenue by region orders jdoe",
#   "metadata": {
#     "source": "looker",
#     "content_type": "look",
#     "row_data": { ... allowlisted Look metadata ... },
#     "look_id": 42
#   }
# }
```

文档的 `id` 值按内容类型划分命名空间，以确保在不同集合之间保持唯一：`looker:look:<id>`、`looker:dashboard:<id>`、`looker:folder:<id>`、`looker:project:<id>`，模型则使用 `looker:lookml_model:<project>.<name>`。每个文档的 `metadata["source"]` 均为 `"looker"`，`metadata["content_type"]` 记录其来源集合。完整的规范化记录保留在 `metadata["row_data"]` 下。

LookML 模型文档还会嵌套其 Explore，每个 Explore 都有自己的命名空间 id 和父模型引用：

```python
# {
#   "id": "looker:lookml_model:ecommerce.orders",
#   "text": "Orders orders ecommerce Order Items order_items",
#   "metadata": {
#     "source": "looker",
#     "content_type": "lookml_model",
#     "row_data": { ... allowlisted LookML model metadata ... },
#     "project_name": "ecommerce",
#     "model_name": "orders",
#     "explores": [
#       {
#         "id": "looker:lookml_model:ecommerce.orders:explore:order_items",
#         "name": "order_items",
#         "label": "Order Items",
#         "group_label": "Order Items",
#         "description": None,
#         "hidden": False,
#         "parent_model": "ecommerce.orders"
#       }
#     ],
#     "explore_count": 1
#   }
# }
```

将文档直接传给 `GraphBuilder`：

```python
from semantica.kg import GraphBuilder

builder = GraphBuilder()
graph = builder.build(documents)
print(f"Entities: {graph['metadata']['num_entities']}")
```

导出的文档可 JSON 序列化：嵌套的 SDK 模型对象会变为普通字典或列表，`datetime` 值会变为 ISO 8601 字符串。

## 安全

连接器会在构造任何客户端之前校验用户提供的端点，然后将客户端绑定到该确切经过校验的 `base_url`——如果 SDK 从环境变量或配置文件解析出不同的主机，连接器会失败关闭（fail closed）而不是发起连接。

它还会让每个出站请求都经过仓库中其他连接器所使用的同一套 SSRF 校验，因此 OAuth 登录和每次元数据读取都会单独检查，而不仅仅在构造时检查。连接会被固定到校验期间解析出的地址，因此在校验与拨号之间发生的 DNS 重绑定无法重定向它们。除非显式启用 `allow_private_ips`，请求必须使用 `https`，TLS 证书验证被强制开启（因此 `LOOKERSDK_VERIFY_SSL` 或 `looker.ini` 无法将其降级），不跟随重定向，且不信任代理环境变量。SDK 的错误文档查询（它在收到非 2xx 响应时执行的一次独立的、未加防护的 `requests.get`）已被禁用，因此失败的请求无法开启第二条出口路径。

记录规范化会通过一份显式的保留字段允许列表来投影每个 SDK 对象。与密钥相邻的字段（如 `Project.git_password`、`Project.deploy_secret`、`Dashboard.password`、`Dashboard.pdt_password` 和 `LookmlModel.device_token`）会被丢弃，`Project.git_remote_url` 中任何 `user:password@` 用户信息都会被清除（无法安全重写用户信息的 URL 将被整体隐去）。文档不携带 `base_url` 或凭据。

## 另请参阅

- [摄取模块](../reference/ingest) — 完整的 `LookerIngestor` 参考以及所有其他摄取器。
- [Snowflake 集成](/zh/integrations/snowflake) — 具有类似元数据摄取能力的 SQL 数据仓库连接器。
- [Redshift 集成](/zh/integrations/redshift) — 用于表格和基于查询的摄取的仓库连接器。
- [安装](../installation) — 所有可选依赖附加项。
- [知识图谱](../reference/kg) — 从摄取的 Looker 元数据构建知识图谱。