---
title: "可视化"
description: "将知识图谱、本体层级、嵌入投影、图分析和时间线渲染为交互式 HTML 或静态图像文件。"
icon: "chart-network"
sourceHash: "d2e8712c52977fd7d2c731ff3312c791561788de48dd79279de0a3919a45eacf"
---

`KGVisualizer`、`AnalyticsVisualizer`、`TemporalVisualizer` 和 `OntologyVisualizer` 只需一次方法调用，就能把图字典、分析结果和本体转换为交互式 HTML 仪表盘或静态图像。用它们向利益相关者展示中心性排名、社区聚类、事件时间线和快照前后差异，无需编写任何渲染代码。

## 什么是可视化？

可视化将图数据转换为交互式图表、网络图、时间线以及其他人类可解读的视觉形式。它把抽象的图结构和分析结果转化为可视化表示，从而揭示模式、关系和洞察。

**可视化与分析的区别：**分析计算中心性分数和社区归属等数值度量。可视化将这些度量渲染为按重要性调整大小、按社区分组的彩色节点。

**可视化与推理的区别：**推理从现有数据中推导新的逻辑事实。可视化则以视觉形式呈现已有事实和分析结果，以支持人工解读与决策。

可视化帮助人们理解仅凭原始数据难以解读的图结构、分析结果和时间模式。

## 为什么使用可视化？

**可视化探索：**交互式图支持平移、缩放、悬停和筛选，可用于探索以文本或表格形式呈现会显得过于庞杂的大型网络。

**调查支持：**高亮实体之间的路径、按实体类型着色、按重要性调整节点大小，有助于分析人员识别模式并聚焦调查方向。

**沟通表达：**可视化呈现能让不直接处理数据的利益相关者理解复杂的图关系。

**报告输出：**静态可视化可为书面报告、演示文稿和监管提交提供证据与支撑。

## 适用与不适用场景

**可视化适用于：**
- 向人类呈现图结构和分析结果
- 探索中等规模图（10-1000 个节点）中的关系和模式
- 为利益相关者创建报告和演示
- 调查图中特定路径或邻域
- 传达分析或推理工作流的发现

**图遍历可能已经足够：**
- 以编程方式探索关系
- 针对特定路径或连接的简单查询
- 无需人工解读的自动化工作流

**分析可能更有用：**
- 计算数值度量和排名
- 以编程方式发现社区或中心性分数
- 无需可视化的定量比较

**推理可能更有用：**
- 通过逻辑推断推导新事实
- 基于规则的决策
- 自动化策略执行

**可视化在以下情况下不切实际：**
- 图超过约 1000 个节点（浏览器性能下降）
- 网络过于稠密，难以用视觉解读
- 你需要程序化分析而非人工解读

## 典型可视化工作流

**图 → 筛选 → 可视化 → 解读 → 调查**

最有效的可视化遵循以下模式：
1. **从知识图谱开始** —— 来自 `ContextGraph` 或分析结果
2. **筛选出有意义的子图** —— 避免可视化整个企业级图
3. **选择合适的可视化方式** —— 网络图、时间线、热力图或排名图
4. **解读视觉模式** —— 聚类、中心节点、时间趋势
5. **调查有趣的发现** —— 深入查看异常模式或离群点

务必先筛选再可视化。一个 10,000 节点的企业图，筛选出最中心的 50 个节点或围绕某个关注实体的子图后，才具有意义。

<Info>
  **性能警告：**大图（>1000 个节点）会导致浏览器性能问题，且视觉上难以承受。交互式网络可视化在 10-1000 个节点时效果最佳。对于更大的图，先用分析找出最重要的子图，再可视化筛选后的结果。
</Info>

<Info>
  所有可视化器都接受 `output="interactive"`（Plotly/pyvis HTML，可在 Jupyter 中显示或保存为文件）或 `output="static"`（通过 Matplotlib 生成 PNG/SVG）。省略 `file_path` 可返回图形对象以便进一步操作。
</Info>

## 渲染完整知识图谱

首先呈现给利益相关者的应是完整网络 —— 节点按实体类型着色、按度中心性调整大小，悬停时显示内容提示。

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore
from semantica.visualization import KGVisualizer

graph = ContextGraph(advanced_analytics=True)
ctx   = AgentContext(
    vector_store=VectorStore(backend="faiss", dimension=768),
    knowledge_graph=graph,
    graph_expansion=True,
)
ctx.store([
    "APT29 exploited CVE-2024-3400 targeting NATO defense contractors.",
    "CVE-2024-3400 is a critical vulnerability in PAN-OS by Palo Alto Networks.",
    "HAMMERTOSS is APT29's C2 backdoor operating over Twitter and GitHub.",
    "APT29 conducted the SUNBURST supply chain attack against SolarWinds in 2020.",
], extract_entities=True, extract_relationships=True)

viz = KGVisualizer()

# Interactive network — saved to HTML, opens in any browser
viz.visualize_network(
    graph         = graph.to_dict(),
    output        = "interactive",
    file_path     = "reports/threat_graph.html",
    node_color_by = "type",      # colour each node by its entity type
    node_size_by  = "degree",    # larger nodes = more connections
    hover_data    = ["type", "content"],
)
```

生成的 HTML 完全自包含 —— 无需服务器。作为文件附件分享，即可在任何浏览器中渲染，支持平移、缩放和悬停。

如需用于 PDF 报告或幻灯片的静态 PNG：

```python
viz.visualize_network(
    graph     = graph.to_dict(),
    output    = "static",
    file_path = "reports/threat_graph.png",
    node_color_by = "type",
)
```

要突出图中特定的归因路径 —— 例如从 APT29 经 SUNBURST 到 SolarWinds 的链条 —— 将节点 ID 作为 `highlight_path` 传入：

```python
viz.visualize_network(
    graph          = graph.to_dict(),
    output         = "static",
    file_path      = "reports/apt29_path.png",
    highlight_path = ["APT29", "SUNBURST", "SolarWinds"],
)
```

## 展示社区结构

社区检测之后，你会得到一个将社区标签映射到节点 ID 列表的字典。`KGVisualizer` 上的 `visualize_communities` 会将这些聚类叠加到网络上；`AnalyticsVisualizer.visualize_community_structure` 则转发到同一个社区图视图。

```python
from semantica.visualization import AnalyticsVisualizer

# The community dict you get from graph analytics
communities = {
    "node_assignments": {
        "apt29": 0,
        "hammertoss": 0,
        "nobelium": 0,
        "sunburst": 0,
        "cve-2024-3400": 1,
        "pan-os": 1,
        "globalprotect": 1,
        "solarwinds": 2,
        "orion-platform": 2,
        "cve-2020-10148": 2,
    },
    "num_communities": 3,
}

# Network view with community colouring
viz.visualize_communities(
    graph       = graph.to_dict(),
    communities = communities,
    output      = "interactive",
    file_path   = "reports/communities_network.html",
)

# Standalone breakdown chart — for a slide on "what are the 12 clusters?"
av = AnalyticsVisualizer()
av.visualize_community_structure(
    graph      = graph.to_dict(),
    communities = communities,
    output     = "interactive",
    file_path  = "reports/communities_breakdown.html",
)
```

## 绘制中心性排名

中心性字典将节点 ID 映射到分数。两次调用即可覆盖两类用例：节点大小反映中心性的网络视图，以及用于“连接最多的前 10 个节点”幻灯片的独立排名条形图。

```python
centrality = {
    "centrality": {
        "apt29": 0.14,
        "cve-2024-3400": 0.11,
        "pan-os": 0.07,
        "hammertoss": 0.06,
        "nobelium": 0.05,
    }
}

# Network coloured and sized by centrality score
viz.visualize_centrality(
    graph          = graph.to_dict(),
    centrality     = centrality,
    centrality_type= "pagerank",
    output         = "interactive",
    file_path      = "reports/centrality_network.html",
)

# Standalone ranked bar chart — most impactful nodes at a glance
av.visualize_centrality_rankings(
    centrality      = centrality,
    centrality_type = "pagerank",
    output          = "interactive",
    file_path       = "reports/centrality_rankings.html",
)
```

## 分析图表：连通性与度分布

运行图分析后，还有两张图表可完善全局视图。连通性图表展示存在多少个非连通分量以及每个分量的规模。度分布展示图的幂律形态 —— 可用于确认图是无标度的（少数高度连接的枢纽节点，大量叶节点）。

```python
# Connectivity — pass the analysis result dict directly
# Keys the visualizer reads: "is_connected", "num_components", "component_sizes"
connectivity = {
    "is_connected":    False,
    "num_components":  3,
    "component_sizes": [42, 8, 2],
}

av.visualize_connectivity(
    connectivity = connectivity,
    output       = "interactive",
    file_path    = "reports/connectivity.html",
)

# Degree distribution — pass the graph dict directly
av.visualize_degree_distribution(
    graph     = graph.to_dict(),
    output    = "interactive",
    file_path = "reports/degree_distribution.html",
)
```

<Info>
  `visualize_connectivity` 接收的是连通性分析结果字典 —— 而非 `graph.to_dict()`。该字典必须包含 `"is_connected"`、`"num_components"` 和 `"component_sizes"`。请从图分析输出中计算得到该结果并传入。
</Info>

## 绘制事件时间线

当你讲述的故事具有时间属性 —— CVE 生命周期、事件时间线、攻击活动推进 —— `TemporalVisualizer.visualize_timeline` 可将一组带时间戳的事件转换为可滚动的交互式图表。

```python
from semantica.visualization import TemporalVisualizer

tv = TemporalVisualizer()

# Events are passed inside a dict under the "events" key
tv.visualize_timeline(
    temporal_data = {"events": [
        {"id": "pub",   "label": "CVE-2024-3400 published",      "timestamp": "2024-03-14T00:00:00"},
        {"id": "exp",   "label": "Zero-day exploitation begins",  "timestamp": "2024-03-26T00:00:00"},
        {"id": "patch", "label": "PAN-OS hotfix released",        "timestamp": "2024-04-14T00:00:00"},
        {"id": "rem",   "label": "Contractor remediation confirmed","timestamp": "2024-04-30T00:00:00"},
    ]},
    output    = "interactive",
    file_path = "reports/cve_timeline.html",
)
```

## 并排比较两个图快照

当问题是“3 月 14 日到 4 月 14 日之间发生了什么变化？”时，`visualize_snapshot_comparison` 接收来自 `TemporalVersionManager` 的两个具名快照，并渲染折线图，比较所提供快照之间的图指标（实体数、关系数、密度）。

```python
from semantica.change_management import TemporalVersionManager

vm    = TemporalVersionManager(storage_path="versions.db")
snap1 = vm.get_version("pre_patch_march_14")
snap2 = vm.get_version("post_patch_april_14")

# Pass snapshots as a dict mapping label → snapshot dict
tv.visualize_snapshot_comparison(
    snapshots = {
        "pre_patch_march_14":   snap1,
        "post_patch_april_14":  snap2,
    },
    output    = "interactive",
    file_path = "reports/snapshot_diff.html",
)
```

## 跟踪图谱随时间的增长

为利益相关方评审准备的最后一类图表是增长曲线 —— 过去一年里图谱累积了多少节点和边？`visualize_metrics_evolution` 接收一个历史 dict 和一个与之对应的 timestamps 列表。

```python
# Build from TemporalVersionManager snapshots
versions = vm.list_versions()
versions.sort(key=lambda v: v["timestamp"])

timestamps      = [v["timestamp"][:10] for v in versions]
metrics_history = {
    "node_count": [len(v.get("nodes", [])) for v in versions],
    "edge_count": [len(v.get("edges", [])) for v in versions],
}

tv.visualize_metrics_evolution(
    metrics_history = metrics_history,
    timestamps      = timestamps,
    output          = "interactive",
    file_path       = "reports/graph_growth.html",
)
```

也可以直接用已知的季度里程碑填充历史 dict：

```python
tv.visualize_metrics_evolution(
    metrics_history = {
        "node_count": [50, 142, 309, 481],
        "edge_count": [88, 387, 821, 1340],
    },
    timestamps = ["2025-01-01", "2025-04-01", "2025-07-01", "2025-10-01"],
    output     = "interactive",
    file_path  = "reports/graph_growth.html",
)
```

## 领域示例

<Tabs>

<Tab title="国防 — CTI/威胁">

一份完整的分析简报包：交互式威胁网络、社区划分、CVE 时间线和图谱增长曲线 —— 全部在早晨站会之前从实时 CTI 图谱生成。

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore
from semantica.visualization import KGVisualizer, AnalyticsVisualizer, TemporalVisualizer
import os

graph = ContextGraph(advanced_analytics=True)
ctx   = AgentContext(
    vector_store=VectorStore(backend="faiss", dimension=768),
    knowledge_graph=graph,
    graph_expansion=True,
)
ctx.store([
    "APT29 used HAMMERTOSS for C2 via Twitter and GitHub in 2020.",
    "APT29 infrastructure cluster: 185.220.101.0/24, AS200651.",
    "SolarWinds supply chain compromise attributed to APT29, campaign SUNBURST.",
    "APT29 leveraged OAuth token theft against cloud workloads in 2023.",
], extract_entities=True, extract_relationships=True)

os.makedirs("reports", exist_ok=True)

kg_viz = KGVisualizer()

# Full network — interactive for the analyst portal
kg_viz.visualize_network(
    graph         = graph.to_dict(),
    output        = "interactive",
    file_path     = "reports/cti_network.html",
    node_color_by = "type",
    node_size_by  = "degree",
    hover_data    = ["type", "content"],
)

# Attribution path PNG for the slide deck
kg_viz.visualize_network(
    graph          = graph.to_dict(),
    output         = "static",
    file_path      = "reports/apt29_sunburst_path.png",
    highlight_path = ["APT29", "SUNBURST", "SolarWinds"],
)

# Connectivity overview
av = AnalyticsVisualizer()
av.visualize_connectivity(
    connectivity = {"is_connected": True, "num_components": 1, "component_sizes": [24]},
    output       = "interactive",
    file_path    = "reports/connectivity.html",
)

# CVE-2024-3400 incident timeline
tv = TemporalVisualizer()
tv.visualize_timeline(
    temporal_data = {"events": [
        {"id": "pub",   "label": "CVE-2024-3400 published",     "timestamp": "2024-03-14"},
        {"id": "exp",   "label": "Zero-day exploitation",        "timestamp": "2024-03-26"},
        {"id": "patch", "label": "PAN-OS hotfix released",       "timestamp": "2024-04-14"},
        {"id": "rem",   "label": "Remediation confirmed",        "timestamp": "2024-04-30"},
    ]},
    output    = "interactive",
    file_path = "reports/cve_timeline.html",
)
```

</Tab>

<Tab title="安全 — SOC/事件">

在事件处置过程中，SOC 会生成一张标出攻击路径的横向移动网络、一份用于识别哪些主机最关键的中心性排名，以及一个展示"谁连接了什么"的关系矩阵。

```python
from semantica.context import ContextGraph
from semantica.visualization import KGVisualizer, AnalyticsVisualizer

graph = ContextGraph(advanced_analytics=True)

for node_id, ntype, content in [
    ("wkstn-047",  "Host",   "Compromised workstation WKSTN-047"),
    ("dc01",       "Host",   "Domain controller DC01"),
    ("jsmith",     "User",   "Compromised user jsmith"),
    ("psexec",     "Tool",   "PsExec lateral movement tool"),
    ("t1021",      "MITRE",  "T1021.002 SMB/Admin Shares"),
]:
    graph.add_node(node_id, ntype, content)

graph.add_edge("wkstn-047", "dc01",    "lateral_movement", weight=1.0)
graph.add_edge("jsmith",    "wkstn-047","session_on",      weight=0.9)
graph.add_edge("psexec",    "wkstn-047","executed_on",     weight=1.0)
graph.add_edge("psexec",    "t1021",   "implements",       weight=0.95)

viz = KGVisualizer()

# Incident network with lateral movement path highlighted
viz.visualize_network(
    graph          = graph.to_dict(),
    output         = "interactive",
    file_path      = "soc/incident_graph.html",
    node_color_by  = "type",
    highlight_path = ["wkstn-047", "dc01"],
    hover_data     = ["type", "content"],
)

# Relationship matrix — who connects to what
viz.visualize_relationship_matrix(
    graph     = graph.to_dict(),
    output    = "interactive",
    file_path = "soc/rel_matrix.html",
)

# Centrality rankings — which host is most pivotal?
av = AnalyticsVisualizer()
av.visualize_centrality_rankings(
    centrality      = {"wkstn-047": 0.35, "dc01": 0.28, "psexec": 0.22, "jsmith": 0.15},
    centrality_type = "degree",
    output          = "interactive",
    file_path       = "soc/centrality.html",
)
```

</Tab>

<Tab title="生命科学 — 临床/制药">

一次药物重定位探索：交互式药物-靶点-疾病网络、OWL 类层次结构、UMAP 嵌入投影，以及用于发现结构等价化合物的相似度热力图。

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore
from semantica.visualization import KGVisualizer, EmbeddingVisualizer, OntologyVisualizer
from semantica.ontology import OntologyGenerator
import numpy as np

graph = ContextGraph(advanced_analytics=True)
ctx   = AgentContext(
    vector_store=VectorStore(backend="faiss", dimension=768),
    knowledge_graph=graph,
    graph_expansion=True,
)
ctx.store([
    "Metformin activates AMPK and reduces hepatic glucose production in Type 2 Diabetes.",
    "Dapagliflozin inhibits SGLT2 and reduces cardiovascular mortality in HFrEF.",
    "Semaglutide agonises GLP-1R and reduces HbA1c in obesity and Type 2 Diabetes.",
], extract_entities=True, extract_relationships=True)

kg_viz = KGVisualizer()
kg_viz.visualize_network(
    graph         = graph.to_dict(),
    output        = "interactive",
    file_path     = "drug_kg.html",
    node_color_by = "type",
    node_size_by  = "degree",
)

# OWL class hierarchy
ontology = OntologyGenerator(
    base_uri="https://purl.obolibrary.org/obo/DRUG_",
    min_occurrences=1,
).generate_from_graph(graph.to_dict())

ov = OntologyVisualizer()
ov.visualize_hierarchy(ontology, output="interactive", file_path="drug_hierarchy.html")
ov.visualize_structure(ontology, output="interactive", file_path="drug_ontology.html")

# UMAP projection and similarity heatmap for drug embeddings
embeddings = np.array([[0.1, 0.2, 0.3], [0.15, 0.22, 0.31], [0.8, 0.7, 0.6]])
labels     = ["Metformin", "Dapagliflozin", "Semaglutide"]

ev = EmbeddingVisualizer()
# UMAP (Uniform Manifold Approximation and Projection) reduces high-dimensional 
# embeddings to 2D while preserving local neighborhood structure
ev.visualize_2d_projection(
    embeddings, labels, method="umap",
    output="interactive", file_path="drug_embeddings.html",
)
ev.visualize_similarity_heatmap(
    embeddings, labels,
    output="interactive", file_path="drug_similarity.html",
)
```

</Tab>

<Tab title="银行 — 风险/合规">

用于模型治理的监管知识图谱：实体网络、用于文档化的 OWL 类层次结构，以及跨季度 Basel III 更新的图谱增长曲线 —— 全部输出为静态 PNG，用于模型治理委员会材料。

```python
from semantica.context import ContextGraph
from semantica.change_management import TemporalVersionManager
from semantica.visualization import KGVisualizer, TemporalVisualizer, OntologyVisualizer
from semantica.ontology import OntologyGenerator

graph = ContextGraph(advanced_analytics=True)
vm    = TemporalVersionManager(storage_path="regulatory_versions.db")

for node, ntype, content in [
    ("bcbs-cre20",  "Regulation", "Basel III CRE20 — CRE capital requirements"),
    ("metric-ltv",  "Metric",     "Loan-to-Value Ratio"),
    ("metric-dscr", "Metric",     "Debt Service Coverage Ratio"),
    ("metric-pd",   "Metric",     "Probability of Default"),
    ("metric-lgd",  "Metric",     "Loss Given Default"),
]:
    graph.add_node(node, ntype, content)

graph.add_edge("bcbs-cre20", "metric-ltv",  "requires", weight=1.0)
graph.add_edge("bcbs-cre20", "metric-dscr", "requires", weight=1.0)
graph.add_edge("bcbs-cre20", "metric-pd",   "requires", weight=0.9)
graph.add_edge("bcbs-cre20", "metric-lgd",  "requires", weight=0.9)

kg_viz = KGVisualizer()
kg_viz.visualize_network(
    graph         = graph.to_dict(),
    output        = "static",
    file_path     = "regulatory/regulatory_kg.png",
    node_color_by = "type",
    node_size_by  = "degree",
)

# OWL hierarchy — static PNG for the documentation appendix
ontology = OntologyGenerator(
    base_uri="https://basel.eba.eu/ontology/",
    min_occurrences=1,
).generate_from_graph(graph.to_dict())

ov = OntologyVisualizer()
ov.visualize_hierarchy(ontology, output="static", file_path="regulatory/class_hierarchy.png")

# Graph growth curve across quarterly snapshots
tv = TemporalVisualizer()
tv.visualize_metrics_evolution(
    metrics_history = {
        "node_count": [12, 18, 25, 31],
        "edge_count": [8,  15, 24, 32],
    },
    timestamps = ["2025-01-01", "2025-04-01", "2025-07-01", "2025-10-01"],
    output     = "interactive",
    file_path  = "regulatory/graph_growth.html",
)

# Snapshot comparison — what changed between Q2 and Q3 Basel update?
snap1 = vm.get_version("basel_q2_2025")
snap2 = vm.get_version("basel_q3_2025")
if snap1 and snap2:
    tv.visualize_snapshot_comparison(
        snapshots = {"basel_q2_2025": snap1, "basel_q3_2025": snap2},
        output    = "interactive",
        file_path = "regulatory/snapshot_diff.html",
    )
```

</Tab>

</Tabs>

## 常见陷阱

**渲染超大规模图谱。** 试图可视化包含数千个节点的图谱会导致浏览器崩溃，并生成无法解读的"毛线球"。在可视化之前，务必先将大图谱过滤为有意义的子集。

**将视觉上的邻近当作关系的证据。** 在可视化中看起来靠近的节点，在图结构中未必关系密切。可视化布局算法优化的是可读性，而不是语义准确性。

**可视化重复或不干净的数据。** 重复实体、命名不一致和数据质量问题会在可视化中被放大。在为利益相关方制作可视化演示之前，先清洗图谱数据。

**用过长的文本字段塞满悬浮提示。** 悬停在节点上不应显示整篇文档内容。悬浮提示中只应包含必要的元数据 —— 实体类型、名称和关键属性。

**在图谱清洗之前就运行可视化。** 可视化会直接反映数据质量问题。命名不一致的实体、重复节点和缺失的关系会生成令人困惑且具有误导性的可视化表示。

## 输出模式

每个可视化方法都接受相同的两种输出模式：

| `output` 取值 | 格式 | 最适合 |
| :------------- | :----- | :------- |
| `"interactive"` | 自包含 HTML（Plotly / pyvis） | Jupyter notebook、分析人员门户、邮件附件 |
| `"static"` | PNG / SVG（Matplotlib） | PDF 报告、幻灯片、监管报送 |

若要获取图形对象而不是写入磁盘，请省略 `file_path`：

```python
fig = viz.visualize_network(graph.to_dict(), output="interactive")
fig.show()              # renders inline in Jupyter
fig.write_html("out.html")   # manual export
```

## 相关指南

- [上下文图](/zh/guides/context-graphs) — `graph.to_dict()` 是 `KGVisualizer` 的主要输入
- [本体管理](/zh/guides/ontology) — `OntologyVisualizer` 渲染由 `OntologyGenerator` 生成的本体
- [变更管理](/zh/guides/change-management) — `TemporalVersionManager` 快照为 `visualize_metrics_evolution()` 和 `visualize_snapshot_comparison()` 提供输入
- [图分析](/zh/guides/graph-analytics) — 中心性得分、社区字典和连通性结果，为 `AnalyticsVisualizer` 提供输入
- [导出与序列化](/zh/guides/export) — 将同一图导出为 GraphML、GEXF 或 DOT，供 Gephi 和 Graphviz 使用