---
title: "流水线构建器"
description: "使用 PipelineBuilder DSL 构建端到端的数据处理工作流——在单个声明式流水线中完成摄取、抽取、规范化、嵌入和存储。"
sourceHash: "2a91f344ecda3f8ae38520b9752ca9d1af4c6cb540b5b5d8a1585f265431ebe7"
---

`PipelineBuilder` 解决了处理步骤之间的衔接问题。声明你的步骤、注册处理函数、连接各步骤，然后把控制权交给 `ExecutionEngine`——它负责拓扑排序、在步骤之间传递输出、失败时按可配置的退避策略重试，并返回结构化的 `ExecutionResult`，供你记录日志或触发告警。

## 为什么使用流水线？

流水线解决多步骤数据处理中的协调问题。你不必编写每个函数调用下一个函数的单体脚本，而是定义相互独立的步骤并声明它们的依赖关系。流水线引擎会自行推断执行顺序、并行运行相互独立的步骤，并在步骤之间自动传递数据。

当你遇到以下情况时，流水线就变得必不可少：
- 多个数据源需要不同的处理方式
- 步骤可以并发运行
- 存在复杂的重试或错误恢复需求
- 工作流频繁变动
- 团队环境中不同的人负责不同的步骤

一个包含两条并行分支的五步流水线，执行速度比线性脚本更快；而新增第六个步骤时，只需声明它在 DAG 中的位置即可。

## 何时使用 / 何时不使用

**使用流水线的场景：**
- 包含 3 个及以上处理阶段的多步骤 ETL 工作流
- 每天或每小时运行的定时生产任务
- 部分步骤可以并行运行的工作流
- 能从模块化设计中获益的复杂数据转换
- 由不同的人维护不同步骤的团队环境

**不要使用流水线的场景：**
- 一次性脚本或原型（改用简单函数）
- 只有 1-2 个步骤的线性工作流
- Jupyter Notebook 中的探索性数据分析
- 定义步骤的开销超过工作流本身复杂度的场景

## 典型的流水线工作流

大多数数据流水线无论所属领域，都遵循四阶段模式：

1. **摄取** —— 从文件、API、数据库或流中拉取数据
2. **转换** —— 清洗、校验、规范化并丰富原始数据
3. **抽取** —— 运行实体识别、关系抽取或其他 NLP 任务
4. **存储** —— 将结果写入向量存储、知识图谱或输出文件

每个阶段都可以包含多个并行步骤。例如，摄取阶段可能同时从三个不同的 REST API 拉取数据，而转换阶段会针对每个数据源应用不同的清洗规则。

<Info>
  `PipelineBuilder` 和 `ExecutionEngine` 位于 `semantica.pipeline`。失败处理、重试策略和并行管理是独立的类，你可以单独导入它们以获得细粒度控制。自定义步骤处理函数就是普通的 Python 函数——无需继承任何类。
</Info>

## 你的第一个流水线

最小可用的流水线包含三个步骤：摄取、抽取、存储。定义它们、连接它们、构建、执行。

每个步骤都是一个函数，它以 `data` 作为第一个位置参数，并以关键字参数接收步骤配置。流水线引擎会用上游数据（来自依赖项）调用你的步骤处理函数，并将任何步骤配置作为 `**kwargs` 传入：

```python
def handler(data, **config):
    # data contains outputs from all upstream dependencies
    # config contains any parameters passed to add_step()
    processed_data = transform_logic(data, config.get("param1", "default"))
    return processed_data  # Always return data for downstream steps
```

根步骤（没有依赖项）的 `data` 参数为 `None`——它们从零开始生成数据，而不是转换上游输出。

将处理函数直接作为 `handler` 关键字参数传给 `add_step()`，同时可以附上任意步骤配置：

```python
builder.add_step("extract_step", "ner_extract", handler=extract_entities_handler)
builder.connect_steps("ingest_step", "extract_step")
```

```python
from semantica.pipeline import PipelineBuilder, ExecutionEngine
from semantica.ingest import ingest_file
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore

# --- Define handler functions ---
# The engine calls handler(data, **step_config), so the first positional
# argument is always the upstream data; step config arrives as kwargs.

def ingest_stix_bundles(data, **config):
    # Root step — data is None, generate data from config
    files = ingest_file(config["path"], method="directory")
    return [f.text for f in files if f.file_type == "json"]

def extract_entities(data, **config):
    # data is the output from the previous step
    threshold = config.get("confidence_threshold", 0.7)
    results = []
    for text in data:
        # Your NER logic here — simplified for illustration
        results.append({"text": text, "entities": [], "threshold": threshold})
    return results

def build_graph(data, **config):
    graph   = ContextGraph(advanced_analytics=True)
    context = AgentContext(
        vector_store    = VectorStore(backend="faiss", dimension=768),
        knowledge_graph = graph,
    )
    texts = [d["text"] for d in data]
    context.store(texts, extract_entities=True, extract_relationships=True)
    context.save(config["output_path"])
    return {"node_count": graph.stats()["node_count"],
            "edge_count": graph.stats()["edge_count"]}

# --- Build the pipeline ---
# Pass handler= directly in add_step() so each PipelineStep carries its callable.

builder = PipelineBuilder()

builder.add_step("ingest",  "stix_ingest",  handler=ingest_stix_bundles, path="./stix_bundles/")
builder.add_step("extract", "ner_extract",  handler=extract_entities,    confidence_threshold=0.75)
builder.add_step("store",   "kg_build",     handler=build_graph,         output_path="./cti_output/")

builder.connect_steps("ingest",  "extract")
builder.connect_steps("extract", "store")

pipeline = builder.build("cti_pipeline")

# --- Execute ---

engine = ExecutionEngine(max_workers=4, retry_on_failure=True)
result = engine.execute_pipeline(pipeline)

print(f"Success:  {result.success}")
print(f"Output:   {result.output}")   # the final step's return value, e.g. {"node_count": ..., "edge_count": ...}
print(f"Duration: {result.metrics['execution_time']:.2f}s")
print(f"Steps completed: {result.metrics['steps_executed']}")
```

`ExecutionEngine` 在执行前会对步骤图进行拓扑排序，因此即使你以错误的顺序声明步骤，执行顺序也始终正确。每个步骤都会接收前一步骤的返回值作为其 `data` 参数。

## 解读 ExecutionResult

每次调用 `engine.execute_pipeline()` 都会返回一个 `ExecutionResult` 数据类。在假定成功之前请先检查它：

```python
result = engine.execute_pipeline(pipeline)

if not result.success:
    print("Pipeline failed. Errors:")
    for err in result.errors:
        print(f"  {err}")
else:
    print(f"Pipeline completed in {result.metrics['execution_time']:.1f}s")
    print(f"Steps run:    {result.metrics['steps_executed']}")
    print(f"Steps failed: {result.metrics['steps_failed']}")
    # result.output  — the return value of the final step
    # result.metadata — {"pipeline_id": "...", "execution_time": float}
```

`result.errors` 是一个 `List[str]`——每个失败的步骤对应一个条目，其中包含异常消息。设置了 `retry_on_failure=True` 的流水线会对每个失败的步骤最多尝试 `max_retries` 次（默认：3 次），之后才将其记录为失败并继续执行。

## 处理失败并配置重试策略

默认情况下，`ExecutionEngine(retry_on_failure=True)` 使用指数退避策略：重试三次，起始延迟 1 秒，每次翻倍，上限 60 秒。对于会调用外部 API 或数据库的步骤——这类步骤出现瞬时失败是预期之内的——你可以通过 `FailureHandler` 为每种步骤类型分别设置策略：

```python
from semantica.pipeline import ExecutionEngine, FailureHandler, RetryPolicy, RetryStrategy

# Build a custom failure handler
handler = FailureHandler()

# Web/API steps: retry up to 5 times with exponential backoff
handler.set_retry_policy(
    "misp_fetch",
    RetryPolicy(
        max_retries    = 5,
        strategy       = RetryStrategy.EXPONENTIAL,
        backoff_factor = 2.0,
        initial_delay  = 2.0,
        max_delay      = 120.0,
    ),
)

# Database steps: fixed delay, fewer retries (connection pool usually recovers fast)
handler.set_retry_policy(
    "db_ingest",
    RetryPolicy(
        max_retries   = 3,
        strategy      = RetryStrategy.FIXED,
        initial_delay = 5.0,
    ),
)

# NER steps: don't retry — if the model crashes it needs human intervention
handler.set_retry_policy(
    "ner_extract",
    RetryPolicy(max_retries=0),
)

engine = ExecutionEngine(
    max_workers      = 4,
    retry_on_failure = True,
)
# ExecutionEngine builds its own FailureHandler; replace it with the configured one
engine.failure_handler = handler
# The engine now calls engine.failure_handler.get_retry_policy(step.step_type) on failure
```

`handler.classify_error()` 会区分 `ValidationError`（低严重程度，通常不重试）、`ProcessingError`（高严重程度）以及超时/连接错误（中等严重程度，总是重试）。你可以查看分类结果：

```python
try:
    result = engine.execute_pipeline(pipeline)
except Exception as e:
    classification = handler.classify_error(e)
    print(f"Severity: {classification['severity'].value}")   # "high" / "medium" / "low"
    print(f"Message: {classification['message']}")
```

## 并行运行步骤

当两个步骤互不依赖时——例如 NER 抽取和三元组抽取都读取同一份摄取输出——只要把它们都连接到同一个上游步骤，即可声明为并行分支：

```python
builder = PipelineBuilder()
builder.register_step_handler("file_ingest",     ingest_stix_bundles)
builder.register_step_handler("ner_extract",     run_ner)
builder.register_step_handler("triplet_extract", run_triplets)
builder.register_step_handler("kg_merge",        merge_into_graph)

builder.add_step("ingest",   "file_ingest",     path="./stix_bundles/")
builder.add_step("ner",      "ner_extract",     confidence_threshold=0.75)
builder.add_step("triplets", "triplet_extract", include_temporal=True)
builder.add_step("store",    "kg_merge",        output_path="./cti_output/")

# ingest feeds both ner and triplets in parallel
builder.connect_steps("ingest",   "ner")
builder.connect_steps("ingest",   "triplets")
# both converge into store
builder.connect_steps("ner",      "store")
builder.connect_steps("triplets", "store")

builder.set_parallelism(2)   # run ner and triplets concurrently

pipeline = builder.build("parallel_extraction")
engine   = ExecutionEngine(max_workers=2, retry_on_failure=True)
result   = engine.execute_pipeline(pipeline)
```

`set_parallelism(n)` 告诉引擎可以同时运行多少个步骤；`n` 必须是正整数。拓扑排序保证只有依赖全部完成的步骤才有资格并发执行——不会出现步骤在其输入未就绪时被误执行的情况。实际并发度上限为 `min(n, max_workers)`，因此引擎的 `max_workers` 设置仍是硬性的资源上限。

并发是按步骤显式启用的。只有当某一依赖层中的每个步骤都标记为 `parallel_safe`、该层包含不止一个步骤，并且流入该层的数据是 dict 时，该层才会并行运行：

```python
builder.add_step("ner",      "ner_extract",     parallel_safe=True, confidence_threshold=0.75)
builder.add_step("triplets", "triplet_extract", parallel_safe=True, include_temporal=True)
```

如果某一层中有任何步骤未标记 `parallel_safe`，或者某步骤以增量模式运行，整个层就回退为串行执行——并行机制绝不会悄悄绕过未声明为安全的步骤。`parallel_safe` 是一个控制字段：与 `dependencies` 一样，它由构建器消费，永远不会传入处理函数的配置。

并行安全处理函数必须返回 dict。并行层中的每个步骤都会收到该层输入的隔离深拷贝，因此各步骤无法看到彼此的变更。各步骤结果会按步骤声明顺序逐键合并：某一步写入的键会加入合并输出；多个步骤写入相同值时保留该值；若两个步骤为同一键写入不同值，则流水线会失败并抛出 `ProcessingError`，其中指出冲突的键及两个步骤。处理函数若涉及共享可变资源——数据库连接、内存存储、全局缓存——则不应标记为 `parallel_safe`。

## 常见陷阱

**忘记返回数据。** 如果步骤处理函数不返回任何内容，下游步骤会在其 `data` 参数中收到 `None`。这通常会导致崩溃或静默失败。每个非终止步骤都应返回数据供下一阶段使用。

**并行度过高。** 在 8 核机器上设置 `max_workers=50` 带来的开销会超过性能提升。应从 `max_workers=4` 开始，并在监控资源使用情况的同时逐步增加。大多数 I/O 密集型步骤在适度并行度下表现良好。

**有状态处理函数。** 步骤处理函数应是纯函数——给定相同的输入数据和配置，应产生相同的输出。避免使用在调用之间持续存在的全局变量、文件句柄或数据库连接。每次步骤执行都应相互独立。

**调试大型流水线。** 当 10 步流水线在第 7 步失败时，不要为了调试而重新运行整个流水线。将失败的步骤提取到独立脚本中，使用实际的中间数据作为输入，并单独修复它。

## 开发与调试

从小处开始，在构建完整流水线之前逐一验证每个步骤：

```python
# Add debug output in handlers during development
def extract_entities(data, **config):
    print(f"Processing {len(data)} items with threshold {config.get('confidence_threshold')}")
    results = []
    for item in data:
        # Your processing logic
        results.append({"text": item["text"], "entities": []})
    print(f"Generated {len(results)} results")
    return results

# Test individual handlers with known data
test_data = [{"text": "sample data", "entities": []}]
result = extract_entities(test_data, confidence_threshold=0.5)
print(f"Processed {len(result)} items")
```

对于复杂流水线，添加检查点以保存中间输出：

```python
def save_checkpoint(data, **config):
    # Save intermediate data for debugging
    checkpoint_path = config.get("checkpoint_path", "checkpoint.json")
    with open(checkpoint_path, "w") as f:
        json.dump(data, f)
    return data  # Pass data through unchanged

builder.add_step(
    "checkpoint_after_transform", "checkpoint",
    handler=save_checkpoint,
    checkpoint_path="transform_output.json"
)
builder.connect_steps("transform", "checkpoint_after_transform")
```

## Delta / 增量处理

Delta 流水线只处理数据两个版本之间的变更，而不是从头重新处理所有内容。对于全量重新处理过慢或成本过高的大型数据集，这至关重要。

你的 STIX bundle 目录每晚新增 20–30 个文件。每天早上重新处理全部 4,000 个历史文件会浪费时间和算力。摄取步骤上的 `delta_mode=True` 告诉流水线仅处理自上次版本快照以来发生更改的文件：

```python
builder = PipelineBuilder()
builder.register_step_handler("stix_ingest", ingest_stix_bundles)
builder.register_step_handler("ner_extract", run_ner)
builder.register_step_handler("kg_append",   append_to_graph)

builder.add_step(
    "ingest", "stix_ingest",
    handler           = ingest_stix_bundles,
    path              = "./stix_bundles/",
    delta_mode        = True,
    base_version_id   = "2024-11-30",   # last successful run
    target_version_id = "2024-12-01",   # today's snapshot
)
builder.add_step("extract", "ner_extract", handler=run_ner)
builder.add_step("store",   "kg_append",   handler=append_to_graph, output_path="./cti_output/")

builder.connect_steps("ingest",  "extract")
builder.connect_steps("extract", "store")

pipeline = builder.build("delta_pipeline")
result   = ExecutionEngine(max_workers=4, retry_on_failure=True).execute_pipeline(pipeline)

print(f"Delta run: {result.output}")
```

`base_version_id` 和 `target_version_id` 存储在 `PipelineStep` 数据类上，并通过 `config` 传递给你的处理函数——你的处理函数负责使用它们来筛选输入。一种典型模式是根据基础版本日期检查文件修改时间戳。

## 从配置字典构建

对于在配置文件中定义的流水线——当不同环境（dev、staging、prod）使用不同路径和阈值运行同一流水线时很有用——请向 `build_pipeline()` 传入字典，而不是手动调用 `add_step()`：

```python
from semantica.pipeline import PipelineBuilder, ExecutionEngine

pipeline_config = {
    "name": "cti_pipeline",
    "parallelism": 4,
    "steps": [
        {
            "name": "ingest",
            "type": "stix_ingest",
            "config": {"path": "./stix_bundles/"},
        },
        {
            "name": "extract",
            "type": "ner_extract",
            "config": {"confidence_threshold": 0.8},
        },
        {
            "name": "store",
            "type": "kg_build",
            "config": {"output_path": "./cti_output/"},
        },
    ],
}

builder = PipelineBuilder()
# Register handlers as before, then:
pipeline = builder.build_pipeline(pipeline_config)

engine = ExecutionEngine(max_workers=4, retry_on_failure=True)
result = engine.execute_pipeline(pipeline)
```

请注意，`build_pipeline()` 会从每个步骤配置字典内的 `"dependencies"` 键读取步骤连接（而不是从 `connect_steps()` 调用中读取）。如果使用这种方式，请显式添加依赖项：

```python
{
    "name": "extract",
    "type": "ner_extract",
    "config": {"confidence_threshold": 0.8, "dependencies": ["ingest"]},
},
```

## 监控进度

`ExecutionEngine` 会自动与 Semantica 的进度跟踪器集成——每次步骤启动、更新和完成都会被记录。要在长时间运行的流水线期间观察进度，请在执行后检查 `Pipeline` 对象上的步骤状态：

```python
from semantica.pipeline import StepStatus

result   = engine.execute_pipeline(pipeline)
for step in pipeline.steps:
    status_str = step.status.value   # "completed" / "failed" / "skipped"
    print(f"  {step.name:20s}  {status_str}")
    if step.status == StepStatus.FAILED and step.error:
        print(f"    Error: {step.error}")
```

`result.metrics` 提供聚合视图：

```python
print(f"Total time:      {result.metrics['execution_time']:.2f}s")
print(f"Steps completed: {result.metrics['steps_executed']}")
print(f"Steps failed:    {result.metrics['steps_failed']}")
```

## 领域示例

<Tabs>
  <Tab title="国防 — CTI/威胁">
    SOC 威胁情报团队需要一个端到端流水线：从涉密目录摄取 STIX bundle，使用自定义威胁行为者标签运行实体抽取，并构建可供分析师查询的 `ContextGraph`。该流水线每六小时运行一次；失败的步骤会自动重试，因此临时文件系统错误不会导致某个摄取周期丢失。

```python
from semantica.pipeline import PipelineBuilder, ExecutionEngine, RetryPolicy, RetryStrategy
from semantica.ingest import ingest_file
from semantica.semantic_extract import NamedEntityRecognizer
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore

def ingest_classified_stix(data, **config):
    files = ingest_file(config["path"], method="directory")
    return [
        {"text": f.text, "source": f.name, "classification": config["classification"]}
        for f in files if f.file_type == "json"
    ]

def extract_cti_entities(data, **config):
    ner = NamedEntityRecognizer(
        methods=["pattern", "ml"],
        custom_labels=["THREAT_ACTOR", "MALWARE", "CVE", "C2_DOMAIN", "CAMPAIGN"],
        confidence_threshold=config.get("confidence_threshold", 0.80),
    )
    results = []
    for doc in data:
        entities = ner.extract_entities(doc["text"])
        results.append({**doc, "entities": [e.__dict__ for e in entities]})
    return results

def build_cti_graph(data, **config):
    graph   = ContextGraph(advanced_analytics=True, community_detection=True)
    context = AgentContext(
        vector_store    = VectorStore(backend="faiss", dimension=768),
        knowledge_graph = graph,
        graph_expansion = True,
    )
    texts = [d["text"] for d in data]
    context.store(texts, extract_entities=True, extract_relationships=True)
    context.save(config["output_path"])
    return graph.stats()

builder = PipelineBuilder()
builder.register_step_handler("classified_ingest", ingest_classified_stix)
builder.register_step_handler("cti_ner",           extract_cti_entities)
builder.register_step_handler("cti_graph",         build_cti_graph)

builder.add_step("ingest",  "classified_ingest",
                 handler=ingest_classified_stix,
                 path="./classified/stix/",
                 classification="SECRET//REL TO USA FVEY")
builder.add_step("extract", "cti_ner", handler=extract_cti_entities, confidence_threshold=0.85)
builder.add_step("store",   "cti_graph", handler=build_cti_graph, output_path="./cti_state/")

builder.connect_steps("ingest",  "extract")
builder.connect_steps("extract", "store")
builder.set_parallelism(2)

pipeline = builder.build("cti_pipeline")
engine   = ExecutionEngine(max_workers=2, retry_on_failure=True)
result   = engine.execute_pipeline(pipeline)

print(f"CTI pipeline: success={result.success}, "
      f"nodes={result.output.get('node_count')}, "
      f"time={result.metrics['execution_time']:.1f}s")
```

  </Tab>

  <Tab title="安全 — SOC/事件">
    在 P1 事件活跃期间，SOC 需要一个 15 分钟流水线，拉取最新的 SIEM 告警 CSV，从内部数据库交叉引用 CVE，并更新事件知识图谱。该流水线按紧凑周期运行——NER 失败不得阻塞知识图谱更新，因此步骤配置为在 NER 错误时不重试，但在数据库超时时积极重试。

```python
from semantica.pipeline import (
    PipelineBuilder, ExecutionEngine, FailureHandler,
    RetryPolicy, RetryStrategy,
)
from semantica.ingest import ingest_file, DBIngestor
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore

def ingest_siem_alerts(data, **config):
    files = ingest_file(config["path"], method="directory")
    return [{"text": f.text, "source": f.name}
            for f in files if f.file_type == "csv"]

def enrich_with_cves(data, **config):
    db = DBIngestor()
    cve_rows = db.execute_query(config["db_url"], config["query"])
    cve_lookup = {r["cve_id"]: r for r in cve_rows}
    for doc in data:
        doc["cve_enrichment"] = cve_lookup
    return data

def update_incident_graph(data, **config):
    graph   = ContextGraph(advanced_analytics=True)
    context = AgentContext(
        vector_store    = VectorStore(backend="faiss", dimension=768),
        knowledge_graph = graph,
    )
    texts = [d["text"] for d in data]
    context.store(texts, extract_entities=True, extract_relationships=True)
    context.save(config["output_path"])
    return graph.stats()

handler = FailureHandler()
handler.set_retry_policy("db_enrich",
    RetryPolicy(max_retries=5, strategy=RetryStrategy.EXPONENTIAL,
                initial_delay=2.0, max_delay=30.0))
handler.set_retry_policy("cti_ner", RetryPolicy(max_retries=0))

builder = PipelineBuilder()
builder.register_step_handler("siem_ingest",  ingest_siem_alerts)
builder.register_step_handler("db_enrich",    enrich_with_cves)
builder.register_step_handler("graph_update", update_incident_graph)

builder.add_step("ingest",  "siem_ingest",  handler=ingest_siem_alerts, path="./siem_exports/")
builder.add_step("enrich",  "db_enrich",
                 handler=enrich_with_cves,
                 db_url="postgresql://ro:pass@cvedb:5432/nvd",
                 query="SELECT cve_id, description, cvss_v3_score FROM cve_records "
                       "WHERE cve_id = ANY(ARRAY['CVE-2024-3400','CVE-2024-21762'])")
builder.add_step("store",   "graph_update", handler=update_incident_graph, output_path="./incident_state/")

builder.connect_steps("ingest",  "enrich")
builder.connect_steps("enrich",  "store")

pipeline = builder.build("incident_pipeline")
engine   = ExecutionEngine(max_workers=4, retry_on_failure=True)
result   = engine.execute_pipeline(pipeline)

print(f"Incident update: {result.success}, "
      f"nodes={result.output.get('node_count')}, "
      f"errors={result.errors}")
```

  </Tab>

  <Tab title="生命科学 — 临床/制药">
    一个临床 NLP 流水线在每个试验月结束后处理 EHR 导出数据：从共享目录摄取患者记录，使用 HuggingFace 模型运行生物医学 NER 以抽取药物/疾病/剂量实体，记录符合 ICH E6(R2) 的溯源，并追加到试验图。该流水线使用增量模式，因此只处理自上次运行以来新增的记录。

```python
from semantica.pipeline import PipelineBuilder, ExecutionEngine
from semantica.ingest import ingest_file
from semantica.semantic_extract import NamedEntityRecognizer
from semantica.provenance import ProvenanceManager, SourceReference
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore

def ingest_ehr_notes(data, **config):
    files = ingest_file(config["path"], method="directory")
    return [
        {"text": f.text, "patient_id": f.name.split("_")[0], "source": f.name}
        for f in files
    ]

def run_biomedical_ner(data, **config):
    ner = NamedEntityRecognizer(
        methods=["huggingface"],
        huggingface_model="d4data/biomedical-ner-all",
        confidence_threshold=config.get("confidence_threshold", 0.80),
        custom_labels=["DRUG", "DISEASE", "DOSAGE", "GENE", "BIOMARKER"],
    )
    results = []
    for doc in data:
        entities = ner.extract_entities(doc["text"])
        results.append({**doc, "entities": entities})
    return results

def track_provenance_and_store(data, **config):
    manager = ProvenanceManager(storage_path=config["provenance_db"])
    graph   = ContextGraph(advanced_analytics=True)
    context = AgentContext(
        vector_store    = VectorStore(backend="faiss", dimension=768),
        knowledge_graph = graph,
        retention_days  = None,
    )
    for doc in data:
        for entity in doc.get("entities", []):
            source = SourceReference(
                document=doc["patient_id"],
                section="clinical_note",
                confidence=getattr(entity, "confidence", 1.0),
            )
            manager.track_entity(
                entity_id=f"{doc['patient_id']}_{getattr(entity, 'text', '')}",
                source=source.document,
                metadata={"entity_type": getattr(entity, "label", ""),
                           "confidence": getattr(entity, "confidence", 1.0)},
            )
    context.store([d["text"] for d in data], extract_entities=True)
    context.save(config["output_path"])
    return graph.stats()

builder = PipelineBuilder()
builder.register_step_handler("ehr_ingest",    ingest_ehr_notes)
builder.register_step_handler("bio_ner",       run_biomedical_ner)
builder.register_step_handler("prov_store",    track_provenance_and_store)

builder.add_step("ingest",  "ehr_ingest",
                 handler=ingest_ehr_notes,
                 path="./ehr_exports/month_12/",
                 delta_mode=True,
                 base_version_id="2024-11",
                 target_version_id="2024-12")
builder.add_step("extract", "bio_ner", handler=run_biomedical_ner, confidence_threshold=0.82)
builder.add_step("store",   "prov_store",
                 handler=track_provenance_and_store,
                 provenance_db="./provenance/trial_Q4.db",
                 output_path="./trial_state/")

builder.connect_steps("ingest",  "extract")
builder.connect_steps("extract", "store")
builder.set_parallelism(4)

pipeline = builder.build("clinical_nlp_pipeline")
engine   = ExecutionEngine(max_workers=4, retry_on_failure=True)
result   = engine.execute_pipeline(pipeline)

print(f"Clinical pipeline: {result.success}, "
      f"nodes={result.output.get('node_count')}")
```

  </Tab>

  <Tab title="银行 — 风险/合规">
    合规团队运行每月增量流水线：从站点地图摄取新的 BIS 出版物，抽取资本比率和阈值实体，并将它们追加到已保存三年监管历史的现有合规知识图谱中。Delta 模式确保只处理自上次运行以来发布的页面。

```python
from semantica.pipeline import PipelineBuilder, ExecutionEngine
from semantica.ingest import ingest_web
from semantica.semantic_extract import NamedEntityRecognizer, TripletExtractor
from semantica.context import AgentContext, ContextGraph
from semantica.vector_store import VectorStore

def ingest_bis_pages(data, **config):
    pages = ingest_web(config["sitemap"], method="sitemap")
    return [
        {"text": p.text, "url": p.url}
        for p in pages
        if p.text.strip() and any(
            kw in p.url.lower() for kw in ["bcbs", "capital", "liquidity"]
        )
    ]

def extract_regulatory_entities(data, **config):
    ner = NamedEntityRecognizer(
        methods=["pattern", "ml"],
        custom_labels=["REGULATION", "CAPITAL_RATIO", "RISK_WEIGHT", "THRESHOLD"],
        confidence_threshold=config.get("confidence_threshold", 0.75),
    )
    extractor = TripletExtractor(
        method="pattern", include_temporal=True, include_provenance=True,
    )
    results = []
    for doc in data:
        entities = ner.extract_entities(doc["text"])
        triplets = extractor.extract_triplets(doc["text"], entities=entities)
        results.append({**doc, "entities": entities, "triplets": triplets})
    return results

def append_to_compliance_graph(data, **config):
    graph = ContextGraph(advanced_analytics=True)
    graph.load_from_file(config["existing_graph"])
    context = AgentContext(
        vector_store    = VectorStore(backend="faiss", dimension=768),
        knowledge_graph = graph,
        retention_days  = 2555,   # 7-year regulatory requirement
    )
    context.store([d["text"] for d in data],
                  extract_entities=True, extract_relationships=True)
    context.save(config["output_path"])
    return {"added_docs": len(data), "graph": graph.stats()}

builder = PipelineBuilder()
builder.register_step_handler("bis_ingest",   ingest_bis_pages)
builder.register_step_handler("rule_extract", extract_regulatory_entities)
builder.register_step_handler("graph_append", append_to_compliance_graph)

builder.add_step("ingest",  "bis_ingest",
                 handler=ingest_bis_pages,
                 sitemap="https://www.bis.org/sitemap.xml",
                 delta_mode=True,
                 base_version_id="2024-11",
                 target_version_id="2024-12")
builder.add_step("extract", "rule_extract", handler=extract_regulatory_entities, confidence_threshold=0.75)
builder.add_step("store",   "graph_append",
                 handler=append_to_compliance_graph,
                 existing_graph="./compliance_graph/knowledge_graph.json",
                 output_path="./compliance_graph/")

builder.connect_steps("ingest",  "extract")
builder.connect_steps("extract", "store")
builder.set_parallelism(4)

pipeline = builder.build("regulatory_pipeline")
engine   = ExecutionEngine(max_workers=4, retry_on_failure=True)
result   = engine.execute_pipeline(pipeline)

print(f"Compliance delta update: {result.output}")
```

  </Tab>
</Tabs>

## 相关指南

- [摄取](/zh/guides/ingest) — 摄取步骤支持的所有源类型：PDF、API、数据库、RSS 订阅源、STIX 目录和流
- [语义抽取](/zh/guides/semantic-extraction) — 抽取步骤所用的 NER、关系抽取、三元组抽取和事件检测
- [上下文图](/zh/guides/context-graphs) — 构建和查询由存储步骤填充的 `ContextGraph`
- [溯源](/zh/guides/provenance) — 为每个抽取的实体跟踪原始文档、置信度分数和流水线运行 ID