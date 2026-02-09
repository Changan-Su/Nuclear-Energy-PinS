# Apple Style Website Engine - CMS Edition | 苹果风格网站引擎 - CMS版

A template-driven, modular CMS with dual-axis mode management (offline/online + view/edit) for the **Physics in Society (PinS)** digital project.

**一个模板驱动、模块化的 CMS 系统，具有双轴模式管理（离线/在线 + 查看/编辑）的核能物理教育项目。**

**Latest Version**: v0.3 - CMS Online Editing System

---

## English

### Overview

The Apple Style Website Engine has evolved from a static educational website into a full-featured Content Management System. It combines an Apple-style frontend with a flexible editing system that works both offline and online.

### Key Features

#### Dual-Axis Mode System

**Data Source Mode**: 
- **Offline**: Edit locally using `material.json` file
- **Online**: Connect to MySQL database via REST API

**UI Mode**:
- **View**: Read-only, standard visitor experience
- **Edit**: Inline content editing with visual toolbars

**Four Mode Combinations**:
1. **Offline + View** - Default visitor experience
2. **Offline + Edit** - Prepare content offline, export to JSON
3. **Online + View** - Preview live database content
4. **Online + Edit** - Full CMS with real-time MySQL saves

#### Template System

Modular, reusable section templates:
- Hero, Tabbed Content, Card Grid
- Text + Image layouts (left/right variants)
- Accordion, AI Chat, Quiz
- Image Gallery, Footer

Add new sections visually, reorder with drag-and-drop UI, delete sections with one click.

#### Rich Quiz Support

Multiple question types:
- Multiple Choice
- True/False
- Fill in the Blank
- Short Answer (keyword-based)

Client-side validation with instant feedback.

#### Import/Export

- Export material as JSON file
- Import curated content
- Works in both offline and online modes
- Perfect for version control and collaboration

### Tech Stack

**Frontend**:
- Vanilla JavaScript (ES6)
- Tailwind CSS
- No build tools required
- Template-driven architecture

**Backend** (Optional - for online mode):
- Node.js + Express
- MySQL (with JSON column support)
- JWT authentication
- Multer for image uploads

### Project Structure

```
Apple Style Website Engine/
├── index.html              # Main page (dynamic container)
├── admin.html              # Admin dashboard (legacy)
├── material.json           # Content data + section config
│
├── css/
│   ├── input.css           # Tailwind entry
│   └── styles.css          # Compiled CSS
│
├── js/
│   ├── templates.js        # Template registry
│   ├── section-renderer.js # Dynamic rendering engine
│   ├── mode-manager.js     # Dual-axis mode system
│   ├── editor.js           # Inline editing + import/export
│   ├── quiz.js             # Quiz engine
│   ├── material.js         # Legacy loader (backward compat)
│   ├── main.js             # Main interactions
│   ├── scroll-animations.js # Scroll effects
│   └── ai-chat.js          # AI chat simulation
│
├── server/                 # Backend (optional)
│   ├── index.js            # Express server
│   ├── db.js               # MySQL connection
│   ├── routes/
│   │   ├── auth.js         # JWT authentication
│   │   ├── material.js     # Content CRUD
│   │   ├── sections.js     # Section management
│   │   └── upload.js       # Image uploads
│   ├── schema.sql          # Database setup
│   ├── .env.example        # Environment template
│   └── package.json        # Backend dependencies
│
├── Document/
│   ├── Log/                # Version history
│   ├── Bugs/               # Bug reports (auto-created)
│   └── Function/           # Feature documentation
│
├── tailwind.config.js
└── package.json
```

### Quick Start

#### Frontend Only (Offline Mode)

1. Open `index.html` in a browser
2. Click the pencil icon in the top-left to enter edit mode
3. Click on any text to edit inline
4. Click on images to upload new ones (converted to base64)
5. Use section toolbars to reorder/hide/delete sections
6. Export changes to JSON file

#### With Backend (Online Mode)

1. **Setup Database** (uses `server/.env`; no mysql CLI needed):
```bash
cd server
npm run init-db
```
This runs `node scripts/init-db.js`, which connects with your DB_* env vars and applies `schema.sql`. Works with MySQL in Docker.

2. **Configure Environment**:
```bash
cd server
cp .env.example .env
# Edit .env with your MySQL credentials and passwords
```

3. **Install & Start Backend**:
```bash
npm install
npm start
# Server runs on http://localhost:3001
```

4. **Open Frontend**:
- Open `index.html` in browser
- Click cloud icon in top-left
- Enter password (default: `2026PinS`)
- Click pencil icon to enable editing
- Changes auto-save to MySQL

### Mode Controls

Located in navbar top-left:

- **Cloud Icon** (🌩️/☁️): Toggle Offline/Online
  - Offline: Local `material.json`
  - Online: MySQL via API (requires login)
  
- **Pencil Icon** (✏️/👁️): Toggle Edit/View
  - View: Read-only
  - Edit: Inline editing enabled

- **Status Pill**: Shows current mode (e.g., "Online | Edit")

### Edit Mode Features

When edit mode is active:

**Top Toolbar**:
- Add Section - Insert new section from template
- Save All - Push changes to MySQL (online mode)
- Discard - Reload from source
- Export - Download material.json
- Import - Upload material.json

**Per-Section Toolbar**:
- ⬆️ Move Up
- ⬇️ Move Down
- 👁️ Toggle Visibility
- 🗑️ Delete Section

**Inline Editing**:
- Click any text to edit
- Click images to upload replacements
- Changes save on blur

### API Endpoints

(When using backend)

**Authentication**:
- `POST /api/auth/login` - Get JWT token
- `POST /api/auth/verify` - Verify token

**Material**:
- `GET /api/material` - Fetch all content
- `PUT /api/material` - Replace all content
- `PATCH /api/material` - Update specific path

**Sections**:
- `GET /api/sections` - Get section config
- `PUT /api/sections` - Update section order
- `POST /api/sections` - Add new section
- `DELETE /api/sections/:id` - Remove section

**Media**:
- `POST /api/upload` - Upload image
- `GET /api/upload/list` - List uploaded files
- `DELETE /api/upload/:filename` - Delete file

### Configuration

#### Environment Variables (Backend)

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=pins_cms
CMS_PASSWORD=2026PinS
JWT_SECRET=your_secret_key
PORT=3001
```

#### Material.json Structure

```json
{
  "config": {
    "sections": [
      { "id": "hero", "template": "hero", "enabled": true, "order": 0 },
      { "id": "highlights", "template": "tabbed-content", "enabled": true, "order": 1 }
    ]
  },
  "index": {
    "hero": {
      "title": "Your Title",
      "subtitle": "Your Subtitle",
      "images": { "videoCover": "" }
    },
    "highlights": { ... }
  },
  "imagesBasePath": "assets/images/"
}
```

### Documentation

- **Version Log**: `Document/Log/v0.3_cms_system.md` - Full implementation details
- **Function Docs**: `Document/Function/` - Feature guides
- **Bug Reports**: `Document/Bugs/` - Known issues and fixes

### Security

- JWT-based authentication for online mode
- Password protection (configurable in .env)
- Session tokens expire after 24 hours
- CORS configured for API access
- File upload size limits (10MB)

### Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### License

MIT License

---

## 中文版

### 项目简介

苹果风格网站引擎已从静态教育网站演变为全功能内容管理系统。它将 Apple 风格的前端与灵活的编辑系统相结合，支持离线和在线两种工作模式。

### 核心功能

#### 双轴模式系统

**数据源模式**：
- **离线模式**：使用本地 `material.json` 文件编辑
- **在线模式**：通过 REST API 连接 MySQL 数据库

**界面模式**：
- **查看模式**：只读，标准访客体验
- **编辑模式**：内联内容编辑，带可视化工具栏

**四种模式组合**：
1. **离线 + 查看** - 默认访客体验
2. **离线 + 编辑** - 离线准备内容，导出为 JSON
3. **在线 + 查看** - 预览数据库实时内容
4. **在线 + 编辑** - 完整 CMS，实时保存到 MySQL

#### 模板系统

模块化、可重用的区块模板：
- Hero、选项卡内容、卡片网格
- 文本 + 图片布局（左/右变体）
- 手风琴、AI 对话、测验
- 图片画廊、页脚

可视化添加新区块，拖拽式重新排序，一键删除区块。

#### 丰富的测验支持

多种题型：
- 多选题
- 判断题
- 填空题
- 简答题（基于关键词）

客户端验证，即时反馈。

#### 导入/导出

- 导出素材为 JSON 文件
- 导入精选内容
- 在离线和在线模式下均可使用
- 适合版本控制和协作

### 技术栈

**前端**：
- 原生 JavaScript (ES6)
- Tailwind CSS
- 无需构建工具
- 模板驱动架构

**后端**（可选 - 在线模式需要）：
- Node.js + Express
- MySQL（支持 JSON 列）
- JWT 认证
- Multer 图片上传

### 快速开始

#### 仅前端（离线模式）

1. 在浏览器中打开 `index.html`
2. 点击左上角铅笔图标进入编辑模式
3. 点击任何文字进行内联编辑
4. 点击图片上传新图片（转换为 base64）
5. 使用区块工具栏重新排序/隐藏/删除区块
6. 导出更改为 JSON 文件

#### 使用后端（在线模式）

1. **设置数据库**：
```bash
mysql -u root -p < server/schema.sql
```

2. **配置环境**：
```bash
cd server
cp .env.example .env
# 编辑 .env 填入你的 MySQL 凭据和密码
```

3. **安装并启动后端**：
```bash
npm install
npm start
# 服务器运行在 http://localhost:3001
```

4. **打开前端**：
- 在浏览器中打开 `index.html`
- 点击左上角云图标
- 输入密码（默认：`2026PinS`）
- 点击铅笔图标启用编辑
- 更改自动保存到 MySQL

### 模式控制

位于导航栏左上角：

- **云图标**（🌩️/☁️）：切换离线/在线
  - 离线：本地 `material.json`
  - 在线：通过 API 访问 MySQL（需要登录）
  
- **铅笔图标**（✏️/👁️）：切换编辑/查看
  - 查看：只读
  - 编辑：启用内联编辑

- **状态标签**：显示当前模式（如 "在线 | 编辑"）

### 许可证

MIT 许可证
