// Main interactions module - exposed for re-initialization after dynamic rendering
window.MainInteractions = (function() {
  'use strict';

  function init() {
    initHeroCTA();
    // Tab and accordion init moved to section-renderer
  }

  function initHeroCTA() {
    // Hero primary CTA: smooth scroll to next section (Highlights)
    const heroCtaPrimary = document.querySelector('section#overview button[data-material="hero.ctaPrimary"]');
    if (heroCtaPrimary) {
      heroCtaPrimary.addEventListener('click', () => {
        const next = document.getElementById('highlights');
        if (next) next.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  return {
    init
  };
})();

// Don't auto-initialize - let section-renderer handle it after DOM is rendered
// if (document.readyState === 'loading') {
//   document.addEventListener('DOMContentLoaded', () => {
//     window.MainInteractions.init();
//   });
// } else {
//   window.MainInteractions.init();
// }
