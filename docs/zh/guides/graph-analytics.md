---
title: "图分析"
description: "如何找到知识图谱中最重要的节点、发现隐藏社区、度量结构相似性，并预测缺失连接——附带真实示例。"
icon: "chart-network"
sourceHash: "85adb9e8432d23c98fd985dbf1ad52ab491fdaaf7d64171a07910ce6a194623d"
---

`ContextGraph` 分析——中心性、社区检测、Node2Vec 嵌入、链接预测和结构相似性——回答的是你的图*意味着什么*，而不仅仅是它包含什么。通过 `advanced_analytics=True` 一次性启用它们，并用它们来对结构上最重要的节点进行排名、揭示隐藏的运营集群，并在正式观察到之前标记出隐含连接。

## 什么是图分析？

图分析应用数学算法来发现知识图谱结构中的模式和属性。它超越了存储和检索数据，转而分析关系本身。

**图分析与图遍历：** 遍历沿着现有边查找相连节点。分析则检查整个图结构以发现模式——哪些节点最有影响力、哪些节点组形成社区、哪些连接缺失。

**图分析与推理：** 推理应用逻辑规则推导新事实。分析应用统计和拓扑算法来度量诸如中心性、聚类和相似性等结构属性。

图分析帮助你理解数据中的*形态*和*重要性模式*，揭示从单个节点或边无法看出的洞见。

## 为什么使用图分析？

**发现影响力实体。** 并非所有节点都同等重要。分析可识别出哪些实体在网络结构中最中心、连接最多或处于最具战略性的位置。

**社区发现。** 分析通过分析连接密度模式来揭示隐藏集群和运营群体。聚集在一起的实体通常共享仅从元数据中不易看出的目的、来源或行为。

**关系发现。** 链接预测识别尚未被明确观察到的可能连接，帮助调查人员聚焦于最可能缺失的关系。

**调查支持。** 分析提供重要性和相关性的客观度量，帮助分析人员确定优先调查哪些实体，以及哪些关系值得深入审查。

**风险识别。** 中心性度量可识别移除后最会破坏网络的实体——有助于理解单点故障、关键基础设施或高影响目标。

## 何时使用 / 何时不使用

**在以下情况使用图分析：**
- 大型图（100+ 节点），其模式无法通过检查明显看出
- 基于结构重要性确定调查工作的优先级
- 发现隐藏社区和运营集群
- 理解网络韧性和脆弱点
- 通过链接预测识别缺失关系

**在以下情况，图遍历可能已经足够：**
- 沿特定实体之间的已知关系进行追踪
- 探索特定节点周围的邻域
- 在已知实体之间寻找路径

**在以下情况，推理可能已经足够：**
- 应用已知逻辑规则推导新事实
- 策略执行和基于规则的决策
- 关系遵循清晰逻辑模式的场景

**在以下情况，简单查询可能已经足够：**
- 模式在视觉上显而易见的小型图
- 对特定实体或关系的直接查找
- 你确切知道自己要找什么的情况

**在以下情况，分析能提供价值：**
- 你需要理解整体结构和模式
- 人工检查会遗漏重要结构属性
- 你想发现意外关系或社区
- 重要性或相似性的客观度量可指导决策

## 关键分析概念

**模块度**度量图中社区的界定清晰程度。高模块度（>0.4）意味着检测到的社区具有许多内部连接和很少的外部连接——表明存在真实的组织结构。

**Louvain 社区检测**寻找彼此之间连接比与图其余部分更密集的节点组。它可用于发现运营集群、组织单元或功能群体。

**Node2Vec**通过模拟穿越图的随机游走为节点创建向量嵌入。在这些游走过程中出现在相似上下文中的节点最终会得到相似向量，即使它们并不直接相连。

**中心性指标**衡量节点重要性的不同方面：
- 度：有多少直接连接
- 介数：节点在他人之间的最短路径上出现的频率  
- 特征向量：基于拥有重要邻居的重要性
- PageRank：在穿越图的随机游走中的重要性

<Info>
  所有分析都要求在构造时设置 `advanced_analytics=True`。否则，本指南中的每个方法都会抛出 `RuntimeError: advanced_analytics not enabled`。该标志会延迟初始化五个子组件：`CentralityCalculator`、`CommunityDetector`、`NodeEmbedder`、`LinkPredictor` 和 `SimilarityCalculator`。
</Info>

## 设置分析图

```python
from semantica.context import ContextGraph

graph = ContextGraph(
    advanced_analytics  = True,
    community_detection = True,
    node_embeddings     = True,
)
```

如果你要从存储中加载现有图，请传入相同的标志——子组件会从加载后的图状态初始化，而不是从新的空图初始化。

## 单次调用快照

在深入单个分析之前，先了解整体情况。`analyze_graph_with_kg()` 依次运行每一个分析过程，并返回单一统一报告：

```python
report = graph.analyze_graph_with_kg()

print(f"Nodes:       {report['graph_metrics']['node_count']}")
print(f"Edges:       {report['graph_metrics']['edge_count']}")
print(f"Density:     {report['graph_metrics']['density']:.4f}")
print(f"Communities: {len(report['community_analysis'])}")
```

对于具有 2,400 个节点和 8,700 条边的图，密度为 0.003 完全正常——知识图谱本质上稀疏；大多数节点只连接到一个小邻域，而不是与所有节点相连。如果你看到密度高于 0.1，很可能存在过度连接的枢纽节点将整个图连成一体，这会扭曲中心性得分。

在每个摄取批次结束时运行它。结果为你提供了一个可与下一次运行进行比较的基线——如果在摄取周期之间社区数量从 12 降到 4，那么新数据中的某些东西正在桥接先前分离的集群。这是在下次分析人员简报之前值得调查的信号。

完整报告结构：

```text
report
├── "graph_metrics"         → node_count, edge_count, density
├── "centrality_analysis"   → all five measures + per-node rankings
├── "community_analysis"    → detected communities + modularity score
├── "connectivity_analysis" → connected components, diameter, avg path length
├── "node_embeddings"       → node_id → List[float] (Node2Vec vectors)
└── "timestamp"             → ISO datetime of this analysis run
```

## 寻找关键节点——中心性分析

并非所有节点都平等。中心性分析为每个节点给出五种不同得分，每一种度量不同类型的重要性。

关键直觉是：一个节点可以有较低的*度*（直接连接很少），但具有极高的*介数*（一切都经过它）。这就是**中介节点**——如果移除该节点，图会分裂成不连通的片段。在威胁情报中，中介节点通常是基础设施节点：防弹托管提供商、共享 C2 框架，或每个行动都会经过的中间加载器。

### 为单个节点评分

当你怀疑某个特定实体很重要时，先从直接评分开始：

```python
scores = graph.get_node_centrality("APT29")

# degree      → 0.0420  (4.2% of nodes are direct neighbors)
# betweenness → 0.1837  (APT29 sits on 18% of all shortest paths)
# closeness   → 0.6123  (average 1.6 hops to any other node)
# eigenvector → 0.8941  (most of APT29's neighbors are themselves well-connected)
# pagerank    → 0.0089  (0.89% of random-walk probability mass lands here)

for measure, score in scores.items():
    print(f"{measure:12s}: {score:.4f}")
```

这里的介数得分 0.18 很惊人——它意味着 APT29 充当了图中近五分之一信息流的中介节点。如果分析人员想理解“是什么把观察到的 TTP 与已知基础设施连接起来”，他们必须经过 APT29。这不仅仅是名气；这是结构性权力。

### 全图批量排名

要一次性按全部五种度量对每个节点排名：

```python
from semantica.kg import CentralityCalculator

calc       = CentralityCalculator()
graph_dict = graph.to_dict()

all_measures = calc.calculate_all_centrality(graph_dict)

# Pull top 5 by betweenness — these are your brokers
betweenness_rankings = all_measures["centrality_measures"]["betweenness"]["rankings"]
print("Top brokers (betweenness):")
for entry in betweenness_rankings[:5]:
    print(f"  [{entry['score']:.4f}]  {entry['node']}")
```

如果你只关心两种度量，传入子集以避免计算全部五种：

```python
focused = calc.calculate_all_centrality(
    graph_dict,
    centrality_types = ["degree", "pagerank"],
)
```

### 应信任哪种度量？

| 如果你想知道…… | 使用 |
| :--- | :--- |
| 谁拥有最多的直接连接？ | `degree` |
| 移除谁对网络的破坏最大？ | `betweenness` |
| 谁能最快到达网络其余部分？ | `closeness` |
| 谁因为其邻居有影响力而有影响力？ | `eigenvector` |
| 谁在图的随机遍历中重要？ | `pagerank` |

对于归因分析，**特征向量**中心性通常会发现最有意义的节点——高特征向量意味着你连接到其他高特征向量节点，这在威胁情报中与“已知重要”实体聚集在一起的现象相符。

## 映射威胁行为者集群——社区检测

中心性告诉你关于单个节点的信息。社区检测告诉你关于*群体*的信息——哪些节点形成内部连接多于外部连接的紧密集群。

想象你的图中有二十个不同的威胁行为者节点。中心性可以分别对它们排名，但它无法告诉你其中十二个实际上以某种方式共享基础设施、工具使用模式和目标行业，从而使它们成为一个单一运营集群，而其余八个则分裂为两个独立群体。社区检测会自动发现这一点。

```python
from semantica.kg import CommunityDetector

detector   = CommunityDetector()
result     = detector.detect_communities(graph.to_dict(), algorithm="louvain")

communities = result["communities"]       # List[List[str]] — node groups
assignments = result["node_assignments"]  # node_id → community index
modularity  = result["modularity"]        # 0.0–1.0 — partition quality

print(f"Found {len(communities)} communities  (modularity: {modularity:.3f})")

for i, members in enumerate(communities):
    print(f"\n  Community {i} — {len(members)} members")
    print(f"  Sample: {', '.join(members[:4])}")
```

**高于 0.4 的模块度**通常被认为有意义——发现的社区并非随机。如果你的图返回 0.71，那是聚类真实存在的强信号：你的威胁行为者确实形成了运营集群，而不仅仅是随机关联。

当你看到一个社区混合了你原以为不相关的威胁行为者时，那是一个值得调查的假设。也许 `COZY BEAR`、`VENOMOUS BEAR` 和 `FANCY BEAR` 都出现在同一个社区，因为它们共享 C2 基础设施——尽管传统上它们被归因于不同的 GRU 单位。

立即使用以下代码进行可视化：

```python
from semantica.visualization import KGVisualizer

viz = KGVisualizer()
viz.visualize_communities(
    graph       = graph,
    communities = communities,
    output      = "interactive",
    file_path   = "threat_clusters.html",
)
```

## 让图学会度量距离 — Node2Vec 嵌入

中心性与社区发现是拓扑层面的方法——它们把边当作二元连接来处理。Node2Vec 嵌入则更进一步：通过在图上游走数千次随机游走，为每个节点生成一个稠密向量，从而学习哪些节点倾向于出现在相似的邻域中。

实际效果是：扮演相似*结构性角色*的节点会在嵌入空间中彼此靠近——即便它们之间没有直接边。两个都位于威胁行为体与受害基础设施之间的 C2 域名，即使处在图中完全不同的位置，也会拥有相似的嵌入。

```python
from semantica.kg import NodeEmbedder
import numpy as np

embedder   = NodeEmbedder()     # requires: pip install semantica[embeddings]
embeddings = embedder.compute_embeddings(
    graph_store        = graph,   # ContextGraph instance — not a dict
    node_labels        = None,    # None = embed all node types
    relationship_types = None,    # None = traverse all edge types
)
# Returns: Dict[str, List[float]] — node_id → embedding vector

for node_id, vec in list(embeddings.items())[:3]:
    print(f"{node_id}: dim={len(vec)}, norm={np.linalg.norm(vec):.4f}")
```

这些向量在 Semantica 中成为一等公民——它们以 `node2vec_embedding` 的形式存储在 `Decision` 节点上，并被 `find_precedents_by_scenario()` 自动用作结构性相似度分量。

## 这个攻击模式让我想起什么？

一旦有了嵌入，你就可以问：“我的图中哪些节点在结构上与 APT29 最相似？”这无关共享的边——关键在于共享的*角色*。还有哪些节点在图中扮演着与 APT29 相同的位置？

```python
from semantica.kg import SimilarityCalculator

calc = SimilarityCalculator()

top5 = calc.find_most_similar(
    embeddings      = embeddings,
    query_embedding = embeddings["APT29"],
    top_k           = 5,
)

print("Nodes most similar to APT29 (by structural role):")
for node_id, score in top5:
    print(f"  [{score:.4f}]  {node_id}")
```

如果 `LAZARUS` 和 `APT38` 都以大于 0.85 的相似度出现在前列，那就值得写进你的分析师报告：这些组织在图中扮演着结构上完全相同的角色，即便传统归因将它们区分开来，这也可能值得提出一个统一跟踪的假设。

要直接比较两个节点：

```python
score = calc.cosine_similarity(embeddings["APT29"], embeddings["LAZARUS"])
print(f"Structural similarity APT29 ↔ LAZARUS: {score:.4f}")
```

如果不想预先计算所有嵌入，还有一条更快捷的路径：

```python
similar = graph.find_similar_nodes(
    "APT29",
    similarity_type = "structural",
    top_k           = 5,
)
for r in similar:
    print(f"  [{r['score']:.4f}]  {r['type']:20s}  {r['id']}")
```

## 预判下一步行动 — 链接预测

链接预测回答的是另一个问题：不是“哪些节点相似”，而是“哪些边*缺失*”。图中两个节点之间缺少直接连接，可能并不是因为连接不存在，而是因为你尚未观测到它。

在实践中：你有 `APT29 → uses → SUNBURST` 和 `SUNBURST → targets → Windows Server 2019`。链接预测可能以高分给出 `APT29 → targets → Windows Server 2019`——这条连接由传递性隐含，但尚未被显式画出。

```python
from semantica.kg import LinkPredictor

predictor   = LinkPredictor()
predictions = predictor.predict_links(graph.to_dict(), top_k=10)

print("Predicted missing links:")
for node1, node2, score in predictions:
    print(f"  [{score:.4f}]  {node1}  →  {node2}")
```

得分高于 0.8 值得分析师复核——它们并非随机，而是现有图的拓扑强烈暗示的边。低于 0.5 的得分是噪声。适合人工复核的甜蜜区间是 0.6–0.8：看似合理但尚未确认。

<Info>
  链接预测也可通过 `DecisionQuery.predict_decision_relationships(decision_id, top_k)` 在 `Decision` 节点上使用。关于如何揭示过往决策之间的因果关系，参见[决策智能指南](/zh/guides/decision-intelligence)。
</Info>

## 了解你的决策历史

当决策作为节点存储在图中时，`get_decision_insights()` 可以为你提供跨所有决策的分析视图：

```python
insights = graph.get_decision_insights()

print(f"Total decisions: {insights['total_decisions']}")
print(f"Mean confidence: {insights['confidence_stats']['mean']:.2f}")

print("\nBy category:")
for category, count in sorted(insights["categories"].items(), key=lambda x: -x[1]):
    print(f"  {category:<30} {count}")

print("\nBy outcome:")
for outcome, count in sorted(insights["outcomes"].items(), key=lambda x: -x[1]):
    print(f"  {outcome:<20} {count}")
```

置信度统计最能说明问题：如果平均置信度为 0.91，而最低值仅为 0.34，说明有人在做出低置信度决策，却仍被记录为最终结论。这一差距值得在治理审查中标记出来。

`insights` 中的 `"advanced_analytics"` 键包含完整的 `analyze_graph_with_kg()` 结果——因此调用 `get_decision_insights()` 即可获得完整的分析图景，无需额外调用。

## 领域示例

<Tabs>

<Tab title="防御 — CTI 威胁网络">

你的 SOC 刚刚将三个威胁情报源合并为一张 CTI 图。在本周的分析师简报之前，你需要对最危险的行为体进行排名、识别隐藏的作战集群，并标记尚未被正式跟踪的隐含连接。

```python
from semantica.context import ContextGraph
from semantica.kg import CentralityCalculator, CommunityDetector, LinkPredictor
from semantica.visualization import AnalyticsVisualizer

graph = ContextGraph(
    advanced_analytics  = True,
    community_detection = True,
    node_embeddings     = True,
)
# (Populated from MISP/OTX/OSINT ingest)

# Full snapshot
report = graph.analyze_graph_with_kg()
print(f"Graph: {report['graph_metrics']['node_count']} nodes, "
      f"{report['graph_metrics']['edge_count']} edges")

# Rank brokers — who, if taken down, fragments the network?
calc     = CentralityCalculator()
measures = calc.calculate_all_centrality(graph.to_dict())
brokers  = measures["centrality_measures"]["betweenness"]["rankings"][:5]

print("\nTop 5 broker nodes (betweenness):")
for entry in brokers:
    print(f"  [{entry['score']:.4f}]  {entry['node']}")

# Find operational clusters
detector = CommunityDetector()
result   = detector.detect_communities(graph.to_dict(), algorithm="louvain")
print(f"\n{len(result['communities'])} clusters  "
      f"(modularity {result['modularity']:.3f})")

# Flag implied connections
predictor   = LinkPredictor()
predictions = predictor.predict_links(graph.to_dict(), top_k=5)
print("\nHigh-confidence implied connections:")
for n1, n2, score in predictions:
    if score > 0.7:
        print(f"  [{score:.3f}]  {n1}  →  {n2}")
```

</Tab>

<Tab title="安全 — 活跃事件">

在一次活跃事件中，你的图已经扩展到包含告警节点、受影响主机、横向移动边以及已识别的恶意软件。你需要了解爆炸半径：哪些主机是横向移动链中的结构性枢纽，哪些连接尚未被正式记录？

```python
from semantica.context import ContextGraph
from semantica.kg import CentralityCalculator, LinkPredictor

graph = ContextGraph(advanced_analytics=True)
# (Populated from SIEM alert correlation and EDR telemetry)

calc     = CentralityCalculator()
measures = calc.calculate_all_centrality(graph.to_dict())

# Betweenness finds the pivot hosts — the ones lateral movement flows through
pivot_hosts = measures["centrality_measures"]["betweenness"]["rankings"][:5]
print("Pivot hosts (lateral movement brokers):")
for entry in pivot_hosts:
    print(f"  [{entry['score']:.4f}]  {entry['node']}")

# Identify the attacker's likely next targets
predictor   = LinkPredictor()
predictions = predictor.predict_links(graph.to_dict(), top_k=10)

print("\nLikely next lateral moves (predicted):")
for src, dst, score in predictions:
    if score > 0.65:
        print(f"  [{score:.3f}]  {src}  →  {dst}")

# Score a specific high-value target
dc_scores = graph.get_node_centrality("DC-PROD-01")
print(f"\nDomain Controller centrality:")
print(f"  Betweenness: {dc_scores['betweenness']:.4f}")
print(f"  PageRank:    {dc_scores['pagerank']:.4f}")
# High betweenness + high pagerank on a DC = confirmed pivot point
```

</Tab>

<Tab title="生命科学 — 临床试验图">

你的临床试验平台维护着一张图，涵盖药物、生物标志物、患者人群、不良事件类型和监管决策。在每个试验阶段结束时，你需要了解代谢综合征的药物簇是否真正与心血管簇隔离——这种隔离对联合用药风险评估至关重要。

```python
from semantica.context import ContextGraph
from semantica.kg import CommunityDetector, NodeEmbedder, SimilarityCalculator

graph = ContextGraph(
    advanced_analytics  = True,
    community_detection = True,
    node_embeddings     = True,
)
# (Populated from trial records, PubMed, and FDA adverse event database)

# Find drug-disease clusters
detector = CommunityDetector()
result   = detector.detect_communities(graph.to_dict(), algorithm="louvain")
print(f"Clinical clusters: {len(result['communities'])}  "
      f"(modularity {result['modularity']:.3f})")

# Inspect the cluster containing dapagliflozin
drug_cluster_idx = result["node_assignments"].get("dapagliflozin")
if drug_cluster_idx is not None:
    cluster_members = result["communities"][drug_cluster_idx]
    print(f"\nCluster containing dapagliflozin ({len(cluster_members)} members):")
    for m in cluster_members[:8]:
        print(f"  {m}")

# Find drugs that play the same structural role as dapagliflozin
embedder   = NodeEmbedder()
embeddings = embedder.compute_embeddings(graph_store=graph)
calc       = SimilarityCalculator()

similar_drugs = calc.find_most_similar(
    embeddings      = embeddings,
    query_embedding = embeddings["dapagliflozin"],
    top_k           = 5,
)
print("\nStructurally similar to dapagliflozin:")
for drug, score in similar_drugs:
    print(f"  [{score:.4f}]  {drug}")
```

</Tab>

<Tab title="银行 — 交易对手风险">

你的风险管理团队将交易对手关系建模为一张图：银行、SPV、敞口工具和监管实体，通过敞口、担保和所有权边相连。在季度压力测试之前，你需要识别哪些实体具有系统性——它们的失败会造成最广泛的连锁反应。

```python
from semantica.context import ContextGraph
from semantica.kg import CentralityCalculator, CommunityDetector

graph = ContextGraph(advanced_analytics=True, community_detection=True)
# (Populated from regulatory filings, trade repositories, and internal exposure data)

calc     = CentralityCalculator()
measures = calc.calculate_all_centrality(graph.to_dict())

# Eigenvector finds "too connected to fail" — entities connected to other
# high-centrality entities
systemic = measures["centrality_measures"]["eigenvector"]["rankings"][:5]
print("Systemically connected entities:")
for entry in systemic:
    print(f"  [{entry['score']:.4f}]  {entry['node']}")

# Betweenness finds contagion brokers — entities that, if they defaulted,
# would disconnect otherwise-separate parts of the exposure graph
brokers = measures["centrality_measures"]["betweenness"]["rankings"][:5]
print("\nContagion brokers:")
for entry in brokers:
    print(f"  [{entry['score']:.4f}]  {entry['node']}")

# Find exposure clusters — groups with dense mutual exposure
detector = CommunityDetector()
result   = detector.detect_communities(graph.to_dict(), algorithm="louvain")
print(f"\n{len(result['communities'])} exposure clusters  "
      f"(modularity {result['modularity']:.3f})")
```

</Tab>

</Tabs>

## 常见陷阱

**将预测视为事实。** 链路预测和相似度分数是概率性估计，并非已确认的关系。链路预测分数高只表明可能存在连接，但在据此采取行动之前需要人工验证。

**重复实体。** 将 "APT-29"、"APT29" 和 "Cozy Bear" 作为独立节点，会人为压低它们的中心性分数并割裂社区。在运行分析之前先对实体去重，才能获得准确结果。

**命名不一致。** 将 "ThreatActor"、"threat_actor" 和 "Actor" 混用为节点类型，会破坏按节点类型分组的分析。请在各数据源中采用一致的命名约定。

**过度解读分析结果。** 具有高介数中心性的节点在当前图中具有结构重要性——但未必在现实世界中重要。分析揭示的是数据中的模式，而非该领域的普遍真理。

**在过小的图上运行分析。** 社区发现和中心性度量在具有 100+ 节点且连接密度足够的图上才最有意义。低于该阈值的图上的结果可能无法提供可靠的洞见。

**图质量不佳。** 重复实体、命名不一致和缺失关系会直接影响分析准确性。在运行分析前先去重并规范化数据——算法会放大图中存在的任何结构，包括噪声。

## 数字的含义

| 分数 | 它告诉你的信息 |
| :--- | :--- |
| 介数 > 0.15 | 关键中介——在任何归因或根因分析中应首先调查此节点 |
| 模块度 > 0.4 | 社区是真实存在的，而非统计噪声——可以信任该聚类 |
| 模块度 < 0.2 | 图过于稠密，在此层级无法形成有意义的社区结构 |
| 嵌入余弦相似度 > 0.85 | 两个节点在结构上近乎相同——是统一追踪的强假设 |
| 链路预测分数 > 0.7 | 该边几乎肯定存在——排队等待分析师确认 |
| 链路预测分数 0.5–0.7 | 合理但不确定——将其视为假设而非事实 |

## 相关指南

- [上下文图](/zh/guides/context-graphs) — 构建并查询底层 `ContextGraph`
- [可视化](/zh/guides/visualization) — 将中心性排名和社区聚类渲染为交互式仪表盘
- [决策智能](/zh/guides/decision-intelligence) — 将链路预测和结构相似度应用于决策节点
- [GraphRAG](/zh/guides/graphrag) — 利用分析结果为 LLM 生成提供基于最相关上下文的子图