# Wahrly — TestFlight (build 36 / 1.1.0)

Готовый текст для App Store Connect → TestFlight → **Test Details / What to Test**, плюс скрины.

---

## What to Test (RU) — вставить в TestFlight

```
Wahrly 1.1.0 (build 36) — MVP life assistant

ЧТО ПРОВЕРИТЬ
1) Onboarding / имя / язык (RU или EN).
2) Tasks: создай задачу на сегодня, перенеси на завтра, отметь done.
3) Home → Plan day: разложи задачи по слотам.
4) Open loops: добавь «я должен» и «жду».
5) Settings → Connect with Google: только Calendar (readonly). Почта НЕ читается.
   Если раньше подключал Gmail: Disconnect → Connect заново.
6) Bills: добавь счёт, отметь paid.
7) Dates / Life: важная дата и документ с сроком.
8) News: интересы и лента «вчера».
9) Free vs Pro (Settings → тумблер Pro, демо):
   Free: задачи, календарь, ритуалы, локальный чат.
   Pro: облачный AI, голос, Invest, weekly brief.
10) Invest (Pro): добавь holding — набери «gold» или «bitcoin», выбери из списка, проверь live-цену.
11) Пуши: morning / evening / bills (разрешить уведомления).
12) Виджет «Next task» (опционально).

НЕ БАГ
• Почта / Gmail отсутствуют намеренно (без CASA).
• Иконка в старых пушах может быть старой до перезагрузки iPhone — на Home должна быть бирюзовая W.

ОТЧЁТ
Напиши: устройство + iOS, что ок / что сломано, скрин при баге.
```

---

## What to Test (EN)

```
Wahrly 1.1.0 (build 36) — MVP life assistant

PLEASE TRY
1) Onboarding / name / language.
2) Tasks: create, reschedule, complete.
3) Home → Plan day.
4) Open loops: “I owe” + “Waiting”.
5) Settings → Connect with Google — Calendar readonly only (no mail).
   If you connected Gmail before: Disconnect → Connect again.
6) Bills / Dates / Life / News.
7) Free vs Pro (Settings demo toggle):
   Free = tasks, calendar, rituals, on-device chat.
   Pro = cloud AI, voice, Invest, weekly brief.
8) Invest (Pro): type “gold” or “bitcoin”, pick suggestion, confirm live price.
9) Notifications + optional Home Screen widget.

NOT A BUG
• No email/Gmail by design.
• Stale notification icons: reboot iPhone; Home icon should be teal W.

Feedback: device + iOS + what broke (screenshot helps).
```

---

## Краткое описание приложения (для Test Information / Beta App Description)

**RU:**  
Wahrly — личный ассистент дня: задачи, план дня, календарь (Google readonly), счета, важные даты, новости и AI-чат. Pro открывает облачный AI, голос и портфель Invest (можно ввести «gold» — подтянется цена). Почту не читаем.

**EN:**  
Wahrly is a daily life assistant: tasks, Plan day, Google Calendar (readonly), bills, dates, news, and AI chat. Pro unlocks cloud AI, voice, and Invest (type “gold” for live price). No email access.

---

## Free vs Pro (для тестеров)

| | Free | Pro (демо-тумблер в Settings) |
|--|:----:|:----:|
| Tasks / Bills / Life / Dates / News | ✅ | ✅ |
| Calendar readonly | ✅ | ✅ |
| Open loops, Plan day, morning/evening | ✅ | ✅ |
| Local AI chat | ✅ | ✅ |
| Cloud AI chat | ❌ | ✅ (до ~400/день) |
| Voice | ❌ | ✅ (до ~200/день) |
| Invest + live quotes | ❌ | ✅ |
| Weekly brief | ❌ | ✅ |

---

## Скриншоты

Папка: `docs/testflight-screens/` (и копии в артефактах агента).

Рекомендуемый набор для ASC / заметки тестерам:
1. Home — план дня  
2. Tasks — неделя  
3. Invest — портфель / добавление gold  
4. Settings — Google + Pro  
5. Chat  
6. Bills или Dates  

> Для витрины App Store нужны размеры 6.7" / 6.5" и т.д. Эти скрины — для TestFlight notes и внутренней презентации; при публикации в Store можно переснять с iPhone.
