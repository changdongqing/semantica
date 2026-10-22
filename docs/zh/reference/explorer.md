---
title: "Explorer"
description: "用于知识图谱探索、本体管理和图分析的交互式 FastAPI 仪表板。"
icon: "map"
sourceHash: "b5b7184318814af7b5899bf7e086391aa644a5fc7b83834efe19c13e73d5dace"
---

**`semantica.explorer`** 是一个**基于浏览器的仪表板**，用于探索知识图谱、管理本体并运行可视化分析：

- 索引搜索：在 118k 个节点上耗时 0.004ms，无需全量扫描
- 本体中心：可视化编辑器、SHACL Studio、对齐编写和健康仪表板
- 任意两个节点之间的双向路径查找
- 用于实时管道监控的 WebSocket 进度流式传输
- 启动后无需代码：在浏览器中完成完整的图探索


## 快速开始

安装、将图导出为 JSON，然后启动：

```bash
pip install "semantica[explorer]"
```

```python
# 1. Export your graph to a JSON file
import json
from semantica.context import ContextGraph

graph = ContextGraph()
graph.add_node("Python",  "language",  properties={"paradigm": "multi-paradigm"})
graph.add_node("FastAPI", "framework", properties={"language": "Python"})
graph.add_edge("Python", "FastAPI", "enables")
graph.save_to_file("my_graph.json")
```

```bash
# 2. Launch the Explorer
semantica-explorer --graph my_graph.json
# → Loading graph...
# → Graph loaded: 2 nodes, 1 edges
# → Semantica Explorer · http://127.0.0.1:8000
#     API docs  http://127.0.0.1:8000/docs
#     Health    http://127.0.0.1:8000/api/health
```

浏览器会自动打开 `http://127.0.0.1:8000`。交互式 API 文档位于 `/docs`。

<Tip>
  `semantica.explorer` 是一个**服务器进程**，而不是可导入的 Python 库。请使用 CLI 或 `python -m semantica.explorer` 启动。`app.py` 模块暴露了一个模块级 `app` 实例，供 uvicorn 或 Docker 使用。
</Tip>

## 启动

<Steps>
  <Step title="保存图并启动 Explorer">
    ```python
    from semantica.context import ContextGraph

    graph = ContextGraph()
    graph.load_from_file("my_graph.json")   # verify graph loads
    ```

    ```bash
    semantica-explorer --graph my_graph.json
    # Serves at http://127.0.0.1:8000
    ```
  </Step>
  <Step title="自定义主机和端口">
    ```bash
    # Expose on the network
    semantica-explorer --graph my_graph.json --host 0.0.0.0 --port 8080

    # Skip auto-opening the browser
    semantica-explorer --graph my_graph.json --no-browser
    ```
  </Step>
  <Step title="无需重启即可导入新数据">
    ```bash
    # Import a JSON or CSV file into the running session
    curl -X POST http://localhost:8000/api/import \
      -F "file=@updated_graph.json"
    ```
  </Step>
  <Step title="通过 Python 模块使用">
    ```bash
    python -m semantica.explorer --graph my_graph.json --port 8080
    ```
  </Step>
</Steps>

## CLI 参考

`semantica-explorer` 命令仅接受四个标志：

| 标志 | 短标志 | 默认值 | 描述 |
| :---- | :----- | :------- | :----------- |
| `--graph` | `-g` | *(**必填**)* | 要加载的 ContextGraph JSON 文件路径 |
| `--port` | `-p` | `8000` | 服务器绑定端口 |
| `--host` |: | `127.0.0.1` | 服务器绑定主机：使用 `0.0.0.0` 暴露到网络 |
| `--no-browser` |: | off | 跳过自动打开浏览器标签页 |

<Note>
  CLI 中没有用于身份验证、CORS 或日志级别的标志。HTTP CORS 和 WebSocket 握手（`/ws/graph-updates`）的允许来源通过 `ALLOWED_ORIGINS` 环境变量配置（逗号分隔）。也支持 `EXPLORER_CORS_ORIGINS` 作为旧版别名。

  通过 `semantica-explorer` 启动且未显式设置环境变量时，服务器会自动允许来自 `localhost` 和 `127.0.0.1` 在配置的 `--port`（默认：`8000`）上的连接，此外还允许本地前端开发来源（`http://localhost:5173,http://127.0.0.1:5173`）。当 `--host` 不是回环地址时，也会允许 `http://<host>:<port>`，IPv6 主机放在方括号中（`http://[fe80::1]:<port>`）。使用 `--port 0` 时，操作系统会在启动后选择端口，因此不会添加任何端口来源；请设置 `ALLOWED_ORIGINS` 将其包含在内。

  不使用 CLI 时，`create_app()` 对每个调用方使用相同的默认值，包括模块级 `app`、Docker 镜像和编程式使用：无论应用实际在哪个端口提供服务，都允许来自 `localhost` 和 `127.0.0.1` 的 `5173` 与 `8000` 端口来源。这些来源仅限本地，且 API 密钥仍会保护端点。设置 `ALLOWED_ORIGINS` 可替换默认值。
</Note>

<Tip>
  **来源通过环境变量配置。** 要为 REST API CORS 和通过 WebSocket（`/ws/graph-updates`）进行的实时图更新允许外部或自定义浏览器来源，请在启动前将 `ALLOWED_ORIGINS`（或 `EXPLORER_CORS_ORIGINS`）设置为逗号分隔的允许来源列表（例如 `ALLOWED_ORIGINS="http://myapp.example.com"`）。显式设置后，只允许指定的来源。
</Tip>

```bash
# Full example
ALLOWED_ORIGINS="http://myapp.example.com" \
  semantica-explorer --graph my_graph.json --host 0.0.0.0 --port 8080 --no-browser
```

## 功能概览

- **图探索器** — 交互式节点/边搜索、路径查找和邻域扩展。在 118k 节点图上，索引搜索耗时为 0.004ms。
- **本体中心** — SKOS 词表管理、SHACL 形状生成与验证、本体对齐、健康仪表板和版本管理。
- **分析** — 度中心性、社区检测、连通性分析、图验证和距离矩阵。
- **REST API** — 所有功能均可通过 REST API 使用：在 `/docs` 中有完整文档。
- **WebSocket 更新** — 通过 WebSocket 在 `/ws/graph-updates` 流式传输实时图变更事件。
- **CLI 启动器** — `semantica-explorer --graph my_graph.json`，用于即时本地启动。

## 功能

<Tabs>
  <Tab title="图探索器">
    用于浏览知识图谱的核心仪表板：

    - **索引搜索**：向 `/api/graph/search` 发送带查询的 POST 请求；在 118k 节点图上耗时 0.004ms
    - **路径查找**：通过 `GET /api/graph/path?source=&target=` 在任意两个节点之间执行 BFS 或 Dijkstra
    - **邻居扩展**：`GET /api/graph/node/{id}/neighbors?depth=2`
    - **按实体类型过滤**：`GET /api/graph/nodes?type=Person`
    - **语义邻域**：`GET /api/graph/semantic-neighborhood?node_id=&top_k=20`
    - **距离矩阵**：`POST /api/graph/distance-matrix`

    <Warning>
      **保存为 JSON 之前先过滤大型图。** CLI 会将整个 JSON 文件加载到内存中。对于超过 10k 节点的图，请在导出前过滤到相关子图：在非常大的图上，力导向布局会变得不可用。
    </Warning>
  </Tab>
  <Tab title="本体中心">
    在浏览器中管理本体生命周期：

    - **注册表**：`GET /api/ontology/registry`：列出已加载的本体
    - **SKOS 词表**：`GET /api/ontology/skos/schemes`、`GET /api/ontology/skos/concept/{uri}`
    - **SHACL**：`POST /api/ontology/shacl/generate`、`POST /api/ontology/shacl/validate`
    - **对齐**：`GET/POST /api/ontology/alignments`、`POST /api/ontology/suggest-alignments`
    - **提案与版本管理**：`POST /api/ontology/propose`、`GET /api/ontology/versions/{uri}`
    - **健康**：`GET /api/ontology/health`
  </Tab>
  <Tab title="分析">
    针对已加载图运行的图指标：

    - **组合指标**：`GET /api/analytics?metrics=centrality,community,connectivity`
    - **图验证**：`GET /api/analytics/validation`
    - **增强：链接预测**：`POST /api/enrich/links`
    - **增强：去重**：`POST /api/enrich/dedup`
    - **增强：实体抽取**：`POST /api/enrich/extract`
    - **时间维度**：`GET /api/temporal/snapshot`、`GET /api/temporal/diff`、`GET /api/temporal/bounds`

    <Tip>
      **使用 `/api/analytics/validation` 检查图质量。** 验证器会在你将图暴露给下游管道之前检测孤立节点、缺失类型和其他结构问题。
    </Tip>
  </Tab>
  <Tab title="决策与溯源">
    决策跟踪和溯源查询：

    - **决策**：`GET /api/decisions`、`GET /api/decisions/{id}`、`GET /api/decisions/{id}/chain`
    - **先例**：`GET /api/decisions/{id}/precedents`
    - **因果距离**：`GET /api/decisions/causal-distance?source=&target=`
    - **合规性**：`GET /api/decisions/{id}/compliance`
    - **溯源**：`GET /api/provenance?node_id=`、`GET /api/provenance/report?node_id=`
    - **注解**：`GET/POST /api/annotations`、`DELETE /api/annotations/{id}`

    <Tip>
      **自动化使用 REST API，探索使用 Explorer UI。** Explorer 的 REST 端点是一个稳定的编程 API：可将它们接入脚本，以自动化批量注解、SPARQL 查询或导出。
    </Tip>
  </Tab>
</Tabs>

## API 端点

完整交互式文档位于 `http://localhost:8000/docs`。所有端点均接受并返回 JSON。

<AccordionGroup>
  <Accordion title="图端点">

    | 端点 | 方法 | 描述 |
    | :-------- | :------ | :----------- |
    | `/api/graph/stats` | `GET` | 节点数、边数、实体类型分布 |
    | `/api/graph/nodes` | `GET` | 列出节点：`?type=&search=&skip=&limit=&cursor=&bbox=` |
    | `/api/graph/node/{id}` | `GET` | 获取单个节点及其所有属性 |
    | `/api/graph/node/{id}/neighbors` | `GET` | 节点的邻居：`?depth=1`（1–5） |
    | `/api/graph/edges` | `GET` | 列出边：`?type=&source=&target=&skip=&limit=&cursor=` |
    | `/api/graph/path` | `GET` | 最短路径：`?source=&target=&algorithm=bfs&directed=true` |
    | `/api/graph/search` | `POST` | 索引搜索：请求体：`{query, limit, filters, anchor_node}` |
    | `/api/graph/distance-matrix` | `POST` | 两两距离：请求体：`{node_ids, metric}`（最多 50 个节点） |
    | `/api/graph/semantic-neighborhood` | `GET` | 语义邻居：`?node_id=&top_k=20&min_similarity=0.0` |

  </Accordion>
  <Accordion title="分析、增强与时间维度">

    **分析：**

    | 端点 | 方法 | 描述 |
    | :-------- | :------ | :----------- |
    | `/api/analytics` | `GET` | 图指标：`?metrics=centrality,community,connectivity` |
    | `/api/analytics/validation` | `GET` | 图验证报告 |

    **增强：**

    | 端点 | 方法 | 描述 |
    | :-------- | :------ | :----------- |
    | `/api/enrich/extract` | `POST` | 从文本中抽取实体 |
    | `/api/enrich/links` | `POST` | 节点的链接预测 |
    | `/api/enrich/dedup` | `POST` | 重复检测 |
    | `/api/enrich/merge` | `POST` | 合并重复节点 |
    | `/api/reason` | `POST` | 在图之上运行推理 |

    **时间维度：**

    | 端点 | 方法 | 描述 |
    | :-------- | :------ | :----------- |
    | `/api/temporal/snapshot` | `GET` | 在 `?at=ISO8601` 处的图快照（默认当前时间） |
    | `/api/temporal/diff` | `GET` | 两个时间点之间的差异：`?from_time=&to_time=` |
    | `/api/temporal/patterns` | `GET` | 时间活动模式 |
    | `/api/temporal/bounds` | `GET` | 图中最早和最晚的时间边界 |
    | `/api/temporal/distance-history` | `GET` | 距离历史：`?source=&target=` |

  </Accordion>
  <Accordion title="本体、词表与 SPARQL">

    **本体：**

    | 端点 | 方法 | 描述 |
    | :-------- | :------ | :----------- |
    | `/api/ontology/registry` | `GET` | 列出已加载的本体 |
    | `/api/ontology/load` | `POST` | 从 URL 或内容加载本体 |
    | `/api/ontology/create` | `POST` | 创建新本体 |
    | `/api/ontology/search` | `GET` | 搜索本体实体：`?q=term` |
    | `/api/ontology/health` | `GET` | 本体健康和覆盖率指标 |
    | `/api/ontology/alignments` | `GET/POST` | 列出或创建本体对齐 |
    | `/api/ontology/suggest-alignments` | `POST` | AI 建议的对齐 |
    | `/api/ontology/shacl/generate` | `POST` | 生成 SHACL 形状 |
    | `/api/ontology/shacl/validate` | `POST` | 根据 SHACL 验证 RDF |
    | `/api/ontology/skos/schemes` | `GET` | 列出 SKOS 概念词表方案 |
    | `/api/ontology/skos/concept/{uri}` | `GET` | 获取一个 SKOS 概念 |
    | `/api/ontology/proposals` | `GET` | 列出或读取本体变更提案 |
    | `/api/ontology/propose` | `POST` | 将草稿作为提案提交 |
    | `/api/ontology/versions/{uri}` | `GET` | 版本历史 |

    **词表：**

    | 端点 | 方法 | 描述 |
    | :-------- | :------ | :----------- |
    | `/api/vocabulary/schemes` | `GET` | 通过 TripletStore 获取 SKOS 词表方案 |
    | `/api/vocabulary/concepts` | `GET` | 词表方案中的概念：`?scheme=URI` |
    | `/api/vocabulary/hierarchy` | `GET` | 概念层级树 |
    | `/api/vocabulary/import` | `POST` | 导入 SKOS/RDF 词表文件 |

    SKOS 层级写入会拒绝 `skos:broader` 和
    `skos:narrower` 关系中的循环。词表导入会在添加节点之前验证整个
    批次，而直接进行图/会话边写入时，会在图存储边界应用
    相同的不变式。

    **SPARQL：**

    | 端点 | 方法 | 描述 |
    | :-------- | :------ | :----------- |
    | `/api/sparql` | `POST` | 执行只读 SPARQL 查询（`SELECT`、`ASK`、`CONSTRUCT` 或 `DESCRIBE`）；`CONSTRUCT`/`DESCRIBE` 将三元组作为 `subject`、`predicate`、`object` 列返回，`ASK` 返回 `result` 布尔列 |

  </Accordion>
  <Accordion title="决策、溯源、注解与导出">

    **决策：**

    | 端点 | 方法 | 描述 |
    | :-------- | :------ | :----------- |
    | `/api/decisions` | `GET` | 已记录决策的分页列表 |
    | `/api/decisions/{id}` | `GET` | 单个决策详情 |
    | `/api/decisions/{id}/chain` | `GET` | 决策的因果链 |
    | `/api/decisions/{id}/precedents` | `GET` | 相似的过往决策 |
    | `/api/decisions/{id}/compliance` | `GET` | 策略合规检查 |
    | `/api/decisions/causal-distance` | `GET` | 因果距离：`?source=&target=` |

    **溯源：**

    | 端点 | 方法 | 描述 |
    | :-------- | :------ | :----------- |
    | `/api/provenance` | `GET` | 实体溯源血缘：`?node_id=` |
    | `/api/provenance/report` | `GET` | 溯源导出报告：`?node_id=` |

    **注解：**

    | 端点 | 方法 | 描述 |
    | :-------- | :------ | :----------- |
    | `/api/annotations` | `GET` | 列出注解：`?node_id=`（可选） |
    | `/api/annotations` | `POST` | 创建注解（返回 201） |
    | `/api/annotations/{id}` | `DELETE` | 删除注解（返回 204） |

    **导出 / 导入：**

    | 端点 | 方法 | 描述 |
    | :-------- | :------ | :----------- |
    | `/api/export` | `POST` | 将图导出为 JSON 或 CSV：请求体：`{format, node_ids}` |
    | `/api/export/distance-enriched` | `POST` | 将两两距离导出为 CSV 或 JSONL |
    | `/api/import` | `POST` | 从 `.json` 或 `.csv` 文件导入节点/边（最大 50 MB） |

  </Accordion>
  <Accordion title="健康与信息">

    | 端点 | 方法 | 描述 |
    | :-------- | :------ | :----------- |
    | `/api/health` | `GET` | 返回 `{"status": "ok"}` |
    | `/api/info` | `GET` | 服务器名称、版本、状态 |
    | `/docs` | `GET` | 交互式 Swagger UI：所有端点 |

  </Accordion>
</AccordionGroup>

## WebSocket 图更新

实时的图变更事件通过 WebSocket 在 `ws://localhost:8000/ws/graph-updates` 上流式推送：

```python
import asyncio
import json
import websockets

async def watch_updates():
    async with websockets.connect("ws://localhost:8000/ws/graph-updates") as ws:
        # Server sends an ack on connect
        ack = json.loads(await ws.recv())
        print("Connected:", ack)

        # Send a ping to verify the connection is alive
        await ws.send("ping")

        async for message in ws:
            event = json.loads(message)
            print("[{}] {}".format(event["event"], event.get("data")))

asyncio.run(watch_updates())
```

WebSocket 消息结构：

```json
{
  "event":     "graph_mutation",
  "data": {
    "event_type":  "ADD_NODE",
    "entity_id":   "node_123",
    "payload":     {}
  },
  "timestamp": "2024-01-15T10:30:00+00:00"
}
```

通过 WebSocket 广播的事件类型包括：`connection_ack`、`pong` 和 `graph_mutation`（当节点或边通过导入或丰富化被添加/更新/删除时触发）。发送文本 `"ping"` 即可收到 `pong` 响应。

<Warning>
  **服务器重启会丢失会话状态。** 没有自动保存功能。在关闭之前，调用 `POST /api/export`，请求体为 `{"format": "json"}`，以下载当前状态。
</Warning>

## 性能

| 场景 | 延迟 |
| :-------- | :------- |
| 节点搜索（118k 节点，已建索引） | 0.004ms |
| 邻居扩展（深度 2） | < 5ms |
| BFS 路径（118k 节点） | < 50ms |
| SPARQL SELECT（简单模式） | < 20ms |
| 距离矩阵（50 节点，语义） | ~2s（使用嵌入缓存） |

节点搜索索引在启动时构建。对于超过 500k 节点的图，请在连接前预留额外的启动时间。

距离矩阵每次请求最多支持 50 个节点对。语义距离要求节点在其属性中存储嵌入。

## 故障排查

**浏览器标签页未打开**
浏览器会在服务器启动 1.5 秒后启动。如果自动打开失败，请使用 `--no-browser` 并手动打开 `http://127.0.0.1:8000`。

**`Error: graph file not found`**
`--graph` 路径必须是已存在的文件。请在启动前检查路径并确认文件存在。

**`Error: uvicorn is required`**
安装 explorer 附加依赖：`pip install "semantica[explorer]"`。

**调用 API 时出现 `Connection refused`**
服务器默认仅绑定到 `127.0.0.1`。若要从其他机器或容器访问 Explorer，请使用 `--host 0.0.0.0` 启动。

**导入后图为空**
导入端点（`/api/import`）仅解析 `.json` 和 `.csv` 文件。其他格式返回 HTTP 422。JSON 文件必须包含顶层的 `entities`/`nodes` 数组或 `relationships`/`edges` 数组。

**`/api/graph/path` 返回 `PathFinder not available` 错误**
路径查找需要 `semantica[kg]` 附加依赖。请使用 `pip install "semantica[all]"` 安装。

**语义邻域返回 503**
语义邻域要求节点属性中存储节点嵌入（键为 `embedding`、`vector` 或 `node2vec_embedding`）。不含嵌入的图会返回 503。

**重启后会话状态丢失**
会话状态仅保存在内存中。请在关闭前使用 `POST /api/export` 保存 JSON 快照。

- [上下文](/zh/reference/context) — 构建并保存 Explorer 加载的 ContextGraph。
- [本体](/zh/reference/ontology) — 以编程方式管理本体并生成 SHACL。
- [可视化](/zh/reference/visualization) — 无需 Explorer 服务器即可进行编程式图渲染。
- [导出](/zh/reference/export) — 无需启动服务器即可导出为 RDF、Parquet 及其他格式。