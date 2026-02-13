/**
 * Material loader: reads material.json and applies text/images to the page.
 * - data-material="path.to.key"  → textContent (path relative to page, e.g. hero.title)
 * - data-material-img="path.to.key" → img src or background-image (value = filename under imagesBasePath)
 * - data-material-list="path.to.array" + data-material-item template → repeat rows
 */
(function () {
  const MATERIAL_URL = './material.json';
  let material = null;
  let pageKey = 'index';

  function getByPath(obj, path) {
    if (!obj || !path) return undefined;
    const keys = path.split('.');
    let cur = obj;
    for (const k of keys) {
      cur = cur?.[k];
    }
    return cur;
  }

  function setText(el, value) {
    if (value == null) return;
    var s = typeof value === 'string' ? value : (Array.isArray(value) ? value.join(', ') : String(value));
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = s;
      return;
    }
    el.textContent = s.replace(/\\n/g, '\n');
  }

  function setImage(el, url) {
    if (url == null || url === '') return;
    const base = material?.imagesBasePath || 'assets/images/';
    const src = (
      url.startsWith('http') ||
      url.startsWith('/') ||
      url.startsWith('data:') ||
      url.startsWith('blob:')
    ) ? url : (base + url);
    if (el.tagName === 'IMG') {
      el.src = src;
      el.removeAttribute('data-material-img');
      return;
    }
    el.style.backgroundImage = `url(${src})`;
    el.style.backgroundSize = 'cover';
    el.style.backgroundPosition = 'center';
  }

  function applyElement(page, el) {
    const path = el.getAttribute('data-material');
    if (!path) return;
    const fullPath = page + '.' + path;
    const value = getByPath(material, fullPath);
    if (value != null) setText(el, typeof value === 'string' ? value : String(value));
  }

  function applyImageElement(page, el) {
    const path = el.getAttribute('data-material-img');
    if (!path) return;
    const fullPath = page + '.' + path;
    const value = getByPath(material, fullPath);
    if (value != null && value !== '') setImage(el, value);
  }

  function applyList(page, container) {
    const listPath = container.getAttribute('data-material-list');
    if (!listPath) return;
    const fullPath = page + '.' + listPath;
    const items = getByPath(material, fullPath);
    if (!Array.isArray(items)) return;
    const template = container.querySelector('[data-material-item]');
    if (!template) return;
    const itemKeys = template.getAttribute('data-material-item').trim().split(/\s+/);
    container.innerHTML = '';
    items.forEach((item) => {
      const clone = template.cloneNode(true);
      clone.removeAttribute('data-material-item');
      clone.querySelectorAll('[data-material-key]').forEach((node) => {
        const key = node.getAttribute('data-material-key');
        const val = item[key];
        if (val != null) {
          if (node.tagName === 'IMG' || node.hasAttribute('data-material-img')) {
            const base = material?.imagesBasePath || 'assets/images/';
            const src = (typeof val === 'string' && val) ? (val.startsWith('http') || val.startsWith('/') ? val : base + val) : '';
            if (node.tagName === 'IMG') node.src = src;
            else setImage(node, val);
          } else {
            setText(node, typeof val === 'string' ? val : String(val));
          }
        }
      });
      container.appendChild(clone);
    });
  }

  function applyPage(page) {
    if (!material || !material[page]) return;
    document.querySelectorAll('[data-material]').forEach((el) => applyElement(page, el));
    document.querySelectorAll('[data-material-img]').forEach((el) => applyImageElement(page, el));
    document.querySelectorAll('[data-material-list]').forEach((container) => applyList(page, container));

    const meta = material[page].meta;
    if (meta && meta.title) document.title = meta.title;
  }

  function detectPage() {
    const path = window.location.pathname || '';
    if (path.indexOf('admin') !== -1) return 'admin';
    return 'index';
  }

  async function init() {
    try {
      const res = await fetch(MATERIAL_URL);
      material = await res.json();
    } catch (e) {
      console.warn('Material load failed:', e);
      return;
    }
    pageKey = detectPage();
    applyPage(pageKey);
  }

  // Don't auto-initialize - let ModeManager handle it
  // if (document.readyState === 'loading') {
  //   document.addEventListener('DOMContentLoaded', init);
  // } else {
  //   init();
  // }

  window.__MATERIAL__ = { 
    get: () => material, 
    applyPage, 
    getByPath: (path) => getByPath(material, path),
    init // Export init for manual initialization if needed
  };
})();
