# Wahrly — TestFlight (build 52 / 1.1.0)

Материалы для App Store Connect → TestFlight: описание, What to Test, Free/Pro, скрины.

Aligned with `lib/pro.ts` and `docs/unit-economics.md`.

---

## Beta App Description (коротко)

**RU**

Wahrly — ассистент дня. Free: задачи, даты и локальный чат. Pro: счета, покупки, Life, новости, Invest, Plan day, утренний/вечерний ритуал, напоминания, виджет, облачный AI и голос. Google Calendar — только чтение. Почту не читаем.

**EN**

Wahrly is a daily life assistant. Free: tasks, dates, and on-device chat. Pro: bills, shopping, Life, news, Invest, Plan day, morning/evening rituals, reminders, widget, cloud AI, and voice. Google Calendar is readonly. No email access.

---

## What to Test (RU) — вставить в TestFlight

```
Wahrly 1.1.0 (build 52) — UX pass-fix: Tasks actions, Pro gates, Settings gear, FAB inset

ЧТО ПРОВЕРИТЬ
1) Onboarding → Home. Язык EN-only (переключателя нет).
2) Home tiles + Settings gear в табах (не swirl как у Chat).
3) Free: Tasks + Dates + local chat; Pro locks на Bills/Shopping/Life/News/Invest/Evening.
4) Tasks: нет ложного Overdue на «сегодня»; одна кнопка Tomorrow или +1 day.
5) Settings: Evening Clear / Weekly Show now — Pro gate.
6) FAB «+» + Chat — списки не уходят под кнопки.
7) Google Calendar readonly (без Gmail).
8) Виджет Next task (Pro).

НЕ БАГ
• Free узкий намеренно (Tasks / Dates / local chat).
• Почта / Gmail отсутствуют (без CASA).
• Plan day / виджет / cloud AI / голос — только Pro.

ОТЧЁТ
Устройство + iOS, что ок / что сломано, скрин при баге.
```

---

## What to Test (EN)

```
Wahrly 1.1.0 (build 52) — UX pass-fix: Tasks actions, Pro gates, Settings gear, FAB inset

PLEASE TRY
1) Onboarding → Home. English-only UI (no language picker).
2) Home tiles + Settings gear in tab bar (not Chat swirl).
3) Free: Tasks + Dates + local chat; Pro locks on Bills/Shopping/Life/News/Invest/Evening.
4) Tasks: no false Overdue on today; one action — Tomorrow or +1 day.
5) Settings: Evening Clear / Weekly Show now — Pro only.
6) FAB “+” + Chat — lists clear the buttons.
7) Google Calendar readonly (no mail).
8) Next-task widget (Pro).

NOT A BUG
• Narrow Free tier is intentional.
• No email/Gmail by design.
• Plan day / widget / cloud AI / voice are Pro-only.

Feedback: device + iOS + what broke (screenshot helps).
```

---

## Free vs Pro

| | Free | Pro |
|--|:----:|:----:|
| Tasks | ✅ | ✅ |
| Dates | ✅ | ✅ |
| Local AI chat | ✅ | ✅ |
| Home / Settings | ✅ | ✅ |
| Google Calendar readonly | ✅ | ✅ |
| Bills / Shopping / Life / News | ❌ | ✅ |
| Invest + live quotes | ❌ | ✅ |
| Evening Clear | ❌ | ✅ |
| Plan day | ❌ | ✅ |
| Morning / weekly brief | ❌ | ✅ |
| Bill & loop reminders | ❌ | ✅ |
| Home Screen widget | ❌ | ✅ |
| Cloud AI chat | ❌ | ✅ (~400/day) |
| Voice | ❌ | ✅ (~200/day) |

Primary tabs: **Tasks · Home · Settings**. Other spaces open from Home → Menu.

---

## Скриншоты (iPhone viewport)

Сняты с веб-демо (Pages), для TestFlight notes и внутренней презентации. Для витрины App Store лучше переснять с реального iPhone (6.7").

| # | Экран | Файл |
|---|--------|------|
| 1 | Home | [01-home.png](./testflight-screens/01-home.png) |
| 2 | Tasks | [02-tasks.png](./testflight-screens/02-tasks.png) |
| 3 | Invest (Pro gate) | [03-invest.png](./testflight-screens/03-invest.png) |
| 4 | Settings (Pro + языки + Google) | [04-settings.png](./testflight-screens/04-settings.png) |
| 5 | Chat | [05-chat.png](./testflight-screens/05-chat.png) |
| 6 | Bills | [06-bills.png](./testflight-screens/06-bills.png) |

![Home](./testflight-screens/01-home.png)

![Tasks](./testflight-screens/02-tasks.png)

![Invest](./testflight-screens/03-invest.png)

![Settings](./testflight-screens/04-settings.png)

![Chat](./testflight-screens/05-chat.png)

![Bills](./testflight-screens/06-bills.png)

---

## App Store Connect checklist

1. Дождись статуса **Testing** у build **52** (не только Processing / Ready to Submit)
2. **Test Details** → *What to Test* → вставь блок RU или EN выше
3. Добавь группы (**TE** / **OP**) — без этого Update на телефоне не появится
4. Скрины из `testflight-screens/` можно приложить в письмо тестерам
