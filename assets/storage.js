// 学习记录存取：纯函数，浏览器与 Node 测试共用（scripts/test_storage.js）
(function (root) {
  const KEY = "catti2-terms-mastered";
  const MAX_ITEMS = 5000;

  // 解析原始存储值 → { items: string[], corrupt: boolean }
  function parseMastered(raw) {
    if (raw == null || raw === "") return { items: [], corrupt: false };
    let data;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      return { items: [], corrupt: true };
    }
    if (!Array.isArray(data)) return { items: [], corrupt: true };
    const seen = new Set();
    for (const v of data) {
      if (typeof v !== "string") return { items: [], corrupt: true };
      if (v) seen.add(v);
    }
    if (seen.size > MAX_ITEMS) return { items: [], corrupt: true };
    return { items: [...seen], corrupt: false };
  }

  // 读取并自愈：坏数据清空重置，绝不让整页挂掉
  function loadMastered(storage) {
    let raw = null;
    try { raw = storage.getItem(KEY); } catch (e) { raw = null; }
    const r = parseMastered(raw);
    if (r.corrupt) {
      try { storage.removeItem(KEY); } catch (e) {}
      try { storage.setItem(KEY, "[]"); } catch (e) {}
    }
    return r;
  }

  function saveMastered(storage, items) {
    const list = [...new Set(items)].filter((v) => typeof v === "string" && v).slice(0, MAX_ITEMS);
    try {
      storage.setItem(KEY, JSON.stringify(list));
      return true;
    } catch (e) {
      return false;
    }
  }

  const api = { KEY, MAX_ITEMS, parseMastered, loadMastered, saveMastered };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CATTIStorage = api;
})(typeof window !== "undefined" ? window : globalThis);
