---
title: "变更管理模块"
description: "为知识图谱和本体提供版本控制、SHA-256 校验和、差异分析、回滚和审计轨迹。"
icon: "clock-rotate-left"
sourceHash: "69b0ac22e4c4e462fe1be44476137abf91f7184f6ceef79e5b9ed876d5e3f85b"
---

**`semantica.change_management`** 为知识图谱和本体提供版本控制和审计轨迹：

- 每个快照均使用 SHA-256 校验和：无需外部基础设施即可检测篡改
- 任意两个版本之间的结构差异：新增、删除或修改的节点
- 可完整回滚到任意命名快照
- 按实体记录突变历史，支持审计轨迹查询
- 支持的合规框架：HIPAA、SOX、GDPR、FDA 21 CFR Part 11

<Note>
  开箱即支持的合规框架：**HIPAA**、**SOX**、**GDPR** 和 **FDA 21 CFR Part 11**。
</Note>


## 导出的类

| 类 | 作用 |
| :--- | :--- |
| `TemporalVersionManager` | 知识图谱的快照、差异、回滚及按节点突变历史 |
| `OntologyVersionManager` | 支持结构差异的本体模式版本控制 |
| `InMemoryVersionStorage` | 用于开发和测试的快速内存存储：不持久化 |
| `SQLiteVersionStorage` | 生产存储：持久化到本地 SQLite 文件 |
| `compute_checksum()` | 返回任意 dict（图快照、本体快照）的 SHA-256 指纹 |
| `verify_checksum()` | 通过在快照 dict 内重新计算并比较存储的校验和来检测篡改 |

## 你将获得

- **TemporalVersionManager**：知识图谱的快照、差异、回滚及按实体审计轨迹。
- **OntologyVersionManager**：OWL 本体的版本控制，支持差异和模式迁移。
- **VersionStorage**：可插拔后端，测试使用 `InMemoryVersionStorage`，生产使用 `SQLiteVersionStorage`。
- **完整性校验**：每个快照均使用 SHA-256 校验和，以检测任何未经授权的修改。
- **ChangeLogEntry**：内部快照元数据，包含 ISO 8601 时间戳、邮箱作者和描述校验（最多 500 个字符）。
- **版本历史**：通过 `list_versions()` 和 `diff()` 获得完整防篡改的版本历史，用于监管审查。

## 典型工作流

<Steps>
  <Step title="初始化版本管理器">
    ```python
    from semantica.change_management import TemporalVersionManager

    manager = TemporalVersionManager(storage_path="versions.db")
    ```
  </Step>
  <Step title="在每次破坏性操作前创建快照">
    ```python
    snapshot = manager.create_snapshot(
        graph=kg,
        version_label="v1.0",
        author="user@example.com",
        description="Before deduplication run"
    )
    print("Snapshot label:", snapshot["label"])
    print("Checksum:", snapshot["checksum"])
    ```
  </Step>
  <Step title="执行变更">
    运行去重、冲突解决、合并或任何图修改。版本管理器不会自动跟踪任何内容：快照的创建时机由你控制。
  </Step>
  <Step title="对结果创建快照">
    ```python
    snapshot_v2 = manager.create_snapshot(
        graph=kg,
        version_label="v2.0",
        author="user@example.com",
        description="After deduplication: 1 342 duplicates merged"
    )
    ```
  </Step>
  <Step title="使用差异分析审查变更内容">
    ```python
    diff = manager.diff("v1.0", "v2.0")
    summary = diff["summary"]
    print("Entities added:   ", summary["entities_added"])
    print("Entities removed: ", summary["entities_removed"])
    print("Entities modified:", summary["entities_modified"])
    ```
  </Step>
</Steps>

<Warning>
  **在每次破坏性操作前创建快照。** 在运行去重、冲突解决或合并操作之前调用 `manager.create_snapshot()`。只有在变更前存在快照时，才能执行 `restore_snapshot()`。
</Warning>

## TemporalVersionManager

知识图谱的版本控制：快照、差异和回滚。

### 构造函数参数

| 参数 | 类型 | 默认值 | 描述 |
| :--------- | :---- | :------- | :----------- |
| `storage_path` | `str` | `None` | SQLite 数据库的路径；省略时使用内存存储 |

### 列出和检索

```python
# List all versions: returns List[Dict] with label, author, timestamp, checksum, entity_count
versions = manager.list_versions()
for v in versions:
    print(v["label"], "|", v["author"], "|", v["timestamp"], "|", v["checksum"][:8], "...")

# Retrieve a specific version (returns full snapshot dict)
snapshot = manager.get_version("v1.0")
```

### TemporalVersionManager 方法

| 方法 | 返回类型 | 描述 |
| :------ | :------- | :----------- |
| `create_snapshot(graph, version_label, author, description)` | `Dict[str, Any]` | 创建版本快照；返回包含 `checksum` 的完整快照 dict |
| `get_version(label)` | `Optional[Dict[str, Any]]` | 检索指定版本标签的快照 dict |
| `list_versions()` | `List[Dict[str, Any]]` | 列出所有版本元数据 dict |
| `diff(version_a, version_b)` | `Dict[str, Any]` | 比较两个快照；`compare_versions` 的别名 |
| `compare_versions(v1, v2)` | `Dict[str, Any]` | 两个快照之间的详细实体/关系差异 |
| `restore_snapshot(graph, target_version, require_confirmation=True)` | `bool` | 将实时图恢复到先前版本；默认会抛出异常，除非 `require_confirmation=False` |
| `get_node_history(node_id)` | `List[Dict[str, Any]]` | 返回指定节点的按时间顺序排列的突变历史 |
| `tag_version(version_label, tag_name)` | `None` | 创建指向版本标签的命名标签 |
| `list_tags()` | `Dict[str, str]` | 返回标签名 → 版本标签的映射 |
| `prune_versions(keep_last_n)` | `Dict[str, Any]` | 删除旧快照，保留最近 N 个 |
| `verify_checksum(snapshot)` | `bool` | 根据快照中存储的校验和验证快照完整性 |

## 差异分析

比较任意两个快照，准确查看发生了哪些变更。将结果用于代码审查、事件调查和监管审计：

```python
diff = manager.diff("v1.0", "v2.0")

summary = diff["summary"]
print("Entities added:      ", summary["entities_added"])
print("Entities removed:    ", summary["entities_removed"])
print("Entities modified:   ", summary["entities_modified"])
print("Relationships added: ", summary["relationships_added"])
print("Relationships removed:", summary["relationships_removed"])

# Inspect individual modified entities
for item in diff["entities_modified"]:
    print("Modified:", item["id"])
    for field, change in item["changes"].items():
        print("  %s: %s -> %s" % (field, change["from"], change["to"]))
```

<Tip>
  **使用 `diff()` 进行代码审查和事件调查。** `manager.diff("v1.0", "v2.0")` 返回一个普通 dict，包含 `"summary"`、`"entities_added"`、`"entities_removed"` 和 `"entities_modified"`：使用 `"summary"` 子 dict 获取计数，使用 `"entities_modified"` 检查属性级变更。
</Tip>

<Accordion title="diff() 返回结构">

```python
# diff() / compare_versions() returns a plain dict:
{
    "version1": str,                  # first version label
    "version2": str,                  # second version label
    "summary": {
        "entities_added":          int,
        "entities_removed":        int,
        "entities_modified":       int,
        "relationships_added":     int,
        "relationships_removed":   int,
        "relationships_modified":  int,
        # also present as nodes_*/edges_* aliases
    },
    "entities_added":    List[Dict],  # full entity dicts
    "entities_removed":  List[Dict],
    "entities_modified": List[Dict],  # {id, before, after, changes}
    "relationships_added":    List[Dict],
    "relationships_removed":  List[Dict],
    "relationships_modified": List[Dict],  # {key, before, after, changes}
    # node_*/edge_* aliases point to the same lists
}
```

</Accordion>

## OntologyVersionManager

本体版本控制支持保存、差异和模式变更跟踪：

```python
from semantica.change_management import OntologyVersionManager

manager = OntologyVersionManager()

# Save a version
snapshot = manager.create_snapshot(
    ontology_data=ontology,
    version_label="1.2.0",
    author="ontology-team@example.com",
    description="Added FHIR alignment mappings"
)

# Diff two ontology versions: returns a plain dict
diff = manager.compare_versions("1.1.0", "1.2.0")
print("Classes added:    ", diff["classes_added"])
print("Classes removed:  ", diff["classes_removed"])
print("Properties added: ", diff["properties_added"])
```

## VersionStorage 后端

<Tabs>
  <Tab title="SQLite（生产）">
    ```python
    from semantica.change_management import SQLiteVersionStorage, TemporalVersionManager

    # Pass path directly to the manager (recommended)
    manager = TemporalVersionManager(storage_path="versions.db")
    ```

    将所有版本历史持久化到磁盘。可在进程重启后保留。适用于任何需要保留审计轨迹的环境。
  </Tab>
  <Tab title="内存（测试）">
    ```python
    from semantica.change_management import InMemoryVersionStorage, TemporalVersionManager

    # Default (no storage_path) uses in-memory storage automatically
    manager = TemporalVersionManager()
    ```

    快速且零配置。数据**不会持久化**：所有版本历史会在进程退出时丢失。仅用于单元测试和开发。
  </Tab>
</Tabs>

<Warning>
  默认不带参数的 `TemporalVersionManager()` 使用内存存储。在生产环境中务必传入 `storage_path="versions.db"` 或显式使用 `SQLiteVersionStorage`：否则整个版本历史将在重启后丢失。
</Warning>

<Tip>
  **在生产环境中使用 `SQLiteVersionStorage`。** 默认的内存存储会在进程退出时丢失所有版本历史。将 `storage_path="versions.db"` 传给 `TemporalVersionManager`，或显式创建 `SQLiteVersionStorage(db_path="versions.db")`。
</Tip>

## 完整性校验

SHA-256 校验和可检测快照之间对图的任何未经授权的修改：

```python
from semantica.change_management import compute_checksum, verify_checksum

# Compute a checksum for any dict
checksum = compute_checksum({"nodes": [], "edges": []})

# verify_checksum takes the snapshot dict directly.
# It reads the "checksum" key from the snapshot and recomputes to compare.
snapshot = manager.get_version("v1.0")
is_valid = verify_checksum(snapshot)

if not is_valid:
    raise RuntimeError("Snapshot has been tampered with")
```

<Tip>
  `verify_checksum` 接收完整快照 dict（其中包含存储的 `"checksum"` 键）。直接传入 `create_snapshot` 或 `get_version` 返回的 dict：无需单独的 `expected_checksum` 参数。
</Tip>

## ChangeLogEntry

`ChangeLogEntry` 是在 `create_snapshot` 内部创建的内部元数据对象。它在存储快照之前校验作者（必须是有效邮箱地址）和描述（非空，最多 500 个字符）。

```python
from semantica.change_management.change_log import ChangeLogEntry

# Create using current timestamp
entry = ChangeLogEntry.create_now(
    author="user@example.com",     # must be a valid email
    description="Initial snapshot" # max 500 chars, non-empty
)
print(entry.timestamp)   # ISO 8601 timestamp
print(entry.author)      # "user@example.com"
print(entry.description) # "Initial snapshot"
```

<Accordion title="ChangeLogEntry 结构">

```python
@dataclass
class ChangeLogEntry:
    timestamp:       str            # ISO 8601 timestamp
    author:          str            # valid email address (validated on init)
    description:     str            # change description, max 500 chars
    change_id:       Optional[str]  # optional unique identifier
    related_changes: List[str]      # optional list of related change IDs
```

</Accordion>

## 合规与版本历史

所有版本快照构成防篡改的审计轨迹。使用 `list_versions()` 和 `diff()` 重建并审查变更，以满足监管要求：



```python
from semantica.change_management import TemporalVersionManager

manager = TemporalVersionManager(storage_path="versions.db")

# Enumerate the full version history
for v in manager.list_versions():
    print(v["timestamp"], "|", v["author"], "|", v["label"], "|", v["description"])

# Diff any two snapshots for a change report
diff = manager.diff("v1.0", "v2.0")
s = diff["summary"]
print("Added: %d | Removed: %d | Modified: %d" % (
    s["entities_added"], s["entities_removed"], s["entities_modified"]))
```

<Tip>
  **使用 `list_versions()` 和 `diff()` 进行合规审查。** `manager.list_versions()` 返回一组元数据字典（包含 `label`、`author`、`timestamp`、`checksum`）。在任何导出之前，对 `get_version()` 返回的字典调用 `verify_checksum(snapshot)` 以确认完整性。
</Tip>

在任何合规导出之前使用 `verify_checksum()` 确认快照完整性：

```python
from semantica.change_management import verify_checksum

snapshot = manager.get_version("v1.0")
is_valid = verify_checksum(snapshot)
if not is_valid:
    raise RuntimeError("Snapshot has been modified since it was recorded")
```

逐节点的变更历史可用于 HIPAA 主体访问和 SOX 审计工作流：

```python
# Get full mutation history for a specific node
history = manager.get_node_history("patient_001")
for record in history:
    print(record["timestamp"], record["operation"], record["version_label"])
```

### 合规覆盖

<AccordionGroup>
  <Accordion title="HIPAA：主体访问请求">
    使用 `manager.get_node_history("patient_001")` 检索患者实体上记录的每一次变更。每条 `MutationRecord` 包含 `timestamp`、`operation`、`entity_id`、`payload` 和 `version_label`。每个快照上的 SHA-256 校验和可证明记录未被篡改。
  </Accordion>
  <Accordion title="SOX：季度审查">
    使用 `manager.list_versions()` 枚举所有快照，并使用 `manager.diff(v1, v2)` 将变更报告限定到相关季度。不可变的快照链提供了 SOX 第 404 条所要求的监管链。
  </Accordion>
  <Accordion title="GDPR：删除权验证">
    在删除数据主体的实体后，对图进行快照，并与删除前的快照做差异比对。`diff["entities_removed"]` 提供了机器可读的记录，准确说明删除了什么以及何时删除，满足第 17 条的文件记录要求。
  </Accordion>
  <Accordion title="FDA 21 CFR Part 11：电子记录">
    每个快照字典都包含 `author`、`timestamp` 和 `checksum`：这是合规电子记录所需的三个字段。`verify_checksum(snapshot)` 提供了 21 CFR § 11.10(e) 所要求的防篡改证据。
  </Accordion>
</AccordionGroup>

- [溯源](/zh/reference/provenance)：W3C PROV-O 血缘跟踪。
- [知识图谱](/zh/reference/kg)：被版本化的图。
- [导出](/zh/reference/export)：导出带版本的快照。
- [冲突](/zh/reference/conflicts)：检测版本之间引入的冲突。