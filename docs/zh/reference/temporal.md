---
title: "时序智能"
description: "面向时间感知知识图谱的双时态事实、时间点快照、Allen 区间代数、时序模式检测以及自然语言时序解析。"
icon: "clock"
sourceHash: "e2dd9b3a975401a10149518b6c25c55df11f9ab02c81a2d06202f89bd7852364"
---

对于必须遵守证据过期与更正的规则支撑结论，请参见 [时序真值维护](/zh/reference/temporal_truth_maintenance)。该可选适配器使用相互独立的 `valid_at` 与 `known_at` 坐标，并将历史查询与实时推理状态分开维护。

时序智能让你的知识图谱完整理解*何时*——不仅是当下何为真，还包括它在现实世界中何时为真、何时被记录，以及事实如何随时间演化。

该系统横跨 **v0.3.0**（上下文时序有效性）与 **v0.4.0**（完整时序栈）发布，涵盖五个层面：

<div style={{display:"flex",flexWrap:"wrap",gap:"1.5rem",margin:"1.5rem 0"}}>
  <div style={{flex:"1 1 180px",padding:"1.25rem 1.5rem",borderRadius:"10px",border:"1px solid rgba(16,185,129,0.25)",background:"rgba(16,185,129,0.04)"}}>
    <div style={{fontSize:"1.1rem",fontWeight:700,color:"#10B981",marginBottom:"6px"}}>双时态模型</div>
    <div style={{fontSize:"0.82rem",color:"rgba(255,255,255,0.6)",lineHeight:1.5}}>每条事实都带有有效时间 + 事务时间</div>
  </div>
  <div style={{flex:"1 1 180px",padding:"1.25rem 1.5rem",borderRadius:"10px",border:"1px solid rgba(16,185,129,0.25)",background:"rgba(16,185,129,0.04)"}}>
    <div style={{fontSize:"1.1rem",fontWeight:700,color:"#10B981",marginBottom:"6px"}}>时间点查询</div>
    <div style={{fontSize:"0.82rem",color:"rgba(255,255,255,0.6)",lineHeight:1.5}}>一次调用即可重建任意历史图状态</div>
  </div>
  <div style={{flex:"1 1 180px",padding:"1.25rem 1.5rem",borderRadius:"10px",border:"1px solid rgba(16,185,129,0.25)",background:"rgba(16,185,129,0.04)"}}>
    <div style={{fontSize:"1.1rem",fontWeight:700,color:"#10B981",marginBottom:"6px"}}>Allen 区间代数</div>
    <div style={{fontSize:"0.82rem",color:"rgba(255,255,255,0.6)",lineHeight:1.5}}>全部 13 种时序关系，确定性推理</div>
  </div>
  <div style={{flex:"1 1 180px",padding:"1.25rem 1.5rem",borderRadius:"10px",border:"1px solid rgba(16,185,129,0.25)",background:"rgba(16,185,129,0.04)"}}>
    <div style={{fontSize:"1.1rem",fontWeight:700,color:"#10B981",marginBottom:"6px"}}>自然语言时序解析</div>
    <div style={{fontSize:"0.82rem",color:"rgba(255,255,255,0.6)",lineHeight:1.5}}>零 LLM 调用 — 纯正则 + dateutil</div>
  </div>
</div>


## 导出的类

| 类 | 角色 |
| :---- | :---- |
| `BiTemporalFact` | 数据类，封装 `valid_from`、`valid_until`、`recorded_at`、`superseded_at`。工厂方法：`BiTemporalFact.from_relationship(rel_dict)` |
| `TemporalBound` | 开放式区间的枚举哨兵。唯一取值：`TemporalBound.OPEN` |
| `TemporalInterval` | 冻结数据类 `(start: datetime, end: datetime \| TemporalBound, label?)`，供 `TemporalReasoningEngine` 使用 |
| `IntervalRelation` | 全部 13 种 Allen 关系标签的枚举（`BEFORE`、`AFTER`、`MEETS` 等） |
| `TemporalGraphQuery` | 时间点快照、区间查询、模式检测、演化分析、时序路径查找 |
| `TemporalPatternDetector` | 基于时序边的序列与循环模式检测 |
| `TemporalReasoningEngine` | 对 `TemporalInterval` 对象执行 Allen 区间代数 — 纯 Python，确定性 |
| `TemporalNormalizer` | 将自然语言时序表达式解析为 `(datetime, datetime)` 元组 — 零 LLM 调用 |
| `TemporalQueryRewriter` | 从自由文本查询中抽取时序意图；返回 `TemporalQueryResult` |
| `TemporalQueryResult` | `TemporalQueryRewriter.rewrite()` 的数据类输出 |
| `TemporalVersionManager` | 对版本化的图快照创建、列出、比较并应用修订 |


## 快速开始

<Steps>
  <Step title="构建时间感知图">
    在构建时为任意关系附加 `valid_from` / `valid_until`：

    ```python
    from semantica.kg import GraphBuilder

    builder = GraphBuilder()
    kg = builder.build(sources=[{
        "entities": [
            {"id": "alice",     "type": "Person"},
            {"id": "acme_corp", "type": "Organization"},
            {"id": "beta_ltd",  "type": "Organization"},
        ],
        "relationships": [
            {
                "source": "alice", "target": "acme_corp", "type": "ceo_of",
                "valid_from":  "2018-01-01",
                "valid_until": "2022-06-01",
            },
            {
                "source": "alice", "target": "beta_ltd", "type": "ceo_of",
                "valid_from":  "2022-06-01",
                # No valid_until → open-ended (TemporalBound.OPEN)
            },
        ],
    }])
    ```
  </Step>
  <Step title="在某个时间点查询图">
    `TemporalGraphQuery` 通过构造函数接收参数；每次查询调用时传入图：

    ```python
    from semantica.kg import TemporalGraphQuery

    query = TemporalGraphQuery(temporal_granularity="day")

    # query_at_time is the primary public API
    result_2020 = query.query_at_time(kg, query="", at_time="2020-06-15")
    result_2023 = query.query_at_time(kg, query="", at_time="2023-01-01")

    print(f"Rels active in 2020: {result_2020['num_relationships']}")
    print(f"Rels active in 2023: {result_2023['num_relationships']}")
    ```
  </Step>
  <Step title="在特定时间戳重建子图">
    `reconstruct_at_time()` 是底层原语 — 返回完整图字典，其中仅包含在给定时刻有效的节点和边：

    ```python
    snapshot = query.reconstruct_at_time(kg, "2021-06-15")
    # snapshot has "entities" and "relationships" keys
    # usable with all GraphAnalyzer, PathFinder, CommunityDetector calls
    ```
  </Step>
  <Step title="创建版本化快照">
    ```python
    from semantica.kg import TemporalVersionManager

    versioner = TemporalVersionManager()          # in-memory storage
    # versioner = TemporalVersionManager(storage_path="versions.db")  # SQLite

    versioner.create_snapshot(
        kg,
        version_label="2024-Q1",
        author="user@example.com",
        description="Q1 2024 snapshot after board restructure",
    )

    for v in versioner.list_versions():
        print(f"{v['label']:12s}  {v['author']}  {v['timestamp']}")
    ```
  </Step>
</Steps>


## 双时态模型

大多数系统只跟踪一条时间线：某事物当前是否为真。双时态图则同时跟踪**两条相互独立的时间线**：

<Tabs>
  <Tab title="有效时间">
    *该事实在现实世界中何时为真？*

    - `valid_from` — 事实开始为真的日期
    - `valid_until` — 事实不再为真的日期。对于当前仍有效的事实，可省略（或使用 `TemporalBound.OPEN`）

    ```python
    from semantica.kg import BiTemporalFact, TemporalBound

    # Create from an existing relationship dict
    rel = {
        "source": "alice", "target": "acme_corp", "type": "ceo_of",
        "valid_from":  "2018-01-01",
        "valid_until": "2022-06-01",
    }
    fact = BiTemporalFact.from_relationship(rel)

    print(fact.valid_from)   # datetime(2018, 1, 1, tzinfo=utc)
    print(fact.valid_until)  # datetime(2022, 6, 1, tzinfo=utc)

    # Serialize back to dict fields
    fields = fact.to_relationship_fields()
    print(fields["valid_from"])   # "2018-01-01T00:00:00Z"
    print(fields["valid_until"])  # "2022-06-01T00:00:00Z"
    ```
  </Tab>
  <Tab title="事务时间">
    *我们何时在系统中记录了这条事实？*

    - `recorded_at` — 在摄取时自动打上时间戳（默认为 `datetime.now(utc)`）
    - `superseded_at` — 当后续版本替代该记录时设置。`TemporalBound.OPEN` 表示仍为当前记录

    ```python
    rel = {
        "source": "alice", "target": "acme_corp", "type": "ceo_of",
        "valid_from":    "2018-01-01",
        "valid_until":   "2022-06-01",
        "recorded_at":   "2018-01-05T09:32:00Z",
        "superseded_at": None,   # still the current record
    }
    fact = BiTemporalFact.from_relationship(rel)

    print(fact.recorded_at)    # datetime(2018, 1, 5, 9, 32, tzinfo=utc)
    print(fact.superseded_at)  # TemporalBound.OPEN
    ```
  </Tab>
  <Tab title="TemporalBound.OPEN">
    `TemporalBound.OPEN` 是表示开放式区间的唯一哨兵 — 即没有定义结束日期的事实：

    ```python
    from semantica.kg import TemporalBound

    print(TemporalBound.OPEN)          # TemporalBound.OPEN
    print(TemporalBound.OPEN.value)    # "OPEN"

    # A relationship with no valid_until gets TemporalBound.OPEN automatically
    rel = {"source": "alice", "target": "beta_ltd", "type": "ceo_of",
           "valid_from": "2022-06-01"}
    fact = BiTemporalFact.from_relationship(rel)
    print(fact.valid_until)            # TemporalBound.OPEN
    ```

    <Note>
      `TemporalBound.OPEN` 同时替代起点与终点哨兵 — 只有一个取值。推理引擎在比较结束边界时将 `OPEN` 视为 `datetime.max`（远期未来），而在用于 `superseded_at` 时视为 `datetime.min`（远期过去）。
    </Note>
  </Tab>
</Tabs>


## TemporalGraphQuery — 参考

构造一次；每次方法调用时传入图：

```python
from semantica.kg import TemporalGraphQuery

query = TemporalGraphQuery(
    enable_temporal_reasoning=True,   # default
    temporal_granularity="day",       # second|minute|hour|day|week|month|year
    max_temporal_depth=None,          # optional max depth
)
```

### 核心方法

| 方法 | 返回 | 说明 |
| :------ | :------- | :----------- |
| `query_at_time(graph, query, at_time, include_history=False, time_axis="valid")` | `Dict` | 主 API — 将图过滤到在 `at_time` 有效的事实。返回 `entities`、`relationships`、`num_entities`、`num_relationships` |
| `reconstruct_at_time(graph, at_time, *, time_axis="valid")` | `Dict` | 底层方法 — 返回在 `at_time` 有效的深拷贝子图。可用于所有分析工具 |
| `query_time_range(graph, query, start_time, end_time, temporal_aggregation="union", include_intervals=True, time_axis="valid")` | `Dict` | 在 `[start, end]` 期间活跃的所有关系。`temporal_aggregation`：`"union"` / `"intersection"` / `"evolution"` |
| `validate_temporal_consistency(graph)` | `TemporalConsistencyReport` | 检测区间倒置、同一对实体的重叠事实以及实体生命周期违规 |
| `query_temporal_pattern(graph, pattern, time_window=None, min_support=1)` | `Dict` | 检测 `"sequence"` 或 `"cycle"` 模式。委托给 `TemporalPatternDetector` |
| `analyze_evolution(graph, entity=None, relationship=None, start_time=None, end_time=None, metrics=None)` | `Dict` | 跟踪随时间变化的演化指标（`"count"`、`"diversity"`、`"stability"`） |
| `find_temporal_paths(graph, source, target, start_time=None, end_time=None, max_path_length=None, enforce_causal_ordering=True, ordering_strategy="strict")` | `Dict` | 遵守时序有效性的 BFS 路径。`ordering_strategy`：`"strict"` / `"overlap"` / `"loose"` |

### `time_axis` 参数

所有查询方法都接受 `time_axis` 参数，用于控制按哪些时间戳进行过滤：

| 取值 | 作用 |
| :---- | :----- |
| `"valid"`（默认） | 按 `valid_from` / `valid_until` 过滤 — 事实何时为真 |
| `"transaction"` | 按 `recorded_at` / `superseded_at` 过滤 — 我们何时记录 |
| `"both"` | 事实必须在两个轴上同时活跃 |

### 区间查询示例

```python
# All relationships active at any point in 2021
result = query.query_time_range(kg, "", "2021-01-01", "2021-12-31")
for rel in result["relationships"]:
    print(f"  {rel['source']} --[{rel['type']}]--> {rel['target']}")

# Only relationships valid throughout the entire range (stricter)
result = query.query_time_range(
    kg, "", "2021-01-01", "2021-12-31",
    temporal_aggregation="intersection",
)

# Grouped by calendar period
result = query.query_time_range(
    kg, "", "2021-01-01", "2021-12-31",
    temporal_aggregation="evolution",
)
for period, rels in result["relationship_buckets"].items():
    print(f"  {period}: {len(rels)} relationships active")
```

### 演化分析

```python
evolution = query.analyze_evolution(
    kg,
    entity="alice",            # track a specific entity (None = whole graph)
    relationship="ceo_of",     # track a specific edge type (None = all)
    start_time="2018-01-01",
    end_time="2024-12-31",
    metrics=["count", "diversity", "stability"],
)
print(f"Relationship count:    {evolution['count']}")
print(f"Relationship types:    {evolution['diversity']}")
```

### 时序路径查找

```python
paths = query.find_temporal_paths(
    kg,
    source="alice",
    target="beta_ltd",
    start_time="2022-01-01",
    end_time="2024-12-31",
    max_path_length=5,
    enforce_causal_ordering=True,
    ordering_strategy="strict",  # strict|overlap|loose
)
for p in paths["paths"]:
    print(f"  {' → '.join(p['path'])}  (length={p['length']})")
```

### 一致性校验

```python
from semantica.kg import TemporalGraphQuery

report = TemporalGraphQuery().validate_temporal_consistency(kg)

print(f"Errors:   {len(report.errors)}")
print(f"Warnings: {len(report.warnings)}")

for err in report.errors:
    print(f"  [{err['issue_type']}] fact_id={err['fact_id']}: {err['message']}")
```

报告的错误类型：`inverted_interval`、`invalid_temporal_fields`、`missing_source_entity`、`missing_target_entity`、`source_lifetime_mismatch`、`target_lifetime_mismatch`。
警告类型：`overlapping_same_edge`、`gap_after_restart`。


## TemporalPatternDetector

检测图边中反复出现的时间模式。可直接访问，或通过 `TemporalGraphQuery.query_temporal_pattern()` 访问：

```python
from semantica.kg import TemporalPatternDetector

detector = TemporalPatternDetector()

# Find sequential edge patterns (A→B→C where edges are back-to-back)
sequences = detector.detect_temporal_patterns(
    kg,
    pattern_type="sequence",
    min_frequency=2,
    time_window=None,
)

for seq in sequences:
    print(f"Sequence: {seq['signature']}  (occurs {seq['frequency']} times)")
    for occ in seq["occurrences"]:
        print(f"  nodes={occ['nodes']}  {occ['start_time']} → {occ['end_time']}")

# Find cyclic patterns (A→B→C→A)
cycles = detector.detect_temporal_patterns(
    kg,
    pattern_type="cycle",
    min_frequency=1,
)
```

| 参数 | 类型 | 默认值 | 描述 |
| :--------- | :---- | :------- | :----------- |
| `pattern_type` | `str` | `"sequence"` | `"sequence"` 或 `"cycle"` |
| `min_frequency` | `int` | `2` | 模式被返回所需的最小出现次数 |
| `time_window` | `Any` | `None` | 可选的模式时间窗口约束 |

每个模式字典包含：`pattern_type`、`signature`（节点 ID 元组）、`frequency`、`occurrences`（包含 `nodes`、`edges`、`start_time`、`end_time` 的列表）。


## Allen 区间代数

`TemporalReasoningEngine` 作用于 `TemporalInterval` 对象——一个冻结数据类，具有 `start: datetime` 和 `end: datetime | TemporalBound`：

```python
from semantica.kg import TemporalBound
from semantica.reasoning import (
    TemporalReasoningEngine, TemporalInterval, IntervalRelation
)
from datetime import datetime, timezone

def dt(year, month, day):
    return datetime(year, month, day, tzinfo=timezone.utc)

engine = TemporalReasoningEngine()

h1_2020 = TemporalInterval(start=dt(2020, 1, 1), end=dt(2020, 6, 30))
q2_q4   = TemporalInterval(start=dt(2020, 4, 1), end=dt(2020, 12, 31))

relation = engine.relation(h1_2020, q2_q4)
print(relation)                          # IntervalRelation.OVERLAPS
print(relation.value)                    # "overlaps"

print(engine.overlaps(h1_2020, q2_q4))  # True
print(engine.contains(q2_q4, h1_2020))  # False
```

### 全部 13 种关系

| `IntervalRelation` | `.value` | 逆关系 | 描述 |
| :--- | :--- | :--- | :--- |
| `BEFORE` | `"before"` | `AFTER` | A 严格在 B 开始之前结束 |
| `AFTER` | `"after"` | `BEFORE` | A 严格在 B 结束之后开始 |
| `MEETS` | `"meets"` | `MET_BY` | A 恰好在 B 开始时结束 |
| `MET_BY` | `"met_by"` | `MEETS` | A 恰好在 B 结束时开始 |
| `OVERLAPS` | `"overlaps"` | `OVERLAPPED_BY` | A 与 B 有重叠时段；A 先开始且先结束 |
| `OVERLAPPED_BY` | `"overlapped_by"` | `OVERLAPS` | B 先开始且先结束，二者有重叠时段 |
| `STARTS` | `"starts"` | `STARTED_BY` | 开始时间相同；A 先于 B 结束 |
| `STARTED_BY` | `"started_by"` | `STARTS` | 开始时间相同；B 先于 A 结束 |
| `DURING` | `"during"` | `CONTAINS` | A 完全位于 B 内部 |
| `CONTAINS` | `"contains"` | `DURING` | B 完全位于 A 内部 |
| `FINISHES` | `"finishes"` | `FINISHED_BY` | 结束时间相同；A 晚于 B 开始 |
| `FINISHED_BY` | `"finished_by"` | `FINISHES` | 结束时间相同；B 晚于 A 开始 |
| `EQUALS` | `"equals"` | *（自逆）* | 区间完全相同 |

### 其他引擎方法

| 方法 | 返回 | 描述 |
| :------ | :------- | :----------- |
| `active_at(interval, timestamp, granularity=None)` | `bool` | `timestamp` 是否位于 `interval` 内？ |
| `merge_intervals(intervals)` | `List[TemporalInterval]` | 合并重叠/相接的区间 |
| `gap_analysis(intervals, domain_start, domain_end)` | `List[TemporalInterval]` | 查找某个域内未覆盖的间隙 |
| `coverage_percentage(intervals, domain_start, domain_end)` | `float` | 区间覆盖域的比例 |
| `timeline_of(entity_id, graph)` | `List[Dict]` | 按时间排序的实体事件时间线 |
| `retroactive_coverage(revision, original_facts)` | `Dict` | 将事实按修订影响分类为 `affected`、`partial` 或 `unaffected` |
| `normalize_timestamp(timestamp, granularity)` | `datetime` | 将时间戳截断到指定粒度 |
| `normalize_interval(start, end, granularity)` | `TemporalInterval` | 解析区间并将其扩展到粒度边界 |

### 进阶：区间操作

```python
from datetime import datetime, timezone

def dt(y, m, d): return datetime(y, m, d, tzinfo=timezone.utc)

intervals = [
    TemporalInterval(start=dt(2020, 1, 1), end=dt(2020, 6, 30)),
    TemporalInterval(start=dt(2020, 4, 1), end=dt(2020, 12, 31)),
    TemporalInterval(start=dt(2021, 3, 1), end=TemporalBound.OPEN),
]

# Merge overlapping intervals
merged = engine.merge_intervals(intervals)
print(f"Merged into {len(merged)} intervals")

# Find gaps in coverage across 2020
gaps = engine.gap_analysis(intervals, dt(2020, 1, 1), dt(2020, 12, 31))
print(f"Uncovered gaps: {len(gaps)}")

# Coverage fraction
pct = engine.coverage_percentage(intervals, dt(2020, 1, 1), dt(2021, 12, 31))
print(f"Coverage: {pct:.1%}")

# Entity timeline (all add/modify/remove events sorted by time)
timeline = engine.timeline_of("alice", kg)
for event in timeline:
    print(f"  {event['timestamp'].date()}  {event['change_type']}")
```


## TemporalNormalizer — 自然语言时间解析

将自然语言时间短语转换为 `(valid_from, valid_until)` datetime 元组。**零 LLM 调用。** 纯正则 + `dateutil.relativedelta`。

```python
from semantica.kg import TemporalNormalizer
from datetime import datetime, timezone

norm = TemporalNormalizer(
    reference_date=datetime(2024, 6, 15, tzinfo=timezone.utc)
)
```

### `normalize(value)` → `Optional[Tuple[datetime, datetime]]`

```python
# ISO 8601 → point interval
result = norm.normalize("2022-03-15")
print(result)
# (datetime(2022, 3, 15, tzinfo=utc), datetime(2022, 3, 15, tzinfo=utc))

# Year → full year span
result = norm.normalize("2022")
print(result)
# (datetime(2022, 1, 1, tzinfo=utc), datetime(2022, 12, 31, tzinfo=utc))

# Quarter → quarter span
result = norm.normalize("Q2 2021")
print(result)
# (datetime(2021, 4, 1, tzinfo=utc), datetime(2021, 6, 30, tzinfo=utc))

# Month + year
result = norm.normalize("January 2022")
print(result)
# (datetime(2022, 1, 1, tzinfo=utc), datetime(2022, 1, 31, tzinfo=utc))

# YYYY-MM (ISO partial)
result = norm.normalize("2022-03")
print(result)
# (datetime(2022, 3, 1, tzinfo=utc), datetime(2022, 3, 31, tzinfo=utc))

# Relative phrases (requires reference_date)
result = norm.normalize("last quarter")
print(result)
# (datetime(2024, 1, 1, tzinfo=utc), datetime(2024, 3, 31, tzinfo=utc))

result = norm.normalize("last year")
# (datetime(2023, 1, 1, tzinfo=utc), datetime(2023, 12, 31, tzinfo=utc))

# Unparseable → None (never raises, logs debug)
result = norm.normalize("recently")
print(result)   # None
```

<Warning>
  `normalize()` 对无法解析的输入返回 `None`——它**从不抛出**异常。对于相对短语（`"last quarter"`、`"this year"` 等），`reference_date` **必须**在构造时设置，否则在调用时会抛出 `ValueError`。
</Warning>

### `normalize_phrase(phrase)` → `Optional[Dict]`

在短语映射中查找领域特定的时间短语：

```python
meta = norm.normalize_phrase("expiry date")
print(meta)
# {"maps_to": "valid_until", "type": "end", "domain": ["Healthcare", "Supply Chain"]}

meta = norm.normalize_phrase("retroactive to")
print(meta)
# {"maps_to": "valid_from", "type": "start", "retroactive": True, "domain": ["Regulatory", "Finance"]}

meta = norm.normalize_phrase("unknown phrase")
print(meta)   # None
```

内置领域短语覆盖：通用/政策、医疗保健、网络安全、供应链、金融和能源。

### 自定义短语映射

```python
from datetime import datetime, timezone

def my_grant_window(ref: datetime):
    return (
        datetime(ref.year, 10, 1, tzinfo=timezone.utc),
        datetime(ref.year, 10, 31, tzinfo=timezone.utc),
    )

norm = TemporalNormalizer(
    reference_date=datetime(2024, 1, 1, tzinfo=timezone.utc),
    phrase_map={"grant application window": my_grant_window},
)
start, end = norm.normalize("grant application window")
```

### 支持的表达式

| 模式 | 示例 | 返回类型 |
| :------- | :------- | :---------- |
| ISO 8601 完整日期/日期时间 | `"2022-03-15"`、`"2022-03-15T10:00:00Z"` | 点区间 |
| 仅年份 | `"2022"` | 全年跨度 |
| 月份 + 年份（单词） | `"January 2022"`、`"Jan 2022"` | 整月跨度 |
| YYYY-MM（ISO 部分日期） | `"2022-03"` | 整月跨度 |
| 季度 + 年份 | `"Q2 2021"` | 季度跨度 |
| 相对短语（内置） | `"last year"`、`"last quarter"`、`"this month"`、`"three months ago"`、`"six months ago"`、`"two years ago"` | 计算得到的跨度 |
| 歧义斜杠日期 | `"03/04/2022"` | `None` + `TemporalAmbiguityWarning` |
| 领域短语 | `"expiry date"`、`"retroactive to"` | 仅通过 `normalize_phrase()` |


## TemporalQueryRewriter

从自然语言查询中提取时间意图，以便下游检索可以应用确定性的时间过滤。

**两种模式：** 仅正则（不使用 LLM）或针对自由形式措辞的 LLM 辅助模式。

```python
from semantica.kg import TemporalQueryRewriter

# Regex-only (default — no dependencies beyond standard library)
rewriter = TemporalQueryRewriter()

# LLM-assisted for more complex phrasings
from semantica.llms import Groq
rewriter = TemporalQueryRewriter(
    llm_provider=Groq(model="llama-3.1-8b-instant"),
    reference_date=datetime.now(timezone.utc),
)
```

### `rewrite(query, context=None)` → `TemporalQueryResult`

```python
# "before" intent
r = rewriter.rewrite("which suppliers were certified before 2021?")
print(r.temporal_intent)    # "before"
print(r.at_time.year)       # 2021
print(r.rewritten_query)    # "which suppliers were certified?"
print(r.confidence)         # 0.85

# "between" intent
r = rewriter.rewrite("revenue between Q1 2022 and Q3 2022")
print(r.temporal_intent)    # "between"
print(r.start_time)         # datetime(2022, 1, 1, tzinfo=utc)
print(r.end_time)           # datetime(2022, 9, 30, tzinfo=utc)

# "during" intent
r = rewriter.rewrite("what decisions were made during Q2 2023?")
print(r.temporal_intent)    # "during"
print(r.at_time)            # datetime(2023, 4, 1, tzinfo=utc)

# No temporal phrase
r = rewriter.rewrite("list all active suppliers")
print(r.temporal_intent)    # None
print(r.rewritten_query)    # "list all active suppliers"
print(r.has_temporal_context())  # False
```

### `TemporalQueryResult` 字段

| 字段 | 类型 | 描述 |
| :---- | :---- | :----------- |
| `rewritten_query` | `str` | 移除时间短语并规范化空白后的原始查询 |
| `at_time` | `Optional[datetime]` | 用于 `before`、`after`、`at`、`during` 意图的时间点边界 |
| `start_time` | `Optional[datetime]` | `between` 查询的下界 |
| `end_time` | `Optional[datetime]` | `between` 查询的上界 |
| `temporal_intent` | `Optional[str]` | `"before"`、`"after"`、`"at"`、`"during"`、`"between"` 之一，或 `None` |
| `confidence` | `float` | 正则提取为 `0.85`；LLM 传递的置信度或回退值 `0.75` |

| 方法 | 返回值 | 描述 |
| :------ | :------- | :----------- |
| `has_temporal_context()` | `bool` | 若提取到任何时间参数则为 `True` |

支持的时间意图关键词：`before` / `prior to` / `until` / `up to`、`after` / `since` / `following`、`during` / `in` / `within`、`as of` / `at` / `on`、`between … and …`。


## TemporalVersionManager

创建并管理带 SHA-256 完整性校验的版本化图快照。同时支持**内存**（默认）与 **SQLite 持久化**两种存储。

```python
from semantica.kg import TemporalVersionManager

# In-memory (default)
versioner = TemporalVersionManager()

# SQLite-backed (persists across process restarts)
versioner = TemporalVersionManager(
    storage_path="graph_versions.db",
    version_strategy="timestamp",   # timestamp | incremental | semantic
)
```

### 方法

| 方法 | 返回值 | 描述 |
| :------ | :------- | :----------- |
| `create_snapshot(graph, version_label, author, description)` | `Dict` | 创建带 SHA-256 校验和的快照。`author` 与 `description` 为必填 |
| `create_version(graph, version_label=None, timestamp=None, metadata=None)` | `Dict` | 轻量级版本，不含校验和，且不强制要求 `author` |
| `list_versions()` | `List[Dict]` | 列出所有已存储的快照 |
| `get_version(label)` | `Optional[Dict]` | 按标签获取快照 |
| `compare_versions(v1, v2, comparison_metrics=None)` | `Dict` | 两个版本或标签之间的实体 + 关系详细差异 |
| `apply_revision(snapshot, revision)` | `Dict` | 时间修订：用新事实取代匹配事实，但不删除原始事实 |
| `validate_snapshot(snapshot)` | `bool` | 依据 v1.0 模式校验（必填字段 + 类型） |
| `migrate_snapshot(snapshot)` | `Dict` | 将旧格式快照升级到 v1.0 |
| `verify_checksum(snapshot)` | `bool` | 通过 SHA-256 进行完整性校验 |

### 快照与差异示例

```python
# Create a snapshot (author and description are required)
snap = versioner.create_snapshot(
    kg,
    version_label="v1.0",
    author="analyst@example.com",
    description="Initial baseline",
)
print(snap["checksum"])  # SHA-256 hex string

# List versions
for v in versioner.list_versions():
    print(f"{v['label']:12s}  {v['author']}  {v['timestamp']}")

# Get a specific version
past = versioner.get_version("v1.0")

# Diff: compare two versions (pass labels or snapshot dicts)
diff = versioner.compare_versions("v1.0", "v2.0")
print(f"Entities added:          {diff['summary']['entities_added']}")
print(f"Entities removed:        {diff['summary']['entities_removed']}")
print(f"Relationships added:     {diff['summary']['relationships_added']}")
print(f"Relationships removed:   {diff['summary']['relationships_removed']}")

# Field-level changes on each modified entity
for change in diff["entities_modified"]:
    print(f"  {change['id']}: {change['changes']}")
```

### 时间修订

对特定事实 ID 应用修订——原始事实会被**取代**（而非删除），从而保留完整的审计历史：

```python
revision = {
    "fact_ids":       ["alice|ceo_of|acme_corp"],   # relationship key: src|type|target
    "new_valid_from": "2018-03-01",
    "new_valid_until": None,    # None = TemporalBound.OPEN
    "revision_type":  "correction",                  # correction | retroactive
    "author":         "analyst@example.com",
    "reason":         "Original start date was incorrect",
}

revised_snapshot = versioner.apply_revision(snap, revision)
# original fact is preserved with superseded_at set
# replacement fact has new_valid_from, superseded_at = OPEN
```

### 完整性与迁移

```python
# Validate snapshot schema
is_valid = versioner.validate_snapshot(snap)

# Verify checksum integrity
is_intact = versioner.verify_checksum(snap)

# Upgrade old-format snapshot (no format_version field)
upgraded = versioner.migrate_snapshot(old_snap)
```


## Context Graph 时间特性（v0.3.0）

`ContextGraph` 直接在图的节点与决策上暴露时间感知能力，自 v0.3.0 起可用：

```python
from semantica.context import ContextGraph
from datetime import datetime, timezone

graph = ContextGraph(advanced_analytics=True)

# Add time-bounded nodes
graph.add_node("policy_v1", "policy",
               properties={"text": "All transactions require dual approval"},
               valid_from="2021-01-01",
               valid_until="2023-06-30")

graph.add_node("policy_v2", "policy",
               properties={"text": "Transactions > $50k require dual approval"},
               valid_from="2023-07-01")

# Find nodes active at a specific timestamp
current_policies = graph.find_active_nodes(
    node_type="policy",
    at_time=datetime.now(timezone.utc),
)
for p in current_policies:
    print(p["properties"]["text"])
# → "Transactions > $50k require dual approval"

# Historical query
past_policies = graph.find_active_nodes(
    node_type="policy",
    at_time=datetime(2022, 6, 1, tzinfo=timezone.utc),
)
for p in past_policies:
    print(p["properties"]["text"])
# → "All transactions require dual approval"
```

### 时间化决策窗口

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore

context = AgentContext(
    vector_store=VectorStore(backend="faiss", dimension=768),
    knowledge_graph=ContextGraph(),
    decision_tracking=True,
)

# Decision superseded after policy change
old_id = context.record_decision(
    category="data_retention", scenario="Set retention window for user PII",
    reasoning="GDPR Article 5(1)(e) limits storage",
    outcome="retain_90_days", confidence=0.98,
    valid_from="2023-01-01", valid_until="2023-06-30",
)

new_id = context.record_decision(
    category="data_retention", scenario="Set retention window for user PII",
    reasoning="Legal confirmed 60-day window after new DPA amendment",
    outcome="retain_60_days", confidence=0.99,
    valid_from="2023-07-01",
)

# Temporal precedent search
old_prec = context.find_precedents("data retention PII", as_of="2023-03-01", limit=3)
new_prec = context.find_precedents("data retention PII", as_of="2024-01-01", limit=3)
```


## 真实场景模式

<Tabs>
  <Tab title="人员与组织结构">
    ```python
    from semantica.kg import GraphBuilder, TemporalGraphQuery

    builder = GraphBuilder()
    kg = builder.build(sources=[{
        "entities": [
            {"id": "alice",   "type": "Person"},
            {"id": "finteam", "type": "Team"},
        ],
        "relationships": [
            {"source": "alice", "target": "finteam", "type": "leads",
             "valid_from": "2020-01-01", "valid_until": "2022-12-31"},
        ],
    }])

    query = TemporalGraphQuery()

    # Incident in Nov 2022 → who was responsible?
    result = query.query_at_time(kg, "", "2022-11-15")
    leads = [r for r in result["relationships"] if r["type"] == "leads"]
    print(f"Team lead at incident: {leads[0]['source']}")
    ```
  </Tab>
  <Tab title="政策演进">
    ```python
    from semantica.kg import TemporalVersionManager, TemporalGraphQuery

    versioner = TemporalVersionManager(storage_path="policy_history.db")
    versioner.create_snapshot(kg_before, version_label="2023-H1",
                              author="compliance@org.com",
                              description="Pre-July policy baseline")
    versioner.create_snapshot(kg_after, version_label="2023-H2",
                              author="compliance@org.com",
                              description="Post-July amendment")

    diff = versioner.compare_versions("2023-H1", "2023-H2")
    print(f"Policy changes: {diff['summary']['relationships_modified']}")
    ```
  </Tab>
  <Tab title="一致性审计">
    ```python
    from semantica.kg import TemporalGraphQuery

    report = TemporalGraphQuery().validate_temporal_consistency(kg)

    if report.errors:
        print("ERRORS (must fix):")
        for e in report.errors:
            print(f"  [{e['issue_type']}] {e['message']} (fact: {e['fact_id']})")

    if report.warnings:
        print("WARNINGS (review):")
        for w in report.warnings:
            print(f"  [{w['issue_type']}] {w['message']} (fact: {w['fact_id']})")
    ```
  </Tab>
  <Tab title="自然语言查询改写">
    ```python
    from semantica.kg import TemporalQueryRewriter, TemporalGraphQuery

    rewriter = TemporalQueryRewriter()
    query    = TemporalGraphQuery()

    user_query = "Who was responsible for compliance before the 2022 audit?"
    result = rewriter.rewrite(user_query)

    if result.has_temporal_context():
        # Use point-in-time filtering
        snapshot = query.reconstruct_at_time(kg, result.at_time)
    else:
        snapshot = kg

    # Now run your retrieval over snapshot with result.rewritten_query
    print(f"Intent: {result.temporal_intent}")
    print(f"Query:  {result.rewritten_query}")
    ```
  </Tab>
</Tabs>


## 配置

```yaml
kg:
  temporal:
    enabled: true
    default_validity: infinite        # OPEN when valid_until is omitted
    recorded_at_auto_stamp: true      # auto-fill recorded_at on every ingested fact
    reasoning:
      enabled: true
      granularity: day                # second|minute|hour|day|week|month|year
      engine: allen                   # allen | point_in_time_only
```

- [知识图谱模块](/zh/reference/kg) — 核心图构建、`GraphBuilder`、分析。
- [Context 模块](/zh/reference/context) — 决策时间窗口与 `find_active_nodes()`。
- [溯源](/zh/reference/provenance) — 与时间元数据一同写入的 W3C PROV-O 血缘。
- [导出](/zh/reference/export) — 带时间标注的 OWL、Turtle、JSON-LD 与 Parquet 导出。

- [时间知识图谱](https://github.com/semantica-agi/semantica/blob/main/cookbook/advanced/10_Temporal_Knowledge_Graphs.ipynb) — 时间推理与 Allen 代数 · 高级
- [Context 模块](https://github.com/semantica-agi/semantica/blob/main/cookbook/introduction/19_Context_Module.ipynb) — 包含时间决策窗口 · 中级