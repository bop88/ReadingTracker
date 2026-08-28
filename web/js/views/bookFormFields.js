// 本の登録・編集フォームの中身。addBookView.js(新規登録)と
// bookDetailView.js(編集)の両方から共有される。
//
// `book` オブジェクトを直接書き換える(呼び出し側がstateとして保持しているものを
// そのまま渡す想定)。値の反映はinput/change/rangeイベントで随時行う。

import { ReadingStatus, statusLabel } from "../models.js";
import { splitTags } from "../utils.js";

const STATUS_OPTIONS = [ReadingStatus.WANT_TO_READ, ReadingStatus.STACKED, ReadingStatus.READ];

export function renderFormFields(container, book) {
  container.innerHTML = `
    <div class="form-section">
      <div class="form-section-title">書誌情報</div>
      <div id="cover-preview-row"></div>
      <div class="form-row">
        <label for="f-title">タイトル</label>
        <input type="text" id="f-title" placeholder="必須" />
      </div>
      <div class="form-row">
        <label for="f-author">著者</label>
        <input type="text" id="f-author" />
      </div>
      <div class="form-row">
        <label for="f-publisher">出版社</label>
        <input type="text" id="f-publisher" />
      </div>
      <div class="form-row">
        <label for="f-isbn">ISBN</label>
        <input type="text" id="f-isbn" inputmode="numeric" />
      </div>
      <div class="form-row">
        <label for="f-publishedDate">出版日</label>
        <input type="date" id="f-publishedDate" />
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">ステータス・評価</div>
      <div class="form-row">
        <label for="f-status">ステータス</label>
        <select id="f-status"></select>
      </div>
      <div class="form-row">
        <label for="f-rating">評価</label>
        <select id="f-rating">
          <option value="0">未評価</option>
          <option value="1">★</option>
          <option value="2">★★</option>
          <option value="3">★★★</option>
          <option value="4">★★★★</option>
          <option value="5">★★★★★</option>
        </select>
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">ジャンル・タグ</div>
      <div class="form-row">
        <label for="f-genres">ジャンル</label>
        <input type="text" id="f-genres" placeholder="カンマ区切り" />
      </div>
      <div class="form-row">
        <label for="f-tags">独自タグ</label>
        <input type="text" id="f-tags" placeholder="カンマ区切り" />
      </div>
      <div class="helper-text">バーコードスキャン・検索で登録すると、Cコード/NDC/キーワードから自動付与されます</div>
    </div>

    <div class="form-section">
      <div class="form-section-title">進捗</div>
      <div class="form-row">
        <label for="f-startDate">読み始めた日</label>
        <input type="date" id="f-startDate" />
      </div>
      <div class="form-row">
        <label for="f-finishDate">読了日</label>
        <input type="date" id="f-finishDate" />
      </div>
      <div class="form-row">
        <label for="f-pageCount">ページ数</label>
        <input type="number" id="f-pageCount" inputmode="numeric" min="0" />
      </div>
      <div class="form-row column">
        <label for="f-progress">読書進捗: <span id="f-progress-value">0</span>%</label>
        <input type="range" id="f-progress" min="0" max="100" step="1" />
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">シリーズ</div>
      <div class="form-row">
        <label for="f-seriesName">シリーズ名</label>
        <input type="text" id="f-seriesName" />
      </div>
      <div class="form-row">
        <label for="f-seriesVolume">巻数</label>
        <input type="number" id="f-seriesVolume" inputmode="numeric" min="1" />
      </div>
    </div>

    <div class="form-section">
      <div class="form-section-title">感想・メモ</div>
      <div class="form-row column">
        <textarea id="f-notes" rows="5"></textarea>
      </div>
    </div>
  `;

  const statusSelect = container.querySelector("#f-status");
  for (const status of STATUS_OPTIONS) {
    const opt = document.createElement("option");
    opt.value = status;
    opt.textContent = statusLabel(status);
    statusSelect.appendChild(opt);
  }

  renderCoverPreview(container, book);
  bindValues(container, book);
  bindListeners(container, book);
}

function renderCoverPreview(container, book) {
  const row = container.querySelector("#cover-preview-row");
  if (book.coverImageBlob) {
    const url = URL.createObjectURL(book.coverImageBlob);
    row.innerHTML = `<div style="display:flex;justify-content:center;padding:12px;"><img src="${url}" alt="表紙" style="height:160px;border-radius:8px;" /></div>`;
  } else {
    row.innerHTML = "";
  }
}

function bindValues(container, book) {
  container.querySelector("#f-title").value = book.title ?? "";
  container.querySelector("#f-author").value = book.author ?? "";
  container.querySelector("#f-publisher").value = book.publisher ?? "";
  container.querySelector("#f-isbn").value = book.isbn ?? "";
  container.querySelector("#f-publishedDate").value = book.publishedDate ?? "";
  container.querySelector("#f-status").value = book.status;
  container.querySelector("#f-rating").value = String(book.rating ?? 0);
  container.querySelector("#f-genres").value = (book.genreLabels ?? []).join(", ");
  container.querySelector("#f-tags").value = (book.customTags ?? []).join(", ");
  container.querySelector("#f-startDate").value = book.startDate ?? "";
  container.querySelector("#f-finishDate").value = book.finishDate ?? "";
  container.querySelector("#f-pageCount").value = book.pageCount ?? "";
  container.querySelector("#f-progress").value = String(book.readingProgressPercent ?? 0);
  container.querySelector("#f-progress-value").textContent = String(book.readingProgressPercent ?? 0);
  container.querySelector("#f-seriesName").value = book.seriesName ?? "";
  container.querySelector("#f-seriesVolume").value = book.seriesVolume ?? "";
  container.querySelector("#f-notes").value = book.notes ?? "";
}

function bindListeners(container, book) {
  const on = (id, event, handler) => container.querySelector(id).addEventListener(event, handler);

  on("#f-title", "input", (e) => (book.title = e.target.value));
  on("#f-author", "input", (e) => (book.author = e.target.value));
  on("#f-publisher", "input", (e) => (book.publisher = e.target.value));
  on("#f-isbn", "input", (e) => (book.isbn = e.target.value));
  on("#f-publishedDate", "input", (e) => (book.publishedDate = e.target.value || null));
  on("#f-status", "change", (e) => (book.status = e.target.value));
  on("#f-rating", "change", (e) => (book.rating = Number(e.target.value)));
  on("#f-genres", "input", (e) => (book.genreLabels = splitTags(e.target.value)));
  on("#f-tags", "input", (e) => (book.customTags = splitTags(e.target.value)));
  on("#f-startDate", "input", (e) => (book.startDate = e.target.value || null));
  on("#f-finishDate", "input", (e) => (book.finishDate = e.target.value || null));
  on("#f-pageCount", "input", (e) => (book.pageCount = e.target.value ? Number(e.target.value) : null));
  on("#f-progress", "input", (e) => {
    book.readingProgressPercent = Number(e.target.value);
    container.querySelector("#f-progress-value").textContent = e.target.value;
  });
  on("#f-seriesName", "input", (e) => (book.seriesName = e.target.value || null));
  on("#f-seriesVolume", "input", (e) => (book.seriesVolume = e.target.value ? Number(e.target.value) : null));
  on("#f-notes", "input", (e) => (book.notes = e.target.value));
}

export function isValid(book) {
  return Boolean(book.title && book.title.trim().length > 0);
}
