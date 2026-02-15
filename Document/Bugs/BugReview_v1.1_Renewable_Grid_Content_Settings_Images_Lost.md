# Bug Review: Renewable Grid 内容 / 设置 / 图片丢失

## Bug Information

- **Version**: v1.1（记录于 v0.8 Log）
- **Severity**: High（核心内容与媒体资源不可见）
- **Date Reported**: 2026-02-15
- **Date Resolved**: 2026-02-15
- **Reporter**: User
- **Resolver**: AI Assistant

---

## Description

Grid Card 区域原有的 Renewable 相关内容、配置与图片全部“丢失”：页面上该区块显示为核能三卡片（High Energy Density / Zero Emissions / 24/7 Reliability），且卡片封面图片无法加载。

**English**: The Renewable section (headline "Renewables – Lucy", 5 cards: Solar, Wind, Hydro, Geothermal, Comparison) that previously existed in the card-grid was replaced by the nuclear three-card content, and card cover images returned 404.

---

## Steps to Reproduce

1. 打开站点（根目录 `index.html` 或通过服务器加载 `material.json`）
2. 滚动至 Benefits / Features（card-grid）区块
3. 观察：标题为 “Better by every measure.”，仅三张核能卡片，无 Renewable 五张卡片
4. 若曾恢复过图片路径：卡片封面请求 `uploads/media-k8uxap-7.png` 等，根目录无 `uploads/` 时返回 404

---

## Expected Behavior

- 该区块显示 “Renewables – Lucy” 标题与对应副标题
- 五张卡片：1. Solar power；2. Wind power；3. Hydroelectric power；4. Geothermal Energy；5. Comparison of Energy Sources
- 每张卡片具备完整 detail、references、flip 设置及封面图（如 `uploads/media-k8uxap-7.png` 等）
- 图片可正常加载

---

## Actual Behavior

- 区块显示核能三卡片文案与标题
- 五张 Renewable 卡片及对应设置（flipEnabled、references、detail）不可见
- 图片路径指向 `uploads/*.png`，但项目根目录无 `uploads/` 目录，图片 404

---

## Environment

- **数据源**: `material.json` 或 `docs/material.json`（由 ModeManager / 页面加载逻辑决定）
- **备用数据**: `index.html` 内嵌 `window.__PRELOADED_MATERIAL__`（或等效内嵌 JSON）
- **媒体路径**: 根目录 `uploads/`、`docs/uploads/`
- **OS**: macOS

---

## Root Cause Analysis

### 1. 内容与设置“丢失”的原因

- **实际未从项目内删除**：完整 Renewable 配置仍保存在 `index.html` 的内嵌 material 数据中。
- **渲染数据源被覆盖**：站点运行时使用的 `material.json` 与 `docs/material.json` 中的 `index.features` 在后续开发中被替换为核能三卡片版本，因此 SectionRenderer 渲染的是核能内容而非 Renewable。
- **数据流**：  
  `material.json`（或在线 API）→ SectionRenderer → `card-grid` 模板 → 页面显示。  
  内嵌的 `index.html` 数据仅在离线回退或预加载时使用，若主数据源已改，则页面上看到的是“新”内容。

### 2. 图片“丢失”的原因

- **路径未改**：卡片内仍为 `image: "uploads/media-xxx.png"`。
- **目录缺失**：项目根目录下没有 `uploads/` 目录（可能从未创建，或曾被删除）；`docs/uploads/` 中仍保留部分媒体文件（含 Renewable 五张图）。
- **结果**：根目录站点请求 `uploads/xxx.png` 时服务器/文件系统找不到文件，返回 404。

### 3. 小结

| 现象     | 原因 |
|----------|------|
| 文案/配置“丢失” | `material.json` / `docs/material.json` 的 `features` 被覆盖，内嵌数据未同步回写 |
| 图片 404 | 根目录缺少 `uploads/`，图片仅存在于 `docs/uploads/` 或历史提交中 |

---

## Solution

### 1. 恢复内容与设置

- **来源**：从 `index.html` 内嵌的 material 中提取完整 `index.features` 对象（headline、subheadline、cards 数组）。
- **目标**：覆盖回 `material.json` 与 `docs/material.json` 的 `index.features`。
- **卡片字段**：每张卡包含 `title`、`description`、`detail`、`references`、`cta`、`flipEnabled`、`flipDirection`、`detailEndImage`、`image`、`position`（如有）。
- **注意**：JSON 内字符串中的换行需用 `\n` 转义；双引号需转义。

### 2. 恢复图片

- **确认**：在 `docs/uploads/` 下找到五张 Renewable 封面图：
  - `media-k8uxap-7.png`
  - `media-ftntjq-8.png`
  - `media-ni5a27-9.png`
  - `media-9fpp0x-10.png`
  - `media-f4odw4-11.png`
- **操作**：
  1. 在项目根目录创建 `uploads/`。
  2. 将上述五张图片从 `docs/uploads/` 复制到根目录 `uploads/`。
- **结果**：根目录站点请求 `uploads/media-xxx.png` 时可正确返回图片；`docs` 站点本身已具备 `docs/uploads/`，无需改动路径。

### 3. 验证

1. 刷新页面，确认 Benefits 区块标题为 “Renewables – Lucy”，且为五张卡片。
2. 点击每张卡片 “Learn more”，确认 detail、references、翻转行为正常。
3. 检查每张卡片封面图是否加载（Network 中 `uploads/*.png` 为 200）。
4. 确认 `docs/material.json` 与根目录 `material.json` 的 `features` 一致（若两者都作为数据源使用）。

---

## Verification Steps

1. 硬刷新页面（Cmd+Shift+R 或 Ctrl+Shift+R）
2. 滚动到 Benefits / Features 区块，确认标题与五张卡片可见
3. 点击 “Learn more” 检查 detail 与 references 渲染
4. 打开 DevTools → Network，确认 `uploads/media-k8uxap-7.png` 等为 200
5. 在编辑模式下确认卡片可编辑、flip 等配置正确

---

## Impact Assessment

### Before Fix

- **用户**：无法看到 Renewable 章节，且若之前依赖该内容会认为数据丢失
- **一致性**：内嵌数据与 material.json 不一致，易造成“改了一处、另一处没改”的混淆
- **媒体**：根目录无 `uploads/` 导致所有依赖该路径的图片 404

### After Fix

- Renewable 五张卡片及标题、副标题、detail、references、flip 设置全部恢复
- 根目录 `uploads/` 存在且包含五张图，封面图正常显示
- `material.json` 与 `docs/material.json` 的 `features` 与内嵌数据对齐

---

## Lessons Learned

1. **多数据源一致性**：当存在 `material.json`、`docs/material.json` 和 `index.html` 内嵌数据时，任何“替换整块 section”的操作都应同步三处，或明确以单一数据源为真相来源。
2. **媒体路径与目录**：卡片/模板中使用的 `uploads/` 路径依赖项目根目录下存在 `uploads/`；若仅 `docs/uploads/` 存在，根目录站点会 404，需在根目录建立 `uploads/` 或统一改为相对路径（如 `docs/uploads/`）。
3. **备份价值**：内嵌在 `index.html` 的 material 在此次问题中起到了“备份”作用；后续若再次替换大块内容，可先比对内嵌数据再覆盖。

---

## Related Issues

- 无其他关联 Bug。与 [Grid Card Display Issue](./BugReview_v0.6_Grid_Card_Display_Issue.md) 不同，彼时为 DOM/样式导致不可见，此次为数据与资源被覆盖/缺失。

---

## References

### 项目内

- `Document/Log/v0.8_slash_command_media_insert.md` — 章节「v1.1 Renewable Grid 紧急恢复（卡片内容/设置/图片）」
- `index.html` — 内嵌 material 中的 `index.features`
- `material.json`、`docs/material.json` — 恢复目标
- `docs/uploads/` — 图片恢复来源

### 代码与数据流

- `js/section-renderer.js` — SectionRenderer 从 material 读取并渲染
- `js/templates.js` — `cardGridTemplate()` 使用 `data.cards`、`card.image`、`card.references` 等
- `js/mode-manager.js` — 决定加载 `material.json` 或在线 API，影响实际使用的数据源

---

## Additional Notes

恢复后建议将 `index.html` 内嵌的 material 与当前 `material.json` 再同步一次，避免下次用内嵌数据回退时覆盖掉后续合法修改。若项目约定“以 material.json 为唯一真相源”，则内嵌数据仅作离线回退或预加载用，替换 section 时以 material.json 为准并主动同步到内嵌与 docs。

**English summary**: The Renewable grid content and settings were restored from the embedded material in `index.html` into `material.json` and `docs/material.json`. The five card cover images were restored by creating root `uploads/` and copying files from `docs/uploads/`. Root cause was overwritten section data and missing root uploads directory; the embedded data served as the backup source for this recovery.
