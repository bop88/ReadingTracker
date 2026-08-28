import SwiftUI

/// タイトル・著者・ISBNでの手動検索画面。
///
/// openBD は ISBN 単体検索専用で全文検索に対応していないため、
/// ここでは Google Books API のみを使用する。
struct BookSearchView: View {
    var onSelect: (BookLookupResult) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var query = ""
    @State private var results: [BookLookupResult] = []
    @State private var isSearching = false
    @State private var errorMessage: String?

    private let googleBooks = GoogleBooksService()

    var body: some View {
        NavigationStack {
            List {
                if let errorMessage {
                    Text(errorMessage)
                        .foregroundStyle(.secondary)
                }
                ForEach(Array(results.enumerated()), id: \.offset) { _, result in
                    Button {
                        onSelect(result)
                        dismiss()
                    } label: {
                        resultRow(result)
                    }
                }
            }
            .overlay {
                if isSearching {
                    ProgressView()
                } else if results.isEmpty && !query.isEmpty && errorMessage == nil {
                    ContentUnavailableView.search(text: query)
                }
            }
            .navigationTitle("本を検索")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $query, prompt: "タイトル・著者・ISBN")
            .onSubmit(of: .search) { Task { await performSearch() } }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("閉じる") { dismiss() }
                }
            }
        }
    }

    private func resultRow(_ result: BookLookupResult) -> some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(result.title.isEmpty ? "(タイトル不明)" : result.title)
                .font(.headline)
                .foregroundStyle(.primary)
            if !result.author.isEmpty {
                Text(result.author)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            if !result.publisher.isEmpty {
                Text(result.publisher)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func performSearch() async {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }

        isSearching = true
        errorMessage = nil
        defer { isSearching = false }

        do {
            results = try await googleBooks.search(keyword: trimmed)
        } catch {
            results = []
            errorMessage = "検索に失敗しました。ネットワーク接続をご確認ください。"
        }
    }
}
