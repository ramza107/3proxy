#!/usr/bin/env python3
"""Refresh public/canons/*.json from blagovist.info Ukrainian tabs."""

from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

from bs4 import BeautifulSoup, NavigableString

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "canons"

ITEMS = [
    ("kanon-pokaiannyy-hospodu-nashomu-iisusu-khrystu", "Канон покаянний до Господа нашого Ісуса Христа", "canon"),
    ("kanon-molebnyy-do-presviatoi-bohorodytsi", "Канон молебний до Пресвятої Богородиці", "canon"),
    ("kanon-anhelu-khranyteliu", "Канон Ангелу Охоронцю", "canon"),
    ("kanon-sviatyteliu-mykolaiu-chudotvortsiu", "Канон святителю Миколаю Чудотворцю", "canon"),
    ("kanon-usim-sviatym", "Канон усім святим", "canon"),
    ("kanon-za-spochylykh", "Канон за спочилих", "canon"),
    ("kanon-voskresinnia-khrystovoho-paskhy", "Канон Воскресіння Христового (Пасхи)", "canon"),
    ("pravylo-do-prychastia", "Послідування (правило) до Святого Причастя", "rule"),
    ("podiachni-molytvy-pislia-sviatoho-prychastia", "Подячні молитви після Святого Причастя", "rule"),
    ("molytvy-ranishni", "Ранкові молитви", "prayer"),
    ("molytvy-vechirni", "Вечірні молитви", "prayer"),
    ("otche-nash", "Отче наш", "prayer"),
    ("iisusova-molytva", "Ісусова молитва", "prayer"),
    ("tsariu-nebesnyy", "Царю Небесний", "prayer"),
    ("bohorodytse-divo-raduysia", "Богородице Діво, радуйся", "prayer"),
    ("symvol-viry", "Символ віри", "prayer"),
    ("molytva-za-voiniv", "Молитва за воїнів", "prayer"),
    ("chasy-paskhalni", "Пасхальні часи", "prayer"),
    ("chyn-spivu-12-ty-psalmiv", "Чин співу 12-ти псалмів", "prayer"),
]

GREAT_DAYS = [
    ("velykyy-kanon-ponedilok", "Великий канон Андрія Критського — понеділок",
     "https://blagovist.info/molytvoslov/velykyy-pokaiannyy-kanon-transliteratsiia/ponedilok"),
    ("velykyy-kanon-vivtorok", "Великий канон Андрія Критського — вівторок",
     "https://blagovist.info/molytvoslov/velykyy-pokaiannyy-kanon-transliteratsiia/vivtorok"),
    ("velykyy-kanon-sereda", "Великий канон Андрія Критського — середа",
     "https://blagovist.info/molytvoslov/velykyy-pokaiannyy-kanon-transliteratsiia/sereda"),
    ("velykyy-kanon-chetver", "Великий канон Андрія Критського — четвер",
     "https://blagovist.info/molytvoslov/velykyy-pokaiannyy-kanon-transliteratsiia/chetver"),
    ("velykyy-kanon-mariine-stoiannia", "Великий канон — Маріїне стояння",
     "https://blagovist.info/molytvoslov/velykyy-pokaiannyy-kanon-transliteratsiia/mariine-stoiannia"),
]


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=45) as res:
        return res.read().decode("utf-8", "ignore")


def fix_dropcaps(root) -> None:
    for span in list(root.find_all("span")):
        t = span.get_text(strip=True)
        if len(t) != 1 or not t.isalpha():
            continue
        nxt = span.next_sibling
        if isinstance(nxt, NavigableString):
            span.replace_with(t + str(nxt))
            nxt.extract()
        else:
            span.replace_with(t)


def pane_text(pane) -> str:
    clone = BeautifulSoup(str(pane), "html.parser")
    for bad in clone.find_all(["script", "style", "iframe", "video"]):
        bad.decompose()
    fix_dropcaps(clone)
    content = clone.select_one(".su-tabs-pane") or clone
    blocks = []
    for el in content.find_all(["h1", "h2", "h3", "h4", "p", "li"]):
        txt = re.sub(r"\s+", " ", el.get_text(" ", strip=True)).strip()
        if txt:
            blocks.append(txt)
    if len(blocks) >= 2:
        return "\n\n".join(blocks)
    text = content.get_text("\n", strip=True)
    text = re.sub(r"([А-ЯІЇЄҐA-Z])\n([а-яіїєґa-z])", r"\1\2", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


def classify_label(label: str) -> str:
    l = label or ""
    if "Відео" in l or "грецьк" in l.lower():
        return "skip"
    if "Україн" in l:
        return "uk"
    if "Трансліт" in l or "Граждан" in l or "Київськ" in l:
        return "translit"
    if "слов" in l.lower():
        return "cs"
    return "other"


def pick_best(soup):
    cands = []
    for pane in soup.select(".su-tabs-pane"):
        label = pane.get("data-title") or ""
        kind = classify_label(label)
        if kind == "skip":
            continue
        body = pane_text(pane)
        cands.append((kind, len(body), body))
    if not cands:
        pc = soup.select_one(".post-content")
        if not pc:
            return None, None
        fix_dropcaps(pc)
        blocks = []
        for el in pc.find_all(["h1", "h2", "h3", "h4", "p", "li"]):
            txt = re.sub(r"\s+", " ", el.get_text(" ", strip=True)).strip()
            if txt:
                blocks.append(txt)
        return ("\n\n".join(blocks) if blocks else pc.get_text("\n", strip=True)), "mixed"

    def best_of(kind):
        items = [c for c in cands if c[0] == kind]
        return max(items, key=lambda x: x[1]) if items else None

    uk = best_of("uk")
    if uk and uk[1] >= 150:
        return uk[2], "uk"
    translit = best_of("translit")
    if translit and translit[1] >= 80:
        return translit[2], "uk-translit"
    best = max(cands, key=lambda x: x[1])
    return best[2], best[0]


def save_doc(slug, title, category, url, body, language):
    paras = [p.strip() for p in re.split(r"\n\s*\n", body) if p.strip()]
    if len(paras) < 3:
        paras = [p.strip() for p in body.split("\n") if p.strip()]
    doc = {
        "id": slug,
        "title": title,
        "category": category,
        "source": "Благовіст (blagovist.info)",
        "sourceUrl": url,
        "language": language,
        "body": body,
        "paragraphs": paras,
        "chars": len(body),
    }
    (OUT / f"{slug}.json").write_text(json.dumps(doc, ensure_ascii=False, indent=2), encoding="utf-8")
    return {
        "id": slug,
        "title": title,
        "category": category,
        "source": doc["source"],
        "sourceUrl": url,
        "language": language,
        "chars": len(body),
    }


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    results = []
    for slug, title, category in ITEMS:
        url = f"https://blagovist.info/molytvoslov/{slug}"
        soup = BeautifulSoup(fetch(url), "html.parser")
        body, lang = pick_best(soup)
        if not body or len(body) < 40:
            print("EMPTY", slug)
            continue
        print(f"{slug}: {lang} {len(body)}")
        results.append(save_doc(slug, title, category, url, body, lang or "uk"))

    for slug, title, url in GREAT_DAYS:
        soup = BeautifulSoup(fetch(url), "html.parser")
        body, lang = pick_best(soup)
        if not body or len(body) < 100:
            print("EMPTY", slug)
            continue
        print(f"{slug}: {len(body)}")
        results.append(save_doc(slug, title, "canon", url, body, "uk-translit"))

    order = {"canon": 0, "rule": 1, "prayer": 2}
    results.sort(key=lambda x: (order.get(x["category"], 9), x["title"]))
    index = {
        "title": "Канони та молитовні правила",
        "description": "Повні тексти канонів, правила до Причастя, ранкові й вечірні молитви.",
        "attribution": "Тексти зібрано з відкритих публікацій на blagovist.info. Для парафіяльного вжитку звіряйте з благословенним молитвословом вашої Церкви.",
        "items": results,
    }
    (OUT / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8")
    print("TOTAL", len(results))


if __name__ == "__main__":
    main()
