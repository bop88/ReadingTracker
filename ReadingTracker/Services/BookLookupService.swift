import Foundation

/// バーコードスキャン・手動検索のどちらからも共通で使う、書誌情報検索結果の器。
///
/// フェーズ3で以下を実装する:
/// - `OpenBDService`: https://openbd.jp (無料・APIキー不要) を叩き、
///   ヒットすれば Cコード/NDCも含めて `BookLookupResult` を返す
/// - `GoogleBooksService`: openBD でヒットしない場合のフォールバック
/// - 取得結果は `BookDraft` に変換し、[AddBookView.swift](../Views/AddBookView.swift) と
///   同じ編集可能なプレビュー画面で確認してから保存する
struct BookLookupResult {
    var title: String
    var author: String
    var publisher: String
    var publishedDate: Date?
    var isbn: String
    var coverImageURL: String?
    var pageCount: Int?

    /// openBDのCコード(取得できた場合)。ジャンル自動判定([GenreClassifier]予定)に使う。
    var cCode: String?
    /// NDC(日本十進分類、取得できた場合)。
    var ndc: String?
}

protocol BookLookupService {
    /// ISBN(JANコード)から書誌情報を検索する。ネットワーク通信が必要。
    func lookup(isbn: String) async throws -> BookLookupResult?

    /// タイトル・著者名などのキーワードで検索する(手動検索用)。
    func search(keyword: String) async throws -> [BookLookupResult]
}
