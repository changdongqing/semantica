---
title: "社区项目"
description: "由 Semantica 社区构建的项目、扩展和集成。"
icon: "people-group"
sourceHash: "2d4be335dbcd198a5fcccbb076d0eeb316b1d64c56362da20eb06d7497b9c9cb"
---

<Tip>
  正在使用 Semantica 构建项目？[在 GitHub 上提交](https://github.com/semantica-agi/semantica/issues/new?template=community_project.md)：我们很乐意在这里展示它。
</Tip>

Semantica 被广泛应用于学术界、企业和独立研究。以下是社区正在构建的生态系统的快照。


## 使用 Semantica 的项目

### 研究与学术界

学术界团队正在使用 Semantica 从非结构化科学文献中构建结构化、可审计的知识。

- **学术文献映射**：构建跨多年语料库且带时间溯源的引文图
- **生物医学知识图谱**：连接来自 PubMed 和预印本源的基因、蛋白质、药物和疾病
- **社交网络分析**：在实体关联的交互图上进行社区发现和影响力分析
- **计算语言学**：面向下游 NLP 任务的共指消解流水线，输出实体关联结果

### 企业与行业

生产部署覆盖受监管和高风险行业，在这些行业中，AI 问责制并非可选。

- **商业智能**：基于申报文件、报告和内部文档构建的企业知识库
- **网络安全与威胁情报**：对手归因图、关联 CVE 的威胁情报源、事件时间线
- **医疗保健与临床 AI**：患者安全图、药物相互作用知识库、符合 HIPAA 的审计轨迹
- **金融服务**：欺诈检测图、监管合规流水线（SOX/GDPR/MiFID II）、风险血缘
- **法律与合规**：合同分析流水线、监管变更跟踪、有证据支撑的研究图
- **关键基础设施**：供应链风险图、能源电网事件图、物流溯源

### 独立与开源

- **GraphRAG 工具包**：基于 Semantica 的 `context` + `vector_store` 模块构建的自定义检索层
- **领域特定提取器**：用于临床、法律和科学文本的 NER 和关系提取器
- **时序图仪表板**：使用 Semantica 的 `TemporalKnowledgeGraph` + 自定义可视化适配器构建的可视化时间线


## 支持的集成

<Tabs>
  <Tab title="向量数据库">
    | 存储 | 说明 |
    | :---- | :---- |
    | **FAISS** | 进程内，CPU/GPU |
    | **Pinecone** | 托管向量云服务 |
    | **Weaviate** | Schema 优先的混合搜索 |
    | **Qdrant** | 高性能 Rust 原生 |
    | **Milvus** | 企业级分布式 |
    | **PgVector** | 面向 SQL 技术栈的 Postgres 原生 |
  </Tab>
  <Tab title="图数据库">
    | 存储 | 说明 |
    | :---- | :---- |
    | **Neo4j** | 行业标准，Cypher 查询 |
    | **FalkorDB** | Redis 协议，低延迟 |
    | **Apache AGE** | PostgreSQL 扩展，OpenCypher |
    | **Amazon Neptune** | AWS 托管，SPARQL + Gremlin |
  </Tab>
  <Tab title="LLM 提供商">
    | 提供商 | 说明 |
    | :-------- | :---- |
    | **OpenAI** | GPT-4o、GPT-4、GPT-3.5 |
    | **Anthropic** | Claude Opus、Sonnet、Haiku |
    | **Google Gemini** | Gemini Pro 及其他 Gemini 模型 |
    | **Groq** | LLaMA、Mixtral（快速推理） |
    | **Ollama** | 完全本地，气隙隔离 |
    | **HuggingFace** | 基于 Transformers 的本地 LLM 模型 |
    | **DeepSeek** | deepseek-chat 和推理模型 |
    | **Novita AI** | OpenAI 兼容网关，默认 DeepSeek-V3.2 |
    | **LiteLLM** | 100+ 模型网关 |
  </Tab>
  <Tab title="NLP 库">
    | 库 | 说明 |
    | :------- | :---- |
    | **spaCy** | 生产级 NER 和依存句法分析 |
    | **NLTK** | 分词和特征提取 |
    | **Sentence Transformers** | 语义嵌入 |
    | **FastEmbed** | 轻量、快速推理 |
  </Tab>
</Tabs>


## 社区扩展

插件系统（`PluginRegistry`）让添加新能力变得简单，无需修改核心代码。社区已经构建了：

- **自定义实体提取器**：面向临床实体、法律条款类型和金融工具的领域特定 NER
- **导出适配器**：面向专有行业系统的专用序列化格式
- **摄取器插件**：适用于 SharePoint、Notion、Confluence 和自定义数据库的适配器
- **可视化插件**：使用 Plotly、D3.js 和自定义图渲染器增强的仪表板
- **评估框架**：使用 `semantica.evals` 的领域特定精确率/召回率基准


## 构建你自己的扩展

任何 Semantica 组件都可以通过注册表模式进行扩展：

```python
from semantica.ingest.registry import method_registry

def my_ingestor(source):
    return [{"text": "...", "metadata": {}, "source": source}]

method_registry.register("file", "my_format", my_ingestor)
```

完整扩展指南请参见 [架构](/zh/architecture#extension-points)。


## 如何贡献

- [贡献指南](/zh/contributing-guide)：提交代码、文档、测试或 cookbook 笔记本。
- [GitHub Issues](https://github.com/semantica-agi/semantica/issues)：报告错误、请求功能或提议集成。
- [Discord](https://discord.gg/sV34vps5hH)：与社区分享你正在构建的内容。
- [GitHub Discussions](https://github.com/semantica-agi/semantica/discussions)：长篇问题、设计讨论和想法。