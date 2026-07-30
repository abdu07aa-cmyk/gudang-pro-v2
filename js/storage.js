// storage.js - Offline-first dengan IndexedDB
const DB_NAME = 'QCDatabase';
const DB_VERSION = 1;

export function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains('inspections')) {
                db.createObjectStore('inspections', { keyPath: 'id', autoIncrement: true });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function saveInspection(data) {
    const db = await openDB();
    const tx = db.transaction('inspections', 'readwrite');
    const store = tx.objectStore('inspections');
    store.add(data);
    return new Promise(resolve => tx.oncomplete = resolve);
}

export async function getAllInspections() {
    const db = await openDB();
    return new Promise((resolve) => {
        const tx = db.transaction('inspections', 'readonly');
        const store = tx.objectStore('inspections');
        const result = store.getAll();
        result.onsuccess = () => resolve(result.result);
    });
}
