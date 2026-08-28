import { renderShelfView } from "./views/shelfView.js";
import { renderStatsView } from "./views/statsView.js";
import { renderPlaceholder } from "./views/placeholders.js";

const TABS = {
  shelf: {
    title: "本棚",
    render: (container) => renderShelfView(container),
  },
  stats: {
    title: "統計",
    render: (container) => renderStatsView(container),
  },
  trending: {
    title: "話題の本",
    render: (container) =>
      renderPlaceholder(container, {
        icon: "🔥",
        title: "話題の本",
        message: "楽天ブックスAPIのランキングから話題の本を紹介します(準備中)。",
        requiresNetwork: true,
      }),
  },
  settings: {
    title: "設定",
    render: (container) =>
      renderPlaceholder(container, {
        icon: "⚙️",
        title: "設定",
        message: "CSV/JSONでのエクスポート・バックアップ、図書館(カーリルAPI)連携設定などをここに置きます(準備中)。",
      }),
  },
};

let currentTab = "shelf";

function switchTab(tab) {
  if (tab === currentTab || !TABS[tab]) return;
  currentTab = tab;
  document.querySelectorAll("#tab-bar button").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.tab === tab);
  });
  document.getElementById("app-header-actions").innerHTML = "";
  renderCurrentTab();
}

function renderCurrentTab() {
  document.getElementById("app-title").textContent = TABS[currentTab].title;
  const container = document.getElementById("app-main");
  container.innerHTML = "";
  TABS[currentTab].render(container);
}

document.getElementById("tab-bar").addEventListener("click", (event) => {
  const btn = event.target.closest("button[data-tab]");
  if (btn) switchTab(btn.dataset.tab);
});

renderCurrentTab();
