---
title: "变更管理与版本化"
description: "随着时间推移，对知识图谱和本体进行快照、版本化、差异比较和迁移——通过 SQLite 持久化、校验和验证以及结构化变更日志。"
icon: "clock-rotate-left"
sourceHash: "5d9cb040997db08f03f01ca76c25c2aba3a58ef68709551890516692e64c1708"
---

## 什么是变更管理与版本化？

知识图谱始终在变化。`TemporalVersionManager` 通过在特定时间点捕获完整状态快照，为你的图谱提供可验证的历史记录。它允许你在重要变更前创建命名快照，在任意两个状态之间生成详细差异，通过一次调用回滚到先前版本，并在将数据下游发布前验证 SHA-256 校验和。

## 存储行为

传入 `storage_path`，例如 `TemporalVersionManager(storage_path="versions.db")`，将快照持久化到磁盘上的 SQLite 数据库。省略 `storage_path` 时，默认使用内存存储，脚本结束后即消失。

## 为什么使用变更管理？

变更管理充当你的安全网和审计轨迹。可用于：
- **保障摄取**：在大批量摄取前创建快照，以便数据损坏时立即回滚。
- **审计轨迹**：维护可验证日志，记录变更发生时间、授权人以及具体修改了哪些节点/边。
- **发布门禁**：比较预发布和生产图谱，并在批准发布前验证校验和。

## 我需要哪个工具？

Semantica 提供多种跟踪功能。选择正确的功能至关重要：
- **变更管理**（本指南）：用于**全图快照**、状态差异和完整回滚。
- **溯源**：用于细粒度的**来源与血缘跟踪**。它回答*“这个节点具体来自哪份文档？”*
- **Agent Memory**：用于**对话与上下文状态**。它回答*“AI 智能体在此会话中做出了哪些决策？”*

## 何时使用 / 何时不使用

- **何时使用**：你有重要检查点（例如每日数据源、合作方数据合并或监管提交），需要冻结图谱的完整状态并可能回滚。
- **何时不使用**：你有一个包含数百万节点的大型图谱，并希望跟踪每一次细微编辑。由于 `TemporalVersionManager` 会对整个图谱字典创建快照，过于频繁地对大型图谱创建快照会导致严重的存储膨胀。此时应改用溯源进行细粒度跟踪。

<Info>
  `TemporalVersionManager` 可直接与 `AgentContext.flush_checkpoint()` 集成——智能体检查点与手动快照共享相同的存储格式，因此可以跨自动化和手动工作流进行差异比较。
</Info>

---

## 典型工作流

标准变更管理周期按以下顺序进行：

1. **快照**：捕获基线图谱状态。
2. **修改**：运行摄取、变更或分析。
3. **比较**：生成差异以查看变更内容。
4. **验证**：检查 SHA-256 哈希以确保数据完整性。
5. **标记**：应用人类可读的标签（例如 `approved`）。
6. **回滚**：如果修改有误，则还原图谱状态。

---

## 通用示例：员工档案更新

让我们看一个普遍易懂的示例：跟踪员工的部门调动。

```python
from semantica.change_management import TemporalVersionManager
from semantica.context import ContextGraph

# 1. Setup Graph and Version Manager
graph = ContextGraph()
graph.add_node("emp-101", "Employee", "Alice")
graph.add_node("dept-hr", "Department", "Human Resources")
graph.add_edge("emp-101", "dept-hr", "works_in")

# SQLite persistence is enabled because we provided a storage_path
vm = TemporalVersionManager(storage_path="hr_versions.db")

# 2. Snapshot the baseline
snap_v1 = vm.create_snapshot(
    graph         = graph.to_dict(),
    version_label = "v1_baseline",
    author        = "hr_system@example.com",
    description   = "Initial employee graph",
)

# 3. Modify the graph (Transfer Alice to Engineering)
graph.add_node("dept-eng", "Department", "Engineering")
graph.add_edge("emp-101", "dept-eng", "works_in")

# 4. Snapshot the post-change state
snap_v2 = vm.create_snapshot(
    graph         = graph.to_dict(),
    version_label = "v2_transfer",
    author        = "hr_admin@example.com",
    description   = "Alice transferred to Engineering",
)

# 5. Compare versions
diff = vm.compare_versions("v1_baseline", "v2_transfer")
print("Nodes added:", diff["summary"]["nodes_added"])  # 1 (Engineering)
print("Edges added:", diff["summary"]["edges_added"])  # 1 (works_in Eng)
```

现在，让我们使用特定领域场景更深入地探索这些能力。

---

## 创建快照

在任何重要变更前创建快照：摄取扫描、合作方数据源合并或自动化数据丰富任务。

```python
from semantica.change_management import TemporalVersionManager
from semantica.context import ContextGraph

graph = ContextGraph()
graph.add_node("apt29",         "ThreatActor",   "APT29 / NOBELIUM")
graph.add_node("cve-2024-3400", "Vulnerability", "CVE-2024-3400 PAN-OS RCE")
graph.add_edge("apt29", "cve-2024-3400", "exploits", weight=0.97)

vm = TemporalVersionManager(storage_path="cti_versions.db")

snap_pre = vm.create_snapshot(
    graph         = graph.to_dict(),
    version_label = "q3_2025_baseline",
    author        = "analyst_zhang@example.com",
    description   = "CTI baseline before Q3 OSINT sweep",
)

print(snap_pre["label"])        # "q3_2025_baseline"
print(snap_pre["checksum"])     # SHA-256 of the serialized graph
print(snap_pre["timestamp"])    # ISO datetime
print(snap_pre["author"])       # "analyst_zhang"
print(len(snap_pre["nodes"]))   # node count at snapshot time
print(len(snap_pre["edges"]))   # edge count at snapshot time
```

运行摄取后，再次创建快照以标记变更后状态：

```python
graph.add_node("cve-2024-21412", "Vulnerability", "CVE-2024-21412 Windows SmartScreen bypass")
graph.add_node("apt40",          "ThreatActor",   "APT40 / BRONZE MOHAWK")
graph.add_edge("apt40", "cve-2024-21412", "exploits", weight=0.88)

snap_post = vm.create_snapshot(
    graph         = graph.to_dict(),
    version_label = "q3_2025_post_nvd_sweep",
    author        = "osint_pipeline@example.com",
    description   = "After NVD weekly sweep — 2025-07-14",
)
```

## 比较两个快照

`compare_versions` 会返回任意两个命名快照之间的精确差异——新增、删除或修改的节点和边。

```python
diff = vm.compare_versions("q3_2025_baseline", "q3_2025_post_nvd_sweep")

s = diff["summary"]
print("Nodes added   :", s["nodes_added"])    # 2
print("Nodes removed :", s["nodes_removed"])  # 0
print("Edges added   :", s["edges_added"])    # 1

for node in diff["nodes_added"]:
    print(" +", node.get("id"), "/", node.get("content"))

for edge in diff["edges_added"]:
    print(" +", edge.get("source"), "→", edge.get("target"), "[" + edge.get("type", "") + "]")
```

你也可以直接传入快照字典，而不是标签：

```python
diff = vm.compare_versions(snap_pre, snap_post)
```

## 验证完整性

在将快照发布到下游系统——SIEM、合作方数据源、监管提交——之前，验证 SHA-256 校验和，以确认快照写入后未被修改。

```python
snap = vm.get_version("q3_2025_post_nvd_sweep")

if not vm.verify_checksum(snap):
    raise RuntimeError("Checksum mismatch on q3_2025_post_nvd_sweep — aborting publish.")

print("Integrity verified — safe to publish.")
```

## 回滚

传入目标标签和 `require_confirmation=False`（一个显式安全门），将图谱恢复到任意先前快照。

```python
vm.restore_snapshot(
    graph                = graph,
    target_version       = "q3_2025_baseline",
    require_confirmation = False,
)

# Record the rollback event as a new snapshot
vm.create_snapshot(
    graph         = graph.to_dict(),
    version_label = "q3_2025_rollback",
    author        = "analyst_zhang@example.com",
    description   = "Rolled back to baseline after corrupted OSINT batch",
)
```

<Info>
  如果 `require_confirmation` 未显式设置为 `False`，`restore_snapshot` 会抛出 `ProcessingError`，以防止自动化脚本意外回滚。
</Info>

## 构建审计变更日志

按时间顺序列出所有快照，并将每个快照与其前一个快照进行差异比较，以生成人类可读的变更日志。

```python
versions = sorted(vm.list_versions(), key=lambda v: v["timestamp"])

print("Graph Change Log")
print("=" * 60)

for i, v in enumerate(versions):
    print("\n[{}] {}  (by {})".format(v["timestamp"][:10], v["label"], v["author"]))
    print("  " + v["description"])

    if i > 0:
        diff = vm.compare_versions(versions[i - 1]["label"], v["label"])
        s    = diff["summary"]
        print("  Changes: +{} nodes  -{} nodes  +{} edges  -{} edges".format(
            s["nodes_added"], s["nodes_removed"],
            s["edges_added"], s["edges_removed"],
        ))
```

示例输出：

```text
Graph Change Log
============================================================

[2025-07-01] q3_2025_baseline  (by analyst_zhang@example.com)
  CTI baseline before Q3 OSINT sweep

[2025-07-14] q3_2025_post_nvd_sweep  (by osint_pipeline@example.com)
  After NVD weekly sweep — 2025-07-14
  Changes: +2 nodes  -0 nodes  +1 edges  -0 edges

[2025-07-14] q3_2025_rollback  (by analyst_zhang@example.com)
  Rolled back to baseline after corrupted OSINT batch
  Changes: -2 nodes  +0 nodes  -1 edges  +0 edges
```

## 标记里程碑

为任意快照附加命名标签，以标记评审门、已批准状态或监管提交。

```python
vm.tag_version("q3_2025_post_nvd_sweep", "q3-approved")

for tag_name, version_label in vm.list_tags().items():
    print(f"{tag_name:20s} → {version_label}")
# q3-approved          → q3_2025_post_nvd_sweep
```

## 节点历史

将 `TemporalVersionManager` 附加到实时 `ContextGraph`，可自动记录每一次单独的变更——每次 `add_node`、`add_edge` 和更新调用——而不仅是快照级差异。

```python
vm.attach_to_graph(graph)

graph.add_node("apt29-alias", "ThreatActor", "NOBELIUM (rebranding 2021)")
graph.add_edge("apt29", "apt29-alias", "alias_of", weight=1.0)

for record in vm.get_node_history("apt29"):
    print("[{}] {} on {}  payload={}".format(
        record["timestamp"], record["operation"], record["entity_id"],
        str(record["payload"])[:60],
    ))
```

## AgentContext 集成

在构造 `AgentContext` 时传入版本管理器。智能体检查点与手动快照共享同一存储，从而提供统一的历史记录。

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore
from semantica.change_management import TemporalVersionManager

graph = ContextGraph()
vm    = TemporalVersionManager(storage_path="agent_versions.db")

context = AgentContext(
    vector_store             = VectorStore(backend="faiss", dimension=768),
    knowledge_graph          = graph,
    temporal_version_manager = vm,
)

context.store("APT29 targeting NATO infrastructure in Q3 2025")
context.checkpoint("pre_analysis")

# ... agent reasoning loop ...

context.checkpoint("post_analysis")
context.flush_checkpoint("post_analysis")   # persists via vm

diff = context.diff_checkpoints("pre_analysis", "post_analysis")
print("Decisions added    :", len(diff["decisions_added"]))
print("Relationships added:", len(diff["relationships_added"]))
```

---

## 常见陷阱

- **过于频繁地对大型图谱创建快照**：`TemporalVersionManager` 会对整个图谱结构创建快照。对大型图谱的每一次细微编辑都这样做，会导致严重的存储膨胀。应将其用于里程碑门禁，而不是事件溯源。
- **在变更跟踪前忘记调用 `attach_to_graph`**：如果要使用 `get_node_history()`，必须在任何变更发生*之前*调用 `vm.attach_to_graph(graph)`。否则，事件将不会被捕获。
- **混淆溯源与版本化**：不要用版本快照来回答“这个特定节点的数据来自哪里？”。这是溯源模块的职责。版本化跟踪的是某一时间点*整个*图谱的状态。
- **忘记回滚确认要求**：在自动化脚本中调用 `restore_snapshot` 会抛出 `ProcessingError` 并使管道崩溃，除非你显式传入 `require_confirmation=False`。
- **过度快照导致存储增长**：如果你从不清理旧快照或进行不必要的快照，SQLite 数据库会随时间变得很大。

---

## 领域示例

<Tabs>
  <Tab title="国防 — CTI 流水线">
    每日摄取 NVD 和 ISAC 数据源，在前后创建快照，生成 SOC 变更公告，并在发布到 SIEM 前执行完整性门禁。

```python
from semantica.change_management import TemporalVersionManager
from semantica.context import ContextGraph
import datetime

graph = ContextGraph()
vm    = TemporalVersionManager(storage_path="cti_versions.db")
today = datetime.date.today().isoformat()

snap_pre = vm.create_snapshot(
    graph         = graph.to_dict(),
    version_label = f"pre_nvd_{today}",
    author        = "osint_pipeline@example.com",
    description   = "CTI baseline before NVD sweep",
)

# Ingestion
graph.add_node("cve-2025-1337",    "Vulnerability", "CVE-2025-1337 critical RCE")
graph.add_node("apt29-q3-cluster", "ThreatActor",   "APT29 Q3 2025 campaign cluster")
graph.add_edge("apt29-q3-cluster", "cve-2025-1337", "weaponizes", weight=0.91)

snap_post = vm.create_snapshot(
    graph         = graph.to_dict(),
    version_label = f"post_nvd_{today}",
    author        = "osint_pipeline@example.com",
    description   = "After NVD sweep",
)

diff = vm.compare_versions(snap_pre["label"], snap_post["label"])
s    = diff["summary"]
print(f"SOC Bulletin: +{s['nodes_added']} threat nodes, +{s['edges_added']} relationships")
for n in diff["nodes_added"]:
    print(f"  + [{n.get('type')}] {n.get('content')}")

if not vm.verify_checksum(snap_post):
    raise RuntimeError("Checksum mismatch — aborting SIEM publish")
print("Snapshot verified — publishing to SIEM feed.")
```

  </Tab>

  <Tab title="安全 — 事件响应">
    在实时 IR 处置期间，每次重大发现时对事件图谱创建快照，以便事后复盘能够准确重放调查的演变过程。

```python
from semantica.change_management import TemporalVersionManager
from semantica.context import ContextGraph

graph = ContextGraph()
vm    = TemporalVersionManager(storage_path="incident_ir042.db")

# T+0: Initial triage
graph.add_node("wkstn-047",   "Host",    "Compromised workstation WKSTN-047")
graph.add_node("attacker-ip", "Network", "Attacker ingress 185.220.101.47")
graph.add_edge("attacker-ip", "wkstn-047", "initial_access", weight=0.95)

vm.create_snapshot(
    graph         = graph.to_dict(),
    version_label = "ir042_t0_triage",
    author        = "analyst_chen@example.com",
    description   = "T+0 — one compromised host identified",
)

# T+2h: Lateral movement confirmed
graph.add_node("dc01",       "Host",    "Domain controller DC01")
graph.add_node("svc-backup", "Account", "Stolen service account SVC-BACKUP")
graph.add_edge("wkstn-047",  "svc-backup", "credential_theft", weight=0.88)
graph.add_edge("svc-backup", "dc01",       "lateral_move",     weight=0.82)

vm.create_snapshot(
    graph         = graph.to_dict(),
    version_label = "ir042_t2h_lateral",
    author        = "analyst_chen@example.com",
    description   = "T+2h — lateral movement to DC01 via stolen SVC-BACKUP",
)

diff = vm.compare_versions("ir042_t0_triage", "ir042_t2h_lateral")
s    = diff["summary"]
print(f"Post-mortem T+0→T+2h: +{s['nodes_added']} hosts/accounts, +{s['edges_added']} attack paths")
for edge in diff["edges_added"]:
    print(f"  + {edge.get('source')} → {edge.get('target')} [{edge.get('type')}]")
```

  </Tab>

  <Tab title="生命科学 — 临床试验">
    对跨阶段的试验知识图谱进行版本化，以生成 II 期与 III 期提交之间可由机器验证的差异，供监管审查。

```python
from semantica.change_management import TemporalVersionManager
from semantica.context import ContextGraph

graph_ph2 = ContextGraph()
graph_ph2.add_node("compound-xr401", "Compound", "XR-401")
graph_ph2.add_node("endpoint-orr",   "Endpoint", "Overall Response Rate")
graph_ph2.add_node("disease-nsclc",  "Disease",  "NSCLC")

graph_ph3 = ContextGraph()
graph_ph3.add_node("compound-xr401",  "Compound",   "XR-401")
graph_ph3.add_node("endpoint-orr",    "Endpoint",   "Overall Response Rate")
graph_ph3.add_node("endpoint-pfs",    "Endpoint",   "Progression-Free Survival")
graph_ph3.add_node("disease-nsclc",   "Disease",    "NSCLC")
graph_ph3.add_node("comparator-doce", "Comparator", "Docetaxel")

vm = TemporalVersionManager(storage_path="trial_xr401.db")

vm.create_snapshot(
    graph=graph_ph2.to_dict(), version_label="phase_ii_v1.0",
    author="clinical_data_team@example.com", description="Phase II — ORR primary, NSCLC",
)
vm.create_snapshot(
    graph=graph_ph3.to_dict(), version_label="phase_iii_v2.0",
    author="clinical_data_team@example.com", description="Phase III — PFS co-primary, Docetaxel added",
)

diff = vm.compare_versions("phase_ii_v1.0", "phase_iii_v2.0")
print("Regulatory diff Phase II → Phase III:")
for n in diff["nodes_added"]:
    print(f"  + [{n.get('type')}] {n.get('content')}")

snap = vm.get_version("phase_iii_v2.0")
assert vm.verify_checksum(snap), "Checksum failed — cannot attach to dossier"
print("Phase III snapshot verified — safe for regulatory submission.")
```

  </Tab>

  <Tab title="银行 — 模型治理">
    在每次监管更新时对 Basel III 信用风险模型图谱进行版本化，并在生产部署前为模型治理委员会生成可由机器验证的差异。

```python
from semantica.change_management import TemporalVersionManager
from semantica.context import ContextGraph

graph = ContextGraph()
graph.add_node("metric-cet1",      "CapitalMetric", "CET1 Capital Ratio")
graph.add_node("metric-ltv",       "RiskParameter", "LTV Ratio")
graph.add_node("metric-pd",        "RiskParameter", "Probability of Default")
graph.add_node("metric-lgd",       "RiskParameter", "Loss Given Default")
graph.add_node("regulation-cre20", "Regulation",    "Basel III CRE20")

vm = TemporalVersionManager(storage_path="credit_risk_versions.db")

vm.create_snapshot(
    graph=graph.to_dict(), version_label="basel_v1.0",
    author="risk_model_team@example.com", description="Basel III CRE20 initial graph",
)

# Regulatory update — DSCR becomes mandatory
graph.add_node("metric-dscr", "RiskParameter", "Debt Service Coverage Ratio")
graph.add_edge("regulation-cre20", "metric-dscr", "requires", weight=1.0)

vm.create_snapshot(
    graph=graph.to_dict(), version_label="basel_v1.1",
    author="risk_model_team@example.com", description="DSCR added per EBA GL 2020/06",
)

diff = vm.compare_versions("basel_v1.0", "basel_v1.1")
s    = diff["summary"]
print(f"Model governance diff v1.0→v1.1: +{s['nodes_added']} params, +{s['edges_added']} rules")
for n in diff["nodes_added"]:
    print(f"  + [{n.get('type')}] {n.get('content')}")

snap = vm.get_version("basel_v1.1")
assert vm.verify_checksum(snap), "Checksum failed — aborting model deployment"
print("Model v1.1 verified and approved for production.")
```

  </Tab>
</Tabs>

## 相关指南

- [上下文图](/zh/guides/context-graphs) — `ContextGraph.to_dict()` 为 `create_snapshot()` 提供输入
- [本体管理](/zh/guides/ontology) — 将本体版本化与图谱版本化结合，形成完整的模式 + 数据审计轨迹
- [SHACL 验证](/zh/guides/shacl-validation) — 在每个版本门禁处验证图数据，然后再创建快照
- [溯源](/zh/guides/provenance) — 将变更管理与 W3C PROV-O 血缘结合，形成完整审计轨迹
- [可视化](/zh/guides/visualization) — `TemporalVisualizer.visualize_snapshot_comparison()` 和 `visualize_metrics_evolution()` 将版本差异渲染为交互式图表