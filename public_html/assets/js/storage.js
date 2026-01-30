/* NexusAI Storage Module - IndexedDB operations for persisting chat tabs and messages */

const DB_NAME = 'nexusai_chat_db';
const DB_VERSION = 1;
const STORE_NAME = 'chat_tabs';

let db = null;

async function init_database() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open IndexedDB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      db = request.result;
      console.log('IndexedDB initialized');
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('created_at', 'created_at', { unique: false });
      }
    };
  });
}

async function get_db() {
  if (!db) {
    await init_database();
  }
  return db;
}

/* Tab Operations */

/* 
 * Save tab data to IndexedDB
 * Strips debug-related fields (request_id) from messages before saving
 * to ensure only essential data is persisted
 */
async function save_tab_data(tab_data) {
  const database = await get_db();
  
  /* Clone tab data and strip request_id from messages */
  const clean_tab = {
    ...tab_data,
    messages: tab_data.messages.map(msg => {
      const { request_id, ...clean_msg } = msg;
      return clean_msg;
    })
  };
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(clean_tab);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function get_all_tabs() {
  const database = await get_db();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function get_tab_by_id(tab_id) {
  const database = await get_db();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(tab_id);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

async function delete_tab_data(tab_id) {
  const database = await get_db();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(tab_id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function update_tab_messages(tab_id, messages) {
  const tab = await get_tab_by_id(tab_id);
  if (tab) {
    tab.messages = messages;
    await save_tab_data(tab);
  }
}

async function clear_all() {
  const database = await get_db();
  
  return new Promise((resolve, reject) => {
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export const storage = {
  init_database,
  save_tab_data,
  get_all_tabs,
  get_tab_by_id,
  delete_tab_data,
  update_tab_messages,
  clear_all
};

// Also export individual functions
export {
  init_database,
  save_tab_data,
  get_all_tabs,
  get_tab_by_id,
  delete_tab_data,
  update_tab_messages,
  clear_all
};
