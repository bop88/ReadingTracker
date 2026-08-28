import Foundation

/// 新規登録フォーム(AddBookView)用の一時的な入力値。
///
/// 保存前は SwiftData の `Book` をまだ作らずこの struct に値を溜めておき、
/// バリデーション(タイトル必須・ISBN重複チェック等)を通ってから `Book` へ変換する。
/// バーコードスキャン/openBD・Google Books連携(フェーズ3)で取得した書誌情報も、
/// この draft に詰めてプレビュー編集させる想定。
struct BookDraft {
    var title: String = ""
    var author: String = ""
    var publisher: String = ""
    var isbn: String = ""
    var status: ReadingStatus = .wantToRead

    /// カンマ区切りで入力し、保存時に配列へ分割する
    var genreLabelsText: String = ""
    var customTagsText: String = ""

    var rating: Int = 0
    var notes: String = ""

    var publishedDate: Date?
    var startDate: Date?
    var finishDate: Date?

    /// 数値系はテキスト入力の柔軟性のため String で保持し、保存時に変換する
    var pageCountText: String = ""
    var readingProgressPercent: Double = 0

    var seriesName: String = ""
    var seriesVolumeText: String = ""

    static func fromScratch() -> BookDraft { BookDraft() }

    /// 既存の Book から draft を起こす(将来、編集フローでも再利用できるように)
    init() {}

    init(book: Book) {
        title = book.title
        author = book.author
        publisher = book.publisher
        isbn = book.isbn
        status = book.status
        genreLabelsText = book.genreLabels.joined(separator: ", ")
        customTagsText = book.customTags.joined(separator: ", ")
        rating = book.rating
        notes = book.notes
        publishedDate = book.publishedDate
        startDate = book.startDate
        finishDate = book.finishDate
        pageCountText = book.pageCount.map(String.init) ?? ""
        readingProgressPercent = book.readingProgressPercent
        seriesName = book.seriesName ?? ""
        seriesVolumeText = book.seriesVolume.map(String.init) ?? ""
    }

    private static func splitTags(_ text: String) -> [String] {
        text
            .split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespacesAndNewlines) }
            .filter { !$0.isEmpty }
    }

    var genreLabels: [String] { Self.splitTags(genreLabelsText) }
    var customTags: [String] { Self.splitTags(customTagsText) }
    var pageCount: Int? { Int(pageCountText) }
    var seriesVolume: Int? { Int(seriesVolumeText) }

    var trimmedTitle: String { title.trimmingCharacters(in: .whitespacesAndNewlines) }
    var trimmedISBN: String { isbn.trimmingCharacters(in: .whitespacesAndNewlines) }

    var isValid: Bool { !trimmedTitle.isEmpty }

    /// 新規 Book を生成する
    func makeBook() -> Book {
        Book(
            title: trimmedTitle,
            author: author.trimmingCharacters(in: .whitespacesAndNewlines),
            publisher: publisher.trimmingCharacters(in: .whitespacesAndNewlines),
            publishedDate: publishedDate,
            isbn: trimmedISBN,
            status: status,
            genreLabels: genreLabels,
            customTags: customTags,
            rating: rating,
            notes: notes,
            startDate: startDate,
            finishDate: finishDate,
            pageCount: pageCount,
            readingProgressPercent: readingProgressPercent,
            seriesName: seriesName.isEmpty ? nil : seriesName,
            seriesVolume: seriesVolume
        )
    }

    /// 既存 Book にこの draft の内容を書き戻す(編集フロー用)
    func apply(to book: Book) {
        book.title = trimmedTitle
        book.author = author.trimmingCharacters(in: .whitespacesAndNewlines)
        book.publisher = publisher.trimmingCharacters(in: .whitespacesAndNewlines)
        book.publishedDate = publishedDate
        book.isbn = trimmedISBN
        book.status = status
        book.genreLabels = genreLabels
        book.customTags = customTags
        book.rating = rating
        book.notes = notes
        book.startDate = startDate
        book.finishDate = finishDate
        book.pageCount = pageCount
        book.readingProgressPercent = readingProgressPercent
        book.seriesName = seriesName.isEmpty ? nil : seriesName
        book.seriesVolume = seriesVolume
        book.updatedAt = .now
    }
}
