// データモデル定義。iOS版(ios-app/ReadingTracker/Models/Book.swift)と同じ項目構成。
// データは IndexedDB([db.js])に保存され、サーバー送信は一切行わない。

export const ReadingStatus = Object.freeze({
  WANT_TO_READ: "wantToRead",
  STACKED: "stacked",
  READ: "read",
});

const STATUS_LABELS = {
  [ReadingStatus.WANT_TO_READ]: "読みたい本",
  [ReadingStatus.STACKED]: "積読",
  [ReadingStatus.READ]: "読んだ本",
};

export const READING_STATUS_ORDER = [
  ReadingStatus.WANT_TO_READ,
  ReadingStatus.STACKED,
  ReadingStatus.READ,
];

export function statusLabel(status) {
  return STATUS_LABELS[status] ?? status;
}

/** 新規登録フォーム用の空の本データ */
export function createBlankBook() {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    title: "",
    author: "",
    publisher: "",
    publishedDate: null, // "YYYY-MM-DD" | null
    coverImageURL: null,
    coverImageBlob: null, // Blob | null (オフライン閲覧用にダウンロードして保持)
    isbn: "",
    status: ReadingStatus.WANT_TO_READ,
    genreLabels: [],
    customTags: [],
    rating: 0, // 0(未評価)〜5
    notes: "",
    startDate: null,
    finishDate: null,
    pageCount: null,
    readingProgressPercent: 0,
    seriesName: null,
    seriesVolume: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** 読み始めた日があって読了日が無い本 = 「今読んでいる本」 */
export function isCurrentlyReading(book) {
  return Boolean(book.startDate) && !book.finishDate;
}

export const GoalPeriod = Object.freeze({
  YEARLY: "yearly",
  MONTHLY: "monthly",
});

/**
 * 読書目標(年間 or 月間の目標冊数)。
 * @param {{ period: "yearly"|"monthly", year: number, month?: number|null, targetCount: number }} params
 */
export function createGoal({ period, year, month = null, targetCount }) {
  return {
    id: crypto.randomUUID(),
    period,
    year,
    month, // monthly の場合のみ 1〜12、yearly では null
    targetCount,
    createdAt: new Date().toISOString(),
  };
}
