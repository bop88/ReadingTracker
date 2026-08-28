import { getAllBooks, getAllGoals, putGoal } from "../db.js";
import { createGoal, GoalPeriod, isCurrentlyReading } from "../models.js";
import { barChart, donutChartWithLegend } from "../charts.js";

const MONTH_LABELS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

// 月別読了数チャートで選択中の年(タブ切り替えでは保持、ページ再読み込みではリセット)
let selectedYear = null;

/**
 * 統計・可視化画面。
 * - サマリー(登録冊数・読了冊数・平均評価・読書中の冊数)
 * - 読書目標(年間・月間)と進捗
 * - 月別読了数の推移(棒グラフ)
 * - ジャンル別・作者別割合(ドーナツグラフ)
 */
export async function renderStatsView(container) {
  document.getElementById("app-header-actions").innerHTML = "";
  container.innerHTML = `<div class="loading-row"><div class="spinner"></div>読み込み中…</div>`;

  const books = await getAllBooks();
  const goals = await getAllGoals();
  render(books, goals);

  function render(books, goals) {
    const stats = computeStats(books);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    const years = [...stats.byYearMonth.keys()];
    if (!years.includes(currentYear)) years.push(currentYear);
    years.sort((a, b) => b - a);
    if (selectedYear == null || !years.includes(selectedYear)) selectedYear = years[0];

    const monthlyCounts = stats.byYearMonth.get(selectedYear) ?? new Array(12).fill(0);
    const finishedCurrentYear = sum(stats.byYearMonth.get(currentYear) ?? []);
    const finishedCurrentMonth = (stats.byYearMonth.get(currentYear) ?? [])[currentMonth - 1] ?? 0;

    const yearlyGoal = findGoal(goals, GoalPeriod.YEARLY, currentYear, null);
    const monthlyGoal = findGoal(goals, GoalPeriod.MONTHLY, currentYear, currentMonth);

    container.innerHTML = `
      <div class="stat-tiles">
        <div class="stat-tile"><div class="stat-value">${stats.totalBooks}</div><div class="stat-label">登録冊数</div></div>
        <div class="stat-tile"><div class="stat-value">${stats.totalFinished}</div><div class="stat-label">読了冊数</div></div>
        <div class="stat-tile"><div class="stat-value">${stats.avgRating != null ? stats.avgRating.toFixed(1) : "–"}</div><div class="stat-label">平均評価</div></div>
        <div class="stat-tile"><div class="stat-value">${stats.currentlyReadingCount}</div><div class="stat-label">読書中</div></div>
      </div>

      <div class="form-section">
        <div class="form-section-title">読書目標</div>
        <div class="goal-row">
          <div class="goal-row-header">
            <span>今年(${currentYear}年)</span>
            <span>${finishedCurrentYear} / <input type="number" id="goal-yearly-input" min="0" value="${yearlyGoal?.targetCount ?? ""}" placeholder="未設定" />冊</span>
          </div>
          ${goalProgressHTML(finishedCurrentYear, yearlyGoal?.targetCount)}
        </div>
        <div class="goal-row">
          <div class="goal-row-header">
            <span>今月(${currentMonth}月)</span>
            <span>${finishedCurrentMonth} / <input type="number" id="goal-monthly-input" min="0" value="${monthlyGoal?.targetCount ?? ""}" placeholder="未設定" />冊</span>
          </div>
          ${goalProgressHTML(finishedCurrentMonth, monthlyGoal?.targetCount)}
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-title chart-title-row">
          <span>月別読了数</span>
          <select id="year-select"></select>
        </div>
        <div class="chart-body">
          ${
            monthlyCounts.every((v) => v === 0)
              ? `<div class="helper-text" style="padding:0;">${selectedYear}年に読了した本はまだありません</div>`
              : barChart({ labels: MONTH_LABELS, values: monthlyCounts })
          }
        </div>
      </div>

      <div class="form-section">
        <div class="form-section-title">ジャンル別割合</div>
        ${chartOrEmpty(stats.genreCounts, "ジャンルが設定された本がありません")}
      </div>

      <div class="form-section">
        <div class="form-section-title">作者別割合</div>
        ${chartOrEmpty(stats.authorCounts, "著者が設定された本がありません")}
      </div>
    `;

    const yearSelect = container.querySelector("#year-select");
    for (const y of years) {
      const opt = document.createElement("option");
      opt.value = String(y);
      opt.textContent = `${y}年`;
      opt.selected = y === selectedYear;
      yearSelect.appendChild(opt);
    }
    yearSelect.addEventListener("change", (e) => {
      selectedYear = Number(e.target.value);
      render(books, goals);
    });

    container.querySelector("#goal-yearly-input").addEventListener("change", async (e) => {
      await saveGoal(goals, GoalPeriod.YEARLY, currentYear, null, e.target.value);
      render(books, await getAllGoals());
    });
    container.querySelector("#goal-monthly-input").addEventListener("change", async (e) => {
      await saveGoal(goals, GoalPeriod.MONTHLY, currentYear, currentMonth, e.target.value);
      render(books, await getAllGoals());
    });
  }
}

async function saveGoal(goals, period, year, month, rawValue) {
  const targetCount = rawValue === "" ? 0 : Math.max(0, Math.round(Number(rawValue)) || 0);
  const existing = findGoal(goals, period, year, month);
  const goal = existing ? { ...existing, targetCount } : createGoal({ period, year, month, targetCount });
  await putGoal(goal);
}

function findGoal(goals, period, year, month) {
  return goals.find(
    (g) => g.period === period && g.year === year && (period === GoalPeriod.MONTHLY ? g.month === month : true)
  );
}

function goalProgressHTML(current, target) {
  if (!target || target <= 0) {
    return `<div class="helper-text" style="padding:2px 0 0;">目標冊数を入力すると進捗が表示されます</div>`;
  }
  const pct = Math.min(100, Math.round((current / target) * 100));
  return `
    <div class="goal-progress-bar"><div class="goal-progress-fill" style="width:${pct}%"></div></div>
    <div class="helper-text" style="padding:4px 0 0;">${pct}%</div>
  `;
}

function chartOrEmpty(items, emptyMessage) {
  const nonZero = items.filter((i) => i.value > 0);
  if (nonZero.length === 0) {
    return `<div class="helper-text" style="padding:0 14px 14px;">${emptyMessage}</div>`;
  }
  return `<div class="chart-body">${donutChartWithLegend(nonZero)}</div>`;
}

function computeStats(books) {
  const finished = books.filter((b) => b.finishDate);
  const rated = books.filter((b) => b.rating > 0);
  const avgRating = rated.length > 0 ? rated.reduce((s, b) => s + b.rating, 0) / rated.length : null;
  const currentlyReadingCount = books.filter(isCurrentlyReading).length;

  const byYearMonth = new Map();
  for (const book of finished) {
    const date = parseLocalDate(book.finishDate);
    if (!date) continue;
    const year = date.getFullYear();
    if (!byYearMonth.has(year)) byYearMonth.set(year, new Array(12).fill(0));
    byYearMonth.get(year)[date.getMonth()]++;
  }

  return {
    totalBooks: books.length,
    totalFinished: finished.length,
    avgRating,
    currentlyReadingCount,
    byYearMonth,
    genreCounts: countBy(books.flatMap((b) => b.genreLabels ?? [])),
    authorCounts: countBy(books.map((b) => b.author).filter(Boolean)),
  };
}

function countBy(values) {
  const map = new Map();
  for (const v of values) map.set(v, (map.get(v) ?? 0) + 1);
  return [...map.entries()].map(([label, value]) => ({ label, value }));
}

/** "YYYY-MM-DD" をローカル日付として解釈する(new Date(string)だとUTC扱いになり
 *  タイムゾーンによっては日付がずれることがあるため) */
function parseLocalDate(isoDateString) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDateString ?? "");
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function sum(values) {
  return values.reduce((s, v) => s + v, 0);
}
