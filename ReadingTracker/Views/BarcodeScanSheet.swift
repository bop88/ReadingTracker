import SwiftUI
import AVFoundation

/// バーコードスキャン画面。カメラ権限の状態に応じて表示を切り替える。
struct BarcodeScanSheet: View {
    var onScan: (String) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var authorizationStatus = AVCaptureDevice.authorizationStatus(for: .video)

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("バーコードをスキャン")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("キャンセル") { dismiss() }
                    }
                }
        }
    }

    @ViewBuilder
    private var content: some View {
        switch authorizationStatus {
        case .authorized:
            scannerWithOverlay
        case .notDetermined:
            ProgressView("カメラの権限を確認しています…")
                .task { await requestAccess() }
        case .denied, .restricted:
            ContentUnavailableView(
                "カメラを使用できません",
                systemImage: "camera.fill",
                description: Text("設定アプリでこのアプリのカメラへのアクセスを許可してください")
            )
        @unknown default:
            ContentUnavailableView("カメラを使用できません", systemImage: "camera.fill")
        }
    }

    private var scannerWithOverlay: some View {
        ZStack {
            BarcodeScannerView { code in
                onScan(code)
                dismiss()
            }
            .ignoresSafeArea()

            RoundedRectangle(cornerRadius: 12)
                .stroke(.white, lineWidth: 3)
                .frame(width: 280, height: 160)
                .shadow(radius: 4)

            VStack {
                Spacer()
                Text("バーコード(ISBN)を枠内に合わせてください")
                    .font(.footnote)
                    .foregroundStyle(.white)
                    .padding(8)
                    .background(.black.opacity(0.6), in: RoundedRectangle(cornerRadius: 8))
                    .padding(.bottom, 32)
            }
        }
    }

    private func requestAccess() async {
        let granted = await AVCaptureDevice.requestAccess(for: .video)
        authorizationStatus = granted ? .authorized : .denied
    }
}
