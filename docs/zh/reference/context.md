---
title: "Context 模块"
description: "智能体上下文图、决策追踪、因果链、先例搜索、策略执行与多跳 GraphRAG。"
icon: "brain"
sourceHash: "aaf98a7a72764aa9d1ec43a1ee4746dc320d660b7a100ba0e7bc2eeca6b3b731"
---

`semantica.context` 是面向 AI 智能体的记忆与决策层：

- 存储带溯源信息的事实，并支持基于嵌入的检索
- 将决策记录为一等图谱对象，并保留完整因果链
- 让智能体搜索自身历史，从而在多次运行之间保持一致
- 通过多跳 GraphRAG 遍历回答复杂查询
- 执行带版本的策略并跟踪合规例外


## 导出的类

| 类 | 职责 |
| :--- | :--- |
| `AgentContext` | 主要入口：记忆、检索、决策、图遍历、检查点 |
| `ContextGraph` | 内存知识图谱，支持中心性、社区发现与决策追踪 |
| `AgentMemory` | 由向量支持的持久记忆：`store(text)`、`retrieve(query, max_results)` |
| `EntityLinker` | 将实体提及链接到 URI；在实体 ID 之间创建带类型的边 |
| `ContextRetriever` | 向量 + 图混合检索，支持最小分数与图扩展选项 |
| `DecisionRecorder` | 记录带嵌入、因果链与元数据的决策 |
| `PolicyEngine` | 策略管理：`add_policy()`、`check_compliance()`、`get_applicable_policies()` |
| `CausalChainAnalyzer` | 追踪决策之间的相互影响：`get_causal_chain(decision_id)` |
| `ErasureCoordinator` | 跨图、记忆与向量存储擦除实体，并返回可审计的 `ErasureReceipt` |


## 核心能力

- **AgentContext**：通过单一 API 提供记忆、决策追踪与图支持检索
  - 对话历史与检查点差异对比
  - 将完整上下文状态持久化到磁盘并从中恢复
- **ContextGraph**：线程安全的内存知识图谱
  - PageRank、中心性、社区发现、时间有效性
  - 跨图导航与链接遍历
- **AgentMemory**：带保留策略的嵌入支持记忆
  - 在可配置的 `max_memory_size` 下执行 LRU 淘汰
  - 按对话隔离历史记录
- **DecisionRecorder**：记录带因果链与置信度分数的决策
  - 时间有效窗口（`valid_from` / `valid_until`）
  - 每次决策时捕获跨系统上下文
- **PolicyEngine**：在知识图谱中存储带版本的策略
  - 针对已记录决策执行合规检查
  - 带审批人审计轨迹的策略例外跟踪
- **EntityLinker**：将实体文本映射到稳定 URI
  - 在实体 ID 之间创建带类型的链接
  - 防止 "Apple"、"Apple Inc."、"AAPL" 成为彼此独立的节点
- **ContextRetriever**：融合向量相似度、图遍历与智能体记忆
  - 相比纯向量搜索获得更丰富的上下文
  - 可配置的 `hybrid_alpha` 与扩展跳数
- **CausalChainAnalyzer**：追踪任意决策的上游原因与下游影响
  - 带关系类型的可解释性路径
  - 可配置的深度与方向


## 快速开始

<Steps>
  <Step title="初始化智能体上下文">
    ```python
    from semantica.context import AgentContext, ContextGraph
    from semantica.vector_store import VectorStore

    context = AgentContext(
        vector_store=VectorStore(backend="faiss", dimension=768),
        knowledge_graph=ContextGraph(advanced_analytics=True),
        decision_tracking=True,
        retention_days=90,
        max_memories=50000,
    )
    ```
  </Step>
  <Step title="存储事实并按语义相似度检索">
    ```python
    memory_id = context.store(
        "GPT-4 outperforms GPT-3.5 on reasoning benchmarks by 40%",
        metadata={"source": "openai_blog", "date": "2024-01"}
    )

    results = context.retrieve("LLM benchmark comparisons", max_results=5)
    for r in results:
        print("{} (score: {:.3f})".format(r["content"], r["score"]))
    ```
  </Step>
  <Step title="记录带完整溯源的决策">
    ```python
    decision_id = context.record_decision(
        category="model_selection",
        scenario="Choose LLM for production reasoning pipeline",
        reasoning="GPT-4 benchmark advantage justifies 3x cost increase",
        outcome="selected_gpt4",
        confidence=0.91,
        entities=["gpt-4", "gpt-3.5"],
        decision_maker="pipeline_agent",
    )
    ```
  </Step>
  <Step title="查找先例并追踪因果链">
    ```python
    # Search past decisions: prevents contradictory choices across runs
    precedents = context.find_precedents("model selection reasoning", limit=5)
    for p in precedents:
        print("[{}] {}  (confidence: {:.2f})".format(p.category, p.outcome, p.confidence))
        print("  Reasoning: {}".format(p.reasoning))

    # Trace downstream decisions influenced by this one
    chain = context.get_causal_chain(decision_id, direction="downstream", max_depth=5)
    print("Downstream decisions: {}".format(len(chain)))

    # Full explainability
    explanation = context.trace_decision_explainability(decision_id)
    print("Total connections: {}".format(explanation["total_connections"]))
    ```
  </Step>
</Steps>

## 使用模式

<Tabs>
  <Tab title="仅向量记忆">
    最快配置：不使用知识图谱。最适合需要对事实进行语义搜索、且不希望承担图遍历开销的智能体。

    ```python
    from semantica.context import AgentContext
    from semantica.vector_store import VectorStore

    # Zero-graph setup: vector memory only
    context = AgentContext(
        vector_store=VectorStore(backend="faiss", dimension=768),
    )

    context.store("User prefers concise responses with code examples")
    context.store("Project uses Python 3.11 with FastAPI and PostgreSQL")

    results = context.retrieve("user coding preferences", max_results=5)
    for r in results:
        print("{:.3f}  {}".format(r["score"], r["content"]))
    ```

    <Check>
      将 `backend="faiss"` 换成 `backend="inmemory"`，即可进行零依赖的本地开发。
    </Check>
  </Tab>
  <Tab title="完整 Agent 上下文">
    生产环境配置：图 + 决策 + 分析。当你需要可解释性和无矛盾的决策历史时使用。

    ```python
    from semantica.context import AgentContext, ContextGraph
    from semantica.vector_store import VectorStore

    context = AgentContext(
        vector_store=VectorStore(backend="faiss", dimension=768),
        knowledge_graph=ContextGraph(
            advanced_analytics=True,  # PageRank, centrality, community detection
            kg_algorithms=True,       # path-finding, link prediction
        ),
        decision_tracking=True,       # requires knowledge_graph
        retention_days=90,
        max_memories=50000,
    )

    decision_id = context.record_decision(
        category="model_selection",
        scenario="Choose LLM for production reasoning pipeline",
        reasoning="GPT-4 benchmark advantage justifies 3x cost",
        outcome="selected_gpt4",
        confidence=0.91,
        entities=["gpt-4", "gpt-3.5"],
    )

    # Prevent contradictions across runs
    precedents = context.find_precedents("model selection", limit=5)
    ```

  </Tab>
  <Tab title="GraphRAG 查询">
    加载预构建的知识图谱，并通过多跳图遍历回答复杂问题。

    ```python
    from semantica.context import AgentContext, ContextGraph
    from semantica.vector_store import VectorStore

    context = AgentContext(
        vector_store=VectorStore(backend="faiss", dimension=768),
        knowledge_graph=ContextGraph(advanced_analytics=True),
        hybrid_alpha=0.4,        # 0.0 = pure vector  →  1.0 = pure graph
        max_expansion_hops=3,
    )

    # Load a pre-built knowledge graph
    context.load_graph("company_kg.json")

    # Multi-hop GraphRAG retrieval
    results = context.retrieve(
        "companies founded by Apple alumni",
        use_graph=True,
        max_results=10,
    )
    for r in results:
        print("[{:.3f}] {}".format(r["score"], r["content"]))
    ```

    <Tip>
      增大 `max_expansion_hops` 可进行更深入的遍历，但会增加延迟。先从 2 开始，再向上调优。
    </Tip>
  </Tab>
  <Tab title="策略强制执行">
    添加带版本的合规策略，并在记录每项决策前依据这些策略进行校验。

    ```python
    from datetime import datetime

    from semantica.context import AgentContext, ContextGraph, PolicyEngine
    from semantica.context.decision_models import Decision, Policy
    from semantica.vector_store import VectorStore

    context = AgentContext(
        vector_store=VectorStore(backend="faiss", dimension=768),
        knowledge_graph=ContextGraph(),
        decision_tracking=True,
    )

    engine = PolicyEngine(graph_store=context.knowledge_graph)

    engine.add_policy(Policy(
        policy_id="data_privacy",
        name="Data Privacy",
        description="No PII stored without user consent flag",
        rules={"required_user_consent": True, "max_retention_days": 90},
        category="privacy",
        version="1.2",
        created_at=datetime(2024, 1, 1),
        updated_at=datetime(2024, 1, 1),
    ))

    decision = Decision(
        decision_id="dec_store_email",
        category="data_storage",
        scenario="Store user profile",
        reasoning="User opted in to profile storage",
        outcome="stored",
        confidence=1.0,
        timestamp=datetime.now(),
        decision_maker="profile_agent",
        metadata={"user_consent": True, "retention_days": 30},
    )

    if engine.check_compliance(decision, "data_privacy"):
        context.record_decision(
            category=decision.category,
            scenario=decision.scenario,
            reasoning=decision.reasoning,
            outcome=decision.outcome,
            confidence=decision.confidence,
        )
    else:
        print("Blocked by policy: data_privacy")
    ```
  </Tab>
</Tabs>

## AgentContext

**`AgentContext`** 是主要入口点。它将记忆、图和决策追踪封装在**单一统一 API** 之后。

### 构造函数参数

| 参数 | 类型 | 默认值 | 描述 |
| :--------- | :---- | :------- | :----------- |
| `vector_store` | `VectorStore` | **必填** | 用于基于嵌入的记忆检索的后端 |
| `knowledge_graph` | `ContextGraph` | `None` | 启用图支撑的关系和 GraphRAG |
| `decision_tracking` | `bool` | `False` | 激活 `DecisionRecorder`：要求同时设置 `knowledge_graph` |
| `retention_days` | `Optional[int]` | `30` | 自动使超过 N 天的记忆过期；`None` = 永久保留 |
| `max_memories` | `int` | `10000` | LRU 淘汰前的硬性上限 |
| `graph_expansion` | `bool` | `True` | 从已存储的记忆自动扩展图 |
| `max_expansion_hops` | `int` | `2` | 检索期间图扩展的最大跳数 |
| `hybrid_alpha` | `float` | `0.5` | 在向量（`0.0`）与图（`1.0`）检索之间平衡 |
| `advanced_analytics` | `bool` | `True` | 启用 PageRank、中心性和社区分析 |
| `kg_algorithms` | `bool` | `True` | 添加路径查找和链接预测 |

<Tip>
  **设置 `retention_days` 以避免记忆膨胀。** 默认值 `30` 会自动清理。对合规性要求严格的 Agent 可能需要 `retention_days=None`，并通过 `export()` 显式归档。
</Tip>

<Tip>
  **在多次运行之间持久化你的上下文。** `VectorStore` 不会自动持久化；向其构造函数传递 `index_path=` 是无效操作。调用 `context.save("agent_state/")` 可将记忆、向量索引和图写入磁盘，并在下一个进程中调用 `context.load("agent_state/")` 以恢复它们。请参阅下方 [真实场景模式](#real-world-patterns) 下的“持久化与恢复”选项卡。
</Tip>

### 记忆方法

| 方法 | 返回 | 描述 |
| :------ | :------- | :----------- |
| `store(content, metadata, conversation_id, user_id)` | `str` 或 `Dict` | 存储一条事实（str → 记忆 ID）或文档列表（list → 统计字典） |
| `batch_store(items)` | `List[str]` | 一次存储多个条目：返回记忆 ID 列表 |
| `retrieve(query, max_results, min_score, use_graph, conversation_id)` | `List[Dict]` | 语义检索；若已设置 `knowledge_graph`，则自动选择 GraphRAG |
| `forget(memory_id, conversation_id, days_old)` | `int` | 按 ID、会话或时间删除记忆 |
| `update(memory_id, content, metadata)` | `bool` | 更新已存储记忆的内容或元数据 |
| `get_memory(memory_id)` | `Optional[Dict]` | 按 ID 获取特定记忆 |
| `stats()` | `Dict` | 记忆计数、向量存储状态、图统计信息 |
| `health()` | `Dict` | 系统健康状态：全部后端、状态标志 |
| `save(path)` | `None` | 将完整上下文状态（记忆 + 图）持久化到磁盘 |
| `load(path)` | `None` | 从磁盘恢复上下文状态 |
| `export(conversation_id, format)` | `str \| Dict` | 将记忆导出为 JSON 或 dict |
| `import_data(data, format)` | `int` | 从 JSON 或 dict 导入记忆 |

<Tip>
  **`retrieve()` 使用 `max_results=`，而不是 `top_k=`。** 参数为 `max_results`（默认 `5`）。传递 `use_graph=True` 以强制使用 GraphRAG，或传递 `use_graph=False` 以强制仅使用向量检索，无论是否配置了 `knowledge_graph`。
</Tip>

### 会话方法

```python
# Store turns in a conversation thread
context.store("User asked about deployment options", conversation_id="conv_001")
context.store("Agent recommended Docker + Kubernetes", conversation_id="conv_001")

# Retrieve full conversation history
history = context.conversation("conv_001", max_items=50)
for turn in history:
    print("[{}] {}".format(turn["timestamp"], turn["content"]))

# Retrieve across all conversations with a query
results = context.retrieve(
    "deployment recommendations",
    conversation_id="conv_001",
    max_results=10,
)
```

### 多跳 GraphRAG

**需要在构造时设置 `knowledge_graph`**：启用 `query_with_reasoning()` 以进行 LLM 支撑的多跳遍历：


```python
import os
from semantica.llms import Groq

llm    = Groq(model="llama-3.3-70b-versatile", api_key=os.getenv("GROQ_API_KEY"))
result = context.query_with_reasoning(
    query="What technologies have we chosen and why?",
    llm_provider=llm,
    max_hops=2,
    max_results=10,
)

print(result["response"])
print("Confidence: {:.2f}".format(result["confidence"]))
print("Sources used: {}".format(result["num_sources"]))
```

### 决策方法

| 方法 | 返回值 | 说明 |
| :------ | :------- | :----------- |
| `record_decision(category, scenario, reasoning, outcome, confidence, entities, decision_maker, valid_from, valid_until)` | `str` | 记录一条决策；当 `decision_tracking=False` 或未提供 `knowledge_graph` 时抛出 `RuntimeError` |
| `find_precedents(scenario, category, limit, use_hybrid_search, max_hops, as_of)` | `List[Decision]` | 通过语义与结构相似度查找相似的过往决策 |
| `query_decisions(query, max_hops, use_hybrid_search)` | `List[Decision]` | 面向上下文的宽泛决策搜索 |
| `get_causal_chain(decision_id, direction, max_depth)` | `List[Decision]` | 追踪 `"upstream"` 原因或 `"downstream"` 影响 |
| `trace_decision_explainability(decision_id)` | `Dict` | 完整的可解释性：原因、影响、关系路径 |
| `get_policy_engine()` | `PolicyEngine` | 访问当前活跃的 `PolicyEngine` 实例 |

<Warning>
  `decision_tracking=True` 同时要求设置 `knowledge_graph`。否则 `record_decision()` 会抛出 `RuntimeError`。
</Warning>

<Tip>
  **在每个重要决策之前使用 `find_precedents()`。** 上下文模块正是以此防止智能体在不同运行之间做出相互矛盾的决策。将先例作为上下文呈现给 LLM：“我们之前出于类似原因选择了 X。”
</Tip>

### 检查点方法

**非常适合审计推理循环**：在一轮推理前后各取一次快照，即可准确看出发生了什么变化：

```python
# Take a named snapshot of the current graph state
context.checkpoint("before_inference")

# ... run reasoning, record decisions ...

context.checkpoint("after_inference")

# See exactly what was added/removed
diff = context.diff_checkpoints("before_inference", "after_inference")
print("Decisions added: {}".format(len(diff["decisions_added"])))
print("Relationships added: {}".format(len(diff["relationships_added"])))

# Persist a checkpoint to disk via TemporalVersionManager
context.flush_checkpoint("after_inference")
```


## ContextGraph

**`ContextGraph`** 是支撑 `AgentContext` 的知识图谱。它也可以**独立使用**，在不需要完整上下文层的情况下进行关系建模。

```python
from semantica.context import ContextGraph

graph = ContextGraph(advanced_analytics=True)

# Build the graph
graph.add_node("Python",  "language",  properties={"paradigm": "multi-paradigm"})
graph.add_node("FastAPI", "framework", properties={"language": "Python"})
graph.add_edge("Python", "FastAPI", "enables")

# Record and query decisions directly on the graph
decision_id = graph.record_decision(
    category="technology_choice",
    scenario="Web API framework selection",
    reasoning="FastAPI's async support and auto-docs match our requirements",
    outcome="selected_fastapi",
    confidence=0.92,
    entities=["Python", "FastAPI"],
)

similar = graph.find_precedents_by_scenario("web framework", limit=3)
stats   = graph.stats()
print("Nodes: {}, Edges: {}".format(stats["node_count"], stats["edge_count"]))
```

### 构造函数选项

| 参数 | 类型 | 默认值 | 说明 |
| :--------- | :---- | :------- | :----------- |
| `advanced_analytics` | `bool` | `True` | PageRank、介数中心性 |
| `centrality_analysis` | `bool` | `True` | 完整的中心性分析套件 |
| `community_detection` | `bool` | `True` | Louvain 社区聚类 |
| `node_embeddings` | `bool` | `True` | 用于结构相似度的 Node2Vec 嵌入 |

### ContextGraph：完整方法参考

| 方法 | 返回值 | 说明 |
| :------ | :------- | :----------- |
| `add_node(node_id, node_type, properties, valid_from, valid_until)` | `None` | 添加节点；支持时间有效期窗口 |
| `add_edge(source_id, target_id, edge_type, weight, properties)` | `None` | 添加带可选权重的有向边 |
| `add_nodes(nodes)` | `int` | 从字典列表批量添加；返回添加数量 |
| `add_edges(edges)` | `int` | 批量添加边；返回添加数量 |
| `get_neighbors(node_id, hops)` | `List[Dict]` | BFS 获取指定深度内的邻居 |
| `get_neighbor_distances(node_id, hops)` | `List[Dict]` | 带置信度衰减评分的邻居 |
| `find_node(node_id)` | `Optional[Dict]` | 按 ID 查找单个节点 |
| `find_nodes(node_type, skip, limit)` | `List[Dict]` | 按类型筛选节点并分页 |
| `find_active_nodes(node_type, at_time)` | `List[Dict]` | 在给定时间戳有效的节点 |
| `find_edges(edge_type, skip, limit)` | `List[Dict]` | 按类型筛选边并分页 |
| `record_decision(category, scenario, reasoning, outcome, confidence, entities, decision_maker)` | `str` | 添加带因果边的决策节点 |
| `find_precedents_by_scenario(scenario, category, limit, use_semantic_search, as_of)` | `List[Dict]` | 语义相似的过往场景 |
| `query(query, skip, limit)` | `List[Dict]` | 针对节点内容的全文搜索 |
| `stats()` | `Dict` | 节点/边数量、类型分布、图密度 |
| `density()` | `float` | 图密度得分 |
| `save_to_file(path, format="json")` | `None` | 将图持久化为 JSON 或 Markdown 目录 |
| `load_from_file(path, format="json")` | `None` | 从 JSON 或 Markdown 目录替换图状态 |
| `build_from_conversations(conversations, link_entities)` | `Dict` | 从对话数据构建图 |
| `link_graph(other_graph, source_node_id, target_node_id, link_type)` | `str` | 创建跨图导航链接；返回 `link_id` |
| `navigate_to(link_id)` | `Tuple` | 沿跨图链接跳转到 `(target_graph, target_node_id)` |
| `cross_graph_path(source_node_id, target_graph, target_node_id, max_hops)` | `Dict` | 跨已链接图的最短路径 |
| `clear()` | `None` | 重置图状态及所有索引 |

### Distance Intelligence（v0.5.0）

`ContextGraph` 提供完整的 Distance Intelligence API，用于探索语义邻域并将邻近度混合到检索中。

<Info>
  完整的 Distance Intelligence 参考（距离矩阵、API 端点、嵌入缓存、Explorer UI）见专门的 [Distance Intelligence](/zh/reference/distance) 页面。本节介绍上下文层 API。
</Info>

### 带距离元数据的邻居

将 `include_distance_metadata=True` 传给 `get_neighbors()`，即可在返回每个邻居的同时获得距离带、置信度衰减和路径信息：

```python
graph = ContextGraph(advanced_analytics=True)

# ... populate graph ...

neighbors = graph.get_neighbors(
    "python",
    hops=3,
    include_distance_metadata=True,
    min_weight=0.3,   # exclude low-confidence edges
)

for n in neighbors:
    print(
        f"{n['node_id']:15s}  "
        f"band={n['distance_band']:10s}  "
        f"decay={n['confidence_decay']:.3f}  "
        f"hops={n['hop_count']}"
    )
```

| 新增字段 | 类型 | 说明 |
| :---------- | :---- | :----------- |
| `distance_band` | `str` | `"direct"`（1 跳）/ `"near"`（2）/ `"mid-range"`（3–4）/ `"distant"`（5+） |
| `confidence_decay` | `float` | `edge_weight ^ hop_count`；每跳衰减 |
| `path_to_anchor` | `List[str]` | 从锚点节点到该邻居的最短路径 |
| `hop_count` | `int` | 距锚点的 BFS 深度 |

### 邻近度混合检索

在 `AgentContext` 上设置 `proximity_weight`，可将图邻近度混合到每次 `retrieve()` 和 `find_precedents()` 调用中：

```python
context = AgentContext(
    vector_store=VectorStore(backend="faiss", dimension=768),
    knowledge_graph=ContextGraph(advanced_analytics=True),
    proximity_weight=0.3,   # 0.7×semantic + 0.3×proximity
)

# combined_score is returned alongside semantic_score and proximity_score
results = context.retrieve("web API frameworks", max_results=10)
for r in results:
    print(
        f"[{r['combined_score']:.3f}]  "
        f"semantic={r['semantic_score']:.3f}  "
        f"proximity={r['proximity_score']:.3f}  "
        f"{r['content'][:60]}"
    )

# Override weight per-call
precedents = context.find_precedents(
    "infrastructure scaling decisions",
    proximity_weight=0.5,
    limit=5,
)
```

<Tip>
  `proximity_weight=0.0` 会完全禁用邻近度混合（纯语义）。`proximity_weight=1.0` 会返回完全按相对于查询锚点的图邻近度排序的结果。对于大多数生产用例，介于 `0.2`–`0.4` 之间的值效果良好。
</Tip>


## 跨图导航

链接多个独立的 `ContextGraph` 实例，使智能体可以跨问题空间遍历：

```python
domain_graph    = ContextGraph()
decision_graph  = ContextGraph()

domain_graph.add_node("microservices", "architecture", properties={"style": "distributed"})
decision_graph.add_node("deploy_k8s",  "decision",     properties={"outcome": "approved"})

link_id = domain_graph.link_graph(
    other_graph=decision_graph,
    source_node_id="microservices",
    target_node_id="deploy_k8s",
    link_type="INFORMED_BY",
)

# Follow the link at traversal time
target_graph, entry_node = domain_graph.navigate_to(link_id)

# Cross-graph pathfinding
path = domain_graph.cross_graph_path(
    source_node_id="microservices",
    target_graph=decision_graph,
    target_node_id="deploy_k8s",
    max_hops=5,
)
print("Reachable: {}, hops: {}".format(path["reachable"], path["hop_count"]))
```


## AgentMemory

如需细粒度控制记忆存储与检索：

```python
from semantica.context import AgentMemory
from semantica.vector_store import VectorStore

memory = AgentMemory(
    vector_store=VectorStore(backend="faiss", dimension=768),
    max_memory_size=10000,
    retention_policy="90_days",   # or "unlimited"
)

memory_id = memory.store(
    "Critical compliance rule: all trades must be pre-approved",
    metadata={"type": "compliance"},
)

results = memory.retrieve(
    query="trade approval requirements",
    max_results=5,
    min_score=0.0,
)

memory.delete_memory(memory_id)
memory.clear_memory(conversation_id="conv_001")

history = memory.get_conversation_history(conversation_id="conv_001", max_items=100)
```

| 参数 | 类型 | 默认值 | 说明 |
| :--------- | :---- | :------- | :----------- |
| `vector_store` | `VectorStore` | **必填** | 用于语义检索的嵌入后端 |
| `max_memory_size` | `int` | `10000` | 触发 LRU 淘汰前的最大条目数 |
| `retention_policy` | `str` | `"unlimited"` | `"N_days"`（例如 `"30_days"`）或 `"unlimited"` |

### Markdown 往返

`AgentMemory` 可以导出可人工编辑的 Markdown，并将编辑后的文件重新导入。
每个文件包含一条记忆条目，必需的元数据放在 YAML frontmatter 中，
记忆内容放在 Markdown 正文中：

```markdown
---
id: mem_compliance_rule
created_at: '2026-07-22T09:00:00+00:00'
updated_at: '2026-07-22T10:30:00+00:00'
type: compliance
tags:
- trading
- approval
---

All trades must be pre-approved.
```

```python
from pathlib import Path

# A single selected memory can be returned as Markdown text.
document = memory.export(format="markdown", type="compliance")

# Export a memory set as one stable Markdown file per item.
memory.export(format="markdown", destination="memory_export/")

# New IDs create memories; existing IDs are updated in place.
count = memory.import_data(Path("memory_export/"), format="markdown")
```

必需的 frontmatter 字段为 `id`、`created_at`、`updated_at`，以及
`type` 或 `kind` 之一。可选元数据可在顶层编辑。导入会在修改记忆之前
拒绝格式错误或重复的字段，且重复导入未改动的文件是幂等的。记忆本地的
`entities` 和 `relationships` 会作为溯源保留，但通过 Markdown 导入时
不会应用到 `ContextGraph`。请使用专用的导出目录：匹配的文件会被覆盖，
但无关或过期的 Markdown 文件不会被自动删除。导出拒绝覆盖文件系统链接，
并使用原子文件替换；导入同样拒绝符号链接、Windows 目录联接
以及其他 Windows 重解析点。
时间戳偏移量在 Markdown 中会保留，仅在比较时归一化为 UTC，
因此带时区和本地无时区的记录可以安全地一起查询。向量存储的写入会推迟到
内存中的导入提交之后；适配器同步仍为尽力而为，并会记录失败信息。


## ErasureCoordinator

`ContextGraph.purge_node()` 的作用域限于单个图：节点被移除并写入一条
墓碑记录，但相同内容仍可能作为 `AgentMemory` 条目以及向量存储中的嵌入
而存活。`ErasureCoordinator` 驱动跨所有已绑定存储的级联删除，并返回一个
`ErasureReceipt`，记录每个存储所报告的结果。

```python
from semantica.context import AgentMemory, ContextGraph, ErasureCoordinator

coordinator = ErasureCoordinator(graph=graph, memory=memory)

receipt = coordinator.erase_entity(
    "customer-4471",
    reason="GDPR Art. 17 request #882",
)

if not receipt.complete:
    # These stores may still hold the entity; handle them out of band.
    print(receipt.incomplete_stores)
```

<Warning>
请检查回执。调用返回并不代表数据已删除。FAISS、Milvus 和 Weaviate
未提供删除方法，因此目前在这些后端上无法完成擦除；回执会报告
`unsupported`，而不是谎报成功。
</Warning>

### 构造函数参数

| 参数 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `graph` | `ContextGraph` | `None` | 任何暴露 `purge_node()` 的对象 |
| `memory` | `AgentMemory` | `None` | 任何暴露 `find_by_entity()` 和 `batch_delete()` 的对象 |
| `vector_store` | `VectorStore` | `memory.vector_store` | 保存以实体为键的嵌入的存储；传入 `False` 可禁用该分支 |

至少需要一个存储；未提供的存储会报告 `not_configured`，而不是被静默跳过。

### 方法

| 方法 | 返回 | 说明 |
| :--- | :--- | :--- |
| `erase_entity(entity_id, reason, at, vector_ids)` | `ErasureReceipt` | 从每个已绑定存储中擦除一个实体 |
| `erase_entities(entity_ids, reason, at)` | `List[ErasureReceipt]` | 每个实体返回一个回执，按顺序排列；单个失败不会中断其余操作 |

### 存储状态

| 状态 | 含义 |
| :--- | :--- |
| `erased` | 已到达该存储，数据已移除。在向量这一路中，这意味着存储接受了针对所给 id 的删除请求；由于各后端不提供可移植的存在性检查，因此这并不代表实际存在的嵌入数量 |
| `not_found` | 已到达该存储，但其中没有该实体的任何数据 |
| `not_configured` | 没有绑定此类存储：属于正常情况，并非失败 |
| `unsupported` | 该存储完全无法执行删除；重试也无济于事 |
| `failed` | 已到达该存储，但删除未成功 |

### ErasureReceipt

| 成员 | 类型 | 描述 |
| :--- | :--- | :--- |
| `entity_id` | `str` | 请求执行擦除的实体 |
| `reason` | `Optional[str]` | 记录在回执和图墓碑中 |
| `erased_at` | `str` | ISO-8601 格式；与墓碑的 `purged_at` 一致 |
| `stores` | `Dict[str, Dict]` | 各存储的结果，以 `vectors`、`memory`、`graph` 为键 |
| `complete` | `bool` | 当任一存储报告 `unsupported` 或 `failed` 时为 `False` |
| `incomplete_stores` | `List[str]` | 可能仍持有该实体数据的存储 |
| `to_dict()` | `Dict` | 序列化后的回执，可安全地作为审计记录持久化 |

```python
receipt.to_dict()
# {
#   "entity_id": "customer-4471",
#   "reason": "GDPR Art. 17 request #882",
#   "erased_at": "2026-08-16T09:03:36.813220",
#   "complete": False,
#   "stores": {
#     "vectors": {"status": "unsupported", "backend": "faiss",
#                 "detail": "backend exposes no delete()/delete_vectors(); ..."},
#     "memory":  {"status": "erased", "items": 14},
#     "graph":   {"status": "erased", "nodes": 1, "edges": 3},
#   },
# }
```

擦除按由外而内的顺序执行：先向量，再记忆，最后图。墓碑是擦除确实发生过的持久证明，因此最后写入：若级联过程中途崩溃，节点仍然存在、回执不完整，而不会出现一个声称做了超出实际之事的墓碑。抛出异常的存储会被记录为 `failed`，其余存储仍会执行擦除。对同一实体擦除两次会返回一个说明已无剩余工作可做的回执，而不是抛出异常。


## PolicyEngine

`PolicyEngine` 管理存储在知识图谱中的版本化策略。策略以节点形式存储，并可关联到决策：

```python
from semantica.context import PolicyEngine
from semantica.context import ContextGraph
from semantica.context.decision_models import Policy, Decision
from datetime import datetime

graph  = ContextGraph()
policy = PolicyEngine(graph_store=graph)

# Create and store a policy
p = Policy(
    policy_id="policy_001",
    name="Confidence Threshold Policy",
    description="All decisions must have confidence >= 0.7",
    rules={"min_confidence": 0.7, "requires_reasoning": True},
    category="decision_quality",
    version="1.0",
    created_at=datetime.now(),
    updated_at=datetime.now(),
)
policy.add_policy(p)

# Check compliance of a specific decision
decision = Decision(
    decision_id="dec_001",
    category="loan_approval",
    scenario="First-time homebuyer",
    reasoning="Good credit score and stable employment",
    outcome="approved",
    confidence=0.94,
    timestamp=datetime.now(),
    decision_maker="loan_agent",
)
compliant = policy.check_compliance(decision, "policy_001")
print("Compliant:", compliant)

# Get applicable policies for a category
policies = policy.get_applicable_policies(category="decision_quality")
for p in policies:
    print("{} v{}".format(p.name, p.version))
```


## EntityLinker

将实体文本映射到 URI，并在实体 ID 之间创建带类型的链接：

```python
from semantica.context import EntityLinker

linker = EntityLinker(similarity_threshold=0.8)

# Assign a URI to an entity
uri = linker.assign_uri("apple_inc", "Apple Inc.", "ORGANIZATION")
print(uri)  # "https://semantica.dev/entity/apple_inc.#organization"

# Link entities from extracted text
entities = [
    {"id": "e1", "text": "Apple Inc.", "type": "ORGANIZATION"},
    {"id": "e2", "text": "Apple",      "type": "ORGANIZATION"},
]
linked = linker.link(text="Apple Inc. was founded by Steve Jobs.", entities=entities)
for e in linked:
    print("{} → {}  (confidence: {:.2f})".format(e.text, e.uri, e.confidence))

# Explicitly link two entity IDs (not a list: takes two IDs)
linker.link_entities(
    entity1_id="apple_inc",
    entity2_id="aapl",
    link_type="same_as",
    confidence=0.99,
)

# Build the full entity web
web = linker.build_entity_web()
print("Entities:", web["statistics"]["total_entities"])
print("Links:   ", web["statistics"]["total_links"])
```

<Warning>
  **`EntityLinker.link_entities()` 链接的是两个实体 ID，而不是一个列表。** 调用 `link_entities(entity1_id, entity2_id, link_type)` 在两个已知 ID 之间创建一条带类型的边。若要链接从文本中抽取出的实体，请改用 `link(text, entities=[...])`。
</Warning>

`link()` 返回的 `LinkedEntity` 字段：

| 字段 | 类型 | 说明 |
| :----- | :---- | :----------- |
| `entity_id` | `str` | 实体标识符 |
| `uri` | `str` | 生成的 URI（例如 `"https://semantica.dev/entity/apple_inc."`） |
| `text` | `str` | 表层形式文本 |
| `type` | `str` | 实体类型 |
| `linked_entities` | `List[EntityLink]` | 关联的实体链接，包含 `source_entity_id`、`target_entity_id`、`link_type`、`confidence` |
| `context` | `Dict` | 实体元数据 |
| `confidence` | `float` | 总体置信度分数 |


## ContextRetriever

结合向量相似度、图遍历与记忆的混合检索：

```python
from semantica.context import ContextRetriever

retriever = ContextRetriever(
    memory_store=memory,
    knowledge_graph=context_graph,
    vector_store=vector_store,
    use_graph_expansion=True,
    max_expansion_hops=2,
    hybrid_alpha=0.5,
)

results = retriever.retrieve(
    query="What decisions were made about cloud infrastructure?",
    max_results=10,
    use_graph_expansion=True,
    min_relevance_score=0.3,
)

for r in results:
    print("[{}] score={:.3f}: {}".format(r.source, r.score, r.content[:80]))
```


## 支持感知检索（`truth_filter`）

已缓存的向量或记忆内容，其存活时间可能超过当初支撑它的证据。`ContextRetriever.retrieve(..., truth_filter=...)` 接受一个选择性启用的 `TruthMaintenanceContextFilter`，在排名**之前**移除那些所声明的依赖项已不再受支持的候选结果，而存储的记录本身始终不会被修改。

下面的示例可独立运行，无需模型、数据库或网络 —— 只需要 `semantica` 本身：

```python
from semantica.context import ContextRetriever, TruthMaintenanceContextFilter
from semantica.reasoning import FactSupport, Rule, TruthMaintenanceSession

# A tiny read-only store standing in for any real vector backend.
class StaticVectorStore:
    def __init__(self, rows):
        self.rows = [dict(row) for row in rows]

    def search(self, *, query, limit):
        return self.rows[:limit]

def annotated_row(identifier, fact, score, text):
    """One record whose content depends on one live fact."""
    return {
        "id": identifier,
        "score": score,
        "content": text,
        "metadata": {
            "truth_maintenance": {
                "schema_version": 1,
                "session_id": "employment-session-1",
                "required_facts": [fact],
                "required_support_ids": [],
            }
        },
    }

rules = [
    Rule(
        rule_id="employment",
        name="employment",
        conditions=["Employed(?x)"],
        conclusion="Eligible(?x)",
    ),
]
session = TruthMaintenanceSession(rules=rules)
session.apply(assertions=[FactSupport("v1", "Employed(Alice)")])

store = StaticVectorStore([
    annotated_row("cached", "Eligible(Alice)", 0.9, "Alice is eligible"),
])
retriever = ContextRetriever(vector_store=store, use_graph_expansion=False)
gate = TruthMaintenanceContextFilter(session, session_id="employment-session-1")

checked = retriever.retrieve("eligibility", truth_filter=gate)
assert [result.content for result in checked] == ["Alice is eligible"]
assert (
    checked[0].metadata["truth_maintenance_validation"]["version"]
    == session.version
)

# The supporting evidence is withdrawn. The vector record stays stored,
# but it no longer reaches the caller through the checked retrieval.
session.apply(retractions=["v1"])
checked = retriever.retrieve("eligibility", truth_filter=gate)
assert checked == []
assert store.rows[0]["content"] == "Alice is eligible"  # record untouched
```

### 手动标注语义

过滤器只校验应用显式写入存储元数据中的内容。它从不推断依赖关系，也从不代你为记录添加标注：

- 每个候选必须在其 `metadata["truth_maintenance"]` 中携带恰好四个键：
  `schema_version`（当前为 `1`）、`session_id`（必须等于过滤器的 `session_id`）、`required_facts` 和 `required_support_ids`。
  必须至少声明一个 fact 或 support ID。
- 仅当 `required_facts` 的每一项都存在于快照的 `facts` 中，**并且** `required_support_ids` 的每一项都存在于快照的活跃 supports 中时，候选才会被保留。未标注的候选以及标注格式错误的候选会被整体移除——记录 ID 或节点 ID 从来都不是可信赖的信号。

### 特定于来源的引用

两条记录可能断言相同的结论，但引用不同的来源。
`required_support_ids` 将每条记录绑定到它实际使用的证据，因此撤回某一个 support 只会让引用它的记录失效，而由替代推导或显式 support 支撑的记录仍会被保留。

### 图捆绑

对于从 `ContextGraph` 检索到的候选，根记录**以及** `related_entities` / `related_relationships` 中的每个成员都必须在其各自的 `metadata` 上携带相同的标注结构。如果根记录或任一附件不受支持，整个候选都会被排除——结果绝不会在静默丢弃过期附件的同时保留其正文内容。

### 行为细节

- 过滤发生在排序之前和旧版合并之前：一个高分的过期记录无法挤掉有效的低分记录，且依赖元数据会在合并后保留。
- 幸存者以深拷贝形式返回，并带有 `metadata["truth_maintenance_validation"]`（`session_id`、`version`）标记。原始候选和已存储记录绝不会被修改。
- 每次调用都针对一个不可变快照进行校验；如果会话在检索进行期间提交了新版本，`retrieve` 会抛出 `ProcessingError`，而不是返回混合版本的结果。
- 向量、内存和图来源在同一轮中被过滤：用 `memory_store=` 或 `knowledge_graph=` 构造检索器，并把 `truth_filter=` 传给 `retrieve`，或传给 `search`、`vector_search` 和 `graph_search` 委托方法（它们会转发到 `retrieve`）。`memory_search` 绕过 `retrieve` 且**不会**应用该过滤器——当内存结果必须扎根于证据时，请使用 `retrieve`。

### 不支持的入口点

该过滤器仅由 `ContextRetriever.retrieve(mode="local", ...)`（默认模式）以及使用该路径的委托方法支持。将 `truth_filter` 传给 `mode="global"`、`"drift"` 或 `"hybrid"` 的 `retrieve`，会在检索开始前抛出 `ValidationError`。这些模式以及直接调用 `retrieve_global` / `retrieve_drift` 均不在依赖校验保证范围内。

`truth_filter` 有意**不**被 `AgentContext.retrieve`、`AgentContext.query_with_reasoning` 或 `ContextRetriever.query_with_reasoning` 接受——在这些地方传入它会立即抛出 `ValidationError`。请自行用 `ContextRetriever.retrieve(..., truth_filter=...)` 组装经过校验的上下文，再将其提供给模型。

有关该过滤器背后的会话模型，请参阅 [Truth Maintenance](/zh/reference/truth_maintenance)。


## 数据结构

<AccordionGroup>
  <Accordion title="Decision">

```python
@dataclass
class Decision:
    decision_id:          str
    category:             str
    scenario:             str
    reasoning:            str
    outcome:              str
    confidence:           float               # 0.0 - 1.0
    timestamp:            datetime
    decision_maker:       str
    reasoning_embedding:  Optional[List[float]]  # generated embedding
    node2vec_embedding:   Optional[List[float]]  # structural embedding
    valid_from:           Optional[str]       # ISO datetime
    valid_until:          Optional[str]       # ISO datetime
    metadata:             Dict[str, Any]
```

  </Accordion>
  <Accordion title="Precedent">

```python
@dataclass
class Precedent:
    precedent_id:        str
    source_decision_id:  str
    similarity_score:    float               # 0-1 match score
    relationship_type:   str                 # "similar_scenario" | "same_policy" | "exception_precedent"
    metadata:            Dict[str, Any]
```

  </Accordion>
  <Accordion title="Policy">

```python
@dataclass
class Policy:
    policy_id:    str
    name:         str
    description:  str
    rules:        Dict[str, Any]    # rule definitions
    category:     str
    version:      str               # e.g. "1.0", "2.1"
    created_at:   datetime
    updated_at:   datetime
    metadata:     Dict[str, Any]
```

  </Accordion>
  <Accordion title="PolicyException">

```python
@dataclass
class PolicyException:
    exception_id:        str
    decision_id:         str
    policy_id:           str
    reason:              str
    approver:            str
    approval_timestamp:  datetime
    justification:       str
    metadata:            Dict[str, Any]
```

  </Accordion>
  <Accordion title="ApprovalChain">

```python
@dataclass
class ApprovalChain:
    approval_id:       str
    decision_id:       str
    approver:          str
    approval_method:   str          # "slack_dm" | "zoom_call" | "email" | "system"
    approval_context:  str
    timestamp:         datetime
    metadata:          Dict[str, Any]
```

  </Accordion>
  <Accordion title="LinkedEntity">

```python
@dataclass
class LinkedEntity:
    entity_id:       str
    uri:             str
    text:            str
    type:            str
    linked_entities: List[EntityLink]
    context:         Dict[str, Any]
    confidence:      float

@dataclass
class EntityLink:
    source_entity_id:  str
    target_entity_id:  str
    link_type:         str          # "same_as" | "related_to" | "part_of"
    confidence:        float
    source:            Optional[str]
    metadata:          Dict[str, Any]
```

  </Accordion>
</AccordionGroup>

## 实际应用模式

<Tabs>
  <Tab title="医疗：治疗决策">
    ```python
    from semantica.context import AgentContext, ContextGraph
    from semantica.vector_store import VectorStore

    health_agent = AgentContext(
        vector_store=VectorStore(backend="faiss", dimension=768),
        knowledge_graph=ContextGraph(),
        decision_tracking=True,
    )

    health_agent.store("Patient has hypertension, type 2 diabetes")
    health_agent.store("Patient allergic to penicillin: verified 2024-01")

    decision_id = health_agent.record_decision(
        category="treatment_plan",
        scenario="Hypertension with comorbid diabetes",
        reasoning="ACE inhibitors are renoprotective in diabetic patients",
        outcome="prescribed_lisinopril",
        confidence=0.91,
    )

    precedents = health_agent.find_precedents("hypertension diabetes", limit=5)
    for p in precedents:
        print("Past: {}  (confidence: {:.2f})".format(p.outcome, p.confidence))

    chain = health_agent.get_causal_chain(decision_id, direction="downstream")
    print("Follow-up decisions triggered: {}".format(len(chain)))
    ```
  </Tab>
  <Tab title="金融：贷款决策">
    ```python
    from semantica.context import AgentContext, ContextGraph, PolicyEngine
    from semantica.context.decision_models import Policy, Decision
    from semantica.vector_store import VectorStore
    from datetime import datetime

    graph  = ContextGraph()
    policy = PolicyEngine(graph_store=graph)

    # Add compliance policy
    p = Policy(
        policy_id="lending_policy",
        name="Lending Policy",
        description="Min confidence 0.8 for loan decisions",
        rules={"min_confidence": 0.8},
        category="loan_approval",
        version="1.0",
        created_at=datetime.now(),
        updated_at=datetime.now(),
    )
    policy.add_policy(p)

    loan_agent = AgentContext(
        vector_store=VectorStore(backend="faiss", dimension=768),
        knowledge_graph=graph,
        decision_tracking=True,
    )
    loan_agent.store("Applicant: credit score 750, DTI 28%, stable employment 4yr")

    # Check compliance before recording
    d = Decision(
        decision_id="dec_loan_001",
        category="loan_approval",
        scenario="First-time homebuyer: 30yr fixed, 20% down",
        reasoning="Credit score above threshold, DTI within limits",
        outcome="approved_300k",
        confidence=0.94,
        timestamp=datetime.now(),
        decision_maker="loan_agent",
    )
    compliant = policy.check_compliance(d, "lending_policy")
    if compliant:
        loan_agent.record_decision(
            category=d.category,
            scenario=d.scenario,
            reasoning=d.reasoning,
            outcome=d.outcome,
            confidence=d.confidence,
        )
    ```
  </Tab>
  <Tab title="持久化与恢复">
    ```python
    from semantica.context import AgentContext, ContextGraph
    from semantica.vector_store import VectorStore

    context = AgentContext(
        vector_store=VectorStore(backend="faiss", dimension=768),
        knowledge_graph=ContextGraph(),
        decision_tracking=True,
    )

    context.store("Important fact learned during session")
    context.record_decision(
        category="ops", scenario="Scale up", reasoning="Load > 80%",
        outcome="scaled_to_10_replicas", confidence=0.97,
    )

    # Persist everything
    context.save("agent_state/")

    # Later: restore and continue
    restored = AgentContext(
        vector_store=VectorStore(backend="faiss", dimension=768),
        knowledge_graph=ContextGraph(),
        decision_tracking=True,
    )
    restored.load("agent_state/")

    results = restored.retrieve("load scaling decisions", max_results=3)
    ```
  </Tab>
</Tabs>

- [向量存储](/zh/reference/vector_store)：用于记忆检索的嵌入存储后端。
- [知识图谱](/zh/reference/kg)：ContextGraph 内部使用的图算法与分析。
- [推理](/zh/guides/reasoning)：构建于上下文之上的逻辑推理。
- [溯源](/zh/guides/provenance)：为每个已存储事实提供 W3C PROV-O 血缘。

- [Context Module](https://github.com/semantica-agi/semantica/blob/main/cookbook/introduction/19_Context_Module.ipynb)：记忆与决策追踪 · 中级
- [Advanced Context Engineering](https://github.com/semantica-agi/semantica/blob/main/cookbook/advanced/11_Advanced_Context_Engineering.ipynb)：生产环境 FAISS + Neo4j 配置 · 高级