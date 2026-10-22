---
title: "冲突模块"
description: "多源冲突检测与消解：值冲突、类型冲突、时间冲突与逻辑冲突，并提供调查指南。"
icon: "triangle-exclamation"
sourceHash: "f2e105ddfd12a728f86d77a96f2bca73f030b50f55b03502375014fb6ffa6dc1"
---

**`semantica.conflicts`** 用于检测并消解**多个来源对同一事实存在分歧时的矛盾**：

- 五种冲突类型：值冲突、类型冲突、时间冲突、逻辑冲突与关系冲突
- 七种消解策略：投票、可信度加权、最近优先、首次出现、最高置信度、人工复核、专家复核
- `InvestigationGuideGenerator` 为人工消解生成分步调查指令
- `SourceTracker` 将每个属性值映射到其贡献来源，实现完整归属
- 冲突会被显式暴露：绝不静默污染知识图谱


## 为什么要检测冲突？

当你从多个来源摄取数据时，矛盾不可避免。一份年报称 Apple 的营收为 3910 亿美元；一家财经新闻通讯社称 3830 亿美元。若没有冲突检测，两个值都会进入你的图谱，查询会静默返回不一致的答案。

Semantica 的冲突检测让分歧变得显式且可操作：

- **值冲突**：SEC 称营收为 3910 亿美元；Reuters 称 3830 亿美元
- **类型冲突**："Python" 在一个来源中是 `ProgrammingLanguage`，在另一个来源中是一种 `Snake` 物种
- **时间冲突**：某位 CEO 在重叠的日期区间内拥有两个不同的雇主
- **逻辑冲突**：一个实体同时持有两个互斥的属性
- **关系冲突**：同一关系在不同来源中具有不一致的基数或属性

## 导出的类

| 类 | 作用 |
| :--- | :--- |
| `ConflictDetector` | 跨实体列表检测值冲突、类型冲突与关系冲突 |
| `ConflictResolver` | 以可配置策略消解冲突：`voting`、`credibility_weighted`、`most_recent`、`first_seen`、`highest_confidence`、`manual_review`、`expert_review` |
| `ConflictType` | 枚举：`VALUE_CONFLICT`、`TYPE_CONFLICT`、`TEMPORAL_CONFLICT`、`LOGICAL_CONFLICT`、`RELATIONSHIP_CONFLICT` |
| `ResolutionStrategy` | 传给 `ConflictResolver` 的可用消解策略枚举 |
| `ResolutionResult` | 由 `resolve_conflict` / `resolve_conflicts` 返回的数据类 |
| `SourceTracker` | 跟踪每个实体上各属性值的贡献来源 |
| `SourceReference` | 源文档引用，包含文档、页码、章节、置信度 |
| `PropertySource` | 聚合的属性级溯源：值 + `SourceReference` 对象列表 |
| `ConflictAnalyzer` | 分析冲突模式、严重度分布与逐来源统计 |
| `ConflictPattern` | 描述已检测冲突模式的数据类 |
| `InvestigationGuideGenerator` | 为需要人工复核的冲突生成分步调查指南 |
| `InvestigationGuide` | 指南数据类：`conflict_id`、`conflict_summary`、`severity`、`investigation_steps`、`recommended_actions` |
| `InvestigationStep` | 步骤数据类：`step_number`、`description`、`action`、`expected_outcome` |

## 你将获得什么

- **ConflictDetector** —— 跨实体与关系列表的值冲突、类型冲突和关系冲突检测。
- **ConflictResolver** —— 7 种消解策略，包括投票、可信度加权与时间偏好。
- **SourceTracker** —— 跟踪每个冲突事实来自哪个来源，并附带逐来源可信度评分。
- **ConflictAnalyzer** —— 模式分析、严重度分组、来源级统计与趋势识别。
- **InvestigationGuideGenerator** —— 为人工与专家复核自动生成分步调查清单。
- **便捷函数** —— `detect_conflicts()` 与 `resolve_conflicts()`，用于一键式工作流。

## 快速开始

<Steps>
  <Step title="在摄取前设置可信度评分">
    ```python
    from semantica.conflicts import SourceTracker

    tracker = SourceTracker()
    tracker.set_source_credibility("sec_filings",   0.95)
    tracker.set_source_credibility("pubmed",        0.92)
    tracker.set_source_credibility("wikipedia",     0.80)
    tracker.set_source_credibility("news_articles", 0.65)
    ```
  </Step>
  <Step title="在构建图谱后检测冲突">
    ```python
    from semantica.conflicts import ConflictDetector

    detector = ConflictDetector()

    # Detect value conflicts on a specific property
    conflicts = detector.detect_value_conflicts(entities, "revenue")
    print("Found %d conflicts" % len(conflicts))

    for conflict in conflicts:
        print("[%s] entity='%s'  attr='%s'" % (
            conflict.conflict_type, conflict.entity_id, conflict.property_name))
        print("  Values: %s  Severity: %s" % (
            conflict.conflicting_values, conflict.severity))
    ```
  </Step>
  <Step title="按严重度分流">
    ```python
    from semantica.conflicts import ConflictAnalyzer

    analyzer  = ConflictAnalyzer()
    analysis  = analyzer.analyze_conflicts(conflicts)
    severity_counts = analysis["by_severity"]["counts"]
    severity_details = analysis["by_severity"]["details"]
    print("Critical: %d" % severity_counts.get("critical", 0))
    print("High:     %d" % severity_counts.get("high", 0))
    print("Low:      %d" % severity_counts.get("low", 0))
    ```
  </Step>
  <Step title="自动消解低严重度冲突，升级关键冲突">
    ```python
    from semantica.conflicts import ConflictResolver, InvestigationGuideGenerator, ResolutionStrategy

    resolver = ConflictResolver(source_tracker=tracker)

    # Auto-resolve low-severity conflicts
    low_conflicts = severity_details.get("low", [])
    # Re-fetch full Conflict objects if needed: severity_details contains dicts
    auto_resolved = resolver.resolve_conflicts(
        conflicts,
        strategy=ResolutionStrategy.CREDIBILITY_WEIGHTED,
    )

    # Generate investigation guides for critical conflicts
    critical_ids = {d["conflict_id"] for d in severity_details.get("critical", [])}
    critical_conflicts = [c for c in conflicts if c.conflict_id in critical_ids]

    generator = InvestigationGuideGenerator()
    for conflict in critical_conflicts:
        guide = generator.generate_guide(conflict)
        print("\n%s" % guide.title)
        for step in guide.investigation_steps:
            print("  [%d] %s" % (step.step_number, step.description))
            print("       Action: %s" % step.action)
    ```
  </Step>
</Steps>

<Warning>
  **先检测，再合并，而不是反过来。** 请在去重与图构建之前，对原始实体数据运行冲突检测。在已包含合并实体的生产图谱中检测冲突会更困难：你会丢失原始的来源归属。
</Warning>

## ConflictDetector

```python
from semantica.conflicts import ConflictDetector

detector = ConflictDetector()

# Detect value conflicts on a specific property
conflicts = detector.detect_value_conflicts(entities, "revenue")
```

### 检测类型

| 类型 | 检测内容 | 示例 |
| :---- | :--------------- | :------- |
| `VALUE` | 同一实体、同一属性在不同来源中具有不同值 | 营收 3910 亿美元 vs 3830 亿美元 |
| `TYPE` | 同一实体被归类为不同类型 | "Python" 作为语言 vs 蛇 |
| `TEMPORAL` | 时间戳或有效期窗口冲突 | 同一 CEO 同时在两家公司任职 |
| `LOGICAL` | 逻辑上不一致的属性组合 | `is_alive=True` 但设置了 `death_date` |
| `RELATIONSHIP` | 不同来源中关系属性不一致 | 来自两个来源的边权重 0.9 vs 0.3 |

<Warning>
  **`TEMPORAL` 与 `LOGICAL` 冲突检测并未直接实现在 `ConflictDetector` 上。** `ConflictType` 枚举包含这些类型，供自定义流水线使用，但检测器类仅实现了 `detect_value_conflicts`、`detect_type_conflicts`、`detect_relationship_conflicts` 与 `detect_entity_conflicts`。
</Warning>

按类型运行定向检测：

```python
# Detect value conflicts for a specific property
value_conflicts = detector.detect_value_conflicts(entities, "revenue")

# Detect type classification conflicts
type_conflicts = detector.detect_type_conflicts(entities)

# Detect relationship property conflicts (takes a list of relationship dicts)
relation_conflicts = detector.detect_relationship_conflicts(relationships)

# Detect conflicts across all properties of a set of entities
all_conflicts = detector.detect_entity_conflicts(entities)
```

### ConflictDetector 方法

| 方法 | 返回值 | 描述 |
| :------ | :------- | :----------- |
| `detect_value_conflicts(entities, property_name, entity_type=None)` | `List[Conflict]` | 跨实体实例检测特定属性上的值分歧 |
| `detect_type_conflicts(entities)` | `List[Conflict]` | 检测类型分类冲突 |
| `detect_relationship_conflicts(relationships)` | `List[Conflict]` | 检测关系属性冲突（接收关系字典列表） |
| `detect_entity_conflicts(entities, entity_type=None)` | `List[Conflict]` | 针对一组实体检测所有受监控属性上的冲突 |
| `get_conflict_report()` | `Dict[str, Any]` | 生成所有已检测冲突的汇总报告 |

## ConflictResolver

```python
from semantica.conflicts import ConflictResolver, ResolutionStrategy

resolver = ConflictResolver()
results  = resolver.resolve_conflicts(conflicts, strategy=ResolutionStrategy.VOTING)

for result in results:
    print("Resolved '%s' -> %s" % (result.conflict_id, result.resolved_value))
    print("  Strategy: %s  Confidence: %.2f" % (result.resolution_strategy, result.confidence))
```

<Tip>
  **不要自动消解一切。** 对 `severity == "critical"` 或 `severity == "high"` 的冲突使用 `MANUAL_REVIEW`：高严重度意味着分歧幅度大，且判断错误的代价很高。
</Tip>

### 选择消解策略

<Tabs>
  <Tab title="CREDIBILITY_WEIGHTED（推荐）">
    按每个来源被赋予的可信度评分对其值加权：自动偏向权威来源：

    ```python
    from semantica.conflicts import ConflictResolver, SourceTracker, ResolutionStrategy

    tracker = SourceTracker()
    tracker.set_source_credibility("sec_filings",   0.92)
    tracker.set_source_credibility("wikipedia",     0.80)
    tracker.set_source_credibility("news_articles", 0.65)

    resolver = ConflictResolver(source_tracker=tracker)
    results  = resolver.resolve_conflicts(
        conflicts,
        strategy=ResolutionStrategy.CREDIBILITY_WEIGHTED,
    )
    ```

    **最适用于：** 具有已知可靠性排序的来源（SEC > 博客）。
  </Tab>
  <Tab title="VOTING">
    多数投票：跨来源出现次数最多的值获胜：

    ```python
    results = resolver.resolve_conflicts(conflicts, strategy=ResolutionStrategy.VOTING)
    ```

    **最适用于：** 3 个及以上可信度大致相当的来源。当所有来源的可信度评分相同时，`CREDIBILITY_WEIGHTED` 的表现与 `VOTING` 完全一致。
  </Tab>
  <Tab title="MOST_RECENT / FIRST_SEEN">
    ```python
    # Most recent source wins: for fast-changing facts
    results = resolver.resolve_conflicts(conflicts, strategy=ResolutionStrategy.MOST_RECENT)

    # First seen wins: for stable facts (founding date, original name)
    results = resolver.resolve_conflicts(conflicts, strategy=ResolutionStrategy.FIRST_SEEN)
    ```
  </Tab>
  <Tab title="MANUAL_REVIEW / EXPERT_REVIEW">
    ```python
    # Flag for human review: use with InvestigationGuideGenerator
    results   = resolver.resolve_conflicts(conflicts, strategy=ResolutionStrategy.MANUAL_REVIEW)
    generator = InvestigationGuideGenerator()

    for conflict in conflicts:
        guide = generator.generate_guide(conflict)
        print("%s" % guide.title)
        for step in guide.investigation_steps:
            print("  [%d] %s" % (step.step_number, step.description))
    ```

    **最适用于：** 高风险决策（`severity == "critical"`）、受监管数据（HIPAA/SOX）以及领域特定的歧义。
  </Tab>
  <Tab title="策略对比">

    | 策略 | 枚举 | 适用场景 |
    | :-------- | :---- | :----------- |
    | 多数投票 | `VOTING` | 3 个及以上可信度大致相当的来源 |
    | 可信度加权 | `CREDIBILITY_WEIGHTED` | 来源具有不同权威等级 |
    | 最近优先 | `MOST_RECENT` | 快速变化的事实：股价、员工人数、状态 |
    | 首次出现 | `FIRST_SEEN` | 稳定的事实：成立日期、原始名称 |
    | 最高置信度 | `HIGHEST_CONFIDENCE` | 抽取流水线输出置信度评分 |
    | 人工复核 | `MANUAL_REVIEW` | 高风险决策、受监管数据 |
    | 专家复核 | `EXPERT_REVIEW` | 领域特定的歧义：升级至专家 |
  </Tab>
</Tabs>

使用便捷别名可缩短代码：

```python
from semantica.conflicts import voting, credibility_weighted, most_recent, highest_confidence

results = resolver.resolve_conflicts(conflicts, strategy=voting)
```

## SourceTracker

```python
from semantica.conflicts import SourceTracker, SourceReference

tracker = SourceTracker()
tracker.set_source_credibility("sec_10k",   0.92)
tracker.set_source_credibility("wikipedia", 0.80)

source_ref = SourceReference(
    document="sec_10k_2023",
    page=12,
    confidence=0.95,
)
tracker.track_property_source(
    entity_id="apple_inc",
    property_name="revenue",
    value="$391B",
    source=source_ref,
)

# Returns a PropertySource object with .value and .sources (List[SourceReference])
prop_source = tracker.get_property_sources("apple_inc", "revenue")
if prop_source:
    print("Value: %s" % prop_source.value)
    for s in prop_source.sources:
        credibility = tracker.get_source_credibility(s.document)
        print("  %s (confidence: %.2f, credibility: %.2f)" % (
            s.document, s.confidence, credibility))

chain = tracker.get_traceability_chain("apple_inc")
```

**关键行为：**
- 未显式设置的任何来源，其可信度分数默认为 0.50
- `SourceTracker` 存储属性级溯源：因此你可以精确追踪每个值由哪个来源贡献

<Warning>
  **务必设置可信度分数。** 所有来源的默认可信度为 0.50。若不显式设置分数，`CREDIBILITY_WEIGHTED` 的表现与 `VOTING` 完全相同。该策略的强大之处在于区分度。
</Warning>

<Tip>
  **与溯源结合使用。** `SourceTracker` 会直接接入[溯源](/zh/reference/provenance)模块的审计轨迹。如果你需要解释某个已消解的值是如何被选中的，溯源记录会提供完整链路。
</Tip>

## ConflictAnalyzer

```python
from semantica.conflicts import ConflictAnalyzer

analyzer = ConflictAnalyzer()

analysis     = analyzer.analyze_conflicts(conflicts)
patterns     = analysis["patterns"]
severity_counts = analysis["by_severity"]["counts"]
source_stats = analysis["by_source"]
trends       = analyzer.analyze_trends(conflicts)

# analyze_trends returns a list of dicts, one per time period
for t in trends:
    print("Period: %s  Count: %d  Trend: %s" % (
        t["period"], t["conflict_count"], t["trend"]))
```

**关键行为：**
- `analyze_conflicts()["patterns"]` 返回 `ConflictPattern` 对象列表：使用 `pattern.pattern_type` 和 `pattern.frequency` 查找系统性的数据质量问题
- `analyze_conflicts()["by_source"]` 包含 `counts` 和 `top_sources`：频繁出现在许多冲突中的来源可能存在上游数据质量问题
- `analyze_trends()` 返回按周期划分的字典列表（`period`、`conflict_count`、`trend`、`trend_direction`）：`trend` 为 `"increasing"`、`"decreasing"` 或 `"stable"`

<Tip>
  **使用 `analyze_conflicts()["by_source"]["top_sources"]` 识别不良数据源。** 单一来源频繁出现在许多冲突中，说明上游存在数据质量问题，而不是要逐条记录解决的冲突。将其标记出来并调查来源管道。
</Tip>

<Tip>
  **严重程度是字符串标签，不是分数。** `ConflictDetector` 会根据属性重要性和值差异分配 `"critical"`、`"high"` 或 `"medium"`。关键字段（`id`、`name`、`type`、`revenue`）始终会产生 `"critical"`。领域上下文决定应优先处理什么。
</Tip>

## InvestigationGuideGenerator

为需要人工或专家审查的冲突自动生成人类可读的调查清单：

```python
from semantica.conflicts import InvestigationGuideGenerator

generator = InvestigationGuideGenerator()
guide     = generator.generate_guide(conflict)

print("Title:   %s" % guide.title)
print("Summary: %s" % guide.conflict_summary)

for step in guide.investigation_steps:
    print("  [%d] %s" % (step.step_number, step.description))
    print("       Action: %s" % step.action)
    if step.expected_outcome:
        print("       Expected: %s" % step.expected_outcome)
```

## 数据结构

<AccordionGroup>
  <Accordion title="冲突数据结构">

```python
@dataclass
class Conflict:
    conflict_id:        str
    conflict_type:      ConflictType        # VALUE_CONFLICT | TYPE_CONFLICT | ...
    entity_id:          Optional[str]       # entity involved (None for relationship conflicts)
    property_name:      Optional[str]       # the conflicting property name
    relationship_id:    Optional[str]       # relationship involved (for RELATIONSHIP_CONFLICT)
    conflicting_values: List[Any]           # conflicting values (one per source)
    sources:            List[Dict[str, Any]]# source dicts for each value
    confidence:         float               # detection confidence 0–1 (default: 1.0)
    severity:           str                 # "low" | "medium" | "high" | "critical"
    recommended_action: Optional[str]
    metadata:           Dict[str, Any]
```

  </Accordion>
  <Accordion title="ResolutionResult 数据结构">

```python
@dataclass
class ResolutionResult:
    conflict_id:        str
    resolved:           bool
    resolved_value:     Any                 # None if unresolved or flagged for review
    resolution_strategy: Optional[str]      # e.g. "voting", "credibility_weighted"
    confidence:         float               # 0.0–1.0
    sources_used:       List[str]           # document IDs that contributed
    resolution_notes:   Optional[str]
    metadata:           Dict[str, Any]
```

  </Accordion>

  <Accordion title="ConflictType 枚举">

```python
from semantica.conflicts import ConflictType

ConflictType.VALUE_CONFLICT         # revenue is $391B in source A, $383B in source B
ConflictType.TYPE_CONFLICT          # "Apple" is ORGANIZATION in one source, PRODUCT in another
ConflictType.TEMPORAL_CONFLICT      # overlapping validity windows with contradictory states
ConflictType.LOGICAL_CONFLICT       # fact violates an ontology axiom or SHACL constraint
ConflictType.RELATIONSHIP_CONFLICT  # inconsistent relationship properties across sources
```

  </Accordion>
  <Accordion title="InvestigationGuide 和 InvestigationStep 数据结构">

```python
@dataclass
class InvestigationGuide:
    conflict_id:         str
    conflict_summary:    str                      # generated summary of the disagreement
    severity:            str                      # "low" | "medium" | "high" | "critical"
    conflicting_sources: List[Dict[str, Any]]
    investigation_steps: List[InvestigationStep]
    recommended_actions: List[str]
    context:             Dict[str, Any]
    generated_at:        str                      # ISO timestamp
    # title is a @property: "Investigation: <conflict_id>"

@dataclass
class InvestigationStep:
    step_number:      int
    description:      str   # what to do
    action:           str   # specific action to take
    expected_outcome: Optional[str]
```

  </Accordion>
</AccordionGroup>

- [去重](/zh/reference/deduplication) — 在冲突检测前消解重复实体。
- [本体](/zh/reference/ontology) — 逻辑冲突使用 SHACL 形状和本体公理。
- [溯源](/zh/reference/provenance) — 追踪每个冲突事实来自哪个来源。
- [知识图谱](/zh/reference/kg) — 正在检查冲突的图。