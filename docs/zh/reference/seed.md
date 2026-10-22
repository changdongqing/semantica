---
title: "Seed 模块"
description: "从经过验证的结构化来源（分类法、参考表、产品目录和领域锚点）引导构建知识图谱。"
icon: "database"
sourceHash: "7c5ebaef4916476ffdd0f459c26842923789fb6fa5fb5d25bdfc270ea4742616"
---

**`semantica.seed`** 为你的知识图谱提供一个**可靠、经过验证的起点**：

- 优先加载经过验证的参考数据：ISO 代码、员工名册、产品目录、领域分类法
- `SeedDataManager` 将新提取的数据合并到基础节点上，而不会创建重复项
- 支持 JSON、CSV 以及以编程方式注册种子来源
- 从结构化种子数据生成确定性的测试图
- 将实体抽取锚定到已知实体，减少幻觉和重复节点


## 导出的类

| 类 | 职责 |
| :--- | :--- |
| `SeedDataManager` | 协调器：`register_source`、`load_source`、`create_foundation_graph`、`integrate_with_extracted` |
| `SeedDataSource` | 配置 dataclass：`{name, format, location, entity_type, verified, version, metadata}` |
| `SeedData` | 容器 dataclass：`{entities, relationships, properties, metadata}` |

## 你将获得

- **SeedDataManager** — 注册来源、构建基础图谱、校验质量，并与提取的数据合并。
- **SeedDataSource** — 类型化来源定义，支持 CSV、JSON、SQL 和 API，并提供特定格式的配置。
- **基础图谱** — 一次遍历从所有已注册来源构建基础图谱，可直接与提取的数据合并。
- **合并策略** — `seed_first`、`extracted_first` 和 `merge`，支持属性级冲突检测。
- **校验** — 加载前进行必填字段检查、ID 唯一性、类型一致性、引用完整性和编码校验。
- **版本管理** — 跨流水线运行跟踪种子数据版本，并对比版本之间的变更。

<Tip>
  **何时使用 Seed 模块：** 使用结构化参考数据（分类法、用户列表、产品目录）进行引导构建；加载提取数据不应覆盖的不可变事实（ISO 国家代码、标准本体术语）；使用确定性数据集确保测试可重现；以及使用规范形式锚定实体消歧。
</Tip>

## 快速开始

<Steps>
  <Step title="注册种子来源">
    ```python
    from semantica.seed import SeedDataManager

    manager = SeedDataManager()

    manager.register_source("countries",  "csv",  "data/countries.csv")
    manager.register_source("taxonomy",   "json", "data/taxonomy.json")
    manager.register_source("employees",  "csv",  "data/employees.csv")
    ```

    <Tip>
      **在调用 `create_foundation_graph()` 之前注册所有来源。** `create_foundation_graph()` 会一次遍历处理所有已注册来源。如果在调用之后才注册来源，该来源会被静默排除。请在脚本开始时注册所有来源，然后调用一次 `create_foundation_graph()`。
    </Tip>
  </Step>
  <Step title="构建基础图谱">
    ```python
    foundation_kg = manager.create_foundation_graph()
    print(f"Foundation nodes: {len(foundation_kg['entities'])}")
    print(f"Foundation edges: {len(foundation_kg['relationships'])}")
    ```
  </Step>
  <Step title="加载前校验">
    ```python
    # Note: validate_quality expects a graph dict, but load_source returns a list.
    # For demonstration, validate the foundation graph instead.
    report = manager.validate_quality(foundation_kg)
    if not report["valid"]:
        for error in report["errors"]:
            print(f"Error: {error}")
        for warning in report["warnings"]:
            print(f"Warning: {warning}")
    else:
        print(f"Validated {report['metrics']['entity_count']} entities: no issues found")
    ```

    <Warning>
      **加载前校验。** `manager.validate_quality(seed_data)` 能在缺失必填字段、类型不一致和重复 ID 破坏图谱之前捕获它们。在加载后才运行校验意味着你需要回滚。校验速度很快：始终先运行它。
    </Warning>
  </Step>
  <Step title="与提取数据合并">
    ```python
    from semantica.semantic_extract import NERExtractor

    extractor = NERExtractor(method="ml")
    new_entities = extractor.extract("Apple Inc. partners with Microsoft Corp.")
    
    # Merge with seed data - note the correct parameter names
    final_kg = manager.integrate_with_extracted(
        seed_data=foundation_kg,
        extracted_data={"entities": new_entities, "relationships": []},
        merge_strategy="merge"
    )
    ```

    <Warning>
      **先加载种子数据，再加载提取数据。** 种子数据是你的基准事实：已规范化、已整理并已去重。先用 `create_foundation_graph()` 加载它，然后在其上合并提取的实体。以错误的顺序合并会让嘈杂的提取数据覆盖可信的参考值。
    </Warning>
  </Step>
</Steps>

## SeedDataSource 类型

<Tabs>
  <Tab title="CSV">
    ```python
    from semantica.seed import SeedDataSource, SeedDataManager

    csv_source = SeedDataSource(
        name="employees",
        format="csv",
        location="data/employees.csv",
        entity_type="Person",
        verified=True,
        metadata={"description": "Company employee list with titles and departments"}
    )

    manager = SeedDataManager()
    manager.register_source(
        "employees", "csv", "data/employees.csv", entity_type="Person", verified=True
    )
    ```
  </Tab>
  <Tab title="JSON">
    ```python
    json_source = SeedDataSource(
        name="taxonomy",
        format="json",
        location="knowledge/taxonomy.json",
        entity_type="Concept",
        relationship_type="subclass_of",
        verified=True,
        metadata={"version": "2.1", "source": "domain_expert"}
    )

    manager.register_source(
        "taxonomy", "json", "knowledge/taxonomy.json",
        entity_type="Concept", relationship_type="subclass_of"
    )
    ```
  </Tab>
  <Tab title="数据库">
    ```python
    db_source = SeedDataSource(
        name="geographic",
        format="database",
        location="postgresql://user:pass@host/geonames",
        entity_type="Location",
        verified=False,  # needs validation
        metadata={"table": "countries", "last_sync": "2024-01-15"}
    )

    manager.register_source(
        "geographic", "database", "postgresql://user:pass@host/geonames",
        entity_type="Location", verified=False
    )
    ```
  </Tab>
  <Tab title="API">
    ```python
    api_source = SeedDataSource(
        name="wikidata",
        format="api",
        location="https://wikidata.org/sparql",
        entity_type="Entity",
        metadata={"auth_required": False, "rate_limit": 60}
    )

    manager.register_source(
        "wikidata", "api", "https://wikidata.org/sparql",
        entity_type="Entity"
    )
    ```
  </Tab>
</Tabs>

## SeedDataManager 参考

| 方法 | 说明 |
| :------ | :----------- |
| `register_source(name, format, location, **config)` | 向管理器添加新的数据来源 |
| `load_source(source_name)` | 从已注册来源加载并返回原始数据 |
| `create_foundation_graph()` | 从所有已注册来源构建初始图谱 |
| `integrate_with_extracted(seed_data, extracted_data, merge_strategy)` | 将种子数据与新提取的实体/关系合并 |
| `validate_quality(seed_data)` | 检查数据完整性并返回校验报告 |
| `export_seed_data(path, format)` | 将处理后的种子数据保存到文件 |

在 `integrate_with_extracted()` 期间解决冲突的不同策略：

<Tabs>
  <Tab title="seed_first">
    **种子数据在冲突中获胜**：优先保留精选关系，而非提取的关系。

    ```python
    final_kg = manager.integrate_with_extracted(
        seed_data=foundation_kg,
        extracted_data=new_data,
        merge_strategy="seed_first"
    )
    ```

    适用于种子数据置信度高、抽取处于探索阶段的情况。
  </Tab>
  <Tab title="extracted_first">
    **提取数据在冲突中获胜**：用新信息覆盖种子数据。

    ```python
    final_kg = manager.integrate_with_extracted(
        seed_data=foundation_kg,
        extracted_data=new_data,
        merge_strategy="extracted_first"
    )
    ```

    适用于快速原型开发，且已知抽取质量良好的情况。
  </Tab>
  <Tab title="merge">
    **智能冲突解决**：合并互补属性，对实体去重。

    ```python
    final_kg = manager.integrate_with_extracted(
        seed_data=foundation_kg,
        extracted_data=new_data,
        merge_strategy="merge"
    )
    ```

    适用于种子数据和提取数据都有价值的生产流水线。
  </Tab>
</Tabs>

<Tip>
  **对参考数据使用 `seed_first` 合并策略。** 当种子数据编码权威事实（公司官方名称、规范分类法 ID、员工记录）时，`merge_strategy="seed_first"` 确保这些值胜过提取值。仅在提取数据可能比种子数据更新时使用 `merge`。
</Tip>

## 完整流水线示例

```python
from semantica.seed import SeedDataManager
from semantica.parse import DocumentParser
from semantica.split import TextSplitter
from semantica.semantic_extract import NERExtractor, RelationExtractor

# Initialize components
manager   = SeedDataManager()
parser    = DocumentParser()
splitter  = TextSplitter(method="sentence", chunk_size=200)
ner       = NERExtractor(method="ml")
rel_ext   = RelationExtractor(method="ml")

# Register seed sources
manager.register_source("taxonomy", "json", "seeds/domain_taxonomy.json")
manager.register_source("entities", "csv",  "seeds/known_entities.csv")

# Create foundation
foundation_kg = manager.create_foundation_graph()
print(f"Foundation: {len(foundation_kg['entities'])} entities, {len(foundation_kg['relationships'])} relationships")

# Process new document
parsed = parser.parse("research_paper.pdf")
chunks = splitter.split(parsed["full_text"])

# Extract from each chunk
all_entities = []
all_relations = []
for chunk in chunks:
    entities = ner.extract(chunk.text)
    relations = rel_ext.extract(chunk.text)
    all_entities.extend(entities)
    all_relations.extend(relations)

# Merge with foundation
extracted_data = {"entities": all_entities, "relationships": all_relations}
final_kg = manager.integrate_with_extracted(
    seed_data=foundation_kg,
    extracted_data=extracted_data,
    merge_strategy="merge"
)

print(f"Final graph: {len(final_kg['entities'])} entities, {len(final_kg['relationships'])} relationships")

# Export for downstream use
manager.export_seed_data("output/enriched_kg.json", format="json")
```

## YAML 配置

在生产部署中使用 YAML 定义来源：切换环境无需修改代码：

```yaml
seed:
  sources:
    - name: "employees"
      format: "csv"
      location: "./data/employees.csv"
      config:
        id_column: "employee_id"
        type: "Person"
    - name: "taxonomy"
      format: "json"
      location: "./data/taxonomy.json"
    - name: "products"
      format: "sql"
      location: "${DATABASE_URL}"
      config:
        query: "SELECT id, name, category FROM products WHERE active = true"
  merge:
    strategy: "merge"
  validation:
    strict: true
    required_fields: ["id", "type"]
```

环境变量覆盖：

```bash
export SEMANTICA_SEED_DATA_DIR=./data/seed
export SEMANTICA_SEED_MERGE_STRATEGY=seed_first
```

<Tip>
  **在生产部署中使用 YAML 配置。** 在 Python 脚本中硬编码来源路径会使环境切换（dev → staging → prod）变得脆弱。在 `config.yaml` 的 `seed:` 键下声明来源，并通过 `SEMANTICA_SEED_DATA_DIR` 覆盖路径。这样，相同的代码可在每个环境中运行。
</Tip>

- [摄取](/zh/reference/ingest) — 与种子数据一同加载非结构化数据。
- [知识图谱](/zh/reference/kg) — 种子数据填充的目标图谱。
- [去重](/zh/reference/deduplication) — 在种子数据与提取数据合并期间处理重复项。
- [流水线](/zh/reference/pipeline) — 将种子数据加载作为具名流水线步骤纳入。