---
title: "时态真值维护"
description: "在独立的有效时间与已知时间图切片上维护派生事实。"
icon: "clock"
sourceHash: "334266aa339318289b7f28f0714aef126f48b2b0d3652d6493669aca14290bc9"
---

`TemporalTruthMaintenanceAdapter` 将显式标注的时态图关系连接到[真值维护会话](/zh/reference/truth_maintenance)。它把所选证据中的变化转换为一批源断言和撤回。只要结论还拥有另一个活跃支持，它们就会继续存在。

两个查询坐标彼此独立：

- **`valid_at`**：断言在世界上所适用的时间。
- **`known_at`**：证据被记录且尚未被取代的时间。

这使得“我们当时相信什么？”和“我们现在对当时相信什么？”可以有不同的答案。它不会改变 `TemporalGraphQuery` 或其现有的 `time_axis="both"` 行为，后者会在同一时间戳检查两个时间轴。

## 示例：迟到的更正与过期

此示例不需要数据库、嵌入模型或 LLM：

```python
from copy import deepcopy

from semantica.reasoning import Rule, TemporalTruthMaintenanceAdapter

adapter = TemporalTruthMaintenanceAdapter(rules=[
    Rule("eligibility", "Eligibility", ["Employed(?x)"], "Eligible(?x)"),
])
original = {
    "source": "alice",
    "target": "acme",
    "type": "EMPLOYED_BY",
    "valid_from": "2026-09-01T00:00:00Z",
    "valid_until": "2026-09-30T00:00:00Z",
    "recorded_at": "2026-09-01T00:00:00Z",
    "metadata": {
        "truth_maintenance": {
            "support_id": "hr-v1:employment",
            "fact": "Employed(Alice)",
        },
    },
}
graph = {
    "entities": [{"id": "alice"}, {"id": "acme"}],
    "relationships": [original],
}
adapter.sync(graph, valid_at="2026-09-15", known_at="2026-09-15")
assert "Eligible(Alice)" in adapter.facts

# On September 20, we learn employment actually ended on September 10.
# Keep the old claim and close its transaction interval, not its valid interval.
corrected_graph = deepcopy(graph)
corrected_graph["relationships"][0]["superseded_at"] = "2026-09-20"
revision = deepcopy(original)
revision["valid_until"] = "2026-09-10"
revision["recorded_at"] = "2026-09-20"
revision["metadata"]["truth_maintenance"]["support_id"] = "hr-v2:employment"
corrected_graph["relationships"].append(revision)

delta = adapter.sync(
    corrected_graph, valid_at="2026-09-15", known_at="2026-09-20",
)
assert delta.removed_facts == frozenset({"Employed(Alice)", "Eligible(Alice)"})

then = adapter.query_at(valid_at="2026-09-15", known_at="2026-09-15")
with_correction = adapter.query_at(valid_at="2026-09-15", known_at="2026-09-20")
assert "Eligible(Alice)" in then.facts
assert not with_correction.facts
assert then.explain("Employed(Alice)").explicit_support_ids == ("hr-v1:employment",)
assert not adapter.facts  # Historical queries did not move the live state.

# Explicitly move through the corrected valid-time boundary.
adapter.advance(valid_at="2026-09-09", known_at="2026-09-20")
assert "Eligible(Alice)" in adapter.facts
expired = adapter.advance(valid_at="2026-09-10", known_at="2026-09-20")
assert "Eligible(Alice)" in expired.removed_facts
assert graph["relationships"][0]["valid_until"] == "2026-09-30T00:00:00Z"
```

## 图输入与历史

传入一个包含 `entities` 和 `relationships` 的字典；持有 `ContextGraph` 的调用方可先导出 `to_kg_dict()`，然后原样传入结果。调用方必须提供并保留完整的管理证据历史，包括已被取代的关系版本。仅导出活跃视图无法重建其省略的证据。

使用 `ContextGraph` 时，标注和时间边界都是普通关键字参数：`graph.add_edge(source, target, relation_type, valid_from=..., valid_until=..., recorded_at=..., truth_maintenance={"support_id": ..., "fact": ...})`。额外关键字参数会存储在边元数据中，因此不要将它们包装在显式的 `metadata=` 字典中。

每个受管理的关系都有一个 `metadata.truth_maintenance` 字典，且恰好包含 `support_id` 和 `fact`。事实使用 PR1 的规范原子语法；关系标签不会自动转换为规则谓词。支持 ID 标识**一个源断言修订**。对于同一文档中的不同事实以及后续修订，请使用不同的 ID。未标注的关系会被忽略；格式错误的标注会抛出 `ValidationError`。

时态字段会从每条记录本身读取，若存在也会从其 `metadata` 和 `properties` 字典读取。第二个位置很重要，因为 `ContextGraph` 将除有效时间边界之外的所有内容都保存在 `metadata` 中（实体也会通过 `properties` 暴露这些内容），因此 `to_kg_dict()` 的输出无需重写即可使用。在多个位置提供的字段必须表示同一时刻；冲突的重复字段会抛出 `TemporalValidationError`。

| 字段 | 含义 | 受管理证据的默认值 |
|---|---|---|
| `valid_from` | 包含端点的有效时间起点 | 无界过去 |
| `valid_until` | 排除端点的有效时间终点 | 无界未来 |
| `recorded_at` | 包含端点的已知时间起点 | 必须显式提供 |
| `superseded_at` | 排除端点的已知时间终点 | 无界未来 |

关系端点从 `source`/`target` 读取，或从 `to_kg_dict()` 发出的规范 `source_id`/`target_id` 读取。同时提供两种形式但值不同会抛出 `ValidationError`，而不是静默优先选择其中一种。

空上界、`"OPEN"` 和 `TemporalBound.OPEN` 表示无界未来。有限区间要求 `start < end`。时间使用现有的时态解析器：接受 ISO 字符串、日期时间和数值 Unix 时间戳；无时区的日期时间会被视为 UTC。布尔值会被拒绝。不会进行天/秒截断。不会从系统时钟获取默认值。

保留的记录不能从后续的 `sync()` 中消失。其事实、端点、关系类型、有效区间和记录时间不能重写。开放的 `superseded_at` 可以关闭一次；已关闭的区间不能重新打开或更改。更正会关闭旧修订并添加新修订。要从当前已知时间视图中撤回某个来源，请关闭其事务区间，并将 `known_at` 推进到该边界或越过该边界。物理删除行会被拒绝。

适配器将来源的显式事务历史视为权威；它不会推断到达时间、解决冲突证据或自动分配替代关系。

实体 ID 必须是唯一字符串。如果图中包含实体，则每条受管理的边都需要已存在的端点，并且两个端点都必须在两个查询坐标上处于活跃状态。没有时态字段的实体脚手架没有时间维度。其保留的时间字段遵循相同的不可变性/事务关闭规则。支持仅包含关系的图，但之后不能在同一适配器上获得端点约束：这样做会重新解释保留的历史。更改该模式时，请创建新的适配器。谓词元数会针对所有保留证据进行检查，包括在请求坐标上处于非活跃状态的记录。

## API

### `TemporalTruthMaintenanceAdapter(rules=...)`

拥有一个新会话，其中包含复制且固定的 PR1 规则。不接受外部可变会话。所有 PR1 规则限制均适用，包括非递归和无副作用。访问必须由调用方串行化。

### `sync(graph, *, valid_at, known_at) -> MaintenanceDelta`

校验并摄取保留证据投影。将其选定的支持 ID 与当前活跃的支持 ID 进行差异比较，并应用一个 PR1 批次。针对同一事实的来源替换会产生支持变化，而不会引起中间事实的反复变动。

校验或推理失败会使保留证据、实时事实、时钟和计数器保持不变。输入字典不会被修改，也不会按引用保留。非时态属性和无关元数据不属于受管理投影。

### `advance(*, valid_at, known_at) -> MaintenanceDelta`

选择保留证据的另一个切片。调用方可通过这种方式在不修改图的情况下触发过期或激活。允许向前和向后移动。没有计时器：仅仅等待不会更新实时事实。

### `query_at(*, valid_at, known_at) -> TemporalFactSnapshot`

为请求的切片构建一个新会话，并返回其事实、活跃来源支持和直接解释。冻结结果仅包含不可变值；它暴露 `explain(fact)`，且不会因后续更新而改变。它携带 `valid_at`、`known_at` 和 `graph_revision`。它不会更改实时会话，也不会假装历史重算拥有实时提交版本。

### 实时属性与解释

- `facts`：当前显式和推断事实的不可变集合。
- `explain(fact)`：当前 PR1 的直接来源和推导。
- `version`：PR1 已提交的支持集计数器。仅时钟变化不必递增它。
- `graph_revision`：规范化保留投影变更的计数器，包括非活跃证据。它对此适配器而言是局部的，不是全局图 ID。
- `valid_at`、`known_at`：当前 UTC 坐标，初始为 `None`。

对于缓存标识，请区分适配器实例、保留图修订和两个时间坐标；不要仅使用实时支持版本。

## 成本与边界

每次图同步都会规范化/校验所提供的受管理历史。切片选择会扫描保留证据和端点生命周期。PR1 执行其现有的更新工作和状态暂存；历史查询会重新计算新的闭包并捕获所有直接解释。保留历史会随证据修订而增长。此实现不提供带索引的存储侧时态查询，也不承诺亚线性更新成本。

适配器不会持久化其归档、将结论写回图、安排过期、修改 RETE、支持递归规则，或更新 RAG 提示与向量记录。一致性是相对于所提供的证据和固定规则而言的；失去支持意味着“当前不可推导”，而不是“为假”。