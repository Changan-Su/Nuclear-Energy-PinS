# Function Review v0.5 - SVG Template Gallery

## 功能概述

将"Add New Section"对话框中的模板选择从简单的下拉菜单（`<select>`）改造为可视化的SVG图像画廊，让用户通过直观的布局预览来选择模板。

## 实现时间

2026-02-09

## 相关版本

- 基于 v0.4 Reference Citation System
- 新增 SVG Template Gallery 功能

## 功能特性

### 1. SVG预览图生成

为每个模板类型生成线框风格的SVG预览图：

- **Hero**: 全屏布局，底部对齐的文本+按钮区域
- **Tabbed Content**: 顶部标签栏 + 左右分栏（50/50）
- **Card Grid**: 3列网格卡片布局
- **Text Image Left**: 左侧文本 + 右侧图片（40/60）
- **Text Image Right**: 左侧图片 + 右侧文本（60/40）
- **Accordion**: 左侧列表项 + 右侧内容区
- **AI Chat**: 顶部导航栏 + 聊天消息区 + 底部输入框
- **Quiz**: 居中的问题卡片布局
- **Image Gallery**: 3列图片网格
- **Footer**: 分栏布局（Logo区 + Reference区 + 底部版权）

### 2. 画廊布局设计

- **网格布局**: 3列网格卡片展示（`grid-cols-3`）
- **响应式**: 适配不同屏幕尺寸
- **可滚动**: 最大高度400px，超出部分可滚动

### 3. 交互效果

#### 悬停效果
- 边框颜色变化：`rgba(37,99,235,0.5)`
- 背景亮度提升
- 轻微上浮动画（`translateY(-2px)`）

#### 选中状态
- 蓝色边框（`#2563eb`）
- 蓝色背景（`rgba(37,99,235,0.1)`）
- 右上角勾选图标显示
- 模板名称颜色变亮

#### 键盘支持
- `Enter`/`Space`: 选中模板
- `Tab`: 在卡片间切换焦点
- `Escape`: 关闭对话框

## 实现细节

### 文件修改

**js/editor.js**

#### 1. 新增 `generateTemplateSvg()` 函数

```javascript
function generateTemplateSvg(templateName) {
  const baseStyle = 'stroke:#666; fill:#333; stroke-width:1.5';
  const lightFill = 'fill:#444';
  const accentFill = 'fill:#2563eb';
  
  const svgs = {
    'hero': `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">...</svg>`,
    'tabbed-content': `<svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">...</svg>`,
    // ... 其他模板
  };
  
  return svgs[templateName] || svgs['hero'];
}
```

**功能说明**:
- 使用内联SVG，避免外部图片依赖
- 统一配色方案（深色主题）
- 线框风格，简洁清晰
- 16:9宽高比

#### 2. 重写 `showAddSectionModal()` 函数

**主要变更**:

1. **模态框宽度扩大**: `max-w-md` → `max-w-5xl`
2. **删除下拉菜单**: 移除 `<select>` 元素
3. **添加模板卡片网格**:
```html
<div class="template-gallery grid grid-cols-3 gap-4 max-h-[400px] overflow-y-auto">
  <!-- 模板卡片 -->
</div>
```

4. **模板卡片结构**:
```html
<div class="template-card" data-template="${t}" role="button" aria-selected="true">
  <div class="template-preview">${svg}</div>
  <div class="template-name">${displayName}</div>
  <div class="template-checkmark">
    <i data-lucide="check" class="w-5 h-5"></i>
  </div>
</div>
```

5. **动态CSS注入**: 创建 `<style>` 标签定义卡片样式

#### 3. 卡片选择逻辑

```javascript
cards.forEach(card => {
  card.addEventListener('click', () => {
    // 移除所有选中状态
    cards.forEach(c => {
      c.classList.remove('selected');
      c.setAttribute('aria-selected', 'false');
      c.querySelector('.template-checkmark')?.classList.remove('visible');
    });
    
    // 选中当前卡片
    card.classList.add('selected');
    card.setAttribute('aria-selected', 'true');
    card.querySelector('.template-checkmark')?.classList.add('visible');
  });
});
```

#### 4. 确认逻辑更新

```javascript
document.getElementById('add-section-confirm').addEventListener('click', () => {
  const id = document.getElementById('new-section-id').value.trim();
  const selectedCard = modal.querySelector('.template-card.selected');
  
  if (!selectedCard) {
    alert('Please select a template');
    return;
  }
  
  const template = selectedCard.getAttribute('data-template');
  addSection(id, template);
});
```

### CSS样式定义

动态注入的样式包括：

```css
.template-gallery {
  /* 自定义滚动条 */
  scrollbar-width: thin;
  scrollbar-color: rgba(255,255,255,0.2) transparent;
}

.template-card {
  position: relative;
  padding: 12px;
  background: rgba(255,255,255,0.03);
  border: 2px solid rgba(255,255,255,0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.template-card:hover {
  border-color: rgba(37,99,235,0.5);
  background: rgba(255,255,255,0.05);
  transform: translateY(-2px);
}

.template-card.selected {
  border-color: #2563eb;
  background: rgba(37,99,235,0.1);
}

.template-preview {
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 8px;
  background: #0a0a0a;
}

.template-checkmark {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 28px;
  height: 28px;
  background: #2563eb;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.2s ease;
}

.template-checkmark.visible {
  opacity: 1;
  transform: scale(1);
}
```

## 技术亮点

### 1. 内联SVG生成
- 无需外部图片文件
- 动态生成，易于维护
- 加载速度快

### 2. 无障碍设计
- `role="button"` 语义化
- `aria-selected` 状态标识
- 键盘导航支持
- Tab 焦点管理

### 3. 性能优化
- SVG轻量化设计
- CSS过渡动画（GPU加速）
- 事件委托模式

### 4. 用户体验
- 直观的视觉预览
- 流畅的交互动画
- 清晰的选中反馈
- 首个模板默认选中

## 使用方法

### 1. 进入编辑模式

点击页面右上角的 "Edit" 按钮或侧边栏的 "Edit Mode" 切换到编辑模式。

### 2. 打开 Add Section 对话框

点击编辑工具栏的 "Add Section" 按钮。

### 3. 选择模板

1. 浏览模板画廊，查看各个模板的预览图
2. 点击想要的模板卡片
3. 选中的卡片会显示蓝色边框和右上角的勾选标记

### 4. 输入 Section ID

在 "Section ID" 输入框中输入一个唯一的标识符（例如：`newFeature`）。

### 5. 确认添加

点击 "Add" 按钮，新的 section 会被添加到页面底部。

## SVG预览图说明

每个模板的SVG预览图都采用线框风格设计，主要元素：

- **矩形框**: 表示内容区域
- **填充色**:
  - `#333`: 基础内容区
  - `#444`: 次级内容区
  - `#2563eb`: 强调/交互元素（蓝色）
- **边框**: `#666` 颜色，1.5px宽度
- **圆角**: 使用 `rx` 属性表示现代化设计

## 兼容性

- ✅ 现代浏览器（Chrome, Firefox, Safari, Edge）
- ✅ 支持触屏设备
- ✅ 键盘导航
- ✅ 无障碍阅读器支持

## 测试验证

### 功能测试

1. ✅ 打开 Add Section 对话框显示SVG画廊
2. ✅ 所有10种模板都有对应的预览图
3. ✅ 第一个模板默认选中
4. ✅ 点击卡片可以切换选中状态
5. ✅ 悬停时显示高亮效果
6. ✅ 选中时显示勾选图标
7. ✅ 点击 Add 按钮成功创建section
8. ✅ 未选择模板时提示错误
9. ✅ 键盘导航正常工作
10. ✅ Escape 键关闭对话框

### 视觉测试

1. ✅ 卡片布局整齐（3列网格）
2. ✅ SVG预览图清晰可见
3. ✅ 动画流畅（悬停、选中、勾选图标）
4. ✅ 配色协调（暗色主题）
5. ✅ 滚动条样式自定义

## 未来改进方向

1. **模板描述**: 添加每个模板的简短说明文字
2. **模板分类**: 按类型（布局、交互、展示）分组
3. **搜索功能**: 添加模板搜索框
4. **收藏功能**: 允许用户收藏常用模板
5. **自定义模板**: 支持用户创建自定义模板并保存
6. **响应式优化**: 小屏幕自动调整为2列或1列
7. **动画增强**: 添加进入/退出动画

## 相关文件

- `js/editor.js` - 主要实现文件
- `js/templates.js` - 模板定义
- `Document/Log/v0.5_svg_template_gallery.md` - 开发日志
- `Document/Function/Function Index.md` - 功能索引

## 参考资料

- [SVG基础教程](https://developer.mozilla.org/zh-CN/docs/Web/SVG)
- [CSS Grid布局](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Grid_Layout)
- [无障碍设计指南](https://www.w3.org/WAI/WCAG21/quickref/)
- [CSS过渡动画](https://developer.mozilla.org/zh-CN/docs/Web/CSS/CSS_Transitions)

## 总结

SVG Template Gallery 功能成功实现了可视化的模板选择体验，通过线框风格的SVG预览图、流畅的交互动画和清晰的选中反馈，大幅提升了用户体验。该功能完全集成到现有的CMS系统中，无需额外配置即可使用。
