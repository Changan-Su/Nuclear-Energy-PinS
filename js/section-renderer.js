/**
 * Section Renderer - Dynamically renders sections from config and templates
 */

window.SectionRenderer = (function() {
  'use strict';

  let material = null;
  let pageKey = 'index';
  let container = null;
  let citationClickBound = false;

  function init(materialData, page = 'index', containerEl = null) {
    material = materialData;
    pageKey = page;
    container = containerEl || document.getElementById('app');

    if (!container) {
      console.error('Container element not found');
      return;
    }

    render();
  }

  function render() {
    if (!material || !material.config || !material.config.sections) {
      console.warn('No section configuration found in material');
      renderFallback();
      return;
    }

    // Clear container
    container.innerHTML = '';

    // Get sections sorted by order
    const sections = material.config.sections
      .filter(s => s.enabled)
      .sort((a, b) => a.order - b.order);

    // Render each section
    sections.forEach(section => {
      renderSection(section);
    });

    // Render footer (always at the end)
    renderFooter();

    // Re-initialize interactive components
    reinitializeComponents();
  }

  function renderSection(section) {
    const { id, template } = section;
    const data = material[pageKey]?.[id] || {};

    // Get template and render
    const html = window.TemplateRegistry.render(template, id, data, material);
    
    if (html) {
      // Create wrapper div
      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-section-id', id);
      wrapper.setAttribute('data-template', template);
      wrapper.innerHTML = html;
      
      container.appendChild(wrapper);
    }
  }

  function renderFooter() {
    const footerData = material[pageKey]?.footer || {};
    const html = window.TemplateRegistry.render('footer', 'footer', footerData, material);
    
    if (html) {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-section-id', 'footer');
      wrapper.setAttribute('data-template', 'footer');
      wrapper.innerHTML = html;
      container.appendChild(wrapper);
    }
  }

  function renderFallback() {
    container.innerHTML = '<div class="w-full h-screen flex items-center justify-center bg-black text-white"><p>No content available</p></div>';
  }

  function reinitializeComponents() {
    // Delay initialization to ensure DOM is ready
    setTimeout(() => {
      // Reinitialize Lucide icons
      if (window.lucide) {
        window.lucide.createIcons();
      }

      // Update navigation links
      updateNavLinks();

      // Reinitialize tab switchers
      initializeTabSwitchers();

      // Reinitialize accordion
      initializeAccordion();

      // Reinitialize scroll animations
      if (window.ScrollAnimations && window.ScrollAnimations.init) {
        window.ScrollAnimations.init();
      }

      // Reset and reinitialize AI chat
      if (window.AIChat) {
        window.AIChat.reset();
        window.AIChat.init();
      }

      // Reinitialize quiz components
      if (window.QuizEngine && window.QuizEngine.initAll) {
        window.QuizEngine.initAll();
      }

      // Reinitialize main interactions
      if (window.MainInteractions && window.MainInteractions.init) {
        window.MainInteractions.init();
      }
      
      // Initialize citation click handlers (works in both CMS and export viewer)
      setupCitationClickHandlers();
    }, 100);
  }

  function setupCitationClickHandlers() {
    if (citationClickBound) return;
    citationClickBound = true;
    document.addEventListener('click', handleCitationClick);
  }

  function handleCitationClick(event) {
    const citation = event.target.closest('.ref-cite');
    if (!citation) return;

    event.preventDefault();
    const refId = citation.getAttribute('data-ref-id');
    if (!refId) return;

    const refElement = document.getElementById(`ref-${refId}`);
    if (!refElement) return;

    refElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    refElement.classList.add('ref-highlight');
    setTimeout(() => {
      refElement.classList.remove('ref-highlight');
    }, 2000);
  }

  function initializeTabSwitchers() {
    const tabContainers = document.querySelectorAll('#highlight-tabs');
    
    tabContainers.forEach(tabContainer => {
      const buttons = tabContainer.querySelectorAll('.tab-btn');
      
      buttons.forEach(btn => {
        btn.addEventListener('click', () => {
          const targetTab = btn.getAttribute('data-tab');
          
          // Update button styles
          buttons.forEach(b => {
            if (b === btn) {
              b.classList.add('active', 'bg-white', 'text-black');
              b.classList.remove('bg-surface-dark', 'text-white');
            } else {
              b.classList.remove('active', 'bg-white', 'text-black');
              b.classList.add('bg-surface-dark', 'text-white');
            }
          });
          
          // Show corresponding content
          const contents = document.querySelectorAll('.tab-content');
          contents.forEach(content => {
            if (content.id === `content-${targetTab}`) {
              content.classList.remove('opacity-0', 'z-0');
              content.classList.add('opacity-100', 'z-10');
            } else {
              content.classList.add('opacity-0', 'z-0');
              content.classList.remove('opacity-100', 'z-10');
            }
          });
        });
      });
    });
  }

  function initializeAccordion() {
    const featureItems = document.querySelectorAll('.feature-item');
    
    featureItems.forEach(item => {
      item.addEventListener('click', () => {
        const wasActive = item.classList.contains('active');
        
        // Close all items
        featureItems.forEach(fi => {
          fi.classList.remove('active');
          const title = fi.querySelector('h3');
          const desc = fi.querySelector('p');
          const icon = fi.querySelector('i');
          
          if (title) {
            title.classList.remove('text-text-primaryLight');
            title.classList.add('text-text-muted');
          }
          if (desc) {
            desc.classList.add('h-0', 'opacity-0', 'overflow-hidden');
            desc.classList.remove('h-auto', 'opacity-100');
          }
          if (icon) {
            icon.setAttribute('data-lucide', 'plus');
            icon.classList.add('text-text-muted');
          }
        });
        
        // Open clicked item if it wasn't active
        if (!wasActive) {
          item.classList.add('active');
          const title = item.querySelector('h3');
          const desc = item.querySelector('p');
          const icon = item.querySelector('i');
          
          if (title) {
            title.classList.add('text-text-primaryLight');
            title.classList.remove('text-text-muted');
          }
          if (desc) {
            desc.classList.remove('h-0', 'opacity-0', 'overflow-hidden');
            desc.classList.add('h-auto', 'opacity-100');
          }
          if (icon) {
            icon.setAttribute('data-lucide', 'chevron-down');
            icon.classList.remove('text-text-muted');
          }
        }
        
        // Recreate icons
        if (window.lucide) {
          window.lucide.createIcons();
        }
      });
    });
  }

  function updateNavLinks() {
    if (!material || !material.config || !material.config.sections) {
      return;
    }

    const navLinksContainer = document.getElementById('nav-links-container');
    if (!navLinksContainer) {
      return;
    }

    // Clear existing links
    navLinksContainer.innerHTML = '';

    // Get enabled sections sorted by order
    const sections = material.config.sections
      .filter(s => s.enabled)
      .sort((a, b) => a.order - b.order);

    // Create nav links for each section
    sections.forEach(section => {
      const link = document.createElement('a');
      link.href = '#';
      link.className = 'nav-link text-xs text-[#E5E5E5] hover:text-white transition-colors';
      link.setAttribute('data-section-id', section.id);
      
      // Use section name, fallback to formatted id
      const displayName = section.name || formatSectionId(section.id);
      link.textContent = displayName;
      
      // Click handler to scroll to section with offset
      link.addEventListener('click', (e) => {
        e.preventDefault();
        smoothScrollToSection(section.id);
      });
      
      navLinksContainer.appendChild(link);
    });
  }

  function smoothScrollToSection(sectionId) {
    const targetSection = document.querySelector(`#app > [data-section-id="${sectionId}"]`);
    if (!targetSection) return;
    
    // Calculate offset: navbar (52px) + optional edit toolbar (~56px) + padding (20px)
    const isEditMode = document.body.classList.contains('edit-mode');
    const navHeight = 52;
    const toolbarHeight = isEditMode ? 56 : 0;
    const padding = 20;
    const totalOffset = navHeight + toolbarHeight + padding;
    
    // Get target position
    const targetPosition = targetSection.getBoundingClientRect().top + window.pageYOffset - totalOffset;
    
    // Smooth scroll
    window.scrollTo({
      top: targetPosition,
      behavior: 'smooth'
    });
  }

  function formatSectionId(id) {
    // Convert camelCase or dash-case to Title Case
    return id
      .replace(/([A-Z])/g, ' $1')
      .replace(/[-_]/g, ' ')
      .trim()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  function rerender() {
    render();
  }

  function getMaterial() {
    return material;
  }

  function updateMaterial(newMaterial) {
    material = newMaterial;
    render();
  }

  return {
    init,
    render: rerender,
    getMaterial,
    updateMaterial
  };
})();
