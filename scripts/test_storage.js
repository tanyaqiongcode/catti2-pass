#!/usr/bin/env node
// 学习记录存取的单元测试：node scripts/test_storage.js
// 覆盖：正常读写、损坏 JSON、非数组、混合类型、超长、空值、自愈回写
const assert = require("assert");
const path = require("path");
const store = require(path.join(__dirname, "..", "assets", "storage.js"));

function mockStorage(initial) {
  const map = new Map(initial ? Object.entries(initial) : []);
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    _map: map,
  };
}

let passed = 0;
function test(name, fn) {
  fn();
  passed += 1;
  console.log(`  ok  ${name}`);
}

test("空存储读取返回空集且不报损坏", () => {
  const s = mockStorage();
  const r = store.loadMastered(s);
  assert.deepStrictEqual(r, { items: [], corrupt: false });
});

test("正常数组读写往返一致", () => {
  const s = mockStorage();
  assert.strictEqual(store.saveMastered(s, ["新质生产力", "碳达峰碳中和", "新质生产力"]), true);
  const r = store.loadMastered(s);
  assert.strictEqual(r.corrupt, false);
  assert.strictEqual(r.items.length, 2);
  assert.ok(r.items.includes("新质生产力"));
});

test("损坏 JSON：返回 corrupt 并清空重置存储", () => {
  const s = mockStorage({ [store.KEY]: "{oops,,,不是JSON" });
  const r = store.loadMastered(s);
  assert.deepStrictEqual(r, { items: [], corrupt: true });
  assert.strictEqual(s.getItem(store.KEY), "[]");
});

test("合法 JSON 但不是数组（如对象/null/字符串）→ corrupt", () => {
  for (const bad of ['{"a":1}', "null", '"hello"', "123"]) {
    const s = mockStorage({ [store.KEY]: bad });
    const r = store.loadMastered(s);
    assert.strictEqual(r.corrupt, true, `应判损坏: ${bad}`);
    assert.deepStrictEqual(r.items, []);
    assert.strictEqual(s.getItem(store.KEY), "[]", "坏记录应被重置");
  }
});

test("数组内混入非字符串 → corrupt", () => {
  const s = mockStorage({ [store.KEY]: '["好词", 42, null]' });
  const r = store.loadMastered(s);
  assert.strictEqual(r.corrupt, true);
});

test("空字符串与 null 视为空记录而非损坏", () => {
  assert.deepStrictEqual(store.parseMastered(""), { items: [], corrupt: false });
  assert.deepStrictEqual(store.parseMastered(null), { items: [], corrupt: false });
});

test("超过上限视为损坏（防御异常膨胀）", () => {
  const big = JSON.stringify(Array.from({ length: store.MAX_ITEMS + 1 }, (_, i) => `词${i}`));
  const r = store.parseMastered(big);
  assert.strictEqual(r.corrupt, true);
});

test("存储不可用时 save 返回 false，load 不抛异常", () => {
  const broken = { getItem() { throw new Error("SecurityError"); }, setItem() { throw new Error("SecurityError"); }, removeItem() { throw new Error("SecurityError"); } };
  assert.strictEqual(store.saveMastered(broken, ["x"]), false);
  const r = store.loadMastered(broken);
  assert.deepStrictEqual(r, { items: [], corrupt: false });
});

test("空字符串词条被过滤", () => {
  const r = store.parseMastered('["", "有效词"]');
  assert.deepStrictEqual(r.items, ["有效词"]);
});

console.log(`\n${passed} 个用例全部通过 ✅`);
