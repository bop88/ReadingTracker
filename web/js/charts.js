// 依存ライブラリ無しの、統計画面用の最小限のSVGチャート生成。
// バーチャート(月別読了数)とドーナツチャート(ジャンル別・作者別割合)のみ。

import { escapeHTML } from "./utils.js";

export const CHART_PALETTE = [
  "#4C9F70", "#4C7EA8", "#C97B4A", "#A15C9E",
  "#C94C4C", "#4CA6A6", "#A6A64C", "#8C8C8C",
];

/**
 * 棒グラフ(縦棒)を生成する。
 * @param {{ labels: string[], values: number[], height?: number }} params
 * @returns {string} SVGのHTML文字列
 */
export function barChart({ labels, values, height = 140 }) {
  const width = Math.max(240, labels.length * 26);
  const max = Math.max(1, ...values);
  const bottomPadding = 16;
  const topPadding = 14;
  const barAreaHeight = height - bottomPadding - topPadding;
  const barWidth = width / labels.length;

  const bars = values
    .map((value, i) => {
      const barHeight = (value / max) * barAreaHeight;
      const x = i * barWidth + barWidth * 0.18;
      const y = height - bottomPadding - barHeight;
      const w = barWidth * 0.64;
      const valueLabel = value > 0 ? `<text x="${x + w / 2}" y="${y - 3}" font-size="9" text-anchor="middle" style="fill:var(--color-text-secondary)">${value}</text>` : "";
      return `
        <rect x="${x}" y="${y}" width="${w}" height="${Math.max(barHeight, value > 0 ? 2 : 0)}" rx="2" style="fill:var(--color-accent)"></rect>
        ${valueLabel}
        <text x="${x + w / 2}" y="${height - 4}" font-size="9" text-anchor="middle" style="fill:var(--color-text-secondary)">${escapeHTML(labels[i])}</text>
      `;
    })
    .join("");

  return `<svg viewBox="0 0 ${width} ${height}" style="width:100%;height:${height}px;" preserveAspectRatio="none">${bars}</svg>`;
}

/**
 * ドーナツチャートと凡例を生成する。
 * @param {{ label: string, value: number }[]} items 値の大きい順で渡すこと
 * @param {{ size?: number, thickness?: number, maxSlices?: number }} [options]
 * @returns {string} HTML文字列(SVG + 凡例)
 */
export function donutChartWithLegend(items, { size = 140, thickness = 26, maxSlices = 7 } = {}) {
  const grouped = groupTopN(items, maxSlices);
  const colored = grouped.map((item, i) => ({ ...item, color: CHART_PALETTE[i % CHART_PALETTE.length] }));
  const total = colored.reduce((sum, i) => sum + i.value, 0) || 1;

  const svg = donutSVG(colored, total, size, thickness);
  const legend = colored
    .map((item) => {
      const pct = Math.round((item.value / total) * 100);
      return `
        <div class="legend-item">
          <span class="legend-swatch" style="background:${item.color}"></span>
          <span class="legend-label">${escapeHTML(item.label)}</span>
          <span class="legend-value">${item.value}冊(${pct}%)</span>
        </div>`;
    })
    .join("");

  return `
    <div class="donut-chart-wrap">
      ${svg}
      <div class="chart-legend">${legend}</div>
    </div>`;
}

function donutSVG(items, total, size, thickness) {
  const radius = size / 2;
  const innerRadius = radius - thickness;
  const nonZero = items.filter((i) => i.value > 0);

  if (nonZero.length === 0) {
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"></svg>`;
  }

  if (nonZero.length === 1) {
    // 1色のみの場合、360度分のarcはパスが潰れるためフルリングを描く
    return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
      <circle cx="${radius}" cy="${radius}" r="${(radius + innerRadius) / 2}"
        fill="none" style="stroke:${nonZero[0].color}" stroke-width="${thickness}"></circle>
    </svg>`;
  }

  let angle = -90;
  const paths = nonZero
    .map((item) => {
      const fraction = item.value / total;
      const startAngle = angle;
      const endAngle = angle + fraction * 360;
      angle = endAngle;
      return arcPath(radius, radius, radius, innerRadius, startAngle, endAngle, item.color);
    })
    .join("");

  return `<svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">${paths}</svg>`;
}

function arcPath(cx, cy, outerR, innerR, startAngle, endAngle, color) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  const p1 = [cx + outerR * Math.cos(toRad(startAngle)), cy + outerR * Math.sin(toRad(startAngle))];
  const p2 = [cx + outerR * Math.cos(toRad(endAngle)), cy + outerR * Math.sin(toRad(endAngle))];
  const p3 = [cx + innerR * Math.cos(toRad(endAngle)), cy + innerR * Math.sin(toRad(endAngle))];
  const p4 = [cx + innerR * Math.cos(toRad(startAngle)), cy + innerR * Math.sin(toRad(startAngle))];

  const d = [
    `M ${p1[0]} ${p1[1]}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${p2[0]} ${p2[1]}`,
    `L ${p3[0]} ${p3[1]}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${p4[0]} ${p4[1]}`,
    "Z",
  ].join(" ");
  return `<path d="${d}" style="fill:${color}"></path>`;
}

/** 件数の多い順に並べ、上位N件以外は「その他」にまとめる */
function groupTopN(items, maxSlices) {
  const sorted = [...items].sort((a, b) => b.value - a.value);
  if (sorted.length <= maxSlices) return sorted;
  const top = sorted.slice(0, maxSlices - 1);
  const restTotal = sorted.slice(maxSlices - 1).reduce((sum, i) => sum + i.value, 0);
  return [...top, { label: "その他", value: restTotal }];
}
