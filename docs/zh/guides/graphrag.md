---
title: "GraphRAG：图增强检索"
description: "超越向量搜索：检索事实、追踪推理路径，并让 LLM 的响应建立在你的知识图谱之上。"
sourceHash: "1fe56abca81a921d18efdea9ca14c7cf639f31d6b3c8796562c0b24ad44463fb"
---

GraphRAG 将向量相似度与知识图谱遍历结合起来，使检索能够找到结构上相连的事实，而不仅仅是听起来相关的文本。当 `ContextGraph` 挂接到 `AgentContext` 时，每次检索调用都会自动混合语义搜索与多跳图扩展，`query_with_reasoning()` 还会在返回 LLM 答案的同时返回一条可审计的推理路径。

## 什么是 GraphRAG？

GraphRAG（图增强检索增强生成）通过将向量相似度搜索与知识图谱遍历相结合，增强了传统 RAG。GraphRAG 不只是检索语义相似的文本，而是沿着实体之间的关系，跨多份文档寻找相互关联的证据。

**GraphRAG 与纯向量 RAG 的对比：** 向量 RAG 找到的是与查询文本相似的文档。GraphRAG 既找到与查询相似的文档，也找到通过实体关系与这些文档相连的其他文档，即使它们并未直接提及查询词。

**图遍历的作用：** GraphRAG 从向量相似文档中发现的实体出发，沿关系边向外扩展以发现相关事实。这样能揭示纯文本相似度会遗漏的关联，例如沿路径 Threat Actor → Tool → Victim Organization → Industry Sector 追踪，发现某个威胁行为体以医疗行业为目标。

## 为何使用 GraphRAG？

**多跳发现。** 找出与查询相距 2–3 个关系步的事实。关于“APT29 针对医疗行业”的问题，可以通过遍历 APT29 → HAMMERTOSS → LifeCare → Healthcare Sector 找出关于具体医院的证据。

**相互关联的证据。** 检索到的是相关实体及其关系的连贯链条，而不是孤立的文档片段。这为 LLM 响应和人工分析提供了更丰富的上下文。

**调查工作流。** 从已知实体出发，沿其连接向外扩展，追踪证据链。从可疑 IP 开始，发现完整的基础设施链；或沿代谢通路追踪药物相互作用。

**更丰富的检索上下文。** 图扩展能呈现仅靠关键词或语义搜索会遗漏的相关上下文，从而带来更完整、更准确的 LLM 响应。

**可解释性。** GraphRAG 提供审计轨迹，准确展示是哪些实体和关系引出了每一条检索证据，使检索过程透明且可验证。

## 何时使用 / 何时不使用

**以下情况 GraphRAG 能带来价值：**
- 你的领域具有丰富的实体关系（威胁情报、临床数据、监管文档）
- 问题需要跨多份文档连接事实
- 调查工作流受益于沿实体连接追踪
- 可解释性和审计轨迹很重要
- 你拥有结构良好、关系有意义的知识图谱

**以下情况简单的向量搜索可能已经足够：**
- 基于主题相似度的文档检索
- 单文档问答
- 探索性搜索，你尚不清楚自己要找什么
- 有意义实体关系较少的领域

**延迟与复杂度考量：**
- GraphRAG 会因图遍历带来额外的计算开销
- 多跳扩展会增加检索时间和 token 用量
- 图质量直接影响检索质量
- 搭建过程需要实体抽取和关系构建

**以下情况 GraphRAG 可能过于重量级：**
- 答案已知且位于特定文档中的简单查找查询
- 延迟至关重要的实时应用
- 实体关系无法提供额外价值的领域

## 典型的 GraphRAG 工作流

**摄取 → 构建图 → 检索 → 扩展上下文 → 推理 → 回答**

1. **摄取**：使用 `AgentContext.store()` 摄取文档，并启用实体抽取
2. **构建图**：通过命名实体识别（NER）和关系抽取填充 `ContextGraph`
3. **检索**：检索语义相似的文档，并识别用于图扩展的种子实体
4. **扩展上下文**：在指定的跳数限制内沿实体关系扩展
5. **推理**（可选）：使用推理引擎基于扩展后的上下文进行推理
6. **回答**：通过 `query_with_reasoning()` 将增强后的上下文提供给 LLM 生成答案

<Info>
  **图质量依赖：** GraphRAG 的检索质量在很大程度上取决于图质量、一致的实体链接以及有意义的关系。实体抽取质量差、实体重复或关系薄弱，都会直接影响检索效果。
</Info>

<Info>
  **上下文扩展警告：** 跳数越大，检索到的上下文量会呈指数级增长，这可能显著增加 LLM 的 token 用量和处理时间。请从 2–3 跳开始，并针对你的用例监控上下文规模。
</Info>

<Info>
当你向 `AgentContext` 传入 `knowledge_graph=` 时，GraphRAG 会自动启用，无需开启单独的模式。`hybrid_alpha` 参数和 `proximity_weight` 参数控制图结构相对于向量相似度的影响程度。
</Info>

## 构建图并加载你的情报

在查询图之前，需要先构建它。整个设置涉及三个对象：用于基于嵌入检索的向量存储、用于结构化遍历的 `ContextGraph`，以及将二者连接起来的 `AgentContext`。

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore

# FAISS runs locally with no external dependencies
vs = VectorStore(backend="faiss", dimension=768)
graph = ContextGraph(advanced_analytics=True)

context = AgentContext(
    vector_store=vs,
    knowledge_graph=graph,
    graph_expansion=True,     # enable multi-hop traversal from seed nodes
    max_expansion_hops=3,     # APT29 → infrastructure → victim → sector is 3 hops
    hybrid_alpha=0.6,         # 60% graph influence, 40% vector similarity
    decision_tracking=True,   # record analyst queries as auditable decisions
)
```

现在摄取你的文档。带 `extract_entities=True` 的 `store()` 会在内部运行完整的抽取流水线（命名实体识别、关系抽取和实体链接），并同时填充向量索引和图：

```python
intel_documents = [
    {
        "content": "APT29 deployed HAMMERTOSS malware against NATO logistics networks in Jan–Mar 2025. "
                   "C2 infrastructure used Tor exit nodes in AS59796.",
        "metadata": {"source": "FINTEL_2025_0192", "classification": "SECRET//NOFORN"},
    },
    {
        "content": "HAMMERTOSS was subsequently observed on hosts in the LifeCare hospital network "
                   "(AS64496), suggesting lateral movement beyond the initial NATO targets.",
        "metadata": {"source": "FINTEL_2025_0211"},
    },
    {
        "content": "LifeCare operates 47 acute-care hospitals and is classified as Tier-1 "
                   "healthcare critical infrastructure under CISA Sector 6.",
        "metadata": {"source": "CISA_CI_REGISTRY_2025"},
    },
    {
        "content": "Healthcare critical infrastructure has been a high-priority targeting class "
                   "for Russian state-sponsored threat actors since 2022.",
        "metadata": {"source": "NCSC_ADVISORY_2024_12"},
    },
]

stats = context.store(
    intel_documents,
    extract_entities=True,
    extract_relationships=True,
    link_entities=True,    # merge duplicate entity mentions across documents
)

print("Graph built: {} nodes, {} edges".format(
    stats["graph_nodes"], stats["graph_edges"]
))
```

`store()` 返回一个包含 `stored_count`、`memory_ids`、`graph_nodes` 和
`graph_edges` 的字典。抽取出的节点（APT29、HAMMERTOSS、LifeCare、AS59796 等）
和边（`deployed`、`observed_on`、`classified_as` 等）现在跨越全部四份文档。

此时图中已包含一个连通子图，跨越四份文档的边界将 APT29 与医疗基础设施关联起来，这是纯向量搜索无法看到的。

## 检索相关子图

图建好之后，普通的 `retrieve()` 调用就已经不止是向量搜索。当 `use_graph=True` 时，检索器会从 top-k 向量匹配结果出发为图遍历设置种子，并沿边向外扩展。扩展深度只需设置一次，即 `AgentContext` 构造函数中的 `max_expansion_hops`：

```python
results = context.retrieve(
    "APT29 tactics against healthcare",
    use_graph=True,
    max_results=10,
    expand_graph=True,
)

for r in results:
    print("[score={:.3f}]  {}".format(
        r["score"],
        r["content"][:90],
    ))

# [score=0.921]  APT29 deployed HAMMERTOSS malware against NATO...
# [score=0.887]  HAMMERTOSS was subsequently observed on hosts in the LifeCare...
# [score=0.841]  LifeCare operates 47 acute-care hospitals...
# [score=0.798]  Healthcare critical infrastructure has been a high-priority...
```

注意排名靠前的结果：纯向量搜索可能因为相连事实缺乏关键词重叠而将其排在后面，而 GraphRAG 会提升它们的最终 `score`，因为它们在结构上与图中的种子节点相邻。返回的 `score` 是向量相关度与图连通性的透明混合。

当你明确知道要以哪个实体作为遍历锚点时，传入 `anchor_node`：

```python
# Anchor on APT29 explicitly: proximity scores are calculated from this node
apt29_intel = context.retrieve(
    "C2 infrastructure beaconing patterns",
    use_graph=True,
    anchor_node="APT29",
    proximity_weight=0.7,   # strongly favour nodes close to APT29
    max_hops=3,             # with an anchor, this bounds the proximity radius
    max_results=8,
)
```

<Note>
  `retrieve()` 上的 `max_hops` 仅在设置了 `anchor_node` 时生效：它限定用于打分的邻近半径，
  并丢弃与锚点距离超过 `max_hops` 的结果。若未提供 `anchor_node`，该参数会被忽略。
  它**不会**改变图扩展的触达范围：后者由构造函数中的
  `max_expansion_hops` 固定。
</Note>

## 获取有依据的 LLM 答案与推理路径

`retrieve()` 为你提供有依据的上下文。`query_with_reasoning()` 更进一步：它把该子图上下文传给 LLM，并在返回答案的同时返回检索系统在图中追踪出的多跳路径。这条路径就是你的审计轨迹。

```python
from semantica.llms import LiteLLM

llm = LiteLLM(model="anthropic/claude-sonnet-5")

result = context.query_with_reasoning(
    "What are APT29's known TTPs against healthcare infrastructure, "
    "and what is the evidence chain connecting them?",
    llm_provider=llm,
    max_results=12,
    max_hops=3,
)

# The LLM answer, grounded in graph-retrieved context, not training memory
print(result["response"])

# The multi-hop trace: APT29 → deployed → HAMMERTOSS → observed_on → LifeCare → ...
print("\n--- Reasoning Path ---")
print(result["reasoning_path"])

# Confidence reflects how well the retrieved context supports the answer
print("\nConfidence: {:.1%}".format(result["confidence"]))

# Inspect every source the LLM was given
print("\nSources ({} total):".format(result["num_sources"]))
for src in result["sources"]:
    print("  [{:.3f}] {}".format(src["score"], src["content"][:80]))
```

`reasoning_path` 字段正是 GraphRAG 与黑盒 LLM 调用的区别所在。当分析人员问“你怎么知道 APT29 以医疗行业为目标？”时，你可以向他们展示系统在你自己的文档中走过的确切遍历路径，而不是模型根据训练数据生成的断言。

`query_with_reasoning()` 的完整返回结构：

```python
{
    "response":             str,   # LLM-generated answer, grounded in retrieved subgraph
    "reasoning_path":       str,   # multi-hop traversal narrative
    "sources":              list,  # list of retrieved context dicts with scores
    "confidence":           float, # 0–1 aggregate confidence
    "num_sources":          int,
    "num_reasoning_paths":  int,
}
```

## 领域示例

<Tabs>

<Tab title="国防：CTI/威胁情报">

多源情报融合：将 OSINT 威胁情报源、NVD CVE 数据和 HUMINT 摘要摄取到同一张图中，再用多跳推理查询，以追踪 C2 基础设施链并将攻击活动归因到特定行为体。

在涉密环境中，图可以按数据接触控制标记分区：每个 `AgentContext` 只在查询用户被授权访问的文档子集上运行。`reasoning_path` 输出还可作为可脱敏处理的审计轨迹，用于降级报告。

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore
from semantica.llms import LiteLLM

vs    = VectorStore(backend="faiss", dimension=768)
graph = ContextGraph()

context = AgentContext(
    vector_store=vs,
    knowledge_graph=graph,
    graph_expansion=True,
    max_expansion_hops=3,  # actor → infra → victim → attribution chain
    hybrid_alpha=0.6,      # graph-heavy: structured intel benefits from topology
    decision_tracking=True,
)

# Ingest multi-INT corpus
humint_summary = """
HUMINT-2025-Q1-007: Source BRAVO-9 confirms APT29 operating from
infrastructure in AS59796. C2 beacons use Tor exit nodes in DE/NL.
Targets: ITAR-controlled defense contractors in aerospace sector.
"""
cti_report_text = "APT29 exploited CVE-2025-3400 in PAN-OS GlobalProtect to gain initial access..."

context.store(
    [
        {"content": humint_summary,    "metadata": {"source": "HUMINT-2025-Q1-007"}},
        {"content": cti_report_text,   "metadata": {"source": "CTI_RPT_APT29_2025"}},
    ],
    extract_entities=True,
    extract_relationships=True,
    link_entities=True,
)

llm    = LiteLLM(model="anthropic/claude-sonnet-5")
result = context.query_with_reasoning(
    "Trace the C2 infrastructure chain for APT29 operations targeting "
    "ITAR-controlled contractors in 2025. Include IP ranges, ASNs, and TTPs.",
    llm_provider=llm,
    max_results=15,
    max_hops=3,
)

print(result["response"])
print("\n--- Reasoning Path ---")
print(result["reasoning_path"])
print("Confidence: {:.1%}".format(result["confidence"]))

# Anchor retrieval on APT29 for a proximity-weighted follow-up
proximate = context.retrieve(
    "C2 beaconing patterns Tor exit nodes",
    use_graph=True,
    anchor_node="APT29",
    proximity_weight=0.7,
    max_hops=3,
    max_results=10,
)
```

</Tab>

<Tab title="安全：SOC/事件">

安全运营：针对包含主机、CVE、用户账户、运行手册和历史事件的图进行实时告警分诊。GraphRAG 在一次调用中即可检索相关运行手册和相似的历史事件，从而缩短平均响应时间。

`decision_tracking=True` 标志会将每次分诊查询记录为一条可审计的决策，并附带提供给 LLM 的完整上下文。这对事后复盘和 SOC 指标至关重要。

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore
from semantica.llms import LiteLLM

vs    = VectorStore(backend="faiss", dimension=768)
graph = ContextGraph()

soc_context = AgentContext(
    vector_store=vs,
    knowledge_graph=graph,
    graph_expansion=True,
    max_expansion_hops=2,
    hybrid_alpha=0.5,
    decision_tracking=True,
    retention_days=365,
)

runbooks = [
    "RB-001: Lateral movement — isolate source host, collect memory dump, "
    "escalate if EDR alert on LSASS access.",
    "RB-002: Ransomware precursor — block C2 range, snapshot affected volumes, "
    "engage IR team within 15 minutes.",
    "RB-003: Scheduled task persistence — review parent process, check Sigma "
    "T1053.005, quarantine if encoded payload confirmed.",
]
soc_context.store(runbooks, extract_entities=True)

alert_text = """
ALERT-2025-110342 [CRITICAL]
Host: dc01.corp.internal (10.10.1.5)
User: svc_backup (DOMAIN\\svc_backup)
Event: Scheduled task created — cmd.exe /c powershell -enc <base64>
Parent: wmiprvse.exe
Sigma match: T1053.005 Scheduled Task/Job
"""

llm    = LiteLLM(model="anthropic/claude-sonnet-5")
triage = soc_context.query_with_reasoning(
    "Triage this SIEM alert and identify the correct response runbook:\n{}".format(alert_text),
    llm_provider=llm,
    max_results=8,
    max_hops=2,
)

print("TRIAGE: {}".format(triage["response"]))
# TRIAGE: Based on the wmiprvse.exe parent spawning an encoded PowerShell scheduled task,
# this matches the persistence pattern in RB-003. Recommended action: review parent process
# chain, confirm encoded payload, quarantine dc01.corp.internal if confirmed...
print("Confidence: {:.1%}".format(triage["confidence"]))

# Also pull similar historical incidents for analyst context
similar = soc_context.retrieve(
    "wmiprvse.exe encoded powershell scheduled task persistence",
    use_graph=True,
    max_results=5,
)
for inc in similar:
    print("[{:.3f}] {}".format(inc["score"], inc["content"][:100]))
```

</Tab>

<Tab title="生命科学：临床/制药">

临床决策支持：将 FDA 药品说明书、临床指南和试验摘要摄取到一张图中，使药物—酶—代谢物—相互作用链成为可遍历的路径。三跳查询（drug → enzyme → metabolite → contraindication）能呈现任何单份文档都不会明确指出的相互作用风险。

设置 `max_expansion_hops=3` 是有意为之：从胺碘酮到华法林血浆浓度升高的药代动力学链条为 drug → CYP2C9 抑制 → 华法林代谢降低 → 出血风险，恰好是三个结构跳。

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore
from semantica.llms import LiteLLM

vs    = VectorStore(backend="faiss", dimension=768)
graph = ContextGraph()

clinical_context = AgentContext(
    vector_store=vs,
    knowledge_graph=graph,
    graph_expansion=True,
    max_expansion_hops=3,  # drug → enzyme → metabolite → interaction
    hybrid_alpha=0.55,
    retention_days=None,   # clinical records: no expiry
)

fda_label_text = (
    "Warfarin sodium: narrow therapeutic index anticoagulant. CYP2C9 is the "
    "primary metabolic pathway. Amiodarone is a potent CYP2C9 inhibitor..."
)

guideline_text = (
    "ESC 2023 AF Guidelines: bridging therapy with heparin is not recommended "
    "for most patients with AF undergoing elective procedures..."
)

clinical_context.store(
    [
        {"content": fda_label_text,  "metadata": {"source": "FDA_WARFARIN_LABEL_2024"}},
        {"content": guideline_text,  "metadata": {"source": "ESC_AF_GUIDELINE_2023"}},
    ],
    extract_entities=True,
    extract_relationships=True,
    link_entities=True,
)

patient_context = """
Patient: 68F, AF, CKD stage 3b (eGFR 32). On warfarin (INR target 2.0–3.0).
Presenting for elective hip replacement. Concurrent: amiodarone 200mg, atorvastatin 40mg.
"""

llm    = LiteLLM(model="anthropic/claude-sonnet-5")
answer = clinical_context.query_with_reasoning(
    "What is the evidence-based warfarin bridging protocol for this patient "
    "given CKD and amiodarone interaction risk?\n\n{}".format(patient_context),
    llm_provider=llm,
    max_results=12,
    max_hops=3,
)

print(answer["response"])
print("Evidence sources: {}".format(answer["num_sources"]))
print("Reasoning hops:   {}".format(answer["num_reasoning_paths"]))

# Pull the contraindication chain explicitly
contra_chain = clinical_context.retrieve(
    "CYP2C9 inhibition amiodarone warfarin bleeding risk",
    use_graph=True,
    anchor_node="warfarin",
    proximity_weight=0.65,
    max_hops=3,
    max_results=6,
)
```

</Tab>

<Tab title="银行：风险/合规">

监管合规：将 Basel III（CRE20）、BCBS 239、SR 11-7 和 EBA IRRBB 指南摄取为图，其中监管条款之间的相互引用即为边。多跳查询会自动遍历这些交叉引用，因此关于商业房地产 RWA 的问题可在一次调用中同时取得相关的 CRE20 段落以及约束其计算的 BCBS 239 数据质量要求。

`reasoning_path` 输出可直接作为监管机构要求的审计轨迹，用以证明资本计算建立在所引用的监管文本之上。

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore
from semantica.llms import LiteLLM

vs    = VectorStore(backend="faiss", dimension=768)
graph = ContextGraph()

compliance_context = AgentContext(
    vector_store=vs,
    knowledge_graph=graph,
    graph_expansion=True,
    max_expansion_hops=2,
    hybrid_alpha=0.5,
    retention_days=2555,   # 7-year regulatory retention
)

# In production the text comes from a parsed file, e.g. FileIngestor().ingest_file(path).text;
# inline strings here for brevity
basel_cre20_text = (
    "CRE20.32: For income-producing real estate where repayment depends on "
    "property cash flows, RWA = exposure × risk weight, where risk weight "
    "is determined by LTV bucket per Table CRE20.3..."
)
bcbs239_text = (
    "Principle 3: Risk data should be accurate and have a single authoritative source. "
    "Where data is aggregated across systems, reconciliation must be documented..."
)

compliance_context.store(
    [
        {"content": basel_cre20_text, "metadata": {"source": "BCBS_CRE20_2024"}},
        {"content": bcbs239_text,     "metadata": {"source": "BCBS239_2013"}},
    ],
    extract_entities=True,
    extract_relationships=True,
)

llm    = LiteLLM(model="anthropic/claude-sonnet-5")
answer = compliance_context.query_with_reasoning(
    "Under Basel III CRE20, what are the RWA calculation requirements for "
    "commercial real estate exposures with LTV > 80%? "
    "Cross-reference with BCBS 239 data quality requirements.",
    llm_provider=llm,
    max_results=12,
    max_hops=2,
)

print(answer["response"])
print("Regulatory sources cited: {}".format(answer["num_sources"]))
print("Confidence: {:.1%}".format(answer["confidence"]))

# The reasoning path is the audit log: show it to the regulator
print("\n--- Reasoning Path (audit log) ---")
print(answer["reasoning_path"])
```

</Tab>

</Tabs>

## 常见陷阱

**跳数过多。** 将 `max_expansion_hops` 设得过高（>4）会产生指数级膨胀的上下文，使 LLM 不堪重负并增加成本。请从 2–3 跳开始，仅在确有需要时再增加。

**图质量差。** GraphRAG 会放大图质量问题。实体重复、命名不一致和关系薄弱都会导致检索效果不佳。在依赖 GraphRAG 处理重要查询之前，请先清洗图数据。

**实体重复。** 将 “APT-29”、“APT29” 和 “Cozy Bear” 作为独立节点会破坏关系遍历。摄取时的实体链接会有帮助，但可能仍需手动去重。

**对简单查找查询使用 GraphRAG。** 如果你知道答案存在于某份特定文档中、只需将其取回，那么传统向量搜索比 GraphRAG 更快也更简单。

**假设图扩展总是有益。** 更多上下文并不总是更好。有时精确、聚焦的检索优于大范围的图扩展。请针对你的具体用例对两种方式都做测试。

## 调优向量与图的平衡

在 `AgentContext` 构造函数中设置的 `hybrid_alpha` 参数确立了向量相似度与图影响之间的默认混合比例。`0.0` 表示纯向量检索；`1.0` 表示纯图遍历。建议的起点是 `0.5`。

当以特定 `anchor_node` 为目标时，可在 `retrieve()` 中应用 `proximity_weight`，将到锚点的结构距离动态混合进最终得分：

```python
# Anchor node provided: let vector semantics lead, graph proximity only slightly boosts
results = context.retrieve(
    query, use_graph=True, anchor_node="APT29", proximity_weight=0.2
)

# Known-entity tracing: topology drives the retrieval
results = context.retrieve(
    query, use_graph=True, anchor_node="APT29", proximity_weight=0.8
)
```

每增加一跳扩展，子图规模都会指数级增长。按领域的实用默认值：

```text
General Q&A             max_expansion_hops=2  (95% of useful facts within 2 hops)
Threat intel (APT)      max_expansion_hops=3  (actor → infra → victim → attribution)
Drug interactions       max_expansion_hops=3  (drug → enzyme → metabolite → interaction)
Regulatory cross-ref    max_expansion_hops=2  (rule → article → article)
```

扩展深度只能通过构造函数设置（`max_expansion_hops`）；`retrieve()` 不支持按调用覆盖。`query_with_reasoning()` 则接受按调用传入的 `max_hops` 参数。

## GraphRAG 的内部工作原理

```text
Query text
    |
    v
Vector embedding  ─────────────────────────────────────┐
    |                                                   |
    v                                                   v
Semantic search                         Graph traversal (BFS)
(FAISS / Qdrant)                        from anchor / top-k seeds
    |                                                   |
    └──────────┐                ┌──────────────────────┘
               v                v
         Score fusion (proximity_weight blend)
               |
               v
          Ranked subgraph
               |
               v
         LLM grounding  <── query_with_reasoning()
               |
               v
     {response, reasoning_path, sources, confidence}
```

向量搜索与图遍历独立运行，随后对二者的分数进行融合。图遍历从向量搜索识别出的种子节点开始进行广度优先扩展，因此图这一部分始终锚定于语义相关性，而不是盲目遍历整张图。

## 相关指南

- [语义抽取](/zh/guides/semantic-extraction)：从原始非结构化文本构建图
- [Agent 记忆](/zh/guides/agent-memory)：存储、检索并持久化 Agent 记忆
- [上下文图](/zh/guides/context-graphs)：直接构建并遍历知识图谱
- [推理](/zh/guides/reasoning)：推导新事实，并在图上执行推理规则
- [决策智能](/zh/guides/decision-intelligence)：因果链、策略执行、决策追踪
- [LLM 集成](/zh/guides/llm-integrations)：接入 Groq、OpenAI、Anthropic、HuggingFace 等 100+ 服务