---
title: "SHACL 校验"
description: "从 OWL 本体生成 W3C SHACL 形状，按结构与语义约束校验 RDF 知识图谱，并输出结构化的违规报告。"
icon: "shield-check"
sourceHash: "b0a75b5435cc562e273b8e4078919b82c75ce0727ff914ec49983385ef67c1d9"
---

## 什么是 SHACL 校验

SHACL（Shapes Constraint Language）是用于校验基于图的数据的标准。本体定义的是概念层面的*模式*（即你的领域中存在“什么”），而 SHACL 定义的是结构层面的*规则与约束*（即“如何”组织其结构）。

在 Semantica 中，`SHACLGenerator` 基于你的本体生成约束规则（形状），公开函数 `run_shacl_validation` 则用这些规则评估你的实际数据。如果某个节点违反了规则（例如缺少必需属性或使用了错误的数据类型），就会生成详细的违规报告。历史名称 `_run_pyshacl` 仍作为兼容别名保留。

## 为什么使用 SHACL 校验

在运行分析、导出数据或将数据输入生产模型之前，数据校验至关重要。SHACL 充当**数据质量闸门**，确保你的图数据在结构上健全。可用它来捕获：
- 缺少必需属性（例如客户没有电子邮件地址）。
- 数据类型不匹配（例如本应是数字却出现字符串）。
- 基数越界（例如一个人有三个主要地址）。

## 适用场景与不适用场景

- **适用场景**：你拥有复杂、相互关联的知识图谱，需要校验图中节点之间的*关系*与结构完整性。SHACL 擅长确保经过合并、高度互联的数据符合你的业务规则。
- **不适用场景**：如果你只是校验一个扁平的 JSON 载荷或单个传入的 API 请求。对于扁平数据或单条记录，应使用更简单、更快的库，如 Pydantic 或 JSONSchema。

---

## 关键术语说明

在深入之前，先介绍几个你会遇到的概念：

- **RDF（Resource Description Framework）**：将数据表示为图的标准方式。它把信息视为相互连接的“三元组”（主语 → 谓词 → 宾语）。
- **OWL（Web Ontology Language）**：用于构建本体的语言，定义你的领域中存在的类与属性。
- **SHACL 形状（Shapes）**：实际的校验规则。一个“形状”针对数据中的特定类（如 `Person`），并定义其必须遵循的约束（如“必须有一个出生日期”）。
- **Turtle（.ttl）**：一种流行的、人类可读的文件格式，用于存储 RDF 图数据和 SHACL 形状。

---

## 典型工作流

典型的 SHACL 校验流水线遵循以下生命周期：

1. **本体**：构建表示你的领域的本体。
2. **SHACL 形状**：基于该本体生成形状。
3. **数据图**：准备你的知识图谱。
4. **校验**：用 SHACL 形状校验知识图谱。
5. **违规报告**：分析报告中的错误。
6. **修复**：修复数据或流水线并重新校验。

---

## 通用示例：员工与部门

让我们看一个简单且普遍易懂的示例：确保每个 `Employee` 都属于某个 `Department`，并拥有 `employee_id`。

```python
from semantica.context import ContextGraph
from semantica.ontology import OntologyGenerator, SHACLGenerator, PropertyShape
from semantica.ontology import run_shacl_validation

# 1. Prepare your data graph
graph = ContextGraph()
graph.add_node("emp-1", "Employee", "Alice", employee_id="E001")
graph.add_node("emp-2", "Employee", "Bob") # Missing employee_id, will cause a violation!

# 2. Build the ontology
ontology = (
    OntologyGenerator(base_uri="https://company.example.com/ontology/", min_occurrences=1)
    .generate_from_graph(graph.to_dict(), name="CompanyOntology")
)

# 3. Generate SHACL Shapes
shacl_gen = SHACLGenerator(base_uri="https://company.example.com/shapes/", severity="Violation")
shacl_graph = shacl_gen.generate(ontology)

# Inject mandatory constraints
BASE = "https://company.example.com/ontology/"
for ns in shacl_graph.node_shapes:
    if "Employee" in ns.target_class:
        ns.property_shapes.append(
            PropertyShape(path=f"{BASE}employee_id", min_count=1, severity="Violation")
        )

# Serialize shapes to Turtle
shacl_ttl = shacl_gen.serialize(shacl_graph, format="turtle")

# 4. Prepare your RDF data graph
# (For validation, serialize your graph instances to RDF. Here we use a Turtle string.)
data_ttl = """
@prefix ex: <https://company.example.com/ontology/> .

<http://example.org/emp-1> a ex:Employee ;
    ex:employee_id "E001" .

<http://example.org/emp-2> a ex:Employee .
"""

# 5. Run Validation
report = run_shacl_validation(data_ttl, shacl_ttl)

# 6. Analyze the Report
print(f"Graph conforms: {report.conforms}")
if not report.conforms:
    report.explain_violations() # Populates human-readable explanations
    for v in report.violations:
        print(f"Violation: {v.explanation}")
```

---

接下来，我们更深入地探索这个工作流。

## 步骤 1 — 基于合并后的图构建本体

SHACL 形状由本体派生而来。如果你在之前的运行中已经得到本体，可跳过此步骤。

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore
from semantica.ontology import OntologyGenerator

graph = ContextGraph()
ctx   = AgentContext(
    vector_store=VectorStore(backend="faiss", dimension=768),
    knowledge_graph=graph,
    graph_expansion=True,
)

# Load the merged CTI data — in production this would be your full 12,000-node graph
ctx.store(
    [
        "APT29 is a Russian state-sponsored threat actor targeting NATO governments.",
        "CVE-2024-3400 is a critical vulnerability in PAN-OS exploited by APT29.",
        "HAMMERTOSS is a backdoor malware family used by APT29 for C2 over Twitter.",
        "PAN-OS is a network operating system developed by Palo Alto Networks.",
    ],
    extract_entities=True,
    extract_relationships=True,
)

ontology = (
    OntologyGenerator(base_uri="https://cti.example.org/ontology/", min_occurrences=1)
    .generate_from_graph(graph.to_dict(), name="CyberOntology")
)

print(f"Classes inferred: {len(ontology.get('classes', []))}")
# Classes inferred: 4  → ThreatActor, Vulnerability, Malware, Platform
```

---

## 步骤 2 — 从本体生成 SHACL 形状

`SHACLGenerator` 会生成一个 `SHACLGraph`，其中每个 OWL 类对应一个 `NodeShape`。

```python
from semantica.ontology import SHACLGenerator

shacl_gen = SHACLGenerator(
    base_uri="https://cti.example.org/shapes/",
    include_inherited=True,   # propagate parent-class constraints to sub-classes
    severity="Violation",     # default severity for all generated shapes
    quality_tier="standard",  # constraint strictness: "minimal" | "standard" | "strict"
)

shacl_graph = shacl_gen.generate(ontology)

print(f"Node shapes generated: {len(shacl_graph.node_shapes)}")
# Node shapes generated: 4  — one per class

for ns in shacl_graph.node_shapes:
    print(f"  {ns.target_class}  ({len(ns.property_shapes)} property constraints)")
# https://cti.example.org/ontology/ThreatActor   (2 property constraints)
# https://cti.example.org/ontology/Vulnerability  (3 property constraints)
# https://cti.example.org/ontology/Malware        (2 property constraints)
# https://cti.example.org/ontology/Platform       (1 property constraint)
```

生成的形状告诉你流水线观察到了什么，但它们尚未编码你的领域*要求*什么。下一节将展示如何注入领域特定的强制约束。

---

## 步骤 3 — 注入领域约束

添加流水线无法仅从数据推断出的强制 `PropertyShape` 约束。

```python
from semantica.ontology import PropertyShape

BASE = "https://cti.example.org/ontology/"

for node_shape in shacl_graph.node_shapes:

    if "Malware" in node_shape.target_class:
        # family is required — missing it causes a Violation
        node_shape.property_shapes.append(
            PropertyShape(
                path=f"{BASE}family",
                min_count=1,
                severity="Violation",
            )
        )
        # attribution_confidence is recommended — missing it causes a Warning
        node_shape.property_shapes.append(
            PropertyShape(
                path=f"{BASE}attribution_confidence",
                min_count=1,
                datatype="http://www.w3.org/2001/XMLSchema#float",
                severity="Warning",
            )
        )

    if "Vulnerability" in node_shape.target_class:
        # cvss_score is required by your detection rules
        node_shape.property_shapes.append(
            PropertyShape(
                path=f"{BASE}cvss_score",
                min_count=1,
                datatype="http://www.w3.org/2001/XMLSchema#float",
                severity="Violation",
            )
        )

    if "ThreatActor" in node_shape.target_class:
        # name is required; nation_state classification is recommended
        node_shape.property_shapes.append(
            PropertyShape(path=f"{BASE}name",         min_count=1, severity="Violation")
        )
        node_shape.property_shapes.append(
            PropertyShape(path=f"{BASE}nation_state",  min_count=1, severity="Warning")
        )

# Serialise the final shape graph to Turtle for reuse and version control
shacl_ttl = shacl_gen.serialize(shacl_graph, format="turtle")

with open("cti_shapes.ttl", "w") as f:
    f.write(shacl_ttl)

print("Shapes written to cti_shapes.ttl")
```

你也可以完全手工从头构建形状——当你需要表达生成器绝不会推断出的约束时（例如对 CVE ID 字段施加正则模式），这很有用：

```python
from semantica.ontology import NodeShape, PropertyShape, SHACLGraph

# Require CVE IDs to match the canonical NIST format
cve_id_shape = NodeShape(
    target_class="https://cti.example.org/ontology/Vulnerability",
    name="VulnerabilityShape",
    closed=False,
    severity="Violation",
    property_shapes=[
        PropertyShape(
            path="https://cti.example.org/ontology/cve_id",
            min_count=1,
            pattern=r"^CVE-\d{4}-\d{4,}$",   # e.g. CVE-2024-3400
            severity="Violation",
        ),
    ],
)
# Inject into the existing shacl_graph or build a standalone SHACLGraph
```

---

## 步骤 4 — 运行校验并阅读报告

将图序列化为 RDF，然后针对形状运行 `run_shacl_validation`。

```python
from semantica.ontology import run_shacl_validation

# Prepare your RDF data string (since export_rdf primarily exports structural metadata,
# you typically serialize your custom data graph to Turtle using rdflib or similar).
data_ttl = """
@prefix ex: <https://cti.example.org/ontology/> .

<http://example.org/malware-002> a ex:Malware .
<http://example.org/vuln-003> a ex:Vulnerability ;
    ex:cve_id "CVE24-3400" .
"""

# Run SHACL validation
report = run_shacl_validation(
    data_ttl,
    shacl_ttl,
    data_graph_format="turtle",
    shacl_format="turtle",
)

# High-level summary
print(f"Conforms   : {report.conforms}")
# Conforms   : False   ← at least one Violation found

print(f"Violations : {report.violation_count}")
# Violations : 3

print(f"Warnings   : {report.warning_count}")
# Warnings   : 2

print(report.summary())
# Graph does NOT conform: 3 violation(s).
```

摘要告诉你出了问题，现在深入查看细节。

---

## 步骤 5 — 理解违规内容

每个 `SHACLViolation` 都会指出涉及的节点、属性路径以及所需的修复。

```python
if not report.conforms:
    # Populate plain-English explanations for every violation
    report.explain_violations()
    
    # Iterate and print the explanations
    for v in report.violations:
        print(v.explanation)
    # Node <http://example.org/malware-002> is missing required property
    #   <https://cti.example.org/ontology/family>. At least 1 value(s) are required.
    # Node <http://example.org/vuln-003> is missing required property
    #   <https://cti.example.org/ontology/cvss_score>. At least 1 value(s) are required.
    # Node <http://example.org/vuln-003> has value 'CVE24-3400' for
    #   <https://cti.example.org/ontology/cve_id> which does not match the required pattern.

    # Iterate for programmatic triage
    for v in report.violations:
        print(f"VIOLATION  node={v.focus_node}")
        print(f"           path={v.result_path}")
        print(f"           rule={v.constraint}")
        print(f"           msg ={v.message}")
        if v.value:
            print(f"           val ={v.value}")
        if v.explanation:
            print(f"           fix ={v.explanation}")
        print()

    # Warnings are lower severity — review but do not block
    for w in report.warnings:
        print(f"WARNING  {w.focus_node}  {w.result_path}  {w.message}")
```

输出直接映射到修复任务：`malware-002` 需要添加 `family` 属性；`vuln-003` 需要 `cvss_score`，并将其 `cve_id` 修正为规范格式。

---

## 步骤 6 — 自动修复常见违规

标记或修补缺少必需属性的节点，然后重新验证以确认。

```python
# Parse the report into a dict for programmatic processing
report_dict = report.to_dict()

# Collect nodes missing the 'family' property
missing_family = [
    v["focus_node"]
    for v in report_dict.get("violations", [])
    if "family" in (v.get("result_path") or "")
]

print(f"Malware nodes missing 'family': {len(missing_family)}")
# In production: queue these for analyst enrichment or apply a default
# e.g. graph.update_node(node_id, {"family": "UNKNOWN — requires triage"})

# After remediation, re-run validation to confirm the fix
# (re-export the patched graph to Turtle first, then call run_shacl_validation again)
report2 = run_shacl_validation(patched_data_ttl, shacl_ttl)
print(f"Violations after remediation: {report2.violation_count}")
# Violations after remediation: 0
```

---

## 常见陷阱

- **假设本体会自动强制数据质量**：`SHACLGenerator` 根据其在数据中观察到的内容生成 shapes。如果你的数据缺少某个字段，除非你显式注入约束（如步骤 3 所示），否则生成器不会知道它是必填的。
- **将 `ContextGraph` 直接传给 SHACL 验证器**：`run_shacl_validation` 函数期望的是 RDF 字符串（如 Turtle 格式），而非原始的 Python 字典或 `ContextGraph` 对象。
- **忘记 RDF 序列化**：在验证之前，必须先序列化你的图（通常通过 `export_rdf` 使用临时文件）。
- **将验证当作一次性步骤**：验证应作为自动化步骤集成到你的 CI/CD 流水线或数据摄取流程中，充当持续的把关者，而非一次性脚本。
- **忽略验证报告**：不符合要求的图必须修复。不审查 `violation_count` 并解决问题，就使 SHACL 验证失去了意义。
- **在开启 RDFS 蕴涵的情况下，对声明了 `rdfs:range` 的属性验证 `sh:class`/`sh:node` 范围检查**：RDFS 是蕴涵规则，而非约束。当 pyshacl 以 `inference="rdfs"` 运行时，它会把 range 类推断到该属性的每个对象上，因此针对该属性的基于类的约束永远不会失败——报告会对不符合的数据显示 `conforms: True`：

    ```python
    from pyshacl import validate
    from rdflib import Graph

    data = Graph()
    data.parse(
        data="""
        @prefix ex: <https://example.org/ns#> .
        @prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
        ex:contains rdfs:domain ex:Container ; rdfs:range ex:Item .
        ex:box a ex:Container ; ex:contains ex:notAnItem .
        ex:notAnItem a ex:Fish .
        """,
        format="turtle",
    )

    shapes = Graph()
    shapes.parse(
        data="""
        @prefix ex: <https://example.org/ns#> .
        @prefix sh: <http://www.w3.org/ns/shacl#> .
        ex:ContainerShape a sh:NodeShape ;
            sh:targetClass ex:Container ;
            sh:property [ sh:path ex:contains ; sh:class ex:Item ] .
        """,
        format="turtle",
    )

    for inference in ("none", "rdfs"):
        conforms, _, _ = validate(data, shacl_graph=shapes, inference=inference)
        print(inference, conforms)
    # none  False   <- correct: notAnItem is a Fish, not an Item
    # rdfs  True    <- the entailment manufactured the type
    ```

    缓解措施：尽量不要对打算用 `sh:class` 约束的属性声明 `rdfs:range`；当被测对象是类成员关系时，在不启用 RDFS 蕴涵的情况下运行验证（`inference="none"`）；或者将检查表达为蕴涵无法满足的约束（例如字面量属性约束）。注意权衡：关闭蕴涵后，`sh:targetClass` 不再能触达子类，因此子类层级需要显式类型声明或感知推理的目标选择。Semantica 自己的 `run_shacl_validation` 封装已经以 `inference="none"` 调用 pyshacl，因此此陷阱仅在直接调用 `pyshacl.validate` 并启用蕴涵时才会出现。
- **不加检查推理模式就信任 `conforms: True`**：启用推理的运行可能隐藏 shapes 本就是为了捕获的那些违规（见上文）。在结果旁记录验证运行时所处的推理模式，并在将以通过为权威结论之前，对包含 `sh:class`/`sh:node` 的 shape 集在关闭蕴涵的情况下重新运行。

---

## 领域示例

<Tabs>

<Tab title="国防 — CTI/威胁">

某 DoD CTI 团队在将威胁图共享给 ISAC 合作伙伴之前，对其强制执行 STIX 兼容约束。每个 `ThreatActor` 必须声明 `name`，每个 `Vulnerability` 必须携带 `cvss_score`。验证门在每次夜间同步时自动运行。

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore
from semantica.ontology import OntologyGenerator, SHACLGenerator, PropertyShape
from semantica.ontology import run_shacl_validation

graph = ContextGraph()
ctx   = AgentContext(
    vector_store=VectorStore(backend="faiss", dimension=768),
    knowledge_graph=graph,
    graph_expansion=True,
)

ctx.store([
    "APT29 is a Russian state-sponsored threat actor targeting NATO governments.",
    "CVE-2024-3400 is a critical PAN-OS vulnerability with CVSS 10.0, exploited by APT29.",
    "HAMMERTOSS is a backdoor malware family used by APT29 for C2 over Twitter and GitHub.",
], extract_entities=True, extract_relationships=True)

ontology  = (
    OntologyGenerator(base_uri="https://cti.dod.mil/ontology/", min_occurrences=1)
    .generate_from_graph(graph.to_dict(), name="CTIOntology")
)

shacl_gen   = SHACLGenerator(
    base_uri="https://cti.dod.mil/shapes/",
    include_inherited=True,
    severity="Violation",
)
shacl_graph = shacl_gen.generate(ontology)

# STIX-aligned mandatory fields
for ns in shacl_graph.node_shapes:
    if "ThreatActor" in ns.target_class:
        ns.property_shapes.append(
            PropertyShape(path="https://cti.dod.mil/ontology/name",         min_count=1, severity="Violation")
        )
        ns.property_shapes.append(
            PropertyShape(path="https://cti.dod.mil/ontology/nation_state",  min_count=1, severity="Warning")
        )
    if "Vulnerability" in ns.target_class:
        ns.property_shapes.append(
            PropertyShape(path="https://cti.dod.mil/ontology/cvss_score",   min_count=1, severity="Violation")
        )

shacl_ttl = shacl_gen.serialize(shacl_graph, format="turtle")

# Prepare RDF data string
data_ttl = """
@prefix ex: <https://cti.dod.mil/ontology/> .

<http://example.org/apt29> a ex:ThreatActor .
<http://example.org/cve-2024-3400> a ex:Vulnerability .
<http://example.org/hammertoss> a ex:Malware .
"""

report = run_shacl_validation(data_ttl, shacl_ttl)
print(f"CTI graph conforms : {report.conforms}")
print(f"Violations         : {report.violation_count}")
print(f"Warnings           : {report.warning_count}")

if not report.conforms:
    report.explain_violations()
    for v in report.violations:
        print(v.explanation)
    # Blocks the nightly ISAC share until violations are resolved
```

</Tab>

<Tab title="安全 — SOC/事件">

某 SOC 团队在将零信任策略节点发布到策略执行点之前对其进行验证。每个 `Policy` 节点必须携带 `version`（semver 格式）和 `effective_date`。缺少任一字段的节点属于 Violation，会阻止发布。

```python
from semantica.context import ContextGraph
from semantica.ontology import OntologyGenerator, SHACLGenerator, PropertyShape
from semantica.ontology import run_shacl_validation

graph = ContextGraph()
graph.add_node("policy-001", "Policy", "MFA Required for Tier-1 Resources",
               version="1.0.0", effective_date="2025-01-01", owner="security_team")
graph.add_node("policy-002", "Policy", "Admin Access Requires PAM Checkout")
# policy-002 has no version or effective_date — Violations expected

ontology = (
    OntologyGenerator(base_uri="https://zerotrust.corp/ontology/", min_occurrences=1)
    .generate_from_graph(graph.to_dict(), name="ZeroTrustOntology")
)

shacl_gen   = SHACLGenerator(base_uri="https://zerotrust.corp/shapes/", severity="Violation")
shacl_graph = shacl_gen.generate(ontology)

BASE = "https://zerotrust.corp/ontology/"
for ns in shacl_graph.node_shapes:
    if "Policy" in ns.target_class:
        ns.property_shapes += [
            PropertyShape(
                path=f"{BASE}version",
                min_count=1,
                pattern=r"^\d+\.\d+\.\d+$",   # semver
                severity="Violation",
            ),
            PropertyShape(
                path=f"{BASE}effective_date",
                min_count=1,
                datatype="http://www.w3.org/2001/XMLSchema#date",
                severity="Violation",
            ),
        ]

shacl_ttl = shacl_gen.serialize(shacl_graph, format="turtle")

# Prepare RDF data string
data_ttl = """
@prefix ex: <https://zerotrust.corp/ontology/> .

<http://example.org/policy-001> a ex:Policy ;
    ex:version "1.0.0" ;
    ex:effective_date "2025-01-01"^^<http://www.w3.org/2001/XMLSchema#date> .

<http://example.org/policy-002> a ex:Policy .
"""

report = run_shacl_validation(data_ttl, shacl_ttl)
print(f"Policy graph conforms: {report.conforms}")
# Policy graph conforms: False

for v in report.violations:
    print(f"  VIOLATION: {v.focus_node}  —  {v.result_path}  —  {v.message}")
# VIOLATION: ...policy-002 — ...version       — Less than 1 values on ...version
# VIOLATION: ...policy-002 — ...effective_date — Less than 1 values on ...effective_date
```

</Tab>

<Tab title="生命科学 — 临床/制药">

某临床信息学团队在将试验本体节点加载到试验注册表系统之前对其进行验证。每个 `ClinicalTrial` 节点必须声明 `phase`（Phase I–IV 之一）、`primary_endpoint` 和 `principal_investigator`。缺少其中任何一项都会阻止注册表提交。

```python
from semantica.ontology import LLMOntologyGenerator, SHACLGenerator, PropertyShape
from semantica.ontology import run_shacl_validation
from semantica.export import export_rdf
import tempfile, os

llm_gen  = LLMOntologyGenerator(provider="openai", model="gpt-4o")
ontology = llm_gen.generate_ontology_from_text(
    """
    A phase II oncology trial studies the efficacy of Compound XR-401 in NSCLC patients.
    The trial is led by Principal Investigator Dr. Sarah Chen at Memorial Sloan Kettering.
    Primary endpoint: overall response rate at 24 weeks.
    Secondary endpoint: progression-free survival.
    """
)

shacl_gen   = SHACLGenerator(base_uri="https://purl.obolibrary.org/obo/TRIAL_shapes/")
shacl_graph = shacl_gen.generate(ontology)

TRIAL = "https://purl.obolibrary.org/obo/TRIAL_"
for ns in shacl_graph.node_shapes:
    if "ClinicalTrial" in ns.target_class or "Trial" in ns.target_class:
        ns.property_shapes += [
            PropertyShape(
                path=f"{TRIAL}phase",
                min_count=1,
                in_values=["Phase I", "Phase II", "Phase III", "Phase IV"],
                severity="Violation",
            ),
            PropertyShape(
                path=f"{TRIAL}primary_endpoint",
                min_count=1,
                severity="Violation",
            ),
            PropertyShape(
                path=f"{TRIAL}principal_investigator",
                min_count=1,
                severity="Warning",
            ),
        ]

shacl_ttl = shacl_gen.serialize(shacl_graph, format="turtle")
print(f"SHACL shapes generated — {len(shacl_graph.node_shapes)} node shapes")
# SHACL shapes generated — 5 node shapes

# Validate trial data
# Serialize the ontology as data to validate against the shapes
tmp = tempfile.NamedTemporaryFile(suffix=".ttl", delete=False)
tmp.close()
export_rdf(ontology, tmp.name, format="turtle")
with open(tmp.name) as f:
    data_ttl = f.read()
os.unlink(tmp.name)

report = run_shacl_validation(data_ttl, shacl_ttl)
print(f"Trial data conforms: {report.conforms}")
print(f"Warnings           : {report.warning_count}")
```

</Tab>

<Tab title="银行 — 风险/合规">

某信用风险团队在贷款申请进入信用模型之前，依据 Basel III CRE20 的必填字段（`ltv`、`pd`、`lgd`、`asset_class`）验证每个 `LoanApplication` 节点。任何缺失字段都属于 Violation，会拒绝该记录。

```python
from semantica.context import ContextGraph
from semantica.ontology import OntologyGenerator, SHACLGenerator, PropertyShape
from semantica.ontology import run_shacl_validation

graph = ContextGraph()
graph.add_node("loan-001", "LoanApplication", "Prime mortgage APP-2025-88421",
               ltv=0.78, pd=0.023, lgd=0.45, asset_class="CRE")
graph.add_node("loan-002", "LoanApplication", "SME working capital facility",
               ltv=0.65)
# loan-002 is missing pd, lgd, asset_class — three Violations expected

ontology = (
    OntologyGenerator(base_uri="https://basel.eba.eu/ontology/", min_occurrences=1)
    .generate_from_graph(graph.to_dict(), name="BaselRiskOntology")
)

shacl_gen   = SHACLGenerator(base_uri="https://basel.eba.eu/shapes/", severity="Violation")
shacl_graph = shacl_gen.generate(ontology)

BASE = "https://basel.eba.eu/ontology/"
for ns in shacl_graph.node_shapes:
    if "LoanApplication" in ns.target_class:
        for field in ["ltv", "pd", "lgd", "asset_class"]:
            ns.property_shapes.append(
                PropertyShape(
                    path=f"{BASE}{field}",
                    min_count=1,
                    severity="Violation",
                )
            )

shacl_ttl = shacl_gen.serialize(shacl_graph, format="turtle")

# Prepare RDF data string
data_ttl = """
@prefix ex: <https://basel.eba.eu/ontology/> .

<http://example.org/loan-001> a ex:LoanApplication ;
    ex:ltv "0.78" ;
    ex:pd "0.023" ;
    ex:lgd "0.45" ;
    ex:asset_class "CRE" .

<http://example.org/loan-002> a ex:LoanApplication ;
    ex:ltv "0.65" .
"""

report = run_shacl_validation(data_ttl, shacl_ttl)
print(f"Loan portfolio conforms: {report.conforms}")
# Loan portfolio conforms: False

print(f"Violations             : {report.violation_count}")
# Violations             : 3

for v in report.violations:
    print(f"  [{v.severity}]  {v.focus_node.split('/')[-1]}  —  {v.result_path.split('/')[-1]}")
# [Violation]  loan-002 — pd
# [Violation]  loan-002 — lgd
# [Violation]  loan-002 — asset_class

# Export violation report for regulatory audit trail
report_dict = report.to_dict()
```

</Tab>

</Tabs>

## 资源限制

Explorer 中的实时 SHACL 验证会强制执行四项资源限制，均可通过环境变量配置。当触及某项限制时，错误消息会指出控制该限制的变量。

| 环境变量 | 默认值 | 约束内容 |
| --- | --- | --- |
| `SEMANTICA_MAX_SHACL_TURTLE_BYTES` | `262144` (256 KB) | 提交的 SHACL Turtle 大小 |
| `SEMANTICA_MAX_SHACL_TRIPLES` | `1000` | 解析后的形状图三元组数量 |
| `SEMANTICA_MAX_SHACL_TIMEOUT` | `15.0` | 验证超时时间（秒） |
| `SEMANTICA_MAX_SHACL_CONCURRENCY` | `4` | 每进程并发验证数 |

前三项在超出时会在验证错误消息中显示；并发限制以信号量方式生效，且不会出现在响应中。

## 将 SHACL 验证用作 CI/CD 门禁

将此函数作为发布前门禁调用；退出码 1 会阻断流水线。

```python
import sys
from semantica.ontology import OntologyGenerator, SHACLGenerator
from semantica.ontology import run_shacl_validation

def validate_before_publish(data_graph_str: str, ontology: dict) -> None:
    shacl_gen   = SHACLGenerator(base_uri="https://example.org/shapes/")
    shacl_graph = shacl_gen.generate(ontology)
    shacl_ttl   = shacl_gen.serialize(shacl_graph, format="turtle")

    report = run_shacl_validation(data_graph_str, shacl_ttl)

    if not report.conforms:
        print(f"Graph validation FAILED — {report.violation_count} violation(s)")
        report.explain_violations()
        for v in report.violations:
            print(v.explanation)
        sys.exit(1)

    print(f"Graph validation PASSED ({report.warning_count} warning(s))")
```

---

## 相关指南

- [本体管理](/zh/guides/ontology) — 生成 SHACL 形状所基于的 OWL 本体
- [推理与规则](/zh/guides/reasoning) — 用逻辑推理规则补充 SHACL 结构约束
- [导出与序列化](/zh/guides/export) — 将图数据序列化为 Turtle/RDF/XML，供 `run_shacl_validation` 输入
- [冲突解决](/zh/guides/conflict-resolution) — 在 SHACL 验证前检测并解决数据冲突
- [变更管理](/zh/guides/change-management) — 将 SHACL 形状与本体版本一同进行版本门禁