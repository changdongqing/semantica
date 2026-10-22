---
title: "Explorer 设置"
description: "安装 Explorer 附加组件，将 ContextGraph 保存为 JSON，并启动交互式浏览器仪表盘。"
icon: "map"
sourceHash: "379de8543415aa735195db69e31d4d76107cfe4990b866477bb9032849739441"
---

**`semantica-explorer`** 是一个用于知识图谱探索的**交互式浏览器仪表盘**。你向它提供一个图文件，它启动本地服务器，并打开浏览器标签页；在其中可以搜索节点、查找路径、检查溯源并运行分析：启动后无需编写代码。

本页涵盖从零开始到运行 Explorer 所需的全部内容。完整的 REST API 参考和端点目录，请参阅 [Explorer 参考](/zh/reference/explorer)。


## 前置条件

Explorer 依赖 FastAPI 和 uvicorn，它们未包含在基础安装中：

```bash
pip install semantica[explorer]
```

<Note>
  仅执行 `pip install semantica` 是不够的。未安装 `[explorer]` 附加组件时运行 `semantica-explorer` 会立即打印错误并以退出码 1 退出。
</Note>

验证：

```bash
semantica-explorer --help
```

你应该会看到包含四个可用标志的用法消息。如果看到 `command not found`，请先激活虚拟环境。有关 PATH 的帮助，请参阅 [CLI 设置](/zh/cli-setup#troubleshooting)。


## 最小端到端示例

以下四个步骤即可让 Explorer 运行起来：

```python
from semantica.context import ContextGraph

# 1. Create a graph
graph = ContextGraph()

# 2. Add a node
graph.add_node("python", "language", content="Python programming language")

# 3. Save to disk
graph.save_to_file("my_graph.json")
```

```bash
# 4. Launch Explorer
semantica-explorer --graph my_graph.json
```

浏览器会在 `http://127.0.0.1:8000` 打开。健康端点可确认服务器已启动：

```bash
curl http://127.0.0.1:8000/api/health
# {"status": "ok"}
```


## 步骤 1：构建并保存 ContextGraph

Explorer 从磁盘上的 JSON 文件加载图。你需要先创建该文件。

<Steps>
  <Step title="构建图">
    ```python
    from semantica.context import ContextGraph

    graph = ContextGraph()

    # add_node(node_id, node_type, content=None, **properties)
    graph.add_node("python",  "language",  content="Python programming language")
    graph.add_node("fastapi", "framework", content="FastAPI web framework")
    graph.add_node("guido",   "person",    content="Guido van Rossum")

    # add_edge(source_id, target_id, edge_type="related_to", weight=1.0, **properties)
    graph.add_edge("python",  "fastapi", "enables")
    graph.add_edge("guido",   "python",  "created")
    ```
  </Step>
  <Step title="保存为 JSON 文件">
    ```python
    graph.save_to_file("my_graph.json")
    ```

    `save_to_file` 会将包含 `graph_id`、`nodes`、`edges` 和 `links` 的 JSON 对象写入指定路径。
  </Step>
  <Step title="验证文件可加载（可选的健全性检查）">
    ```python
    from semantica.context import ContextGraph

    check = ContextGraph()
    check.load_from_file("my_graph.json")
    print(check.stats())
    # {
    #   "node_count": 3,
    #   "edge_count": 2,
    #   "node_types": {"language": 1, "framework": 1, "person": 1},
    #   "edge_types": {"enables": 1, "created": 1},
    #   "density": ...
    # }
    ```

    如果此代码运行无错误，Explorer 将能成功加载该文件。
  </Step>
</Steps>

<Tip>
  如果流水线已经生成了保存的图，可直接跳到步骤 2，前提是该文件是使用 `ContextGraph.save_to_file()` 保存的。
</Tip>


## 步骤 2：启动 Explorer

```bash
semantica-explorer --graph my_graph.json
```

启动序列会打印：

```
✓ Graph loaded: 3 nodes, 2 edges
╭─ Semantica Explorer · http://127.0.0.1:8000 ─╮
│  API docs  http://127.0.0.1:8000/docs         │
│  Health    http://127.0.0.1:8000/api/health   │
╰───────────────────────────────────────────────╯
```

服务器启动后不久，浏览器会自动打开 `http://127.0.0.1:8000`。


## CLI 标志

`semantica-explorer` 恰好接受四个标志：

| 标志 | 短标志 | 默认值 | 描述 |
| :---- | :----- | :------- | :----------- |
| `--graph` | `-g` | *(**必填**)* | ContextGraph JSON 文件的路径 |
| `--port` | `-p` | `8000` | 绑定服务器的端口 |
| `--host` |: | `127.0.0.1` | 绑定服务器的主机 |
| `--no-browser` |: | 关闭 | 不自动打开浏览器标签页 |

没有用于身份验证、日志级别或 TLS 的标志。CLI 中未实现这些功能。

### 示例

```bash
# Minimal: local only, port 8000, browser opens automatically
semantica-explorer --graph my_graph.json

# Short flags
semantica-explorer -g my_graph.json -p 8080

# Expose on the network so other machines can connect
semantica-explorer --graph my_graph.json --host 0.0.0.0 --port 8080

# Headless: skip the auto-open and navigate manually
semantica-explorer --graph my_graph.json --no-browser
```

<Warning>
  `--host 0.0.0.0` 会使 Explorer 在所有网络接口上可访问。自 v0.6.5 起，Explorer API 要求 `SEMANTICA_API_KEY`（通过 `X-API-Key` 请求头发送），未配置时会以 `503` 失败关闭；仅在显式设置 `SEMANTICA_ALLOW_ANONYMOUS=true` 时才可能进行未认证访问。仅可在受信任的私有网络上使用此选项。
</Warning>

<Tip>
  **CORS 与 WebSocket 来源：** `semantica-explorer` 会自动允许来自 `localhost` 和 `127.0.0.1` 的浏览器连接，使用配置的 `--port`（以及 Vite 开发端口 `5173`）。当 `--host` 不是回环地址时，`http://<host>:<port>` 也会被允许，因此从 Explorer 所服务的地址打开的浏览器可以连接；IPv6 主机按浏览器发送时的形式写在方括号中（`--host fe80::1` 允许 `http://[fe80::1]:<port>`）。使用 `--port 0` 时，操作系统会在启动后选择端口，因此不会添加端口来源：请设置 `ALLOWED_ORIGINS` 将其包含在内。若要为 HTTP CORS 和 `/ws/graph-updates` WebSocket 连接允许外部浏览器来源或自定义域，请设置 `ALLOWED_ORIGINS` 环境变量（例如 `ALLOWED_ORIGINS="https://explorer.example.com"`）。不在允许列表中的来源会导致 WebSocket 握手以 HTTP 403 失败；对于自定义或外部客户端，请将该来源添加到 `ALLOWED_ORIGINS` 以解决此问题。`EXPLORER_CORS_ORIGINS` 也作为旧版别名受支持。
</Tip>


## 浏览器访问

服务器运行后：

| URL | 可访问内容 |
| :--- | :------------ |
| `http://127.0.0.1:8000` | 交互式仪表盘 |
| `http://127.0.0.1:8000/docs` | Swagger UI：所有 REST 端点，可交互操作 |
| `http://127.0.0.1:8000/api/health` | 健康检查：`{"status": "ok"}` |

浏览器标签页会在启动后不久打开。如果未打开，请手动导航到该 URL，或传入 `--no-browser` 后自行打开。


## 作为 Python 模块运行

如果 `semantica-explorer` 不在 `PATH` 中，请使用模块形式：

```bash
python -m semantica.explorer --graph my_graph.json --port 8080
```


## 常见启动错误

<AccordionGroup>

<Accordion title="错误：找不到图文件" icon="file-circle-xmark">

传给 `--graph` 的路径必须指向一个存在的文件。CLI 在加载任何内容之前会使用 `os.path.isfile()` 进行检查。

```bash
# Confirm the file exists
ls my_graph.json                                          # Linux / Mac
dir my_graph.json                                         # Windows

# Use the full path if needed
semantica-explorer --graph /absolute/path/to/my_graph.json
```

</Accordion>

<Accordion title="错误：需要 uvicorn" icon="triangle-exclamation">

未随基础包一起安装 `[explorer]` 附加组件：

```bash
pip install semantica[explorer]
```

</Accordion>

<Accordion title="Explorer 启动后显示零个节点" icon="circle-xmark">

文件已加载，但不包含任何节点。使用 Python 验证：

```python
from semantica.context import ContextGraph
g = ContextGraph()
g.load_from_file("my_graph.json")
print(g.stats())  # check node_count
```

`node_count` 为 `0` 表示在添加任何节点之前就保存了图。请确保在 `save_to_file()` 之前调用了 `add_node()`。

</Accordion>

<Accordion title="从另一台机器连接被拒绝" icon="network-wired">

默认的 `--host 127.0.0.1` 仅接受来自同一台机器的连接。要允许远程访问：

```bash
semantica-explorer --graph my_graph.json --host 0.0.0.0
```

</Accordion>

<Accordion title="浏览器标签页未打开" icon="browser">

在无头、SSH 和容器环境中这是预期行为。传入 `--no-browser` 以抑制该警告，然后在可访问服务器的浏览器中打开 `http://127.0.0.1:8000`。

</Accordion>

</AccordionGroup>


## Explorer 提供的能力

运行后，Explorer 会暴露 REST API 和仪表盘，用于：

- **节点与边搜索**：按 ID、类型和内容对所有节点进行索引搜索
- **邻域扩展**：检查邻居，支持可配置的跳数深度
- **路径查找**：任意两个节点之间的 BFS 最短路径
- **图分析**：中心性、社区检测、连通性
- **决策与溯源**：查询已记录的决策及其因果链
- **导入 / 导出**：上传 JSON 或 CSV 来扩展图；下载当前状态

完整的端点目录记录在 `/docs` 的 Swagger UI 以及下面的参考页面中。

- [Explorer 参考](/zh/reference/explorer)：每个 REST 端点、WebSocket 事件、分析功能以及所有支持的标志。
- [CLI 设置](/zh/cli-setup)：全部五个 Semantica 可执行文件以及各适用场景。
- [Context 模块](/zh/reference/context)：ContextGraph 的完整文档（构建、查询、保存和加载）。
- [快速开始](/zh/quickstart)：端到端流水线（摄取 → 抽取 → 构建图 → 导出）。