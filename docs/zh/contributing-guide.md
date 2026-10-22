---
title: "贡献指南"
description: "如何向 Semantica 贡献代码、文档、测试与社区支持。"
icon: "code-pull-request"
sourceHash: "8e2215ccadb30f1fa6f5143d5d36909cb3b386be4ba127d298cec7879782107f"
---

欢迎各种形式的贡献（代码、文档、测试和社区支持）。每一份贡献都会在发布说明和 GitHub 贡献者列表中予以致谢。


## 快速开始

```bash
# Fork the repo on GitHub, then:
git clone https://github.com/your-username/semantica.git
cd semantica
pip install -e . --group dev   # needs pip 25.1+ (or: uv sync)
pytest
```

首次贡献者可以从带有 [`good-first-issue`](https://github.com/semantica-agi/semantica/labels/good-first-issue) 标签的 issue 入手，这类 issue 的范围经过界定，无需深入了解代码库即可在数小时内完成。


## 贡献方式

- **代码**：修复 Bug、实现功能、优化性能，或通过插件注册表新增摄取器、解析器和导出器。
- **文档**：修正拼写错误、提升表述清晰度、补充缺失示例、编写教程，或在模块演进过程中保持 API 参考的准确性。
- **测试**：为尚未覆盖的模块或边界情况补充测试覆盖，用最小复现用例重现已报告的 Bug，或提升跨平台可靠性。
- **社区**：在 GitHub Issues 和 Discussions 中回答问题，以建设性反馈评审 Pull Request，或在博客文章和演讲中分享 Semantica。


## 开发环境搭建

```bash
git clone https://github.com/your-username/semantica.git
cd semantica
pip install -e . --group dev   # needs pip 25.1+ (or: uv sync)
```

**代码风格工具：**

```bash
pytest                      # full test suite
black semantica/ tests/     # auto-format
isort semantica/ tests/     # sort imports
flake8 semantica/           # lint
```

风格约定：使用 **Black** 进行格式化，使用 **isort** 管理导入，使用 **flake8** 进行代码检查。三者均在 CI 中运行。


## 报告问题

**Bug 报告**应包含：

- 实际发生了什么，与你期望的结果有何差异
- 最小复现步骤
- 你的环境：Python 版本、操作系统、Semantica 版本（`python -c "import semantica; print(semantica.__version__)"`）

**功能请求**应包含：

- 你的具体使用场景
- 你希望 Semantica 实现什么
- 为什么它能让广泛的用户受益，而不只是你的特定工作流


## Pull Request 检查清单

提交 PR 前，请确认：

<Check>测试在本地通过：`pytest`</Check>
<Check>新功能附带文档，且包含可运行的代码示例</Check>
<Check>代码遵循项目风格：Black、isort、flake8</Check>
<Check>提交信息清晰，说明*为什么*而不只是*做了什么*</Check>
<Check>没有未解决的合并冲突</Check>


## 行为准则

所有贡献者都应遵守 [Contributor Covenant 行为准则](https://github.com/semantica-agi/semantica/blob/main/CODE_OF_CONDUCT.md)。请保持尊重、耐心和建设性，尤其是对新加入者。如需举报违规行为，请以 `[CoC]` 为前缀提交 issue。


## 帮助

- [GitHub Issues](https://github.com/semantica-agi/semantica/issues)
- [GitHub Discussions](https://github.com/semantica-agi/semantica/discussions)
- [Discord](https://discord.gg/sV34vps5hH)

- [社区](/zh/community)：社区准则与价值观。
- [治理](/zh/governance)：决策如何做出，项目如何运作。