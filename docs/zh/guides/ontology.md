---
title: "本体管理"
description: "从知识图谱生成 OWL 本体，验证类层次结构，推断属性，并导出为 Turtle、RDF/XML 或 JSON-LD。"
sourceHash: "e6ea8ebde36fd85bd9703dc473478a3381b917fd6cbbe271ca2f641cdb79b648"
---

`OntologyGenerator` 直接从知识图谱中已有的实体和关系推导出形式化 OWL 本体——无需预先设计模式。用它为图的类和属性生成机器可读的契约，然后导出为 Turtle、OWL/XML 或 JSON-LD，供 SHACL 校验、推理引擎和 STIX/TAXII 工具链使用。

## 什么是本体？

本体是对某个领域中概念和关系的形式化规范。它通过声明以下内容，为知识图谱定义共享词表：

**类（Classes）**——领域中的实体类型。例如网络安全领域的 `ThreatActor`、`Vulnerability` 或 `Software`。类描述存在哪些种类的事物。

**对象属性（Object Properties）**——实体之间的关系。例如：`exploits`（威胁行为者利用漏洞）、`targets`（恶意软件以组织为目标）或 `uses`（行为者使用工具）。

**数据类型属性（Datatype Properties）**——字面量值属性。例如：`name`（文本）、`severity_score`（小数）、`published_date`（日期）或 `ip_address`（字符串）。

本体通过规定哪些关系有效、每个属性可以持有什么类型的值，以及概念之间如何按层次关联，使知识图谱具备机器可读性。

## 为什么要使用本体？

**一致性。** 没有本体时，一个团队可能用 "Threat_Actor"，另一个团队却用 "ThreatActor" 表示同一概念。本体强制使用单一命名约定。

**校验。** 本体支持自动检查——这条关系是否合理？Vulnerability 的 CVSS 分数应该是文本还是数字？

**推理。** 导出为 OWL/Turtle 后，外部推理引擎（HermiT、Pellet、ELK）可以推断出新事实。如果 Malware 是 Software 的子类，而 HAMMERTOSS 是 Malware，OWL 推理器会得出结论：HAMMERTOSS 也是 Software。Semantica 负责导出本体；推理本身在外部工具中运行。

**知识图谱质量。** 结构化模式可及早发现错误，并确保新数据与现有实体干净集成。

## 何时使用 / 何时不使用

**适合使用本体的场景：**
- 具有复杂实体关系的形式化知识图谱
- 跨多个团队或组织的数据集成
- 自动化推理和基于规则的系统
- 需要长期保持一致性的知识库
- 与期望 OWL/RDF 模式的外部工具集成

**不适合使用本体的场景：**
- 对文本文档进行简单的语义搜索
- 向量相似度已足够轻量级 RAG
- 模式频繁变化的原型开发
- 无需可复用性的一次性数据分析
- 开销超过领域复杂度的场景

<Info>
Semantica 的本体模块直接从知识图谱中已有的实体和关系推导出形式化 OWL 本体——无需预先设计模式。一个 6 阶段流水线会推断类、构建层次结构、映射 OWL 类型并序列化为 Turtle。该流水线在内存中运行；不需要运行中的三元组存储。
</Info>

---

## 一个简单示例

先从熟悉的业务领域开始，理解其机制，然后再深入网络安全：

```python
from semantica.ontology import OntologyGenerator

# Build a simple organizational graph directly
data = {
    "entities": [
        {"id": "e-1", "name": "Alice",            "type": "Person"},
        {"id": "e-2", "name": "Bob",              "type": "Person"},
        {"id": "e-3", "name": "Carol",            "type": "Person"},
        {"id": "e-4", "name": "Acme Corporation", "type": "Company"},
        {"id": "e-5", "name": "San Francisco",    "type": "Location"},
    ],
    "relationships": [
        {"source_id": "e-1", "target_id": "e-4", "type": "works_for"},
        {"source_id": "e-2", "target_id": "e-4", "type": "works_for"},
        {"source_id": "e-1", "target_id": "e-3", "type": "reports_to"},
        {"source_id": "e-4", "target_id": "e-5", "type": "headquartered_in"},
    ],
}

generator = OntologyGenerator(
    base_uri="https://company.example.org/ontology/",
    min_occurrences=1,
)

ontology = generator.generate_ontology(
    data,
    name="OrganizationOntology",
    build_hierarchy=True,
)

# Inspect what was generated
print(f"Classes: {len(ontology.get('classes', []))}")
# Classes: 3

print("Object Properties:")
for prop in ontology.get('properties', []):
    if prop.get('type') == 'object':
        domain = ', '.join(prop.get('domain', []))
        range_ = ', '.join(prop.get('range', []))
        print(f"  {prop['name']} ({domain} → {range_})")
# works_for (Person → Company)
# reports_to (Person → Person)
# headquartered_in (Company → Location)

print("Datatype Properties:")
for prop in ontology.get('properties', []):
    if prop.get('type') == 'data':
        print(f"  {prop['name']} ({prop.get('range')})")
# name (string)
```

**base_uri**（`https://company.example.org/ontology/`）会成为所有类和属性的命名空间前缀。`Person` 在导出的 RDF 中变成 `<https://company.example.org/ontology/Person>`。

**对象属性**将实体连接到其他实体（`works_for`、`reports_to`）。**数据类型属性**将实体连接到字面量值（`name`）。

---

## 没有模式的图

现在理解了模式，接下来用 CTI 数据填充知识图谱，让流水线机制变得可见。

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore

vs    = VectorStore(backend="faiss", dimension=768)
graph = ContextGraph()
ctx   = AgentContext(vector_store=vs, knowledge_graph=graph, graph_expansion=True)

ctx.store(
    [
        "CVE-2024-3400 is a critical vulnerability in PAN-OS exploited by APT29.",
        "APT29 is a Russian state-sponsored threat actor targeting NATO governments.",
        "PAN-OS is a network operating system developed by Palo Alto Networks.",
        "HAMMERTOSS is a backdoor malware used by APT29 for command-and-control.",
    ],
    extract_entities=True,
    extract_relationships=True,
)

# At this point we have ~8 nodes and several edges, but no formal schema.
# "APT29" and a hypothetical "Lazarus Group" are both ThreatActors —
# but nothing enforces that both must have an attribution_confidence property.
print(f"Graph nodes: {len(graph.to_dict().get('nodes', []))}")
```

---

## 生成本体

`OntologyGenerator` 读取你的图字典并运行 6 阶段流水线。

```python
from semantica.ontology import OntologyGenerator

generator = OntologyGenerator(
    base_uri="https://cti.example.org/ontology/",
    min_occurrences=1,   # every entity type that appears at least once becomes a class
)

ontology = generator.generate_from_graph(
    graph.to_dict(),
    name="CyberThreatOntology",
    build_hierarchy=True,  # infer parent-child class relationships
)

# What the pipeline produced:
print(f"Classes   : {len(ontology.get('classes', []))}")
# Classes   : 4  → ThreatActor, Vulnerability, Software, Malware

print(f"Properties: {len(ontology.get('properties', []))}")
# Properties: 3  → exploits (object), targets (object), name (datatype)

# Inspect a class:
for cls in ontology.get("classes", []):
    print(f"  {cls['name']}  parent={cls.get('parent')}")
# ThreatActor   parent=None
# Vulnerability parent=None
# Software      parent=None
# Malware       parent=Software   ← hierarchy inferred because HAMMERTOSS was linked to PAN-OS (Software)
```

`Malware` 的层次结构条目表明，流水线根据关系图中的共现模式检测到恶意软件是软件的子类型。你可以在导出前手动覆盖这些推断。

---

## 校验模式

在导出前运行结构校验。

```python
from semantica.ontology import validate_ontology

result = validate_ontology(ontology)

print(f"Valid: {result.get('valid', False)}")
# Valid: True

for w in result.get("warnings", []):
    print(f"  WARN : {w}")
# WARN : Class 'Malware' has no declared datatype properties

for e in result.get("errors", []):
    print(f"  ERROR: {e}")
# (none — the ontology is structurally sound)
```

在此阶段，关于缺少数据类型属性的警告很常见。这意味着推断流水线在你的图中找到了该类，但没有任何节点携带显式属性值。你可以在下一个导出周期前使用 `ClassInferrer` 和 `PropertyGenerator` 手动添加属性。

---

## 随着新节点类型出现而扩展本体

使用 `ClassInferrer` 增量添加新实体类型，而无需重新生成完整本体。

```python
from semantica.ontology import ClassInferrer, PropertyGenerator

# Fine-grained control: infer classes from the new batch of entities
new_entities = [
    {"id": "kev-001", "name": "KEV-CVE-2024-3400", "type": "KEVEntry",
     "due_date": "2024-04-19", "ransomware_use": "Known"},
    {"id": "kev-002", "name": "KEV-CVE-2023-4966", "type": "KEVEntry",
     "due_date": "2023-11-14", "ransomware_use": "Unknown"},
]

inferrer = ClassInferrer()
new_classes = inferrer.infer_classes(new_entities)
# [{"id": "KEVEntry", "name": "KEVEntry", "parent": None, ...}]

# Manually set the parent to Vulnerability before merging
for cls in new_classes:
    if cls["name"] == "KEVEntry":
        cls["parent"] = "https://cti.example.org/ontology/Vulnerability"

# Inspect the hierarchy
hierarchy = inferrer.build_class_hierarchy(new_classes)
print(hierarchy)
# {"KEVEntry": {"parent": "...Vulnerability", "children": []}}

# Merge into the existing ontology
ontology["classes"].extend(new_classes)

# Infer properties from the new nodes
prop_gen = PropertyGenerator()
# PropertyGenerator reads entity attributes and relationship patterns
# to produce datatype properties (due_date: xsd:date) and object properties
```

这里的模式是增量式的：对每个新批次运行 `infer_classes`，检查结果，在流水线猜测错误的地方调整父类分配，然后合并。本体随图一起增长，而不是落后于它。

---

## 从非结构化文本生成本体

`LLMOntologyGenerator` 使用 LLM 从文本中提取类和属性——在尚无结构化图时，适合用于引导启动。

```python
from semantica.ontology import LLMOntologyGenerator

llm_gen = LLMOntologyGenerator(provider="groq", model="llama-3.1-8b-instant")

ontology_from_text = llm_gen.generate_ontology_from_text(
    """
    APT29 (also known as Cozy Bear) is a Russian state-sponsored threat actor.
    They use spear-phishing emails to deliver HAMMERTOSS malware.
    HAMMERTOSS communicates over Twitter and GitHub to evade detection.
    The group has been observed exploiting CVE-2024-3400 in PAN-OS appliances.
    """
)

# The LLM identified: ThreatActor, Malware, Vulnerability, Platform, CommunicationChannel
print(f"Classes extracted: {len(ontology_from_text.get('classes', []))}")

# Supported providers: "groq", "openai", "anthropic", "novita"
```

<Info>
`LLMOntologyGenerator` 最适合在尚无结构化图的新领域中进行引导启动。一旦有了图，优先使用 `OntologyGenerator.generate_from_graph()`——它是确定性的、可复现的，并且不会在每次运行时消耗 LLM token。
</Info>

---

## 导出以供下游系统使用

按下游工具期望的格式导出。

```python
from semantica.export import export_owl, export_rdf

# OWL/XML — for Protégé, OWL API, HermiT, Pellet
export_owl(ontology, "cyber_threat.owl", format="owl-xml")

# Turtle — compact, human-readable; preferred for SHACL toolchains
export_rdf(ontology, "cyber_threat.ttl", format="turtle")

# JSON-LD — for web APIs and linked-data applications
export_rdf(ontology, "cyber_threat.jsonld", format="jsonld")

# N-Triples — for bulk load into triple stores (GraphDB, Stardog, Oxigraph)
export_rdf(ontology, "cyber_threat.nt", format="ntriples")
```

导出的 Turtle 文件是 Semantica SHACL 校验流水线的输入。请参阅 [SHACL 校验](/zh/guides/shacl-validation)指南，了解如何从此本体生成约束形状并对实时图数据运行它们。

---

## 起草、审查和发布本体变更

编辑实时本体比编辑图数据是更重的变更。其他系统已经基于这些类和属性名称构建，因此重命名会产生连锁影响。Explorer 通过 HTTP 暴露草稿/提案流程，使变更在到达图之前先经过暂存和审查。

当不止一个人或代理编辑同一本体时，这种开销是值得的。在原型开发阶段，重新生成本体通常比审查差异更划算。

**状态机**

| 状态 | 进入方式 | 后续可发生什么 |
| :---- | :--------- | :------------------- |
| `draft` | `PATCH /api/ontology/draft` | 提交为提案 |
| `proposed` | `POST /api/ontology/propose` | 批准或拒绝 |
| `approved` | `POST /api/ontology/proposals/{id}/approve` | 发布（其他状态均不可） |
| `rejected` | `POST /api/ontology/proposals/{id}/reject` | 修订为新草稿 |
| `published` | `POST /api/ontology/proposals/{id}/publish` | 终态 |

对于除 `approved` 以外的任何状态，`publish` 都会返回 `400`，因此提案若未经明确批准就无法到达图。

**流程**

```bash
# 1. Stage the change. This endpoint is PATCH, not POST.
curl -X PATCH http://localhost:8000/api/ontology/draft \
  -H "Content-Type: application/json" \
  -d '{
    "ontology_uri": "http://example.org/onto/security",
    "author": "analyst@example.org",
    "summary": "Add Platform class for infrastructure entities",
    "diff": {
      "added_classes": ["http://example.org/onto/security#Platform"],
      "added_properties": []
    }
  }'
# → {"draft_id": "draft_9f2c1a4b7e03", ...}
```

```bash
# 2. Submit it. This is where the checks run.
curl -X POST http://localhost:8000/api/ontology/propose \
  -H "Content-Type: application/json" \
  -d '{
    "draft_id": "draft_9f2c1a4b7e03",
    "ontology_uri": "http://example.org/onto/security",
    "summary": "Add Platform class for infrastructure entities"
  }'
```

响应返回两个块：

- `impact_analysis`——来自 `VersionManager.diff_ontologies` 的结构化差异，以及 `class_adds`、`class_removals`、`property_changes` 和 `restriction_changes` 计数。
- `shacl_validation`——将当前图数据与根据拟议本体生成的形状进行校验。当会话没有配置存储时，它会读取 `{"status": "skipped", "reason": "No store configured"}`；当校验本身失败时，会返回 `{"status": "error", ...}`。二者都不会阻止提案创建；它们都是参考性的。

```bash
# 3. Read the proposal, then approve or reject it. `GET /api/ontology/proposals`
#    lists them, optionally filtered with ?ontology_uri= and ?state=.
curl http://localhost:8000/api/ontology/proposals/prop_4d8e01a9c3f2
curl -X POST http://localhost:8000/api/ontology/proposals/prop_4d8e01a9c3f2/approve

# Reviewers can also leave comments tied to a specific element URI.
curl -X POST http://localhost:8000/api/ontology/proposals/prop_4d8e01a9c3f2/comment \
  -H "Content-Type: application/json" \
  -d '{
    "element_uri": "http://example.org/onto/security#Platform",
    "text": "Should this inherit from Infrastructure rather than sit at the top level?",
    "author": "reviewer@example.org"
  }'
```

```bash
# 4. Publish. Creates a version record first, then writes to the graph.
curl -X POST http://localhost:8000/api/ontology/proposals/prop_4d8e01a9c3f2/publish
# → {"status": "published", "version": "1.1.0", "nodes_added": 1, "edges_added": 0}
```

**发布应用哪些内容，以及顺序如何**

发布在接触实时图之前会调用 `VersionManager.create_version()`。如果版本创建失败，请求会返回 `500`，并且不会添加任何内容。

它仅应用新增内容。`added_classes` 和 `added_properties` 会变成 `owl:Class` 和 `owl:ObjectProperty` 节点；删除和修改会记录在版本历史中，但不会删除或重写图中已有的任何内容。

**版本历史与比较**

```bash
curl "http://localhost:8000/api/ontology/versions/http%3A%2F%2Fexample.org%2Fonto%2Fsecurity"

curl -X POST "http://localhost:8000/api/ontology/versions/http%3A%2F%2Fexample.org%2Fonto%2Fsecurity/compare" \
  -H "Content-Type: application/json" \
  -d '{"version1": "1.1.0", "version2": "1.2.0"}'
```

`compare` 会分别返回 `class_changes`、`property_changes`、`restriction_changes` 和 `axiom_changes` 块，因此无需对整个本体做差异比较就能看出哪些内容发生了变化。

---

## 常见陷阱

**过度建模。** 10 个类足够时，不要创建 50 个。从简单开始，只在需要为推理或校验建立形式化区分时才增加复杂度。为 `MaliciousEmail` 和 `PhishingEmail` 设置单独的类，只有在它们具有不同属性或关系时才有用。

**本体漂移。** 当图中出现新的实体类型时，除非重新生成或增量更新本体，否则本体会过时。设置监控，以便在出现当前本体未覆盖的新实体类型时检测到。

**类命名不一致。** 选择一种约定（CamelCase、snake_case 或 kebab-case）并坚持使用。在同一本体中混用 `ThreatActor`、`threat_actor` 和 `threat-actor` 会造成混乱，并破坏期望一致命名模式的工具。

**内存状态。** 该流程将状态保存在应用对象上而不是存储中，因此重启会丢失所有草稿、提案和版本记录，并且状态不会在 worker 进程之间共享。任何你打算保留的内容都必须在进程重启前发布。

**路径段中未编码的 `#`。** `/api/ontology/drafts/{uri}` 和 `/api/ontology/versions/{uri}` 将本体 URI 作为路径段，而 `#` 在该位置会开始 URL 片段，因此服务器只能看到它之前的部分。应将其编码为 `%23`，如上面的版本示例所示。OWL 本体通常以 `#` 结尾，而这种失败是静默的：端点返回 `200` 和空列表，而不是报告被截断的 URI。不含 `#` 的 URI 不受影响。

---

## 领域示例

<Tabs>

<Tab title="国防——CTI/威胁">

一个国防 CTI 团队每天早上摄取原始 OSINT 报告。本体必须与 STIX 2.1 和 NATO MISP 分类法保持互操作，因此 IRI 遵循 DoD 命名空间，本体导出为 OWL/XML 供该组织的 SIEM 推理插件使用。

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore
from semantica.ingest import ingest_file, ingest_web
from semantica.ontology import OntologyGenerator, validate_ontology
from semantica.export import export_owl, export_rdf

vs    = VectorStore(backend="faiss", dimension=768)
graph = ContextGraph()
ctx   = AgentContext(vector_store=vs, knowledge_graph=graph, graph_expansion=True)

# Ingest a campaign PDF and NVD advisory page
cti_report = ingest_file("apt29_cozycar_2024.pdf", method="file")
nvd_entry  = ingest_web("https://nvd.nist.gov/vuln/detail/CVE-2024-3400", method="url")

ctx.store(
    [cti_report.text, nvd_entry.text],
    extract_entities=True,
    extract_relationships=True,
)

generator = OntologyGenerator(
    base_uri="https://ontology.dod.mil/cyber/",
    min_occurrences=1,
)
ontology = generator.generate_from_graph(
    graph.to_dict(),
    name="CyberThreatOntology",
    build_hierarchy=True,
)

result = validate_ontology(ontology)
print(f"Ontology valid: {result.get('valid')}")
# Ontology valid: True

# OWL/XML for the SIEM reasoning plugin; Turtle for the SHACL pipeline
export_owl(ontology, "./ontologies/cyber_threat.owl", format="owl-xml")
export_rdf(ontology, "./ontologies/cyber_threat.ttl", format="turtle")

print(f"Classes    : {len(ontology.get('classes', []))}")
print(f"Properties : {len(ontology.get('properties', []))}")
# Classes    : 7  (ThreatActor, Vulnerability, Malware, Platform, Campaign, ...)
# Properties : 9  (exploits, targets, uses, name, cvss_score, ...)
```

</Tab>

<Tab title="安全——SOC/事件">

一个 SOC 团队将零信任身份实体——用户、服务账户、资源和策略——建模为 OWL 本体，使他们的策略评估引擎可以使用共享的形式化词表，而不是硬编码字符串。

```python
from semantica.ontology import OntologyGenerator, ClassInferrer
from semantica.export import export_owl

# Hand-specify the identity graph — in production this comes from your IAM export
data = {
    "entities": [
        {"id": "u-1",  "name": "alice",      "type": "User"},
        {"id": "u-2",  "name": "svc-scanner","type": "ServiceAccount"},
        {"id": "r-1",  "name": "kube-api",   "type": "Resource"},
        {"id": "r-2",  "name": "s3-prod",    "type": "Resource"},
        {"id": "p-1",  "name": "ReadOnly",   "type": "Policy"},
        {"id": "p-2",  "name": "AdminAccess","type": "Policy"},
    ],
    "relationships": [
        {"source_id": "u-1", "target_id": "p-1", "type": "BOUND_TO"},
        {"source_id": "u-2", "target_id": "p-2", "type": "BOUND_TO"},
        {"source_id": "p-1", "target_id": "r-1", "type": "ALLOWS_ACCESS"},
        {"source_id": "p-2", "target_id": "r-2", "type": "ALLOWS_ACCESS"},
    ],
}

generator = OntologyGenerator(
    base_uri="https://zerotrust.corp/ontology/",
    min_occurrences=1,
)
ontology = generator.generate_ontology(data, name="ZeroTrustOntology")

# Inspect what the pipeline inferred
inferrer = ClassInferrer()
classes  = inferrer.infer_classes(data["entities"])
for cls in classes:
    print(f"  Class: {cls.get('name')}")
# Class: User
# Class: ServiceAccount
# Class: Resource
# Class: Policy

export_owl(ontology, "./ontologies/zero_trust.owl", format="owl-xml")
print("Ontology exported for policy evaluation engine")
```

</Tab>

<Tab title="生命科学——临床/制药">

一个制药团队需要一个与 OBO Foundry 约定（GO、CHEBI、HP）对齐的本体，以描述 II/III 期肿瘤试验方案。由于源数据位于 PostgreSQL 试验数据库中——而不是知识图谱——他们使用 `LLMOntologyGenerator` 从文本描述进行引导启动。

```python
from semantica.ontology import LLMOntologyGenerator, OntologyGenerator, validate_ontology
from semantica.export import export_owl, export_rdf
from semantica.ingest import DBIngestor

# Load trial records from the clinical database
db = DBIngestor()
trial_rows = db.execute_query(
    "postgresql://readonly@clindb:5432/trials",
    """
        SELECT compound, target_protein, disease_indication,
               mechanism_of_action, primary_endpoint
        FROM trial_protocols WHERE phase IN ('II','III')
    """,
)

# Construct a natural-language summary for the LLM
protocol_text = "\n".join(
    f"Compound {r['compound']} targets {r['target_protein']} "
    f"in {r['disease_indication']} via {r['mechanism_of_action']}. "
    f"Primary endpoint: {r['primary_endpoint']}."
    for r in trial_rows
)

# LLM extracts classes: Compound, TargetProtein, DiseaseIndication,
#   MechanismOfAction, ClinicalEndpoint, ClinicalTrial
llm_gen  = LLMOntologyGenerator(provider="openai", model="gpt-4o")
ontology = llm_gen.generate_ontology_from_text(protocol_text)

result = validate_ontology(ontology)
print(f"Valid: {result.get('valid')}")
for w in result.get("warnings", []):
    print(f"  WARN: {w}")

# Export aligned to OBO Foundry URI convention
export_owl(ontology, "./ontologies/clinical_trial.owl", format="owl-xml")
export_rdf(ontology, "./ontologies/clinical_trial.ttl", format="turtle")
print("Ontology ready for Protégé review and OBO alignment check")
```

</Tab>

<Tab title="银行——风险/合规">

一个风险团队将 Basel III / BCBS 239 概念形式化为 OWL 本体，使自动化合规规则能够以共享词表对信用风险实体进行推理——取代 Python 脚本中硬编码的字段名检查。

```python
from semantica.ontology import LLMOntologyGenerator, validate_ontology
from semantica.export import export_owl, export_rdf
from semantica.ingest import ingest_file

# Ingest regulatory source documents
regs = [
    ingest_file("basel3_cre20.pdf", method="file"),
    ingest_file("sr_11_7.pdf",      method="file"),
    ingest_file("bcbs239.pdf",      method="file"),
]

# Use an LLM to extract the conceptual model from regulatory prose
llm_gen  = LLMOntologyGenerator(provider="anthropic", model="claude-sonnet-5")
ontology = llm_gen.generate_ontology_from_text(
    "\n\n".join(r.text[:8000] for r in regs)  # token-safe excerpt per document
)

result = validate_ontology(ontology)
if not result.get("valid"):
    for err in result.get("errors", []):
        print(f"ERROR: {err}")
    # Fix errors before publishing to the compliance rule engine
else:
    print("Ontology valid — publishing to compliance registry")
    # Turtle for SHACL shapes; OWL/XML for HermiT reasoning; JSON-LD for the API
    export_owl(ontology, "./ontologies/regulatory.owl",    format="owl-xml")
    export_rdf(ontology, "./ontologies/regulatory.ttl",    format="turtle")
    export_rdf(ontology, "./ontologies/regulatory.jsonld", format="jsonld")
```

</Tab>

</Tabs>

---

## 相关指南

- [SHACL 校验](/zh/guides/shacl-validation)——从你的本体生成 W3C SHACL 约束形状，并对实时图数据校验它们
- [推理与规则](/zh/guides/reasoning)——对本应用前向/后向链规则以推导新事实
- [导出与序列化](/zh/guides/export)——将图导出为 RDF、GraphML、CSV 和 Neo4j Cypher
- [语义抽取](/zh/guides/semantic-extraction)——抽取为生成本体提供输入的实体和关系
- [上下文图](/zh/guides/context-graphs)——本体生成所读取的知识图谱