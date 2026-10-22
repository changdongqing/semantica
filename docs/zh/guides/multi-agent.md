---
title: "多智能体系统"
description: "通过共享记忆、知识图谱和决策历史协调多个 AI 智能体——无需消息代理。"
sourceHash: "88fe0ce94ce9925f790c54d00585421b2f93ff766379ce35d41e66484e1e5a6a"
---

## 什么是多智能体协调？

多智能体系统是一种软件架构，其中多个自主智能体协同工作，以完成单个智能体难以或无法有效处理的复杂任务。开发者不再构建一个试图包揽一切的巨型智能体，而是将工作拆分给各自专注于特定职责的专用智能体。

**为什么要将工作拆分到多个智能体：**
- **关注点分离** — 每个智能体专注于一个领域（摄取、分析、报告），而不是试图精通所有事情
- **独立推理** — 不同智能体可以针对自身特定任务使用不同的模型、提示词和推理策略
- **并行处理** — 多个智能体可以同时处理同一问题的不同方面
- **类人的工作流分解** — 模拟人类团队自然划分复杂分析工作的方式

**Semantica 的协调方式：**
Semantica 通过共享上下文（记忆与知识图谱）来协调智能体，而不是通过消息代理或服务间的 API 调用。各智能体读写相同的底层数据结构，从而无需复杂的中间件即可实现无缝的信息共享。

**单智能体与多智能体架构：**
- **单智能体** — 一个 `AgentContext` 处理从摄取到最终输出的所有任务
- **多智能体** — 多个 `AgentContext` 实例或按命名空间划分的工作流，各自负责特定的流水线阶段或分析角色

## 为什么使用多智能体系统？

**职责分离。** 将复杂工作流划分为聚焦、可管理的阶段，让每个智能体在自己特定的领域内发挥所长，而不会被无关的事务淹没。

**复杂工作流的可扩展性。** 处理需要不同专业领域、处理速度和推理方法的复杂分析流水线，而无需构建笨重的巨型智能体。

**独立的推理阶段。** 让不同智能体使用针对自身任务优化的不同 LLM、提示词、置信度阈值和推理策略，而不必在“一刀切”的方案上妥协。

**专用的智能体角色。** 为摄取、丰富、分析、综合和报告分别创建智能体——每个都具备与其角色相匹配的配置和能力。

**共享的知识与证据。** 多个智能体共同贡献于并从同一知识图谱和记忆存储中获益，形成累积性的证据基础，随着更多智能体贡献发现而不断改进。

**类人的工作流分解。** 对应自然的人类团队结构：分析师、研究员和决策者各自为协作式分析流程贡献专业技能。

## 何时使用 / 何时不使用

**使用多智能体系统的场景：**
- 需要多个阶段的复杂分析工作流（研究 → 分析 → 综合 → 报告）
- 具有明显不同阶段、并能从专用方法中获益的多阶段处理流水线
- 研究与调查工作流，其中不同智能体处理不同信息源或分析方法
- 由不同角色组成的专用智能体团队（OSINT 采集员、丰富分析师、融合官）
- 长时间运行的工作流，其中不同智能体可能在不同时间或按不同计划运行
- 需要在不同分析阶段使用不同 LLM、推理方法或置信度阈值的场景

**不要使用多智能体系统的场景：**
- 简单的文档摘要或单步信息检索任务
- 单个智能体即可有效处理所有步骤、无法从专用化中获益的线性工作流
- 协调开销超过核心工作复杂度的简单小型任务
- 单个配置得当的智能体即可高效处理整个工作流的情况

**重要考量：** 多智能体系统会引入额外的架构复杂性，包括状态管理、协调模式和调试难题。只有在专用化和关注点分离带来的收益超过这些额外复杂性时，才应选择多智能体方案。

Semantica 通过共享的 `ContextGraph` 协调多个智能体——各智能体读写同一个图，或通过 `save()` 和 `load()` 交接序列化状态，无需消息代理。当需要在摄取、丰富、推理和报告等角色之间拆分工作，且这些角色必须共享同一证据基础时，请使用此模式。

<Info>
  本指南介绍多智能体协调。关于每个智能体内部使用的记忆层，请参阅 [Agent Memory](/zh/guides/agent-memory)。关于图遍历和实体链接，请参阅 [Context Graphs](/zh/guides/context-graphs)。关于决策记录和先例匹配，请参阅 [Decision Intelligence](/zh/guides/decision-intelligence)。
</Info>

## 三种协调模式

在编写任何代码之前，先为你的流水线选择合适的协调模式。

**共享图模式：** 多个智能体在单个进程内共享对同一 `ContextGraph` 和 `VectorStore` 对象的引用。由于所有智能体都能立即看到变更，这种方式延迟最低，并内置了并发访问的线程安全。当智能体在同一应用中同时运行、且需要实时访问彼此的贡献时，选择此模式。

**保存 / 加载交接模式：** 智能体在不同进程、容器或不同时间运行。第一个智能体完成工作后调用 `context.save(path)` 序列化其完整状态。下一个智能体调用 `context.load(path)` 精确恢复到前一个智能体离开的位置，包括完整的记忆、图数据和向量索引。适用于分布式系统、定时工作流，或需要共享存储访问权的不同机器上运行的智能体。

**命名空间记忆模式：** 单个 `AgentContext` 服务多个逻辑智能体，每个智能体使用唯一的 `conversation_id` 值限定其读写范围。智能体之间通过命名空间而非独立的上下文实例实现隔离。适用于轻量级角色分离，且不承担维护多个完整上下文的资源开销。

本指南中的流水线同时使用了这三种模式。

## 模式 1 — 共享图实现并发摄取

OSINT（**开源情报**——公开可获取的信息）采集器与丰富智能体并发运行。它们共享单个 `ContextGraph` 和单个 `VectorStore`——图内部的 `RLock` 保证了并发写入的安全性。

```python
import threading
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore

# One graph, one vector store — both agents write to these
shared_graph = ContextGraph(advanced_analytics=True)
shared_vs    = VectorStore(backend="faiss", dimension=768)

def make_agent() -> AgentContext:
    """Factory: each agent gets its own AgentContext wrapping the shared backing stores."""
    return AgentContext(
        vector_store=shared_vs,            # same VectorStore instance
        knowledge_graph=shared_graph,      # same ContextGraph instance
        graph_expansion=True,
        max_expansion_hops=2,
        decision_tracking=True,
    )

osint_agent      = make_agent()
enrichment_agent = make_agent()
reasoning_agent  = make_agent()
```

OSINT 采集器的职责是摄取原始数据源并抽取实体。它不做推理——只负责摄取，让图自行累积结构。

```python
def osint_collection():
    """Agent 1: ingest raw threat feeds and CVE data."""
    osint_agent.store(
        [
            {
                "content": "APT29 exploits CVE-2024-3400 in PAN-OS GlobalProtect — unauthenticated RCE, CVSS 10.0",
                "metadata": {"source": "nvd_feed", "cve": "CVE-2024-3400", "actor": "APT29"},
            },
            {
                "content": "Volexity confirms active exploitation of CVE-2024-3400 against NATO member networks",
                "metadata": {"source": "volexity_blog", "actor": "APT29", "target": "NATO"},
            },
            {
                "content": "PAN-OS GlobalProtect affected versions: < 10.2.9-h1, < 11.0.4-h1, < 11.1.2-h3",
                "metadata": {"source": "paloalto_advisory", "cve": "CVE-2024-3400", "product": "GlobalProtect"},
            },
        ],
        extract_entities=True,
        extract_relationships=True,
        conversation_id="osint-pipeline",    # namespace acts as agent identifier
    )
```

在 OSINT 采集器运行的同时，丰富智能体独立拉取行为体画像数据，并将其链接到同一个图中。

```python
def enrichment():
    """Agent 2: enrich the graph with actor profile and TTP context."""
    enrichment_agent.store(
        [
            {
                "content": "APT29 TTP profile: T1190 (Exploit Public-Facing Application), T1071.001 (Web Protocols C2), T1078 (Valid Accounts)",
                "metadata": {"source": "mitre_attck", "actor": "APT29", "type": "ttp_profile"},
            },
            {
                "content": "APT29 infrastructure fingerprint: use of Cloudflare Workers for C2 relay, certificate reuse across campaigns",
                "metadata": {"source": "recorded_future", "actor": "APT29", "type": "infrastructure"},
            },
        ],
        extract_entities=True,
        extract_relationships=True,
        conversation_id="enrichment-pipeline",    # separate namespace from OSINT agent
    )
```

同时运行两者——图会处理加锁。

```python
t1 = threading.Thread(target=osint_collection)
t2 = threading.Thread(target=enrichment)
t1.start(); t2.start()
t1.join();  t2.join()

# The shared graph now contains entities and relationships from both agents.
# The reasoning agent can query across everything both agents stored.
```

## 模式 2 — 保存 / 加载交接给推理智能体

推理智能体在摄取完成后运行。在生产流水线中，它可能是独立进程、不同容器或定时任务。摄取智能体保存其共享状态；推理智能体加载该状态。

**重要部署说明：** 当智能体在不同容器或不同机器上运行时，它们必须通过共享存储（网络文件系统、云存储或共享卷）访问同一保存状态位置。

```python
# After ingestion: save the combined graph and vector index
osint_agent.save("./pipeline/enriched_intel/")
# Writes:
#   pipeline/enriched_intel/agent_memory.json     — all MemoryItems
#   pipeline/enriched_intel/vector_store/         — FAISS index
#   pipeline/enriched_intel/knowledge_graph.json  — all nodes and edges

print("Ingestion complete. State saved for reasoning agent.")
```

推理智能体全新启动，加载该状态，便可完全访问摄取智能体所构建的一切。

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore
from semantica.llms import LiteLLM

# Create a context to load the checkpoint into — load() will overwrite existing state
reasoning_vs    = VectorStore(backend="faiss", dimension=768)
reasoning_graph = ContextGraph(advanced_analytics=True)
reasoning_agent = AgentContext(
    vector_store=reasoning_vs,
    knowledge_graph=reasoning_graph,
    graph_expansion=True,
    max_expansion_hops=3,
    decision_tracking=True,
)

reasoning_agent.load("./pipeline/enriched_intel/")
# All memories, graph nodes, and vector embeddings from both ingestion agents are now available.

# Use a high-capability model for the synthesis step
llm = LiteLLM(model="anthropic/claude-sonnet-5")

synthesis = reasoning_agent.query_with_reasoning(
    "Summarize the APT29 exploitation of CVE-2024-3400: affected products, "
    "observed TTPs, targeted sectors, and recommended mitigations.",
    llm_provider=llm,
    max_results=15,
    max_hops=3,
)

print(synthesis["response"])
print("Confidence: {:.0%}".format(synthesis["confidence"]))

# Store the synthesis back into the graph — the reporting agent will retrieve it
reasoning_agent.store(
    "SYNTHESIS: " + synthesis["response"],
    metadata={"type": "synthesis", "agent": "reasoning", "confidence": synthesis["confidence"]},
    conversation_id="synthesis-output",
)

# Record the analytical judgment as a traceable decision
reasoning_agent.record_decision(
    category="threat_assessment",
    scenario="APT29 active exploitation of CVE-2024-3400 in PAN-OS",
    reasoning=synthesis["reasoning_path"],
    outcome="high_priority_patch_advisory",
    confidence=synthesis["confidence"],
    entities=["APT29", "CVE-2024-3400", "GlobalProtect", "NATO"],
    decision_maker="reasoning_agent_v2",
)

# Hand off to the reporting agent
reasoning_agent.save("./pipeline/synthesis_output/")
```

<Info>
  `load()` 会覆盖已有的上下文 —— 它在加载前会清空当前的内存、图与向量状态。在调用 `load()` 之前，上下文中任何未保存的数据都会丢失。
</Info>

## 模式 3 —— 为角色隔离划分命名空间化记忆

报告智能体不需要自己的图实例。它共享推理智能体的上下文，但将自己的写入限定在自有命名空间内 —— `conversation_id` 充当智能体标识符，用以分隔记忆流，并防止不同逻辑智能体之间相互污染。

**使用 conversation_id 实现命名空间隔离：**
- `conversation_id` 在同一个 `AgentContext` 内创建独立的记忆命名空间
- 除非显式跨命名空间查询，否则每个智能体的记忆保持隔离
- 当不同逻辑智能体处理相关但不同的任务时，可防止意外的记忆污染

```python
# The reporting agent loads the synthesis output
reporting_vs    = VectorStore(backend="faiss", dimension=768)
reporting_graph = ContextGraph()
reporting_agent = AgentContext(
    vector_store=reporting_vs,
    knowledge_graph=reporting_graph,
    graph_expansion=True,
)
reporting_agent.load("./pipeline/synthesis_output/")

# Retrieve everything the reasoning agent produced
synthesis_items = reporting_agent.retrieve(
    "APT29 CVE-2024-3400 threat assessment synthesis",
    max_results=10,
    conversation_id="synthesis-output",   # scoped to reasoning agent's output
)

# Build the finished brief
brief_sections = []
for item in synthesis_items:
    brief_sections.append(item["content"])

# Store the final report under the reporting agent's own namespace
reporting_agent.store(
    "\n\n".join(brief_sections),
    metadata={"type": "finished_report", "classification": "TLP:GREEN"},  # TLP (Traffic Light Protocol) — information sharing guidelines
    conversation_id="reporting-output",    # reporting agent's namespace
    user_id="reporting_agent",
)

# The full pipeline audit trail: retrieve across all namespaces
full_trail = reporting_agent.retrieve("APT29 CVE-2024-3400", max_results=25)
print("Pipeline produced {} traceable context items".format(len(full_trail)))
```

每个智能体的贡献既可通过按 `conversation_id` 过滤单独检索，也可在不带过滤条件的查询中整体检索。

## 常见陷阱

**忘记 conversation_id 命名空间。** 如果没有唯一的 `conversation_id` 值，不同智能体的记忆会混在一起，导致无法追溯哪条洞察由哪个智能体贡献。请始终为每个逻辑智能体使用独特且有意义的 conversation ID。

**load() 造成的意外状态丢失。** `load()` 函数会覆盖已有上下文，而不是合并。如果 `AgentContext` 中存在未保存的状态，调用 `load()` 会将其抹除。加载检查点前，请始终保存当前状态，或改用全新的上下文。

**跨进程使用 Shared Graph。** Shared Graph 模式仅在单个进程内、智能体共享对象引用时才有效。对于运行在不同容器或机器上的分布式智能体，请改用 Save/Load Handoff 模式。

**假设 save/load 无需共享存储即可工作。** 位于不同进程、容器或机器上的智能体必须能够访问相同的文件系统位置，才能完成 save/load 交接。请确保共享存储（NFS、云存储、共享卷）已正确配置。

**用多智能体重度设计简单工作流。** 多智能体系统会增加协调复杂度与潜在故障点。对于直接的单步任务，简单的单智能体方案往往更可靠、更易调试。

**过度混合智能体职责。** 每个智能体都应有清晰、聚焦的角色。试图做太多不同任务的智能体会丧失专业化的优势，并变得更难优化、调试和维护。

**忽视记忆隔离边界。** 使用命名空间化记忆时，要小心跨越多个 `conversation_id` 值的查询。未限定范围的查询可能意外检索到其他智能体的记忆，破坏逻辑隔离。

## 领域示例

<Tabs>
<Tab title="国防 —— CTI/威胁">
一个三智能体情报融合小组：OSINT 采集员摄取公开信息源，HUMINT（**Human Intelligence** —— 由人力来源收集的情报）分析师加载涉密摘要，融合官将两路信息流综合为 PIR（**Priority Intelligence Requirement** —— 决策所需的关键信息）答案。OSINT 与 HUMINT 智能体在共享图上并发运行；融合官则在**气隙环境**（出于安全考虑、无互联网连接的隔离网络）中的独立进程里加载合并后的状态。

```python
import threading
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore
from semantica.llms import HuggingFaceLLM

# Shared graph for concurrent multi-INT collection
shared_graph = ContextGraph(advanced_analytics=True)
shared_vs    = VectorStore(backend="faiss", dimension=768)

osint_agent  = AgentContext(vector_store=shared_vs, knowledge_graph=shared_graph, graph_expansion=True)
humint_agent = AgentContext(vector_store=shared_vs, knowledge_graph=shared_graph, graph_expansion=True)

def osint_collection():
    osint_agent.store(
        [
            {"content": "CVE-2024-3400 confirmed exploited by APT29 against NATO member VPN gateways",
             "metadata": {"source": "NVD", "classification": "UNCLASSIFIED", "actor": "APT29"}},
            {"content": "Palo Alto PSIRT: GlobalProtect OS command injection via crafted SESSID cookie",
             "metadata": {"source": "PAN-SA-2024-0006", "classification": "UNCLASSIFIED"}},
        ],
        extract_entities=True,
        extract_relationships=True,
        conversation_id="osint-collector",
    )

def humint_analysis():
    # In a cleared environment, HUMINT docs come from a local classified store
    humint_agent.store(
        [
            {"content": "[S//NF] APT29 operator tradecraft: deploy WARPWIRE credential harvester post-exploitation of perimeter VPNs",
             "metadata": {"source": "HUMINT_Q4_2024", "classification": "SECRET//NOFORN", "actor": "APT29"}},
            {"content": "[S//NF] Target selection pattern: APT29 prioritizes Foreign Ministry and Defense Attache networks within NATO",
             "metadata": {"source": "HUMINT_Q4_2024", "classification": "SECRET//NOFORN", "actor": "APT29"}},
        ],
        extract_entities=True,
        extract_relationships=True,
        conversation_id="humint-analyst",
    )

# Concurrent multi-INT collection — graph handles thread safety
t1 = threading.Thread(target=osint_collection)
t2 = threading.Thread(target=humint_analysis)
t1.start(); t2.start()
t1.join();  t2.join()

# Save combined intelligence base for the air-gapped fusion officer
osint_agent.save("./fusion/combined_intel/")

# --- Fusion Officer (air-gapped segment, separate process) ---
fusion_vs    = VectorStore(backend="faiss", dimension=768)
fusion_graph = ContextGraph(advanced_analytics=True)
fusion_officer = AgentContext(
    vector_store=fusion_vs,
    knowledge_graph=fusion_graph,
    graph_expansion=True,
    decision_tracking=True,
)
fusion_officer.load("./fusion/combined_intel/")

# Air-gapped inference: local model on NFS share
llm = HuggingFaceLLM(model="/opt/models/llama-3.1-70b-instruct")

pir_answer = fusion_officer.query_with_reasoning(
    "PIR: What is APT29's current exploitation methodology against NATO perimeter VPNs "
    "and what post-exploitation capabilities have they deployed in Q4 2024?",
    llm_provider=llm,
    max_results=20,
    max_hops=3,
)
print(pir_answer["response"])
fusion_officer.save("./fusion/pir_report/")
```

</Tab>

<Tab title="安全 —— SOC/事件响应">
一个三层 SOC 流水线：一线使用快速的 Groq 模型对告警做初筛，若一线置信度较低，二线则升级为由 Claude 执行的深度分析，而经理智能体读取跨所有层级的完整事件线程。三层共享同一个 `ContextGraph` —— 每层用按层级限定的 `conversation_id` 为自己的发现划分命名空间。

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore
from semantica.llms import Groq, LiteLLM

shared_graph = ContextGraph()
shared_vs    = VectorStore(backend="faiss", dimension=768)

def make_soc_agent() -> AgentContext:
    return AgentContext(
        vector_store=shared_vs,
        knowledge_graph=shared_graph,
        graph_expansion=True,
        decision_tracking=True,
    )

tier1   = make_soc_agent()
tier2   = make_soc_agent()
manager = make_soc_agent()

incident_id = "INC-2025-110342"

# --- Tier 1: fast triage with Groq (target < 500ms) ---
fast_llm = Groq(model="llama-3.1-8b-instant", api_key="YOUR_GROQ_KEY")

alert = (
    "Host: ws-finance-03  User: jsmith  Event: Scheduled task — base64-encoded PowerShell\n"
    "Sigma: T1053.005  Parent: wmiprvse.exe  Time: 2025-06-21T09:14:32Z"
)
tier1.store(alert, metadata={"tier": 1, "incident": incident_id})

triage = tier1.query_with_reasoning(
    "Is this a true positive? One-line verdict.",
    llm_provider=fast_llm,
    max_results=5,
)
tier1.store(
    "TIER1 VERDICT: " + triage["response"],
    metadata={"tier": 1, "incident": incident_id, "confidence": triage["confidence"]},
    conversation_id="{}-tier1".format(incident_id),
)

# --- Tier 2: deep investigation when Tier 1 confidence is low ---
if triage["confidence"] < 0.90:
    deep_llm = LiteLLM(model="anthropic/claude-sonnet-5")

    investigation = tier2.query_with_reasoning(
        "Full MITRE ATT&CK analysis of incident {}. "
        "Identify attack chain, affected systems, blast radius, and recommended containment.".format(incident_id),
        llm_provider=deep_llm,
        max_results=15,
        max_hops=3,
    )
    tier2.store(
        "TIER2 ANALYSIS: " + investigation["response"],
        metadata={"tier": 2, "incident": incident_id},
        conversation_id="{}-tier2".format(incident_id),
    )
    tier2.record_decision(
        category="escalation",
        scenario="Escalate {} — Tier 1 confidence {:.0%}".format(incident_id, triage["confidence"]),
        reasoning=investigation["reasoning_path"],
        outcome="escalated_to_tier3",
        confidence=investigation["confidence"],
        entities=["ws-finance-03", "jsmith", "wmiprvse.exe"],
        decision_maker="tier2_analyst",
    )

# --- Manager: read the full incident thread across all tiers ---
full_thread = manager.retrieve(
    "incident {}".format(incident_id),
    use_graph=True,
    max_results=25,
)
print("Full incident thread ({} items):".format(len(full_thread)))
for item in full_thread:
    tier = item.get("metadata", {}).get("tier", "?")
    print("  [Tier {}] {}".format(tier, item["content"][:100]))

# Per-tier history for post-incident review
t1_history = manager.conversation("{}-tier1".format(incident_id))
t2_history = manager.conversation("{}-tier2".format(incident_id))
```

</Tab>

<Tab title="生命科学 —— 临床/制药">
一个三智能体药物发现流水线：文献智能体摄取 PubMed 论文，实验智能体加载经过验证的测定结果，首席智能体综合两者以识别先导化合物。文献与实验智能体在共享图上并行运行；摄取完成后，首席智能体跨两者进行查询。

```python
import threading
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore
from semantica.llms import LiteLLM

shared_graph = ContextGraph(advanced_analytics=True)
shared_vs    = VectorStore(backend="faiss", dimension=768)

def make_agent() -> AgentContext:
    return AgentContext(
        vector_store=shared_vs,
        knowledge_graph=shared_graph,
        graph_expansion=True,
        max_expansion_hops=3,
        retention_days=None,      # unlimited retention for research data
    )

lit_agent = make_agent()
exp_agent = make_agent()
chief     = make_agent()

def literature_review():
    # Ingest PubMed abstracts for KRAS G12C inhibitors
    lit_agent.store(
        [
            {"content": "Sotorasib (AMG-510) achieves 37.1% ORR in KRAS G12C NSCLC (CodeBreaK 100, NEJM 2021)",
             "metadata": {"source": "CodeBreaK100", "target": "KRAS_G12C", "compound": "sotorasib"}},
            {"content": "Adagrasib (MRTX849) ORR 42.9% in KRAS G12C NSCLC with CNS activity (KRYSTAL-1, NEJM 2022)",
             "metadata": {"source": "KRYSTAL-1", "target": "KRAS_G12C", "compound": "adagrasib"}},
            {"content": "Resistance to KRAS G12C inhibitors frequently driven by Y96D mutation in switch-II pocket",
             "metadata": {"source": "Tanaka_CancerCell_2021", "target": "KRAS_G12C", "mechanism": "resistance"}},
        ],
        extract_entities=True,
        extract_relationships=True,
        conversation_id="literature-agent",
    )

def experimental_results():
    # Load validated in-vitro and in-vivo assay data
    exp_agent.store(
        [
            {"content": "Compound RMC-6291: IC50=0.6nM KRAS G12C, selectivity index 480, in-vivo efficacy 82%, toxicity grade 1",
             "metadata": {"source": "internal_assay", "compound": "RMC-6291", "source_type": "experimental"}},
            {"content": "Compound BI-7273: IC50=1.4nM KRAS G12C, selectivity index 310, in-vivo efficacy 71%, toxicity grade 2",
             "metadata": {"source": "internal_assay", "compound": "BI-7273", "source_type": "experimental"}},
            {"content": "Compound GDC-6036: IC50=0.9nM KRAS G12C, active against Y96D resistance mutation, toxicity grade 1",
             "metadata": {"source": "internal_assay", "compound": "GDC-6036", "source_type": "experimental"}},
        ],
        extract_entities=True,
        conversation_id="experimental-agent",
    )

# Parallel ingestion — graph handles concurrency
t1 = threading.Thread(target=literature_review)
t2 = threading.Thread(target=experimental_results)
t1.start(); t2.start()
t1.join();  t2.join()

# Chief agent synthesizes across literature and experimental data
llm = LiteLLM(model="anthropic/claude-sonnet-5")

synthesis = chief.query_with_reasoning(
    "Identify the top two candidate compounds for KRAS G12C NSCLC that show "
    "both strong experimental IC50 selectivity and clinical/literature support "
    "for the target pathway, including any coverage of resistance mechanisms.",
    llm_provider=llm,
    max_results=20,
    max_hops=3,
)
print(synthesis["response"])
chief.save("./drug_discovery/kras_g12c_checkpoint/")
```

</Tab>

<Tab title="银行 —— 风险/合规">
一个四智能体信贷委员会：风险台智能体计算 PD/LGD，合规台智能体检查 Basel III 与 EBA 要求，信贷官智能体执行政策，委员会主席智能体读取全部三个台的发现，以给出带有完整审计轨迹的最终决策。每个台为自己的发现划分命名空间；主席则跨所有命名空间读取。

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore
from semantica.llms import LiteLLM

shared_graph = ContextGraph(advanced_analytics=True)
shared_vs    = VectorStore(backend="faiss", dimension=768)

def make_desk_agent() -> AgentContext:
    return AgentContext(
        vector_store=shared_vs,
        knowledge_graph=shared_graph,
        graph_expansion=True,
        decision_tracking=True,
        retention_days=2555,    # 7-year Basel III retention
        kg_algorithms=True,
    )

risk_desk       = make_desk_agent()
compliance_desk = make_desk_agent()
credit_officer  = make_desk_agent()
committee_chair = make_desk_agent()

app_id = "LOAN-2025-88421"
llm    = LiteLLM(model="anthropic/claude-sonnet-5")

# --- Risk Desk: PD/LGD/EL analysis ---
risk_desk.store(
    "Risk analysis {}: PD=2.3%, LGD=45%, EL=89k GBP, DSCR=1.12, LTV=78%. "
    "Stress test +300bps: DSCR falls to 0.98 — marginal but within policy floor of 0.95.".format(app_id),
    metadata={"desk": "risk", "application": app_id},
    conversation_id="{}-risk".format(app_id),
)
risk_desk.record_decision(
    category="credit_risk",
    scenario="Risk assessment {}".format(app_id),
    reasoning="PD 2.3% within 3% internal threshold; LTV 78% marginal — LMI required; stress test passes",
    outcome="conditional_approval_lmi_required",
    confidence=0.78,
    entities=[app_id, "LTV_78pct", "PD_2pct"],
    decision_maker="risk_model_v6",
)

# --- Compliance Desk: Basel III / EBA GL 2020/06 check ---
compliance_desk.store(
    [
        {"content": "Basel III CRR2 Art. 92: total capital ratio minimum 8% + 2.5% conservation buffer",
         "metadata": {"source": "CRR2_Art92", "category": "capital_requirement"}},
        {"content": "EBA GL 2020/06: DSTI > 40% requires enhanced creditworthiness assessment and senior credit officer sign-off",
         "metadata": {"source": "EBA_GL_2020_06", "category": "affordability"}},
        {"content": "CRE20: LTV > 80% for residential mortgages requires LMI or equivalent credit enhancement",
         "metadata": {"source": "Basel_CRE20", "category": "collateral"}},
    ],
    extract_entities=True,
    extract_relationships=True,
)

compliance_check = compliance_desk.query_with_reasoning(
    "Does application {} (residential mortgage, LTV 78%, DSTI 35%) satisfy "
    "Basel III CRE20, EBA GL 2020/06 affordability requirements, and CRR2 Art. 92?".format(app_id),
    llm_provider=llm,
    max_results=10,
)
compliance_desk.store(
    "COMPLIANCE FINDING: " + compliance_check["response"],
    metadata={"desk": "compliance", "application": app_id, "confidence": compliance_check["confidence"]},
    conversation_id="{}-compliance".format(app_id),
)

# --- Committee Chair: cross-desk synthesis and final decision ---
committee_decision = committee_chair.query_with_reasoning(
    "Summarize all desk findings for application {} and produce the final "
    "credit committee decision with all conditions stated explicitly.".format(app_id),
    llm_provider=llm,
    max_results=25,
    max_hops=3,
)
print(committee_decision["response"])

# Record the final decision — this is what the regulator sees
committee_chair.record_decision(
    category="credit_committee",
    scenario="Final committee decision {}".format(app_id),
    reasoning=committee_decision["reasoning_path"],
    outcome="approved_with_conditions_lmi",
    confidence=committee_decision["confidence"],
    entities=[app_id, "LTV_78pct", "DSTI_35pct"],
    decision_maker="credit_committee_2025",
)

# Per-desk audit retrieval
risk_thread       = committee_chair.conversation("{}-risk".format(app_id))
compliance_thread = committee_chair.conversation("{}-compliance".format(app_id))

committee_chair.save("./credit_files/{}/context/".format(app_id))
```

</Tab>
</Tabs>

## 记忆隔离参考

当多个 Agent 写入共享上下文时，使用 `conversation_id` 隔离各自的数据流，并分别检索。

```python
# Tag a memory to an agent's namespace
context.store("Finding: lateral movement confirmed", conversation_id="tier2-ir")

# Retrieve only that agent's memories
tier2_history = context.retrieve("lateral movement", conversation_id="tier2-ir")

# Get the full ordered history for a namespace
full_history = context.conversation("tier2-ir", max_items=100)

# Delete an agent's entire namespace
context.forget(conversation_id="tier2-ir")
```

同样的模式也适用于用户范围的隔离——将 `conversation_id` 替换为 `user_id`：

```python
context.store("...", user_id="analyst-jsmith")
context.retrieve("...", user_id="analyst-jsmith")
```

## 相关指南

- [Agent 记忆](/zh/guides/agent-memory) — 记忆存储、检索、持久化，以及每个 Agent 内部使用的工作记忆窗口
- [上下文图](/zh/guides/context-graphs) — 直接构建和遍历共享的 `ContextGraph`；时间区间推理；在插入节点前进行实体消解
- [决策智能](/zh/guides/decision-intelligence) — 通过因果链分析记录并追踪跨 Agent 交接的决策
- [LLM 集成](/zh/guides/llm-integrations) — 配置传给每个 Agent 中 `query_with_reasoning()` 的 LLM 提供方