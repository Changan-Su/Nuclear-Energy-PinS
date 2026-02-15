# Function Review: Material and Assets Recovery Procedure

**Version**: 1.1  
**Date**: 2026-02-15  
**Status**: 可复现的恢复流程（Runbook）

## Feature Name

Material and Assets Recovery Procedure — 从备用数据源恢复 Section 数据与媒体资源

**功能名称**：从备用数据源恢复区块数据与媒体资源的操作流程

---

## Purpose

当出现以下情况时，可通过本流程恢复内容与资源，避免误判为“永久丢失”：

1. **Section 数据被覆盖**：`material.json` 或 `docs/material.json` 中某区块（如 `features`）被替换或改写，但历史版本仍存在于其他位置（如 `index.html` 内嵌数据）。
2. **媒体文件缺失**：模板中引用的 `uploads/*` 路径在根目录下无对应文件或目录，而相同文件仍存在于 `docs/uploads/` 或 Git 历史中。

本流程不替代常规备份策略，而是基于本项目**现有数据源与目录结构**的可复现恢复方案。

---

## Implementation

### 数据源与优先级

| 数据用途       | 主数据源               | 备用/恢复来源                    |
|----------------|------------------------|----------------------------------|
| 页面渲染       | `material.json`       | —                                |
| docs 页面渲染  | `docs/material.json`  | —                                |
| 离线/预加载    | `index.html` 内嵌 JSON | 与 material.json 应尽量一致      |
| 媒体文件（根站）| 根目录 `uploads/`     | `docs/uploads/` 或 Git 历史      |
| 媒体文件（docs）| `docs/uploads/`       | Git 历史                         |

### 恢复流程概览

```
发现某 Section 内容/图片“丢失”
        │
        ▼
┌───────────────────────────────────┐
│ 1. 定位“正确”内容的存放位置        │
│    - index.html 内嵌 material      │
│    - 或 Git 历史中的 material.json │
└───────────────┬───────────────────┘
                ▼
┌───────────────────────────────────┐
│ 2. 恢复 Section 数据               │
│    - 复制对应 key（如 index.features）│
│    - 覆盖 material.json            │
│    - 同步覆盖 docs/material.json   │
└───────────────┬───────────────────┘
                ▼
┌───────────────────────────────────┐
│ 3. 恢复媒体文件（若路径 404）      │
│    - 从 docs/uploads/ 复制到      │
│      uploads/（根目录）            │
│    - 或 git checkout 历史文件      │
└───────────────┬───────────────────┘
                ▼
┌───────────────────────────────────┐
│ 4. 校验与可选同步                  │
│    - 刷新页面确认显示正确          │
│    - 可选：把 material 同步回      │
│      index.html 内嵌数据           │
└───────────────────────────────────┘
```

### 关键路径说明

- **内嵌 material 位置**：在 `index.html` 中搜索 `__PRELOADED_MATERIAL__` 或 `materialData`，其 `index` 对象下按 section id 分块（如 `hero`、`highlights`、`features`、`safety` 等）。
- **Section 与模板对应**：`config.sections` 中 `id: "features"` 且 `template: "card-grid"` 时，数据来自 `material.index.features`（headline、subheadline、cards）。
- **卡片图片路径**：card-grid 卡片使用 `card.image`（如 `uploads/media-xxx.png`），相对站点根目录解析；根目录需存在 `uploads/` 目录及对应文件名。

---

## Usage

### 场景一：仅 Section 数据被覆盖（如 Renewable 被核能三卡替换）

1. **定位备份数据**  
   打开 `index.html`，在内嵌的 material 对象中找到目标 section（如 `index.features`），确认其内容为期望的版本（如五张 Renewable 卡片）。

2. **提取并转义**  
   - 若直接复制 JSON：注意字符串内的换行需为 `\n`，双引号需转义 `\"`。  
   - 若从脚本读取：可用 `JSON.parse` 读取内嵌 JSON 再 `JSON.stringify` 写回，避免手写转义错误。

3. **写回 material**  
   - 用提取出的对象整体替换 `material.json` 中的 `index.features`。  
   - 对 `docs/material.json` 做同样替换，保证两处一致。

4. **验证**  
   刷新页面，确认该 section 标题、卡片数量、文案与“Learn more”详情、references 均正确。

### 场景二：Section 数据正确但图片 404

1. **确认引用路径**  
   在 material 中查看该 section 的卡片（或其它区块）的 `image` 字段，例如 `uploads/media-k8uxap-7.png`。

2. **确认站点根目录**  
   - 若打开的是根目录 `index.html`，则请求 `uploads/xxx.png` 时相对于项目根目录。  
   - 若打开的是 `docs/index.html`，则通常相对于 `docs/`，即 `docs/uploads/xxx.png`。

3. **恢复文件**  
   - 若根目录缺少 `uploads/`：创建 `uploads/`，从 `docs/uploads/` 复制所需文件到根目录 `uploads/`。  
   - 若 `docs/uploads/` 也没有：使用 `git log --all --name-only` 或 `git show <commit>:path/to/file` 从历史中恢复文件到对应目录。

4. **验证**  
   打开 DevTools → Network，刷新页面，确认对应 `uploads/*.png`（或 `docs/uploads/*.png`）返回 200。

### 场景三：从 Git 历史恢复整份 material 或单文件

- **查看某文件历史**：  
  `git log --oneline -- path/to/material.json`
- **恢复某次提交中的文件**：  
  `git show <commit>:path/to/material.json > material.json.recovered`  
  再按需合并或替换当前 `material.json` 中对应 section。
- **恢复 uploads 下某张图**：  
  `git show <commit>:docs/uploads/media-xxx.png > uploads/media-xxx.png`  
  （需先建好 `uploads/`）

---

## API / Interface

本功能为**操作流程**，不暴露程序化 API。涉及的文件与结构如下：

- **material 结构**：`material.index.<sectionId>` 对应各 section；card-grid 使用 `index.features.cards[]`，每项含 `title`、`description`、`detail`、`references`、`image`、`flipEnabled` 等。
- **模板读取**：`js/section-renderer.js` 的 `renderSection()` 从 `material[pageKey][id]` 取数据；`js/templates.js` 的 `cardGridTemplate()` 使用 `data.cards`、`data.headline`、`data.subheadline`` 等。
- **图片解析**：`js/templates.js` 中 `getImageUrl(imagePath, material)` 会处理 `uploads/` 前缀与 `material.imagesBasePath`，最终由浏览器请求相对当前页面的 URL。

---

## Configuration

无需配置。恢复时只需：

- 确保写回的 JSON 合法（可用 `JSON.parse` 校验）。
- 若同时存在 `material.json` 与内嵌数据，约定以哪一份为“主真相源”；恢复后建议同步到另一份，避免再次覆盖。

---

## Integration

- **Section Renderer**：恢复 material 后，重新加载页面或触发 `SectionRenderer.updateMaterial()` 会重新渲染，无需改代码。
- **Mode Manager**：若使用在线模式，恢复的 `material.json` 可能被服务器或本地缓存覆盖，需确认实际加载的是本地文件还是 API。
- **Editor**：编辑模式下对恢复后的 section 所做的修改会写回当前 material，注意不要误覆盖刚恢复的内容。

---

## References

### 项目内

- **Log**：`Document/Log/v0.8_slash_command_media_insert.md` — 章节「v1.1 Renewable Grid 紧急恢复（卡片内容/设置/图片）」
- **Bug Review**：`Document/Bugs/BugReview_v1.1_Renewable_Grid_Content_Settings_Images_Lost.md` — 问题原因与解决细节
- **数据文件**：`material.json`、`docs/material.json`、`index.html`（内嵌 material）
- **媒体目录**：`uploads/`、`docs/uploads/`

### 相关代码

- `js/section-renderer.js` — 从 material 渲染 section
- `js/templates.js` — `cardGridTemplate()`、`getImageUrl()`
- `js/mode-manager.js` — 数据加载与 material 来源

### 适用场景小结

| 现象           | 建议恢复步骤 |
|----------------|--------------|
| 某 section 文案/配置不对 | 从 index.html 内嵌或 Git 历史取对应 section → 覆盖 material.json 与 docs/material.json |
| 图片 404       | 从 docs/uploads 或 Git 恢复文件到根目录 uploads/（或 docs/uploads/） |
| 整站 material 错乱 | 从 Git 恢复整份 material.json，再按需合并当前修改 |

本 Function Review 与 Bug Review v1.1 配合使用：遇到类似“内容或图片丢失”时，先按 Bug Review 定位原因，再按本文档执行可复现的恢复步骤。
