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
| [terms.html](terms.html) | 热词词条库（244 条，翻卡 + 搜索 + 「已掌握」标记存 localStorage + 导出未掌握清单） |
| [news.html](news.html) | BBC / CNN 10 / NPR / 卫报 RSS 动态（GitHub Actions 每日更新） |
| [resources.html](resources.html) | 官方渠道、训练工具、经验帖精选 |

## 数据管道

- `scripts/update_feeds.py`：抓取公开 RSS → `data/latest.json`（每日 UTC 00:30 由 `.github/workflows/update-feeds.yml` 运行）
- `scripts/build_terms.py`：从本地双语词汇 docx 提取词条 + 合并官方标准译法 → `data/terms.json`（资料更新后重跑）
  - **护栏**：必需源文件缺失即报错停止（exit 2），不写残缺词表；新条数比现有词表下降超 20% 拒绝写入（exit 3）
  - 词条按 `src` 字段标注来源；页面底部附来源链接（中国日报英语点津 / 中国关键词 / 国新办）
- `scripts/validate_data.py`：CI 数据校验（条数下限 200、字段完整、无重复、latest.json 结构）

## 测试与 CI

- `node scripts/test_storage.js`：学习记录存取单元测试（9 个用例：正常读写、损坏 JSON、非数组、混合类型、超上限、存储不可用等）
- `.github/workflows/ci.yml`：push/PR 时跑存储单元测试、JS 语法检查、数据校验、以及「缺源时构建必须停止」的护栏验证
- 词条页已做浏览器实测：244 卡片/244 标记按钮、翻面标记、刷新持久化、筛选、损坏存储自愈提示、导出下载

## 本地预览

```bash
python3 -m http.server 8000
# 打开 http://localhost:8000 （news 页需 http 服务才能读 JSON）
```

## 更新流程

1. 考试日期/报名通知确认后，更新 `index.html` 与 `plan.html` 中的时间节点。
2. 新增词条：改 `scripts/build_terms.py` 的 `EXTRA` 列表（或放新 docx 到 REQUIRED_SOURCES 后重跑）。
3. 真题练完一套，在 `practice.html` 的真题索引表标注进度。
4. 改 `assets/storage.js` 的存取逻辑后，先跑 `node scripts/test_storage.js`。
