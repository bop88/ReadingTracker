import SwiftUI

/// アプリのルート画面。タブで主要機能を切り替える。
///
/// 「話題の本」「図書館所蔵検索」はネットワーク通信が必要な機能であることを
/// 各画面内に明記する(要件: 非機能要件を参照)。
struct ContentView: View {
    var body: some View {
        TabView {
            BookShelfView()
                .tabItem { Label("本棚", systemImage: "books.vertical") }

            PlaceholderView(
                title: "統計",
                systemImage: "chart.pie",
                message: "年間/月間の読了数推移、ジャンル別・作者別割合、読書目標の進捗をここに表示します(フェーズ5で実装予定)。"
            )
            .tabItem { Label("統計", systemImage: "chart.pie") }

            PlaceholderView(
                title: "話題の本",
                systemImage: "flame",
                message: "楽天ブックスAPIのランキングから話題の本を紹介します(フェーズ6で実装予定・ネットワーク通信が必要)。",
                requiresNetwork: true
            )
            .tabItem { Label("話題の本", systemImage: "flame") }

            PlaceholderView(
                title: "設定",
                systemImage: "gearshape",
                message: "ダークモード切替、CSV/JSONでのエクスポート・バックアップ、図書館(カーリルAPI)連携設定などをここに置きます。"
            )
            .tabItem { Label("設定", systemImage: "gearshape") }
        }
    }
}

#Preview {
    ContentView()
        .modelContainer(for: [Book.self, ReadingGoal.self], inMemory: true)
}
