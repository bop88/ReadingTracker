// バーコードスキャン・手動検索の両方から共通で使う、書誌情報取得の一連の流れ:
// 1. openBD で ISBN 検索(失敗/未ヒットなら Google Books にフォールバック)
// 2. Cコード/NDC/キーワードからジャンルラベルを自動判定(genreClassifier.js)
// 3. 表紙画像があればダウンロードしてオフライン閲覧用に保持(Blobのまま保存)
// 4. 編集可能な book オブジェクトとして返す(呼び出し側がプレビュー画面で
//    ユーザーに確認・修正させてから保存する)

import * as openbd from "./openbd.js";
import * as googleBooks from "./googleBooks.js";
import { classifyGenre } from "./genreClassifier.js";
import { createBlankBook } from "./models.js";

/**
 * ISBNから書誌情報を取得する。
 * @returns {Promise<object|null>} 見つかった場合は編集用の book、
 *   openBD・Google Books どちらでも見つからなかった場合は null。
 * @throws 両方の取得が失敗した(ネットワークエラー等)場合のみ投げる。
 */
export async function lookupByISBN(isbn) {
  let result = null;
  try {
    result = await openbd.lookupByISBN(isbn);
  } catch {
    result = null; // openBD側の失敗は無視してGoogle Booksにフォールバックする
  }

  if (!result) {
    result = await googleBooks.lookupByISBN(isbn); // ここで失敗したら呼び出し側に伝播する
  }

  return result ? makeDraft(result, isbn) : null;
}

/** 手動検索の結果一覧からユーザーが選んだ1件を、編集用の book に変換する */
export async function makeDraftFromResult(result) {
  return makeDraft(result, result.isbn);
}

async function makeDraft(result, fallbackISBN) {
  const book = createBlankBook();
  book.title = result.title;
  book.author = result.author;
  book.publisher = result.publisher;
  book.publishedDate = result.publishedDate;
  book.isbn = result.isbn || fallbackISBN;
  book.pageCount = result.pageCount ?? null;
  book.coverImageURL = result.coverImageURL;
  book.coverImageBlob = await downloadCoverBlob(result.coverImageURL);
  book.genreLabels = classifyGenre({
    cCode: result.cCode,
    ndc: result.ndc,
    title: result.title,
    publisher: result.publisher,
  });
  return book;
}

async function downloadCoverBlob(url) {
  if (!url) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    return await response.blob();
  } catch {
    return null;
  }
}
