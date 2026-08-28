import SwiftUI

/// まだ実装していない機能タブ用の暫定画面。
/// 実装の進め方(README / 依頼内容のロードマップ)に沿って、フェーズごとに
/// このファイルを実際の画面へ差し替えていく。
struct PlaceholderView: View {
    let title: String
    let systemImage: String
    let message: String
    var requiresNetwork: Bool = false

    var body: some View {
        NavigationStack {
            ContentUnavailableView {
                Label(title, systemImage: systemImage)
            } description: {
                VStack(spacing: 8) {
                    Text(message)
                    if requiresNetwork {
                        Label("この機能にはネットワーク通信が必要です", systemImage: "wifi")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .navigationTitle(title)
        }
    }
}

#Preview {
    PlaceholderView(title: "統計", systemImage: "chart.pie", message: "準備中です。")
}
