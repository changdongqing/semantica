---
title: "多语言术语表(zh-CN)"
description: "Semantica 界面与文档简体中文翻译的统一术语,供翻译、审校与开发共用。"
---

# 多语言术语表(zh-CN)

> 本表是 `zh-CN` 翻译的唯一术语来源。新增术语先改本表,再改译文。
> 标记「不译」的条目保留英文原文。

## 产品与核心概念

| 英文 | 中文 | 说明 |
| --- | --- | --- |
| Semantica | Semantica | 产品名,不译 |
| Knowledge Explorer | 知识探索器 | 产品模块名;`Semantica Explorer` 保留英文 |
| Context Graph | 上下文图 | 产品核心概念 |
| Knowledge Graph / KG | 知识图谱 / KG | 首次出现可用全称,后文可用 KG |
| Ontology | 本体 | |
| Provenance | 溯源 | 指来源与变更记录 |
| Decision Intelligence | 决策智能 | |
| Decision Record | 决策记录 | |
| Causal Chain | 因果链 | |
| Entity Resolution | 实体消解 | |
| Entity | 实体 | |
| Node | 节点 | |
| Edge | 边 | |
| Triplet | 三元组 | |
| Ingest | 摄取 | |
| Chunk | 分块 | |
| Embedding | 嵌入 | |
| Vector Store | 向量存储 | |
| Graph Store | 图存储 | |
| Workspace | 工作区 | |
| Dossier | 档案 | `Entity Dossier` 译「实体档案」 |
| Proposal | 提案 | |
| Alignment | 对齐 | |
| Vocabulary | 词表 | |
| Scheme | 词表方案 | SKOS scheme |
| Registry | 注册表 | |
| Lineage | 血缘 | |
| Snapshot | 快照 | |
| Conflict | 冲突 | |
| Deduplication | 去重 | |
| Forward Chaining | 前向链 | |
| Audit Trail | 审计轨迹 | |
| Policy | 策略 | |
| Inference | 推理 | |
| Fact | 事实 | |
| Rule | 规则 | |
| Axiom | 公理 | |
| Restriction | 限制 | |
| Concept | 概念 | |
| Class | 类 | |
| Property | 属性 | |
| Individual | 个体 | |
| Instance | 实例 | |
| Domain | 定义域 | |
| Range | 值域 | |
| Broader / Narrower | 上位 / 下位 | SKOS 关系 |
| Exact / Close / Broad / Narrow Match | 精确 / 近似 / 宽泛 / 狭窄匹配 | SKOS 匹配关系 |
| Scope Note | 范围说明 | |
| Editorial Note | 编辑说明 | |
| Notation | 记法 | |
| Health | 健康度 | 本体健康度 |
| SHACL Validation | SHACL 校验 | |

## 图可视化

| 英文 | 中文 | 说明 |
| --- | --- | --- |
| Full Graph | 完整图 | |
| Grouped View | 分组视图 | |
| Focused / Focus | 聚焦 | 视图与操作 |
| Neighborhood | 邻域 | |
| Community | 社区 | |
| Modularity | 模块度 | |
| Centrality | 中心性 | |
| Distance Intelligence | 距离智能 | |
| Heatmap | 热力图 | |
| Distance Band | 距离区间 | |
| Anchor | 锚点 | |
| Hop | 跳 | 图距离单位 |
| Ego Mode | 自我中心模式 | |
| Path | 路径 | |
| Segment | 段 | |
| Layout | 布局 | |
| Camera | 相机 | |
| Zoom In / Out | 放大 / 缩小 | |
| Fit View | 适配视图 | |
| Canvas | 画布 | |
| Inspector | 检查器 | |
| Timeline | 时间轴 | |
| Temporal | 时间 | |
| Scrubber | 时间滑块 | |
| Panorama / Overview Backbone | 概览骨干 | |

## 数据与操作

| 英文 | 中文 | 说明 |
| --- | --- | --- |
| Import / Export | 导入 / 导出 | |
| Enrich | 增强 | 工作区名 |
| Manage | 管理 | 工作区名 |
| Analyze | 分析 | 工作区名 |
| Explore | 探索 | 工作区名 |
| Diff & Merge | 差异与合并 | |
| Merge | 合并 | |
| Flagged Pair | 标记项 | 去重候选对 |
| Similarity Threshold | 相似度阈值 | |
| Confidence | 置信度 | |
| Confidence Decay | 置信度衰减 | |
| Path Coherence | 路径连贯度 | |
| Bottleneck | 瓶颈 | |
| Source Attribution | 来源归属 | |
| Candidate Links | 候选链接 | |
| Link Prediction | 链接预测 | |
| Template | 模板 | |
| Inspector | 检查器 | |

## 不译项

- 标准与格式:`RDF`、`RDFS`、`OWL`、`SKOS`、`SPARQL`、`SHACL`、`JSON-LD`、`Turtle`、`N-Triples`、`Parquet`、`GraphML`、`Cypher`、`PROV-O`
- 产品与品牌:`Semantica`、`Semantica Explorer`、`AgentMemory`
- 存储后端:`Neo4j`、`FalkorDB`、`Oxigraph`、`Qdrant`、`Weaviate`、`Milvus`、`Pinecone`、`pgvector`
- 节点/边类型值、本体 IRI、属性名、文件名、HTTP 方法、快捷键
- 示例数据与演示文本(`Sample Company Inc.`、示例规则/查询)

## 书写规范

- 中英文之间保留一个空格,如「加载 SHACL 校验」。
- 句子使用全角标点;标签与按钮不加句号。
- 插值占位符必须与英文完全一致,包括名称与数量。
- 复数 key 在中文使用 `_other` 语义;当前 `zh-CN` 同时保留 `_one` / `_other` 以通过严格 key 对等检查。
- 引号统一使用中文引号「」或“”,代码与 URI 使用反引号或原样保留。
