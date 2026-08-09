#!/usr/bin/env python3
"""Generate full 15–20 minute paid course JSON files (Ukrainian)."""

from __future__ import annotations

import json
import copy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "courses"
SEED_DIR = Path(__file__).resolve().parent / "course_seeds"
KIDS_SRC_CANDIDATES = [
    Path("/tmp/kids_days.json"),
    Path(__file__).resolve().parent / "course_seeds" / "kids.json",
]


def write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def finalize_day(*, day, title, reading, scripture, lesson, questions, schedule, prayer, minutes=18, quiz=None):
    lesson = [p.strip() for p in lesson if p and str(p).strip()]
    if len(lesson) < 5:
        raise ValueError(f"Day {day} «{title}»: need >=5 lesson paragraphs, got {len(lesson)}")
    lesson = lesson[:7]
    questions = [q.strip() for q in questions if q and str(q).strip()][:3]
    while len(questions) < 3:
        questions.append("Що Господь кличе змінити у твоєму дні після цього заняття?")
    schedule = {
        "morning": schedule["morning"].strip(),
        "midday": schedule["midday"].strip(),
        "evening": schedule["evening"].strip(),
    }
    out = {
        "day": day,
        "title": title,
        "reading": reading,
        "scripture": scripture.strip(),
        "minutes": minutes,
        "lesson": lesson,
        "questions": questions,
        "schedule": schedule,
        "practice": schedule["evening"],
        "reflect": questions[0],
        "prayer": prayer.strip(),
        "story": list(lesson),
    }
    if quiz:
        out["quiz"] = quiz
    if len(json.dumps(out, ensure_ascii=False)) < 1500 and len(lesson) < 7:
        lesson.append(
            f"Не спіши сьогоднішнє заняття. Прочитай уривок {reading} ще раз повільно, "
            f"познач одну фразу для серця і носи її до вечора. Мета — зустріч із Богом, не галочка."
        )
        out["lesson"] = lesson
        out["story"] = list(lesson)
    return out


def enrich_kids_day(raw: dict) -> dict:
    d = copy.deepcopy(raw)
    title = d["title"]
    reading = d["reading"]
    prayer = (d.get("prayer") or "").strip()
    if prayer.count(".") + prayer.count("!") + prayer.count("?") < 2:
        prayer = (
            f"{prayer.rstrip('.!')}. Господи, навчи мене жити цією історією не лише словами, "
            f"але добрим серцем і вчинками. Будь зі мною вранці, вдень і ввечері. Амінь."
        )
    questions = d.get("questions") or []
    themed = [
        f"Що в історії «{title}» найбільше здивувало тебе про Бога?",
        f"Який один маленький крок із читання {reading} ти зробиш сьогодні?",
        f"Кому і як ти можеш переказати історію «{title}» своїми словами?",
    ]
    if len(set(questions)) < 2:
        questions = themed
    schedule = d.get("schedule") or {
        "morning": f"Ранок (3–5 хв): прочитай {reading} і коротку молитву дня.",
        "midday": "День (2–4 хв): згадай історію й зроби одну конкретну добру справу.",
        "evening": "Вечір (5–7 хв): перекажи історію, відповіси на питання, подякуй за день.",
    }
    lesson = list(d.get("lesson") or d.get("story") or [])
    expanded = []
    for i, p in enumerate(lesson):
        p = str(p).strip()
        if len(p) < 90 and i not in (0, len(lesson) - 1):
            p += (
                " Зупинись і уяви сцену: кого ти бачиш, що чуєш, що відчуваєш. "
                "Попроси Бога показати, як ця правда стосується твого дня."
            )
        expanded.append(p)
    while len(expanded) < 5:
        expanded.append(
            f"Повернись ще раз до читання {reading}. Повтори вголос головну думку дня "
            f"і скажи Богові одне речення подяки."
        )
    return finalize_day(
        day=int(d["day"]),
        title=title,
        reading=reading,
        scripture=d.get("scripture") or f"Читання дня: {reading}.",
        lesson=expanded,
        questions=questions,
        schedule=schedule,
        prayer=prayer,
        minutes=int(d.get("minutes") or 18),
        quiz=d.get("quiz"),
    )


def load_kids_days():
    src = next((p for p in KIDS_SRC_CANDIDATES if p.exists()), None)
    if src is None:
        raise SystemExit("Missing kids source: tried " + ", ".join(str(p) for p in KIDS_SRC_CANDIDATES))
    raw = json.loads(src.read_text(encoding="utf-8"))
    return [enrich_kids_day(x) for x in raw]


def paras_from_seed(seed, course_label, total_days):
    day = seed["day"]
    title = seed["title"]
    reading = seed["reading"]
    focus = seed["focus"]
    scene = seed["scene"]
    teach = seed["teach"]
    warn = seed["warn"]
    practice_hint = seed["practice_hint"]
    bridge = seed.get(
        "bridge",
        "Слово Боже хоче дійти не лише до розуму, а до рук, очей і тону голосу.",
    )
    return [
        (
            f"День {day} з {total_days} курсу «{course_label}». Тема: {title}. "
            f"Сьогоднішне читання — {reading}. Відведи на заняття близько 15–20 хвилин: "
            f"повільне читання Писання, роздум, коротка практика вранці й удень і підсумок увечері. "
            f"Не поспішай «відмітити галочку» — краще менше тексту, але з увагою серця."
        ),
        (
            f"{scene} Уяви себе всередині цього уривка: що ти бачиш, що чуєш, де напруга, де надія. "
            f"Біблія рідко дає абстрактні гасла — вона показує живих людей перед живим Богом."
        ),
        (
            f"Головний акцент дня: {focus} {teach} "
            f"Спробуй сказати цю правду своїми словами в одному реченні — так вона краще затримається в памʼяті тіла."
        ),
        (
            f"{bridge} Зверни увагу й на попередження: {warn} "
            f"Чесна молитва включає і світло, і тінь — не лише те, що приємно визнати перед собою."
        ),
        (
            f"Практика сьогодні повʼязана з темою «{title}»: {practice_hint}. "
            f"Зроби це конкретно у реальному місці свого дня — на кухні, в дорозі, у розмові, біля ікони "
            f"чи просто з закритими очима на хвилину тиші серед справ."
        ),
        (
            f"На завершення ще раз відкрий {reading}. Прочитай уголос хоча б кілька віршів. "
            f"Вибери одне слово або коротку фразу як «якір» дня і повертайся до нього, "
            f"коли думки розбігатимуться. Нехай це заняття стане зустріччю, а не лише інформацією."
        ),
    ]


def day_from_seed(seed, *, course_label, total_days, minutes=18):
    return finalize_day(
        day=seed["day"],
        title=seed["title"],
        reading=seed["reading"],
        scripture=seed["scripture"],
        lesson=paras_from_seed(seed, course_label, total_days),
        questions=seed["questions"],
        schedule=seed["schedule"],
        prayer=seed["prayer"],
        minutes=minutes,
    )


def load_seeds(name: str):
    path = SEED_DIR / f"{name}.json"
    return json.loads(path.read_text(encoding="utf-8"))


INDEX = {
    "title": "Платні курси",
    "description": "Місячні програми з повним заняттям на кожен день (15–20 хв): діти, молитва, родина, піст, Євангеліє.",
    "courses": [
        {
            "id": "kids-bible-30",
            "title": "Дитяча Академія Віри",
            "subtitle": "30 днів біблійних історій для дітей 6–12 років",
            "audience": "Діти 6–12 (з батьками)",
            "daysCount": 30,
            "priceUah": 349,
            "previewDays": 3,
            "color": "#c4a35a",
            "description": "Щодня — повноцінне заняття 15–20 хв: історія, вірш, роздум, розклад дня, практика, молитва й міні-квіз.",
            "includes": [
                "30 щоденних занять по 15–20 хв",
                "Прості пояснення мовою дитини",
                "Розклад: ранок / день / вечір",
                "Міні-квіз",
                "Молитва в кінці",
            ],
        },
        {
            "id": "prayer-30",
            "title": "30 днів молитви",
            "subtitle": "Особисте молитовне правило на місяць",
            "audience": "Дорослі та підлітки 14+",
            "daysCount": 30,
            "priceUah": 249,
            "previewDays": 3,
            "color": "#5a7a6a",
            "description": "Глибокий місяць молитви: Отче наш, псалми, Ісусова молитва, заступництво, тиша й особисте правило.",
            "includes": [
                "30 повних занять 15–20 хв",
                "Уривки Святого Письма",
                "Практика на весь день",
                "Готові тексти молитов",
                "Підсумок місяця — особисте правило",
            ],
        },
        {
            "id": "family-30",
            "title": "Християнська родина: 30 днів",
            "subtitle": "Щоденні практики для батьків і дітей",
            "audience": "Батьки, хресні, сімʼї",
            "daysCount": 30,
            "priceUah": 299,
            "previewDays": 3,
            "color": "#8a5a44",
            "description": "Сімейний курс духовних практик: молитва дому, дисципліна в любові, стіл, неділя, прощення й завіт родини.",
            "includes": [
                "30 сімейних занять 15–20 хв",
                "Теми спілкування й дисципліни",
                "Розклад практик на день",
                "Молитва за дім",
                "Підсумок «завіт родини»",
            ],
        },
        {
            "id": "lent-40",
            "title": "Великий піст: 40 днів",
            "subtitle": "Щоденний супровід посту до Пасхи",
            "audience": "Дорослі та старші підлітки",
            "daysCount": 40,
            "priceUah": 229,
            "previewDays": 3,
            "color": "#4a5a6a",
            "description": "40 повних занять посту: молитва, милостиня, стриманість, сповідь, Страсний тиждень і Пасха.",
            "includes": [
                "40 щоденних роздумів 15–20 хв",
                "Акцент на молитві, милостині, стриманості",
                "Підготовка до сповіді й Причастя",
                "Страсний тиждень і Пасха",
                "Завіт після посту",
            ],
        },
        {
            "id": "mark-28",
            "title": "Євангеліє від Марка за 28 днів",
            "subtitle": "Щоденне читання з повним роздумом",
            "audience": "Усі, хто хоче системно читати Євангеліє",
            "daysCount": 28,
            "priceUah": 199,
            "previewDays": 3,
            "color": "#3d5a4c",
            "description": "За 28 днів — усе Євангеліє від Марка: план по розділах, роздум, питання, практика на день і молитва.",
            "includes": [
                "28 днів читання всього Марка",
                "План по розділах",
                "Питання для роздуму",
                "Щоденна практика ранок/день/вечір",
                "Підсумковий огляд і місія",
            ],
        },
    ],
}


COURSE_META = {c["id"]: c for c in INDEX["courses"]}


def build_course(course_id: str, days: list[dict]) -> dict:
    meta = dict(COURSE_META[course_id])
    meta["days"] = days
    return meta


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    kids_days = load_kids_days()
    prayer_days = [
        day_from_seed(s, course_label="30 днів молитви", total_days=30)
        for s in load_seeds("prayer")
    ]
    family_days = [
        day_from_seed(s, course_label="Християнська родина: 30 днів", total_days=30)
        for s in load_seeds("family")
    ]
    lent_days = [
        day_from_seed(s, course_label="Великий піст: 40 днів", total_days=40)
        for s in load_seeds("lent")
    ]
    mark_days = [
        day_from_seed(s, course_label="Євангеліє від Марка за 28 днів", total_days=28)
        for s in load_seeds("mark")
    ]

    courses = {
        "kids-bible-30": build_course("kids-bible-30", kids_days),
        "prayer-30": build_course("prayer-30", prayer_days),
        "family-30": build_course("family-30", family_days),
        "lent-40": build_course("lent-40", lent_days),
        "mark-28": build_course("mark-28", mark_days),
    }

    write_json(OUT / "index.json", INDEX)
    for cid, data in courses.items():
        write_json(OUT / f"{cid}.json", data)
        d0 = data["days"][0]
        print(
            f"wrote {cid}.json days={len(data['days'])} "
            f"day1_chars={len(json.dumps(d0, ensure_ascii=False))} "
            f"lesson={len(d0['lesson'])}"
        )


if __name__ == "__main__":
    main()
