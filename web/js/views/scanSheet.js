import { openSheet } from "./sheet.js";
import { startScanning } from "../scanner.js";

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
    const video = document.createElement("video");
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
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
      console.warn("Camera error:", err);
      view.innerHTML = `
        <div class="empty-state" style="color:white;">
          <span class="icon">📷</span>
          ${cameraErrorMessage(err)}
        </div>`;
    }
  }

  return api;
}

function cameraErrorMessage(err) {
  const detail = `<br /><span style="font-size:11px;opacity:0.7;">(${escapeHTML(err?.name ?? "")}: ${escapeHTML(err?.message ?? "")})</span>`;

  switch (err?.name) {
    case "NotAllowedError":
    case "SecurityError":
      return (
        "カメラへのアクセスが許可されていません。<br />" +
        '<span style="font-size:12px;">' +
        "設定アプリ →「Safari」→「カメラ」で許可されているか確認してください。<br />" +
        "以前に「許可しない」を選んでいると、次回以降ポップアップ自体が出ません。" +
        "</span>" +
        detail
      );
    case "NotFoundError":
    case "OverconstrainedError":
      return "この端末で使えるカメラが見つかりませんでした。" + detail;
    case "NotReadableError":
      return "カメラが他のアプリで使用中の可能性があります。他のアプリを閉じて再度お試しください。" + detail;
    case "UnsupportedError":
      return "このブラウザ・端末ではカメラを使用できません。<br /><span style=\"font-size:12px;\">LINE・X（旧Twitter）などアプリ内のブラウザで開いている場合は、Safariで直接開いてお試しください。</span>" + detail;
    case "LibraryLoadError":
      return "バーコード読み取り機能の読み込みに失敗しました。画面を再読み込みしてください。" + detail;
    default:
      return "カメラを起動できませんでした。" + detail;
  }
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
