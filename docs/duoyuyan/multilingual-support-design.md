---
title: "多语言支持详细设计"
description: "Semantica Knowledge Explorer 与文档站支持简体中文的现状评估、字符串清单、技术方案、落地顺序与验收标准。"
---

# Semantica 多语言支持详细设计

> 版本:v1.0 · 日期:2026-10-22 · 状态:待评审
>
> 本文档描述 **产品界面(Knowledge Explorer)** 与 **文档站** 支持简体中文(`zh-CN`)的完整方案。英文仍为默认语言。
>
> 本文档不进入 Mintlify 导航(`docs/docs.json`),属于内部设计文档。
>
> **实施状态**:Phase 1 已落地(2026-10-22)——i18n 初始化、语言切换器、语言检测与持久化、`<html lang>`/标题同步、key 对等检查脚本与 CI 步骤。Phase 2 批次 1(应用外壳、落地页、错误边界)已落地:100 处文案迁入 `shell` / `landing` / `errors` 命名空间。批次 2 已完成 Graph 工作区**全部界面文案**:核心组件、5 个插件(插件上下文新增响应式 `t`)、纯函数模块(`graphViewCopy` / `graphLoading` / `graphAnalytics` 改为返回 key 或在调用处翻译)、Markdown 错误与时间轴。新增 `graph` 命名空间(367 个 key);Graph 剩余 40 处均为数据默认值、未渲染的元数据、调试日志与 CSS。批次 3 已完成 Ontology 工作区全部 12 个文件。批次 4 已完成其余全部工作区(Manage、Decision、Enrich、Import/Export、Diff & Merge、Lineage、Memory、Reasoning、SPARQL、Vocabulary、Explore 标签栏)。**Phase 2 全部界面文案迁移完成**:英文资源共 997 个 key。剩余 70 处均为演示数据、节点类型默认值、键盘键名、内部调试日志或扫描误报,不属于待翻译界面文案。

**Phase 3 已完成**:`zh-CN` 的 16 个命名空间全部翻译(当前 1,058 个 key;Phase 2 结束时为 997,Phase 4 的 JSX 字面量检查补齐了遗漏文案)。`check:i18n:strict` 已接入 CI,同时校验缺失 key、多余 key 与插值占位符一致性。新增 `docs/duoyuyan/glossary.zh-CN.md` 作为统一术语表。

**Phase 5 已启动**:已确认 Mintlify 4.2.632(文档 CI 固定版本)原生支持 `navigation.languages`,并以双语言样例完成 `mintlify export` 验证。`docs/docs.json` 已迁移为 `en`(默认)+ `zh-Hans`;91 个导航页全部完成中文翻译(`docs/zh/`),覆盖率 100%,`mintlify export` 构建通过。`docs_check_locale.py --strict` 已接入文档 CI,缺失页或 `sourceHash` 漂移会使构建失败。中文内容由 Claude Opus 5.5 生成初稿,并通过代码围栏还原、MDX 组件计数、链接目标与 frontmatter 键校验;**上线前仍建议译者抽样审校**,尤其是 API 语义、示例说明与术语一致性。

**Phase 4 已完成**:CJK 字体栈与中文排版;开发环境伪本地化 `en-XA`(访问 `/?pseudo=xa`);`tests/i18nLayout.e2e.mjs` 在 en / zh-CN / en-XA × 375/768/1440 共 9 个场景检查横向溢出、raw key 与占位符泄漏,并产出截图;`eslint.i18n.config.js` 的 `i18next/no-literal-string`(JSX 文本)防止新增硬编码文案。两项测试均已接入 CI。

---

## 1. 结论摘要

| 问题 | 结论 |
| --- | --- |
| 当前是否支持多语言界面/文档 | **不支持**。前端没有任何 i18n 框架,`index.html` 为 `lang="en"`,文档站仅英文 |
| 支持中文是否需要开发 | **需要**。约 848 条唯一界面候选文案分散在 51 个文件中,必须做字符串抽取与运行时接入;文档需要目录结构与校验工具改造 |
| 前端工作量(估算) | 15–25 人日(约 3–5 周,单人),其中改造 8–12 人日、翻译与审校 5–8 人日 |
| 文档工作量(估算) | 6–8 周(1 名工程师 + 1–2 名译者并行),含 96 篇、38,559 行 |
| 最大风险 | 之后的**持续双语维护成本**(约占日常开发 10–20%),以及文档翻译与英文源的漂移 |
| 建议顺序 | 先前端(收益可见、范围可控),再文档管线,最后文档翻译;两者可并行但不要同时开工 |

---

## 2. 范围

### 2.1 本方案包含

- Knowledge Explorer 前端界面文案(按钮、标题、空态、错误提示、无障碍标签)
- 语言切换器、语言持久化、浏览器语言检测
- 中文排版与字体适配
- 文档站中文版(导航、页面、站内链接)
- 仓库根目录 `README.zh-CN.md`
- CI 防回退检查(新增硬编码文案、缺失翻译 key、文档漂移)

### 2.2 本方案默认不包含(需在 Phase 0 确认)

- **REST API / CLI 的输出与参数说明**:`semantica/cli.py` 约 340 处 `click` 帮助文案、`semantica/server.py` 的错误信息。建议保持英文,前端按错误码做映射展示。
- **图谱数据值**:节点类型、边类型、本体 IRI、属性名、文件名、查询语句。这些是数据而非界面,翻译会破坏语义与可移植性。
- **日志与调试输出**:`console.debug` / `console.error` 前缀信息。
- **导出文件内容**(RDF、JSON-LD、CSV 等)。

---

## 3. 现状评估

### 3.1 前端基础设施缺口

| 项目 | 现状 | 影响 |
| --- | --- | --- |
| i18n 框架 | 无(`i18next` / `react-intl` 均未安装) | 需要从零接入 |
| 文案存放 | 直接写在 51 个 `.ts` / `.tsx` 文件中 | 需要全量抽取 |
| 语言声明 | `explorer/index.html` 固定 `lang="en"` | 切换语言后需同步更新 |
| 页面标题 | 未设置 `document.title` 动态值 | 切换语言后标题不会变 |
| 语言持久化 | 未使用 `localStorage` / `sessionStorage` | 需要新增偏好存储 |
| 字体 | `IBM Plex Sans`、`Space Grotesk`、`JetBrains Mono` | 三者均无中文字形,中文会回退到系统字体,需显式 CJK 字体栈 |
| 测试 | 2 个测试文件通过英文文本定位元素 | 文案抽取后需要同步调整选择器 |
| 代码规模 | 95 个 `.ts` / `.tsx` 文件(产品代码 91 个),其中 51 个含候选文案 | 改造面集中但文件数多 |

### 3.2 前端文案规模(Phase 2 开始前基线)

扫描方法见第 4 节,原始数据见同目录 CSV:

- `frontend-i18n-inventory.csv`:**当前剩余**出现位置(含文件、行号、类型、置信度、建议 key)
- `frontend-i18n-unique.csv`:**当前剩余**去重文案(含出现次数、涉及文件数、是否含插值)

> 清单随后续批次推进而缩小;3.2 的统计是 Phase 2 开始前的基线(1,032 处 / 848 条)。每完成一批后重新运行扫描脚本更新 CSV。

| 指标 | 数值 |
| --- | --- |
| 扫描文件 | 95(产品代码 91,新增 i18n 文件已排除) |
| 含候选文案的文件 | 51 |
| 出现位置总数 | 1,032 |
| 去重文案总数 | 848(大小写不敏感口径 839) |
| 高置信度 | 732 条唯一 / 870 处 |
| 中置信度(需人工复核) | 116 条唯一 / 162 处 |
| 含插值的文案 | 76 条 |
| 单词文案 | 158 条 |
| 超过 60 字符的长文案 | 80 条 |
| 类型分布(出现位置) | JSX 文本 328 / 字符串字面量 608 / 人读属性 96 |

#### 按区域分布(出现位置)

| 区域 | 数量 | 说明 |
| --- | --- | --- |
| `workspaces/GraphWorkspace` | 408 | 图工作区,含画布、检查器、插件、分析面板 |
| `workspaces/OntologyWorkspace` | 321 | 本体/骨架/SHACL/SKOS/版本/对齐 |
| 根目录(`App.tsx`、`ErrorBoundary`、`ui/`) | 105 | 应用外壳、工作区导航、落地页 |
| `workspaces/ReasoningWorkspace.tsx` | 31 | 推理工作区 |
| `workspaces/ManageWorkspace` | 33 | KG 概览等 |
| `workspaces/EnrichWorkspace` | 31 | 实体消解、注册表 |
| `workspaces/DecisionWorkspace` | 18 | 决策链 |
| `workspaces/DiffMergeWorkspace` | 17 | 差异与合并 |
| `workspaces/ImportExportWorkspace` | 16 | 导入导出 |
| `workspaces/VocabularyWorkspace` | 23 | 词表导入 |
| `workspaces/MemoryWorkspace.tsx` | 14 | 代理记忆 |
| `workspaces/LineageWorkspace` | 11 | 血缘 |
| `workspaces/SparqlWorkspace` | 4 | SPARQL 控制台 |

#### 文案最多的 12 个文件

| 文件 | 数量 |
| --- | --- |
| `workspaces/GraphWorkspace/GraphWorkspace.tsx` | 114 |
| `App.tsx` | 98 |
| `workspaces/GraphWorkspace/GraphCanvas.tsx` | 53 |
| `workspaces/OntologyWorkspace/OntologyLoader.tsx` | 63 |
| `workspaces/GraphWorkspace/plugins/explorationEffectsPluginPhaseC.tsx` | 45 |
| `workspaces/OntologyWorkspace/OntologyManager.tsx` | 47 |
| `workspaces/OntologyWorkspace/AlignmentsTab.tsx` | 37 |
| `workspaces/OntologyWorkspace/VersionsTab.tsx` | 47 |
| `workspaces/GraphWorkspace/GraphInspectorPanel.tsx` | 36 |
| `workspaces/ReasoningWorkspace.tsx` | 31 |
| `workspaces/GraphWorkspace/plugins/explorationEffectsPlugin.tsx` | 25 |
| `workspaces/OntologyWorkspace/SKOSVocabularyManager.tsx` | 26 |

### 3.3 文档站现状

| 项目 | 现状 |
| --- | --- |
| 平台 | Mintlify,配置在 `docs/docs.json` |
| 页面数 | 96 个 `.md` / `.mdx` 文件 |
| 总行数 | 38,559 行(含代码块、Mermaid 图) |
| 导航 | 5 个 Tab:Overview、Quick Start、Modules、API Reference、Cookbook,仅英文 |
| 站内链接 | 405 处相对链接 |
| 校验 | `docs_check.py`:导航页存在性、Card href、过时仓库 URL、参考页 frontmatter、JSX 标签配平、代码围栏配平、Python 3.9+ 类型语法、Mintlify export 构建 |
| CI | `.github/workflows/docs.yml` 在文档变更时运行 `python docs_check.py` |
| `docs.json` | 未声明任何多语言/语言切换配置 |

### 3.4 后端与 CLI(仅作参考)

- `semantica/cli.py`:约 340 处命令/参数帮助文案
- `semantica/server.py`:少量 HTTP 错误详情
- 建议:这些**不翻译**,前端按稳定的错误码映射为中文提示;无法映射时展示原文并附错误码。

---

## 4. 前端可翻译字符串清单说明

### 4.1 提取方法

使用一次性分析脚本 `docs/duoyuyan/tools/inventory.py`:

1. 遍历 `explorer/src` 下全部 `.ts` / `.tsx`
2. 去除注释,提取三类来源:
   - **JSX 文本节点**:标签之间的可见文本
   - **字符串字面量**:单引号、双引号、模板字符串;模板中的插值统一替换为占位符
   - **人读属性**:`title`、`label`、`placeholder`、`aria-label`、`aria-description`、`alt`、`tooltip`、`description`、`caption`、`subtitle` 等
3. 过滤明显非文案内容:CSS 值、类名、SVG 路径、正则字面量、URL、MIME 类型、HTTP 头、控制台日志、演示数据、事件名、枚举值
4. 按置信度分级:
   - `high`:多词文本、带标点句子、人读属性
   - `medium`:单词标签或短文案,需人工确认
5. 为每条出现位置生成建议 key,并输出去重清单

复现命令:

```bash
python3 -I docs/duoyuyan/tools/inventory.py explorer/src docs/duoyuyan
```

> 该脚本仅用于本次分析与后续增量盘点,不参与构建。脚本对模板字符串、嵌套 JSX、动态拼接的判断是启发式的,结果需要人工复核。

### 4.2 CSV 字段

`frontend-i18n-inventory.csv`:

| 字段 | 含义 |
| --- | --- |
| `file` | 源文件路径 |
| `line` | 行号 |
| `kind` | `jsx_text` / `string` / `attr` |
| `confidence` | `high` / `medium` |
| `attr` | 属性名(仅 `attr` 类型) |
| `text` | 文案内容;插值已替换为 `{{var}}` |
| `key` | 建议的 i18n key |

`frontend-i18n-unique.csv`:

| 字段 | 含义 |
| --- | --- |
| `text` | 去重后的文案 |
| `confidence` | 最高置信度 |
| `kinds` | 出现过的类型 |
| `occurrences` | 出现次数 |
| `files` | 涉及文件数 |
| `templated` | 是否含插值 |

### 4.3 准确度与人工复核

- 估计**误报率 5%–10%**:演示数据、示例文本、少量样式片段可能残留;抽取阶段已排除日志、类名、SVG 路径、CSS 等主要来源。
- 估计**漏报率 5%–10%**:动态拼接的片段(如运行时拼接的句子)、经变量传入的 `children`、来自后端的文案不会被静态扫描捕获。
- 因此工作量的计算以 **约 780 条真实文案**为准,清单用于排期和 key 规划,不直接当作翻译交付物。
- 复核方法:按区域分批走查,每批由熟悉该工作区的开发者确认「保留 / 删除 / 调整 key」。

### 4.4 不应翻译的内容(建议维护为白名单)

- 产品名与品牌:`Semantica`、`Knowledge Explorer`
- 标准与格式:`RDF`、`RDFS`、`OWL`、`SKOS`、`SPARQL`、`SHACL`、`JSON-LD`、`Turtle`、`N-Triples`、`Parquet`、`GraphML`、`Cypher`
- 存储后端与数据库名:`Neo4j`、`FalkorDB`、`Oxigraph`、`Qdrant`、`Weaviate`、`Milvus`、`Pinecone`、`pgvector`
- 节点/边类型值与本体 IRI
- HTTP 方法、状态码、快捷键、文件扩展名
- 代码、路径、变量名

---

## 5. 前端技术方案

### 5.1 选型

| 维度 | i18next + react-i18next | react-intl(FormatJS) |
| --- | --- | --- |
| 运行时切换 | 原生支持,无需刷新 | 支持,需要 Provider |
| 命名空间/按需加载 | 内置,适合按工作区拆分 | 需自行拆分 |
| 插值/复数 | 内置,支持 `_one` / `_other` | 基于 ICU MessageFormat |
| 语言检测与持久化 | 官方 `i18next-browser-languagedetector` | 需自行实现 |
| 与 React 19 的集成 | Hook + `Trans` 组件 | Hook + 组件 |
| 生态与迁移成本 | 低,配置即用 | 中,需要 ICU 语法 |
| 结论 | **采用** | 作为备选 |

### 5.2 Key 命名规范

- 结构:`<命名空间>.<组件/区域>.<元素>`;通用文案放 `common.*`
- 全小写、点分层级、语义化,不使用英文原文作为 key
- 插值变量使用 `{{name}}`;数量使用 `{{count}}`
- 复数使用 i18next 后缀:`_one`、`_other`
- 示例:

```json
{
  "common": {
    "action": {
      "save": "Save",
      "cancel": "Cancel",
      "clearAll": "Clear all"
    }
  },
  "graph": {
    "inspector": {
      "title": "Entity Dossier",
      "distanceBand": "Distance band"
    },
    "loading": {
      "nodes": "Loading nodes {{loaded}} of {{total}}"
    }
  },
  "ontology": {
    "versions": {
      "empty": "No versions found"
    },
    "schemeCount_one": "{{count}} vocabulary scheme",
    "schemeCount_other": "{{count}} vocabulary schemes"
  },
  "errors": {
    "requestFailed": "Request failed with status {{status}}"
  }
}
```

### 5.3 目录结构

```text
explorer/src/
  i18n/
    index.ts              # i18next 初始化
    locales/
      en/
        common.json
        graph.json
        ontology.json
        reasoning.json
        manage.json
        enrich.json
        decision.json
        diffmerge.json
        importexport.json
        vocabulary.json
        memory.json
        lineage.json
        sparql.json
        errors.json
      zh-CN/
        ...(与 en 同名)
    types.d.ts            # 可选:key 类型提示
```

命名空间与区域一一对应,便于按工作区拆分翻译任务,也便于后续做懒加载。

### 5.4 初始化

```ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enCommon from './locales/en/common.json';
import zhCommon from './locales/zh-CN/common.json';
// 其余命名空间同理

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // 实际实现用 import.meta.glob 自动收集 locales/<locale>/<namespace>.json
    resources: {
      en: { common: enCommon },
      'zh-CN': { common: zhCommon },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh-CN'],
    defaultNS: 'common',
    interpolation: {
      // i18next v26 内置 Intl 格式化器,使用 {{value, number}} 等语法
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: 'semantica.locale',
      convertDetectedLanguage: (detected) => normalizeLocale(detected),
    },
    returnNull: false,
  });

export default i18n;
```

要点:

- `fallbackLng: 'en'`:缺失 key 时回退英文,避免界面出现 key 本身
- 不使用 `nonExplicitSupportedLngs`:它会把 `zh-CN` 归成 `zh` 去匹配,导致区域码匹配失败;i18next v26 实测下会直接回退英文。语言标签归一改由 `normalizeLocale` 在检测阶段完成
- `escapeValue: false`:React 已做转义
- 复数:英文使用 `_one` / `_other`;中文只需 `_other`

### 5.5 语言检测、持久化与切换

检测顺序:

1. `localStorage` 中的用户偏好(`semantica.locale`)
2. 浏览器语言(`navigator.language`)
3. HTML 标签上的 `lang`
4. 回退 `en`

切换器放在应用左侧导航栏底部(`app-rail`)。导航栏仅 88px 宽,因此按钮使用 `EN` / `中` 短标签,完整语言名通过 `aria-label` 与 `title` 暴露。切换时:

- 调用 `i18n.changeLanguage(next)`
- 写入 `localStorage`
- 更新 `document.documentElement.lang`
- 更新 `document.title`(标题本身也走翻译 key)
- 不需要刷新页面

### 5.6 与文档/链接相关的处理

- 界面中的文档链接按语言切换:`/docs` 与 `/docs/zh-CN` 或对应子域
- 外部链接文案(如「查看文档」)走翻译,URL 不做翻译

### 5.7 插值、数量与格式

- 插值:`t('graph.loading.nodes', { loaded, total })`
- 数量:`t('ontology.schemeCount', { count })`
- 数字/日期:统一通过 `Intl.NumberFormat`、`Intl.DateTimeFormat`,避免手写千分位与日期格式
- 相对时间(如「3 分钟前」):使用 `Intl.RelativeTimeFormat`,或引入 `dayjs` 的 locale(当前未安装,优先用原生 API)
- 百分比、货币:如无业务货币,不引入

### 5.8 富文本与嵌入元素

含加粗、链接、代码片段的文案使用 `Trans` 组件,避免 `dangerouslySetInnerHTML`:

```tsx
import { Trans } from 'react-i18next';

<Trans i18nKey="graph.help.egocentric" values={{ hops: 2 }}>
  Egocentric view: {{ hops }} hops depth (click to toggle off)
</Trans>
```

### 5.9 字体与中文排版

当前字体栈没有中文字形,中文会回退到系统默认字体,视觉不统一。建议:

```css
:root {
  --font-sans: 'IBM Plex Sans', 'Noto Sans SC', 'PingFang SC',
    'Microsoft YaHei', 'Source Han Sans SC', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Noto Sans Mono CJK SC',
    'Cascadia Code', monospace;
}
```

- 只加载 400/500/600 字重,使用 `display=swap`
- 自托管时对中文字体做子集化,避免首屏体积过大
- 行高:中文正文建议 1.6–1.75,英文保持现有值
- 字间距:中文不需要额外 `letter-spacing`;现有英文标题可能设置了负字距,需为中文单独覆盖
- 按钮与标签设置 `min-width`,避免中文变短后布局跳动
- 表格表头、图例、时间轴刻度需要单独走查

### 5.10 数据值、枚举与图表

- 节点类型、边类型、属性名不做翻译;如需展示友好名称,建立**显示映射表**(如 `PERSON → 人物`),映射表随语言加载,但**不修改底层数据**
- 图例、坐标轴、时间轴刻度属于界面,需要翻译
- 后端返回的枚举(工作区名、状态值)由前端统一映射,未知值原样展示

### 5.11 错误处理

- 优先识别后端错误码(如 `detail` 中的稳定 code),映射到 `errors.*`
- HTTP 状态码兜底:`errors.requestFailed` 带 `{{status}}`
- 无法识别的错误:展示原文,保留技术细节,避免翻译后无法排查
- 网络错误、中断错误(`AbortError`)单独分类,不显示原始异常名

### 5.12 无障碍

- 所有 `aria-label`、`aria-description`、`title`、`alt` 走翻译
- 切换语言后同步 `<html lang>`,便于屏幕阅读器切换发音
- 中英文混排时,代码与专有名词保留英文,避免全局朗读异常

### 5.13 防回退

- ESLint 增加 `eslint-plugin-i18next` 的 `no-literal-string`(对 JSX 文本与指定属性启用)
- 白名单:品牌名、格式名、数据值、测试 id
- CI 增加「翻译 key 对等」检查:比较 `en` 与 `zh-CN` 的 key 集合,缺失即失败
- 提交模板中增加「是否新增界面文案」勾选项

---

## 6. 文档站技术方案

### 6.1 方案对比

| 方案 | 做法 | 优点 | 缺点 |
| --- | --- | --- | --- |
| A. Mintlify 内置多语言 | 在 `docs/docs.json` 增加语言配置,中文页面放入约定目录 | 平台托管语言切换、SEO hreflang、导航 | 需确认当前版本/套餐是否支持,以及是否能保留现有校验流程 |
| B. 独立中文目录 + 独立部署 | `docs/zh-CN/` + 独立子域或子路径 | 完全可控,不影响英文站 | 需要自己维护导航、搜索、语言切换 |
| C. 外部机器翻译代理 | 类似 `readme-i18n.com` | 零成本 | 代码块、API 签名、Mermaid 会被破坏,不可用于产品文档 |

**确认结果(2026-10-22)**:采用**方案 A(Mintlify 原生多语言)**。

- 文档 CI 固定使用 `mintlify@4.2.632`;其 v2 schema 的 `navigation` 支持 `languages` 数组。
- 语言条目字段:`language`(ISO 639,简体中文用 `zh-Hans`)、`default`、`banner`/`footer`/`navbar`,以及 `tabs` / `groups` / `pages` / `href` 等导航结构。
- 每种语言拥有独立页面清单;中文页面放在 `docs/zh/` 下,导航中写作 `zh/<path>`。
- 翻译流水线:按导航去重后的页面逐页翻译,自动校验代码围栏、MDX 组件计数、链接目标与 frontmatter 键;站内绝对链接自动加 `/zh` 前缀;每页记录 `sourceHash` 供漂移检测。
- 翻译由 `docs/duoyuyan/tools/translate_docs.py` 调用 Claude Opus 5.5 生成初稿;机器初稿仍需译者抽样审校,尤其是 API 语义与专有名词。
- 使用双语言样例实际运行 `npx mintlify@4.2.632 export`:导出成功,生成 `/zh/...` 路由,页面切换器包含 `zh-Hans`(显示「简体中文」)。
- 现有 `docs_check.py` 的「导航页存在」检查天然覆盖 `languages`,无需改写;额外新增 `docs_check_locale.py` 负责覆盖率与漂移。

方案 C 仅用于 README 的展示层链接,不作为产品文档。

### 6.2 目录与导航

方案 A(以平台约定为准):

```text
docs/
  docs.json              # 增加语言配置与中文导航
  zh-CN/
    index.md
    quickstart.md
    ...
    reference/
      normalize.md
      ...
```

方案 B:

```text
docs/
  docs.json              # 英文导航保持不变
  zh-CN/
    docs.json            # 独立的中文导航(或与主配置合并)
    ...页面
```

注意:

- 中文页面必须与英文页面**一一对应**,文件名保持英文,便于链接与自动化比对
- 站内相对链接需要本地化到中文目录;`docs_check.py` 需同时校验两套链接
- Mermaid 图中的文字可选翻译,但节点 ID 与代码块不翻译
- 每个中文页面保留英文源路径元数据,用于漂移检测

### 6.3 `docs_check.py` 扩展

现有 10 项检查作用于 `docs/**/*.md`。扩展后需要:

1. **语言目录纳入扫描**:中文页面参与链接、围栏、标签配平、禁用词检查
2. **页面集对等**:英文页面集合与中文页面集合必须一致(允许显式豁免清单)
3. **导航一致性**:`docs.json` 中声明的页面在对应语言目录中存在
4. **漂移检测**:维护 `docs/locale-manifest.json`,记录每个英文页面的 `sha256` 与最近同步的 commit;英文页面变化而中文未更新时,CI 输出警告(不阻塞合并)或失败(可配置)
5. **术语检查**:对高频术语做白名单/黑名单校验(可选)

伪代码:

```text
for page in pages_under("docs") not under zh-CN:
    zh = "docs/zh-CN/" + page
    assert exists(zh)
    assert links_in(zh) resolve
    if sha256(page) != manifest[page].hash:
        warn(page + " changed, zh-CN may be stale")
```

### 6.4 术语表

翻译前先冻结术语,避免同一概念多种译法。建议的核心术语见附录 B。术语表应:

- 放在仓库中(如 `docs/duoyuyan/glossary.zh-CN.md`)
- 翻译与审校共用同一份
- 新增术语先改术语表,再改译文

### 6.5 README

- 新增 `README.zh-CN.md`,顶部语言切换链接
- README 是仓库门面,翻译收益高、成本低(单文件)
- 与文档站使用同一术语表

---

## 7. 落地顺序

> 以下为建议顺序与估算,按 1 名前端工程师 + 1 名后端/工具链工程师 + 1–2 名译者配置。

### Phase 0:范围与选型确认(2–3 人日)

| 事项 | 产出 | 退出标准 |
| --- | --- | --- |
| 确认翻译范围(界面/文档/CLI/API) | 范围确认单 | 各方签字 |
| 验证 Mintlify 多语言能力与套餐限制 | 结论记录 | 选定方案 A 或 B |
| 冻结术语表 | `glossary.zh-CN.md` | 术语评审通过 |
| 确认「不翻译」白名单 | 白名单文件 | 开发与译者确认 |
| 确认字体授权与加载方式 | 技术选型说明 | 性能评估通过 |

### Phase 1:i18n 基础设施(3–5 人日)

| 事项 | 产出 |
| --- | --- |
| 安装并初始化 i18next | `explorer/src/i18n/index.ts` |
| 建立命名空间与空 `zh-CN` 骨架 | `locales/en/*.json`、`locales/zh-CN/*.json` |
| 语言检测、持久化、`<html lang>` | 初始化逻辑 |
| 顶部语言切换器 | `App.tsx` 工具栏 |
| 翻译 key 对等检查脚本 | CI 任务 |

退出标准:界面文案仍为英文,但切换器可切换且无报错;key 对等检查可运行。

### Phase 2:字符串抽取与英文回填(5–7 人日)

按区域分批,建议顺序:

1. 应用外壳(`App.tsx`、`ErrorBoundary`、`ui/`)
2. Graph 工作区(最大,114 + 53 + 45 + 36 + 25 处)
3. Ontology 工作区(63 + 47 + 47 + 37 + 32 + 26 + 22 处)
4. 其余工作区(Reasoning、Manage、Enrich、Decision、DiffMerge、ImportExport、Vocabulary、Memory、Lineage、SPARQL)

每批流程:

- 从 CSV 取该区域清单
- 人工复核,合并重复文案、拆分过长文案
- 替换为 `t('key')`,英文文案原样进入 `en/*.json`
- 运行 lint 与测试

退出标准:界面所有可见文案来自 `en` 资源;`no-literal-string` 无新增告警;功能与视觉与改造前一致。

### Phase 3:中文翻译与联调(3–5 人日)

| 事项 | 产出 |
| --- | --- |
| 翻译 848 条(实际约 780 条) | `zh-CN/*.json` |
| 术语一致性校对 | 校对记录 |
| 切换器联调与持久化验证 | 测试用例 |
| 中文排版与字体适配 | 样式调整 |
| 长文案与窄屏走查 | 问题清单 |

退出标准:`zh-CN` key 覆盖率 100%;切换后无英文残留(白名单除外);375px / 768px / 1440px 三档无溢出与截断。

### Phase 4:质量与防回退(3–5 人日)

| 事项 | 产出 |
| --- | --- |
| 伪本地化测试(`en-XA`) | 截断问题清单 |
| Playwright 截图对比(中/英 × 三档宽度) | 视觉回归基线 |
| 更新按文本定位的测试 | 测试改造 |
| ESLint 规则与 CI | `.eslintrc` / workflow |
| 无障碍检查(`lang`、`aria-label`) | 检查报告 |

退出标准:CI 绿;伪本地化无不可读溢出;关键路径 E2E 通过。

### Phase 5:文档多语言(工具链 3–5 人日,翻译 6–8 周)

| 事项 | 产出 |
| --- | --- |
| 选定方案并改造 `docs.json` | 中文导航可访问 |
| 扩展 `docs_check.py` 与漂移检测 | CI 检查 |
| 迁移 96 个页面骨架 | `zh-CN/` 目录 |
| 翻译与审校(分模块批次) | 中文页面 |
| 站内链接与搜索验证 | 验收报告 |
| `README.zh-CN.md` | 中文 README |

分批建议:Getting Started → Concepts/Architecture → Modules(27 个) → API Reference → Cookbook/Guides。

退出标准:`docs_check.py` 通过;中英文页面集对等;405 处站内链接在中文目录全部可达;抽样 20 页人工审校通过。

### 总排期(参考)

| 阶段 | 估算 | 可并行 |
| --- | --- | --- |
| Phase 0 | 2–3 人日 | — |
| Phase 1 | 3–5 人日 | — |
| Phase 2 | 5–7 人日 | 文档方案验证 |
| Phase 3 | 3–5 人日 | 文档工具链开发 |
| Phase 4 | 3–5 人日 | 文档翻译启动 |
| Phase 5 | 6–8 周 | 与 Phase 4 部分重叠 |

前端合计约 **15–25 人日**;文档以翻译与审校为主,工程侧约 **3–5 人日**。

---

## 8. 测试与验收

### 8.1 前端

| 类型 | 内容 |
| --- | --- |
| 单元测试 | 语言检测、持久化、格式化函数 |
| 组件测试 | 切换语言后关键组件文案变化;`aria-label` 同步 |
| E2E | 首访按浏览器语言选择;切换后刷新保持;标题与 `lang` 正确 |
| 伪本地化 | 使用 `en-XA` 检查截断、换行、按钮宽度 |
| 视觉回归 | 中/英 × 375 / 768 / 1440 三档截图对比 |
| 覆盖率 | `zh-CN` 与 `en` key 集合完全一致(白名单除外) |

### 8.2 验收清单

- [ ] 默认语言为英文;浏览器为中文时首访自动中文
- [ ] 语言选择可持久化,刷新与下次访问保持
- [ ] 所有可见文案来自资源文件,ESLint 无新增硬编码
- [ ] 无缺失 key 回退到英文的情况(白名单除外)
- [ ] 数字、日期、相对时间按语言格式化
- [ ] 中文无字体回退错乱,三档宽度无溢出
- [ ] `<html lang>` 与页面标题随语言更新
- [ ] 屏幕阅读器朗读语言正确
- [ ] 性能无显著退化(首屏体积、LCP)
- [ ] 文档站中文页面集与英文对等,站内链接全部可达
- [ ] `docs_check.py` 在 CI 通过
- [ ] 英文源变更时,中文漂移可见(警告或失败)

### 8.3 文档

- `docs_check.py` 全项通过
- 抽样审校:每模块至少 2 页
- 代码块、命令、API 签名保持原样
- Mermaid 图渲染正常
- 中文搜索可用

---

## 9. 风险与缓解

| 风险 | 影响 | 缓解 |
| --- | --- | --- |
| 持续双语维护成本 | 每次新增文案/文档都要双写 | lint + key 对等 + 文档漂移检测;把翻译纳入 PR 流程 |
| 文档英文源持续演进 | 中文版快速过期 | manifest 记录源 hash;发布前检查;按模块分批刷新 |
| CJK 字体体积 | 首屏变慢 | 系统字体优先 + 子集化 + `display=swap` |
| 中文文案更短/更长导致布局问题 | 截断、错位 | 伪本地化 + 视觉回归 + `min-width` |
| 平台多语言能力不确定 | 方案返工 | Phase 0 先验证 Mintlify;保留独立目录方案 |
| 数据值被误翻译 | 语义错误、数据不可用 | 白名单 + 代码评审 + 显示映射层 |
| 翻译术语不一致 | 可读性差 | 术语表 + 统一审校 |
| 错误信息翻译后难以排查 | 支持成本上升 | 保留错误码与原文,UI 层映射 |
| MDX 对中文与花括号敏感 | 构建失败 | 花括号与尖括号一律放进代码块或行内代码;CI 构建校验 |

---

## 10. 附录

### A. 建议 key 样例

| 英文文案 | 建议 key |
| --- | --- |
| Knowledge Explorer | `nav.knowledgeExplorer` |
| Graph and vocabulary browsing | `nav.knowledgeExplorer.description` |
| Entity Dossier | `graph.inspector.title` |
| Distance band | `graph.inspector.distanceBand` |
| `Loading nodes {{loaded}} of {{total}}` | `graph.loading.nodes` |
| Failed to load ontology registry. | `ontology.registry.loadFailed` |
| No versions found | `ontology.versions.empty` |
| `Egocentric view: {{hops}} hops depth (click to toggle off)` | `graph.help.egocentric` |
| `Request failed with status {{status}}` | `errors.requestFailed` |

### B. 术语表(初稿)

| 英文 | 中文 | 备注 |
| --- | --- | --- |
| Context Graph | 上下文图 | 产品核心概念 |
| Knowledge Graph | 知识图谱 | 首次出现可保留 KG |
| Ontology | 本体 | |
| Provenance | 溯源 | 指来源与变更记录 |
| Decision Intelligence | 决策智能 | |
| Entity Resolution | 实体消解 | |
| Entity | 实体 | |
| Node | 节点 | |
| Edge | 边 | |
| Triplet | 三元组 | |
| Ingest | 摄取 | |
| Chunk | 分块 | |
| Embedding | 嵌入 | |
| Vector Store | 向量存储 | |
| Graph Store | 图存储 | |
| Workspace | 工作区 | |
| Dossier | 档案 | `Entity Dossier` 译「实体档案」 |
| Proposal | 提案 | |
| Alignment | 对齐 | |
| Vocabulary | 词表 | |
| Scheme | 词表方案 | SKOS scheme |
| Registry | 注册表 | |
| Lineage | 血缘 | |
| Snapshot | 快照 | |
| Conflict | 冲突 | |
| Deduplication | 去重 | |
| Forward Chaining | 前向链推理 | |
| Audit Trail | 审计轨迹 | |
| Policy | 策略 | |
| SHACL / OWL / SKOS / SPARQL / RDF | 不译 | 标准名保留英文 |

### C. 相关文件

| 文件 | 说明 |
| --- | --- |
| `frontend-i18n-inventory.csv` | 当前剩余 71 条文案出现位置(基线 1,032;均为数据/内部/误报) |
| `frontend-i18n-unique.csv` | 当前剩余 62 条去重文案(基线 848;均为数据/内部/误报) |
| `glossary.zh-CN.md` | 中英术语表与不译项清单 |
| `tools/translate_docs.py` | 文档批量翻译脚本(调用 Claude,需 `anthropic` 与 `ANTHROPIC_API_KEY`) |
| `../../docs_check_locale.py` | 覆盖率、缺失页与 `sourceHash` 漂移检查 |
| `tools/inventory.py` | 本次分析使用的扫描脚本 |
| `explorer/index.html` | 当前固定 `lang="en"` |
| `explorer/src/App.tsx` | 应用外壳与导航,文案最多的入口之一 |
| `explorer/src/i18n/` | i18next 初始化、语言元数据、`<html lang>`/标题同步 |
| `explorer/src/ui/LanguageSwitcher.tsx` | 语言切换器与样式 |
| `explorer/scripts/check-i18n-keys.mjs` | 中英文 key 对等检查 |
| `explorer/tests/i18n.test.ts` | 语言归一与 catalog 对等测试 |
| `docs/docs.json` | 文档站导航配置 |
| `docs_check.py` | 文档完整性校验 |
| `.github/workflows/docs.yml` | 文档 CI |

### D. 待决事项

1. Mintlify 当前版本/套餐是否支持内置多语言?
2. 中文版文档的访问路径:`/zh-CN` 子路径还是独立子域?
3. 是否翻译 CLI 帮助文案?(建议不译)
4. 词表/本体中的用户自定义标签是否需要在展示层提供「中文注释」?(建议不译,另设注释字段)
5. 是否需要繁体中文(`zh-TW`)?如需,方案需预留 locale 维度。
