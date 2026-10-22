---
title: "MCP Server"
description: "将 Semantica 的知识图谱、决策智能与推理能力接入 Claude Desktop、Windsurf、VS Code、Cline 以及任何兼容 MCP 的 AI 客户端。"
icon: "plug"
sourceHash: "21ddc44ed8597e2799cfc33f8f386de782b0c6b619a2fe1008281f4140788792"
---

## 什么是 MCP？

MCP 全称 Model Context Protocol（模型上下文协议）。它是一个开放标准，允许外部 AI 助手（如 Claude Desktop、Cursor 或 Windsurf）安全地访问本地工具与数据源。

Semantica MCP 服务器将你的知识图谱暴露为 15 个可调用工具。连接后，任何兼容的 AI 客户端都能在对话过程中实时遍历图谱、记录决策、运行分析并导出结果，无需自定义工具封装。

<Info>
  Semantica MCP 服务器暴露 15 个工具与 3 个只读资源。所有工具均接受并返回 JSON。除用于图谱持久化的可选环境变量外，无需任何配置。
</Info>

## 架构与通信

理解 MCP 的底层工作机制很重要。**Semantica MCP 服务器不是 REST API。** 它没有网络端口、没有 HTTP 端点，也不需要 API 密钥。

相反，AI 客户端会在本地将 `semantica-mcp` 作为子进程启动。AI 与 Semantica 之间的所有通信都通过标准输入与输出（`stdio`）安全进行。由于服务器以你的用户账户在本地运行，它天然拥有你的本地文件权限。

## 为什么将 MCP 与 Semantica 结合使用？

- **零代码集成**：无需编写胶水代码，即可将 Semantica 的图能力接入你的 AI IDE 或桌面聊天应用。
- **实时图谱更新**：通过与 AI 对话，从文档中抽取实体并填充你的实时知识图谱。
- **可审计的 AI**：借助 AI 做出决策，并通过 Semantica 的决策智能工具自动将推理过程与因果链直接记录到图谱中。

## 何时使用 / 何时不使用

- **在以下情况使用 MCP**：你希望第三方 AI 界面（如 Claude Desktop 或 Windsurf）在本机上操作、查询并推理 Semantica 知识图谱。
- **在以下情况使用 `AgentContext`**：你正在构建自主 Python 脚本或后端服务。如果你在编写 Python 代码来构建 agent，请原生使用 `semantica.context.AgentContext`，而不是启动 MCP 服务器。MCP 服务器不支持通过 HTTP/SSE 远程托管。

---

## 典型工作流

连接 AI 客户端遵循一套标准流程：

1. **安装**：在你的 Python 环境中安装 Semantica。
2. **配置客户端**：将 `semantica-mcp` 命令与图谱的绝对路径添加到 AI 客户端的 JSON 配置中。
3. **启动客户端**：启动 Claude Desktop 或 Windsurf，它们会自动拉起 MCP 服务器。
4. **工具调用**：用自然语言提示 AI。AI 会自主串联 15 个可用工具。
5. **图谱更新**：AI 直接修改你的本地图谱，添加实体、边与决策。

---

## 启动服务器

安装 Semantica，然后配置你的客户端以启动 MCP 服务器。服务器使用 `stdio` 传输层运行。

```bash
pip install semantica
```

```bash
# Via the CLI entry-point (recommended)
semantica-mcp

# Or via the Python module directly
python -m semantica.mcp_server
```

默认情况下，服务器以 `WARNING` 级别记录日志，不产生任何启动输出。设置 `SEMANTICA_LOG_LEVEL=INFO`（或 `DEBUG`）可在 stderr 上查看启动信息。若未设置 `SEMANTICA_KG_PATH`，服务器会初始化一个空的内存图谱，这足以用于测试。若需要可跨重启保留的持久化图谱，请设置路径：

```bash
SEMANTICA_KG_PATH=/data/threat_graph.json semantica-mcp
```

<Info>
  若未设置 `SEMANTICA_KG_PATH`，图谱会在服务器进程退出时重置。对于任何需要跨重启保留数据的会话，务必使用绝对文件路径设置该变量。
</Info>

## 连接到 Claude Desktop

编辑 Claude Desktop 配置文件。在 macOS 上位于 `~/Library/Application Support/Claude/claude_desktop_config.json`，在 Windows 上位于 `%APPDATA%\Claude\claude_desktop_config.json`：

```json
{
  "mcpServers": {
    "semantica": {
      "command": "semantica-mcp",
      "env": {
        "SEMANTICA_KG_PATH": "/absolute/path/to/knowledge_graph.json",
        "SEMANTICA_LOG_LEVEL": "INFO"
      }
    }
  }
}
```

保存后重启 Claude Desktop。Semantica 工具会自动出现在工具面板中，Claude 可以在任意对话中调用它们。

若 `semantica-mcp` 不在系统 PATH 中（例如安装在 virtualenv 内），请在 `"command"` 中使用完整的绝对二进制路径：`"/path/to/venv/bin/semantica-mcp"`。

## 连接到其他客户端

**Windsurf。** 在 Settings → MCP Servers → Add Server 中添加，或编辑 `~/.windsurf/mcp_servers.json`：

```json
{
  "semantica": {
    "command": "semantica-mcp",
    "env": { "SEMANTICA_KG_PATH": "/absolute/path/to/knowledge_graph.json" }
  }
}
```

**VS Code（Cline / Roo Code / Continue）。** 在项目根目录的 `.mcp.json` 中添加：

```json
{
  "servers": {
    "semantica": {
      "type": "stdio",
      "command": "semantica-mcp",
      "env": {
        "SEMANTICA_KG_PATH": "${workspaceFolder}/knowledge_graph.json",
        "SEMANTICA_LOG_LEVEL": "DEBUG"
      }
    }
  }
}
```

**Docker**：

```bash
docker run --rm -i \
  -e SEMANTICA_KG_PATH=/data/kg.json \
  -v /local/absolute/path:/data \
  ghcr.io/semantica-agi/semantica-mcp:latest
```

## Agent 能做什么：15 个工具

连接后，LLM 可在对话中调用其中任意工具。Agent 会自动串联它们。你只需描述想要什么，而无需编排调用顺序。

**实体与关系抽取。** `extract_entities` 从自由文本中抽取命名实体；`extract_relations` 抽取语义关系与 RDF 三元组。这两个工具无需任何预处理，即可把原始 OSINT 报告转化为结构化的图谱输入。

**知识图谱操作。** `add_entity` 添加节点，`add_relationship` 添加有向边。抽取完成后，Agent 调用它们把发现的内容持久化到实时图谱中。

**实时图谱查询与编辑。** `query_graph` 无需导出即可读取图谱：获取单个节点、沿邻居遍历最多五跳，或按关键词搜索节点。`update_node` 将属性合并到已有节点（例如把任务节点标记为 `done`），`delete_node` 归档不再跟踪的节点。设置 `SEMANTICA_KG_PATH` 后，`update_node` 与 `delete_node` 的修改会写回该文件，从而在重启后依然保留。

**决策智能。** `record_decision` 将决策写为溯源节点，包含置信度评分、推理过程与决策者身份。`query_decisions` 按查询或类别检索历史决策。`find_precedents` 按语义相似度查找最相似的历史决策。`get_causal_chain` 向上游或下游追踪决策因果关系。

**推理。** `run_reasoning` 对一组事实应用前向链 IF/THEN 规则，并返回推导出的结论。

**分析与导出。** `get_graph_analytics` 计算 PageRank 中心性与社区发现。`get_graph_summary` 返回节点数、决策数与服务器状态。`export_graph` 将当前图谱序列化为 Turtle（`"turtle"` / `"ttl"`）、RDF/XML（`"xml"`）、N-Triples（`"nt"`）、JSON-LD（`"json-ld"`）或纯 JSON（`"json"`）。

## 通用示例：员工目录

在深入复杂的领域示例之前，先看一个简单且普遍易懂的会话。一位 HR 经理在 Claude Desktop 中输入提示：

> “从这段关于 Alice 转入 Engineering 部门的会议记录中抽取实体，将它们加入图谱，并记录一条晋升决策。”

Claude 自动串联四次工具调用：

```text
1. extract_entities(text="Alice is transferring to Engineering...")
   → { "entities": [{"label": "Alice", "type": "Employee"}, {"label": "Engineering", "type": "Department"}] }

2. add_entity(id="emp-alice", label="Alice", type="Employee")
   add_entity(id="dept-eng", label="Engineering", type="Department")

3. add_relationship(source="emp-alice", target="dept-eng", type="WORKS_IN")

4. record_decision(
       category="promotion",
       scenario="Alice transferring to Engineering",
       reasoning="Approved by Engineering Director",
       outcome="transfer_approved",
       confidence=1.0
   )
```
图谱会立即更新，包含新的组织结构与完全可审计的决策轨迹。

## 观察一次真实的 Agent 会话

以下是一名网络安全分析师在 Claude Desktop 中输入提示、且图谱已在线时发生的情况。提示为：

> “从这份 OSINT 报告中抽取实体与关系，将它们加入知识图谱，然后为 APT29 记录一条置信度 0.88 的归因决策，并将完整图谱导出为 Turtle。”

Claude 自动串联六次工具调用：

```text
1. extract_entities(text="<report text>")
   → { "entities": [{"label": "APT29", "type": "ThreatActor"}, ...] }

2. extract_relations(text="<report text>")
   → { "relations": [{"source": "APT29", "type": "EXPLOITS", "target": "CVE-2024-3400"}] }

3. add_entity(id="apt29", label="APT29", type="ThreatActor", metadata={"alias": "NOBELIUM"})
   → { "status": "added", "id": "apt29" }
   (repeated for each extracted entity)

4. add_relationship(source="apt29", target="cve-2024-3400", type="EXPLOITS",
                    metadata={"confidence": 0.97})
   → { "status": "added" }
   (repeated for each extracted relation)

5. record_decision(
       category="threat_attribution",
       scenario="C2 beacon from 185.220.101.47, TTP T1566.001 observed",
       reasoning="IP overlaps APT29 infrastructure cluster; TTPs match NOBELIUM phishing playbook",
       outcome="attributed_to_apt29",
       confidence=0.88,
       decision_maker="analyst_zhang"
   )
   → { "decision_id": "dec_a3f2b1", "status": "recorded" }

6. export_graph(format="turtle")
   → { "format": "turtle", "data": "@prefix ... <apt29> a :ThreatActor ..." }
```

分析师只用自然语言提出了一个问题。针对实时图谱数据执行了六次结构化工具调用。结果是在单轮对话中得到：一个已填充的图谱、一条带完整溯源的归因决策记录，以及一份可直接送入 SPARQL 端点的 Turtle 导出。

## 三个只读资源

资源无需工具调用即可暴露图谱状态。客户端可在任意时刻读取：

| URI | 描述 |
| :-- | :---------- |
| `semantica://graph/summary` | 节点数、决策数、服务器状态 |
| `semantica://decisions/list` | 最多 50 条最近记录的决策 |
| `semantica://schema/info` | 服务器版本、能力、可用工具列表 |

## 领域示例

<Tabs>

<Tab title="国防：CTI/威胁情报">

CTI 团队使用 Claude Desktop 将新的 OSINT 报告与既有威胁图谱关联、记录归因决策，并通过自然语言查询因果链，图谱实时更新。

**分析师提示：**
> “从这份关于 APT40 的 Mandiant 报告中抽取实体，加入知识图谱，查找任何关于 APT40 归因的历史决策，并记录一条置信度 0.84 的新归因决策。”

Claude 自动串联：

1. `extract_entities(text="Mandiant APT40 report text...")`
2. `add_entity(id="apt40", type="ThreatActor", label="APT40")`
3. `find_precedents(scenario="APT40 spear-phishing campaign attribution", max_results=3)`
4. `record_decision(category="attribution", scenario="APT40 campaign matches known TTPs", outcome="attributed_apt40", confidence=0.84, decision_maker="cti_lead_01")`
5. `export_graph(format="json-ld")`

分析师在图谱中拥有该归因决策的可审计记录，已与其来源实体关联，可直接用于情报共享。

</Tab>

<Tab title="安全：SOC/事件响应">

在实时事件处置中，SOC 使用 Claude 对图谱进行推理、应用零信任策略规则，并记录遏制决策及其因果链，形成实时审计轨迹。

**SOC 分析师提示：**
> “将 WKSTN-047 与 DC01 添加为主机，添加它们之间的横向移动关系，运行推理以判定严重程度，并记录一条遏制决策。”

Claude 串联：

1. `add_entity(id="wkstn-047", type="Host", label="WKSTN-047")`
2. `add_entity(id="dc01", type="Host", label="DC01")`
3. `add_relationship(source="wkstn-047", target="dc01", type="lateral_movement")`
4. `run_reasoning(facts=["Host(WKSTN-047)", "LateralMove(WKSTN-047, DC01)", "DC(DC01)"], rules=["IF LateralMove(X, Y) AND DC(Y) THEN CriticalIncident(X)"])`
5. `record_decision(category="containment", scenario="Lateral movement to DC detected", outcome="isolate_wkstn047", confidence=0.95)`
6. `get_causal_chain(decision_id="...", direction="downstream", max_depth=3)`

遏制决策及其下游影响被记录到图谱中，供事后复盘使用。

</Tab>

<Tab title="生命科学：临床/制药">

临床 AI 助手使用 MCP 服务器记录带溯源的治疗决策、检索指南先例，并导出决策图谱用于监管提交与 MDT 评审。

**临床提示：**
> “患者 eGFR 为 28，正在服用二甲双胍。查找肾功能严重受损情况下二甲双胍剂量调整的先例，然后记录一条治疗调整决策。”

Claude 调用：

1. `find_precedents(scenario="metformin with eGFR below 30", max_results=5)`
2. `record_decision(category="treatment_modification", scenario="eGFR 28, current metformin 1000mg BD", reasoning="eGFR 28 is below the 30 mL/min/1.73m2 absolute contraindication threshold per BNF and NICE NG28", outcome="discontinue_metformin_switch_to_gliclazide", confidence=0.97, decision_maker="clinical_ai_v2")`
3. `get_causal_chain(direction="upstream")` 呈现驱动该决策的指南节点
4. `export_graph(format="json-ld")` 生成供 MDT 评审的决策图谱

图谱记录该决策、其指南依据与因果链。所有这些都可检索以用于监管审计。

</Tab>

<Tab title="银行：风险/合规">

信用风险团队使用 MCP 服务器记录每一笔信贷决策及其推理链、呈现监管先例，并导出合规图谱用于 Basel III 模型治理评审。

**信用分析师提示：**
> “为 APP-2025-994421（LTV 78%、DSTI 38%、信用评分 714）记录一条有条件抵押贷款批准，查找三条最相似的历史批准记录，并返回该决策的因果链。”

Claude 调用：

1. `record_decision(category="mortgage_origination", scenario="LTV 78%, DSTI 38%, credit score 714, first-time buyer", reasoning="LTV within 80% cap; DSTI 38% under stressed rate scenario breaches 35% guideline — conditional approval with LMI requirement", outcome="approved_conditional_lmi", confidence=0.89, decision_maker="credit_model_v3")`
2. `find_precedents(scenario="mortgage approval borderline DSTI stress test", max_results=3)`
3. `get_causal_chain(decision_id="...", direction="upstream", max_depth=5)`
4. `export_graph(format="turtle")` 生成供模型治理委员会使用的决策溯源图谱

结果是带先例链接、完全可审计的信贷决策轨迹，可直接用于 SR 11-7 模型风险治理评审。

</Tab>

</Tabs>

---

## 常见陷阱

- **把 MCP 当作 HTTP 服务器。** 不要尝试用 `curl` 访问 MCP 服务器，也不要寻找端口号。它通过 `stdin/stdout` 通信，等待父级 AI 客户端发来 JSON-RPC 消息。
- **为 `SEMANTICA_KG_PATH` 使用相对路径。** 由于 AI 客户端以子进程方式启动服务器，工作目录可能不可预测。务必使用绝对路径（例如 `C:\Users\Name\graph.json` 或 `/Users/name/graph.json`），以免数据丢失。
- **虚拟环境 PATH 问题。** 如果你将 Semantica 安装在 Python 虚拟环境中，Claude Desktop 无法自动在全局系统 PATH 中找到 `semantica-mcp`。你必须在 `"command"` 字段中提供该二进制的绝对路径。
- **期待远程托管支持。** 基于 stdio 的 MCP 服务器必须与 AI 客户端运行在同一台本地机器上。不支持通过网络远程执行。
- **将 MCP 集成与 `AgentContext` 混淆。** 如果你在编写自己的 Python 代码来编排 LLM，不要使用 MCP 服务器，而应在代码中直接使用 `AgentContext` 类。

---

## 故障排查

**服务器未出现在 Claude Desktop 中。** 编辑配置后请完全退出并重新打开 Claude Desktop（仅关闭窗口不够）。验证二进制文件是否在 PATH 中：Unix 上使用 `which semantica-mcp`，Windows 上使用 `where semantica-mcp`。若使用 virtualenv，请在 `"command"` 中使用绝对二进制路径。设置 `SEMANTICA_LOG_LEVEL=DEBUG` 并检查 stderr 中的启动错误。

**会话之间图谱数据未持久化。** 将 `SEMANTICA_KG_PATH` 设置为绝对文件路径。若不设置，图谱仅存在于内存中，每次服务器重启都会重置。

**工具调用返回空结果。** `get_graph_summary` 返回 `"node_count": 0` 表示图谱为空。可通过 `add_entity` 与 `add_relationship` 填充，或先对文本运行 `extract_entities`，再对每个结果调用 `add_entity`。

**`SEMANTICA_KG_PATH` 上的权限错误。** 服务器进程需要对该文件及其父目录具有读写权限。若在 Docker 中运行，请检查卷挂载与文件所有权。

## 相关指南

- [推理与规则](/zh/guides/reasoning)：`run_reasoning` 工具背后的引擎
- [决策智能](/zh/guides/decision-intelligence)：决策如何以因果图节点形式存储
- [上下文图](/zh/guides/context-graphs)：`add_entity` 与 `add_relationship` 写入的图
- [导出与序列化](/zh/guides/export)：通过 `export_graph` 可用的所有导出格式
- [本体管理](/zh/guides/ontology)：从通过 MCP 构建的图谱生成 OWL 本体