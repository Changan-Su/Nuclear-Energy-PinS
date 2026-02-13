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
    enableReferenceEditing();
    setupAtMentionSystem();
  }

  function disable() {
    if (!enabled) return;
    enabled = false;
    
    // Remove edit-mode class from body
    document.body.classList.remove('edit-mode');
    
    removeEditToolbar();
    removeEditorSidebar();
    cleanupSectionObserver();
    disableInlineEditing();
    disableSectionToolbars();
    disableImageEditing();
    disableFlipToggles();
    disableReferenceEditing();
    cleanupAtMentionSystem();
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
    document.getElementById('export-btn')?.addEventListener('click', exportMaterial);
    document.getElementById('import-btn')?.addEventListener('click', () => {
      document.getElementById('import-input')?.click();
    });
    document.getElementById('import-input')?.addEventListener('change', handleImport);
    
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
      
      // Update navigation links
      if (window.SectionRenderer && window.SectionRenderer.render) {
        // Just update nav links without full re-render
        setTimeout(() => {
          const navEvent = new CustomEvent('nav-update');
          document.dispatchEvent(navEvent);
        }, 100);
      }
    }
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
      if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA' && el.tagName !== 'BUTTON') {
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
    const images = document.querySelectorAll('[data-material-img]');
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

  function applyMediaPreview(element, url) {
    const existingVideo = element.querySelector(':scope > video[data-material-video="true"]');
    const shouldRenderVideo = isVideoUrl(url);

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
      return;
    }

    if (existingVideo) {
      existingVideo.remove();
    }
    element.style.backgroundImage = `url(${url})`;
    element.style.backgroundSize = 'cover';
    element.style.backgroundPosition = 'center';
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
      material.index[id] = {
        title: 'New Section',
        description: 'Edit this content'
      };
    }
    
    window.ModeManager.updateMaterialInMemory(material);
    window.SectionRenderer.render();
    refresh();
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
      // Offline mode: persist to browser localStorage draft
      const ok = window.ModeManager.saveOfflineDraft
        ? window.ModeManager.saveOfflineDraft(material)
        : false;
      if (ok) {
        alert('Saved to offline draft successfully. Refresh will keep your changes. Use Export to download a JSON file.');
      } else {
        alert('Failed to save offline draft. Please use Export to avoid losing changes.');
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

    if (state.dataMode !== 'online') {
      alert('Package export requires Online mode (to include server media files).');
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
    a.download = `site-package-${new Date().toISOString().split('T')[0]}.zip`;
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
        if (state.dataMode !== 'online') {
          alert('Package import requires Online mode.');
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
    }
    
    // Reset input
    event.target.value = '';
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
