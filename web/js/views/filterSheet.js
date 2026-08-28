import { openSheet } from "./sheet.js";
import { statusLabel, READING_STATUS_ORDER } from "../models.js";
import { escapeHTML } from "../utils.js";

/**
 * フィルター(ステータス・ジャンル・作者・タグ)と並び替えの選択画面。
 * ジャンル・作者・タグの選択肢は、現在登録されている本の中から動的に集める。
 *
 * @param {{
 *   books: object[],
 *   filters: { statuses: Set, genres: Set, authors: Set, tags: Set },
 *   sort: string,
 *   sortOptions: Record<string, { label: string }>,
 *   onApply: (filters: object, sort: string) => void,
 * }} options
 */
export function openFilterSheet({ books, filters, sort, sortOptions, onApply }) {
  const draft = {
    statuses: new Set(filters.statuses),
    genres: new Set(filters.genres),
    authors: new Set(filters.authors),
    tags: new Set(filters.tags),
    sort,
  };

  const allGenres = uniqueSorted(books.flatMap((b) => b.genreLabels ?? []));
  const allAuthors = uniqueSorted(books.map((b) => b.author).filter(Boolean));
  const allTags = uniqueSorted(books.flatMap((b) => b.customTags ?? []));

  openSheet({
    title: "フィルター・並び替え",
    leftButton: { label: "閉じる", onClick: (api) => api.close() },
    rightButton: {
      label: "適用",
      onClick: (api) => {
        onApply(
          { statuses: draft.statuses, genres: draft.genres, authors: draft.authors, tags: draft.tags },
          draft.sort
        );
        api.close();
      },
    },
    build: (body) => render(body),
  });

  function render(body) {
    body.innerHTML = `
      <div style="padding:0 16px 4px;text-align:right;">
        <button id="reset-btn" style="background:none;border:none;color:var(--color-danger);font-size:13px;cursor:pointer;">
          フィルターをリセット
        </button>
      </div>
      <div class="form-section">
        <div class="form-section-title">並び替え</div>
        <div class="form-row">
          <select id="sort-select" style="flex:1;"></select>
        </div>
      </div>
      <div class="form-section">
        <div class="form-section-title">ステータス</div>
        <div id="status-checks"></div>
      </div>
      ${allGenres.length > 0 ? section("genre-checks", "ジャンル") : ""}
      ${allAuthors.length > 0 ? section("author-checks", "作者") : ""}
      ${allTags.length > 0 ? section("tag-checks", "タグ") : ""}
    `;

    body.querySelector("#reset-btn").onclick = () => {
      draft.statuses.clear();
      draft.genres.clear();
      draft.authors.clear();
      draft.tags.clear();
      draft.sort = Object.keys(sortOptions)[0];
      render(body);
    };

    const sortSelect = body.querySelector("#sort-select");
    for (const [value, opt] of Object.entries(sortOptions)) {
      const optionEl = document.createElement("option");
      optionEl.value = value;
      optionEl.textContent = opt.label;
      sortSelect.appendChild(optionEl);
    }
    sortSelect.value = draft.sort;
    sortSelect.addEventListener("change", (e) => (draft.sort = e.target.value));

    renderCheckGroup(
      body.querySelector("#status-checks"),
      READING_STATUS_ORDER.map((s) => ({ value: s, label: statusLabel(s) })),
      draft.statuses
    );
    if (allGenres.length > 0) {
      renderCheckGroup(body.querySelector("#genre-checks"), allGenres.map(toOption), draft.genres);
    }
    if (allAuthors.length > 0) {
      renderCheckGroup(body.querySelector("#author-checks"), allAuthors.map(toOption), draft.authors);
    }
    if (allTags.length > 0) {
      renderCheckGroup(body.querySelector("#tag-checks"), allTags.map(toOption), draft.tags);
    }
  }
}

function section(id, title) {
  return `<div class="form-section"><div class="form-section-title">${title}</div><div id="${id}"></div></div>`;
}

function toOption(value) {
  return { value, label: value };
}

function renderCheckGroup(container, items, selectedSet) {
  for (const item of items) {
    const row = document.createElement("label");
    row.className = "form-row";
    row.style.cursor = "pointer";
    row.innerHTML = `<input type="checkbox" style="margin-right:8px;flex:0 0 auto;" /><span>${escapeHTML(item.label)}</span>`;
    const checkbox = row.querySelector("input");
    checkbox.checked = selectedSet.has(item.value);
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) selectedSet.add(item.value);
      else selectedSet.delete(item.value);
    });
    container.appendChild(row);
  }
}

function uniqueSorted(arr) {
  return [...new Set(arr)].sort((a, b) => a.localeCompare(b, "ja"));
}
