import Foundation
import SwiftData

/// 読書目標の期間単位
enum ReadingGoalPeriod: String, Codable, CaseIterable, Identifiable, Hashable {
    case yearly = "年間"
    case monthly = "月間"

    var id: String { rawValue }
}

/// 年間/月間の読書目標(冊数)。
///
/// 進捗表示は Views/StatsView 側で `readingProgress(against:)` のような
/// ヘルパーを使い、Book.finishDate を集計して算出する想定(フェーズ5で実装)。
@Model
final class ReadingGoal {
    var id: UUID
    var periodRawValue: String
    var year: Int
    /// 月間目標の場合の対象月(1〜12)。年間目標では nil。
    var month: Int?
    var targetCount: Int
    var createdAt: Date

    var period: ReadingGoalPeriod {
        get { ReadingGoalPeriod(rawValue: periodRawValue) ?? .yearly }
        set { periodRawValue = newValue.rawValue }
    }

    init(
        id: UUID = UUID(),
        period: ReadingGoalPeriod = .yearly,
        year: Int = Calendar.current.component(.year, from: .now),
        month: Int? = nil,
        targetCount: Int,
        createdAt: Date = .now
    ) {
        self.id = id
        self.periodRawValue = period.rawValue
        self.year = year
        self.month = month
        self.targetCount = targetCount
        self.createdAt = createdAt
    }
}
