import { openSheet } from "./sheet.js";
import { renderFormFields, isValid } from "./bookFormFields.js";
import { getBook, putBook, deleteBook } from "../db.js";
import { statusLabel, isCurrentlyReading } from "../models.js";
import { escapeHTML } from "../utils.js";

/**
 * 本の詳細・編集画面。
 * @param {string} bookId
 * @param {{ onChange?: () => void }} [options] 削除・編集で内容が変わったら呼ばれる
 */
export function openBookDetailSheet(bookId, { onChange } = {}) {
  let book = null;

  openSheet({
    title: "本の詳細",
    leftButton: { label: "閉じる", onClick: (api) => api.close() },
    rightButton: { label: "編集", disabled: true, onClick: (api) => openEditSheet(api) },
    build: async (body, api) => {
      body.innerHTML = `<div class="loading-row"><div class="spinner"></div>読み込み中…</div>`;
      book = await getBook(bookId);
      if (!book) {
        body.innerHTML = `<div class="empty-state">本が見つかりませんでした</div>`;
        return;
      }
      api.setTitle(book.title);
      api.setRightEnabled(true);
      renderDetail(body, api);
    },
  });

  function renderDetail(body, api) {
    body.innerHTML = "";

    if (book.coverImageBlob) {
      const coverRow = document.createElement("div");
      const url = URL.createObjectURL(book.coverImageBlob);
      coverRow.innerHTML = `<div style="display:flex;justify-content:center;padding:12px 16px;"><img src="${url}" alt="表紙" style="height:180px;border-radius:8px;" /></div>`;
      body.appendChild(coverRow);
    }

    const info = document.createElement("div");
    info.className = "form-section";
    info.innerHTML = `
      <div class="form-row"><label>タイトル</label><div>${escapeHTML(book.title)}</div></div>
      ${book.author ? `<div class="form-row"><label>著者</label><div>${escapeHTML(book.author)}</div></div>` : ""}
      ${book.publisher ? `<div class="form-row"><label>出版社</label><div>${escapeHTML(book.publisher)}</div></div>` : ""}
      ${book.isbn ? `<div class="form-row"><label>ISBN</label><div>${escapeHTML(book.isbn)}</div></div>` : ""}
    `;
    body.appendChild(info);

    const statusSection = document.createElement("div");
    statusSection.className = "form-section";
    statusSection.innerHTML = `
      <div class="form-row"><label>ステータス</label><div>${statusLabel(book.status)}</div></div>
      <div class="form-row"><label>評価</label><div>${
        book.rating > 0 ? `<span class="stars">${"★".repeat(book.rating)}</span>` : "未評価"
      }</div></div>
      ${isCurrentlyReading(book) ? `<div class="form-row"><label>&nbsp;</label><div>📖 現在読書中</div></div>` : ""}
    `;
    body.appendChild(statusSection);

    if ((book.genreLabels ?? []).length > 0 || (book.customTags ?? []).length > 0) {
      const genreSection = document.createElement("div");
      genreSection.className = "form-section";
      genreSection.innerHTML = `
        ${(book.genreLabels ?? []).length > 0 ? `<div class="form-row"><label>ジャンル</label><div>${escapeHTML(book.genreLabels.join(", "))}</div></div>` : ""}
        ${(book.customTags ?? []).length > 0 ? `<div class="form-row"><label>タグ</label><div>${escapeHTML(book.customTags.join(", "))}</div></div>` : ""}
      `;
      body.appendChild(genreSection);
    }

    const progressSection = document.createElement("div");
    progressSection.className = "form-section";
    progressSection.innerHTML = `
      <div class="form-row"><label>読書進捗</label><div>${book.readingProgressPercent ?? 0}%</div></div>
      ${book.pageCount ? `<div class="form-row"><label>ページ数</label><div>${book.pageCount}</div></div>` : ""}
    `;
    body.appendChild(progressSection);

    if (book.notes) {
      const notesSection = document.createElement("div");
      notesSection.className = "form-section";
      notesSection.innerHTML = `<div class="form-section-title">感想・メモ</div><div style="padding:0 14px 14px;white-space:pre-wrap;">${escapeHTML(book.notes)}</div>`;
      body.appendChild(notesSection);
    }

    const deleteWrap = document.createElement("div");
    deleteWrap.style.cssText = "padding:8px 16px 24px;";
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "btn danger btn-block";
    deleteBtn.textContent = "この本を削除";
    deleteBtn.onclick = async () => {
      if (!confirm(`「${book.title}」を削除しますか?`)) return;
      await deleteBook(book.id);
      api.close();
      onChange?.();
    };
    deleteWrap.appendChild(deleteBtn);
    body.appendChild(deleteWrap);
  }

  function openEditSheet(parentApi) {
    const draft = structuredClone(book);
    let editApiRef;

    openSheet({
      title: "本を編集",
      leftButton: { label: "キャンセル", onClick: (api) => api.close() },
      rightButton: {
        label: "保存",
        disabled: !isValid(draft),
        onClick: async (api) => {
          draft.updatedAt = new Date().toISOString();
          await putBook(draft);
          book = draft;
          api.close();
          parentApi.setTitle(book.title);
          renderDetail(parentApi.body, parentApi);
          onChange?.();
        },
      },
      build: (body, api) => {
        editApiRef = api;
        renderFormFields(body, draft);
        body.addEventListener("input", () => editApiRef.setRightEnabled(isValid(draft)));
        body.addEventListener("change", () => editApiRef.setRightEnabled(isValid(draft)));
      },
    });
  }
}
