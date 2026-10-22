---
title: "欢迎使用 Semantica"
description: "面向高风险领域的 AI 上下文与语义层:上下文图、决策智能与完整溯源。"
sourceHash: "efa4fc2fac9be74415dd71538524663847ea1ae6485ff20e1c8d29f8e298ce63"
---

```bash
pip install semantica
```

大多数 AI 代理依赖的是嵌入向量,而不是语义:相似度分数没有结构、没有关系,也无法解释结果为什么出现。

Semantica 是位于 LLM、向量库与代理框架之下的语义与上下文层。它是确定性的基础设施,而不是模型本身:图构建、推理与溯源都无需 LLM 参与。它把分散的企业数据转化为结构化、可查询的上下文图与知识图谱,并由本体、分类法和受控词表(OWL、SHACL、SKOS)治理,让数据的含义显式存在,而不是由嵌入近似表达。

溯源与审计轨迹不是附加功能。一旦数据具备这种结构,它们就自然产生:支撑检索与推理的同一张图,也能在监管者询问「为什么」时给出直接答案。

## 你将获得

- **上下文图**:持久、可查询的图,记录代理所知、所决策与所推理的一切
- **决策智能**:`record_decision()` 捕获每个决策的完整生命周期与因果链
- **完整溯源**:每条事实都能回溯到来源,兼容 W3C PROV-O,可直接用于 HIPAA、SOX 与 GDPR 审计
- **可解释推理**:前向链、Datalog 与 SPARQL,每条推导路径都可检视
- **时间智能**:Allen 区间代数与时间点快照,让图不仅知道「什么」,也知道「何时」

## 快速开始

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore
from semantica.llms import OpenAI

context = AgentContext(
    vector_store=VectorStore(backend="faiss", dimension=1536),
    knowledge_graph=ContextGraph(advanced_analytics=True),
    decision_tracking=True,
    llm=OpenAI(model="gpt-4o"),
)

context.store("GPT-4 outperforms GPT-3.5 on reasoning benchmarks by 40%")

decision_id = context.record_decision(
    category="model_selection",
    scenario="Choose LLM for production reasoning pipeline",
    reasoning="GPT-4 benchmark advantage justifies 3x cost increase",
    outcome="selected_gpt4",
    confidence=0.91,
)

precedents = context.find_precedents("model selection reasoning", limit=5)
influence = context.analyze_decision_influence(decision_id)
```

> 中文文档正在逐步翻译中。当前仅提供概览页;完整的快速开始、模块参考、API 参考与 Cookbook 将按批次补齐。
