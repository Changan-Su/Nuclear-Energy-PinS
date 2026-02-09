# Function Index | 功能索引

Index of all implemented features and their documentation.

**所有已实现功能及其文档的索引。**

---

## Features by Version | 按版本分类的功能

### Version 0.5 - SVG Template Gallery

- [SVG Template Gallery](./FunctionReview_v0.5_SVG_Template_Gallery.md) - Visual template selection with SVG wireframe previews and interactive gallery

### Version 0.4 - Reference Citation System

- [Reference Citation System](./FunctionReview_v0.4_Reference_Citation.md) - Academic-style reference management with '@' mention citations and click-to-jump navigation

### Version 0.3 - CMS Online Editing System

- [CMS Dual-Axis Mode System](./FunctionReview_v0.3_CMS_Mode_System.md) - Offline/Online + View/Edit mode management
- [Template-Driven Rendering](./FunctionReview_v0.3_Template_System.md) - Dynamic section rendering from templates
- [Inline Content Editor](./FunctionReview_v0.3_Inline_Editor.md) - Text and image editing system
- [Quiz Engine](./FunctionReview_v0.3_Quiz_Engine.md) - Multiple question types with validation
- [Import/Export System](./FunctionReview_v0.3_Import_Export.md) - Material JSON file operations
- [Backend API](./FunctionReview_v0.3_Backend_API.md) - Node.js + Express + MySQL REST API

### Version 0.2 - Frontend Build

No function reviews documented for this version. See Log for details.

### Version 0.1 - Initial Setup

- [设计实现 v0.1](./Design_v0.1.md) - Initial design and architecture

---

## Function Review Guidelines | 功能评审指南

When documenting a new feature:

1. Create a new file: `FunctionReview_v[version]_[feature-name].md`
2. Include:
   - **Feature Name**: Clear, descriptive name
   - **Version**: When the feature was implemented
   - **Purpose**: What problem does this feature solve?
   - **Implementation**: How is it implemented? (Architecture, code structure)
   - **Usage**: How to use this feature? (User guide with examples)
   - **API/Interface**: If applicable, document public APIs or interfaces
   - **Configuration**: Any configuration options
   - **Integration**: How does this feature integrate with other systems?
   - **References**: Related documentation, external resources, dependencies
3. Update this index with a link to the new function review

**记录新功能时**：

1. 创建新文件：`FunctionReview_v[版本]_[功能名称].md`
2. 包含内容：
   - **功能名称**：清晰的描述性名称
   - **版本**：功能实现的版本
   - **目的**：此功能解决什么问题？
   - **实现方式**：如何实现的？（架构、代码结构）
   - **使用方法**：如何使用此功能？（带示例的用户指南）
   - **API/接口**：如适用，记录公开 API 或接口
   - **配置**：任何配置选项
   - **集成**：此功能如何与其他系统集成？
   - **参考资料**：相关文档、外部资源、依赖项
3. 在本索引中更新新功能评审的链接

---

## Quick Reference | 快速参考

### Core Systems | 核心系统

- **Mode Manager**: Handles offline/online and view/edit mode switching
- **Section Renderer**: Dynamic template-based rendering engine
- **Editor System**: Inline editing with toolbar and import/export
- **Template Registry**: Collection of reusable section templates
- **Quiz Engine**: Question rendering and validation system

### Key Files | 关键文件

- `js/mode-manager.js` - Mode switching and authentication
- `js/section-renderer.js` - Dynamic rendering
- `js/editor.js` - Content editing
- `js/templates.js` - Template definitions
- `js/quiz.js` - Quiz functionality
- `material.json` - Content and configuration
- `server/` - Backend API (optional)

### Documentation | 文档

- **Log**: Version history and development notes
- **Bugs**: Bug reports and resolutions
- **Function**: Feature implementation guides (this folder)
