export function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

export function splitTags(text) {
  return (text ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * クリック可能な div などに、クリックと同時にキーボード操作(Enter/Space)でも
 * 発火するイベントを割り当てる。role="button" + tabindex="0" と併用する想定。
 */
export function bindActivate(element, handler) {
  element.addEventListener("click", handler);
  element.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handler(event);
    }
  });
}
