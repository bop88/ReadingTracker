/**
 * まだ実装していない機能タブ用の暫定画面。
 * @param {HTMLElement} container
 * @param {{icon: string, title: string, message: string, requiresNetwork?: boolean}} options
 */
export function renderPlaceholder(container, { icon, title, message, requiresNetwork = false }) {
  container.innerHTML = `
    <div class="empty-state">
      <span class="icon">${icon}</span>
      <strong>${title}</strong>
      <p>${message}</p>
      ${requiresNetwork ? '<p style="font-size:12px;">📶 この機能にはネットワーク通信が必要です</p>' : ""}
    </div>
  `;
}
