/**
 * Offline Site Saver
 * Saves complete viewer-only site to local folder using File System Access API
 */

window.OfflineSiteSaver = (function() {
  'use strict';

  /**
   * Get list of core JS files for viewer (excludes editor and mode-manager)
   */
  function getViewerScripts() {
    return [
      'js/templates.js',
      'js/section-renderer.js',
      'js/quiz.js',
      'js/latex-renderer.js',
      'js/material.js',
      'js/main.js',
      'js/scroll-animations.js',
      'js/ai-chat.js'
    ];
  }

  /**
   * Get list of CSS files
   */
  function getStyleFiles() {
    return ['css/styles.css'];
  }

  /**
   * Extract data URLs from material and convert to files
   * Returns { updatedMaterial, mediaFiles }
   * mediaFiles: { 'uploads/filename.ext': Blob }
   */
  function extractDataUrls(material) {
    const mediaFiles = {};
    let counter = 0;

    function processValue(value) {
      if (typeof value !== 'string') return value;
      if (!value.startsWith('data:')) return value;

      // Parse data URL
      const match = value.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) return value;

      const mimeType = match[1];
      const base64Data = match[2];

      // Generate filename
      const ext = getExtensionFromMime(mimeType);
      const hash = simpleHash(base64Data.substring(0, 100));
      const filename = `media-${hash}-${counter++}.${ext}`;
      const relativePath = `uploads/${filename}`;

      // Convert base64 to Blob
      try {
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });

        mediaFiles[relativePath] = blob;
        return relativePath;
      } catch (error) {
        console.warn('Failed to convert data URL to blob:', error);
        return value;
      }
    }

    function walkObject(obj) {
      if (typeof obj === 'string') {
        return processValue(obj);
      }
      if (Array.isArray(obj)) {
        return obj.map(item => walkObject(item));
      }
      if (obj && typeof obj === 'object') {
        const result = {};
        for (const key in obj) {
          result[key] = walkObject(obj[key]);
        }
        return result;
      }
      return obj;
    }

    const updatedMaterial = walkObject(material);
    return { updatedMaterial, mediaFiles };
  }

  /**
   * Get file extension from MIME type
   */
  function getExtensionFromMime(mimeType) {
    const map = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/gif': 'gif',
      'image/webp': 'webp',
      'image/svg+xml': 'svg',
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/ogg': 'ogg',
      'video/quicktime': 'mov'
    };
    return map[mimeType] || 'bin';
  }

  /**
   * Simple hash function for generating unique filenames
   */
  function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 8);
  }

  /**
   * Normalize material paths for package
   * Converts absolute URLs to relative paths
   */
  function normalizeMaterialPaths(material) {
    function processValue(value) {
      if (typeof value !== 'string') return value;

      // Convert absolute upload URLs to relative
      const absoluteMatch = value.match(/^https?:\/\/[^/]+\/uploads\/(.+)$/i);
      if (absoluteMatch) {
        return `uploads/${absoluteMatch[1]}`;
      }

      // Convert /uploads/ to uploads/
      if (value.startsWith('/uploads/')) {
        return value.slice(1);
      }

      return value;
    }

    function walkObject(obj) {
      if (typeof obj === 'string') {
        return processValue(obj);
      }
      if (Array.isArray(obj)) {
        return obj.map(item => walkObject(item));
      }
      if (obj && typeof obj === 'object') {
        const result = {};
        for (const key in obj) {
          result[key] = walkObject(obj[key]);
        }
        return result;
      }
      return obj;
    }

    return walkObject(material);
  }

  /**
   * Collect asset paths referenced in material
   */
  function collectAssetPaths(material) {
    const paths = new Set();
    const imagesBasePath = typeof material?.imagesBasePath === 'string'
      ? material.imagesBasePath
      : 'assets/images/';

    function processValue(value) {
      if (!value || typeof value !== 'string') return;
      if (value.startsWith('data:') || value.startsWith('blob:')) return;
      if (/^https?:\/\//i.test(value)) return;

      const clean = value.replace(/^\.\//, '').replace(/^\/+/, '');
      
      if (clean.startsWith('assets/') || clean.startsWith('uploads/')) {
        paths.add(clean);
        return;
      }

      // Handle plain filenames (backward compatibility)
      if (/^[^/]+\.[a-z0-9]{2,6}(\?.*)?$/i.test(clean)) {
        const base = imagesBasePath.replace(/^\/+/, '');
        paths.add(`${base}${clean}`);
      }
    }

    function walkObject(obj) {
      if (typeof obj === 'string') {
        processValue(obj);
      } else if (Array.isArray(obj)) {
        obj.forEach(item => walkObject(item));
      } else if (obj && typeof obj === 'object') {
        Object.values(obj).forEach(value => walkObject(value));
      }
    }

    walkObject(material);
    return Array.from(paths);
  }

  /**
   * Generate viewer-only HTML (no editing features)
   */
  function generateViewerHtml(material) {
    const materialJson = JSON.stringify(material, null, 2)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');

    const escapeHtml = (text) => {
      if (typeof text !== 'string') return '';
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    };

    const title = material?.index?.meta?.title || 'Nuclear Energy of Durham PinS';
    const navLogo = material?.index?.nav?.logo || 'Nuclear Energy of Durham PinS';
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
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css">
    <script>
      (function() {
        window.__KATEX_READY__ = false;
        var katexScript = document.createElement('script');
        katexScript.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js';
        katexScript.onload = function() {
          var autoRenderScript = document.createElement('script');
          autoRenderScript.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/contrib/auto-render.min.js';
          autoRenderScript.onload = function() {
            window.__KATEX_READY__ = true;
            document.dispatchEvent(new CustomEvent('katex-ready'));
          };
          document.head.appendChild(autoRenderScript);
        };
        document.head.appendChild(katexScript);
      })();
    </script>
    <script src="https://unpkg.com/lucide@latest"></script>
</head>
<body class="font-sans antialiased bg-primary-dark text-text-primaryDark overflow-x-hidden">
    <nav class="fixed top-0 w-full z-50 transition-all duration-300 bg-black/80 backdrop-blur-md border-b border-white/10" id="navbar">
        <div class="max-w-[1440px] mx-auto px-6 h-[52px] flex items-center justify-between">
            <a href="#" class="text-xl font-semibold tracking-tight text-white hover:opacity-80 transition-opacity" data-material="nav.logo">${escapeHtml(navLogo)}</a>
            <div class="hidden md:flex items-center gap-8">
                <div id="nav-links-container" class="flex items-center gap-8">
                    <!-- Dynamic nav links will be inserted here -->
                </div>
                <button id="nav-chat-btn" class="bg-accent-blue text-white text-xs font-medium px-4 py-1.5 rounded-full hover:bg-blue-600 transition-colors" data-material="nav.cta">${escapeHtml(navCta)}</button>
            </div>
        </div>
    </nav>
    <main id="app"></main>
    <script>window.__PRELOADED_MATERIAL__ = ${materialJson};</script>
    <script src="./js/templates.js"></script>
    <script src="./js/section-renderer.js"></script>
    <script src="./js/quiz.js"></script>
    <script src="./js/latex-renderer.js"></script>
    <script src="./js/material.js"></script>
    <script src="./js/main.js"></script>
    <script src="./js/scroll-animations.js"></script>
    <script src="./js/ai-chat.js"></script>
    <script>
      async function loadViewerMaterial() {
        // Prefer external material.json so future edits are reflected directly.
        try {
          const res = await fetch('./material.json', { cache: 'no-store' });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          return await res.json();
        } catch (fetchErr) {
          // Fallback for some file:// environments where fetch is blocked.
          try {
            const text = await new Promise(function(resolve, reject) {
              const xhr = new XMLHttpRequest();
              xhr.open('GET', './material.json', true);
              xhr.onreadystatechange = function() {
                if (xhr.readyState !== 4) return;
                if ((xhr.status >= 200 && xhr.status < 300) || xhr.status === 0) {
                  resolve(xhr.responseText);
                } else {
                  reject(new Error('XHR ' + xhr.status));
                }
              };
              xhr.onerror = function() {
                reject(new Error('XHR network error'));
              };
              xhr.send();
            });
            return JSON.parse(text);
          } catch (xhrErr) {
            console.warn('Failed to load external material.json, using embedded fallback.', fetchErr, xhrErr);
            return window.__PRELOADED_MATERIAL__ || null;
          }
        }
      }

      document.addEventListener('DOMContentLoaded', async function() {
        const material = await loadViewerMaterial();
        if (window.SectionRenderer && material) {
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

  /**
   * Generate README for the viewer site
   */
  function generateReadme() {
    return `PinS Static Viewer Site
========================

This is a viewer-only version of the PinS website exported from the CMS.

How to view:
1. Open index.html in a modern web browser
2. If media files don't load, run a local server: npx serve .

Notes:
- This version does not include editing capabilities
- Content is loaded from material.json (embedded data is fallback only)
- Media files are stored in the uploads/ directory
- To edit content, use the full CMS version

Generated: ${new Date().toISOString()}
`;
  }

  function isMediaPath(path) {
    if (!path || typeof path !== 'string') return false;
    return /\.(png|jpe?g|gif|webp|svg|mp4|webm|ogg|mov|m4v)(\?.*)?$/i.test(path);
  }

  function toRelativePath(path) {
    return String(path || '')
      .replace(/^\/+/, '')
      .replace(/^\.\//, '')
      .split('?')[0];
  }

  async function readFileAsDataUrl(dirHandle, relativePath) {
    const parts = toRelativePath(relativePath).split('/').filter(Boolean);
    if (parts.length === 0) return null;

    try {
      let currentDir = dirHandle;
      for (let i = 0; i < parts.length - 1; i++) {
        currentDir = await currentDir.getDirectoryHandle(parts[i], { create: false });
      }
      const fileHandle = await currentDir.getFileHandle(parts[parts.length - 1], { create: false });
      const file = await fileHandle.getFile();
      return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result || null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      });
    } catch (e) {
      return null;
    }
  }

  function getMediaCandidates(value, imagesBasePath) {
    const candidates = [];
    const clean = toRelativePath(value);

    // Direct relative path like uploads/foo.jpg or assets/images/foo.jpg
    if (clean.startsWith('uploads/') || clean.startsWith('assets/')) {
      candidates.push(clean);
    }

    // Backward compatibility: plain filename resolved by imagesBasePath
    if (!clean.includes('/') && isMediaPath(clean)) {
      const base = String(imagesBasePath || 'assets/images/').replace(/^\/+/, '');
      candidates.push(`${base}${clean}`);
    }

    return Array.from(new Set(candidates));
  }

  async function inlineFolderMedia(material, dirHandle) {
    const imagesBasePath = typeof material?.imagesBasePath === 'string'
      ? material.imagesBasePath
      : 'assets/images/';
    const cache = new Map();

    async function resolveMediaString(value) {
      if (typeof value !== 'string' || value.length === 0) return value;
      if (value.startsWith('data:') || value.startsWith('blob:') || /^https?:\/\//i.test(value)) {
        return value;
      }

      if (!isMediaPath(value)) return value;
      const candidates = getMediaCandidates(value, imagesBasePath);
      for (const candidate of candidates) {
        if (cache.has(candidate)) {
          const cached = cache.get(candidate);
          if (cached) return cached;
          continue;
        }
        const dataUrl = await readFileAsDataUrl(dirHandle, candidate);
        cache.set(candidate, dataUrl);
        if (dataUrl) return dataUrl;
      }
      return value;
    }

    async function walk(node) {
      if (typeof node === 'string') {
        return await resolveMediaString(node);
      }
      if (Array.isArray(node)) {
        const output = [];
        for (const item of node) {
          output.push(await walk(item));
        }
        return output;
      }
      if (node && typeof node === 'object') {
        const output = {};
        for (const [key, val] of Object.entries(node)) {
          output[key] = await walk(val);
        }
        return output;
      }
      return node;
    }

    return await walk(material);
  }

  /**
   * Load local project resource with robust fallbacks.
   * fetch() may fail under file:// in some browsers.
   * @param {string} path
   * @param {'text'|'blob'} responseType
   * @returns {Promise<string|Blob|null>}
   */
  async function loadProjectResource(path, responseType = 'text') {
    const cleanPath = String(path || '').replace(/^\/+/, '').replace(/^\.\//, '');
    const relPath = `./${cleanPath}`;

    try {
      const response = await fetch(relPath, { cache: 'no-store' });
      if (response.ok) {
        if (responseType === 'blob') {
          return await response.blob();
        }
        return await response.text();
      }
    } catch (e) {
      // Continue to XHR fallback.
    }

    return await new Promise((resolve) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', relPath, true);
        xhr.responseType = responseType === 'blob' ? 'blob' : 'text';
        xhr.onload = function() {
          // file:// commonly returns status 0
          if (xhr.status === 200 || xhr.status === 0) {
            resolve(xhr.response || null);
          } else {
            resolve(null);
          }
        };
        xhr.onerror = function() {
          resolve(null);
        };
        xhr.send();
      } catch (err) {
        resolve(null);
      }
    });
  }

  /**
   * Main function: Save complete viewer site to local folder
   * @param {Object} material - Material data
   * @param {FileSystemDirectoryHandle} dirHandle - Folder handle
   * @param {Function} progressCallback - Optional progress callback(message, progress)
   */
  async function saveCompleteOfflineSite(material, dirHandle, progressCallback = null) {
    const report = (message, progress) => {
      console.log(message);
      if (progressCallback) progressCallback(message, progress);
    };

    try {
      report('Starting save...', 0);

      // Step 1: Normalize material paths
      report('Normalizing material paths...', 10);
      let processedMaterial = normalizeMaterialPaths(material);

      // Step 2: Extract data URLs to files
      report('Converting embedded media to files...', 20);
      const { updatedMaterial, mediaFiles } = extractDataUrls(processedMaterial);
      processedMaterial = updatedMaterial;

      // Step 3: Collect asset paths
      report('Collecting referenced assets...', 30);
      const assetPaths = collectAssetPaths(processedMaterial);

      // Step 4: Build file map
      report('Preparing files...', 40);
      const fileMap = {};

      // Add material.json
      fileMap['material.json'] = JSON.stringify(processedMaterial, null, 2);

      // Add index.html
      fileMap['index.html'] = generateViewerHtml(processedMaterial);

      // Add README
      fileMap['README.txt'] = generateReadme();

      // Add extracted media files
      Object.assign(fileMap, mediaFiles);

      // Step 5: Fetch and add static files
      report('Fetching static files...', 50);
      const staticFiles = [...getViewerScripts(), ...getStyleFiles()];
      let fetchedCount = 0;

      for (const path of staticFiles) {
        const content = await loadProjectResource(path, 'text');
        if (typeof content === 'string' && content.length > 0) {
          fileMap[path] = content;
          fetchedCount++;
        } else {
          console.warn(`Failed to load static file: ${path}`);
        }
      }

      report(`Fetched ${fetchedCount}/${staticFiles.length} static files`, 60);

      // Step 6: Fetch referenced assets
      report('Fetching referenced assets...', 70);
      let assetCount = 0;

      for (const assetPath of assetPaths) {
        const blob = await loadProjectResource(assetPath, 'blob');
        if (blob) {
          fileMap[assetPath] = blob;
          assetCount++;
        } else {
          console.warn(`Failed to load asset: ${assetPath}`);
        }
      }

      report(`Fetched ${assetCount}/${assetPaths.length} assets`, 80);

      // Ensure viewer core files exist; otherwise exported site cannot render.
      const required = ['css/styles.css', 'js/templates.js', 'js/section-renderer.js'];
      const missingRequired = required.filter((key) => !fileMap[key]);
      if (missingRequired.length > 0) {
        return {
          success: false,
          error: `Missing required files: ${missingRequired.join(', ')}. Please run via a local server and save again.`
        };
      }

      // Step 7: Write all files to folder
      report('Writing files to folder...', 90);
      await window.FileSystemWriter.batchWriteFiles(
        dirHandle,
        fileMap,
        (current, total, filename) => {
          const progress = 90 + Math.floor((current / total) * 10);
          report(`Writing ${current}/${total}: ${filename}`, progress);
        }
      );

      report('Save complete!', 100);

      return {
        success: true,
        fileCount: Object.keys(fileMap).length,
        mediaCount: Object.keys(mediaFiles).length
      };

    } catch (error) {
      console.error('Failed to save offline site:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Load material.json from local folder
   * @param {FileSystemDirectoryHandle} dirHandle
   * @returns {Promise<Object|null>}
   */
  async function loadMaterialFromFolder(dirHandle) {
    try {
      const content = await window.FileSystemWriter.readTextFile(dirHandle, 'material.json');
      if (!content) return null;

      let material = JSON.parse(content);
      if (!material.index || !material.config) {
        console.warn('Invalid material format');
        return null;
      }

      // Convert local relative media paths into data URLs for editor/runtime preview.
      material = await inlineFolderMedia(material, dirHandle);
      return material;
    } catch (error) {
      console.warn('Failed to load material from folder:', error);
      return null;
    }
  }

  return {
    saveCompleteOfflineSite,
    loadMaterialFromFolder,
    generateViewerHtml,
    normalizeMaterialPaths,
    extractDataUrls
  };
})();
