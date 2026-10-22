---
title: "可视化模块"
description: "交互式与静态的知识图谱、本体、嵌入和时间可视化。"
icon: "chart-bar"
sourceHash: "80669abe86bc2c87cc20ad6c2e8d12fdf73bd29442cc82b4888acf9e6539b230"
---

**`semantica.visualization`** 可将知识图谱、本体、嵌入空间和时间数据渲染为**交互式 HTML 或静态图像**: 无需启动完整的 Explorer 服务器:

- `KGVisualizer`: 支持力导向、层次和环形布局的交互式网络
- `EmbeddingVisualizer`: 带聚类标签的 2D/3D UMAP 或 t-SNE 投影
- `TemporalVisualizer`: 时间线视图以及跨快照的图演化
- `AnalyticsVisualizer`: 中心性得分、社区结构和度分布图表

依赖 `plotly`: `pip install plotly`。部分导出器还需要 `matplotlib` 或 `graphviz`。


## 导出的类

| 类 | 作用 |
| :--- | :--- |
| `KGVisualizer` | 交互式网络、社区和子图渲染，支持力导向/层次/环形布局 |
| `OntologyVisualizer` | 从任意本体生成类层次结构与属性关系图 |
| `EmbeddingVisualizer` | 带聚类标签的嵌入空间 2D/3D UMAP 或 t-SNE 投影 |
| `SemanticNetworkVisualizer` | 加权语义网络渲染 |
| `AnalyticsVisualizer` | 中心性得分、社区结构、连通性和度分布图表 |
| `TemporalVisualizer` | 时间线视图以及跨快照的图演化 |

## 快速开始

<Steps>
  <Step title="渲染知识图谱">
    ```python
    from semantica.visualization import KGVisualizer

    viz = KGVisualizer(layout="force", color_scheme="default")

    # Interactive: opens in browser, supports hover and click
    viz.visualize_network(graph, output="interactive")
    ```
  </Step>
  <Step title="应用布局与配色选项">
    ```python
    viz = KGVisualizer(layout="force", color_scheme="vibrant")

    viz.visualize_network(
        graph,
        output="html",
        file_path="graph.html",
        node_color_by="type",      # color nodes by entity type attribute
    )
    ```
  </Step>
  <Step title="导出为静态格式">
    ```python
    # Static PNG: for reports and embedding in documents
    viz.visualize_network(graph, output="png", file_path="graph.png")

    # Vector SVG: for publications and scalable diagrams
    viz.visualize_network(graph, output="svg", file_path="graph.svg")
    ```
  </Step>
</Steps>

<Warning>
  **所有可视化器都需要 `plotly`。** 使用前请先安装: `pip install plotly`。若未安装 Plotly，所有可视化器方法都会抛出 `ProcessingError`。
</Warning>

## 可视化器

<Tabs>
  <Tab title="KGVisualizer">
    交互式与静态知识图谱渲染:

    ```python
    from semantica.visualization import KGVisualizer

    viz = KGVisualizer(layout="force", color_scheme="default")

    # Interactive: opens in browser
    viz.visualize_network(graph, output="interactive")

    # Save as HTML file
    viz.visualize_network(graph, output="html", file_path="graph.html")

    # Static PNG
    viz.visualize_network(graph, output="png", file_path="graph.png")

    # Community-colored graph
    viz.visualize_communities(graph, communities, file_path="communities.html")

    # Centrality-sized nodes
    viz.visualize_centrality(graph, centrality, centrality_type="degree")

    # Entity type distribution bar chart
    viz.visualize_entity_types(graph, output="interactive")

    # Relationship frequency heatmap
    viz.visualize_relationship_matrix(graph, output="interactive")
    ```

    <Warning>
      **大图请使用 `max_nodes`。** 当节点数超过约 1,000 时，力导向布局会变得难以辨认且运行缓慢。可视化大图之前，请先过滤出子图。
    </Warning>

    <Tip>
      **HTML 输出始终是最佳起点。** 交互式 HTML 支持缩放、平移和悬停查看详情。只有在嵌入报告时才导出为 PNG/SVG/PDF。
    </Tip>

    <Tip>
      **如需交互式仪表盘，优先使用 Explorer。** `KGVisualizer.visualize_network()` 生成自包含的 HTML 文件。Explorer CLI (`semantica-explorer`) 则提供带搜索、过滤、路径查找和 REST API 的完整实时 Web 应用。
    </Tip>

    **布局选项 (`layout=`):**

    | 布局 | 说明 | 适用场景 |
    | :------ | :----------- | :-------- |
    | `force` | 物理模拟: 聚类自然涌现 | 通用图 |
    | `hierarchical` | 自上而下的树形布局 | 分类体系、组织架构图 |
    | `circular` | 节点排布在圆周上，边以弦线表示 | 小型稠密图 |
  </Tab>
  <Tab title="OntologyVisualizer">
    可视化类层次结构与属性关系:

    ```python
    from semantica.visualization import OntologyVisualizer

    viz = OntologyVisualizer()

    # Class hierarchy tree
    viz.visualize_hierarchy(ontology, output="interactive")

    # Property domain/range graph
    viz.visualize_properties(ontology, output="html", file_path="properties.html")

    # Full structure network (classes + properties)
    viz.visualize_structure(ontology, output="interactive")

    # Class-property matrix heatmap
    viz.visualize_class_property_matrix(ontology, output="html", file_path="matrix.html")

    # Ontology metrics dashboard
    viz.visualize_metrics(ontology, output="interactive")
    ```
  </Tab>
  <Tab title="EmbeddingVisualizer">
    将高维嵌入投影到 2D 以进行聚类分析:

    ```python
    from semantica.visualization import EmbeddingVisualizer

    viz = EmbeddingVisualizer()

    viz.visualize_2d_projection(
        embeddings=embeddings,
        labels=labels,
        output="interactive",
        file_path="embeddings.html",
        method="umap",    # "umap" | "tsne" | "pca"
    )
    ```

    | 方法 | 速度 | 保留特性 | 适用场景 |
    | :------ | :----- | :--------- | :-------- |
    | `umap` | 快 | 全局与局部结构 | 大型数据集、聚类发现 |
    | `tsne` | 中 | 局部结构 | 紧密聚类的分离 |
    | `pca` | 极快 | 方差 | 快速概览、线性结构 |

    <Tip>
      **在大规模场景下 UMAP 比 t-SNE 更快。** 对于超过 5,000 个点的嵌入空间，UMAP 可在数秒内完成；t-SNE 可能需要数分钟。两者都能产生良好的聚类分离效果。
    </Tip>
  </Tab>
  <Tab title="TemporalVisualizer">
    可视化知识图谱随时间的变化:

    ```python
    from semantica.visualization import TemporalVisualizer

    viz = TemporalVisualizer()

    # Timeline of entity/relationship changes
    viz.visualize_timeline(temporal_data, output="interactive")

    # Animated network evolution: one frame per time step
    viz.visualize_network_evolution(temporal_kg, output="html", file_path="evolution.html")

    # Side-by-side snapshot comparison
    # snapshots: dict mapping timestamp strings to graph dicts
    snapshots = {
        "2023-01": graph_v1,
        "2024-01": graph_v2,
    }
    viz.visualize_snapshot_comparison(snapshots, output="html", file_path="diff.html")

    # Temporal patterns: pass a list of pattern dicts
    viz.visualize_temporal_patterns(patterns, output="html", file_path="patterns.html")

    # Metrics evolution over time
    viz.visualize_metrics_evolution(metrics_history, timestamps, output="interactive")
    ```
  </Tab>
  <Tab title="AnalyticsVisualizer">
    可视化图分析结果: 中心性、社区和度分布:

    ```python
    from semantica.visualization import AnalyticsVisualizer

    viz = AnalyticsVisualizer()

    # Bar chart of top-N nodes by centrality measure
    # param is centrality_type= (not metric=) and top_n= (not top_k=)
    viz.visualize_centrality_rankings(
        centrality,
        centrality_type="pagerank",
        top_n=20,
        output="html",
        file_path="centrality.html",
    )

    # Community-colored network graph
    viz.visualize_community_structure(kg, communities, output="html", file_path="communities.html")

    # Degree distribution histogram
    viz.visualize_degree_distribution(kg, output="html", file_path="degree_dist.html")

    # Connectivity analysis (connected/disconnected, component sizes)
    viz.visualize_connectivity(connectivity, output="interactive")

    # Full metrics dashboard (nodes, edges, density, diameter)
    viz.visualize_metrics_dashboard(metrics, output="interactive")

    # Compare multiple centrality measures side-by-side
    viz.visualize_centrality_comparison(centrality_results, top_n=10)
    ```
  </Tab>
</Tabs>

## 配色方案

所有可视化器都接受构造参数 `color_scheme=`:

```python
viz = KGVisualizer(color_scheme="vibrant")
```

| 方案 | 说明 | 适用场景 |
| :------ | :----------- | :-------- |
| `default` | 蓝灰色调 | 通用场景 |
| `vibrant` | 高对比度、饱和色彩 | 演示汇报 |
| `pastel` | 柔和、低饱和色调 | 浅色背景 |
| `dark` | 深色背景配明亮节点 | 深色模式仪表盘 |
| `light` | 白色背景、细线边 | 出版印刷 |
| `colorblind` | Okabe-Ito 安全配色 | 无障碍访问 |

<Tip>
  **在出版和仪表盘中使用 `color_scheme="colorblind"`。** Okabe-Ito 配色对所有人都可辨识，包括约 8% 的红绿色盲读者。
</Tip>

## 导出格式

| 格式 | 交互式 | 可缩放 | 适用场景 |
| :------ | :----------- | :-------- | :-------- |
| `.html` | 是 | 不适用 | Web 仪表盘、探索性分析 |
| `.png` | 否 | 否 | 报告、Jupyter notebook |
| `.svg` | 否 | 是 | 出版物、幻灯片 |
| `.pdf` | 否 | 是 | 印刷、合规导出 |

## 便捷函数

```python
from semantica.visualization import (
    visualize_kg, visualize_ontology, visualize_embeddings,
    visualize_semantic_network, visualize_analytics, visualize_temporal,
)

# Returns Plotly figure or None
fig = visualize_kg(graph, output="interactive", method="default")
fig = visualize_ontology(ontology, output="interactive", method="hierarchy")
fig = visualize_embeddings(embeddings, labels, output="interactive", method="2d_projection")
fig = visualize_analytics(analytics_data, output="interactive", method="centrality")
fig = visualize_temporal(temporal_data, output="interactive", method="timeline")
```

## 图浏览器 (完整仪表盘)

如需带搜索、路径查找和 Ontology Hub 的完整浏览器 UI，请启动 Explorer CLI:

```bash
semantica-explorer --graph my_graph.json
```

完整功能集与 REST API 参见 [Explorer 参考](/zh/reference/explorer)。

- [知识图谱](/zh/reference/kg) — 被可视化的图。
- [本体](/zh/reference/ontology) — 可视化本体的类结构。
- [嵌入](/zh/reference/embeddings) — 生成此处可视化的嵌入。
- [Explorer](/zh/reference/explorer) — 完整的交互式知识浏览器 UI。