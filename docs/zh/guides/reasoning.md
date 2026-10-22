---
title: "推理与规则"
description: "在知识图谱上应用前向链、后向链、Datalog、SPARQL、RETE、时间区间和基于 LLM 的推理 —— 推导新事实、检查约束并解释推理过程。"
sourceHash: "0411a1c142233d3aafc7bc779a79cc9a842295cd86f46a20612030a0dec788dd"
---

Semantica 的推理层将领域逻辑编码为规则，并将其应用到知识图谱上，从而推导出任何单一文档都未明确陈述的结论。八种互补的推理模式 —— 从符号规则前向链到递归 Datalog 以及由 LLM 支持的自由形式查询 —— 让你无需切换框架，即可为每个推理问题选择恰当的工具。

## 什么是推理？

推理使用逻辑规则从显式事实中推导出隐式知识。与检索、搜索或图遍历不同，推理会生成原始数据中未直接陈述的新结论。

**推理 vs. 检索：** 检索查找与你的查询匹配的现有信息。推理则应用逻辑规则推导出未显式存储的新事实。

**推理 vs. 搜索：** 搜索匹配关键词或语义相似度。推理使用逻辑推断得出结论，例如“如果 A 蕴含 B，且 A 为真，则 B 必然为真”。

**推理 vs. 图遍历：** 遍历沿着节点之间已有的边前进。推理则可以基于规则推断出新关系 —— 例如，即使不存在直接边，也能得出两个实体相关的结论。

## 为什么使用推理？

**推导隐式知识。** 文档可能分别陈述“APT29 使用 SUNBURST”和“SUNBURST 利用 CVE-2020-10148”，但推理会自动得出“APT29 利用 CVE-2020-10148”。

**识别模式。** 规则可以检测知识图谱中的复杂模式 —— 共享 TTP 的威胁行为者、处于传递关系中的供应商，或由条件组合而产生的合规违规。

**支持调查。** 推理通过突出非显而易见的关联、标记满足风险标准的实体，并解释得出结论的原因，来帮助分析师。

**决策支持。** 将策略、法规或业务规则编码为逻辑陈述。推理引擎会一致地评估它们，并为决策提供审计轨迹。

## 何时使用 / 何时不使用

**使用推理的场景：**
- 具有明确定义逻辑关系的复杂领域
- 策略执行与合规检查
- 结论依赖于事实链的多步推理
- 需要可解释决策与审计轨迹的场景
- 识别未明确陈述的隐式关系

**检索可能已足够：**
- 查找能直接回答你问题的文档或信息
- 你不知道要寻找何种模式的探索性研究
- 简单的关键词或语义搜索

**图遍历可能已足够：**
- 沿实体之间的显式关系前进
- 围绕已知起点的邻域分析
- 在具有直接连接的实体之间寻找路径

**推理在以下情况下提供额外价值：**
- 你的领域具有可推断新事实的逻辑规则
- 你需要检测需要多个条件的模式
- 决策必须可解释且可审计
- 隐式关系与显式关系同等重要

## 关键推理概念

**Datalog** 是一种基于规则和事实的逻辑编程语言。事实是简单陈述，例如“parent(tom, bob)”。规则推导新事实：“grandparent(X, Z) :- parent(X, Y), parent(Y, Z)”。Datalog 擅长递归查询和传递关系。

**SPARQL** 是用于 RDF 数据的查询语言，可以纳入推理规则。它使用三元组模式来匹配图数据，并可扩展推理功能，在查询前推导隐式三元组。

**RETE** 是一种针对事实工作记忆高效评估大量规则的算法。它构建一个网络，避免重新评估未变化的条件，适用于拥有数百条规则或流式数据的系统。

**基于规则的推理** 应用“如果-那么”规则来推导新结论。前向链应用所有适用规则以推导出所有可能的结论。后向链从目标反向工作，以找到最小证明。

## 图数据如何成为推理事实

使用 `DatalogReasoner.load_from_graph()` 时，知识图谱的节点和边会被转换为 Datalog 事实。所有谓词和参数均转为小写：

- 类型为 "ThreatActor"、id 为 "APT29" 的节点变为 `threatactor(apt29)`
- 从 APT29 到 SUNBURST 且类型为 "uses" 的边变为 `uses(apt29, sunburst)`

推理引擎将这些事实作为推理的起点，应用规则推导出新的结论，并将其加入工作记忆。

<Info>
推理模块作用于你直接提供的事实，或从 `ContextGraph` 加载的事实。推导出的事实会被加入工作记忆，并可在同一会话中立即用于进一步推理。要将推导出的事实持久化回图中，请将它们传递给 `AgentContext.store()`。
</Info>

## 选择推理模式

| 模式 | 最适合 | 类 |
|---|---|---|
| 前向链 | 从基本事实物化所有隐含事实 | `Reasoner.forward_chain()` |
| 后向链 | 证明特定目标；获取最小证据链 | `Reasoner.backward_chain()` |
| Datalog | 任意深度的递归遍历（供应链、组织图） | `DatalogReasoner` |
| SPARQL | 在增强工作记忆上进行模式匹配查询 | `SPARQLReasoner` |
| RETE | 100+ 规则集 —— 通过 alpha/beta 网络进行增量事实传播 | `ReteEngine` |
| 时间 | 时间窗口之间的 Allen 区间关系 | `TemporalReasoningEngine` |
| 自然语言 | 在图形上下文上由 LLM 支持的自由形式查询 | `GraphReasoner` |
| 解释 | 将推理结果转化为人类可读的论证 | `ExplanationGenerator` |

## 步骤 1 —— 基本事实与工作记忆

`Reasoner` 类维护一组基本事实和规则列表。事实可以作为谓词字符串添加，或从 `ContextGraph` 加载。从你的提取管道产生的显式知识开始：

```python
from semantica.reasoning import Reasoner, Rule, RuleType

reasoner = Reasoner()

# Ground facts: Predicate(arg) or Predicate(arg1, arg2)
reasoner.add_fact("ThreatActor(APT29)")
reasoner.add_fact("ThreatActor(GAMMA-7)")
reasoner.add_fact("ThreatActor(DELTA-3)")
reasoner.add_fact("Exploits(APT29, CVE-2025-3400)")
reasoner.add_fact("Exploits(GAMMA-7, CVE-2025-1234)")
reasoner.add_fact("Exploits(GAMMA-7, CVE-2025-5678)")
reasoner.add_fact("CriticalVuln(CVE-2025-3400)")
reasoner.add_fact("CriticalVuln(CVE-2025-1234)")
reasoner.add_fact("CriticalVuln(CVE-2025-5678)")
reasoner.add_fact("Targets(APT29, NATOLogistics)")
reasoner.add_fact("Targets(GAMMA-7, NATOLogistics)")
reasoner.add_fact("SuppliedExploits(DELTA-3, GAMMA-7)")
reasoner.add_fact("SectorOverlap(NATOLogistics, CriticalInfrastructure)")
```

这些基本事实代表文档明确陈述的内容。你接下来添加的规则告诉系统这些事实*蕴含*了什么。

## 步骤 2 —— 前向链：物化推导出的事实

前向链从基本事实出发，应用每条匹配的规则，直到无法得出新结论 —— 达到不动点：

```python
# String-format rules are parsed automatically
# Variables are single uppercase letters or multi-character uppercase words
reasoner.add_rule(
    "IF ThreatActor(X) AND Exploits(X, Y) AND CriticalVuln(Y) THEN HighRiskActor(X)"
)
reasoner.add_rule(
    "IF HighRiskActor(X) AND Targets(X, Z) THEN CriticalTarget(Z)"
)
reasoner.add_rule(
    "IF SuppliedExploits(A, B) AND HighRiskActor(B) THEN HighRiskSupplier(A)"
)

# forward_chain() applies all rules until fixpoint
derived = reasoner.forward_chain()

for result in derived:
    print("{:<40s}  conf={:.0%}  rule={}".format(
        result.conclusion,
        result.confidence,
        result.rule_used.name if result.rule_used else "n/a",
    ))
```

```text
HighRiskActor(APT29)                      conf=100%  rule=Rule 1
HighRiskActor(GAMMA-7)                    conf=100%  rule=Rule 1
CriticalTarget(NATOLogistics)             conf=100%  rule=Rule 2
HighRiskSupplier(DELTA-3)                 conf=100%  rule=Rule 3
```

即使没有任何文档这样描述 DELTA-3，它也被标记出来 —— 系统追踪到：DELTA-3 供应了 GAMMA-7，而 GAMMA-7 利用了关键 CVE。对于需要优先级排序或分级置信度的规则，请使用 `Rule` 数据类：

如果规则具有产生副作用的行为，则在某个 Reasoner 实例上，一个具体激活最多执行这些行为一次。因此重新运行 `forward_chain()` 是安全的：已尝试的行为不会重复执行。若你确实希望重放这些行为，请使用 `reasoner.reset_action_history()`；`reasoner.clear()` 和 `reasoner.reset()` 也会清除历史记录。

```python
# Higher priority rules fire first; confidence propagates into InferenceResult.confidence
reasoner.add_rule(Rule(
    rule_id="attr-1",
    name="ttp_match_attribution",
    conditions=["ThreatActor(X)", "Exploits(X, CVE)", "CriticalVuln(CVE)"],
    conclusion="HighRiskActor(X)",
    rule_type=RuleType.IMPLICATION,
    confidence=0.92,
    priority=10,
))

reasoner.add_rule(Rule(
    rule_id="attr-2",
    name="supplier_elevation",
    conditions=["SuppliedExploits(A, B)", "HighRiskActor(B)"],
    conclusion="HighRiskSupplier(A)",
    rule_type=RuleType.IMPLICATION,
    confidence=0.85,
    priority=5,
))
```

## 步骤 3 —— 后向链：证明特定目标

后向链通过规则反向工作来测试单一假设 —— 当你需要“是/否”答案和最小证据链，而无需先推导出所有其他可能的事实时，这是正确的工具：

```python
# backward_chain() returns an InferenceResult if the goal is provable, None otherwise
result = reasoner.backward_chain("HighRiskSupplier(DELTA-3)", max_depth=5)

if result:
    print("Proved: {}".format(result.conclusion))
    print("Via premises:")
    for p in result.premises:
        print("  - {}".format(p))
    print("Confidence: {:.0%}".format(result.confidence))
else:
    print("Goal not provable — DELTA-3 is not classified as a high-risk supplier "
          "given current facts and rules")
```

```text
Proved: HighRiskSupplier(DELTA-3)
Via premises:
  - SuppliedExploits(DELTA-3, GAMMA-7)
  - HighRiskActor(GAMMA-7)
Confidence: 85%
```

前提列表就是解释链 —— 其中每一项都是得出结论所必需的事实。当分析师问“为什么 DELTA-3 被归类为高风险？”时，向他们展示这些内容。

## 步骤 4 —— 使用 Datalog 进行递归推理

`DatalogReasoner` 处理需要任意深度遍历的问题 —— “哪些行为者可以传递地到达关键基础设施？” —— 使用带半朴素自底向上不动点求值的递归 Horn 子句规则：

```python
from semantica.reasoning import DatalogReasoner

dl = DatalogReasoner()

# EDB (Extensional DB) — base facts; arguments are constants (lowercase)
dl.add_fact("supplied(delta3, gamma7)")
dl.add_fact("supplied(gamma7, apt29_affiliate)")
dl.add_fact("supplied(apt29_affiliate, apt29)")
dl.add_fact("targets(apt29, nato_logistics)")
dl.add_fact("targets(gamma7, nato_logistics)")
dl.add_fact("sector(nato_logistics, critical_infrastructure)")

# IDB (Intensional DB) — recursive rules; uppercase = variable
# Base case: direct supply link
dl.add_rule("reaches(X, Y) :- supplied(X, Y).")
# Recursive case: X reaches Y if X supplies Z and Z reaches Y
dl.add_rule("reaches(X, Y) :- supplied(X, Z), reaches(Z, Y).")

# Derived predicate combining reachability with sector membership
dl.add_rule("sector_exposure(Actor, Sector) :- reaches(Actor, Target), sector(Target, Sector).")
dl.add_rule("sector_exposure(Actor, Sector) :- targets(Actor, Target), sector(Target, Sector).")

# derive_all() runs semi-naive fixpoint until no new facts emerge
dl.derive_all()

# Query with free variables — returns list of binding dicts
exposures = dl.query("sector_exposure(?actor, critical_infrastructure)")
for row in exposures:
    print("CI-exposed actor: {}".format(row["actor"]))
```

```text
CI-exposed actor: delta3
CI-exposed actor: gamma7
CI-exposed actor: apt29_affiliate
CI-exposed actor: apt29
```

即使没有文档将 DELTA-3 直接与关键基础设施关联，它仍会出现。Datalog 追踪了完整链路：delta3 → gamma7 → apt29_affiliate → apt29 → nato_logistics → critical_infrastructure。

绑定变量以提出有向问题：

```python
# Which sectors does delta3 have exposure to?
rows = dl.query("sector_exposure(delta3, ?sector)")
for row in rows:
    print("delta3 → sector: {}".format(row["sector"]))
```

通过直接加载 `ContextGraph` 跳过手动调用 `add_fact()`：

```python
from semantica.context import ContextGraph

graph = ContextGraph()
# ... graph populated by AgentContext.store() or extraction pipeline ...
count = dl.load_from_graph(graph)
print("Loaded {} facts from graph".format(count))
```

## 步骤 5 —— 在增强工作记忆上进行 SPARQL 查询

前向链推导出新事实后，`SPARQLReasoner` 在增强的工作记忆上准备 SPARQL 查询，并可选进行推理扩展：

```python
from semantica.reasoning import SPARQLReasoner

sparql = SPARQLReasoner()

# Inference rules expand the SPARQL query before execution
sparql.add_inference_rule(
    "IF ThreatActor(X) AND Exploits(X, Y) AND CriticalVuln(Y) THEN HighRiskActor(X)"
)

query = """
    SELECT ?actor ?cve WHERE {
        ?actor <Exploits> ?cve .
        ?cve   <CriticalVuln> true .
    }
"""

# expand_query() applies inference rules to the query text:
expanded = sparql.expand_query(query)
print(expanded)
```

`execute_query()` 尚未实现：不存在三元组存储的执行路径，因此它会抛出 `NotImplementedError`，而不是返回一个空结果集，以免调用方误读为“无匹配”。在实现执行功能之前，请直接针对你的 RDF 存储运行扩展后的查询（例如使用 `rdflib`）。

在运行之前检查扩展后的查询：

```python
# See the query after inference rules are applied
expanded = sparql.expand_query(query)
print(expanded)
```

## 步骤 6 —— 用于大型规则集的 RETE 引擎

`ReteEngine` 实现了 RETE 算法 —— 一个由 alpha 节点（单条件匹配）和 beta 节点（连接操作）组成的网络，避免在每条新事实到来时重新评估未变化的条件。当你拥有 100+ 规则，或需要在流式或事件驱动环境中进行增量事实传播时，请使用它：

```python
from semantica.reasoning import ReteEngine, Rule, RuleType, Fact

# Define rules as Rule objects — same Rule class used by Reasoner
rules = [
    Rule(
        rule_id="r1", name="port_scan_detected",
        conditions=["PortScan(Source)", "HighFrequency(Source)"],
        conclusion="Scanning(Source)",
        confidence=0.90, priority=10,
    ),
    Rule(
        rule_id="r2", name="c2_beacon_identified",
        conditions=["Scanning(Source)", "BeaconPattern(Source, Dest)"],
        conclusion="C2Channel(Source, Dest)",
        confidence=0.85, priority=8,
    ),
    Rule(
        rule_id="r3", name="lateral_movement_detected",
        conditions=["C2Channel(Source, Dest)", "InternalHost(Dest)"],
        conclusion="LateralMovement(Source, Dest)",
        confidence=0.80, priority=5,
    ),
]

engine = ReteEngine()
engine.build_network(rules)   # compile rules into alpha/beta/terminal node network

# Facts are structured: Fact(fact_id, predicate, [arguments])
engine.add_fact(Fact("f1", "PortScan",      ["192.168.1.50"]))
engine.add_fact(Fact("f2", "HighFrequency", ["192.168.1.50"]))
engine.add_fact(Fact("f3", "BeaconPattern", ["192.168.1.50", "10.0.0.5"]))
engine.add_fact(Fact("f4", "InternalHost",  ["10.0.0.5"]))

# match_patterns() returns Match objects: rule + matched facts + confidence
matches = engine.match_patterns()
print("Rule activations: {}".format(len(matches)))

# execute_matches() fires each matched rule and returns the derived conclusions
conclusions = engine.execute_matches(matches)
for c in conclusions:
    print("Derived:", c)

# Network diagnostics — useful for verifying rule compilation
stats = engine.get_network_stats()
print("Nodes: {total_nodes}  Alpha: {alpha_nodes}  Beta: {beta_nodes}  Facts: {facts}".format(**stats))

# Clear working memory without recompiling the rule network
engine.reset()
```

规则网络由 `build_network()` 编译一次。之后每次 `add_fact()` 调用仅将其增量传播到满足其条件的节点 —— 而非整个规则集 —— 这使得评估成本与新增激活的数量成正比，而非与规则总数成正比。

当绑定 Reasoner 时，Rete 行为副作用会按规则、绑定和匹配事实身份各尝试一次。将同一匹配再次传递给 `execute_matches()` 仍会返回相同结论，但不会重复其行为。调用 `engine.reset_action_history()` 可以在不清空工作记忆的情况下重放行为。`engine.reset()` 和 `engine.build_network()` 也会清除行为历史。

## 步骤 7 —— 时间区间推理

`TemporalReasoningEngine` 计算时间窗口之间的 Allen 区间关系，让你能够识别两个事件是否重叠、一个包含另一个、它们在边界处相接，等等，贯穿你的图：

```python
from datetime import datetime, timezone
from semantica.reasoning import TemporalReasoningEngine, TemporalInterval, IntervalRelation

engine = TemporalReasoningEngine()

def dt(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)

# Encode time windows as datetimes
nightfall  = TemporalInterval(start=dt("2025-01-01T00:00:00Z"), end=dt("2025-03-31T23:59:59Z"))
sandstorm  = TemporalInterval(start=dt("2025-03-15T00:00:00Z"), end=dt("2025-06-30T23:59:59Z"))
frostbite  = TemporalInterval(start=dt("2025-07-01T00:00:00Z"), end=dt("2025-09-30T23:59:59Z"))

relation_ns = engine.relation(nightfall, sandstorm)
relation_nf = engine.relation(nightfall, frostbite)

print("NIGHTFALL vs SANDSTORM:", relation_ns)
# IntervalRelation.OVERLAPS — both active simultaneously in mid-March 2025
# Warrants investigation for shared C2 infrastructure or coordination

print("NIGHTFALL vs FROSTBITE:", relation_nf)
# IntervalRelation.BEFORE — no temporal overlap; likely independent campaigns
```

13 种 Allen 关系涵盖了所有可能的时间关系：

| 关系 | 含义 |
|---|---|
| `BEFORE` | A 在 B 开始前结束 |
| `MEETS` | A 在 B 开始处结束（无间隙，无重叠） |
| `OVERLAPS` | A 在 B 之前开始，并在 B 期间结束 |
| `STARTS` | A 和 B 同时开始；A 先结束 |
| `DURING` | A 完全包含在 B 内 |
| `FINISHES` | A 和 B 同时结束；A 开始较晚 |
| `EQUALS` | A 和 B 是完全相同的区间 |
| `AFTER`、`MET_BY`、`OVERLAPPED_BY`、`STARTED_BY`、`CONTAINS`、`FINISHED_BY` | 上述关系的逆关系 |

如果两个归因于不同行为者的行动之间出现 `OVERLAPS` 或 `EQUALS` 结果，这是一个值得标记给分析师审查的信号 —— 时间上的巧合只是假设，而非结论。

## 步骤 8 —— 基于 LLM 的图推理

`GraphReasoner` 通过 LLM 提供者路由自由形式的自然语言查询，使用图作为接地上下文。适用于无法清晰映射到预定义规则集的探索性问题：

```python
from semantica.reasoning import GraphReasoner
from semantica.context import ContextGraph

# Initialise with any supported LLM provider
gr = GraphReasoner(provider="openai", model="gpt-4o-mini")

# Build a knowledge graph
graph = ContextGraph()
graph.add_node("apt29",          "ThreatActor",   "APT29 / NOBELIUM", country="Russia")
graph.add_node("cve-2025-3400",  "Vulnerability", "PAN-OS RCE",       cvss=9.8)
graph.add_node("nato_logistics", "Target",        "NATO Logistics Network")
graph.add_edge("apt29", "cve-2025-3400",  "exploits", weight=0.97)
graph.add_edge("apt29", "nato_logistics", "targets",  weight=0.88)

# GraphReasoner expects {"entities": [...], "relationships": [...]}
raw = graph.to_dict()
graph_data = {
    "entities":      raw.get("nodes", []),
    "relationships": raw.get("edges", []),
}

answer = gr.reason(
    graph=graph_data,
    query="Which threat actors pose the highest risk to NATO infrastructure, "
          "and what evidence in the graph supports that assessment?"
)
print(answer)
```

`GraphReasoner` 非常适合早期调查 —— 当问题是探索性的，且你尚未形式化推理规则时。对于可复现、可审计的决策，请改用 `Reasoner` 或 `DatalogReasoner`。

## 步骤 9 —— 用自然语言解释推理

`ExplanationGenerator` 将任何 `InferenceResult`（来自前向链或后向链）转化为人类可读的解释、逐步的 `ReasoningPath` 以及带有支持证据的 `Justification`：

```python
from semantica.reasoning import Reasoner, Rule, RuleType, ExplanationGenerator

# Run inference first
reasoner = Reasoner()
reasoner.add_fact("ThreatActor(APT29)")
reasoner.add_fact("Exploits(APT29, CVE-2025-3400)")
reasoner.add_fact("CriticalVuln(CVE-2025-3400)")

reasoner.add_rule(Rule(
    rule_id="r1", name="high_risk_actor",
    conditions=["ThreatActor(X)", "Exploits(X, Y)", "CriticalVuln(Y)"],
    conclusion="HighRiskActor(X)",
    confidence=0.92,
))

derived = reasoner.forward_chain()

# detail_level options: "simple", "detailed", "verbose"
gen = ExplanationGenerator(generate_nl=True, detail_level="detailed")

for result in derived:
    exp = gen.generate_explanation(result)
    print("Conclusion:  {}".format(exp.conclusion))
    print("Explanation: {}".format(exp.natural_language))
    print()

    # Step-by-step reasoning path
    path = gen.show_reasoning_path(result)
    print("Reasoning path ({} steps, confidence {:.0%}):".format(
        len(path.steps), path.total_confidence
    ))
    for step in path.steps:
        print("  [{}] {}".format(step.step_id, step.description))

    # Justification with full evidence list
    just = gen.justify_conclusion(result.conclusion, path)
    print("Justification: {}".format(just.explanation_text))
    print("Supporting evidence: {}".format(just.supporting_evidence))
```

```text
Conclusion:  HighRiskActor(APT29)
Explanation: Given the premises: ThreatActor(APT29), Exploits(APT29, CVE-2025-3400),
             CriticalVuln(CVE-2025-3400), we conclude: HighRiskActor(APT29)
             using rule 'high_risk_actor'.
```

三种详细程度控制解释的冗长度：`"simple"` 给出一行摘要，`"detailed"` 列出前提和规则名称，`"verbose"` 生成完整的带置信度注释的叙述。

## 综合运用：完整的推理管道

一个结合前向链、Datalog 可达性和自然语言解释的威胁情报图管道：

```python
from semantica.reasoning import (
    Reasoner, Rule, RuleType,
    DatalogReasoner, ExplanationGenerator,
)
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore


def run_threat_reasoning(graph: ContextGraph) -> dict:
    """Apply inference rules to a threat intelligence graph."""

    # --- Forward chaining: derive actor classifications ---
    reasoner = Reasoner()

    for edge in graph.find_edges():
        src = edge.get("source", "")
        dst = edge.get("target", "")
        rel = edge.get("type", "related_to")
        if src and dst:
            reasoner.add_fact("{}({}, {})".format(rel.replace(" ", "_"), src, dst))

    for node in graph.find_nodes():
        name  = node.get("name", node.get("id", ""))
        ntype = node.get("type", "Entity")
        if name:
            reasoner.add_fact("{}({})".format(ntype.replace(" ", "_"), name))

    reasoner.add_rule(Rule(
        rule_id="r1", name="high_risk_actor",
        conditions=["ThreatActor(X)", "Exploits(X, CVE)", "CriticalVuln(CVE)"],
        conclusion="HighRiskActor(X)", confidence=0.92, priority=10,
    ))
    reasoner.add_rule(Rule(
        rule_id="r2", name="critical_target",
        conditions=["HighRiskActor(X)", "Targets(X, Z)"],
        conclusion="CriticalTarget(Z)", confidence=0.88, priority=8,
    ))
    reasoner.add_rule(Rule(
        rule_id="r3", name="supplier_elevation",
        conditions=["SuppliedExploits(A, B)", "HighRiskActor(B)"],
        conclusion="HighRiskSupplier(A)", confidence=0.85, priority=5,
    ))

    derived = reasoner.forward_chain()

    high_risk_actors    = [r for r in derived if "HighRiskActor"    in r.conclusion]
    critical_targets    = [r for r in derived if "CriticalTarget"   in r.conclusion]
    high_risk_suppliers = [r for r in derived if "HighRiskSupplier" in r.conclusion]

    # --- Backward chaining: verify a specific supplier hypothesis ---
    supplier_result = reasoner.backward_chain("HighRiskSupplier(DELTA-3)", max_depth=5)

    # --- Datalog: transitive supply-chain reachability ---
    dl = DatalogReasoner()
    dl.load_from_graph(graph)
    dl.add_rule("reaches(X, Y) :- supplied(X, Y).")
    dl.add_rule("reaches(X, Y) :- supplied(X, Z), reaches(Z, Y).")
    dl.add_rule("sector_exposure(Actor, Sector) :- reaches(Actor, T), sector(T, Sector).")
    dl.add_rule("sector_exposure(Actor, Sector) :- targets(Actor, T), sector(T, Sector).")
    dl.derive_all()
    ci_exposures = dl.query("sector_exposure(?actor, critical_infrastructure)")

    # --- ExplanationGenerator: analyst-readable justifications ---
    gen = ExplanationGenerator(generate_nl=True, detail_level="detailed")
    explanations = {}
    for result in high_risk_actors:
        exp = gen.generate_explanation(result)
        explanations[result.conclusion] = exp.natural_language

    return {
        "high_risk_actors":    [r.conclusion for r in high_risk_actors],
        "critical_targets":    [r.conclusion for r in critical_targets],
        "high_risk_suppliers": [r.conclusion for r in high_risk_suppliers],
        "delta3_flagged":      supplier_result is not None,
        "ci_exposed_actors":   [row["actor"] for row in ci_exposures],
        "total_derived":       len(derived),
        "explanations":        explanations,
    }


intel_graph = ContextGraph(advanced_analytics=True)
agent = AgentContext(
    vector_store=VectorStore(backend="faiss", dimension=768),
    knowledge_graph=intel_graph,
)
# ... populate via agent.store() or extraction pipeline ...

report = run_threat_reasoning(intel_graph)
print("Derived {} new facts".format(report["total_derived"]))
print("High-risk actors:  {}".format(report["high_risk_actors"]))
print("CI-exposed actors: {}".format(report["ci_exposed_actors"]))
print("DELTA-3 flagged:   {}".format(report["delta3_flagged"]))

for conclusion, text in report["explanations"].items():
    print("\n[{}]\n  {}".format(conclusion, text))
```

## 领域示例

<Tabs>

<Tab title="国防 — CTI/威胁">

威胁情报中的归因链需要多跳置信度传播：TTP 匹配会提高行为体归因的概率，佐证的 ASN 地理位置信息会进一步提高该概率，而已知的目标行业模式则会将其提升至可付诸行动的置信度。每一跳都是一条独立规则，各自带有自己的置信度权重，而 `InferenceResult` 会在整条链中携带传播后的值。

```python
from semantica.reasoning import Reasoner, Rule, RuleType

reasoner = Reasoner()

# SIGINT-derived facts
reasoner.add_fact("C2Beacon(10.0.0.5, AS59796)")
reasoner.add_fact("ASN_Country(AS59796, Russia)")
reasoner.add_fact("TTP(T1566.001, APT29)")           # MITRE ATT&CK mapping
reasoner.add_fact("ObservedTTP(10.0.0.5, T1566.001)")
reasoner.add_fact("TargetSector(10.0.0.5, Aerospace)")

# Three-stage attribution ruleset with confidence ladder
reasoner.add_rule(Rule(
    rule_id="attr-1", name="ttp_match",
    conditions=["ObservedTTP(IP, TTP)", "TTP(TTP, Actor)"],
    conclusion="SuspectedActor(IP, Actor)",
    confidence=0.75, priority=10,
))
reasoner.add_rule(Rule(
    rule_id="attr-2", name="asn_corroboration",
    conditions=["SuspectedActor(IP, Actor)", "C2Beacon(IP, ASN)", "ASN_Country(ASN, Country)"],
    conclusion="CorroboratedActor(IP, Actor, Country)",
    confidence=0.90, priority=5,
))
reasoner.add_rule(Rule(
    rule_id="attr-3", name="sector_confirmation",
    conditions=["CorroboratedActor(IP, Actor, Russia)", "TargetSector(IP, Aerospace)"],
    conclusion="HighConfidenceAttribution(IP, Actor)",
    confidence=0.95, priority=1,
))

derived = reasoner.forward_chain()
attributions = [r for r in derived if "HighConfidenceAttribution" in r.conclusion]

for a in attributions:
    print("{:50s}  conf={:.0%}".format(a.conclusion, a.confidence))
    print("  Premises: {}".format(a.premises))

# HighConfidenceAttribution(10.0.0.5, APT29)    conf=95%
#   Premises: ['SuspectedActor(10.0.0.5, APT29)', 'CorroboratedActor(10.0.0.5, APT29, Russia)', ...]
```

</Tab>

<Tab title="安全 — SOC/事件响应">

零信任访问控制决策可以在查询时通过将策略编码为规则、并针对具体的访问请求进行反向链推理来评估。证明本身——或证明的缺失——就是可解释的决策记录，可直接用于审计。

如果反向链失败，部分结果中的前提列表会准确告诉分析人员哪一项策略条件未满足——这远比笼统的“访问被拒绝”消息有用。

```python
from semantica.reasoning import Reasoner, Rule, RuleType

reasoner = Reasoner()

# Identity and resource facts for the current session
reasoner.add_fact("User(alice)")
reasoner.add_fact("HasMFA(alice)")
reasoner.add_fact("Role(alice, analyst)")
reasoner.add_fact("Clearance(alice, SECRET)")
reasoner.add_fact("Resource(kube-api, tier1)")
reasoner.add_fact("RequiresClearance(kube-api, SECRET)")
reasoner.add_fact("RequiresMFA(tier1)")

# Zero-trust access policy as inference rules
reasoner.add_rule(
    "IF User(U) AND HasMFA(U) AND RequiresMFA(T) AND Resource(R, T) THEN MFASatisfied(U, R)"
)
reasoner.add_rule(
    "IF User(U) AND Clearance(U, C) AND RequiresClearance(R, C) THEN ClearanceSatisfied(U, R)"
)
reasoner.add_rule(
    "IF MFASatisfied(U, R) AND ClearanceSatisfied(U, R) THEN AccessGranted(U, R)"
)

# Backward-chain the access decision
result = reasoner.backward_chain("AccessGranted(alice, kube-api)", max_depth=5)

if result:
    print("ACCESS GRANTED: {}".format(result.conclusion))
    print("Justified by:")
    for p in result.premises:
        print("  - {}".format(p))
else:
    print("ACCESS DENIED — one or more policy conditions not satisfied")
    partial = reasoner.forward_chain()
    for r in partial:
        print("  Partial: {}".format(r.conclusion))
```

</Tab>

<Tab title="生命科学 — 临床/制药">

药物-药物相互作用检测天然适合前向链推理：关于酶抑制与代谢通路的事实是静态的，关于相互作用风险的规则是标准化的药理学知识，而输出——一条 `ClinicallySignificantInteraction` 派生事实——需要在处方确认之前可靠触发。

Datalog 可处理传递性情形：如果药物 A 诱导酶 E1，而 E1 代谢药物 B，那么完整暴露链可以被递归追溯，而无需预先知道其深度。

```python
from semantica.reasoning import Reasoner, DatalogReasoner

# Forward-chain: detect clinically significant interactions
reasoner = Reasoner()

reasoner.add_fact("Metabolizes(CYP2C9, Warfarin)")
reasoner.add_fact("Inhibits(Amiodarone, CYP2C9)")
reasoner.add_fact("DrugInPatient(Warfarin)")
reasoner.add_fact("DrugInPatient(Amiodarone)")
reasoner.add_fact("TherapeuticWindow(Warfarin, narrow)")

reasoner.add_rule(
    "IF Inhibits(DrugA, Enzyme) AND Metabolizes(Enzyme, DrugB) "
    "AND DrugInPatient(DrugA) AND DrugInPatient(DrugB) "
    "THEN PotentialInteraction(DrugA, DrugB)"
)
reasoner.add_rule(
    "IF PotentialInteraction(DrugA, DrugB) AND TherapeuticWindow(DrugB, narrow) "
    "THEN ClinicallySignificantInteraction(DrugA, DrugB)"
)

derived = reasoner.forward_chain()
for r in derived:
    if "ClinicallySignificant" in r.conclusion:
        print("ALERT: {}  (conf={:.0%})".format(r.conclusion, r.confidence))
        print("  Rule: {}".format(r.rule_used.name if r.rule_used else "n/a"))

# ALERT: ClinicallySignificantInteraction(Amiodarone, Warfarin)  (conf=100%)

# Datalog: transitive enzyme induction chain
dl = DatalogReasoner()
dl.add_fact("metabolises(CYP3A4, midazolam)")
dl.add_fact("metabolises(CYP3A4, cyclosporin)")
dl.add_fact("induces(rifampicin, CYP3A4)")
dl.add_rule("reduces_exposure(X, Drug) :- induces(X, Enzyme), metabolises(Enzyme, Drug).")
dl.add_rule("reduces_exposure(X, Drug) :- induces(X, Z), reduces_exposure(Z, Drug).")

dl.derive_all()
reductions = dl.query("reduces_exposure(rifampicin, ?drug)")
for row in reductions:
    print("Rifampicin reduces exposure to: {}".format(row["drug"]))

# Rifampicin reduces exposure to: midazolam
# Rifampicin reduces exposure to: cyclosporin
```

</Tab>

<Tab title="银行 — 风险/合规">

巴塞尔协议 III 的资本充足率规则可以自然地转换为前向链推理规则：每一项监管条件都是一个事实，每一条条款都是一条规则，而资本决策是一个派生结论。规则链即为审计轨迹——检查人员可以准确查看哪些条件被触发以及以何种顺序触发。

反向链推理可用于压力测试：“在什么条件下这笔贷款会获得 `ConditionalApproval`？”通过证明目标并呈现所需事实的最小集合来回答。

```python
from semantica.reasoning import Reasoner, Rule, RuleType

reasoner = Reasoner()

# Loan application facts
reasoner.add_fact("Loan(LOAN-2025-88421)")
reasoner.add_fact("LTV(LOAN-2025-88421, 0.78)")
reasoner.add_fact("PD(LOAN-2025-88421, 0.023)")
reasoner.add_fact("LGD(LOAN-2025-88421, 0.45)")
reasoner.add_fact("AssetClass(LOAN-2025-88421, CRE)")
reasoner.add_fact("DSCR(LOAN-2025-88421, 1.12)")

# Basel III CRE20 capital rules
reasoner.add_rule(Rule(
    rule_id="cre20-1", name="ltv_rwa_bucket",
    conditions=["Loan(L)", "LTV(L, V)", "AssetClass(L, CRE)"],
    conclusion="RWABucket(L, high)",
    confidence=0.98, priority=10,
))
reasoner.add_rule(Rule(
    rule_id="cre20-2", name="dscr_adequate",
    conditions=["Loan(L)", "DSCR(L, D)"],
    conclusion="DSCRAdequate(L)",
    confidence=0.95, priority=8,
))
reasoner.add_rule(Rule(
    rule_id="cre20-3", name="conditional_approval",
    conditions=["Loan(L)", "RWABucket(L, high)", "DSCRAdequate(L)"],
    conclusion="ConditionalApproval(L)",
    confidence=0.87, priority=5,
))

derived = reasoner.forward_chain()
for r in derived:
    print("{:45s}  [{:.0%}]".format(r.conclusion, r.confidence))

# RWABucket(LOAN-2025-88421, high)                  [98%]
# DSCRAdequate(LOAN-2025-88421)                      [95%]
# ConditionalApproval(LOAN-2025-88421)               [87%]

# Audit: prove the approval decision and show its full justification
proof = reasoner.backward_chain("ConditionalApproval(LOAN-2025-88421)", max_depth=5)
if proof:
    print("\nAudit trail for {}:".format(proof.conclusion))
    for p in proof.premises:
        print("  - {}".format(p))
```

</Tab>

</Tabs>

## 常见陷阱

**过度使用推理。** 并非每个查询都需要推理。如果你的问题可以通过简单的检索或图遍历来回答，推理只会增加不必要的复杂性。当你需要推导未明确陈述的事实时，才应使用推理。

**图质量不佳。** 推理会放大数据质量问题。如果你的图中存在实体名称不一致、关系缺失或事实错误，推理会传播这些错误。在应用推理规则之前，请先清理图数据。

**将推断事实视为已验证事实。** 推理结论的可靠性仅取决于其所依据的规则和事实。像 "HighRiskActor(APT29)" 这样的推断事实反映的是你的规则逻辑，而非基准真相。始终要区分观测事实与推断结论。

**规则过度复杂。** 包含许多条件的复杂规则难以调试和维护。从简单规则开始，逐步增加复杂度。一条包含 10 个条件的规则很可能应当拆分为更小、更聚焦的规则。

**在大数据集上进行递归推理。** 递归 Datalog 规则可能在大图上生成指数级数量的派生事实。请监控工作内存大小，并添加深度限制或终止条件，以防止推理失控。

## 相关指南

- [语义抽取](/zh/guides/semantic-extraction) — 抽取填充图事实的实体与关系，供推理使用
- [GraphRAG](/zh/guides/graphrag) — 为 LLM 响应检索基于图的上下文
- [本体管理](/zh/guides/ontology) — 生成 OWL 本体，为你的规则赋予形式化语义
- [决策智能](/zh/guides/decision-intelligence) — 通过完整因果链记录并追踪推断出的决策
- [上下文图](/zh/guides/context-graphs) — 推理所运作其上的知识图谱
- [MCP Server](/zh/guides/mcp-server) — 将 `run_reasoning` 作为工具暴露给 Claude 及其他代理