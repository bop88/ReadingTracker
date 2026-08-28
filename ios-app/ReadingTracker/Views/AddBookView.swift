import SwiftUI
import SwiftData

/// 本の新規登録画面。
///
/// バーコードスキャン([BarcodeScanSheet])/ 検索([BookSearchView])のどちらから
/// 入っても、取得した書誌情報はこの画面のフォームにプレビューとして反映され、
/// 保存前に自由に編集できる。ISBNが既存の本と重複する場合は、スキャン・検索の
/// 直後と保存直前の両方で警告する。
struct AddBookView: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss

    /// 重複登録チェック用に既存の本を参照する
    @Query private var existingBooks: [Book]

    @State private var draft = BookDraft.fromScratch()

    @State private var isShowingScanner = false
    @State private var isShowingSearch = false
    @State private var isLookingUp = false
    @State private var lookupErrorMessage: String?

    @State private var duplicateWarning: Book?
    @State private var duplicateContext: DuplicateContext?

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    Button {
                        isShowingScanner = true
                    } label: {
                        Label("バーコードでスキャン", systemImage: "barcode.viewfinder")
                    }
                    Button {
                        isShowingSearch = true
                    } label: {
                        Label("タイトル・著者・ISBNで検索", systemImage: "magnifyingglass")
                    }
                } footer: {
                    Text("書誌情報の取得にはネットワーク通信が必要です。取得した内容は下のフォームで自由に編集できます。")
                }

                if isLookingUp {
                    HStack {
                        ProgressView()
                        Text("書誌情報を取得しています…")
                            .foregroundStyle(.secondary)
                    }
                }
                if let lookupErrorMessage {
                    Text(lookupErrorMessage)
                        .font(.footnote)
                        .foregroundStyle(.orange)
                }

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
            .sheet(isPresented: $isShowingScanner) {
                BarcodeScanSheet { code in
                    handleScanned(isbn: code)
                }
            }
            .sheet(isPresented: $isShowingSearch) {
                BookSearchView { result in
                    handleSearchSelected(result)
                }
            }
            .alert("同じISBNの本が登録済みです", isPresented: duplicateAlertBinding) {
                Button("キャンセル", role: .cancel) { duplicateContext = nil }
                Button("それでも進める") { proceedDespiteDuplicate() }
            } message: {
                if let duplicateWarning {
                    Text("「\(duplicateWarning.title)」が既に本棚に登録されています。二重登録に注意してください。")
                }
            }
        }
    }

    /// アラート表示中に何を実行するかを覚えておくための状態
    /// (保存時/スキャン直後/検索選択直後、それぞれ「それでも進める」の意味が違うため)
    private enum DuplicateContext {
        case saveForm
        case scannedISBN(String)
        case searchResult(BookLookupResult)
    }

    private var duplicateAlertBinding: Binding<Bool> {
        Binding(
            get: { duplicateWarning != nil },
            set: { if !$0 { duplicateWarning = nil; duplicateContext = nil } }
        )
    }

    // MARK: - 保存

    private func save() {
        let isbn = draft.trimmedISBN
        if !isbn.isEmpty, let match = existingBooks.first(where: { $0.isbn == isbn }) {
            duplicateWarning = match
            duplicateContext = .saveForm
            return
        }
        insertBook()
    }

    private func insertBook() {
        modelContext.insert(draft.makeBook())
        dismiss()
    }

    // MARK: - バーコードスキャン

    private func handleScanned(isbn: String) {
        if let match = existingBooks.first(where: { $0.isbn == isbn }) {
            duplicateWarning = match
            duplicateContext = .scannedISBN(isbn)
            return
        }
        Task { await performLookup(isbn: isbn) }
    }

    private func performLookup(isbn: String) async {
        isLookingUp = true
        lookupErrorMessage = nil
        defer { isLookingUp = false }

        do {
            if let foundDraft = try await BookLookupCoordinator.lookupByISBN(isbn) {
                draft = foundDraft
            } else {
                draft = BookDraft()
                draft.isbn = isbn
                lookupErrorMessage = "書誌情報が見つかりませんでした(ISBN: \(isbn))。内容を手動で入力してください。"
            }
        } catch {
            draft = BookDraft()
            draft.isbn = isbn
            lookupErrorMessage = "書誌情報の取得に失敗しました。ネットワーク接続をご確認のうえ、内容を手動で入力してください。"
        }
    }

    // MARK: - 検索して追加

    private func handleSearchSelected(_ result: BookLookupResult) {
        let isbn = result.isbn.trimmingCharacters(in: .whitespacesAndNewlines)
        if !isbn.isEmpty, let match = existingBooks.first(where: { $0.isbn == isbn }) {
            duplicateWarning = match
            duplicateContext = .searchResult(result)
            return
        }
        applySearchResult(result)
    }

    private func applySearchResult(_ result: BookLookupResult) {
        Task {
            isLookingUp = true
            lookupErrorMessage = nil
            defer { isLookingUp = false }
            draft = await BookLookupCoordinator.makeDraft(from: result)
        }
    }

    // MARK: - 重複警告への応答

    private func proceedDespiteDuplicate() {
        guard let context = duplicateContext else { return }
        duplicateContext = nil
        switch context {
        case .saveForm:
            insertBook()
        case .scannedISBN(let isbn):
            Task { await performLookup(isbn: isbn) }
        case .searchResult(let result):
            applySearchResult(result)
        }
    }
}

#Preview {
    AddBookView()
        .modelContainer(for: [Book.self, ReadingGoal.self], inMemory: true)
}
