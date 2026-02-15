# 上传显示问题修复

## 问题描述

上传成功后，图片/视频没有在页面上显示，控制台报错 "Path not found: MSR"。

## 根本原因

1. **路径解析错误**: `insertMediaBlock` 函数在解析 material 路径时，没有正确处理数组索引
2. **interactive-details 模板未更新**: interactive-details 模板没有支持 detailBlocks 渲染

## 修复内容

### 1. 重写 `insertMediaBlock` 函数 (`js/editor.js`)

**改进点**:
- 正确处理数组索引（如 "items.0.detail" 中的 "0"）
- 添加详细的调试日志
- 更健壮的路径导航
- 正确区分字符串键和数组索引

**核心逻辑**:
```javascript
for (let i = 0; i < pathParts.length - 1; i++) {
  const key = pathParts[i];
  
  // Handle array indices
  if (!isNaN(key)) {
    const index = parseInt(key);
    parent = parent[index];
  } else {
    parent = parent[key];
  }
}
```

### 2. 更新 `refreshDetailDisplay` 函数

- 接受可选的 `parentData` 参数，避免重复查找
- 正确处理数组索引

### 3. 更新 interactive-details 模板 (`js/templates.js`)

添加了对 detailBlocks 的支持:

```javascript
// Render detail content - support both detailBlocks and plain detail
let detailContent;
if (Array.isArray(item.detailBlocks) && item.detailBlocks.length > 0) {
  detailContent = renderDetailBlocks(item.detailBlocks, ...);
} else {
  detailContent = item.detail || 'Detail content goes here.';
}
```

## 测试步骤

1. **刷新浏览器页面** (Cmd+R 或 Ctrl+R)
2. 进入编辑模式
3. 滚动到 "Explore The Details" 区域（深色背景）
4. 在右侧 detail 面板中输入 `/`
5. 选择 "Insert Image" 或 "Insert Video"
6. 选择文件上传

**预期结果**:
- 文件上传成功
- 图片/视频立即显示在 detail 内容底部
- 可以拖拽调整大小
- 可以删除

## 调试信息

修复后，控制台会输出详细的调试信息：
```
Material path: MSR.items.0.detail
Parent object found: { title: "...", description: "...", detail: "..." }
Updated detailBlocks: [...]
```

如果仍有问题，检查这些日志，看看路径解析是否正确。

## 支持的路径格式

现在支持以下所有路径格式：
- `MSR.items.0.detail` (interactive-details)
- `highlights.items.0.detail` (tabbed-content)
- `features.cards.0.detail` (card-grid)
- `safety.detail` (text-image-left)
- `economy.detail` (text-image-right)
- `closerLook.features.0.detail` (accordion)

## 后续改进

如果仍然有问题，可能需要：
1. 检查 material.json 的实际结构
2. 确认 sectionId 和实际的数据键是否匹配
3. 添加更多错误处理和用户友好的提示
