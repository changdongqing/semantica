---
title: "图存储模块"
description: "Neo4j、FalkorDB、Apache AGE 与 Amazon Neptune 图数据库的统一接口。"
icon: "server"
sourceHash: "d826226514da164899530c092ad88ecff687561557c4d25bbfdb009d9e24962f"
---

**`semantica.graph_store`** 提供**单一统一 API**，用于在生产级图数据库中持久化存储与查询知识图谱：

- 一行改动即可切换后端：Neo4j、FalkorDB、Apache AGE、Amazon Neptune
- 参数化 Cypher 执行，可通过 `QueryEngine` 选择性地缓存结果
- 批量加载节点与边：比逐条写入更快
- `GraphAnalytics` 支持度中心性、连通分量、最短路径、邻居遍历
- 支持上下文管理器：`with GraphStore(...) as store:` 会自动关闭连接


## 导出的类

| 类 | 职责 |
| :--- | :--- |
| `GraphStore` | 统一接口：`create_node`、`create_relationship`、`query`、`get_neighbors`、`shortest_path` |
| `QueryEngine` | 参数化 Cypher 执行，支持结果缓存 |
| `GraphAnalytics` | `degree_centrality`、`connected_components`、`shortest_path`、`get_neighbors` |
| `Neo4jStore` | 通过 Bolt 承载生产负载：支持 APOC 与 GDS 插件 |
| `ApacheAgeStore` | PostgreSQL + AGE 扩展：无需单独的图服务器 |
| `AmazonNeptuneStore` | AWS Neptune：通过 Bolt 协议使用 OpenCypher |
| `FalkorDBStore` | 基于 Redis：为实时应用提供亚毫秒级延迟 |


## 核心能力

- **GraphStore** —— 跨 Neo4j、FalkorDB、Apache AGE、Amazon Neptune 的统一 API
  - 支持上下文管理器，自动清理连接
  - `create_nodes()` 用于批量加载：比逐次调用更快
- **QueryEngine** —— 参数化 Cypher 构建可防止注入攻击
  - 通过 `use_cache=True` 可选择性地进行进程内结果缓存
  - 写入时 `clear_cache()`，通过 `enable_cache()` / `disable_cache()` 切换
- **GraphAnalytics** —— 度中心性，按 degree DESC 排序
  - 连通分量分配
  - 节点间最短路径，最多 N 跳的邻居遍历
- **批量操作** —— `create_nodes(list)`：多个节点只需一次往返
  - 带类型化属性的 `create_relationship()`
  - `delete_node(detach=True)` 移除所有已连接的关系
- **Schema 管理** —— `create_index(label, property_name=)`：让 MATCH 查询快上数个数量级
  - `get_stats()`：节点数、边数、类型分布
  - 批量加载前先创建索引可获得最佳性能
- **路径遍历** —— `shortest_path()` 返回 `length`、`nodes`、`relationships`
  - `get_neighbors()` 可控制方向与深度
  - 通过统一 API 实现跨后端路径遍历


## 快速上手

`GraphStore` 将你选择的后端封装在单一 API 之后。在执行任何查询前，先调用 `connect()`（或将其用作上下文管理器）：

```python
from semantica.graph_store import GraphStore

store = GraphStore(
    backend="neo4j",
    uri="bolt://localhost:7687",
    user="neo4j",
    password="password",
)
store.connect()

# Create a node
node = store.create_node(
    labels=["Person"],
    properties={"name": "Alice", "role": "Engineer"},
)
print(node["id"])   # Neo4j internal integer ID

# Create a relationship
store.create_relationship(
    start_node_id=node1_id,
    end_node_id=node2_id,
    rel_type="WORKS_FOR",
    properties={"since": 2022},
)

# Execute a Cypher query
results = store.query(
    "MATCH (p:Person)-[:WORKS_FOR]->(o:Organization) WHERE o.name = $org RETURN p",
    parameters={"org": "Acme Corp"},
)

store.close()
```

用作上下文管理器可自动关闭连接：

```python
with GraphStore(backend="neo4j", uri="bolt://localhost:7687", user="neo4j", password="password") as store:
    store.create_node(labels=["Person"], properties={"name": "Bob"})
```

<Warning>
  **在任何操作之前先调用 `connect()`。** `GraphStore` 在构造时不会自动连接。请显式调用 `store.connect()`，或使用上下文管理器形式 `with GraphStore(...) as store:`。
</Warning>

## 快速开始

<Steps>
  <Step title="连接到图数据库">
    ```python
    from semantica.graph_store import GraphStore

    store = GraphStore(
        backend="neo4j",
        uri="bolt://localhost:7687",
        user="neo4j",
        password="password",
    )
    store.connect()
    ```
  </Step>
  <Step title="在加载数据前创建索引">
    ```python
    store.create_index(label="Person",       property_name="name")
    store.create_index(label="Organization", property_name="name")
    ```
  </Step>
  <Step title="加载节点与关系">
    ```python
    # Batch creation: list of dicts with "labels" and "properties" keys
    store.create_nodes([
        {"labels": ["Person"],       "properties": {"name": "Alice"}},
        {"labels": ["Organization"], "properties": {"name": "Acme Corp"}},
    ])
    ```
  </Step>
  <Step title="查询图">
    ```python
    results = store.query(
        "MATCH (p:Person)-[:WORKS_FOR]->(o:Organization) WHERE o.name = $org RETURN p",
        parameters={"org": "Acme Corp"},
    )
    ```
  </Step>
</Steps>


## GraphStore 方法

| 方法 | 返回值 | 说明 |
| :------ | :------- | :----------- |
| `create_node(labels, properties)` | `dict` | 创建单个节点，返回带 `"id"` 的节点字典 |
| `create_nodes(nodes)` | `List[dict]` | 从 `{"labels", "properties"}` 字典列表批量创建节点 |
| `get_node(node_id)` | `dict \| None` | 按后端 ID 获取节点 |
| `get_nodes(labels, properties, limit)` | `List[dict]` | 查询匹配标签/属性条件的节点 |
| `update_node(node_id, properties, merge)` | `dict` | 更新节点属性；`merge=True`（默认）合并，`merge=False` 替换 |
| `delete_node(node_id, detach)` | `bool` | 删除节点；`detach=True`（默认）同时移除关系 |
| `create_relationship(start_node_id, end_node_id, rel_type, properties)` | `dict` | 创建有向关系 |
| `get_relationships(node_id, rel_type, direction, limit)` | `List[dict]` | 获取节点的关系 |
| `delete_relationship(rel_id)` | `bool` | 按 ID 删除关系 |
| `execute_query(query, parameters)` | `dict` | 执行原生 Cypher，返回 `{"success", "records", "keys", "metadata"}` |
| `query(query, parameters)` | `List[dict]` | 执行 Cypher 并直接返回记录列表 |
| `create_index(label, property_name)` | `bool` | 创建索引以加快查找 |
| `get_neighbors(node_id, rel_type, direction, depth)` | `List[dict]` | 获取相邻节点 |
| `shortest_path(start_node_id, end_node_id, rel_type, max_depth)` | `dict \| None` | 查找两个节点之间的最短路径 |
| `get_stats()` | `dict` | 从后端获取图统计信息 |


## 后端

<Tabs>
  <Tab title="Neo4j（推荐）">
    ```bash
    pip install neo4j
    ```

    ```python
    from semantica.graph_store import GraphStore

    store = GraphStore(
        backend="neo4j",
        uri="bolt://localhost:7687",
        user="neo4j",
        password="password",
        database="neo4j",    # optional: targets default database
    )
    store.connect()
    ```

    **适用场景：** 生产负载、复杂 Cypher 查询、Bloom 可视化。
  </Tab>
  <Tab title="FalkorDB">
    ```bash
    pip install falkordb
    ```

    ```python
    store = GraphStore(
        backend="falkordb",
        host="localhost",
        port=6379,
        graph_name="semantica",
    )
    store.connect()
    ```

    **适用场景：** 通过 Redis 协议实现超低延迟查询、边缘部署。
  </Tab>
  <Tab title="Apache AGE">
    ```bash
    pip install psycopg2-binary
    ```

    ```python
    store = GraphStore(
        backend="age",   # or "apache_age"
        connection_string="host=localhost dbname=agedb user=postgres password=secret",
        graph_name="semantica",
    )
    store.connect()
    ```

    **适用场景：** 已运行 PostgreSQL 且希望无需额外服务即可进行图查询的团队。

    <Warning>
      **Apache AGE 需要安装 PostgreSQL 扩展。** `backend="age"` 会调用 AGE 扩展函数。如果你的 PostgreSQL 实例未安装 AGE，将会得到 `ProgrammingError`。安装方法参见 [Apache AGE 文档](https://age.apache.org/age-manual/master/intro/setup.html)。
    </Warning>
  </Tab>
  <Tab title="Amazon Neptune">
    ```bash
    pip install neo4j boto3
    ```

    ```python
    store = GraphStore(
        backend="neptune",   # or "amazon_neptune"
        endpoint="your-cluster.cluster-xxxx.us-east-1.neptune.amazonaws.com",
        port=8182,
        region="us-east-1",
        iam_auth=True,    # uses boto3 default credential chain
    )
    store.connect()

    # OpenCypher queries via Bolt protocol
    results = store.query(
        "MATCH (p:Person)-[:WORKS_FOR]->(o:Organization) RETURN p, o"
    )
    ```

    **适用场景：** AWS 托管部署。Neptune 通过 Bolt 协议支持 OpenCypher 查询：与 Neo4j 使用相同的查询 API。

    <Warning>
      **Amazon Neptune 使用 `iam_auth=`，而非 `use_iam_auth=`。** `AmazonNeptuneStore` 与 `GraphStore` 的 Neptune 后端均使用 `iam_auth: bool = True` 作为参数名。
    </Warning>
  </Tab>
  <Tab title="后端对比">

    | 后端 | 查询语言 | 部署方式 | IAM 认证 | 适用场景 |
    | :------- | :-------------- | :---------- | :-------- | :-------- |
    | Neo4j | Cypher | 自托管 / Aura | 否 | 生产环境、复杂遍历、Bloom UI |
    | FalkorDB | OpenCypher | 基于 Redis | 否 | 超低延迟、边缘部署 |
    | Apache AGE | OpenCypher | PostgreSQL 扩展 | 否 | 已使用 Postgres 的团队 |
    | Amazon Neptune | OpenCypher | AWS 托管 | 是 | 云原生、托管、合规 |

  </Tab>
</Tabs>

## 图操作

```python
# Create a single node
node = store.create_node(
    labels=["Organization"],
    properties={"name": "Apple Inc.", "founded": 1976},
)

# Create a directed relationship (both node IDs required)
rel = store.create_relationship(
    start_node_id=jobs_id,
    end_node_id=node["id"],
    rel_type="FOUNDED",
    properties={"year": 1976},
)

# Batch-create nodes
store.create_nodes([
    {"labels": ["Person"],       "properties": {"name": "Steve Jobs"}},
    {"labels": ["Organization"], "properties": {"name": "NeXT"}},
])

# Update node properties (merge=True merges, merge=False replaces)
store.update_node(node["id"], {"employees": 164000}, merge=True)

# Delete (detach=True also removes connected relationships)
store.delete_node(node["id"], detach=True)
store.delete_relationship(rel["id"])

# Get neighbors
neighbors = store.get_neighbors(
    node["id"],
    rel_type="HAS_EMPLOYEE",
    direction="in",    # "in" | "out" | "both"
    depth=1,
)

# Shortest path: returns {"length", "nodes", "relationships"} or None
path = store.shortest_path(
    start_node_id=jobs_id,
    end_node_id=cook_id,
    rel_type="WORKS_WITH",
    max_depth=5,
)
if path:
    print(f"Hops: {path['length']}")
```

<Tip>
  **批量加载请使用 `create_nodes()`。** 每次单独调用 `create_node()` 都会产生一次网络往返。`create_nodes(list)` 在初始构建图时更快。
</Tip>

## QueryEngine

`QueryEngine` 负责查询执行与可选的缓存。可通过 `store.query_engine` 访问：

```python
from semantica.graph_store import GraphStore

store  = GraphStore(backend="neo4j", uri="bolt://localhost:7687", user="neo4j", password="password")
store.connect()

# Get the query engine from the store
engine = store.query_engine

# Execute a parameterized query
result = engine.execute(
    "MATCH (p:Person) WHERE p.department = $dept RETURN p",
    parameters={"dept": "Engineering"},
)
# result is {"success": True, "records": [...], "keys": [...], "metadata": {...}}

# Execute with caching: repeated identical calls return cached result
result = engine.execute(
    "MATCH (p:Person) RETURN count(p) as total",
    use_cache=True,
)

# Clear cached results
engine.clear_cache()

# Toggle caching
engine.disable_cache()
engine.enable_cache()
```



### QueryEngine 方法

| 方法 | 返回 | 说明 |
| :------ | :------- | :----------- |
| `execute(query, parameters, use_cache)` | `dict` | 执行 Cypher，返回 `{success, records, keys, metadata}` |
| `clear_cache()` | `None` | 清空所有缓存的查询结果 |
| `enable_cache()` | `None` | 开启缓存（默认开启） |
| `disable_cache()` | `None` | 关闭缓存 |

<Tip>
  **在读密集型工作负载中使用 `QueryEngine` 缓存。** 通过 `store.query_engine` 访问引擎。调用 `engine.execute(query, use_cache=True)` 可在进程内缓存相同的查询。在会使结果失效的写入操作之后调用 `engine.clear_cache()`。
</Tip>

<Warning>
  **使用参数化查询，绝不要使用字符串插值。** `store.query("WHERE n.name = $name", parameters={"name": user_input})` 可防范 Cypher 注入攻击。绝不要使用 `f"WHERE n.name = '{user_input}'"`。
</Warning>


## GraphAnalytics

可通过 `store._manager.analytics` 访问分析功能，或直接使用后端存储实例构造：

```python
from semantica.graph_store import GraphStore, GraphAnalytics

store = GraphStore(backend="neo4j", uri="bolt://localhost:7687", user="neo4j", password="password")
store.connect()

# GraphAnalytics takes the backend store, not the GraphStore facade
analytics = GraphAnalytics(store._store_backend)

# Degree centrality: returns list of {"id", "degree"} dicts ordered by degree DESC
scores = analytics.degree_centrality(
    labels=["Person"],
    rel_type="KNOWS",
    direction="both",    # "in" | "out" | "both"
)
for entry in scores[:5]:
    print(f"Node {entry['id']}: degree {entry['degree']}")

# Connected components (requires GDS for Neo4j, NetworkX for in-process)
components = analytics.connected_components(labels=["Person"])

# Shortest path: returns {"length", "nodes", "relationships"} or None
path = analytics.shortest_path(
    start_node_id=alice_id,
    end_node_id=charlie_id,
    rel_type="KNOWS",
    max_depth=4,
)

# Neighbor traversal
neighbors = analytics.get_neighbors(
    node_id=alice_id,
    rel_type="KNOWS",
    direction="out",
    depth=2,
)
```

### GraphAnalytics 方法

| 方法 | 返回 | 说明 |
| :------ | :------- | :----------- |
| `degree_centrality(labels, rel_type, direction)` | `List[dict]` | 基于度的节点重要性：记录按度降序排列 |
| `connected_components(labels)` | `List[dict]` | 连通分量分配（Neo4j 上需要 GDS） |
| `shortest_path(start_node_id, end_node_id, rel_type, max_depth)` | `dict \| None` | 包含 `length`、`nodes`、`relationships` 的路径，或 `None` |
| `get_neighbors(node_id, rel_type, direction, depth)` | `List[dict]` | 最多 `depth` 跳的邻居节点 |

<Note>
  `betweenness_centrality()`、`pagerank()`、`detect_communities()` 和 `all_paths()` 尚未实现。对于这些算法，请通过 `store.execute_query()` 直接使用 Neo4j GDS 过程。
</Note>


## 模式管理

```python
# Index for fast label-property lookups: use property_name= not property=
store.create_index(label="Person",       property_name="name")
store.create_index(label="Organization", property_name="id")

# Graph statistics
stats = store.get_stats()
```

<Warning>
  **在批量加载之前创建索引。** `store.create_index(label="Person", property_name="name")` 可使对 `name` 的 `MATCH` 查询快上几个数量级。没有索引时，每个查询都会做全量扫描。先创建索引，再加载数据。
</Warning>

<Warning>
  **`create_index` 的参数是 `property_name=`，而非 `property=`。** `store.create_index(label="Person", property_name="name")`：使用 `property=` 会被静默忽略。
</Warning>

## 常见工作流

<Tabs>
  <Tab title="从 KG 数据构建">
    ```python
    from semantica.graph_store import GraphStore

    store = GraphStore(backend="neo4j", uri="bolt://localhost:7687", user="neo4j", password="password")
    store.connect()

    # Create indexes first for speed
    store.create_index("Person",       property_name="name")
    store.create_index("Organization", property_name="name")

    # Load entities as nodes
    created = store.create_nodes([
        {"labels": [e["type"]], "properties": {"name": e["text"], "id": e["id"]}}
        for e in entities
    ])

    # Map entity IDs to backend node IDs
    id_map = {e["id"]: node["id"] for e, node in zip(entities, created)}

    # Load relationships
    for rel in relationships:
        if rel["source_id"] in id_map and rel["target_id"] in id_map:
            store.create_relationship(
                start_node_id=id_map[rel["source_id"]],
                end_node_id=id_map[rel["target_id"]],
                rel_type=rel["type"],
            )

    store.close()
    ```
  </Tab>
  <Tab title="参数化查询">
    ```python
    # Always use parameters, never string interpolation
    results = store.query(
        "MATCH (p:Person)-[:WORKS_FOR]->(o:Organization) "
        "WHERE o.name = $org AND p.role = $role RETURN p.name",
        parameters={"org": user_input_org, "role": user_input_role},
    )
    ```
  </Tab>
  <Tab title="邻居遍历">
    ```python
    # Walk 2 hops of KNOWS relationships
    neighbors = store.get_neighbors(
        node_id=alice_id,
        rel_type="KNOWS",
        direction="out",
        depth=2,
    )
    for n in neighbors:
        print(n["properties"]["name"])
    ```
  </Tab>
  <Tab title="Apache AGE 说明">
    AGE 每个顶点仅支持一个主标签。若传入多个标签，第一个用作 AGE 标签，其余存储在 `labels` 属性数组中。参数化查询在内部使用字面量内联（AGE 不支持在 `cypher()` 调用中使用 `$param` 绑定）：存储层会自动处理转义。
  </Tab>
</Tabs>

- [KG 模块](/zh/reference/kg) — 在持久化之前先构建图。
- [三元组存储](/zh/reference/triplet_store) — 面向语义 Web 和 SPARQL 查询的 RDF 三元组存储。
- [可视化](/zh/reference/visualization) — 可视化存储于任意后端的图。
- [上下文](/zh/reference/context) — AgentContext 使用 GraphStore 进行记忆检索。