// Browser-Local Project Cache via IndexedDB (Zero Server Upload, Supports Multi-PDF Binary Bytes & Edits)
window.ShibaStorage = (function () {
  "use strict";

  const DB_NAME = "ShibaPDF_WorkspaceDB";
  const DB_VERSION = 1;
  const STORE_NAME = "projects";
  const RECORD_KEY = "active_project_v1";

  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === "undefined") {
        reject(new Error("IndexedDB unavailable"));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (ev) => {
        const db = ev.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        reject(req.error || new Error("Failed to open IndexedDB"));
      };
    });
    return dbPromise;
  }

  async function saveWorkspaceSnapshot(snapshot) {
    try {
      const db = await openDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.put(snapshot, RECORD_KEY);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn("[ShibaStorage] Cache save skipped:", err);
      return false;
    }
  }

  async function loadWorkspaceSnapshot() {
    try {
      const db = await openDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(RECORD_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.warn("[ShibaStorage] Cache load skipped:", err);
      return null;
    }
  }

  async function clearWorkspaceSnapshot() {
    try {
      const db = await openDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.delete(RECORD_KEY);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.warn("[ShibaStorage] Cache clear skipped:", err);
      return false;
    }
  }

  return {
    saveWorkspaceSnapshot,
    loadWorkspaceSnapshot,
    clearWorkspaceSnapshot
  };
})();
