import SwiftUI
import SwiftData
import UIKit

/// 本棚のメイン画面(現段階ではリスト表示のみ)。
///
/// フェーズ4で以下を追加する:
/// - グリッド表示 / 本棚風表示との切り替え(表示モード Picker)
/// - ステータス・ジャンル・作者・タグでの複合フィルターとソート
/// - キーワード検索(タイトル・著者・メモ)
struct BookShelfView: View {
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \Book.createdAt, order: .reverse) private var books: [Book]

    @State private var isShowingAddBook = false

    var body: some View {
        NavigationStack {
            Group {
                if books.isEmpty {
                    ContentUnavailableView(
                        "本が登録されていません",
                        systemImage: "books.vertical",
                        description: Text("右上の + から本を追加してください")
                    )
                } else {
                    List {
                        ForEach(books) { book in
                            NavigationLink(value: book) {
                                BookRow(book: book)
                            }
                        }
                        .onDelete(perform: deleteBooks)
                    }
                }
            }
            .navigationTitle("本棚")
            .navigationDestination(for: Book.self) { book in
                BookDetailView(book: book)
            }
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        isShowingAddBook = true
                    } label: {
                        Label("本を追加", systemImage: "plus")
                    }
                }
            }
            .sheet(isPresented: $isShowingAddBook) {
                AddBookView()
            }
        }
    }

    private func deleteBooks(at offsets: IndexSet) {
        for index in offsets {
            modelContext.delete(books[index])
        }
    }
}

private struct BookRow: View {
    let book: Book

    var body: some View {
        HStack(spacing: 12) {
            CoverThumbnail(book: book)

            VStack(alignment: .leading, spacing: 4) {
                Text(book.title)
                    .font(.headline)
                    .lineLimit(2)
                if !book.author.isEmpty {
                    Text(book.author)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                HStack(spacing: 6) {
                    Label(book.status.rawValue, systemImage: book.status.systemImageName)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                    if book.rating > 0 {
                        Text(String(repeating: "★", count: book.rating))
                            .font(.caption)
                            .foregroundStyle(.yellow)
                    }
                }
            }
        }
        .padding(.vertical, 2)
    }
}

private struct CoverThumbnail: View {
    let book: Book

    var body: some View {
        Group {
            if let data = book.coverImageData, let uiImage = UIImage(data: data) {
                Image(uiImage: uiImage)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } else {
                ZStack {
                    Rectangle().fill(.quaternary)
                    Image(systemName: "book.closed")
                        .foregroundStyle(.secondary)
                }
            }
        }
        .frame(width: 44, height: 60)
        .clipShape(RoundedRectangle(cornerRadius: 4))
    }
}

#Preview {
    BookShelfView()
        .modelContainer(for: [Book.self, ReadingGoal.self], inMemory: true)
}
