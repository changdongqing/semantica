---
title: "推理模块"
description: "前向链、Rete、演绎、溯因、SPARQL、Datalog 和时序推理，支持可解释的推理路径。"
icon: "microchip"
sourceHash: "60a2a8a93e8f2071799d7eaf7ab0894397114ba9cac0d75dd4d64d6ddf682c8c"
---

`semantica.reasoning` 使用逻辑规则从现有事实中推导新知识：

- 六种推理引擎：前向链、Rete、SPARQL、Datalog、时序推理，以及由 LLM 驱动的 GraphReasoner
- 每个引擎都会生成可解释的推理路径：可追踪的规则和事实链
- `DatalogReasoner` 通过半朴素不动点求值保证终止
- `TemporalReasoningEngine` 实现了全部 13 种 Allen 区间代数关系
- `ExplanationGenerator` 生成逐步的自然语言说明


## 导出的类

| 类 | 作用 |
| :--- | :--- |
| `Reasoner` | 前向链推理：`add_fact`、`add_rule`、`forward_chain`、`backward_chain`、`infer_facts` |
| `GraphReasoner` | 在知识图谱字典上进行 LLM 驱动推理：通过 `reason(graph, query)` 回答自然语言查询 |
| `ReteEngine` | Rete 模式匹配：`build_network`、`add_fact`、`match_patterns`、`execute_matches` |
| `SPARQLReasoner` | 通过 `execute_query`、`expand_query`、`infer_results` 进行基于规则的 SPARQL 查询扩展 |
| `DatalogReasoner` | 带半朴素不动点的递归 Horn 子句规则：`add_fact`、`add_rule`、`derive_all`、`query` |
| `TemporalReasoningEngine` | 全部 13 种 Allen 区间代数关系：`relation(a, b)`、`overlaps`、`contains`、`active_at` |
| `ExplanationGenerator` | 通过 `generate_explanation(inference_result)` 生成逐步解释 |
| `Rule` | IF/THEN 规则：`{rule_id, name, conditions, conclusion, rule_type, confidence, priority}` |
| `Fact` | 工作内存事实：`{fact_id, predicate, arguments}` |
| `InferenceResult` | 单个推导出的结论：`{conclusion, rule_used, premises, confidence}` |


## 应该使用哪个引擎？

- [Reasoner](#reasoner-forward/backward-chaining) —— IF/THEN 规则，前向链和后向链。**从这里开始**：覆盖 90% 的使用场景。无需查询语言。
- [GraphReasoner](#graphreasoner) —— 通过 LLM 在知识图谱上进行自然语言查询。无需 SPARQL 或规则：直接提问即可。
- [DatalogReasoner](#datalogreasoner) —— 具有终止保证的递归 Horn 子句规则。用于复杂的多跳传递规则。
- [ReteEngine](#reteengine) —— 用于高频推理的 Rete 模式匹配。当你需要同时将大量事实与大量规则进行匹配时使用。
- [SPARQLReasoner](#sparqlreasoner) —— SPARQL 查询扩展和基于规则的推理。当你处理 RDF/OWL 数据时使用。
- [TemporalReasoningEngine](#temporalreasoningengine) —— 全部 13 种 Allen 区间代数关系。用于时间感知推理：overlaps、before/after、during、contains。


## 快速开始

最常见的模式是使用 `Reasoner` 进行 IF/THEN 前向链推理：

```python
from semantica.reasoning import Reasoner, Rule, RuleType

reasoner = Reasoner()

# Add facts as strings in predicate(args) form
reasoner.add_fact("Manager(Alice)")
reasoner.add_fact("Employee(Alice)")

# Add an IF-THEN rule using the string form
reasoner.add_rule("IF Manager(?x) THEN HasAuthority(?x)")

# Run forward chaining: returns List[InferenceResult]
results = reasoner.forward_chain()
for r in results:
    print(r.conclusion)         # "HasAuthority(Alice)"
    print(r.confidence)         # 1.0
    if r.rule_used:
        print(r.rule_used.name) # name of the rule applied
```

或者使用 `Rule` 数据类以编程方式构建规则：

```python
from semantica.reasoning import Rule, RuleType

rule = Rule(
    rule_id="rule_001",
    name="manager_authority",
    conditions=["Manager(?x)"],
    conclusion="HasAuthority(?x)",
    rule_type=RuleType.IMPLICATION,
    confidence=0.9,
)
reasoner.add_rule(rule)
```


## Reasoner（前向/后向链）

**`Reasoner`** 是基于规则推理的统一入口：迭代事实和规则直到**不动点**，然后可选地通过后向链证明特定目标：

```python
from semantica.reasoning import Reasoner, Rule, RuleType, InferenceResult

reasoner = Reasoner()

# Facts can be strings, KG entity dicts, or KG relationship dicts
reasoner.add_fact("Manager(John)")
reasoner.add_fact("Employee(John)")

# IF-THEN string form
reasoner.add_rule("IF Manager(?x) AND Employee(?x) THEN SeniorStaff(?x)")

# Forward chaining: iterates until fixpoint
results = reasoner.forward_chain()
for r in results:
    print(r.conclusion)   # e.g. "SeniorStaff(John)"
    print(r.premises)     # list of premise strings matched
    print(r.confidence)   # float

# Backward chaining: prove a specific goal
result = reasoner.backward_chain("SeniorStaff(John)", max_depth=10)
if result:
    print(f"Proven: {result.conclusion}")
    print(f"Premises: {result.premises}")

# infer_facts() loads facts and rules in one call, returns conclusion strings
conclusions = reasoner.infer_facts(
    facts=["Manager(Alice)", "Employee(Alice)"],
    rules=["IF Manager(?x) THEN HasAuthority(?x)"],
)
# → ["HasAuthority(Alice)"]
```

### Reasoner 方法

| 方法 | 返回 | 描述 |
| :------ | :------- | :----------- |
| `add_fact(fact)` | `None` | 将字符串、实体字典或关系字典添加到工作内存 |
| `add_rule(rule)` | `Rule` | 添加 `Rule` 对象或 IF-THEN 字符串；规则按 `priority` 降序排序 |
| `forward_chain()` | `List[InferenceResult]` | 迭代推导所有可能的结论，直到不动点 |
| `backward_chain(goal, max_depth)` | `InferenceResult \| None` | 证明特定目标字符串；如果无法证明，则返回 `None` |
| `infer_facts(facts, rules)` | `List[str]` | 加载事实和规则，然后运行 `forward_chain()`，返回结论字符串 |
| `reset_action_history()` | `None` | 允许之前已触发的激活再次运行其动作 |
| `clear()` | `None` | 清除所有事实、规则和动作激活历史 |
| `reset()` | `None` | `clear()` 的别名 |

带有动作的规则对每个具体激活（规则 ID、绑定和匹配到的事实）采用至多一次尝试语义。
对同一实例再次调用 `forward_chain()` 时，不会对已经尝试过的激活重复产生副作用，
即使某个动作抛出了异常也是如此。调用
`reset_action_history()` 可以在不清除事实或规则的情况下有意重试；
`clear()` 和 `reset()` 也会清除此历史。就地替换规则的动作
不会使现有激活失效；当替换后的动作应被重新执行时，请显式重置历史。

### Rule 和 Fact 数据类字段

```python
from semantica.reasoning import Rule, Fact, RuleType

# Rule: all fields
rule = Rule(
    rule_id="rule_001",            # required: unique identifier
    name="manager_authority",      # required: display name
    conditions=["Manager(?x)"],    # list of condition strings
    conclusion="HasAuthority(?x)", # conclusion string
    rule_type=RuleType.IMPLICATION, # IMPLICATION | EQUIVALENCE | CONSTRAINT | TRANSFORMATION
    confidence=1.0,                 # default 1.0
    priority=0,                     # higher priority rules run first
)

# Fact: for working with the Rete engine directly
from semantica.reasoning import Fact
fact = Fact(
    fact_id="f001",                # required: unique identifier
    predicate="Manager",
    arguments=["John"],
    metadata={},
)
```


## GraphReasoner

**`GraphReasoner`** 使用 LLM 在知识图谱字典上回答**自然语言查询**：无需编写 SPARQL 或规则：

```python
from semantica.reasoning import GraphReasoner

# Initialize: uses openai by default; override via kwargs
reasoner = GraphReasoner(provider="openai", model="gpt-4o-mini")

kg = {
    "entities": [
        {"id": "alice",   "name": "Alice",   "type": "Person",       "properties": {"role": "CEO"}},
        {"id": "acme",    "name": "Acme Inc", "type": "Organization"},
    ],
    "relationships": [
        {"source": "alice", "target": "acme", "type": "leads"}
    ],
}

answer: str = reasoner.reason(
    graph=kg,
    query="Who leads Acme Inc. and what is their role?"
)
print(answer)
```

`reason()` 会将图转换为文本上下文，并使用结构化提示调用 LLM。返回纯字符串答案。


## ReteEngine

面向大型规则集的高性能 Rete 模式匹配：

```python
from semantica.reasoning import ReteEngine, Rule, Fact, RuleType

engine = ReteEngine()

# Build the Rete network from a list of Rule objects
rules = [
    Rule(
        rule_id="r1",
        name="manager_authority",
        conditions=["Manager(?x)"],
        conclusion="HasAuthority(?x)",
    )
]
engine.build_network(rules)

# Add facts to working memory
engine.add_fact(Fact(fact_id="f1", predicate="Manager", arguments=["Alice"]))

# Match patterns and execute
matches = engine.match_patterns()
results = engine.execute_matches(matches)
# results is a list of conclusion values from matched rules

# Network statistics
stats = engine.get_network_stats()
# → {"total_nodes": N, "alpha_nodes": A, "beta_nodes": B, "terminal_nodes": T, "facts": F}

engine.reset()
```

### ReteEngine 方法

| 方法 | 返回 | 描述 |
| :------ | :------- | :----------- |
| `build_network(rules)` | `None` | 从 `Rule` 对象列表构建 Rete 网络 |
| `add_fact(fact)` | `None` | 将 `Fact` 添加到工作内存，并在网络中传播 |
| `match_patterns(facts)` | `List[Match]` | 匹配所有模式；可选地在匹配前添加事实 |
| `execute_matches(matches)` | `List[Any]` | 执行匹配到的规则并返回其结论值 |
| `reset_action_history()` | `None` | 允许之前已执行的激活再次运行其动作 |
| `reset()` | `None` | 清除事实、节点激活状态和动作激活历史 |
| `get_network_stats()` | `dict` | 返回 alpha、beta、终端节点和事实的数量 |

当绑定了 Reasoner 时，`execute_matches()` 会按规则 ID、绑定和匹配事实标识对动作副作用去重。出于兼容性，重新执行匹配仍会返回其结论，但首次尝试之后会跳过其动作。`reset_action_history()`、`reset()` 和 `build_network()` 允许这些动作再次运行。


## SPARQLReasoner

**`SPARQLReasoner`** 为 SPARQL 增加了**推理规则扩展**：添加 IF-THEN 规则后，这些规则会在执行前自动织入查询：

```python
from semantica.reasoning import SPARQLReasoner

reasoner = SPARQLReasoner()

# Add an inference rule (IF-THEN string form)
reasoner.add_inference_rule("IF is_a(?x, Manager) THEN has_authority(?x)")

# Execute a query: returns SPARQLQueryResult
result = reasoner.execute_query("""
    PREFIX ex: <http://example.org/>
    SELECT ?person ?company WHERE {
        ?person ex:founded ?company .
        ?company ex:located_in ex:SiliconValley .
    }
""")

for row in result.bindings:
    print(row)   # each row is a dict of variable → {"value": ..., "type": ...}

# Expand a query with inference rules (returns modified query string)
expanded = reasoner.expand_query("SELECT ?x WHERE { ?x a :Manager }")

# Infer additional bindings from existing results
enriched = reasoner.infer_results(result)
```

### SPARQLReasoner 构造函数

```python
SPARQLReasoner(
    config=None,         # optional config dict
    triplet_store=None,  # optional TripletStore instance for live query execution
    enable_inference=True,
)
```

<Note>
  `execute_query()` 在未配置 `triplet_store` 时返回空绑定。通过 `triplet_store=` 关键字参数传入 `TripletStore` 实例，以针对实时后端执行查询。
</Note>


## DatalogReasoner

针对递归 Horn 子句规则的纯 Python 自底向上半朴素不动点求值。终止是**有保证的**：引擎检测到不动点收敛后就会停止：

```python
from semantica.reasoning import DatalogReasoner, DatalogFact

datalog = DatalogReasoner()

# Add base facts: string form is the simplest
datalog.add_fact("parent(alice, bob)")
datalog.add_fact("parent(bob, charlie)")

# Or use DatalogFact directly (args is a tuple of strings)
datalog.add_fact(DatalogFact(predicate="parent", args=("charlie", "dave")))

# Add recursive rules using Horn clause syntax
datalog.add_rule("ancestor(X, Y) :- parent(X, Y).")
datalog.add_rule("ancestor(X, Z) :- parent(X, Y), ancestor(Y, Z).")

# Evaluate to fixpoint: returns all derived fact strings
all_facts = datalog.derive_all()
# e.g. ["parent(alice, bob)", "parent(bob, charlie)", ..., "ancestor(alice, bob)", ...]

# Query with variable pattern: variables start with uppercase or ?
results = datalog.query("ancestor(alice, ?Z)")
# → a list of binding dicts: [{"Z": "bob"}, {"Z": "charlie"}, {"Z": "dave"}] (order not guaranteed)

# Clear and start over
datalog.clear()
```

### DatalogFact、DatalogRule 字段

```python
from semantica.reasoning import DatalogFact, DatalogRule

# DatalogFact: ground fact; args must all be constants (lowercase start)
fact = DatalogFact(predicate="parent", args=("alice", "bob"))

# DatalogRule: parsed from string; head and body are set by the parser
# Use add_rule("head(X, Y) :- body(X, Z), body2(Z, Y)."): do not construct directly
```

### DatalogReasoner 方法

| 方法 | 返回 | 说明 |
| :------ | :------- | :----------- |
| `add_fact(fact)` | `None` | 添加字符串、dict 或 `DatalogFact`；常量必须以小写字母开头 |
| `add_rule(rule_str)` | `None` | 解析并添加形如 `"ancestor(X,Y) :- parent(X,Y)."` 的 Horn 子句字符串 |
| `derive_all()` | `List[str]` | 运行半朴素不动点求值；以字符串形式返回所有事实 |
| `query(pattern)` | `List[dict]` | 查询推导出的事实：如有需要会自动运行 `derive_all()` |
| `load_from_graph(graph)` | `int` | 将 ContextGraph 的节点/边加载为 Datalog 事实；返回添加的数量 |
| `clear()` | `None` | 清空所有事实和规则 |


## TemporalReasoningEngine

纯 Python 的 Allen 区间代数：包含全部 13 种关系，无 LLM 调用：

```python
from datetime import datetime
from semantica.reasoning import TemporalReasoningEngine, TemporalInterval, IntervalRelation

engine = TemporalReasoningEngine()

ceo_tenure   = TemporalInterval(start=datetime(1997, 9, 16), end=datetime(2011, 8, 24))
board_member = TemporalInterval(start=datetime(2000, 1,  1), end=datetime(2012, 6,  1))

# Compute Allen relation: method is relation(), not get_relation()
rel = engine.relation(ceo_tenure, board_member)
# → IntervalRelation.DURING  (ceo_tenure is fully inside board_member)

# Other helpers
engine.overlaps(ceo_tenure, board_member)   # bool
engine.contains(board_member, ceo_tenure)   # bool

# Is a given point in time inside an interval?
engine.active_at(ceo_tenure, datetime(2005, 6, 1))   # True
```

全部 13 种 Allen 区间代数关系：

| 关系 | 含义 |
| :-------- | :------- |
| `BEFORE` | A 在 B 开始之前结束 |
| `MEETS` | A 恰好在 B 开始时结束 |
| `OVERLAPS` | A 在 B 之前开始，在 B 内部结束 |
| `DURING` | A 完全位于 B 内部 |
| `STARTS` | A 和 B 同时开始，A 先结束 |
| `FINISHES` | A 和 B 同时结束，A 开始较晚 |
| `EQUALS` | 完全相同的区间 |
| `AFTER` | BEFORE 的逆关系 |
| `MET_BY` | MEETS 的逆关系 |
| `OVERLAPPED_BY` | OVERLAPS 的逆关系 |
| `CONTAINS` | DURING 的逆关系 |
| `STARTED_BY` | STARTS 的逆关系 |
| `FINISHED_BY` | FINISHES 的逆关系 |

<Note>
  `TemporalInterval.start` 期望接收 `datetime` 对象，而非字符串。请从标准库导入 `datetime`，并使用 `datetime(year, month, day)` 构造区间。
</Note>


## ExplanationGenerator

为任意 `InferenceResult` 生成结构化解释：

```python
from semantica.reasoning import ExplanationGenerator, Reasoner, Rule

reasoner = Reasoner()
reasoner.add_fact("Manager(John)")
reasoner.add_rule("IF Manager(?x) THEN HasAuthority(?x)")
results = reasoner.forward_chain()

# ExplanationGenerator takes no positional args
generator = ExplanationGenerator()

# Pass an InferenceResult object: not a dict
explanation = generator.generate_explanation(results[0])

print(f"Type:       {explanation.explanation_type}")   # "inference"
print(f"Conclusion: {explanation.conclusion}")
print(f"NL:         {explanation.natural_language}")

if explanation.reasoning_path:
    for step in explanation.reasoning_path.steps:
        print(f"  Step {step.step_id}: {step.description}")
        if step.rule_applied:
            print(f"    Rule: {step.rule_applied.name}")

# Justify a conclusion with a reasoning path
path = generator.show_reasoning_path(results[0])
justification = generator.justify_conclusion(results[0].conclusion, path)
print(justification.explanation_text)
```

### ExplanationGenerator 方法

| 方法 | 返回 | 说明 |
| :------ | :------- | :----------- |
| `generate_explanation(reasoning)` | `Explanation` | 为 `InferenceResult`、`Proof` 或溯因结果生成结构化解释 |
| `show_reasoning_path(reasoning)` | `ReasoningPath` | 从任意结果中提取并返回推理路径 |
| `justify_conclusion(conclusion, path)` | `Justification` | 为结论构建包含证据和自然语言文本的 `Justification` |

### 关键 dataclass 字段

```python
# Explanation
explanation.explanation_id    # str
explanation.explanation_type  # "inference" | "proof" | "abductive" | "generic"
explanation.conclusion        # conclusion value
explanation.reasoning_path    # ReasoningPath | None
explanation.natural_language  # NL string (when generate_nl=True, the default)

# ReasoningStep
step.step_id        # str
step.description    # str
step.rule_applied   # Rule | None  (NOT rule_name)
step.input_facts    # List[Any]
step.output_fact    # Any
step.confidence     # float
```


## 引擎选择指南

| 引擎 | 适用场景 | 终止性 | 关键方法 |
| :------ | :-------- | :----------- | :---------- |
| `Reasoner` | 简单的 IF/THEN 规则 | 总是终止（受 `max_iterations` 上限约束） | `forward_chain()` |
| `GraphReasoner` | 通过 LLM 对知识图谱进行自然语言查询 | 总是终止 | `reason(graph, query)` |
| `ReteEngine` | 事实众多的大型规则集 | 总是终止 | `match_patterns()` |
| `SPARQLReasoner` | 规则增强的 SPARQL 查询 | 总是终止 | `execute_query()` |
| `DatalogReasoner` | 递归规则（血缘、可达性） | 保证不动点 | `derive_all()` / `query()` |
| `TemporalReasoningEngine` | 时间区间关系 | 总是终止 | `relation(a, b)` |

<Tip>
  对于递归规则（如祖先、可达性、传递性），请使用 `DatalogReasoner`：它通过半朴素自底向上不动点求值保证终止。`Reasoner.forward_chain()` 设有 `max_iterations` 上限（默认 50），在深度递归时会静默提前停止。
</Tip>

<Warning>
  `GraphReasoner` 需要已配置的 LLM 提供方。如果提供方初始化失败，`reason()` 会返回错误字符串而不会抛出异常。若需显式暴露失败，请在调用前检查 `reasoner.provider is not None`。
</Warning>

- [知识图谱](/zh/reference/kg) — 被推理的知识图谱。
- [真值维护](/zh/reference/truth_maintenance) — 面向固定非递归规则的源感知逻辑撤回。
- [本体](/zh/reference/ontology) — 用于逻辑推理的本体公理和 SHACL 约束。
- [三元组存储](/zh/reference/triplet_store) — 用于基于 SPARQL 推理的 RDF 后端。
- [上下文](/zh/reference/context) — 推理集成到智能体决策智能中。