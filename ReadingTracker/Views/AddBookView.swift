import SwiftUI
import SwiftData

/// 手動での本の新規登録画面。
///
/// フェーズ3で「バーコードスキャン → openBD/Google Books から書誌情報取得 →
/// この画面と同じ形のプレビュー編集」フローを追加する予定。今はタイトル等を
/// 直接入力して登録する最小構成。
struct AddBookView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    /// 重複登録チェック用に既存の本を参照する
    @Query private var existingBooks: [Book]

    @State private var draft = BookDraft.fromScratch()
    @State private var duplicateWarning: Book?

    var body: some View {
        NavigationStack {
            Form {
                BookEditFormFields(draft: $draft)
            }
            .navigationTitle("本を追加")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("キャンセル") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("保存") { save() }
                        .disabled(!draft.isValid)
                }
            }
            .alert("同じISBNの本が登録済みです", isPresented: duplicateAlertBinding) {
                Button("キャンセル", role: .cancel) {}
                Button("それでも追加する") { insertBook() }
            } message: {
                if let duplicateWarning {
                    Text("「\(duplicateWarning.title)」が既に本棚に登録されています。二重登録に注意してください。")
                }
            }
        }
    }

    private var duplicateAlertBinding: Binding<Bool> {
        Binding(
            get: { duplicateWarning != nil },
            set: { if !$0 { duplicateWarning = nil } }
        )
    }

    private func save() {
        let isbn = draft.trimmedISBN
        if !isbn.isEmpty, let match = existingBooks.first(where: { $0.isbn == isbn }) {
            duplicateWarning = match
            return
        }
        insertBook()
    }

    private func insertBook() {
        modelContext.insert(draft.makeBook())
        dismiss()
    }
}

#Preview {
    AddBookView()
        .modelContainer(for: [Book.self, ReadingGoal.self], inMemory: true)
}
