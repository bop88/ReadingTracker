import { getAllBooks } from "../db.js";
import { statusLabel, isCurrentlyReading } from "../models.js";
import { escapeHTML, bindActivate } from "../utils.js";
import { openAddBookSheet } from "./addBookView.js";
import { openBookDetailSheet } from "./bookDetailView.js";

/**
 * 本棚のメイン画面(現段階ではリスト表示のみ)。
 *
 * フェーズ4で以下を追加する:
 * - グリッド表示 / 本棚風表示との切り替え(表示モード切替)
 * - ステータス・ジャンル・作者・タグでの複合フィルターとソート
 * - キーワード検索(タイトル・著者・メモ)
 */
export async function renderShelfView(container) {
  const headerActions = document.getElementById("app-header-actions");
  headerActions.innerHTML = `<button class="icon-btn" id="add-book-btn" aria-label="本を追加">＋</button>`;
  headerActions.querySelector("#add-book-btn").onclick = () => {
    openAddBookSheet({ onSaved: () => renderShelfView(container) });
  };

  container.innerHTML = `<div class="loading-row"><div class="spinner"></div>読み込み中…</div>`;
  const books = await getAllBooks();

  if (books.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span class="icon">📚</span>
        本が登録されていません<br />
        右上の ＋ から本を追加してください
      </div>`;
    return;
  }

  container.innerHTML = `<div class="section"><div class="card-list" id="book-list"></div></div>`;
  const listEl = container.querySelector("#book-list");
  for (const book of books) {
    listEl.appendChild(renderBookRow(book, () => renderShelfView(container)));
  }
}

function renderBookRow(book, onChange) {
  const row = document.createElement("div");
  row.className = "book-row";
  row.setAttribute("role", "button");
  row.setAttribute("tabindex", "0");

  if (book.coverImageBlob) {
    const img = document.createElement("img");
    img.className = "cover";
    img.src = URL.createObjectURL(book.coverImageBlob);
    img.alt = "";
    row.appendChild(img);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "cover placeholder";
    placeholder.textContent = "📕";
    row.appendChild(placeholder);
  }

  const info = document.createElement("div");
  info.className = "info";
  const ratingStars = book.rating > 0 ? `<span class="stars">${"★".repeat(book.rating)}</span> ` : "";
  const readingNow = isCurrentlyReading(book) ? " · 読書中" : "";
  info.innerHTML = `
    <div class="title">${escapeHTML(book.title)}</div>
    ${book.author ? `<div class="author">${escapeHTML(book.author)}</div>` : ""}
    <div class="meta">${ratingStars}${escapeHTML(statusLabel(book.status))}${readingNow}</div>
  `;
  row.appendChild(info);

  const chevron = document.createElement("div");
  chevron.className = "chevron";
  chevron.textContent = "›";
  row.appendChild(chevron);

  bindActivate(row, () => openBookDetailSheet(book.id, { onChange }));

  return row;
}
