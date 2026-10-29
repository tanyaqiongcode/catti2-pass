// 词条库：翻面、筛选、搜索、掌握度（localStorage）
(function () {
  const KEY = "catti2-terms-mastered";
  let mastered = new Set(JSON.parse(localStorage.getItem(KEY) || "[]"));
  let terms = [], cat = "全部", onlyUnlearned = false, query = "";

  const grid = document.getElementById("grid");
  const empty = document.getElementById("empty");

  fetch("data/terms.json")
    .then((r) => r.json())
    .then((data) => {
      terms = data.terms || [];
      document.getElementById("term-count").textContent = terms.length + " 条";
      buildChips();
      render();
    });

  function buildChips() {
    const cats = ["全部", ...new Set(terms.map((t) => t.cat))];
    const chips = document.getElementById("chips");
    chips.innerHTML = cats.map((c) => `<button class="chip${c === cat ? " active" : ""}" data-cat="${c}">${c}</button>`).join("");
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
    grid.innerHTML = list.map((t, i) => `
      <div class="tcard${mastered.has(t.zh) ? " master" : ""}" data-i="${i}">
        <div class="tcard-inner">
          <div class="tface front"><span class="cat">${esc(t.cat)}</span><div class="zh">${esc(t.zh)}</div><span class="hint">点击看译法</span></div>
          <div class="tface back"><div class="en">${esc(t.en)}</div></div>
        </div>
      </div>`).join("");
    grid.querySelectorAll(".tcard").forEach((card) => {
      card.addEventListener("click", (e) => {
        if (e.target.classList.contains("mark")) return;
        card.classList.toggle("flip");
      });
    });
    grid.querySelectorAll(".mark").forEach((b) =>
      b.addEventListener("click", () => toggleMaster(b.dataset.zh)));
  }

  function toggleMaster(zh) {
    mastered.has(zh) ? mastered.delete(zh) : mastered.add(zh);
    localStorage.setItem(KEY, JSON.stringify([...mastered]));
    render();
  }

  document.getElementById("q").addEventListener("input", (e) => { query = e.target.value.trim().toLowerCase(); render(); });
  document.getElementById("btn-only-unlearned").addEventListener("click", (e) => {
    onlyUnlearned = !onlyUnlearned;
    e.target.classList.toggle("ghost", !onlyUnlearned);
    e.target.classList.toggle("btn", !onlyUnlearned);
    if (onlyUnlearned) e.target.textContent = "显示全部"; else e.target.textContent = "只看未掌握";
    render();
  });
  document.getElementById("btn-shuffle").addEventListener("click", () => {
    terms = terms.slice().sort(() => Math.random() - .5);
    render();
  });
  document.getElementById("btn-export").addEventListener("click", () => {
    const list = terms.filter((t) => !mastered.has(t.zh));
    const text = list.map((t) => `${t.zh}\t${t.en}`).join("\n") || "全部已掌握 🎉";
    const blob = new Blob([text], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "未掌握词条.txt";
    a.click();
  });

  function esc(s) { return (s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
})();
