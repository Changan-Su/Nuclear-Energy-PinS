/**
 * File System Writer
 * Utilities for writing files to a local folder using File System Access API
 */

window.FileSystemWriter = (function() {
  'use strict';

  /**
   * Write a text file to the directory
   * @param {FileSystemDirectoryHandle} dirHandle
   * @param {string} path - File path (can include subdirectories, e.g., 'css/styles.css')
   * @param {string} content
   */
  async function writeTextFile(dirHandle, path, content) {
    const fileHandle = await getFileHandleForPath(dirHandle, path, true);
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  /**
   * Write a binary file (Blob) to the directory
   * @param {FileSystemDirectoryHandle} dirHandle
   * @param {string} path
   * @param {Blob} blob
   */
  async function writeBinaryFile(dirHandle, path, blob) {
    const fileHandle = await getFileHandleForPath(dirHandle, path, true);
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
  }

  /**
   * Get file handle for a path (handles nested directories)
   * @param {FileSystemDirectoryHandle} dirHandle
   * @param {string} path
   * @param {boolean} create
   * @returns {Promise<FileSystemFileHandle>}
   */
  async function getFileHandleForPath(dirHandle, path, create = false) {
    const parts = path.split('/');
    const fileName = parts.pop();
    
    // Navigate to subdirectories
    let currentDir = dirHandle;
    for (const part of parts) {
      if (part) {
        currentDir = await currentDir.getDirectoryHandle(part, { create });
      }
    }
    
    return await currentDir.getFileHandle(fileName, { create });
  }

  /**
   * Create a directory (and parent directories if needed)
   * @param {FileSystemDirectoryHandle} dirHandle
   * @param {string} path
   */
  async function createDirectory(dirHandle, path) {
    const parts = path.split('/').filter(p => p);
    let currentDir = dirHandle;
    
    for (const part of parts) {
      currentDir = await currentDir.getDirectoryHandle(part, { create: true });
    }
    
    return currentDir;
  }

  /**
   * Batch write files from a map
   * @param {FileSystemDirectoryHandle} dirHandle
   * @param {Object} fileMap - { 'path/to/file.txt': 'content' or Blob }
   * @param {Function} progressCallback - Optional callback(current, total, filename)
   */
  async function batchWriteFiles(dirHandle, fileMap, progressCallback = null) {
    const entries = Object.entries(fileMap);
    const total = entries.length;
    let current = 0;

    for (const [path, content] of entries) {
      current++;
      if (progressCallback) {
        progressCallback(current, total, path);
      }

      if (content instanceof Blob) {
        await writeBinaryFile(dirHandle, path, content);
      } else if (typeof content === 'string') {
        await writeTextFile(dirHandle, path, content);
      } else {
        console.warn(`Skipping unsupported content type for ${path}`);
      }
    }
  }

  /**
   * Fetch a file from URL and write to directory
   * @param {FileSystemDirectoryHandle} dirHandle
   * @param {string} url - URL to fetch
   * @param {string} targetPath - Where to save in the directory
   * @returns {Promise<boolean>} - Success status
   */
  async function fetchAndWrite(dirHandle, url, targetPath) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) return false;
      
      const blob = await response.blob();
      await writeBinaryFile(dirHandle, targetPath, blob);
      return true;
    } catch (error) {
      console.warn(`Failed to fetch and write ${url}:`, error);
      return false;
    }
  }

  /**
   * Check if a file exists
   * @param {FileSystemDirectoryHandle} dirHandle
   * @param {string} path
   * @returns {Promise<boolean>}
   */
  async function fileExists(dirHandle, path) {
    try {
      await getFileHandleForPath(dirHandle, path, false);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Read a text file from the directory
   * @param {FileSystemDirectoryHandle} dirHandle
   * @param {string} path
   * @returns {Promise<string|null>}
   */
  async function readTextFile(dirHandle, path) {
    try {
      const fileHandle = await getFileHandleForPath(dirHandle, path, false);
      const file = await fileHandle.getFile();
      return await file.text();
    } catch (error) {
      console.warn(`Failed to read ${path}:`, error);
      return null;
    }
  }

  /**
   * Delete a file
   * @param {FileSystemDirectoryHandle} dirHandle
   * @param {string} path
   * @returns {Promise<boolean>}
   */
  async function deleteFile(dirHandle, path) {
    try {
      const parts = path.split('/');
      const fileName = parts.pop();
      
      let currentDir = dirHandle;
      for (const part of parts) {
        if (part) {
          currentDir = await currentDir.getDirectoryHandle(part, { create: false });
        }
      }
      
      await currentDir.removeEntry(fileName);
      return true;
    } catch (error) {
      console.warn(`Failed to delete ${path}:`, error);
      return false;
    }
  }

  return {
    writeTextFile,
    writeBinaryFile,
    getFileHandleForPath,
    createDirectory,
    batchWriteFiles,
    fetchAndWrite,
    fileExists,
    readTextFile,
    deleteFile
  };
})();
