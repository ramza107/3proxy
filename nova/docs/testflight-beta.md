# Wahrly — TestFlight (build 50 / 1.1.0)

Материалы для App Store Connect → TestFlight: описание, What to Test, Free/Pro, скрины.

---

## Beta App Description (коротко)

**RU**

Wahrly — ассистент дня. Free: задачи, даты и локальный чат. Pro: счета, покупки, Life, новости, Invest, Plan day, утренний/вечерний ритуал, напоминания, виджет, облачный AI и голос. Google Calendar — только чтение. Почту не читаем.

**EN**

Wahrly is a daily life assistant. Free: tasks, dates, and on-device chat. Pro: bills, shopping, Life, news, Invest, Plan day, morning/evening rituals, reminders, widget, cloud AI, and voice. Google Calendar is readonly. No email access.

---

## What to Test (RU) — вставить в TestFlight

```
Wahrly 1.1.0 (build 50) — fix Home tiles + tabs polish

ЧТО ПРОВЕРИТЬ
1) Onboarding / имя / язык — финал на Home (не Plan day).
2) Home: плитки снова с иконкой + подписью (не пустые «таблетки»).
3) Tasks: неделя-рейл читается на mist; создай / перенеси / done; Clear done.
4) Free: Tasks + Dates + локальный чат. Home-плитки Bills / Shopping / Life /
   News / Invest / Evening — Pro lock.
5) Pro unlock (Settings): открой Bills, Shopping (progress bar), News (Open + Refresh
   при ошибке), Life, Invest, Evening Clear.
6) FAB «+» на Bills / Dates / Life / Shopping / Invest — над капсулой табов.
7) Settings → Google: только Calendar readonly. Почта НЕ читается.
8) Chat: чипы на языке UI; поле ввода не под капсулой.
9) Виджет Next task (Pro) — читается на тёмных обоях.

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
Wahrly 1.1.0 (build 50) — fix Home tiles + tabs polish

PLEASE TRY
1) Onboarding → Home (not Plan day).
2) Home: tiles show icon + label again (not empty pills).
3) Tasks: week rail readable on mist; create / reschedule / done; Clear done.
3) Free: Tasks + Dates + on-device chat. Home tiles for Bills / Shopping / Life /
   News / Invest / Evening show Pro lock.
4) Unlock Pro: Bills, Shopping progress bar, News Open + Refresh on error,
   Life, Invest, Evening Clear.
5) “+” FABs clear the capsule tab bar.
6) Settings → Google Calendar readonly only (no mail).
7) Chat chips match UI language; composer clears the capsule.
8) Next-task widget (Pro) readable on dark wallpaper.

NOT A BUG
• Narrow Free tier is intentional.
• No email/Gmail by design.
• Plan day / widget / cloud AI / voice are Pro-only.

Feedback: device + iOS + what broke (screenshot helps).
```

---

## Free vs Pro

Aligned with `lib/pro.ts` (hard split).

| | Free | Pro |
|--|:----:|:----:|
| Tasks | ✅ | ✅ |
| Dates | ✅ | ✅ |
| Local AI chat | ✅ | ✅ |
| Home / Settings | ✅ | ✅ |
| Bills / Shopping / Life / News | ❌ | ✅ |
| Invest + live quotes | ❌ | ✅ |
| Evening Clear | ❌ | ✅ |
| Plan day | ❌ | ✅ |
| Morning / weekly brief | ❌ | ✅ |
| Bill & loop reminders | ❌ | ✅ |
| Home Screen widget | ❌ | ✅ |
| Cloud AI chat | ❌ | ✅ (~400/day) |
| Voice | ❌ | ✅ (~200/day) |
| Google Calendar readonly | ✅ | ✅ |

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

1. Дождись статуса **Testing** у build 49 (не только Processing / Ready to Submit)
2. **Test Details** → *What to Test* → вставь блок RU или EN выше
3. Добавь группы (**TE** / **OP**) — без этого Update на телефоне не появится
4. Скрины из `testflight-screens/` можно приложить в письмо тестерам или во внутренний Notion/Telegram
