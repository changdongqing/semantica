---
title: "CrewAI 集成"
description: "通过三个即插即用组件，为 CrewAI crew 提供共享的语义知识图谱、决策智能以及基于图的检索能力。"
icon: "users"
sourceHash: "06747d501988642237019dd40084edf059e6c4dea313164c78a02f58c7a3c099"
---

> 三个即插即用组件，将 Semantica 的知识图谱与决策智能带入任意 CrewAI crew。

## 安装

```bash
pip install "crewai>=0.80.0"
```

需单独安装 —— semantica 不提供 `[crewai]` extra，因为 crewai 硬性锁定 `chromadb~=1.1.0`，而该版本存在尚未修复的严重安全公告（CVE-2026-45829/45830/45831/45833）。如确有需要，请自行安装 `crewai` 并承担相应风险。若未安装 `crewai`，该集成仍可导入 —— 每个类都保留完整的 Semantica API 并优雅降级，但无法传给 `Crew`。

## 组件概览

- **SemanticaKGTool** —— `Agent(tools=[…])`：5 个知识图谱构建/查询操作：抽取实体、抽取关系、加入图、查询图、查找相关项。
- **SemanticaDecisionTool** —— `Agent(tools=[…])`：5 个决策智能操作：记录决策、查找先例、追踪因果链、分析影响、检查策略。
- **SemanticaKnowledgeSource** —— `Crew(knowledge_sources=[…])`：将 `ContextGraph` 序列化到 CrewAI 知识存储中，使每个 agent 都能对图进行检索访问。

## 组件详情

<Tabs>
  <Tab title="SemanticaKGTool">
    让 agent 在推理过程中主动**构建和查询**共享的 `ContextGraph`。

    ```python
    from crewai import Agent, Crew, Task
    from semantica.context import ContextGraph
    from integrations.crewai import SemanticaKGTool

    graph = ContextGraph()

    analyst = Agent(
        role="Knowledge Analyst",
        goal="Build and explore a knowledge graph from documents",
        backstory="You map entities and relationships into a shared graph.",
        tools=[SemanticaKGTool(graph=graph)],
    )

    crew = Crew(
        agents=[analyst],
        tasks=[Task(
            description="Extract and link key entities from the brief",
            expected_output="JSON",
            agent=analyst,
        )],
    )
    crew.kickoff()
    ```

    | 工具 | 描述 |
    | :------ | :------------- |
    | `extract_entities` | 从 `text` 中抽取命名实体 |
    | `extract_relations` | 抽取 `text` 中实体之间的关系 |
    | `add_to_graph` | 从 `text` 中抽取实体/关系并加入共享图 |
    | `query_graph` | 使用 `query` 按节点 id、类型和内容对图进行关键词检索 |
    | `find_related` | 查找与 `entity` 相关的概念，限定在 `hops` 跳以内 |

    所有操作均返回 JSON，便于 agent 解析结果。

    **共享图：** 该工具读写你传入的 `graph`。若未传入 `graph`，则会创建新的内存 `ContextGraph()`（并记录一条警告）—— 两个各自自动创建图的工具实例**不会**共享知识。请将同一个 `ContextGraph` 传给所有需要共享状态的 agent。
  </Tab>
  <Tab title="SemanticaDecisionTool">
    将 Semantica 的决策智能以原生 CrewAI 工具的形式暴露，底层由 `AgentContext` 支撑。

    ```python
    from crewai import Agent, Crew, Task
    from integrations.crewai import SemanticaDecisionTool

    planner = Agent(
        role="Decision Planner",
        goal="Make grounded, precedented decisions",
        backstory="You record decisions and validate them against policy.",
        tools=[SemanticaDecisionTool()],
    )

    crew = Crew(agents=[planner], tasks=[...])
    ```

    若未传入 `AgentContext`，则会在内存中创建一个，启用 `decision_tracking=True` 并带有自己的 `ContextGraph`，因此决策相关操作开箱即用（会记录一条警告 —— 请将同一个 `AgentContext` 传给所有需要共享决策状态的 agent）。`record_decision` 中缺失的可选字段将回退为 `category="general"`、`reasoning="agent decision"` 和 `outcome="recorded"`。`find_precedents` 最多返回 `max_precedents` 条结果。若知识图谱无法追踪因果关系，`trace_causal_chain` 会返回明确的错误，而不会用基于相似度的结果替代。

    | 工具 | 描述 |
    | :------ | :------------- |
    | `record_decision` | 记录一条决策及其推理、结果和置信度 |
    | `find_precedents` | 检索相似的过往决策 |
    | `trace_causal_chain` | 追踪某条决策的因果链 |
    | `analyze_impact` | 评估某条决策的下游影响 |
    | `check_policy` | 依据策略规则校验拟定决策 |

  </Tab>
  <Tab title="SemanticaKnowledgeSource">
    为 **crew 中的每个 agent** 提供对 `ContextGraph` 的检索访问能力。

    ```python
    from crewai import Agent, Crew, Task
    from semantica.context import ContextGraph
    from integrations.crewai import SemanticaKnowledgeSource

    graph = ContextGraph()
    graph.add_node(node_id="privacy", node_type="policy", content="...")

    researcher = Agent(
        role="Policy Researcher",
        goal="Answer questions from the knowledge base",
        backstory="You retrieve from graph knowledge to answer accurately.",
    )

    crew = Crew(
        agents=[researcher],
        tasks=[...],
        knowledge_sources=[SemanticaKnowledgeSource(graph=graph)],
    )
    ```

    在 kickoff 时，图的节点与边会被序列化、分块，并通过 CrewAI 的知识管线存储。

    > **需要嵌入器：** 存储分块需经过 CrewAI 的知识管线，而该管线需要配置嵌入器。请设置 `Crew(embedder=...)`（或提供 CrewAI 回退使用的默认凭据，例如 `OPENAI_API_KEY`）。若未配置可用的嵌入器，存储将失败、记录 ERROR 日志，且 agent 将**检索不到任何内容** —— crew 仍会运行，但其知识查询返回为空。

    **兼容性：** CrewAI 的 `BaseKnowledgeSource` 契约在 `0.80.x` 与当前版本之间发生了变化（`load_content()` → `validate_content()`/`aadd()`）。`SemanticaKnowledgeSource` 同时实现了旧版与现行方法，因此可在 `crewai>=0.80.0` 范围内正常工作。
  </Tab>
</Tabs>

## 检查点与序列化

CrewAI 会将工具和知识来源序列化为 JSON，用于检查点与恢复。Semantica 的实时状态（`ContextGraph`、`AgentContext`、抽取器）**不包含在该序列化中** —— 恢复后的工具/来源会带回一个全新的内存 `ContextGraph` 并记录一条警告。在你重新挂接实时图/上下文之前，恢复的对象会针对**空**图回答查询，因此在恢复后、agent 继续运行前应先重新接好它们（例如 `restored_tool.graph = live_graph`）。

## API 参考

```python
from integrations.crewai import (
    SemanticaKGTool,          # BaseTool: KG construction/query actions
    SemanticaDecisionTool,    # BaseTool: decision intelligence actions
    SemanticaKnowledgeSource, # BaseKnowledgeSource: graph → crew knowledge
    CREWAI_AVAILABLE,         # bool: True if crewai is installed
)
```

这三个类在未安装 `crewai` 时同样可用：它们保留完整的 Semantica API 并优雅降级。

## 另请参阅

- [Context 模块](../reference/context) —— 支撑该集成的 AgentContext 与 ContextGraph。
- [语义抽取](../reference/semantic_extract) —— SemanticaKGTool 使用的 NERExtractor / RelationExtractor。
- [LLM](../reference/llms) —— 为 crew 的 agent 配置 LLM 提供方。
- [向量存储](../reference/vector_store) —— SemanticaDecisionTool 使用的向量后端。