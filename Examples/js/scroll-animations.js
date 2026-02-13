// Scroll animations module - exposed for re-initialization after dynamic rendering
window.ScrollAnimations = (function() {
  'use strict';

  let observer = null;

  function init() {
    cleanup(); // Remove old observer if exists
    
    // Scroll Animations using Intersection Observer
    const observerOptions = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target); // Only animate once
        }
      });
    }, observerOptions);

    const fadeElements = document.querySelectorAll('.fade-in-up');
    fadeElements.forEach(el => observer.observe(el));

    initNavbarScroll();
    initSmoothScroll();
  }

  function initNavbarScroll() {
    // Navbar Scroll Effect
    const navbar = document.getElementById('navbar');
    if (!navbar) return;
    
    // Remove old listener by replacing the element (to avoid duplicates)
    const handleScroll = () => {
      if (window.scrollY > 50) {
        navbar.classList.add('bg-black/90', 'shadow-lg');
        navbar.classList.remove('bg-black/80');
      } else {
        navbar.classList.remove('bg-black/90', 'shadow-lg');
        navbar.classList.add('bg-black/80');
      }
    };
    
    window.removeEventListener('scroll', handleScroll);
    window.addEventListener('scroll', handleScroll);
  }

  function initSmoothScroll() {
    // Smooth Scroll for Navigation Links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      const handleClick = function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      };
      
      // Remove old listener by cloning (to avoid duplicates)
      anchor.removeEventListener('click', handleClick);
      anchor.addEventListener('click', handleClick);
    });
  }

  function cleanup() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
  }

  return {
    init,
    cleanup
  };
})();

// Don't auto-initialize - let section-renderer handle it after DOM is rendered
// if (document.readyState === 'loading') {
//   document.addEventListener('DOMContentLoaded', () => {
//     window.ScrollAnimations.init();
//   });
// } else {
//   window.ScrollAnimations.init();
// }
