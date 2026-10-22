---
title: "深入学习"
description: "结构化学习路径、配置参考、故障排查与性能指导。"
icon: "graduation-cap"
sourceHash: "c94a2097ffb868fb2b3f66815b9e93d6ba8b24b0c22cfc256846e5552842ecf3"
---

无论你是在运行第一条流水线，还是正在生产环境中部署 Semantica，本页都会提供一条结构化的前进路径：从初学者到企业级用法。


## 学习路径

- **初学者（1–2 小时）**：初次接触 Semantica 和知识图谱。[从安装开始 →](/zh/installation)
- **中级（4–6 小时）**：熟悉基础知识，正在构建真实应用。[从模块开始 →](/zh/modules)
- **高级（8+ 小时）**：企业部署、自定义与扩展。[从架构开始 →](/zh/architecture)

<Tabs>
  <Tab title="初学者（1–2 小时）">
    初次接触 Semantica 和知识图谱。无需具备图数据库经验。

    <Steps>
      <Step title="设置环境">
        [安装指南](/zh/installation)：虚拟环境、可选依赖项、平台特定修复。
      </Step>
      <Step title="理解核心概念">
        [核心概念](/zh/concepts)：什么是知识图谱、嵌入如何工作、抽取做什么。
      </Step>
      <Step title="运行第一个示例">
        [开始使用](/zh/getting-started)：5 分钟代码演示，使用基于模式的抽取（无需 API 密钥）。
      </Step>
      <Step title="构建你的第一个知识图谱">
        [快速入门教程](/zh/quickstart)：从摄取到可视化的完整 6 步流水线。
      </Step>
      <Step title="交互式探索">
        [欢迎使用 Semantica notebook](https://github.com/semantica-agi/semantica/blob/main/cookbook/introduction/01_Welcome_to_Semantica.ipynb)：逐个模块的 Jupyter 演示。
      </Step>
    </Steps>
  </Tab>
  <Tab title="中级（4–6 小时）">
    熟悉基础知识，正在构建真实应用。假定你已完成初学者路径。

    <Steps>
      <Step title="学习每个模块">
        [模块指南](/zh/modules)：全部 27 个模块，包含代码示例和常用流水线链。
      </Step>
      <Step title="构建生产级知识图谱">
        [构建知识图谱 notebook](https://github.com/semantica-agi/semantica/blob/main/cookbook/introduction/07_Building_Knowledge_Graphs.ipynb)：多源、去重、冲突解决。
      </Step>
      <Step title="添加语义搜索">
        [嵌入生成 notebook](https://github.com/semantica-agi/semantica/blob/main/cookbook/introduction/12_Embedding_Generation.ipynb)：生成嵌入、提供商与模型切换、维度。然后 [向量存储 notebook](https://github.com/semantica-agi/semantica/blob/main/cookbook/introduction/13_Vector_Store.ipynb)：存储和搜索向量以进行检索。
      </Step>
      <Step title="多源集成">
        [多源数据集成 notebook](https://github.com/semantica-agi/semantica/blob/main/cookbook/advanced/06_Multi_Source_Data_Integration.ipynb) 用于多源集成模式。
      </Step>
    </Steps>
  </Tab>
  <Tab title="高级（8+ 小时）">
    企业部署、自定义与扩展。假定你具备生产使用经验。

    <Steps>
      <Step title="理解架构">
        [架构指南](/zh/architecture)：四层设计、扩展点和设计决策。
      </Step>
      <Step title="时序智能">
        [时序图 notebook](https://github.com/semantica-agi/semantica/blob/main/cookbook/advanced/10_Temporal_Knowledge_Graphs.ipynb)：`valid_from`/`valid_until`、Allen 区间代数、时间点查询。
      </Step>
      <Step title="本体驱动的知识库">
        [本体 notebook](https://github.com/semantica-agi/semantica/blob/main/cookbook/introduction/14_Ontology.ipynb)：自动生成、SHACL 验证、Ontology Hub。
      </Step>
      <Step title="高级可视化">
        [完整可视化套件 notebook](https://github.com/semantica-agi/semantica/blob/main/cookbook/advanced/03_Complete_Visualization_Suite.ipynb)：UMAP、t-SNE、社区布局、嵌入投影。
      </Step>
      <Step title="企业级导出">
        [多格式导出 notebook](https://github.com/semantica-agi/semantica/blob/main/cookbook/advanced/05_Multi_Format_Export.ipynb)：带 PROV-O 的 RDF、Parquet、Neo4j Cypher、Arrow、OWL。
      </Step>
    </Steps>
  </Tab>
</Tabs>


## 配置参考

所有设置均可通过环境变量覆盖：无需更改代码。

| 设置 | 环境变量 | 默认值 |
| :------- | :-------------------- | :------- |
| OpenAI API 密钥 | `OPENAI_API_KEY` | `None` |
| Groq API 密钥 | `GROQ_API_KEY` | `None` |
| Anthropic API 密钥 | `ANTHROPIC_API_KEY` | `None` |
| 图存储后端 | `GRAPH_STORE_DEFAULT_BACKEND` | `"neo4j"` |
| 向量存储后端 | `VECTOR_STORE_DEFAULT_BACKEND` | `"faiss"` |
| 服务器主机 | `SEMANTICA_HOST` | `"127.0.0.1"` |
| 服务器 API 密钥 | `SEMANTICA_API_KEY` | `None` |


## 故障排查

<AccordionGroup>

<Accordion title="ModuleNotFoundError: No module named 'semantica'" icon="circle-xmark">

验证安装情况，并确认已激活正确的 Python 环境：

```bash
pip list | grep semantica
pip install --upgrade semantica
```

如需可选功能，请安装相应的额外依赖项：

```bash
pip install "semantica[llm-openai]"   # OpenAI provider
pip install "semantica[gpu]"          # GPU acceleration
```

</Accordion>

<Accordion title="AuthenticationError" icon="lock">

将 API 密钥设置为环境变量（切勿在源文件中硬编码密钥）：

```bash
export OPENAI_API_KEY="sk-..."
export GROQ_API_KEY="gsk_..."
```

</Accordion>

<Accordion title="MemoryError 或 OOM 崩溃" icon="memory">

从默认的内存型 NetworkX 后端切换到持久化图数据库：

```python
from semantica.graph_store import FalkorDBStore
from semantica.kg import GraphBuilder

store   = FalkorDBStore(host="localhost", port=6379)
builder = GraphBuilder(merge_entities=True, graph_store=store)
```

同时减小批大小，并为大型语料库启用流式摄取。

</Accordion>

<Accordion title="大型数据集处理缓慢" icon="gauge">

启用并行执行和 GPU 加速：

```python
from semantica.pipeline import ParallelismManager, Task

# Run pipeline tasks concurrently across worker threads
manager = ParallelismManager(max_workers=8)
tasks = [
    Task("task_1", lambda: "process part 1"),
    Task("task_2", lambda: "process part 2"),
]
results = manager.execute_parallel(tasks)
```

```bash
pip install "semantica[gpu]"  # CUDA-backed embeddings
```

</Accordion>

<Accordion title="Windows [all] 安装失败" icon="windows">

升级到最新版本：

```bash
pip install --upgrade semantica
```

或单独安装额外依赖：`pip install semantica`，然后按需添加 `[llm-openai]`、`[gpu]` 等。

</Accordion>

<Accordion title="Windows 上 cp1252 编码崩溃" icon="windows">

设置编码环境变量：

```bash
set PYTHONIOENCODING=utf-8
```

</Accordion>

</AccordionGroup>


## 性能优化

<AccordionGroup>

<Accordion title="后端选择：开发环境与生产环境" icon="server">

| 操作 | NetworkX（默认） | Neo4j / FalkorDB |
| :--------- | :------------------ | :---------------- |
| 图构建 | 快 | 中等 |
| 查询性能 | 中等 | 快 |
| 可扩展性 | 仅内存 | 持久化，生产规模 |
| 推荐用于 | 开发、小型图 | 生产、大型语料库 |

本地开发和原型设计使用 NetworkX。部署到生产环境前，切换到持久化后端。

</Accordion>

<Accordion title="大型语料库批处理" icon="layer-group">

分批处理文档，而不是逐份处理。将大型文本切分为分块，并批量抽取实体：

```python
from semantica.split import TextSplitter
from semantica.semantic_extract import NERExtractor

document_text = "Acme Corp announced record revenue in Seattle. CEO Jane Doe presented results."
splitter = TextSplitter(chunk_size=1000, chunk_overlap=100)
chunks = splitter.split(document_text)

extractor = NERExtractor()
batch_entities = extractor.extract_entities_batch([c.text for c in chunks])
```

</Accordion>

<Accordion title="去重 v2：最高提速 7×" icon="bolt">

如果去重成为瓶颈，请在相似度评分前使用候选分块，以减少 O(n²) 次比较：

```python
from semantica.deduplication import DuplicateDetector, EntityMerger

entities = [
    {"id": "1", "name": "Acme Corp", "type": "Company"},
    {"id": "2", "name": "Acme Corporation", "type": "Company"},
    {"id": "3", "name": "Globex", "type": "Company"},
]

# Fast candidate blocking for large entity sets
detector = DuplicateDetector(similarity_threshold=0.8)
duplicates = detector.detect_duplicates(entities, candidate_strategy="blocking_v2")

merger = EntityMerger()
merged = merger.merge_duplicates(entities, strategy="keep_most_complete")
```

`blocking_v2` 和 `hybrid_v2` 候选策略会在计算细粒度相似度之前过滤候选对。

</Accordion>

</AccordionGroup>


## 安全最佳实践

- **API 密钥**：存储在环境变量或密钥管理器中；切勿提交到版本控制；按计划轮换
- **敏感数据**：对 PII 或机密内容使用本地嵌入模型（Ollama、HuggingFace）；未经数据处理协议，避免将敏感数据发送到外部 API
- **图导出**：对敏感导出内容进行静态加密；配置自定义 LLM 网关时，使用 SSRF 安全的 `base_url` 校验
- **XML 摄取**：始终使用 `XMLIngestor`，它使用可防 XXE 的 lxml 后端；切勿使用标准库解析器解析不受信任的 XML

- [Cookbook](/zh/cookbook)：从入门到高级的交互式 Jupyter notebook。
- [FAQ](/zh/faq)：常见问题解答。
- [API 参考](/zh/reference/core)：完整技术文档。