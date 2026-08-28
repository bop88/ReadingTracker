// IndexedDBの薄いラッパー。データはすべて端末内(ブラウザのローカルストレージ)に
// 保存され、サーバーへは一切送信しない。
//
// 「ホーム画面に追加」したPWAはiOSのITP(7日間操作が無いとサイトデータを消去する
// 仕組み)の対象外になる。バックアップ/エクスポート機能([backup.js]予定)も
// 用意し、機種変更時などに備えられるようにする。

const DB_NAME = "reading-tracker";
const DB_VERSION = 1;
const BOOKS_STORE = "books";
const GOALS_STORE = "goals";

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(BOOKS_STORE)) {
        const store = db.createObjectStore(BOOKS_STORE, { keyPath: "id" });
        store.createIndex("isbn", "isbn", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("status", "status", { unique: false });
      }
      if (!db.objectStoreNames.contains(GOALS_STORE)) {
        db.createObjectStore(GOALS_STORE, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function getAllBooks() {
  const db = await openDB();
  const tx = db.transaction(BOOKS_STORE, "readonly");
  const books = await requestToPromise(tx.objectStore(BOOKS_STORE).getAll());
  return books.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getBook(id) {
  const db = await openDB();
  const tx = db.transaction(BOOKS_STORE, "readonly");
  return requestToPromise(tx.objectStore(BOOKS_STORE).get(id));
}

export async function findBookByISBN(isbn) {
  if (!isbn) return null;
  const db = await openDB();
  const tx = db.transaction(BOOKS_STORE, "readonly");
  const index = tx.objectStore(BOOKS_STORE).index("isbn");
  const result = await requestToPromise(index.get(isbn));
  return result || null;
}

export async function putBook(book) {
  const db = await openDB();
  const tx = db.transaction(BOOKS_STORE, "readwrite");
  tx.objectStore(BOOKS_STORE).put(book);
  await txDone(tx);
  return book;
}

export async function deleteBook(id) {
  const db = await openDB();
  const tx = db.transaction(BOOKS_STORE, "readwrite");
  tx.objectStore(BOOKS_STORE).delete(id);
  return txDone(tx);
}

// MARK: - 読書目標

export async function getAllGoals() {
  const db = await openDB();
  const tx = db.transaction(GOALS_STORE, "readonly");
  return requestToPromise(tx.objectStore(GOALS_STORE).getAll());
}

export async function putGoal(goal) {
  const db = await openDB();
  const tx = db.transaction(GOALS_STORE, "readwrite");
  tx.objectStore(GOALS_STORE).put(goal);
  await txDone(tx);
  return goal;
}
