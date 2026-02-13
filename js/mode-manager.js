/**
 * Mode Manager - Handles dual-axis mode system:
 * 1. Data Source: Offline (local JSON) <-> Online (MySQL via API)
 * 2. UI Mode: View (read-only) <-> Edit (inline editing)
 */

window.ModeManager = (function() {
  'use strict';

  const API_BASE = 'http://localhost:3009/api';
  const OFFLINE_DRAFT_KEY = 'pins_offline_material_draft';
  const MAX_HISTORY = 50;
  
  let state = {
    dataMode: 'offline', // 'offline' | 'online'
    uiMode: 'view',      // 'view' | 'edit'
    token: null,
    material: null,
    originalMaterial: null, // For discarding changes
    hasUnsavedChanges: false
  };

  let elements = {
    cloudBtn: null,
    editBtn: null,
    saveBtn: null,
    undoBtn: null,
    redoBtn: null,
    statusPill: null,
    loginModal: null
  };

  let undoStack = [];
  let redoStack = [];

  function init() {
    // Check for saved token
    const savedToken = sessionStorage.getItem('cms_token');
    if (savedToken) {
      state.token = savedToken;
      verifyToken().then(valid => {
        if (!valid) {
          state.token = null;
          sessionStorage.removeItem('cms_token');
        }
      });
    }

    try {
      createModeControls();
    } catch (e) {
      console.warn('Mode controls init error:', e);
    }

    bindKeyboardShortcuts();
    
    // Always load material, even if mode controls failed
    loadMaterial();
  }

  function createModeControls() {
    const navbar = document.getElementById('navbar');
    if (!navbar) return;

    const controlsHtml = `
      <div class="mode-controls flex items-center gap-3 mr-4">
        <button id="cloud-btn" class="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10" title="Toggle Online/Offline">
          <i data-lucide="cloud-off" class="w-5 h-5 text-white/60"></i>
        </button>
        <button id="edit-btn" class="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10" title="Toggle Edit/View">
          <i data-lucide="eye" class="w-5 h-5 text-white/60"></i>
        </button>
        <button id="undo-btn" class="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10" title="Undo (Ctrl+Z)">
          <i data-lucide="undo-2" class="w-5 h-5 text-white/60"></i>
        </button>
        <button id="redo-btn" class="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-white/10" title="Redo (Ctrl+Y)">
          <i data-lucide="redo-2" class="w-5 h-5 text-white/60"></i>
        </button>
        <button id="save-btn" class="px-3 h-8 rounded-full flex items-center justify-center transition-all bg-accent-blue text-white text-xs font-medium hover:bg-blue-600" title="Save (Ctrl+S)">
          Save
        </button>
        <div id="status-pill" class="px-3 py-1 rounded-full bg-white/10 text-xs text-white/60">
          Offline | View
        </div>
      </div>
    `;

    const container = navbar.querySelector('div');
    if (container) {
      container.insertAdjacentHTML('afterbegin', controlsHtml);
    } else {
      console.warn('Navbar container not found');
      return;
    }

    elements.cloudBtn = document.getElementById('cloud-btn');
    elements.editBtn = document.getElementById('edit-btn');
    elements.saveBtn = document.getElementById('save-btn');
    elements.undoBtn = document.getElementById('undo-btn');
    elements.redoBtn = document.getElementById('redo-btn');
    elements.statusPill = document.getElementById('status-pill');

    // Event listeners
    if (elements.cloudBtn) {
      elements.cloudBtn.addEventListener('click', toggleDataMode);
    }
    if (elements.editBtn) {
      elements.editBtn.addEventListener('click', toggleUIMode);
    }
    if (elements.saveBtn) {
      elements.saveBtn.addEventListener('click', saveCurrentMaterial);
    }
    if (elements.undoBtn) {
      elements.undoBtn.addEventListener('click', undo);
    }
    if (elements.redoBtn) {
      elements.redoBtn.addEventListener('click', redo);
    }

    // Don't call lucide.createIcons() here — updateUI() will handle it at the end
    updateUI();
  }

  function toggleDataMode() {
    if (state.dataMode === 'offline') {
      // Switch to online - show login if not authenticated
      if (!state.token) {
        showLoginModal();
      } else {
        switchToOnline();
      }
    } else {
      // Switch to offline
      if (state.hasUnsavedChanges && state.uiMode === 'edit') {
        if (!confirm('You have unsaved changes. Switching to offline will discard them. Continue?')) {
          return;
        }
      }
      switchToOffline();
    }
  }

  function toggleUIMode() {
    if (state.uiMode === 'view') {
      switchToEdit();
    } else {
      if (state.hasUnsavedChanges && state.dataMode === 'online') {
        if (!confirm('You have unsaved changes. Are you sure you want to switch to view mode?')) {
          return;
        }
      }
      switchToView();
    }
  }

  function switchToOnline() {
    state.dataMode = 'online';
    updateUI();
    
    // Fetch material from backend
    fetchMaterialFromAPI().then(success => {
      if (!success) {
        alert('Failed to fetch material from server');
        state.dataMode = 'offline';
        updateUI();
      }
    });
  }

  function switchToOffline() {
    state.dataMode = 'offline';
    state.hasUnsavedChanges = false;
    updateUI();
    
    // Reload from local material.json
    loadMaterial();
  }

  function switchToEdit() {
    state.uiMode = 'edit';
    state.originalMaterial = JSON.parse(JSON.stringify(state.material)); // Deep clone
    updateUI();
    
    if (window.EditorSystem) {
      window.EditorSystem.enable();
    }
  }

  function switchToView() {
    state.uiMode = 'view';
    state.hasUnsavedChanges = false;
    updateUI();
    
    if (window.EditorSystem) {
      window.EditorSystem.disable();
    }
  }

  function showLoginModal() {
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'login-modal';
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm';
    modal.innerHTML = `
      <div class="bg-surface-dark border border-white/10 rounded-[32px] p-12 max-w-md w-full mx-4 shadow-2xl">
        <h2 class="text-3xl font-semibold text-white mb-4">Enter Password</h2>
        <p class="text-text-muted mb-8">Enter the admin password to access online mode</p>
        
        <input 
          type="password" 
          id="login-password" 
          placeholder="Password"
          class="w-full p-4 rounded-lg bg-surface-darker border border-white/10 text-white placeholder-white/40 focus:border-accent-cyan/50 outline-none transition-colors mb-4"
        >
        
        <div id="login-error" class="hidden text-red-400 text-sm mb-4"></div>
        
        <div class="flex gap-4">
          <button id="login-submit" class="flex-1 px-6 py-3 rounded-full bg-accent-blue text-white font-medium hover:bg-blue-600 transition-colors">
            Login
          </button>
          <button id="login-cancel" class="flex-1 px-6 py-3 rounded-full border border-white/20 text-white font-medium hover:bg-white/10 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    const passwordInput = document.getElementById('login-password');
    const submitBtn = document.getElementById('login-submit');
    const cancelBtn = document.getElementById('login-cancel');
    const errorEl = document.getElementById('login-error');
    
    passwordInput.focus();
    
    const handleSubmit = async () => {
      const password = passwordInput.value;
      if (!password) {
        showError('Please enter a password');
        return;
      }
      
      submitBtn.disabled = true;
      submitBtn.textContent = 'Logging in...';
      
      const success = await login(password);
      
      if (success) {
        modal.remove();
        switchToOnline();
      } else {
        showError('Incorrect password');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Login';
        passwordInput.value = '';
        passwordInput.focus();
      }
    };
    
    const showError = (msg) => {
      errorEl.textContent = msg;
      errorEl.classList.remove('hidden');
    };
    
    submitBtn.addEventListener('click', handleSubmit);
    cancelBtn.addEventListener('click', () => modal.remove());
    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') handleSubmit();
    });
  }

  async function login(password) {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      
      if (!response.ok) {
        return false;
      }
      
      const data = await response.json();
      state.token = data.token;
      sessionStorage.setItem('cms_token', data.token);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  }

  async function verifyToken() {
    if (!state.token) return false;
    
    try {
      const response = await fetch(`${API_BASE}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: state.token })
      });
      
      const data = await response.json();
      return data.valid === true;
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  }

  function readEmbeddedMaterial() {
    if (window.__PRELOADED_MATERIAL__) {
      return window.__PRELOADED_MATERIAL__;
    }

    const embedded = document.getElementById('material-inline-json');
    if (!embedded) return null;

    try {
      const parsed = JSON.parse(embedded.textContent || '{}');
      window.__PRELOADED_MATERIAL__ = parsed;
      return parsed;
    } catch (e) {
      console.warn('Failed to parse embedded material JSON:', e);
      return null;
    }
  }

  /**
   * Load material data with robust fallbacks.
   * On file://, prefer embedded JSON to avoid browser CORS/security restrictions.
   */
  async function loadMaterial() {
    let materialData = null;
    const isFileProtocol = window.location.protocol === 'file:';

    // Method 1 (http/https): prefer material.json for canonical data.
    // Method 1 (file://): prefer embedded JSON to avoid CORS/security restrictions.
    if (isFileProtocol) {
      materialData = readEmbeddedMaterial();
    } else {
      try {
        const response = await fetch('./material.json');
        materialData = await response.json();
      } catch (e) {
        console.warn('fetch() failed, trying XHR fallback...', e.message);
      }
    }

    // Method 2: Fallback to XMLHttpRequest (may work in some environments)
    if (!materialData && !isFileProtocol) {
      try {
        materialData = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', 'material.json', true);
          xhr.onload = function() {
            // status === 0 is normal for file:// protocol
            if (xhr.status === 200 || xhr.status === 0) {
              try {
                resolve(JSON.parse(xhr.responseText));
              } catch (parseErr) {
                reject(parseErr);
              }
            } else {
              reject(new Error('XHR status: ' + xhr.status));
            }
          };
          xhr.onerror = function() {
            reject(new Error('XHR network error'));
          };
          xhr.send();
        });
      } catch (e) {
        console.warn('XHR fallback also failed:', e.message);
      }
    }

    // Method 3: Final fallback to embedded JSON for any environment.
    if (!materialData) {
      materialData = readEmbeddedMaterial();
    }

    if (!materialData) {
      console.error('Could not load material data. If using file://, ensure embedded material JSON exists in index.html.');
      return;
    }

    // If user has an offline draft, prefer it over material.json
    const offlineDraft = getOfflineDraft();
    if (offlineDraft) {
      materialData = offlineDraft;
      console.info('Loaded offline draft from localStorage');
    }

    state.material = materialData;

    // Initialize section renderer
    if (window.SectionRenderer) {
      window.SectionRenderer.init(materialData, 'index');
    }
  }

  async function fetchMaterialFromAPI() {
    if (!state.token) return false;
    
    try {
      const response = await fetch(`${API_BASE}/material`, {
        headers: {
          'Authorization': `Bearer ${state.token}`
        }
      });
      
      if (!response.ok) {
        return false;
      }
      
      const material = await response.json();
      state.material = material;
      
      // Update renderer
      if (window.SectionRenderer) {
        window.SectionRenderer.updateMaterial(material);
      }
      
      return true;
    } catch (error) {
      console.error('Error fetching material from API:', error);
      return false;
    }
  }

  async function reloadOnlineMaterial() {
    if (state.dataMode !== 'online') return false;
    return fetchMaterialFromAPI();
  }

  async function saveMaterial(material) {
    if (state.dataMode !== 'online' || !state.token) {
      return false;
    }
    
    try {
      const response = await fetch(`${API_BASE}/material`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(material)
      });
      
      if (!response.ok) {
        return false;
      }
      
      state.hasUnsavedChanges = false;
      return true;
    } catch (error) {
      console.error('Error saving material:', error);
      return false;
    }
  }

  async function exportSitePackage() {
    if (state.dataMode !== 'online' || !state.token) {
      return null;
    }

    try {
      const response = await fetch(`${API_BASE}/package/export`, {
        headers: {
          'Authorization': `Bearer ${state.token}`
        }
      });
      if (!response.ok) {
        return null;
      }
      return await response.blob();
    } catch (error) {
      console.error('Error exporting site package:', error);
      return null;
    }
  }

  async function importSitePackage(file) {
    if (state.dataMode !== 'online' || !state.token) {
      return null;
    }

    try {
      const formData = new FormData();
      formData.append('package', file);

      const response = await fetch(`${API_BASE}/package/import`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`
        },
        body: formData
      });
      if (!response.ok) {
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('Error importing site package:', error);
      return null;
    }
  }

  async function patchMaterial(path, value) {
    if (state.dataMode !== 'online' || !state.token) {
      return false;
    }
    
    try {
      const response = await fetch(`${API_BASE}/material`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${state.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ path, value })
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error patching material:', error);
      return false;
    }
  }

  async function uploadMedia(file) {
    if (state.dataMode !== 'online' || !state.token) {
      return null;
    }
    
    try {
      const formData = new FormData();
      formData.append('media', file);
      
      const response = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        return null;
      }
      
      const data = await response.json();
      return data.url;
    } catch (error) {
      console.error('Error uploading media:', error);
      return null;
    }
  }

  async function uploadImage(file) {
    // Backward-compatible alias for existing callers.
    return uploadMedia(file);
  }

  async function saveCurrentMaterial() {
    if (!state.material) {
      alert('Material is not loaded yet');
      return false;
    }

    if (state.dataMode === 'online') {
      const ok = await saveMaterial(state.material);
      alert(ok ? 'Saved to server successfully' : 'Failed to save to server');
      return ok;
    }

    const ok = saveOfflineDraft(state.material);
    alert(ok ? 'Saved to local draft successfully' : 'Failed to save local draft');
    return ok;
  }

  function applyMaterialSnapshot(snapshot) {
    state.material = snapshot;
    state.hasUnsavedChanges = true;

    if (state.dataMode === 'offline') {
      saveOfflineDraft(snapshot);
    }

    if (window.SectionRenderer) {
      window.SectionRenderer.updateMaterial(snapshot);
    }

    if (state.uiMode === 'edit' && window.EditorSystem && window.EditorSystem.refresh) {
      window.EditorSystem.refresh();
    }

    updateUI();
  }

  function captureSnapshot() {
    if (!state.material) return;
    undoStack.push(JSON.parse(JSON.stringify(state.material)));
    if (undoStack.length > MAX_HISTORY) {
      undoStack.shift();
    }
    redoStack = [];
    updateUI();
  }

  function canUndo() {
    return undoStack.length > 0;
  }

  function canRedo() {
    return redoStack.length > 0;
  }

  function undo() {
    if (!canUndo()) return false;
    redoStack.push(JSON.parse(JSON.stringify(state.material)));
    const previous = undoStack.pop();
    applyMaterialSnapshot(previous);
    return true;
  }

  function redo() {
    if (!canRedo()) return false;
    undoStack.push(JSON.parse(JSON.stringify(state.material)));
    const next = redoStack.pop();
    applyMaterialSnapshot(next);
    return true;
  }

  function bindKeyboardShortcuts() {
    window.addEventListener('keydown', (e) => {
      const ctrlOrCmd = e.ctrlKey || e.metaKey;
      if (!ctrlOrCmd) return;

      const target = e.target;
      const isEditableField = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      );

      const key = String(e.key || '').toLowerCase();

      // Save shortcut works in all modes
      if (key === 's') {
        e.preventDefault();
        saveCurrentMaterial();
        return;
      }

      // Undo/Redo shortcuts are app-level in edit mode when not actively typing
      if (state.uiMode !== 'edit' || isEditableField) {
        return;
      }

      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }

      if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    });
  }

  /**
   * Replace icon inside a button container.
   * Handles both <i> (before Lucide) and <svg> (after Lucide processes icons).
   * Creates a fresh <i data-lucide="..."> element and lets Lucide render it.
   */
  function replaceIcon(container, iconName, extraClasses) {
    const oldIcon = container.querySelector('i, svg');
    if (oldIcon) oldIcon.remove();
    
    const newIcon = document.createElement('i');
    newIcon.setAttribute('data-lucide', iconName);
    newIcon.className = 'w-5 h-5 ' + (extraClasses || '');
    container.prepend(newIcon);
  }

  function updateUI() {
    // Update cloud button
    if (elements.cloudBtn) {
      if (state.dataMode === 'online') {
        replaceIcon(elements.cloudBtn, 'cloud', 'text-accent-cyan');
        elements.cloudBtn.classList.add('bg-accent-cyan/20');
      } else {
        replaceIcon(elements.cloudBtn, 'cloud-off', 'text-white/60');
        elements.cloudBtn.classList.remove('bg-accent-cyan/20');
      }
    }
    
    // Update edit button
    if (elements.editBtn) {
      if (state.uiMode === 'edit') {
        replaceIcon(elements.editBtn, 'pencil', 'text-accent-cyan');
        elements.editBtn.classList.add('bg-accent-cyan/20');
      } else {
        replaceIcon(elements.editBtn, 'eye', 'text-white/60');
        elements.editBtn.classList.remove('bg-accent-cyan/20');
      }
    }
    
    // Update status pill
    if (elements.statusPill) {
      const dataText = state.dataMode === 'online' ? 'Online' : 'Offline';
      const uiText = state.uiMode === 'edit' ? 'Edit' : 'View';
      elements.statusPill.textContent = `${dataText} | ${uiText}`;
      
      if (state.dataMode === 'online' || state.uiMode === 'edit') {
        elements.statusPill.classList.remove('text-white/60');
        elements.statusPill.classList.add('text-white');
      } else {
        elements.statusPill.classList.add('text-white/60');
        elements.statusPill.classList.remove('text-white');
      }
    }

    // Update undo/redo button visual state
    if (elements.undoBtn) {
      const enabled = canUndo() && state.uiMode === 'edit';
      elements.undoBtn.classList.toggle('opacity-40', !enabled);
      elements.undoBtn.classList.toggle('cursor-not-allowed', !enabled);
    }
    if (elements.redoBtn) {
      const enabled = canRedo() && state.uiMode === 'edit';
      elements.redoBtn.classList.toggle('opacity-40', !enabled);
      elements.redoBtn.classList.toggle('cursor-not-allowed', !enabled);
    }
    
    // Reinitialize Lucide icons (converts <i data-lucide> to <svg>)
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  function getMaterial() {
    return state.material;
  }

  function updateMaterialInMemory(newMaterial) {
    state.material = newMaterial;
    state.hasUnsavedChanges = true;

    // Persist offline edits automatically as draft
    if (state.dataMode === 'offline') {
      saveOfflineDraft(newMaterial);
    }
  }

  function getState() {
    return { ...state };
  }

  function getOfflineDraft() {
    try {
      const raw = localStorage.getItem(OFFLINE_DRAFT_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Failed to parse offline draft:', e);
      return null;
    }
  }

  function saveOfflineDraft(material) {
    try {
      localStorage.setItem(OFFLINE_DRAFT_KEY, JSON.stringify(material));
      return true;
    } catch (e) {
      console.warn('Failed to save offline draft:', e);
      return false;
    }
  }

  function clearOfflineDraft() {
    try {
      localStorage.removeItem(OFFLINE_DRAFT_KEY);
    } catch (e) {
      console.warn('Failed to clear offline draft:', e);
    }
  }

  return {
    init,
    getMaterial,
    updateMaterialInMemory,
    saveMaterial,
    exportSitePackage,
    importSitePackage,
    reloadOnlineMaterial,
    patchMaterial,
    uploadMedia,
    uploadImage,
    getState,
    getOfflineDraft,
    saveOfflineDraft,
    clearOfflineDraft,
    saveCurrentMaterial,
    captureSnapshot,
    undo,
    redo,
    canUndo,
    canRedo,
    switchToEdit,
    switchToView
  };
})();
