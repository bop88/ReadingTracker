# 読書記録アプリ(ReadingTracker)- iOSネイティブ版(アーカイブ)

> ⚠️ **このディレクトリはアーカイブです。** 無料の Apple ID で署名した iOS アプリは
> 7日ごとに再インストールが必要という制約があるため、現在の開発は
> [`web/`](../web/) 配下の **PWA(Webアプリ)版** に移行しました。
> 「無料でずっと使える」を優先するなら `web/` を使ってください。
>
> 将来、有料の Apple Developer Program($99/年)に加入するなどしてこの制約が
> 気にならなくなった場合は、このディレクトリのコードとCI([build-ios.yml](../.github/workflows/build-ios.yml))
> がそのまま使えます。

個人の読書記録をローカルで管理する iOS アプリです。SwiftUI + SwiftData で実装しており、
データはすべて端末内(ローカル)にのみ保存されます。クラウド同期・自前サーバーはありません。

> **Mac は不要です。** このリポジトリは Windows PC だけで開発・ビルド確認・実機インストールが
> 完結するように作られています。ビルドは GitHub Actions の macOS ランナー上で自動実行され、
> 実機へのインストールは Windows 用ツール **Sideloadly** で行います。

---

## 1. 現在の実装状況

進め方のロードマップのうち、以下が完了しています。

- [x] フェーズ1: GitHub Actions CI(未署名 `.ipa` の自動ビルド)
- [x] フェーズ2: データモデルと SwiftData のローカルDB基本構成、最小限のアプリ雛形
      (本棚のリスト表示・手動追加・詳細編集・削除、ISBN重複時の警告)
- [x] フェーズ3: バーコードスキャン→openBD/Google Books連携→ジャンル自動判定
      (Cコード/NDC/キーワードでの自動判定、手動検索での追加、重複登録の警告を含む)
- [ ] フェーズ4: グリッド/本棚風表示、フィルター・ソート・検索
- [ ] フェーズ5: 統計・可視化、読書目標
- [ ] フェーズ6: 話題の本ページ(楽天ブックスAPI)、図書館連携(カーリルAPI)
- [ ] フェーズ7: ホーム画面ウィジェット(WidgetKit)

未実装のタブ(統計 / 話題の本 / 設定)はアプリ内に「準備中」画面として表示されます。

---

## 2. プロジェクト構成

```
ReadingTracker/
├── project.yml                    # XcodeGen マニフェスト(.xcodeproj はこれから生成する)
├── .github/workflows/build.yml    # CI: xcodegen → xcodebuild(未署名)→ .ipa 化
├── ReadingTracker/
│   ├── App/                       # アプリのエントリーポイント・SwiftData初期化
│   ├── Models/                    # Book / ReadingStatus / ReadingGoal(SwiftDataモデル)
│   ├── Services/                  # 書誌情報取得などの外部連携(今後実装)
│   ├── Views/                     # 本棚・追加・詳細などの画面
│   └── Resources/                 # Assets.xcassets(アイコン等)
```

`.xcodeproj` はコミットしていません。`xcodegen generate` を実行するたびに `project.yml` から
再生成される仕組みです(CI も同じ手順を踏みます)。

---

## 3. GitHub Actions でのビルド確認方法(Mac不要)

このリポジトリは **パブリックリポジトリ** です。パブリックリポジトリでは GitHub Actions の
macOS ランナー(`macos-latest`)を無料・無制限で利用できるため、Mac を持っていなくても
Xcode ビルドが自動で走ります。

### 3-1. ビルドの流れ

`main` を含むすべてのブランチへの push で `.github/workflows/build.yml` が自動実行され、
以下を行います。

1. macOS ランナー上で `brew install xcodegen`
2. `xcodegen generate` で `ReadingTracker.xcodeproj` を生成
3. `xcodebuild` で **未署名**(`CODE_SIGNING_ALLOWED=NO` など)のままビルド
4. できあがった `.app` を `Payload/` フォルダに入れて zip 化し、`.ipa` として出力
5. Actions の Artifacts に `ReadingTracker-unsigned-ipa` としてアップロード(14日間保持)

### 3-2. Windows のブラウザだけで確認する手順

1. ブラウザで GitHub のこのリポジトリを開く
2. 上部タブの **[Actions]** をクリック
3. 一番上にある最新の実行(ワークフロー名: *Build Unsigned IPA*)を開く
4. 緑のチェック ✅ が付けば成功。ページ下部の **Artifacts** 欄にある
   `ReadingTracker-unsigned-ipa` をクリックしてダウンロード(zip)
5. ダウンロードした zip を展開すると `ReadingTracker.ipa` が出てきます

赤い ✗ が出た場合は、その実行のログをクリックすると失敗したステップの詳細(エラーメッセージ)
を Windows のブラウザだけで確認できます。

---

## 4. Sideloadly で実機(iPhone)にインストールする手順

[Sideloadly](https://sideloadly.io)(無料・Windows対応)を使うと、Mac なしで無料の Apple ID
だけを使って `.ipa` を iPhone にインストールできます。

### 4-1. 事前準備

- Windows PC に [Sideloadly](https://sideloadly.io) をインストール
- Windows PC に [iTunes](https://www.apple.com/itunes/) をインストール(Apple のドライバのため)
- iPhone を Lightning/USB-C ケーブルで PC に接続し、「このコンピュータを信頼する」を許可
- 無料の Apple ID(通常の iCloud ログイン用アカウントで可。専用に別IDを作っても良い)

### 4-2. インストール手順

1. 上記「3-2」の手順で `ReadingTracker.ipa` をダウンロードしておく
2. Sideloadly を起動し、iPhone が認識されていることを確認
3. Sideloadly の画面に `ReadingTracker.ipa` をドラッグ&ドロップ
4. Apple ID のメールアドレスを入力して **Start** をクリック
5. Apple ID のパスワード・(必要なら)2ファクタ認証コードを入力してサインイン
6. 署名とインストールが自動で進み、iPhone のホーム画面にアプリが追加されます
7. 初回起動時、iPhone側で「信頼されていないデベロッパ」の警告が出た場合:
   **設定 → 一般 → VPNとデバイス管理 → (該当のApple ID) → 信頼する**

### 4-3. ⚠️ 無料 Apple ID の7日間制限について

無料の Apple ID(Apple Developer Program 未加入)で署名したアプリは、
**インストールから7日間で自動的に起動できなくなります**(Appleの仕様)。

- 期限が切れて開けなくなった場合は、**同じ `.ipa` を使って上記「4-2」の手順をもう一度行う**
  だけで再インストールでき、また7日間使えるようになります
- データは端末内のアプリ領域に保存されているため、7日ごとの再インストールでも
  基本的に読書記録は保持されます(ただし iOS の仕様変更や完全な削除→再インストールを行った
  場合は失われる可能性があるため、後述のエクスポート機能でのバックアップを推奨します)
- 有料の Apple Developer Program(年間 $99)に加入すると、この7日制限はなくなり
  1年間有効な署名でインストールできます

---

## 5. データとネットワーク通信について

- 読書記録そのもの(タイトル・感想・評価など)は **完全に端末内ローカル保存**(SwiftData)です
- 以下の機能は **ネットワーク通信が必要**です(それ以外はオフラインで閲覧・編集可能)
  - バーコードスキャン時の書誌情報取得(openBD / Google Books API)
  - 話題の本ページ(楽天ブックスAPI)
  - 図書館所蔵検索(カーリルAPI)
- データのエクスポート/バックアップ(CSV・JSON)はローカルファイルへの書き出し・復元のみで、
  クラウドへのアップロードは行いません

---

## 6. ローカルでの開発(参考: Mac をお持ちの場合)

Mac をお持ちの場合は、通常どおり手元でも開発できます。

```bash
brew install xcodegen
xcodegen generate
open ReadingTracker.xcodeproj
```
