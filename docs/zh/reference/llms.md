---
title: "LLMs 模块"
description: "生成式 LLM 提供商，以及 TypeSafe Jev 类型化决策。"
icon: "microchip"
sourceHash: "2a69aff70d2b86bc199d535a8603106a6d5b5561cd45cb582cb7f86b357980fa"
---

**`semantica.llms`** 为各大 LLM 提供商提供一致的生成 API，并为 TypeSafe Jev 提供独立的类型化决策 API：

- 在需要传入提供商实例的地方，生成式提供商可互换使用：如 `AgentContext.query_with_reasoning()`、`ContextRetriever.query_with_reasoning()` 与 `TemporalQueryRewriter` 的 `llm_provider=` 参数
- 抽取器不接收实例：它们通过 `provider=`、`llm_model=` 和 `api_key=` 自行构建提供商
- `LiteLLM` 通过单个类和模型字符串前缀路由到 100+ 提供商
- `HuggingFaceLLM` 完全本地运行：无需 API Key，无网络调用
- 通过 `generate_typed()` 获得经 schema 校验的结构化输出
- `Jev` 与 `AsyncJev` 返回 Choice、Noul 或 Score 决策，而不会伪装成生成文本
- 支持流式输出、工具调用，以及用于批量推理的 `generate_batch()`


## 导出的类

```python
from semantica.llms import (
    AsyncJev,
    Groq,
    HuggingFaceLLM,
    Jev,
    JevDecisionResult,
    LiteLLM,
    OpenAI,
)
```

| 类 | 提供商 | 是否需要 API Key |
| :----- | :-------- | :---------------- |
| `Groq` | Groq Cloud | `GROQ_API_KEY` |
| `OpenAI` | OpenAI / 任意 OpenAI 兼容网关 | `OPENAI_API_KEY` |
| `LiteLLM` | 通过 LiteLLM 路由的 100+ 提供商 | 取决于模型 |
| `HuggingFaceLLM` | 本地 HuggingFace Transformers | 无（本地） |
| `Jev` | TypeSafe System One，同步 | `TYPESAFE_API_KEY` |
| `AsyncJev` | TypeSafe System One，异步 | `TYPESAFE_API_KEY` |

<Tip>
  **Anthropic、Gemini、Ollama、DeepSeek、Azure、Bedrock、Cohere 以及另外 90+ 家提供商** 均可通过 `LiteLLM` 使用各自的模型字符串前缀访问。参见下方 [LiteLLM 部分](#litellm-100+-providers)。
</Tip>

## 你将获得

- **统一的 `LLMProvider` 接口**：一行改动即可切换提供商，无需改动应用代码
- **`LiteLLM`**：单个类通过模型字符串路由支持 100+ 提供商
- **本地模型**：`HuggingFaceLLM` 完全本地运行，无需 API Key
- **类型化决策**：`Jev` 支持带概率元数据的有界 Choice、Noul 与 Score 决策
- **流式输出**：逐 token 输出，实现低延迟 UX
- **自定义网关**：通过 `base_url` 将 `OpenAI` 指向任意 OpenAI 兼容端点

## 选择提供商

<Tabs>
  <Tab title="Groq：快速上手">
    免费额度、最快的推理速度、零配置负担。最适合开发阶段与高吞吐抽取流水线。

    | | |
    | :-- | :-- |
    | **速度** | 非常快：100+ tok/s |
    | **成本** | 提供免费额度 |
    | **上下文** | 128k |
    | **最适合** | 开发、高吞吐抽取 |

    ```python
    import os
    from semantica.llms import Groq

    llm = Groq(
        model="llama-3.1-8b-instant",
        api_key=os.getenv("GROQ_API_KEY"),
        temperature=0.0,
    )
    ```

    在 [console.groq.com](https://console.groq.com) 获取免费 Key。
  </Tab>
  <Tab title="OpenAI：生产环境">
    最高准确率、最佳的 JSON 模式与函数调用能力。适用于抽取质量至关重要的生产流水线。

    | | |
    | :-- | :-- |
    | **速度** | 快 |
    | **成本** | 中等 |
    | **上下文** | 128k |
    | **最适合** | 生产质量、JSON 抽取、函数调用 |

    ```python
    import os
    from semantica.llms import OpenAI

    llm = OpenAI(
        model="gpt-4o",
        api_key=os.getenv("OPENAI_API_KEY"),
        temperature=0.0,
        max_tokens=4096,
    )
    ```
  </Tab>
  <Tab title="Ollama：本地 / 隔离网络">
    完全本地部署：无需 API Key，数据不离开你的基础设施。隔离网络部署的必需选择。

    | | |
    | :-- | :-- |
    | **速度** | 中等（取决于硬件） |
    | **成本** | 免费（仅本地算力） |
    | **上下文** | 因模型而异 |
    | **最适合** | 隐私、隔离网络、自定义微调 |

    ```bash
    # Install Ollama and pull a model first
    ollama pull llama3.2:3b
    ```

    ```python
    from semantica.llms import LiteLLM

    llm = LiteLLM(
        model="ollama/llama3.2:3b",
        api_base="http://localhost:11434",  # Ollama default port
    )
    ```

    <Note>
      无需 API Key。创建 `LiteLLM` 实例前，请确保 Ollama 服务正在运行（`ollama serve`）。
    </Note>
  </Tab>
  <Tab title="Claude：推理">
    最大的上下文窗口、最佳的多跳推理能力、最高的安全标准。适用于复杂分析与长文档抽取。

    | | |
    | :-- | :-- |
    | **速度** | 快 |
    | **成本** | 中等 |
    | **上下文** | 200k |
    | **最适合** | 复杂推理、长文档、安全关键的输出 |

    ```python
    import os
    from semantica.llms import LiteLLM

    llm = LiteLLM(
        model="anthropic/claude-sonnet-5",
        api_key=os.getenv("ANTHROPIC_API_KEY"),
        temperature=0.0,
    )
    ```
  </Tab>
  <Tab title="DeepSeek：成本优化">
    面向高负载工作负载的最低每 token 成本。在编码与结构化数据抽取方面表现强劲。

    | | |
    | :-- | :-- |
    | **速度** | 快 |
    | **成本** | 非常低 |
    | **上下文** | 64k |
    | **最适合** | 高负载流水线、编码任务、预算敏感的工作负载 |

    ```python
    import os
    from semantica.llms import LiteLLM

    llm = LiteLLM(
        model="deepseek/deepseek-chat",
        api_key=os.getenv("DEEPSEEK_API_KEY"),
        temperature=0.0,
    )
    ```
  </Tab>
  <Tab title="Jev：类型化决策">
    仅用于决策的推理，适用于有界路由、分类、二元判断与评分。当你需要成段文本或多步推理时，请使用生成式提供商。

    | | |
    | :-- | :-- |
    | **速度** | 非常快 |
    | **输出** | Choice、Noul 或 Score |
    | **接口** | `decide()`；而非 `generate()` |
    | **最适合** | 置信度门控的应用决策 |

    ```python
    from semantica.llms import Jev

    decider = Jev()  # reads TYPESAFE_API_KEY
    result = decider.decide(
        state={"risk_score": 0.62},
        question="How should this case be routed?",
        kind="choice",
        choices=["approve", "escalate"],
    )
    ```
  </Tab>
</Tabs>

## API Key 设置

### 环境变量（推荐）

```bash
# Add to your shell profile (.bashrc, .zshrc, etc.)
export GROQ_API_KEY="your_groq_api_key_here"
export OPENAI_API_KEY="your_openai_api_key_here"
export ANTHROPIC_API_KEY="your_anthropic_api_key_here"
export TYPESAFE_API_KEY="your_typesafe_api_key_here"

# Reload your shell
source ~/.bashrc
```

### 配置文件方式

```yaml
# config.yaml
llm_provider:
  name: groq
  model: llama-3.1-8b-instant
  temperature: 0.0
# Set GROQ_API_KEY environment variable and pass to constructor
```

### 代码内设置

```python
import os
from semantica.llms import Groq, LiteLLM

# Method 1: Direct API key
llm = Groq(api_key="your-api-key-here", model="llama-3.1-8b-instant")

# Method 2: Environment variable (preferred)
llm = Groq(api_key=os.getenv("GROQ_API_KEY"), model="llama-3.1-8b-instant")

# Method 3: Multiple providers via LiteLLM
providers = {
    "fast": LiteLLM(model="groq/llama-3.1-8b-instant", api_key=os.getenv("GROQ_API_KEY")),
    "smart": LiteLLM(model="anthropic/claude-sonnet-5", api_key=os.getenv("ANTHROPIC_API_KEY"))
}
```

### 安全最佳实践

<Warning>
切勿将 API Key 提交到版本控制。请使用环境变量或安全的密钥管理方案。
</Warning>

```python
# ❌ Bad - API key in code
llm = Groq(api_key="gsk_abc123...", model="llama-3.1-8b-instant")

# ✅ Good - Environment variable
llm = Groq(api_key=os.getenv("GROQ_API_KEY"), model="llama-3.1-8b-instant")
```

## TypeSafe Jev

`Jev` 与 `AsyncJev` 封装了官方 `typesafe-sdk` 的 System One 客户端。它们是仅用于决策的提供商：两个类都不实现 `generate()`、`generate_structured()` 或 `generate_typed()`，也都不能替代生成式提供商：既不能作为推理查询的 `llm_provider=` 参数，也不能作为抽取器中的 `provider=`。

<Warning>
  Jev 处于实验性与早期访问阶段。`llm-typesafe` 附加包目前支持经审核的 TypeSafe SDK 0.7 API，需 Python 3.10 或更高版本。Semantica 的基础安装仍兼容 Python 3.9，因为该 SDK 是可选的并做了保护性处理。
</Warning>

<Warning>
  TypeSafe SDK 0.7 会通过其 `typesafe_sdk` logger 在 `DEBUG` 级别输出完整的请求与响应体；授权头会被脱敏，但应用 `state` 不会。当 state 可能敏感时，请将该 logger 保持在 `INFO` 或更高级别，即使根 logger 使用 `DEBUG`。
</Warning>

```python
import logging

logging.getLogger("typesafe_sdk").setLevel(logging.INFO)
```

```bash
pip install "semantica[llm-typesafe]"
```

### 构造函数

```python
Jev(
    model="jev-latest",
    api_key=None,
    client=None,
    **client_options,
)

AsyncJev(
    model="jev-latest",
    api_key=None,
    client=None,
    **client_options,
)
```

| 参数 | 类型 | 说明 |
| :--- | :--- | :--- |
| `model` | `str` | TypeSafe 模型名称或别名。默认为 `jev-latest`。结果会保留服务返回的具体模型。 |
| `api_key` | `Optional[str]` | API Key。省略时，SDK 读取 `TYPESAFE_API_KEY`。 |
| `client` | 兼容的客户端或 `None` | 可选注入的 `TypeSafeClient`/`AsyncTypeSafeClient`，适用于自定义传输与测试。注入的客户端仍归调用方所有。 |
| `**client_options` | `Any` | 传给 SDK 客户端构造函数，包括 `retry`、`timeout`、`headers`、`transport` 或 `base_url`。 |

### 方法

| 方法 | 返回 | 说明 |
| :--- | :--- | :--- |
| `decide(state, question, kind, *, choices=None, criteria=None, **request_options)` | `JevDecisionResult` | 做出一次 Choice、Noul 或 Score 决策。`AsyncJev.decide()` 需 await。 |
| `is_available()` | `bool` | 在本地检查是否存在注入的客户端，或同时具备 SDK 与已配置的 API Key。它不校验 Key，也不发起网络请求。 |
| `close()` | `None` | 关闭由 `Jev` 创建的同步客户端；注入的客户端不会被关闭。 |
| `aclose()` | `None` | `AsyncJev` 的异步等价方法。 |

`state` 接受字符串、映射或列表。`question` 是针对该 state 评估的指令。按 kind 区分的输入：

- `kind="choice"`：将 `choices` 传为标签序列或标签到描述的映射。`criteria=` 可作为等效的显式名称使用。两者不要同时传入。
- `kind="noul"`：可选传入 `criteria={"true": ..., "false": ...}`。
- `kind="score"`：将 `criteria` 传为有序的评分标准层级序列，从零分开始。

其余请求选项会转发给 `system_one()`，例如按调用指定的 `model`、`retry`、`timeout`、`extra_headers` 或 `extra_body`。

```python
from semantica.llms import Jev

jev = Jev()  # TYPESAFE_API_KEY
result = jev.decide(
    state={"ticket": "Charged twice; please refund this today."},
    question="Which queue should handle this ticket?",
    kind="choice",
    choices={
        "billing": "Charges, invoices, or refunds",
        "technical": "Product or integration failures",
        "other": None,
    },
)
```

### `JevDecisionResult`

| 字段 | 类型 | 说明 |
| :--- | :--- | :--- |
| `kind` | `Literal["choice", "noul", "score"]` | 该决策使用的原语。 |
| `value` | `Union[str, bool, float]` | 选中的标签、在 0.5 边界处的 Noul 布尔值，或期望分数。 |
| `probability` | `Optional[float]` | Choice 为选中标签的概率，Noul 为 yes 的原始概率，Score 为 `None`。 |
| `confidence` | `float` | Choice/Score 为 SDK 置信度；Noul 为 `abs(2p - 1)` 路由确定性。 |
| `probabilities` | `dict` | 完整的 Choice 或 Score 概率分布。Noul 为空。 |
| `model` | `str` | TypeSafe 报告的具体模型。 |
| `request_id` | `Optional[str]` | API 返回的请求 ID（若有）。 |
| `usage` | `dict` | 报告的输入/输出 token 用量。 |
| `legend` | `dict[int, Any]` | Score 级别的评分标准；Choice 与 Noul 为空。 |

`result.to_dict()` 返回一个可序列化的副本，适用于 Semantica 决策元数据或 `cross_system_context`。它有意将原始的 Noul 概率与推导出的置信度分开保留。

```python
from semantica.llms import AsyncJev

async with AsyncJev() as jev:
    result = await jev.decide(
        state="The message asks for an immediate duplicate-charge refund.",
        question="Does the message explicitly communicate urgency?",
        kind="noul",
    )
```

## 提供商

<CodeGroup>

```python Groq
import os
from semantica.llms import Groq

llm = Groq(
    model="llama-3.3-70b-versatile",   # recommended; implementation default: llama-3.1-8b-instant
    api_key=os.getenv("GROQ_API_KEY"),
    max_tokens=64000,
    temperature=0.0,
)
# **Best for:** high-throughput extraction, fast inference at low cost
```

```python OpenAI
import os
from semantica.llms import OpenAI

llm = OpenAI(
    model="gpt-4o",                     # recommended; implementation default: gpt-3.5-turbo
    api_key=os.getenv("OPENAI_API_KEY"),
    temperature=0.0,
)
# **Best for:** general purpose, function calling, JSON mode
```

```python LiteLLM (100+ providers)
import os
from semantica.llms import LiteLLM

# pip install "semantica[llm-litellm]"

# Anthropic Claude
llm = LiteLLM(model="anthropic/claude-opus-4-7",         api_key=os.getenv("ANTHROPIC_API_KEY"))

# Google Gemini
llm = LiteLLM(model="gemini/gemini-1.5-pro",             api_key=os.getenv("GOOGLE_API_KEY"))

# Ollama (local: no API key)
llm = LiteLLM(model="ollama/llama3.2:3b",                api_base="http://localhost:11434")

# DeepSeek
llm = LiteLLM(model="deepseek/deepseek-chat",            api_key=os.getenv("DEEPSEEK_API_KEY"))

# Azure OpenAI
llm = LiteLLM(model="azure/gpt-4o",                      api_key=os.getenv("AZURE_API_KEY"))

# AWS Bedrock
llm = LiteLLM(model="bedrock/anthropic.claude-sonnet-4-5-20250929-v1:0")

# Novita AI
llm = LiteLLM(model="novita/deepseek/deepseek-v3.2",     api_key=os.getenv("NOVITA_API_KEY"))
```

```python HuggingFaceLLM (Local)
from semantica.llms import HuggingFaceLLM

llm = HuggingFaceLLM(
    model="mistralai/Mistral-7B-Instruct-v0.3",
    device="cuda",           # "cpu" | "cuda" | "mps"
    max_new_tokens=512,
    temperature=0.1,
)
# Bring your own model: full local control, no API key
```

```python TypeSafe Jev (Decision-only)
from semantica.llms import Jev

decider = Jev(model="jev-latest")  # reads TYPESAFE_API_KEY
result = decider.decide(
    state={"risk_score": 0.62},
    question="How should this case be routed?",
    kind="choice",
    choices=["approve", "escalate"],
)
# Best for typed, confidence-gated application decisions; no text generation
```

</CodeGroup>

## LiteLLM：100+ 家提供商

`LiteLLM` 是访问 `semantica.llms` 未直接导出的任何提供商时推荐的方式。请使用 `provider/model` 字符串格式：

```python
import os
from semantica.llms import LiteLLM

# Pattern: LiteLLM(model="<provider>/<model-name>")
providers = {
    "Anthropic":  LiteLLM(model="anthropic/claude-opus-4-7",       api_key=os.getenv("ANTHROPIC_API_KEY")),
    "Gemini":     LiteLLM(model="gemini/gemini-1.5-pro",            api_key=os.getenv("GOOGLE_API_KEY")),
    "Ollama":     LiteLLM(model="ollama/llama3.2:3b",               api_base="http://localhost:11434"),
    "DeepSeek":   LiteLLM(model="deepseek/deepseek-chat",           api_key=os.getenv("DEEPSEEK_API_KEY")),
    "Azure":      LiteLLM(model="azure/gpt-4o",                     api_key=os.getenv("AZURE_API_KEY")),
    "Bedrock":    LiteLLM(model="bedrock/anthropic.claude-sonnet-4-5-20250929-v1:0"),
    "Cohere":     LiteLLM(model="cohere/command-r-plus",            api_key=os.getenv("COHERE_API_KEY")),
    "Novita AI":  LiteLLM(model="novita/deepseek/deepseek-v3.2",    api_key=os.getenv("NOVITA_API_KEY")),
}

# Every LiteLLM instance implements the same .generate() interface
response = providers["Anthropic"].generate("Explain GraphRAG in one paragraph.")
```

<Note>
  受支持的 LiteLLM 模型字符串完整列表见 [docs.litellm.ai/docs/providers](https://docs.litellm.ai/docs/providers)。请使用上文所示的 `provider/model` 格式。
</Note>

## 自定义 / 企业网关

任何 OpenAI 兼容端点：内部路由层、Qwen 代理或私有 LLaMA 部署：

```python
import os
from semantica.llms import OpenAI

llm = OpenAI(
    model="qwen2.5-72b",
    api_key=os.getenv("GATEWAY_API_KEY"),
    base_url="https://my-internal-gateway.company.com/v1",
)
```

<Note>
  `base_url` 会在构造时进行校验。非 HTTP(S) 协议会抛出 `ValueError`，以防止 SSRF 攻击（已于 v0.5.0 修复）。
</Note>

## 在抽取器中使用生成式提供商

抽取器不接受提供商实例。它们会依据关键字配置自行构建一个：`provider` 指定后端（默认 `"openai"`），`llm_model` 选择模型，`api_key` 在省略时会从匹配的 `<PROVIDER>_API_KEY` 环境变量读取。此处不会读取 `llm_provider=`：它经由 `**config` 传入提供商工厂，并被保留在构建出的提供商的 `config` 映射中，而没有任何代码会查询该映射——该实例从不会充当抽取器的提供商，因此抽取器会针对 `provider=` 指定的后端运行（省略时即为默认的 `"openai"`）。Jev 在这里同样不可用，因为它返回的是决策而非生成的文本：

```python
import os
from semantica.semantic_extract import (
    NERExtractor,
    RelationExtractor,
    TripletExtractor,
)

llm_config = {
    "method": "llm",
    "provider": "groq",
    "api_key": os.environ["GROQ_API_KEY"],
    "llm_model": "llama-3.3-70b-versatile",
}

ner  = NERExtractor(**llm_config, max_retries=3)
rel  = RelationExtractor(**llm_config)
trip = TripletExtractor(**llm_config)
```

<Note>
  请使用 `llm_model`，而非 `model`。两个名称都会配置抽取器自身的 LLM 调用（`llm_model` 优先），但 `TripletExtractor` 会从它与内部构建的实体抽取器和关系抽取器共享的配置中剔除 `model`，因为在那些抽取器中该关键字是 spaCy/HuggingFace 的模型名。因此只设置 `model` 时，它仅能到达三元组阶段，而两个内部阶段完全不会配置 LLM 模型：它们以显式的 `model=None` 构建，从而覆盖了提供商自身的默认值。`llm_model` 则可配置全部三个阶段。
</Note>

## 提供商对比

| 提供商 | 导入 | 速度 | 成本 | 本地 | 上下文 | 最适合 |
| :-------- | :------ | :----- | :---- | :----- | :------- | :-------- |
| Groq | `Groq` | 极快 | 低 | 否 | 128k | 高吞吐抽取 |
| OpenAI | `OpenAI` | 快 | 中 | 否 | 128k | 通用任务、函数调用 |
| Anthropic | `LiteLLM(model="anthropic/...")` | 快 | 中 | 否 | 200k | 复杂推理、安全性 |
| Gemini | `LiteLLM(model="gemini/...")` | 快 | 低 | 否 | 1M | 长上下文、多模态 |
| Ollama | `LiteLLM(model="ollama/...")` | 中 | 免费 | 是 | 视模型而定 | 隐私、气隙环境 |
| DeepSeek | `LiteLLM(model="deepseek/...")` | 快 | 极低 | 否 | 64k | 编码、分析 |
| Azure OpenAI | `LiteLLM(model="azure/...")` | 快 | 中 | 否 | 128k | 企业、合规 |
| AWS Bedrock | `LiteLLM(model="bedrock/...")` | 快 | 视模型而定 | 否 | 视模型而定 | AWS 原生工作负载 |
| HuggingFace | `HuggingFaceLLM` | 慢 | 免费 | 是 | 视模型而定 | 自定义模型、BYOM |
| TypeSafe Jev | `Jev` / `AsyncJev` | 极快 | 提供商定价 | 否 | 应用状态 | 类型化路由、分类与评分 |

<Tip>
  对于生产环境的抽取流水线，Groq 提供了最佳的吞吐量与成本比。对于复杂的多跳推理，Claude Opus 或 GPT-4o 可提供最高的准确率。
</Tip>

## 默认值与可复现性

文档示例可能会展示更强的模型以提供更好的开发者体验，而实现默认值则优先考虑可靠性与成本效率。了解实际的默认值有助于获得可复现的结果和一致的基准测试。

**经验证的实现默认值：**

| 提供商 | 默认模型 | 说明 |
| :---------- | :--------------- | :------- |
| `Groq` | `llama-3.1-8b-instant` | 实现默认值；示例使用 `llama-3.3-70b-versatile` 以作展示 |
| `OpenAI` | `gpt-3.5-turbo` | 实现默认值；示例使用 `gpt-4o` 以作展示 |
| `HuggingFaceLLM` | `gpt2` | 轻量、兼容性广 |
| `Jev` / `AsyncJev` | `jev-latest` | 早期访问别名；在生产环境中若需要可复现性，请传入具体模型 |

这些是你在未指定 `model=` 构造提供商时所使用的模型。本文档中的示例使用了更强的展示模型。在生产环境中请始终显式传入 `model=`，以获得可复现的结果。

**为何重要：**
- 跨环境的可复现抽取结果
- 用于基准测试的一致基线性能
- 扩展生产工作负载时可预测的成本

## 性能与可靠性技巧

### 带重试的抽取

```python
import os
from semantica.semantic_extract import NERExtractor

ner = NERExtractor(
    method="llm",
    provider="groq",
    api_key=os.environ["GROQ_API_KEY"],
    llm_model="llama-3.3-70b-versatile",
    max_retries=3,
)

# Process multiple texts with automatic retries
texts = ["Document 1 text...", "Document 2 text...", "Document 3 text..."]
all_entities = []

for text in texts:
    entities = ner.extract(text)
    all_entities.extend(entities)

# Rate limiting handled automatically by provider
```

### 按使用场景选择模型

| 使用场景 | 推荐的提供商/模型 | 理由 |
| :---------- | :--------------------------- | :----------- |
| **实体抽取** | `Groq("llama-3.3-70b-versatile")` | 速度快，对结构化任务准确度良好 |
| **关系抽取** | `OpenAI("gpt-4o")` | 擅长复杂关系推理 |
| **复杂分析** | `LiteLLM("anthropic/claude-sonnet-5")` | 推理能力最强 |
| **高流量/低成本** | `LiteLLM("deepseek/deepseek-chat")` | 每 token 成本最低 |

### 错误处理

```python
import os
from semantica.semantic_extract import NERExtractor

# Automatic retries for rate limits and transient errors
extractor = NERExtractor(
    method="llm",
    provider="groq",
    api_key=os.environ["GROQ_API_KEY"],
    llm_model="llama-3.3-70b-versatile",
    max_retries=3,     # Retry failed requests automatically
)
```

- [Semantic Extract](/zh/reference/semantic_extract) — 使用 LLM 进行 NER 与关系抽取。
- [Agno Integration](../integrations/agno) — Agno 多智能体团队中的 LLM 提供商。
- [Reasoning](/zh/reference/reasoning) — 由 LLM 支持的演绎与溯因推理。
- [Context](/zh/reference/context) — GraphRAG 使用 LLM 在知识图谱上进行推理。