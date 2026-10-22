---
title: "溯源与审计轨迹"
description: "Semantica 如何通过符合 W3C PROV-O 的记录，配合 SHA-256 完整性校验和、SQLite 持久化以及跨模块审计轨迹，跟踪每个实体、关系、分块和属性的来源与血缘——适用于国防、制药、银行和安全合规场景。"
icon: "file-certificate"
sourceHash: "1d2093cc1f8f8451471bc27eaabeb4fa6f7244c90fed64d56cfeaa4f1ac2d699"
---

## 什么是溯源？

溯源是对数据来源、数据如何被转换以及生命周期中每一步由谁负责的系统化记录。与仅描述实体的普通图元数据不同，溯源会创建不可变的审计轨迹，跟踪系统中每条信息的完整历史。

**核心溯源概念：**

**血缘**追溯从原始来源经过所有转换直至当前状态的保管链，准确展示数据随时间如何演变。

**来源归属**记录产生每个数据元素的具体文档、数据库、API 调用或人工输入，从而实现精确引用和验证。

**完整性校验**使用加密校验和检测溯源记录创建后发生的任何未经授权的更改。

**审计轨迹**通过维护所有数据操作、转换和决策的防篡改日志，满足监管合规要求。

溯源不同于简单元数据，它会创建具有法律辩护力、可通过加密验证的记录，回答关键问题：“这来自哪里？”、“谁处理了它？”、“它何时发生了变化？”以及“它是否被篡改过？”

## 为什么使用溯源？

**满足监管要求。** 符合 FDA 21 CFR Part 11、ICH E6(R2) GCP、Basel III BCBS 239 以及国防情报共享协议的要求，这些法规和协议强制要求完整的数据可追溯性和电子记录完整性。

**来源归属与引用。** 将每个实体、关系和属性值追溯到其确切来源文档、API 响应或人工输入，以支持科学可复现性和法律辩护力。

**可审计性与透明度。** 为审计人员、监管机构和利益相关者提供数据处理工作流的完整可见性，包括每项操作由谁执行以及更改发生的时间。

**冲突消解与数据质量。** 当多个来源为同一属性提供不同值时，溯源记录可通过比较来源可信度、时效性和置信水平，支持基于证据的冲突消解。

**篡改检测与取证。** 加密完整性校验可检测对数据记录的未经授权修改，支持安全敏感环境中的事件响应和取证分析。

**数据血缘可追溯性。** 回答关于数据血统的复杂问题，尤其是在多阶段处理流水线中，实体需要经历抽取、丰富、融合和分析转换。

## 何时使用 / 何时不使用

**在以下场景使用溯源跟踪：**
- 需要审计轨迹的受监管环境（医疗、金融、国防、制药）
- 多源数据融合，且必须基于证据消解冲突信息
- 长期存在的知识图谱，其中数据质量和来源可信度很重要
- 数据完整性和篡改检测至关重要的生产系统
- 实体经历多次转换的复杂处理流水线
- 需要基于抽取数据做出的决策具备法律辩护力的场景

**在以下场景中，溯源可能并非必要：**
- 不要求合规的简单原型和概念验证演示
- 仅处理一次数据并立即丢弃结果的临时工作流
- 不跨会话持久化数据的无状态应用
- 使用可信单一来源数据的内部研究项目
- 高频、低延迟操作，其中溯源开销会影响性能
- 所有数据都来自单一、高度可信且永不更改的来源的场景

**在以下情况下，可考虑更简单的替代方案：**
- 基础元数据（创建时间戳、源文件名）已提供足够的可追溯性
- 数据处理透明且仅通过版本控制即可复现
- 监管合规不要求加密完整性校验

`ProvenanceManager` 会为每个实体、关系、文档分块和属性值记录符合 W3C PROV-O 的条目——包含用于篡改检测的 SHA-256 校验和，并在每次调用 `track_entity()` 时自动进行版本链式关联。当你需要回答监管问题——某个值来自哪里、谁写入的、自首次摄取以来是否发生变化——请使用它。

<Info>
KG 流水线会自动对其抽取的所有内容调用 `track_entity()` 和 `track_relationship()`，因此通过标准流水线进入的实体已经被跟踪。当你需要自定义审计集成、跨模块血缘链，或跨多个来源的细粒度属性级归属时，请使用本文介绍的手动 API。
</Info>

## 设置溯源存储

`ProvenanceManager` 支持两种存储后端。内存存储零依赖，适合测试。SQLite 存储可跨重启持久化，支持并发读取，并为你的合规团队提供一个可直接查询的标准数据库。

```python
from semantica.provenance import ProvenanceManager

# In-memory — session only, no persistence
prov = ProvenanceManager()

# SQLite — persists to disk, free concurrent reads
prov = ProvenanceManager(storage_path="provenance.db")

# Custom backend — pass any ProvenanceStorage implementation
from semantica.provenance.storage import SQLiteStorage
prov = ProvenanceManager(storage=SQLiteStorage("audit.db"))
```

对于任何受监管部署——安全运营、临床数据、金融风险——请使用 `storage_path`。SQLite 文件可以通过标准工具备份、版本控制和查询，无需服务器。

<Note>
  `SQLiteStorage` 会自动配置预写日志（`WAL`）、`busy_timeout=5000` 和 `synchronous=NORMAL`，并在原子立即事务（`BEGIN IMMEDIATE`）中执行读-改-写操作（如 `track_entity()`）；普通读取（`retrieve()`、`trace_lineage()`）使用单独连接且不显式加写锁，因此不会在写入者之后串行排队。此外，`ProvenanceManager` 自动支持仅重写 `trace_lineage(self, entity_id)` 的自定义存储后端，且其签名中无需包含 `max_depth`。
</Note>

## 摄取数据时记录溯源

数据进入图谱的那一刻，就必须记录溯源。`track_entity()` 会捕获来源文档、时间戳、执行抽取的操作员或流水线、来自来源的逐字引用以及置信分数。它返回 `Optional[ProvenanceEntry]`（成功时为 `ProvenanceEntry`，若在全新实体上存储失败则为 `None`），并自动计算 SHA-256 校验和。

```python
# Ingesting CVE-2024-3400 from NVD and a commercial feed
# Both are tracked separately so the full multi-source picture is preserved.

entry_nvd = prov.track_entity(
    entity_id="cve-2024-3400",
    source="NVD_feed_2024-04-12",
    metadata={
        "cvss_score": 10.0,
        "vector": "AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:H/A:H",
        "exploit_status": "unconfirmed",
    },
    confidence=0.98,
    entity_type="vulnerability",
    activity_id="nvd_feed_ingestion",
    source_location="CVE-2024-3400 JSON record",
    source_quote='{"cvssMetricV31":[{"cvssData":{"baseScore":10.0}}]}',
)

print(f"Entity tracked : {entry_nvd.entity_id}")
print(f"Source         : {entry_nvd.source_document}")
print(f"Timestamp      : {entry_nvd.timestamp}")
print(f"Checksum       : {entry_nvd.checksum}")       # SHA-256 hex digest
print(f"First seen     : {entry_nvd.first_seen}")     # set on first call only
```

```text
Entity tracked : cve-2024-3400
Source         : NVD_feed_2024-04-12
Timestamp      : 2024-04-12T14:22:07.881Z
Checksum       : 3f7a9c2d...                          # tamper-detectable
First seen     : 2024-04-12T14:22:07.881Z
```

现在跟踪一小时后从商业 feed 到达的同一实体。对同一 `entity_id` 再次调用 `track_entity()` 会自动将 NVD 条目归档为历史记录，并创建一个新的当前条目，通过 `parent_entity_id` 与其关联：

```python
entry_commercial = prov.track_entity(
    entity_id="cve-2024-3400",
    source="commercial_feed_2024-04-12",
    metadata={
        "cvss_score": 9.8,
        "exploit_status": "in_wild",
        "observed_exploitation": True,
    },
    confidence=0.91,
    entity_type="vulnerability",
    activity_id="commercial_feed_ingestion",
)

# The NVD entry is now archived as cve-2024-3400:v:2024-04-12T14:22:07
# The commercial entry is the new current state
# entry_commercial.parent_entity_id == "cve-2024-3400:v:2024-04-12T14:22:07"
```

这种版本链式关联会自动发生。你无需手动管理历史条目。

## 跟踪多来源属性值

当同一属性在多个来源中以不同值出现时——正是 CVE 评分的情形——使用 `track_property_source()` 分别记录每个归属。这会直接供下游冲突检测使用：冲突模块可以比较某属性的所有已跟踪值，并在附带完整来源元数据的情况下呈现分歧。

**SourceReference** 是一个结构化元数据容器，用于精确捕获某条信息在文档中的来源位置。它包括文档标识符、具体位置（页码、章节、字节范围）、置信水平以及用于领域特定归属要求的自定义元数据字段。

```python
from semantica.provenance.schemas import SourceReference

nvd_ref = SourceReference(
    document="NVD_feed_2024-04-12",
    section="cvssMetricV31",
    confidence=0.98,
    metadata={"publisher": "NIST", "feed_type": "NVD"},
)

commercial_ref = SourceReference(
    document="commercial_feed_2024-04-12",
    section="cvss_assessment",
    confidence=0.91,
    metadata={"publisher": "ThreatFeed-Co", "observed": True},
)

# Track each source's value separately under the same entity + property key
prov.track_property_source("cve-2024-3400", "cvss_score", 10.0, nvd_ref)
prov.track_property_source("cve-2024-3400", "cvss_score", 9.8,  commercial_ref)

# Property sources are stored under "<entity_id>_<property_name>"
# Later: retrieve all sources for this property to answer "where did 9.8 come from?"
sources = prov.get_all_sources("cve-2024-3400_cvss_score")
for s in sources:
    print(f"{s['source']:<35}  confidence={s['confidence']:.2f}  loc={s['location'] or '—'}")
```

```text
NVD_feed_2024-04-12                   confidence=0.98  loc=cvssMetricV31
commercial_feed_2024-04-12            confidence=0.91  loc=cvss_assessment
```

当监管机构问“9.8 来自哪里？”时，这就是答案：`commercial_feed_2024-04-12`，章节 `cvss_assessment`，置信度 0.91，并附有完整元数据，表明这是一家商业发布商报告了已观测到的利用情况。

## 追踪节点的血缘

一旦某实体拥有多个溯源条目，你就可以追踪其完整历史，以了解它随时间如何演变。摄取六个月后，运行一次血缘追踪。`get_lineage()` 返回完整版本链——实体经历过的每个状态，从最旧到最新——以及摘要元数据：

```python
lineage = prov.get_lineage("cve-2024-3400")

print(f"Entity      : {lineage['entity_id']}")
print(f"First seen  : {lineage['first_seen']}")
print(f"Last updated: {lineage['last_updated']}")
print(f"History depth: {lineage['entity_count']} entries")
print(f"Sources seen : {lineage['source_documents']}")
print()
print("Full version chain (oldest → newest):")
for entry in lineage["lineage_chain"]:
    print(f"  [{entry['timestamp'][:19]}]  agent={entry['agent_id']}")
    print(f"    source={entry['source_document']}")
    print(f"    activity={entry['activity_id']}")
```

```text
Entity      : cve-2024-3400
First seen  : 2024-04-12T14:22:07.881Z
Last updated: 2024-10-08T09:11:44.302Z
History depth: 4 entries
Sources seen : ['NVD_feed_2024-04-12', 'commercial_feed_2024-04-12',
                'NVD_feed_2024-07-18', 'commercial_feed_2024-10-08']

Full version chain (oldest → newest):
  [2024-04-12T14:22:07]  agent=semantica
    source=NVD_feed_2024-04-12
    activity=nvd_feed_ingestion
  [2024-04-12T15:18:33]  agent=semantica
    source=commercial_feed_2024-04-12
    activity=commercial_feed_ingestion
  [2024-07-18T08:04:11]  agent=semantica
    source=NVD_feed_2024-07-18
    activity=nvd_feed_ingestion       # NVD updated their score
  [2024-10-08T09:11:44]  agent=semantica
    source=commercial_feed_2024-10-08
    activity=commercial_feed_ingestion
```

这条链回答了监管方的全部三个问题。9.8 来自 `commercial_feed_2024-04-12`。操作方是 `threat_ingest_pipeline_v2`。评分已经发生变化——NVD 于 7 月 18 日更新了其记录——而这条链精确地显示了变化发生的时刻。

## 验证完整性

每个 `ProvenanceEntry` 都带有一个在写入时计算的 SHA-256 校验和。如果事后修改了任何字段——无论是由于配置错误的流水线、数据库迁移，还是蓄意篡改——重新计算时校验和都将不匹配。

完整性验证对于监管合规和取证分析至关重要。在任何合规审计中都要执行完整性检查：

```python
from semantica.provenance.integrity import compute_checksum

raw_entries = prov.trace_lineage("cve-2024-3400")

print("Integrity check:")
for e in raw_entries:
    stored   = e.checksum
    computed = compute_checksum(e)
    status   = "OK" if stored == computed else "TAMPERED"
    print(f"  [{status}] {e.entity_id[:50]}  {(stored or '')[:16]}...")
```

```text
Integrity check:
  [OK] cve-2024-3400                                 3f7a9c2d...
  [OK] cve-2024-3400:v:2024-04-12T14:22:07           a1b2c3d4...
  [OK] cve-2024-3400:v:2024-04-12T15:18:33           e5f6a7b8...
  [OK] cve-2024-3400:v:2024-07-18T08:04:11           c9d0e1f2...
```

出现 `TAMPERED` 状态意味着存储的哈希值与依据当前字段值计算出的哈希值不匹配——这表明存在写入后修改，在将该记录用于合规目的之前必须对此进行调查。

## 跟踪文档分块及其子分块

溯源不仅适用于实体。当文档被拆分为分块，以用于检索增强生成（RAG）或自然语言处理工作流时，每个分块都需要有自己的溯源记录，将其链接到源文件和字节范围。

子分块（来自递归拆分）通过 `parent_chunk_id` 链接到其父分块，该字段对应 W3C PROV-O 标准中的 `prov:wasDerivedFrom`：

```python
# Track the parent chunk (a section of an advisory PDF)
prov.track_chunk(
    chunk_id="advisory_section_3",
    source_document="CISA_advisory_AA24-099A.pdf",
    source_path="/feeds/cisa/advisories/AA24-099A.pdf",
    start_index=4096,
    end_index=8192,
)

# Track a child chunk derived from recursive splitting
prov.track_chunk(
    chunk_id="advisory_section_3a",
    source_document="CISA_advisory_AA24-099A.pdf",
    source_path="/feeds/cisa/advisories/AA24-099A.pdf",
    start_index=4096,
    end_index=6144,
    parent_chunk_id="advisory_section_3",   # prov:wasDerivedFrom
)

# Retrieve the provenance record for a chunk
record = prov.get_provenance("advisory_section_3a")
if record:
    print(f"Source   : {record['source_document']}")
    print(f"Range    : bytes {record['start_index']}–{record['end_index']}")
    print(f"Parent   : {record['parent_entity_id']}")  # advisory_section_3
    print(f"Checksum : {record['checksum']}")
```

对于 GDPR 的被遗忘权工作流，每个分块溯源记录中的字节范围会准确告诉你：当数据主体提出删除请求时，应当删除哪个文档的哪一部分。

## 溯源存储的统计信息

在一次大规模摄取运行之后，`get_statistics()` 会给出所有已跟踪内容的摘要：

```python
stats = prov.get_statistics()

print(f"Total tracked    : {stats['total_entries']}")
print(f"By entity type   : {stats['entity_types']}")
print(f"Unique sources   : {stats['unique_sources']}")
```

```text
Total tracked    : 14,822
By entity type   : {'vulnerability': 3041, 'chunk': 8204, 'relationship': 2891,
                    'property': 686}
Unique sources   : 12
```

该摘要是合规证明的起点：你可以陈述已跟踪记录的总数、不同数据源的数量，以及按记录类型的细分。

## 常见陷阱

**溯源并不保证真实性。** 溯源记录忠实跟踪信息的来源及其处理方式，但无法验证原始来源是否准确。即使一条链条被完美记录，只要来源存在缺陷或恶意，它依然会产生不可靠的数据。

**复用通用源标识符。** 使用「daily_feed」或「batch_001」这类不具体的源 ID，会导致无法将单条记录追溯到其确切来源。务必在源文档名称中包含时间戳、版本号或唯一的批次标识符。

**绕过溯源工作流。** 手动插入数据，或使用跳过 `track_entity()` 调用的临时脚本，会在审计轨迹中造成缺口。确保所有数据入口——自动化流水线、人工更正以及管理操作——都记录适当的溯源。

**忽视血缘验证。** 在多阶段处理流水线中，溯源链可能变得复杂。定期验证 `get_lineage()` 和 `trace_lineage()` 返回的链条完整且合乎逻辑，没有缺失环节或循环引用。

**在低价值场景中过度使用溯源。** 为每一个中间计算或临时变量记录溯源会造成存储开销，却带不来合规收益。应将溯源跟踪聚焦于具有法律、监管或业务意义的实体、关系和属性。

**未验证完整性校验和。** 加密完整性验证只有在你实际执行检查时才有效。在审计工作流和事件响应流程中加入定期的 `compute_checksum()` 验证。

**混用溯源粒度。** 对某些实体按文档级别跟踪，对另一些按句子级别跟踪，会造成不一致的审计轨迹。为每种数据类型和处理工作流建立一致的粒度标准。

## 领域示例

<Tabs>

<Tab title="国防 — CTI/威胁">

一个信号情报融合小组跟踪每个情报实体从原始采集、经过分析处理、直至成品情报的保管链。链的每一层——原始采集、NER 抽取、融合以及成品情报——都必须单独记录，并附上相应的密级处理和操作员身份。溯源链就是保管链：它证明成品情报在每一步都可追溯到经授权的采集和经授权的分析。

根据 ITAR 以及情报界共享协议，溯源记录必须显示：原始数据由哪种采集方法产生、哪位分析师对其进行了处理，以及在实体进入成品情报之前，哪个融合活动将其与其他情报结合在一起。`track_chunk()`、`track_entity()` 和 `track_relationship()` 各自对应这条链的某一层。

```python
from semantica.provenance import ProvenanceManager
from semantica.provenance.schemas import SourceReference

prov = ProvenanceManager(storage_path="intel_provenance.db")

# Tier 1: Raw collection
prov.track_chunk(
    chunk_id="osint_collection_20260621_0442Z",
    source_document="COLLECTION_TASKING_TK-2026-0192",
    source_path="/osint/raw/20260621_0442Z.txt",
    start_index=0,
    end_index=2048,
    classification="UNCLASSIFIED//FOUO",
    collection_method="OSINT",
    collector_id="STATION_ECHO",
)

# Tier 2: Entity extracted from collection
prov.track_entity(
    entity_id="threat_actor_DELTA9",
    source="osint_collection_20260621_0442Z",
    metadata={"label": "THREAT_ACTOR", "confidence_level": "C2"},
    confidence=0.87,
    entity_type="threat_actor",
    activity_id="ner_extraction",
    source_location="paragraph_3",
)

# Tier 3: Campaign relationship from all-source fusion
prov.track_relationship(
    relationship_id="DELTA9_operates_CAMPAIGN_IRON",
    source="FUSION_REPORT_FP-2026-0447",
    metadata={"type": "operates", "confidence": 0.81},
    confidence=0.81,
    activity_id="all_source_fusion",
)

# Tier 4: Property from two independent INT sources
humint_src = SourceReference(
    document="HUMINT_REPORT_HR-2026-0821",
    confidence=0.91,
    metadata={"classification": "SECRET", "source_country": "PARTNER_5EYES"},
)
imint_src = SourceReference(
    document="IMINT_PRODUCT_IP-2026-1104",
    page=3,
    section="Ground Truth Assessment",
    confidence=0.87,
    metadata={"sensor": "OPIR", "resolution_m": 0.3},
)
prov.track_property_source("DELTA9", "location_country", "COUNTRY_X", humint_src)
prov.track_property_source("DELTA9", "location_country", "COUNTRY_X", imint_src)

# Finished product audit — full chain of custody
lineage = prov.get_lineage("threat_actor_DELTA9")
print("Chain of custody:")
for entry in lineage["lineage_chain"]:
    print(f"  [{entry['timestamp'][:19]}]  {entry['activity_id']}  agent={entry['agent_id']}")

# Corroborating INT sources for the location assessment
sources = prov.get_all_sources("DELTA9_location_country")
for s in sources:
    print(f"  INT source: {s['source']}  (conf={s['confidence']:.2f})")
```

</Tab>

<Tab title="安全 — SOC/事件响应">

SOC 威胁情报平台会跟踪每个 CVE，从其首次 NVD 摄取，经过多次富化运行、CVSS 更新以及分析师注释。溯源链回答了事件响应期间最关键的问题：「该漏洞记录是否最新？自我们上次检查以来，CVSS 评分是否被修订过？」

对同一 `entity_id` 重复调用 `track_entity()` 所创建的版本链，为你提供了完整的更新历史。如果 NVD 在某概念验证代码发布后将评分从 7.5 修订为 9.8，该链会显示该次修订的确切时间戳，以及是哪条流水线写入了更新后的值。

```python
from semantica.provenance import ProvenanceManager
from semantica.provenance.schemas import SourceReference
from semantica.provenance.integrity import compute_checksum

prov = ProvenanceManager(storage_path="soc_provenance.db")

# Initial NVD ingestion
prov.track_entity(
    entity_id="cve-2023-44487",
    source="NVD_feed_2023-10-10",
    metadata={"cvss_score": 7.5, "description": "HTTP/2 Rapid Reset DDoS"},
    confidence=0.98,
    entity_type="vulnerability",
    activity_id="nvd_feed_ingestion",
)

# Six weeks later: NVD revised the score after PoC publication
prov.track_entity(
    entity_id="cve-2023-44487",
    source="NVD_feed_2023-11-22",
    metadata={"cvss_score": 7.5, "kev_added": True, "known_exploited": True},
    confidence=0.98,
    entity_type="vulnerability",
    activity_id="nvd_feed_update",
)

# Track CISA KEV addition as a separate property source
kev_ref = SourceReference(
    document="CISA_KEV_catalog_2023-11-22",
    section="Known Exploited Vulnerabilities",
    confidence=1.0,
    metadata={"publisher": "CISA", "mandatory_remediation": True},
)
prov.track_property_source("cve-2023-44487", "known_exploited", True, kev_ref)

# Incident response query: full history for this CVE
lineage = prov.get_lineage("cve-2023-44487")
print(f"CVE first seen  : {lineage['first_seen'][:10]}")
print(f"CVE last updated: {lineage['last_updated'][:10]}")
print(f"Update count    : {lineage['entity_count']} records")

# Integrity check before relying on the record for a patch decision
entries = prov.trace_lineage("cve-2023-44487")
for e in entries:
    ok = compute_checksum(e) == e.checksum
    print(f"  [{('OK' if ok else 'TAMPERED')}] {e.timestamp[:19]}  source={e.source_document}")
```

</Tab>

<Tab title="生命科学 — 临床/制药">

临床证据图跟踪疗效数据，从源出版物、经过结构化抽取、直至监管提交。W3C PROV-O 链满足 ICH E6(R2) GCP 对数据可追溯性的要求，以及 21 CFR Part 11 对电子记录完整性的要求。提交包中的每个实体都必须可追溯到源文档、抽取活动以及操作员。

`track_property_source()` 在这里尤为重要：当两项独立研究报告同一终点的不同疗效值时，每一项都必须单独跟踪，并附带完整的引用元数据。由此产生的多源记录是荟萃分析的证据基础，而溯源条目则成为监管档案中的支持性文档。

```python
from semantica.provenance import ProvenanceManager
from semantica.provenance.schemas import SourceReference
from semantica.provenance.integrity import compute_checksum

prov = ProvenanceManager(storage_path="clinical_provenance.db")

# Track the source document chunk (Phase III study report section)
prov.track_chunk(
    chunk_id="phase3_primary_endpoint_C4591001",
    source_document="STUDY_REPORT_BNT162b2_C4591001_MOD2",
    source_path="/submissions/EMA_rolling_review/mod2_clinical_overview.pdf",
    start_index=4096,
    end_index=6144,
    study_phase="Phase_III",
    ctgov="NCT04368728",
    sponsor="BioNTech_Pfizer",
)

# Track extracted efficacy entity with verbatim source quote
prov.track_entity(
    entity_id="VE_primary_BNT162b2_C4591001",
    source="phase3_primary_endpoint_C4591001",
    metadata={"value": "95.0%", "CI_95": "[90.3–97.6]", "label": "EFFICACY_MEASURE"},
    confidence=0.99,
    entity_type="clinical_endpoint",
    activity_id="structured_data_extraction",
    source_quote="Vaccine efficacy against COVID-19 was 95.0% (95% CI, 90.3–97.6)",
)

# Multi-study property tracking for meta-analysis
study1 = SourceReference(
    document="NEJM_doi_10.1056_NEJMoa2034577",
    page=9, section="Table 2",
    confidence=0.99,
    metadata={"study_id": "C4591001", "n_participants": 43448},
)
study2 = SourceReference(
    document="Lancet_doi_10.1016_S0140-6736_21_00448-7",
    page=6, section="Results",
    confidence=0.97,
    metadata={"study_id": "EXT_COHORT", "n_participants": 9119},
)
prov.track_property_source("BNT162b2", "vaccine_efficacy_symptomatic_covid19", "95.0", study1)
prov.track_property_source("BNT162b2", "vaccine_efficacy_symptomatic_covid19", "94.1", study2)

# Regulatory submission audit — evidence chain
lineage = prov.get_lineage("VE_primary_BNT162b2_C4591001")
print("Evidence chain for regulatory submission:")
for entry in lineage["lineage_chain"]:
    print(f"  {entry['timestamp'][:10]} | {entry['source_document'][:45]} | "
          f"agent={entry['agent_id']}")

# Integrity verification (21 CFR Part 11 requirement)
entries = prov.trace_lineage("VE_primary_BNT162b2_C4591001")
for e in entries:
    status = "OK" if compute_checksum(e) == e.checksum else "TAMPERED"
    print(f"  Integrity [{status}]: {e.entity_id}")

stats = prov.get_statistics()
print(f"\nTotal evidence records in dossier: {stats['total_entries']}")
```

</Tab>

<Tab title="银行 — 风险/合规">

抵押贷款发放系统为每一项信贷决策记录完整的溯源，以满足 SR 11-7 模型风险管理指南以及 EBA 模型文档要求。承销模型中使用的每个特征——信用评分、DTI 比率、房产估值——都必须可追溯到其源数据拉取、运行该模型的操作员以及决策时间戳。

房产估值通过 `track_property_source()` 从两个来源（RICS 评估和 AVM 估算）进行跟踪，使合规团队能全面了解 LTV 是如何计算的，以及模型最终依赖的是哪种估值方法。

```python
from semantica.provenance import ProvenanceManager
from semantica.provenance.schemas import SourceReference

prov = ProvenanceManager(storage_path="credit_provenance.db")
app_id = "APP-2026-994421"

# Track the bureau data pull
prov.track_chunk(
    chunk_id=f"{app_id}_bureau_pull",
    source_document=f"EXPERIAN_CREDITEXPERT_{app_id}_2026-06-21",
    source_path=f"/bureau/experian/{app_id}/2026-06-21.json",
    start_index=0,
    end_index=4096,
    bureau="Experian",
    pull_timestamp="2026-06-21T09:14:32Z",
    consent_ref=f"CONSENT-{app_id}",
)

# Batch-track extracted credit features
features = [
    {"id": f"{app_id}_credit_score",         "confidence": 1.0, "value": 714},
    {"id": f"{app_id}_dti_ratio",             "confidence": 1.0, "value": 0.38},
    {"id": f"{app_id}_derogatory_count_7yr",  "confidence": 1.0, "value": 0},
]
prov.track_entities_batch(
    features,
    source=f"{app_id}_bureau_pull",
    entity_type="credit_feature",
    activity_id="bureau_parsing",
    agent_id="credit_data_service_v2",
)

# Track competing property valuations
rics_val = SourceReference(
    document=f"RICS_VALUATION_{app_id}_2026-06-18",
    page=3, section="Market Value Assessment",
    confidence=0.96,
    metadata={"valuer": "JLL_Residential", "method": "comparable_sales"},
)
avm_val = SourceReference(
    document=f"AVM_ESTIMATE_{app_id}_2026-06-21",
    confidence=0.84,
    metadata={"provider": "Hometrack_AVM", "model_version": "v8.3"},
)
prov.track_property_source(app_id, "property_value_GBP", "410000", rics_val)
prov.track_property_source(app_id, "property_value_GBP", "403500", avm_val)

# Track the underwriting decision itself
prov.track_entity(
    entity_id=f"DECISION_{app_id}",
    source=f"{app_id}_bureau_pull",
    metadata={"outcome": "approved_conditional_lmi", "model": "underwriting_model_v4"},
    confidence=0.89,
    entity_type="credit_decision",
    activity_id="automated_underwriting",
)

# SR 11-7 audit output
print("=== MODEL AUDIT TRAIL ===")
lineage = prov.get_lineage(f"DECISION_{app_id}")
for entry in lineage["lineage_chain"]:
    print(f"  [{entry['timestamp'][:19]}]  {entry['activity_id']}  agent={entry['agent_id']}")

print("\n=== PROPERTY VALUATION SOURCES ===")
for s in prov.get_all_sources(f"{app_id}_property_value_GBP"):
    print(f"  {s['source'][:55]}  conf={s['confidence']:.2f}")

stats = prov.get_statistics()
print(f"\nTotal audit records: {stats['total_entries']}  |  Sources: {stats['unique_sources']}")
```

</Tab>

</Tabs>

## W3C PROV-O 映射

每个 `ProvenanceEntry` 都直接映射到 W3C PROV-O 术语。如果你的合规团队或监管机构要求 PROV-O 导出，字段映射是一对一的：

| PROV-O 术语 | `ProvenanceEntry` 字段 | 记录内容 |
| :--- | :--- | :--- |
| `prov:Entity` | `entity_id` | 被追踪的对象——实体、分块、关系或属性 |
| `prov:Activity` | `activity_id` | 产生它的过程——`"ner_extraction"`、`"bureau_parsing"` |
| `prov:Agent` / `prov:Person` / `prov:SoftwareAgent` / `prov:Organization` | `agent_id`、`agent_type`、`is_automated` | 谁——或什么——执行了该活动，以及是否有真人直接负责 |
| `prov:qualifiedAssociation` + `prov:hadRole` | `role` | 执行主体针对该特定实体的角色——`"generator"`（默认）、`"approver"`、`"reviewer"`——用于签核/四眼工作流 |
| `prov:wasDerivedFrom` | `parent_entity_id`（旧版合并字段） | 该实体的上一版本或来源 |
| — | `previous_version_id` | 该条目更正/替换了*同一*事实的先前版本 |
| `prov:wasDerivedFrom` | `derived_from_id` | 该条目派生自*另一个*来源实体 |
| `prov:used` | `used_entities` | 为生成该实体而消费的实体 ID |
| `prov:generatedAtTime` | `timestamp` | ISO 日期时间，写入时自动设为 `utc_now_iso()` |
| `prov:qualifiedInvalidation` | `invalidated`、`invalidated_at_time`、`invalidated_by`、`invalidation_reason` | 通过 `ProvenanceManager.invalidate()` 以墓碑形式记录的撤回/更正，绝非硬删除 |
| `prov:startedAtTime` / `prov:endedAtTime` | `activity_started_at_time`、`activity_ended_at_time` | 带类型的 Activity 时序——通过 `activity=` 关键字参数传入 `ActivityRecord`，即可将其与 `activity_id` 一同设置 |
| `prov:qualifiedGeneration`/`Generation`、`qualifiedUsage`/`Usage`、`qualifiedDerivation`/`Derivation` | （由上述字段派生） | `wasGeneratedBy`/`used`/`wasDerivedFrom` 的附加限定形式，随普通三元组一同自动输出 |
| `prov:wasAssociatedWith` | （由 `agent_id` 派生） | 直接的 Activity→Agent 链接，区别于 Entity→Agent 的 `wasAttributedTo` |
| `prov:actedOnBehalfOf` | `acted_on_behalf_of` | Agent→Agent 委托——例如自动化执行主体代表授权它的人类/组织行事 |
| `prov:wasInformedBy` | `informed_by_activities`（以 `informed_by=[...]` 传入） | 将该条目的活动链接到为其提供信息的先前活动（例如某个流水线阶段由此前阶段提供信息） |
| `prov:Bundle` + `prov:hadMember` | `bundle_id` | 按来源/数据集/摄取运行对条目分组（成员关系三元组，而非真正的 RDF 命名图分区） |
| — | `valid_from`、`valid_until`、`revision_type`、`supersedes` | 从已弃用的 `kg.ProvenanceTracker` 合并而来的双时态字段——始终由调用方提供（绝不自动计算），通过 `ProvenanceManager.revision_history()` 呈现；对于未显式设置这些字段的条目，该方法会回退到基于时间戳的派生 |

`previous_version_id` 与 `derived_from_id` 是在 `parent_entity_id` 之外附加的——读取 `parent_entity_id` 的既有代码无需改动即可继续工作，而新代码则能获得被区分开的这两种关系。

`checksum` 字段不属于 PROV-O 标准——它是 Semantica 的篡改检测扩展。现在每个条目的 SHA-256 还会并入 `previous_checksum`（前一个条目的校验和，按 `sequence_id` 的插入顺序确定），从而将每个条目与其前一个条目链接起来。`ProvenanceManager.verify_chain()` 会遍历整条链并报告任何断裂——包括底层表中被硬删除的行，而单行独立的校验和自身无法检测到这种情况。

注意：上面的银行示例向 `track_entities_batch()` 传入了 `agent_id="credit_data_service_v2"`——这现在会真正填充条目的 `agent_id` 字段（此前存在缺陷，像 `agent_id`/`entity_type`/`activity_id` 这类批量级别的带类型关键字参数会被静默吸收进不透明的 `metadata` blob 中）。

`export_prov()` 会在 `ProvenanceManager.DEFAULT_BASE_URI`（默认为 `https://semantica.dev/ns#`——与 `RDFExporter` 的 `NamespaceManager` 为其 `"semantica"` 前缀使用的命名空间相同，因此同一 `entity_id` 由 KG 导出的 URI 与由 PROV 导出的 URI 可共同解析）下生成实体/执行主体/活动的 URI，除非通过 `export_prov(base_uri=...)` 或 CLI 的 `--base-uri` 选项覆盖。

## 相关指南

- [语义抽取](/zh/guides/semantic-extraction) — 为每个抽取到的实体自动生成溯源条目的 NER 与关系抽取流水线
- [冲突消解](/zh/guides/conflict-resolution) — 溯源属性来源直接馈入冲突检测；每个已消解的值都可追溯至其来源
- [去重](/zh/guides/deduplication) — 合并操作记录在合并历史中；与溯源配合使用可获得从来源到规范实体的完整血缘
- [溯源参考](../reference/provenance) — 完整的存储后端 API、`InMemoryStorage`、`SQLiteStorage` 以及 `ProvenanceEntry` schema