import Foundation

/// バーコードスキャン・手動検索のどちらからも共通で使う、書誌情報検索結果の器。
///
/// - `OpenBDService`: https://openbd.jp (無料・APIキー不要) を叩き、
///   ヒットすれば Cコード/NDCも含めて `BookLookupResult` を返す
/// - `GoogleBooksService`: openBD でヒットしない場合のフォールバック、および
///   openBDには無い全文検索(手動検索)に使う
/// - `BookLookupCoordinator` がこの2つをまとめ、`GenreClassifier` でジャンルを自動判定し、
///   `BookDraft` に変換する。[AddBookView.swift](../Views/AddBookView.swift) が
///   その draft を編集可能なプレビュー画面として表示してから保存する。
struct BookLookupResult {
    var title: String
    var author: String
    var publisher: String
    var publishedDate: Date?
    var isbn: String
    var coverImageURL: String?
    var pageCount: Int?

    /// openBDのCコード(取得できた場合)。[GenreClassifier] でのジャンル自動判定に使う。
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
