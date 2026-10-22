---
title: "LLM 集成"
description: "将 Semantica 连接到生成式 LLM 提供商，以及 TypeSafe Jev 的类型化决策。"
sourceHash: "bb6f342ab7895974927beb45909019ef83c62c210d4379746c8ce98167df5e42"
---

Semantica 为 Groq、OpenAI、Anthropic Claude、HuggingFace、Novita AI 以及通过 LiteLLM 访问的 100+ 提供商提供统一的生成接口——使用相同的 `.generate()`、`.generate_structured()` 和 `.generate_typed()` 方法。它还为 TypeSafe Jev 提供了一个刻意分离的、仅用于决策的接口，其类型化 Choice、Noul 和 Score 结果并不是文本生成。

## 什么是 LLM 集成？

`semantica.llms` 模块提供了一个用于连接大语言模型提供商的统一接口。无论你调用的是 Groq、OpenAI、Anthropic 还是本地 HuggingFace 模型，你都不需要为每个生成式提供商学习不同的 API，而是使用相同的方法（`.generate()`、`.generate_structured()`、`.generate_typed()`）。TypeSafe Jev 是仅用于决策的例外：它暴露 `.decide()`，因为它返回的是类型化决策而非生成的文本。

**跨生成式提供商的统一接口：** Semantica 中的生成式 LLM 提供商暴露相同的方法，因此从 OpenAI 切换到 Anthropic 只需更换提供商构造函数，而不需要改动应用代码。Jev 保持独立，这样其校准概率和严格的决策类型就不会被压平成一个聊天补全响应。

**提供商包装类与语义提取提供商字符串：** `semantica.llms` 中的类（`Groq`、`OpenAI`、`LiteLLM`、`HuggingFaceLLM`）是用于文本生成的 Python 对象。`semantica.semantic_extract` 模块则接受提供商名称字符串用于实体和关系提取。本指南涵盖这两种方式。

## 为什么使用 LLM 集成？

**提供商可移植性。** 用一个提供商测试，用另一个提供商部署。从用于原型的 Groq 切换到用于生产的 Anthropic，无需修改代码。

**降低供应商锁定。** 避免将应用绑定到单一 LLM 提供商的 API 上。如果定价变化或服务可用性出现问题，切换提供商很直接。

**一致的 API。** 在所有提供商上使用相同的 `.generate()`、`.generate_structured()` 和 `.generate_typed()` 方法，而无需学习各提供商特有的接口。

**多提供商工作流。** 在同一条流水线中，用快速模型做初始分类，用昂贵的前沿模型做复杂推理。

**本地与云端部署的灵活性。** 在开发阶段使用云提供商，在气隙生产环境中切换到本地 HuggingFace 模型。

## 何时使用 / 何时不使用

**以下场景使用 LLM 集成：**

- 文本生成、摘要和问答任务
- 需要自然语言理解的复杂推理
- 从非结构化文本中提取结构化数据
- 需要解释与综合的多步分析
- 上下文、歧义或领域知识很重要的任务

**以下场景确定性工具可能更好：**

- 正则表达式可以处理的模式匹配
- 具有明确规则的简单基于规则的分类
- 数学计算或统计分析
- 图遍历和关系查询
- 具有已知逻辑的数据转换

**以下场景可能不需要完整的 LLM：**

- 简单的关键词搜索或精确字符串匹配
- 具有预定义决策树的确定性工作流
- 高频、低延迟且推理开销重要的操作
- 可解释性要求透明的基于规则逻辑的任务

<Info>
  `semantica.llms` 中的生成式提供商（`Groq`、`OpenAI`、`LiteLLM`、`HuggingFaceLLM`）用于文本生成和 `query_with_reasoning()`。`Jev` 和 `AsyncJev` 仅用于决策，不能直接作为 `llm_provider=` 的值使用。对于结构化的实体和关系提取，`semantica.semantic_extract` 接受提供商名称字符串。
</Info>

## 选择提供商

选择提供商取决于四个因素，每个因素针对不同的用例进行优化：

**延迟**在实时 SOC 分流循环中最为重要，此时分析师正等待分流的裁决。Groq 的推理基础设施通常能在 300ms 内返回 8B 模型的响应，使其成为交互式工作流的理想选择。

**准确性**在高风险决策中最为重要：临床禁忌症检查、信贷委员会推理和法律文档分析。通过 `LiteLLM` 可用的 Claude 或 GPT-4 等前沿模型能提供最强的推理能力。

**数据驻留**约束会排除云提供商用于机密或受 HIPAA 监管的工作负载。使用本地模型路径的 `HuggingFaceLLM`，或将 `Ollama` 指向本地服务器，都能实现完全气隙的部署，无需网络调用。

**规模化成本**则倾向于 Novita AI 等高吞吐量提供商，用于每小时处理数千份文档的批量提取流水线——此时每 token 的成本会迅速累积。

统一接口意味着你可以用 Groq 快速原型、用 Claude 验证准确性，并部署到 Azure OpenAI 以满足合规要求——全程无需修改应用代码。

## 共享的生成接口

每个生成式提供商都暴露相同的方法：

```python
provider.generate(prompt: str, **kwargs) -> str
provider.generate_structured(prompt: str, **kwargs) -> dict | list
provider.generate_typed(prompt: str, schema: Type[BaseModel], max_retries: int = 3, **kwargs) -> BaseModel
provider.is_available() -> bool
```

`generate()` 返回一个纯字符串。`generate_structured()` 指示模型以 JSON 响应并返回解析后的结果——对于顶层 JSON 对象返回 `dict`，如果模型返回顶层 JSON 数组则返回 `list`。`generate_typed()` 接收一个 Pydantic 模型，根据该模型验证模型的输出，并在失败时将验证错误反馈回提示中，最多重试 `max_retries` 次——当下游代码需要保证形状而非尽力而为的 JSON 时，就该使用它。`is_available()` 让你在发起调用之前对提供商做健康检查——在重试逻辑和预热检查中很有用。

这意味着 Semantica 中任何接受生成式 LLM 的地方——`query_with_reasoning()`、语义提取、自定义推理循环——都能互换地接受这些提供商中的任意一个。Jev 不属于此接口，因为它从不返回自由文本。

## Jev——用于低延迟路由的类型化决策

**TypeSafe Jev** 是一个用于对应用状态做类型化决策的 System One 模型。当有效结果是预先已知时，使用它进行有界路由、分类、二值检查或打分。当任务需要解释、综合、开放式文本或多步推理时，则改用聊天 LLM。

<Warning>
  Jev 是一个实验性的、早期访问的提供商。固定并测试你的部署所使用的 SDK 版本，为你的领域选择置信度阈值，并为高影响决策保留人类或推理模型的升级路径。
</Warning>

<Warning>
  TypeSafe SDK 0.7 的线上日志在 `DEBUG` 级别下会包含完整的请求和响应体。由于 `state` 可能包含财务、安全或个人数据，在敏感部署中请将 `typesafe_sdk` 日志记录器保持在 `INFO` 或更高。将根日志记录器设置为 `DEBUG` 也可能暴露这些内容，除非 SDK 日志记录器已有显式更高的级别。
</Warning>

```python
import logging

logging.getLogger("typesafe_sdk").setLevel(logging.INFO)
```

在 Python 3.10 或更高版本上安装可选依赖：

```bash
pip install "semantica[llm-typesafe]"
```

设置 `TYPESAFE_API_KEY`，或显式传入 `api_key=`：

```python
from semantica.llms import Jev

jev = Jev(model="jev-latest")  # reads TYPESAFE_API_KEY

result = jev.decide(
    state={
        "amount_usd": 12_500,
        "destination_country": "US",
        "policy_flags": [],
    },
    question="How should this transaction be routed?",
    kind="choice",
    choices={
        "approve": "All automatic-approval requirements are met.",
        "escalate": "A person must review the transaction.",
    },
)

print(result.value)          # "approve" or "escalate"
print(result.confidence)     # routing certainty
print(result.probabilities) # full Choice distribution
print(result.request_id)     # retain for audit/support correlation
```

三种决策类型具有刻意不同的结果语义：

| 类型 | 输入条件 | `result.value` | 置信度语义 |
| :--- | :--- | :--- | :--- |
| Choice | 选项标签，可选带描述 | 选中的标签 | SDK 提供的置信度 |
| Noul | 可选的 `true` 和 `false` 描述 | 使用 0.5 边界的布尔值 | `abs(2 * probability - 1)`；`result.probability` 保留 yes 的原始概率 |
| Score | 有序的评分等级 | 概率加权的数值分数 | SDK 提供的置信度；完整分布和图例均保留 |

Semantica 负责围绕该决策的推理、策略检查、升级和溯源。提供商不会静默地调用回退模型：

```python
from semantica.context import ContextGraph

graph = ContextGraph()
threshold = 0.85

if result.confidence < threshold:
    route = "human_review"  # or invoke a reasoning LLM in caller code
else:
    route = str(result.value)

decision_id = graph.record_decision(
    category="transaction_routing",
    scenario="Route wire transfer after evidence and policy evaluation",
    reasoning="Semantica policy checks completed before the Jev routing step.",
    outcome=route,
    confidence=result.confidence,
    decision_maker="jev:{}".format(result.model),
    metadata={"typesafe_jev": result.to_dict()},
)
```

对于异步应用，使用参数和结果类型相同的 `AsyncJev`：

```python
from semantica.llms import AsyncJev

async with AsyncJev() as jev:
    result = await jev.decide(
        state="The transaction was submitted from a known device.",
        question="Does this transaction require manual review?",
        kind="noul",
    )
```

## Groq——用于实时 Agent 的快速推理

**Groq** 是一家云提供商，专注于使用称为语言处理单元（LPU）的定制硬件实现超快速的语言模型推理。其基础设施对较小模型可提供低于 300ms 的响应时间，使其成为速度比最大推理能力更重要的实时应用的理想选择。

Groq Cloud 在专门的的语言处理单元上运行开放模型，对 8B 参数模型可提供低于 300ms 的延迟。这使得 Groq 成为 LLM 处于关键路径上的任何 agent 循环的合适默认选择——SOC 分流、实时告警分类、对话式 agent。

```python
from semantica.llms import Groq

# api_key falls back to the GROQ_API_KEY environment variable
groq = Groq(model="llama-3.1-8b-instant", api_key="YOUR_GROQ_KEY")

# Always health-check before the first call in a long-running process
if not groq.is_available():
    raise RuntimeError("Groq provider unreachable — check GROQ_API_KEY")

# Plain generation
verdict = groq.generate(
    "Alert: 4200 LDAP objects enumerated in 8s from ws-finance-03. "
    "True positive or false positive? One sentence.",
    temperature=0.1,    # low temperature for deterministic triage verdicts
)
print(verdict)
# "True positive — volume and speed are consistent with T1087.002 domain enumeration."

# Structured extraction — returns a parsed dict
entities = groq.generate_structured(
    "Extract threat actors and CVEs from: "
    "APT29 exploited CVE-2024-3400 in PAN-OS GlobalProtect."
)
# {"threat_actors": ["APT29"], "cves": ["CVE-2024-3400"], "products": ["PAN-OS GlobalProtect"]}
```

Groq 模型选择归结为速度与能力的权衡：`llama-3.1-8b-instant` 适合关键路径上的任何场景，`llama-3.3-70b-versatile` 适合需要更强推理但能承受稍高延迟的场景，`mixtral-8x7b-32768` 适合长上下文的摘要任务。

## OpenAI——函数调用与视觉

**OpenAI** 提供对 GPT 模型系列的访问，包括具有函数调用（结构化工具使用）和图像/文档视觉处理等高级能力的 GPT-4o。OpenAI 模型非常适合需要强语言理解和生成能力的复杂推理任务。

`OpenAI` 提供商封装了 OpenAI API。当你需要 GPT-4o 的函数调用精度、用于文档截图的视觉能力，或者你的团队已有 OpenAI 合同并希望继续使用时，就用它。

```python
from semantica.llms import OpenAI

oai = OpenAI(model="gpt-4o", api_key="YOUR_OAI_KEY")
# api_key falls back to OPENAI_API_KEY environment variable

response = oai.generate(
    "Under CRR2 Article 92, what is the minimum total capital ratio "
    "for a G-SIB subject to a 2% GSIB buffer surcharge?"
)
print(response)

# Structured output — useful for deterministic data extraction
risk_data = oai.generate_structured(
    "Extract all counterparty names and exposure amounts from: "
    "Counterparty A: 45M EUR notional, Counterparty B: 12M EUR notional, "
    "Counterparty C: 89M EUR notional."
)
# {"counterparties": [{"name": "Counterparty A", "exposure_eur": 45000000}, ...]}
```

默认模型 `gpt-3.5-turbo` 对于分类和轻量提取已经足够。切换到 `gpt-4o` 以进行复杂的多步监管推理或文档理解。

## Anthropic——复杂推理与结构化提取

**Anthropic** 提供 Claude 模型系列，强调仔细的指令遵循行为，并在多步推理、长文档分析和代码相关任务上表现强劲。相比其他提供商，Claude 模型对模糊指令往往更为谨慎。当自信地给出错误答案的代价很高时，这一点很重要。

`Anthropic` 提供商封装了 Claude API。当任务涉及多个依赖步骤的推理（而非单轮提取）、当你需要处理多份需要保持在上下文中的长源文档，或者当你需要 schema 验证的结构化输出而非尽力而为的 JSON 时，就使用它。

在使用此提供商之前，通过 `pip install "semantica[llm-anthropic]"`（或直接 `pip install anthropic`）安装。

```python
from semantica.llms import Anthropic

claude = Anthropic(model="claude-sonnet-4-6", api_key="YOUR_ANTHROPIC_KEY")
# api_key falls back to the ANTHROPIC_API_KEY environment variable

# is_available() only confirms a client was constructed from some key.
# It does not validate the key or check network reachability - an
# invalid or expired key still passes this check and fails at generate().
if not claude.is_available():
    raise RuntimeError("Anthropic provider not configured - set ANTHROPIC_API_KEY")

# Plain generation - multi-step reasoning over a contract clause
verdict = claude.generate(
    "A vendor contract has a 30-day termination-for-convenience clause "
    "but a 90-day data-return obligation that survives termination. "
    "If the customer terminates on day 1, when must vendor-held data "
    "be returned? Answer with the date basis only.",
    temperature=0.1,
)
print(verdict)
# "Day 120 from termination notice. The 90-day return period runs from
#  the termination date (day 30), not from the notice date."

# Structured, schema-validated output
from pydantic import BaseModel

class ContractRisk(BaseModel):
    clause: str
    risk_level: str
    days_to_deadline: int

risk = claude.generate_typed(
    "Extract the termination clause risk from: vendor contract, "
    "30-day termination for convenience, 90-day post-termination "
    "data return obligation.",
    schema=ContractRisk,
)
print(risk.risk_level, risk.days_to_deadline)
# "medium" 90
```

模型选择遵循与其他提供商相同的层级结构：Haiku 模型用于成本比深度更重要的高吞吐量分类，Sonnet 模型作为大多数提取和推理任务的默认选择，Opus 模型则用于确实需要可用最深推理能力、而延迟和成本次要的任务。请查阅 Anthropic 的文档以获取当前模型标识符，因为它们会随版本更迭而变化。

## Gemini——长上下文与多模态输入

**Gemini** 是 Google 的模型系列，其上下文窗口大到可以在单次调用中容纳整个代码库或长篇监管文件，并原生支持文本之外的图像和文档输入。当任务需要一次性引用大量源材料，或输入不是纯文本时，就使用它。

`Gemini` 提供商首先尝试较新的 `google-genai` SDK，如果安装的是较旧的 `google-generativeai` 包则回退使用它。在使用此提供商之前，通过 `pip install "semantica[llm-gemini]"`（或 `pip install google-genai`）安装。

```python
from semantica.llms import Gemini

gemini = Gemini(model="gemini-pro", api_key="YOUR_GEMINI_KEY")
# api_key falls back to the GEMINI_API_KEY environment variable

if not gemini.is_available():
    raise RuntimeError("Gemini provider not configured - set GEMINI_API_KEY")

response = gemini.generate(
    "Summarize the key obligations in a standard NDA in three bullet points."
)
print(response)

data = gemini.generate_structured(
    "Extract the party names and effective date from: "
    "This Agreement is entered into between Acme Corp and Globex LLC, "
    "effective January 1, 2026."
)
print(data)
```

## Ollama——本地、气隙推理

**Ollama** 完全在自己的机器上运行模型，无需 API 密钥，也没有出站网络调用。它是气隙环境、离线开发，或任何源数据不能离开本地网络的工作负载的合适选择。

与这里的其他提供商不同，`Ollama` 接收 `base_url` 而非 `api_key`。它通过 HTTP 与本地 Ollama 服务器通信。在使用此提供商之前，用 `ollama serve` 启动服务器，并用 `ollama pull llama2` 拉取模型。通过 `pip install "semantica[llm-ollama]"`（或 `pip install ollama`）安装 Python 客户端。

```python
from semantica.llms import Ollama

llm = Ollama(model="llama2", base_url="http://localhost:11434")

if not llm.is_available():
    raise RuntimeError("Ollama provider not configured - is 'ollama serve' running?")

response = llm.generate("Explain the difference between a hash map and a tree map.")
print(response)
```

与上述基于 API 密钥的提供商不同，Ollama 的 `is_available()` 会进行真正的连接检查（它调用服务器的 `list()` 端点），因此这里返回 `False` 通常意味着服务器未运行，而非缺少凭据。

## DeepSeek——规模化的低成本推理

**DeepSeek** 以远低于美国大型提供商的成本提供 OpenAI 兼容的 API，其推理质量在提取和分类工作上表现良好。当你处理大量文档且不需要最深层的推理能力时，它是一个合理的默认选择。

通过 `pip install "semantica[llm-deepseek]"`（或 `pip install openai`，因为 DeepSeek 通过指向不同 base URL 的 OpenAI 客户端访问）安装。

```python
from semantica.llms import DeepSeek

llm = DeepSeek(model="deepseek-chat", api_key="YOUR_DEEPSEEK_KEY")
# api_key falls back to the DEEPSEEK_API_KEY environment variable

if not llm.is_available():
    raise RuntimeError("DeepSeek provider not configured - set DEEPSEEK_API_KEY")

response = llm.generate("List three risks of using a floating IP in a Kubernetes ingress.")
print(response)

data = llm.generate_structured(
    "Extract the CVE ID and affected product from: "
    "CVE-2024-3400 affects PAN-OS GlobalProtect gateways."
)
print(data)
```

## LiteLLM——一个接口，100+ 提供商

**LiteLLM** 是一个通用适配器，为 100 多种不同的 LLM 提供商提供单一接口，包括 Anthropic Claude、Azure OpenAI、AWS Bedrock、Google Vertex AI 以及本地 Ollama 实例。它充当翻译层，将你的统一 API 调用转换为提供商特定的请求，从而无需代码改动即可轻松切换提供商。

`LiteLLM` 是瑞士军刀。它封装了 `litellm` 库，后者使用统一的补全 API 与每个主流提供商通信。模型字符串同时编码提供商和模型名称：`"anthropic/claude-sonnet-5"`、`"azure/gpt-4o"`、`"bedrock/anthropic.claude-sonnet-4-5-20250929-v1:0"`、`"ollama/llama3.2"`。改字符串即改提供商——无需其他代码改动。

```python
from semantica.llms import LiteLLM

# Anthropic Claude — highest accuracy for complex reasoning
llm = LiteLLM(model="anthropic/claude-sonnet-5")
# Reads ANTHROPIC_API_KEY from environment

# Azure OpenAI — compliance and data-residency requirements
llm = LiteLLM(model="azure/gpt-4o", api_key="YOUR_AZURE_KEY")

# AWS Bedrock — existing cloud agreement, no new vendor
llm = LiteLLM(model="bedrock/anthropic.claude-sonnet-4-5-20250929-v1:0")

# Google Vertex AI
llm = LiteLLM(model="vertex_ai/gemini-1.5-pro")

# Ollama — fully local, no network calls
llm = LiteLLM(model="ollama/llama3.2")

# All of them: same call
response = llm.generate("Summarise the ICH E6(R2) GCP guideline key requirements.")
```

每个提供商的环境变量约定：`ANTHROPIC_API_KEY`、`AZURE_API_KEY`、`OPENAI_API_KEY`、`GOOGLE_APPLICATION_CREDENTIALS` 等。LiteLLM 会自动读取它们。对于由部署环境驱动的提供商切换，你可以将提供商选择放在配置字典中并在启动时注入——应用代码中不需要 `if/else` 分支：

```python
import os

PROVIDER_MAP = {
    "prod":    "anthropic/claude-sonnet-5",
    "staging": "openai/gpt-4o-mini",
    "local":   "ollama/llama3.2",
    "azure":   "azure/gpt-4o",
}

env = os.getenv("DEPLOY_ENV", "local")
llm = LiteLLM(model=PROVIDER_MAP[env])
# The rest of the application never touches provider names
```

## HuggingFaceLLM——气隙与本地部署

**HuggingFaceLLM** 提供对 HuggingFace 生态系统中开源模型的访问，既可以从 HuggingFace Hub 下载，也可以从本地文件路径加载。这是在推理期间无法访问网络的完全离线部署（如机密环境或气隙系统）的唯一选择。

`HuggingFaceLLM` 从 HuggingFace Hub 或本地目录路径加载模型。推理期间没有网络调用。这是机密环境、受 HIPAA 约束的临床部署，以及任何没有出站互联网访问的网络分段的唯一选择。

```python
from semantica.llms import HuggingFaceLLM

# HuggingFace Hub — authentication via HF_TOKEN environment variable
hf = HuggingFaceLLM(model="mistralai/Mistral-7B-Instruct-v0.3")

# Biomedical fine-tuned model for clinical entity extraction
bio_llm = HuggingFaceLLM(model="aaditya/Llama3-OpenBioLLM-70B")

# Air-gapped deployment — model on local NFS share or mounted volume
# Both `model` and `model_name` are accepted as constructor parameters
air_gapped_llm = HuggingFaceLLM(model="/opt/models/llama-3.1-70b-instruct")

response = air_gapped_llm.generate(
    "Summarise SIGINT collection window 2024-Q3 for APT29 C2 infrastructure.",
    max_length=512,
)
```

在环境中设置 `HF_TOKEN` 以访问 Hub 上受控或私有的模型。对于本地路径，不需要 token——模型目录必须包含标准的 HuggingFace 检查点文件。

## 在不改动应用代码的情况下切换提供商

统一接口的真正价值体现在 `query_with_reasoning()` 上。这个调用驱动着每个 `AgentContext` 中基于图的推理。由于它接受任意提供商对象，你可以在流水线的任何层级接入不同的 LLM，而无需改动周围的代码。

```python
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore
from semantica.llms import Groq, LiteLLM

vs    = VectorStore(backend="faiss", dimension=768)
graph = ContextGraph(advanced_analytics=True)
context = AgentContext(vector_store=vs, knowledge_graph=graph, graph_expansion=True)

# Load your knowledge base once
context.store(
    [
        {"content": "APT29 exploits CVE-2024-3400 in PAN-OS GlobalProtect — CVSS 10.0",
         "metadata": {"source": "nvd", "actor": "APT29"}},
        {"content": "NOBELIUM (APT29) leverages OAuth token theft against Azure AD tenants",
         "metadata": {"source": "msft_blog_2023", "actor": "APT29", "technique": "T1528"}},
    ],
    extract_entities=True,
    extract_relationships=True,
)

query = "What is APT29's current exploitation methodology and what cloud services are targeted?"

# Tier 1: fast answer with Groq (< 300ms)
fast_llm = Groq(model="llama-3.1-8b-instant", api_key="YOUR_GROQ_KEY")
fast_result = context.query_with_reasoning(query, llm_provider=fast_llm, max_results=5)
print("FAST: {}  (conf={:.0%})".format(fast_result["response"], fast_result["confidence"]))

# Tier 2: deep answer with Claude if confidence is below threshold
if fast_result["confidence"] < 0.85:
    deep_llm = LiteLLM(model="anthropic/claude-sonnet-5")
    deep_result = context.query_with_reasoning(
        query, llm_provider=deep_llm, max_results=15, max_hops=3
    )
    print("DEEP: {}  (conf={:.0%})".format(deep_result["response"], deep_result["confidence"]))
```

`context`、图、检索逻辑——没有任何东西发生变化。两个层级之间唯一不同的只是 `llm_provider` 参数。

## 使用提供商进行语义提取

对于 NER、关系抽取和三元组抽取，Semantica 的 `semantica.semantic_extract` 模块接受 provider 名称字符串，而非类实例。该模块在内部处理 provider 的实例化。

```python
from semantica.semantic_extract import NamedEntityRecognizer, EventDetector
from semantica.semantic_extract.methods import (
    extract_entities_llm,
    extract_relations_llm,
    extract_triplets_llm,
)

# NER with Groq — provider name as a string
ner = NamedEntityRecognizer(
    methods=["llm"],
    provider="groq",
    llm_model="llama-3.1-8b-instant",
)
entities = ner.extract_entities(
    "APT29 exploited CVE-2024-3400 in PAN-OS GlobalProtect to compromise NATO member networks."
)
for e in entities:
    # Entity fields: .text, .label, .confidence
    print("{} ({}) — conf={:.2f}".format(e.text, e.label, e.confidence))
# APT29 (THREAT_ACTOR) — conf=0.96
# CVE-2024-3400 (CVE) — conf=0.99
# PAN-OS GlobalProtect (PRODUCT) — conf=0.94
# NATO (ORGANIZATION) — conf=0.91

# Event detection with the same provider pattern
detector = EventDetector(method="llm", provider="groq")
events = detector.detect_events(
    "ENISA published the Threat Landscape 2024 report on October 22nd, "
    "covering 11 primary threat categories including ransomware and supply-chain attacks."
)

# Triplet extraction — returns (subject, predicate, object) triples
text = "Warfarin inhibits VKORC1 enzyme activity, reducing vitamin K-dependent clotting factor synthesis."
triplets = extract_triplets_llm(text, provider="groq", model="llama-3.1-8b-instant")
for t in triplets:
    print("{} -> {} -> {}".format(t.subject, t.predicate, t.object))
# warfarin -> inhibits -> VKORC1 enzyme activity
# warfarin -> reduces -> vitamin K-dependent clotting factor synthesis
```

## Novita AI — 高性价比的批量抽取

**Novita AI** 提供兼容 OpenAI 的 API，单次调用成本低，对于成本比获得单一最佳答案更重要的高频 NER 流水线而言是合理的选择。

使用 `pip install "semantica[llm-novita]"` 安装（或 `pip install openai`，因为 Novita 是通过指向不同 base URL 的 OpenAI 客户端访问的）。

```python
from semantica.llms import Novita

llm = Novita(model="deepseek/deepseek-v3.2", api_key="YOUR_NOVITA_KEY")
# api_key falls back to the NOVITA_API_KEY environment variable

if not llm.is_available():
    raise RuntimeError("Novita provider not configured - set NOVITA_API_KEY")

response = llm.generate("Summarize the Basel III leverage ratio requirement.")

data = llm.generate_structured(
    "Extract drug names and dosages from: "
    "Patient received warfarin 5mg daily, aspirin 75mg daily, metformin 500mg twice daily."
)
```

Novita 也可以作为 provider 名称字符串用于 NER 接口，无需直接使用 `Novita` 类：

```python
from semantica.semantic_extract import NamedEntityRecognizer

ner = NamedEntityRecognizer(
    methods=["llm"],
    provider="novita",
    llm_model="deepseek/deepseek-v3.2",
)
entities = ner.extract_entities(
    "CVE-2024-3400 is exploited by UNC3886 targeting PAN-OS GlobalProtect."
)
for e in entities:
    print("{} ({}) conf={:.2f}".format(e.text, e.label, e.confidence))
```

## 领域示例

<Tabs>
<Tab title="国防 — CTI/威胁情报">
一个机密威胁情报分析单元需要完全在气隙环境中运行——不允许任何形式的对外网络流量。抽取模型与推理模型均从本地 NFS 共享加载。知识图谱在整个分析会话期间持续累积；所有推理均在本地进行。

```python
from semantica.llms import HuggingFaceLLM
from semantica.semantic_extract import NamedEntityRecognizer
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore

# Both models load from the air-gapped NFS share — no Hub calls
extraction_llm = HuggingFaceLLM(model="/opt/models/mistral-7b-instruct")
reasoning_llm  = HuggingFaceLLM(model="/opt/models/llama-3.1-70b-instruct")

# The llms module wrappers can also be used directly for raw prompt generation
# when you want to bypass the semantic extraction layer entirely

sigint_text = (
    "[S//NF] APT29 operator observed deploying WARPWIRE credential harvester "
    "via CVE-2024-3400 on perimeter VPN gateways of target BRAVO-7."
)

# For fully local models, call the provider's generate method directly
raw_entities = extraction_llm.generate(
    "Extract all threat actors, CVEs, malware names, and target identifiers "
    "from the following text as a JSON list:\n\n" + sigint_text
)

# Build the graph and run reasoning
vs    = VectorStore(backend="faiss", dimension=768)
graph = ContextGraph(advanced_analytics=True)
context = AgentContext(
    vector_store=vs,
    knowledge_graph=graph,
    graph_expansion=True,
    decision_tracking=True,
)

context.store(
    sigint_text,
    metadata={"source": "SIGINT_Q4_2024", "classification": "SECRET//NOFORN"},
    conversation_id="op-analysis-q4",
)

result = context.query_with_reasoning(
    "What credential-harvesting capabilities has APT29 deployed against "
    "perimeter VPN gateways and what CVEs enable initial access?",
    llm_provider=reasoning_llm,   # fully local — no network calls
    max_results=10,
    max_hops=3,
)
print(result["response"])
print("Confidence: {:.0%}".format(result["confidence"]))

context.save("./classified_output/q4_analysis/")
```

</Tab>

<Tab title="安全 — SOC/事件响应">
SOC 流水线使用 Semantica 收集告警和适用的 runbook 证据，使用 Jev 做出有界的 Tier 1 路由决策，并在 Jev 不确定时使用 Anthropic Claude 进行深度 ATT&CK 分析。升级策略保留在调用方代码中；Jev 从不自行调用回退。

```python
from semantica.llms import Jev, LiteLLM
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore

vs    = VectorStore(backend="faiss", dimension=768)
graph = ContextGraph()
context = AgentContext(
    vector_store=vs,
    knowledge_graph=graph,
    graph_expansion=True,
    decision_tracking=True,
)

# Preload MITRE ATT&CK runbook evidence
runbook = [
    "T1087.002 (Domain Account Discovery): anomalous LDAP enumeration — isolate source host, reset service account passwords",
    "T1053.005 (Scheduled Task/Job): encoded PowerShell via wmiprvse.exe — collect task XML, check persistence keys, notify IR",
    "T1021.002 (SMB/Windows Admin Shares): PsExec lateral movement to DC — immediate host isolation, reset service accounts",
]
context.store(runbook)

alert = (
    "SIEM Alert: host ws-finance-03, user jsmith — scheduled task with base64-encoded PowerShell. "
    "Parent process: wmiprvse.exe. Sigma: T1053.005. Time: 2025-06-21T09:14:32Z."
)
context.store(alert, metadata={"type": "alert", "severity": "high"})

# Tier 1: a bounded Jev decision over the alert and policy/runbook state
fast_decider = Jev(model="jev-latest")  # reads TYPESAFE_API_KEY
triage = fast_decider.decide(
    state={"alert": alert, "applicable_runbook": runbook[1]},
    question="How should the SOC route this alert?",
    kind="choice",
    choices={
        "true_positive": "Evidence strongly matches malicious scheduled-task activity.",
        "benign": "Evidence supports an authorized administrative action.",
        "escalate": "Evidence is insufficient or conflicting; an analyst must review it.",
    },
)
print("TRIAGE: {} (conf={:.0%})".format(triage.value, triage.confidence))

# Tier 2: caller-controlled escalation to Claude when Jev is uncertain
if triage.value == "escalate" or triage.confidence < 0.88:
    deep_llm = LiteLLM(model="anthropic/claude-sonnet-5")
    deep = context.query_with_reasoning(
        "Full MITRE ATT&CK analysis of this alert: identify the attack chain, "
        "blast radius, affected systems, and recommended containment steps.",
        llm_provider=deep_llm,
        max_results=15,
        max_hops=3,
    )
    print("DEEP ANALYSIS: {}".format(deep["response"]))
    outcome = "escalated_tier2"
    confidence = deep["confidence"]
    reasoning = deep["reasoning_path"]
else:
    outcome = str(triage.value)
    confidence = triage.confidence
    reasoning = "Semantica evidence and runbook policy were evaluated before Jev routing."

context.record_decision(
    category="soc_triage",
    scenario="Scheduled task T1053.005 on ws-finance-03 — Jev conf {:.0%}".format(triage.confidence),
    reasoning=reasoning,
    outcome=outcome,
    confidence=confidence,
    entities=["ws-finance-03", "jsmith", "T1053.005"],
    decision_maker="jev:{}".format(triage.model),
    cross_system_context={"typesafe_jev": triage.to_dict()},
)
```

</Tab>

<Tab title="生命科学 — 临床/制药">
一个临床 NLP 流水线使用来自 HuggingFace 的领域特定生物医学 NER 模型进行实体抽取，然后切换到 Anthropic Claude 进行结构化肿瘤报告综合。同一个 `LiteLLM` 封装负责处理 Claude 调用——为满足 HIPAA 合规而切换到 Azure OpenAI 只需改一行。

```python
from semantica.llms import LiteLLM
from semantica.semantic_extract import NamedEntityRecognizer

# Biomedical NER — HuggingFace extractor for clinical entities
# (Note: HuggingFace NER uses method="huggingface", not the LLM generation interface)
ner = NamedEntityRecognizer(
    methods=["huggingface"],
    huggingface_model="d4data/biomedical-ner-all",
    confidence_threshold=0.75,
)

clinical_note = (
    "Patient presents with HER2+ breast cancer (T2N1M0, Stage IIB). "
    "Recommended: trastuzumab 8mg/kg loading then 6mg/kg q3w + pertuzumab 840mg loading "
    "then 420mg q3w + docetaxel 75mg/m2 q3w (THP regimen) for 6 cycles. "
    "eGFR 78 mL/min/1.73m2, LVEF 62%. Monitor for cardiotoxicity."
)

entities = ner.extract_entities(clinical_note)
# Entity fields: .text, .label (not .type), .confidence
drugs     = [e for e in entities if e.label == "DRUG"]
diagnoses = [e for e in entities if e.label in ("DISEASE", "CANCER")]

print("Drugs identified:")
for d in drugs:
    print("  {} (conf={:.2f})".format(d.text, d.confidence))
# trastuzumab (conf=0.98), pertuzumab (conf=0.97), docetaxel (conf=0.96)

# Report synthesis with Claude — switch to azure/gpt-4o for HIPAA by changing one string
report_llm = LiteLLM(model="anthropic/claude-sonnet-5")
# For HIPAA-constrained Azure deployment:
# report_llm = LiteLLM(model="azure/gpt-4o", api_key="YOUR_AZURE_KEY")

oncology_summary = report_llm.generate(
    "Write a structured oncology treatment summary for the following note. "
    "Include: diagnosis, staging, treatment regimen, monitoring parameters, "
    "and key safety considerations.\n\n" + clinical_note
)
print(oncology_summary)
```

</Tab>

<Tab title="银行 — 风险/合规">
一个监管问答系统将同一 Basel III 问题通过两个 provider 运行，并选择置信度更高的答案——这是一种用于高风险监管解读的简单共识模式，因为错误的答案会带来法律风险。

```python
from semantica.llms import OpenAI, LiteLLM
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore

vs    = VectorStore(backend="faiss", dimension=768)
graph = ContextGraph(advanced_analytics=True)
context = AgentContext(
    vector_store=vs,
    knowledge_graph=graph,
    graph_expansion=True,
    retention_days=2555,
)

# Load Basel III / CRR2 regulatory corpus
context.store(
    [
        {"content": "CRR2 Art. 92: minimum total capital ratio 8% + 2.5% conservation buffer + GSIB surcharge",
         "metadata": {"source": "CRR2_Art92", "category": "capital_requirement"}},
        {"content": "Basel III leverage ratio: Tier 1 capital / total exposure >= 3% (Art. 429 CRR2)",
         "metadata": {"source": "CRR2_Art429", "category": "leverage"}},
        {"content": "GSIB buffer surcharges: bucket 1=1%, bucket 2=1.5%, bucket 3=2%, bucket 4=2.5%, bucket 5=3.5%",
         "metadata": {"source": "BCBS_GSIB_2022", "category": "gsib_buffer"}},
    ],
    extract_entities=True,
    extract_relationships=True,
)

question = (
    "Under CRR2 Article 92 and the BCBS GSIB framework, what is the minimum "
    "total capital ratio for a bucket-2 G-SIB? Show the component breakdown."
)

# Two-provider consensus — same query, same graph, different LLMs
gpt4o  = OpenAI(model="gpt-4o", api_key="YOUR_OAI_KEY")
claude = LiteLLM(model="anthropic/claude-sonnet-5")

answer_a = context.query_with_reasoning(question, llm_provider=gpt4o,  max_results=10)
answer_b = context.query_with_reasoning(question, llm_provider=claude, max_results=10)

# Pick higher-confidence answer for the audit trail
best = answer_a if answer_a["confidence"] >= answer_b["confidence"] else answer_b
winner = "GPT-4o" if best is answer_a else "Claude"

print("Selected: {} (conf={:.0%})".format(winner, best["confidence"]))
print(best["response"])
# Expected: 8% (minimum) + 2.5% (conservation) + 1.5% (bucket-2 GSIB) = 12.0% total

# Sources the answer is grounded in
for src in best["sources"]:
    print("  - [{}] {}".format(src.get("source", "?"), src["content"][:60]))
```

</Tab>
</Tabs>

## 常见陷阱

**为简单抽取任务选用昂贵的前沿模型。** 用 GPT-4o 或 Claude Sonnet 做基础实体抽取属于杀鸡用牛刀——Groq 的 Llama 模型能以极低的成本和延迟处理直白的 NER 和分类。把前沿模型留给需要细微解读的复杂推理。

**忽视 provider 之间的延迟差异。** Groq 通常响应时间低于 300ms，而 Anthropic Claude 对同一查询可能需要 2-3 秒。对于实时 agent 或交互式工作流，多次 LLM 调用会累积延迟差异。在真实负载下评估你的 provider 性能。

**使用 LLM 处理正则表达式即可胜任的确定性模式匹配。** 如果你的任务是抽取电子邮件地址、电话号码或其他基于模式的实体，正则表达式比 LLM 抽取更快、更便宜且更可靠。当上下文、歧义或领域知识对正确解读至关重要时，再使用 LLM。

**未验证结构化输出。** `generate_structured()` 方法返回解析后的 JSON（dict，或顶层数组时为 list），但 LLM 仍可能产生格式错误或不完整的结构。在下游使用之前，将结果与预期 schema 进行验证——或使用 `generate_typed()`，它会为你对照 Pydantic 模型进行验证。

**将 Noul 的概率视为路由置信度。** Noul 返回 yes 的概率，因此 `0.01` 和 `0.99` 都是高度确定的，而 `0.5` 是最大不确定的。使用 `result.probability` 获取原始 yes 概率，使用 `result.confidence` 获取 Semantica 派生的路由确定性。

**在输出必须自我解释时使用 Jev。** Jev 做出有界的类型化决策，不生成推理文本。在 Semantica 中构建证据和政策上下文，在需要解释时使用推理 LLM 或人工审查，并在溯源中记录两个步骤。

**切换 provider 却未测试 prompt 行为。** 不同模型对同一 prompt 的响应不同。为 GPT-4 优化的 prompt 在 Llama 或 Claude 上可能产生较差的结果。切换 provider 时，测试你的 prompt 并按需调整 temperature、指令或示例。

**过度使用本地 HuggingFace 模型处理需要最新知识的任务。** 本地模型具有训练日期的知识截止点，无法访问当前信息。对于需要最新知识的任务（近期 CVE、当前法规、最新威胁情报），可能需要训练数据更新的云 provider。

## 相关指南

- [Agent Memory](/zh/guides/agent-memory) — 使用 `query_with_reasoning()` 搭配任意 LLM provider 进行基于图的检索
- [多 Agent 系统](/zh/guides/multi-agent) — 在共享图流水线中将不同的 LLM provider 接入不同的 agent 层级
- [语义抽取](/zh/guides/semantic-extraction) — LLM 驱动的 NER、关系抽取、事件检测和三元组抽取
- [GraphRAG](/zh/guides/graphrag) — 使用 `query_with_reasoning()` 进行多跳图推理