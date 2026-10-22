---
title: "架构"
description: "四层模块化架构，专为独立组件使用、清晰的关注点分离和完全可扩展性而设计。"
icon: "building"
sourceHash: "ea73dba53b60dce7d00679d0438173d083c7605593111def3c3b6de171cdfbb1"
---

Semantica 围绕四层模块化架构构建。只导入你所需的部分：框架从不强制使用完整技术栈。每个组件都可独立替换，每一层都通过清晰的接口通信，不存在隐式耦合。


## 四层架构

<img src="/assets/img/diagrams/architecture-overview.svg" alt="Semantica 四层架构" style={{ width: '100%', borderRadius: '12px', margin: '16px 0 24px' }} />

<Tabs>

<Tab title="第 1 层：摄取">

将任意来源的数据作为统一的 `SourceDocument` 加载到管道中。

| 来源 | 模块 | 说明 |
| :------ | :------ | :----- |
| PDF, DOCX, PPTX, HTML, JSON, CSV | `ingest.FileIngestor` | 支持归档文件、递归目录扫描 |
| Parquet | `ingest.ParquetIngestor` | PyArrow、Hive 风格分区（v0.5.0） |
| XML | `ingest.XMLIngestor` | XXE 安全的 lxml、XSD/DTD 验证（v0.5.0） |
| Web 页面 | `ingest.WebIngestor` | 可配置深度、链接过滤 |
| SQL / Snowflake / Databricks | `ingest.DBIngestor` / `ingest.SnowflakeIngestor` / `ingest.DatabricksIngestor` | 自定义 SQL、模式内省、Unity Catalog 血缘 |
| Kafka / 流 | `ingest.StreamIngestor` | 实时馈送摄取 |
| 电子邮件 | `ingest.EmailIngestor` | IMAP/SMTP，支持附件提取 |
| 代码仓库 | `ingest.RepoIngestor` | Git 仓库、代码结构 |
| MCP | `ingest.MCPIngestor` | Model Context Protocol 来源 |

</Tab>

<Tab title="第 2 层：处理">

将原始文本转换为结构化、经增强的文档，为知识存储摄取做好准备。

| 步骤 | 模块 | 作用 |
| :---- | :------ | :------------ |
| 解析 | `parse.DocumentParser` / `parse.DoclingParser` | 文本与布局抽取、表格检测 |
| 规范化 | `normalize` | 规范形式、日期/名称标准化、编码修复 |
| 抽取 | `semantic_extract` | NER、关系抽取、事件检测、三元组 |
| 构建 | `kg.GraphBuilder` | 实体合并、边构建、图组装 |
| 质量保证 | `deduplication`, `conflicts` | 重复检测、冲突消解、验证 |

</Tab>

<Tab title="第 3 层：智能">

持久化知识存储与嵌入基础设施，为检索和推理提供支持。

| 组件 | 模块 | 描述 |
| :--------- | :------ | :----------- |
| 知识图谱 | `kg` | 图构建、时间模型、分析、Distance Intelligence |
| 向量存储 | `vector_store` | pgvector、Qdrant、Weaviate、Pinecone：语义相似度搜索 |
| 本体 | `ontology` | OWL/RDFS 建模、SHACL 验证、本体对齐 |
| 三元组存储 | `triplet_store` | RDF 三元组存储与 SPARQL 查询 |
| 嵌入 | `embeddings` | Sentence-Transformers、FastEmbed、OpenAI、BGE |
| 时间 | `kg.TemporalKnowledgeGraph` | `valid_from` / `valid_until`、Allen 区间代数（v0.4.0） |

</Tab>

<Tab title="第 4 层：应用">

消费知识图谱和向量存储，以支持下游用例。

| 用例 | 模块 | 描述 |
| :-------- | :------ | :----------- |
| GraphRAG | `context.AgentContext` | 面向 LLM、以图为依据的检索 |
| 智能体记忆 | `context.ContextGraph` | 跨智能体运行的持久语义记忆 |
| 决策追踪 | `context.AgentContext` | 记录、追踪并审计每个智能体决策 |
| Ontology Hub | `explorer` | 可视化编辑器、SHACL Studio、对齐 UI（v0.5.0） |
| 多智能体 | `integrations.agno` | 共享上下文、团队级记忆、KG 工具包 |
| 可视化 | `visualization` | 交互式 HTML 图、嵌入图、时间视图 |
| 导出 | `export` | RDF、Parquet、ArangoDB AQL、OWL、CSV、Arrow |
| 推理 | `reasoning` | 前向链、Rete、Datalog、SPARQL、溯因 |

</Tab>

</Tabs>


## 数据流

每条管道都遵循相同的线性路径，从原始来源到交付输出：

<img src="/assets/img/diagrams/pipeline-flow.svg" alt="Semantica 8 步管道：摄取 → 解析 → 规范化 → 抽取 → 构建 KG → 质量保证 → 存储 → 交付" style={{ width: '100%', borderRadius: '10px', margin: '16px 0 24px' }} />


## 模块映射

| 层 | 类别 | 模块 |
| :----- | :-------- | :------- |
| **第 1 层：摄取** | 来源 | `ingest`, `split` |
| **第 2 层：处理** | 转换 | `parse`, `normalize`, `semantic_extract`, `deduplication`, `conflicts` |
| **第 3 层：智能** | 存储 | `kg`, `vector_store`, `graph_store`, `triplet_store`, `embeddings`, `ontology` |
| **第 4 层：应用** | 交付 | `context`, `reasoning`, `export`, `visualization`, `explorer`, `pipeline` |
|: | 横切 | `provenance`, `change_management`, `llms`, `mcp_server`, `seed`, `evals`, `core`, `utils` |


## 扩展点

每一层都暴露基于注册表的扩展点。注册自定义实现后，它们无需修改核心代码即可参与完整管道。

<CodeGroup>

```python Custom Ingestor
from semantica.ingest.registry import method_registry

def custom_file_ingestor(source):
    # Return a list of document dicts with 'text', 'metadata', 'source'
    return [{"text": "...", "metadata": {}, "source": source}]

# Register under the "file" task category with a unique name
method_registry.register("file", "my_custom_format", custom_file_ingestor)

available = method_registry.list_all("file")
```

```python Custom Extractor
from semantica.semantic_extract.registry import method_registry

def custom_entity_extractor(text, config=None):
    # Return a list of entity dicts with 'text', 'type', 'confidence'
    return [{"text": "...", "type": "CUSTOM_TYPE", "confidence": 0.9}]

# Register under the "entity" extraction task
method_registry.register("entity", "my_extractor", custom_entity_extractor)
```

```python Custom Plugin
from semantica.core import PluginRegistry

class MyPlugin:
    def process(self, graph, config):
        # Modify the graph in place and return it
        return graph

registry = PluginRegistry()
registry.register_plugin("my_plugin", MyPlugin, version="1.0.0")
```

</CodeGroup>


## 设计决策

<AccordionGroup>

<Accordion title="模块化：只使用你所需的部分" icon="puzzle-piece">

每个组件都可独立工作。`NERExtractor` 无需图存储即可运行。`VectorStore` 无需决策追踪即可运行。框架从不强制实例化完整技术栈；你只需为导入的部分付出成本。

</Accordion>

<Accordion title="可插拔性：扩展而无需修改核心" icon="plug">

自定义摄取器、抽取器、验证器和导出器遵循相同的基类模式。通过 `PluginRegistry` 注册后，它们无需修改核心代码即可参与完整管道（包括溯源追踪、重试策略和并行执行）。

</Accordion>

<Accordion title="默认溯源" icon="link">

血缘追踪在最低层级内置于图构建中。每个节点和边都携带 `source_id`，指回原始文档、抽取方法和时间戳。无需选择启用；溯源始终开启。

</Accordion>

<Accordion title="配置优先于约定" icon="sliders">

集中式 `ConfigManager`，支持环境变量覆盖。没有魔法默认值；所有行为都是显式且可覆盖的。适用于开发、预发布和生产环境需要不同后端的多环境部署。

</Accordion>

</AccordionGroup>


## 性能特征

| 特性 | 机制 |
| :-------------- | :--------- |
| **并行执行** | `Pipeline(workers=N)`，每个阶段的工作进程数可配置 |
| **增量处理** | 增量图更新（新数据无需全量重算） |
| **流式摄取** | 处理大型语料库而无需将所有内容加载到内存 |
| **后端灵活性** | 无需更改 API 即可将内存中的 NetworkX 替换为 Neo4j / FalkorDB |
| **去重 v2** | `blocking_v2`、`hybrid_v2`、`semantic_v2`：比 v1 快达 7 倍 |
| **索引搜索** | Explorer 搜索在 118k 节点上为 0.004ms（v0.5.0） |

- [模块](/zh/modules)：完整的模块文档与代码示例。
- [了解更多](/zh/learning-more)：配置参考、性能指南和故障排查。
- [管道参考](/zh/reference/pipeline)：管道编排、工作进程和重试策略。
- [核心参考](/zh/reference/core)：框架生命周期、插件注册表和配置。