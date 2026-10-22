---
title: "本体模块"
description: "自动本体生成、SHACL 校验、OWL/RDF 导出、命名空间管理，以及 LLM 驱动的本体生成。"
icon: "sitemap"
sourceHash: "6f5ffb36be4fbe739315540be7282fd637c8ab533fd3f63011facdd3fa2179b1"
---

`semantica.ontology` 提供知识图谱 schema 的完整生命周期：

- 通过 5 阶段流水线（语义网络 → YAML → 类型 → 层级 → TTL）从 KG 数据自动生成本体
- 针对复杂领域，通过 `LLMOntologyGenerator` 实现 LLM 驱动的本体生成
- SHACL 校验：生成形状、校验图并获取违规报告
- 以 Turtle、RDF/XML 和 JSON-LD 格式导出 OWL/RDF
- `semantica.explorer` 中提供本体中心可视化编辑器（v0.5.0）


## 导出的类

| 类 | 职责 |
| :--- | :--- |
| `OntologyEngine` | 统一门面，编排完整的本体生命周期 |
| `OntologyGenerator` | 从 KG 数据自动生成本体（5 阶段流水线） |
| `LLMOntologyGenerator` | 面向复杂领域的 LLM 驱动本体生成 |
| `SHACLGenerator` | 从本体或 KG schema 生成 SHACL 形状 |
| `OntologyValidator` | 依据 SHACL 形状校验任意图：返回 `SHACLValidationReport` |
| `OntologyQualityGate` | 为 CI 运行确定性的本体/KG 质量检查 |
| `OWLGenerator` | 将本体序列化为 Turtle、RDF/XML、JSON-LD |
| `NamespaceManager` | IRI 生成、前缀管理与命名空间绑定 |
| `OntologyEvaluator` | 覆盖率、完整性与粒度的质量指标 |
| `ClassInferrer` | 从实体类型模式推断类 |
| `PropertyGenerator` | 从实体属性与关系生成属性 |
| `AssociativeClassBuilder` | 将 N 元关系建模为中间 OWL 类 |


## 快速上手

**`OntologyEngine`** 是完整本体工作流的主要入口：

```python
from semantica.ontology import OntologyEngine

# Initialize with base URI for your domain
engine = OntologyEngine(base_uri="https://example.org/ontology/")

# Generate ontology from your knowledge graph data
ontology = engine.from_data({"entities": entities, "relationships": relationships})

# Validate a graph against the generated SHACL shapes
report = engine.validate_graph(kg, ontology=ontology)
if not report.conforms:
    for v in report.violations:
        print(f"{v.severity}: {v.message} on {v.focus_node}")

# Export to OWL Turtle
engine.export_owl(ontology, "ontology.ttl", format="turtle")
```

## OntologyEngine（统一门面）

**`OntologyEngine`** 编排完整的本体生命周期：**生成、校验、导出与评估**：

```python
from semantica.ontology import OntologyEngine

engine = OntologyEngine(base_uri="https://example.org/ontology/")

# Generate ontology from KG data
ontology = engine.from_data({"entities": entities, "relationships": relationships})

# Validate a graph against the generated SHACL shapes
report = engine.validate_graph(kg, ontology=ontology)
if not report.conforms:
    for v in report.violations:
        print(f"{v.severity}: {v.message} on {v.focus_node}")

# Export to OWL Turtle
engine.export_owl(ontology, "ontology.ttl", format="turtle")
```

### OntologyEngine 方法

| 方法 | 描述 |
| :------ | :----------- |
| `from_data(data)` | 对实体/关系数据运行 5 阶段流水线 |
| `validate_graph(kg, ontology=...)` | 依据生成的 SHACL 形状检查知识图谱 |
| `quality_check(ontology, graph_data=...)` | 返回确定性的质量报告与 CI 友好的通过/失败结果 |
| `export_owl(ontology, path, format)` | 序列化为 `"turtle"`、`"xml"` 或 `"json-ld"` |
| `evaluate(ontology, kg)` | 计算覆盖率、完整性与粒度指标 |

### 本体质量门禁

在导出或部署之前使用质量门禁捕获结构性问题，且无需引入运行时依赖：

```python
from semantica.ontology import ontology_quality_check

report = ontology_quality_check(
    ontology,
    graph_data=kg,
    thresholds={"min_coverage": 0.8},
)

if not report.passed:
    for issue in report.issues:
        print(issue.code, issue.message)
```

该报告检查类/属性覆盖率、孤立的 schema 元素、domain 与 range 引用，以及未解析的 KG 关系端点。它包含机器可读的问题代码、严重级别、计数、指标以及阈值失败信息。首个版本仅报告发现的问题；不会自动修复数据。

### 阈值

`min_coverage`（默认 `0.0`）设置所需的最低 `coverage` 分数，即类覆盖率与属性覆盖率的平均值，取值范围为 `0.0` 到 `1.0`；低于该值时门禁失败。`max_errors`（默认 `0.0`）限制在门禁失败前允许的 `error`/`critical` 问题数量。`max_warnings`（默认 `None`）以同样方式限制 `warning` 问题，`None` 表示仅警告永远不会导致门禁失败。`fail_on_warnings` 是独立参数，而非 `thresholds` 的键，直接传给 `OntologyQualityGate(...)` 或 `.check(...)`；当其为 `True` 时，单个警告即会导致门禁失败，无论 `max_warnings` 如何设置。

## OntologyGenerator（5 阶段流水线）

**`OntologyGenerator`** 从知识图谱的实体与关系自动生成形式化本体：

```python
from semantica.ontology import OntologyGenerator

generator = OntologyGenerator(base_uri="https://example.org/ontology/")
ontology  = generator.generate_ontology({
    "entities":      entities,
    "relationships": relationships,
})
```

<Steps>
  <Step title="语义网络解析">
    从源数据的实体类型与关系结构中提取概念与模式。
  </Step>
  <Step title="YAML 到定义">
    将提取出的模式转换为中间形式的类与属性定义。
  </Step>
  <Step title="定义到类型">
    将定义映射到 OWL 构造：`owl:Class`、`owl:ObjectProperty`、`owl:DatatypeProperty`。
  </Step>
  <Step title="层级生成">
    使用传递闭包与环检测构建分类树：生成 `rdfs:subClassOf` 链。
  </Step>
  <Step title="TTL 生成">
    使用 `rdflib` 将最终本体序列化为 Turtle 格式。同时提供：RDF/XML 与 JSON-LD。
  </Step>
</Steps>

## SHACL 校验

从本体生成 SHACL 形状，并据此校验任意图：

```python
from semantica.ontology import SHACLGenerator, OntologyValidator, SHACLValidationReport, SHACLViolation

# Generate shapes from ontology
generator  = SHACLGenerator()
shapes     = generator.generate(ontology)
shapes_ttl = shapes.serialize(format="turtle")

# Validate a graph against the shapes
validator = OntologyValidator()
report: SHACLValidationReport = validator.validate_graph(kg, ontology=ontology)

if not report.conforms:
    violation: SHACLViolation
    for violation in report.violations:
        print(f"{violation.severity}: {violation.message}")
        print(f"  Node: {violation.focus_node}")
        print(f"  Path: {violation.result_path}")
```

### 校验报告字段

| 字段 | 类型 | 描述 |
| :----- | :---- | :----------- |
| `conforms` | `bool` | 若图通过所有 SHACL 约束则为 `True` |
| `violations` | `List[SHACLViolation]` | 详细的失败记录 |
| `focus_node` | `str` | 违规图节点的 IRI |
| `result_path` | `str` | 违规属性路径的 IRI |
| `severity` | `str` | `"Violation"`、`"Warning"` 或 `"Info"` |
| `message` | `str` | 人类可读的约束失败描述 |

## LLM 驱动的本体生成

适用于模式难以通过统计推断的复杂或新颖领域：

```python
from semantica.ontology import LLMOntologyGenerator

# Initialize with your preferred LLM provider
generator = LLMOntologyGenerator(provider="openai")  # or "anthropic", "groq", etc.
ontology  = generator.generate_ontology_from_text(
    text="A biomedical ontology for clinical trial protocols involving patients, trials, interventions, and outcomes."
)
```

## OWL / RDF 导出

```python
from semantica.ontology import OWLGenerator

generator = OWLGenerator()
generator.export_owl(ontology, path="ontology.ttl",  format="turtle")
generator.export_owl(ontology, path="ontology.owl",  format="xml")
generator.export_owl(ontology, path="ontology.json", format="json-ld")
```

## 命名空间管理

```python
from semantica.ontology import NamespaceManager

ns = NamespaceManager(base_uri="https://example.org/")
ns.register("ex",     "https://example.org/")
ns.register("schema", "https://schema.org/")
ns.register("owl",    "http://www.w3.org/2002/07/owl#")

# Generate IRIs for classes and properties
class_iri    = ns.generate_class_iri("Person")
property_iri = ns.generate_property_iri("worksFor")
```

## 本体评估

衡量生成本体的覆盖率、完整性与粒度：

```python
from semantica.ontology import OntologyEvaluator

evaluator = OntologyEvaluator()
result    = evaluator.evaluate_ontology(ontology, kg)

print(f"Class coverage:    {result.class_coverage:.2f}")
print(f"Property coverage: {result.property_coverage:.2f}")
print(f"Completeness:      {result.completeness:.2f}")
print(f"Granularity:       {result.granularity:.2f}")

for gap in result.gaps:
    print(f"Gap: {gap.description}")
```

## 常见工作流

<Tabs>
  <Tab title="快速上手">
    **三步生成并校验本体：**

    ```python
    from semantica.ontology import OntologyEngine

    # 1. Initialize engine
    engine = OntologyEngine(base_uri="https://yourcompany.com/ontology/")

    # 2. Generate from your data
    ontology = engine.from_data({"entities": entities, "relationships": relationships})

    # 3. Validate against a knowledge graph
    report = engine.validate_graph(kg, ontology=ontology)
    if report.conforms:
        print("✓ Graph conforms to ontology")
    else:
        print(f"✗ Found {len(report.violations)} violations")
    ```
  </Tab>
  <Tab title="LLM 驱动的生成">
    **从文本描述生成本体：**

    ```python
    from semantica.ontology import LLMOntologyGenerator

    generator = LLMOntologyGenerator(provider="openai")
    ontology = generator.generate_ontology_from_text("""
        Create an e-commerce ontology with products, customers, orders, 
        categories, reviews, and payment methods.
    """)

    # Refine with additional constraints
    engine = OntologyEngine()
    validated = engine.validate(ontology)
    ```
  </Tab>
  <Tab title="导出与集成">
    **以多种格式导出本体：**

    ```python
    from semantica.ontology import OntologyEngine

    engine = OntologyEngine()

    # Export as OWL/Turtle for Protégé
    engine.export_owl(ontology, "schema.ttl", format="turtle")

    # Export as JSON-LD for web applications
    engine.export_owl(ontology, "schema.jsonld", format="json-ld")

    # Generate SHACL shapes for validation
    engine.export_shacl(ontology, "shapes.ttl")
    ```
  </Tab>
</Tabs>

## 摄取现有本体

加载并解析本体文件以供下游使用：

```python
from semantica.ontology import ingest_ontology

ontology_data = ingest_ontology("schema.ttl")     # Turtle
ontology_data = ingest_ontology("schema.owl")     # OWL/XML
ontology_data = ingest_ontology("schema.jsonld")  # JSON-LD
```

<Note>
  本体版本管理（`VersionManager`、`OntologyVersion`）已迁移至 `semantica.change_management`。请从该处导入：`from semantica.change_management import VersionManager`。
</Note>

- [推理](/zh/reference/reasoning) — 在本体公理上应用推理规则。
- [知识图谱](/zh/reference/kg) — 由本体所建模的图。
- [导出](/zh/reference/export) — 将本体导出为 RDF、OWL 或 JSON-LD。
- [冲突](/zh/reference/conflicts) — 检测本体约束违规。