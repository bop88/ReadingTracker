// https://openbd.jp (無料・APIキー不要) を使った書誌情報検索。
// openBDは ISBN 単体検索専用の API のため、キーワード検索は googleBooks.js を使う。
//
// フィールドの実際のJSONパスは、テスト用に openBD API を直接叩いて確認済み:
// - Cコード: onix.DescriptiveDetail.Subject のうち SubjectSchemeIdentifier === "78"
// - NDC: hanmoto.ndccode(版元ドットコム会員社のみ登録されている場合がある)

const BASE_URL = "https://api.openbd.jp/v1/get";

/** @returns {Promise<object|null>} 書誌情報。ヒットしなければ null */
export async function lookupByISBN(isbn) {
  const url = `${BASE_URL}?isbn=${encodeURIComponent(isbn)}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`openBD request failed: ${response.status}`);
  }
  const json = await response.json();
  const record = json?.[0];
  return record ? parseRecord(record) : null;
}

function parseRecord(record) {
  const summary = record.summary;
  if (!summary) return null;

  const isbn = summary.isbn ?? "";
  const title = summary.title ?? "";
  if (!isbn || !title) return null;

  const coverImageURL = summary.cover && summary.cover.length > 0 ? summary.cover : null;

  // ONIX由来のフィールドは発行元によって配列/単一オブジェクトが揺れるため、
  // どちらの形でも配列として扱えるようにする。
  const subjects = asArray(record.onix?.DescriptiveDetail?.Subject);
  const cCodeEntry = subjects.find((s) => s.SubjectSchemeIdentifier === "78");

  const ndcRaw = record.hanmoto?.ndccode;

  return {
    title,
    author: summary.author ?? "",
    publisher: summary.publisher ?? "",
    publishedDate: parsePubDate(summary.pubdate),
    isbn,
    coverImageURL,
    pageCount: null,
    cCode: cCodeEntry?.SubjectCode ?? null,
    ndc: ndcRaw && ndcRaw.length > 0 ? ndcRaw : null,
  };
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return [value];
  return [];
}

/** openBDの日付は "yyyyMMdd" / "yyyyMM" / "yyyy" のいずれか。"YYYY-MM-DD" に正規化する */
function parsePubDate(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/\D/g, "");
  if (digits.length === 8) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  if (digits.length === 6) return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-01`;
  if (digits.length === 4) return `${digits}-01-01`;
  return null;
}
