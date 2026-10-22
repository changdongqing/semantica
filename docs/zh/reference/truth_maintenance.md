---
title: "真值维护"
description: "面向固定非递归规则、可感知来源的逻辑撤销。"
icon: "microchip"
sourceHash: "54e1fc02f447ebc084d66fd6a09eb1c48238afbadbe0f5cc314d5cb6a48d1047"
---

`TruthMaintenanceSession` 使派生事实与不断变化的外部证据保持同步。它维护以下不变式：

```text
session.facts == closure(fixed_rules, facts_with_remaining_external_support)
```

撤回某个来源会使已失去前提的结论失效，而仍具有替代推导或显式支持的结论则会被保留。

这是一个**按需启用（opt-in）**的会话：现有的 `Reasoner`、动作、RETE 与 Datalog 行为均保持不变。


## 何时使用

在以下情况使用 `TruthMaintenanceSession`：

- 事实来自可能被**纠正或撤回**的外部证据（例如某次文档修订用一条断言替换另一条断言）。
- 你需要派生结论**仅在其失去全部支持时**才被移除，而不是在任何删除时都被移除。
- 你希望以批量更新的方式发布最终状态与**净变化**，而不是重放中间状态。
- 你正触及 `RetractAction` 的局限：它只移除所请求的事实，并留下失去支持的结论；而朴素的级联删除又会错误地移除那些仍有替代推导或显式支持的结论。

请勿将其用于递归规则、时序有效性、外部副作用或多线程访问——参见[限制](#limitations)。


## 快速开始

```python
from semantica.reasoning import FactSupport, Rule, TruthMaintenanceSession

rules = [
    Rule(
        rule_id="employment-eligibility",
        name="Employment eligibility",
        conditions=["Employed(?x)"],
        conclusion="Eligible(?x)",
    ),
]
session = TruthMaintenanceSession(rules=rules)

session.apply(assertions=[
    FactSupport(support_id="document-v1", fact="Employed(Alice)"),
])

delta = session.apply(
    assertions=[FactSupport("document-v2", "Employed(Alice)")],
    retractions=["document-v1"],
)
assert not delta.added_facts
assert not delta.removed_facts
assert session.explain("Eligible(Alice)").active

delta = session.apply(retractions=["document-v2"])
assert delta.removed_facts == frozenset({
    "Employed(Alice)", "Eligible(Alice)",
})
```

上面的示例是**来源替换**：在单个批次中用一个支持文档替换另一个，不会产生净的事实删除或插入，因为 `Employed(Alice)` 仍受支持，而 `Eligible(Alice)` 保留其推导。


## 核心概念

- **支持（Support）**：一条外部事实断言，由调用方提供的 `support_id` 标识。support ID 在会话生命周期内永久绑定到一个事实；允许先撤回之后再重新激活同一关联，但把同一 ID 绑定到不同事实会抛出 `ValidationError`。
- **推导（Derivation）**：一次规则应用，包含规则标识、有序前提、变量绑定与结论。同一结论的多个独立推导都会被保留；重复匹配不会放大支持。
- **版本（Version）**：单调递增的提交计数器。每有一个改变支持集的批次就自增一次（即使事实集未变），对空操作则保持不变。
- **真值语义**：失去全部支持意味着“当前不可推导”，而非“逻辑上为假”。


## 会话 API

### `TruthMaintenanceSession(rules=...)`

从现有 [`Rule`](/zh/reference/reasoning#rule-and-fact-dataclass-fields) 对象的可迭代集合构造会话。规则会被复制为不可变的内部快照：之后对原始 `Rule` 对象的修改不会影响该会话。

规则集必须满足：

- **正向、无函数的蕴含式**，且至少包含一个体原子。
- **范围受限**：每个头变量都出现在体中。
- **无环**：谓词依赖图不得包含直接或间接递归；循环规则集在构造时即被拒绝。
- **无副作用**：动作、处理器以及非蕴含型规则均被拒绝；`confidence` 必须为 `1.0`。

### `apply(assertions=..., retractions=...)`

原子地应用一个批次：

- `assertions`：`FactSupport` 的可迭代集合。
- `retractions`：support ID 字符串的可迭代集合。

返回一个 `MaintenanceDelta`，包含 `version`、`added_facts`、`removed_facts`、`added_supports` 与 `removed_supports`（均为提交后观测到的净变化值）。

校验与错误语义：

- 对已激活的支持以相同事实重新断言属于空操作；撤回未知或未激活的支持也属于空操作。
- 将 support ID 绑定到不同事实、同一批次中同一 ID 同时出现在断言与撤回中，或任何格式错误的输入，都会抛出既有的 `ValidationError`。
- 意外的内部失败会抛出 `ProcessingError`，并附带原始原因。
- **任何失败的批次都不会改变已提交的事实、支持目录、推导与版本。**

### `explain(fact)`

返回针对当前状态的 `FactExplanation`：

- `fact`：规范事实字符串。
- `active`：该事实当前是否成立。
- `explicit_support_ids`：外部支持的 ID，已排序。
- `derivations`：所有保留的直接推导（规则 ID、有序前提、绑定）。

### 只读视图

- `facts`：当前所有被相信的事实（显式事实加派生事实）的 frozenset。
- `version`：上文所述的提交计数器。
- `snapshot()`：返回一个 `TruthMaintenanceSnapshot` —— 一个冻结的 dataclass，
  包含 `version`、`facts` 与 `active_supports`（按 support ID 排序的元组）。
  快照是一份完全脱离的副本：之后的 `apply()` 批次绝不会改变已有快照。

所有只读视图（`facts`、`version`、`snapshot()`、`explain()`）都不会改变会话
状态。返回的快照（`MaintenanceDelta`、`FactExplanation`、`Derivation`、
`TruthMaintenanceSnapshot`）都是带有不可变集合的冻结 dataclass；修改调用方持有
的规则或此前返回的结果，均无法修改该会话。

### 检查点导出与恢复

当应用需要在后续进程中恢复同一个逻辑会话时，使用 `to_checkpoint()` 与
`from_checkpoint()`。这些方法是序列化边界，而不是存储引擎。

- `to_checkpoint()` 返回一个新的 JSON 兼容 `dict`，其中包含构造时捕获的固定
  规则、完整的支持目录（含已撤回的支持）、活跃 support ID，以及已提交的会话
  版本。它不保存派生事实或内部索引。
- `from_checkpoint(payload)` 接受 `json.loads()` 的结果——而不是 JSON 字符串
  或文件路径——它会校验完整载荷，重建派生事实、直接推导与依赖索引，并且仅在
  重建成功后才返回新会话。

`snapshot()` 仍然是针对当前状态的只读查询视图。检查点则不同：它是一种重启格式，
用于保留序列化后继续更新所需的 support-ID 绑定与元数约束。检查点中的
`session_version` 只是一个本地提交计数器。它并不授权复用旧的快照提供方标识、
时序适配器历史或外部缓存。

固定的 v1 模式如下：

```json
{
  "format_version": 1,
  "session_version": 4,
  "rules": [
    {
      "rule_id": "employment-eligibility",
      "conditions": ["Employed(?x)"],
      "conclusion": "Eligible(?x)"
    }
  ],
  "support_catalog": [
    {"support_id": "document-v1", "fact": "Employed(Alice)"},
    {"support_id": "document-v2", "fact": "Employed(Alice)"}
  ],
  "active_support_ids": ["document-v2"]
}
```

顶层以及每条规则/目录记录都有精确的字段集合；缺失字段与未知字段都会被拒绝。
`format_version` 必须为整数 `1`；`session_version` 必须为非负整数。非空的
支持目录要求版本为正，因为它代表至少一次已提交的更新；空目录要求版本为零，
而非空目录且没有活跃支持则要求至少两次提交。规则与目录中的事实都是语义值，
因此非法原子、事实中的变量、递归规则以及元数冲突，都会以构造与 `apply()`
所使用的同一个 `ValidationError` 被拒绝。不支持的未来格式同样会被拒绝，且恢复
过程绝不会返回部分重建的会话。

应用自行决定 JSON 存放在哪里。下面的最小示例仅用于展示 API；`Path.write_text()`
**并不**提供崩溃安全的原子提交。如果检查点丢失或只写入一部分是不可接受的，
请使用原子文件替换或事务型数据库提交。

```python
import json
from pathlib import Path
from tempfile import TemporaryDirectory

from semantica.reasoning import FactSupport, Rule, TruthMaintenanceSession

session = TruthMaintenanceSession(rules=[
    Rule("eligibility", "Eligibility", ["Employed(?x)"], "Eligible(?x)")
])
session.apply(assertions=[
    FactSupport("doc-1", "Employed(Alice)"),
    FactSupport("doc-2", "Employed(Alice)"),
])
saved_version = session.version
with TemporaryDirectory() as directory:
    path = Path(directory) / "checkpoint.json"
    path.write_text(json.dumps(session.to_checkpoint()), encoding="utf-8")
    del session
    restored = TruthMaintenanceSession.from_checkpoint(
        json.loads(path.read_text(encoding="utf-8"))
    )
    assert restored.version == saved_version
    restored.apply(retractions=["doc-1"])
    assert "Eligible(Alice)" in restored.facts
    restored.apply(retractions=["doc-2"])
    assert "Eligible(Alice)" not in restored.facts
```

恢复仅覆盖最后一次成功导出并保存的检查点。该检查点之后提交的更新（包括已成功
但未持久化存储的更新）都无法恢复。格式错误的 JSON 文档会由应用程序自身的
`json.loads()` 调用抛出 `JSONDecodeError`；`from_checkpoint()` 会校验得到的
结构化对象，并对格式错误的检查点数据抛出 `ValidationError`。


## 成本模型

- **删除传播**与**受影响规则匹配**都是定向的：仅删除的批次会借助依赖索引计算受影
  响事实集，然后只重新匹配体谓词与该集合相交的规则（受影响性扫描本身会遍历规则
  列表，因此成本仍随规则数量增长）；插入则只重新求值从新激活谓词可达的规则。
- **暂存会复制整个会话状态**，对每个*有效*的 `apply()` 批次执行一次，以保证提交
  的原子性（空批次或已应用过的批次属于空操作，不做任何暂存）；并且会话在整个生命
  周期内都会把**支持目录保留在内存中**（包括已撤回的支持，因此 ID 始终保持绑定）。
- **每次调用 `snapshot()` 都会再次复制完整的已提交状态**（事实、活跃支持、版本），
  因此像 [`TruthMaintenanceContextFilter`](/zh/reference/context#support-aware-retrieval-truth_filter)
  这类使用方每执行一次带过滤的检索就要付一次全状态复制。若一次共享读取就足够，
  不要在紧密循环中调用它。
- 写时复制与目录成本是按批次的整体状态成本；不要假设端到端延迟与受影响子图严格
  成正比。在依赖性能之前请先实测。
- **检查点载荷随固定规则与完整的历史支持目录增长**，而不只是随活跃支持增长。导出
  还会为目录与活跃 ID 支付确定性的排序成本。
- **恢复是一次完整重建**：它会校验每个目录条目、合并规则与目录的元数约束，并仅通过
  重放活跃支持来重建完整的闭包与直接解释。连接匹配可能产生大量中间匹配，内存会随
  这些匹配以及复制的候选状态增长，且不承诺常数时间或仅与活跃支持相关的成本上界。


## 限制

- **仅支持非递归规则**；构造函数会拒绝循环的谓词依赖。
- **原子语法范围窄**：仅支持 ASCII 谓词/变量标识符与不带引号的标量符号常量，包括零
  元原子。不支持带引号的字符串、含空白的常量、嵌套项、比较、聚合、否定或析取。会话
  内每个谓词只能有一种元数。
- **布尔型支持语义**；不做置信度传播，不做概率推理。
- **无副作用**：会话绝不执行动作或处理器，也不会创建 LLM 或存储客户端。
- **无自动存储或恢复**：检查点是一种显式的序列化格式，但会话从不写入文件或数据库，
  也不会在崩溃后自动恢复。存储、原子提交以及选择最后一个可用检查点均由应用负责。
- **无线程安全，也不支持并发写入**：访问仍在单进程内由调用方串行化，检查点功能也
  不会引入分布式锁或多写入方协议。
- **不保证时序有效性或跨存储同步**。恢复检查点不会恢复时序适配器历史、快照提供方
  标识或外部缓存。
- **规则固定**：更改规则需要构造新会话。
- 不保留历史证明存档：`explain()` 只描述当前状态。

## 链接

- [时间真值维护](/zh/reference/temporal_truth_maintenance) — 一个可选启用的图适配器，支持相互独立的有效时间/已知时间切片、过期处理与迟到修正。
- [推理](/zh/reference/reasoning) — 本次会话所基于的规则引擎，包括 `Rule` 表示。
- [上下文](/zh/reference/context#support-aware-retrieval-truth_filter) — `TruthMaintenanceContextFilter` 使用不可变快照，按活跃支持过滤检索到的上下文。
- [本体](/zh/reference/ontology) — 本体公理与 SHACL 约束。