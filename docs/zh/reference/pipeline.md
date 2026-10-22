---
title: "Pipeline 模块"
description: "支持并行 worker、重试策略、失败处理与进度跟踪的 Pipeline DSL。"
icon: "gear"
sourceHash: "5d65de4b4f14188e68390cd4d29ff58c2a0ae0d3e1d5c9cd45541e4948dd0bff"
---

**`semantica.pipeline`** 可将 Semantica 各组件串联为**可复现、容错的工作流**：

- 按步骤配置失败策略：`skip`、`retry`、`abort` 或 `fallback`
- 通过 `ParallelismManager` 实现并行 worker：线程池或进程池
- `PipelineValidator` 在运行前捕获环路、缺失的 handler 与配置错误
- 预置模板：`"document_processing"`、`"rag_pipeline"`、`"kg_construction"`、`"ontology_generation"`
- Pipeline 可序列化为 YAML：可在任意环境中保存并重新加载


## 导出的类

| 类 | 职责 |
| :--- | :--- |
| `PipelineBuilder` | 用于装配步骤的 DSL：`add_step`、`connect_steps`、`set_parallel`、`build` |
| `ExecutionEngine` | 运行已构建的 pipeline：`execute_pipeline(pipeline, data)` → `ExecutionResult` |
| `ExecutionResult` | `{success, output, metadata, metrics, errors}`：完整的运行摘要 |
| `FailureHandler` | 按步骤配置策略：失败时 `skip`、`retry`、`abort` 或 `fallback` |
| `ParallelismManager` | 线程池或进程池，以可配置的 worker 数并发执行步骤 |
| `PipelineValidator` | 在运行前捕获依赖环路、缺失的 handler 与配置错误 |
| `PipelineTemplateManager` | 预置模板：`"document_processing"`、`"rag_pipeline"`、`"kg_construction"`、`"ontology_generation"` |

## 为什么要用 Pipeline？

你完全可以用普通 Python 代码把 Semantica 各模块串起来。Pipeline 额外提供了：

- **重试与失败处理** —— 单个坏文档不会让 10,000 个文档的任务崩溃。
- **并行能力** —— 一个参数即可让抽取在多个 worker 上运行。
- **进度跟踪** —— tqdm 控制台进度条，或通过 WebSocket 流式推送到 Explorer。
- **可复现性** —— 将确切的 pipeline 配置保存为 YAML，在任何机器上重放。
- **增量模式** —— 重新运行时，仅处理自上次运行以来发生变更的文档。
- **校验** —— 在配置错误的步骤与依赖环路于运行中途失败之前就将其捕获。

<Note>
  快速脚本和 notebook 直接用模块调用即可。凡是需要重复运行、大规模运行或用于生产环境的场景，都应使用 pipeline。
</Note>

<img src="/assets/img/diagrams/pipeline-flow.svg" alt="Pipeline 步骤序列：Ingest → Parse → Normalize → Extract → Build KG → QA → Store → Deliver" style={{ width: '100%', borderRadius: '10px', margin: '0 0 24px' }} />

## 快速开始

<Steps>
  <Step title="构建 pipeline">
    ```python
    from semantica.pipeline import PipelineBuilder
    from semantica.ingest import FileIngestor
    from semantica.parse import DocumentParser
    from semantica.semantic_extract import NERExtractor
    from semantica.kg import GraphBuilder

    ingestor   = FileIngestor()
    parser     = DocumentParser()
    extractor  = NERExtractor(method="ml")
    kg_builder = GraphBuilder(merge_entities=True)

    builder = PipelineBuilder()
    builder.add_step("ingest",   "file_ingest",    handler=ingestor.ingest_file)
    builder.add_step("parse",    "document_parse", handler=parser.parse)
    builder.add_step("extract",  "ner_extract",    handler=extractor.extract)
    builder.add_step("build_kg", "graph_build",    handler=kg_builder.build)
    builder.connect_steps("ingest", "parse")
    builder.connect_steps("parse",  "extract")
    builder.connect_steps("extract","build_kg")

    pipeline = builder.build("my_pipeline")
    ```
  </Step>
  <Step title="运行前校验">
    ```python
    from semantica.pipeline import PipelineValidator

    validator = PipelineValidator()
    result = validator.validate_pipeline(pipeline)

    if not result.valid:
        for error in result.errors:   # errors is List[str]
            print(f"Error: {error}")
        for warning in result.warnings:
            print(f"Warning: {warning}")
    ```

    <Tip>
      **在生产环境运行前请使用 `PipelineValidator`。** 它能捕获依赖环路、缺失的步骤名以及配置错误的连接 —— 这些问题否则只会在运行中途以报错的形式暴露。校验是瞬时的；而等到 30 分钟的抽取任务跑完才发现它们就不是了。
    </Tip>
  </Step>
  <Step title="执行并检查结果">
    ```python
    from semantica.pipeline import ExecutionEngine

    engine = ExecutionEngine()
    result = engine.execute_pipeline(pipeline, data="data/")

    kg = result.output
    print(f"Success:        {result.success}")
    print(f"Steps executed: {result.metrics['steps_executed']}")
    print(f"Steps failed:   {result.metrics['steps_failed']}")
    print(f"Duration:       {result.metrics['execution_time']:.1f}s")
    ```

    <Tip>
      **通过 `result.metrics` 定位瓶颈。** `result.metrics['steps_executed']` 与 `result.metrics['execution_time']` 可快速反映 pipeline 的整体健康状况。若需查看单个步骤的耗时，请在运行结束后检查每个 `PipelineStep` 上的 `step.result`。
    </Tip>
  </Step>
</Steps>

## 并行处理

在 builder 上设置并行度，并向 `ExecutionEngine` 传入 `max_workers`：

```python
from semantica.pipeline import PipelineBuilder, ExecutionEngine

builder = PipelineBuilder()
builder.add_step("ingest",  "file_ingest",    handler=ingestor.ingest_file)
builder.add_step("parse",   "document_parse", handler=parser.parse)
builder.add_step("extract", "ner_extract",    handler=extractor.extract)
builder.add_step("build",   "graph_build",    handler=kg_builder.build)
builder.set_parallelism(4)

pipeline = builder.build("parallel_pipeline")
engine   = ExecutionEngine(max_workers=4)
result   = engine.execute_pipeline(pipeline, data="data/")
```

<Tip>
  **根据负载类型设置 `workers=`。** I/O 密集型步骤（网络抓取、数据库查询）使用线程 worker，CPU 密集型步骤（嵌入、OCR、大批量 NER）使用进程 worker。在错误的步骤类型上混用池类型只会浪费资源，换不来速度提升。
</Tip>

## 重试与错误处理

<Tabs>
  <Tab title="指数退避（推荐）">
    ```python
    from semantica.pipeline import RetryPolicy, RetryStrategy, FailureHandler, ExecutionEngine

    policy = RetryPolicy(
        max_retries=3,
        strategy=RetryStrategy.EXPONENTIAL,
        initial_delay=1.0,    # 1s → 2s → 4s
        backoff_factor=2.0
    )

    handler = FailureHandler()
    handler.set_retry_policy("ner_extract", policy)   # keyed by step_type

    engine = ExecutionEngine(default_max_retries=3, default_backoff_factor=2.0)
    result = engine.execute_pipeline(pipeline, data="data/")
    ```

    最适合瞬时 API 错误与速率限制：每次重试的等待时间更长，给上游服务留出恢复时间。
  </Tab>
  <Tab title="线性退避">
    ```python
    from semantica.pipeline import RetryPolicy, RetryStrategy

    policy = RetryPolicy(
        max_retries=3,
        strategy=RetryStrategy.LINEAR,
        initial_delay=2.0    # 2s → 4s → 6s
    )
    ```

    适用于重试间隔需要可预测增长的场景，例如等待数据库锁释放。
  </Tab>
  <Tab title="固定退避">
    ```python
    from semantica.pipeline import RetryPolicy, RetryStrategy

    policy = RetryPolicy(
        max_retries=5,
        strategy=RetryStrategy.FIXED,
        initial_delay=1.0    # 1s every attempt
    )
    ```

    适用于对具有固定冷却窗口的服务进行重试的场景。
  </Tab>
</Tabs>

### 失败策略

| 策略 | 行为 | 适用场景 |
| :-------- | :--------- | :----------- |
| `"skip"` | 记录失败，继续处理下一个文档 | 生产环境：单个坏文档不应中断 1 万个文档的任务 |
| `"stop"` | 立即抛出异常 | 开发阶段：快速暴露错误 |
| `"retry"` | 按 `RetryPolicy` 重试，之后跳过 | 失败很可能是瞬时性的场景 |

<Warning>
  生产环境中应配置带重试上限的 `RetryPolicy`，避免单个步骤失败导致整个运行中断。执行结束后，检查 `result.errors` 找出并重新处理失败的文档。
</Warning>

<Warning>
  **在生产环境中配置重试策略以隔离失败。** 使用 `handler.set_retry_policy("step_type", RetryPolicy(max_retries=3))`，让瞬时错误在不中断 pipeline 的情况下重试。运行结束后，检查 `result.errors` 找出并重新处理耗尽重试次数的文档。
</Warning>

## 进度跟踪

<Tabs>
  <Tab title="控制台（tqdm）">
    ```python
    from semantica.pipeline import ExecutionEngine

    engine = ExecutionEngine()
    result = engine.execute_pipeline(pipeline, data="data/")
    # The progress tracker outputs tqdm bars to the console during execution
    ```

    通过 Semantica 内置的进度跟踪器在终端显示实时进度条。最适合脚本与 CLI 工具。
  </Tab>
  <Tab title="实时状态检查">
    ```python
    from semantica.pipeline import ExecutionEngine
    import threading, time

    engine = ExecutionEngine()

    # Run in a background thread, poll progress from main thread
    def run():
        engine.execute_pipeline(pipeline, data="data/")

    t = threading.Thread(target=run, daemon=True)
    t.start()

    while t.is_alive():
        progress = engine.get_progress(pipeline.name)
        if progress:
            print(f"  {progress['completed_steps']}/{progress['total_steps']} steps: {progress['status']}")
        time.sleep(2)
    ```

    执行期间轮询 `get_progress()` 获取实时状态。
  </Tab>
</Tabs>

## Pipeline DSL

`PipelineBuilder` 通过 `add_step(name, type, **config)` 与 `connect_steps(from, to)` 定义 DAG：

```python
from semantica.pipeline import PipelineBuilder, ExecutionEngine

builder = PipelineBuilder()

# Add steps: step_type is a string label, handler is the callable invoked at runtime
builder.add_step("ingest",      "file_ingest",    handler=ingestor.ingest_file)
builder.add_step("parse",       "document_parse", handler=parser.parse)
builder.add_step("normalize",   "text_normalize", handler=normalizer.normalize)
builder.add_step("extract",     "ner_extract",    handler=extractor.extract)
builder.add_step("rel_extract", "rel_extract",    handler=rel_extractor.extract)
builder.add_step("build_kg",    "graph_build",    handler=kg_builder.build)
builder.add_step("deduplicate", "dedup",          handler=deduplicator.deduplicate)
builder.add_step("export",      "rdf_export",     handler=exporter.export, format="turtle", path="output.ttl")

# Wire the data flow
builder.connect_steps("ingest",      "parse")
builder.connect_steps("parse",       "normalize")
builder.connect_steps("normalize",   "extract")
builder.connect_steps("extract",     "rel_extract")
builder.connect_steps("rel_extract", "build_kg")
builder.connect_steps("build_kg",    "deduplicate")
builder.connect_steps("deduplicate", "export")

pipeline = builder.build("full_pipeline")
result   = ExecutionEngine().execute_pipeline(pipeline, data="data/")
```

## 序列化与恢复 Pipeline

`PipelineSerializer` 可将 pipeline 转换为 JSON 或 dict 以便存储，之后再重新加载：

```python
from semantica.pipeline import PipelineSerializer

serializer = PipelineSerializer()

# Serialize to JSON string
json_str = serializer.serialize_pipeline(pipeline, format="json")

# Save to file
with open("pipeline_config.json", "w") as f:
    f.write(json_str)

# Restore on any machine and execute
with open("pipeline_config.json") as f:
    restored = serializer.deserialize_pipeline(f.read())

result = ExecutionEngine().execute_pipeline(restored, data="data/")
```

<Tip>
  序列化后的 pipeline 会保留步骤名、类型与配置，但不包含 handler 函数（可调用对象无法序列化）。执行前需在恢复后的步骤上重新注册 handler。
</Tip>

## 预置模板

`PipelineTemplateManager` 以正确的步骤顺序装配常见工作流，无需手动连线：

```python
from semantica.pipeline import PipelineTemplateManager

manager = PipelineTemplateManager()
```

`create_pipeline_from_template(name)` 方法返回已配置好的 `PipelineBuilder`。对其调用 `.build(pipeline_name)` 即可生成可运行的 `Pipeline`。

- **document_processing** — **摄取 → 解析 → 规范化 → 提取 → 嵌入 → 构建知识图谱** — 从摄取到知识图谱的完整文档处理。

  ```python
  builder  = manager.create_pipeline_from_template("document_processing")
  pipeline = builder.build("doc_pipeline")
  ```

- **rag_pipeline** — **摄取 → 分块 → 嵌入 → 存储向量** — 用于问答的 RAG 流水线：构建向量索引存储。

  ```python
  builder  = manager.create_pipeline_from_template("rag_pipeline")
  pipeline = builder.build("rag_pipeline")
  ```

- **kg_construction** — **摄取 → 提取实体 → 提取关系 → 去重 → 消解 → 构建图** — 从多个来源构建知识图谱。

  ```python
  builder  = manager.create_pipeline_from_template("kg_construction")
  pipeline = builder.build("kg_pipeline")
  ```

- **ontology_generation** — **提取概念 → 推断类 → 推断属性 → 生成 OWL → 验证** — 从提取的数据生成本体。

  ```python
  builder  = manager.create_pipeline_from_template("ontology_generation")
  pipeline = builder.build("ontology_pipeline")
  ```

<Tip>
  **使用 `PipelineTemplateManager` 中的模板应对常见模式。** `create_pipeline_from_template("kg_construction")` 按正确顺序连接规范化、去重、冲突检测和图构建：避免诸如在规范化之前就去重之类的常见错误。
</Tip>

## ExecutionEngine

对流水线执行进行细粒度控制：暂停、恢复、取消以及检查实时进度：

```python
from semantica.pipeline import ExecutionEngine

engine = ExecutionEngine(max_workers=4)

# pipeline.name is the pipeline ID used for all control operations
result = engine.execute_pipeline(pipeline, data="data/")

pipeline_id = pipeline.name   # e.g. "my_pipeline"

# Pause after the current step finishes
engine.pause_pipeline(pipeline_id)

progress = engine.get_progress(pipeline_id)
print(f"Completed: {progress['completed_steps']}/{progress['total_steps']}")
print(f"Status: {progress['status']}")

engine.resume_pipeline(pipeline_id)
engine.stop_pipeline(pipeline_id)
```

| 方法 | 返回 | 描述 |
| :------ | :------- | :----------- |
| `execute_pipeline(pipeline, data)` | `ExecutionResult` | 从头到尾执行流水线 |
| `get_pipeline_status(pipeline_id)` | `PipelineStatus` | 当前状态（RUNNING、PAUSED、STOPPED）|
| `get_progress(pipeline_id)` | `Dict` | `completed_steps`、`total_steps`、`progress_percentage`、`status` |
| `pause_pipeline(pipeline_id)` | `None` | 在当前步骤完成后挂起 |
| `resume_pipeline(pipeline_id)` | `None` | 从暂停状态恢复 |
| `stop_pipeline(pipeline_id)` | `None` | 立即取消并清理 |

## PipelineValidator

在问题演变为运行中途失败之前将其捕获：

```python
from semantica.pipeline import PipelineValidator

validator = PipelineValidator()
result    = validator.validate_pipeline(pipeline)

if result.valid:
    print("Pipeline is valid: safe to run")
else:
    for error in result.errors:     # errors is List[str]
        print(f"Error: {error}")
    for warning in result.warnings: # warnings is List[str]
        print(f"Warning: {warning}")
```

执行的检查：
- **依赖环检测**：A 依赖 B，B 依赖 A
- **步骤类型验证**：每个步骤类型都必须已注册
- **连接完整性**：引用的步骤名称必须存在
- **配置完整性**：必需参数必须存在

## ParallelismManager

<Tabs>
  <Tab title="线程池（I/O 密集型）">
    ```python
    from semantica.pipeline import ParallelismManager, Task

    # use_processes=False (default) → thread pool for I/O-bound tasks
    manager = ParallelismManager(max_workers=8, use_processes=False)

    tasks   = [Task(task_id=f"t{i}", handler=ner.extract, args=(text,)) for i, text in enumerate(texts)]
    results = manager.execute_parallel(tasks)
    # returns List[ParallelExecutionResult]

    successes = [r for r in results if r.success]
    failures  = [r for r in results if not r.success]
    ```

    对 **I/O 密集型**步骤使用线程池：web 抓取、数据库查询、API 调用。
  </Tab>
  <Tab title="进程池（CPU 密集型）">
    ```python
    from semantica.pipeline import ParallelismManager, Task

    # use_processes=True → process pool, bypasses Python GIL
    manager = ParallelismManager(max_workers=4, use_processes=True)

    tasks   = [Task(task_id=f"t{i}", handler=embedder.generate_embeddings, args=(chunk,)) for i, chunk in enumerate(chunks)]
    results = manager.execute_parallel(tasks)
    ```

    对 **CPU 密集型**步骤使用进程池：嵌入、OCR、大型 NER 批次。
  </Tab>
</Tabs>

## ResourceScheduler

防止大型运行中出现内存超额分配：

```python
from semantica.pipeline import ResourceScheduler, ExecutionEngine

scheduler = ResourceScheduler()
engine    = ExecutionEngine()

resources = scheduler.allocate_resources(pipeline)

try:
    result = engine.execute_pipeline(pipeline, data="data/")
finally:
    scheduler.release_resources(resources)
```

## 增量模式

仅重新处理自上次运行以来发生变化的数据：

```python
from semantica.pipeline import PipelineBuilder, ExecutionEngine

builder = PipelineBuilder()

# delta_mode=True tells ExecutionEngine to compute the diff between two snapshots
# and pass only changed triples to this step's handler
builder.add_step(
    "ingest",  "file_ingest",
    handler=ingestor.ingest_file,
    delta_mode=True, base_version_id="v1", target_version_id="v2"
)
builder.add_step(
    "extract", "ner_extract",
    handler=extractor.extract,
    delta_mode=True, base_version_id="v1", target_version_id="v2"
)
builder.add_step(
    "build", "graph_build",
    handler=kg_builder.build,
    delta_mode=False  # always rebuild the merged graph
)
builder.connect_steps("ingest", "extract")
builder.connect_steps("extract", "build")

pipeline = builder.build("delta_pipeline")
engine   = ExecutionEngine()
result   = engine.execute_pipeline(
    pipeline,
    data="data/",
    version_manager=version_manager,   # required for delta mode
    triplet_store=triplet_store        # required for delta mode
)
```

<Note>
  增量检测使用 SHA-256 校验和检查源内容。只有校验和与 `base_version_id` 不同的源才会被传递到下游步骤。对于针对不断增长的语料库按小时或按天运行的流水线，增量模式可消除冗余的重复嵌入和重复提取。
</Note>

## SPARQL CONSTRUCT 模板步骤

使用 `"construct_template"` 步骤类型来渲染并执行 [SPARQL CONSTRUCT 模板](/zh/reference/triplet_store#sparql-construct-templates)，作为流水线中的一环。`store_backend` 和 `construct_template_registry` 是执行期资源，而非步骤配置——将它们传给 `execute_pipeline()`，就像 `delta_mode` 步骤接收 `version_manager` 和 `triplet_store` 一样：

```python
from semantica.pipeline import PipelineBuilder, ExecutionEngine
from semantica.triplet_store.construct_templates import construct_template_step_handler

builder = PipelineBuilder()
builder.add_step(
    "apply_person_template",
    "construct_template",
    handler=construct_template_step_handler,
    template_name="person_to_foaf",
    params={"subject": "http://ex.org/p1", "name": "Alice", "age": 30},
    target_graph="http://ex.org/graphs/people",
)
pipeline = builder.build("person_pipeline")

engine = ExecutionEngine()
result = engine.execute_pipeline(
    pipeline,
    data=None,
    store_backend=store,                   # required: a BlazegraphStore instance
    construct_template_registry=registry,  # required: holds the registered template
)

triplets = result.output   # List[Triplet], already persisted via store.add_triplets
```

<Note>
  如果 `execute_pipeline()` 的选项中缺少 `store_backend` 或 `construct_template_registry`，`construct_template` 步骤会抛出 `ProcessingError`；如果 `template_name` 未注册，则会抛出 `ValidationError`。
</Note>

## 结构

<AccordionGroup>
  <Accordion title="ExecutionResult 结构">

```python
@dataclass
class ExecutionResult:
    success:  bool            # True if all steps completed without failure
    output:   Any             # output from the final pipeline step
    metadata: Dict[str, Any]  # {"pipeline_id": "...", "execution_time": 1.23}
    metrics:  Dict[str, Any]  # {"steps_executed": 4, "steps_failed": 0, "execution_time": 1.23}
    errors:   List[str]       # error messages from failed steps (empty on full success)

# Access pattern
result.success                       # bool
result.output                        # final step output
result.metadata["pipeline_id"]       # pipeline name used as ID
result.metadata["execution_time"]    # total wall-clock seconds
result.metrics["steps_executed"]     # count of successfully completed steps
result.metrics["steps_failed"]       # count of failed steps
result.errors                        # List[str] of error messages
```

  </Accordion>
  <Accordion title="PipelineStep 结构">

```python
@dataclass
class PipelineStep:
    name:              str
    step_type:         str
    config:            Dict[str, Any]
    dependencies:      List[str]          # names of steps this step waits for
    handler:           Optional[Callable]
    status:            StepStatus
    result:            Any
    error:             Optional[Exception]
    delta_mode:        bool               # True = process only changed data
    base_version_id:   Optional[str]     # snapshot ID to diff against
    target_version_id: Optional[str]     # snapshot ID being produced
```

  </Accordion>
  <Accordion title="StepStatus 枚举">

```python
from semantica.pipeline import StepStatus

StepStatus.PENDING    # Not yet started
StepStatus.RUNNING    # Currently executing
StepStatus.COMPLETED  # Finished successfully
StepStatus.FAILED     # Error occurred: check step.error
StepStatus.SKIPPED    # Skipped due to FailureHandler "skip" strategy
```

  </Accordion>
</AccordionGroup>

- [摄取](/zh/reference/ingest) — 大多数流水线的第一步。
- [语义提取](/zh/reference/semantic_extract) — 核心提取步骤。
- [知识图谱](/zh/reference/kg) — 图构建步骤。
- [导出](/zh/reference/export) — 最终输出步骤。