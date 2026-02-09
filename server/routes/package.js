import express from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import AdmZip from 'adm-zip';
import { fileURLToPath } from 'url';
import db from '../db.js';
import { authenticateToken } from '../middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '..', '..');
const SERVER_ROOT = path.join(__dirname, '..');
const UPLOADS_DIR = path.join(SERVER_ROOT, 'uploads');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 300 * 1024 * 1024 } });

function walkStrings(node, onString) {
  if (typeof node === 'string') {
    return onString(node);
  }
  if (Array.isArray(node)) {
    return node.map((item) => walkStrings(item, onString));
  }
  if (node && typeof node === 'object') {
    const output = {};
    Object.keys(node).forEach((key) => {
      output[key] = walkStrings(node[key], onString);
    });
    return output;
  }
  return node;
}

function collectReferencedUploadFiles(material) {
  const files = new Set();
  walkStrings(material, (value) => {
    if (value.startsWith('/uploads/')) {
      files.add(value.replace('/uploads/', ''));
    } else if (value.startsWith('uploads/')) {
      files.add(value.replace('uploads/', ''));
    }
    return value;
  });
  return Array.from(files);
}

function toPackageMaterial(material) {
  return walkStrings(material, (value) => {
    if (typeof value !== 'string') return value;

    // Normalize absolute upload URLs from online mode to package-local relative paths.
    // e.g. http://localhost:3009/uploads/a.mp4 -> uploads/a.mp4
    const absoluteUploadMatch = value.match(/^https?:\/\/[^/]+\/uploads\/(.+)$/i);
    if (absoluteUploadMatch) {
      return `uploads/${absoluteUploadMatch[1]}`;
    }

    if (value.startsWith('/uploads/')) {
      return value.slice(1);
    }
    return value;
  });
}

function toServerMaterial(material, uploadPathMap) {
  return walkStrings(material, (value) => {
    if (uploadPathMap[value]) return uploadPathMap[value];
    if (value.startsWith('uploads/')) return `/${value}`;
    return value;
  });
}

function detectMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const byExt = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.mov': 'video/quicktime',
    '.m4v': 'video/x-m4v'
  };
  return byExt[ext] || 'application/octet-stream';
}

function uniqueServerFilename(originalName) {
  const ext = path.extname(originalName);
  const name = path.basename(originalName, ext).replace(/[^a-zA-Z0-9-_]/g, '_');
  return `${Date.now()}-${Math.round(Math.random() * 1e9)}-${name}${ext}`;
}

// GET /api/package/export - download runnable site package ZIP
router.get('/export', authenticateToken, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT material FROM site_data WHERE id = 1');
    if (!rows.length) {
      return res.status(404).json({ error: 'Material not found' });
    }

    const material = rows[0].material;
    const packageMaterial = toPackageMaterial(material);
    const zip = new AdmZip();

    // Generate static viewer index.html with inlined material
    const viewerHtml = generateStaticViewerHTML(packageMaterial);
    zip.addFile('index.html', Buffer.from(viewerHtml, 'utf8'));

    // Add CSS folder
    const cssDir = path.join(PROJECT_ROOT, 'css');
    if (fs.existsSync(cssDir) && fs.statSync(cssDir).isDirectory()) {
      zip.addLocalFolder(cssDir, 'css');
    }

    // Add only rendering JS files (not CMS editing scripts)
    const renderingScripts = [
      'templates.js',
      'section-renderer.js',
      'quiz.js',
      'main.js',
      'scroll-animations.js',
      'ai-chat.js'
    ];
    const jsDir = path.join(PROJECT_ROOT, 'js');
    renderingScripts.forEach((fileName) => {
      const absPath = path.join(jsDir, fileName);
      if (fs.existsSync(absPath) && fs.statSync(absPath).isFile()) {
        zip.addLocalFile(absPath, 'js');
      }
    });

    // Add assets folder if exists
    const assetsDir = path.join(PROJECT_ROOT, 'assets');
    if (fs.existsSync(assetsDir) && fs.statSync(assetsDir).isDirectory()) {
      zip.addLocalFolder(assetsDir, 'assets');
    }

    // Add all media files from uploads directory (fallback to ensure all uploads are included)
    if (fs.existsSync(UPLOADS_DIR) && fs.statSync(UPLOADS_DIR).isDirectory()) {
      const uploadedFiles = fs.readdirSync(UPLOADS_DIR);
      uploadedFiles.forEach((fileName) => {
        const absPath = path.join(UPLOADS_DIR, fileName);
        if (fs.statSync(absPath).isFile()) {
          zip.addLocalFile(absPath, 'uploads');
        }
      });
    }

    zip.addFile('README_PACKAGE.txt', Buffer.from(
      [
        'PinS Static Site Export Package',
        '',
        'How to run:',
        '1) Extract this ZIP to a folder.',
        '2) Open index.html in any modern browser.',
        '   - Works with file:// protocol (double-click to open)',
        '   - Or use a local static server: npx serve .',
        '3) All media files are included in ./uploads/',
        '',
        'Note:',
        '- This is a static snapshot for viewing only.',
        '- No CMS editing features or backend required.',
        '- All content and media are embedded in the package.'
      ].join('\n'),
      'utf8'
    ));

    const fileName = `site-package-${new Date().toISOString().slice(0, 10)}.zip`;
    const buffer = zip.toBuffer();

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(buffer);
  } catch (error) {
    console.error('Package export error:', error);
    res.status(500).json({ error: 'Failed to export package' });
  }
});

function generateStaticViewerHTML(material) {
  const materialJson = JSON.stringify(material, null, 2)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');

  const title = material?.index?.meta?.title || 'Nuclear Energy of Durham PinS';
  const navLogo = material?.index?.nav?.logo || 'Nuclear Energy of Durham PinS';
  const navLinks = material?.index?.nav?.links || ['Overview', 'Science', 'Benefits', 'Future'];
  const navCta = material?.index?.nav?.cta || 'Ask AI';

  return `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(title)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="./css/styles.css" rel="stylesheet">
    <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body class="font-sans antialiased bg-primary-dark text-text-primaryDark overflow-x-hidden">

    <!-- Navigation -->
    <nav class="fixed top-0 w-full z-50 transition-all duration-300 bg-black/80 backdrop-blur-md border-b border-white/10" id="navbar">
        <div class="max-w-[1440px] mx-auto px-6 h-[52px] flex items-center justify-between">
            <a href="#" class="text-xl font-semibold tracking-tight text-white hover:opacity-80 transition-opacity">${escapeHtml(navLogo)}</a>
            
            <div class="hidden md:flex items-center gap-8">
                ${navLinks.map((link, i) => `<a href="#${link.toLowerCase()}" class="text-xs text-[#E5E5E5] hover:text-white transition-colors">${escapeHtml(link)}</a>`).join('\n                ')}
                <button id="nav-chat-btn" class="bg-accent-blue text-white text-xs font-medium px-4 py-1.5 rounded-full hover:bg-blue-600 transition-colors">
                    ${escapeHtml(navCta)}
                </button>
            </div>
        </div>
    </nav>

    <!-- Dynamic Content Container -->
    <main id="app"></main>

    <!-- Inlined Material Data -->
    <script>
      window.__PRELOADED_MATERIAL__ = ${materialJson};
    </script>

    <!-- Rendering Scripts -->
    <script src="./js/templates.js"></script>
    <script src="./js/section-renderer.js"></script>
    <script src="./js/quiz.js"></script>
    <script src="./js/main.js"></script>
    <script src="./js/scroll-animations.js"></script>
    <script src="./js/ai-chat.js"></script>
    <script>
        // Initialize static viewer
        document.addEventListener('DOMContentLoaded', function() {
            var material = window.__PRELOADED_MATERIAL__;
            if (material && window.SectionRenderer) {
                window.SectionRenderer.init(material, 'index');
            }
            if (window.lucide) {
                window.lucide.createIcons();
            }
        });
    </script>
</body>
</html>`;
}

function escapeHtml(text) {
  if (typeof text !== 'string') return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// POST /api/package/import - import site package ZIP and replace material/media
router.post('/import', authenticateToken, upload.single('package'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No package uploaded' });
    }

    const zip = new AdmZip(req.file.buffer);
    const entries = zip.getEntries();
    const materialEntry = entries.find((entry) => entry.entryName === 'material.json');
    if (!materialEntry) {
      return res.status(400).json({ error: 'Invalid package: material.json missing' });
    }

    const materialRaw = materialEntry.getData().toString('utf8');
    const parsedMaterial = JSON.parse(materialRaw);
    if (!parsedMaterial || !parsedMaterial.config || !parsedMaterial.index) {
      return res.status(400).json({ error: 'Invalid material schema in package' });
    }

    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }

    const uploadPathMap = {};
    let importedMediaCount = 0;

    const mediaEntries = entries.filter((entry) => {
      if (entry.isDirectory) return false;
      return entry.entryName.startsWith('uploads/');
    });

    for (const entry of mediaEntries) {
      const sourceRelPath = entry.entryName.replace(/\\/g, '/');
      const originalName = path.basename(sourceRelPath);
      const serverFileName = uniqueServerFilename(originalName);
      const targetPath = path.join(UPLOADS_DIR, serverFileName);
      const content = entry.getData();

      fs.writeFileSync(targetPath, content);

      const publicPath = `/uploads/${serverFileName}`;
      uploadPathMap[sourceRelPath] = publicPath;
      uploadPathMap[sourceRelPath.replace(/^\/+/, '')] = publicPath;
      uploadPathMap[sourceRelPath.startsWith('/') ? sourceRelPath.slice(1) : `/${sourceRelPath}`] = publicPath;

      const mimeType = detectMimeType(originalName);
      await db.query(
        'INSERT INTO media (filename, original_name, mime_type, size) VALUES (?, ?, ?, ?)',
        [serverFileName, originalName, mimeType, content.length]
      );
      importedMediaCount += 1;
    }

    const serverMaterial = toServerMaterial(parsedMaterial, uploadPathMap);
    await db.query(
      'INSERT INTO site_data (id, material) VALUES (1, ?) ON DUPLICATE KEY UPDATE material = ?',
      [JSON.stringify(serverMaterial), JSON.stringify(serverMaterial)]
    );

    res.json({
      success: true,
      importedMediaCount,
      message: 'Package imported and material replaced successfully'
    });
  } catch (error) {
    console.error('Package import error:', error);
    res.status(500).json({ error: 'Failed to import package' });
  }
});

export default router;
