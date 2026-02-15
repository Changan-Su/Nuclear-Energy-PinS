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

      // Initialize Text Image Left section switchers
      initializeTextImageLeftSwitchers();

      // Initialize card-grid expanding detail overlays
      initializeDetailOverlays();

      // Initialize image position controls
      initializeImagePositionControls();
      initializeCardGridCoverRatioControls();

      // Initialize detail banner shrink ratio controls (TIL)
      initializeDetailShrinkControls();

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
              title.classList.add('text-white/50');
            }
            if (desc) {
              desc.classList.remove('id-item-desc--open');
            }
            if (icon) {
              icon.setAttribute('data-lucide', 'chevron-right');
              icon.classList.remove('text-white');
              icon.classList.add('text-white/30');
            }
          });

          item.classList.add('active');
          const newTitle = item.querySelector('h3');
          const newDesc = item.querySelector('.id-item-desc');
          const newIcon = item.querySelector('i');

          if (newTitle) {
            newTitle.classList.add('text-white');
            newTitle.classList.remove('text-white/50');
          }
          if (newDesc) {
            newDesc.classList.add('id-item-desc--open');
          }
          if (newIcon) {
            newIcon.setAttribute('data-lucide', 'chevron-down');
            newIcon.classList.add('text-white');
            newIcon.classList.remove('text-white/30');
          }

          // Refresh Lucide icons
          if (window.lucide) {
            window.lucide.createIcons();
          }

          // --- Animation logic based on animation type ---
          const animationType = container.getAttribute('data-animation') || 'flip-y';
          const currentPanel = panels[currentIndex];
          const targetPanel = panels[targetIndex];
          if (!currentPanel || !targetPanel) {
            isAnimating = false;
            return;
          }

          if (animationType === 'cube-y' || animationType === 'cube-x') {
            // Cube animation: update data-current-index to trigger CSS rotation
            container.setAttribute('data-current-index', targetIndex);
            
            // Update active panel immediately
            currentPanel.classList.remove('id-detail-panel--active');
            targetPanel.classList.add('id-detail-panel--active');
            currentIndex = targetIndex;

            // Wait for rotation to complete
            setTimeout(() => {
              isAnimating = false;

              // Render LaTeX in new panel if available
              if (window.LatexRenderer && window.LatexRenderer.renderAll) {
                window.LatexRenderer.renderAll();
              }
            }, 700); // Match CSS transition duration

          } else {
            // Flip animation: flip out current, flip in target
            currentPanel.classList.remove('id-detail-panel--active');
            currentPanel.classList.add('id-detail-panel--flip-out');

            const onFlipOutEnd = () => {
              currentPanel.removeEventListener('animationend', onFlipOutEnd);
              currentPanel.classList.remove('id-detail-panel--flip-out');

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
          }
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

  function initializeTextImageLeftSwitchers() {
    const tilContainers = document.querySelectorAll('.til-container[data-til-section-id]');
    console.log('[TIL] Found', tilContainers.length, 'TIL containers');
    
    tilContainers.forEach(container => {
      const sectionId = container.getAttribute('data-til-section-id');
      const itemsJson = container.getAttribute('data-til-items');
      const theme = container.getAttribute('data-til-theme') || 'light';
      
      console.log('[TIL] Initializing section:', sectionId, 'theme:', theme);
      
      if (!itemsJson) {
        console.warn('[TIL] No items JSON for section:', sectionId);
        return;
      }
      let items;
      try {
        items = JSON.parse(itemsJson.replace(/&quot;/g, '"'));
      } catch (e) {
        console.error('[TIL] Failed to parse items JSON for section:', sectionId, e);
        return;
      }
      if (!Array.isArray(items) || !items.length) {
        console.warn('[TIL] Items is not a valid array for section:', sectionId);
        return;
      }

      console.log('[TIL] Section', sectionId, 'has', items.length, 'items');

      // Get elements
      const leftArea = container.querySelector('[data-til-left-area]');
      const contentWrapper = container.querySelector('[data-til-content-wrapper]');
      const rightWrapper = container.querySelector('[data-til-right-wrapper]');
      const rightArea = rightWrapper?.querySelector('[data-til-right-area]');
      const collapsedContent = container.querySelector('[data-til-collapsed-content]');
      const detailContent = container.querySelector('[data-til-detail-content]');
      const titleEl = container.querySelector('[data-til-title]');
      const descEl = container.querySelector('[data-til-description]');
      const imageWrapper = container.querySelector('[data-til-image-wrapper]');
      const imageLabelEl = container.querySelector('.til-image-label');
      const detailTitleEl = detailContent?.querySelector('[data-til-detail-title]');
      const detailTextEl = detailContent?.querySelector('[data-til-detail-text]');
      const learnMoreBtn = container.querySelector('[data-til-learn-more]');
      const closeBtn = container.querySelector('[data-til-close]');
      const switcherBtns = container.querySelectorAll('.til-switcher-btn[data-til-index]');

      if (!leftArea || !contentWrapper || !rightWrapper || !rightArea || !collapsedContent || !detailContent || !titleEl || !descEl || !imageWrapper) {
        console.error('[TIL] Missing required elements for section:', sectionId, {
          leftArea: !!leftArea,
          contentWrapper: !!contentWrapper,
          rightWrapper: !!rightWrapper,
          rightArea: !!rightArea,
          collapsedContent: !!collapsedContent,
          detailContent: !!detailContent,
          titleEl: !!titleEl,
          descEl: !!descEl,
          imageWrapper: !!imageWrapper
        });
        return;
      }

      console.log('[TIL] All elements found for section:', sectionId, 'buttons:', switcherBtns.length);

      let currentIndex = parseInt(container.getAttribute('data-til-active-index'), 10) || 0;
      let detailState = container.getAttribute('data-til-detail-state') || 'collapsed';
      let isAnimating = false;

      // Function to expand detail view
      function expandDetail() {
        if (detailState === 'expanded' || isAnimating) return;
        isAnimating = true;
        const currentItem = items[currentIndex];
        const shrinkRatio = currentItem.detailImageShrinkRatio || 60;

        // Update detail content for current item
        if (detailTitleEl) detailTitleEl.textContent = currentItem.title || '';
        if (detailTextEl) {
          const detailHtml = Array.isArray(currentItem.detailBlocks) && currentItem.detailBlocks.length > 0
            ? window.TemplateRegistry.render('detailBlocks', sectionId, { detailBlocks: currentItem.detailBlocks }, material)
            : (currentItem.detail || 'Detail content goes here.');
          detailTextEl.innerHTML = detailHtml;
        }

        // Fade out collapsed content
        collapsedContent.style.opacity = '0';
        collapsedContent.style.pointerEvents = 'none';

        // Shrink and reposition right image area
        rightWrapper.style.width = `${shrinkRatio}%`;
        rightWrapper.style.right = '0';
        
        // Dynamically adjust left area width: totalWidth - rightWrapperWidth - gap(60px)
        const containerWidth = container.offsetWidth;
        const rightWrapperWidth = (containerWidth * shrinkRatio) / 100;
        const gapWidth = 60; // Gap between left and right areas
        const leftAreaWidth = containerWidth - rightWrapperWidth - gapWidth;
        leftArea.style.width = `${leftAreaWidth}px`;
        
        // Switch to natural-size image display in detail state
        // Get current image URL from imageWrapper's background-image or data attribute
        let currentImageUrl = '';
        const bgImage = imageWrapper.style.backgroundImage;
        if (bgImage && bgImage !== 'none') {
          // Extract URL from background-image: url("...")
          const match = bgImage.match(/url\(['"]?([^'"]+)['"]?\)/);
          if (match) {
            currentImageUrl = match[1];
          }
        }
        
        // If no background image, try to get from data attribute or material
        if (!currentImageUrl) {
          const materialPath = imageWrapper.getAttribute('data-material-img');
          if (materialPath && material) {
            currentImageUrl = getImageUrl(materialPath, material);
          }
        }
        
        console.log('[TIL] expandDetail - currentImageUrl:', currentImageUrl);
        console.log('[TIL] expandDetail - imageWrapper backgroundImage:', imageWrapper.style.backgroundImage);
        
        const isVideo = currentItem.isVideo || (currentImageUrl && isVideoUrl(currentImageUrl));
        
        if (currentImageUrl && !isVideo) {
          console.log('[TIL] Creating natural-size image');
          
          // Clear background image
          imageWrapper.style.backgroundImage = '';
          imageWrapper.style.backgroundSize = '';
          imageWrapper.style.backgroundPosition = '';
          
          // Create or update natural-size image
          let naturalImg = imageWrapper.querySelector('.til-detail-natural-img');
          if (!naturalImg) {
            console.log('[TIL] Creating new img element');
            naturalImg = document.createElement('img');
            naturalImg.className = 'til-detail-natural-img';
            naturalImg.setAttribute('data-til-detail-img', 'true');
            imageWrapper.appendChild(naturalImg);
          } else {
            console.log('[TIL] Reusing existing img element');
          }
          naturalImg.src = currentImageUrl;
          naturalImg.style.opacity = '0';
          console.log('[TIL] Natural img element:', naturalImg);
          
          // Fade in natural image
          setTimeout(() => {
            if (naturalImg) {
              naturalImg.style.opacity = '1';
              console.log('[TIL] Natural image faded in');
            }
          }, 50);
        } else if (!currentImageUrl) {
          console.warn('[TIL] No image URL found');
        } else if (isVideo) {
          console.log('[TIL] Skipping - is video');
        }
        
        // Helper function to check if URL is video
        function isVideoUrl(url) {
          if (!url || typeof url !== 'string') return false;
          if (url.startsWith('data:video/')) return true;
          const cleanUrl = url.split('?')[0].toLowerCase();
          return /\.(mp4|webm|ogg|mov|m4v)$/.test(cleanUrl);
        }
        
        // Helper function to get image URL from material
        function getImageUrl(path, material) {
          if (!path || !material) return '';
          const parts = path.split('.');
          let value = material;
          for (const part of parts) {
            if (value && typeof value === 'object') {
              value = value[part];
            } else {
              return '';
            }
          }
          return typeof value === 'string' ? value : '';
        }
        
        // Hide image label in detail state
        if (imageLabelEl) {
          imageLabelEl.style.opacity = '0';
        }
        
        // After short delay, fade in detail content
        setTimeout(() => {
          detailContent.style.opacity = '1';
          detailContent.style.pointerEvents = 'auto';
          detailState = 'expanded';
          container.setAttribute('data-til-detail-state', 'expanded');
          
          // Add resize handle for editor mode
          if (window.EditorSystem && document.body.classList.contains('edit-mode')) {
            addTILResizeHandle(rightWrapper);
          }
          
          // Render LaTeX if available
          if (window.LatexRenderer && window.LatexRenderer.renderAll) {
            window.LatexRenderer.renderAll();
          }
          
          isAnimating = false;
        }, 300);
      }

      // Helper function to add resize handle
      function addTILResizeHandle(rightWrapperEl) {
        if (rightWrapperEl.querySelector('.til-resize-handle')) return; // Already has handle
        
        const handle = document.createElement('div');
        handle.className = 'til-resize-handle edit-mode-only';
        handle.style.cssText = 'position: absolute; right: -6px; top: 50%; transform: translateY(-50%); width: 12px; height: 60px; background: rgba(59, 130, 246, 0.8); border-radius: 6px; cursor: ew-resize; z-index: 100; transition: background 0.2s;';
        handle.innerHTML = '<div style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">⋮</div>';
        
        handle.addEventListener('mouseenter', () => {
          handle.style.background = 'rgba(59, 130, 246, 1)';
        });
        
        handle.addEventListener('mouseleave', () => {
          handle.style.background = 'rgba(59, 130, 246, 0.8)';
        });
        
        rightWrapperEl.appendChild(handle);
        console.log('[TIL] Resize handle added to rightWrapper');
      }

      // Function to collapse detail view
      function collapseDetail() {
        if (detailState === 'collapsed' || isAnimating) return;
        isAnimating = true;

        // Remove resize handle
        const handle = rightWrapper.querySelector('.til-resize-handle');
        if (handle) {
          handle.remove();
          console.log('[TIL] Resize handle removed');
        }

        // Fade out detail content
        detailContent.style.opacity = '0';
        detailContent.style.pointerEvents = 'none';

        // Expand right image area back
        rightWrapper.style.width = 'calc(100% - 500px - 60px)';
        
        // Restore left area width to fixed 500px
        leftArea.style.width = '500px';
        
        // Restore background image display
        const currentItem = items[currentIndex];
        const naturalImg = imageWrapper.querySelector('.til-detail-natural-img');
        if (naturalImg) {
          naturalImg.style.opacity = '0';
          setTimeout(() => {
            if (naturalImg && naturalImg.parentNode) {
              naturalImg.parentNode.removeChild(naturalImg);
            }
          }, 300);
        }
        
        // Restore background image style
        if (currentItem.bgStyle) {
          const bgSizeMatch = currentItem.bgStyle.match(/background-size:\s*([^;]+)/);
          const posMatch = currentItem.bgStyle.match(/background-position:\s*([^;]+)/);
          const imgMatch = currentItem.bgStyle.match(/background-image:\s*url\(([^)]+)\)/);
          
          if (imgMatch) imageWrapper.style.backgroundImage = `url(${imgMatch[1]})`;
          imageWrapper.style.backgroundSize = bgSizeMatch ? bgSizeMatch[1].trim() : 'cover';
          imageWrapper.style.backgroundPosition = posMatch ? posMatch[1].trim() : 'center';
        }
        
        // Show image label
        if (imageLabelEl) {
          imageLabelEl.style.opacity = '1';
        }
        
        // After short delay, fade in collapsed content
        setTimeout(() => {
          collapsedContent.style.opacity = '1';
          collapsedContent.style.pointerEvents = 'auto';
          detailState = 'collapsed';
          container.setAttribute('data-til-detail-state', 'collapsed');
          isAnimating = false;
        }, 300);
      }

      // Function to switch to different section (Carousel-style slide - whole content area)
      function switchToIndex(targetIndex) {
        if (targetIndex === currentIndex || isAnimating) return;
        if (targetIndex < 0 || targetIndex >= items.length) return;
        isAnimating = true;

        const item = items[targetIndex];
        const theme = sectionId === 'safety' || sectionId === 'innovation' ? 'dark' : 'light';
        
        // Determine slide direction based on index relationship
        const slideDirection = targetIndex > currentIndex ? 'left' : 'right';
        const slideDistance = slideDirection === 'left' ? -100 : 100;
        
        // Get the active content layer (collapsed or detail)
        const activeContent = detailState === 'expanded' ? detailContent : collapsedContent;
        
        // Phase 1: Slide out current content and image together
        activeContent.style.transition = 'transform 0.45s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.45s ease';
        activeContent.style.transform = `translateX(${-slideDistance}%)`;
        activeContent.style.opacity = '0';
        
        rightWrapper.style.transition = 'transform 0.45s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.45s ease';
        rightWrapper.style.transform = `translateX(${-slideDistance}%)`;
        rightWrapper.style.opacity = '0';
        
        // Phase 2: Update content while off-screen
        setTimeout(() => {
          // Update text content
          titleEl.textContent = item.title || '';
          descEl.textContent = item.description || '';
          if (imageLabelEl) imageLabelEl.textContent = item.imageLabel || '';
          
          // Update data attributes
          const hasItemsArray = container.getAttribute('data-til-has-items') === 'true';
          const itemPath = hasItemsArray ? `${sectionId}.items.${targetIndex}` : sectionId;
          titleEl.setAttribute('data-material', `${itemPath}.title`);
          descEl.setAttribute('data-material', `${itemPath}.description`);
          if (imageLabelEl) imageLabelEl.setAttribute('data-material', `${itemPath}.imageLabel`);
          imageWrapper.setAttribute('data-material-img', `${itemPath}.images.main`);
          
          // Update detail content
          if (detailTitleEl) detailTitleEl.textContent = item.title || '';
          if (detailTextEl) {
            const detailHtml = Array.isArray(item.detailBlocks) && item.detailBlocks.length > 0
              ? window.TemplateRegistry.render('detailBlocks', sectionId, { detailBlocks: item.detailBlocks }, material)
              : (item.detail || 'Detail content goes here.');
            detailTextEl.innerHTML = detailHtml;
          }
          
          // Update image content
          updateImageContent(item, targetIndex);
          
          // Update button states
          container.setAttribute('data-til-active-index', String(targetIndex));
          updateButtonStates(targetIndex, theme);
          
          // Position content for slide in from opposite side
          activeContent.style.transition = 'none';
          activeContent.style.transform = `translateX(${slideDistance}%)`;
          activeContent.style.opacity = '0';
          
          rightWrapper.style.transition = 'none';
          rightWrapper.style.transform = `translateX(${slideDistance}%)`;
          rightWrapper.style.opacity = '0';
          
          // Force reflow
          void activeContent.offsetWidth;
          
          // Phase 3: Slide in new content
          requestAnimationFrame(() => {
            activeContent.style.transition = 'transform 0.45s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.45s ease';
            activeContent.style.transform = 'translateX(0)';
            activeContent.style.opacity = '1';
            
            rightWrapper.style.transition = 'transform 0.45s cubic-bezier(0.4, 0.0, 0.2, 1), opacity 0.45s ease';
            rightWrapper.style.transform = 'translateX(0)';
            rightWrapper.style.opacity = '1';
          });
          
          currentIndex = targetIndex;
          
          // Cleanup
          setTimeout(() => {
            activeContent.style.transition = '';
            activeContent.style.transform = '';
            activeContent.style.opacity = '';
            rightWrapper.style.transition = '';
            rightWrapper.style.transform = '';
            rightWrapper.style.opacity = '';
            isAnimating = false;
            
            // Render LaTeX if in detail state
            if (detailState === 'expanded' && window.LatexRenderer && window.LatexRenderer.renderAll) {
              window.LatexRenderer.renderAll();
            }
          }, 480);
        }, 450);
      }
      
      // Helper function to update image content
      function updateImageContent(item, targetIndex) {
        // Get image URL from multiple sources
        let imgUrl = item.imgUrl;
        
        // If empty, try to get from material
        if (!imgUrl && material) {
          const hasItemsArray = container.getAttribute('data-til-has-items') === 'true';
          const itemPath = hasItemsArray ? `${sectionId}.items.${targetIndex}` : sectionId;
          const imgPath = `${itemPath}.images.main`;
          imgUrl = getImageUrl(imgPath, material);
        }
        
        console.log('[TIL] updateImageContent - targetIndex:', targetIndex, 'imgUrl:', imgUrl);
        
        const isVideo = item.isVideo || (imgUrl && isVideoUrl(imgUrl));
        
        if (isVideo && imgUrl) {
          let video = imageWrapper.querySelector('video');
          if (video) {
            video.src = imgUrl;
            video.style.display = '';
          } else {
            video = document.createElement('video');
            video.src = imgUrl;
            video.className = 'absolute inset-0 w-full h-full object-cover z-0';
            video.setAttribute('autoplay', '');
            video.setAttribute('muted', '');
            video.setAttribute('loop', '');
            video.setAttribute('playsinline', '');
            video.setAttribute('preload', 'metadata');
            video.setAttribute('data-material-video', 'true');
            imageWrapper.insertBefore(video, imageWrapper.firstChild);
          }
          imageWrapper.style.backgroundImage = '';
          imageWrapper.style.backgroundSize = '';
          imageWrapper.style.backgroundPosition = '';
        } else {
          const video = imageWrapper.querySelector('video');
          if (video) video.style.display = 'none';
          
          // Set background image
          if (imgUrl) {
            imageWrapper.style.backgroundImage = `url(${imgUrl})`;
            // Update data-material-img attribute for expandDetail to use
            const hasItemsArray = container.getAttribute('data-til-has-items') === 'true';
            const materialPath = hasItemsArray ? `${sectionId}.items.${targetIndex}.images.main` : `${sectionId}.images.main`;
            imageWrapper.setAttribute('data-material-img', materialPath);
          } else {
            imageWrapper.style.backgroundImage = '';
          }
          
          if (item.bgStyle) {
            const bgSizeMatch = item.bgStyle.match(/background-size:\s*([^;]+)/);
            const posMatch = item.bgStyle.match(/background-position:\s*([^;]+)/);
            imageWrapper.style.backgroundSize = bgSizeMatch ? bgSizeMatch[1].trim() : 'cover';
            imageWrapper.style.backgroundPosition = posMatch ? posMatch[1].trim() : 'center';
          } else {
            imageWrapper.style.backgroundSize = 'cover';
            imageWrapper.style.backgroundPosition = 'center';
          }
        }
      }
      
      // Helper function to check if URL is video
      function isVideoUrl(url) {
        if (!url || typeof url !== 'string') return false;
        if (url.startsWith('data:video/')) return true;
        const cleanUrl = url.split('?')[0].toLowerCase();
        return /\.(mp4|webm|ogg|mov|m4v)$/.test(cleanUrl);
      }
      
      // Helper function to get image URL from material
      function getImageUrl(path, material) {
        if (!path || !material) return '';
        const parts = path.split('.');
        let value = material;
        for (const part of parts) {
          if (value && typeof value === 'object') {
            value = value[part];
          } else {
            return '';
          }
        }
        return typeof value === 'string' ? value : '';
      }
      
      // Helper function to update button states
      function updateButtonStates(targetIndex, theme) {
        switcherBtns.forEach((btn) => {
          const idx = parseInt(btn.getAttribute('data-til-index'), 10);
          const isActive = idx === targetIndex;
          btn.classList.toggle('til-switcher-btn--active', isActive);
          if (theme === 'dark') {
            btn.classList.toggle('bg-white', isActive);
            btn.classList.toggle('text-black', isActive);
            btn.classList.toggle('border-white', isActive);
            btn.classList.remove('bg-black', 'border-black');
            btn.classList.toggle('bg-transparent', !isActive);
            btn.classList.toggle('text-white', !isActive);
            btn.classList.toggle('border-white/30', !isActive);
          } else {
            btn.classList.toggle('bg-black', isActive);
            btn.classList.toggle('text-white', isActive);
            btn.classList.toggle('border-black', isActive);
            btn.classList.remove('bg-white', 'border-white');
            btn.classList.toggle('bg-transparent', !isActive);
            btn.classList.toggle('text-text-primaryLight', !isActive);
            btn.classList.toggle('border-black/20', !isActive);
          }
        });
      }

      // Event listeners
      if (learnMoreBtn) {
        learnMoreBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          expandDetail();
        });
      }

      if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          collapseDetail();
        });
      }

      switcherBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const targetIndex = parseInt(btn.getAttribute('data-til-index'), 10);
          switchToIndex(targetIndex);
        });
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

  function clampDetailShrinkRatio(value) {
    return Math.max(20, Math.min(100, Math.round(Number(value))));
  }

  function initializeDetailShrinkControls() {
    document.querySelectorAll('[data-detail-shrink-path]').forEach(wrapEl => {
      if (wrapEl.querySelector('.detail-shrink-controls')) return;

      const shrinkPath = wrapEl.getAttribute('data-detail-shrink-path');
      if (!shrinkPath) return;

      const fullPath = `${pageKey}.${shrinkPath}`;
      const savedRatio = Number(getNestedValue(material, fullPath));
      const currentRatio = Number.isFinite(savedRatio) ? clampDetailShrinkRatio(savedRatio) : 60;

      const controls = document.createElement('div');
      controls.className = 'detail-shrink-controls edit-mode-only';
      controls.innerHTML = `
        <label>Banner height</label>
        <input type="range" min="20" max="100" step="1" value="${currentRatio}" data-detail-shrink="input" title="Detail banner height ratio">
        <span class="detail-shrink-value" data-detail-shrink="value">${currentRatio}%</span>
        <button class="reset-btn" data-detail-shrink="reset">Reset</button>
      `;

      controls.addEventListener('click', (e) => e.stopPropagation());
      controls.addEventListener('mouseenter', (e) => e.stopPropagation());

      const ratioInput = controls.querySelector('[data-detail-shrink="input"]');
      const ratioValue = controls.querySelector('[data-detail-shrink="value"]');
      const resetBtn = controls.querySelector('[data-detail-shrink="reset"]');

      function applyShrinkRatio(ratio) {
        const safe = clampDetailShrinkRatio(ratio);
        wrapEl.style.setProperty('--detail-banner-shrink-ratio', String(safe));
      }

      function saveShrinkRatio(ratio) {
        if (!material) return;
        const safe = clampDetailShrinkRatio(ratio);
        if (window.ModeManager && window.ModeManager.captureSnapshot) {
          window.ModeManager.captureSnapshot();
        }
        setNestedValue(material, fullPath, safe);
        if (window.ModeManager) {
          window.ModeManager.updateMaterialInMemory(material);
          const state = window.ModeManager.getState();
          if (state.dataMode === 'online') {
            window.ModeManager.patchMaterial(fullPath, safe);
          }
        }
      }

      ratioInput.addEventListener('input', () => {
        const ratio = clampDetailShrinkRatio(parseInt(ratioInput.value, 10));
        ratioValue.textContent = `${ratio}%`;
        applyShrinkRatio(ratio);
      });

      ratioInput.addEventListener('change', () => {
        const ratio = clampDetailShrinkRatio(parseInt(ratioInput.value, 10));
        ratioInput.value = String(ratio);
        ratioValue.textContent = `${ratio}%`;
        saveShrinkRatio(ratio);
      });

      resetBtn.addEventListener('click', () => {
        ratioInput.value = '60';
        ratioValue.textContent = '60%';
        applyShrinkRatio(60);
        saveShrinkRatio(60);
      });

      wrapEl.appendChild(controls);
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
