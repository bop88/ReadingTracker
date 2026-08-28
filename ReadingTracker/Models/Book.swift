import Foundation
import SwiftData

/// 本棚に登録する1冊分のデータ。
///
/// すべてローカル(端末内)にのみ保存される(SwiftData / SQLite)。
/// クラウド同期やサーバー送信は一切行わない。
@Model
final class Book {

    // MARK: - 書誌情報

    /// タイトル
    var title: String

    /// 著者(複数著者はカンマ区切りの1文字列として保持。将来的に配列化も検討)
    var author: String

    /// 出版社
    var publisher: String

    /// 出版日
    var publishedDate: Date?

    /// 表紙画像のリモートURL(openBD / Google Books から取得した画像URL)
    var coverImageURL: String?

    /// 表紙画像のローカルキャッシュ(オフライン閲覧用にダウンロードして保持)
    @Attribute(.externalStorage)
    var coverImageData: Data?

    /// ISBN(書籍JANコード)。重複登録防止のキーとして使用。
    ///
    /// DB レベルの unique 制約は付けていない(ISBN未取得のまま手動登録した本同士が
    /// 空文字で衝突するのを避けるため)。重複チェックはアプリ側([Views/AddBookView.swift]
    /// 等)で ISBN が空でない場合のみ行う。
    var isbn: String

    // MARK: - ユーザー管理項目

    /// 読書ステータス(読んだ本 / 読みたい本 / 積読)
    var statusRawValue: String

    var status: ReadingStatus {
        get { ReadingStatus(rawValue: statusRawValue) ?? .wantToRead }
        set { statusRawValue = newValue.rawValue }
    }

    /// ジャンルラベル(Cコード/NDC/キーワードから自動判定 + 手動編集、複数可)
    var genreLabels: [String]

    /// 独自タグ(自由入力、複数可)
    var customTags: [String]

    /// 星評価(0=未評価、1〜5)
    var rating: Int

    /// 感想・メモ(自由テキスト)
    var notes: String

    /// 読み始めた日
    var startDate: Date?

    /// 読了日
    var finishDate: Date?

    /// 総ページ数
    var pageCount: Int?

    /// 読書進捗(0〜100の%)
    var readingProgressPercent: Double

    /// シリーズ名(本棚風表示・自動グルーピングに使用)
    var seriesName: String?

    /// シリーズ内の巻数
    var seriesVolume: Int?

    /// 手動でのシリーズ内並び順(未指定時はタイトル・巻数から自動判定)
    var manualSeriesOrder: Int?

    // MARK: - メタ情報

    /// アプリに追加した日時(追加日順ソートに使用)
    var createdAt: Date

    /// 最終更新日時
    var updatedAt: Date

    /// 一意なID
    @Attribute(.unique)
    var id: UUID

    init(
        id: UUID = UUID(),
        title: String,
        author: String = "",
        publisher: String = "",
        publishedDate: Date? = nil,
        coverImageURL: String? = nil,
        coverImageData: Data? = nil,
        isbn: String,
        status: ReadingStatus = .wantToRead,
        genreLabels: [String] = [],
        customTags: [String] = [],
        rating: Int = 0,
        notes: String = "",
        startDate: Date? = nil,
        finishDate: Date? = nil,
        pageCount: Int? = nil,
        readingProgressPercent: Double = 0,
        seriesName: String? = nil,
        seriesVolume: Int? = nil,
        manualSeriesOrder: Int? = nil,
        createdAt: Date = .now,
        updatedAt: Date = .now
    ) {
        self.id = id
        self.title = title
        self.author = author
        self.publisher = publisher
        self.publishedDate = publishedDate
        self.coverImageURL = coverImageURL
        self.coverImageData = coverImageData
        self.isbn = isbn
        self.statusRawValue = status.rawValue
        self.genreLabels = genreLabels
        self.customTags = customTags
        self.rating = max(0, min(5, rating))
        self.notes = notes
        self.startDate = startDate
        self.finishDate = finishDate
        self.pageCount = pageCount
        self.readingProgressPercent = max(0, min(100, readingProgressPercent))
        self.seriesName = seriesName
        self.seriesVolume = seriesVolume
        self.manualSeriesOrder = manualSeriesOrder
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

// MARK: - 「今読んでいる本」判定(ホーム画面ウィジェット用)

extension Book {
    /// 読み始めた日が設定済みで、読了日が未設定の本 = 今読んでいる本
    var isCurrentlyReading: Bool {
        startDate != nil && finishDate == nil
    }
}
