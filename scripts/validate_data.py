#!/usr/bin/env python3
"""CI 数据校验：terms.json / latest.json 结构完整、条数在护栏区间、无重复。退出码非 0 即失败。"""
import json
import sys
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / "data"
MIN_TERMS = 200  # 词表护栏下限：低于此数说明词表被意外清空/截断

errors = []


def check(cond, msg):
    if not cond:
        errors.append(msg)


terms_path = DATA / "terms.json"
try:
    terms = json.loads(terms_path.read_text(encoding="utf-8"))
except (OSError, json.JSONDecodeError) as e:
    print(f"FAIL terms.json 无法读取: {e}")
    sys.exit(1)

items = terms.get("terms", [])
check(isinstance(items, list) and len(items) >= MIN_TERMS, f"词条数 {len(items)} < 下限 {MIN_TERMS}")
check(terms.get("count") == len(items), "count 字段与实际条数不一致")
zh_list = [t.get("zh", "") for t in items]
check(len(zh_list) == len(set(zh_list)), "存在重复中文词条")
for t in items:
    check(isinstance(t, dict) and t.get("zh") and t.get("en") and t.get("cat") and t.get("src"),
          f"词条字段不完整: {t}")

latest_path = DATA / "latest.json"
try:
    latest = json.loads(latest_path.read_text(encoding="utf-8"))
    feeds = latest.get("feeds", [])
    check(isinstance(feeds, list) and len(feeds) >= 1, "latest.json 无任何 feed")
    check("updated" in latest, "latest.json 缺 updated 字段")
    for f in feeds:
        check(isinstance(f.get("items"), list), f"feed {f.get('id')} 缺 items")
except (OSError, json.JSONDecodeError) as e:
    print(f"FAIL latest.json 无法读取: {e}")
    sys.exit(1)

if errors:
    for e in errors:
        print(f"FAIL {e}")
    sys.exit(1)
print(f"数据校验通过：{len(items)} 条词条、{len(feeds)} 个动态源")
