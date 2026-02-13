# Bug Index | Bug 索引

This file tracks all bugs encountered during development and their resolutions.

**本文件记录开发过程中遇到的所有 Bug 及其解决方案。**

---

## Active Bugs | 活跃 Bug

Currently no active bugs.

**当前无活跃 Bug。**

---

## Resolved Bugs | 已解决 Bug

### Version 0.6 - Interactive Enhancements

#### [Grid Card Display Issue](./BugReview_v0.6_Grid_Card_Display_Issue.md)
- **Severity**: High | 高
- **Description**: Features/Benefits section cards not visible on page
- **描述**：Features/Benefits 区域的卡片在页面上不可见
- **Solution**: Fixed fade-in-up container height allocation, moved h-[560px] from inner to outer wrapper
- **解决方案**：修复 fade-in-up 容器高度分配，将 h-[560px] 从内层移到外层包装器
- **Date**: 2026-02-13

### Version 0.5 - SVG Template Gallery

#### [Backend MySQL Startup Failure](./BugReview_v0.5_Backend_MySQL_Startup_Failure.md)
- **Severity**: High | 高
- **Description**: Server exits immediately on MySQL connection failure, preventing local development without database
- **描述**：服务器在 MySQL 连接失败时立即退出，阻止无数据库的本地开发
- **Solution**: Modified error handling to allow server to start with warnings instead of exiting
- **解决方案**：修改错误处理，允许服务器启动并显示警告而不是退出
- **Date**: 2026-02-10

### Version 0.3 - CMS System

No bugs filed during implementation. Development proceeded smoothly with architecture-first approach.

**v0.3 版本实现期间未记录 Bug。采用架构优先方法，开发进展顺利。**

---

## Historical Bugs | 历史 Bug

### Version 0.2 - Frontend Build

No documented bugs. See `v0.2_frontend_build.md` in Log folder.

### Version 0.1 - Initial Setup

No documented bugs. See `v0.1_init.md` in Log folder.

---

## Bug Reporting Guidelines | Bug 报告指南

When filing a new bug report:

1. Create a new file: `BugReview_v[version]_[short-description].md`
2. Include:
   - **Title**: Clear, concise bug description
   - **Version**: Which version the bug appears in
   - **Severity**: Critical / High / Medium / Low
   - **Description**: Detailed explanation of the bug
   - **Steps to Reproduce**: Exact steps to trigger the bug
   - **Expected Behavior**: What should happen
   - **Actual Behavior**: What actually happens
   - **Environment**: Browser, OS, backend version (if applicable)
   - **Root Cause**: Analysis of why the bug occurs
   - **Solution**: How the bug was fixed
   - **References**: Links to relevant code, documentation, or external resources
3. Update this index with a link to the new bug report

**提交新 Bug 报告时**：

1. 创建新文件：`BugReview_v[版本]_[简短描述].md`
2. 包含内容：
   - **标题**：清晰简洁的 Bug 描述
   - **版本**：Bug 出现的版本
   - **严重性**：严重/高/中/低
   - **描述**：详细的 Bug 说明
   - **重现步骤**：触发 Bug 的确切步骤
   - **预期行为**：应该发生什么
   - **实际行为**：实际发生了什么
   - **环境**：浏览器、操作系统、后端版本（如适用）
   - **根本原因**：Bug 发生原因分析
   - **解决方案**：Bug 如何修复
   - **参考资料**：相关代码、文档或外部资源链接
3. 在本索引中更新新 Bug 报告的链接
