import { openSheet } from "./sheet.js";
import { startScanning, isSupported } from "../scanner.js";

/**
 * バーコードスキャン画面。
 * @param {{ onScan: (code: string) => void }} options
 */
export function openScanSheet({ onScan }) {
  let stopScanning = null;

  const api = openSheet({
    title: "バーコードをスキャン",
    leftButton: {
      label: "キャンセル",
      onClick: (api) => {
        stopScanning?.();
        api.close();
      },
    },
    build: (body) => {
      body.style.padding = "0";
      body.innerHTML = `<div class="scanner-view" id="scanner-view"></div>`;
      startCamera(body.querySelector("#scanner-view"));
    },
  });

  async function startCamera(view) {
    if (!isSupported()) {
      view.innerHTML = `
        <div class="empty-state" style="color:white;">
          <span class="icon">📷</span>
          このブラウザ・端末ではカメラを使用できません
        </div>`;
      return;
    }

    const video = document.createElement("video");
    video.setAttribute("playsinline", "");
    video.muted = true;
    video.autoplay = true;
    view.appendChild(video);

    const frame = document.createElement("div");
    frame.className = "scanner-frame";
    view.appendChild(frame);

    const hint = document.createElement("div");
    hint.className = "scanner-hint";
    hint.textContent = "バーコード(ISBN)を枠内に合わせてください";
    view.appendChild(hint);

    try {
      stopScanning = await startScanning(video, (code) => {
        stopScanning?.();
        api.close();
        onScan(code);
      });
    } catch (err) {
      view.innerHTML = `
        <div class="empty-state" style="color:white;">
          <span class="icon">📷</span>
          カメラを使用できませんでした<br />
          <span style="font-size:12px;">設定でカメラへのアクセスを許可してください</span>
        </div>`;
      console.warn("Camera error:", err);
    }
  }

  return api;
}
