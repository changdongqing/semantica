---
title: 'Apache Airflow 集成'
description: '将 Apache Airflow 中的 DAG、任务与依赖元数据摄取到 Semantica。'
icon: 'wind'
sourceHash: "58b731890d31fe26e42c2529b033a36f08379cc6f5088b2eb2d90fc522d11644"
---

> 通过稳定的 Airflow REST API 摄取 Apache Airflow 的 DAG、任务与任务依赖，用于在 Semantica 中开展流水线与血缘分析。

## 安装

```bash
pip install "semantica[ingest-airflow]"
```

## 基本用法

```python
from semantica.ingest import AirflowIngestor

ingestor = AirflowIngestor(
    base_url="https://airflow.example.com",
    token="your-access-token",
)

data = ingestor.ingest()
documents = ingestor.export_as_documents(data)

print(f"DAGs: {len(data.dags)}")
print(f"Tasks: {len(data.tasks)}")
print(f"Dependencies: {len(data.dependencies)}")

ingestor.close()
```

`base_url` 必须指向 Airflow webserver 的根路径。

请勿在 `base_url` 中包含 `/api/v1`；连接器会自动追加稳定的 REST API 路径。

## 认证

### Bearer 令牌

```python
from semantica.ingest import AirflowIngestor

ingestor = AirflowIngestor(
    base_url="https://airflow.example.com",
    token="your-access-token",
)
```

### 用户名与密码

```python
from semantica.ingest import AirflowIngestor

ingestor = AirflowIngestor(
    base_url="https://airflow.example.com",
    username="airflow-user",
    password="your-password",
)
```

用户名与密码必须同时提供。

## 过滤 DAG

将摄取范围限制为指定的 DAG ID：

```python
data = ingestor.ingest(
    dag_ids=["daily_etl", "warehouse_sync"],
)
```

排除已暂停的 DAG：

```python
data = ingestor.ingest(
    include_paused=False,
)
```

可以同时使用这两个选项：

```python
data = ingestor.ingest(
    dag_ids=["daily_etl", "warehouse_sync"],
    include_paused=False,
)
```

## 流水线血缘

连接器会从每个 Airflow 任务的 `downstream_task_ids` 推导任务级依赖。

例如：

```python
[
    {
        "dag_id": "daily_etl",
        "upstream_task_id": "extract",
        "downstream_task_id": "transform",
    },
    {
        "dag_id": "daily_etl",
        "upstream_task_id": "transform",
        "downstream_task_id": "load",
    },
]
```

重复的依赖边会被自动去除。

## 导出的文档

`export_as_documents()` 将摄取到的 Airflow 元数据转换为便于 GraphBuilder 使用的字典。

连接器会导出三种文档类型：

- `airflow_dag`
- `airflow_task`
- `airflow_dependency`

生成的标识符采用以下形式：

```text
airflow:dag:<dag_id>
airflow:task:<dag_id>:<task_id>
airflow:dependency:<dag_id>:<upstream_task_id>:<downstream_task_id>
```

## 私有 Airflow 部署

所有发往用户提供的 Airflow 端点的请求都会经过 Semantica 的 SSRF 防护。

默认情况下会阻止私有 IP 地址。

对于私有网络中受信任的 Airflow 部署：

```python
from semantica.ingest import AirflowIngestor

ingestor = AirflowIngestor(
    base_url="http://10.0.0.20:8080",
    username="airflow-user",
    password="your-password",
    allow_private_ips=True,
)
```

请仅对您信任的端点启用 `allow_private_ips=True`。

## 分页

DAG 结果通过 Airflow 的 `limit` 与 `offset` 分页机制获取。

默认分页大小为 100。

```python
data = ingestor.ingest(
    page_limit=100,
)
```

如有需要，可以传入其他正数的分页大小。

## 错误处理

连接器会针对常见失败抛出 Semantica 错误，包括：

- 连接配置缺失或无效
- Airflow API 请求失败
- JSON 响应无效
- API 响应结构不符合预期
- 分页限制无效

## API 覆盖范围

连接器目前使用以下稳定的 Airflow REST API 端点：

```text
GET /api/v1/dags
GET /api/v1/dags/{dag_id}/tasks
```

任务依赖根据每个任务的 `downstream_task_ids` 推导。

## 只读行为

Airflow 连接器仅执行元数据摄取。

它不会：

- 创建 DAG
- 修改 DAG
- 触发 DAG 运行
- 暂停或恢复 DAG
- 修改任务
- 删除 DAG 或任务

## 关闭连接

摄取完成后关闭底层 HTTP 会话：

```python
ingestor.close()
```
