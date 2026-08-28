import { openSheet } from "./sheet.js";
import { searchByKeyword } from "../googleBooks.js";
import { escapeHTML, bindActivate } from "../utils.js";

const DEBOUNCE_MS = 500;

/**
 * タイトル・著者・ISBNでの手動検索画面。
 * openBDは全文検索非対応のため、Google Books APIのみを使用する。
 *
 * 検索の実行は3通りに対応する(モバイルの仮想キーボードでEnterキー相当の
 * 挙動が確実に拾えないケースがあるため、どれか1つに依存しない):
 * - 入力から少し経ったら自動的に検索(デバウンス)
 * - 仮想キーボードの「検索」ボタン(<form>のsubmitイベント)
 * - 画面上の「検索」ボタンをタップ
 *
 * @param {{ onSelect: (result: object) => void }} options
 */
export function openSearchSheet({ onSelect }) {
  let debounceTimer = null;
  let requestSeq = 0;

  const api = openSheet({
    title: "本を検索",
    leftButton: { label: "閉じる", onClick: (api) => api.close() },
    build: (body, apiRef) => {
      body.innerHTML = `
        <form id="search-form" style="display:flex;gap:8px;padding:0 16px 12px;">
          <input
            type="search"
            id="search-input"
            placeholder="タイトル・著者・ISBN"
            autocomplete="off"
            style="flex:1;min-width:0;padding:10px 12px;border-radius:10px;border:1px solid var(--color-border);
                   background:var(--color-surface);color:var(--color-text);font-size:15px;"
          />
          <button type="submit" class="btn" style="flex-shrink:0;">検索</button>
        </form>
        <div id="search-results"></div>
      `;
      const form = body.querySelector("#search-form");
      const input = body.querySelector("#search-input");
      const resultsEl = body.querySelector("#search-results");

      form.addEventListener("submit", (e) => {
        e.preventDefault();
        clearTimeout(debounceTimer);
        runSearch(input.value, resultsEl, apiRef);
      });

      input.addEventListener("input", () => {
        clearTimeout(debounceTimer);
        const value = input.value;
        if (!value.trim()) {
          resultsEl.innerHTML = "";
          return;
        }
        debounceTimer = setTimeout(() => runSearch(value, resultsEl, apiRef), DEBOUNCE_MS);
      });

      input.focus();
    },
  });

  async function runSearch(query, resultsEl, apiRef) {
    const trimmed = query.trim();
    if (!trimmed) return;

    const seq = ++requestSeq;
    resultsEl.innerHTML = `<div class="loading-row"><div class="spinner"></div>検索しています…</div>`;

    let results;
    try {
      results = await searchByKeyword(trimmed);
    } catch (err) {
      if (seq !== requestSeq) return; // 入力中に別の検索が走っていたら結果を捨てる
      console.warn("Search error:", err);
      resultsEl.innerHTML = `<div class="notice warning">${searchErrorMessage(err)}</div>`;
      return;
    }
    if (seq !== requestSeq) return;
    renderResults(results, resultsEl, apiRef);
  }

  function renderResults(results, resultsEl, apiRef) {
    if (results.length === 0) {
      resultsEl.innerHTML = `<div class="empty-state">該当する本が見つかりませんでした</div>`;
      return;
    }

    resultsEl.innerHTML = `<div class="card-list" style="margin:0 16px;"></div>`;
    const list = resultsEl.querySelector(".card-list");
    for (const result of results) {
      const row = document.createElement("div");
      row.className = "book-row";
      row.setAttribute("role", "button");
      row.setAttribute("tabindex", "0");
      row.innerHTML = `
        <div class="cover placeholder">📕</div>
        <div class="info">
          <div class="title">${escapeHTML(result.title || "(タイトル不明)")}</div>
          ${result.author ? `<div class="author">${escapeHTML(result.author)}</div>` : ""}
          ${result.publisher ? `<div class="meta">${escapeHTML(result.publisher)}</div>` : ""}
        </div>
      `;
      bindActivate(row, () => {
        apiRef.close();
        onSelect(result);
      });
      list.appendChild(row);
    }
  }

  return api;
}

function searchErrorMessage(err) {
  const detail = `<br /><span style="font-size:11px;opacity:0.7;">(${escapeHTML(err?.name ?? "")}: ${escapeHTML(err?.message ?? "")})</span>`;
  if (err?.status === 429) {
    return "Google Books の無料枠の上限に達したようです。しばらく時間をおいてから、もう一度お試しください。" + detail;
  }
  return "検索に失敗しました。ネットワーク接続をご確認ください。" + detail;
}
