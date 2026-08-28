import Foundation

/// Cコード・NDC・キーワードから、無料で取得できる情報だけを使ってジャンルラベルを自動判定する。
///
/// 優先順位:
/// 1. Cコード(openBDの `onix.DescriptiveDetail.Subject` のうち
///    `SubjectSchemeIdentifier == "78"` の `SubjectCode`。実データで確認済み)
/// 2. NDC・日本十進分類(openBDの `hanmoto.ndccode`。版元ドットコム会員社のみ登録)
/// 3. どちらも無ければ、タイトル・出版社名のキーワードマッチング
/// 4. すべて判定できなければ「未分類」
///
/// 自動判定後もユーザーが [BookEditFormFields.swift] で自由に修正・追加できる。
enum GenreClassifier {

    static func classify(cCode: String?, ndc: String?, title: String, publisher: String) -> [String] {
        var labels: [String] = []

        if let cCode, let fromCCode = labelsFromCCode(cCode) {
            labels.append(contentsOf: fromCCode)
        }

        if labels.isEmpty, let ndc, let fromNDC = labelFromNDC(ndc) {
            labels.append(fromNDC)
        }

        if labels.isEmpty {
            labels.append(contentsOf: labelsFromKeywords(title: title, publisher: publisher))
        }

        return labels.isEmpty ? ["未分類"] : Array(Set(labels)).sorted()
    }

    // MARK: - Cコード(日本図書コードの分類コード)

    /// Cコードは4桁: [1桁目 販売対象][2桁目 発行形態][3〜4桁目 内容(00〜99)]
    private static func labelsFromCCode(_ rawCode: String) -> [String]? {
        let digits = Array(rawCode.filter(\.isNumber))
        guard digits.count == 4, let contentTens = digits[2].wholeNumberValue else { return nil }

        var labels: [String] = []

        switch digits[1] {
        case "9": labels.append("コミック")
        case "1": labels.append("文庫")
        case "2": labels.append("新書")
        default: break
        }

        if digits[0] == "8" {
            labels.append("児童書")
        }

        if let contentLabel = contentCategoryLabels[contentTens] {
            labels.append(contentLabel)
        }

        return labels.isEmpty ? nil : labels
    }

    /// Cコード3桁目(内容の十の位)による大分類
    private static let contentCategoryLabels: [Int: String] = [
        0: "総記", 1: "哲学・心理・宗教", 2: "歴史・地理", 3: "社会科学",
        4: "自然科学", 5: "工学・工業", 6: "産業", 7: "芸術・生活・スポーツ",
        8: "語学", 9: "文学",
    ]

    // MARK: - NDC(日本十進分類)

    /// NDCの最上位(第1次区分)1桁による大分類
    private static let ndcTopLevelLabels: [Character: String] = [
        "0": "総記", "1": "哲学", "2": "歴史", "3": "社会科学", "4": "自然科学",
        "5": "技術・工学", "6": "産業", "7": "芸術・美術", "8": "言語", "9": "文学",
    ]

    private static func labelFromNDC(_ raw: String) -> String? {
        guard let first = raw.first(where: \.isNumber) else { return nil }
        return ndcTopLevelLabels[first]
    }

    // MARK: - キーワードマッチング(フォールバック)

    private static let keywordRules: [(keywords: [String], label: String)] = [
        (["文庫"], "文庫"),
        (["新書"], "新書"),
        (["ラノベ", "ライトノベル", "電撃文庫", "ガガガ文庫", "MF文庫", "スニーカー文庫", "富士見ファンタジア文庫"], "ライトノベル"),
        (["コミックス", "コミック", "漫画"], "コミック"),
        (["絵本"], "絵本"),
        (["ビジネス", "経営", "マネジメント"], "ビジネス"),
        (["プログラミング", "エンジニア", "IT", "コンピュータ"], "IT・コンピュータ"),
        (["レシピ", "料理"], "料理"),
        (["旅行", "ガイド"], "旅行"),
        (["児童", "こども", "子ども"], "児童書"),
    ]

    private static func labelsFromKeywords(title: String, publisher: String) -> [String] {
        let haystack = title + " " + publisher
        return keywordRules
            .filter { rule in rule.keywords.contains { haystack.contains($0) } }
            .map(\.label)
    }
}
