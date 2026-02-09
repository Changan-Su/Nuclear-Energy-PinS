# Apple Style Website Engine - Backend Server

Node.js + Express backend API server for the CMS functionality.

## Setup

1. Install dependencies:
```bash
cd server
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with your MySQL credentials
```

3. Initialize database (uses .env; no mysql CLI needed):
```bash
npm run init-db
```
Or: `node scripts/init-db.js`

(Alternatively, if you have the mysql CLI: `mysql -u root -p < schema.sql` or on Windows PowerShell: `Get-Content schema.sql | mysql -u root -p`)

4. Start server:
```bash
npm start
# or for development with auto-reload:
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login with password, returns JWT token
- `POST /api/auth/verify` - Verify JWT token validity

### Material Management
- `GET /api/material` - Retrieve entire material JSON (auth required)
- `PUT /api/material` - Replace entire material JSON (auth required)
- `PATCH /api/material` - Partial update by JSON path (auth required)

### Sections Management
- `GET /api/sections` - Get section configuration array (auth required)
- `PUT /api/sections` - Update sections array (reorder/toggle) (auth required)
- `POST /api/sections` - Add new section from template (auth required)
- `DELETE /api/sections/:id` - Remove section (auth required)

### File Upload
- `POST /api/upload` - Upload image file (auth required)
- `GET /api/upload/list` - List uploaded media (auth required)
- `DELETE /api/upload/:filename` - Delete uploaded file (auth required)

### Health Check
- `GET /api/health` - Server health status

## Environment Variables

See `.env.example` for required configuration:
- MySQL connection details
- CMS admin password (default: `2026PinS`)
- JWT secret key
- Server port (default: 3001)
