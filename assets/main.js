// 站点通用：导航高亮 + 倒计时
(function () {
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".topbar nav a").forEach((a) => {
    if (a.getAttribute("href") === path) a.classList.add("active");
  });

  // 目标：2027年6月下旬 CATTI 考试（预计 6/26，以人社部通知为准）
  const target = new Date("2027-06-26T09:00:00+08:00");
  const els = { d: el("cd-d"), h: el("cd-h"), m: el("cd-m") };
  function el(id) { return document.getElementById(id); }
  function tick() {
    const diff = Math.max(0, target - Date.now());
    if (els.d) els.d.textContent = Math.floor(diff / 864e5);
    if (els.h) els.h.textContent = Math.floor(diff / 36e5) % 24;
    if (els.m) els.m.textContent = Math.floor(diff / 6e4) % 60;
  }
  tick();
  setInterval(tick, 30000);

  // 首页动态摘要
  const teaser = document.getElementById("news-teaser");
  if (teaser) {
    fetch("data/latest.json")
      .then((r) => r.json())
      .then((data) => {
        const items = [];
        (data.feeds || []).forEach((f) => (f.items || []).slice(0, 2).forEach((i) => items.push({ ...i, feed: f.name })));
        items.sort((a, b) => (b.date ? new Date(b.date) : 0) - (a.date ? new Date(a.date) : 0));
        // RSS 链接是外部不可信数据：仅放行 http(s)（safeLink），恶意协议降级为纯文本
        teaser.innerHTML = items.slice(0, 5).map(
          (i) => {
            const href = safeLink(i.link);
            const a = href
              ? `<a href="${esc(href)}" target="_blank" rel="noopener">${esc(i.title)}</a>`
              : `<span>${esc(i.title)}</span>`;
            return `<div class="feed-item"><time>${fmt(i.date)}</time>${a}<span class="pill">${esc(i.feed)}</span></div>`;
          }
        ).join("") || '<p class="status">暂无更新，稍后再来看看。</p>';
      })
      .catch(() => { teaser.innerHTML = '<p class="status">动态数据加载失败（本地预览属正常，推送后由 GitHub Actions 每日更新）。</p>'; });
  }

  function fmt(s) { if (!s) return ""; const d = new Date(s); return isNaN(d) ? s : d.toISOString().slice(0, 10); }
  function esc(s) { return (s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])); }
  const SAFE_LINK = /^https?:\/\//i;
  /* 仅放行 http/https；返回规范化 URL 或空串（与雅思站/高口站 sanitizeLink 同一约定）。 */
  function safeLink(u) {
    if (typeof u !== "string") return "";
    const t = u.trim();
    return SAFE_LINK.test(t) ? t : "";
  }
})();
