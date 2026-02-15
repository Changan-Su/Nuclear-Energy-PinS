/**
 * Editor System - Inline content editing, section management, import/export
 * Works in both offline and online edit modes
 */

window.EditorSystem = (function() {
  'use strict';

  let enabled = false;
  let editToolbar = null;
  let editorSidebar = null;
  let sectionObserver = null;
  let jsZipLoaderPromise = null;
  let detailBannerTogglesTimeoutId = null;

  function enable() {
    if (enabled) return;
    enabled = true;
    
    // Add edit-mode class to body for CSS visibility control
    document.body.classList.add('edit-mode');
    
    createEditToolbar();
    createEditorSidebar();
    setupSectionObserver();
    enableInlineEditing();
    enableSectionToolbars();
    enableImageEditing();
    enableFlipToggles();
    enableInteractiveDetailsAnimationSelector();
    // Run immediately (controls may already exist) and again after 150ms so all details
    // (tabbed, card-grid, text-image, accordion) get toggle in bar after position controls mount
    enableDetailBannerToggles();
    if (detailBannerTogglesTimeoutId) clearTimeout(detailBannerTogglesTimeoutId);
    detailBannerTogglesTimeoutId = setTimeout(() => {
      detailBannerTogglesTimeoutId = null;
      if (enabled) enableDetailBannerToggles();
      if (window.lucide) window.lucide.createIcons();
    }, 150);
    enableCollectionEditors();
    enableReferenceEditing();
    setupAtMentionSystem();
    setupSlashCommandSystem();
    setupCitationClickHandlers();
    initMediaResizeHandlers();
  }

  function disable() {
    if (!enabled) return;
    enabled = false;
    if (detailBannerTogglesTimeoutId) {
      clearTimeout(detailBannerTogglesTimeoutId);
      detailBannerTogglesTimeoutId = null;
    }
    
    // Remove edit-mode class from body
    document.body.classList.remove('edit-mode');
    
    removeEditToolbar();
    removeEditorSidebar();
    cleanupSectionObserver();
    disableInlineEditing();
    disableSectionToolbars();
    disableImageEditing();
    disableFlipToggles();
    disableInteractiveDetailsAnimationSelector();
    disableDetailBannerToggles();
    disableCollectionEditors();
    disableReferenceEditing();
    cleanupAtMentionSystem();
    cleanupSlashCommandSystem();
    removeCitationClickHandlers();
  }

  function createEditToolbar() {
    if (editToolbar) return;
    
    const toolbar = document.createElement('div');
    toolbar.id = 'edit-toolbar';
    toolbar.className = 'fixed top-[52px] left-0 right-0 z-40 bg-surface-dark/95 backdrop-blur-md border-b border-white/10 py-3 px-6';
    toolbar.innerHTML = `
      <div class="max-w-[1440px] mx-auto flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button id="add-section-btn" class="px-4 py-2 rounded-lg bg-accent-blue text-white text-sm font-medium hover:bg-blue-600 transition-colors flex items-center gap-2">
            <i data-lucide="plus" class="w-4 h-4"></i>
            Add Section
          </button>
          <button id="save-all-btn" class="px-4 py-2 rounded-lg border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2">
            <i data-lucide="save" class="w-4 h-4"></i>
            Save All
          </button>
          <button id="undo-all-btn" class="px-4 py-2 rounded-lg border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2">
            <i data-lucide="undo-2" class="w-4 h-4"></i>
            Undo
          </button>
          <button id="redo-all-btn" class="px-4 py-2 rounded-lg border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2">
            <i data-lucide="redo-2" class="w-4 h-4"></i>
            Redo
          </button>
          <button id="discard-btn" class="px-4 py-2 rounded-lg border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2">
            <i data-lucide="x" class="w-4 h-4"></i>
            Discard
          </button>
        </div>
        
        <div class="flex items-center gap-4">
          <div id="folder-status" class="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-white/60 hidden items-center gap-2">
            <i data-lucide="folder" class="w-3.5 h-3.5"></i>
            <span id="folder-name">No folder selected</span>
          </div>
          <button id="select-folder-btn" class="px-4 py-2 rounded-lg border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2">
            <i data-lucide="folder-open" class="w-4 h-4"></i>
            Select Folder
          </button>
          <button id="export-btn" class="px-4 py-2 rounded-lg border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2">
            <i data-lucide="download" class="w-4 h-4"></i>
            Export
          </button>
          <button id="import-btn" class="px-4 py-2 rounded-lg border border-white/20 text-white text-sm font-medium hover:bg-white/10 transition-colors flex items-center gap-2">
            <i data-lucide="upload" class="w-4 h-4"></i>
            Import
          </button>
          <input type="file" id="import-input" accept=".zip,.json" class="hidden">
        </div>
      </div>
    `;
    
    document.body.appendChild(toolbar);
    editToolbar = toolbar;
    
    // Event listeners
    document.getElementById('add-section-btn')?.addEventListener('click', showAddSectionModal);
    document.getElementById('save-all-btn')?.addEventListener('click', saveAll);
    document.getElementById('undo-all-btn')?.addEventListener('click', () => window.ModeManager.undo());
    document.getElementById('redo-all-btn')?.addEventListener('click', () => window.ModeManager.redo());
    document.getElementById('discard-btn')?.addEventListener('click', discardChanges);
    document.getElementById('select-folder-btn')?.addEventListener('click', handleSelectFolder);
    document.getElementById('export-btn')?.addEventListener('click', exportMaterial);
    document.getElementById('import-btn')?.addEventListener('click', () => {
      document.getElementById('import-input')?.click();
    });
    document.getElementById('import-input')?.addEventListener('change', handleImport);
    
    // Update folder status display
    updateFolderStatusDisplay();
    
    // Reinitialize icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function removeEditToolbar() {
    if (editToolbar) {
      editToolbar.remove();
      editToolbar = null;
    }
  }

  function createEditorSidebar() {
    if (editorSidebar) return;
    
    const sidebar = document.createElement('div');
    sidebar.className = 'editor-sidebar';
    sidebar.id = 'editor-sidebar';
    
    document.body.appendChild(sidebar);
    editorSidebar = sidebar;
    
    updateSidebarContent();
  }

  function removeEditorSidebar() {
    if (editorSidebar) {
      editorSidebar.remove();
      editorSidebar = null;
    }
  }

  function updateSidebarContent() {
    if (!editorSidebar) return;
    
    const material = window.ModeManager.getMaterial();
    if (!material || !material.config || !material.config.sections) {
      editorSidebar.innerHTML = '<div class="text-white/50 text-sm p-4">No sections found</div>';
      return;
    }
    
    // Get all sections sorted by order
    const sections = [...material.config.sections].sort((a, b) => a.order - b.order);
    
    editorSidebar.innerHTML = sections.map(section => {
      const displayName = section.name || formatSectionId(section.id);
      const templateName = section.template.replace(/-/g, ' ');
      const disabledClass = section.enabled ? '' : 'disabled';
      
      return `
        <div class="sidebar-section-card ${disabledClass}" data-sidebar-section-id="${section.id}">
          <div class="sidebar-section-order">${section.order + 1}</div>
          <div class="sidebar-section-name" data-sidebar-name-id="${section.id}">${displayName}</div>
          <div class="sidebar-section-id text-white/55 text-xs" data-sidebar-id-value="${section.id}">ID: ${section.id}</div>
          <div class="sidebar-section-template">${templateName}</div>
        </div>
      `;
    }).join('');
    
    // Bind click handlers
    editorSidebar.querySelectorAll('.sidebar-section-card').forEach(card => {
      const sectionId = card.getAttribute('data-sidebar-section-id');
      
      // Click to scroll
      card.addEventListener('click', (e) => {
        // Don't scroll if we're editing the name
        if (e.target.hasAttribute('contenteditable') && e.target.getAttribute('contenteditable') === 'true') {
          return;
        }
        
        if (!card.classList.contains('disabled')) {
          smoothScrollToSection(sectionId);
        }
      });
      
      // Double-click name to edit
      const nameEl = card.querySelector('.sidebar-section-name');
      nameEl.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        if (card.classList.contains('disabled')) return;
        
        nameEl.contentEditable = 'true';
        nameEl.focus();
        
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(nameEl);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });
      
      // Save on blur
      nameEl.addEventListener('blur', (e) => {
        if (nameEl.getAttribute('contenteditable') === 'true') {
          nameEl.contentEditable = 'false';
          const newName = nameEl.textContent.trim();
          
          if (newName && newName !== '') {
            updateSectionName(sectionId, newName);
          } else {
            // Restore original name if empty
            const material = window.ModeManager.getMaterial();
            const section = material.config.sections.find(s => s.id === sectionId);
            if (section) {
              nameEl.textContent = section.name || formatSectionId(section.id);
            }
          }
        }
      });
      
      // Save on Enter key
      nameEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          nameEl.blur();
        }
      });

      // Double-click ID to edit
      const idEl = card.querySelector('.sidebar-section-id');
      idEl.addEventListener('dblclick', (e) => {
        e.stopPropagation();
        if (card.classList.contains('disabled')) return;

        const currentId = card.getAttribute('data-sidebar-section-id');
        idEl.textContent = currentId;
        idEl.contentEditable = 'true';
        idEl.focus();

        const range = document.createRange();
        range.selectNodeContents(idEl);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      });

      // Save section ID on blur
      idEl.addEventListener('blur', () => {
        if (idEl.getAttribute('contenteditable') !== 'true') return;
        idEl.contentEditable = 'false';

        const previousId = card.getAttribute('data-sidebar-section-id');
        const newId = idEl.textContent.trim();

        if (!newId) {
          idEl.textContent = `ID: ${previousId}`;
          return;
        }

        if (newId === previousId) {
          idEl.textContent = `ID: ${previousId}`;
          return;
        }

        const renamed = updateSectionId(previousId, newId);
        if (!renamed) {
          idEl.textContent = `ID: ${previousId}`;
        }
      });

      // Save section ID on Enter key
      idEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          idEl.blur();
        }
      });
    });
  }

  function updateSectionName(sectionId, newName) {
    if (window.ModeManager.captureSnapshot) {
      window.ModeManager.captureSnapshot();
    }
    
    const material = window.ModeManager.getMaterial();
    const section = material.config.sections.find(s => s.id === sectionId);
    
    if (section) {
      section.name = newName;
      window.ModeManager.updateMaterialInMemory(material);

      // Keep quick-jump labels in sync immediately.
      document.querySelectorAll(`.nav-link[data-section-id="${sectionId}"]`).forEach((link) => {
        link.textContent = newName;
      });
      const sidebarName = document.querySelector(`[data-sidebar-name-id="${sectionId}"]`);
      if (sidebarName) {
        sidebarName.textContent = newName;
      }
    }
  }

  function isValidSectionId(id) {
    return /^[A-Za-z][A-Za-z0-9_-]*$/.test(String(id || ''));
  }

  function updateSectionId(oldId, newId) {
    const trimmedNewId = String(newId || '').trim();
    if (trimmedNewId === oldId) return true;

    if (!isValidSectionId(trimmedNewId)) {
      alert('Invalid Section ID. Use letters, numbers, "_" or "-", and start with a letter.');
      return false;
    }

    const material = window.ModeManager.getMaterial();
    if (!material || !material.config || !Array.isArray(material.config.sections)) {
      return false;
    }

    const sections = material.config.sections;
    const section = sections.find(s => s.id === oldId);
    if (!section) return false;

    if (sections.some(s => s.id === trimmedNewId)) {
      alert('Section with this ID already exists');
      return false;
    }

    if (window.ModeManager.captureSnapshot) {
      window.ModeManager.captureSnapshot();
    }

    if (material.index && Object.prototype.hasOwnProperty.call(material.index, oldId)) {
      material.index[trimmedNewId] = material.index[oldId];
      delete material.index[oldId];
    }

    section.id = trimmedNewId;
    window.ModeManager.updateMaterialInMemory(material);
    window.SectionRenderer.render();
    refresh();
    return true;
  }

  function formatSectionId(id) {
    // Convert camelCase or dash-case to Title Case
    return id
      .replace(/([A-Z])/g, ' $1')
      .replace(/[-_]/g, ' ')
      .trim()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  function smoothScrollToSection(sectionId) {
    const targetSection = document.querySelector(`#app > [data-section-id="${sectionId}"]`);
    if (!targetSection) return;
    
    // Calculate offset: navbar (52px) + edit toolbar (~56px) + padding (20px)
    const navHeight = 52;
    const toolbarHeight = 56;
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

  function setupSectionObserver() {
    if (sectionObserver) {
      cleanupSectionObserver();
    }
    
    // Create intersection observer to track visible sections
    const options = {
      root: null,
      rootMargin: '-100px 0px -66% 0px', // Top section wins
      threshold: 0
    };
    
    sectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.getAttribute('data-section-id');
          if (sectionId && sectionId !== 'footer') {
            setActiveSection(sectionId);
          }
        }
      });
    }, options);
    
    // Observe all sections
    const sections = document.querySelectorAll('#app > [data-section-id]');
    sections.forEach(section => {
      const sectionId = section.getAttribute('data-section-id');
      if (sectionId !== 'footer') {
        sectionObserver.observe(section);
      }
    });
  }

  function cleanupSectionObserver() {
    if (sectionObserver) {
      sectionObserver.disconnect();
      sectionObserver = null;
    }
    
    // Clear active states
    document.querySelectorAll('.sidebar-section-card.active').forEach(card => {
      card.classList.remove('active');
    });
    document.querySelectorAll('.nav-link.active').forEach(link => {
      link.classList.remove('active');
    });
  }

  function setActiveSection(sectionId) {
    // Update sidebar cards
    document.querySelectorAll('.sidebar-section-card').forEach(card => {
      if (card.getAttribute('data-sidebar-section-id') === sectionId) {
        card.classList.add('active');
      } else {
        card.classList.remove('active');
      }
    });
    
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
      if (link.getAttribute('data-section-id') === sectionId) {
        link.classList.add('active');
      } else {
        link.classList.remove('active');
      }
    });
  }

  function enableInlineEditing() {
    const elements = document.querySelectorAll('[data-material]');
    elements.forEach(el => {
      if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') {
        el.contentEditable = 'true';
        el.classList.add('editable-field');
        el.style.outline = '1px dashed rgba(34, 211, 238, 0.3)';
        el.style.cursor = 'text';
        
        el.addEventListener('blur', handleTextEdit);
      }
    });
  }

  function disableInlineEditing() {
    const elements = document.querySelectorAll('[data-material]');
    elements.forEach(el => {
      el.contentEditable = 'false';
      el.classList.remove('editable-field');
      el.style.outline = '';
      el.style.cursor = '';
      el.removeEventListener('blur', handleTextEdit);
    });
  }

  function handleTextEdit(event) {
    const el = event.target;
    const path = el.getAttribute('data-material');
    if (!path) return;
    
    // Preserve HTML when element is citation-capable or already contains citations
    const canContainRefs = el.hasAttribute('data-ref-content') || !!el.querySelector('.ref-cite');
    const newValue = canContainRefs ? el.innerHTML.trim() : el.textContent.trim();
    
    if (window.ModeManager.captureSnapshot) {
      window.ModeManager.captureSnapshot();
    }

    // Update material
    const material = window.ModeManager.getMaterial();
    updateMaterialByPath(material, `index.${path}`, newValue);
    window.ModeManager.updateMaterialInMemory(material);
    
    // If online, patch to server
    const state = window.ModeManager.getState();
    if (state.dataMode === 'online') {
      window.ModeManager.patchMaterial(`index.${path}`, newValue);
    }
  }

  function enableImageEditing() {
    // Exclude detail panel media so clicking banner/end image does not open upload.
    const images = document.querySelectorAll('[data-material-img]:not([data-detail-media="true"])');
    images.forEach(img => {
      img.style.position = 'relative';
      img.style.cursor = 'pointer';
      
      const overlay = document.createElement('div');
      overlay.className = 'image-edit-overlay';
      overlay.style.cssText = 'position: absolute; inset: 0; z-index: 20; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.3s; cursor: pointer;';
      overlay.innerHTML = '<i data-lucide="camera" class="w-8 h-8 text-white"></i>';
      
      if (img.style.position !== 'absolute' && img.style.position !== 'fixed') {
        img.style.position = 'relative';
      }
      
      img.appendChild(overlay);
      
      img.addEventListener('mouseenter', () => {
        overlay.style.opacity = '1';
      });
      
      img.addEventListener('mouseleave', () => {
        overlay.style.opacity = '0';
      });
      
      overlay.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleImageClick(img);
      });
      
      if (window.lucide) {
        window.lucide.createIcons();
      }
    });
  }

  function disableImageEditing() {
    const overlays = document.querySelectorAll('.image-edit-overlay');
    overlays.forEach(overlay => overlay.remove());
  }

  function enableFlipToggles() {
    const flipCards = document.querySelectorAll('[data-flip-configurable="true"]');
    flipCards.forEach(card => {
      if (card.querySelector('.flip-config-controls')) return;

      const flipPath = card.getAttribute('data-flip-path');
      const enabledPath = card.getAttribute('data-flip-enabled-path');
      const directionPath = card.getAttribute('data-flip-direction-path');
      if (!flipPath || !enabledPath || !directionPath) return;

      const currentEnabled = card.getAttribute('data-flip-enabled') === 'true';
      const currentDirection = card.getAttribute('data-flip-dir') === 'x' ? 'x' : 'y';

      const computedPos = window.getComputedStyle(card).position;
      if (computedPos === 'static') {
        card.style.position = 'relative';
      }

      const controls = document.createElement('div');
      controls.className = 'flip-config-controls';
      controls.innerHTML = `
        <button class="flip-config-btn ${currentEnabled ? 'active' : ''}" data-flip-action="toggle" title="Enable / Disable Learn More Details">
          <i data-lucide="book-open" class="w-4 h-4"></i>
        </button>
        <button class="flip-config-btn ${currentDirection === 'y' ? 'active' : ''}" data-flip-action="dir-y" title="Left / Right Flip">
          <i data-lucide="flip-horizontal-2" class="w-4 h-4"></i>
        </button>
        <button class="flip-config-btn ${currentDirection === 'x' ? 'active' : ''}" data-flip-action="dir-x" title="Up / Down Flip">
          <i data-lucide="flip-vertical-2" class="w-4 h-4"></i>
        </button>
      `;

      controls.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const btn = event.target.closest('[data-flip-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-flip-action');

        if (window.ModeManager.captureSnapshot) {
          window.ModeManager.captureSnapshot();
        }

        if (action === 'toggle') {
          setFlipConfigValue(enabledPath, !currentEnabled);
        } else if (action === 'dir-y') {
          setFlipConfigValue(directionPath, 'y');
        } else if (action === 'dir-x') {
          setFlipConfigValue(directionPath, 'x');
        }

        if (window.SectionRenderer && window.SectionRenderer.render) {
          window.SectionRenderer.render();
        }
        refresh();
      });

      card.appendChild(controls);
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function disableFlipToggles() {
    document.querySelectorAll('.flip-config-controls').forEach(el => el.remove());
  }

  function enableInteractiveDetailsAnimationSelector() {
    const containers = document.querySelectorAll('.id-detail-container');
    
    containers.forEach(container => {
      if (container.querySelector('.id-animation-selector')) return;

      const currentAnimation = container.getAttribute('data-animation') || 'flip-y';
      
      const selector = document.createElement('div');
      selector.className = 'id-animation-selector edit-mode-only';
      selector.innerHTML = `
        <button class="id-anim-btn ${currentAnimation === 'flip-y' ? 'active' : ''}" data-anim="flip-y" title="Y轴翻转">
          <span style="display:inline-block;transform:rotateY(30deg)">⟲</span>
        </button>
        <button class="id-anim-btn ${currentAnimation === 'flip-x' ? 'active' : ''}" data-anim="flip-x" title="X轴翻转">
          <span style="display:inline-block;transform:rotateX(30deg)">⟲</span>
        </button>
        <button class="id-anim-btn ${currentAnimation === 'cube-y' ? 'active' : ''}" data-anim="cube-y" title="立方体Y轴">
          <span style="display:inline-block;">🔄</span>
        </button>
        <button class="id-anim-btn ${currentAnimation === 'cube-x' ? 'active' : ''}" data-anim="cube-x" title="立方体X轴">
          <span style="display:inline-block;transform:rotate(90deg)">🔄</span>
        </button>
      `;
      
      selector.querySelectorAll('.id-anim-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const animType = btn.getAttribute('data-anim');
          container.setAttribute('data-animation', animType);
          
          // Update active state
          selector.querySelectorAll('.id-anim-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
        });
      });
      
      container.appendChild(selector);
    });
  }

  function disableInteractiveDetailsAnimationSelector() {
    document.querySelectorAll('.id-animation-selector').forEach(el => el.remove());
  }

  function enableDetailBannerToggles() {
    // All details (tabbed-content, card-grid, text-image-left/right, accordion) use the same panel + bar
    const detailPanels = document.querySelectorAll('[data-detail-banner-configurable="true"]');
    detailPanels.forEach(panel => {
      const bannerPath = panel.getAttribute('data-detail-banner-path');
      if (!bannerPath) return;
      const currentEnabled = panel.getAttribute('data-detail-banner-enabled') !== 'false';

      // Prefer: put toggle in the same bar as position/scale (on detail-banner-media)
      const bannerMedia = panel.querySelector('.detail-banner-media');
      const positionBar = bannerMedia ? bannerMedia.querySelector('.img-position-controls') : null;

      if (positionBar && !positionBar.querySelector('.detail-banner-toggle-wrap')) {
        panel.querySelector('.detail-banner-config-controls')?.remove();
        const wrap = document.createElement('div');
        wrap.className = 'detail-banner-toggle-wrap';
        wrap.innerHTML = `
          <button type="button" class="img-position-banner-btn ${currentEnabled ? 'active' : ''}" data-detail-banner-action="toggle" title="Show / Hide Banner">
            <i data-lucide="image" class="w-4 h-4"></i>
          </button>
          <div class="divider"></div>
        `;
        positionBar.insertBefore(wrap, positionBar.firstChild);

        wrap.addEventListener('click', (event) => {
          const btn = event.target.closest('[data-detail-banner-action="toggle"]');
          if (!btn) return;
          event.preventDefault();
          event.stopPropagation();
          if (window.ModeManager.captureSnapshot) window.ModeManager.captureSnapshot();
          setFlipConfigValue(bannerPath, !currentEnabled);
          if (window.SectionRenderer && window.SectionRenderer.render) window.SectionRenderer.render();
          refresh();
        });
      } else if (!positionBar && !panel.querySelector('.detail-banner-config-controls')) {
        // Fallback: floating button when banner is hidden (no .detail-banner-media)
        const computedPos = window.getComputedStyle(panel).position;
        if (computedPos === 'static') panel.style.position = 'relative';
        const controls = document.createElement('div');
        controls.className = 'flip-config-controls detail-banner-config-controls';
        controls.innerHTML = `
          <button class="flip-config-btn ${currentEnabled ? 'active' : ''}" data-detail-banner-action="toggle" title="Show / Hide Details Banner">
            <i data-lucide="image" class="w-4 h-4"></i>
          </button>
        `;
        controls.addEventListener('click', (event) => {
          const btn = event.target.closest('[data-detail-banner-action="toggle"]');
          if (!btn) return;
          event.preventDefault();
          event.stopPropagation();
          if (window.ModeManager.captureSnapshot) window.ModeManager.captureSnapshot();
          setFlipConfigValue(bannerPath, !currentEnabled);
          if (window.SectionRenderer && window.SectionRenderer.render) window.SectionRenderer.render();
          refresh();
        });
        panel.appendChild(controls);
      }
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function disableDetailBannerToggles() {
    document.querySelectorAll('.detail-banner-toggle-wrap').forEach(el => el.remove());
    document.querySelectorAll('.detail-banner-config-controls').forEach(el => el.remove());
  }

  const collectionEditorConfig = {
    'tabbed-content': {
      collectionType: 'tabbed-content',
      path: 'highlights.items',
      addLabel: 'Add Tab',
      minItems: 1
    },
    'card-grid': {
      collectionType: 'card-grid',
      path: 'features.cards',
      addLabel: 'Add Card',
      minItems: 1
    },
    'accordion': {
      collectionType: 'accordion',
      path: 'closerLook.features',
      addLabel: 'Add Item',
      minItems: 1
    },
    'interactive-details': {
      collectionType: 'interactive-details',
      addLabel: 'Add Item',
      minItems: 1
    }
  };

  function enableCollectionEditors() {
    const sectionWrappers = document.querySelectorAll('[data-section-id][data-template]');
    sectionWrappers.forEach(section => {
      const template = section.getAttribute('data-template');
      const config = collectionEditorConfig[template];
      if (!config) return;

      const container = section.querySelector(`[data-collection-container="true"][data-collection-type="${config.collectionType}"]`);
      // Prefer dynamic path from DOM attribute, fall back to static config path
      const collectionPath = (container && container.getAttribute('data-collection-path')) || config.path;
      if (container && !container.querySelector('.collection-add-btn')) {
        const addBtn = document.createElement('button');
        addBtn.className = 'collection-add-btn edit-mode-only px-3 py-1.5 rounded-full border border-white/20 text-white/85 text-xs font-medium hover:bg-white/10 transition-colors flex items-center gap-1.5';
        addBtn.innerHTML = `<i data-lucide="plus" class="w-3.5 h-3.5"></i>${config.addLabel}`;
        addBtn.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          handleAddCollectionItem(template, collectionPath);
        });
        container.appendChild(addBtn);
      }

      const items = section.querySelectorAll(`[data-collection-item="true"][data-collection-type="${config.collectionType}"]`);
      items.forEach(item => {
        if (item.querySelector('.collection-delete-btn')) return;

        const computedPos = window.getComputedStyle(item).position;
        if (computedPos === 'static') {
          item.style.position = 'relative';
        }

        const index = item.getAttribute('data-item-index');
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'collection-delete-btn edit-mode-only absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/65 text-white hover:bg-red-500/80 transition-colors flex items-center justify-center z-30';
        deleteBtn.setAttribute('title', 'Delete item');
        deleteBtn.setAttribute('data-delete-index', index || '0');
        deleteBtn.innerHTML = '<i data-lucide="trash-2" class="w-3.5 h-3.5"></i>';
        deleteBtn.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          const itemIndex = parseInt(deleteBtn.getAttribute('data-delete-index'), 10);
          handleDeleteCollectionItem(template, collectionPath, itemIndex, config.minItems);
        });
        item.appendChild(deleteBtn);
      });
    });

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function disableCollectionEditors() {
    document.querySelectorAll('.collection-add-btn, .collection-delete-btn').forEach(el => el.remove());
  }

  function getValueByPath(obj, path) {
    if (!obj || !path) return undefined;
    return path.split('.').reduce((current, key) => (current == null ? undefined : current[key]), obj);
  }

  function ensureHighlightsItemsArray(material) {
    const existing = getValueByPath(material, 'index.highlights.items');
    if (Array.isArray(existing)) return existing;

    const highlights = material?.index?.highlights || {};
    const legacyKeys = ['efficiency', 'zeroCarbon', 'safety', 'reliability'];
    const tabs = Array.isArray(highlights.tabs) ? highlights.tabs : [];

    const migrated = legacyKeys
      .map((legacyKey, idx) => {
        const source = highlights[legacyKey];
        if (!source) return null;
        return {
          tab: tabs[idx] || source.title || `Tab ${idx + 1}`,
          title: source.title || '',
          description: source.description || '',
          cta: source.cta || 'Learn more',
          detail: source.detail || '',
          showDetailBanner: source.showDetailBanner !== false,
          flipEnabled: source.flipEnabled !== false,
          flipDirection: source.flipDirection || 'y',
          images: source.images || {}
        };
      })
      .filter(Boolean);

    updateMaterialByPath(material, 'index.highlights.items', migrated);
    return migrated;
  }

  function ensureCollectionArray(material, template, path) {
    const fullPath = `index.${path}`;
    let list = getValueByPath(material, fullPath);
    if (template === 'tabbed-content' && !Array.isArray(list)) {
      list = ensureHighlightsItemsArray(material);
    }
    if (!Array.isArray(list)) {
      list = [];
      updateMaterialByPath(material, fullPath, list);
    }
    return list;
  }

  function createDefaultCollectionItem(template, currentCount) {
    const nextIndex = currentCount + 1;
    if (template === 'tabbed-content') {
      return {
        tab: `New Tab ${nextIndex}`,
        title: `New Topic ${nextIndex}`,
        description: 'Edit this tab description.',
        cta: 'Learn more',
        detail: 'Add detail content here.',
        showDetailBanner: true,
        flipEnabled: true,
        flipDirection: 'y',
        images: { main: '' }
      };
    }

    if (template === 'card-grid') {
      return {
        title: `New Card ${nextIndex}`,
        description: 'Edit this card description.',
        detail: 'Add card detail content here.',
        showDetailBanner: true,
        cta: 'Learn more',
        flipEnabled: false,
        flipDirection: 'y',
        image: ''
      };
    }

    if (template === 'interactive-details') {
      return {
        title: `Topic ${nextIndex}`,
        description: 'A brief overview of this topic. Click to see full details on the right.',
        detail: 'Full detailed content goes here.\n\nYou can write **Markdown** content with multiple paragraphs, lists, and more.'
      };
    }

    return {
      title: `New Item ${nextIndex}`,
      description: 'Edit this accordion item description.',
      detail: 'Add accordion detail content here.',
      showDetailBanner: true,
      cta: 'Learn more',
      flipEnabled: false,
      flipDirection: 'y'
    };
  }

  function rerenderAfterCollectionChange(material) {
    window.ModeManager.updateMaterialInMemory(material);
    if (window.SectionRenderer && window.SectionRenderer.render) {
      window.SectionRenderer.render();
    }
    refresh();
  }

  function handleAddCollectionItem(template, path) {
    if (window.ModeManager.captureSnapshot) {
      window.ModeManager.captureSnapshot();
    }

    const material = window.ModeManager.getMaterial();
    const list = ensureCollectionArray(material, template, path);
    list.push(createDefaultCollectionItem(template, list.length));
    rerenderAfterCollectionChange(material);
  }

  function handleDeleteCollectionItem(template, path, index, minItems) {
    if (Number.isNaN(index)) return;

    const material = window.ModeManager.getMaterial();
    const list = ensureCollectionArray(material, template, path);

    if (list.length <= minItems) {
      alert(`At least ${minItems} item must remain.`);
      return;
    }
    if (index < 0 || index >= list.length) return;

    if (window.ModeManager.captureSnapshot) {
      window.ModeManager.captureSnapshot();
    }
    list.splice(index, 1);
    rerenderAfterCollectionChange(material);
  }

  function setFlipConfigValue(relativePath, value) {
    const material = window.ModeManager.getMaterial();
    updateMaterialByPath(material, `index.${relativePath}`, value);
    window.ModeManager.updateMaterialInMemory(material);

    const state = window.ModeManager.getState();
    if (state.dataMode === 'online') {
      window.ModeManager.patchMaterial(`index.${relativePath}`, value);
    }
  }

  function isVideoUrl(url) {
    if (!url || typeof url !== 'string') return false;
    if (url.startsWith('data:video/')) return true;
    const cleanUrl = url.split('?')[0].toLowerCase();
    return /\.(mp4|webm|ogg|mov|m4v)$/.test(cleanUrl);
  }

  function syncHeroMediaPlaceholder(element, hasMedia) {
    const path = element.getAttribute('data-material-img');
    if (path !== 'hero.images.videoCover') return;

    // Prefer explicit marker in template; fallback keeps older rendered DOM compatible.
    const placeholder =
      element.querySelector('[data-hero-media-placeholder="true"]') ||
      element.querySelector(':scope > .text-center');

    if (placeholder) {
      placeholder.classList.toggle('hidden', hasMedia);
    }
  }

  function applyMediaPreview(element, url) {
    const existingVideo = element.querySelector(':scope > video[data-material-video="true"]');
    const shouldRenderVideo = isVideoUrl(url);
    const hasMedia = Boolean(url);

    if (shouldRenderVideo) {
      element.style.backgroundImage = '';
      element.style.backgroundSize = '';
      element.style.backgroundPosition = '';

      let videoEl = existingVideo;
      if (!videoEl) {
        videoEl = document.createElement('video');
        videoEl.setAttribute('data-material-video', 'true');
        videoEl.autoplay = true;
        videoEl.muted = true;
        videoEl.loop = true;
        videoEl.playsInline = true;
        videoEl.preload = 'metadata';
        videoEl.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;z-index:0;';
        element.prepend(videoEl);
      }
      videoEl.src = url;
      syncHeroMediaPlaceholder(element, hasMedia);
      return;
    }

    if (existingVideo) {
      existingVideo.remove();
    }
    if (hasMedia) {
      element.style.backgroundImage = `url(${url})`;
      element.style.backgroundSize = 'cover';
      element.style.backgroundPosition = 'center';
    } else {
      element.style.backgroundImage = '';
      element.style.backgroundSize = '';
      element.style.backgroundPosition = '';
    }
    syncHeroMediaPlaceholder(element, hasMedia);
  }

  async function handleImageClick(imgElement) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,video/*';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const state = window.ModeManager.getState();
      
      if (state.dataMode === 'online') {
        // Upload to server
        const uploader = window.ModeManager.uploadMedia || window.ModeManager.uploadImage;
        const url = await uploader(file);
        if (url) {
          updateImageInMaterial(imgElement, url);
          applyMediaPreview(imgElement, url);
        } else {
          alert('Failed to upload media');
        }
      } else {
        // Convert to base64 for offline mode (supports both image and video)
        const reader = new FileReader();
        reader.onload = (e) => {
          const dataUrl = e.target.result;
          updateImageInMaterial(imgElement, dataUrl);
          applyMediaPreview(imgElement, dataUrl);
        };
        reader.readAsDataURL(file);
      }
    };
    
    input.click();
  }

  function updateImageInMaterial(imgElement, url) {
    const path = imgElement.getAttribute('data-material-img');
    if (!path) return;
    
    if (window.ModeManager.captureSnapshot) {
      window.ModeManager.captureSnapshot();
    }

    const material = window.ModeManager.getMaterial();
    updateMaterialByPath(material, `index.${path}`, url);
    window.ModeManager.updateMaterialInMemory(material);
    
    const state = window.ModeManager.getState();
    if (state.dataMode === 'online') {
      window.ModeManager.patchMaterial(`index.${path}`, url);
    }
  }

  function enableSectionToolbars() {
    const sections = document.querySelectorAll('[data-section-id]');
    sections.forEach(section => {
      if (section.getAttribute('data-section-id') === 'footer') return;
      
      const toolbar = createSectionToolbar(section);
      section.style.position = 'relative';
      section.appendChild(toolbar);
    });
  }

  function disableSectionToolbars() {
    const toolbars = document.querySelectorAll('.section-toolbar');
    toolbars.forEach(toolbar => toolbar.remove());
  }

  function createSectionToolbar(section) {
    const toolbar = document.createElement('div');
    toolbar.className = 'section-toolbar';
    toolbar.style.cssText = 'position: absolute; top: 20px; right: 20px; z-index: 30; display: flex; gap: 8px; background: rgba(0,0,0,0.8); backdrop-filter: blur(10px); padding: 8px; rounded: 12px; border: 1px solid rgba(255,255,255,0.1);';
    
    const sectionId = section.getAttribute('data-section-id');
    
    toolbar.innerHTML = `
      <button class="section-btn" data-action="move-up" title="Move Up">
        <i data-lucide="arrow-up" class="w-4 h-4 text-white"></i>
      </button>
      <button class="section-btn" data-action="move-down" title="Move Down">
        <i data-lucide="arrow-down" class="w-4 h-4 text-white"></i>
      </button>
      <button class="section-btn" data-action="toggle" title="Hide">
        <i data-lucide="eye-off" class="w-4 h-4 text-white"></i>
      </button>
      <button class="section-btn" data-action="delete" title="Delete">
        <i data-lucide="trash-2" class="w-4 h-4 text-white"></i>
      </button>
    `;
    
    toolbar.querySelectorAll('.section-btn').forEach(btn => {
      btn.style.cssText = 'padding: 6px; background: transparent; border: none; cursor: pointer; border-radius: 6px; transition: background 0.2s;';
      btn.addEventListener('mouseenter', () => {
        btn.style.background = 'rgba(255,255,255,0.1)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'transparent';
      });
      
      const action = btn.getAttribute('data-action');
      btn.addEventListener('click', () => handleSectionAction(sectionId, action, section));
    });
    
    if (window.lucide) {
      window.lucide.createIcons();
    }
    
    return toolbar;
  }

  function handleSectionAction(sectionId, action, sectionElement) {
    const material = window.ModeManager.getMaterial();
    const sections = material.config.sections;
    const index = sections.findIndex(s => s.id === sectionId);
    
    if (index === -1) return;
    
    switch (action) {
      case 'move-up':
        if (index > 0) {
          if (window.ModeManager.captureSnapshot) {
            window.ModeManager.captureSnapshot();
          }
          [sections[index], sections[index - 1]] = [sections[index - 1], sections[index]];
          sections.forEach((s, i) => s.order = i);
          window.ModeManager.updateMaterialInMemory(material);
          window.SectionRenderer.render();
          refresh(); // Re-bind editing after re-render
        }
        break;
        
      case 'move-down':
        if (index < sections.length - 1) {
          if (window.ModeManager.captureSnapshot) {
            window.ModeManager.captureSnapshot();
          }
          [sections[index], sections[index + 1]] = [sections[index + 1], sections[index]];
          sections.forEach((s, i) => s.order = i);
          window.ModeManager.updateMaterialInMemory(material);
          window.SectionRenderer.render();
          refresh();
        }
        break;
        
      case 'toggle':
        if (window.ModeManager.captureSnapshot) {
          window.ModeManager.captureSnapshot();
        }
        sections[index].enabled = !sections[index].enabled;
        window.ModeManager.updateMaterialInMemory(material);
        window.SectionRenderer.render();
        refresh();
        break;
        
      case 'delete':
        if (confirm(`Delete section "${sectionId}"?`)) {
          if (window.ModeManager.captureSnapshot) {
            window.ModeManager.captureSnapshot();
          }
          sections.splice(index, 1);
          sections.forEach((s, i) => s.order = i);
          window.ModeManager.updateMaterialInMemory(material);
          window.SectionRenderer.render();
          refresh();
        }
        break;
    }
  }

  // Generate SVG preview for each template type
  function generateTemplateSvg(templateName) {
    const baseStyle = 'stroke:#666; fill:#333; stroke-width:1.5';
    const lightFill = 'fill:#444';
    const accentFill = 'fill:#2563eb';
    
    const svgs = {
      'hero': `
        <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="180" fill="#1a1a1a"/>
          <rect x="20" y="120" width="280" height="40" rx="4" ${baseStyle}/>
          <rect x="220" y="130" width="70" height="8" rx="4" ${accentFill}/>
          <rect x="220" y="145" width="70" height="8" rx="4" stroke="#2563eb" fill="none" stroke-width="1.5"/>
          <circle cx="160" cy="70" r="25" ${baseStyle}/>
        </svg>
      `,
      'tabbed-content': `
        <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="180" fill="#1a1a1a"/>
          <rect x="20" y="20" width="50" height="12" rx="6" ${accentFill}/>
          <rect x="75" y="20" width="50" height="12" rx="6" ${baseStyle}/>
          <rect x="130" y="20" width="50" height="12" rx="6" ${baseStyle}/>
          <rect x="20" y="45" width="135" height="115" rx="4" ${baseStyle}/>
          <rect x="165" y="45" width="135" height="115" rx="4" ${lightFill}/>
          <rect x="175" y="60" width="70" height="6" rx="3" fill="#666"/>
          <rect x="175" y="75" width="100" height="4" rx="2" fill="#555"/>
        </svg>
      `,
      'card-grid': `
        <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="180" fill="#1a1a1a"/>
          <rect x="20" y="30" width="85" height="120" rx="4" ${baseStyle}/>
          <rect x="117" y="30" width="85" height="120" rx="4" ${baseStyle}/>
          <rect x="214" y="30" width="85" height="120" rx="4" ${baseStyle}/>
          <rect x="25" y="35" width="75" height="50" rx="2" ${lightFill}/>
          <rect x="122" y="35" width="75" height="50" rx="2" ${lightFill}/>
          <rect x="219" y="35" width="75" height="50" rx="2" ${lightFill}/>
        </svg>
      `,
      'text-image-left': `
        <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="180" fill="#1a1a1a"/>
          <rect x="20" y="40" width="110" height="100" rx="4" ${baseStyle}/>
          <rect x="25" y="50" width="60" height="8" rx="3" fill="#666"/>
          <rect x="25" y="65" width="90" height="4" rx="2" fill="#555"/>
          <rect x="25" y="74" width="85" height="4" rx="2" fill="#555"/>
          <rect x="150" y="40" width="150" height="100" rx="4" ${lightFill}/>
        </svg>
      `,
      'text-image-right': `
        <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="180" fill="#1a1a1a"/>
          <rect x="20" y="40" width="150" height="100" rx="4" ${lightFill}/>
          <rect x="190" y="40" width="110" height="100" rx="4" ${baseStyle}/>
          <rect x="195" y="50" width="60" height="8" rx="3" fill="#666"/>
          <rect x="195" y="65" width="90" height="4" rx="2" fill="#555"/>
          <rect x="195" y="74" width="85" height="4" rx="2" fill="#555"/>
        </svg>
      `,
      'accordion': `
        <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="180" fill="#1a1a1a"/>
          <rect x="20" y="40" width="100" height="100" rx="4" ${baseStyle}/>
          <rect x="25" y="50" width="60" height="6" rx="3" fill="#666"/>
          <rect x="25" y="65" width="60" height="6" rx="3" fill="#555"/>
          <rect x="25" y="80" width="60" height="6" rx="3" fill="#555"/>
          <rect x="25" y="95" width="60" height="6" rx="3" fill="#555"/>
          <rect x="140" y="40" width="160" height="100" rx="4" ${lightFill}/>
        </svg>
      `,
      'ai-chat': `
        <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="180" fill="#1a1a1a"/>
          <rect x="40" y="30" width="240" height="120" rx="8" ${baseStyle}/>
          <rect x="45" y="35" width="230" height="15" rx="2" fill="#222" stroke="#444" stroke-width="1"/>
          <rect x="50" y="60" width="120" height="20" rx="10" fill="#333" stroke="#555" stroke-width="1"/>
          <rect x="50" y="90" width="150" height="20" rx="10" fill="#2563eb" opacity="0.3"/>
          <rect x="45" y="130" width="200" height="12" rx="6" fill="#222" stroke="#444" stroke-width="1"/>
          <circle cx="260" cy="136" r="6" ${accentFill}/>
        </svg>
      `,
      'quiz': `
        <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="180" fill="#1a1a1a"/>
          <rect x="60" y="40" width="200" height="100" rx="8" ${baseStyle}/>
          <rect x="70" y="55" width="120" height="8" rx="3" fill="#666"/>
          <rect x="70" y="75" width="160" height="6" rx="3" fill="#444" stroke="#555" stroke-width="1"/>
          <rect x="70" y="90" width="160" height="6" rx="3" fill="#444" stroke="#555" stroke-width="1"/>
          <rect x="70" y="105" width="160" height="6" rx="3" fill="#444" stroke="#555" stroke-width="1"/>
          <rect x="70" y="120" width="60" height="10" rx="5" ${accentFill}/>
        </svg>
      `,
      'interactive-details': `
        <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="180" fill="#0a0a0a"/>
          <rect x="20" y="30" width="100" height="120" rx="4" fill="none"/>
          <rect x="24" y="38" width="55" height="7" rx="3" fill="#eee"/>
          <rect x="24" y="50" width="80" height="4" rx="2" fill="#555"/>
          <rect x="24" y="58" width="70" height="4" rx="2" fill="#555"/>
          <line x1="24" y1="70" x2="116" y2="70" stroke="#333" stroke-width="0.5"/>
          <rect x="24" y="78" width="50" height="7" rx="3" fill="#666"/>
          <line x1="24" y1="93" x2="116" y2="93" stroke="#333" stroke-width="0.5"/>
          <rect x="24" y="101" width="60" height="7" rx="3" fill="#666"/>
          <line x1="24" y1="116" x2="116" y2="116" stroke="#333" stroke-width="0.5"/>
          <rect x="24" y="124" width="45" height="7" rx="3" fill="#666"/>
          <rect x="140" y="30" width="160" height="120" rx="8" fill="#1a1a1a" stroke="#333" stroke-width="1"/>
          <rect x="155" y="48" width="80" height="8" rx="3" fill="#ccc"/>
          <rect x="155" y="64" width="24" height="2" rx="1" ${accentFill}/>
          <rect x="155" y="76" width="120" height="4" rx="2" fill="#555"/>
          <rect x="155" y="86" width="110" height="4" rx="2" fill="#444"/>
          <rect x="155" y="96" width="115" height="4" rx="2" fill="#444"/>
          <rect x="155" y="106" width="100" height="4" rx="2" fill="#444"/>
          <rect x="17" y="35" width="3" height="30" rx="1.5" fill="#3b82f6"/>
        </svg>
      `,
      'image-gallery': `
        <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="180" fill="#1a1a1a"/>
          <rect x="20" y="40" width="85" height="85" rx="4" ${lightFill}/>
          <rect x="117" y="40" width="85" height="85" rx="4" ${lightFill}/>
          <rect x="214" y="40" width="85" height="85" rx="4" ${lightFill}/>
          <circle cx="50" cy="70" r="8" fill="#555"/>
          <circle cx="147" cy="70" r="8" fill="#555"/>
          <circle cx="244" cy="70" r="8" fill="#555"/>
        </svg>
      `,
      'footer': `
        <svg viewBox="0 0 320 180" xmlns="http://www.w3.org/2000/svg">
          <rect width="320" height="180" fill="#1a1a1a"/>
          <line x1="20" y1="40" x2="300" y2="40" stroke="#444" stroke-width="1"/>
          <rect x="20" y="60" width="80" height="30" rx="2" ${baseStyle}/>
          <rect x="120" y="60" width="180" height="30" rx="2" ${baseStyle}/>
          <line x1="20" y1="110" x2="300" y2="110" stroke="#444" stroke-width="1"/>
          <rect x="20" y="125" width="100" height="4" rx="2" fill="#555"/>
          <rect x="200" y="125" width="100" height="4" rx="2" fill="#555"/>
        </svg>
      `
    };
    
    return svgs[templateName] || svgs['hero'];
  }

  function showAddSectionModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm';
    modal.id = 'add-section-modal';
    
    const templates = window.TemplateRegistry.getAll();
    
    // Generate template cards with SVG previews
    const templateCards = templates.map((t, index) => {
      const displayName = t.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      const svg = generateTemplateSvg(t);
      const isFirst = index === 0;
      
      return `
        <div class="asg-template-card ${isFirst ? 'selected' : ''}" 
             data-template="${t}" 
             role="button" 
             aria-selected="${isFirst}"
             tabindex="0">
          <div class="asg-template-preview">
            ${svg}
          </div>
          <div class="asg-template-name">${displayName}</div>
          <div class="asg-template-checkmark ${isFirst ? 'visible' : ''}">
            <i data-lucide="check" class="w-5 h-5"></i>
          </div>
        </div>
      `;
    }).join('');
    
    modal.innerHTML = `
      <div class="bg-surface-dark border border-white/10 rounded-[20px] p-6 max-w-2xl w-full mx-4 shadow-2xl">
        <h2 class="text-xl font-semibold text-white mb-4">Add New Section</h2>
        
        <div class="mb-4">
          <label class="block text-xs text-text-muted mb-1.5">Section ID</label>
          <input type="text" id="new-section-id" placeholder="e.g., newSection" class="w-full p-2 text-sm rounded-lg bg-surface-darker border border-white/10 text-white focus:border-accent-blue/50 focus:outline-none transition-colors">
        </div>
        
        <div class="mb-5">
          <label class="block text-xs text-text-muted mb-1.5">Template</label>
          <div class="asg-template-gallery">
            ${templateCards}
          </div>
        </div>
        
        <div class="flex gap-2.5">
          <button id="add-section-confirm" class="flex-1 px-4 py-2 text-sm rounded-full bg-accent-blue text-white font-medium hover:bg-blue-600 transition-colors">Add</button>
          <button id="add-section-cancel" class="flex-1 px-4 py-2 text-sm rounded-full border border-white/20 text-white font-medium hover:bg-white/10 transition-colors">Cancel</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add styles for template cards
    const style = document.createElement('style');
    style.textContent = `
      #add-section-modal .asg-template-gallery {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 10px;
        max-height: 280px;
        overflow-y: auto;
        padding-right: 6px;
      }
      
      #add-section-modal .asg-template-gallery {
        scrollbar-width: thin;
        scrollbar-color: rgba(255,255,255,0.2) transparent;
      }
      
      #add-section-modal .asg-template-gallery::-webkit-scrollbar {
        width: 6px;
      }
      
      #add-section-modal .asg-template-gallery::-webkit-scrollbar-track {
        background: transparent;
      }
      
      #add-section-modal .asg-template-gallery::-webkit-scrollbar-thumb {
        background: rgba(255,255,255,0.2);
        border-radius: 3px;
      }
      
      #add-section-modal .asg-template-card {
        position: relative;
        padding: 6px;
        background: rgba(255,255,255,0.03);
        border: 1.5px solid rgba(255,255,255,0.1);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      #add-section-modal .asg-template-card:hover {
        border-color: rgba(37,99,235,0.5);
        background: rgba(255,255,255,0.05);
        transform: translateY(-1px);
      }
      
      #add-section-modal .asg-template-card.selected {
        border-color: #2563eb;
        background: rgba(37,99,235,0.1);
      }
      
      #add-section-modal .asg-template-preview {
        width: 100%;
        aspect-ratio: 16/9;
        border-radius: 4px;
        overflow: hidden;
        margin-bottom: 4px;
        background: #0a0a0a;
      }
      
      #add-section-modal .asg-template-preview svg {
        width: 100%;
        height: 100%;
        display: block;
      }
      
      #add-section-modal .asg-template-name {
        text-align: center;
        color: #9ca3af;
        font-size: 10px;
        font-weight: 500;
        line-height: 1.2;
      }
      
      #add-section-modal .asg-template-card.selected .asg-template-name {
        color: #ffffff;
      }
      
      #add-section-modal .asg-template-checkmark {
        position: absolute;
        top: 8px;
        right: 8px;
        width: 18px;
        height: 18px;
        background: #2563eb;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0;
        transform: scale(0.8);
        transition: all 0.2s ease;
      }
      
      #add-section-modal .asg-template-checkmark.visible {
        opacity: 1;
        transform: scale(1);
      }
      
      #add-section-modal .asg-template-checkmark i {
        color: white;
        width: 12px;
        height: 12px;
      }
    `;
    document.head.appendChild(style);
    
    // Initialize Lucide icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
    
    // Handle template card selection
    const cards = modal.querySelectorAll('.asg-template-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        // Remove selection from all cards
        cards.forEach(c => {
          c.classList.remove('selected');
          c.setAttribute('aria-selected', 'false');
          c.querySelector('.asg-template-checkmark')?.classList.remove('visible');
        });
        
        // Add selection to clicked card
        card.classList.add('selected');
        card.setAttribute('aria-selected', 'true');
        card.querySelector('.asg-template-checkmark')?.classList.add('visible');
      });
      
      // Keyboard support
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });
    });
    
    // Handle confirm button
    document.getElementById('add-section-confirm').addEventListener('click', () => {
      const id = document.getElementById('new-section-id').value.trim();
      const selectedCard = modal.querySelector('.asg-template-card.selected');
      
      if (!id) {
        alert('Please enter a section ID');
        return;
      }
      
      if (!selectedCard) {
        alert('Please select a template');
        return;
      }
      
      const template = selectedCard.getAttribute('data-template');
      addSection(id, template);
      style.remove();
      modal.remove();
    });
    
    // Handle cancel button
    document.getElementById('add-section-cancel').addEventListener('click', () => {
      style.remove();
      modal.remove();
    });
    
    // Close on background click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        style.remove();
        modal.remove();
      }
    });
    
    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        style.remove();
        modal.remove();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);
  }

  function addSection(id, template) {
    if (window.ModeManager.captureSnapshot) {
      window.ModeManager.captureSnapshot();
    }

    const material = window.ModeManager.getMaterial();
    const sections = material.config.sections;
    
    // Check if ID already exists
    if (sections.find(s => s.id === id)) {
      alert('Section with this ID already exists');
      return;
    }
    
    // Add new section
    const newSection = {
      id,
      template,
      enabled: true,
      order: sections.length
    };
    
    sections.push(newSection);
    
    // Initialize section data
    if (!material.index[id]) {
      material.index[id] = createDefaultSectionData(template);
    }
    
    window.ModeManager.updateMaterialInMemory(material);
    window.SectionRenderer.render();
    refresh();
  }

  function createDefaultSectionData(template) {
    if (template === 'tabbed-content') {
      return {
        label: 'Highlights',
        headline: 'New Highlights Section',
        items: [createDefaultCollectionItem('tabbed-content', 0)]
      };
    }
    if (template === 'card-grid') {
      return {
        headline: 'New Feature Section',
        subheadline: 'Edit this section subheadline.',
        cards: [createDefaultCollectionItem('card-grid', 0)]
      };
    }
    if (template === 'accordion') {
      return {
        headline: 'Take a closer look.',
        features: [createDefaultCollectionItem('accordion', 0)],
        reactorLabel: 'Interactive Diagram',
        reactorHint: 'Click features to explore',
        images: { reactor: '' }
      };
    }
    if (template === 'interactive-details') {
      return {
        headline: 'Explore The Details.',
        items: [
          createDefaultCollectionItem('interactive-details', 0),
          createDefaultCollectionItem('interactive-details', 1),
          createDefaultCollectionItem('interactive-details', 2)
        ]
      };
    }
    return {
      title: 'New Section',
      description: 'Edit this content'
    };
  }

  async function saveAll() {
    const state = window.ModeManager.getState();
    const material = window.ModeManager.getMaterial();
    
    if (state.dataMode === 'online') {
      const success = await window.ModeManager.saveMaterial(material);
      if (success) {
        alert('Saved successfully!');
      } else {
        alert('Failed to save');
      }
    } else {
      // Offline mode: save to local folder using File System Access API
      if (!window.FolderPermissionManager || !window.FolderPermissionManager.isSupported()) {
        alert('File System Access API not supported. Please use Chrome 86+ or Edge 86+.\n\nYou can use Export button to download a ZIP instead.');
        return;
      }

      try {
        // Get or request folder permission
        let dirHandle = await window.FolderPermissionManager.getVerifiedFolderHandle('readwrite');
        
        if (!dirHandle) {
          // Need to request folder selection
          const confirm = window.confirm('Select a folder to save the complete viewer site.\n\nThis will create/update:\n- index.html (viewer)\n- material.json\n- Media files in uploads/\n- CSS and JS files\n\nContinue?');
          
          if (!confirm) return;
          
          dirHandle = await window.FolderPermissionManager.requestFolderPermission();
          if (!dirHandle) {
            // User cancelled
            return;
          }
        }

        // Show progress in status message
        const statusEl = document.createElement('div');
        statusEl.style.cssText = 'position: fixed; top: 80px; right: 20px; z-index: 200; background: rgba(0,0,0,0.9); color: white; padding: 16px 24px; rounded: 12px; border: 1px solid rgba(255,255,255,0.1); min-width: 300px; border-radius: 12px;';
        statusEl.innerHTML = '<div style="font-weight: 600; margin-bottom: 8px;">Saving to folder...</div><div id="save-progress" style="font-size: 12px; color: rgba(255,255,255,0.7);"></div>';
        document.body.appendChild(statusEl);

        const progressEl = statusEl.querySelector('#save-progress');
        const updateProgress = (message, progress) => {
          if (progressEl) {
            progressEl.textContent = `${message} (${progress}%)`;
          }
        };

        // Save complete site
        const result = await window.OfflineSiteSaver.saveCompleteOfflineSite(
          material,
          dirHandle,
          updateProgress
        );

        statusEl.remove();

        if (result.success) {
          const folderName = window.FolderPermissionManager.getFolderName(dirHandle);
          alert(`Saved successfully to folder: ${folderName}\n\n` +
                `Files written: ${result.fileCount}\n` +
                `Media files: ${result.mediaCount}\n\n` +
                `You can now open the index.html in that folder to view the site.`);
          
          // Update folder status display
          updateFolderStatusDisplay();
        } else {
          alert(`Failed to save: ${result.error || 'Unknown error'}`);
        }

      } catch (error) {
        console.error('Save to folder error:', error);
        alert(`Failed to save to folder: ${error.message}`);
      }
    }
  }

  function discardChanges() {
    if (!confirm('Discard all changes?')) return;
    
    const state = window.ModeManager.getState();
    if (state.dataMode === 'online') {
      // Reload from server
      window.ModeManager.switchToView();
      setTimeout(() => window.ModeManager.switchToEdit(), 100);
    } else {
      // Clear local draft and reload from material.json baseline
      if (window.ModeManager.clearOfflineDraft) {
        window.ModeManager.clearOfflineDraft();
      }
      location.reload();
    }
  }

  async function exportMaterial() {
    const state = window.ModeManager.getState();
    const date = new Date().toISOString().split('T')[0];

    if (state.dataMode === 'offline') {
      const material = window.ModeManager.getMaterial();
      if (!material) {
        alert('Material is not loaded yet');
        return;
      }
      const blob = await buildOfflineSitePackage(material);
      if (!blob) {
        alert('Failed to export offline site package');
        return;
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `site-package-${date}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    const blob = await window.ModeManager.exportSitePackage?.();
    if (!blob) {
      alert('Failed to export site package');
      return;
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `site-package-${date}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      const state = window.ModeManager.getState();
      const isZip = file.name.toLowerCase().endsWith('.zip');

      if (isZip) {
        if (state.dataMode === 'offline') {
          if (!confirm('Import this site package ZIP in Offline mode? Media files in uploads/ will be embedded as data URLs.')) {
            return;
          }
          const offlineResult = await importSitePackageOffline(file);
          if (!offlineResult || !offlineResult.material) {
            alert('Failed to import package');
            return;
          }

          if (window.ModeManager.captureSnapshot) {
            window.ModeManager.captureSnapshot();
          }

          window.ModeManager.updateMaterialInMemory(offlineResult.material);
          window.SectionRenderer.updateMaterial(offlineResult.material);
          refresh();
          alert(`Package imported successfully in Offline mode! Media embedded: ${offlineResult.importedMediaCount}`);
          return;
        }

        if (!confirm('Import this site package ZIP? Current server material will be replaced.')) {
          return;
        }

        const result = await window.ModeManager.importSitePackage?.(file);
        if (!result || !result.success) {
          alert('Failed to import package');
          return;
        }

        await window.ModeManager.reloadOnlineMaterial?.();
        refresh();
        alert(`Package imported successfully! Media imported: ${result.importedMediaCount ?? 0}`);
        return;
      }

      // Backward-compatible JSON import
      const text = await file.text();
      const material = JSON.parse(text);
      if (!material.index || !material.config) {
        alert('Invalid material file format');
        return;
      }
      if (!confirm('Import this material JSON? Current changes will be replaced.')) {
        return;
      }

      if (window.ModeManager.captureSnapshot) {
        window.ModeManager.captureSnapshot();
      }

      window.ModeManager.updateMaterialInMemory(material);

      if (state.dataMode === 'online') {
        await window.ModeManager.saveMaterial(material);
      }
      
      window.SectionRenderer.updateMaterial(material);
      refresh();
      
      alert('Material imported successfully!');
    } catch (error) {
      console.error('Import error:', error);
      alert('Failed to import file');
    } finally {
      // Always reset input, including early-return branches.
      event.target.value = '';
    }
  }

  async function ensureJSZip() {
    if (window.JSZip) return window.JSZip;
    if (jsZipLoaderPromise) return jsZipLoaderPromise;

    jsZipLoaderPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
      script.async = true;
      script.onload = () => {
        if (window.JSZip) {
          resolve(window.JSZip);
        } else {
          reject(new Error('JSZip loaded but window.JSZip missing'));
        }
      };
      script.onerror = () => reject(new Error('Failed to load JSZip'));
      document.head.appendChild(script);
    }).finally(() => {
      jsZipLoaderPromise = null;
    });

    return jsZipLoaderPromise;
  }

  function walkStrings(node, onString) {
    if (typeof node === 'string') return onString(node);
    if (Array.isArray(node)) return node.map((item) => walkStrings(item, onString));
    if (node && typeof node === 'object') {
      const output = {};
      Object.keys(node).forEach((key) => {
        output[key] = walkStrings(node[key], onString);
      });
      return output;
    }
    return node;
  }

  function normalizeMaterialForPackage(material) {
    return walkStrings(material, (value) => {
      const absoluteUploadMatch = value.match(/^https?:\/\/[^/]+\/uploads\/(.+)$/i);
      if (absoluteUploadMatch) {
        return `uploads/${absoluteUploadMatch[1]}`;
      }
      if (value.startsWith('/uploads/')) {
        return value.slice(1);
      }
      return value;
    });
  }

  function applyUploadDataUrls(material, uploadMap) {
    return walkStrings(material, (value) => {
      if (uploadMap[value]) return uploadMap[value];

      const absoluteUploadMatch = value.match(/^https?:\/\/[^/]+\/uploads\/(.+)$/i);
      if (absoluteUploadMatch) {
        const rel = `uploads/${absoluteUploadMatch[1]}`;
        if (uploadMap[rel]) return uploadMap[rel];
        if (uploadMap[`/${rel}`]) return uploadMap[`/${rel}`];
      }

      if (value.startsWith('/uploads/')) {
        const rel = value.slice(1);
        if (uploadMap[rel]) return uploadMap[rel];
      }

      return value;
    });
  }

  function detectMimeType(filename) {
    const lower = String(filename || '').toLowerCase();
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.gif')) return 'image/gif';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.svg')) return 'image/svg+xml';
    if (lower.endsWith('.mp4')) return 'video/mp4';
    if (lower.endsWith('.webm')) return 'video/webm';
    if (lower.endsWith('.ogg')) return 'video/ogg';
    if (lower.endsWith('.mov')) return 'video/quicktime';
    if (lower.endsWith('.m4v')) return 'video/x-m4v';
    return 'application/octet-stream';
  }

  function getStaticPackageFiles() {
    return [
      'css/styles.css',
      'js/templates.js',
      'js/section-renderer.js',
      'js/quiz.js',
      'js/latex-renderer.js',
      'js/mode-manager.js',
      'js/editor.js',
      'js/material.js',
      'js/main.js',
      'js/scroll-animations.js',
      'js/ai-chat.js'
    ];
  }

  function collectReferencedAssetPaths(material) {
    const paths = new Set();
    const imagesBasePath = typeof material?.imagesBasePath === 'string'
      ? material.imagesBasePath
      : 'assets/images/';

    walkStrings(material, (value) => {
      if (!value) return value;
      if (value.startsWith('data:') || value.startsWith('blob:')) return value;
      if (/^https?:\/\//i.test(value)) return value;

      const clean = value.replace(/^\.\//, '').replace(/^\/+/, '');
      if (clean.startsWith('assets/') || clean.startsWith('uploads/')) {
        paths.add(clean);
        return value;
      }

      // Backward compatibility: plain filenames resolved by imagesBasePath.
      if (/^[^/]+\.[a-z0-9]{2,6}(\?.*)?$/i.test(clean)) {
        const base = imagesBasePath.replace(/^\/+/, '');
        paths.add(`${base}${clean}`);
      }
      return value;
    });

    return Array.from(paths);
  }

  async function addFileToZipFromUrl(zip, urlPath, zipEntryName) {
    try {
      const relPath = `./${String(urlPath || '').replace(/^\/+/, '').replace(/^\.\//, '')}`;

      try {
        const response = await fetch(relPath, { cache: 'no-store' });
        if (response.ok) {
          const buffer = await response.arrayBuffer();
          zip.file(zipEntryName, buffer);
          return true;
        }
      } catch (fetchErr) {
        // Continue to XHR fallback.
      }

      const arrayBuffer = await new Promise((resolve) => {
        try {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', relPath, true);
          xhr.responseType = 'arraybuffer';
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
        } catch (e) {
          resolve(null);
        }
      });

      if (!arrayBuffer) return false;
      zip.file(zipEntryName, arrayBuffer);
      return true;
    } catch (e) {
      return false;
    }
  }

  function escapeHtml(text) {
    if (typeof text !== 'string') return '';
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function generateOfflineViewerHtml(material) {
    const materialJson = JSON.stringify(material, null, 2)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');

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

  async function buildOfflineSitePackage(material) {
    try {
      const JSZip = await ensureJSZip();
      const zip = new JSZip();
      const packageMaterial = normalizeMaterialForPackage(material);

      zip.file('material.json', JSON.stringify(packageMaterial, null, 2));
      zip.file('index.html', generateOfflineViewerHtml(packageMaterial));

      const addedPaths = new Set();
      const candidates = [
        ...getStaticPackageFiles(),
        ...collectReferencedAssetPaths(packageMaterial)
      ];

      for (const path of candidates) {
        const cleanPath = String(path || '').replace(/^\/+/, '').replace(/^\.\//, '');
        if (!cleanPath || addedPaths.has(cleanPath)) continue;
        const ok = await addFileToZipFromUrl(zip, cleanPath, cleanPath);
        if (ok) {
          addedPaths.add(cleanPath);
        }
      }

      zip.file(
        'README_PACKAGE.txt',
        [
          'PinS Static Site Export Package (Offline)',
          '',
          'How to run:',
          '1) Extract this ZIP to a folder.',
          '2) Open index.html in a modern browser.',
          '3) If browser blocks local file access for media, run a static server: npx serve .',
          '',
          'Notes:',
          '- material.json and rendering scripts are included.',
          '- Referenced assets/uploads are bundled when readable from current runtime.',
          '- CMS backend is not required for viewing.'
        ].join('\n')
      );

      return await zip.generateAsync({ type: 'blob' });
    } catch (error) {
      console.error('Offline package export error:', error);
      return null;
    }
  }

  async function importSitePackageOffline(file) {
    try {
      const JSZip = await ensureJSZip();
      const zip = await JSZip.loadAsync(file);
      const materialEntry = zip.file('material.json');
      if (!materialEntry) {
        return null;
      }

      const raw = await materialEntry.async('string');
      const parsedMaterial = JSON.parse(raw);
      if (!parsedMaterial || !parsedMaterial.index || !parsedMaterial.config) {
        return null;
      }

      const uploadMap = {};
      let importedMediaCount = 0;
      const entries = Object.values(zip.files);
      for (const entry of entries) {
        if (entry.dir) continue;
        if (!entry.name.startsWith('uploads/')) continue;

        const base64 = await entry.async('base64');
        const mime = detectMimeType(entry.name);
        const dataUrl = `data:${mime};base64,${base64}`;
        uploadMap[entry.name] = dataUrl;
        uploadMap[`/${entry.name}`] = dataUrl;
        importedMediaCount += 1;
      }

      const material = applyUploadDataUrls(parsedMaterial, uploadMap);
      return { material, importedMediaCount };
    } catch (error) {
      console.error('Offline package import error:', error);
      return null;
    }
  }

  function updateMaterialByPath(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
  }

  function ensureReferenceItemsArray(material) {
    if (!material || !material.index) return [];
    if (!material.index.footer) material.index.footer = {};
    if (!material.index.footer.reference) material.index.footer.reference = { title: 'Reference' };

    const reference = material.index.footer.reference;
    const current = reference.items;

    if (Array.isArray(current)) {
      reference.items = current.map((item, idx) => ({
        id: Number(item?.id) || idx + 1,
        text: typeof item?.text === 'string' ? item.text : String(item?.text || '')
      }));
      return reference.items;
    }

    // Backward compatibility: old `body` format
    if (typeof reference.body === 'string' && reference.body.trim() !== '') {
      reference.items = [{ id: 1, text: reference.body.replace(/^\[\d+\]\s*/, '') }];
      return reference.items;
    }

    // Handle single object/string malformed states from old drafts/imports
    if (current && typeof current === 'object' && !Array.isArray(current)) {
      reference.items = [{
        id: Number(current.id) || 1,
        text: typeof current.text === 'string' ? current.text : String(current.text || '')
      }];
      return reference.items;
    }

    if (typeof current === 'string') {
      reference.items = [{ id: 1, text: current }];
      return reference.items;
    }

    reference.items = [];
    return reference.items;
  }

  // ========== Reference Citation System ==========
  
  function enableReferenceEditing() {
    // Bind add reference button
    const addBtn = document.getElementById('add-reference-btn');
    if (addBtn) {
      addBtn.addEventListener('click', handleAddReference);
    }
    
    // Bind delete buttons
    document.querySelectorAll('[data-ref-delete]').forEach(btn => {
      btn.addEventListener('click', handleDeleteReference);
    });
  }
  
  function disableReferenceEditing() {
    const addBtn = document.getElementById('add-reference-btn');
    if (addBtn) {
      addBtn.removeEventListener('click', handleAddReference);
    }
    
    document.querySelectorAll('[data-ref-delete]').forEach(btn => {
      btn.removeEventListener('click', handleDeleteReference);
    });
  }
  
  function handleAddReference() {
    if (window.ModeManager.captureSnapshot) {
      window.ModeManager.captureSnapshot();
    }
    
    const material = window.ModeManager.getMaterial();
    const items = ensureReferenceItemsArray(material);
    const nextId = items.length > 0 ? Math.max(...items.map(i => i.id)) + 1 : 1;
    
    // Add new reference
    items.push({
      id: nextId,
      text: 'New reference entry. Click to edit.'
    });
    
    window.ModeManager.updateMaterialInMemory(material);
    window.SectionRenderer.render();
    refresh();
    
    // Focus the new reference
    setTimeout(() => {
      const newRef = document.querySelector(`[data-material="footer.reference.items.${items.length - 1}.text"]`);
      if (newRef) {
        newRef.focus();
        // Select all text
        const range = document.createRange();
        range.selectNodeContents(newRef);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    }, 100);
  }
  
  function handleDeleteReference(event) {
    const btn = event.currentTarget;
    const refIdToDelete = parseInt(btn.getAttribute('data-ref-delete'));
    
    if (!confirm(`Delete reference [${refIdToDelete}]?`)) {
      return;
    }
    
    if (window.ModeManager.captureSnapshot) {
      window.ModeManager.captureSnapshot();
    }
    
    const material = window.ModeManager.getMaterial();
    const items = ensureReferenceItemsArray(material);
    
    // Find and remove the item
    const indexToRemove = items.findIndex(item => item.id === refIdToDelete);
    if (indexToRemove === -1) return;
    
    items.splice(indexToRemove, 1);
    
    // Renumber all references
    items.forEach((item, index) => {
      item.id = index + 1;
    });
    
    // Update all citations in the document
    updateCitationsInDocument(refIdToDelete, items.length);
    
    window.ModeManager.updateMaterialInMemory(material);
    window.SectionRenderer.render();
    refresh();
  }
  
  function updateCitationsInDocument(deletedId, newMaxId) {
    // Find all citation elements and update their references
    document.querySelectorAll('.ref-cite').forEach(cite => {
      const currentRefId = parseInt(cite.getAttribute('data-ref-id'));
      
      if (currentRefId === deletedId) {
        // Remove the citation
        cite.remove();
      } else if (currentRefId > deletedId) {
        // Decrement the reference number
        const newRefId = currentRefId - 1;
        cite.setAttribute('data-ref-id', newRefId);
        cite.textContent = `[${newRefId}]`;
      }
    });
    
    // Update the material data for all content that has citations
    const material = window.ModeManager.getMaterial();
    const contentElements = document.querySelectorAll('[data-ref-content="true"]');
    
    contentElements.forEach(el => {
      const path = el.getAttribute('data-material');
      if (path) {
        const updatedHtml = el.innerHTML;
        updateMaterialByPath(material, `index.${path}`, updatedHtml);
      }
    });
    
    window.ModeManager.updateMaterialInMemory(material);
  }
  
  // ========== @ Mention System ==========
  
  let mentionDropdown = null;
  let mentionListeners = [];
  let selectedMentionIndex = 0;
  let mentionTargetElement = null;
  let mentionRange = null;
  
  function setupAtMentionSystem() {
    // Add keyup listener to all editable elements
    const editableElements = document.querySelectorAll('[data-material][contenteditable="true"]');
    
    editableElements.forEach(el => {
      const listener = (e) => handleAtKeyup(e, el);
      el.addEventListener('keyup', listener);
      mentionListeners.push({ el, listener });
    });
  }
  
  function cleanupAtMentionSystem() {
    // Remove all listeners
    mentionListeners.forEach(({ el, listener }) => {
      el.removeEventListener('keyup', listener);
    });
    mentionListeners = [];
    
    // Remove dropdown if exists
    if (mentionDropdown) {
      mentionDropdown.remove();
      mentionDropdown = null;
    }
  }
  
  function handleAtKeyup(event, element) {
    const key = event.key;
    
    // Handle dropdown navigation if dropdown is open
    if (mentionDropdown) {
      if (key === 'Escape') {
        closeMentionDropdown();
        return;
      } else if (key === 'ArrowDown') {
        event.preventDefault();
        navigateMentionDropdown(1);
        return;
      } else if (key === 'ArrowUp') {
        event.preventDefault();
        navigateMentionDropdown(-1);
        return;
      } else if (key === 'Enter') {
        event.preventDefault();
        selectCurrentMention();
        return;
      }
    }
    
    // Check caret and text context for '@' trigger
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);

    // Direct trigger for newly typed '@'
    if (key === '@') {
      showMentionDropdown(range, element);
      return;
    }

    // Robust detection: inspect full text before caret inside current editable element
    if (hasRecentAtBeforeCaret(range, element, 20)) {
      showMentionDropdown(range, element);
    } else {
      if (mentionDropdown) closeMentionDropdown();
    }
  }

  function hasRecentAtBeforeCaret(caretRange, rootElement, maxDistance) {
    try {
      const preRange = caretRange.cloneRange();
      preRange.selectNodeContents(rootElement);
      preRange.setEnd(caretRange.endContainer, caretRange.endOffset);
      const textBeforeCaret = preRange.toString();
      const atIndex = textBeforeCaret.lastIndexOf('@');
      if (atIndex === -1) return false;
      return (textBeforeCaret.length - atIndex) <= maxDistance;
    } catch (error) {
      return false;
    }
  }
  
  function showMentionDropdown(range, element) {
    // Get reference items
    const material = window.ModeManager.getMaterial();
    const items = ensureReferenceItemsArray(material);
    
    if (items.length === 0) {
      if (mentionDropdown) closeMentionDropdown();
      return;
    }
    
    // Create or update dropdown
    if (!mentionDropdown) {
      mentionDropdown = document.createElement('div');
      mentionDropdown.className = 'ref-dropdown';
      document.body.appendChild(mentionDropdown);
      
      // Close on click outside
      document.addEventListener('click', handleClickOutsideMention);
    }
    mentionTargetElement = element;
    mentionRange = range.cloneRange();
    
    // Populate dropdown
    mentionDropdown.innerHTML = items.map((item, index) => {
      const text = typeof item.text === 'string' ? item.text : String(item.text || '');
      const preview = text.length > 60 ? text.substring(0, 60) + '...' : text;
      return `
        <div class="ref-dropdown-item ${index === 0 ? 'selected' : ''}" data-ref-index="${index}" data-ref-id="${item.id}">
          <span class="ref-dropdown-item-number">[${item.id}]</span>
          <span class="ref-dropdown-item-text">${preview}</span>
        </div>
      `;
    }).join('');
    
    selectedMentionIndex = 0;
    
    // Bind click handlers
    mentionDropdown.querySelectorAll('.ref-dropdown-item').forEach(item => {
      item.addEventListener('mousedown', (e) => {
        // Keep focus/caret in editable content until insertion is done
        e.preventDefault();
      });
      item.addEventListener('click', () => {
        const refId = parseInt(item.getAttribute('data-ref-id'));
        insertCitation(refId, mentionTargetElement);
      });
    });
    
    // Position dropdown at caret (viewport-fixed coordinates)
    const point = getCaretViewportPoint(range, element);
    const dropdownWidth = 360;
    const padding = 12;
    const left = Math.max(
      padding,
      Math.min(point.x, window.innerWidth - dropdownWidth - padding)
    );
    const top = Math.min(point.y + 8, window.innerHeight - 16);

    mentionDropdown.style.position = 'fixed';
    mentionDropdown.style.left = `${left}px`;
    mentionDropdown.style.top = `${top}px`;
    mentionDropdown.style.minWidth = `${dropdownWidth}px`;
  }

  function getCaretViewportPoint(range, element) {
    const collapsed = range.cloneRange();
    collapsed.collapse(true);

    // Prefer client rect list (more stable around inline nodes)
    const rects = collapsed.getClientRects();
    if (rects && rects.length > 0) {
      const r = rects[rects.length - 1];
      return { x: r.left, y: r.bottom };
    }

    // Fallback to bounding rect if available
    const rect = collapsed.getBoundingClientRect();
    if (rect && (rect.left || rect.top || rect.width || rect.height)) {
      return { x: rect.left, y: rect.bottom };
    }

    // Last fallback: use element rect so menu still appears nearby
    const elRect = element.getBoundingClientRect();
    return { x: elRect.left + 8, y: elRect.top + 24 };
  }
  
  function navigateMentionDropdown(direction) {
    if (!mentionDropdown) return;
    
    const items = mentionDropdown.querySelectorAll('.ref-dropdown-item');
    if (items.length === 0) return;
    
    // Remove current selection
    items[selectedMentionIndex].classList.remove('selected');
    
    // Update index
    selectedMentionIndex += direction;
    if (selectedMentionIndex < 0) selectedMentionIndex = items.length - 1;
    if (selectedMentionIndex >= items.length) selectedMentionIndex = 0;
    
    // Add new selection
    items[selectedMentionIndex].classList.add('selected');
    
    // Scroll into view
    items[selectedMentionIndex].scrollIntoView({ block: 'nearest' });
  }
  
  function selectCurrentMention() {
    if (!mentionDropdown) return;
    
    const items = mentionDropdown.querySelectorAll('.ref-dropdown-item');
    if (items.length === 0) return;
    
    const selectedItem = items[selectedMentionIndex];
    const refId = parseInt(selectedItem.getAttribute('data-ref-id'));
    
    insertCitation(refId, mentionTargetElement);
  }
  
  function insertCitation(refId, element) {
    const selection = window.getSelection();
    if (!selection) return;

    // Restore original caret range captured when dropdown opened.
    let range = null;
    if (mentionRange) {
      range = mentionRange.cloneRange();
      selection.removeAllRanges();
      selection.addRange(range);
    } else if (selection.rangeCount) {
      range = selection.getRangeAt(0).cloneRange();
    } else {
      closeMentionDropdown();
      return;
    }

    // Best-effort remove direct '@' right before caret (common case)
    removeDirectAtBeforeCaret(selection, range);

    // Create citation element
    const citation = document.createElement('sup');
    citation.className = 'ref-cite';
    citation.setAttribute('data-ref-id', refId);
    citation.textContent = `[${refId}]`;

    range.collapse(true);
    range.insertNode(citation);

    // Move cursor after inserted citation
    const newRange = document.createRange();
    newRange.setStartAfter(citation);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);

    // Mark field as citation-capable so HTML is preserved on blur save
    if (element) {
      element.setAttribute('data-ref-content', 'true');
      element.dispatchEvent(new Event('blur'));
    }
    
    closeMentionDropdown();
  }

  function removeDirectAtBeforeCaret(selection, range) {
    const node = range.startContainer;
    const offset = range.startOffset;
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    if (offset <= 0) return;

    const text = node.textContent || '';
    if (text[offset - 1] !== '@') return;

    node.textContent = text.slice(0, offset - 1) + text.slice(offset);
    range.setStart(node, offset - 1);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  
  function closeMentionDropdown() {
    if (mentionDropdown) {
      mentionDropdown.remove();
      mentionDropdown = null;
      document.removeEventListener('click', handleClickOutsideMention);
    }
    mentionTargetElement = null;
    mentionRange = null;
  }
  
  function handleClickOutsideMention(event) {
    if (mentionDropdown && !mentionDropdown.contains(event.target)) {
      closeMentionDropdown();
    }
  }
  
  // ========== Citation Click Handler (Global) ==========
  let citationClickBound = false;
  
  function setupCitationClickHandlers() {
    if (citationClickBound) return;
    citationClickBound = true;
    // Use event delegation on document for all .ref-cite elements
    document.addEventListener('click', handleCitationClick);
  }
  
  function removeCitationClickHandlers() {
    citationClickBound = false;
    document.removeEventListener('click', handleCitationClick);
  }
  
  function handleCitationClick(event) {
    const citation = event.target.closest('.ref-cite');
    if (!citation) return;
    
    event.preventDefault();
    
    const refId = citation.getAttribute('data-ref-id');
    if (!refId) return;
    
    // Find the reference element in footer
    const refElement = document.getElementById(`ref-${refId}`);
    if (!refElement) {
      console.warn(`Reference #ref-${refId} not found`);
      return;
    }
    
    // Scroll to reference
    refElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    // Add highlight animation
    refElement.classList.add('ref-highlight');
    
    // Remove highlight after animation completes
    setTimeout(() => {
      refElement.classList.remove('ref-highlight');
    }, 2000);
  }

  // ========== Slash Command System ==========
  
  let commandDropdown = null;
  let commandListeners = [];
  let selectedCommandIndex = 0;
  let commandTargetElement = null;
  let commandRange = null;
  
  const COMMANDS = [
    { id: 'image', label: 'Insert Image', icon: 'image', description: 'Upload and insert an image' },
    { id: 'video', label: 'Insert Video', icon: 'video', description: 'Upload and insert a video' }
  ];
  
  function setupSlashCommandSystem() {
    // Add keyup listener to all detail editable elements
    const detailElements = document.querySelectorAll('[data-material*="detail"][contenteditable="true"]');
    
    detailElements.forEach(el => {
      const listener = (e) => handleSlashKeyup(e, el);
      el.addEventListener('keyup', listener);
      commandListeners.push({ el, listener });
    });
  }
  
  function cleanupSlashCommandSystem() {
    // Remove all listeners
    commandListeners.forEach(({ el, listener }) => {
      el.removeEventListener('keyup', listener);
    });
    commandListeners = [];
    
    // Remove dropdown if exists
    if (commandDropdown) {
      commandDropdown.remove();
      commandDropdown = null;
    }
  }
  
  function handleSlashKeyup(event, element) {
    const key = event.key;
    
    // Handle dropdown navigation if dropdown is open
    if (commandDropdown) {
      if (key === 'Escape') {
        closeCommandDropdown();
        return;
      } else if (key === 'ArrowDown') {
        event.preventDefault();
        navigateCommandDropdown(1);
        return;
      } else if (key === 'ArrowUp') {
        event.preventDefault();
        navigateCommandDropdown(-1);
        return;
      } else if (key === 'Enter') {
        event.preventDefault();
        selectCurrentCommand();
        return;
      }
    }
    
    // Check caret and text context for '/' trigger
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    
    const range = selection.getRangeAt(0);

    // Direct trigger for newly typed '/'
    if (key === '/') {
      showCommandDropdown(range, element);
      return;
    }

    // Robust detection: inspect full text before caret
    if (hasRecentSlashBeforeCaret(range, element, 20)) {
      showCommandDropdown(range, element);
    } else {
      if (commandDropdown) closeCommandDropdown();
    }
  }

  function hasRecentSlashBeforeCaret(caretRange, rootElement, maxDistance) {
    try {
      const preRange = caretRange.cloneRange();
      preRange.selectNodeContents(rootElement);
      preRange.setEnd(caretRange.endContainer, caretRange.endOffset);
      const textBeforeCaret = preRange.toString();
      const slashIndex = textBeforeCaret.lastIndexOf('/');
      if (slashIndex === -1) return false;
      return (textBeforeCaret.length - slashIndex) <= maxDistance;
    } catch (error) {
      return false;
    }
  }
  
  function showCommandDropdown(range, element) {
    // Create or update dropdown
    if (!commandDropdown) {
      commandDropdown = document.createElement('div');
      commandDropdown.className = 'command-dropdown';
      document.body.appendChild(commandDropdown);
      
      // Close on click outside
      document.addEventListener('click', handleClickOutsideCommand);
    }
    commandTargetElement = element;
    commandRange = range.cloneRange();
    
    // Populate dropdown
    commandDropdown.innerHTML = COMMANDS.map((cmd, index) => {
      return `
        <div class="command-dropdown-item ${index === 0 ? 'selected' : ''}" data-command-id="${cmd.id}" data-command-index="${index}">
          <i data-lucide="${cmd.icon}" class="command-dropdown-item-icon"></i>
          <div class="command-dropdown-item-content">
            <div class="command-dropdown-item-label">${cmd.label}</div>
            <div class="command-dropdown-item-desc">${cmd.description}</div>
          </div>
        </div>
      `;
    }).join('');
    
    selectedCommandIndex = 0;
    
    // Initialize icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
    
    // Bind click handlers
    commandDropdown.querySelectorAll('.command-dropdown-item').forEach(item => {
      item.addEventListener('mousedown', (e) => {
        e.preventDefault();
      });
      item.addEventListener('click', () => {
        const cmdId = item.getAttribute('data-command-id');
        executeCommand(cmdId, commandTargetElement);
      });
    });
    
    // Position dropdown at caret
    const point = getCaretViewportPoint(range, element);
    const dropdownWidth = 320;
    const padding = 12;
    const left = Math.max(
      padding,
      Math.min(point.x, window.innerWidth - dropdownWidth - padding)
    );
    const top = Math.min(point.y + 8, window.innerHeight - 16);

    commandDropdown.style.position = 'fixed';
    commandDropdown.style.left = `${left}px`;
    commandDropdown.style.top = `${top}px`;
    commandDropdown.style.minWidth = `${dropdownWidth}px`;
  }
  
  function navigateCommandDropdown(direction) {
    if (!commandDropdown) return;
    
    const items = commandDropdown.querySelectorAll('.command-dropdown-item');
    if (items.length === 0) return;
    
    // Remove current selection
    items[selectedCommandIndex].classList.remove('selected');
    
    // Update index
    selectedCommandIndex += direction;
    if (selectedCommandIndex < 0) selectedCommandIndex = items.length - 1;
    if (selectedCommandIndex >= items.length) selectedCommandIndex = 0;
    
    // Add new selection
    items[selectedCommandIndex].classList.add('selected');
    
    // Scroll into view
    items[selectedCommandIndex].scrollIntoView({ block: 'nearest' });
  }
  
  function selectCurrentCommand() {
    if (!commandDropdown) return;
    
    const items = commandDropdown.querySelectorAll('.command-dropdown-item');
    if (items.length === 0) return;
    
    const selectedItem = items[selectedCommandIndex];
    const cmdId = selectedItem.getAttribute('data-command-id');
    
    executeCommand(cmdId, commandTargetElement);
  }
  
  function executeCommand(commandId, element) {
    if (commandId === 'image') {
      triggerMediaUpload('image', element);
    } else if (commandId === 'video') {
      triggerMediaUpload('video', element);
    }
    
    closeCommandDropdown();
  }
  
  function triggerMediaUpload(mediaType, element) {
    // Create hidden file input
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = mediaType === 'image' ? 'image/*' : 'video/*';
    input.style.display = 'none';
    
    input.addEventListener('change', async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      try {
        // Show loading indicator
        showUploadingIndicator(element);
        
        // Upload file
        const uploadResult = await uploadMediaFile(file);
        
        if (uploadResult.success) {
          // Insert media block
          await insertMediaBlock(mediaType, uploadResult.url, element);
          hideUploadingIndicator(element);
        } else {
          hideUploadingIndicator(element);
          alert(`Failed to upload ${mediaType}: ${uploadResult.error || 'Unknown error'}`);
        }
      } catch (error) {
        hideUploadingIndicator(element);
        console.error('Media upload error:', error);
        alert(`Failed to upload ${mediaType}: ${error.message}`);
      }
      
      // Clean up input
      input.remove();
    });
    
    // Trigger file picker
    document.body.appendChild(input);
    input.click();
  }
  
  async function uploadMediaFile(file) {
    const formData = new FormData();
    formData.append('media', file);
    
    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: errorText || 'Upload failed' };
      }
      
      const result = await response.json();
      return { success: true, url: result.url };
    } catch (error) {
      console.error('Upload error:', error);
      return { success: false, error: error.message };
    }
  }
  
  async function insertMediaBlock(mediaType, mediaUrl, element) {
    // Get material path from element
    const materialPath = element.getAttribute('data-material');
    if (!materialPath) {
      console.error('No material path found on element');
      return;
    }
    
    console.log('Material path:', materialPath);
    
    // Get current material and navigate to parent
    const material = window.ModeManager.getMaterial();
    const parent = navigateToParentByPath(material, materialPath);
    
    if (!parent) {
      console.error('Failed to navigate to parent object');
      return;
    }
    
    console.log('Parent object found:', parent);
    
    // Initialize detailBlocks if not exists
    if (!Array.isArray(parent.detailBlocks)) {
      // Migrate existing detail text to detailBlocks
      if (parent.detail && typeof parent.detail === 'string') {
        parent.detailBlocks = [
          { type: 'text', content: parent.detail }
        ];
      } else {
        parent.detailBlocks = [];
      }
    }
    
    // Add media block
    parent.detailBlocks.push({
      type: mediaType,
      url: mediaUrl,
      width: mediaType === 'image' ? 600 : 800
    });
    
    console.log('Updated detailBlocks:', parent.detailBlocks);
    
    // Update material
    window.ModeManager.updateMaterialInMemory(material);
    
    // Re-render the detail content
    await refreshDetailDisplay(element, parent);
    
    // Mark as modified
    element.dispatchEvent(new Event('blur'));
  }
  
  async function refreshDetailDisplay(element, parentData) {
    // Find the detail content container
    const detailContainer = element.closest('.detail-rich-text');
    if (!detailContainer) {
      console.error('Detail container not found');
      return;
    }
    
    // Use provided parent data or fetch from material
    let data = parentData;
    
    if (!data) {
      const materialPath = element.getAttribute('data-material');
      const material = window.ModeManager.getMaterial();
      
      // Parse path to get the data
      const pathParts = materialPath.split('.');
      data = material;
      
      for (let i = 0; i < pathParts.length - 1; i++) {
        const key = pathParts[i];
        if (!isNaN(key)) {
          data = data[parseInt(key)];
        } else {
          data = data[key];
        }
        if (!data) {
          console.error('Data not found at path:', pathParts.slice(0, i + 1).join('.'));
          return;
        }
      }
    }
    
    // Render detailBlocks
    const newContent = renderDetailBlocks(data.detailBlocks || []);
    detailContainer.innerHTML = newContent;
    
    // Re-initialize media resize handlers
    initMediaResizeHandlers();
    
    // Re-initialize icons
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }
  
  function renderDetailBlocks(blocks) {
    if (!Array.isArray(blocks) || blocks.length === 0) {
      return 'Detail content goes here. Click to edit in edit mode.';
    }
    
    return blocks.map((block, index) => {
      if (block.type === 'text') {
        return `<div class="detail-text-block" data-block-index="${index}">${block.content || ''}</div>`;
      } else if (block.type === 'image') {
        const width = block.width || 600;
        return `
          <div class="detail-media-block" data-block-index="${index}" data-media-type="image">
            <div class="detail-media-wrapper" style="width: ${width}px;">
              <img src="${block.url}" alt="" class="detail-media-content" />
              <div class="detail-media-resize-handle"></div>
              <button class="detail-media-delete edit-mode-only" data-block-index="${index}">
                <i data-lucide="x" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        `;
      } else if (block.type === 'video') {
        const width = block.width || 800;
        return `
          <div class="detail-media-block" data-block-index="${index}" data-media-type="video">
            <div class="detail-media-wrapper" style="width: ${width}px;">
              <video src="${block.url}" class="detail-media-content" controls></video>
              <div class="detail-media-resize-handle"></div>
              <button class="detail-media-delete edit-mode-only" data-block-index="${index}">
                <i data-lucide="x" class="w-4 h-4"></i>
              </button>
            </div>
          </div>
        `;
      }
      return '';
    }).join('');
  }
  
  function showUploadingIndicator(element) {
    const container = element.closest('.detail-rich-text');
    if (!container) return;
    
    const indicator = document.createElement('div');
    indicator.className = 'upload-indicator';
    indicator.innerHTML = `
      <div class="upload-indicator-content">
        <div class="upload-spinner"></div>
        <span>Uploading...</span>
      </div>
    `;
    container.appendChild(indicator);
  }
  
  function hideUploadingIndicator(element) {
    const container = element.closest('.detail-rich-text');
    if (!container) return;
    
    const indicator = container.querySelector('.upload-indicator');
    if (indicator) {
      indicator.remove();
    }
  }
  
  function closeCommandDropdown() {
    if (commandDropdown) {
      commandDropdown.remove();
      commandDropdown = null;
      document.removeEventListener('click', handleClickOutsideCommand);
    }
    commandTargetElement = null;
    commandRange = null;
  }
  
  function handleClickOutsideCommand(event) {
    if (commandDropdown && !commandDropdown.contains(event.target)) {
      closeCommandDropdown();
    }
  }

  // ========== Media Resize Handlers ==========
  
  let resizeState = null;
  
  /**
   * Helper function to navigate material path with automatic 'index' prefix detection
   * Returns the parent object that contains the data
   */
  function navigateToParentByPath(material, materialPath) {
    const pathParts = materialPath.split('.');
    let parent = material;
    const parentPath = [];
    
    // Check if we need to add 'index' prefix
    const firstPart = pathParts[0];
    if (!parent[firstPart] && parent.index && parent.index[firstPart]) {
      parent = parent.index;
      parentPath.push('index');
    }
    
    // Navigate through the path (excluding the last part which is usually 'detail')
    for (let i = 0; i < pathParts.length - 1; i++) {
      const key = pathParts[i];
      
      // Handle array indices
      if (!isNaN(key)) {
        const index = parseInt(key);
        if (!Array.isArray(parent)) {
          console.error(`Expected array at ${parentPath.join('.')}, got:`, typeof parent);
          return null;
        }
        parent = parent[index];
        parentPath.push(`[${index}]`);
      } else {
        if (!parent[key]) {
          console.error(`Path not found: ${parentPath.join('.')}.${key}`);
          console.error('Available keys:', Object.keys(parent));
          return null;
        }
        parent = parent[key];
        parentPath.push(key);
      }
    }
    
    return parent;
  }
  
  function initMediaResizeHandlers() {
    // Clean up old handlers
    document.removeEventListener('mousedown', handleResizeStart);
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
    
    // Add new handlers
    document.addEventListener('mousedown', handleResizeStart);
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
    
    // Add delete button handlers
    document.querySelectorAll('.detail-media-delete').forEach(btn => {
      btn.addEventListener('click', handleMediaDelete);
    });
  }
  
  function handleResizeStart(e) {
    const handle = e.target.closest('.detail-media-resize-handle');
    if (!handle) return;
    
    const wrapper = handle.closest('.detail-media-wrapper');
    const block = handle.closest('.detail-media-block');
    if (!wrapper || !block) return;
    
    e.preventDefault();
    
    resizeState = {
      wrapper,
      block,
      startX: e.clientX,
      startWidth: wrapper.offsetWidth
    };
  }
  
  function handleResizeMove(e) {
    if (!resizeState) return;
    
    e.preventDefault();
    
    const deltaX = e.clientX - resizeState.startX;
    const newWidth = Math.max(200, Math.min(1200, resizeState.startWidth + deltaX));
    
    resizeState.wrapper.style.width = `${newWidth}px`;
  }
  
  function handleResizeEnd(e) {
    if (!resizeState) return;
    
    const finalWidth = parseInt(resizeState.wrapper.style.width);
    const blockIndex = parseInt(resizeState.block.getAttribute('data-block-index'));
    
    // Update material with new width
    updateMediaBlockWidth(resizeState.block, blockIndex, finalWidth);
    
    resizeState = null;
  }
  
  function updateMediaBlockWidth(blockElement, blockIndex, newWidth) {
    // Find the detail container and get material path
    const detailContainer = blockElement.closest('.detail-rich-text');
    if (!detailContainer) {
      console.error('Detail container not found');
      return;
    }
    
    const materialPath = detailContainer.getAttribute('data-material');
    if (!materialPath) {
      console.error('Material path not found');
      return;
    }
    
    console.log('Updating width for block:', blockIndex, 'to:', newWidth, 'path:', materialPath);
    
    // Get material and navigate to parent
    const material = window.ModeManager.getMaterial();
    const parent = navigateToParentByPath(material, materialPath);
    
    if (!parent) {
      console.error('Failed to navigate to parent object');
      return;
    }
    
    // Update the block width
    if (parent.detailBlocks && parent.detailBlocks[blockIndex]) {
      parent.detailBlocks[blockIndex].width = newWidth;
      window.ModeManager.updateMaterialInMemory(material);
      console.log('Width updated successfully');
    } else {
      console.error('Block not found at index:', blockIndex);
    }
  }
  
  function handleMediaDelete(e) {
    const btn = e.target.closest('.detail-media-delete');
    if (!btn) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const blockIndex = parseInt(btn.getAttribute('data-block-index'));
    const block = btn.closest('.detail-media-block');
    const detailContainer = block.closest('.detail-rich-text');
    
    if (!detailContainer) {
      console.error('Detail container not found');
      return;
    }
    
    const materialPath = detailContainer.getAttribute('data-material');
    if (!materialPath) {
      console.error('Material path not found');
      return;
    }
    
    console.log('Deleting block at index:', blockIndex, 'path:', materialPath);
    
    // Get material and navigate to parent
    const material = window.ModeManager.getMaterial();
    const parent = navigateToParentByPath(material, materialPath);
    
    if (!parent) {
      console.error('Failed to navigate to parent object');
      return;
    }
    
    // Remove the block
    if (parent.detailBlocks && parent.detailBlocks[blockIndex]) {
      console.log('Removing block:', parent.detailBlocks[blockIndex]);
      parent.detailBlocks.splice(blockIndex, 1);
      window.ModeManager.updateMaterialInMemory(material);
      
      // Re-render
      const newContent = renderDetailBlocks(parent.detailBlocks);
      detailContainer.innerHTML = newContent;
      initMediaResizeHandlers();
      
      if (window.lucide) {
        window.lucide.createIcons();
      }
      
      console.log('Block deleted successfully');
    } else {
      console.error('Block not found at index:', blockIndex);
    }
  }

  // ========== Folder Management UI ==========
  
  /**
   * Handle folder selection button click
   */
  async function handleSelectFolder() {
    if (!window.FolderPermissionManager || !window.FolderPermissionManager.isSupported()) {
      alert('File System Access API not supported.\n\nPlease use Chrome 86+ or Edge 86+.');
      return;
    }

    try {
      const dirHandle = await window.FolderPermissionManager.requestFolderPermission();
      if (dirHandle) {
        // Try loading material.json immediately from selected folder.
        let loaded = false;
        if (window.OfflineSiteSaver && window.OfflineSiteSaver.loadMaterialFromFolder) {
          const folderMaterial = await window.OfflineSiteSaver.loadMaterialFromFolder(dirHandle);
          if (folderMaterial && window.ModeManager && window.ModeManager.setMaterialFromSource) {
            loaded = window.ModeManager.setMaterialFromSource(folderMaterial) === true;
            if (loaded && enabled) {
              refresh();
            }
          }
        }

        updateFolderStatusDisplay();
        if (loaded) {
          alert(`Folder selected: ${window.FolderPermissionManager.getFolderName(dirHandle)}\n\nLoaded material.json from this folder.`);
        } else {
          alert(`Folder selected: ${window.FolderPermissionManager.getFolderName(dirHandle)}\n\nNo valid material.json found in this folder yet. Click "Save All" to initialize it.`);
        }
      }
    } catch (error) {
      console.error('Folder selection error:', error);
      alert(`Failed to select folder: ${error.message}`);
    }
  }

  /**
   * Update folder status display in toolbar
   */
  async function updateFolderStatusDisplay() {
    const statusEl = document.getElementById('folder-status');
    const nameEl = document.getElementById('folder-name');
    const selectBtn = document.getElementById('select-folder-btn');
    
    if (!statusEl || !nameEl || !selectBtn) return;
    if (!window.FolderPermissionManager) return;

    try {
      const dirHandle = await window.FolderPermissionManager.getFolderHandle();
      
      if (dirHandle) {
        const folderName = window.FolderPermissionManager.getFolderName(dirHandle);
        nameEl.textContent = folderName || 'Selected';
        statusEl.classList.remove('hidden');
        statusEl.classList.add('flex');
        
        // Update button text
        const icon = selectBtn.querySelector('i');
        const text = selectBtn.childNodes[selectBtn.childNodes.length - 1];
        if (text && text.nodeType === Node.TEXT_NODE) {
          text.textContent = 'Change Folder';
        }
      } else {
        statusEl.classList.add('hidden');
        statusEl.classList.remove('flex');
        
        // Reset button text
        const icon = selectBtn.querySelector('i');
        const text = selectBtn.childNodes[selectBtn.childNodes.length - 1];
        if (text && text.nodeType === Node.TEXT_NODE) {
          text.textContent = 'Select Folder';
        }
      }

      // Reinitialize icons
      if (window.lucide) {
        window.lucide.createIcons();
      }
    } catch (error) {
      console.warn('Failed to update folder status:', error);
    }
  }

  function refresh() {
    if (!enabled) return;
    
    // Clean up observer before re-enabling
    cleanupSectionObserver();
    
    disable();
    enable();
  }

  function refreshSidebar() {
    if (enabled && editorSidebar) {
      updateSidebarContent();
      // Re-setup observer after sidebar update
      setTimeout(() => {
        if (enabled) {
          cleanupSectionObserver();
          setupSectionObserver();
        }
      }, 200);
    }
  }

  return {
    enable,
    disable,
    refresh,
    refreshSidebar,
    setupCitationClickHandlers,
    removeCitationClickHandlers
  };
})();
