# CATTI 二笔二口通关站

目标：**2027 年 6 月一次通过 CATTI 英语二级笔译 + 二级口译（交替传译）**。

- 2026.6 战绩：笔译实务 59 / 口译实务 44 → 本次主攻两科实务。
- 在线访问：https://tanyaqiongcode.github.io/catti2-pass/ （开启 Pages 后）

## 页面

| 页面 | 内容 |
|------|------|
| [index.html](index.html) | 倒计时、成绩差距卡、通关条件、动态摘要 |
| [plan.html](plan.html) | 8 个月三阶段计划（基础/强化/冲刺）+ 每周节奏模板 |
| [exam.html](exam.html) | 题型分值、扣分制评分标准、机考须知、两年滚动规则 |
| [practice.html](practice.html) | 原创模拟题：笔译 4 篇 + 口译 4 段（含参考译文与扣分点）+ 本地真题索引 |
| [terms.html](terms.html) | 热词词条库（244 条，翻卡 + 搜索 + 掌握度记录在 localStorage） |
| [news.html](news.html) | BBC / CNN 10 / NPR / 卫报 RSS 动态（GitHub Actions 每日更新） |
| [resources.html](resources.html) | 官方渠道、训练工具、经验帖精选 |

## 数据管道

- `scripts/update_feeds.py`：抓取公开 RSS → `data/latest.json`（每日 UTC 00:30 由 `.github/workflows/update-feeds.yml` 运行）
- `scripts/build_terms.py`：从本地双语词汇 docx 提取词条 + 合并官方标准译法 → `data/terms.json`（资料更新后重跑）

## 本地预览

```bash
python3 -m http.server 8000
# 打开 http://localhost:8000 （news 页需 http 服务才能读 JSON）
```

## 更新流程

1. 考试日期/报名通知确认后，更新 `index.html` 与 `plan.html` 中的时间节点。
2. 新增词条：改 `scripts/build_terms.py` 的 `EXTRA` 列表（或放新 docx 后重跑）。
3. 真题练完一套，在 `practice.html` 的真题索引表标注进度。
