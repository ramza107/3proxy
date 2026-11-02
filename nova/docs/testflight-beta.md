# Wahrly — TestFlight (1.1.0 / post–#184 polish)

Материалы для App Store Connect → TestFlight: описание, What to Test, Free/Pro, скрины.

Aligned with `lib/pro.ts` and `docs/app-store-listing.md`.

---

## Beta App Description (коротко)

**EN**

Wahrly is a daily life assistant. Free: tasks, dates, and on-device chat. Pro: bills, shopping, Life, news, Invest, Plan day, morning/evening rituals, reminders, widget, cloud AI, and voice. Google Calendar is readonly. No email access.

**RU**

Wahrly — ассистент дня. Free: задачи, даты и локальный чат. Pro: счета, покупки, Life, новости, Invest, Plan day, утренний/вечерний ритуал, напоминания, виджет, облачный AI и голос. Google Calendar — только чтение. Почту не читаем.

---

## What to Test (EN) — paste into TestFlight

```
Wahrly 1.1.0 — mist polish + honest Free/Pro Settings

PLEASE TRY
1) Onboarding → first task → Home/Tasks. Copy should say Free = Tasks/Dates/chat.
2) Home + Tasks mist language; Dates / Bills / Shopping / Chat match (soft hero, frosted panels).
3) Free: Tasks + Dates + on-device chat. Bills / Shopping / Life / News / Invest / Evening → Pro lock.
4) Settings as Free: morning/evening/bill ritual bodies dimmed; time/weather/lead chips don’t edit.
5) Tasks: week rail, create on a weekday, confirm-before-done sheet, Clear done.
6) Chat empty state chips create tasks; Done returns to Tasks.
7) Unlock Pro: Bills due/paid mist panels, Shopping composer + aisles.
8) Settings → Google Calendar readonly only (no mail).
9) Next-task widget (Pro) readable on dark wallpaper.

NOT A BUG
• Narrow Free tier is intentional.
• No email/Gmail by design.
• Plan day / widget / cloud AI / voice are Pro-only.
• Ritual “Show now” / open Evening require Pro.

Feedback: device + iOS + what broke (screenshot helps).
```

---

## What to Test (RU)

```
Wahrly 1.1.0 — mist + честный Free/Pro в Settings

ЧТО ПРОВЕРИТЬ
1) Onboarding → первая задача → Home/Tasks. Free = Tasks/Dates/чат.
2) Home + Tasks mist; Dates / Bills / Shopping / Chat в том же языке.
3) Free: Tasks + Dates + локальный чат. Остальные плитки — Pro lock.
4) Settings Free: тела ритуалов затемнены, время/город/lead не правятся.
5) Tasks: неделя, add на день, confirm-before-done, Clear done.
6) Chat chips → задачи; Done → Tasks.
7) Pro: Bills / Shopping mist-панели.
8) Google Calendar только readonly.
9) Виджет Next task (Pro) на тёмных обоях.

НЕ БАГ
• Узкий Free намеренно.
• Почты нет.
• Plan day / виджет / cloud AI / голос — Pro.

ОТЧЁТ: устройство + iOS + скрин бага.
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

## Screenshots (iPhone viewport)

Prior set in `testflight-screens/` (web demo). For App Store 6.7" prefer a fresh device capture after this mist polish:

| # | Screen | File |
|---|--------|------|
| 1 | Home | [01-home.png](./testflight-screens/01-home.png) |
| 2 | Tasks | [02-tasks.png](./testflight-screens/02-tasks.png) |
| 3 | Invest (Pro gate) | [03-invest.png](./testflight-screens/03-invest.png) |
| 4 | Settings (Pro + Google) | [04-settings.png](./testflight-screens/04-settings.png) |
| 5 | Chat | [05-chat.png](./testflight-screens/05-chat.png) |
| 6 | Bills | [06-bills.png](./testflight-screens/06-bills.png) |

Listing copy: [`app-store-listing.md`](./app-store-listing.md).

---

## App Store Connect checklist

1. Wait for new production EAS build → **Testing** in TestFlight (autoIncrement bumps buildNumber)
2. **Test Details** → paste What to Test EN or RU
3. Ensure tester groups (TE / OP) include people who should see the Update
4. Paste App Store listing fields from `app-store-listing.md` when preparing the store version
5. Optional: refresh screenshots from a real 6.7" device after mist UI lands
