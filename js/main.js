// Main interactions module - exposed for re-initialization after dynamic rendering
window.MainInteractions = (function() {
  'use strict';

  function init() {
    initHeroCTA();
    initHeroCinemaMode();
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

  function initHeroCinemaMode() {
    const heroSection = document.querySelector('section#overview');
    const watchButton = document.querySelector('.hero-cinema-secondary');
    const exitButton = document.querySelector('.hero-exit-cinema');
    const video = document.querySelector('section#overview video[data-material-video]');
    
    if (!heroSection || !watchButton || !exitButton) return;
    
    // Enter cinema mode
    watchButton.addEventListener('click', () => {
      heroSection.classList.add('cinema-mode');
      exitButton.classList.remove('hidden');
      
      if (video) {
        video.muted = false;
        video.play().catch(err => console.warn('Video play failed:', err));
      }
      
      // Re-initialize Lucide icons for the exit button
      if (window.lucide) {
        window.lucide.createIcons();
      }
    });
    
    // Exit cinema mode
    exitButton.addEventListener('click', () => {
      heroSection.classList.remove('cinema-mode');
      exitButton.classList.add('hidden');
      
      if (video) {
        video.muted = true;
      }
    });
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
