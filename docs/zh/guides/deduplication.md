---
title: "去重与实体合并"
description: "使用多因子相似度检测重复实体，采用可配置策略进行合并，并在规模化场景下保持知识图谱整洁。"
sourceHash: "e197ac345a8f56d443c9c57f7636d284605dddad152b7d66c5ad6e8fb78afa41"
---

## 什么是去重？

去重是指识别那些指向同一现实世界对象、但在数据中以独立记录形式出现的实体，并将它们合并为单一规范表示的过程。该过程解决了数据来自多个来源时出现的别名、拼写变体与格式差异问题。

**去重的核心概念：**

**规范实体（Canonical entity）** 是合并所有重复记录后，对某一现实世界对象的唯一权威表示。规范实体将成为知识图谱中所有关系所指向的节点。

**别名（Alias）** 是同一实体的其他名称或标识符。例如，"APT29"、"Cozy Bear" 和 "Midnight Blizzard" 都是同一威胁行为者的别名。

**实体消解（Entity resolution）** 是判定不同记录何时指向同一实体的更广泛流程，包括相似度计算、重复检测与合并等步骤。

**相似度算法：**
- **Jaro-Winkler** 衡量字符串相似度，对共享前缀给予更高分数，适用于名称具有相同开头的场景
- **Levenshtein** 距离统计将一个字符串转换为另一个字符串所需的字符编辑次数，适合捕获拼写错误与变体

**聚类（Clustering）** 使用 Union-Find 等算法将相关重复项归为一组，确保如果 A 与 B 匹配、B 与 C 匹配，则三者被归为一组，即使 A 与 C 并不直接匹配。

## 为什么使用去重？

**数据质量与一致性。** 消除那些割裂关系、并在同一实体的不同名称之间产生不一致查询结果的重复节点。

**准确的分析与指标。** 当实体不会因命名差异而被人工拆分到多个节点时，可获得正确的计数、中心性度量与关系分析。

**关系整合。** 将分散的关系合并到单一规范实体上，从而能够完整分析那些在碎片化数据下会被遗漏的连接与模式。

**来源集成。** 无缝合并来自多个数据馈送、系统与数据库的数据，其中相同实体以不同标识符与命名约定出现。

**图效率。** 通过消除冗余节点减小图规模并提升查询性能，同时通过合理的合并策略保留所有信息。

**保留溯源。** 维护完整的审计轨迹，展示每个信息来源来自哪个源，并最终归于规范实体。

## 何时使用 / 何时不使用

**适用去重的场景：**
- 多源数据集成，其中实体以不同名称或标识符出现
- 容易出现别名与变体的实体类型（组织、人员、产品、地理位置）
- 关系准确性依赖实体整合的知识图谱
- 需要规范实体管理的数据质量工作流
- 需要准确实体计数与关系指标的分析场景
- 同一现实世界对象跨多个系统或数据库出现的情况

**不适用去重的场景：**
- 单一来源数据，具有一致的实体标识符与命名约定
- 高吞吐流式场景，去重延迟不可接受
- 具有可靠主键、按设计不可能出现重复的数据
- 实体变体应保留为独立节点的情况（不同产品版本、基于时间的实体状态）
- 由基础数据库约束即可处理唯一性的简单精确匹配场景

**需要谨慎的场景：**
- O(n²) 两两比较在大型数据集上计算代价高昂
- 当存在确定性主键（LEI、CVE-ID、ISIN）时使用模糊匹配
- 过低的相似度阈值可能导致真正不同的实体被合并

## 典型工作流

去重工作流遵循从检测到合并的系统化流程：

**1. 检测** → 使用 `detect_duplicates()` 或 `DuplicateDetector`，通过多因子相似度评分识别潜在匹配

**2. 分组** → 应用聚类算法，将传递相关的重复项收集成组（A 匹配 B，B 匹配 C → 组 A、B、C）

**3. 选择规范实体** → 根据完整度、来源权威性或置信度分数为每组选择代表性实体

**4. 合并** → 使用 `keep_most_complete` 或 `merge_all` 等策略合并重复实体，同时保留溯源

**5. 验证** → 审查合并结果，并基于精确率/召回率分析调整阈值或策略

**6. 更新图** → 用规范实体替换重复节点，并转移所有关系

该流水线将碎片化的多源数据转化为整洁、整合的知识图谱，可用于分析与推理。

## API 模式：函数式与基于类

Semantica 同时提供简洁的函数式封装与全面的类 API，以适应不同使用场景：

**用于简单工作流的函数式封装：**
- `detect_duplicates()` — 以最少配置进行一次性的重复检测
- `calculate_similarity()` — 比较两个实体并给出详细相似度拆解
- `merge_entities()` — 对 merge_duplicates() 的便捷封装，用于快速合并

**用于复杂工作流的类 API：**
- `DuplicateDetector` — 可配置的重复检测，支持聚类、增量处理与高级相似度选项
- `EntityMerger` — 支持多种策略、溯源跟踪与合并历史的复杂合并

**使用指南：**
- 当你拥有一批原始实体并需要自动检测重复项时，使用 `merge_duplicates()`
- 当你已知哪些实体为重复项、只需合并一个预先确定的组时，使用 `merge_entity_group()`
- 不要在同一工作流中混用函数式封装与类 API—选择一种方式并坚持使用

去重模块通过六种互补的相似度算法—精确匹配、Levenshtein、Jaro-Winkler、余弦、属性比较与向量嵌入—在多源知识图谱中检测重复实体，然后将它们合并为单一规范实体，同时保留完整溯源。在运行图分析或冲突消解之前，可用它来折叠别名簇（例如 "APT29"、"Cozy Bear"、"Midnight Blizzard"）。

<Info>
在摄取之后、冲突消解之前运行去重。去重将重复节点折叠为单一规范实体。随后由冲突消解来调和该规范实体上不一致的属性值。流水线顺序很重要：先去重，再消解冲突，最后用 SHACL 验证。
</Info>

## 查找重复项：初次扫描

对于较小的数据集，从 `detect_duplicates()` 开始进行直观的重复检测。将实体传入，让两两算法使用多种相似度信号比较每一对。

**扩展性考量：** 对于数千个节点的数据集，这可在数秒内完成。O(n²) 两两比较成本仅在超过一万个实体时才会成为问题—对于更大的集合，请参见下文聚类部分。

```python
from semantica.deduplication import detect_duplicates

# Threat actors ingested from four different CTI feeds — same actors, different names
threat_actors = [
    {"id": "ta-nvd-001",  "name": "APT29",            "type": "ThreatActor",
     "country": "Russia",  "source": "MISP"},
    {"id": "ta-of-002",   "name": "APT-29",            "type": "ThreatActor",
     "country": "Russia",  "source": "OpenCTI"},
    {"id": "ta-rf-003",   "name": "Cozy Bear",         "type": "ThreatActor",
     "aliases": ["APT29"], "country": "Russia", "source": "RecordedFuture"},
    {"id": "ta-sx-004",   "name": "The Dukes",         "type": "ThreatActor",
     "aliases": ["APT29", "Cozy Bear"], "country": "Russia", "source": "STIX-partner"},
    {"id": "ta-ms-005",   "name": "Midnight Blizzard", "type": "ThreatActor",
     "aliases": ["NOBELIUM", "APT29"], "country": "Russia", "source": "Microsoft"},
    {"id": "ta-ap-006",   "name": "APT28",             "type": "ThreatActor",
     "country": "Russia",  "source": "MISP"},  # different actor — should NOT match
]

candidates = detect_duplicates(
    threat_actors,
    method="pairwise",          # compare every pair
    similarity_threshold=0.6,   # minimum score to flag as a candidate
    confidence_threshold=0.5,   # minimum confidence in the match
)

for c in candidates:
    print(f"{c.entity1['name']!r}  ~  {c.entity2['name']!r}")
    print(f"  similarity={c.similarity_score:.2f}  confidence={c.confidence:.2f}")
    print(f"  signals: {c.reasons}")
    print()
```

```text
'APT29'  ~  'APT-29'
  similarity=0.89  confidence=0.81
  signals: ['levenshtein', 'jaro_winkler']

'APT29'  ~  'Cozy Bear'
  similarity=0.63  confidence=0.71
  signals: ['property', 'relationship']   # alias field matched

'Cozy Bear'  ~  'The Dukes'
  similarity=0.61  confidence=0.68
  signals: ['property']                   # shared alias "APT29"

'APT29'  ~  'Midnight Blizzard'
  similarity=0.65  confidence=0.73
  signals: ['property']                   # alias "APT29" in Midnight Blizzard record
```

这些分数讲述了一个清晰的故事。"APT29" 与 "APT-29" 得分为 0.89—连字符是唯一差异，产生了强字符串相似度信号。"Cozy Bear" 与 "The Dukes" 得分较低（0.61），因为名称完全不同，但由于两条记录的别名列表中都带有 `"APT29"`，属性信号被触发。"APT28" 从未出现在结果中，因为它仅与国家字段相同—不足以超过 0.6 阈值。

## 理解候选对象

每个 `DuplicateCandidate` 携带两个实体、它们的相似度分数，以及哪些相似度算法对匹配有所贡献的详细拆解。这为审计和阈值调优提供了完全透明性：

```python
from semantica.deduplication import calculate_similarity

# Inspect a single pair in detail before committing to a merge
e1 = threat_actors[0]   # APT29
e2 = threat_actors[2]   # Cozy Bear

result = calculate_similarity(e1, e2, method="multi_factor")

print(f"Overall score : {result.score:.2f}")
print(f"Method        : {result.method}")
print(f"Components    :")
for algo, score in result.components.items():
    print(f"  {algo:<20} {score:.2f}")
```

```text
Overall score : 0.63
Method        : multi_factor
Components    :
  exact                0.00   # names are completely different strings
  levenshtein          0.12   # high edit distance between "APT29" and "Cozy Bear"
  jaro_winkler         0.21   # no shared prefix
  property             0.94   # alias match is nearly definitive
  relationship         0.71   # share relationships to overlapping malware families
  embedding            0.78   # semantic vectors land in the same cluster
```

这里的属性分量（0.94）起了主要作用。"Cozy Bear" 的记录带有 `aliases: ["APT29"]`，这几乎确定性地表明这些实体指向同一威胁行为者。当你看到这种模式—名称相似度弱但属性匹配强—通常意味着这是一个真实的别名关系，而非误报。

## 在合并前对重复项分组

对于小型数据集，你可以直接合并候选对。对于同一实体在十二个数据源中可能以六个不同名称出现的较大图谱，使用带 Union-Find 聚类的重复分组。这样可确保如果 A 匹配 B、B 匹配 C，则三者被归为一组，即使 A 与 C 并不直接满足相似度阈值：

```python
from semantica.deduplication import DuplicateDetector, EntityMerger

detector = DuplicateDetector(
    similarity_threshold=0.6,
    confidence_threshold=0.5,
    use_clustering=True,      # enable Union-Find grouping
)

groups = detector.detect_duplicate_groups(threat_actors)

print(f"Found {len(groups)} duplicate groups:")
for group in groups:
    names = [e["name"] for e in group.entities]
    print(f"  Group (confidence={group.confidence:.2f}): {names}")
    if group.representative:
        print(f"  Representative: {group.representative['name']!r}")
```

```text
Found 2 duplicate groups:
  Group (confidence=0.74): ['APT29', 'APT-29', 'Cozy Bear', 'The Dukes', 'Midnight Blizzard']
  Representative: 'APT29'   # highest completeness score in the group

  Group (confidence=0.81): ['APT28', 'Fancy Bear']
  Representative: 'APT28'
```

分组结果清晰地展示了整合效果：五个本应属于同一规范实体的独立节点。`representative` 字段标识合并器将作为基础的实体—通常为属性集最完整的那个，此处为来自 MISP 数据源的 "APT29"。

## 合并：在不丢失数据的前提下折叠分组

在识别出重复分组后，合并过程会将它们整合为规范实体。`keep_most_complete` 策略选择属性数量最多的实体作为规范节点，并用其他来源中缺失的字段对其进行补充：

```python
merger = EntityMerger(preserve_provenance=True)

for group in groups:
    if len(group.entities) < 2:
        continue

    # merge_entity_group() skips duplicate detection since `group.entities`
    # is already a confirmed group from detect_duplicate_groups()
    op = merger.merge_entity_group(group.entities, strategy="keep_most_complete")

    canonical = op.merged_entity
    source_ids = [e["id"] for e in op.source_entities]
    print(f"Merged {len(op.source_entities)} entities → canonical: {canonical['name']!r}")
    print(f"  Source IDs retired : {source_ids}")
    print(f"  Merge strategy     : {op.merge_result.metadata.get('strategy')}")
```

```text
Merged 5 entities → canonical: 'APT29'
  Source IDs retired : ['ta-nvd-001', 'ta-of-002', 'ta-rf-003', 'ta-sx-004', 'ta-ms-005']
  Merge strategy     : keep_most_complete
```

五个源实体被替换为一个规范表示。这五个节点所携带的每个关系—指向活动、恶意软件家族、TTP、基础设施—现在都附加到规范的 "APT29" 节点上。合并操作在消除冗余的同时保留了所有信息，且溯源记录准确展示了每个属性由哪个数据源贡献。

## 审查合并历史以供审计

在批量合并操作之后，你可以检索完整历史以审查每个决策。这一审计轨迹对于理解合并决策并向利益相关者解释它们至关重要：

```python
history = merger.get_merge_history()

print(f"Total merge operations: {len(history)}")
for op in history:
    print(f"  {op.merged_entity['name']!r} ← {len(op.source_entities)} sources")
    print(f"    strategy: {op.merge_result.metadata.get('strategy')}")
```

该历史提供了合并决策的完全透明性。当数据源所有者询问其实体为何被合并到另一个实体时，你有记录的证据与推理来说明该决策。

## 流式摄取：增量去重

当你的流水线处理连续数据流—新的威胁情报每小时到达—你并不希望在每一批次上都对整个图重新运行两两比较。使用增量检测，仅将新实体与现有规范集进行比较：

```python
# Existing graph entities (already deduplicated)
existing_actors = [
    {"id": "ta-nvd-001", "name": "APT29", "type": "ThreatActor", "country": "Russia"},
]

# New batch arriving from a fresh feed
new_batch = [
    {"id": "ta-new-007", "name": "NOBELIUM",      "type": "ThreatActor",
     "aliases": ["APT29"], "country": "Russia", "source": "MSTIC-2026-06"},
    {"id": "ta-new-008", "name": "Scattered Spider", "type": "ThreatActor",
     "country": "Unknown",  "source": "CrowdStrike"},
]

incremental = detector.incremental_detect(new_batch, existing_actors)

print(f"New duplicates found in this batch: {len(incremental)}")
for c in incremental:
    print(f"  {c.entity1['name']!r} matches existing {c.entity2['name']!r}")
    print(f"  score={c.similarity_score:.2f}")
```

```text
New duplicates found in this batch: 1
  'NOBELIUM' matches existing 'APT29'
  score=0.67        # alias field carries "APT29" — property signal fires
```

NOBELIUM 被排队与现有 APT29 规范实体合并。Scattered Spider 与每个现有行为者的得分均低于阈值，因此作为新的唯一节点加入图中。

## 扩展到大型实体集

对于超过一万个节点的图，由于其 O(n²) 复杂度，两两比较的计算代价变得高昂。使用 `build_clusters()` 运行更高效的向量化批量比较，然后合并每个生成的簇：

**性能警告：** 始终在具有代表性的数据规模上对你的相似度操作进行性能分析。对于 1,000 个实体可行的做法，在没有适当扩展策略的情况下，在 10,000+ 实体时可能变得不可接受的缓慢。

```python
from semantica.deduplication import build_clusters

# Ten thousand CVE entities from NVD, Vulhub, and vendor feeds
# (not shown — assume `all_vulns` is a list of 10k+ dicts)

cluster_result = build_clusters(
    all_vulns,
    method="graph_based",        # Union-Find over similarity graph
    similarity_threshold=0.75,
)

print(f"Clusters found   : {len(cluster_result.clusters)}")
print(f"Unclustered      : {len(cluster_result.unclustered)}")
print(f"Quality metrics  : {cluster_result.quality_metrics}")

# Merge each cluster
merger = EntityMerger(preserve_provenance=True)
for cluster in cluster_result.clusters:
    if len(cluster.entities) > 1:
        # Use merge_entity_group() since clustering already determined these are duplicates
        merger.merge_entity_group(cluster.entities, strategy="keep_most_complete")
```

对于更大的集合，切换到 `method="hierarchical"`，它使用自底向上的凝聚式聚类，可扩展到数十万个实体，代价是损失一些精确率。

## 一个简单示例：客户去重

在探索特定领域案例之前，让我们先走查一个直观的客户去重场景。某公司的 CRM 系统不断积累来自网站注册、销售团队录入与支持工单的重复客户记录：

```python
from semantica.deduplication import detect_duplicates, merge_entities

customers = [
    {"id": "cust-001", "name": "John Smith", "email": "john.smith@email.com", 
     "company": "Acme Corp", "source": "web_signup"},
    {"id": "cust-002", "name": "J. Smith", "email": "john.smith@email.com",
     "company": "Acme Corporation", "source": "sales_team"},
    {"id": "cust-003", "name": "John Smith", "phone": "+1-555-0123",
     "company": "Acme Corp", "source": "support_ticket"},
    {"id": "cust-004", "name": "Jane Doe", "email": "jane.doe@email.com",
     "company": "Beta Inc", "source": "web_signup"},
]

# Step 1: Find potential duplicates
candidates = detect_duplicates(
    customers,
    method="pairwise",
    similarity_threshold=0.6,  # 60% similarity required
    confidence_threshold=0.5,
)

print("Potential duplicates found:")
for c in candidates:
    print(f"  {c.entity1['name']} ~ {c.entity2['name']} (score: {c.similarity_score:.2f})")
    print(f"    Matching signals: {c.reasons}")

# Expected output:
# John Smith ~ J. Smith (score: 0.82)
#   Matching signals: ['exact', 'property']  # same email
# John Smith ~ John Smith (score: 0.78)  
#   Matching signals: ['exact', 'property']  # same name and company

# Step 2: Merge the duplicates
john_smith_records = [customers[0], customers[1], customers[2]]  # All John Smith variants
merged_ops = merge_entities(john_smith_records, method="keep_most_complete")

for op in merged_ops:
    canonical = op.merged_entity
    print(f"\nCanonical customer: {canonical['name']}")
    print(f"  Email: {canonical.get('email', 'N/A')}")
    print(f"  Phone: {canonical.get('phone', 'N/A')}")
    print(f"  Company: {canonical['company']}")
    print(f"  Merged from {len(op.source_entities)} records")
    
# Result: One John Smith record with email, phone, and company information
# from all three original records, with full provenance tracking
```

该示例展示了核心概念：相似度检测发现相关记录，合并将它们整合为保留所有可用信息的规范实体。

## 常见陷阱

**未经校验的阈值调优。** 将阈值设得过低会在真正不同的实体之间产生误报合并。在运行大规模合并操作之前，始终手动审查检测到的重复项样本。

**两两比较的扩展性问题。** 比较每个实体对的 O(n²) 成本在超过 10,000 个实体时变得不可接受。对于大型数据集，使用聚类方法（`build_clusters`）或切换到向量化相似度。

**存在主键时使用模糊匹配。** 如果你的实体具有可靠的唯一标识符（LEI 编码、CVE ID、ISBN 编号），请在这些字段上使用精确匹配，而非计算代价高昂的相似度算法。

**不一致地混用封装与类 API。** 不要先调用 `detect_duplicates()` 再手动实例化 `EntityMerger`—选择函数式方式或基于类的方式，并在整个工作流中一致使用。

**忽略合并策略的影响。** `keep_first` 会完全覆盖后续记录，`merge_all` 可能引入冲突值，而 `keep_most_complete` 可能不尊重来源权威性。选择符合你数据质量要求的策略。

**跳过溯源跟踪。** 没有 `preserve_provenance=True`，你将失去对规范实体中每个字段由哪个来源贡献的可见性，导致审计轨迹无法建立。

**相似度算法选择不当。** 纯字符串相似度对别名关系（"APT29" 与 "Cozy Bear"）无效，而属性匹配对于共享属性但身份不同的实体可能过于激进。

## 领域示例

<Tabs>

<Tab title="国防 — CTI/威胁">

某威胁情报平台从 Mandiant、CrowdStrike、MITRE ATT&CK 与合作伙伴 ISAC 数据源摄取行为者档案。同一行为者以厂商特定名称出现："Cozy Bear"（CrowdStrike）、"APT29"（MITRE）、"Midnight Blizzard"（Microsoft）、"The Dukes"（F-Secure）。在任何分析师查询运行之前，这些别名必须折叠为单一规范节点，以便关系—使用的恶意软件、运营的基础设施、归因的活动—都附加到一个位置。

别名字段是此处的关键信号。当任何记录在其 `aliases` 列表中携带规范名称时，基于属性的相似度将强烈触发。设置中等阈值（0.6）可捕获仅靠名称相似度会遗漏的基于别名的匹配。

```python
from semantica.deduplication import DuplicateDetector, EntityMerger

actors = [
    {"id": "ta-cs-001",  "name": "Cozy Bear",         "type": "ThreatActor",
     "aliases": ["APT29", "The Dukes"],  "country": "Russia", "source": "CrowdStrike"},
    {"id": "ta-mt-002",  "name": "APT29",              "type": "ThreatActor",
     "aliases": [],                       "country": "Russia", "source": "MITRE"},
    {"id": "ta-ms-003",  "name": "Midnight Blizzard",  "type": "ThreatActor",
     "aliases": ["NOBELIUM", "APT29"],   "country": "Russia", "source": "Microsoft"},
    {"id": "ta-fs-004",  "name": "The Dukes",          "type": "ThreatActor",
     "aliases": ["APT29", "Cozy Bear"],  "country": "Russia", "source": "F-Secure"},
    {"id": "ta-mt-005",  "name": "APT28",              "type": "ThreatActor",
     "aliases": ["Fancy Bear"],           "country": "Russia", "source": "MITRE"},
]

detector = DuplicateDetector(similarity_threshold=0.6, confidence_threshold=0.5)
groups = detector.detect_duplicate_groups(actors)

merger = EntityMerger(preserve_provenance=True)
for group in groups:
    if len(group.entities) < 2:
        continue
    ops = merger.merge_duplicates(group.entities, strategy="keep_most_complete")
    for op in ops:
        feeds = [e["source"] for e in op.source_entities]
        print(f"Canonical: {op.merged_entity['name']!r}  (merged from: {feeds})")
        # Canonical: 'APT29'  (merged from: ['CrowdStrike', 'MITRE', 'Microsoft', 'F-Secure'])
        # All four actor nodes collapse to one — every relationship they held now
        # attaches to the canonical APT29 node.
```

</Tab>

<Tab title="安全 — SOC/事件">

某 SOC 漏洞管理数据库从 NVD、Vulhub、CISA KEV 与厂商公告摄取 CVE。同一 CVE 常以不同形式到达：NVD 中的 "CVE-2024-3400"、Tenable 插件中的 "PAN-OS GlobalProtect RCE"，以及博客文章聚合器中的 "Critical PAN-OS 0day"。仅靠名称相似度无法匹配这些—`cve_id` 字段中的 CVE ID 才是确定性信号。

```python
from semantica.deduplication import detect_duplicates, merge_entities

vulns = [
    {"id": "v-nvd-001",  "name": "CVE-2024-3400",
     "description": "PAN-OS GlobalProtect command injection RCE",
     "cvss": 10.0, "source": "NVD",      "type": "Vulnerability"},
    {"id": "v-cisa-002", "name": "CVE-2024-3400",
     "description": "Critical PAN-OS vulnerability in active exploitation",
     "cvss": 10.0, "source": "CISA-KEV", "type": "Vulnerability"},
    {"id": "v-ten-003",  "name": "PAN-OS GlobalProtect RCE",
     "cve_id": "CVE-2024-3400",
     "cvss": 10.0, "source": "Tenable",  "type": "Vulnerability"},
    {"id": "v-nvd-004",  "name": "CVE-2023-44487",
     "description": "HTTP/2 Rapid Reset DDoS amplification",
     "cvss": 7.5,  "source": "NVD",      "type": "Vulnerability"},
]

# Low threshold because name similarity between "CVE-2024-3400" and
# "PAN-OS GlobalProtect RCE" is near zero — we need property signals to fire
candidates = detect_duplicates(
    vulns,
    method="pairwise",
    similarity_threshold=0.5,
    confidence_threshold=0.4,
)

for c in candidates:
    print(f"{c.entity1['name']!r}  ~  {c.entity2['name']!r}")
    print(f"  score={c.similarity_score:.2f}  signals={c.reasons}")
    # 'CVE-2024-3400'  ~  'PAN-OS GlobalProtect RCE'
    #   score=0.61  signals=['property', 'exact']   # cve_id field match

# Merge the three CVE-2024-3400 variants
cve_group = [v for v in vulns if "3400" in v["name"] or v.get("cve_id") == "CVE-2024-3400"]
ops = merge_entities(cve_group, method="keep_most_complete", preserve_provenance=True)
for op in ops:
    print(f"Canonical CVE: {op.merged_entity['name']}  CVSS={op.merged_entity.get('cvss')}")
    # Canonical CVE: CVE-2024-3400  CVSS=10.0
    # One node now carries all three source records' provenance.
```

</Tab>

<Tab title="生命科学 — 临床/制药">

某临床试验知识图谱从 WHO INN 列表、PubChem、品牌名数据库与试验注册库摄取药物实体。Warfarin 以 "warfarin"（INN）、"Coumadin"（品牌，Bristol-Myers Squibb）、"warfarin sodium"（PubChem 化学形态）与 "81-81-2"（CAS 号）等形式出现。CAS 号是基准真值—如果两条记录共享同一 CAS 号，则无论其名称如何，它们都是同一化合物。

```python
from semantica.deduplication import DuplicateDetector, EntityMerger, calculate_similarity

compounds = [
    {"id": "c-inn-001", "name": "warfarin",         "type": "Drug",
     "cas": "81-81-2",   "source": "WHO-INN"},
    {"id": "c-bms-002", "name": "Coumadin",         "type": "Drug",
     "cas": "81-81-2",   "source": "BMS-brand"},
    {"id": "c-pc-003",  "name": "warfarin sodium",  "type": "Drug",
     "source": "PubChem"},                            # no CAS — less complete record
    {"id": "c-inn-004", "name": "metoprolol",       "type": "Drug",
     "cas": "37350-58-6","source": "WHO-INN"},
    {"id": "c-nov-005", "name": "Lopressor",        "type": "Drug",
     "cas": "37350-58-6","source": "Novartis-brand"},
]

# The property method scores CAS number matches extremely high
sim = calculate_similarity(compounds[0], compounds[1], method="property")
print(f"warfarin vs Coumadin: {sim.score:.2f}")
# warfarin vs Coumadin: 0.91  — CAS match dominates

detector = DuplicateDetector(similarity_threshold=0.6, confidence_threshold=0.5)
groups = detector.detect_duplicate_groups(compounds)

merger = EntityMerger(preserve_provenance=True)
for group in groups:
    if len(group.entities) < 2:
        continue
    ops = merger.merge_duplicates(group.entities, strategy="keep_most_complete")
    for op in ops:
        print(f"Canonical: {op.merged_entity['name']!r}  CAS={op.merged_entity.get('cas')}")
        print(f"  Sources: {[e['source'] for e in op.source_entities]}")
        # Canonical: 'warfarin'  CAS=81-81-2
        #   Sources: ['WHO-INN', 'BMS-brand', 'PubChem']
        # All three warfarin records merge; WHO-INN record wins as most complete.
```

</Tab>

<Tab title="银行 — 风险/合规">

某风险管理系统在构建交易对手风险敞口图之前，在 CRM、KYC 与交易系统中对企业客户进行解析。法人实体标识符（LEI）是确定性标识符—一个 20 字符的 ISO 17442 编码，在全球范围内唯一标识每个法人实体。如果两条记录共享同一 LEI，则无论名称格式如何，它们都是同一法人实体。

三份 BlackRock 记录—"BlackRock Inc."（CRM）、"BlackRock, Inc."（KYC，带逗号）、"Blackrock"（交易系统，小写 b）—必须在聚合信用敞口之前折叠为单一规范交易对手。属性相似度方法将 LEI 匹配得分接近 1.0，即使名称相似度中等也能处理。

```python
from semantica.deduplication import build_clusters, EntityMerger

clients = [
    {"id": "crm-001", "name": "BlackRock Inc.",           "type": "Client",
     "lei": "549300HLPTRASHS0E726", "source": "CRM"},
    {"id": "kyc-001", "name": "BlackRock, Inc.",          "type": "Client",
     "lei": "549300HLPTRASHS0E726", "source": "KYC"},
    {"id": "trd-001", "name": "Blackrock",                "type": "Client",
     "lei": "549300HLPTRASHS0E726", "source": "TradeOps"},
    {"id": "crm-002", "name": "Vanguard Group",           "type": "Client",
     "lei": "549300IH7BVXP9VN3J07", "source": "CRM"},
    {"id": "kyc-002", "name": "The Vanguard Group, Inc.", "type": "Client",
     "lei": "549300IH7BVXP9VN3J07", "source": "KYC"},
]

cluster_result = build_clusters(
    clients,
    method="graph_based",
    similarity_threshold=0.65,   # LEI match alone scores above this
)

merger = EntityMerger(preserve_provenance=True)
for cluster in cluster_result.clusters:
    if len(cluster.entities) < 2:
        continue
    ops = merger.merge_duplicates(cluster.entities, strategy="keep_most_complete")
    for op in ops:
        sources = [e["source"] for e in op.source_entities]
        print(f"Canonical: {op.merged_entity['name']!r}  (from {sources})")
        # Canonical: 'BlackRock Inc.'  (from ['CRM', 'KYC', 'TradeOps'])
        # Canonical: 'Vanguard Group'  (from ['CRM', 'KYC'])

print(f"\nBefore: {len(clients)} client records")
print(f"After : {len(cluster_result.clusters)} canonical counterparties")
print(f"Quality: {cluster_result.quality_metrics}")
```

</Tab>

</Tabs>

## 选择合适的阈值

相似度阈值控制敏感度。从 0.7 开始，检查误报后再进行调整：

- **0.95 及以上** — 仅近似精确的字符串匹配。适用于编码和 ID（LEI、CAS、CVE-ID），其名称格式在各数据源中保持一致。
- **0.80–0.95** — 捕获排版变体："Apple Inc." 与 "Apple, Inc."，"BlackRock" 与 "BlackRock Inc."
- **0.65–0.80** — 捕获缩写与简短形式。对于在各数据源中同时以长形式和短形式出现的组织名称是必要的。
- **0.50–0.65** — 语义相似度领域。需要属性或嵌入信号来补偿较弱的名称相似度。此范围适用于基于别名的匹配，其中名称可能指代同一实体的完全不同的字符串。

## 选择合并策略

| 策略 | 适用场景 |
| :--- | :--- |
| `keep_most_complete` | 没有指定的权威来源；最大化信息密度。默认选择。 |
| `keep_first` | 你的第一个来源是黄金记录系统（MDM、LEI 注册表），其数据不应被覆盖。 |
| `keep_highest_confidence` | 你的实体携带显式置信度分数，且你将其信任为质量信号。 |
| `merge_all` | 你想要所有属性的超集；在你之后会运行冲突消解来调和分歧时可接受。 |

## 相关指南

- [Ingest Anything](/zh/guides/ingest) — 多源摄取会产生本模块所消解的重复项
- [Context Graphs](/zh/guides/context-graphs) — 将去重后的实体直接存储在知识图谱中
- [Conflict Resolution](/zh/guides/conflict-resolution) — 合并后，调和规范实体上不一致的属性值
- [Provenance](/zh/guides/provenance) — 跟踪合并血缘，使每个规范实体都可追溯回其原始来源
- [Pipeline](/zh/guides/pipeline) — 通过 `PipelineBuilder` 工作流将摄取、去重与存储串联起来