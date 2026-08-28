import SwiftUI

/// 本の登録・編集フォームの中身。`Form { BookEditFormFields(draft: $draft) }` の形で使う。
/// AddBookView(新規登録)と BookDetailView(編集)の両方から共有される。
struct BookEditFormFields: View {
    @Binding var draft: BookDraft

    var body: some View {
        Section("書誌情報") {
            TextField("タイトル(必須)", text: $draft.title)
            TextField("著者", text: $draft.author)
            TextField("出版社", text: $draft.publisher)
            TextField("ISBN(JANコード)", text: $draft.isbn)
                .keyboardType(.numberPad)
            Toggle("出版日を設定する", isOn: Binding(
                get: { draft.publishedDate != nil },
                set: { draft.publishedDate = $0 ? (draft.publishedDate ?? .now) : nil }
            ))
            if draft.publishedDate != nil {
                DatePicker(
                    "出版日",
                    selection: Binding($draft.publishedDate, default: .now),
                    displayedComponents: .date
                )
            }
        }

        Section("ステータス・評価") {
            Picker("ステータス", selection: $draft.status) {
                ForEach(ReadingStatus.allCases) { status in
                    Text(status.rawValue).tag(status)
                }
            }
            Stepper("評価: \(draft.rating) / 5", value: $draft.rating, in: 0...5)
        }

        Section("ジャンル・タグ") {
            TextField("ジャンルラベル(カンマ区切り)", text: $draft.genreLabelsText)
            TextField("独自タグ(カンマ区切り)", text: $draft.customTagsText)
            Text("バーコード登録時は Cコード/NDC/キーワードから自動付与されます(未実装)")
                .font(.footnote)
                .foregroundStyle(.secondary)
        }

        Section("進捗") {
            Toggle("読み始めた日を設定する", isOn: Binding(
                get: { draft.startDate != nil },
                set: { draft.startDate = $0 ? (draft.startDate ?? .now) : nil }
            ))
            if draft.startDate != nil {
                DatePicker("読み始めた日", selection: Binding($draft.startDate, default: .now), displayedComponents: .date)
            }
            Toggle("読了日を設定する", isOn: Binding(
                get: { draft.finishDate != nil },
                set: { draft.finishDate = $0 ? (draft.finishDate ?? .now) : nil }
            ))
            if draft.finishDate != nil {
                DatePicker("読了日", selection: Binding($draft.finishDate, default: .now), displayedComponents: .date)
            }
            TextField("ページ数", text: $draft.pageCountText)
                .keyboardType(.numberPad)
            VStack(alignment: .leading) {
                Text("読書進捗: \(Int(draft.readingProgressPercent))%")
                Slider(value: $draft.readingProgressPercent, in: 0...100, step: 1)
            }
        }

        Section("シリーズ") {
            TextField("シリーズ名", text: $draft.seriesName)
            TextField("巻数", text: $draft.seriesVolumeText)
                .keyboardType(.numberPad)
        }

        Section("感想・メモ") {
            TextEditor(text: $draft.notes)
                .frame(minHeight: 120)
        }
    }
}

/// Optional<Date> を DatePicker 用の非Optional Binding に変換するヘルパー
extension Binding {
    init(_ source: Binding<Value?>, default defaultValue: Value) {
        self.init(
            get: { source.wrappedValue ?? defaultValue },
            set: { source.wrappedValue = $0 }
        )
    }
}
