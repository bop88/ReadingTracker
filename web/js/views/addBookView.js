import { openSheet } from "./sheet.js";
import { renderFormFields, isValid } from "./bookFormFields.js";
import { createBlankBook } from "../models.js";
import { findBookByISBN, putBook } from "../db.js";
import { lookupByISBN, makeDraftFromResult } from "../lookupCoordinator.js";
import { openScanSheet } from "./scanSheet.js";
import { openSearchSheet } from "./searchSheet.js";
import { bindActivate } from "../utils.js";

/**
 * 本の新規登録画面。
 *
 * バーコードスキャン/検索のどちらから入っても、取得した書誌情報はこのフォームに
 * プレビューとして反映され、保存前に自由に編集できる。ISBNが既存の本と重複する
 * 場合は、スキャン・検索の直後と保存直前の両方で警告する。
 * @param {{ onSaved?: () => void }} [options]
 */
export function openAddBookSheet({ onSaved } = {}) {
  const state = {
    book: createBlankBook(),
    status: null, // { message, level: "loading" | "warning" }
  };

  let sheetApiRef;

  openSheet({
    title: "本を追加",
    leftButton: { label: "キャンセル", onClick: (api) => api.close() },
    rightButton: { label: "保存", disabled: true, onClick: () => save() },
    build: (body, api) => {
      sheetApiRef = api;
      render(body);
    },
  });

  function render(body) {
    body.innerHTML = `
      <div class="form-section">
        <div class="form-row" id="scan-btn-row" role="button" tabindex="0" style="cursor:pointer;">📷&nbsp;&nbsp;バーコードでスキャン</div>
        <div class="form-row" id="search-btn-row" role="button" tabindex="0" style="cursor:pointer;">🔍&nbsp;&nbsp;タイトル・著者・ISBNで検索</div>
      </div>
      <div class="helper-text">書誌情報の取得にはネットワーク通信が必要です。取得した内容は下のフォームで自由に編集できます。</div>
      <div id="status-area"></div>
      <div id="form-fields"></div>
    `;
    bindActivate(body.querySelector("#scan-btn-row"), handleScan);
    bindActivate(body.querySelector("#search-btn-row"), handleSearch);

    if (state.status) {
      const el = document.createElement("div");
      if (state.status.level === "loading") {
        el.className = "loading-row";
        el.innerHTML = `<div class="spinner"></div>${state.status.message}`;
      } else {
        el.className = "notice warning";
        el.textContent = state.status.message;
      }
      body.querySelector("#status-area").appendChild(el);
    }

    const formFieldsEl = body.querySelector("#form-fields");
    renderFormFields(formFieldsEl, state.book);
    formFieldsEl.addEventListener("input", updateSaveEnabled);
    formFieldsEl.addEventListener("change", updateSaveEnabled);
    updateSaveEnabled();
  }

  function rerender() {
    render(sheetApiRef.body);
  }

  function updateSaveEnabled() {
    sheetApiRef.setRightEnabled(isValid(state.book));
  }

  /** ISBNが既存の本と重複していないか確認する。重複していればユーザーに確認する。 */
  async function confirmNotDuplicate(isbn) {
    if (!isbn) return true;
    const existing = await findBookByISBN(isbn);
    if (!existing) return true;
    return confirm(
      `「${existing.title}」が既に本棚に登録されています。二重登録に注意してください。\n\nそれでも進めますか?`
    );
  }

  function handleScan() {
    openScanSheet({
      onScan: async (isbn) => {
        if (!(await confirmNotDuplicate(isbn))) return;
        await performLookup(isbn);
      },
    });
  }

  function handleSearch() {
    openSearchSheet({
      onSelect: async (result) => {
        if (!(await confirmNotDuplicate((result.isbn ?? "").trim()))) return;
        state.status = { message: "書誌情報を取得しています…", level: "loading" };
        rerender();
        state.book = await makeDraftFromResult(result);
        state.status = null;
        rerender();
      },
    });
  }

  async function performLookup(isbn) {
    state.status = { message: "書誌情報を取得しています…", level: "loading" };
    rerender();
    try {
      const found = await lookupByISBN(isbn);
      if (found) {
        state.book = found;
        state.status = null;
      } else {
        state.book = createBlankBook();
        state.book.isbn = isbn;
        state.status = {
          message: `書誌情報が見つかりませんでした(ISBN: ${isbn})。内容を手動で入力してください。`,
          level: "warning",
        };
      }
    } catch {
      state.book = createBlankBook();
      state.book.isbn = isbn;
      state.status = {
        message: "書誌情報の取得に失敗しました。ネットワーク接続をご確認のうえ、内容を手動で入力してください。",
        level: "warning",
      };
    }
    rerender();
  }

  async function save() {
    if (!isValid(state.book)) return;
    if (!(await confirmNotDuplicate((state.book.isbn ?? "").trim()))) return;
    state.book.updatedAt = new Date().toISOString();
    await putBook(state.book);
    sheetApiRef.close();
    onSaved?.();
  }
}
