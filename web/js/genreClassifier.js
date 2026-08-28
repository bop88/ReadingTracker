// Cコード・NDC・キーワードから、無料で取得できる情報だけを使ってジャンルラベルを
// 自動判定する。ios-app/ReadingTracker/Services/GenreClassifier.swift の移植版。
//
// 優先順位:
// 1. Cコード(openBDの onix.DescriptiveDetail.Subject のうち
//    SubjectSchemeIdentifier === "78" の SubjectCode。実データで確認済み)
// 2. NDC・日本十進分類(openBDの hanmoto.ndccode。版元ドットコム会員社のみ登録)
// 3. どちらも無ければ、タイトル・出版社名のキーワードマッチング
// 4. すべて判定できなければ「未分類」

// Cコード3桁目(内容の十の位)による大分類
const CONTENT_CATEGORY_LABELS = {
  0: "総記", 1: "哲学・心理・宗教", 2: "歴史・地理", 3: "社会科学",
  4: "自然科学", 5: "工学・工業", 6: "産業", 7: "芸術・生活・スポーツ",
  8: "語学", 9: "文学",
};

// NDCの最上位(第1次区分)1桁による大分類
const NDC_TOP_LEVEL_LABELS = {
  0: "総記", 1: "哲学", 2: "歴史", 3: "社会科学", 4: "自然科学",
  5: "技術・工学", 6: "産業", 7: "芸術・美術", 8: "言語", 9: "文学",
};

const KEYWORD_RULES = [
  { keywords: ["文庫"], label: "文庫" },
  { keywords: ["新書"], label: "新書" },
  { keywords: ["ラノベ", "ライトノベル", "電撃文庫", "ガガガ文庫", "MF文庫", "スニーカー文庫", "富士見ファンタジア文庫"], label: "ライトノベル" },
  { keywords: ["コミックス", "コミック", "漫画"], label: "コミック" },
  { keywords: ["絵本"], label: "絵本" },
  { keywords: ["ビジネス", "経営", "マネジメント"], label: "ビジネス" },
  { keywords: ["プログラミング", "エンジニア", "IT", "コンピュータ"], label: "IT・コンピュータ" },
  { keywords: ["レシピ", "料理"], label: "料理" },
  { keywords: ["旅行", "ガイド"], label: "旅行" },
  { keywords: ["児童", "こども", "子ども"], label: "児童書" },
];

/** Cコードは4桁: [1桁目 販売対象][2桁目 発行形態][3〜4桁目 内容(00〜99)] */
function labelsFromCCode(rawCode) {
  const digits = (rawCode ?? "").replace(/\D/g, "");
  if (digits.length !== 4) return null;

  const labels = [];
  switch (digits[1]) {
    case "9": labels.push("コミック"); break;
    case "1": labels.push("文庫"); break;
    case "2": labels.push("新書"); break;
  }
  if (digits[0] === "8") labels.push("児童書");

  const contentTens = Number(digits[2]);
  if (CONTENT_CATEGORY_LABELS[contentTens]) {
    labels.push(CONTENT_CATEGORY_LABELS[contentTens]);
  }
  return labels.length > 0 ? labels : null;
}

function labelFromNDC(raw) {
  const match = (raw ?? "").match(/\d/);
  if (!match) return null;
  return NDC_TOP_LEVEL_LABELS[Number(match[0])] ?? null;
}

function labelsFromKeywords(title, publisher) {
  const haystack = `${title ?? ""} ${publisher ?? ""}`;
  return KEYWORD_RULES
    .filter((rule) => rule.keywords.some((kw) => haystack.includes(kw)))
    .map((rule) => rule.label);
}

/**
 * @param {{cCode?: string|null, ndc?: string|null, title?: string, publisher?: string}} params
 * @returns {string[]} ジャンルラベル(1件以上、判定不能なら ["未分類"])
 */
export function classifyGenre({ cCode, ndc, title, publisher }) {
  let labels = [];

  const fromCCode = cCode ? labelsFromCCode(cCode) : null;
  if (fromCCode) labels.push(...fromCCode);

  if (labels.length === 0 && ndc) {
    const fromNDC = labelFromNDC(ndc);
    if (fromNDC) labels.push(fromNDC);
  }

  if (labels.length === 0) {
    labels.push(...labelsFromKeywords(title, publisher));
  }

  if (labels.length === 0) return ["未分類"];
  return [...new Set(labels)].sort();
}
