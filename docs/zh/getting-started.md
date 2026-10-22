---
title: "快速入门"
description: "面向 AI 的上下文与智能层：将原始数据转化为可解释、可审计的知识图谱。"
icon: "rocket"
sourceHash: "2b7def45b1f3c3a83a6ced187e4dd5838c161aef3c34b4646a781be510149f9c"
---

<Tip>
  已经安装好了？直接跳到[快速入门](/zh/quickstart)。需要先了解安装步骤？参见[安装](/zh/installation)。
</Tip>

## 你可以构建什么

- **GraphRAG 系统** —— 让 LLM 的回答建立在可追溯的结构化知识之上。每个论断都可回溯到源节点。
- **可问责的 AI Agent** —— 具备结构化决策历史、因果链和先例搜索能力的 Agent。每一次选择都被记录且可审计。
- **生产级知识图谱** —— 从多源数据构建、验证并维护企业级语义知识库。
- **合规就绪的 AI** —— 每个事实都带有 W3C PROV-O 溯源。内置 HIPAA、SOX、GDPR、FDA 21 CFR Part 11 所需的基础设施。


## 三步完成设置

<Steps>
  <Step title="安装 Semantica">
    <CodeGroup>

    ```bash pip (recommended)
    pip install semantica
    ```

    ```bash With all extras
    pip install semantica[all]
    ```

    ```bash From source
    git clone https://github.com/semantica-agi/semantica.git
    cd semantica
    pip install -e . --group dev   # needs pip 25.1+ (or: uv sync)
    ```

    </CodeGroup>

    <Check>
      验证安装：
      ```python
      import semantica
      print(semantica.__version__)  # 0.7.0
      ```
    </Check>
  </Step>

  <Step title="选择你的路径">
    挑选与你正在构建的内容相匹配的路线：每条路线都从一个聚焦的 5 分钟示例开始。

    | 路径 | 你想要…… | 从这里开始 |
    | :----- | :-------------- | :--------- |
    | **知识图谱** | 将文档转化为结构化、可查询的图谱 | [快速入门 → 步骤 1](/zh/quickstart) |
    | **Agent 上下文** | 为你的 AI Agent 提供持久记忆和决策追踪 | [上下文参考](/zh/reference/context) |
    | **GraphRAG** | 让 LLM 的回答建立在结构化知识之上 | [概念 → GraphRAG](/zh/concepts#graphrag) |
    | **MCP 集成** | 在 Claude Desktop 或 VS Code 中使用 Semantica | [MCP Server](/zh/reference/mcp_server) |

  </Step>

  <Step title="运行流水线">
    完整的 6 步流水线——摄取、解析、抽取、构建、可视化、导出——见[快速入门](/zh/quickstart)。使用基于模式的抽取方式（无需 API key），耗时不到 5 分钟。

    <Note>
      对于快速入门，LLM API key 是**可选的**。基于模式的抽取开箱即用：等你准备好后，可升级到 LLM 抽取以获得更高准确率。
    </Note>
  </Step>
</Steps>


## 选择你的路径

<Tabs>
  <Tab title="知识图谱">
    从任意文档或数据源构建结构化知识图谱。

    ```python
    from semantica.ingest import FileIngestor
    from semantica.parse import DocumentParser
    from semantica.semantic_extract import NERExtractor, RelationExtractor
    from semantica.kg import GraphBuilder

    # 1. Ingest
    sources = FileIngestor().ingest("data/report.pdf")

    # 2. Parse (extract_text returns a plain string for any supported format)
    text = DocumentParser().extract_text(sources[0].path)

    # 3. Extract (extractors take text, return Entity / Relation objects)
    ner           = NERExtractor(method="pattern")  # no API key needed
    entities      = ner.extract(text)
    relationships = RelationExtractor(method="pattern").extract(text, entities=entities)

    # 4. Build
    graph = GraphBuilder(merge_entities=True).build(
        {"entities": entities, "relationships": relationships}
    )
    print(f"{len(graph['entities'])} nodes, {len(graph['relationships'])} edges")
    ```

    **下一步：**[完整流水线演练 →](/zh/quickstart)
  </Tab>

  <Tab title="Agent 上下文">
    为你的 Agent 提供持久记忆、决策追踪和先例搜索能力。

    ```python
    from semantica.context import AgentContext, ContextGraph
    from semantica.vector_store import VectorStore

    context = AgentContext(
        vector_store=VectorStore(backend="faiss", dimension=768),
        knowledge_graph=ContextGraph(advanced_analytics=True),
        decision_tracking=True,
    )

    # Store a fact with provenance
    context.store("GPT-4 outperforms GPT-3.5 on reasoning by 40%")

    # Record a decision with full causal chain
    decision_id = context.record_decision(
        category="model_selection",
        scenario="Choose LLM for production pipeline",
        reasoning="GPT-4 benchmark advantage justifies cost",
        outcome="selected_gpt4",
        confidence=0.91,
    )

    # Search past decisions before making a new one
    precedents = context.find_precedents("model selection", limit=5)
    ```

    **下一步：**[上下文模块参考 →](/zh/reference/context)
  </Tab>

  <Tab title="GraphRAG">
    让每一次 LLM 响应都建立在你的知识图谱之上：不再有凭空出现的断言。

    ```python
    from semantica.context import AgentContext, ContextGraph
    from semantica.vector_store import VectorStore

    context = AgentContext(
        vector_store=VectorStore(backend="faiss", dimension=768),
        knowledge_graph=ContextGraph(advanced_analytics=True),
        graph_expansion=True,       # blend graph traversal into retrieval
        max_expansion_hops=3,       # how far to walk from the seed nodes
    )

    # store() runs extraction and populates both the vector index and the graph
    context.store([
        {"content": "Steve Wozniak co-founded Apple with Steve Jobs in 1976."},
        {"content": "Tony Fadell led the iPod team at Apple, then founded Nest."},
    ])

    # GraphRAG retrieval: seed from vector matches, expand along graph edges
    results = context.retrieve(
        "What companies were founded by people who worked at Apple?",
        use_graph=True,
        expand_graph=True,
    )
    for r in results:
        print(f"[{r['score']:.3f}]  {r['content'][:70]}  (source: {r['source']})")
    ```

    每个结果都带有 `content`、`score`、`source` 和 `metadata`。若需要一条有依据的自然语言回答外加可审计的遍历过程，请使用
    `context.query_with_reasoning(query, llm_provider=...)` —— 它会返回
    `response`、`reasoning_path`、`sources` 和 `confidence`。

    **下一步：**[GraphRAG 概念 →](/zh/concepts#graphrag)
  </Tab>

  <Tab title="MCP 集成">
    在 Claude Desktop、VS Code、Cursor 或任意 MCP 客户端中使用 Semantica：完成设置后无需编写任何 Python 代码。

    ```bash
    pip install semantica
    ```

    添加到你的 MCP 客户端配置中：

    ```json
    {
      "mcpServers": {
        "semantica": {
          "command": "semantica-mcp"
        }
      }
    }
    ```

    立即获得 15 个工具：抽取实体、查询图谱、记录决策、运行推理、导出结果。

    **下一步：**[MCP Server 参考 →](/zh/reference/mcp_server)
  </Tab>
</Tabs>


## 核心架构

Semantica 采用模块化、分层的架构：只导入你需要的部分。

- **[输入层](/zh/reference/ingest)** —— 从任意数据源加载并准备数据。模块：`ingest`、`parse`、`split`、`normalize`
- **[语义层](/zh/reference/semantic_extract)** —— 从原始文本中抽取语义。模块：`semantic_extract`、`kg`、`ontology`、`reasoning`
- **[存储层](/zh/reference/vector_store)** —— 持久化知识以供检索。模块：`embeddings`、`vector_store`、`graph_store`、`triplet_store`
- **[质量层](/zh/reference/deduplication)** —— 校验与去重。模块：`deduplication`、`conflicts`
- **[上下文层](/zh/reference/context)** —— 追踪决策与血缘。模块：`context`、`provenance`、`change_management`
- **[输出层](/zh/reference/export)** —— 将结果交付至下游。模块：`export`、`visualization`、`pipeline`、`explorer`


## 我需要哪个模块？

参见[选择合适的模块](/zh/choose-your-module)指南——它将 35 个以上的开发目标映射到全部 27 个模块中合适的起点，并为最常见的路径提供了可直接运行的代码。


## 后续步骤

- [核心概念](/zh/concepts) —— 深入讲解知识图谱、本体与推理。
- [快速入门教程](/zh/quickstart) —— 完整的 6 步流水线演练，附可直接运行的代码。
- [模块参考](/zh/modules) —— 逐一讲解每个模块、类与常用链路。
- [API 参考](/zh/reference/context) —— 每个类和方法的完整模块文档。


## 帮助

- [Discord](https://discord.gg/sV34vps5hH) —— 提问、分享项目、获取社区支持。
- [GitHub Issues](https://github.com/semantica-agi/semantica/issues) —— 报告 bug 或请求新功能。
- [FAQ](/zh/faq) —— 常见问题解答。