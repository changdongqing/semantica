---
title: "术语表"
description: "Semantica 中使用的术语和概念的参考定义。"
icon: "book"
sourceHash: "8f16b3c5029eab55bec3127e312e8467db7d281744c6721a175b1000e13643a6"
---

<Info>
  使用 Ctrl+F / Cmd+F 在本页搜索特定术语。
</Info>

一份快速参考词典，涵盖 Semantica 文档和代码库中引用的每个概念、数据结构、算法和标准。


## 核心概念

**智能体**
一种自主 AI 系统，能够感知环境、对信息进行推理，并采取行动以实现目标。在 Semantica 中，智能体使用知识图谱进行结构化记忆与上下文管理，每个决策都记录为一等对象。

**上下文图**
一种持久、可查询的图，包含智能体所知、所决策和所推理的一切：实体、关系、决策及其因果链接。`semantica.context` 的核心数据结构。

**决策**
Semantica 中的一等对象：记录智能体选择的类别、场景、推理、结果、置信度分数、因果链和来源溯源。通过 `context.record_decision()` 存储并可搜索。

**实体**
现实世界中一个独立的对象或概念（人物、组织、地点、事件或抽象概念）。实体是知识图谱中的节点，每个实体都具有带类型的属性和一条来源溯源记录。

**知识图谱（KG）**
一种使用实体（节点）和关系（边）的结构化知识表示。与扁平向量存储不同，知识图谱支持推理、查询、语义搜索和可追溯推理。

**关系**
两个实体之间的有向、带类型连接（例如 `works_for`、`located_in`、`founded_by`）。关系携带置信度分数以及指回源文档的溯源信息。

**语义**
与语言或逻辑中的含义相关。语义理解会捕捉上下文与意图，超越关键词匹配去理解文本的*真正含义*。


## 数据处理

**分块**
在保留语义上下文的同时，将大型文档拆分为较小的片段。Semantica 支持递归、语义边界、实体感知、关系感知、滑动窗口、结构化和表格感知等分块策略。

**摄取**
将来自外部来源（文件、数据库、API、流）的数据加载到流水线中，作为统一的 `SourceDocument`。这是每个 Semantica 流水线的第一阶段。

**规范化**
通过将日期转换为 ISO 格式、规范化实体名称、修复编码问题并去除噪声，将数据标准化为一致的规范形式。确保下游抽取基于干净、一致的文本进行。

**解析**
从非结构化或半结构化文档（PDF、Word 文件、HTML、PPTX）中抽取结构化文本、布局和元数据。`DoclingParser` 还可处理多栏布局、合并单元格表格和 OCR。


## 人工智能

**溯因推理**
针对观察到的事实推断最合理的解释。`semantica.reasoning` 中六种推理引擎之一，在给定可用证据时返回最可能的假设。

**Datalog**
一种用于知识库查询的声明式逻辑编程语言。Semantica 的 `DatalogEngine` 支持递归 Horn 子句规则，并采用自底向上的半朴素不动点语义。v0.4.0 新增。

**GraphRAG（图增强检索增强生成）**
一种高级 RAG 方法，将向量相似度搜索与知识图谱遍历相结合。每个 LLM 响应都基于结构化图上下文，且每项主张都可追溯至来源节点。在保留来源归属的前提下消除幻觉。

**推理**
使用逻辑规则从现有知识中推导新事实或结论，而这些推导出的事实并未显式存在于源数据中。

**LLM（大语言模型）**
一种在海量文本语料上训练的 AI 模型，能够理解和生成自然语言。Semantica 集成 8+ 个 LLM 提供商，用于实体抽取、关系抽取和推理。

**RAG（检索增强生成）**
一种在生成响应前从知识库检索相关上下文以增强 LLM 输出的技术。GraphRAG 通过图遍历对其加以扩展，实现更精确、结构化的检索。


## 知识图谱组件

**Allen 区间代数**
一套用于描述两个时间区间关系的 13 种关系系统（before、after、meets、overlaps、during、starts、finishes、equals 及其逆关系）。自 v0.4.0 起在 `TemporalKnowledgeGraph` 中支持。

**BiTemporalFact**
具有两个独立时间维度的事实：*有效时间*（该事实在现实世界中为真的时间）和*事务时间*（该事实被记录到系统中的时间）。可为缓慢变化的数据提供完整审计轨迹。

**边**
图中两个节点之间的有向连接，表示一种带类型的关系。边携带类型、置信度分数和溯源元数据。

**节点**
知识图谱中表示实体或概念的顶点。节点携带带类型的属性、置信度分数，以及指回源文档的溯源信息。

**属性**
实体或关系的一项属性或特征，例如名称、日期、URI、置信度分数或源 URL。

**时序图**
一种知识图谱，其中节点和边携带 `valid_from` / `valid_until` 时间窗口，支持时间点查询和历史状态重建。

**三元组**
知识的原子单元：一个 `(subject, predicate, object)` 三元组（例如 `(Apple_Inc, founded_by, Steve_Jobs)`）。是 RDF 和基于 SPARQL 的存储的构建块。


## 实体识别与抽取

**共指消解**
确定文本中多个表述何时指代同一实体（例如“Apple”和“该公司”都指 Apple Inc.）。由 `semantica.semantic_extract` 中的 `CoreferenceResolver` 处理。

**实体消解**
确定不同文档中的两个实体提及是否指代同一现实世界实体。也称为实体链接或去重。使用相似度评分、blocking（分块）和语义嵌入。

**事件检测**
识别并分类文本中的事件（收购、合作、产品发布、监管决策）。由 `semantica.semantic_extract` 中的 `EventDetector` 处理。

**命名实体识别（NER）**
将文本中的命名实体识别并分类到预定义类别（人物、组织、地点、日期、产品和自定义类型）。三种模式：基于模式、基于机器学习和基于 LLM。

**关系抽取**
从原始文本中识别并抽取实体之间带类型的语义关系（例如 `(Google, acquired, DeepMind)`）。


## 本体与模式

**公理**
在本体中被视为真的陈述，用于定义逻辑约束（例如“每个 Person 必须有名称”“Organization 在同一时间最多只能有一个 CEO”）。

**类**
本体中实体的类别或类型（`Person`、`Organization`、`Location`）。类形成层次结构，并携带由 SHACL 验证的约束。

**本体**
对领域概念、关系和约束的形式化规范，通常以 OWL 表示。Semantica 可从知识图谱自动生成本体，或导入现有的 OWL/RDF/Turtle 文件。

**Ontology Hub**
Semantica v0.5.0 的用于完整本体生命周期的可视化浏览器 UI：可视化类编辑器、SHACL Studio、对齐编写、健康仪表板和受版本控制的差异。

**OWL（Web Ontology Language）**
用于定义和实例化本体的 W3C 标准语言。Semantica 可生成、导入和导出 OWL 本体。

**SHACL（Shapes Constraint Language）**
用于根据一组形状约束验证 RDF 图的 W3C 标准。Semantica 可从本体自动生成 SHACL 形状，并据此验证图。

**SKOS（Simple Knowledge Organization System）**
用于表示受控词表、分类体系和叙词表的 W3C 标准。在 Semantica 中用于领域词表管理。


## 存储与检索

**嵌入**
一种稠密数值向量，在连续语义空间中表示文本、图像或其他数据。含义相似的实体会产生彼此接近的向量，从而支持相似度搜索和语义匹配。

**图数据库**
一种使用节点和边原语来存储和查询图结构数据的优化数据库。Semantica 支持 Neo4j、FalkorDB、Apache AGE 和 Amazon Neptune。

**混合搜索**
一种将向量相似度搜索与关键词或元数据过滤相结合的检索策略，相比任一单独方法都能实现更高准确率。

**三元组存储**
专门用于存储和查询 RDF `(subject, predicate, object)` 三元组的数据库。Semantica 支持嵌入式 Oxigraph，以及 Blazegraph、Apache Jena 和 RDF4J。

**向量存储**
一种针对按相似度存储和搜索高维嵌入向量而优化的数据库。Semantica 支持 FAISS、Pinecone、Weaviate、Qdrant、Milvus 和 PgVector。


## 图分析

**中心性**
衡量节点在图中重要性的指标。常见指标包括 PageRank（基于链接的重要性）、介数中心性（桥接节点）和接近中心性（到其他所有节点的平均距离）。

**社区检测**
识别连接密集的节点分组（内部链接多于外部链接的簇）。用于发现主题社区、欺诈团伙和组织集群。

**距离带**
基于嵌入距离阈值，对节点与目标之间语义接近程度的分类（`near`、`mid` 或 `far`）。属于距离智能（v0.5.0）。

**距离智能**
Semantica v0.5.0 的功能，用于语义邻域探索，包括 N×N 距离矩阵、以单个实体为中心的 ego 模式可视化，以及跨图的距离带分类。

**PageRank**
一种基于入边关系结构衡量节点重要性的算法；最初为网页设计，但适用于任何有向图。


## 查询语言与标准

**Cypher**
Neo4j 和 FalkorDB 使用的声明式图查询语言。类似于关系数据库的 SQL。

**Datalog**
用于演绎数据库查询的 Prolog 子集。Semantica 的 `DatalogEngine` 支持递归 Horn 子句规则，并通过自底向上的半朴素不动点求值保证终止。

**RDF（Resource Description Framework）**
用于将信息表示为主语-谓语-宾语三元组的 W3C 标准。是语义网和 Semantica 三元组存储的基础。

**SPARQL**
用于 RDF 数据的 W3C 查询语言。Semantica 的 `SparqlReasoner` 使用 SPARQL 对 RDF 图进行基于查询的推理。


## 数据质量

**冲突消解**
处理同一知识图谱中来自多个来源的矛盾事实。Semantica 的 `ConflictDetector` 会暴露冲突；消解策略包括优先最新、优先最可靠、多数投票和标记待审核。

**数据溯源**
关于每项事实的来源、历史和血缘的完整信息（源文档、抽取方法、时间戳、置信度分数）。在 Semantica 中符合 W3C PROV-O。

**去重**
识别并合并重复实体记录。Semantica v2 策略（`blocking_v2`、`hybrid_v2`、`semantic_v2`）比 v1 快最多 7 倍。

**W3C PROV-O**
W3C 溯源本体标准。Semantica 以符合 PROV-O 的格式跟踪所有模块间的血缘，适用于 HIPAA、SOX、GDPR 和 FDA 21 CFR Part 11 合规。


## 安全术语

**SSRF（服务端请求伪造）**
一种诱导服务器向非预期目标发起请求的漏洞。Semantica 在构造时验证 `base_url`，以防止 LLM 网关配置中的 SSRF。

**XXE（XML 外部实体）**
XML 解析器中的一种漏洞，允许攻击者读取任意文件或触发 SSRF。Semantica 的 `XMLIngestor`（v0.5.0）使用可防 XXE 的 lxml 后端。


## 另见

- [核心概念](/zh/concepts)：通过代码示例深入解释关键思想。
- [快速开始](/zh/getting-started)：无需图经验的首个可运行示例。
- [模块指南](/zh/modules)：通过代码和流水线链解释全部 27 个模块。
- [API 参考](/zh/reference/context)：每个类和方法的完整技术参考。