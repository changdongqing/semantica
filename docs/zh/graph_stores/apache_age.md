---
title: "Apache AGE 图存储"
description: "PostgreSQL + Apache AGE 后端，支持在标准 SQL 之外运行 openCypher 查询。"
icon: "database"
sourceHash: "0b1fd83b84a1c4e651ac36095053da19b487b5257f4476b4f0e353b962ce0c23"
---

**后端**：PostgreSQL + [Apache AGE](https://age.apache.org/)  
**驱动**：`psycopg2`

Apache AGE 是一个 PostgreSQL 扩展，为数据库增加图数据库能力，使你可以在传统 SQL 之外运行 openCypher 查询。该后端让 Semantica 能够将 AGE 用作属性图存储，并保持与 Neo4j 和 FalkorDB 相同的接口。


## 前置条件

| 组件 | 版本 |
| :----------- | :--------- |
| PostgreSQL | 12+ |
| Apache AGE | 1.4+（已编译并安装） |
| psycopg2 | 2.9+ |

```bash
pip install psycopg2-binary
```

<Note>Apache AGE 必须编译并安装到你的 PostgreSQL 实例中。参见 [AGE 安装指南](https://age.apache.org/age-manual/master/intro/setup.html)。</Note>


## 快速开始

<Tabs>
  <Tab title="统一门面">
    使用 `GraphStore(backend="age", …)`：与 Neo4j 和 FalkorDB 相同的接口：

    ```python
    from semantica.graph_store import GraphStore

    store = GraphStore(
        backend="age",
        connection_string="host=localhost dbname=agedb user=postgres password=secret",
        graph_name="semantica",
    )
    store.connect()

    alice = store.create_node(labels=["Person"], properties={"name": "Alice", "age": 30})
    bob   = store.create_node(labels=["Person"], properties={"name": "Bob",   "age": 25})
    store.create_relationship(alice["id"], bob["id"], "KNOWS", {"since": 2023})

    result = store.execute_query("MATCH (p:Person) RETURN p", cols="p agtype")
    print(result["records"])
    store.close()
    ```
  </Tab>
  <Tab title="直接调用（ApacheAgeStore）">
    当你需要 AGE 特有的行为时，可直接导入 `ApacheAgeStore`：

    ```python
    from semantica.graph_store.age_store import ApacheAgeStore

    store = ApacheAgeStore(
        connection_string="host=localhost dbname=agedb user=postgres password=secret",
        graph_name="my_graph",
    )
    store.connect()

    node = store.create_node(["Entity"], {"semantica_id": "ent-001", "value": "test"})
    print(node)
    # {"id": 844424930131969, "labels": ["Entity"],
    #  "properties": {"semantica_id": "ent-001", "value": "test"}}

    store.close()
    ```
  </Tab>
</Tabs>


## 配置

### 环境变量

| 变量 | 描述 | 默认值 |
| :---------- | :------------- | :--------- |
| `GRAPH_STORE_AGE_CONNECTION_STRING` | PostgreSQL 连接字符串 | `host=localhost dbname=agedb user=postgres password=postgres` |
| `GRAPH_STORE_AGE_GRAPH_NAME` | AGE 图名称 | `semantica` |

### 编程式配置

```python
from semantica.graph_store.config import graph_store_config

graph_store_config.set("age_connection_string", "host=db.example.com dbname=prod_age user=app")
graph_store_config.set("age_graph_name", "production")
```


## 连接与初始化

调用 `connect()` 时，存储会执行幂等的初始化设置，可安全地重复调用：

<Steps>
  <Step title="加载扩展">
    `CREATE EXTENSION IF NOT EXISTS age;`
  </Step>
  <Step title="在会话中激活 AGE">
    `LOAD 'age';`
  </Step>
  <Step title="设置搜索路径">
    `SET search_path = ag_catalog, "$user", public;`
  </Step>
  <Step title="创建图">
    若指定名称的图尚不存在，则创建该图。
  </Step>
</Steps>


## ID 处理

Apache AGE 会自动生成内部的顶点/边 ID（大整数）。这些 ID **不**等同于你可能希望赋予的任何语义 ID 或应用层 ID。

| 概念 | 描述 |
| :--------- | :------------- |
| **AGE 内部 ID** | 由 AGE 自动生成。在所有返回的字典中以 `"id"` 暴露。用于 `delete_node()`、`get_node()` 等方法。 |
| **语义 ID** | 应用层标识符。将其存储在 `semantica_id` 属性中。 |

```python
node = store.create_node(
    labels=["Document"],
    properties={"semantica_id": "doc-abc-123", "title": "My Doc"},
)
# node["id"] → AGE internal ID (e.g., 844424930131969)
# node["properties"]["semantica_id"] → "doc-abc-123"
```

<Warning>切勿将 AGE 内部 ID 与语义 ID 混用。图操作（删除、更新、遍历）请使用 `node["id"]`，应用层查找请使用 `node["properties"]["semantica_id"]`。</Warning>


## 标签处理

AGE 对每个顶点仅支持**一个标签**。Semantica 会透明地处理这一限制：

- `labels[0]` → 用作 AGE 顶点的主标签。
- `labels[1:]` → 存储在顶点的 `labels` 属性数组中。

读取节点时，存储会自动重建完整的标签列表。

```python
node = store.create_node(
    labels=["Person", "Employee", "Admin"],
    properties={"name": "Alice"},
)
# In AGE: vertex with label "Person" and property labels=["Employee", "Admin"]
# Returned: {"id": ..., "labels": ["Person", "Employee", "Admin"], "properties": {"name": "Alice"}}
```


## Cypher 查询执行

所有 Cypher 查询均通过 AGE 的 SQL 包装器执行：

```sql
SELECT * FROM cypher('graph_name', $$ <cypher_query> $$) AS (col1 agtype, ...);
```

### 参数替换

AGE 不支持在 `cypher()` 调用内部使用 `$param` 风格的绑定。存储会安全地将参数转换为 Cypher 字面量，并做恰当的转义：

```python
result = store.execute_query(
    "MATCH (p:Person) WHERE p.age > $min_age RETURN p",
    parameters={"min_age": 25},
    cols="p agtype",
)
```

### 列指定

对于自定义查询，传入 `cols` 选项以指定 `AS` 子句：

```python
result = store.execute_query(
    "MATCH (a)-[r]->(b) RETURN a, r, b",
    cols="a agtype, r agtype, b agtype",
)
```

若省略，存储会尝试从 `RETURN` 子句推断列。


## 事务

该存储使用显式的 PostgreSQL 事务：

- **成功** → `COMMIT`
- **异常** → `ROLLBACK`，然后以 `ProcessingError` 重新抛出
- 无静默失败


## API 参考

所有方法均符合标准的 Semantica 图存储后端接口：

| 方法 | 描述 |
| :-------- | :------------- |
| `connect(**options)` | 连接并初始化 AGE |
| `close()` | 关闭连接 |
| `create_node(labels, properties)` | 创建顶点 |
| `create_nodes(nodes)` | 批量创建顶点 |
| `get_node(node_id)` | 按 AGE ID 获取顶点 |
| `get_nodes(labels, properties, limit)` | 查询顶点 |
| `update_node(node_id, properties, merge)` | 更新顶点属性 |
| `delete_node(node_id, detach)` | 删除顶点 |
| `create_relationship(start_id, end_id, type, properties)` | 创建边 |
| `get_relationships(node_id, rel_type, direction, limit)` | 查询边 |
| `delete_relationship(rel_id)` | 删除边 |
| `execute_query(query, parameters)` | 执行任意 Cypher |
| `get_neighbors(node_id, rel_type, direction, depth)` | 图遍历 |
| `shortest_path(start_id, end_id, rel_type, max_depth)` | 路径查找 |
| `create_index(label, property_name, index_type)` | 创建 PostgreSQL 索引 |
| `get_stats()` | 图统计信息 |


## Docker 环境搭建

```yaml
services:
  age:
    image: apache/age:latest
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: agedb
```

```bash
docker compose up -d
```

然后连接：

```python
store = GraphStore(
    backend="age",
    connection_string="host=localhost port=5432 dbname=agedb user=postgres password=secret",
)
```
