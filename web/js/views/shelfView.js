import { getAllBooks } from "../db.js";
import { statusLabel, isCurrentlyReading } from "../models.js";
import { escapeHTML, bindActivate } from "../utils.js";
import { openAddBookSheet } from "./addBookView.js";
import { openBookDetailSheet } from "./bookDetailView.js";
import { openFilterSheet } from "./filterSheet.js";

const VIEW_MODE_KEY = "reading-tracker.viewMode";
const SORT_KEY = "reading-tracker.sort";

const SORT_OPTIONS = {
  "createdAt-desc": { label: "追加日順(新しい順)", compare: (a, b) => b.createdAt.localeCompare(a.createdAt) },
  "title-asc": { label: "タイトル順", compare: (a, b) => a.title.localeCompare(b.title, "ja") },
  "author-asc": { label: "著者順", compare: (a, b) => (a.author || "").localeCompare(b.author || "", "ja") },
  "finishDate-desc": {
    label: "読了日順(新しい順)",
    compare: (a, b) => (b.finishDate || "").localeCompare(a.finishDate || ""),
  },
  "rating-desc": { label: "評価順(高い順)", compare: (a, b) => (b.rating || 0) - (a.rating || 0) },
};

// タブ切り替えのたびに renderShelfView が呼ばれても表示モード・並び順・検索/
// フィルター条件が失われないよう、モジュールスコープに状態を持つ
// (ブラウザのタブを閉じるまで保持。表示モードと並び順だけは localStorage にも保存)
const state = {
  viewMode: safeGet(VIEW_MODE_KEY) ?? "list",
  sort: safeGet(SORT_KEY) ?? "createdAt-desc",
  query: "",
  filters: { statuses: new Set(), genres: new Set(), authors: new Set(), tags: new Set() },
};

/**
 * 本棚のメイン画面。
 * グリッド/リスト/本棚風の表示切替、ステータス・ジャンル・作者・タグでの
 * 複合フィルター、並び替え、キーワード検索(タイトル・著者・メモ)に対応する。
 */
export async function renderShelfView(container) {
  const headerActions = document.getElementById("app-header-actions");
  headerActions.innerHTML = `<button class="icon-btn" id="add-book-btn" aria-label="本を追加">＋</button>`;
  headerActions.querySelector("#add-book-btn").onclick = () => {
    openAddBookSheet({ onSaved: reload });
  };

  container.innerHTML = `
    <div class="shelf-toolbar">
      <div class="search-input-wrap">
        <span class="search-icon">🔍</span>
        <input type="search" id="shelf-search" placeholder="タイトル・著者・メモを検索" />
      </div>
      <div class="view-mode-toggle" id="view-mode-toggle">
        <button data-mode="list" aria-label="リスト表示" title="リスト表示">☰</button>
        <button data-mode="grid" aria-label="グリッド表示" title="グリッド表示">▦</button>
        <button data-mode="shelf" aria-label="本棚風表示" title="本棚風表示">📚</button>
      </div>
      <button class="filter-btn" id="filter-btn" aria-label="フィルター・並び替え">
        ⇅<span class="badge" id="filter-badge" hidden></span>
      </button>
    </div>
    <div id="shelf-content"><div class="loading-row"><div class="spinner"></div>読み込み中…</div></div>
  `;

  const searchInput = container.querySelector("#shelf-search");
  searchInput.value = state.query;
  searchInput.addEventListener("input", (e) => {
    state.query = e.target.value;
    renderContent();
  });

  for (const btn of container.querySelectorAll("#view-mode-toggle button")) {
    btn.classList.toggle("active", btn.dataset.mode === state.viewMode);
    btn.addEventListener("click", () => {
      state.viewMode = btn.dataset.mode;
      safeSet(VIEW_MODE_KEY, state.viewMode);
      for (const b of container.querySelectorAll("#view-mode-toggle button")) {
        b.classList.toggle("active", b === btn);
      }
      renderContent();
    });
  }

  container.querySelector("#filter-btn").onclick = () => {
    openFilterSheet({
      books: allBooks,
      filters: state.filters,
      sort: state.sort,
      sortOptions: SORT_OPTIONS,
      onApply: (filters, sort) => {
        state.filters = filters;
        state.sort = sort;
        safeSet(SORT_KEY, sort);
        updateFilterBadge();
        renderContent();
      },
    });
  };

  let allBooks = await getAllBooks();
  updateFilterBadge();
  renderContent();

  function updateFilterBadge() {
    const count =
      state.filters.statuses.size + state.filters.genres.size + state.filters.authors.size + state.filters.tags.size;
    const badge = container.querySelector("#filter-badge");
    if (count > 0) {
      badge.hidden = false;
      badge.textContent = String(count);
    } else {
      badge.hidden = true;
    }
  }

  function renderContent() {
    const contentEl = container.querySelector("#shelf-content");

    if (allBooks.length === 0) {
      contentEl.innerHTML = emptyStateHTML("本が登録されていません", "右上の ＋ から本を追加してください");
      return;
    }

    const filtered = applyFiltersAndSearch(allBooks, state.query, state.filters);
    if (filtered.length === 0) {
      contentEl.innerHTML = emptyStateHTML("該当する本がありません", "検索条件・フィルターを変更してください");
      return;
    }
    const sorted = [...filtered].sort(SORT_OPTIONS[state.sort].compare);

    contentEl.innerHTML = "";
    if (state.viewMode === "grid") {
      contentEl.appendChild(renderGrid(sorted, reload));
    } else if (state.viewMode === "shelf") {
      contentEl.appendChild(renderShelfLayout(sorted, reload));
    } else {
      contentEl.appendChild(renderList(sorted, reload));
    }
  }

  async function reload() {
    allBooks = await getAllBooks();
    updateFilterBadge();
    renderContent();
  }
}

// MARK: - フィルター・検索

function applyFiltersAndSearch(books, query, filters) {
  const q = query.trim().toLowerCase();
  return books.filter((book) => {
    if (q) {
      const haystack = `${book.title} ${book.author} ${book.notes}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filters.statuses.size > 0 && !filters.statuses.has(book.status)) return false;
    if (filters.genres.size > 0 && !(book.genreLabels ?? []).some((g) => filters.genres.has(g))) return false;
    if (filters.authors.size > 0 && !filters.authors.has(book.author)) return false;
    if (filters.tags.size > 0 && !(book.customTags ?? []).some((t) => filters.tags.has(t))) return false;
    return true;
  });
}

// MARK: - リスト表示

function renderList(books, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "section";
  const list = document.createElement("div");
  list.className = "card-list";
  wrap.appendChild(list);
  for (const book of books) {
    list.appendChild(bookRow(book, onChange));
  }
  return wrap;
}

function bookRow(book, onChange) {
  const row = document.createElement("div");
  row.className = "book-row";
  row.setAttribute("role", "button");
  row.setAttribute("tabindex", "0");

  row.appendChild(coverElement(book, "cover"));

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

// MARK: - グリッド表示

function renderGrid(books, onChange) {
  const grid = document.createElement("div");
  grid.className = "book-grid";
  for (const book of books) {
    grid.appendChild(gridTile(book, onChange));
  }
  return grid;
}

function gridTile(book, onChange) {
  const el = document.createElement("div");
  el.className = "grid-tile";
  el.setAttribute("role", "button");
  el.setAttribute("tabindex", "0");
  el.appendChild(coverElement(book, "cover"));
  const title = document.createElement("div");
  title.className = "title";
  title.textContent = book.title;
  el.appendChild(title);
  bindActivate(el, () => openBookDetailSheet(book.id, { onChange }));
  return el;
}

// MARK: - 本棚風表示(シリーズは1巻目のみ表紙、2巻目以降は背表紙)

function renderShelfLayout(books, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "book-shelf-row";
  for (const group of groupBySeries(books)) {
    const groupEl = document.createElement("div");
    groupEl.className = "shelf-group";
    group.forEach((book, index) => {
      groupEl.appendChild(index === 0 ? shelfCover(book, onChange) : shelfSpine(book, onChange));
    });
    wrap.appendChild(groupEl);
  }
  return wrap;
}

/**
 * シリーズ名(seriesName)が同じ本をひとまとまりにする。
 * シリーズ名が無い本はそれぞれ単独のグループ(1冊)として扱う。
 * グループの並び順は、現在の並び替え順で最初に現れた本の位置に従う。
 * シリーズ内の並び順は 巻数(seriesVolume)→ タイトルの順。
 *
 * タイトル類似性からの自動グルーピングは今後の課題。まずは openBD/Google Books
 * 連携で取得できる seriesName/seriesVolume と、手動編集フォームでの指定に対応する。
 */
function groupBySeries(books) {
  const groups = [];
  const bySeriesName = new Map();

  for (const book of books) {
    const key = book.seriesName?.trim();
    if (!key) {
      groups.push([book]);
      continue;
    }
    let group = bySeriesName.get(key);
    if (!group) {
      group = [];
      bySeriesName.set(key, group);
      groups.push(group);
    }
    group.push(book);
  }

  for (const group of groups) {
    if (group.length > 1) {
      group.sort((a, b) => {
        if (a.seriesVolume != null && b.seriesVolume != null) return a.seriesVolume - b.seriesVolume;
        if (a.seriesVolume != null) return -1;
        if (b.seriesVolume != null) return 1;
        return a.title.localeCompare(b.title, "ja");
      });
    }
  }

  return groups;
}

function shelfCover(book, onChange) {
  const el = document.createElement("div");
  el.className = "shelf-cover";
  el.setAttribute("role", "button");
  el.setAttribute("tabindex", "0");
  el.appendChild(coverElement(book));
  bindActivate(el, () => openBookDetailSheet(book.id, { onChange }));
  return el;
}

function shelfSpine(book, onChange) {
  const el = document.createElement("div");
  el.className = "shelf-spine";
  el.setAttribute("role", "button");
  el.setAttribute("tabindex", "0");
  const label = book.seriesVolume ? `${book.seriesVolume}巻 ${book.title}` : book.title;
  const span = document.createElement("span");
  span.className = "spine-text";
  span.textContent = label;
  el.appendChild(span);
  bindActivate(el, () => openBookDetailSheet(book.id, { onChange }));
  return el;
}

// MARK: - 共通ヘルパー

function coverElement(book, className = "") {
  if (book.coverImageBlob) {
    const img = document.createElement("img");
    if (className) img.className = className;
    img.src = URL.createObjectURL(book.coverImageBlob);
    img.alt = "";
    return img;
  }
  const placeholder = document.createElement("div");
  placeholder.className = className ? `${className} placeholder` : "cover placeholder";
  placeholder.textContent = "📕";
  return placeholder;
}

function emptyStateHTML(title, subtitle) {
  return `<div class="empty-state"><span class="icon">📚</span>${escapeHTML(title)}<br />${escapeHTML(subtitle)}</div>`;
}

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // プライベートブラウズ等でlocalStorageが使えなくても致命的ではないので無視する
  }
}
