// カメラでバーコード(ISBN, EAN-13/EAN-8)を読み取る。
// vendor/zxing.min.js (ZXing, Apache-2.0) をオフラインでも使えるようローカルに
// 同梱している(index.htmlで<script>読み込み → グローバル `ZXing`)。

export function isSupported() {
  return Boolean(navigator.mediaDevices?.getUserMedia) && typeof window.ZXing !== "undefined";
}

/**
 * 指定した <video> にカメラ映像を流し、バーコードを検出したら onScan を呼ぶ。
 * @param {HTMLVideoElement} videoElement
 * @param {(code: string) => void} onScan 1回目の検出でのみ呼ばれる
 * @returns {Promise<() => void>} 呼び出すとカメラを停止する関数
 */
export async function startScanning(videoElement, onScan) {
  if (!isSupported()) {
    throw new Error("このブラウザはバーコードスキャンに対応していません");
  }

  const hints = new Map();
  hints.set(window.ZXing.DecodeHintType.POSSIBLE_FORMATS, [
    window.ZXing.BarcodeFormat.EAN_13,
    window.ZXing.BarcodeFormat.EAN_8,
  ]);
  const reader = new window.ZXing.BrowserMultiFormatReader(hints);

  // 注意: このバージョンの decodeFromConstraints は停止用の値を返さない
  // (undefined を返す)。停止はインスタンス自身の reset() で行う
  // (内部でカメラストリームの停止まで行ってくれる)。
  let hasScanned = false;
  await reader.decodeFromConstraints({ video: { facingMode: "environment" } }, videoElement, (result) => {
    if (result && !hasScanned) {
      hasScanned = true;
      onScan(result.getText());
    }
  });

  return () => {
    try {
      reader.reset();
    } catch {
      // 既に停止済みなどは無視してよい
    }
  };
}
