---
title: "LangChain 集成"
description: "通过 GraphRAG 检索器、VectorStore 适配器和智能体工具，将 Semantica 接入 LangChain / LangGraph 流水线。"
icon: "link"
sourceHash: "156e9af01b7825341e302e1936549fabb15601f2ce06c1376635428fe76a2eed"
---

> 三个即插即用适配器，将 Semantica 的上下文图与混合搜索引入 LangChain 链和 LangGraph 智能体。

## 安装

```bash
pip install "semantica[langchain]"
```

需要 `langchain-core >= 0.3`。如果未安装 langchain-core，该集成仍可导入。每个类都保留完整的 Semantica API，并会优雅降级（`build()` 返回 `None`；根据 `LANGCHAIN_AVAILABLE` 分支处理）。

## 组件概览

- **SemanticaRetriever**（`BaseRetriever`）：混合搜索为检索提供种子，然后沿图边遍历 `hops` 步（默认 2），以获得 GraphRAG 风格的结果。
- **SemanticaVectorStore**（`VectorStore`）：在 `HybridSearch` 之上提供 `add_texts` / `similarity_search` / `similarity_search_with_score` / `from_texts`。
- **SemanticaKGTool** / **SemanticaDecisionTool**（`BaseTool` 子类）：面向 LangGraph / 工具调用智能体的 `semantica_query_graph` 和 `semantica_query_decisions`。

## 组件详情

<Tabs>
  <Tab title="SemanticaRetriever">
    混合搜索为检索提供种子；随后沿图边遍历 `hops` 步，使结果超越扁平向量相似度。如果省略混合搜索或混合搜索失败，检索器会回退到 `ContextGraph.query` 关键词扫描。

    ```python
    from integrations.langchain import SemanticaRetriever
    from semantica.context import ContextGraph
    from semantica.vector_store import HybridSearch

    graph = ContextGraph()
    hybrid = HybridSearch()

    retriever = SemanticaRetriever(graph=graph, hybrid=hybrid, hops=2, top_k=10)

    from langchain.chains import RetrievalQA

    qa = RetrievalQA.from_chain_type(llm=llm, retriever=retriever)
    ```
  </Tab>
  <Tab title="SemanticaVectorStore">
    用于 RetrievalQA / LCEL 链的即插即用 `VectorStore`。`from_texts` 需要预先配置好的 `hybrid` 实例。

    ```python
    from integrations.langchain import SemanticaVectorStore

    store = SemanticaVectorStore(hybrid=hybrid)
    store.add_texts(
        ["document one", "document two"],
        metadatas=[{"source": "a"}, {"source": "b"}],
    )
    docs = store.similarity_search("document", k=2)
    docs, scores = store.similarity_search_with_score("document", k=2)
    ```

    `add_texts` 通过 `add_documents` 委托给 Semantica 向量存储（将 `vector_store=` 传给 `HybridSearch` 或 `SemanticaVectorStore`）。
  </Tab>
  <Tab title="智能体工具">
    实例是 LangChain 的 `BaseTool` 实例，可直接传递给智能体。`.build()` 返回该工具；当 langchain-core 缺失时返回 `None`。

    ```python
    from integrations.langchain import SemanticaKGTool, SemanticaDecisionTool
    from langgraph.prebuilt import create_react_agent

    tools = [
        SemanticaKGTool(graph),
        SemanticaDecisionTool(graph),
    ]
    agent = create_react_agent(model, tools)
    ```

    | 工具 | 描述 |
    | :------ | :------------- |
    | `semantica_query_graph` | 在共享上下文图上进行关键词 / 自然语言查询 |
    | `semantica_query_decisions` | 搜索已记录的决策日志 |
  </Tab>
</Tabs>