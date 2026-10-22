---
title: "智能体记忆"
description: "AgentContext 如何存储、检索并管理智能体的持久化记忆——分层的短期与长期记忆层、由 FAISS 支撑的语义检索、图增强上下文，以及在国防、安全、临床与金融部署中的跨会话持久化。"
icon: "brain"
sourceHash: "eb94eadfbe14339c3d4b1f6e704dcce89aaef5627243a229a31b1fa2023c6583"
---

`AgentContext` 为 LLM 智能体维护一个持久化记忆层——把观察结果存储为向量嵌入，按语义相似度检索，并可选地将图邻近度融合进排序。当你的智能体需要跨会话回忆此前的发现、而不必在每次重启时重新读取源材料时，就使用它。

## 什么是智能体记忆？

智能体记忆为跨多个智能体会话的信息提供持久化存储与智能检索。`AgentContext` 是核心组件，通过组合三个关键系统来编排记忆的存储、检索与管理：

**VectorStore** 使用向量嵌入完成语义搜索。它把文本存储为高维向量，并通过余弦相似度或其他距离度量检索相似内容。

**ContextGraph** 以节点（实体）和边（关系）的形式维护结构化知识。这使多跳遍历与图感知检索成为可能，可沿着相关实体之间的连接进行检索。

**AgentContext** 编排这两个组件，提供统一接口来存储记忆、检索相关上下文，并跨会话管理对话。

**持久化记忆与无状态检索的对比：** 传统 RAG 系统在会话之间丢失上下文。智能体记忆将学到的信息、对话历史和累积知识持久化到重启之后，从而实现长期记忆与跨会话回忆。

## 为什么使用智能体记忆？

**跨会话回忆。** 智能体在重启后无需重新处理源材料即可记住此前的交互、发现和决策。

**长期知识累积。** 随着智能体处理更多文档，信息不断积累，为后续查询构建越来越丰富的知识库。

**对话历史。** 智能体在对话中保持上下文，并能引用长时间交互或调查中较早的部分。

**图感知检索。** 除了简单的语义相似度，检索还可沿实体关系找到纯向量搜索会遗漏的关联信息。

**决策追踪。** 连同完整上下文与推理路径记录决策，从而支持审计轨迹和针对未来类似场景的先例匹配。

## 何时使用 / 何时不使用

**在以下场景使用智能体记忆：**
- 需要随时间累积知识的长时运行智能体
- 跨多个会话逐步构建理解的研究助手
- 上下文逐步累积的调查工作流
- 必须记住此前交互与决策的系统
- 需要审计轨迹与决策先例的场景

**不要在以下场景使用：**
- 为一次性文档查询构建简单的无状态 RAG 系统
- 执行无需持久化的一次性文档搜索
- 运行无需保留知识的临时实验
- 实体之间关系无关紧要的简单检索任务

<Info>
  本指南聚焦记忆层。关于图增强遍历与实体链接，参见 [上下文图](/zh/guides/context-graphs)。关于决策问责——记录、审计并以因果方式追踪智能体所做选择——参见 [决策智能](/zh/guides/decision-intelligence)。
</Info>

## 搭建持久化记忆上下文

在启动时一并配置向量存储、知识图谱和 `AgentContext`，使三者都持久化到磁盘上的同一路径。

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore

# The VectorStore relies on explicit save()/load() for persistence
ti_vs = VectorStore(
    backend="faiss",
    dimension=768,
)

# The ContextGraph holds entity nodes and their relationships
ti_graph = ContextGraph(advanced_analytics=True)

# AgentContext orchestrates everything
ti_agent = AgentContext(
    vector_store=ti_vs,
    knowledge_graph=ti_graph,
    retention_days=365,          # CTI reports stay relevant for a year
    max_memories=50000,          # ring buffer ceiling — oldest evicted first
    graph_expansion=True,        # enable multi-hop graph traversal in retrieve()
    max_expansion_hops=2,
    hybrid_alpha=0.5,            # 50% semantic score / 50% graph-structural score
    decision_tracking=True,      # enable record_decision() and find_precedents()
    kg_algorithms=True,          # Node2Vec embeddings, centrality, link prediction
)
```

`hybrid_alpha` 参数控制检索如何融合语义相似度（纯向量搜索）与图结构相似度（知识图谱的拓扑结构）。取 `0.5` 时，智能体对两种信号同等对待。对于刚摄取、图还稀疏的语料，可以从接近 `0.0` 开始，随着图逐渐充实再逐步提高。

## 存储智能体学到的东西

### 单条观察

智能体处理的每条情报都可以通过一次调用存储。该字符串会立即被嵌入并索引；可选元数据随之一同保存，并出现在每次检索结果中。

```python
# Store a single finding from an OSINT feed
memory_id = ti_agent.store(
    "APT29 uses HAMMERTOSS for C2 communication over Twitter and GitHub",
    metadata={
        "source": "mandiant_apt29_report",
        "actor": "APT29",
        "technique": "T1102",   # Web Service
        "tlp": "WHITE",
    },
)
# memory_id is a UUID string — use it to retrieve or forget this item later

# Tag observations to an active incident so they can be retrieved as a group
ti_agent.store(
    "New C2 indicator: c2-upd4te[.]ru resolves to 185.220.101.47, cert hash a3f4b8c1...",
    metadata={"type": "ioc", "confidence": 0.92, "source": "internal_hunt"},
    conversation_id="incident_ir2025_0847",
    user_id="analyst_zhang",
)
```

`conversation_id` 充当命名空间。标记为 `incident_ir2025_0847` 的记忆之后可以作为一个组检索——这对于为单个事件构建上下文窗口而不污染全局搜索索引很有用。

### 摄取文档语料

当 `store()` 接收到列表时，它把每个元素视为一篇文档，基于从文本中抽取的实体与关系构建图，并返回关于所创建内容的统计信息。

```python
stats = ti_agent.store(
    [
        {
            "content": "APT29 infrastructure cluster: 185.220.101.0/24, AS200651",
            "metadata": {"source": "shadowserver", "actor": "APT29", "ioc_type": "network"},
        },
        {
            "content": "SolarWinds supply chain compromise attributed to APT29, 2020",
            "metadata": {"source": "us_cert_aa20-352a", "actor": "APT29", "campaign": "SUNBURST"},
        },
        {
            "content": "NOBELIUM (APT29) leverages OAuth token theft against cloud workloads",
            "metadata": {"source": "msft_blog_2023", "actor": "APT29", "technique": "T1528"},
        },
    ],
    extract_entities=True,       # extract actor, IP, CVE, technique nodes
    extract_relationships=True,  # link actor → campaign → technique → infrastructure
    link_entities=True,          # merge duplicate entity mentions across docs
)

print("Stored: {}, Graph nodes: {}, Graph edges: {}".format(
    stats["stored_count"],   # 3 — one per document
    stats["graph_nodes"],    # entities extracted and upserted into the graph
    stats["graph_edges"],    # relationships between those entities
))
```

这次调用之后，知识图谱中包含了 APT29、HAMMERTOSS、基础设施子网、SUNBURST 行动和 OAuth 令牌窃取等节点——它们彼此相连。正是这些图连接支撑了多跳检索：询问“云 OAuth 攻击”，智能体可以从技术节点沿图回溯到 APT29，再向前走到基础设施指标。

## 检索相关记忆

### 语义检索

最直接的检索调用按语义相似度搜索——无需关键词匹配。你的查询嵌入会与所有已存记忆嵌入进行比较，返回得分最高的匹配项。

```python
results = ti_agent.retrieve(
    "cloud OAuth token theft campaigns",
    max_results=8,
    min_score=0.2,
)

for r in results:
    actor = r.get("metadata", {}).get("actor", "unknown")
    print("[{:.3f}]  [{}]  {}".format(r["score"], actor, r["content"][:80]))

# [0.912]  [APT29]  NOBELIUM (APT29) leverages OAuth token theft against cloud workloads
# [0.741]  [APT29]  SolarWinds supply chain compromise attributed to APT29, 2020
# [0.683]  [APT29]  APT29 infrastructure cluster: 185.220.101.0/24, AS200651
```

智能体把 OAuth 那条发现排在了最前——不是因为查询包含完全相同的短语，而是因为嵌入空间把 “cloud OAuth token theft campaigns” 和 “NOBELIUM leverages OAuth token theft against cloud workloads” 放得很近。

### 带邻近度评分的图锚定检索

当你有某个具体实体作为调查中心时，将检索锚定到该节点，并融合语义得分与图邻近度得分。

```python
results = ti_agent.retrieve(
    "cloud OAuth token theft campaigns",
    max_results=10,
    use_graph=True,
    anchor_node="APT29",      # Breadth-First Search (BFS) starts from this node in the knowledge graph
    max_hops=3,
    proximity_weight=0.35,    # 65% semantic + 35% proximity — tune to your graph density
    min_score=0.1,
)

for r in results:
    # combined_score blends semantic score and graph proximity
    score = r.get("combined_score", r["score"])
    hop  = r.get("hop_distance", "-")
    band = r.get("distance_band", "-")  # "direct", "near", "mid-range", "distant"
    print("[{:.3f}]  hop={}  band={}  {}".format(score, hop, band, r["content"][:70]))
```

`proximity_weight` 参数是每次调用级别的覆盖项——在围绕某个具体攻击者进行转向时可以大幅加重邻近度权重，而在宽泛探索时回落到纯语义搜索。

### 基于图的推理

当你需要一个综合多条记忆的自然语言答案时，使用 `query_with_reasoning()` 从图中检索上下文，并要求 LLM 将答案建立在这些来源之上。

```python
from semantica.llms import Groq

llm = Groq(model="llama-3.1-8b-instant", api_key="YOUR_GROQ_KEY")

result = ti_agent.query_with_reasoning(
    "Which threat actors are associated with SMB lateral movement in EMEA "
    "and what infrastructure do they share with cloud OAuth campaigns?",
    llm_provider=llm,
    max_results=15,
    max_hops=3,
)

print(result["response"])       # grounded natural-language answer
print(result["confidence"])     # aggregated retrieval confidence score

# Inspect the sources the answer is grounded in
for src in result["sources"]:
    print("  -", src["content"][:60])
```

结果中包含 `reasoning_path` 字段，精确追踪为得出答案遍历了哪些图边——这对分析师复核与审计很有用。

## 构建工作记忆窗口

使用 `conversation_id` 过滤器把检索限定在活动会话范围内，并将事件范围内的历史与全局语义搜索结合起来。

```python
incident_id = "ir2025_0847"

# Store each new alert as it arrives, tagged to the incident
ti_agent.store(
    "Alert: lateral movement detected from WKSTN-047 to DC01 via SMB (PsExec artifact)",
    metadata={"type": "alert", "severity": "critical", "technique": "T1021.002"},
    conversation_id=incident_id,
    user_id="analyst_zhang",
)

ti_agent.store(
    "Analyst note: WKSTN-047 user jsmith flagged for suspicious login from 10.2.5.40 at 03:14 UTC",
    metadata={"type": "analyst_note"},
    conversation_id=incident_id,
    user_id="analyst_zhang",
)

# Retrieve the full incident thread
incident_history = ti_agent.conversation(
    incident_id,
    max_items=50,
    reverse=False,          # chronological order
    include_metadata=True,
)

for item in incident_history:
    role = item["metadata"].get("type", "note")
    print("[{}] {}".format(role, item["content"][:80]))

# Combine incident-scoped history with a semantic search across global memory
context_items = ti_agent.retrieve(
    "SMB lateral movement PsExec domain controller",
    max_results=5,
    use_graph=True,
    conversation_id=incident_id,  # filter to this incident's memories only
)
```

这种模式让智能体为每个事件构建一个聚焦的工作记忆窗口，同时全局向量索引随时间在所有事件上累积知识。

## 领域示例

<Tabs>
<Tab title="国防 — CTI/威胁">
一个威胁情报融合小组持续摄取 OSINT 情报源、MISP 事件和内部狩猎发现。智能体必须将新指标与已知攻击者画像关联，并产出建立在累积情报之上的归因评估——而不只是基于最新一份报告。

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore
from semantica.llms import Groq

ti_graph = ContextGraph(advanced_analytics=True, node_embeddings=True)
ti_agent = AgentContext(
    vector_store=VectorStore(backend="faiss", dimension=768),
    knowledge_graph=ti_graph,
    retention_days=365,
    max_memories=50000,
    hybrid_alpha=0.6,
    decision_tracking=True,
)

# Ingest a fresh CTI report — entities and infrastructure flow into the graph
ti_agent.store(
    [
        {"content": "APT29 infrastructure cluster: 185.220.101.0/24, AS200651",
         "metadata": {"source": "shadowserver", "actor": "APT29", "tlp": "WHITE"}},
        {"content": "SolarWinds supply chain compromise attributed to APT29, campaign SUNBURST",
         "metadata": {"source": "us_cert_aa20-352a", "actor": "APT29", "campaign": "SUNBURST"}},
        {"content": "NOBELIUM (APT29) leverages OAuth token theft against cloud workloads",
         "metadata": {"source": "msft_blog_2023", "actor": "APT29", "technique": "T1528"}},
    ],
    extract_entities=True,
    extract_relationships=True,
)

# New hunt finding — is this C2 domain connected to APT29?
ti_agent.store(
    "New C2 indicator: c2-upd4te[.]ru resolves to 185.220.101.47, cert hash a3f4b8...",
    metadata={"type": "ioc", "confidence": 0.92, "source": "internal_hunt"},
    conversation_id="hunt_2025_q3",
)

# Graph-anchored attribution query: start from APT29, traverse 3 hops
llm = Groq(model="llama-3.1-8b-instant", api_key="YOUR_GROQ_KEY")
attribution = ti_agent.query_with_reasoning(
    "Is c2-upd4te[.]ru connected to APT29 based on infrastructure overlap?",
    llm_provider=llm,
    max_results=10,
    max_hops=3,
)
print(attribution["response"])
print("Confidence: {:.0%}".format(attribution["confidence"]))

# Persist intelligence base across analyst shifts
ti_agent.save("ti_state/")
```

</Tab>
<Tab title="安全 — SOC/事件">
一个 SOC 分析师助手在交接班之间携带上下文。Tier 1 记录初始告警和分诊结论；Tier 2 接手时完整的事件历史已经加载，无需回读工单轨迹。智能体会给出相关的运行手册步骤，并找出相似的历史事件用于 MTTR 估算。

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore
from semantica.llms import Groq

soc_graph = ContextGraph()
soc_agent = AgentContext(
    vector_store=VectorStore(backend="faiss", dimension=768),
    knowledge_graph=soc_graph,
    retention_days=180,
    max_memories=100000,
    decision_tracking=True,
)

# Preload runbook knowledge base once — it persists across restarts
soc_agent.store([
    "T1021.002 (SMB/Windows Admin Shares): isolate host, reset service accounts, check for credential dumping",
    "T1003.001 (LSASS Memory): collect memory dump, run Mimikatz signatures, notify IR team",
    "T1190 (Exploit Public-Facing Application): check WAF logs, correlate with CVE feed, patch window 4h",
])

incident_id = "ir-2025-0847"

# Tier 1 logs the alert
soc_agent.store(
    "Alert: host WKSTN-047 failed 14 Kerberos AS-REQ in 30s from 10.2.5.40",
    metadata={"type": "alert", "severity": "high", "technique": "T1110.003"},
    conversation_id=incident_id,
    user_id="tier1_chen",
)
soc_agent.store(
    "Lateral movement confirmed: 10.2.5.40 connected to DC01 via PsExec",
    metadata={"type": "finding", "severity": "critical", "technique": "T1021.002"},
    conversation_id=incident_id,
    user_id="tier1_chen",
)

# Record the containment decision for audit and precedent matching
decision_id = soc_agent.record_decision(
    category="containment",
    scenario="Confirmed lateral movement from WKSTN-047 to DC01 via SMB",
    reasoning="PsExec artifact detected; immediate isolation prevents DC compromise",
    outcome="isolated_wkstn047",
    confidence=0.95,
    entities=["WKSTN-047", "DC01"],
    decision_maker="tier1_chen",
)

# Surface the matching runbook steps
runbook = soc_agent.retrieve(
    "SMB lateral movement with PsExec to domain controller",
    max_results=3,
    use_graph=True,
)
for step in runbook:
    print("[{:.3f}] {}".format(step["score"], step["content"]))

# Find similar past incidents — Tier 2 uses these to estimate resolution time
precedents = soc_agent.find_precedents(
    "lateral movement SMB domain controller compromise",
    category="containment",
    limit=3,
)
for p in precedents:
    print("Past: {} -> {} ({:.0%})".format(p.scenario[:50], p.outcome, p.confidence))

# Tier 2 loads the full incident context without reading the ticket
soc_agent.save("soc_state/")
```

</Tab>
<Tab title="生命科学 — 临床/制药">
一个临床决策支持智能体在多次问诊之间维护患者上下文，并延续治疗史。智能体在开具处方决策之前给出指南禁忌，然后连同完整的因果追踪记录该决策，供 MDT 审计。

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore

clinical_graph = ContextGraph(advanced_analytics=True)
clinical_agent = AgentContext(
    vector_store=VectorStore(backend="faiss", dimension=768),
    knowledge_graph=clinical_graph,
    retention_days=3650,      # 10-year clinical record retention
    max_memories=500000,
    decision_tracking=True,
)

# Load guidelines once — ADA, BNF, NICE — persists across sessions
clinical_agent.store([
    {"content": "ACE inhibitors are first-line for hypertension in diabetic patients (ADA 2024)",
     "metadata": {"source": "ADA_2024", "category": "guideline", "strength": "A"}},
    {"content": "Metformin contraindicated in eGFR < 30 mL/min/1.73m2 — risk of lactic acidosis",
     "metadata": {"source": "BNF_2024", "category": "contraindication", "strength": "absolute"}},
    {"content": "SGLT2 inhibitors reduce cardiovascular events in T2DM with CKD stage 3a (CREDENCE trial)",
     "metadata": {"source": "NEJM_CREDENCE", "category": "guideline", "strength": "A"}},
], extract_entities=True, extract_relationships=True)

patient_id = "PT-00841"

# Build patient context for this consultation
clinical_agent.store(
    "Patient PT-00841: T2DM, hypertension, eGFR 28 mL/min/1.73m2, no penicillin allergy",
    metadata={"type": "patient_summary", "patient_id": patient_id},
    conversation_id="consult_2025_07_01",
    user_id="dr_okonkwo",
)
clinical_agent.store(
    "Current medications: lisinopril 10mg, atorvastatin 40mg, aspirin 75mg",
    metadata={"type": "medication_list", "patient_id": patient_id},
    conversation_id="consult_2025_07_01",
)

# Before prescribing metformin — check the guideline base
contraindications = clinical_agent.retrieve(
    "metformin prescribing with reduced kidney function eGFR",
    max_results=5,
    use_graph=True,
    conversation_id="consult_2025_07_01",
)
for item in contraindications:
    category = item.get("metadata", {}).get("category", "?")
    print("[{:.3f}]  [{}]  {}".format(item["score"], category, item["content"][:80]))
# [0.947]  [contraindication]  Metformin contraindicated in eGFR < 30 mL/min/1.73m2 ...
# [0.821]  [guideline]         SGLT2 inhibitors reduce cardiovascular events in T2DM with CKD ...

# Record the decision — eGFR 28 falls below the absolute contraindication threshold
decision_id = clinical_agent.record_decision(
    category="treatment_modification",
    scenario="T2DM patient PT-00841 eGFR 28: metformin dose review required",
    reasoning=(
        "eGFR 28 falls below absolute contraindication threshold of 30 mL/min/1.73m2 "
        "per BNF_2024. Discontinue metformin; initiate dapagliflozin review per CREDENCE."
    ),
    outcome="discontinued_metformin_initiated_dapagliflozin_review",
    confidence=0.97,
    entities=["PT-00841", "metformin", "dapagliflozin", "eGFR"],
    decision_maker="dr_okonkwo",
)

# Explainability trace for MDT audit
explanation = clinical_agent.trace_decision_explainability(decision_id)
print("Guideline connections traced: {}".format(explanation.get("total_connections", 0)))

clinical_agent.save("clinical_state/{}/".format(patient_id))
```

</Tab>
<Tab title="银行 — 风险/合规">
一个抵押贷款承保智能体在决策工作流中携带监管知识和申请上下文。每项信贷决策都连同作为依据的具体监管指引一起记录，为模型风险治理审查产出可辩护的审计轨迹。

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore

credit_graph = ContextGraph(advanced_analytics=True)
credit_agent = AgentContext(
    vector_store=VectorStore(backend="faiss", dimension=768),
    knowledge_graph=credit_graph,
    retention_days=2555,      # 7-year regulatory retention
    max_memories=1000000,
    decision_tracking=True,
    kg_algorithms=True,
)

# Load regulatory knowledge base — Basel III, CRR, EBA guidelines
credit_agent.store([
    {"content": "Basel III: CET1 capital ratio minimum 4.5% + 2.5% conservation buffer",
     "metadata": {"source": "BCBS_Basel3", "category": "capital_requirement"}},
    {"content": "PD floor for retail exposures: 0.1% under IRB approach (CRR Art. 160)",
     "metadata": {"source": "CRR_Art160", "category": "risk_parameter"}},
    {"content": "DSTI ratio > 40% requires enhanced creditworthiness assessment per EBA GL 2020/06",
     "metadata": {"source": "EBA_GL_2020_06", "category": "affordability"}},
    {"content": "Adverse action notice required within 30 days of credit denial (ECOA Reg. B)",
     "metadata": {"source": "ECOA_RegB", "category": "regulatory_obligation"}},
], extract_entities=True, extract_relationships=True)

app_id = "APP-2025-994421"

# Load application context
credit_agent.store(
    "Applicant APP-2025-994421: gross income 82000 GBP, requested 320000 GBP 30yr mortgage, LTV 78%",
    metadata={"type": "application_summary", "app_id": app_id},
    conversation_id=app_id,
)
credit_agent.store(
    "Credit bureau: score 714, 0 defaults in 7yr, 2 hard inquiries last 12mo, DSTI 38%",
    metadata={"type": "bureau_data", "app_id": app_id},
    conversation_id=app_id,
)

# Retrieve regulatory guidance relevant to this application
guidance = credit_agent.retrieve(
    "mortgage affordability DSTI 38% regulatory requirements LTV 78%",
    max_results=5,
    use_graph=True,
    conversation_id=app_id,
)
for g in guidance:
    source = g.get("metadata", {}).get("source", "?")
    print("[{:.3f}]  [{}]  {}".format(g["score"], source, g["content"][:80]))
# [0.891]  [EBA_GL_2020_06]  DSTI ratio > 40% requires enhanced creditworthiness ...
# [0.724]  [CRR_Art160]      PD floor for retail exposures: 0.1% under IRB approach ...

# Record the decision — DSTI 38% is below the 40% EBA threshold
decision_id = credit_agent.record_decision(
    category="mortgage_origination",
    scenario="320k GBP 30yr mortgage, LTV 78%, DSTI 38%, credit score 714",
    reasoning=(
        "Score 714 exceeds 680 floor; DSTI 38% within EBA GL 2020/06 threshold of 40%; "
        "LTV 78% requires standard LMI; no derogatory history in 7yr; "
        "stress test at +300bps passes affordability."
    ),
    outcome="approved_conditional_lmi",
    confidence=0.89,
    entities=[app_id, "LTV_78pct", "DSTI_38pct"],
    decision_maker="underwriting_model_v4",
)

# Find similar precedents for model governance review
precedents = credit_agent.find_precedents(
    "mortgage approval borderline DSTI affordability stress test",
    category="mortgage_origination",
    limit=5,
)
for p in precedents:
    print("Precedent: {} -> {} ({:.0%})".format(p.scenario[:50], p.outcome, p.confidence))

credit_agent.save("credit_state/{}/".format(app_id))
```

</Tab>
</Tabs>

## 持久化与恢复状态

在分析师班次结束时——或进程重启之前——调用 `save()` 将完整上下文写入磁盘。下次启动时，调用 `load()` 将其完整恢复。

```python
# save() writes memory JSON plus backend-specific vector-store artifacts
# under agent_state/vector_store/ and the graph export at knowledge_graph.json.
# With the default VectorStore implementation this includes:
#   agent_state/agent_memory.json
#   agent_state/vector_store/store_data.pkl
#   agent_state/vector_store/index.bin
#   agent_state/knowledge_graph.json
ti_agent.save("agent_state/")
```

当新进程启动——或新分析师登录时——从该检查点恢复：

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore

# Create a fresh context with matching configuration
ti_agent_restored = AgentContext(
    vector_store=VectorStore(backend="faiss", dimension=768),
    knowledge_graph=ContextGraph(advanced_analytics=True),
    retention_days=365,
    decision_tracking=True,
)

# load() restores all three components from disk
ti_agent_restored.load("agent_state/")

# Every memory, graph edge, and decision precedent is now available
results = ti_agent_restored.retrieve("APT29 OAuth token theft cloud infrastructure")
```

<Info>
  `AgentMemory` 本身以 JSON 形式保存，但向量存储会单独持久化自己的索引和向量载荷。`load()` 恢复的是这些后端产物，而不是在需要时重新嵌入记忆，因此请在会话之间保持相同的向量存储后端、维度和评分设置。
</Info>

## 在分析过程中创建检查点

对于长时间运行的分析循环，在关键步骤前后创建具名快照，以便对比智能体在每个阶段新增了什么。

```python
# Snapshot before the analysis loop starts
ti_agent.checkpoint("pre_enrichment")

# ... store new evidence, extract entities, record decisions ...

# Snapshot after enrichment completes
ti_agent.checkpoint("post_enrichment")

# See exactly what changed
diff = ti_agent.diff_checkpoints("pre_enrichment", "post_enrichment")
print("Decisions added:     {}".format(len(diff["decisions_added"])))
print("Relationships added: {}".format(len(diff["relationships_added"])))

# Optionally persist via TemporalVersionManager (requires temporal_version_manager= at init)
# ti_agent.flush_checkpoint("post_enrichment")
```

## 记忆生命周期与日常维护

保留策略在每次 `store()` 调用时自动执行——超过 `retention_days` 的条目会被清理，无需任何人工干预。你也可以删除特定记忆或清空整个对话命名空间。

```python
# Forget a specific memory by ID
ti_agent.forget(memory_id="some-uuid-string")

# Clear all memories tagged to a specific incident
cleared = ti_agent.forget(conversation_id="incident_ir2025_0847")
print("Cleared {} items".format(cleared))

# Clear everything older than 90 days
old_cleared = ti_agent.clear(days_old=90)

# Get current memory statistics
s = ti_agent.stats()
print("Total memories: {}".format(s.get("total_items", 0)))
```

## 常见误区

**关机前忘记持久化记忆。** 智能体记忆在执行期间保存在内存中。若在进程终止前未调用 `save()`，所有累积的记忆、图关系和对话都会丢失。

**把同一对话命名空间用于不相关的任务。** 对话 ID 应限定相关交互的范围。用一个对话承载多个不相关的调查会污染检索结果，使上下文不够聚焦。

**存储过多低价值信息。** 并非每条观察都需要永久存储。应聚焦存储洞察、决策和重要发现，而非冗长的原始日志或临时计算。

**在简单检索就足够时使用智能体记忆。** 对于一次性文档查找或无状态查询，传统检索比搭建持久化记忆基础设施更简单、更高效。

**检索过多上下文导致延迟上升。** 过大的 `max_results`、过高的 `max_hops` 或宽泛的查询会检索过量上下文，增加 LLM token 消耗和响应延迟。请从聚焦的检索参数起步。

## 相关指南

- [上下文图](/zh/guides/context-graphs) — 底层 `ContextGraph` 如何存储实体节点与决策节点；时间区间推理；节点插入前的去重；从图生成本体。
- [决策智能](/zh/guides/decision-intelligence) — 将决策记录为带因果链与策略门控的图节点。
- [多智能体系统](/zh/guides/multi-agent) — 通过共享的 `AgentContext` 以及 save/load 交接来协调多个智能体。
- [LLM 集成](/zh/guides/llm-integrations) — 配置传递给 `query_with_reasoning()` 的 LLM 提供商。
- [去重指南](/zh/guides/deduplication) — `DuplicateDetector`、`EntityMerger`、相似度方法和聚类策略的完整参考。
- [本体管理](/zh/guides/ontology) — 从知识图谱生成并验证 OWL 本体；导出为 Turtle、OWL/XML、JSON-LD。
- [Context 模块参考](../reference/context) — 完整 API：`AgentContext`、`AgentMemory`、`MemoryItem`、`ContextRetriever`。
- [向量存储参考](../reference/vector_store) — FAISS、Qdrant、pgvector、Pinecone 后端。