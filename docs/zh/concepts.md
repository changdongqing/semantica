---
title: "核心概念"
description: "Semantica 背后的基本理念：知识图谱、推理、溯源与时序智能详解。"
icon: "book-open"
sourceHash: "47674816bb857e4a69c90355ca4804937ea73266361fe6cfd2815babc2b9e9d2"
---

<Info>
  初次接触？请先从[快速开始](/zh/getting-started)的动手示例入手，然后再回到这里深入了解。
</Info>

Semantica 将非结构化数据（文档、网页、报告、数据库）转换为**知识图谱**：即 AI 系统可以查询、推理并回溯到来源的结构化表示。

其核心在于，Semantica 在你现有的 AI 技术栈之上增加了一个上下文与语义层。它并不取代 LangChain、LlamaIndex 或你的 LLM 提供商，而是让它们的输出具备有据可依、可追溯、可审计的特性。

- **上下文层。** 知识图谱、GraphRAG 检索、语义嵌入与时序智能，让每一次 LLM 响应都建立在结构化、可查询的事实之上。
- **问责层。** 溯源追踪、决策智能、冲突检测与 W3C PROV-O 合规，让 AI 技术栈中的每一项主张都可审计、可解释。
- **扩展层。** `PluginRegistry` 与 `MethodRegistry` 让你无需修改框架代码，即可替换或增强任意组件（摄取器、抽取器、推理引擎、后端）。

<Warning>
  **这是系统级可解释性，而非基础模型可解释性。** Semantica 不会暴露、重构或解释 LLM/基础模型*内部*发生的事情。其内部推理或思维链与任何外部系统一样保持不透明。Semantica 解释的是模型*外部*的内容：输入的上下文与数据、产生的决策、其溯源、相关关系、所应用的策略，以及完整的执行轨迹。简言之，Semantica 解释与审计的是*AI 系统做了什么*，而不是基础模型私有的内部推理。
</Warning>

## 知识图谱

<img src="/assets/img/diagrams/kg-structure.svg" alt="知识图谱节点与边结构，展示实体（Person、Organization、Location、Date）及其带类型的关联" style={{ width: '100%', borderRadius: '12px', margin: '0 0 20px' }} />

这是 Semantica 中一切的基础。知识图谱以三种基本构件存储信息：

- **节点（实体）**：人物、公司、地点、事件、概念
- **边（关系）**：`works_for`、`located_in`、`founded_by`
- **属性**：名称、日期、置信度分数、来源 URL

这种结构让知识可搜索、可连接、可查询。关键在于，它是可解释的：每个答案都能追溯到产生该答案的事实与关系。


## 实体抽取（NER）

扫描文本以发现并分类现实世界中的实体：

```python
# "Apple Inc. was founded by Steve Jobs in 1976 in Cupertino."
[
    Entity(text="Apple Inc.", label="ORG",    start_char=0,  end_char=10, confidence=0.98),
    Entity(text="Steve Jobs", label="PERSON", start_char=25, end_char=35, confidence=0.99),
    Entity(text="1976",       label="DATE",   start_char=39, end_char=43, confidence=0.95),
    Entity(text="Cupertino",  label="GPE",    start_char=47, end_char=56, confidence=0.97),
]
```

`NERExtractor(method=...).extract(text)` 返回一个 `Entity` 对象列表，每个对象
包含 `label`、字符偏移（`start_char` / `end_char`）、`confidence`
分数，以及记录抽取方法的 `metadata` 字典。共有三种方法
可用：

| 方法 | 速度 | 准确率 | 要求 |
| :------ | :----- | :-------- | :------------ |
| `"pattern"` | ⚡ 非常快 | 中等 | 无需 API key：基于正则表达式 |
| `"ml"` | 快 | 高 | 本地 ML 模型 |
| `"llm"` | 中等 | 最高 | LLM 提供商：支持全部 9 家 |

## 关系抽取

发现实体之间如何相互连接：

```python
jobs  = Entity(text="Steve Jobs", label="PERSON", start_char=25, end_char=35)
apple = Entity(text="Apple Inc.", label="ORG",    start_char=0,  end_char=10)

[
    Relation(subject=jobs,  predicate="founded",     object=apple, confidence=0.92),
    Relation(subject=apple, predicate="located_in",  object=Entity(text="Cupertino", label="GPE", start_char=47, end_char=56), confidence=0.89),
]
```

`RelationExtractor(method=...).extract(text, entities=entities)` 返回一个
`Relation` 对象列表：带类型的主语-谓语-宾语三元组（两端均为
`Entity` 对象），并附带置信度分数与来源归属。抽取通过模式规则、ML 模型或 LLM
执行。


## 知识图谱 vs. 向量存储

两者都为 AI 检索存储信息：但它们是为不同的任务而构建的。

<Tabs>
  <Tab title="知识图谱">
    以带类型的节点和带标签的边存储**结构化事实**。可回答需要理解实体之间关系的问题。

    | 优势 | 为何重要 |
    | :-------- | :------------- |
    | **遍历** | 多跳查询：“哪些公司的创始人后来有 Apple 校友加入？” |
    | **可解释性** | 每个答案都可追溯到具体的节点与边：没有黑盒检索 |
    | **时序推理** | 时间点查询、`valid_from`/`valid_until` 时间窗口、历史快照 |
    | **冲突检测** | 两个来源对同一事实的分歧会被暴露出来并可解决 |
    | **模式约束** | SHACL 校验在约束违规污染结果之前将其捕获 |

    **适用场景：** 你需要结构化推理、溯源、合规或可解释性。

    ```python
    from semantica.kg import GraphBuilder, PathFinder

    graph = GraphBuilder(merge_entities=True).build(
        {"entities": entities, "relationships": rels}
    )
    path  = PathFinder().dijkstra_shortest_path(graph, "Steve Jobs", "Tim Cook")
    ```
  </Tab>

  <Tab title="向量存储">
    存储文本分块的**稠密嵌入**。通过查找语义相似的段落来回答问题：适用于答案的结构无法预先确定的场景。

    | 优势 | 为何重要 |
    | :-------- | :------------- |
    | **模糊相似度** | 即使措辞不完全匹配也能找到相关内容 |
    | **速度** | 大规模下亚毫秒级的近似最近邻搜索 |
    | **非结构化文本** | 可直接作用于段落、句子和原始文档 |
    | **简单性** | 无需设计模式：嵌入并建立索引即可 |

    **适用场景：** 你需要在大型文本语料上进行快速语义搜索。

    ```python
    from semantica.vector_store import VectorStore

    store   = VectorStore(backend="faiss", dimension=768)
    store.add_documents(["Apple was founded in 1976.", "Google was founded in 1998."])
    results = store.search("tech company founding dates", limit=5)
    ```
  </Tab>

  <Tab title="GraphRAG（两者兼用）">
    Semantica 将两者结合：向量搜索为图遍历提供起点，图则提供向量存储无法提供的结构与溯源。

    | 步骤 | 发生什么 |
    | :---- | :----------- |
    | **查询嵌入** | 用户查询被嵌入，并通过向量相似度用于查找锚点节点 |
    | **图遍历** | 从锚点节点出发的多跳遍历检索相关实体与关系 |
    | **上下文组装** | 事实与关系被组装，并为每项主张附上来源归属 |
    | **LLM 生成** | LLM 基于检索到的结构化上下文生成答案 |

    **结果：** 响应中的每项主张都链接回具体的图节点：没有来自训练数据的幻觉，完整审计轨迹。

    ```python
    from semantica.context import AgentContext, ContextGraph
    from semantica.vector_store import VectorStore

    context = AgentContext(
        vector_store=VectorStore(backend="faiss", dimension=768),
        knowledge_graph=ContextGraph(advanced_analytics=True),
        graph_expansion=True,
    )

    # store() extracts entities and populates the graph + vector index
    context.store([{"content": "Steve Jobs co-founded Apple Inc. in 1976."}])

    # retrieve() blends vector similarity with graph traversal
    results = context.retrieve("Who founded Apple?", use_graph=True, expand_graph=True)
    for r in results:
        print(r["score"], r["content"], r["source"])
    ```
  </Tab>
</Tabs>


## 嵌入

嵌入将文本转换为数值向量，使 AI 系统能够衡量语义相似度：即使措辞不同也能找到相关概念。

Semantica 将嵌入用于：

- **语义搜索**：按含义检索，而不只是关键词
- **实体消解**：跨不同来源匹配同一实体
- **先例搜索**：查找相似的过往决策
- **GraphRAG 检索**：向量 + 图遍历的混合方式
- **距离智能**：任意节点集合之间的 N×N 语义距离矩阵

**支持的模型：** Sentence-Transformers、FastEmbed、OpenAI、BGE、Ollama 本地嵌入。


## GraphRAG

GraphRAG（图增强检索增强生成）通过将 LLM 响应建立在结构化知识图谱而非仅原始文本分块之上，来增强其表现。

<img src="/assets/img/diagrams/graphrag-flow.svg" alt="GraphRAG 流程：用户查询 → 向量搜索 + 图遍历 → 上下文构建器 → LLM → 有据可依的答案" style={{ width: '100%', borderRadius: '12px', margin: '16px 0 20px' }} />

<Steps>
  <Step title="用户提交查询">
    查询被嵌入，并同时用于启动向量搜索与图遍历。
  </Step>
  <Step title="混合上下文检索">
    Semantica 检索相关的图上下文：实体、带类型的关系与多跳推理路径，以及与向量相似的文本分块。
  </Step>
  <Step title="上下文构建">
    检索到的事实与推理路径被组装成结构化的提示上下文，每项事实都标注其来源节点与置信度。
  </Step>
  <Step title="LLM 生成有据可依的响应">
    LLM 产出的答案中，每项主张都链接回图中的来源节点：没有悬空断言，没有来自训练数据的幻觉。
  </Step>
</Steps>

<Tip>
  **GraphRAG 消除了标准 RAG 的幻觉与可追溯性问题。** 标准 RAG 检索文本分块；GraphRAG 检索带类型关系的结构化事实。LLM 无法凭空编造从未存在于图中的结构。
</Tip>


## 本体

本体定义知识的模式与规则：存在哪些实体类型、哪些关系有效，以及适用哪些约束。

```python
ontology = {
    "classes": ["Person", "Organization", "Location"],
    "relationships": ["works_for", "located_in", "founded_by"],
    "rules": {
        "Person":       ["must_have_name"],
        "Organization": ["must_have_name", "can_have_founding_date"]
    }
}
```

Semantica 可以从你的知识图谱自动生成本体，或导入现有的 OWL/RDF/Turtle 本体。**本体中心**（v0.5.0）新增了可视化编辑器、SHACL Studio、对齐编写功能以及实时健康仪表板。完整的 6 阶段生成流水线请参阅[本体参考](/zh/reference/ontology)。


## 推理与推断

Semantica 内置多种推理引擎，可从已有事实中推导出新知识。

```text
Known:    Steve Jobs founded Apple Inc.
Known:    Apple Inc. is headquartered in Cupertino
Inferred: Steve Jobs has a connection to Cupertino
```

<Tabs>
  <Tab title="前向链">
    反复应用 IF/THEN 规则，直到无法推导出新事实。最适合告警系统、合规检查与基于触发的工作流。

    ```python
    from semantica.reasoning import Reasoner

    engine = Reasoner()
    engine.add_fact("Manager(Alice)")
    engine.add_rule("IF Manager(?x) THEN HasAuthority(?x)")

    results = engine.forward_chain()   # list of InferenceResult
    for r in results:
        print(r.conclusion)           # "HasAuthority(Alice)"
    ```
  </Tab>
  <Tab title="Rete 网络">
    面向大型规则集的高效模式匹配：Rete 算法避免重新评估前提条件未发生变化的规则。最适合在数百万条事实上运行数千条规则。

    ```python
    from semantica.reasoning import ReteEngine, Rule, Fact

    engine = ReteEngine()
    engine.build_network([
        Rule(rule_id="r1", name="manager_authority",
             conditions=["Manager(?x)"], conclusion="HasAuthority(?x)"),
    ])
    engine.add_fact(Fact(fact_id="f1", predicate="Manager", arguments=["Alice"]))

    matches = engine.match_patterns()
    results = engine.execute_matches(matches)   # ["HasAuthority(?x)"]
    ```
  </Tab>
  <Tab title="LLM 推理">
    `GraphReasoner` 借助 LLM 在知识图谱上回答开放式问题，
    返回以图中事实为依据的自然语言答案。最适合
    固定规则无法预见的探索性与调查性问题。

    ```python
    from semantica.reasoning import GraphReasoner

    reasoner = GraphReasoner(provider="openai", model="gpt-4o-mini")
    answer = reasoner.reason(kg, "Which suppliers are indirectly exposed to the Acme outage?")
    ```
  </Tab>
  <Tab title="Datalog（v0.4.0）">
    具有不动点语义的递归 Horn 子句规则：可处理前向链无法表达的
    传递闭包与递归关系。

    ```python
    from semantica.reasoning import DatalogReasoner

    reasoner = DatalogReasoner()
    reasoner.add_fact("parent(alice, bob)")
    reasoner.add_fact("parent(bob, charlie)")
    reasoner.add_rule("ancestor(X, Y) :- parent(X, Y).")
    reasoner.add_rule("ancestor(X, Z) :- parent(X, Y), ancestor(Y, Z).")

    reasoner.derive_all()
    results = reasoner.query("ancestor(alice, ?Z)")   # {"Z": "bob"} and {"Z": "charlie"}, order not guaranteed
    ```
  </Tab>
  <Tab title="引擎对比">

    | 引擎 | 类 | 最适合 |
    | :------ | :----- | :-------- |
    | 前向链 | `Reasoner` | 告警系统、合规检查 |
    | Rete 网络 | `ReteEngine` | 大型规则集、高事实吞吐量 |
    | SPARQL 扩展 | `SPARQLReasoner` | 语义网、基于 RDF 的本体推理 |
    | Datalog（v0.4.0） | `DatalogReasoner` | 传递闭包、图可达性 |
    | 时序 | `TemporalReasoningEngine` | Allen 区间代数、感知时间的推断 |
    | 图上的 LLM | `GraphReasoner` | 开放式、调查性问题 |

  </Tab>
</Tabs>

`Reasoner.forward_chain()` 返回 `InferenceResult` 对象，其中携带所应用的规则（`rule_used`）及其触发所依据的前提；`ExplanationGenerator` 会将其转换为逐步的自然语言论证：这里的推理**不是**黑盒。


## 时序智能

知识会随时间变化。时序图将 `valid_from` / `valid_until` 时间窗附加到节点和边上，从而支持时间点查询和历史分析。

```python
from semantica.kg import TemporalGraphQuery
from datetime import datetime

query_engine = TemporalGraphQuery(enable_temporal_reasoning=True)

# Query the graph as it existed on a specific date
snapshot = query_engine.query_at_time(kg, query="", at_time=datetime(2021, 6, 15))
```

**支持的特性：** Allen 区间代数（全部 13 种时序关系）、OWL-Time 导出、`recorded_at` 时间戳标记、时序溯源。

**常见用途：** 跟踪公司领导层变更、政策演进、研究时间线、金融工具历史、监管合规时间窗。


## 距离智能

探索图中任意实体的语义邻域：有助于理解概念上接近的内容、检测聚类，以及可视化知识拓扑。

```python
from semantica.kg import SimilarityCalculator

calc = SimilarityCalculator(method="cosine")   # "cosine" | "euclidean" | "manhattan" | "correlation"

# Similarity for every unique pair of node embeddings: {(node_a, node_b): score}
pairs = calc.pairwise_similarity({"apple": vec_apple, "google": vec_google, "nest": vec_nest})

# Or rank a set of embeddings by closeness to one query vector
nearest = calc.find_most_similar(embeddings, query_embedding, top_k=10)
```

**特性：** N×N 语义距离矩阵、自我模式可视化、距离带分类（`direct` / `near` / `mid-range` / `distant`）、面向大图的嵌入缓存优化。

[可视化模块](/zh/reference/visualization) 将距离矩阵渲染为交互式热图和自我模式邻域图。[Explorer](/zh/reference/explorer) 将距离智能直接嵌入浏览器仪表板。


## 去重与实体消解

现实世界的数据中，同一实体可能以多个名称出现："Apple"、"Apple Inc."、"Apple Computer Inc."。Semantica 的去重流水线会检测这些情况、合并属性、解决冲突，并保留原始来源溯源。

<Tabs>
  <Tab title="策略">

    | 策略 | 算法 | 适用场景 |
    | :-------- | :--------- | :-------- |
    | `v1` | Jaro-Winkler 字符串相似度 | 小型数据集，快速基线 |
    | `blocking_v2` | 候选分块 + 相似度 | 大型语料库：减少 O(n²) 比较 |
    | `hybrid_v2` | 分块 + 语义嵌入匹配 | 结构化/非结构化混合的实体名称 |
    | `semantic_v2` | 纯基于嵌入的消解 | 相比 v1 最高快 7×；可处理缩写和别名 |

  </Tab>
  <Tab title="配置">
    ```python
    from semantica.deduplication import DuplicateDetector, EntityMerger

    detector   = DuplicateDetector(similarity_threshold=0.85)
    candidates = detector.detect_duplicates(entities)

    merger     = EntityMerger()
    operations = merger.merge_duplicates(entities, strategy="keep_most_complete")
    ```
  </Tab>
</Tabs>


## 溯源与可审计性

Semantica 中的每个事实都可回溯到：

- 其所来自的**源文档**
- 所使用的**抽取方法**（pattern / ML / LLM）
- 图构建期间应用的**本体规则**
- 产生任何推断事实的**推理步骤**

<Note>
  这是符合 W3C PROV-O 的血缘：适用于需要审计轨迹的受监管行业（HIPAA、SOX、GDPR、FDA 21 CFR Part 11）。`ProvenanceManager.export_prov(format="turtle")` 会将记录的血缘序列化为 PROV-O RDF。
</Note>

```python
from semantica.provenance import ProvenanceManager

prov = ProvenanceManager()
prov.track_entity("apple_inc", source="report.pdf",
                  metadata={"extractor": "NamedEntityRecognizer", "confidence": 0.98})

record = prov.get_provenance("apple_inc")   # dict; use get_lineage() for the full chain
print(record["source_document"])
print(record["timestamp"])
print(record["checksum"])
print(record["metadata"])          # extractor, confidence, and any custom keys
```


## 决策智能

每个 Agent 决策在 Semantica 中都是一等对象：被记录、建立因果关联，并可依据先例进行搜索。这是 AI 流水线的**问责层**：决策不再是短暂的日志消息，而是可查询的知识图谱节点。

```python
decision_id = context.record_decision(
    category="model_selection",
    scenario="Choose LLM for production pipeline",
    reasoning="GPT-4 benchmark advantage justifies 3x cost increase",
    outcome="selected_gpt4",
    confidence=0.91,
)

# Find similar past decisions before making a new one
precedents = context.find_precedents("model selection reasoning", limit=5)

# Trace downstream impact of a past decision
influence  = context.analyze_decision_influence(decision_id)
```

<Tip>
  **在每次高风险决策前使用 `find_precedents()`。** 对所有已记录决策进行混合相似度搜索，可浮现可能适用的过往推理：减少不同 Agent 运行之间的不一致性，并使组织能够真正从 AI 决策历史中学习。
</Tip>


## 冲突检测

当多个来源对同一事实存在分歧时，Semantica 会标记并解决冲突，而不是静默选择一个值。

**解决策略：**

- **新近性**：优先选择最新来源
- **来源可信度**：优先选择最可靠的来源（可信度分数可配置）
- **多数投票**：在至少 2 个来源一致时进行聚合
- **人工审核**：标记以供人工仲裁；流水线继续运行而不阻塞

有关 `ConflictResolver`、`SourceTracker` 和 `InvestigationGuideGenerator`，请参阅 [冲突参考](/zh/reference/conflicts)。


## 自定义插件开发

Semantica 面向扩展而设计。任何组件——摄取器、抽取器、图构建器、推理引擎——都可以通过运行时注册的自定义实现来替换或增强。

<AccordionGroup>
  <Accordion title="PluginRegistry：按名称替换任意组件">

    `PluginRegistry` 提供跨所有模块的动态插件发现、注册和加载。在字符串键下注册你自己的类；Semantica 将在配置或流水线步骤中引用该键的任何位置使用它。

    ```python
    from semantica.core import PluginRegistry

    registry = PluginRegistry()

    # Register a custom ingestor
    registry.register_plugin(
        "my_sql_ingestor", MySQLIngestor,
        version="1.0.0",
        description="PostgreSQL ingestor for internal warehouse",
        capabilities=["ingest"],
    )

    # Load and use
    plugin = registry.load_plugin("my_sql_ingestor", connection_string="postgresql://...")
    result = plugin.execute("SELECT * FROM documents")

    # Reference by name in pipeline YAML: no code changes needed
    ```

    ```yaml
    steps:
      - name: ingest
        plugin: my_sql_ingestor
        config:
          connection_string: "${DB_URL}"
    ```

    **可用扩展点：** 摄取器、解析器、规范化器、抽取器、推理引擎、导出格式、向量存储后端、图存储后端、可视化渲染器。

  </Accordion>
  <Accordion title="MethodRegistry：用自己的实现替换内置图操作">

    `method_registry` 允许你为知识图谱任务（`build`、`analyze`、`centrality`、`resolve`、……）注册一个替代实现并赋予名称，然后在运行该任务的任何位置选择它。

    ```python
    from semantica.kg import method_registry
    from semantica.kg.methods import calculate_centrality

    def fast_centrality(graph, **kwargs):
        """Custom centrality implementation."""
        ...

    # register(task, name, func)
    method_registry.register("centrality", "fast_centrality", fast_centrality)

    # The task wrappers consult method_registry, so the name is now selectable:
    scores = calculate_centrality(kg, method="fast_centrality")

    print(method_registry.list_all("centrality"))   # {"centrality": ["fast_centrality", ...]}
    ```

  </Accordion>
</AccordionGroup>

- [快速入门教程](/zh/quickstart)：使用代码构建完整流水线。
- [模块指南](/zh/modules)：通过示例解释每个模块。
- [API 参考](/zh/reference/context)：完整技术参考。