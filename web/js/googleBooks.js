// Google Books API(無料枠・APIキー無しでも利用可)を使った書誌情報検索。
// - openBD でヒットしなかった場合のフォールバックとして ISBN 検索に使う
// - openBD には全文検索が無いため、タイトル・著者名での手動検索にも使う

const BASE_URL = "https://www.googleapis.com/books/v1/volumes";

/** @returns {Promise<object|null>} */
export async function lookupByISBN(isbn) {
  const results = await search(`isbn:${isbn}`);
  return results[0] ?? null;
}

/** @returns {Promise<object[]>} */
export async function searchByKeyword(keyword) {
  return search(keyword);
}

async function search(query) {
  const params = new URLSearchParams({ q: query, maxResults: "20", country: "JP" });
  const response = await fetch(`${BASE_URL}?${params.toString()}`);
  if (!response.ok) {
    const err = new Error(`Google Books request failed: ${response.status}`);
    err.status = response.status;
    throw err;
  }
  const json = await response.json();
  const items = Array.isArray(json.items) ? json.items : [];
  return items.map(toLookupResult);
}

function toLookupResult(item) {
  const info = item.volumeInfo ?? {};
  const identifiers = info.industryIdentifiers ?? [];
  const isbn13 = identifiers.find((i) => i.type === "ISBN_13")?.identifier;
  const isbn10 = identifiers.find((i) => i.type === "ISBN_10")?.identifier;
  const thumbnail = info.imageLinks?.thumbnail;

  return {
    title: info.title ?? "",
    author: (info.authors ?? []).join(", "),
    publisher: info.publisher ?? "",
    publishedDate: normalizeDate(info.publishedDate),
    isbn: isbn13 ?? isbn10 ?? "",
    coverImageURL: thumbnail ? thumbnail.replace(/^http:/, "https:") : null,
    pageCount: info.pageCount ?? null,
    cCode: null,
    ndc: null,
  };
}

/** Google Booksの日付は "yyyy-MM-dd" / "yyyy-MM" / "yyyy" のいずれか */
function normalizeDate(raw) {
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  if (/^\d{4}-\d{2}$/.test(raw)) return `${raw}-01`;
  if (/^\d{4}$/.test(raw)) return `${raw}-01-01`;
  return null;
}
