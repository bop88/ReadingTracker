import Foundation

/// バーコードスキャン・手動検索の両方から共通で使う、書誌情報取得の一連の流れ:
///
/// 1. openBD で ISBN 検索(ヒットしなければ Google Books にフォールバック)
/// 2. Cコード/NDC/キーワードからジャンルラベルを自動判定([GenreClassifier])
/// 3. 表紙画像があればダウンロードしてオフライン閲覧用に保持
/// 4. 編集可能な [BookDraft] として返す(呼び出し側は [AddBookView.swift] の
///    プレビュー画面でユーザーに確認・修正させてから保存する)
enum BookLookupCoordinator {
    private static let openBD = OpenBDService()
    private static let googleBooks = GoogleBooksService()

    /// ISBN から書誌情報を取得する。
    /// - Returns: 見つかった場合は `BookDraft`、openBD・Google Books どちらでも
    ///   見つからなかった場合は `nil`。
    /// - Throws: 両方の取得が失敗した(ネットワークエラー等)場合のみエラーを投げる。
    static func lookupByISBN(_ isbn: String) async throws -> BookDraft? {
        if let result = try? await openBD.lookup(isbn: isbn) {
            return await makeDraft(from: result, fallbackISBN: isbn)
        }
        if let result = try await googleBooks.lookup(isbn: isbn) {
            return await makeDraft(from: result, fallbackISBN: isbn)
        }
        return nil
    }

    /// 手動検索の結果一覧からユーザーが選んだ1件を、編集用の draft に変換する。
    static func makeDraft(from result: BookLookupResult) async -> BookDraft {
        await makeDraft(from: result, fallbackISBN: result.isbn)
    }

    private static func makeDraft(from result: BookLookupResult, fallbackISBN: String) async -> BookDraft {
        var draft = BookDraft()
        draft.title = result.title
        draft.author = result.author
        draft.publisher = result.publisher
        draft.publishedDate = result.publishedDate
        draft.isbn = result.isbn.isEmpty ? fallbackISBN : result.isbn
        draft.pageCountText = result.pageCount.map(String.init) ?? ""
        draft.coverImageURL = result.coverImageURL
        draft.coverImageData = await downloadCoverData(from: result.coverImageURL)
        draft.genreLabelsText = GenreClassifier.classify(
            cCode: result.cCode,
            ndc: result.ndc,
            title: result.title,
            publisher: result.publisher
        ).joined(separator: ", ")
        return draft
    }

    private static func downloadCoverData(from urlString: String?) async -> Data? {
        guard let urlString, let url = URL(string: urlString) else { return nil }
        var request = URLRequest(url: url)
        request.timeoutInterval = 8
        guard
            let (data, response) = try? await URLSession.shared.data(for: request),
            let http = response as? HTTPURLResponse,
            (200...299).contains(http.statusCode)
        else {
            return nil
        }
        return data
    }
}
