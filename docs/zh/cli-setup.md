---
title: "CLI 设置"
description: "Semantica 的五个可执行命令：各自的作用、适用场景，以及如何确认它们工作正常。"
icon: "terminal"
sourceHash: "e331863795b815fd1b18ddab131426ec7707ffc132553024bf544cbe53153e3e"
---

安装基础包会在 `PATH` 上注册五个可执行命令。它们各自用途不同。本页说明它们分别是什么、如何确认其可用，以及在不同场景下该选用哪一个。


## 已安装的命令

```bash
pip install semantica
```

安装完成后，以下命令即可使用：

| 命令 | 入口点 | 作用 |
| :------- | :----------- | :------------ |
| `semantica` | `semantica.cli:main` | 通用 CLI，用于流水线运行、抽取和图操作 |
| `semantica-server` | `semantica.server:main` | FastAPI/uvicorn REST API 服务器，默认绑定 `127.0.0.1:8000`（设置 `SEMANTICA_HOST` 可覆盖） |
| `semantica-worker` | `semantica.worker:main` | Semantica 部署用的后台 worker 进程入口 |
| `semantica-explorer` | `semantica.explorer:main` | 用于知识图谱探索的交互式浏览器仪表盘 |
| `semantica-mcp` | `semantica.mcp_server:main` | 面向 Claude Desktop、Cursor、Windsurf 等 MCP 客户端的 MCP 服务器（stdio） |

<Note>
  `semantica-explorer` 需要 `pip install semantica[explorer]`。未安装该 extra 就运行时，会立即打印错误并退出。完整步骤见 [Explorer 设置](/zh/explorer-setup)。
</Note>


## 验证安装

确认每个命令都能调用并打印其用法：

```bash
semantica --help
semantica-server --help
semantica-worker --help
semantica-explorer --help
semantica-mcp --help
```

确认包版本：

```bash
python -c "import semantica; print(semantica.__version__)"
```


## 各命令的使用场景

- **semantica**：通用 CLI。用于一次性的流水线运行、实体抽取，以及在 shell 脚本或 CI 作业中执行图操作。
- **semantica-server**：启动 REST API 服务器。默认绑定 `127.0.0.1:8000`；设置 `SEMANTICA_HOST` 可将其暴露到 localhost 之外。当其他服务或应用需要通过 HTTP 以编程方式访问 Semantica 时使用。
- **semantica-worker**：后台任务处理器。需要在请求周期之外异步执行流水线时，与 `semantica-server` 一起运行。先启动服务器，再启动一个或多个指向同一后端的 worker。
- **semantica-explorer**：启动浏览器仪表盘。需要 `pip install semantica[explorer]`。用于交互式探索已保存的知识图谱。参见 [Explorer 设置](/zh/explorer-setup)。
- **semantica-mcp**：以 stdio 方式运行 MCP 服务器。在 MCP 客户端的设置文件中配置它，即可将全部 15 个工具和 3 个资源提供给 Claude Desktop、Cursor、Windsurf 或任何支持 MCP 的客户端。参见 [MCP 服务器](/zh/reference/mcp_server)。


## 用法示例

<Tabs>
  <Tab title="REST 服务器">
    ```bash
    # Starts FastAPI + uvicorn on 127.0.0.1:8000 (set SEMANTICA_HOST to change)
    semantica-server
    ```

    启动后，可用以下命令检查：

    ```bash
    curl http://localhost:8000/health
    # {"status": "ok"}

    curl http://localhost:8000/api/info
    # {"name": "Semantica API", "version": "...", "status": "active"}
    ```

    交互式 API 文档位于 `http://localhost:8000/docs`。
  </Tab>
  <Tab title="Worker">
    ```bash
    semantica-worker
    ```

    worker 在收到 `SIGINT`（Ctrl-C）或 `SIGTERM` 时会正常退出。
  </Tab>
  <Tab title="MCP 客户端配置">
    添加到 MCP 客户端的设置文件中：

    ```json
    {
      "mcpServers": {
        "semantica": {
          "command": "semantica-mcp"
        }
      }
    }
    ```

    如果命令不在 `PATH` 中，也可以使用 Python 模块形式：

    ```json
    {
      "mcpServers": {
        "semantica": {
          "command": "python",
          "args": ["-m", "semantica.mcp_server"]
        }
      }
    }
    ```

    在配置客户端之前，先直接测试它：

    ```bash
    echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' | semantica-mcp
    ```

    应收到 JSON-RPC 响应。工具和资源的完整列表见 [MCP 服务器](/zh/reference/mcp_server)。
  </Tab>
  <Tab title="Explorer">
    ```bash
    pip install semantica[explorer]
    semantica-explorer --graph my_graph.json
    ```

    完整的操作步骤（包括如何构建并保存图文件）见 [Explorer 设置](/zh/explorer-setup)。
  </Tab>
  <Tab title="Python 模块形式">
    每个命令也都能以 Python 模块方式运行：当脚本目录不在 `PATH` 中时很有用：

    ```bash
    python -m semantica.mcp_server
    python -m semantica.explorer --graph my_graph.json
    ```
  </Tab>
</Tabs>


## 环境变量

`semantica-mcp` 会读取两个环境变量：

| 变量 | 默认值 | 说明 |
| :-------- | :------- | :----------- |
| `SEMANTICA_KG_PATH` | *（无）* | 启动时加载的已保存图文件路径 |
| `SEMANTICA_LOG_LEVEL` | `WARNING` | 日志详细程度：`DEBUG`、`INFO`、`WARNING` |

`semantica-server` 会读取一个：

| 变量 | 默认值 | 说明 |
| :-------- | :------- | :----------- |
| `SEMANTICA_CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173,http://localhost:8000,http://127.0.0.1:8000` | 允许的 CORS 和 WebSocket 来源列表，以逗号分隔。默认值覆盖 Vite 开发服务器和服务器自身端口，因此在 `127.0.0.1:8000` 上打开的浏览器可以建立 WebSocket 连接；设置该项会替换默认值 |

这些命令不会读取其他环境变量。


## 故障排查

<AccordionGroup>

<Accordion title="报错 command not found" icon="terminal">

可执行文件位于当前 Python 环境的 `bin/`（Linux/Mac）或 `Scripts/`（Windows）目录下。如果提示找不到命令，通常是因为该目录不在 `PATH` 中。

先激活虚拟环境：

```bash
source venv/bin/activate   # Linux / Mac
venv\Scripts\activate      # Windows
semantica --help
```

查看 pip 将脚本安装到了哪里：

```bash
python -m site --user-scripts   # user-level install
pip show -f semantica           # shows all installed files
```

</Accordion>

<Accordion title="命令存在但导入时崩溃" icon="triangle-exclamation">

```bash
pip install --upgrade semantica
python -c "import semantica; print(semantica.__version__)"
```

如果存在多个 Python 环境，请安装到 shell 实际解析到的那个环境：

```bash
python -m pip install semantica
```

</Accordion>

<Accordion title="semantica-explorer 报错 uvicorn is required" icon="map">

Explorer 的 extra 未包含在基础安装中：

```bash
pip install semantica[explorer]
```

</Accordion>

<Accordion title="在 MCP 客户端中 semantica-mcp 无响应" icon="plug">

MCP 服务器通过 stdio 通信。先从 shell 直接测试：

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"ping","params":{}}' | semantica-mcp
```

返回 `{"jsonrpc":"2.0","id":1,"result":{}}` 说明服务器工作正常。如果没有任何输出，请检查命令是否在 `PATH` 中，以及基础包是否已安装。

</Accordion>

<Accordion title="Windows：启动时出现 DLL 错误" icon="windows">

安装 [Microsoft Visual C++ Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe)。这是 PyTorch 及相关包所需的 Windows 系统依赖，并非 Semantica 的缺陷。

</Accordion>

</AccordionGroup>


## 下一步

- [Explorer 设置](/zh/explorer-setup)：构建图谱、保存它，并启动浏览器仪表盘。
- [MCP 服务器](/zh/reference/mcp_server)：通过 MCP 协议暴露的全部 15 个工具和 3 个资源。
- [安装](/zh/installation)：虚拟环境、可选 extra 以及平台相关说明。
- [快速开始](/zh/quickstart)：包含可运行代码的端到端流水线演示。