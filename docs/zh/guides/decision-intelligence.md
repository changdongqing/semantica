---
title: "决策智能"
description: "Semantica 如何将 AI 智能体的决策记录、存储、追踪并查询为一等知识图谱对象——包含因果链、先例搜索、策略执行与完整的可解释性。"
icon: "scale-balanced"
sourceHash: "d42caea1dbbdb0fc961cb2b76251fe317682711d627d03dab44713517274aab3"
---

`AgentContext.record_decision()` 将每一个 AI 决策存储为知识图谱中的一个节点，并通过因果边将其与前序决策和后续结果相连。用它来构建可审计的推理轨迹——六个月后，你依然可以精确重建：是哪一个分类导致了哪一次升级，以及在记录之前检查了哪条策略。

## 什么是决策智能？

决策智能将智能体自身的决策记录并分析为可查询、可分析、可复用的结构化数据。决策不再在执行后消失，而是成为持久化的图节点，带有可搜索的元数据、推理链和因果关系。

**决策智能记录决策**：为智能体做出的每一个选择捕获场景、推理、结果、置信度和决策者。这些决策会成为知识图谱中可查询的节点。

**决策成为图节点**，可以按因果关联（决策 A 导致决策 B）、按相似度搜索（找出与此场景相似的决策）、按统计进行分析（置信度趋势、常见结果）。

**目标是可审计性、可解释性、先例搜索和因果追踪。** 你可以追溯决策为何做出、找到相似的过往决策以保持一致，并理解从首次检测到最终行动的完整因果链。

**决策智能 vs. Agent Memory：** Agent Memory 存储外部知识（文档、事实、观察结果）。决策智能存储内部决策（分类、审批、智能体自身执行的操作）。

**决策智能 vs. 推理：** 推理使用逻辑规则从现有数据推导出新事实。决策智能记录智能体在解决问题过程中做出的选择与判断。

**决策智能 vs. 图分析：** 图分析分析知识图谱的结构属性。决策智能则专门聚焦于决策过程及其审计轨迹。

## 为什么要使用决策智能？

**可审计的 AI 行为。** 每个决策都会记录推理、置信度和时间戳，为生产系统中的 AI 行为创建完整的审计轨迹。

**可解释性。** 当相关方询问“系统为什么执行了 X？”时，你可以追溯通向该操作的确切决策链，包括中间的推理步骤。

**先例复用。** 在做出新决策之前，智能体可以搜索相似的过往场景及其结果，从而促进一致性并从既往经验中学习。

**因果分析。** 通过沿着相互关联的决策节点之间的因果关系，理解早期决策如何级联影响后续结果。

**治理与合规。** 策略引擎可以依据合规规则对决策进行把关，所有策略应用都会被记录以供监管审计。

## 何时使用 / 何时不使用

**在以下情况下使用决策智能：**
- 构建需要做出重要选择的自主智能体
- 实现需要审计轨迹的决策工作流
- 处于合规要求之下（金融服务、医疗、国防）
- 构建包含多个决策点的审批系统
- 在决策必须可解释的风险敏感环境中工作

**在以下情况下不要使用：**
- 构建仅检索信息的无状态聊天机器人
- 实现不做决策的简单 RAG 系统
- 创建只读的信息检索应用
- 构建从不做出需要审计轨迹的可执行决策的应用

## API 架构概览

决策智能协调三个主要组件：

**AgentContext** 是高层的编排层。它提供 `record_decision()`、`find_precedents()` 以及因果链相关方法，同时管理底层的存储与检索系统。

**PolicyEngine** 负责策略评估与合规检查。它将策略规则存储为图节点，并在决策被记录之前依据这些规则进行校验。

**DecisionRecorder** 专门负责记录结构化决策数据、管理审批链，以及在决策需要绕过常规规则时处理策略例外。

<Info>
  决策追踪同时需要 `VectorStore`（用于基于嵌入的先例搜索）和 `ContextGraph`（用于因果图存储）。在 `AgentContext` 上设置 `decision_tracking=True`——省略 `ContextGraph` 会在调用时抛出 `RuntimeError`。`VectorStore` 是 `AgentContext` 自身所必需的：不传该参数会由 Python 的参数绑定抛出 `TypeError`，而传入 `vector_store=None` 会在初始化期间抛出 `ValueError`。
</Info>

## 记录第一个决策

最常用的入口是 `AgentContext.record_decision()`。它会把一个 `Decision` 节点写入图中，为混合相似度搜索生成嵌入，并返回一个 UUID，供你以因果方式链接后续决策。

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore

graph   = ContextGraph(advanced_analytics=True)
context = AgentContext(
    vector_store=VectorStore(backend="faiss", dimension=768),
    knowledge_graph=graph,
    decision_tracking=True,
)

# The system has just classified a new threat cluster.
# Record the classification decision before taking any action.
classification_id = context.record_decision(
    category       = "threat_classification",
    scenario       = "Unattributed C2 cluster using HAMMERTOSS-like Twitter dead-drop pattern",
    reasoning      = "Infrastructure overlaps known APT29 hosting ASN; TTP T1102 matches NOBELIUM playbook with 0.88 cosine similarity",
    outcome        = "classified_as_apt29_cluster",
    confidence     = 0.88,
    decision_maker = "cti_pipeline_v2",
    entities       = ["apt29", "hammertoss", "twitter_c2"],
)

print("Decision recorded:", classification_id)
# → "Decision recorded: dec_a3f2b1c4-..."
```

`decision_maker` 字段标识产生该决策的组件、工作流、智能体或系统。请使用一致的标识符，如 `"cti_pipeline_v2"`、`"analyst_chen"` 或 `"risk_model_v3"`，以便按决策来源进行过滤和分析。

支撑该节点的 `Decision` 数据类包含以下字段——这些正是被存储和被搜索的内容：

```python
from semantica.context import Decision
from datetime import datetime

d = Decision(
    decision_id    = None,                # required arg — None/"" auto-generates a UUID
    category       = "threat_classification",
    scenario       = "Unattributed C2 cluster",
    reasoning      = "Infrastructure overlaps APT29 ASN",
    outcome        = "classified_as_apt29_cluster",
    confidence     = 0.88,               # float 0.0–1.0
    timestamp      = datetime.now(),
    decision_maker = "cti_pipeline_v2",
    # optional fields:
    valid_from     = "2025-07-01T00:00:00",   # ISO datetime
    valid_until    = "2025-09-30T23:59:59",   # ISO datetime
    metadata       = {"source_feed": "isac_partner_b"},
)
```

要真正存储以这种方式构建的决策，请将其字段作为关键字参数传给 `ContextGraph.add_decision()`——当你希望在必需字段之外附加 `valid_from`/`valid_until` 或额外元数据字段时，这是 `record_decision()` 的替代方案：

```python
decision_id = graph.add_decision(
    category       = "threat_classification",
    scenario       = "Unattributed C2 cluster",
    reasoning      = "Infrastructure overlaps APT29 ASN",
    outcome        = "classified_as_apt29_cluster",
    confidence     = 0.88,               # float 0.0–1.0
    decision_maker = "cti_pipeline_v2",
    # optional fields:
    valid_from     = "2025-07-01T00:00:00",   # ISO datetime
    valid_until    = "2025-09-30T23:59:59",   # ISO datetime
    source_feed    = "isac_partner_b",        # extra kwargs are stored as metadata
)
```

<Info>
  `add_decision()` 也接受预先构建的 `Decision` 对象：`graph.add_decision(Decision(...))`。两种形式以相同方式建立索引，因此决策一经添加即可被 `find_precedents()`、`get_decision_insights()`、`analyze_decision_influence()` 和 `trace_decision_causality()` 看到。对象形式会保留你设置的 `decision_id`。关键字形式与 `record_decision()` 一样，会自行生成 `decision_id` 并将其返回。`Decision.metadata` 中的条目会存储在节点上，但不能覆盖决策自身的字段，例如 `category` 或 `confidence`。
</Info>

## 在决策前搜索先例

在做出重要判断之前，系统应当在过往决策中搜索相似场景。这样可以避免同一个集群在两次智能体运行中被分到不同的类——第二个智能体会找到第一个智能体的决策，并将其作为先验。

```python
# Search before classifying a new unattributed cluster
precedents = context.find_precedents(
    "unattributed C2 cluster Twitter dead-drop infrastructure",
    limit=5,
)

for p in precedents:
    print("[{:.2f} confidence] {} → {}".format(p.confidence, p.category, p.outcome))
    print("  Reasoning: {}".format(p.reasoning[:80]))
    print("  Similarity: {:.3f}".format(p.metadata.get("similarity_score", 0)))
```

混合搜索融合两种信号：查询与每个决策的 `scenario`、`reasoning` 和 `entities` 文本之间的词面重叠（权重 0.7——词级 Jaccard 相似度，对 CJK 类查询回退到字符二元组），以及基于每个决策在图中连接的其他节点数量的结构相似度（权重 0.3，仅当图以 `advanced_analytics=True` 构建时计算）。结果是按序排列的 `Decision` 对象列表，仅保留得分不低于 `similarity_threshold`（默认 0.5）的项——由于匹配基于词面而非嵌入，即使描述的是相似场景，措辞与查询差异很大的先例也可能不会出现。

## 构建因果链

决策很少孤立存在。一个分类决策导致一个升级决策，后者又导致一个遏制决策。用因果边将它们连接起来，你就能沿任一方向遍历这条链——向上游理解是什么导致了某个结果，向下游查看某个早期决策触发了什么。

```python
# The classification above caused an escalation
escalation_id = context.record_decision(
    category       = "escalation",
    scenario       = "APT29 cluster confirmed — active C2 beaconing to NATO contractor subnet",
    reasoning      = "Classification confidence 0.88 exceeds 0.80 escalation threshold; active C2 requires immediate SOC notification",
    outcome        = "escalated_to_soc_tier2",
    confidence     = 0.95,
    decision_maker = "escalation_engine",
)

# Link the two decisions: classification caused the escalation
graph.add_causal_relationship(classification_id, escalation_id, "CAUSED")

# The escalation influenced a patch prioritization decision
patch_id = context.record_decision(
    category       = "patch_priority",
    scenario       = "CVE-2024-3400 present in two NATO contractor VPN appliances",
    reasoning      = "Active exploitation by classified APT29 cluster elevates CVE-2024-3400 to P0 regardless of base CVSS",
    outcome        = "prioritized_cve_2024_3400_p0",
    confidence     = 0.97,
    decision_maker = "patch_engine",
)

graph.add_causal_relationship(escalation_id, patch_id, "INFLUENCED")
```

现在从补丁决策回溯到其根本原因：

```python
upstream = context.get_causal_chain(
    patch_id,
    direction = "upstream",
    max_depth = 5,
)

print("Causal chain upstream from patch prioritization:")
for d in upstream:
    depth = d.metadata.get("causal_distance", "?")
    print("  [depth {}] {} → {}  (confidence={:.2f})".format(
        depth, d.category, d.outcome, d.confidence
    ))
# [depth 1] escalation → escalated_to_soc_tier2  (confidence=0.95)
# [depth 2] threat_classification → classified_as_apt29_cluster  (confidence=0.88)
```

再从最初的分类向下游追踪，查看它触发的所有决策：

```python
downstream = context.get_causal_chain(
    classification_id,
    direction = "downstream",
    max_depth = 5,
)
print("Downstream decisions triggered:", len(downstream))
for d in downstream:
    print("  → {} [{}]".format(d.outcome, d.category))
```

## 生成可解释性报告

`trace_decision_explainability` 一次调用即可给出全貌：上游原因、下游影响以及连接总数。这正是你要附在事后复盘或审计报告中的内容。

```python
explanation = context.trace_decision_explainability(patch_id)

print("Decision:", patch_id)
print("Total graph connections :", explanation["total_connections"])
print("Upstream causes         :", len(explanation.get("upstream_decisions", [])))
print("Downstream effects      :", len(explanation.get("downstream_decisions", [])))
```

若需要包含置信度衰减和距离区间的更深入因果分析，可直接在图上使用 `trace_decision_causality`：

```python
chains = graph.trace_decision_causality(patch_id, max_depth=5)

for chain in chains:
    print("Chain: {} hops | band={} | decay={:.3f}".format(
        chain["hop_count"], chain["distance_band"], chain["confidence_decay"]
    ))
    print("  Interpretation:", chain["interpretation"])
    # e.g. "Decision chain spans 2 hops in the 'near' band with 84% confidence
    #        — causal attribution is reliable."
```

## 用策略校验决策

在记录高风险决策之前，先依据带版本的策略对其进行校验。`PolicyEngine` 将 `Policy` 节点存储在图中，并依据其规则对 `Decision` 对象进行把关。

```python
from semantica.context import PolicyEngine, Policy, Decision
from datetime import datetime

engine = PolicyEngine(graph_store=graph)

engine.add_policy(Policy(
    policy_id   = "cti_confidence_gate",
    name        = "CTI Minimum Confidence Policy",
    description = "All threat classifications must have confidence >= 0.80",
    rules       = {"min_confidence": 0.80, "requires_reasoning": True},
    category    = "threat_classification",
    version     = "1.0",
    created_at  = datetime.now(),
    updated_at  = datetime.now(),
))

d = Decision(
    decision_id    = "dec_low_conf",
    category       = "threat_classification",
    scenario       = "Possible APT29 activity — weak signals only",
    reasoning      = "Single IP overlap, no TTP match",
    outcome        = "classified_as_apt29_tentative",
    confidence     = 0.62,   # below the 0.80 threshold
    timestamp      = datetime.now(),
    decision_maker = "cti_pipeline_v2",
)

if engine.check_compliance(d, "cti_confidence_gate"):
    decision_id = graph.add_decision(d)
    engine.record_policy_application(decision_id, "cti_confidence_gate", "1.0")
    print("Decision recorded — policy compliant.")
else:
    print("Decision blocked — confidence 0.62 below policy minimum 0.80.")
    # → "Decision blocked — confidence 0.62 below policy minimum 0.80."
```

`check_compliance` 返回 `False` 表示规则已被评估，且该决策不满足这些规则。如果检查本身无法执行——例如某条策略规则无法与决策的数据进行比较——该调用会抛出 `ProcessingError` 而不是返回 `False`，因此评估失败永远不会被报告为合规裁定。完整约定请参阅[策略引擎指南](policy-engine)。

当高紧急度情况需要绕过策略把关时，请记录例外，并附上审批人身份与理由：

```python
from semantica.context import DecisionRecorder

recorder = DecisionRecorder(graph_store=graph)

exception_id = recorder.record_exception(
    decision_id     = "dec_low_conf",
    policy_id       = "cti_confidence_gate",
    reason          = "Active exploitation in progress — cannot wait for higher-confidence attribution",
    approver        = "ciso_director",
    approval_method = "slack_dm",
    justification   = "Time-critical incident response; manual CISO sign-off obtained at 03:14 UTC",
)
print("Policy exception recorded:", exception_id)
```

对于多级审批工作流，请配合图数据库后端（例如 Neo4j/FalkorDB）使用 `DecisionRecorder.record_approval_chain()`。本指南使用的内存型 `ContextGraph` 示例不支持通过 `execute_query()` 持久化审批链。

## 记录时自动为决策打分

`DecisionRecorder`（以及 `AgentContext` 针对其 `graph_store` 决策追踪后端）可以在每次记录决策时自动运行 `semantica.evals` 评估器，并将结果存储在 `Decision.metadata` 上。这是可选项——在构造时传入 `evaluators`/`eval_config`，或者保持不设置，`record_decision()` 的行为与之前完全一致。

```python
from semantica.context import DecisionRecorder

recorder = DecisionRecorder(
    graph_store=graph,
    evaluators=["decision_scores"],
    eval_config={"decision_scores": {"policy_engine": engine, "policy_id": "cti_confidence_gate"}},
)
decision_id = recorder.record_decision(d, entities=[], source_documents=[])

# d.metadata now also has:
#   eval_score:   0.83   (mean score across configured evaluators)
#   eval_passed:  False
#   eval_details: {"decision_scores": {"score": ..., "passed": ..., "meta": {...}}}
```

如果某个评估器抛出异常，该失败会被记录到日志，决策仍会在没有 `eval_*` 元数据的情况下被记录——有问题的评估器绝不会阻断决策持久化。`AgentContext(..., decision_tracking=True, evaluators=[...], eval_config={...})` 会将相同配置传递给它为 `graph_store` 后端构造的 `DecisionRecorder`；`context_graph` 后端目前还不会运行评估器。

## 生成决策审计报告

在班次或事件结束时，`get_decision_insights` 会为图中的每个决策生成统计摘要——适用于班次交接记录和合规报告。

```python
insights = graph.get_decision_insights()

print("Total decisions today :", insights["total_decisions"])
print("Confidence — mean={:.2f}  min={:.2f}  max={:.2f}".format(
    insights["confidence_stats"]["mean"],
    insights["confidence_stats"]["min"],
    insights["confidence_stats"]["max"],
))
print("\nDecisions by category:")
for cat, count in sorted(insights["categories"].items(), key=lambda x: -x[1]):
    print("  {:35s} {}".format(cat, count))
print("\nOutcomes:")
for outcome, count in sorted(insights["outcomes"].items(), key=lambda x: -x[1]):
    print("  {:35s} {}".format(outcome, count))
```

示例输出：

```text
Total decisions today : 47
Confidence — mean=0.87  min=0.62  max=0.99

Decisions by category:
  threat_classification                 18
  patch_priority                        12
  escalation                             9
  containment                            8

Outcomes:
  classified_as_apt29_cluster           11
  prioritized_p0_patch                  12
  escalated_to_soc_tier2                 9
  isolated_host                          8
```

## 领域示例

<Tabs>

<Tab title="国防 — CTI/威胁">

某 CTI 流水线对威胁集群进行分类，记录每次分类的置信度与推理，将分类决策与升级决策以因果关系连接，并为威胁情报负责人生成每日审计报告。

```python
from semantica.context import AgentContext, ContextGraph, PolicyEngine, Policy
from semantica.vector_store import VectorStore
from datetime import datetime

graph   = ContextGraph(advanced_analytics=True)
engine  = PolicyEngine(graph_store=graph)
context = AgentContext(
    vector_store=VectorStore(backend="faiss", dimension=768),
    knowledge_graph=graph,
    decision_tracking=True,
)

engine.add_policy(Policy(
    policy_id   = "cti_gate",
    name        = "CTI Attribution Confidence Gate",
    description = "Attributions require confidence >= 0.80",
    rules       = {"min_confidence": 0.80},
    category    = "threat_classification",
    version     = "1.0",
    created_at  = datetime.now(),
    updated_at  = datetime.now(),
))

# Check precedents before classifying
precedents = context.find_precedents(
    "Twitter dead-drop C2 pattern overlapping APT29 infrastructure",
    limit=3,
)
for p in precedents:
    print("Prior: {} → {} ({:.0%})".format(p.scenario[:40], p.outcome, p.confidence))

# Record the classification
class_id = context.record_decision(
    category       = "threat_classification",
    scenario       = "New C2 cluster: Twitter dead-drop, AS200651 hosting, TTP T1102",
    reasoning      = "IP block overlaps APT29 cluster; T1102 matches HAMMERTOSS playbook",
    outcome        = "classified_apt29_march_cluster",
    confidence     = 0.88,
    decision_maker = "cti_pipeline_v2",
    entities       = ["apt29", "hammertoss"],
)

# Link to downstream escalation
esc_id = context.record_decision(
    category       = "escalation",
    scenario       = "APT29 cluster active — beaconing to NATO subnet 10.30.0.0/16",
    reasoning      = "Active C2 with high-confidence attribution requires immediate SOC notification",
    outcome        = "escalated_tier2_soc",
    confidence     = 0.97,
    decision_maker = "escalation_engine",
)
graph.add_causal_relationship(class_id, esc_id, "CAUSED")

# Post-shift audit report
insights = graph.get_decision_insights()
print("Decisions recorded:", insights["total_decisions"])
print("Mean confidence   :", round(insights["confidence_stats"]["mean"], 2))
```

</Tab>

<Tab title="安全 — SOC/事件响应">

在事件处置过程中，SOC 记录遏制决策，并以因果链接将其与触发它们的检测决策相连。六小时后，事后复盘可以重放从首个告警到最终遏制的确切决策序列。

```python
from semantica.context import AgentContext, ContextGraph, DecisionRecorder
from semantica.vector_store import VectorStore

graph    = ContextGraph()
recorder = DecisionRecorder(graph_store=graph)
context  = AgentContext(
    vector_store=VectorStore(backend="faiss", dimension=768),
    knowledge_graph=graph,
    decision_tracking=True,
)

# T+0: Detection decision
detect_id = context.record_decision(
    category       = "detection",
    scenario       = "WKSTN-047: wmiprvse.exe spawned scheduled task — T1053.005",
    reasoning      = "Scheduled task creation by WMI provider host is high-fidelity lateral movement indicator",
    outcome        = "flagged_wkstn047_suspicious",
    confidence     = 0.93,
    decision_maker = "edr_engine",
)

# T+8min: Containment decision caused by detection
contain_id = context.record_decision(
    category       = "containment",
    scenario       = "WKSTN-047 confirmed compromised — lateral movement to DC01 via SMB",
    reasoning      = "PsExec artefact on DC01; isolate before domain-wide credential compromise",
    outcome        = "isolated_wkstn047",
    confidence     = 0.95,
    decision_maker = "analyst_chen",
)
graph.add_causal_relationship(detect_id, contain_id, "CAUSED")

# Post-mortem: trace the full chain
chain = context.get_causal_chain(contain_id, direction="upstream", max_depth=5)
print("Post-mortem — causal chain for isolation decision:")
for d in chain:
    print("  [depth {}] {} → {}  (confidence={:.2f}, maker={})".format(
        d.metadata.get("causal_distance", "?"),
        d.category, d.outcome, d.confidence, d.decision_maker,
    ))

# Full explainability for the containment decision
explanation = context.trace_decision_explainability(contain_id)
print("Upstream causes   :", len(explanation.get("upstream_decisions", [])))
print("Total connections :", explanation["total_connections"])
```

</Tab>

<Tab title="生命科学 — 临床/制药">

某临床 AI 助手记录治疗方案调整决策及其指南先例，将这些决策以因果方式与在先的诊断决策相连，并生成结构化决策记录，供 MDT 评审和监管审计使用。

```python
from semantica.context import AgentContext, ContextGraph, PolicyEngine, Policy
from semantica.context import Decision, DecisionRecorder
from semantica.vector_store import VectorStore
from datetime import datetime

graph   = ContextGraph()
engine  = PolicyEngine(graph_store=graph)
context = AgentContext(
    vector_store=VectorStore(backend="faiss", dimension=768),
    knowledge_graph=graph,
    decision_tracking=True,
)

engine.add_policy(Policy(
    policy_id   = "clinical_confidence_gate",
    name        = "Clinical Decision Confidence Gate",
    description = "Treatment decisions require confidence >= 0.90",
    rules       = {"min_confidence": 0.90},
    category    = "treatment_modification",
    version     = "1.0",
    created_at  = datetime.now(),
    updated_at  = datetime.now(),
))

# Diagnostic decision precedes treatment decision
diag_id = context.record_decision(
    category       = "diagnosis_assessment",
    scenario       = "Patient eGFR 28 mL/min/1.73m2, CKD Stage 4, current metformin 1000mg BD",
    reasoning      = "eGFR 28 confirms CKD Stage 4; below 30 threshold for metformin contraindication",
    outcome        = "confirmed_ckd_stage4_metformin_contraindicated",
    confidence     = 0.99,
    decision_maker = "clinical_ai_v3",
)

# Treatment modification caused by diagnostic assessment
treat_id = context.record_decision(
    category       = "treatment_modification",
    scenario       = "Metformin discontinuation required — eGFR 28 below contraindication threshold",
    reasoning      = "NICE NG28 and BNF both contraindicate metformin at eGFR < 30; switch to gliclazide MR 30mg OD",
    outcome        = "discontinue_metformin_initiate_gliclazide",
    confidence     = 0.97,
    decision_maker = "clinical_ai_v3",
)
graph.add_causal_relationship(diag_id, treat_id, "CAUSED")

# MDT audit report
chain = context.get_causal_chain(treat_id, direction="upstream", max_depth=3)
print("MDT Decision Audit — Treatment Modification")
print("=" * 50)
for d in chain:
    print("Caused by: [{}] {} (confidence={:.0%})".format(
        d.category, d.outcome, d.confidence
    ))

insights = graph.get_decision_insights()
cs = insights["confidence_stats"]
print("\nSession decisions: {}  |  mean confidence: {:.2f}".format(
    insights["total_decisions"], cs["mean"]
))
```

</Tab>

<Tab title="银行 — 风险/合规">

某信贷决策系统依据带版本的贷款策略记录每一笔贷款决策，将边缘审批与压力测试决策以因果方式相连，并导出完整的决策审计轨迹，用于 SR 11-7 模型治理审查。

```python
from semantica.context import AgentContext, ContextGraph, PolicyEngine, Policy
from semantica.context import Decision, DecisionRecorder
from semantica.vector_store import VectorStore
from datetime import datetime

graph   = ContextGraph()
engine  = PolicyEngine(graph_store=graph)
context = AgentContext(
    vector_store=VectorStore(backend="faiss", dimension=768),
    knowledge_graph=graph,
    decision_tracking=True,
)

engine.add_policy(Policy(
    policy_id   = "lending_policy_v3",
    name        = "Lending Compliance Policy v3",
    description = "Credit decisions require confidence >= 0.85 and documented reasoning",
    rules       = {"min_confidence": 0.85, "requires_reasoning": True},
    category    = "loan_approval",
    version     = "3.0",
    created_at  = datetime.now(),
    updated_at  = datetime.now(),
))

# Check precedents before approving
precedents = context.find_precedents(
    "first-time buyer mortgage borderline DSTI stressed rate scenario",
    limit=3,
)
for p in precedents:
    print("Prior: {} → {} ({:.0%})".format(p.scenario[:40], p.outcome, p.confidence))

# Stress-test decision precedes approval decision
stress_id = context.record_decision(
    category       = "stress_test",
    scenario       = "APP-2025-994421: LTV 78%, DSTI 38% at current rate; DSTI rises to 44% at +300bps",
    reasoning      = "DSTI 44% under stress exceeds 35% guideline threshold — requires LMI and income verification",
    outcome        = "stress_test_conditional_pass",
    confidence     = 0.88,
    decision_maker = "risk_model_v3",
)

# Approval decision influenced by stress test
d = Decision(
    decision_id    = "loan_dec_994421",
    category       = "loan_approval",
    scenario       = "APP-2025-994421: first-time buyer, LTV 78%, credit score 714, 30yr fixed",
    reasoning      = "Credit score 714 exceeds 700 minimum; LTV within 80% cap; conditional on LMI given stress-test DSTI",
    outcome        = "approved_conditional_lmi_required",
    confidence     = 0.89,
    timestamp      = datetime.now(),
    decision_maker = "credit_model_v3",
)

# False = evaluated and non-compliant; if the check cannot run at
# all, check_compliance raises ProcessingError (see policy-engine guide).
if engine.check_compliance(d, "lending_policy_v3"):
    loan_id = context.record_decision(
        category=d.category, scenario=d.scenario,
        reasoning=d.reasoning, outcome=d.outcome, confidence=d.confidence,
        decision_maker=d.decision_maker,
    )
    graph.add_causal_relationship(stress_id, loan_id, "INFLUENCED")
    engine.record_policy_application(loan_id, "lending_policy_v3", "3.0")
    print("Loan decision recorded — policy compliant.")

    # SR 11-7 explainability report
    explanation = context.trace_decision_explainability(loan_id)
    print("Upstream influences:", len(explanation.get("upstream_decisions", [])))
    print("Total connections  :", explanation["total_connections"])
```

</Tab>

</Tabs>

## 跨重启持久化决策

使用本地 `ContextGraph` 时，在每次会话结束时保存、在下一次会话开始时加载。所有决策节点、因果边和 FAISS 嵌入都会被恢复。

```python
# End of session
context.save("agent_state/")
# Writes: agent_state/knowledge_graph.json + FAISS index

# Start of next session
context = AgentContext(
    vector_store=VectorStore(backend="faiss", dimension=768),
    knowledge_graph=ContextGraph(),
    decision_tracking=True,
)
context.load("agent_state/")

# All past decisions are searchable immediately
results = context.find_precedents("APT29 infrastructure attribution", limit=5)
```

## 常见陷阱

**记录决策却不建立因果关联。** 孤立的决策节点所能提供的信息远少于相互连接的决策链。使用 `add_causal_relationship()` 连接相关决策，从而启用因果追踪。

**创建孤立的决策节点。** 当决策与图中的实体、其他决策或结果相连时，其价值才会提升。使用 `entities` 参数将决策与相关实体关联。

**记录过多低价值决策。** 并非每个细小的选择都需要永久记录。应聚焦于影响结果、需要审计轨迹或能从先例搜索中受益的重要决策。

**把先例相似度当作证据。** 高相似度分数只表示场景相关，而非情况相同。将先例作为参考，同时考虑每个新决策的具体语境。

**在简单检索即可满足时使用决策智能。** 如果你的系统只检索信息而不做出可执行的选择，传统搜索或 Agent Memory 可能比决策追踪更合适。

## 相关指南

- [上下文图](/zh/guides/context-graphs) — `ContextGraph` 如何存储决策节点和因果边
- [距离智能](/zh/guides/distance-intelligence) — `trace_decision_causality()` 为因果链标注置信度衰减和距离区间
- [溯源](/zh/guides/provenance) — W3C PROV-O 审计轨迹，将决策记录封装为符合标准的溯源信息
- [MCP Server](/zh/guides/mcp-server) — 通过 `record_decision` 和 `find_precedents` 工具，向 LLM 智能体暴露决策记录与先例搜索能力
- [变更管理](/zh/guides/change-management) — 使用 `flush_checkpoint()` 为决策状态设置检查点，以形成带版本的快照