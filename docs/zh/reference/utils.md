---
title: "Utils 模块"
description: "用于日志记录、验证、错误处理、进度跟踪和常见操作的共享工具。"
icon: "wrench"
sourceHash: "21be0e1a77db21a2b65a1c90ed532d57639b0cb40d8068bbec869a9f785b3be1"
---

**`semantica.utils`** 提供贯穿 Semantica 的**共享基础设施**：

- 结构化日志：`setup_logging()`、`get_logger()`、`log_execution_time` 装饰器
- 验证辅助函数：`validate_entity()` 和 `validate_config()` 返回 `(bool, Optional[str])`，不抛出异常
- 进度跟踪：`ProgressTracker` 类与带 ETA 的 `track_progress()` 可迭代包装器
- 类型化异常：`SemanticaError`、`ValidationError`、`ProcessingError`、`ConfigurationError`、`QualityError`

大多数用户不会直接调用 utils：它是所有模块的**共享基础**。


## 导出的类

| 名称 | 类型 | 作用 |
| :--- | :--- | :--- |
| `setup_logging` | function | 配置 `semantica` 根日志记录器：接受 `level`、`file`、`console`、`rotation` 关键字参数 |
| `get_logger` | function | 获取具名日志记录器实例（`semantica.<name>`） |
| `log_execution_time` | decorator | 包装函数：记录名称、执行时间以及成功/失败 |
| `log_performance` | function | 记录预先收集的性能指标：`log_performance(func_name, execution_time, **metrics)` |
| `validate_entity` | function | 验证实体字典：返回 `(bool, Optional[str])`；不抛出异常 |
| `validate_config` | function | 验证配置字典：返回 `(bool, Optional[str])`；不抛出异常 |
| `ProgressTracker` | class | 基于类的进度跟踪器，支持 ETA 和步骤回调 |
| `track_progress` | function | 为任意可迭代对象包装实时进度条 |
| `clean_text` | function | 规范化空白字符并去除零宽控制字符 |
| `hash_data` | function | 对 `str`、`bytes` 或 `dict` 计算确定性 SHA-256 哈希 |
| `SemanticaError` | exception | 所有 Semantica 错误的基类异常 |
| `ValidationError` | exception | 输入未通过验证时抛出；具有 `.field`、`.value`、`.message` |
| `ProcessingError` | exception | 在提取、图构建或流水线步骤期间抛出；具有 `.stage` |
| `ConfigurationError` | exception | 配置验证失败时抛出 |
| `QualityError` | exception | 数据质量低于阈值时抛出 |

## 提供的功能

- **日志记录** — 结构化日志，支持 `@log_execution_time` 装饰器，并通过环境变量提供质量指标。
- **验证** — `validate_entity` 和 `validate_config`，配合携带字段和值上下文的类型化 `ValidationError`。
- **进度跟踪** — `track_progress` 包装任意可迭代对象：自动检测控制台与 Jupyter 以选择合适的渲染器。
- **辅助函数** — `clean_text`、`hash_data`、`safe_filename` 以及框架各处使用的嵌套字典工具。
- **异常层级** — `SemanticaError` → `ValidationError`、`ProcessingError`：类型化异常，便于针对性恢复。
- **文件工具** — `read_json_file` 在失败时抛出 `FileNotFoundError` 或 `json.JSONDecodeError`：无需围绕 JSON I/O 编写样板式 try/except。

## 日志记录

<Steps>
  <Step title="在应用程序启动时初始化日志记录">
    ```python
    from semantica.utils import setup_logging, get_logger

    setup_logging(level="INFO")   # "DEBUG" | "INFO" | "WARNING" | "ERROR"
    logger = get_logger(__name__)
    ```

    <Warning>
      **在应用程序启动时调用一次 `setup_logging(level="INFO")`。** 否则，Semantica 会回退到 Python 的根日志记录器，它可能静默或配置不当。请在导入其他 Semantica 模块之前调用它，以捕获初始化消息。
    </Warning>
  </Step>
  <Step title="使用性能装饰器为耗时函数添加监测">
    ```python
    from semantica.utils import log_execution_time

    @log_execution_time
    def expensive_step(data):
        ...
    # Logs: "expensive_step completed in 2.34s"
    ```

    <Tip>
      **`@log_execution_time` 是性能装饰器。** 将其应用于任意函数，即可自动记录其名称、执行时间以及成功/失败。`log_performance` 是用于记录你已收集指标的更低层函数：它不是装饰器。
    </Tip>
  </Step>
  <Step title="通过环境变量进行配置">
    ```bash
    export SEMANTICA_LOG_LEVEL=DEBUG
    export SEMANTICA_LOG_FORMAT=json     # "json" | "text"
    export SEMANTICA_DISABLE_PROGRESS=true
    export SEMANTICA_FORCE_PROGRESS=true
    ```

    <Tip>
      **进度条跟随你的终端。** 仅当 stdout 是交互式终端（或 Jupyter notebook）时才会写入控制台进度，
      因此通过管道或重定向输出时，日志不再被进度条和转义序列填满。
      设置 `SEMANTICA_DISABLE_PROGRESS` 可在终端中也静默进度，或设置
      `SEMANTICA_FORCE_PROGRESS` 在 stdout 被重定向时仍保留进度。
      若两者同时设置，`SEMANTICA_DISABLE_PROGRESS` 优先。
    </Tip>
  </Step>
</Steps>

## 验证

```python
from semantica.utils import validate_entity, validate_config, ValidationError

# validate_entity returns (is_valid, error_message)
is_valid, error = validate_entity({"id": "1", "type": "PERSON", "text": "Alice"})
if not is_valid:
    raise ValidationError(error)

# validate_config returns (is_valid, error_message)
is_valid, error = validate_config(config, required_keys=["model", "provider"])
if not is_valid:
    print(f"Invalid config: {error}")
```

| 函数 | 描述 | 返回 |
| :-------- | :----------- | :------- |
| `validate_entity(data)` | 检查实体字典是否具有**必需**字段（`id`、`text`、`type`）且类型正确 | `Tuple[bool, Optional[str]]` |
| `validate_config(cfg, required_keys=None)` | 检查配置字典；可选地强制要求**必需**键 | `Tuple[bool, Optional[str]]` |

## 进度跟踪

```python
from semantica.utils import track_progress

# Wraps any iterable: auto-detects console vs Jupyter
for item in track_progress(items, desc="Processing documents"):
    process(item)
```

支持：

- **控制台**：带 ETA 的 tqdm 进度条
- **Jupyter**：兼容 notebook 的控件（自动检测）
- **文件**：将进度写入日志文件

<Tip>
  **`track_progress` 会自动检测 Jupyter。** 在终端中渲染 tqdm 进度条；在 Jupyter notebook 中渲染交互式控件。你无需检查环境：同一调用在两种环境下均可工作。
</Tip>

## 辅助函数

```python
from semantica.utils import clean_text, hash_data, safe_filename

# Normalize whitespace and strip control characters
clean = clean_text("  Hello   World  ")     # -> "Hello World"

# Deterministic SHA-256 hash of a string, bytes, or dict
uid   = hash_data({"key": "value"})         # -> hex digest string

# Sanitize a string for use as a filename
fname = safe_filename("My File?.txt")       # -> "My_File.txt"
```

<Tip>
  **`hash_data()` 在多次运行间具有确定性。** 给定相同的输入字典（任意可 JSON 序列化的对象），`hash_data()` 始终返回相同的 SHA-256 十六进制字符串：适合作为流水线步骤中的缓存键或幂等令牌。
</Tip>

## 嵌套字典工具

用于深度配置访问的辅助函数：在 `Config` 和 `ConfigManager` 内部大量使用：

```python
from semantica.utils import get_nested_value, set_nested_value, merge_dicts

config = {
    "processing": {"batch_size": 32, "max_workers": 4},
    "llm":        {"provider": "groq", "model": "llama-3.3-70b-versatile"},
}

# Dot-notation read: returns default if key path is absent
batch = get_nested_value(config, "processing.batch_size", default=16)
# -> 32

# Dot-notation write
set_nested_value(config, "processing.batch_size", 64)

# Deep merge: nested keys are merged recursively (deep=True by default)
base      = {"a": {"x": 1, "y": 2}, "b": 3}
overrides = {"a": {"y": 99, "z": 4}, "c": 5}
merged    = merge_dicts(base, overrides)
# -> {"a": {"x": 1, "y": 99, "z": 4}, "b": 3, "c": 5}
```

## 异常层级

<AccordionGroup>
  <Accordion title="异常类型及其抛出时机">

```python
from semantica.utils import SemanticaError, ValidationError, ProcessingError

try:
    run_pipeline(data)
except ValidationError as e:
    # Input data did not pass schema validation
    logger.error("Validation failed: %s", e.message)
except ProcessingError as e:
    # Failure during extraction or graph construction
    logger.error("Processing failed at stage %s: %s", e.stage, e)
except SemanticaError as e:
    # Catch-all for all Semantica framework errors
    logger.error("Framework error: %s", e)
```

| 异常 | 抛出时机 | 关键属性 |
| :--------- | :----------- | :-------------- |
| `SemanticaError` | 基类：所有框架错误均继承自它 | `.message`、`.context`、`.error_code` |
| `ValidationError` | 输入数据未通过模式或类型验证 | `.field`、`.value`、`.constraint` |
| `ProcessingError` | 在提取、图构建或流水线步骤期间失败 | `.stage`、`.input_data`、`.output_data` |
| `ConfigurationError` | 配置键缺失或类型错误 | `.config_key`、`.config_value`、`.expected_type` |
| `QualityError` | 数据质量得分低于阈值 | `.quality_score`、`.threshold`、`.metrics` |

  </Accordion>
</AccordionGroup>

<Tip>
  **将 `SemanticaError` 作为最宽泛的异常捕获网。** 所有框架错误均继承自 `SemanticaError`，因此 `except SemanticaError` 可捕获验证失败、处理错误以及其间的一切。针对特定的恢复逻辑，请使用具体的子类。
</Tip>

## 文件工具

```python
from semantica.utils import read_json_file

# Read and parse a JSON file: raises FileNotFoundError or json.JSONDecodeError on failure
config = read_json_file("config.json")
```

- [Core](/zh/reference/core) — 在内部使用 Utils 的框架编排。
- [Pipeline](/zh/reference/pipeline) — 使用 ProgressTracker 进行逐步跟踪。