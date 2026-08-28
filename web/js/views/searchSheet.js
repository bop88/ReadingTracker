import { openSheet } from "./sheet.js";
import { searchByKeyword } from "../googleBooks.js";
import { escapeHTML, bindActivate } from "../utils.js";

/**
 * タイトル・著者・ISBNでの手動検索画面。
 * openBDは全文検索非対応のため、Google Books APIのみを使用する。
 * @param {{ onSelect: (result: object) => void }} options
 */
export function openSearchSheet({ onSelect }) {
  const api = openSheet({
    title: "本を検索",
    leftButton: { label: "閉じる", onClick: (api) => api.close() },
    build: (body, apiRef) => {
      body.innerHTML = `
        <div style="padding: 0 16px 12px;">
          <input
            type="search"
            id="search-input"
            placeholder="タイトル・著者・ISBN"
            style="width:100%;padding:10px 12px;border-radius:10px;border:1px solid var(--color-border);
                   background:var(--color-surface);color:var(--color-text);font-size:15px;"
          />
        </div>
        <div id="search-results"></div>
      `;
      const input = body.querySelector("#search-input");
      const resultsEl = body.querySelector("#search-results");

      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          runSearch(input.value, resultsEl, apiRef);
        }
      });
      input.focus();
    },
  });

  async function runSearch(query, resultsEl, apiRef) {
    const trimmed = query.trim();
    if (!trimmed) return;

    resultsEl.innerHTML = `<div class="loading-row"><div class="spinner"></div>検索しています…</div>`;
    try {
      const results = await searchByKeyword(trimmed);
      renderResults(results, resultsEl, apiRef);
    } catch {
      resultsEl.innerHTML = `<div class="notice warning">検索に失敗しました。ネットワーク接続をご確認ください。</div>`;
    }
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
