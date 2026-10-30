#!/usr/bin/env python3
"""从本地双语词汇 docx 提取词条，合并人工整理的官方标准译法，生成 data/terms.json。

护栏（防止误覆写线上词表）：
  1. 必需源文件缺失 → 报错退出，不写任何文件；
  2. 新词表条数比现有 data/terms.json 下降超过 20% → 拒绝写入（疑似提取异常）；
  3. 单条词条 zh/en 非空、去重。
docx 路径按 2026-10 的本地资料库布局；资料更新后重跑。"""
import json
import re
import sys
import zipfile
from pathlib import Path

CATTI_DIR = Path.home() / "Desktop/学习/CATTI"
OUT = Path(__file__).resolve().parent.parent / "data" / "terms.json"
MIN_SHRINK_RATIO = 0.8  # 新条数 < 现有条数×0.8 时拒绝写入

# 人工补充：2026–2027 高频官方标准译法（白皮书/政报/联合国文件常用表述）
EXTRA = [
    # 十五五 · 宏观
    ("高质量发展", "high-quality development", "经济与开放"),
    ("“十五五”规划", "the 15th Five-Year Plan (2026–2030)", "十五五与时政"),
    ("基本实现社会主义现代化", "basically realize socialist modernization", "十五五与时政"),
    ("扩大内需", "expand domestic demand", "经济与开放"),
    ("建设全国统一大市场", "build a unified national market", "经济与开放"),
    ("扎实推进共同富裕", "solidly promote common prosperity", "经济与开放"),
    ("民营经济", "the private economy / private sector", "经济与开放"),
    ("外资企业", "foreign-invested enterprises", "经济与开放"),
    ("自由贸易试验区", "pilot free trade zones", "经济与开放"),
    ("零基预算改革", "zero-based budgeting reform", "经济与开放"),
    # 新质生产力 · 科技
    ("新质生产力", "new quality productive forces", "科技与民生"),
    ("“人工智能+”行动", "the AI Plus initiative", "科技与民生"),
    ("具身智能", "embodied AI / embodied intelligence", "科技与民生"),
    ("低空经济", "the low-altitude economy", "科技与民生"),
    ("银发经济", "the silver economy", "科技与民生"),
    ("首发经济", "the debut economy", "科技与民生"),
    ("生物制造", "biomanufacturing", "科技与民生"),
    ("量子科技", "quantum science and technology", "科技与民生"),
    ("数字经济", "the digital economy", "科技与民生"),
    ("实体经济", "the real economy", "科技与民生"),
    ("载人航天", "human spaceflight", "科技与民生"),
    ("数字经济核心产业", "core industries of the digital economy", "科技与民生"),
    # 双碳 · 生态（白皮书《碳达峰碳中和的中国行动》）
    ("碳达峰碳中和", "carbon peaking and carbon neutrality", "双碳与生态"),
    ("能源绿色低碳转型", "green and low-carbon energy transition", "双碳与生态"),
    ("新型能源体系", "a new-type energy system", "双碳与生态"),
    ("全国碳排放权交易市场", "the national carbon market", "双碳与生态"),
    ("生态系统碳汇", "ecosystem carbon sinks", "双碳与生态"),
    ("绿色低碳产业", "green and low-carbon industries", "双碳与生态"),
    ("气候适应型社会", "a climate-resilient society", "双碳与生态"),
    ("全球气候治理", "global climate governance", "双碳与生态"),
    ("人与自然和谐共生", "harmony between humanity and nature", "双碳与生态"),
    ("美丽中国", "a Beautiful China", "双碳与生态"),
    # 外交 · 国际
    ("人类命运共同体", "a community with a shared future for mankind", "外交与国际"),
    ("全球发展倡议", "the Global Development Initiative", "外交与国际"),
    ("全球安全倡议", "the Global Security Initiative", "外交与国际"),
    ("多边主义", "multilateralism", "外交与国际"),
    ("互利共赢", "mutual benefit and win-win outcomes", "外交与国际"),
    ("共建“一带一路”", "the Belt and Road Initiative", "外交与国际"),
    ("文明交流互鉴", "exchanges and mutual learning among civilizations", "外交与国际"),
    ("新型国际关系", "a new type of international relations", "外交与国际"),
]

# 必需源：任何缺失都停止构建（词表是站内数据，残缺版本不如不写）
REQUIRED_SOURCES = [
    ("中国日报网双语热词6月汇总.docx", "政报热词 2026.6"),
    ("口译末考词汇打印版260106.docx", "时政表述·口译高频"),
]


def docx_lines(path: Path):
    with zipfile.ZipFile(path) as z:
        xml = z.read("word/document.xml").decode("utf-8")
    xml = re.sub(r"<w:p [^>]*>|<w:p>", "\n", xml)
    text = re.sub(r"\n{2,}", "\n", re.sub(r"<[^>]+>", "", xml))
    return [l.strip() for l in text.split("\n") if l.strip()]


def pairs(lines):
    """中英逐行交替 → [(zh, en)]；跳过孤立行。"""
    out = []
    i = 0
    while i + 1 < len(lines):
        zh, en = lines[i], lines[i + 1]
        if re.search(r"[\u4e00-\u9fff]", zh) and not re.search(r"[\u4e00-\u9fff]", en):
            out.append((zh, en))
            i += 2
        else:
            i += 1
    return out


def main():
    missing = [(f, cat) for f, cat in REQUIRED_SOURCES if not (CATTI_DIR / f).exists()]
    if missing:
        for f, _ in missing:
            print(f"ERROR 缺少必需源文件: {CATTI_DIR / f}", file=sys.stderr)
        print("构建已停止：不生成残缺词表。请在装有 CATTI 资料库的机器上运行，或修正 REQUIRED_SOURCES。", file=sys.stderr)
        sys.exit(2)

    terms, seen = [], set()

    for fname, cat in REQUIRED_SOURCES:
        path = CATTI_DIR / fname
        lines = docx_lines(path)
        if lines and lines[0] == "中文":
            lines = lines[1:]
        got = pairs(lines)
        if len(got) < 10:
            print(f"ERROR {fname} 仅解析出 {len(got)} 对词条（<10），疑似文件损坏或格式变化", file=sys.stderr)
            sys.exit(2)
        for zh, en in got:
            if zh not in seen:
                seen.add(zh)
                terms.append({"zh": zh, "en": en, "cat": cat, "src": fname[:-5] if fname.endswith(".docx") else fname})

    for zh, en, cat in EXTRA:
        if zh not in seen:
            seen.add(zh)
            terms.append({"zh": zh, "en": en, "cat": cat, "src": "官方标准译法整理"})

    terms = [t for t in terms if t["zh"].strip() and t["en"].strip()]

    # 条数护栏：与现有词表对比，骤降视为提取异常
    old_count = None
    if OUT.exists():
        try:
            old_count = len(json.loads(OUT.read_text(encoding="utf-8")).get("terms", []))
        except (json.JSONDecodeError, OSError):
            old_count = None
    if old_count is not None and len(terms) < old_count * MIN_SHRINK_RATIO:
        print(
            f"ERROR 新词表 {len(terms)} 条 < 现有 {old_count} 条的 {int(MIN_SHRINK_RATIO * 100)}%，疑似提取异常，已拒绝写入。",
            file=sys.stderr,
        )
        sys.exit(3)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps({"updated": "2026-10-30", "count": len(terms), "terms": terms}, ensure_ascii=False, indent=1) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {OUT} with {len(terms)} terms (previous: {old_count if old_count is not None else 'n/a'})")


if __name__ == "__main__":
    main()
