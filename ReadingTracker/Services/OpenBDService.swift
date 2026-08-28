import Foundation

/// 書誌情報取得で共通に使うエラー。
enum BookLookupError: Error {
    /// HTTPステータスが異常(2xx以外)だった
    case badResponse
    /// レスポンスの形式が想定と異なり解析できなかった
    case decodingFailed
}

/// https://openbd.jp (無料・APIキー不要) を使った書誌情報検索。
///
/// openBD は ISBN 単体検索専用の API のため、`search(keyword:)` は非対応。
/// タイトル・著者名での手動検索は [GoogleBooksService] を使う。
final class OpenBDService: BookLookupService {
    private let baseURL = URL(string: "https://api.openbd.jp/v1/get")!
    private let session: URLSession

    init(session: URLSession = .shared) {
        self.session = session
    }

    func lookup(isbn: String) async throws -> BookLookupResult? {
        guard var components = URLComponents(url: baseURL, resolvingAgainstBaseURL: false) else {
            return nil
        }
        components.queryItems = [URLQueryItem(name: "isbn", value: isbn)]
        guard let url = components.url else { return nil }

        let (data, response) = try await session.data(from: url)
        guard let http = response as? HTTPURLResponse, (200...299).contains(http.statusCode) else {
            throw BookLookupError.badResponse
        }

        // openBDはヒットしない場合 `[null]` を返す。JSONSerializationで緩く解析する
        // (ONIX由来のフィールドは発行元によって配列/単一オブジェクトが揺れるため、
        // 厳密な Codable ではなく [String: Any] ベースの防御的な読み取りにしている)。
        guard
            let jsonArray = try JSONSerialization.jsonObject(with: data) as? [Any],
            let first = jsonArray.first,
            !(first is NSNull)
        else {
            return nil
        }

        return OpenBDLookupParser.parse(first)
    }

    func search(keyword: String) async throws -> [BookLookupResult] {
        [] // openBDには全文検索APIが無いため未対応
    }
}

/// openBDのレスポンス(1件分)を `BookLookupResult` に変換する。
enum OpenBDLookupParser {
    static func parse(_ json: Any) -> BookLookupResult? {
        guard let record = json as? [String: Any] else { return nil }
        guard let summary = record["summary"] as? [String: Any] else { return nil }

        let isbn = (summary["isbn"] as? String) ?? ""
        let title = (summary["title"] as? String) ?? ""
        guard !isbn.isEmpty, !title.isEmpty else { return nil }

        let author = (summary["author"] as? String) ?? ""
        let publisher = (summary["publisher"] as? String) ?? ""
        let cover = (summary["cover"] as? String).flatMap { $0.isEmpty ? nil : $0 }
        let publishedDate = parseDate((summary["pubdate"] as? String))

        var cCode: String?
        if
            let onix = record["onix"] as? [String: Any],
            let descriptiveDetail = onix["DescriptiveDetail"] as? [String: Any]
        {
            let subjects = asArrayOfDicts(descriptiveDetail["Subject"])
            cCode = subjects
                .first { ($0["SubjectSchemeIdentifier"] as? String) == "78" }
                .flatMap { $0["SubjectCode"] as? String }
        }

        var ndc: String?
        if let hanmoto = record["hanmoto"] as? [String: Any] {
            ndc = (hanmoto["ndccode"] as? String).flatMap { $0.isEmpty ? nil : $0 }
        }

        return BookLookupResult(
            title: title,
            author: author,
            publisher: publisher,
            publishedDate: publishedDate,
            isbn: isbn,
            coverImageURL: cover,
            pageCount: nil,
            cCode: cCode,
            ndc: ndc
        )
    }

    /// ONIX由来のフィールドは要素数によって単一オブジェクト/配列が入れ替わることがあるため、
    /// どちらの形でも配列として扱えるようにする。
    private static func asArrayOfDicts(_ value: Any?) -> [[String: Any]] {
        if let array = value as? [[String: Any]] { return array }
        if let single = value as? [String: Any] { return [single] }
        return []
    }

    /// openBDの日付は "yyyyMMdd" / "yyyyMM" / "yyyy" のいずれか
    private static func parseDate(_ raw: String?) -> Date? {
        guard let raw else { return nil }
        let digits = raw.filter(\.isNumber)

        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.timeZone = TimeZone(identifier: "Asia/Tokyo")

        switch digits.count {
        case 8: formatter.dateFormat = "yyyyMMdd"
        case 6: formatter.dateFormat = "yyyyMM"
        case 4: formatter.dateFormat = "yyyy"
        default: return nil
        }
        return formatter.date(from: digits)
    }
}
