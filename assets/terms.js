// 词条库：翻面、标记已掌握（localStorage）、筛选、搜索、损坏存储自愈
(function () {
  const store = window.CATTIStorage;
  let mastered = new Set();
  let terms = [], cat = "全部", onlyUnlearned = false, query = "";

  const grid = document.getElementById("grid");
  const empty = document.getElementById("empty");
  const notice = document.getElementById("notice");

  function showNotice(msg) {
    if (!notice) return;
    notice.textContent = msg;
    notice.style.display = "block";
  }

  // 初始化学习记录：坏 JSON 在这里被拦下并重置，页面照常渲染
  try {
    const loaded = store.loadMastered(localStorage);
    mastered = new Set(loaded.items);
    if (loaded.corrupt) showNotice("⚠️ 检测到本地学习记录损坏，已自动重置为空。之前的标记无法恢复，抱歉。");
  } catch (e) {
    mastered = new Set();
  }

  fetch("data/terms.json")
    .then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then((data) => {
      terms = (data.terms || []).filter((t) => t && t.zh && t.en);
      document.getElementById("term-count").textContent = terms.length + " 条";
      if (!terms.length) throw new Error("词表为空");
      buildChips();
      render();
    })
    .catch(() => {
      grid.innerHTML = "";
      empty.style.display = "block";
      empty.textContent = "词条数据加载失败：请通过本地服务器预览（python3 -m http.server），线上版由 GitHub Pages 提供。";
    });

  function buildChips() {
    const cats = ["全部", ...new Set(terms.map((t) => t.cat))];
    const chips = document.getElementById("chips");
    chips.innerHTML = cats.map((c) => `<button class="chip${c === cat ? " active" : ""}" data-cat="${esc(c)}">${esc(c)}</button>`).join("");
    chips.querySelectorAll(".chip").forEach((b) =>
      b.addEventListener("click", () => { cat = b.dataset.cat; buildChips(); render(); }));
  }

  function current() {
    return terms.filter((t) =>
      (cat === "全部" || t.cat === cat) &&
      (!onlyUnlearned || !mastered.has(t.zh)) &&
      (!query || t.zh.toLowerCase().includes(query) || t.en.toLowerCase().includes(query)));
  }

  function render() {
    const list = current();
    empty.style.display = list.length ? "none" : "block";
    grid.innerHTML = list.map((t) => {
      const done = mastered.has(t.zh);
      return `
      <div class="tcard${done ? " master" : ""}">
        <div class="tcard-inner">
          <div class="tface front"><span class="cat">${esc(t.cat)}</span><div class="zh">${esc(t.zh)}</div><span class="hint">点击看译法 · 背面可标记</span></div>
          <div class="tface back">
            <div class="en">${esc(t.en)}</div>
            <button class="mark${done ? " on" : ""}" data-zh="${esc(t.zh)}" title="标记为已掌握，刷新后仍保留">${done ? "✓ 已掌握 · 点击取消" : "✓ 标记已掌握"}</button>
          </div>
        </div>
      </div>`;
    }).join("");

    grid.querySelectorAll(".tcard").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.closest(".mark")) return; // 按钮点击不触发翻面
        card.classList.toggle("flip");
      });
    });
    grid.querySelectorAll(".mark").forEach((b) =>
      b.addEventListener("click", () => toggleMaster(b.dataset.zh)));
  }

  function toggleMaster(zh) {
    if (mastered.has(zh)) mastered.delete(zh);
    else mastered.add(zh);
    if (!store.saveMastered(localStorage, [...mastered])) {
      showNotice("⚠️ 浏览器存储写入失败（隐私模式或空间已满），标记不会被保存。");
    }
    render();
  }

  document.getElementById("q").addEventListener("input", (e) => { query = e.target.value.trim().toLowerCase(); render(); });
  document.getElementById("btn-only-unlearned").addEventListener("click", (e) => {
    onlyUnlearned = !onlyUnlearned;
    e.target.classList.toggle("ghost", !onlyUnlearned);
    e.target.classList.toggle("btn", !onlyUnlearned);
    e.target.textContent = onlyUnlearned ? "显示全部" : "只看未掌握";
    render();
  });
  document.getElementById("btn-shuffle").addEventListener("click", () => {
    terms = terms.slice().sort(() => Math.random() - .5);
    render();
  });
  document.getElementById("btn-export").addEventListener("click", () => {
    const list = terms.filter((t) => !mastered.has(t.zh));
    const text = list.map((t) => `${t.zh}\t${t.en}`).join("\n") || "全部已掌握 🎉";
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "未掌握词条.txt";
    a.click();
    URL.revokeObjectURL(a.href);
  });

  function esc(s) { return (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
})();
