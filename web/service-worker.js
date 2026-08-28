// アプリ本体(HTML/CSS/JS/アイコン)をキャッシュし、オフラインでも起動・閲覧・
// 編集ができるようにする。openBD・Google Books・楽天ブックス・カーリルなど
// 外部APIへのリクエストはキャッシュ対象外(素通し)にしており、それらの機能は
// ネットワーク接続時のみ動作する。

const CACHE_NAME = "reading-tracker-v1";

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./css/styles.css",
  "./js/app.js",
  "./js/db.js",
  "./js/models.js",
  "./js/genreClassifier.js",
  "./js/openbd.js",
  "./js/googleBooks.js",
  "./js/lookupCoordinator.js",
  "./js/scanner.js",
  "./js/utils.js",
  "./js/views/sheet.js",
  "./js/views/bookFormFields.js",
  "./js/views/addBookView.js",
  "./js/views/bookDetailView.js",
  "./js/views/scanSheet.js",
  "./js/views/searchSheet.js",
  "./js/views/shelfView.js",
  "./js/views/placeholders.js",
  "./vendor/zxing.min.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // 同一オリジンのアプリ本体だけをキャッシュ対象にする。
  // openBD/Google Books等の外部APIリクエストは素通しし、常に最新を取りに行く。
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networkFetch = fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});
