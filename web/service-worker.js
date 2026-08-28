// アプリ本体(HTML/CSS/JS/アイコン)をキャッシュし、オフラインでも起動・閲覧・
// 編集ができるようにする。openBD・Google Books・楽天ブックス・カーリルなど
// 外部APIへのリクエストはキャッシュ対象外(素通し)にしており、それらの機能は
// ネットワーク接続時のみ動作する。
//
// キャッシュ戦略は「ネットワーク優先(オフライン時のみキャッシュへフォールバック)」。
// 以前は cache-first にしていたが、それだと一度キャッシュされたファイルは
// デプロイして更新しても永久に古いまま配信され続けてしまう(SW自体の内容が
// 変わらない限りブラウザがSWの更新自体を検知しないため)。開発中で頻繁に
// 更新するアプリなので、オンライン時は常に最新を取りに行く方針にしている。
//
// CACHE_NAME は互換性が壊れる変更をした時など、キャッシュを丸ごと作り直したい
// 時にだけ上げればよい(通常の更新は network-first なので上げなくても届く)。
const CACHE_NAME = "reading-tracker-v3";

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
  "./js/views/filterSheet.js",
  "./js/views/placeholders.js",
  "./vendor/zxing.min.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-512-maskable.png",
];

self.addEventListener("install", (event) => {
  // cache.addAll() は内部でブラウザの通常のfetchを使うため、ここでも
  // cache: "no-store" を効かせるために1件ずつ手動でfetch+putする
  // (addAllにRequestオブジェクトの配列を渡しても同様に効かせられるが、
  // 1件失敗した時にどのURLかが分かりやすいようループにしている)。
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        APP_SHELL.map(async (url) => {
          try {
            const response = await fetch(url, { cache: "no-store" });
            if (response.ok) await cache.put(url, response);
          } catch (err) {
            console.warn("Precache failed for", url, err);
          }
        })
      )
    )
  );
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

  // cache: "no-store" が重要: 指定しないと、SWが「ネットワークから取る」つもりでも
  // ブラウザの通常のHTTPキャッシュ(GitHub PagesのCache-Controlヘッダ)に
  // 素通りされて古いレスポンスが返ってくることがあり、network-first の意味が
  // なくなってしまう。
  event.respondWith(
    fetch(event.request, { cache: "no-store" })
      .then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
