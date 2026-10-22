---
title: "导出与序列化"
description: "将知识图谱导出为 RDF（Turtle、JSON-LD、N-Triples）、GraphML、Cypher（Neo4j）、ArangoDB AQL、CSV、Parquet、OWL 等格式。"
sourceHash: "ebdc5908ac213d00263b92e443d7e403ea739c3b07994ddd29e8984da1068393"
---

## 什么是导出？

导出会将 Semantica 图数据转换为外部工具和系统所使用的格式。与将数据保留在 Semantica 内部的持久化机制不同，导出专门面向与外部消费方的互操作。

**导出与内部持久化的区别：**
- **`AgentContext.store()`** 与图持久化将数据保留在 Semantica 内部，用于持续的加工、检索和推理
- **导出函数**将图数据序列化为标准化格式，供外部系统直接消费

导出可将知识图谱数据以其原生格式，提供给分析平台、图数据库、RDF 三元组存储、语义网系统、数据仓库、商业智能工具以及下游消费方。

## 为什么使用导出？

**一次构建，多路导出。** 通过 Semantica 的抽取与推理工作流构建知识图谱，然后将同一份图数据导出为多种格式，满足不同消费方的需要，无需重建或重新处理。

**与既有生态互操作。** 将 Semantica 图连接到组织内已有的工具与工作流，从 Neo4j 图数据库到 Gephi 可视化，再到 pandas 数据分析流水线。

**分析与报表工作流。** 将图数据送入商业智能工具、统计分析平台和机器学习流水线，这些系统需要 CSV、Parquet 或 RDF 等特定数据格式。

**图数据库迁移与部署。** 将图从 Semantica 的内存表示迁移到 Neo4j、ArangoDB 或三元组存储等生产级图数据库，以获得可扩展的查询性能。

**RDF 与语义网集成。** 导出为语义网标准格式（Turtle、JSON-LD、N-Triples），以便与本体工具、SPARQL 端点和语义推理系统集成。

**数据湖与数据仓库集成。** 导出为 Parquet 等列式格式，以便与 DuckDB、Apache Spark 和云数据仓库等现代数据栈工具集成。

**合规与归档工作流。** 生成标准化导出，满足监管报送、长期归档和审计轨迹的要求，这些场景强制指定数据格式。

## 何时使用 / 何时不使用

**在以下情况使用导出：**
- 将 Semantica 图与外部系统和工具集成
- 与使用不同技术栈的团队共享图数据
- 构建在后续处理中消费图数据的分析流水线
- 需要语义网标准的 RDF 与本体工作流
- 制作报表、可视化和商业智能仪表盘
- 将图迁移到生产数据库以获得可扩展的查询性能
- 满足特定数据格式提交的合规要求

**在以下情况不要使用导出：**
- 你只是想保存并重新加载 Semantica 状态——请改用内置持久化机制
- 首要目标是 Agent 持久化和记忆连续性
- 内部的检索、推理与图操作已足以满足你的场景
- 导出会给完全在 Semantica 内运行的工作流增加不必要的复杂度
- 你需要实时访问不断演进的图数据——导出生成的是静态快照

**在以下情况考虑使用内部持久化：**
- 工作流涉及在 Semantica 内迭代式构建图、查询和推理
- 需要维护 Agent 记忆、对话历史和决策追踪
- 图数据将在 Semantica 工作流中继续被加工和丰富

`export_rdf`、`export_graph`、`export_lpg` 及相关函数可在一次调用中将 `ContextGraph` 序列化为十种格式中的任意一种，忠实保留节点类型、边权重和元数据。当下游消费方——三元组存储、图数据库、可视化工具、ML 流水线或电子表格审计人员——各自期望从同一份内存图得到不同格式时，就应使用它们。

<Info>
  所有导出函数都以 `graph.to_dict()` 作为第一个参数——即 `ContextGraph.to_dict()` 生成的同一个 dict。图只构建一次，就可以按需导出为任意多种格式，无需重复序列化。请注意，`graph.to_dict()` 会将整张图物化到内存中，因此超大图可能需要额外的内存规划。
</Info>

## 构建待导出的图

在首次导出之前，先填充一张图。以下每个示例都基于这套共享的初始化代码：

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore

vs    = VectorStore(backend="faiss", dimension=768)
graph = ContextGraph()
ctx   = AgentContext(vector_store=vs, knowledge_graph=graph, graph_expansion=True)

ctx.store(
    [
        "APT29 exploits CVE-2024-3400 in PAN-OS to target NATO defense contractors.",
        "CVE-2024-3400 is a critical remote code execution vulnerability in GlobalProtect.",
        "HAMMERTOSS is APT29's C2 backdoor using Twitter and GitHub as covert channels.",
    ],
    extract_entities=True,
    extract_relationships=True,
)

graph_data = graph.to_dict()   # single dict, reused across all exports below
```

## RDF 格式——面向三元组存储与语义推理器

**RDF（Resource Description Framework）** 是语义网的基础数据模型，以主语-谓语-宾语三元组表示信息。RDF 格式对于与语义网技术、本体工具以及需要形式化知识表示的系统集成至关重要。

当你的消费方是三元组存储（GraphDB、Stardog、Apache Jena）或 OWL 推理器（HermiT、Pellet）时，你需要 RDF。Semantica 通过单次 `export_rdf` 调用即可导出全部五种标准 RDF 序列化格式。

```python
from semantica.export import export_rdf

# Turtle — the human-readable default; best for review and Git storage
export_rdf(graph_data, "threat_graph.ttl", format="turtle")

# N-Triples — one triple per line, no indentation; fastest bulk load into any triple store
export_rdf(graph_data, "threat_graph.nt", format="ntriples")

# JSON-LD — embeds @context; best when downstream consumers speak JSON natively
export_rdf(graph_data, "threat_graph.jsonld", format="jsonld")

# RDF/XML — maximum legacy interop; required by some older OWL tools
export_rdf(graph_data, "threat_graph.rdf", format="rdfxml")
```

应选哪种格式取决于消费方。Turtle 适合人工审阅和提交到 Git——它紧凑且可读。N-Triples 是批量加载到 SPARQL 端点的最快选择，因为解析器可以逐行流式处理，无需缓冲整个文件。JSON-LD 适合下游系统已经使用 JSON 的场景，并且你希望语义上下文嵌入在同一份载荷中。RDF/XML 则为兼容早于其他格式的旧工具而存在。

## 图格式——面向 Gephi、Maltego 与网络分析

**带标签属性图（LPG）** 格式以带类型的节点和带属性、元数据的边来表示网络。这些格式针对图可视化工具和网络分析平台进行了优化，这类工具侧重探索关系与结构模式。

GraphML、GEXF 和 DOT 是图分析与可视化工具的原生格式。它们保留节点属性、边权重和类型标签，因此你在 Semantica 中构建的图可以在 Gephi 或 NetworkX 中立即呈现，且属性数据完整。

```python
from semantica.export import export_graph

# GraphML — widest tool support: Gephi, yEd, NetworkX, Maltego
export_graph(graph_data, "threat_graph.graphml", format="graphml")

# GEXF — richer attribute support in Gephi; better for large attributed graphs
export_graph(graph_data, "threat_graph.gexf", format="gexf")

# DOT (Graphviz) — automated layout and rendering for diagrams in reports
export_graph(graph_data, "threat_graph.dot", format="dot")
```

如果你使用 Gephi 制作分析师简报，GEXF 值得了解——它支持 GraphML 无法表达的动态属性和时序数据。当你需要由 Graphviz 自动布局图以嵌入 PDF 报告或文档站点时，DOT 是正确选择。

## Neo4j Cypher——面向图模式威胁狩猎

**Cypher** 是 Neo4j 的声明式图查询语言，通过模式匹配来查找和操作图数据。Cypher 导出使团队能够利用 Neo4j 优化的查询引擎执行复杂图查询、模式检测和图分析。

当 SOC 团队希望针对图运行 Cypher 查询——例如找出共享基础设施的威胁行为者，或追踪多跳攻击路径——你可以导出为 Cypher，并用一条命令将结果加载到 Neo4j Desktop 或 Memgraph。

```python
from semantica.export import export_lpg

export_lpg(graph_data, "threat_graph.cypher", method="cypher")
```

输出文件包含可直接运行的 `CREATE` 和 `MATCH` 语句：

```text
CREATE (:ThreatActor {id: "apt29", name: "APT29", nation_state: "RU"})
CREATE (:Vulnerability {id: "cve-2024-3400", cvss_score: 10.0})
MATCH (a {id: "apt29"}), (b {id: "cve-2024-3400"}) CREATE (a)-[:EXPLOITS {confidence: 0.97}]->(b)
```

使用 `cypher-shell < threat_graph.cypher` 加载到 Neo4j，或将该文件拖入 Neo4j Desktop 的导入向导。此后，SOC 团队无需接触 Python 即可编写 Cypher 查询。

## ArangoDB AQL——面向多模型查询

ArangoDB 将图遍历、文档查询和全文检索融合在单一查询语言中。当合规团队需要将图与结构化监管文档进行连接查询时，ArangoDB 是合适的后端。

```python
from semantica.export import export_arango

export_arango(
    graph_data,
    "regulatory.aql",
    vertex_collection         = "regulatory_nodes",
    edge_collection           = "regulatory_edges",
    include_collection_creation = True,    # emits CREATE COLLECTION statements
    batch_size                = 200,       # INSERT statements batched to avoid memory spikes
)
```

`include_collection_creation=True` 标志意味着 AQL 文件是自包含的——它会在插入数据前创建集合，因此你可以直接在全新的 ArangoDB 实例上运行，无需任何前置设置。

## CSV——面向电子表格审计与统计分析

**CSV（逗号分隔值）** 是一种简单的表格格式，被电子表格应用、统计工具和数据分析平台普遍支持。CSV 导出将图数据展平为行列结构，适合主要使用表格数据的团队。

合规团队离不开 Excel，数据科学团队离不开 pandas，两者都需要 CSV。`export_csv` 将图写为扁平行——当你传入基础路径时，实体和关系会写入独立文件。

```python
from semantica.export import export_csv

# Single CSV — nodes and edges interleaved with a "record_type" column
export_csv(graph_data, "threat_graph.csv")

# Split CSV — writes threat_graph_entities.csv and threat_graph_relationships.csv
export_csv(
    {"entities": graph_data.get("nodes", []),
     "relationships": graph_data.get("edges", [])},
    "threat_graph",
)
```

拆分形式对下游工具更有用：实体 CSV 可生成实体类型的数据透视表；关系 CSV 可在 pandas 或 R 中进行网络分析。

## Parquet——面向数据湖与 ML 流水线

**Parquet** 是一种为分析型负载优化的列式存储格式，提供高效压缩和快速查询性能。Parquet 文件可与现代数据栈工具和机器学习框架无缝集成。

当数据科学团队在 DuckDB、Spark 或 lakehouse 中对图属性做特征工程时，Parquet 正是他们想要的格式。它列式存储、压缩高效，并几乎能被所有主流 ML 框架读取。

```python
from semantica.export import export_parquet

export_parquet(graph_data, "threat_graph_entities.parquet")
```

一旦转换为 Parquet，图实体就变成 DataFrame，可以与遥测数据连接、补充外部特征，并送入分类模型——数据科学侧无需编写任何自定义序列化代码。

## OWL——面向基于本体的推理

**OWL（Web Ontology Language）** 是表示富本体的语义网标准，支持类、属性和逻辑约束。OWL 使自动化推理、一致性检查和形式化知识模型上的推断成为可能。

**OntologyGenerator** 通过分析实体类型、关系和模式，生成类层次、属性定义和逻辑约束，从而从图数据创建形式化本体。这支持模式校验、自动化推理以及与语义网工具的集成。

当你使用 `OntologyGenerator` 从图中生成了 OWL 本体后，即可将其导出，用于 Protégé、HermiT 推理或监管报送。

```python
from semantica.export import export_owl
from semantica.ontology import OntologyGenerator

ontology = OntologyGenerator(base_uri="https://example.org/cti/") \
               .generate_from_graph(graph_data)

export_owl(ontology, "cti_ontology.owl", format="owl-xml")
```

## 常见陷阱

**混淆导出与持久化。** 导出生成用于互操作的外部快照，而持久化维护的是 Semantica 的内部状态。当你需要保存并重新加载 Agent 记忆，或继续基于图的工作流时，不要使用导出——请改用内置持久化机制。

**在修改图之后导出过期的图数据。** 始终在图完成最终修改后再调用 `graph.to_dict()`。如果你在工作流早期就保存了 `graph_data`，之后又修改了图，导出反映的将是过时状态，而非最新改动。

**重复运行昂贵的抽取，而非复用已有的图数据。** 通过实体抽取和关系推断将图构建一次，然后用同一个 `graph_data` dict 导出为多种格式。不要为每种导出格式重建图。

**在 CSV 即可满足时选择过于复杂的格式。** 如果下游消费方处理的是表格数据，且不需要保留图结构，那么 CSV 比 RDF 或 GraphML 更简单、更快，支持也更普遍。

**以为溯源和历史会自动出现在导出中。** 标准导出格式只捕获当前的图状态，不包含溯源链、版本历史或审计轨迹。如果你需要完整的血缘信息，请使用专门的溯源导出机制。

**忽略下游的模式要求。** 不同系统期望不同的标识符格式、属性模式和关系表示。在生产工作流中部署之前，请验证导出的数据符合消费系统的预期。

**在未做内存规划的情况下导出超大图。** `graph.to_dict()` 操作会将整张图物化到内存中。对于超大图，请监控内存使用，并在资源受限的环境中考虑分块或流式方案。

## 领域示例

<Tabs>

<Tab title="国防——CTI/威胁">

某 CTI 团队需要同时把同一份威胁图送到四个地方：用于跨团队查询的 SPARQL 端点、用于分析师简报的 Gephi、用于图模式威胁狩猎的 Neo4j，以及用于 SIEM 摄取流水线的 JSON-LD 数据源。四次导出，一个图 dict。

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore
from semantica.ingest import ingest_file
from semantica.export import export_rdf, export_graph, export_lpg
import os

vs    = VectorStore(backend="faiss", dimension=768)
graph = ContextGraph()
ctx   = AgentContext(vector_store=vs, knowledge_graph=graph, graph_expansion=True)

apt_report = ingest_file("apt29_2024_campaign.pdf", method="file")
ctx.store(apt_report.text, extract_entities=True, extract_relationships=True)

graph_data = graph.to_dict()
os.makedirs("./exports/", exist_ok=True)

# 1. Turtle → SPARQL endpoint (Apache Jena, Stardog, GraphDB)
export_rdf(graph_data, "./exports/threat_graph.ttl", format="turtle")

# 2. JSON-LD → SIEM ingestion (Splunk, Elastic) — JSON-native pipeline
export_rdf(graph_data, "./exports/threat_graph.jsonld", format="jsonld")

# 3. GraphML → Gephi for analyst briefing visualization
export_graph(graph_data, "./exports/threat_graph.graphml", format="graphml")

# 4. Cypher → Neo4j for graph-pattern threat hunting
export_lpg(graph_data, "./exports/threat_graph.cypher", method="cypher")

print("Threat graph exported to 4 formats.")
```

</Tab>

<Tab title="安全——SOC/事件响应">

在事件处置过程中，SOC 需要将图导入 Neo4j 用于狩猎、导入 GEXF 用于 Gephi 时间线可视化、导入 GraphML 以便载入 Maltego。三者都来自同一份内存图。

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore
from semantica.export import export_lpg, export_graph
import os

vs    = VectorStore(backend="faiss", dimension=768)
graph = ContextGraph()
ctx   = AgentContext(
    vector_store=vs,
    knowledge_graph=graph,
    graph_expansion=True,
    decision_tracking=True,
)

incidents = [
    "Host ws-finance-03 (10.10.1.5): scheduled task created via wmiprvse.exe — T1053.005",
    "User jsmith logged in from anomalous IP 185.220.101.7 (Tor exit node)",
    "EDR alert on dc01: LSASS memory access by procdump.exe — T1003.001",
]
ctx.store(incidents, extract_entities=True, extract_relationships=True)

graph_data = graph.to_dict()
os.makedirs("./soc_exports/", exist_ok=True)

# Cypher → Neo4j for Cypher-based threat hunting
export_lpg(graph_data, "./soc_exports/incident_graph.cypher", method="cypher")

# GEXF → Gephi for timeline visualization
export_graph(graph_data, "./soc_exports/incident_graph.gexf", format="gexf")

# GraphML → Maltego for link analysis
export_graph(graph_data, "./soc_exports/incident_graph.graphml", format="graphml")

print("SOC graph exported — load incident_graph.cypher into Neo4j Desktop.")
```

</Tab>

<Tab title="生命科学——临床/制药">

临床试验数据需要送达 SPARQL 端点以支持跨试验联邦查询、导出为 CSV 以便在 R 中做统计分析，以及导出为 Turtle 文件用于监管报送。该图编码了从试验方案中抽取的化合物-靶点-疾病关系。

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore
from semantica.ingest import DBIngestor
from semantica.export import export_rdf, export_csv

vs    = VectorStore(backend="faiss", dimension=768)
graph = ContextGraph(advanced_analytics=True)
ctx   = AgentContext(
    vector_store=vs,
    knowledge_graph=graph,
    graph_expansion=True,
    retention_days=None,
)

db = DBIngestor()
trial_rows = db.execute_query(
    "postgresql://readonly@clindb:5432/trials",
    "SELECT compound, target_protein, disease, mechanism FROM trial_protocols",
)
trial_texts = [
    "{} targets {} in {} via {}.".format(
        r["compound"], r["target_protein"], r["disease"], r["mechanism"]
    )
    for r in trial_rows
]
ctx.store(trial_texts, extract_entities=True, extract_relationships=True)

graph_data = graph.to_dict()

# N-Triples for fast bulk load into GraphDB or Stardog
export_rdf(graph_data, "./exports/clinical_graph.nt",  format="ntriples")

# Turtle for human review and regulatory dossier attachment
export_rdf(graph_data, "./exports/clinical_graph.ttl", format="turtle")

# Split CSV for statistical analysis in R / SAS
export_csv(
    {"entities": graph_data.get("nodes", []),
     "relationships": graph_data.get("edges", [])},
    "./exports/clinical_graph",
)

print("Clinical graph exported — ready for SPARQL endpoint and statistical review.")
```

</Tab>

<Tab title="银行——风险/合规">

监管知识图谱必须送达 ArangoDB 以支持多模型合规查询、导出为 RDF/XML 用于长期监管归档、导出为 JSON-LD 供合规仪表盘 API 使用。巴塞尔 III 法规、风险参数及其关系都作为图节点被捕获。

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore
from semantica.ingest import ingest_file
from semantica.export import export_arango, export_rdf
import os

vs    = VectorStore(backend="faiss", dimension=768)
graph = ContextGraph()
ctx   = AgentContext(
    vector_store=vs,
    knowledge_graph=graph,
    graph_expansion=True,
    retention_days=2555,    # 7-year regulatory retention
)

regs = [
    ingest_file("basel3_cre20.pdf",       method="file"),
    ingest_file("sr_11_7_model_risk.pdf", method="file"),
    ingest_file("bcbs239.pdf",            method="file"),
]
ctx.store(
    [r.text for r in regs],
    extract_entities=True,
    extract_relationships=True,
)

graph_data = graph.to_dict()
os.makedirs("./compliance_exports/", exist_ok=True)

# ArangoDB AQL for multi-model regulatory queries (graph + document joins)
export_arango(
    graph_data,
    "./compliance_exports/regulatory.aql",
    vertex_collection           = "regulatory_nodes",
    edge_collection             = "regulatory_edges",
    include_collection_creation = True,
    batch_size                  = 200,
)

# RDF/XML for long-term regulatory archive (maximum legacy interop)
export_rdf(graph_data, "./compliance_exports/regulatory_audit.rdf", format="rdfxml")

# JSON-LD for compliance dashboard REST API
export_rdf(graph_data, "./compliance_exports/regulatory.jsonld", format="jsonld")

print("Compliance graph exported in 3 formats.")
```

</Tab>

</Tabs>

## 选择合适的格式

格式选择通常取决于谁在消费输出，以及他们已经在用什么工具。

如果消费方使用 SPARQL 或三元组存储，可选 Turtle（人工审阅）、N-Triples（批量加载）或 JSON-LD（JSON 原生流水线）。如果使用属性图数据库，Cypher 面向 Neo4j 或 Memgraph；当他们在同一系统中还需要文档和检索查询时，AQL 面向 ArangoDB。如果使用图可视化工具，GraphML 是工具支持最广、最稳妥的默认选择；GEXF 在 Gephi 中提供更丰富的属性处理；当你需要 Graphviz 自动渲染静态示意图时，DOT 正合适。如果他们的工作主要在电子表格或统计工具中，CSV 阻力最小。如果他们在 DuckDB、Spark 或 lakehouse 中运行 ML 流水线，Parquet 就是他们想要的。

对于语义推理和本体工作，格式是 OWL/XML——它是唯一能为 Protégé 和 HermiT 保留完整类层次的输出。

## 相关指南

- [上下文图](/zh/guides/context-graphs)——`ContextGraph` 对象，其 `to_dict()` 为所有导出提供数据
- [本体管理](/zh/guides/ontology)——导出由你的图生成的 OWL 本体
- [推理与规则](/zh/guides/reasoning)——推理结果可以导出为 RDF 三元组
- [变更管理](/zh/guides/change-management)——在导出前对图做快照，以证明导出基于经过验证的状态
- [流水线](/zh/guides/pipeline)——在单个 `PipelineBuilder` 中串联摄取、抽取和导出