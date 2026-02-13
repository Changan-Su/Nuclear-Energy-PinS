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

      // Initialize flip cards
      initializeFlipCards();

      // Initialize image position controls
      initializeImagePositionControls();

      // Render LaTeX formulas
      if (window.LatexRenderer && window.LatexRenderer.renderAll) {
        window.LatexRenderer.renderAll();
      }

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

  function initializeFlipCards() {
    // Flip triggers (Learn More buttons)
    document.querySelectorAll('.flip-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const targetKey = btn.getAttribute('data-flip-target');
        const card = document.querySelector(`[data-flip-card="${targetKey}"]`);
        if (card && card.getAttribute('data-flip-enabled') === 'true') {
          card.classList.add('flipped');
        }
      });
    });

    // Flip back triggers (close buttons)
    document.querySelectorAll('.flip-back-trigger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const targetKey = btn.getAttribute('data-flip-target');
        const card = document.querySelector(`[data-flip-card="${targetKey}"]`);
        if (card) {
          card.classList.remove('flipped');
        }
      });
    });
  }

  function initializeImagePositionControls() {
    // Add position/scale controls to all image elements with data-material-img
    document.querySelectorAll('[data-material-img]').forEach(imgEl => {
      // Skip if already has controls
      if (imgEl.querySelector('.img-position-controls')) return;

      const materialPath = imgEl.getAttribute('data-material-img');
      if (!materialPath) return;

      // Ensure element has relative/absolute positioning
      const pos = window.getComputedStyle(imgEl).position;
      if (pos === 'static') {
        imgEl.style.position = 'relative';
      }

      // Resolve position data path: e.g. "highlights.efficiency.images.main" → "highlights.efficiency.images.position"
      const pathParts = materialPath.split('.');
      // Replace last segment with "position"
      const posPath = [...pathParts.slice(0, -1), 'position'].join('.');

      // Get current values from material
      const mat = material;
      const posData = getNestedValue(mat, `${pageKey}.${posPath}`) || {};
      const currentX = posData.x ?? 50;
      const currentY = posData.y ?? 50;
      const currentScale = posData.scale ?? 100;

      const controls = document.createElement('div');
      controls.className = 'img-position-controls';
      controls.innerHTML = `
        <label>X</label>
        <input type="range" min="0" max="100" value="${currentX}" data-img-ctrl="x" title="Horizontal position">
        <div class="divider"></div>
        <label>Y</label>
        <input type="range" min="0" max="100" value="${currentY}" data-img-ctrl="y" title="Vertical position">
        <div class="divider"></div>
        <label>Zoom</label>
        <input type="range" min="50" max="300" value="${currentScale}" data-img-ctrl="scale" title="Zoom level">
        <button class="reset-btn" data-img-ctrl="reset">Reset</button>
      `;

      // Prevent click events from bubbling to parent (avoid triggering image upload overlay, etc.)
      controls.addEventListener('click', (e) => e.stopPropagation());
      controls.addEventListener('mouseenter', (e) => e.stopPropagation());

      // Bind range inputs
      controls.querySelectorAll('input[type="range"]').forEach(input => {
        const prop = input.getAttribute('data-img-ctrl');

        input.addEventListener('input', () => {
          const val = parseInt(input.value);
          applyImagePosition(imgEl, prop, val);
        });

        input.addEventListener('change', () => {
          const val = parseInt(input.value);
          saveImagePosition(posPath, prop, val);
        });
      });

      // Reset button
      controls.querySelector('[data-img-ctrl="reset"]').addEventListener('click', () => {
        controls.querySelector('[data-img-ctrl="x"]').value = 50;
        controls.querySelector('[data-img-ctrl="y"]').value = 50;
        controls.querySelector('[data-img-ctrl="scale"]').value = 100;
        applyImagePosition(imgEl, 'x', 50);
        applyImagePosition(imgEl, 'y', 50);
        applyImagePosition(imgEl, 'scale', 100);
        saveImagePosition(posPath, 'x', 50);
        saveImagePosition(posPath, 'y', 50);
        saveImagePosition(posPath, 'scale', 100);
      });

      imgEl.appendChild(controls);
    });
  }

  function applyImagePosition(el, prop, value) {
    if (prop === 'x') {
      const current = el.style.backgroundPosition || '50% 50%';
      const parts = current.split(' ');
      el.style.backgroundPosition = `${value}% ${parts[1] || '50%'}`;
    } else if (prop === 'y') {
      const current = el.style.backgroundPosition || '50% 50%';
      const parts = current.split(' ');
      el.style.backgroundPosition = `${parts[0] || '50%'} ${value}%`;
    } else if (prop === 'scale') {
      el.style.backgroundSize = `${value}%`;
    }
  }

  function saveImagePosition(posPath, prop, value) {
    if (!material) return;

    if (window.ModeManager && window.ModeManager.captureSnapshot) {
      window.ModeManager.captureSnapshot();
    }

    const fullPath = `${pageKey}.${posPath}`;
    let posObj = getNestedValue(material, fullPath) || {};

    // Ensure position object exists in material
    setNestedValue(material, fullPath, { ...posObj, [prop]: value });

    if (window.ModeManager) {
      window.ModeManager.updateMaterialInMemory(material);

      const state = window.ModeManager.getState();
      if (state.dataMode === 'online') {
        window.ModeManager.patchMaterial(fullPath, { ...posObj, [prop]: value });
      }
    }
  }

  function getNestedValue(obj, path) {
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
      if (current == null) return undefined;
      current = current[key];
    }
    return current;
  }

  function setNestedValue(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]] || typeof current[keys[i]] !== 'object') {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
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
