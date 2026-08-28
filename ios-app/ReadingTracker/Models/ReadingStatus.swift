import Foundation

/// 本の読書ステータス(単一選択)
enum ReadingStatus: String, Codable, CaseIterable, Identifiable, Hashable {
    case read = "読んだ本"
    case wantToRead = "読みたい本"
    case stacked = "積読"

    var id: String { rawValue }

    /// SF Symbols などで使う簡易アイコン名
    var systemImageName: String {
        switch self {
        case .read: return "checkmark.circle.fill"
        case .wantToRead: return "bookmark.fill"
        case .stacked: return "tray.full.fill"
        }
    }
}
