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

      // Initialize interactive details
      initializeInteractiveDetails();

      // Initialize flip cards
      initializeFlipCards();

      // Initialize card-grid expanding detail overlays
      initializeDetailOverlays();

      // Initialize image position controls
      initializeImagePositionControls();
      initializeCardGridCoverRatioControls();

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
    const tabContainers = document.querySelectorAll('[data-tab-container="true"]');
    
    tabContainers.forEach(tabContainer => {
      const buttons = tabContainer.querySelectorAll('.tab-btn');
      const sectionWrapper = tabContainer.closest('[data-section-id]');
      const contents = sectionWrapper
        ? sectionWrapper.querySelectorAll('.tab-content')
        : document.querySelectorAll('.tab-content');
      
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

  function initializeInteractiveDetails() {
    const lists = document.querySelectorAll('[data-id-list]');

    lists.forEach(list => {
      const sectionId = list.getAttribute('data-id-list');
      const container = document.querySelector(`[data-id-detail-container="${sectionId}"]`);
      if (!container) return;

      const items = list.querySelectorAll('.id-item');
      const panels = container.querySelectorAll('.id-detail-panel');
      let currentIndex = 0;
      let isAnimating = false;

      items.forEach(item => {
        item.addEventListener('click', () => {
          const targetIndex = parseInt(item.getAttribute('data-id-item'), 10);
          if (targetIndex === currentIndex || isAnimating) return;

          isAnimating = true;

          // --- Update left side: collapse old, expand new ---
          items.forEach(it => {
            it.classList.remove('active');
            const title = it.querySelector('h3');
            const desc = it.querySelector('.id-item-desc');
            const icon = it.querySelector('i');

            if (title) {
              title.classList.remove('text-white');
              title.classList.add('text-white/40');
            }
            if (desc) {
              desc.classList.remove('id-item-desc--open');
            }
            if (icon) {
              icon.setAttribute('data-lucide', 'plus');
              icon.classList.remove('text-white');
              icon.classList.add('text-white/40');
            }
          });

          item.classList.add('active');
          const newTitle = item.querySelector('h3');
          const newDesc = item.querySelector('.id-item-desc');
          const newIcon = item.querySelector('i');

          if (newTitle) {
            newTitle.classList.add('text-white');
            newTitle.classList.remove('text-white/40');
          }
          if (newDesc) {
            newDesc.classList.add('id-item-desc--open');
          }
          if (newIcon) {
            newIcon.setAttribute('data-lucide', 'chevron-down');
            newIcon.classList.add('text-white');
            newIcon.classList.remove('text-white/40');
          }

          // Refresh Lucide icons
          if (window.lucide) {
            window.lucide.createIcons();
          }

          // --- Flip animation on right side ---
          const currentPanel = panels[currentIndex];
          const targetPanel = panels[targetIndex];
          if (!currentPanel || !targetPanel) {
            isAnimating = false;
            return;
          }

          // Phase 1: Flip out the current panel
          currentPanel.classList.remove('id-detail-panel--active');
          currentPanel.classList.add('id-detail-panel--flip-out');

          const onFlipOutEnd = () => {
            currentPanel.removeEventListener('animationend', onFlipOutEnd);
            currentPanel.classList.remove('id-detail-panel--flip-out');

            // Phase 2: Flip in the target panel
            targetPanel.classList.add('id-detail-panel--flip-in');

            const onFlipInEnd = () => {
              targetPanel.removeEventListener('animationend', onFlipInEnd);
              targetPanel.classList.remove('id-detail-panel--flip-in');
              targetPanel.classList.add('id-detail-panel--active');
              currentIndex = targetIndex;
              isAnimating = false;

              // Render LaTeX in new panel if available
              if (window.LatexRenderer && window.LatexRenderer.renderAll) {
                window.LatexRenderer.renderAll();
              }
            };

            targetPanel.addEventListener('animationend', onFlipInEnd);
          };

          currentPanel.addEventListener('animationend', onFlipOutEnd);
        });
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

  function initializeDetailOverlays() {
    const triggers = document.querySelectorAll('.cg-flip-trigger');
    if (!triggers.length) return;

    let activeState = null;

    /* ====== OPEN: flip in-place → then enlarge to fill grid ====== */
    function openCard(trigger) {
      if (activeState) closeCard(true);

      const cardItem = trigger.closest('[data-card-grid-item="true"]');
      const flipper = cardItem?.querySelector('.cg-flipper');
      const grid = cardItem?.closest('.card-grid-collection');
      if (!cardItem || !flipper || !grid) return;

      // 1) Snapshot card geometry BEFORE any DOM change
      const origTop = cardItem.offsetTop;
      const origLeft = cardItem.offsetLeft;
      const origW = cardItem.offsetWidth;
      const origH = cardItem.offsetHeight;

      // 2) Visual prep: dim siblings, highlight this card
      grid.classList.add('cg-has-expanded');
      cardItem.classList.add('cg-active');

      // 3) Phase 1 — Flip (card stays in normal flow, no layout shift)
      flipper.classList.add('cg-flipped');

      activeState = { cardItem, flipper, grid, placeholder: null, origTop, origLeft, origW, origH };

      // 4) When flip finishes → Phase 2 — Enlarge
      const inner = flipper.querySelector('.cg-flipper-inner');
      const onFlipEnd = (e) => {
        if (e.propertyName !== 'transform') return;
        inner.removeEventListener('transitionend', onFlipEnd);

        // a) Insert invisible placeholder AFTER card to hold its row space
        const placeholder = document.createElement('div');
        placeholder.className = 'cg-placeholder card-grid-item';
        placeholder.style.height = origH + 'px';
        cardItem.after(placeholder);
        activeState.placeholder = placeholder;

        // b) Yank card out of flow at its original position (same paint frame)
        cardItem.classList.add('cg-enlarging');
        cardItem.style.top = origTop + 'px';
        cardItem.style.left = origLeft + 'px';
        cardItem.style.width = origW + 'px';
        cardItem.style.height = origH + 'px';

        // c) Force layout so browser registers the starting rect
        void cardItem.offsetWidth;

        // d) Animate to fill the entire card grid content area (all cards' bounding box)
        requestAnimationFrame(() => {
          const allCards = Array.from(grid.querySelectorAll('[data-card-grid-item="true"]'));
          
          if (allCards.length === 0) {
            // Fallback: just use grid dimensions
            cardItem.style.top = '0px';
            cardItem.style.left = '0px';
            cardItem.style.width = grid.clientWidth + 'px';
            cardItem.style.height = grid.clientHeight + 'px';
          } else {
            // Calculate bounding box of all cards (relative to grid)
            let minTop = Infinity, minLeft = Infinity;
            let maxBottom = -Infinity, maxRight = -Infinity;
            
            allCards.forEach(card => {
              const top = card.offsetTop;
              const left = card.offsetLeft;
              const bottom = top + card.offsetHeight;
              const right = left + card.offsetWidth;
              
              minTop = Math.min(minTop, top);
              minLeft = Math.min(minLeft, left);
              maxBottom = Math.max(maxBottom, bottom);
              maxRight = Math.max(maxRight, right);
            });
            
            cardItem.style.top = minTop + 'px';
            cardItem.style.left = minLeft + 'px';
            cardItem.style.width = (maxRight - minLeft) + 'px';
            cardItem.style.height = (maxBottom - minTop) + 'px';
          }
          
          cardItem.classList.add('cg-enlarged');
        });
      };
      inner.addEventListener('transitionend', onFlipEnd);
    }

    /* ====== CLOSE: shrink back → flip back → return to flow ====== */
    function closeCard(immediate) {
      if (!activeState) return;
      const { cardItem, flipper, grid, placeholder, origTop, origLeft, origW, origH } = activeState;
      activeState = null;

      if (immediate) {
        flipper.classList.remove('cg-flipped');
        cardItem.classList.remove('cg-active', 'cg-enlarging', 'cg-enlarged');
        cardItem.style.cssText = '';
        grid.classList.remove('cg-has-expanded');
        if (placeholder) placeholder.remove();
        return;
      }

      // Phase 1 — Shrink back to original card rect
      cardItem.classList.remove('cg-enlarged');
      cardItem.style.top = origTop + 'px';
      cardItem.style.left = origLeft + 'px';
      cardItem.style.width = origW + 'px';
      cardItem.style.height = origH + 'px';

      const onShrinkEnd = (e) => {
        if (!['top', 'left', 'width', 'height'].includes(e.propertyName)) return;
        cardItem.removeEventListener('transitionend', onShrinkEnd);

        // Return card to normal flow & remove placeholder
        cardItem.classList.remove('cg-enlarging');
        cardItem.style.cssText = '';
        if (placeholder) placeholder.remove();

        // Phase 2 — Flip back to front face
        flipper.classList.remove('cg-flipped');

        const inner = flipper.querySelector('.cg-flipper-inner');
        const onFlipBack = (e2) => {
          if (e2.propertyName !== 'transform') return;
          inner.removeEventListener('transitionend', onFlipBack);
          cardItem.classList.remove('cg-active');
          grid.classList.remove('cg-has-expanded');
        };
        inner.addEventListener('transitionend', onFlipBack);
      };
      cardItem.addEventListener('transitionend', onShrinkEnd);
    }

    /* ====== Event wiring ====== */
    triggers.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        openCard(btn);
      });
    });

    document.querySelectorAll('[data-cg-close="true"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        closeCard(false);
      });
    });

    document.addEventListener('click', (e) => {
      if (!activeState) return;
      if (!activeState.cardItem.contains(e.target)) {
        closeCard(false);
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeCard(false);
    });
  }

  function initializeImagePositionControls() {
    // Add position/scale controls to all image elements (including detail banner/end media)
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

  function clampCardGridCoverRatio(value) {
    return Math.max(25, Math.min(75, Math.round(value)));
  }

  function applyCardGridCoverRatio(sectionEl, ratio) {
    if (!sectionEl) return;
    const safeRatio = clampCardGridCoverRatio(ratio);
    const textRatio = 100 - safeRatio;
    sectionEl.querySelectorAll('[data-card-grid-front-layout="true"]').forEach((layoutEl) => {
      layoutEl.style.gridTemplateRows = `${safeRatio}% ${textRatio}%`;
    });
  }

  function saveCardGridCoverRatio(sectionId, ratio) {
    if (!material || !sectionId) return;
    const safeRatio = clampCardGridCoverRatio(ratio);
    const fullPath = `${pageKey}.${sectionId}.coverMediaRatio`;

    if (window.ModeManager && window.ModeManager.captureSnapshot) {
      window.ModeManager.captureSnapshot();
    }

    setNestedValue(material, fullPath, safeRatio);

    if (window.ModeManager) {
      window.ModeManager.updateMaterialInMemory(material);
      const state = window.ModeManager.getState();
      if (state.dataMode === 'online') {
        window.ModeManager.patchMaterial(fullPath, safeRatio);
      }
    }
  }

  function initializeCardGridCoverRatioControls() {
    document.querySelectorAll('[data-template="card-grid"]').forEach(sectionEl => {
      const sectionId = sectionEl.getAttribute('data-section-id');
      const grid = sectionEl.querySelector('.card-grid-collection');
      if (!sectionId || !grid) return;
      if (grid.querySelector('.card-grid-ratio-controls')) return;

      const savedRatio = Number(getNestedValue(material, `${pageKey}.${sectionId}.coverMediaRatio`));
      const currentRatio = Number.isFinite(savedRatio) ? clampCardGridCoverRatio(savedRatio) : 57;

      const controls = document.createElement('div');
      controls.className = 'card-grid-ratio-controls';
      controls.innerHTML = `
        <label>Cover</label>
        <input type="range" min="25" max="75" step="1" value="${currentRatio}" data-card-grid-ratio="input" title="Card cover/media height ratio">
        <span class="card-grid-ratio-value" data-card-grid-ratio="value">${currentRatio}%</span>
        <button class="reset-btn" data-card-grid-ratio="reset">Reset</button>
      `;

      controls.addEventListener('click', (e) => e.stopPropagation());
      controls.addEventListener('mouseenter', (e) => e.stopPropagation());

      const ratioInput = controls.querySelector('[data-card-grid-ratio="input"]');
      const ratioValue = controls.querySelector('[data-card-grid-ratio="value"]');
      const resetBtn = controls.querySelector('[data-card-grid-ratio="reset"]');

      ratioInput.addEventListener('input', () => {
        const ratio = clampCardGridCoverRatio(parseInt(ratioInput.value, 10));
        ratioValue.textContent = `${ratio}%`;
        applyCardGridCoverRatio(sectionEl, ratio);
      });

      ratioInput.addEventListener('change', () => {
        const ratio = clampCardGridCoverRatio(parseInt(ratioInput.value, 10));
        ratioInput.value = String(ratio);
        ratioValue.textContent = `${ratio}%`;
        saveCardGridCoverRatio(sectionId, ratio);
      });

      resetBtn.addEventListener('click', () => {
        ratioInput.value = '57';
        ratioValue.textContent = '57%';
        applyCardGridCoverRatio(sectionEl, 57);
        saveCardGridCoverRatio(sectionId, 57);
      });

      grid.appendChild(controls);
    });
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
