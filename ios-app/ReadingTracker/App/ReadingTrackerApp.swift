import SwiftUI
import SwiftData

@main
struct ReadingTrackerApp: App {

    /// アプリ全体で共有する SwiftData コンテナ。
    /// データは端末内ローカル(SQLite)にのみ保存され、クラウド同期は行わない。
    let modelContainer: ModelContainer = {
        let schema = Schema([
            Book.self,
            ReadingGoal.self,
        ])
        let configuration = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: false,
            cloudKitDatabase: .none
        )
        do {
            return try ModelContainer(for: schema, configurations: [configuration])
        } catch {
            fatalError("ModelContainer の作成に失敗しました: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(modelContainer)
    }
}
