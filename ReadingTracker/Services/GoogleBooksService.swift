import Foundation

/// Google Books API(無料枠・APIキー無しでも利用可)を使った書誌情報検索。
///
/// - openBD でヒットしなかった場合のフォールバックとして ISBN 検索に使う
/// - openBD には全文検索が無いため、タイトル・著者名での手動検索にも使う
final class GoogleBooksService: BookLookupService {
    private let baseURL = URL(string: "https://www.googleapis.com/books/v1/volumes")!
    private let session: URLSession

    init(session: URLSession = .shared) {
        self.session = session
    }

    func lookup(isbn: String) async throws -> BookLookupResult? {
        try await search(query: "isbn:\(isbn)").first
    }

    func search(keyword: String) async throws -> [BookLookupResult] {
        try await search(query: keyword)
    }

    private func search(query: String) async throws -> [BookLookupResult] {
        guard var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else {
            return []
        }
        components.queryItems = [
            URLQueryItem(name: "q", value: query),
            URLQueryItem(name: "maxResults", value: "20"),
            URLQueryItem(name: "country", value: "JP"),
        ]
        guard let url = components.url else { return [] }

        let (data, response) = try await session.data(from: url)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw BookLookupError.badResponse
        }

        // クォータ超過時などは items を含まないエラーオブジェクトが返ってくる。
        // items が無ければ「該当なし」として扱う(エラーではなく空配列を返す)。
        guard let decoded = try? JSONDecoder().decode(GoogleBooksResponse.self, from: data) else {
            throw BookLookupError.decodingFailed
        }
        return (decoded.items ?? []).map { $0.volumeInfo.toLookupResult() }
    }
}

// MARK: - Google Books API レスポンス

private struct GoogleBooksResponse: Decodable {
    let items: [GoogleBookItem]?
}

private struct GoogleBookItem: Decodable {
    let volumeInfo: GoogleVolumeInfo
}

private struct GoogleVolumeInfo: Decodable {
    let title: String?
    let authors: [String]?
    let publisher: String?
    let publishedDate: String?
    let pageCount: Int?
    let imageLinks: GoogleImageLinks?
    let industryIdentifiers: [GoogleIndustryIdentifier]?

    func toLookupResult() -> BookLookupResult {
        let isbn13 = industryIdentifiers?.first { $0.type == "ISBN_13" }?.identifier
        let isbn10 = industryIdentifiers?.first { $0.type == "ISBN_10" }?.identifier

        return BookLookupResult(
            title: title ?? "",
            author: (authors ?? []).joined(separator: ", "),
            publisher: publisher ?? "",
            publishedDate: Self.parseDate(publishedDate),
            isbn: isbn13 ?? isbn10 ?? "",
            coverImageURL: imageLinks?.secureThumbnail,
            pageCount: pageCount,
            cCode: nil,
            ndc: nil
        )
    }

    /// Google Booksの日付は "yyyy-MM-dd" / "yyyy-MM" / "yyyy" のいずれか
    private static func parseDate(_ raw: String?) -> Date? {
        guard let raw, !raw.isEmpty else { return nil }

        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)

        switch raw.count {
        case 10: formatter.dateFormat = "yyyy-MM-dd"
        case 7: formatter.dateFormat = "yyyy-MM"
        case 4: formatter.dateFormat = "yyyy"
        default: return nil
        }
        return formatter.date(from: raw)
    }
}

private struct GoogleImageLinks: Decodable {
    let thumbnail: String?

    /// Google Booksのサムネイルは http で返ってくることがあるため https に統一する
    var secureThumbnail: String? {
        thumbnail?.replacingOccurrences(of: "http://", with: "https://")
    }
}

private struct GoogleIndustryIdentifier: Decodable {
    let type: String
    let identifier: String
}
