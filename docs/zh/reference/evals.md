---
title: "Evals 模块"
description: "使用确定性评估器和模型评估器，外加一个小型运行框架，对决策记录、审计轨迹和推理输出进行评分。"
icon: "chart-line"
sourceHash: "df07319d74e68df37f21ca5365f63fdc055b409d0ae3ceab54cacf3a90190ad1"
---

`semantica.evals` 衡量决策智能输出的质量。它接收流水线产出的决策、审计轨迹和推理文本，按照你定义的预期对它们评分，并返回结构化摘要，可用于记录日志、在测试中做断言，或跨运行追踪。

- 一个具名评估器注册表，涵盖从精确字符串匹配到 ROUGE 重叠度以及 LLM-as-judge 的各种评估器
- `decision_scores`，针对 `Decision` 对象的复合评估器，检查结果、置信度边界、必填字段、溯源，以及（可选）策略合规性
- 一个 `evaluate()` 运行器，将多个评估器应用于一组用例，并聚合通过 / 失败 / 错误计数
- 每个评估器的**目标（objective）**，让你在运行层面覆盖评估器内置的判定结果

<Note>
  该模块与包的版本相互独立：`semantica.evals.__version__` 为 `"0.1.0"`。此处描述的公开接口是稳定的，但在达到 1.0 之前，仍会有增量变更（新的评估器、新的 objective 选项）。
</Note>

## 公开 API

| 名称 | 类型 | 作用 |
| :--- | :--- | :--- |
| `evaluate(cases, evaluators, config=None, target_fn=None)` | 函数 | 对每个用例运行具名评估器，返回 `EvalSummary` |
| `evaluate_repeated(cases, evaluators, config=None, target_fn=None, runs=10)` | 函数 | 对每个用例重复运行 `target_fn` 并聚合统计信息，返回 `RepeatedSummary` |
| `list_evaluators()` | 函数 | 所有已注册评估器的名称（已排序） |
| `get_evaluator(name)` | 函数 | 按名称查找单个评估器函数 |
| `EvalMetric` | 数据类（不可变） | 单个评估器的结果：`score`、`passed`、`meta` |
| `CaseResult` | 命名元组 | 单个用例的结果：`case_id`、`status`、`metrics`、`details` |
| `EvalSummary` | 数据类 | 跨用例聚合：`total`、`passed`、`failed`、`errors`、`pass_rate`、`cases` |
| `SampleStats` | 数据类（不可变） | 重复运行中单个评估器的统计：`n`、`passes`、`errors`、`pass_rate`、`mean_score`、`stddev`、`any_passed`、`all_passed`、`objective_passed`、`samples` |
| `RepeatedCaseResult` | 数据类（不可变） | 单个用例的重复结果：`case_id`、`verdict`、`stats` |
| `RepeatedSummary` | 数据类 | 跨重复采样用例的聚合：`runs`、`stable_pass`、`flaky`、`stable_fail`、`errors`、`cases` |

```python
import semantica.evals as evals
from semantica.evals import evaluate, evaluate_repeated, list_evaluators, get_evaluator
```

## 内置评估器

每个评估器都是一个普通函数 `fn(actual, expected, config=None) -> EvalMetric`，注册在稳定的名称下。`list_evaluators()` 返回当前集合：

```python
>>> list_evaluators()
['decision_scores', 'exact_match', 'keyword_check', 'length_range',
 'levenshtein', 'llm_as_judge', 'numeric_range', 'regex_match', 'rouge',
 'temporal_range']
```

| 名称 | 通过条件 | 相关 `config` 键 |
| :--- | :--- | :--- |
| `exact_match` | `actual == expected` | 无 |
| `regex_match` | `re.search(expected, actual)` 匹配 | 无 |
| `keyword_check` | 每个必需词项都出现在 `actual` 中（按词边界匹配） | `required`（缺失时回退到 `expected`） |
| `numeric_range` | `min <= actual <= max` | `min`、`max`（均为必填） |
| `temporal_range` | ISO 日期时间 `actual` 落在 `[min, max]` 内 | `min`、`max` 为 ISO 字符串（均为必填） |
| `length_range` | `min <= len(actual) <= max` | `min`（默认 0）、`max`（必填） |
| `levenshtein` | 归一化相似度 `>= threshold` | `threshold`（默认 0.8） |
| `rouge` | ROUGE-1 F1 `> 0` 且 `>= threshold` | `threshold`（默认 0.0） |
| `llm_as_judge` | 调用方提供的 `judge_fn(actual, expected)` 返回真值 | `judge_fn`（必填可调用对象） |
| `decision_scores` | `Decision` 上所有已配置的子检查都通过 | 见下文 |

无法运行的评估器（正则非法、日期时间无法解析、没有 `judge_fn`）不会抛出异常，而是返回一个 `meta` 中含有 `"error"` 键的 `EvalMetric`。需要数值边界的评估器（`numeric_range`、`length_range`）在缺少边界时则返回失败指标，并带有 `"reason"` 键——它们不会抛出异常，也不会设置 `"error"`。

### `decision_scores`

`decision_scores` 接受一个 `Decision`（来自 `semantica.context.decision_models`）或其字典形式，并运行一组字段级检查与治理检查。分数为通过的检查所占比例；仅当所有检查都通过时 `passed` 才为 `True`。

| 子检查 | 控制方式 |
| :--- | :--- |
| 结果匹配 | config 中的 `expected_outcome`，或用例的 `expected`；两者都未设置时**跳过** |
| 置信度在范围内 | `min_confidence`（默认 0.0）、`max_confidence`（默认 1.0）；始终运行 |
| `decision_maker`、`reasoning`、`scenario` 非空 | 始终运行 |
| 元数据中存在溯源信息 | `provenance_key`（默认 `"provenance"`）；始终运行 |
| 策略合规性 | 同时设置 `policy_engine` 和 `policy_id`；否则跳过 |

在 config 中传入 `causal_chain_exists` 会抛出 `NotImplementedError`。该键是为未来版本预留的位置。

## 运行评估

`evaluate()` 接收用例列表和评估器名称列表。用例可以是 `(expected, actual)` 元组，也可以是字典：

```python
{
    "id": "loan-001",          # optional, generated if absent
    "expected": ...,           # optional; some evaluators read it, some don't
    "actual": ...,             # the value under test
    "config": {...},           # optional, per-evaluator settings for this case
    "target_fn": callable,     # optional, called with the case to produce `actual`
}
```

如果缺少 `actual`，运行器会调用用例自身的 `target_fn`（或传给 `evaluate()` 的 `target_fn`）来生成它。用例级 `config` 会深度合并到顶层 `config` 之上，因此某个用例可以覆盖单个评估器的设置而不丢弃其余设置。

```python
from datetime import datetime

from semantica.context.decision_models import Decision
from semantica.evals import evaluate

decision = Decision(
    decision_id="d-1",
    category="loan",
    scenario="loan-request",
    reasoning="vetted against lending policy v3",
    outcome="approve",
    confidence=0.87,
    timestamp=datetime.now(),
    decision_maker="approver-a",
    metadata={"provenance": "workflow:loan/v3"},
)

cases = [
    {
        "id": "loan-001",
        "actual": decision,
        "config": {
            "decision_scores": {
                "expected_outcome": "approve",
                "min_confidence": 0.7,
            }
        },
    },
]

summary = evaluate(cases, ["decision_scores"])
print(summary.pass_rate)   # 1.0
```

评估器对每个用例独立运行。若某个评估器抛出异常，该用例的 `status` 会变为 `"error"`，异常文本会被记录到该指标的 `meta` 中；运行的其余部分继续进行。

## 目标（Objectives）

默认情况下，每个评估器自行决定通过 / 失败。**objective** 在运行层面覆盖该判定，按评估器名称放在 `config` 下：

```python
# Raise levenshtein's bar from its default 0.8 to 0.9
evaluate(
    [("apple", "aple")],
    evaluators=["levenshtein"],
    config={"levenshtein": {"objective": {"direction": "maximize", "threshold": 0.9}}},
)

# Lower is better
evaluate(
    [("night", "nacht")],
    evaluators=["levenshtein"],
    config={"levenshtein": {"objective": {"direction": "minimize", "threshold": 0.5}}},
)

# Expect the metric NOT to match
evaluate(
    [("ok", "ok")],
    evaluators=["exact_match"],
    config={"exact_match": {"objective": {"expect": False}}},
)
```

规则：

- 带 `threshold` 的 `maximize`：当且仅当 `score >= threshold` 时通过。不带 threshold 的 `maximize` 不产生任何效果，采用评估器自身的判定。
- 带 `threshold` 的 `minimize`：当且仅当 `score <= threshold` 时通过。`minimize` **必须**提供 threshold；省略会抛出 `ValueError`。
- `expect`（`True` / `False`）：当且仅当 `bool(score)` 与其相等时通过。不能与 `direction` 或 `threshold` 组合使用，且必须是真正的布尔值。
- 已在 `meta` 中带有 `"error"` 的指标不受任何 objective 影响。
- 无效的 objective 配置会在任何评估器运行之前对每个用例逐一校验，因此错误的 objective 会让整个运行在开始时直接失败，而不是执行到中途才失败。

## 读取摘要

```python
summary = evaluate(cases, ["decision_scores"])

summary.total, summary.passed, summary.failed, summary.errors
summary.pass_rate    # passed / total, or 1.0 for an empty case list

for case in summary.cases:
    print(case.case_id, case.status)          # status: "pass" | "fail" | "error"
    for name, metric in case.metrics.items():
        print(name, metric.score, metric.passed)
        print(metric.meta.get("reasons", {}))  # per-sub-check failure reasons
```

`EvalMetric`、`SampleStats` 和 `RepeatedCaseResult` 是不可变数据类（`score: float`、`passed: bool`、`meta: dict`、……）。`CaseResult` 是命名元组，各 `*Summary` 类是普通数据类，因此都易于序列化，可用于日志记录或回归追踪。

## 重复采样

对于非确定性的目标（LLM 驱动的抽取、智能体流水线、基于采样的评判器），单次判定提供的信息很有限。`evaluate_repeated` 会对每个用例重复运行 `target_fn` `n` 次，并聚合每个评估器的统计信息：

```python
from semantica.evals import evaluate_repeated

summary = evaluate_repeated(
    cases,                       # must be dict cases; see below
    evaluators=["exact_match"],
    target_fn=pipeline_run,      # called once per run to produce a fresh `actual`
    runs=10,
)

summary.runs            # 10
summary.cases[0].verdict  # "stable_pass" | "flaky" | "stable_fail" | "error"
summary.cases[0].stats["exact_match"].pass_rate   # e.g. 0.8
summary.cases[0].stats["exact_match"].stddev      # e.g. 0.13
```

每个评估器的 `SampleStats` 携带 `n`、`passes`、`errors`、`pass_rate`（`passes / n`）、`mean_score`、`stddev`，以及派生布尔值 `any_passed`（观测到的 pass@n）和 `all_passed`（观测到的 pass^n）。判定结果汇总所有样本：每次运行的每个评估器都通过时为 `stable_pass`，全部未通过时为 `stable_fail`，样本中既有通过又有失败时为 `flaky`，某次运行出错时为 `error`。

要求与边界情况：

- 每个用例可以是字典或 `(expected, actual)` 元组，与 `evaluate()` 一致。带有**非空**静态 `actual` 的用例没有可采样的内容；在 `runs > 1` 时使用它会抛出 `ValueError`。`actual` 为 `None` 时视为缺失，因此与 `evaluate()` 中一样回退到解析器。
- `target_fn` 抛出的异常和评估器失败会成为每次运行的错误样本，并将该用例标记为 `error`；它们绝不会让运行崩溃。
- objective 层像 `evaluate()` 中一样按每次运行应用，同一个 objective 也通过 `SampleStats.objective_passed` 对聚合的 `pass_rate` 施加约束（例如 `{direction: maximize, threshold: 0.8}` 要求跨运行的通过率不低于 80%）。
- 至少需要一个评估器，且评估器名称必须唯一。
- `runs` 必须 `>= 1`。

## 说明

- `llm_as_judge` 需要 `config["judge_fn"]`，即由你提供的可调用对象 `judge_fn(actual, expected) -> bool`。除非你传入，否则不会导入任何 LLM 后端。
- `decision_scores` 的治理检查为可选项：仅当 `policy_engine` 和 `policy_id` 都存在时才评估策略合规性。

## 延伸阅读

- [决策智能](/zh/guides/decision-intelligence) — 生成本模块所评分的 `Decision` 记录
- [推理](/zh/reference/reasoning) — 推理文本评估器可度量的推理输出
- [策略引擎](/zh/guides/policy-engine) — `decision_scores` 所使用的 `policy_engine`
- [本体评估器](/zh/reference/ontology) — 用于本体质量指标的独立工具