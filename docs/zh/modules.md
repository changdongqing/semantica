---
title: "模块"
description: "每个 Semantica 模块均可独立工作：只使用你需要的部分。"
icon: "puzzle-piece"
sourceHash: "21cc003ce232a5f88713cd36735fc7dc6921d1d4d643b2358172bd148cda48e7"
---

<Info>
  快速参考请跳转至[模块索引](#module-index)。
</Info>

<Tip>
  [选择合适的模块](/zh/choose-your-module)指南将 35+ 个开发者目标映射到相应模块，并附有代码示例；如果你是初次接触，建议从这里开始。
</Tip>

Semantica 由 **27 个模块**组成，划分为六个逻辑层。每个模块都可以独立导入：你无需为未使用的部分付出代价。

## 架构概览

- **输入层**：数据摄取与准备。模块：`ingest`、`parse`、`split`、`normalize`
- **核心处理**：智能与理解。模块：`semantic_extract`、`kg`、`ontology`、`reasoning`
- **存储**：持久化数据存储。模块：`embeddings`、`vector_store`、`graph_store`、`triplet_store`
- **质量保障**：数据质量与一致性。模块：`deduplication`、`conflicts`
- **上下文与记忆**：智能体记忆与决策追踪。模块：`context`、`provenance`、`change_management`
- **输出与编排**：导出、可视化与工作流。模块：`export`、`visualization`、`pipeline`、`explorer`


## 输入层

### 摄取

从文件、Web、数据库和流中加载数据。每个摄取器返回各自的结果类型（`FileIngestor` → `FileObject`，`WebIngestor` → `WebContent`，……）；面向文档的摄取器会暴露 `.text` 载荷和 `.metadata`。

```python
from semantica.ingest import FileIngestor, WebIngestor, ParquetIngestor, XMLIngestor, DatabricksIngestor

# Files: PDF, DOCX, CSV, Excel, PPTX, JSON, HTML, archives
ingestor = FileIngestor()
documents = ingestor.ingest_directory("data/")

# Web page: returns a WebContent with .text, .title, .links, .metadata
web_ingestor = WebIngestor()
page = web_ingestor.ingest_url("https://example.com")

# Parquet: single file, partitioned directory, Hive-style (v0.5.0)
parquet = ParquetIngestor()
sources = parquet.ingest("data/events.parquet")

# XML with XSD/DTD validation, namespace handling (v0.5.0)
xml = XMLIngestor()
sources = xml.ingest("data/records/", schema_path="schema.xsd")

# Enterprise lakehouse/warehouse: Unity Catalog + Delta Lake, or a Snowflake warehouse
databricks = DatabricksIngestor(host="...", token="...", http_path="...")
customers   = databricks.ingest_table("customers")
```

**可用摄取器：** `FileIngestor`、`WebIngestor`、`ParquetIngestor`、`XMLIngestor`、`RESTIngestor`、`PublicAPIIngestor`、`DBIngestor`、`DatabricksIngestor`、`SnowflakeIngestor`、`EmailIngestor`、`FeedIngestor`、`MCPIngestor`、`OntologyIngestor`、`RepoIngestor`、`StreamIngestor`、`ArrowIngestor`、`CloudStorageIngestor`

<Note>
  `DuckDBIngestor`、`ElasticIngestor`、`GDriveIngestor`、`HuggingFaceIngestor`、`MongoIngestor` 和 `PandasIngestor` 也随包发布，但尚未从顶层 `semantica.ingest` 命名空间重新导出；请直接导入，例如 `from semantica.ingest.duckdb_ingestor import DuckDBIngestor`。
</Note>

### 解析

从原始文档中抽取结构化文本和版面元数据。

```python
from semantica.parse import DocumentParser, DoclingParser

# Standard parser: all common formats. parse() takes a path, returns a dict
parser = DocumentParser()
parsed = parser.parse("document.pdf")   # {"full_text": ..., "metadata": ..., ...}

# Advanced parser (pip install semantica[parse-docling]): tables, OCR, layout
parser = DoclingParser(export_format="markdown", enable_ocr=True)
parsed = parser.parse("data/annual_report.pdf")   # dict with full_text, tables, pages
```

**可用解析器：** `DocumentParser`、`DoclingParser`、`CodeParser`、`CSVParser`、`DocxParser`、`EmailParser`、`ExcelParser`、`HTMLParser`、`ImageParser`、`JSONParser`、`MCPParser`、`MediaParser`、`PDFParser`、`PPTXParser`、`StructuredDataParser`、`WebParser`、`XMLParser`

### 切分

面向嵌入和 RAG 流水线对文本进行分块，并能感知语义边界。

```python
from semantica.split import TextSplitter

# chunk_size / chunk_overlap are constructor arguments
splitter = TextSplitter(method="semantic_transformer", chunk_size=1000, chunk_overlap=200)
chunks = splitter.split(text)
```

**分块方法：** `recursive`、`token`、`sentence`、`paragraph`、`semantic_transformer`、`entity_aware`、`relation_aware`、`graph_based`、`ontology_aware`、`hierarchical`、`community_detection`、`centrality_based`、`llm`

### 规范化

在语义处理之前清洗并规范化文本。

```python
from semantica.normalize import TextNormalizer, normalize_text, normalize_date

normalizer = TextNormalizer()
clean_text        = normalizer.normalize_text(text)
standardized_date = normalize_date("Jan 1st, 2020")
```

**可用规范化器：** 文本清洗、实体规范化、日期规范化、数字规范化、编码处理、语言检测


## 核心处理

### 语义抽取

命名实体识别、关系抽取和三元组生成。

```python
from semantica.semantic_extract import NERExtractor, RelationExtractor, TripletExtractor

# LLM method: provider + llm_model select the backend; the API key comes from the env
ner = NERExtractor(method="llm", provider="groq", llm_model="llama-3.3-70b-versatile")
entities = ner.extract("Apple Inc. was founded by Steve Jobs.")   # list[Entity]

rel = RelationExtractor(method="llm", provider="groq", llm_model="llama-3.3-70b-versatile")
relationships = rel.extract(text, entities=entities)              # list[Relation]

trip = TripletExtractor(method="pattern")
triplets = trip.extract(text)                                     # list[Triplet]
```

**抽取方法：** `"pattern"`（无需 API key）、`"ml"`（本地 spaCy 模型）、`"llm"`（9 家受支持提供商中的任意一家）

**其他抽取器：** `CoreferenceResolver`、`EventDetector`、`SemanticAnalyzer`、`SemanticNetworkExtractor`

### 知识图谱

图构建、图算法、时序模型和距离智能。

```python
from semantica.kg import GraphBuilder, GraphAnalyzer, TemporalGraphQuery, SimilarityCalculator
from datetime import datetime

# Build: build() takes a {"entities": ..., "relationships": ...} dict
builder = GraphBuilder(merge_entities=True)
kg = builder.build({"entities": entities, "relationships": relationships})

# Temporal graphs (v0.4.0)
query_engine = TemporalGraphQuery(enable_temporal_reasoning=True)
snapshot = query_engine.query_at_time(kg, query="", at_time=datetime(2021, 6, 15))

# Semantic similarity (v0.5.0): operates on embedding vectors
calc = SimilarityCalculator(method="cosine")
score = calc.cosine_similarity(vec_a, vec_b)
```

**可用的图算法：** 中心性计算、社区发现、连通性分析、实体消解、链接预测、路径查找、相似度计算

### 本体

模式管理，包括 SHACL、SKOS、对齐、差异/迁移、自动生成，以及可视化 Ontology Hub（v0.5.0）。

```python
from semantica.ontology import OntologyGenerator, SHACLGenerator

generator = OntologyGenerator()
ontology  = generator.generate_from_graph(kg)

shacl  = SHACLGenerator()
shapes = shacl.generate(ontology)
```

**组件：** `OntologyGenerator`、`SHACLGenerator`、`OntologyValidator`、`OntologyEvaluator`、`LLMOntologyGenerator`、`OWLGenerator`、`PropertyGenerator`、`DomainOntologies`、`NamespaceManager`

### 推理

使用多种推理策略从已有知识中推导新事实。

```python
from semantica.reasoning import Reasoner, DatalogReasoner

# Forward chaining: facts and rules as predicate(args) / IF-THEN strings
engine = Reasoner()
engine.add_fact("Manager(Alice)")
engine.add_rule("IF Manager(?x) THEN HasAuthority(?x)")
results = engine.forward_chain()          # list[InferenceResult] with .conclusion, .rule_used

# Datalog: recursive Horn clause rules (v0.4.0)
datalog = DatalogReasoner()
datalog.add_fact("parent(tom, bob)")
datalog.add_fact("parent(bob, ann)")
datalog.add_rule("ancestor(X, Y) :- parent(X, Y).")
datalog.add_rule("ancestor(X, Z) :- parent(X, Y), ancestor(Y, Z).")
datalog.derive_all()
results = datalog.query("ancestor(tom, ?Z)")   # [{"Z": "bob"}, {"Z": "ann"}], order not guaranteed
```

**引擎：** `Reasoner`（前向/后向链）、`ReteEngine`、`SPARQLReasoner`、`DatalogReasoner`、`TemporalReasoningEngine`、`GraphReasoner`（LLM）


## 存储

### 嵌入

生成并管理用于语义相似度计算的向量嵌入。

```python
from semantica.embeddings import EmbeddingGenerator

generator  = EmbeddingGenerator()
embeddings = generator.generate_embeddings(["text1", "text2"])   # np.ndarray
similarity = generator.compare_embeddings(embeddings[0], embeddings[1])
```

**支持的模型：** Sentence-Transformers、FastEmbed、OpenAI、BGE

**组件：** `EmbeddingGenerator`、`TextEmbedder`、`VectorEmbeddingManager`、`GraphEmbeddingManager`、`PoolingStrategies`

### 向量存储

支持混合检索的多后端向量数据库。

```python
from semantica.vector_store import VectorStore

store = VectorStore(backend="faiss", dimension=768)

# Raw vectors
ids     = store.store_vectors(embeddings)                 # returns generated ids
hits    = store.search_vectors(query_vector, k=10)

# Or store text and let the store embed it
store.add_documents(["Apple was founded in 1976.", "Google was founded in 1998."])
results = store.search("tech company founding dates", limit=10)
```

**后端：** FAISS、Pinecone、Weaviate、Qdrant、Milvus、PgVector、SQLite、内存

**检索模式：** 语义 top-k、混合（向量 + 关键词）、元数据过滤

### 图存储

连接图数据库，实现持久化、可查询的存储。

```python
from semantica.graph_store import GraphStore

store = GraphStore(backend="neo4j")
store.add_nodes([{"id": "acme", "type": "Organization", "properties": {"name": "Acme"}}])
store.add_edges([{"source": "alice", "target": "acme", "type": "works_for"}])
results = store.query("MATCH (n)-[r]->(m) RETURN n, r, m")
```

**后端：** Neo4j、FalkorDB、Apache AGE、Amazon Neptune

### 三元组存储

基于 RDF 三元组的存储，支持 SPARQL 查询。

```python
from semantica.triplet_store import TripletStore

store = TripletStore(backend="oxigraph")
store.add_triplets(triplets)                 # list of Triplet objects (or add_triplet for one)
results = store.execute_query("SELECT ?s ?p ?o WHERE { ?s ?p ?o }")
```

**后端：** Oxigraph（嵌入式）、Blazegraph、Apache Jena、RDF4J


## 质量保障

### 去重

跨来源检测、评分并合并重复实体。

```python
from semantica.deduplication import DuplicateDetector, EntityMerger

detector   = DuplicateDetector(similarity_threshold=0.85)
candidates = detector.detect_duplicates(entities)

merger     = EntityMerger()
operations = merger.merge_duplicates(entities, strategy="keep_most_complete")
```

**v2 候选生成模式**（`blocking_v2`、`hybrid_v2`、`semantic_v2`）比 v1 快最多 7 倍。

**组件：** `DuplicateDetector`、`EntityMerger`、`ClusterBuilder`、`MergeStrategyManager`

**`DuplicateDetector` 选项：** `max_results`、`top_k_per_entity`、`min_similarity`、`sort_by`

### 冲突

检测并消解相互重叠的知识源之间的事实冲突。

```python
from semantica.conflicts import ConflictDetector, ConflictResolver

conflicts = ConflictDetector().detect_conflicts(entities)   # list of entity dicts
resolved  = ConflictResolver().resolve_conflicts(conflicts, strategy="most_recent")
```

**检测类型：** 值冲突、类型冲突、关系冲突、时序冲突、逻辑冲突

**消解策略：** 优先最近、优先最可靠来源、多数投票、标记为人工复核


## 上下文与记忆

### 上下文

智能体上下文图、决策追踪、因果链和先例检索。

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore

context = AgentContext(
    vector_store=VectorStore(backend="faiss", dimension=768),
    knowledge_graph=ContextGraph(advanced_analytics=True),
    decision_tracking=True,
)

context.store("GPT-4 outperforms GPT-3.5 on reasoning benchmarks by 40%")

decision_id = context.record_decision(
    category="model_selection",
    scenario="...",
    reasoning="...",
    outcome="...",
    confidence=0.9,
)

precedents = context.find_precedents("model selection", limit=5)
```

**组件：** `AgentContext`、`ContextGraph`、`AgentMemory`、`DecisionRecorder`、`CausalAnalyzer`、`EntityLinker`、`PolicyEngine`

### 溯源

跨所有模块的、符合 W3C PROV-O 的血缘追踪。

```python
from semantica.provenance import ProvenanceManager

manager = ProvenanceManager()
manager.track_entity("entity_1", source="document.pdf", metadata={"type": "person"})
lineage = manager.get_lineage("entity_1")
```

**组件：** `ProvenanceManager`、`IntegrityChecker`、`BridgeAxiom`、`ProvenanceStorage`

### 变更管理

基于 SHA-256 校验和、差异对比与回滚的版本控制。

```python
from semantica.change_management import TemporalVersionManager

manager  = TemporalVersionManager(storage_path="versions.db")
snapshot = manager.create_snapshot(kg, "v1.0", "user@example.com", "Initial version")
diff     = manager.diff("v1.0", "v1.1")
```

**组件：** `TemporalVersionManager`、`ChangeLog`、`OntologyVersionManager`、`VersionStorage`


## 输出与编排

### 导出

将图序列化为下游格式，用于分析、语义网或图数据库。

```python
from semantica.export import RDFExporter, ParquetExporter, ArangoAQLExporter

# RDF formats
RDFExporter().export(graph, file_path="graph.ttl", format="turtle")

# Analytics
ParquetExporter().export(graph, file_path="output/graph.parquet")

# ArangoDB: writes AQL INSERT statements to the given path
ArangoAQLExporter().export(graph, file_path="graph.aql")
```

**导出格式：** RDF（Turtle、JSON-LD、N-Triples、XML）、Parquet、ArangoDB AQL、CSV、OWL、Arrow、LPG、YAML、距离矩阵

### 可视化

渲染交互式与静态知识图谱可视化。

```python
from semantica.visualization import KGVisualizer

viz = KGVisualizer()
viz.visualize_network(graph, output="html", file_path="graph.html")
```

**可视化器：** `KGVisualizer`、`OntologyVisualizer`、`EmbeddingVisualizer`、`SemanticNetworkVisualizer`、`TemporalVisualizer`、`AnalyticsVisualizer`

**布局算法：** 力导向、层次化、环形

### 流水线

支持并行工作器、重试策略与失败处理的 Pipeline DSL。

```python
from semantica.pipeline import PipelineBuilder, ExecutionEngine
from semantica.ingest import FileIngestor
from semantica.semantic_extract import NERExtractor

builder = PipelineBuilder()

# Each step type dispatches to a handler you register (or supply explicitly)
builder.register_step_handler("ingest",  lambda data, **c: FileIngestor().ingest(c["source"]))
builder.register_step_handler("extract", lambda docs, **c: NERExtractor(method="pattern").extract(docs[0].text))

builder.add_step("ingest",  step_type="ingest", source="data/")
builder.add_step("extract", step_type="extract")

pipeline = builder.connect_steps("ingest", "extract").build(name="docs_to_entities")
result   = ExecutionEngine().execute_pipeline(pipeline)
```

**组件：** `PipelineBuilder`、`Pipeline`、`ExecutionEngine`、`FailureHandler`、`PipelineValidator`、`ParallelismManager`、`ResourceScheduler`

### Explorer

基于 FastAPI 的 Knowledge Explorer，配备 Ontology Hub、WebSocket 进度、双向路径查找以及索引搜索（118k 节点上耗时 0.004ms）。

```bash
semantica-explorer --graph my_graph.json
```

**路由：** graph、ontology、provenance、decisions、analytics、SPARQL、temporal、annotations、export/import、vocabulary


## 工具集

### LLM 提供方

面向所有受支持 LLM 提供方的统一接口。

```python
from semantica.llms import Groq, OpenAI, LiteLLM
import os

llm = Groq(model="llama-3.3-70b-versatile", api_key=os.getenv("GROQ_API_KEY"))
llm = OpenAI(model="gpt-4o", api_key=os.getenv("OPENAI_API_KEY"))
# Anthropic, Gemini, Ollama, DeepSeek via LiteLLM:
llm = LiteLLM(model="anthropic/claude-opus-4-7", api_key=os.getenv("ANTHROPIC_API_KEY"))
```

**受支持的提供方：** OpenAI、Anthropic、Google Gemini、Groq、Ollama、DeepSeek、Novita AI、HuggingFace，以及 LiteLLM（通过单一接口访问 100+ 模型）

### MCP 服务器

将 Semantica 作为 MCP stdio 服务器暴露，用于 IDE 与智能体集成。

```bash
python -m semantica.mcp_server
```

**集成：** Claude Desktop、VS Code、Cursor、Windsurf、Cline。共暴露 15 个 MCP 工具。

### Seed

从经过验证的结构化数据源引导知识图谱：定点参考数据、受控词表与领域锚点。

```python
from semantica.seed import SeedDataManager

seed = SeedDataManager()

# Load trusted reference data from CSV / JSON / a database / an API
seed_data = seed.load_from_csv("seed_data/industries.csv", entity_type="Industry")

# Merge seed data with extraction output (seed values win on conflict by default)
combined = seed.integrate_with_extracted(
    {"entities": seed_data, "relationships": []},
    {"entities": extracted_entities, "relationships": extracted_relationships},
    merge_strategy="seed_first",
)
```

**使用场景：** 以已知实体锚定抽取结果、预填充本体类、生成确定性的测试图谱。

### 评测

为决策智能输出（决策记录、审计轨迹、推理文本）打分，提供
确定性评估器与模型驱动评估器的注册表，外加一个轻量的
运行框架。

```python
from semantica.evals import evaluate, list_evaluators

list_evaluators()
# ['decision_scores', 'exact_match', 'keyword_check', 'length_range',
#  'levenshtein', 'llm_as_judge', 'numeric_range', 'regex_match', 'rouge',
#  'temporal_range']

cases = [("apple", "aple"), ("night", "nacht")]
summary = evaluate(cases, evaluators=["levenshtein"])
print(summary.total, summary.passed, summary.pass_rate)
```

**公开 API：** `evaluate(cases, evaluators, config=None)`、用于在非确定性目标上重复采样的 `evaluate_repeated(cases, evaluators, config=None, target_fn=None, runs=10)`、`list_evaluators()`、`get_evaluator(name)`，以及 `EvalMetric` / `CaseResult` / `EvalSummary` / `SampleStats` / `RepeatedCaseResult` / `RepeatedSummary` 结果类型。参见 [Evals 参考](/zh/reference/evals)。

### Core

贯穿所有模块的基础类、共享数据模型与插件注册表。

```python
from semantica.core import Semantica, PluginRegistry, ConfigManager

# ConfigManager loads a Config; Config.get() does dotted lookups
config = ConfigManager().load_from_file("config.yaml")
batch  = config.get("processing.batch_size", default=32)

# Top-level orchestrator: pass the Config object (or a dict), not a path
sem = Semantica(config=config)
sem.initialize()

# Plugin registry: register custom components under a name
registry = PluginRegistry()
registry.register_plugin("my_ingestor", MyCustomIngestor, version="1.0.0")
```

**组件：** `Semantica`、`PluginRegistry`、`ConfigManager`、`Config`、`LifecycleManager`、`HealthStatus`、`MethodRegistry`

### Utils

用于 ID 生成、日期解析、校验与日志记录的共享工具。

```python
from semantica.utils import helpers, validators, logging
```

**组件：** `helpers`、`validators`、`constants`、`types`、`exceptions`、`logging`、`ProgressTracker`


## 常用模块链

<Tabs>
  <Tab title="文档 → KG">
    从任意数据源加载文档，并将其转化为可查询的知识图谱。

    **流水线：** `Ingest` → `Parse` → `Normalize` → `Semantic Extract` → `GraphBuilder` → `KG`

```python
from semantica.ingest import FileIngestor
from semantica.parse import DocumentParser
from semantica.semantic_extract import NERExtractor, RelationExtractor
from semantica.kg import GraphBuilder

sources       = FileIngestor().ingest("data/")
text          = DocumentParser().parse(sources[0].path)["full_text"]
ner           = NERExtractor(method="llm", provider="groq", llm_model="llama-3.3-70b-versatile")
rel           = RelationExtractor(method="llm", provider="groq", llm_model="llama-3.3-70b-versatile")
entities      = ner.extract(text)
relationships = rel.extract(text, entities=entities)
graph         = GraphBuilder(merge_entities=True).build(
                    {"entities": entities, "relationships": relationships}
                )
```

    **最适合：** 研究流水线、企业数据抽取、文档智能
  </Tab>

  <Tab title="GraphRAG">
    将每个 LLM 响应都建立在知识图谱之上：带来源归属的结构化检索。

    **流水线：** `KG` + `VectorStore` → `AgentContext` → GraphRAG 查询 → 有据可依的回答

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore

context = AgentContext(
    vector_store=VectorStore(backend="faiss", dimension=768),
    knowledge_graph=ContextGraph(advanced_analytics=True),
    graph_expansion=True,
)

# store() extracts entities and populates the graph + vector index
context.store([{"content": "Steve Wozniak co-founded Apple with Steve Jobs."}])

# retrieve() blends vector similarity with multi-hop graph traversal
results = context.retrieve(
    "What companies did Apple alumni found?",
    use_graph=True,
    expand_graph=True,
)
for r in results:
    print(f"[{r['score']:.3f}]  {r['content']}  (source: {r['source']})")
```

    **最适合：** 问答系统、带来源归属的 RAG、研究助手
  </Tab>

  <Tab title="AI 智能体">
    为智能体赋予持久记忆、决策追踪与策略执行能力。

    **流水线：** `AgentContext` → 决策记录 → 先例搜索 → 策略检查 → 因果分析

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore

context = AgentContext(
    vector_store=VectorStore(backend="faiss", dimension=768),
    knowledge_graph=ContextGraph(advanced_analytics=True),
    decision_tracking=True,
)
context.store("GPT-4 outperforms GPT-3.5 on reasoning by 40%")

decision_id = context.record_decision(
    category="model_selection",
    scenario="Choose LLM for production",
    reasoning="Benchmark advantage justifies cost",
    outcome="selected_gpt4",
    confidence=0.91,
)
precedents = context.find_precedents("model selection", limit=5)
```

    **最适合：** 自主智能体、AI 副驾驶、决策支持系统
  </Tab>

  <Tab title="合规流水线">
    从原始数据到最终推理的完整溯源：W3C PROV-O、SHA-256 校验和、审计轨迹。

    **流水线：** `Ingest` → `Parse` → `Extract` → `KG` → `Provenance` → `ChangeManagement` → `Export`

```python
from semantica.ingest import FileIngestor
from semantica.parse import DocumentParser
from semantica.semantic_extract import NERExtractor
from semantica.kg import GraphBuilder
from semantica.provenance import ProvenanceManager
from semantica.export import RDFExporter

sources  = FileIngestor().ingest("records/")
ner      = NERExtractor(method="llm", provider="groq", llm_model="llama-3.3-70b-versatile")
entities = ner.extract(DocumentParser().parse(sources[0].path)["full_text"])
graph    = GraphBuilder(merge_entities=True).build({"entities": entities, "relationships": []})

prov     = ProvenanceManager()
prov.track_entity("entity_id", source="records/filing.pdf", metadata={"extractor": "llm"})
lineage  = prov.get_lineage("entity_id")

RDFExporter().export(graph, file_path="audit.ttl", format="turtle")
```

    **最适合：** HIPAA、SOX、GDPR、FDA 21 CFR Part 11 部署
  </Tab>

  <Tab title="网页抓取 → 图谱">
    抓取网站、规范化文本，并直接从网页中抽取知识。

    **流水线：** `WebIngestor` → `Normalize` → `Semantic Extract` → `GraphStore`

```python
from semantica.ingest import WebIngestor
from semantica.normalize import TextNormalizer
from semantica.semantic_extract import NERExtractor, RelationExtractor
from semantica.graph_store import GraphStore
from semantica.kg import GraphBuilder

ingestor   = WebIngestor()
normalizer = TextNormalizer()
ner        = NERExtractor(method="pattern")
rel        = RelationExtractor(method="pattern")

# The generic GraphStore wrapper exposes the add_nodes/add_edges interface
# GraphBuilder persists through; a raw Neo4jStore does not
store   = GraphStore(backend="neo4j", uri="bolt://localhost:7687", user="neo4j", password="password")
builder = GraphBuilder(merge_entities=True, graph_store=store)

for url in ["https://example.com/a", "https://example.com/b"]:
    page          = ingestor.ingest_url(url)          # WebContent, has .text
    text          = normalizer.normalize_text(page.text)
    entities      = ner.extract(text)
    relationships = rel.extract(text, entities=entities)
    builder.build({"entities": entities, "relationships": relationships})
```

    **最适合：** 竞争情报、新闻监测、研究聚合
  </Tab>

  <Tab title="时间分析">
    追踪事实如何随时间变化：时间点查询、快照与版本管理。

    **流水线：** `KG (Temporal)` → `TemporalGraphQuery` → `VersionManager` → `ChangeManagement`

```python
from semantica.kg import GraphBuilder, TemporalGraphQuery, TemporalVersionManager

builder = GraphBuilder()
kg      = builder.build(sources=[{
    "entities": [{"id": "alice", "type": "Person"}],
    "relationships": [{"source": "alice", "target": "acme", "type": "ceo_of",
                       "valid_from": "2020-01-01", "valid_until": "2023-06-01"}]
}])

query         = TemporalGraphQuery()
snapshot_2021 = query.reconstruct_at_time(kg, "2021-06-15")

versioner = TemporalVersionManager()
versioner.create_snapshot(kg, "2024-Q1", author="user@example.com", description="Q1 snapshot")
```

    **最适合：** 财务历史、监管时间线、组织变更追踪
  </Tab>
</Tabs>

## 模块索引

| 模块 | 用途 | 关键类 |
| :------ | :------- | :----------- |
| [ingest](/zh/reference/ingest) | 数据摄取 | `FileIngestor`, `WebIngestor`, `ParquetIngestor`, `XMLIngestor` |
| [parse](/zh/reference/parse) | 文档解析 | `DocumentParser`, `DoclingParser` |
| [split](/zh/reference/split) | 文本分块 | `TextSplitter` |
| [normalize](/zh/reference/normalize) | 数据清洗 | `TextNormalizer`, `EntityNormalizer`, `LanguageDetector` |
| [semantic_extract](/zh/reference/semantic_extract) | NER 与关系抽取 | `NERExtractor`, `RelationExtractor`, `TripletExtractor`, `SemanticAnalyzer`, `SemanticNetworkExtractor`, `ExtractionValidator` |
| [kg](/zh/reference/kg) | 图构建 | `GraphBuilder`, `TemporalGraphQuery`, `SimilarityCalculator` |
| [ontology](/zh/reference/ontology) | 词表方案管理 | `OntologyGenerator`, `SHACLGenerator` |
| [reasoning](/zh/reference/reasoning) | 逻辑推理 | `Reasoner`, `DatalogReasoner` |
| [embeddings](/zh/reference/embeddings) | 向量嵌入 | `EmbeddingGenerator` |
| [vector_store](/zh/reference/vector_store) | 向量数据库 | `VectorStore` |
| [graph_store](/zh/reference/graph_store) | 图数据库 | `GraphStore` |
| [triplet_store](/zh/reference/triplet_store) | RDF 三元组存储 | `TripletStore` |
| [deduplication](/zh/reference/deduplication) | 实体消解 | `DuplicateDetector`, `EntityMerger`, `ClusterBuilder`, `MergeStrategyManager` |
| [conflicts](/zh/reference/conflicts) | 冲突消解 | `ConflictDetector`, `ConflictResolver`, `SourceTracker` |
| [context](/zh/reference/context) | 智能体上下文与决策 | `AgentContext`, `ContextGraph` |
| [provenance](/zh/reference/provenance) | W3C PROV-O 血缘 | `ProvenanceManager` |
| [change_management](/zh/reference/change_management) | 版本控制 | `TemporalVersionManager` |
| [export](/zh/reference/export) | 数据导出 | `RDFExporter`, `ParquetExporter` |
| [visualization](/zh/reference/visualization) | 图可视化 | `KGVisualizer` |
| [pipeline](/zh/reference/pipeline) | 工作流编排 | `Pipeline`, `PipelineBuilder` |
| [explorer](/zh/reference/explorer) | 知识浏览器 UI | `semantica-explorer --graph <file>` |
| [llms](/zh/reference/llms) | LLM 提供商 | `Groq`, `OpenAI`, `create_provider` |
| [mcp_server](/zh/reference/mcp_server) | MCP stdio 服务器 | `python -m semantica.mcp_server` |
| [seed](/zh/reference/seed) | 从结构化数据源引导知识图谱 | `SeedDataManager` |
| [evals](/zh/reference/evals) | 决策智能评估 | `evaluate`, `list_evaluators`, `EvalSummary` |
| [core](/zh/reference/core) | 基类与注册表 | `Semantica`, `ConfigManager`, `PluginRegistry`, `LifecycleManager` |
| [utils](/zh/reference/utils) | 共享工具 | `helpers`, `validators` |

- [快速开始](/zh/getting-started)：5 分钟构建你的第一个知识图谱。
- [示例手册](/zh/cookbook)：40+ 个领域 notebook，包含真实场景示例。
- [API 参考](/zh/reference/context)：完整技术文档。