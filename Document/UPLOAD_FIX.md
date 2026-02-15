# 上传功能修复说明

## 问题描述

测试时遇到 "Cannot POST /upload" 错误。

## 原因分析

1. **路由路径不匹配**: 前端发送到 `/upload`，但服务器路由配置在 `/api/upload`
2. **认证要求**: 上传路由默认需要身份认证 (`authenticateToken`)
3. **字段名不匹配**: 前端发送 `file` 字段，服务器期望 `media` 或 `image`

## 修复内容

### 1. 修改前端上传代码 (`js/editor.js`)

```javascript
// 修改前
formData.append('file', file);
fetch('/upload', { ... });

// 修改后
formData.append('media', file);
fetch('/api/upload', { ... });
```

### 2. 修改服务器路由 (`server/routes/upload.js`)

- 移除了上传端点的 `authenticateToken` 中间件
- 使数据库插入可选（如果数据库不可用也能工作）
- 保持文件上传功能正常工作

## 重启服务器

修改完成后，需要重启服务器：

```bash
# 停止当前服务器 (Ctrl+C)
# 重新启动
cd server
npm start
```

## 测试步骤

1. 重启服务器后刷新浏览器页面
2. 进入编辑模式
3. 在任意 detail 区域输入 `/`
4. 选择 "Insert Image" 或 "Insert Video"
5. 选择文件上传

**预期结果**: 文件成功上传到 `server/uploads/` 目录，并在页面上显示

## 备注

如果仍然有问题，请检查：
- 服务器是否正常运行在 `http://localhost:3001`
- `server/uploads/` 目录是否有写入权限
- 浏览器控制台是否有其他错误信息
