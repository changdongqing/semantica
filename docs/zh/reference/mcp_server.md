---
title: "MCP Server"
description: "Model Context Protocol 服务器：将 Semantica 的完整能力集暴露给 Claude Desktop、VS Code、Cursor 及任何支持 MCP 的工具。"
icon: "plug"
sourceHash: "89a759b5aba3ad0d68148df8753c743b8a7334b597e52f81987440db5dd703ac"
---

**`semantica.mcp_server`** 将 Semantica 的知识图谱、决策智能、语义抽取与推理能力以 [MCP (Model Context Protocol)](https://modelcontextprotocol.io) **stdio 服务器**的形式暴露出来：

- 暴露 15 个 MCP 工具：抽取实体、查询图谱、记录决策、运行推理、导出结果
- 启动后无需编写 Python 代码：配置一次，即可在任何支持 MCP 的客户端中使用
- 兼容 Claude Desktop、Windsurf、Cline、Continue、VS Code、Roo Code、Cursor

## 服务器接口

```json
// Configure in your MCP client (Claude Desktop, Windsurf, Cursor, VS Code, etc.)
{
  "mcpServers": {
    "semantica": {
      "command": "semantica-mcp"
    }
  }
}
```

```bash
# Or run directly
semantica-mcp
# or
python -m semantica.mcp_server
```

<Tip>
  `semantica.mcp_server` 是一个 **stdio 服务器进程**，而非 Python 库。它不暴露任何可导入的类：所有交互都通过已连接的 AI 客户端发起 MCP 工具调用完成。
</Tip>

<Warning>
  **该服务器通过 stdio 通信：不要向 stdout 添加日志。** 任何指向 stdout 的 `print()` 或日志输出都会破坏 JSON-RPC 消息流。所有日志仅写入 `stderr`。可通过 `SEMANTICA_LOG_LEVEL` 环境变量配置日志详细程度。
</Warning>

## 你将获得

- **15 个 MCP 工具** —— 抽取实体、抽取关系、记录决策、查询决策、查找先例、追溯因果链、添加实体、添加关系、运行分析、汇总图谱、运行推理、导出图谱、查询实时图谱、更新节点、归档节点。
- **3 个可读资源** —— 实时图谱 JSON（`semantica://graph/summary`）、决策列表以及 schema/版本信息：任何 MCP 客户端均可读取。
- **零基础设施** —— 通过 stdio 运行：无需服务器、无需端口、无需 Docker。只需一段配置即可在任何 MCP 客户端中启用。
- **持久化图谱** —— 将 `SEMANTICA_KG_PATH` 指向已保存的图谱文件，即可在每次服务器启动时自动重新加载。
- **决策智能** —— 记录决策、通过混合相似度搜索查找先例，并跨 agent 运行追溯因果链。
- **REST 替代方案** —— 如果你更倾向于程序化访问，[Explorer](/zh/reference/explorer) 模块提供完整的 HTTP API 和浏览器仪表盘。

## 安装

```bash
pip install semantica
```

MCP 服务器已包含在基础安装中：无需额外依赖。

## 配置

<Steps>
  <Step title="找到你所用 MCP 客户端的设置文件">

    | 客户端 | 设置文件 |
    | :------ | :------------- |
    | Claude Desktop (macOS) | `~/Library/Application Support/Claude/claude_desktop_config.json` |
    | Claude Desktop (Windows) | `%APPDATA%\Claude\claude_desktop_config.json` |
    | Cursor | 项目中的 `.cursor/mcp.json`，或全局的 `~/.cursor/mcp.json` |
    | VS Code / Continue | `.vscode/mcp.json` 或用户设置 |
    | Windsurf / Cline / Roo Code | 应用专属设置 → MCP Servers |

  </Step>
  <Step title="添加 Semantica MCP 服务器配置">

    <CodeGroup>

    ```json Claude Desktop / Windsurf / Cline
    {
      "mcpServers": {
        "semantica": {
          "command": "semantica-mcp"
        }
      }
    }
    ```

    ```json Cursor
    {
      "mcpServers": {
        "semantica": {
          "command": "semantica-mcp",
          "env": {
            "SEMANTICA_KG_PATH": "/path/to/my_graph.json"
          }
        }
      }
    }
    ```

    ```json VS Code / Continue / Roo Code
    {
      "mcpServers": {
        "semantica": {
          "command": "python",
          "args": ["-m", "semantica.mcp_server"]
        }
      }
    }
    ```

    ```json With persistent graph
    {
      "mcpServers": {
        "semantica": {
          "command": "semantica-mcp",
          "env": {
            "SEMANTICA_KG_PATH": "/path/to/my_graph.json",
            "SEMANTICA_LOG_LEVEL": "INFO"
          }
        }
      }
    }
    ```

    </CodeGroup>

    <Warning>
      **请准确配置 MCP 客户端的 `command` 字段。** `command` 字段必须指向确切的可执行文件路径（在 macOS/Linux 上可使用 `which semantica-mcp` 查找）。路径错误会导致静默失败：服务器只是不会出现在工具列表中。请先用原始的 `echo | semantica-mcp` 命令测试，以确认该二进制文件可正常工作。
    </Warning>

  </Step>
  <Step title="在配置客户端之前先在本地测试">
    ```bash
    # Run the server directly (reads from stdin, writes to stdout)
    semantica-mcp

    # Or via Python module
    python -m semantica.mcp_server

    # Send a JSON-RPC initialize message to confirm it's working
    echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | semantica-mcp
    ```
  </Step>
</Steps>

## 环境变量

| 变量 | 默认值 | 说明 |
| :-------- | :------- | :----------- |
| `SEMANTICA_KG_PATH` | *（无：内存图谱）* | 启动时加载的持久化图谱文件路径 |
| `SEMANTICA_LOG_LEVEL` | `WARNING` | 日志详细程度：`DEBUG`、`INFO`、`WARNING` |

<Warning>
  **除非设置 `SEMANTICA_KG_PATH`，否则图谱初始为空。** MCP 服务器在首次使用时会在内存中创建一个全新的 `ContextGraph`。将 `SEMANTICA_KG_PATH` 设为先前保存的图谱文件，即可在服务器重启之间恢复状态。若不设置，进程退出后所有数据都会丢失。
</Warning>

<Tip>
  **启用调试日志以便排查问题。** 在 MCP 客户端的 `env` 块中设置 `SEMANTICA_LOG_LEVEL=DEBUG`，或直接运行 `python -m semantica.mcp_server` 并查看 stderr 输出。
</Tip>

## 工具

MCP 服务器暴露 15 个工具，任何已连接的 AI 助手均可调用：

| 工具 | 类别 | 说明 |
| :---- | :-------- | :----------- |
| `extract_entities` | 抽取 | NER：识别人名、地点、组织、概念 |
| `extract_relations` | 抽取 | 带类型的关系与三元组抽取 |
| `record_decision` | 决策智能 | 保存决策及其推理过程和结果 |
| `query_decisions` | 决策智能 | 按自然语言或类别搜索已记录的决策 |
| `find_precedents` | 决策智能 | 对过往决策进行混合相似度搜索 |
| `get_causal_chain` | 决策智能 | 追溯上游/下游因果链 |
| `add_entity` | 图谱操作 | 向实时图谱添加节点 |
| `add_relationship` | 图谱操作 | 在两个节点之间添加有向边 |
| `get_graph_summary` | 图谱操作 | 节点数、决策数、图谱状态 |
| `get_graph_analytics` | 图谱操作 | PageRank 中心性与社区发现 |
| `query_graph` | 图谱操作 | 获取节点、遍历其邻居，或对节点进行关键词搜索 |
| `update_node` | 图谱操作 | 将属性合并到节点并持久化到 `SEMANTICA_KG_PATH` |
| `delete_node` | 图谱操作 | 软删除（归档）节点并持久化到 `SEMANTICA_KG_PATH` |
| `run_reasoning` | 推理 | 对事实执行 IF/THEN 规则的前向链 |
| `export_graph` | 推理与导出 | 序列化图谱（`turtle`/`ttl`：RDF Turtle 别名，`nt`、`xml`、`json-ld`、`json`） |

### 知识抽取

<AccordionGroup>

<Accordion title="extract_entities" icon="tag">

使用 Semantica NER 从文本中抽取命名实体（人名、地点、组织、概念）。

**输入：**

```json
{ "text": "Apple Inc. was founded by Steve Jobs in Cupertino in 1976." }
```

**输出：**

```json
{
  "entities": [
    { "label": "Apple Inc.", "type": "ORGANIZATION", "start": 0,  "end": 10,  "confidence": 0.98 },
    { "label": "Steve Jobs", "type": "PERSON",       "start": 26, "end": 36,  "confidence": 0.99 },
    { "label": "Cupertino",  "type": "LOCATION",     "start": 40, "end": 49,  "confidence": 0.97 },
    { "label": "1976",       "type": "DATE",          "start": 53, "end": 57,  "confidence": 0.95 }
  ],
  "count": 4
}
```

</Accordion>

<Accordion title="extract_relations" icon="arrows-left-right">

从文本中抽取带类型的关系和 `(subject, predicate, object)` 三元组。

**输入：**

```json
{ "text": "Steve Jobs founded Apple Inc. and led it until 2011." }
```

**输出：**

```json
{
  "relations": [
    { "source": "Steve Jobs", "type": "founded", "target": "Apple Inc.", "confidence": 0.96 }
  ],
  "triplets": [
    { "subject": "Steve Jobs", "predicate": "founded", "object": "Apple Inc." }
  ],
  "relation_count": 1,
  "triplet_count": 1
}
```

</Accordion>

</AccordionGroup>

### 决策智能

<AccordionGroup>

<Accordion title="record_decision" icon="check-circle">

将带有完整上下文、推理过程和元数据的决策记录到知识图谱中。

**输入：**

```json
{
  "category": "model_selection",
  "scenario": "Choose LLM for production reasoning pipeline",
  "reasoning": "GPT-4 benchmark advantage justifies 3x cost increase",
  "outcome": "selected_gpt4",
  "confidence": 0.91,
  "decision_maker": "product_team",
  "valid_from": "2024-01-01",
  "valid_until": "2024-12-31"
}
```

必需字段：`category`、`scenario`、`reasoning`、`outcome`、`confidence`。
可选字段：`decision_maker`（默认为 `"mcp_client"`）、`valid_from`、`valid_until`。

**输出：**

```json
{ "decision_id": "dec_a1b2c3", "status": "recorded" }
```

</Accordion>

<Accordion title="query_decisions" icon="magnifying-glass">

按自然语言或类别过滤条件查询已记录的决策。

**输入：**

```json
{ "query": "model selection", "category": "model_selection", "limit": 5 }
```

所有字段均为可选。`limit` 默认为 `10`。提供 `query` 时使用相似度搜索；省略时则应用 `category` 过滤。

</Accordion>

<Accordion title="find_precedents" icon="clock-rotate-left">

使用混合相似度搜索查找与给定场景相似的过往决策。

**输入：**

```json
{ "scenario": "Choose cloud provider for HIPAA workload", "max_results": 5 }
```

`max_results` 默认为 `5`，最大为 `50`。

<Tip>
  **在做出高风险决策前使用 `find_precedents`。** 该工具会对所有已记录的决策执行混合相似度搜索。在任何重要决策路径的起点调用它：它会呈现可能直接适用的过往推理，从而减少重复工作并提升跨 agent 运行的一致性。
</Tip>

</Accordion>

<Accordion title="get_causal_chain" icon="diagram-project">

从某个决策出发，追溯上游或下游因果链。

**输入：**

```json
{ "decision_id": "dec_a1b2c3", "direction": "downstream", "max_depth": 5 }
```

`direction` 接受 `"upstream"` 或 `"downstream"`（默认：`"downstream"`）。
`max_depth` 默认为 `5`，最大为 `20`。

</Accordion>

</AccordionGroup>

### 图谱操作

<AccordionGroup>

<Accordion title="add_entity" icon="circle-plus">

向实时知识图谱添加节点/实体。

**输入：**

```json
{
  "id": "apple_inc",
  "label": "Apple Inc.",
  "type": "Organization",
  "metadata": { "founded": 1976, "hq": "Cupertino" }
}
```

仅 `id` 为必需。`label` 默认为 `id` 的值。`type` 默认为 `"Entity"`。

</Accordion>

<Accordion title="add_relationship" icon="arrow-right">

在两个已有实体之间添加有向关系（边）。

**输入：**

```json
{
  "source": "steve_jobs",
  "target": "apple_inc",
  "type": "FOUNDED",
  "metadata": { "year": 1976 }
}
```

`source` 和 `target` 为必需。`type` 默认为 `"RELATED_TO"`。

</Accordion>

<Accordion title="get_graph_summary" icon="info-circle">

返回当前知识图谱的高层摘要。

**输出：**

```json
{
  "node_count": 42,
  "decision_count": 5,
  "graph_ready": true
}
```

不接受任何输入参数。

</Accordion>

<Accordion title="get_graph_analytics" icon="chart-bar">

在当前图谱上计算 PageRank 中心性与社区发现。返回按 PageRank 排序的头部节点、社区数量以及整体节点/边数量。

不接受任何输入参数。

</Accordion>

<Accordion title="query_graph" icon="magnifying-glass">

以三种模式之一读取实时图谱，由 `mode` 指定：

- `node` —— 按 `node_id` 返回单个节点。
- `neighbors`（默认）—— 从 `node_id` 向外和向内遍历最多 `depth` 跳（限制为 1-5，默认 1）。可选 `relationship_types` 用于过滤边类型；可选 `limit` 用于限制结果数量。
- `search` —— 将 `query` 与每个节点的 id 和内容进行关键词匹配。可选 `node_type` 用于限制扫描范围；`limit` 默认为 50。

**输入：**

```json
{ "mode": "neighbors", "node_id": "apple_inc", "depth": 2 }
```

</Accordion>

<Accordion title="update_node" icon="pen">

将一组属性合并到已有节点。更改会应用于内存中，并且在设置了 `SEMANTICA_KG_PATH` 时写回该文件，以便在重启后仍然保留。未配置路径时返回 `persisted: false`。

**输入：**

```json
{
  "node_id": "task_42",
  "properties": { "status": "done", "note": "shipped in v0.6.7" }
}
```

`node_id` 和非空的 `properties` 对象为必需。更新不存在的节点会返回错误。

</Accordion>

<Accordion title="delete_node" icon="box-archive">

软删除节点：节点仍保留在图谱中以供追溯，但被标记为 `status: "archived"`。配置了 `SEMANTICA_KG_PATH` 时会持久化到该路径。

**输入：**

```json
{ "node_id": "task_42" }
```

</Accordion>

</AccordionGroup>

### 推理

<AccordionGroup>

<Accordion title="run_reasoning" icon="brain">

在一组事实之上运行前向链 IF/THEN 规则，以推导出新的事实。

**输入：**

```json
{
  "facts": ["Employee(John)", "Manager(John)"],
  "rules": ["IF Manager(?x) THEN HasAuthority(?x)"]
}
```

**输出：**

```json
{ "derived_facts": ["HasAuthority(John)"] }
```

</Accordion>

</AccordionGroup>

### 导出

<AccordionGroup>

<Accordion title="export_graph" icon="file-export">

将当前知识图谱导出为某种序列化格式。

**输入：**

```json
{ "format": "json-ld" }
```

支持的格式：`turtle`、`ttl`、`nt`、`xml`、`json-ld`、`json`。默认为 `json-ld`。

</Accordion>

</AccordionGroup>

## 资源

MCP 服务器对外提供三个可读资源：

| URI | 描述 |
| :--- | :----------- |
| `semantica://graph/summary` | 图的高层级统计信息 |
| `semantica://decisions/list` | 所有已记录的决策（最多 50 条） |
| `semantica://schema/info` | 服务器版本与可用工具 |

- [上下文](/zh/reference/context) — MCP 服务器所操作的 ContextGraph。
- [语义抽取](/zh/reference/semantic_extract) — 为 MCP 工具提供支撑的 NER 与关系抽取。
- [推理](/zh/reference/reasoning) — run_reasoning 背后的前向链引擎。
- [Agno 集成](../integrations/agno) — 在 Agno 多智能体团队中使用 Semantica。