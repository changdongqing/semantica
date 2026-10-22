---
title: "常见问题"
description: "关于 Semantica 的常见问题：安装、功能、集成与故障排查。"
icon: "circle-question"
sourceHash: "43f3f0f44b7c1577657866018e4a9a637584bfc83abf0d379b5de3fc8ad4b0fd"
---

<Info>
  使用 **Ctrl+F** / **Cmd+F** 搜索本页。常用跳转：[安装](#installation) · [数据与功能](#data-&-features) · [故障排查](#troubleshooting)
</Info>

## 快速回答

| 问题 | 回答 |
| :-------- | :------ |
| 许可证？ | MIT：永久免费，无付费墙功能 |
| Python 版本？ | 3.10+（推荐 3.11+） |
| 需要 API 密钥吗？ | 可选：无需任何密钥即可进行模式抽取 |
| 可与 LangChain / LlamaIndex 配合使用吗？ | 是：Semantica 是叠加在上层的附加层，而非替代品 |
| 可用于生产环境吗？ | 是：1,000+ 测试，每个版本都会发布安全修复（见 [CHANGELOG](https://github.com/semantica-agi/semantica/blob/main/CHANGELOG.md)） |
| 最新版本？ | **v0.7.0**（2026 年 9 月） |
| 支持本地 LLM 吗？ | 是：通过 LiteLLM 使用 Ollama，气隙环境使用 HuggingFaceLLM |


## 通用

<AccordionGroup>

<Accordion title="Semantica 是什么？" icon="info-circle">

Semantica 是一个开源框架，用于为 AI 构建上下文图与决策智能层。它将非结构化数据（文档、API、数据库）转换为带完整溯源追踪的结构化知识图谱，使 AI 系统可解释、可审计。

它不是 LangChain 或 LlamaIndex 的替代品，而是叠加在其之上的**问责层**：记录决策、将事实追溯到来源，并让推理过程透明。

</Accordion>

<Accordion title="我可以用 Semantica 构建什么？" icon="hammer">

- 从文档和多源数据构建知识图谱
- 具备图接地检索与来源归因的 GraphRAG 系统
- 带结构化决策历史与语义记忆的 AI 智能体
- 具备 W3C PROV-O 血缘、满足合规要求的流水线（HIPAA、SOX、GDPR、FDA 21 CFR Part 11）
- 追踪事实随时间变化的时间图
- 由本体驱动、经 SHACL 校验的知识库

</Accordion>

<Accordion title="Semantica 与 LangChain 或 LlamaIndex 有何不同？" icon="scale-balanced">

大多数框架止步于检索或生成。Semantica 增加了**问责层**：每个决策都被记录，每个事实都链接到来源，每个推理步骤都可解释。它面向这样的环境：你需要审计 AI *为何*得出某个结论，而不只是它说了什么。

Semantica 与这些框架协同工作，而非对立。

</Accordion>

<Accordion title="Semantica 会解释 LLM 的内部推理或思维链吗？" icon="triangle-exclamation">

不会。这是**系统级可解释性，而非基础模型可解释性**。Semantica 不会暴露、重建或解释 LLM/基础模型*内部*发生的事情。其内部推理或思维链始终保持不透明，正如任何外部系统一样。

Semantica 解释的是模型*之外*的内容：使用了哪些上下文和数据、产生了什么决策、其背后的溯源、相关关系、所应用的策略，以及由此形成的决策轨迹。

简而言之，Semantica 解释并审计*AI 系统做了什么*，而不是基础模型的私有内部推理。

</Accordion>

<Accordion title="Semantica 免费吗？" icon="tag">

免费：MIT 许可，无厂商锁定，无付费墙功能。部分能力需要第三方 API 密钥（例如 OpenAI 嵌入、Groq 推理），但 Semantica 本身始终免费且开源。

</Accordion>

<Accordion title="最新版本是什么？" icon="star">

**v0.7.0**：发布于 2026 年 9 月。

亮点：核心安装依赖通过可选 extra 从 44 个包削减至 22 个（如需旧版捆绑行为，可使用 `pip install "semantica[all]"`）、分层社区 GraphRAG（多层级社区检测、摘要报告、全局/DRIFT 混合搜索）、六个新数据连接器（BigQuery、Redshift、Power BI、Airflow，以及 JSONL 摄取）、模式引导的抽取校验、带信任分级、感知来源的图事实真值维护、持久化 SQLite 抽取缓存后端，以及 40+ 项正确性修复。需要 Python 3.10+（已弃用 3.8/3.9）。两项破坏性变更：`Entity.confidence` 现在为 `Optional[float]`，`PolicyEngine.check_compliance` 对无法评估的规则抛出 `ProcessingError`，而不再返回 `False`。0.6.x 系列还实现了每个版本均以密码学方式签名（SLSA + Sigstore）、真实的向量存储枚举，以及一等公民级的 Anthropic/Gemini/Ollama/DeepSeek/Novita LLM 提供方封装。完整历史见 [CHANGELOG](https://github.com/semantica-agi/semantica/blob/main/CHANGELOG.md)。

```bash
pip install --upgrade semantica
```

</Accordion>

</AccordionGroup>


## 安装

<AccordionGroup>

<Accordion title="如何安装 Semantica？" icon="download">

```bash
pip install semantica
```

虚拟环境设置、可选 extra（`[gpu]`、`[all]`、各提供方专用）以及平台相关的故障排查，请参阅 [安装](/zh/installation)。

</Accordion>

<Accordion title="需要哪个 Python 版本？" icon="python">

Python **3.10 或更高版本**（支持 3.10–3.13）。推荐使用 Python 3.11+ 以获得最佳性能与兼容性。

</Accordion>

<Accordion title="在 Windows 上 [all] extra 安装失败" icon="windows">

这是一个已知缺陷：已在 **v0.5.0** 中修复。请升级：

```bash
pip install --upgrade semantica
```

如果使用的是旧版本，请逐个安装 extra：先 `pip install "semantica[core]"`，再添加 `[llm-openai]`、`[gpu]` 等。

</Accordion>

<Accordion title="系统要求是什么？" icon="server">

| 要求 | 最低配置 | 推荐配置 |
| :----------- | :------- | :----------- |
| Python | 3.10 | 3.11+ |
| 内存 | 4 GB | 16 GB+ |
| 存储 | 2 GB | 20 GB+ |
| GPU | 可选 | 用于嵌入与 ML 模型的 CUDA |

</Accordion>

</AccordionGroup>


## 数据与功能

<AccordionGroup>

<Accordion title="Semantica 支持哪些数据源？" icon="database">

| 类别 | 数据源 |
| :-------- | :------- |
| **文件** | PDF、DOCX、HTML、JSON、CSV、Excel、PPTX、Parquet（v0.5.0）、XML（v0.5.0）、归档文件 |
| **Web** | `WebIngestor` 爬取、RSS 订阅源、站点地图 |
| **数据库** | 通过 `DBIngestor` / `SnowflakeIngestor` / `DatabricksIngestor` 支持 PostgreSQL、MySQL、Snowflake、Databricks |
| **NoSQL** | 通过 `MongoIngestor` 支持 MongoDB，通过 `DuckDBIngestor` 支持 DuckDB |
| **流** | 通过 `StreamIngestor` 支持 Kafka 与实时摄取 |
| **协议** | 通过 `MCPIngestor` 支持 MCP（Model Context Protocol） |
| **云** | 通过 `GDriveIngestor` 支持 Google Drive，以及 HuggingFace 数据集 |

</Accordion>

<Accordion title="可以使用我自己的模型吗？" icon="robot">

可以。Semantica 支持：

- **自定义 NER 与抽取模型**：通过 `method_registry` 注册
- **自定义嵌入模型**：任何具备 `.encode()` 接口的模型
- **自定义 LLM 提供方**：通过 LiteLLM（100+ 模型）或直接集成提供方
- **自定义流水线处理器**：通过 `PluginRegistry` 注册

</Accordion>

<Accordion title="Semantica 支持 GPU 吗？" icon="bolt">

支持。当 GPU 可用时，会自动用于嵌入生成、ML 模型推理和向量运算。安装 GPU 支持：

```bash
pip install "semantica[gpu]"
```

其中包含带 CUDA 的 PyTorch、FAISS GPU 和 CuPy。

</Accordion>

<Accordion title="Semantica 如何处理大规模数据集？" icon="layer-group">

- **批处理**：以可配置的分块处理文档，以控制内存占用
- **并行处理**：`semantica.pipeline` 模块可在同一依赖层中并发执行相互独立、可安全并行的步骤（见 [流水线指南](/zh/guides/pipeline)）
- **增量处理**：在新数据到来时增量更新图，无需全量重算
- **持久化后端**：用 Neo4j、FalkorDB 或 Apache AGE 替换内存中的 NetworkX，以支撑大规模生产图

</Accordion>

<Accordion title="什么是时间智能（Temporal Intelligence）？" icon="clock">

`TemporalKnowledgeGraph` 为节点和边附加 `valid_from` / `valid_until` 时间窗口，从而支持时间点查询与历史分析。支持全部 13 种 Allen 区间代数关系以及 OWL-Time 导出。

```python
from semantica.kg import TemporalKnowledgeGraph

tkg = TemporalKnowledgeGraph()
tkg.add_temporal_triple("A", "caused", "B", valid_from="2024-01", valid_until="2024-06")
snapshot = tkg.query_at_time("2024-03")
```

自 v0.4.0 起可用。

</Accordion>

<Accordion title="什么是本体中心（Ontology Hub）？" icon="sitemap">

一个覆盖完整本体生命周期的可视化浏览器 UI：通过 `semantica.explorer` 启动。包含：

- **可视化编辑器**：创建与编辑类、属性和关系
- **SHACL Studio**：编写、校验并导出 SHACL 形状
- **对齐编写**：跨本体映射概念
- **健康仪表盘**：覆盖率、一致性与约束违规指标
- **版本控制**：本体变更的差异对比与历史记录

自 v0.5.0 起可用。

</Accordion>

<Accordion title="什么是距离智能（Distance Intelligence）？" icon="compass">

面向图中任意实体的语义邻域探索。返回带距离带分类的结构化邻近数据。

- 一组实体之间的 N×N 距离矩阵
- 以单个节点为中心的自我模式（ego-mode）可视化
- 基于嵌入阈值的距离带：`near` / `mid` / `far`
- 面向重复查询的嵌入缓存优化

自 v0.5.0 起可用。

</Accordion>

<Accordion title="在自定义网关上，我的 NER 抽取器会静默回退到模式模式" icon="triangle-exclamation">

已在 **v0.5.0** 中修复。对于不兼容的网关，现在会有条件地省略 `response_format=json_object` 参数，并自动应用纯 `generate()` 加 JSON 解析的兜底方案。升级即可修复：

```bash
pip install --upgrade semantica
```

</Accordion>

</AccordionGroup>


## 技术

<AccordionGroup>

<Accordion title="支持哪些图数据库？" icon="diagram-project">

- **Neo4j**：行业标准，Cypher 查询语言
- **FalkorDB**：Redis 协议，超低延迟
- **Apache AGE**：PostgreSQL 扩展，OpenCypher
- **Amazon Neptune**：托管式 AWS 服务，支持 SPARQL 与 Gremlin
- **NetworkX**：内存模式，适用于开发和小规模图

</Accordion>

<Accordion title="有哪些可用的导出格式？" icon="file-export">

RDF（Turtle、JSON-LD、N-Triples、XML）、Apache Parquet、ArangoDB AQL、Apache Arrow、LPG、CSV、YAML、OWL 本体以及距离矩阵。

</Accordion>

<Accordion title="支持哪些向量存储？" icon="server">

FAISS、Pinecone、Weaviate、Qdrant、Milvus、PgVector 以及内存模式。所有后端共享同一套 `VectorStore` API：只需改一行即可切换。

</Accordion>

<Accordion title="支持哪些 LLM 提供方？" icon="microchip">

Groq、OpenAI、Anthropic、Google Gemini、Ollama（完全本地）、DeepSeek、Novita AI、LiteLLM（通过单一接口支持 100+ 模型），以及任何兼容 OpenAI 的网关。

</Accordion>

<Accordion title="Semantica 可用于生产环境吗？" icon="shield-check">

可以。每个版本都附带：

- 1,000+ 通过的测试，并每周在 Python 3.10–3.13 上验证安装
- `PipelineValidator` 与 `FailureHandler`，支持指数退避和可配置的重试策略
- 跨所有模块的 W3C PROV-O 溯源追踪
- 基于 SHA-256 校验和与完整审计轨迹的变更管理
- 持续的安全加固：eval 注入、pickle 反序列化、SQL 注入、XXE、SSRF、ReDoS 和路径遍历等修复均已落地于近期版本（见 [CHANGELOG](https://github.com/semantica-agi/semantica/blob/main/CHANGELOG.md) 的安全章节）

</Accordion>

</AccordionGroup>


## 故障排查

<AccordionGroup>

<Accordion title="ModuleNotFoundError: No module named 'semantica'" icon="xmark-circle">

请确认已激活正确的 Python 环境：

```bash
pip list | grep semantica
pip install --upgrade semantica
```

</Accordion>

<Accordion title="安装因依赖错误而失败" icon="xmark-circle">

```bash
pip install --upgrade pip wheel
pip install semantica
```

如果在 Windows 上 `[all]` 安装失败，请改为逐个安装 extra。

</Accordion>

<Accordion title="处理过程中出现内存错误" icon="memory">

减小批大小、启用流式摄取，或切换到持久化图后端：

```python
from semantica.graph_store import FalkorDBStore
store   = FalkorDBStore(host="localhost", port=6379)
builder = GraphBuilder(merge_entities=True, graph_store=store)
```

</Accordion>

<Accordion title="嵌入或推理速度慢" icon="gauge-high">

安装 GPU 支持并确认 CUDA 可用：

```bash
pip install "semantica[gpu]"
nvidia-smi  # confirm GPU is visible
```

</Accordion>

<Accordion title="Windows 上 Unicode / cp1252 崩溃" icon="windows">

已在 **v0.5.0** 中修复。请升级，或为旧版本设置编码环境变量：

```bash
pip install --upgrade semantica
# or for older versions:
set PYTHONIOENCODING=utf-8
```

</Accordion>

</AccordionGroup>


## 支持

- [Discord](https://discord.gg/sV34vps5hH)：社区聊天与实时支持。
- [GitHub Issues](https://github.com/semantica-agi/semantica/issues)：缺陷报告与功能请求。
- [贡献指南](/zh/contributing-guide)：帮助改进 Semantica。