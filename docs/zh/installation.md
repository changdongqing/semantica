---
title: "安装"
description: "在一分钟内完成 Semantica 安装。"
icon: "download"
sourceHash: "2792705e32ce3bb6dc3b45303b5cf90089ec9b0470306af49883d058bf76bc2c"
---

<Check>
  **已发布在 PyPI**：执行 `pip install semantica` 即可使用。
</Check>

<Note>
  需要 Python 3.10 或更高版本（支持 3.10–3.13），推荐使用 Python 3.11+。
</Note>

## 系统要求

| 组件 | 最低配置 | 推荐配置 |
| :--------- | :------- | :----------- |
| Python | 3.10 | 3.11+ |
| 操作系统 | Windows / Linux / Mac | Linux / Mac |
| 内存 | 4 GB | 16 GB+ |
| 存储 | 2 GB | 20 GB+（模型与数据） |


## 基础安装

```bash
pip install semantica
```

安装全部可选依赖：

```bash
pip install semantica[all]
```

### 验证

```bash
python -c "import semantica; print(semantica.__version__)"
```


## 虚拟环境（推荐）

<Tabs>
  <Tab title="venv">
    ```bash
    python -m venv venv
    source venv/bin/activate   # Linux / Mac
    venv\Scripts\activate      # Windows
    pip install semantica
    ```
  </Tab>
  <Tab title="conda">
    ```bash
    conda create -n semantica python=3.11
    conda activate semantica
    pip install semantica
    ```
  </Tab>
</Tabs>


## 可选依赖

只安装你需要的部分：

<Tabs>
  <Tab title="GPU">
    ```bash
    pip install semantica[gpu]
    ```
    包含支持 CUDA 的 PyTorch、FAISS GPU 和 CuPy。
  </Tab>
  <Tab title="可视化">
    ```bash
    pip install semantica[viz]
    ```
    包含 PyVis、Graphviz 和 UMAP。
  </Tab>
  <Tab title="LLM 提供方">
    ```bash
    pip install semantica[llm-all]       # all providers
    pip install semantica[llm-openai]    # OpenAI
    pip install semantica[llm-anthropic] # Anthropic
    pip install semantica[llm-gemini]    # Google Gemini
    pip install semantica[llm-groq]      # Groq
    pip install semantica[llm-ollama]    # Ollama (local)
    ```
  </Tab>
  <Tab title="云存储">
    ```bash
    pip install semantica[cloud]
    ```
    包含 AWS S3、Azure Blob 和 Google Cloud Storage。
  </Tab>
</Tabs>


## 从源码安装

如需最新开发版本或参与贡献：

```bash
git clone https://github.com/semantica-agi/semantica.git
cd semantica

pip install -e .         # core only
pip install -e ".[all]"  # all extras
pip install -e . --group dev  # dev tools (pytest, black, etc.); needs pip 25.1+, or use `uv sync`
```

如果 PyPI 发布版本存在问题，可直接从 main 分支安装：

```bash
pip install git+https://github.com/semantica-agi/semantica.git@main
```


## 故障排查

<AccordionGroup>

<Accordion title="ModuleNotFoundError: No module named 'semantica'" icon="circle-xmark">

确认你处于正确的虚拟环境中：

```bash
pip list | grep semantica
pip install --upgrade semantica
```

</Accordion>

<Accordion title="安装因依赖错误而失败" icon="triangle-exclamation">

```bash
pip install --upgrade pip
pip install build wheel
pip install semantica --no-deps  # install core first, then add extras
```

</Accordion>

<Accordion title="GPU 依赖安装失败" icon="bolt">

先安装 CPU 版本，再叠加 GPU 支持：

```bash
pip install semantica
pip install semantica[gpu]
```

</Accordion>

<Accordion title="权限不足" icon="lock">

```bash
pip install --user semantica  # or use a virtual environment
```

</Accordion>

<Accordion title="Windows 上安装 [all] 失败" icon="windows">

已在 **v0.5.0** 中修复。请升级到最新版本：

```bash
pip install --upgrade semantica
```

</Accordion>

<Accordion title="Windows 启动时出现 PyTorch DLL 错误" icon="windows">

请安装 [Microsoft Visual C++ Redistributable](https://aka.ms/vs/17/release/vc_redist.x64.exe)。这是 Windows 系统依赖，并非 Semantica 的缺陷。

</Accordion>

</AccordionGroup>


## 下一步

- [快速上手](/zh/getting-started)：在开始构建之前，先了解 Semantica 能做什么。
- [构建流水线](/zh/quickstart)：跟随包含代码的端到端工作流。
- [浏览示例](/zh/cookbook)：查看按使用场景组织的 notebook 示例。