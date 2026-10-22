---
title: "策略引擎"
description: "针对知识图谱决策定义、版本化并执行治理策略 — 包含合规检查、违规追踪、影响分析与多级审批工作流。"
icon: "scale-balanced"
sourceHash: "08d5595e18080bec90769700cf61c94ff48eeda24e7cdcd73b14f8290aa2a2cc"
---

## 什么是策略引擎？

策略评估是对决策进行系统性检查，以确认其是否符合预定义的治理规则与约束。与应用层的强制执行不同（后者会自动阻止不合规操作），策略评估提供的是合规状态，可触发不同工作流——审批流程、异常处理或审计要求。

**核心策略概念：**

**策略评估**检查决策是否满足既定标准，但不自动阻止操作，从而实现灵活的治理工作流。

**治理与合规工作流**利用策略评估结果，将决策路由到相应的审批链、异常流程或审计轨迹。

**审批流程**可由策略违规触发，形成有记录的例外路径，并附带理由说明与审批人问责。

**与强制执行的区别：** 策略评估返回合规状态（`True`/`False`），但不会自动阻止操作。由你的工作流决定后续动作——立即批准、升级、异常处理或拒绝。

## 为什么使用策略引擎？

**治理与问责。** 创建可审计的决策工作流，每次策略评估、例外与审批都会连同完整的溯源追踪永久记录在知识图谱中。

**合规验证。** 在决策最终确定或付诸行动之前，系统性地依据监管要求、内部策略与风险管理规则进行检查。

**审批工作流编排。** 将不合规决策导向结构化审批流程，附带书面理由与多级签批。

**监管合规。** 通过维护完整的策略版本历史、例外记录与合规检查轨迹供监管者查验，满足审计要求。

**风险管理。** 标记高风险决策以进行额外审查，同时让日常合规决策以最小摩擦继续推进。

**策略演进追踪。** 借助影响分析维护策略变更的版本历史，支持基于证据的策略优化与监管报告。

## 何时使用 / 何时不使用

**使用策略引擎的场景：**
- 需要结构化审批流程与审计轨迹的治理工作流
- 策略遵循情况必须可记录、可验证的监管合规
- 高风险决策的多级审批工作流（财务审批、安全例外、临床治疗）
- 策略违规会触发特定升级程序的受监管环境
- 不合规决策需要额外监督的风险管理工作流
- 要求完整记录策略应用与例外追踪的审计需求

**不要使用策略引擎的场景：**
- 简单的表单校验或基础输入检查——请改用标准校验库
- 无需审计轨迹或治理工作流的基础业务规则
- 低风险、高吞吐的检查，策略评估开销会影响性能
- 无法从版本追踪与审批流程中获益的确定性规则检查
- 策略评估延迟不可接受的实时运营决策

**警告：** 策略引擎会带来治理开销，并需要谨慎的工作流设计。仅当结构化策略管理带来的收益超过额外复杂度时才使用。

`PolicyEngine` 对已记录的决策执行具名策略，若决策满足全部策略规则则返回 `True`。用它来在运行时为 AI 决策把关——需要双源确认的归因、需要高级审批的升级，或任何必须在结果记录前验证合规性的决策类别。策略是版本化的图节点，因此每次检查、例外与审批链都会成为永久审计轨迹的一部分。

<Info>
策略引擎位于 `AgentContext` 与 `ContextGraph` 之上。策略与决策存储在同一张图中，作为节点存在，因而与其他知识图谱实体一样具备因果追踪、溯源与时间有效性。

**关键对象：** `PolicyEngine` 与 `Policy` 从 `semantica.context` 导入。`Decision` 是一个 dataclass，字段包括 `decision_id`、`category`、`scenario`、`reasoning`、`outcome`、`confidence`、`timestamp`、`decision_maker` 与 `metadata`。`DecisionRecorder` 从 `semantica.context.decision_recorder` 导入，用于审批工作流追踪。
</Info>

## 支持的规则类型

PolicyEngine 实现支持评估决策属性与元数据的特定规则模式：

**置信度规则：**
- `min_confidence: 0.85` — `decision.confidence >= 0.85`

**结果校验：**
- `allowed_outcomes: ["approved", "approved_with_conditions"]` — `decision.outcome` 必须在列表中

**类别校验：**
- `required_categories: ["credit_risk", "operational_risk"]` — `decision.category` 必须在列表中

**元数据字段规则：**
- `min_*: value` — 元数据字段必须 `>= value`（例如 `min_credit_score: 680`）
- `max_*: value` — 元数据字段必须 `<= value`（例如 `max_ltv: 0.85`）
- `required_*: value` — 元数据字段必须等于 `value`（字符串）或包含全部项（列表）

**字段查找行为：** 对于规则 `min_credit_score`，引擎依次检查 `metadata["credit_score"]`、`metadata["*_credit_score"]`（后缀匹配），然后检查 `decision.credit_score` 属性。

**重要：** 以下规则类型不受支持，会导致意外行为：
- `disallowed_outcomes`（请改用 `allowed_outcomes`）
- `mandatory_fields`（针对特定字段请使用 `required_*`）
- `requires_mfa`（请使用 `required_mfa_verified` 之类的元数据字段检查）
- 复杂的嵌套条件或运算符

---

## 定义策略

`Policy` 是一个 dataclass，包含自由形式的 `rules` dict——使用受支持的规则模式来编码你的领域所需内容。

```python
from semantica.context import ContextGraph, PolicyEngine, Policy
from datetime import datetime

graph  = ContextGraph()
engine = PolicyEngine(graph_store=graph)

attribution_policy = Policy(
    policy_id   = "pol-attr-001",
    name        = "Nation-State Attribution — Dual Source + Senior Approval",
    description = (
        "Attributions to nation-state actors require corroboration from two independent "
        "intelligence sources and explicit senior analyst approval before being recorded "
        "in the authoritative graph."
    ),
    rules = {
        "min_independent_sources":  2,
        "required_approver_role":   "senior_analyst",
        "allowed_outcomes":         ["nation_state_attributed_dual_source"],
        "min_confidence":           0.85,
        "required_source_a":        True,
        "required_source_b":        True,
        "required_approver":        True,
    },
    category   = "threat_attribution",
    version    = "1.0.0",
    created_at = datetime.utcnow(),
    updated_at = datetime.utcnow(),
)

policy_id = engine.add_policy(attribution_policy)
print(f"Policy registered: {policy_id}")
# Policy registered: pol-attr-001
```

该策略现在是图中的一个节点。它带有版本字符串、创建时间戳，以及一个 `rules` dict，合规检查器在依据该策略评估决策时会读取它。

---

## 检查决策的合规性

`check_compliance` 接收一个 `Decision` 对象与策略 ID，返回布尔值：若决策符合策略则为 `True`，若已评估且发现不合规则为 `False`。如果检查本身无法执行——例如某个规则值无法与决策的元数据进行比较——`check_compliance` 会抛出 `ProcessingError`，而不是返回 `False`。

```python
from semantica.context import Decision

# The AI analyst's APT29 attribution — only one source cited, no senior approval yet
decision = Decision(
    decision_id   = "",                        # auto-generated if left empty
    category      = "threat_attribution",
    scenario      = "APT29 activity cluster in NATO network telemetry Q2 2025",
    reasoning     = (
        "Observed TTPs match APT29 historical patterns: HAMMERTOSS C2, "
        "spear-phishing via OneDrive lure, targeting foreign ministry staff. "
        "Single source: internal SIEM telemetry."
    ),
    outcome       = "nation_state_attributed_single_source",
    confidence    = 0.91,
    timestamp     = datetime.utcnow(),
    decision_maker= "ai_threat_analyst_v3",
    metadata      = {
        "independent_sources": 1,  # Below min_independent_sources requirement
        "approver_role": "analyst",  # Below required_approver_role
        "source_a": True,  # Has first source
        # Missing source_b and approver fields
    }
)

is_compliant = engine.check_compliance(decision, policy_id)
print(f"Compliant: {is_compliant}")
# Compliant: False
#
# Multiple rule violations:
# - outcome "nation_state_attributed_single_source" not in allowed_outcomes
# - independent_sources (1) < min_independent_sources (2)
# - approver_role "analyst" != required_approver_role "senior_analyst"
# - missing required_source_b and required_approver fields
```

引擎返回 `False`。决策并未被拒绝——而是被标记了。后续如何处理取决于你的工作流。在某些组织中，不合规结果会直接阻止写入权威图；在另一些组织中，则会触发异常流程，由人工审批人审查证据并签批。

### 当检查本身失败时

返回的 `False` 永远是一个判定：规则已执行，而决策未满足它们。这包括决策单纯缺少某条规则所需证据的情况——针对决策并不携带的元数据字段的 `min_`/`max_`/`required_` 规则，按策略计为不合规。

另一种单独情况是规则完全无法评估，例如 `min_confidence` 为 `"high"`，无法与数值型决策置信度进行比较。`check_compliance` 不会将其报告为不合规，而是抛出 `ProcessingError`，这样评估缺陷就绝不会伪装成策略违规。如果你需要将失败与判定分开报告，请包装该调用：

```python
from semantica.utils.exceptions import ProcessingError

try:
    is_compliant = engine.check_compliance(decision, policy_id)
except ProcessingError as e:
    # The rules could not be evaluated — an operational error,
    # not a compliance verdict.
    print(f"Compliance check failed: {e}")
```

---

## 记录策略例外

`record_exception` 会永久地将决策、其所违反的策略、审批人身份与理由关联起来。

```python
exception_id = engine.record_exception(
    decision_id  = decision.decision_id,
    policy_id    = policy_id,
    reason       = "Time-sensitive attribution — protective action required before second source available",
    approver     = "sr_analyst_chen",
    justification= (
        "Senior analyst reviewed SIEM telemetry and concurs with TTP matching. "
        "Exception approved under Emergency Attribution Procedure §3.2. "
        "Second source corroboration to be completed within 72 hours."
    ),
)

print(f"Exception recorded: {exception_id}")
# Exception recorded: exc-pol-attr-001-20250621-001
#
# The exception node is linked to both the decision and the policy in the graph,
# creating a permanent three-way provenance link: decision → exception → policy.
```

---

## 构建多级审批链

对于最高风险的决策——将与政府伙伴共享的正式归因报告——单个审批人是不够的。需要三人签批：团队负责人、部门主管与 CISO。`DecisionRecorder.record_approval_chain` 可在一次调用中记录全部三人，并将每位审批人与签批的沟通方式及上下文关联起来。

```python
from semantica.context.decision_recorder import DecisionRecorder

recorder = DecisionRecorder(graph_store=graph)

# approvers, methods, and contexts must be equal-length parallel lists
recorder.record_approval_chain(
    decision_id = decision.decision_id,
    approvers   = ["team_lead_okonkwo",  "dept_head_zhang",    "ciso_miller"],
    methods     = ["slack_dm",            "zoom_call",           "email"],
    contexts    = [
        "Team lead reviewed TTPs and SIEM evidence",
        "Dept head approved sharing with Five Eyes partners",
        "CISO authorised formal nation-state attribution report",
    ],
)

print("Three-level approval chain recorded")
# The graph now carries a directed approval chain:
#   decision → team_lead_okonkwo → dept_head_zhang → ciso_miller
# Each link is stamped with method and context for Inspector General review.
```

---

## 变更策略前的 What-if 影响分析

六个月后，你的威胁情报负责人想要收紧策略：将最低置信度阈值从 0.85 提高到 0.92，以减少误报归因。在更新策略之前，她想知道在更严格的规则下有多少历史决策会被阻止。

`analyze_policy_impact` 会在历史决策记录上运行 what-if 模拟——不会做出任何永久变更。

```python
current_policy = engine.get_policy(policy_id)

impact = engine.analyze_policy_impact(
    policy_id      = policy_id,
    proposed_rules = {**current_policy.rules, "min_confidence": 0.92},
)

print(f"Decisions affected by raising confidence floor to 0.92: {impact.get('affected_decisions', 0)}")
# Decisions affected by raising confidence floor to 0.92: 4
#
# Four past attributions had confidence between 0.85 and 0.92.
# Under the new rule, all four would have required exceptions.
# The lead can now make an evidence-based choice: is that trade-off acceptable?
```

影响 dict 包含逐决策的明细，而不仅是数量。你可以查看具体哪些归因决策会受影响、审阅它们的推理，并判断收紧阈值是否值得。

---

## 更新策略并查找受影响的决策

负责人决定继续提高阈值。她将策略更新到版本 1.1.0，并记录原因。旧版本保留在历史中。

```python
engine.update_policy(
    policy_id     = policy_id,
    rules         = {**current_policy.rules, "min_confidence": 0.92},
    change_reason = "Q3 attribution quality review — raise confidence floor from 0.85 to 0.92 "
                    "to reduce false-positive nation-state attributions",
    new_version   = "1.1.0",
)

print(f"Policy updated: {policy_id} to version 1.1.0")
# Policy updated: pol-attr-001 to version 1.1.0

# Find all decisions that were evaluated under v1.0.0 —
# these need to be re-reviewed to confirm they still meet the new standard.
affected = engine.get_affected_decisions(
    policy_id    = policy_id,
    from_version = "1.0.0",
    to_version   = "1.1.0",
)

print(f"Decisions to re-audit: {len(affected)}")
for dec in affected:
    print(f"  {dec.get('decision_id')}  confidence={dec.get('confidence')}  outcome={dec.get('outcome')}")
# decision-a3f1  confidence=0.87  outcome=nation_state_attributed
# decision-b22c  confidence=0.89  outcome=nation_state_attributed
# ...
```

这就是重新审计工作流：在旧策略下做出的每个决策都会被呈现出来，依据新标准进行审查，然后要么重新确认，要么标记以便纠正。图中保留了每个决策受哪个策略版本管辖的完整历史。

---

## 审查完整审计轨迹

在任何时候——为监察长审查、董事会报告或事件调查——你都可以检索策略的完整版本历史。

```python
history = engine.get_policy_history(policy_id)

print(f"Policy versions on record: {len(history)}")
for version in history:
    print(f"  v{version.version}  updated={version.updated_at.date()}  rules_keys={list(version.rules.keys())}")
# v1.0.0  updated=2025-06-21  rules_keys=[min_independent_sources, required_approver_role, ...]
# v1.1.0  updated=2025-09-14  rules_keys=[min_independent_sources, required_approver_role, ...]
#
# The full rules dict for each version is preserved — you can replay exactly
# what the compliance check would have returned for any past decision against
# any past version of the policy.
```

---

## 常见陷阱

**假设合规失败会自动阻止操作。** PolicyEngine 返回合规状态，但不会自动阻止操作。你的工作流必须检查返回的布尔值，并决定后续动作——批准、拒绝、异常处理或升级。

**使用不支持的规则键。** 当前实现仅支持特定模式：`min_*`、`max_*`、`required_*`、`min_confidence`、`allowed_outcomes` 与 `required_categories`。任何其他规则键都会退化为键存在性检查：只有当该确切键存在于 `decision.metadata` 中时才会通过，无论其值是什么。这意味着像 `disallowed_outcomes` 这样的键，在元数据中缺少该字面键时（常见情况）会静默**失败**；而如果元数据中恰好存在值为任意的 `disallowed_outcomes` 键，则会静默**通过**——不论实际结果如何。两种行为都不符合预期的“结果不得在此列表中”语义——请改用 `allowed_outcomes`。

**将例外当作审批。** 用 `record_exception()` 记录策略例外，并不会自动使不合规决策变为合规。例外只是审计轨迹条目——你的工作流仍须决定是否继续执行该不合规决策。

**假设 PolicyEngine 会自动修改图状态。** PolicyEngine 仅评估合规性并记录策略应用、例外与审批链。它不会修改决策结果、元数据或阻止操作——那是你的工作流的职责。

**使用复杂的嵌套规则结构。** 当前实现不支持复杂条件逻辑、嵌套运算符或任意表达式。请保持规则简单：仅限单字段比较、列表成员检查与阈值校验。

**规则评估缺少元数据。** 像 `min_credit_score` 这样的规则要求 `decision.metadata` 中存在对应元数据字段（`credit_score`）。元数据字段缺失会导致规则评估失败，从而使决策不合规。

**忘记检查规则评估结果。** 始终显式处理合规与不合规两种情况。不合规决策在缺少适当异常处理的情况下继续推进，会造成审计缺口与治理风险。

---

## 领域示例

<Tabs>

<Tab title="国防 — CTI/威胁">

TLP:RED 情报绝不能在未经指挥官级批准的情况下共享到来源组织之外。该策略在每个涉及机密威胁报告的信息共享决策上执行。违规不会静默记录，而是路由到 J2 军官进行例外审查。

```python
from semantica.context import ContextGraph, PolicyEngine, Policy, Decision
from semantica.context.decision_recorder import DecisionRecorder
from datetime import datetime

graph    = ContextGraph()
engine   = PolicyEngine(graph_store=graph)
recorder = DecisionRecorder(graph_store=graph)

opsec_policy = Policy(
    policy_id   = "pol-opsec-001",
    name        = "TLP:RED — Restricted Dissemination",
    description = "TLP:RED intelligence must not be shared outside the originating organisation",
    rules = {
        "required_classification":      "TLP:RED",
        "allowed_outcomes":             ["retained_internal", "escalated_internal"],
        "min_confidence":               0.95,
        "required_tlp":                 True,
        "required_authorised_recipients": True,
    },
    category   = "information_sharing",
    version    = "2.1.0",
    created_at = datetime.utcnow(),
    updated_at = datetime.utcnow(),
)
engine.add_policy(opsec_policy)

decision = Decision(
    decision_id   = "",
    category      = "information_sharing",
    scenario      = "APT29 SIGINT report TLP:RED — share with Five Eyes partners?",
    reasoning     = "Tactical intelligence — partner request via UKIC liaison",
    outcome       = "shared_with_partner",   # violates allowed_outcomes policy
    confidence    = 0.88,                    # below min_confidence threshold
    timestamp     = datetime.utcnow(),
    decision_maker= "analyst_rodriguez",
    metadata      = {
        "classification": "TLP:RED",
        "tlp": True,
        "authorised_recipients": True,
    }
)

is_compliant = engine.check_compliance(decision, "pol-opsec-001")
print(f"Compliant: {is_compliant}")
# Compliant: False — outcome 'shared_with_partner' not in allowed_outcomes; confidence below 0.95

if not is_compliant:
    # Route to J2 for exception review — dual commander approval required
    exception_id = engine.record_exception(
        decision_id  = decision.decision_id,
        policy_id    = "pol-opsec-001",
        reason       = "Five Eyes partner urgent request — time-critical tactical intelligence",
        approver     = "j2_officer_hayes",
        justification= "Commander approved limited dissemination under UKUSA Article 4 emergency clause",
    )
    recorder.record_approval_chain(
        decision_id = decision.decision_id,
        approvers   = ["j2_officer_hayes", "unit_commander_brooks"],
        methods     = ["email",             "zoom_call"],
        contexts    = ["J2 tactical review", "Commander emergency approval"],
    )
    print(f"Exception recorded with dual-commander approval: {exception_id}")

# Version history for Inspector General review
history = engine.get_policy_history("pol-opsec-001")
print(f"Policy versions on record: {len(history)}")
```

</Tab>

<Tab title="安全 — SOC/事件响应">

零信任访问策略对 Tier-1 系统强制 MFA，并对特权账户强制 PAM 会话签出。每个自动化访问决策都会同时对照这两项策略检查。当 PAM 门户在紧急补丁窗口期间不可用时，SOC 负责人会在工作开始**之前**（而不是之后）记录一个有她签批的时间受限例外。

```python
from semantica.context import ContextGraph, PolicyEngine, Policy, Decision
from datetime import datetime

graph  = ContextGraph()
engine = PolicyEngine(graph_store=graph)

for pol in [
    Policy(
        policy_id   = "pol-zt-mfa",
        name        = "MFA Required — All Tier-1",
        description = "Every Tier-1 access decision must verify MFA",
        rules       = {
            "required_mfa_verified":       True,
            "allowed_outcomes":            ["access_granted_with_mfa"],
            "min_confidence":              0.90,
        },
        category   = "access_control",
        version    = "1.0.0",
        created_at = datetime.utcnow(),
        updated_at = datetime.utcnow(),
    ),
    Policy(
        policy_id   = "pol-zt-pam",
        name        = "PAM Checkout — Privileged Accounts",
        description = "Privileged account use requires PAM session checkout",
        rules       = {
            "required_pam_session":        True,
            "required_session_recording":  True,
            "max_session_hours":           4,
            "allowed_outcomes":            ["privileged_access_granted_with_pam"],
        },
        category   = "privileged_access",
        version    = "1.0.0",
        created_at = datetime.utcnow(),
        updated_at = datetime.utcnow(),
    ),
]:
    engine.add_policy(pol)

# Emergency patch window — PAM portal down
decision = Decision(
    decision_id   = "",
    category      = "privileged_access",
    scenario      = "sysadmin_kim patching DC-04 — PAM portal unreachable",
    reasoning     = "Critical patch CVE-2025-1234 — 4-hour RTO — PAM portal offline",
    outcome       = "privileged_access_granted_no_pam",
    confidence    = 0.78,
    timestamp     = datetime.utcnow(),
    decision_maker= "soc_automation",
    metadata      = {
        "pam_session": False,      # PAM checkout failed
        "session_recording": True, # Manual recording in place
        "session_hours": 3,        # Planned session duration
    }
)

pam_compliant = engine.check_compliance(decision, "pol-zt-pam")
print(f"PAM policy compliant: {pam_compliant}")
# PAM policy compliant: False

# SOC lead records the exception before work begins
exception_id = engine.record_exception(
    decision_id  = decision.decision_id,
    policy_id    = "pol-zt-pam",
    reason       = "PAM portal offline during critical patch window",
    approver     = "soc_lead_okafor",
    justification= "Emergency patch approved under BCP §7.3 — manual session logging in place",
)

# What-if: impact of cutting max session hours from 4 to 2 for board risk review
pam_policy = engine.get_policy("pol-zt-pam")
impact = engine.analyze_policy_impact(
    policy_id      = "pol-zt-pam",
    proposed_rules = {**pam_policy.rules, "max_session_hours": 2},
)
print(f"Decisions affected by tighter session cap: {impact.get('affected_decisions', 0)}")
```

</Tab>

<Tab title="生命科学 — 临床/制药">

绝对药物禁忌策略可防止在 eGFR 低于 30 时开具二甲双胍。AI 临床决策支持系统会在每个处方决策到达 EHR 之前对照该策略进行检查。当临界病例需要临床例外时，会在开具处方前记录三人 MDT 审批链——顾问医师、肾脏专科医生与药剂师。

```python
from semantica.context import ContextGraph, PolicyEngine, Policy, Decision
from semantica.context.decision_recorder import DecisionRecorder
from datetime import datetime

graph    = ContextGraph()
engine   = PolicyEngine(graph_store=graph)
recorder = DecisionRecorder(graph_store=graph)

safety_policy = Policy(
    policy_id   = "pol-clin-001",
    name        = "Metformin Absolute Contraindication — eGFR < 30",
    description = "Metformin must not be prescribed when eGFR is below 30 ml/min/1.73m²",
    rules = {
        "min_egfr":                    30,      # eGFR must be >= 30
        "allowed_outcomes":            ["metformin_discontinued", "metformin_contraindicated", "alternative_prescribed"],
        "required_clinician_sign_off": True,
        "required_egfr_check":         True,
    },
    category   = "clinical_safety",
    version    = "3.0.0",   # aligned to BNF 2024
    created_at = datetime.utcnow(),
    updated_at = datetime.utcnow(),
    metadata   = {"source": "BNF_2024", "strength": "absolute"},
)
engine.add_policy(safety_policy)

# AI decision-support recommendation
decision = Decision(
    decision_id   = "",
    category      = "treatment_modification",
    scenario      = "PT-00841: T2DM, eGFR 28 — metformin review",
    reasoning     = "eGFR 28 is below the 30 threshold; discontinue metformin and initiate SGLT2i",
    outcome       = "metformin_discontinued_dapagliflozin_initiated",
    confidence    = 0.97,
    timestamp     = datetime.utcnow(),
    decision_maker= "cdss_v4",
    metadata      = {
        "egfr": 28,                    # Below minimum threshold
        "clinician_sign_off": True,
        "egfr_check": True,
        "drug": "metformin",
    }
)

is_compliant = engine.check_compliance(decision, "pol-clin-001")
print(f"Compliant: {is_compliant}")
# Compliant: True — outcome is metformin_discontinued, which is allowed

# MDT approval chain for the prescribing record
recorder.record_approval_chain(
    decision_id = decision.decision_id,
    approvers   = ["dr_okonkwo",  "consultant_renal_patel", "pharmacist_kwon"],
    methods     = ["zoom_call",    "zoom_call",               "email"],
    contexts    = [
        "Prescribing physician MDT review",
        "Renal consultant confirmed eGFR 28 — supports discontinuation",
        "Clinical pharmacist approved SGLT2i initiation protocol",
    ],
)
print("MDT approval chain recorded — prescription safe to issue")

# Policy version history for CQC inspection
history = engine.get_policy_history("pol-clin-001")
print(f"Policy versions on record: {len(history)}")
```

</Tab>

<Tab title="银行 — 风险/合规">

一项 Basel III 抵押贷款承销策略将 LTV 上限设为 85%，DSTI 上限设为 40%。信用模型会在每笔放款决策入账前对照该策略检查。当信用委员会希望在下个季度前提高最低信用评分下限时，影响分析会显示当前账本中有多少已批准贷款本不会通过新规则——而策略变更的审计轨迹将提交给董事会风险委员会。

```python
from semantica.context import ContextGraph, PolicyEngine, Policy, Decision
from datetime import datetime

graph  = ContextGraph()
engine = PolicyEngine(graph_store=graph)

mortgage_policy = Policy(
    policy_id   = "pol-credit-001",
    name        = "Retail Mortgage Underwriting — Basel III CRE20",
    description = "Standard residential mortgage policy aligned to Basel III CRE20",
    rules = {
        "max_ltv":                         0.85,
        "max_dsti":                        0.40,
        "min_credit_score":                680,
        "min_stress_test_bps":             300,
        "allowed_outcomes":                ["approved", "approved_with_conditions"],
    },
    category   = "credit_risk",
    version    = "2.3.0",
    created_at = datetime.utcnow(),
    updated_at = datetime.utcnow(),
    metadata   = {"regulatory_basis": "Basel_III_CRE20", "effective_date": "2025-01-01"},
)
engine.add_policy(mortgage_policy)

# Borderline decision — LTV 86%, one point over the cap
decision = Decision(
    decision_id   = "",
    category      = "mortgage_origination",
    scenario      = "APP-2025-9921: £320k mortgage, LTV 86%, DSTI 38%, credit score 710",
    reasoning     = (
        "LTV 86% exceeds 85% cap. Stress test at +300bps passes. "
        "Credit score 710 above 680 floor. DSTI 38% within 40% limit."
    ),
    outcome       = "approved_ltv_exception",   # not in allowed_outcomes — flags non-compliance
    confidence    = 0.72,
    timestamp     = datetime.utcnow(),
    decision_maker= "underwriting_model_v4",
    metadata      = {
        "ltv": 0.86,           # Exceeds max_ltv of 0.85
        "dsti": 0.38,          # Within max_dsti of 0.40
        "credit_score": 710,   # Above min_credit_score of 680
        "pd": 0.023,           # Recorded for audit — no threshold rule in this policy
        "lgd": 0.45,           # Recorded for audit — no threshold rule in this policy
        "stress_test_bps": 300,
    }
)

is_compliant = engine.check_compliance(decision, "pol-credit-001")
print(f"Compliant: {is_compliant}")
# Compliant: False — ltv (0.86) > max_ltv (0.85) and outcome not in allowed_outcomes

if not is_compliant:
    exception_id = engine.record_exception(
        decision_id  = decision.decision_id,
        policy_id    = "pol-credit-001",
        reason       = "LTV 86% — one point over cap; stress test and all other metrics pass",
        approver     = "sr_underwriter_walsh",
        justification= "Credit committee approved exception under high-quality borrower criteria §4.1",
    )
    print(f"Exception recorded: {exception_id}")

# What-if before raising the credit score floor — present to board risk committee
impact = engine.analyze_policy_impact(
    policy_id      = "pol-credit-001",
    proposed_rules = {**mortgage_policy.rules, "min_credit_score": 700},
)
print(f"Decisions affected by raising credit score floor to 700: {impact.get('affected_decisions', 0)}")

# Find all decisions made under v2.3.0 — re-audit after policy update
affected = engine.get_affected_decisions("pol-credit-001", "2.3.0", "2.4.0")
print(f"Decisions to re-audit: {len(affected)}")

# Commit the update — version bump with full change attribution
engine.update_policy(
    policy_id     = "pol-credit-001",
    rules         = {**mortgage_policy.rules, "min_credit_score": 700},
    change_reason = "Credit committee Q3 review — raise score floor from 680 to 700",
    new_version   = "2.4.0",
)
print("Policy updated to v2.4.0")
```

</Tab>

</Tabs>

---

## 相关指南

- [决策智能](/zh/guides/decision-intelligence) — `record_decision()`、因果链与先例检索 —— 即 `check_compliance()` 所评估的各类决策
- [推理与规则](/zh/guides/reasoning) — 用形式化推理补充策略规则，以实现逻辑冲突检测
- [SHACL 校验](/zh/guides/shacl-validation) — 对策略节点本身施加结构约束
- [变更管理](/zh/guides/change-management) — 与知识图谱同步，为策略图创建版本快照
- [溯源](/zh/guides/provenance) — 为每项策略决策与例外记录 W3C PROV-O 血缘
- [MCP Server](/zh/guides/mcp-server) — 将 `record_decision` 与 `find_precedents` 暴露为面向 AI 智能体的 MCP 工具