/**
 * Folder Permission Manager
 * Manages File System Access API permissions for local folder persistence
 */

window.FolderPermissionManager = (function() {
  'use strict';

  const DB_NAME = 'pins_folder_permissions';
  const DB_VERSION = 1;
  const STORE_NAME = 'folder_handles';
  const HANDLE_KEY = 'working_folder';

  /**
   * Check if File System Access API is supported
   */
  function isSupported() {
    return 'showDirectoryPicker' in window;
  }

  /**
   * Open IndexedDB for storing folder handles
   */
  function openDB() {
    return new Promise((resolve, reject) => {
      if (!window.indexedDB) {
        reject(new Error('IndexedDB not available'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Request user to select a folder
   * @returns {Promise<FileSystemDirectoryHandle|null>}
   */
  async function requestFolderPermission() {
    if (!isSupported()) {
      throw new Error('File System Access API not supported. Please use Chrome 86+ or Edge 86+');
    }

    try {
      const dirHandle = await window.showDirectoryPicker({
        mode: 'readwrite',
        startIn: 'documents'
      });

      // Save handle to IndexedDB
      await saveFolderHandle(dirHandle);

      return dirHandle;
    } catch (error) {
      if (error.name === 'AbortError') {
        // User cancelled, not an error
        console.info('Folder selection cancelled by user');
        return null;
      }
      throw error;
    }
  }

  /**
   * Save folder handle to IndexedDB
   * @param {FileSystemDirectoryHandle} dirHandle
   */
  async function saveFolderHandle(dirHandle) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(dirHandle, HANDLE_KEY);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
    });
  }

  /**
   * Get saved folder handle from IndexedDB
   * @returns {Promise<FileSystemDirectoryHandle|null>}
   */
  async function getFolderHandle() {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get(HANDLE_KEY);

        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
        tx.onerror = () => db.close();
      });
    } catch (error) {
      console.warn('Failed to get folder handle:', error);
      return null;
    }
  }

  /**
   * Verify if we still have permission to access the folder
   * @param {FileSystemDirectoryHandle} dirHandle
   * @param {string} mode - 'read' or 'readwrite'
   * @returns {Promise<boolean>}
   */
  async function verifyPermission(dirHandle, mode = 'readwrite', requestIfNeeded = true) {
    if (!dirHandle) return false;

    const options = { mode };

    // Check if permission was already granted
    if ((await dirHandle.queryPermission(options)) === 'granted') {
      return true;
    }

    if (!requestIfNeeded) {
      return false;
    }

    // Request permission again (must be user gesture in some browsers)
    try {
      if ((await dirHandle.requestPermission(options)) === 'granted') {
        return true;
      }
    } catch (error) {
      return false;
    }

    return false;
  }

  /**
   * Get folder handle with automatic permission verification
   * @param {string} mode - 'read' or 'readwrite'
   * @returns {Promise<FileSystemDirectoryHandle|null>}
   */
  async function getVerifiedFolderHandle(mode = 'readwrite', options = {}) {
    const { requestIfNeeded = true } = options;
    const handle = await getFolderHandle();
    if (!handle) return null;

    if (await verifyPermission(handle, mode, requestIfNeeded)) {
      return handle;
    }

    return null;
  }

  /**
   * Clear saved folder handle
   */
  async function clearFolderHandle() {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const request = store.delete(HANDLE_KEY);

        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
        tx.onerror = () => db.close();
      });
    } catch (error) {
      console.warn('Failed to clear folder handle:', error);
      return false;
    }
  }

  /**
   * Get folder name from handle
   * @param {FileSystemDirectoryHandle} dirHandle
   * @returns {string}
   */
  function getFolderName(dirHandle) {
    return dirHandle ? dirHandle.name : '';
  }

  return {
    isSupported,
    requestFolderPermission,
    saveFolderHandle,
    getFolderHandle,
    verifyPermission,
    getVerifiedFolderHandle,
    clearFolderHandle,
    getFolderName
  };
})();
