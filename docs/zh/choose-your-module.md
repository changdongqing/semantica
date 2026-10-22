---
title: "选择合适的模块"
description: "在 30 秒内将你的目标映射到合适的 Semantica 模块。"
icon: "compass"
sourceHash: "6d6034970b34eb0505ef547b555bcb88e32806588906b6fcc1e7f797df58b727"
---

<Info>
  每个模块都可独立工作：只导入你需要的内容。本页将开发者目标映射到起点。[模块参考](/zh/modules) 深入介绍了每个模块。
</Info>

## 快速参考

在下方找到你的目标。**模块**列是你的导入路径；**关键类**是你首先实例化的类。

| 我想要… | 模块 | 关键类 |
| :------------ | :------ | :--------- |
| 加载 PDF、DOCX、HTML、CSV 或压缩包 | `ingest` | `FileIngestor` |
| 爬取网站 | `ingest` | `WebIngestor` |
| 加载 Parquet 文件或分区数据集 | `ingest` | `ParquetIngestor` |
| 摄取带 schema 校验的 XML | `ingest` | `XMLIngestor` |
| 从 SQL、Snowflake、Databricks、Kafka 或电子邮件摄取 | `ingest` | `DBIngestor`、`SnowflakeIngestor`、`DatabricksIngestor`、`StreamIngestor` |
| 从文档中提取干净的文本和表格 | `parse` | `DocumentParser` |
| 使用 OCR 或分栏布局解析复杂 PDF | `parse` | `DoclingParser` |
| 为嵌入或 RAG 分块文本 | `split` | `TextSplitter` |
| 规范化文本、日期、实体或编码 | `normalize` | `TextNormalizer`、`EntityNormalizer` |
| 在文本中查找命名实体（人物、组织、地点） | `semantic_extract` | `NERExtractor` |
| 从文本中提取带类型的关系 | `semantic_extract` | `RelationExtractor` |
| 提取 RDF 主语–谓语–宾语三元组 | `semantic_extract` | `TripletExtractor` |
| 构建可查询的知识图谱 | `kg` | `GraphBuilder` |
| 为事实添加时间有效性（`valid_from` / `valid_until`） | `kg` | `TemporalGraphQuery` |
| 运行图算法（中心性、社区、路径） | `kg` | `GraphAnalyzer`、`CentralityCalculator` |
| 生成向量嵌入 | `embeddings` | `EmbeddingGenerator` |
| 存储和搜索向量 | `vector_store` | `VectorStore` |
| 将图持久化到 Neo4j 或 FalkorDB | `graph_store` | `Neo4jStore`、`FalkorDBStore` |
| 存储 RDF 三元组并使用 SPARQL 查询 | `triplet_store` | `TripletStore` |
| 跨来源对实体去重 | `deduplication` | `DuplicateDetector`、`EntityMerger` |
| 检测并消解矛盾事实 | `conflicts` | `ConflictDetector`、`ConflictResolver` |
| 为 AI 智能体提供持久记忆 | `context` | `AgentContext` |
| 基于知识图谱为 LLM 响应提供依据（GraphRAG） | `context` | `AgentContext.query_with_reasoning()` |
| 记录 AI 决策并保留完整审计轨迹 | `context` | `AgentContext.record_decision()` |
| 在做出新决策前搜索历史决策 | `context` | `AgentContext.find_precedents()` |
| 追溯决策的因果链 | `context` | `AgentContext.get_causal_chain()` |
| 追踪每个事实的来源（W3C PROV-O） | `provenance` | `ProvenanceManager` |
| 使用校验和与回滚对图进行版本管理 | `change_management` | `TemporalVersionManager` |
| 从图自动生成 OWL schema | `ontology` | `OntologyGenerator` |
| 根据 SHACL 约束校验图 | `ontology` | `SHACLGenerator`、`OntologyValidator` |
| 从已有知识推导新事实 | `reasoning` | `Reasoner`、`GraphReasoner` |
| 导出为 RDF Turtle、JSON-LD 或 N-Triples | `export` | `RDFExporter` |
| 导出为 Parquet 供 Spark / BigQuery 使用 | `export` | `ParquetExporter` |
| 导出供 ArangoDB 使用 | `export` | `ArangoAQLExporter` |
| 通过 Cypher 导出到 Neo4j 或 Memgraph | `export` | `LPGExporter` |
| 交互式可视化知识图谱 | `visualization` | `KGVisualizer` |
| 运行可复现的多步骤流水线 | `pipeline` | `PipelineBuilder` |
| 在 Claude Desktop 或 Cursor 中使用 Semantica | `mcp_server` | `semantica-mcp` |
| 从经过校验的种子数据引导构建图 | `seed` | `SeedDataManager` |
| 使用自定义组件扩展 Semantica | `core` | `PluginRegistry` |


## 按目标划分的起点

选择你的目标，查看最少的导入和可运行的骨架代码。

<Tabs>
  <Tab title="构建知识图谱">
    将文档、网页或数据库转换为结构化、可查询的图。

    **流水线：** `ingest` → `parse` → `semantic_extract` → `kg`

    ```python
    from semantica.ingest import FileIngestor
    from semantica.parse import DocumentParser
    from semantica.semantic_extract import NERExtractor, RelationExtractor
    from semantica.kg import GraphBuilder

    sources       = FileIngestor().ingest("report.pdf")
    parsed        = DocumentParser().parse_document("report.pdf")

    # No API key required: pattern-based extraction
    entities      = NERExtractor(method="pattern").extract(parsed)
    relationships = RelationExtractor(method="rule").extract(parsed, entities=entities)

    graph = GraphBuilder(merge_entities=True).build(
        sources=[{"entities": entities, "relationships": relationships}]
    )
    print(f"{len(graph.nodes)} nodes, {len(graph.edges)} edges")
    ```

    <Tip>
      将 `method="pattern"` 传给 `NERExtractor` 可实现零成本、无需 API key 的抽取。切换为 `method="llm"` 并配合任一受支持的提供商，可获得更高召回率。
    </Tip>

    完整流水线（含可视化与导出）请参阅 [快速开始 →](/zh/quickstart)。
  </Tab>

  <Tab title="构建 GraphRAG">
    让每个 LLM 响应都基于结构化知识图谱。每条论断都能链接回源节点。

    **模块：** `context`

    ```python
    from semantica.context import AgentContext, ContextGraph
    from semantica.vector_store import VectorStore
    from semantica.llms import Groq

    llm = Groq(model="llama-3.3-70b-versatile")

    context = AgentContext(
        vector_store=VectorStore(backend="faiss", dimension=768),
        knowledge_graph=ContextGraph(advanced_analytics=True),
    )

    # Store facts: retrieval uses both vectors and graph structure
    context.store("Apple Inc. was co-founded by Steve Jobs in 1976 in Cupertino.")

    # GraphRAG query with multi-hop reasoning trace
    result = context.query_with_reasoning(
        "Who co-founded Apple?",
        llm_provider=llm,
        max_hops=2,
    )
    print(result["response"])        # grounded answer
    print(result["reasoning_path"])  # multi-hop trace
    ```

    **下一步：** [Context 模块参考 →](/zh/reference/context)
  </Tab>

  <Tab title="添加智能体记忆">
    为 AI 智能体提供跨会话的持久记忆、决策追踪和先例搜索。

    **模块：** `context`

    ```python
    from semantica.context import AgentContext, ContextGraph
    from semantica.vector_store import VectorStore

    context = AgentContext(
        vector_store=VectorStore(backend="faiss", dimension=768),
        knowledge_graph=ContextGraph(advanced_analytics=True),
        decision_tracking=True,   # required to use record_decision()
    )

    # Store a memory
    context.store("GPT-4 outperforms GPT-3.5 on reasoning benchmarks by 40%.")

    # Record a decision with full causal context
    decision_id = context.record_decision(
        category="model_selection",
        scenario="Choose LLM for production reasoning pipeline",
        reasoning="GPT-4 benchmark advantage justifies cost increase",
        outcome="selected_gpt4",
        confidence=0.91,
    )

    # Search past decisions before making a new one
    precedents = context.find_precedents("model selection", limit=5)

    # Trace what happened downstream from this decision
    chain = context.get_causal_chain(decision_id, direction="downstream")
    ```

    <Note>
      `decision_tracking=True` 是必需的。缺省时 `record_decision()` 会抛出 `RuntimeError`。
    </Note>

    **下一步：** [Context 模块参考 →](/zh/reference/context)
  </Tab>

  <Tab title="追踪溯源">
    每个事实都带有 W3C PROV-O 血缘：源文档、抽取方法、时间戳和校验和。

    **模块：** `provenance`、`change_management`

    ```python
    from semantica.provenance import ProvenanceManager

    prov = ProvenanceManager()

    # Track an entity with full source details
    prov.track_entity(
        entity_id="entity_1",
        source="DOI:10.1371/journal.pone.0023601",
        source_location="Figure 2",
        confidence=0.92,
    )

    # Retrieve the complete lineage for this entity
    lineage = prov.get_lineage("entity_1")

    # Version-control the graph with SHA-256 checksums
    from semantica.change_management import TemporalVersionManager

    manager  = TemporalVersionManager()
    snapshot = manager.create_snapshot(kg, "v1.0", "user@example.com", "Initial build")
    diff     = manager.diff("v1.0", "v1.1")
    ```

    **下一步：** [溯源参考 →](/zh/reference/provenance) · [变更管理参考 →](/zh/reference/change_management)
  </Tab>

  <Tab title="导出">
    将知识图谱序列化，用于语义网、分析平台或图数据库。

    **模块：** `export`

    ```python
    from semantica.export import RDFExporter, ParquetExporter, LPGExporter, ArangoAQLExporter

    # RDF: multiple serialization formats
    RDFExporter().export(graph, "graph.ttl",    format="turtle")
    RDFExporter().export(graph, "graph.jsonld", format="jsonld")

    # Parquet: for Spark, BigQuery, Databricks, Snowflake
    ParquetExporter().export(graph, "output/graph.parquet")

    # Neo4j / Memgraph via Cypher
    LPGExporter().export(graph, "graph.cypher")

    # ArangoDB AQL inserts
    ArangoAQLExporter().export(graph, "graph.aql")
    ```

    **格式：** Turtle · JSON-LD · N-Triples · RDF/XML · Parquet · Cypher · Arrow · OWL · CSV · ArangoDB AQL

    **下一步：** [导出模块参考 →](/zh/reference/export)
  </Tab>

  <Tab title="MCP：Claude / Cursor">
    在 Claude Desktop、Cursor、VS Code 或任何支持 MCP 的工具中使用 Semantica；完成设置后无需编写 Python 代码。共提供 15 个工具。

    **第 1 步：安装**
    ```bash
    pip install semantica
    ```

    **第 2 步：添加到你的 MCP 客户端配置**

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

    ```json Cursor / VS Code / Continue
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

    </CodeGroup>

    **可用工具：** `extract_entities` · `extract_relations` · `add_entity` · `add_relationship` · `record_decision` · `query_decisions` · `find_precedents` · `get_causal_chain` · `run_reasoning` · `get_graph_analytics` · `export_graph` · `get_graph_summary`

    <Warning>
      设置 `SEMANTICA_KG_PATH` 可使图在重启之间持久保留。若不设置，服务器进程退出时所有数据都会丢失。
    </Warning>

    **下一步：** [MCP Server 参考 →](/zh/reference/mcp_server)
  </Tab>
</Tabs>


## 架构选型指南

<AccordionGroup>
  <Accordion title="知识图谱与向量存储的选型" icon="scale-balanced">
    当你需要结构化推理、多跳遍历、溯源或合规审计轨迹时，使用**知识图谱**（`kg`）。

    当你需要在大型文本语料上进行快速模糊相似度搜索，且条目之间的关系并不重要时，使用**向量存储**（`vector_store`）。

    通过 `AgentContext`（GraphRAG）**将两者结合使用**，可获得有依据的 LLM 响应，其中每条论断都能追溯到源节点。

    另见：[核心概念](/zh/concepts)
  </Accordion>

  <Accordion title="快速搭建本地流水线" icon="rocket">
    从 [快速开始](/zh/quickstart) 入手。它会构建一条完整流水线（摄取 → 解析 → 抽取 → 图 → 可视化 → 导出），无需 API key。
  </Accordion>

  <Accordion title="为现有智能体做最小配置" icon="plug">
    添加 `AgentContext` 即可为现有智能体配备记忆、决策追踪和先例搜索，无需改动你的 LLM 提供商或智能体框架。

    ```python
    from semantica.context import AgentContext, ContextGraph
    from semantica.vector_store import VectorStore

    context = AgentContext(
        vector_store=VectorStore(backend="faiss", dimension=768),
        knowledge_graph=ContextGraph(advanced_analytics=True),
        decision_tracking=True,
    )
    ```

    [Context 模块参考 →](/zh/reference/context)
  </Accordion>

  <Accordion title="满足合规要求的流水线最小技术栈" icon="shield-check">
    | 层级 | 模块 | 关键类 |
    | :---- | :------ | :--------- |
    | 摄取 | `ingest` | `FileIngestor` |
    | 抽取 | `semantic_extract` | `NERExtractor` |
    | 图 | `kg` | `GraphBuilder` |
    | 血缘 | `provenance` | `ProvenanceManager` |
    | 版本管理 | `change_management` | `TemporalVersionManager` |
    | 审计导出 | `export` | `RDFExporter` |
    支持 HIPAA、SOX、GDPR 和 FDA 21 CFR Part 11 审计要求。
  </Accordion>
</AccordionGroup>

---

- [快速开始](/zh/quickstart)：5 分钟构建完整流水线。
- [模块参考](/zh/modules)：每个模块的示例与常用链路。
- [API 参考](/zh/reference/context)：完整的类与方法文档。