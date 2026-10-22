---
title: "治理"
description: "项目治理模型：角色、决策流程、发布节奏与代码审查指南。"
icon: "scale-balanced"
sourceHash: "9c530e72f1dc6865b98b5e0e7ee4626dbb84ed771d6854952da9ca256d4175c0"
---

> Semantica 由 Semantica 团队维护，社区在开放治理模型下参与贡献。


## 角色

- **维护者**：Semantica 团队。审查并合并 PR，管理发布与代码质量，确定项目方向与社区标准。
- **贡献者**：提交代码、文档和缺陷报告。协助处理 Issue 与审查。将在 [CONTRIBUTORS.md](https://github.com/semantica-agi/semantica/blob/main/CONTRIBUTORS.md) 中予以致谢。
- **社区成员**：使用 Semantica，提供反馈，分享使用案例，并参与 GitHub Discussions 与 Discord。


## 决策流程

### 代码变更

<Steps>
  <Step title="提案">创建 GitHub Issue 描述该变更。</Step>
  <Step title="讨论">社区就方案与范围展开讨论。</Step>
  <Step title="实现">提交包含该变更的拉取请求。</Step>
  <Step title="审查">至少一名维护者审查该 PR。</Step>
  <Step title="合并">CI 通过且维护者批准后合并。</Step>
</Steps>

### 重大决策

- 在 GitHub Issues 中发布 RFC
- 至少 1 周的社区讨论期
- 维护者依据社区反馈与技术可行性作出决定


## 发布

Semantica 遵循 **语义化版本**（`MAJOR.MINOR.PATCH`）：

| 级别 | 触发条件 | 节奏 |
| :------- | :--------- | :--------- |
| MAJOR | 破坏性变更 | 每季度或按需 |
| MINOR | 新功能（向后兼容） | 每月或就绪时 |
| PATCH | 缺陷修复（向后兼容） | 随缺陷修复发布 |


## 代码审查

**审查标准：** 功能、代码质量、测试、文档、性能、安全性。

**时限：** 48 小时内完成初次审查；7 天内完成后续跟进。

**审查者指南：** 建设性表达，说明理由，给出替代方案。

**贡献者指南：** 及时回应评论，不清楚时主动提问，乐于接受反馈。


## 沟通

- **GitHub Issues**：缺陷报告、功能请求、问题咨询
- **GitHub PRs**：代码贡献
- **GitHub Discussions**：社区交流
- **Security Advisories**：[私下报告安全问题](https://github.com/semantica-agi/semantica/security/advisories/new)


## 项目目标

- **易用性**：易于使用与理解，提供合理默认值、清晰文档以及最少的流程负担。
- **可靠性**：生产级质量，已在多个 Python 版本、平台和真实工作负载中经过测试。
- **性能**：高效且可扩展，从单机 Notebook 到企业级图数据库均适用。
- **可扩展性**：通过 `PluginRegistry` 模式，借助插件与自定义模块轻松扩展。
- **社区**：热情且包容。无论背景与经验水平，所有贡献者都能参与并获得认可。


## 许可证

MIT License：参见 [LICENSE](https://github.com/semantica-agi/semantica/blob/main/LICENSE) 及[许可证页面](/zh/project-license)。


## 另请参阅

- [贡献](/zh/contributing-guide)：如何提交变更。
- [社区](/zh/community)：社区指南与渠道。