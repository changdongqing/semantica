---
title: "语义抽取"
description: "Semantica 如何使用模式、ML 和 LLM 方法从非结构化文本中抽取实体、关系、事件和 RDF 三元组——包括回退链、批处理和面向国防情报、网络安全、生命科学和金融合规的真实流水线。"
icon: "magnifying-glass"
sourceHash: "3aeacb139b5c7fb096f932fb7ba89fb7e7373e40236553c209fd5f08f561d594"
---

## 什么是语义抽取？

语义抽取是从非结构化文本中自动识别有意义的信息，并将其转换为结构化、机器可读格式的过程。与简单的关键词搜索或模式匹配不同，语义抽取能够理解自然语言中概念的上下文、关系以及隐含关联。

**与基础文本处理的主要区别：**
- **正则匹配** 能找到精确模式，但会丢失上下文含义
- **关键词搜索** 能定位术语，但忽略术语之间的关系
- **人工标注** 能捕获语义含义，但无法规模化
- **语义抽取** 在保留上下文理解的同时，自动识别实体、关系和事件

当你从情报文本中抽取 "APT29" 和 "NATO" 这类实体时，语义抽取还会捕获 APT29 "targets"（针对）NATO 网络这一关系，从而生成可直接输入图数据库、推理系统和检索工作流的结构化知识。

## 为什么使用语义抽取？

**知识图谱填充。** 将非结构化文档转换为相互连接的知识图谱，其中实体成为节点、关系成为边，从而支持复杂的图遍历和推理。

**GraphRAG 准备。** 从原始文本中抽取结构化事实，使基于图的检索能够找到精确且上下文相关的信息，而不只是相似的文档分块。

**将非结构化文本转换为结构化数据。** 把情报报告、临床笔记、法律文件和监管申报文件转换为下游系统可查询和处理的数据表、RDF 三元组和 JSON schema。

**下游检索与推理收益。** 支持精确的基于实体的搜索、关系发现、因果分析和多跳推理，这些仅靠文档级检索根本无法实现。

**自动化知识发现。** 在大型文档集合中揭示隐藏的关联和模式，这些内容因规模与复杂度而往往被人类分析师遗漏。

## 适用场景与不适用场景

**以下场景适合使用语义抽取：**
- 将情报报告、临床笔记和监管文件转换为结构化知识
- 从非结构化文本语料构建知识图谱
- 为基于图的推理和 GraphRAG 工作流准备文本
- 在文档集合中发现关系和关联
- 为下游分析和报告创建结构化数据集

**以下场景使用确定性解析可能更好：**
- 高度结构化的标识符，如电子邮件地址、UUID、哈希值和日志 ID，正则模式已足够
- 从标准化格式（CSV、JSON、XML）中进行简单的数据抽取
- 格式固定的已知模式，不需要上下文理解
- 高频操作，抽取速度至关重要且无需语义理解

**以下场景可考虑更简单的替代方案：**
- 文档本身已经结构化，不需要自然语言理解
- 简单的关键词搜索或文档检索即可满足需求
- 文本质量太差，无法进行可靠的语义分析（严重损坏的 OCR、碎片化数据）

## 典型工作流

语义抽取工作流遵循一个结构化顺序，将原始文本转换为可供图使用的知识：

**摄取** → 从各类来源（文件、数据库、API）加载文档，并为处理准备文本

**抽取** → 应用命名实体识别（NER）、关系抽取、事件检测和指代消解，以识别有意义的信息

**消解** → 将实体提及（"APT29"、"the group"、"they"）归并为规范引用，并对重叠实体进行消歧

**关联** → 通过关系连接已抽取的实体，在概念之间构建结构化连接网络

**序列化** → 将抽取出的知识转换为 RDF 三元组、JSON-LD 或其他结构化格式

**存储** → 将结构化输出加载到知识图谱、向量数据库或 Agent 记忆系统中

**检索** → 通过图遍历、语义搜索和推理工作流查询结构化知识

该流水线可将诸如"APT29 deployed HAMMERTOSS malware targeting NATO networks"的文档转换为结构化三元组，如 `(APT29, deployed, HAMMERTOSS)` 和 `(HAMMERTOSS, targets, NATO_networks)`，从而支持复杂的下游分析。

`semantica.semantic_extract` 将非结构化文本转换为结构化、可供图使用的输出：它识别命名实体、抽取它们之间的关系、检测带时间锚点的事件、消解指代，并将所有内容序列化为 RDF 三元组。可用它从原始文档——情报报告、临床笔记、监管申报文件或任何自由文本语料——填充 `ContextGraph`。

<Info>
  抽取出的实体和关系通过 `AgentContext.store()` 进入 `ContextGraph`。关于它们如何回溯源到源文档，请参阅[溯源指南](/zh/guides/provenance)。关于如何查询和遍历填充后的图，请参阅[上下文图](/zh/guides/context-graphs)。
</Info>

## 第 1 步 — 命名实体识别：文本中有谁、有什么

**命名实体识别（NER）** 识别并分类文本中有意义的名词和名词短语，例如人物、组织、地点、产品，以及威胁行为者或药物名称等领域特定实体。NER 是语义抽取的基础，它识别文档中的关键参与者和对象。

`NamedEntityRecognizer` 从文档中抽取有意义的名词，并允许你根据延迟预算和领域需求选择底层方法：

```python
from semantica.semantic_extract import NamedEntityRecognizer

# A finished intelligence report excerpt
report = """
ASSESSMENT (SECRET//NOFORN): GAMMA-7 threat actor, assessed with HIGH confidence
to operate from COUNTRY_X, conducted OPERATION NIGHTFALL between Jan–Mar 2025.
The group deployed HAMMERTOSS malware targeting NATO logistics networks via
spear-phishing lures referencing Exercise STEADFAST DEFENDER 2025.
Infrastructure cluster 185.220.101.0/24 was active throughout the campaign.
A second actor, DELTA-3, provided GAMMA-7 with zero-day exploits (CVE-2025-1234,
CVE-2025-5678) for Ivanti Connect Secure VPN appliances.
"""

# LLM-backed NER handles custom intelligence entity types that spaCy won't know.
# Fallback chain: if llm returns nothing, try ml (spaCy), then pattern matching.
ner = NamedEntityRecognizer(
    methods=["llm", "ml", "pattern"],
    confidence_threshold=0.75,
    provider="anthropic",
    llm_model="claude-sonnet-5",
)
entities = ner.extract_entities(report)

for e in entities:
    print("[{:>5.2f}]  {:15s}  {}".format(e.confidence, e.label, e.text))

# Illustrative output — exact labels and scores depend on the method and model.
# Abbreviated:
# [ 0.94]  THREAT_ACTOR    GAMMA-7
# [ 0.91]  THREAT_ACTOR    DELTA-3
# [ 0.97]  MALWARE         HAMMERTOSS
# [ 0.99]  CVE             CVE-2025-1234
# [ 0.99]  CVE             CVE-2025-5678
# [ 0.88]  NETWORK         185.220.101.0/24
# [ 0.85]  ORG             NATO
```

`confidence` 字段告诉你抽取器的确定程度。低于阈值的值（此处为 0.75）会在返回给你之前被过滤掉。`label` 字段使用标准 CoNLL 类型（PERSON、ORG、GPE），或 LLM 从上下文推断出的领域特定类型（THREAT_ACTOR、MALWARE、CVE、NETWORK）。

获得实体扁平列表后，按类型分组可让后续步骤更轻松：

```python
# classify_entities groups the flat list into a dict keyed by label
grouped = ner.classify_entities(entities)

print("Threat actors:", [e.text for e in grouped.get("THREAT_ACTOR", [])])
# Threat actors: ['GAMMA-7', 'DELTA-3']

print("Malware:      ", [e.text for e in grouped.get("MALWARE", [])])
# Malware:       ['HAMMERTOSS']

print("CVEs:         ", [e.text for e in grouped.get("CVE", [])])
# CVEs:          ['CVE-2025-1234', 'CVE-2025-5678']

# score_confidence re-scores with a statistical model — useful when your primary
# method doesn't return calibrated probabilities (e.g., pattern matching)
rescored = ner.score_confidence(entities)
high_conf = [e for e in rescored if e.confidence >= 0.85]
print("High-confidence entities: {}".format(len(high_conf)))
```

## 第 2 步 — 关系抽取：实体之间如何连接

**关系抽取** 识别实体之间的语义关系，不仅捕获文本中存在哪些实体，还捕获它们如何交互、影响或连接。这构成了知识图谱中连接实体节点的边。

`RelationExtractor` 生成实体之间的连接网络——谁部署了什么、谁向谁提供了什么、哪个 CVE 针对哪个产品：

```python
from semantica.semantic_extract import RelationExtractor

# dependency parsing picks up syntactic relations ("DELTA-3 provided GAMMA-7 with...")
# pattern matching catches explicit verb phrases as a fallback
rel = RelationExtractor(
    method=["dependency", "pattern"],
    relation_types=["operates_from", "deployed", "targets", "provided_to", "exploits"],
    bidirectional=True,      # also try object→subject direction
    confidence_threshold=0.65,
)

# extract_relations takes the original text plus the entities you already found.
# Passing entities avoids re-running NER and constrains the search space.
relations = rel.extract_relations(report, entities)

for r in relations:
    print("[{:.2f}]  {} --[{}]--> {}".format(
        r.confidence, r.subject.text, r.predicate, r.object.text
    ))

# Example output:
# [0.88]  GAMMA-7 --[deployed]--> HAMMERTOSS
# [0.82]  DELTA-3 --[provided_to]--> GAMMA-7
# [0.79]  CVE-2025-1234 --[exploits]--> Ivanti Connect Secure
# [0.85]  GAMMA-7 --[targets]--> NATO
```

每个 `Relation` 上的 `context` 字段保存了周围的句子。这让你能够审计抽取器为何做出某个连接——当分析师需要在实际采取行动前确认某条连接确实有源文本依据时，这一点至关重要。

## 第 3 步 — 事件检测：发生了什么、何时发生、涉及谁

**事件检测** 识别文本中描述的离散事件或动作，不仅捕获静态关系，还捕获随时间展开的动态过程。事件包含参与者、时间边界、位置和结果。

`EventDetector` 输出结构化的、带时间锚点的事件——由参与者、时间窗口和位置构成的离散事件：

```python
from semantica.semantic_extract import EventDetector

# method="llm" is the default and gives the best recall for implicit events.
# method="pattern" is appropriate for offline, high-throughput pipelines.
detector = EventDetector(method="llm", provider="anthropic")

events = detector.detect_events(report)

for ev in events:
    print("[{}]  time={}  location={}".format(
        ev.event_type, ev.time or "unknown", ev.location or "n/a"
    ))
    print("   participants: {}".format(ev.participants))
    print("   text: {}".format(ev.text[:80]))

# Example output:
# [campaign]  time=Jan–Mar 2025  location=n/a
#    participants: ['GAMMA-7', 'NATO']
#    text: GAMMA-7 conducted OPERATION NIGHTFALL between Jan–Mar 2025...
# [supply_chain]  time=unknown  location=n/a
#    participants: ['DELTA-3', 'GAMMA-7']
#    text: DELTA-3 provided GAMMA-7 with zero-day exploits...
```

批量处理时，向 `extract()` 传入一个字典列表。每个字典包含 `content` 键，以及可选的 `id` 用于溯源跟踪：

```python
# extract() handles concurrent processing internally
batch_events = detector.extract([
    {"content": report, "id": "FINTEL_2025_0192"},
    {"content": advisory_2, "id": "FINTEL_2025_0193"},
    # ... up to 200 documents
])

# batch_events is List[List[Event]] — one inner list per document
for doc_idx, doc_events in enumerate(batch_events):
    print("Doc {}: {} events".format(doc_idx, len(doc_events)))
```

## 第 4 步 — 共指消解：一个实体，多个名称

**共指消解**用于识别不同文本片段何时指向同一个现实世界实体，并将“APT29”、“the group”、“they”和“the threat actor”等提及合并为统一引用。这可防止下游处理将同一实体当作多个独立对象。

`CoreferenceResolver` 会将“GAMMA-7”、“the group”、“they”和“the threat actor”等引用归并为规范指代链，使下游抽取不会将它们视为独立实体：

```python
from semantica.semantic_extract import CoreferenceResolver

resolver = CoreferenceResolver(method="llm", provider="anthropic")

# Pass the already-extracted entities so the resolver can anchor pronouns
# to the correct named entities rather than guessing from scratch
chains = resolver.resolve_coreferences(report, entities=entities)

for chain in chains:
    print("Representative: {}".format(chain.representative.text))
    mentions = [m.text for m in chain.mentions if m.text != chain.representative.text]
    print("   Also called: {}".format(mentions))

# Example output:
# Representative: GAMMA-7
#    Also called: ['the group', 'they', 'the threat actor']
```

共指消解完成后，现在可以在将文本传给关系抽取之前，用规范名称替换代词和别名——这会显著提升关系图的质量。

## 第 5 步 — 三元组抽取与 RDF 序列化：图就绪输出

**三元组抽取**将语义知识转换为主语-谓语-宾语三元组，这是知识图谱和 RDF 数据库的基本构建块。这种结构化表示支持图查询、推理，以及与语义网技术的集成。

`TripletExtractor` 会将所有内容转换为主语-谓语-宾语三元组，并将其序列化为 RDF，以便进行图摄取和 SPARQL 查询：

```python
from semantica.semantic_extract import TripletExtractor

tri = TripletExtractor(
    method="llm",
    provider="anthropic",
    llm_model="claude-sonnet-5",
    include_temporal=True,       # attach time context to triplets when available
    include_provenance=True,     # embed source document reference in each triplet
    validate=False,              # return raw triplets; validate explicitly below
)

# Feed in the entities and relations you already extracted — the extractor
# uses them to constrain what it produces
triplets = tri.extract_triplets(report, entities, relations)

# Filter malformed triplets before serialisation
# (extract_triplets validates automatically unless validate=False, as above)
valid = tri.validate_triplets(triplets)
print("Valid: {}/{}".format(len(valid), len(triplets)))

for t in valid:
    print("({}, {}, {})  conf={:.2f}".format(
        t.subject, t.predicate, t.object, t.confidence
    ))

# Serialise to Turtle RDF for graph ingestion or STIX export
turtle_rdf = tri.serialize_triplets(valid, format="turtle")
print(turtle_rdf[:600])

# formats: "turtle" | "ntriples" | "jsonld" | "xml"
```

一个通过校验的三元组（例如 `(GAMMA-7, deployed, HAMMERTOSS)`）在设置 `include_temporal=True` 后，会携带你在第 3 步中检测到的事件的时间区间——从而使图不仅能按“发生了什么”查询，还能按“何时发生”查询。

## 整合起来：可复用的抽取流水线

将全部五个步骤串联成一个函数，以便对每个传入文档调用：

```python
from semantica.semantic_extract import (
    NamedEntityRecognizer, RelationExtractor,
    EventDetector, CoreferenceResolver, TripletExtractor,
)
from semantica.provenance import ProvenanceManager
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore


def ingest_intel_report(
    text: str,
    doc_id: str,
    agent: AgentContext,
    prov: ProvenanceManager,
    method: str = "llm",
) -> dict:
    """
    Full extraction pipeline: NER → Coref → Relations → Events → Triplets → Graph.
    Returns a summary dict with counts for monitoring dashboards.
    """

    # 1. Named entity recognition
    ner = NamedEntityRecognizer(
        methods=[method, "pattern"],
        confidence_threshold=0.70,
        provider="anthropic",
        llm_model="claude-sonnet-5",
    )
    entities = ner.extract_entities(text)
    classified = ner.classify_entities(entities)

    # 2. Coreference resolution — before relation extraction
    resolver = CoreferenceResolver(method=method, provider="anthropic")
    chains = resolver.resolve_coreferences(text, entities=entities)

    # 3. Relation extraction
    rel = RelationExtractor(
        method=[method, "pattern"],
        relation_types=["deployed", "targets", "exploits", "operates_from", "provided_to"],
        confidence_threshold=0.65,
        provider="anthropic",
        llm_model="claude-sonnet-5",
    )
    relations = rel.extract_relations(text, entities)

    # 4. Event detection
    detector = EventDetector(method=method, provider="anthropic")
    events = detector.detect_events(text)

    # 5. Triplet extraction and RDF serialisation
    tri = TripletExtractor(
        method=method,
        provider="anthropic",
        llm_model="claude-sonnet-5",
        include_temporal=True,
        include_provenance=True,
        validate=False,          # keep raw triplets so the summary can report rejections
    )
    triplets = tri.extract_triplets(text, entities, relations)
    valid    = tri.validate_triplets(triplets)
    turtle   = tri.serialize_triplets(valid, format="turtle")

    # 6. Store in agent memory + knowledge graph
    graph_stats = agent.store(
        [{"content": text, "metadata": {"source": doc_id, "classification": "SECRET//NOFORN"}}],
        extract_entities=True,
        extract_relationships=True,
        link_entities=True,
    )

    # 7. Provenance tracking — every entity linked back to its source document
    prov.track_entities_batch(
        [{"id": e.text.lower().replace(" ", "_"), "confidence": e.confidence}
         for e in entities],
        source=doc_id,
        activity_id="intel_extraction_pipeline",
    )

    return {
        "entities":       len(entities),
        "entity_types":   {k: len(v) for k, v in classified.items()},
        "coref_chains":   len(chains),
        "relations":      len(relations),
        "events":         len(events),
        "triplets_total": len(triplets),
        "triplets_valid": len(valid),
        "graph_nodes":    graph_stats.get("graph_nodes", 0),
        "graph_edges":    graph_stats.get("graph_edges", 0),
        "rdf_turtle":     turtle,
    }


# Process all 200 reports
intel_graph = ContextGraph(advanced_analytics=True)
intel_agent = AgentContext(
    vector_store=VectorStore(backend="faiss", dimension=768),
    knowledge_graph=intel_graph,
    decision_tracking=True,
)
prov = ProvenanceManager(storage_path="intel_provenance.db")

# reports is a list of (text, doc_id) tuples loaded from your 200 documents
for text, doc_id in reports:
    summary = ingest_intel_report(text, doc_id, intel_agent, prov)
    print("{}: {} entities, {} relations, {} events, {}/{} triplets valid".format(
        doc_id,
        summary["entities"],
        summary["relations"],
        summary["events"],
        summary["triplets_valid"],
        summary["triplets_total"],
    ))
```

## 领域示例

<Tabs>
  <Tab title="国防 — CTI/威胁情报">
    已完成的威胁情报报告包含威胁行为体、恶意软件、CVE、基础设施集群和行动时间线。由 LLM 支持的 NER 可处理 spaCy 现成模型遗漏的自定义实体标签（THREAT_ACTOR、OPERATION），而 RDF 序列化会生成与 STIX 2.1 对象类型兼容的 Turtle 输出。

```python
from semantica.semantic_extract import (
    NamedEntityRecognizer, RelationExtractor, TripletExtractor,
)

ner = NamedEntityRecognizer(
    methods=["llm", "pattern"],
    confidence_threshold=0.75,
    provider="anthropic",
    llm_model="claude-sonnet-5",
)
entities = ner.extract_entities(fintel_text)
grouped  = ner.classify_entities(entities)

print("Threat actors:", [e.text for e in grouped.get("THREAT_ACTOR", [])])
# ['APT29', 'COZY BEAR']
print("Malware:      ", [e.text for e in grouped.get("MALWARE", [])])
# ['HAMMERTOSS', 'SUNBURST']
print("CVEs:         ", [e.text for e in grouped.get("CVE", [])])
# ['CVE-2025-1234', 'CVE-2025-5678']

rel = RelationExtractor(
    method=["llm", "dependency"],
    relation_types=["operates_from", "deployed", "targets", "exploits"],
    confidence_threshold=0.70,
    provider="anthropic",
    llm_model="claude-sonnet-5",
)
relations = rel.extract_relations(fintel_text, entities)

tri = TripletExtractor(
    method="llm",
    provider="anthropic",
    llm_model="claude-sonnet-5",
    include_temporal=True,
    include_provenance=True,
)
triplets = tri.extract_triplets(fintel_text, entities, relations)
valid    = tri.validate_triplets(triplets)
turtle   = tri.serialize_triplets(valid, format="turtle")
# turtle now contains RDF triples for (APT29, deployed, HAMMERTOSS),
# (APT29, targets, NATO_logistics), etc. — ready for STIX graph ingest
```

  </Tab>

  <Tab title="安全 — SOC/事件">
    漏洞公告和 SIEM 告警包含 CVE、IP 地址、域名指标、恶意软件家族以及受影响的软件版本。使用 `["ml", "pattern"]` 链的离线 NER 可提供低于 200ms 的延迟，这对于无法接受 LLM 延迟的实时分类处置流水线至关重要。

```python
from semantica.semantic_extract import (
    NamedEntityRecognizer, RelationExtractor, TripletExtractor,
)

advisory = """
CVE-2025-44228 (CVSS 10.0): Critical RCE in Apache Log4j2 versions 2.0–2.14.1.
Threat actor WIZARD SPIDER exploiting via Cobalt Strike beacons since 2025-03-14.
Indicators: 203.0.113.45, c2-update[.]ru. Mitigate: upgrade to Log4j2 >= 2.17.1.
"""

# Offline stack — no API key required, latency < 200 ms
ner = NamedEntityRecognizer(
    methods=["ml", "pattern"],
    confidence_threshold=0.60,
)
entities = ner.extract_entities(advisory)
grouped  = ner.classify_entities(entities)

print("CVEs:    ", [e.text for e in grouped.get("CVE", [])])
# ['CVE-2025-44228']
print("IPs:     ", [e.text for e in grouped.get("IP", [])])
# ['203.0.113.45']
print("Domains: ", [e.text for e in grouped.get("DOMAIN", [])])
# ['c2-update[.]ru']
print("Actors:  ", [e.text for e in grouped.get("THREAT_ACTOR", [])])
# ['WIZARD SPIDER']

rel = RelationExtractor(
    method=["dependency", "pattern"],
    relation_types=["exploits", "delivers", "targets", "mitigated_by"],
    confidence_threshold=0.60,
)
relations = rel.extract_relations(advisory, entities)

tri = TripletExtractor(method="pattern", include_temporal=True)
triplets = tri.extract_triplets(advisory, entities, relations)
valid    = tri.validate_triplets(triplets)
ntriples = tri.serialize_triplets(valid, format="ntriples")
print("Valid triplets: {}".format(len(valid)))
# Valid triplets: 7
# Each triple encodes one structured fact: (CVE-2025-44228, exploited_by, WIZARD_SPIDER), etc.
```

  </Tab>

  <Tab title="生命科学 — 临床/制药">
    临床试验报告包含药物、疾病、疗效结局、不良事件和试验标识符。`d4data/biomedical-ner-all` HuggingFace 模型在 PubMed 上训练，可返回通用模型遗漏的生物医学专用标签（DRUG、DISEASE、GENE、OUTCOME）。Turtle 格式的 RDF 序列化可按与 EMA XEVMPD 和 FDA SPL 兼容的格式提交。

```python
from semantica.semantic_extract import (
    NamedEntityRecognizer, RelationExtractor, TripletExtractor,
)
from semantica.provenance import ProvenanceManager
from semantica.provenance.schemas import SourceReference

paper = """
Phase III trial NCT04368728: BNT162b2 (Pfizer-BioNTech) evaluated in 43,448
participants aged >= 16 years. Vaccine efficacy: 95.0% (95% CI 90.3–97.6;
p<0.0001) against symptomatic COVID-19. Bell's palsy observed in 4 vaccine
vs 0 placebo participants (not statistically significant).
"""

ner = NamedEntityRecognizer(
    method="huggingface",
    huggingface_model="d4data/biomedical-ner-all",
    confidence_threshold=0.75,
)
entities = ner.extract_entities(paper)
grouped  = ner.classify_entities(entities)

print("Drugs:    ", [e.text for e in grouped.get("DRUG", [])])
# ['BNT162b2']
print("Diseases: ", [e.text for e in grouped.get("DISEASE", [])])
# ['COVID-19', "Bell's palsy"]
print("Outcomes: ", [e.text for e in grouped.get("OUTCOME", [])])
# ['vaccine efficacy 95.0%']

rel = RelationExtractor(
    method=["llm", "dependency"],
    relation_types=["treats", "causes_adverse_event", "has_efficacy", "evaluated_in"],
    confidence_threshold=0.65,
    provider="anthropic",
    llm_model="claude-sonnet-5",
)
relations = rel.extract_relations(paper, entities)

tri = TripletExtractor(
    method="llm",
    provider="anthropic",
    llm_model="claude-sonnet-5",
    triplet_types=["treats", "has_efficacy", "causes_adverse_event"],
    include_temporal=True,
    include_provenance=True,
)
triplets = tri.extract_triplets(paper, entities, relations)
turtle   = tri.serialize_triplets(tri.validate_triplets(triplets), format="turtle")

# Provenance: track the efficacy figure to its exact source for ICH E6(R2) compliance
prov = ProvenanceManager(storage_path="pharma_provenance.db")
prov.track_property_source(
    "BNT162b2", "vaccine_efficacy_pct", "95.0",
    SourceReference(
        document="DOI:10.1056/NEJMoa2034577",
        page=9,
        section="Table 2",
        confidence=0.99,
        metadata={"study_id": "C4591001", "n_participants": 43448},
    )
)
```

  </Tab>

  <Tab title="银行 — 风险/合规">
    贷款协议、监管申报文件和信用备忘录包含法律实体、金融工具、交易对手关系和风险分类。基于模式的 NER 足够快，可用于实时贷款发放流程；而 LLM 抽取则能处理监管文件中密集的法律术语，这些内容往往会让依存句法分析失败。

```python
from semantica.semantic_extract import (
    NamedEntityRecognizer, RelationExtractor, TripletExtractor,
)

credit_memo = """
Borrower: ACME Manufacturing Ltd (registered UK). Guarantor: ACME Group PLC.
Facility: GBP 25M revolving credit at SONIA + 175bps, maturing 2028-03-31.
Collateral: first-ranking charge over ACME Manufacturing's UK fixed assets.
LTV: 67%. PD: 1.8%. LGD: 42%. RWA bucket: Standard (CRE20).
Exposure to counterparty sector: industrial manufacturing, risk tier 2.
"""

ner = NamedEntityRecognizer(
    methods=["llm", "ml", "pattern"],
    confidence_threshold=0.70,
    provider="anthropic",
    llm_model="claude-sonnet-5",
)
entities = ner.extract_entities(credit_memo)
grouped  = ner.classify_entities(entities)

print("Orgs:        ", [e.text for e in grouped.get("ORG", [])])
# ['ACME Manufacturing Ltd', 'ACME Group PLC']
print("Money:       ", [e.text for e in grouped.get("MONEY", [])])
# ['GBP 25M']
print("Dates:       ", [e.text for e in grouped.get("DATE", [])])
# ['2028-03-31']

rel = RelationExtractor(
    method=["llm", "dependency"],
    relation_types=["guaranteed_by", "secured_by", "classified_as", "exposed_to"],
    confidence_threshold=0.65,
    provider="anthropic",
    llm_model="claude-sonnet-5",
)
relations = rel.extract_relations(credit_memo, entities)

tri = TripletExtractor(
    method="llm",
    provider="anthropic",
    llm_model="claude-sonnet-5",
    include_temporal=True,
    include_provenance=True,
)
triplets = tri.extract_triplets(credit_memo, entities, relations)
valid    = tri.validate_triplets(triplets)
jsonld   = tri.serialize_triplets(valid, format="jsonld")
# JSON-LD output can be loaded directly into a compliance graph
# for Basel III RWA reporting and BCBS 239 data lineage requirements
```

  </Tab>
</Tabs>

## 常见陷阱

**将抽取结果视为必然正确的真相。** 语义抽取会产生置信度分数是有原因的——即使是高置信度的抽取结果也可能不正确。始终要验证关键抽取结果，尤其是在安全、临床或金融场景中的高风险决策中。

**忽略置信度阈值。** 低置信度的抽取结果通常意味着文本歧义、模型拟合不佳或输入噪声较大。设置合适的阈值（通常为 0.65-0.85）可以在不可靠结果污染下游处理之前将其过滤掉。

**跳过实体消解。** 同一实体的不同提及（"NATO"、"North Atlantic Treaty Organization"、"the alliance"）会在你的知识图谱中创建重复的节点。始终要运行共指消解和实体去重。

**OCR 质量差或输入质量差。** 语义抽取依赖于可读的文本。存在 OCR 错误、编码问题或大量涂改遮盖的文档会产生不可靠的抽取结果。在抽取之前，先清洗并验证输入文本。

**在正则表达式足够的情况下使用 LLM 抽取。** 对于高度结构化的模式，如 CVE 标识符（CVE-YYYY-NNNN）、IP 地址、电子邮件地址或 UUID，正则表达式比语义抽取更快、更便宜，也更可靠。

**一次处理过多文本。** 非常长的文档（>10,000 词）可能会使抽取模型不堪重负，并产生不一致的结果。将长文档切分为逻辑分块（章节、段落），并分别处理。

**混用互不兼容的抽取方法。** 不同方法会产生不同的实体标签方案。对于同一实体，LLM 抽取可能返回 "THREAT_ACTOR"，而 spaCy 返回 "PERSON"。应跨方法规范化标签，或使用一致的方法链。

## 选择抽取方法

六种抽取方法在速度、准确性和基础设施方面各有取舍：

- `"pattern"` 和 `"regex"`——无依赖，耗时低于 5 ms，适合作为任何方法链中的最后兜底。对于 CVE 标识符或 IP 地址等范围狭窄、可预测的领域非常可靠。
- `"rules"`——基于语言规则的检测，同样可离线运行，耗时低于 10 ms。
- `"ml"` / `"spacy"`——通用英文 NER，耗时 50–200 ms，无需 API 调用。使用 `pip install spacy && python -m spacy download en_core_web_sm` 安装。在 LLM 成本敏感的生成式流水线中，这是最佳的默认选择。
- `"huggingface"`——领域特定的微调模型，耗时 200 ms–2 s。制药领域使用 `d4data/biomedical-ner-all`，通用高精度 NER 使用 `dslim/bert-base-NER`。使用 `pip install "semantica[huggingface]"` 安装。
- `"llm"`——对隐式实体和自定义标签方案具有最高召回率，每份文档耗时 1–10 s。始终搭配兜底方法：`methods=["llm", "ml", "pattern"]`。

兜底行为是自动的：如果主要方法返回空列表，框架会沿方法链向下依次尝试，直到找到结果或耗尽列表。模式匹配始终是隐式的最后兜底。

## 相关指南

- [溯源指南](/zh/guides/provenance)——将每个抽取出的实体和分块追溯至其源文档
- [Agent Memory 指南](/zh/guides/agent-memory)——将抽取出的知识存储为可搜索、带图增强的 agent 记忆
- [上下文图指南](/zh/guides/context-graphs)——抽取出的实体如何填充 `ContextGraph` 的节点和边
- [GraphRAG 指南](/zh/guides/graphrag)——从已填充的图中检索事实，为 LLM 响应提供依据
- [推理指南](/zh/guides/reasoning)——在抽取出的图上推导新事实、运行 SPARQL 查询并应用推理规则
- [Semantic Extract 参考](../reference/semantic_extract)——所有抽取器类、提供程序和验证器的完整 API