// モーダルシート(画面下からせり上がる/中央表示のダイアログ)の共通実装。
// AddBookView・BookSearchView・BarcodeScanSheet・BookDetailViewの土台として使う。
//
// 重要: `build(body, api)` は openSheet() の呼び出しが完了する“前”に同期的に
// 実行される。呼び出し側で `const api = openSheet(...)` のように受け取った変数を
// build内で参照すると初期化前アクセス(TDZ)エラーになるため、build内では必ず
// 渡された引数の api を使うこと(呼び出し側の変数を閉じ込めない)。

export function openSheet({ title, leftButton, rightButton, build, centered = false }) {
  const root = document.getElementById("modal-root");

  const overlay = document.createElement("div");
  overlay.className = centered ? "sheet-overlay centered" : "sheet-overlay";

  const sheetEl = document.createElement("div");
  sheetEl.className = "sheet";

  const header = document.createElement("div");
  header.className = "sheet-header";

  const leftBtn = document.createElement("button");
  const titleEl = document.createElement("h2");
  titleEl.textContent = title;
  const rightBtn = document.createElement("button");
  header.append(leftBtn, titleEl, rightBtn);

  const bodyEl = document.createElement("div");
  bodyEl.className = "sheet-body";

  sheetEl.append(header, bodyEl);
  overlay.append(sheetEl);

  const api = {
    body: bodyEl,
    overlay,
    close: () => overlay.remove(),
    setRightEnabled: (enabled) => {
      rightBtn.disabled = !enabled;
    },
    setTitle: (text) => {
      titleEl.textContent = text;
    },
  };

  function wireButton(btnEl, config, isPrimary) {
    if (!config) {
      btnEl.style.visibility = "hidden";
      return;
    }
    btnEl.textContent = config.label;
    if (isPrimary) btnEl.classList.add("primary");
    if (config.disabled) btnEl.disabled = true;
    btnEl.addEventListener("click", () => config.onClick(api));
  }
  wireButton(leftBtn, leftButton, false);
  wireButton(rightBtn, rightButton, true);

  root.appendChild(overlay);
  build(bodyEl, api);

  return api;
}
