#!/usr/bin/env python3
"""抓取公开播客/新闻 RSS，生成 data/latest.json 供 news.html 与首页展示。

数据可靠性约定（与雅思站/高口站 update_feeds.py 同一契约）：
- 单个源失败时，沿用上次成功抓取的该源数据（合并写入，绝不因部分失败丢弃好数据）；
- 仅当「全部源失败且无历史数据」时才以非零码退出（CI 视为失败）；
- 每个源带 fetched_at，前端可见数据新旧。
仅在 GitHub Actions 定时任务与手动触发时运行。"""
import json
import ssl
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from pathlib import Path

FEEDS = [
    {
        "id": "bbc-globalnews",
        "name": "BBC Global News Podcast",
        "url": "https://downloads.bbc.co.uk/podcasts/worldservice/globalnews/rss.xml",
    },
    {
        "id": "cnn10",
        "name": "CNN 10",
        "url": "https://feeds.megaphone.fm/WMHY2232473209",
    },
    {
        "id": "npr-world",
        "name": "NPR World",
        "url": "https://feeds.npr.org/1004/rss.xml",
    },
    {
        "id": "guardian-world",
        "name": "The Guardian · World",
        "url": "https://www.theguardian.com/world/rss",
    },
]

HEADERS = {"User-Agent": "catti2-pass/1.0 (feed updater)"}
MAX_ITEMS = 8


def fetch_feed(feed):
    req = urllib.request.Request(feed["url"], headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30, context=ssl.create_default_context()) as resp:
        data = resp.read()
    root = ET.fromstring(data)
    items = []
    for item in root.iter("item"):
        title = (item.findtext("title") or "").strip()
        link = (item.findtext("link") or "").strip()
        if not title:
            continue
        items.append({
            "title": title,
            "link": link,
            "date": (item.findtext("pubDate") or "").strip(),
        })
        if len(items) >= MAX_ITEMS:
            break
    return items


def merge_with_previous(previous, fresh):
    """合并本轮抓取结果与上次成功数据。

    fresh 每项: {id, name, url, ok, fetched_at, items}
    previous  : 上一次的 latest.json（可为 None）
    失败源沿用 previous 中同 id 的整条记录；无历史则 items 置空。
    纯函数，便于单元测试。"""
    prev_map = {f.get("id"): f for f in (previous or {}).get("feeds", [])}
    merged = []
    for f in fresh:
        if f["ok"]:
            merged.append({
                "id": f["id"], "name": f.get("name", f["id"]), "url": f.get("url", ""),
                "items": f["items"], "fetched_at": f["fetched_at"],
            })
        elif f["id"] in prev_map:
            keep = dict(prev_map[f["id"]])
            keep.setdefault("fetched_at", None)
            merged.append(keep)
        else:
            merged.append({
                "id": f["id"], "name": f.get("name", f["id"]), "url": f.get("url", ""),
                "items": [], "fetched_at": None,
            })
    return merged


def main():
    now = datetime.now(timezone.utc).isoformat()
    dest = Path(__file__).resolve().parent.parent / "data" / "latest.json"
    previous = None
    if dest.exists():
        try:
            previous = json.loads(dest.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            previous = None  # 历史文件损坏时按无历史处理，不让本次抓取失败

    fresh = []
    ok = 0
    for feed in FEEDS:
        try:
            items = fetch_feed(feed)
            fresh.append({"id": feed["id"], "name": feed["name"], "url": feed["url"],
                          "ok": True, "fetched_at": now, "items": items})
            ok += 1
            print(f"OK   {feed['name']}")
        except Exception as exc:  # noqa: BLE001
            fresh.append({"id": feed["id"], "name": feed["name"], "url": feed["url"],
                          "ok": False, "fetched_at": now, "items": []})
            print(f"FAIL {feed['name']}: {exc}", file=sys.stderr)

    out = {"updated": now, "feeds": merge_with_previous(previous, fresh)}
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(json.dumps(out, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    kept = sum(1 for f in out["feeds"] if f.get("items"))
    print(f"wrote {dest} ({ok}/{len(FEEDS)} feeds fetched, {kept} feeds with items after merge)")
    if ok == 0 and kept == 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
