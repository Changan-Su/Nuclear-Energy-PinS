/**
 * LaTeX Renderer - Renders LaTeX math formulas using KaTeX
 * Supports both inline ($...$) and display ($$...$$) math modes
 */

window.LatexRenderer = (function() {
  'use strict';

  const DELIMITERS = [
    { left: '$$', right: '$$', display: true },
    { left: '$', right: '$', display: false },
    { left: '\\(', right: '\\)', display: false },
    { left: '\\[', right: '\\]', display: true }
  ];

  function isReady() {
    return window.__KATEX_READY__ === true && typeof window.renderMathInElement === 'function';
  }

  /**
   * Wait for KaTeX to be loaded, then render all LaTeX content
   */
  function renderAll() {
    if (isReady()) {
      doRender();
      return;
    }

    let attempts = 0;
    const maxAttempts = 100; // 10 seconds max
    const interval = setInterval(() => {
      attempts += 1;
      if (isReady()) {
        clearInterval(interval);
        doRender();
      } else if (attempts >= maxAttempts) {
        clearInterval(interval);
        console.warn('KaTeX failed to load within timeout.');
      }
    }, 100);
  }

  function doRender() {
    const app = document.getElementById('app');
    if (!app || typeof renderMathInElement !== 'function') return;

    try {
      renderMathInElement(app, {
        delimiters: DELIMITERS,
        throwOnError: false,
        trust: true,
        strict: false
      });
      recoverKatexErrors(app);
    } catch (e) {
      console.warn('KaTeX render failed:', e);
    }
  }

  function recoverKatexErrors(root) {
    if (!root || typeof katex === 'undefined') return;
    const errors = root.querySelectorAll('.katex-error');
    errors.forEach((node) => {
      const raw = (node.textContent || '').trim();
      if (!raw) return;
      // Common normalization for exported/JSON-escaped formulas.
      const candidate = raw
        .replace(/\\\\/g, '\\')
        .replace(/\\text\{energy\}/g, 'Q');
      try {
        const html = katex.renderToString(candidate, {
          displayMode: false,
          throwOnError: true,
          trust: true,
          strict: false
        });
        const wrapper = document.createElement('span');
        wrapper.innerHTML = html;
        node.replaceWith(wrapper.firstChild);
      } catch (e) {
        // Keep original katex-error node if still invalid.
      }
    });
  }

  /**
   * Render LaTeX in a specific element
   */
  function renderElement(el) {
    if (typeof renderMathInElement !== 'function') return;

    try {
      renderMathInElement(el, {
        delimiters: DELIMITERS,
        throwOnError: false,
        trust: true,
        strict: false
      });
    } catch (e) {
      // Silently skip
    }
  }

  /**
   * Render LaTeX in a string and return HTML
   */
  function renderString(text) {
    if (typeof katex === 'undefined') return text;

    // Handle display math: $$...$$
    text = text.replace(/\$\$([\s\S]+?)\$\$/g, (match, formula) => {
      try {
        return katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false });
      } catch (e) {
        return match;
      }
    });

    // Handle inline math: $...$
    text = text.replace(/\$([^\$\n]+?)\$/g, (match, formula) => {
      try {
        return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false });
      } catch (e) {
        return match;
      }
    });

    return text;
  }

  document.addEventListener('katex-ready', () => {
    renderAll();
  });

  return {
    renderAll,
    renderElement,
    renderString
  };
})();
