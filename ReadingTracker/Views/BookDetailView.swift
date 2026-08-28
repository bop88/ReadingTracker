import SwiftUI
import SwiftData

/// 本の詳細・編集画面。
///
/// ホーム画面ウィジェット(フェーズ7)からのディープリンクは、この画面を
/// 対象の Book.id で開く形になる想定。
struct BookDetailView: View {
    @Bindable var book: Book

    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @State private var isEditing = false
    @State private var draft = BookDraft()

    var body: some View {
        Form {
            Section {
                LabeledContent("タイトル", value: book.title)
                if !book.author.isEmpty {
                    LabeledContent("著者", value: book.author)
                }
                if !book.publisher.isEmpty {
                    LabeledContent("出版社", value: book.publisher)
                }
                if !book.isbn.isEmpty {
                    LabeledContent("ISBN", value: book.isbn)
                }
            }

            Section("ステータス・評価") {
                LabeledContent("ステータス", value: book.status.rawValue)
                LabeledContent("評価", value: book.rating > 0 ? String(repeating: "★", count: book.rating) : "未評価")
            }

            if !book.genreLabels.isEmpty || !book.customTags.isEmpty {
                Section("ジャンル・タグ") {
                    if !book.genreLabels.isEmpty {
                        LabeledContent("ジャンル", value: book.genreLabels.joined(separator: ", "))
                    }
                    if !book.customTags.isEmpty {
                        LabeledContent("タグ", value: book.customTags.joined(separator: ", "))
                    }
                }
            }

            Section("進捗") {
                LabeledContent("読書進捗", value: "\(Int(book.readingProgressPercent))%")
                if let pageCount = book.pageCount {
                    LabeledContent("ページ数", value: "\(pageCount)")
                }
                if book.isCurrentlyReading {
                    Label("現在読書中", systemImage: "book")
                        .foregroundStyle(.blue)
                }
            }

            if !book.notes.isEmpty {
                Section("感想・メモ") {
                    Text(book.notes)
                }
            }

            Section {
                Button("この本を削除", role: .destructive) {
                    modelContext.delete(book)
                    dismiss()
                }
            }
        }
        .navigationTitle(book.title)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button("編集") {
                    draft = BookDraft(book: book)
                    isEditing = true
                }
            }
        }
        .sheet(isPresented: $isEditing) {
            NavigationStack {
                Form {
                    BookEditFormFields(draft: $draft)
                }
                .navigationTitle("本を編集")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("キャンセル") { isEditing = false }
                    }
                    ToolbarItem(placement: .confirmationAction) {
                        Button("保存") {
                            draft.apply(to: book)
                            isEditing = false
                        }
                        .disabled(!draft.isValid)
                    }
                }
            }
        }
    }
}

#Preview {
    let book = Book(title: "サンプルの本", author: "山田太郎", isbn: "9784000000000")
    return NavigationStack {
        BookDetailView(book: book)
    }
    .modelContainer(for: [Book.self, ReadingGoal.self], inMemory: true)
}
