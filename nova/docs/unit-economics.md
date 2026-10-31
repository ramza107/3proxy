# Wahrly unit economics

Free is designed for **~$0–0.02 COGS / MAU**. Spaces + autopilot + expensive AI are Pro-only.

Aligned with `lib/pro.ts`.

## Hard Free / Pro split

| | **Free** | **Pro ($9.99/mo base; regional)** |
|--|:--------:|:------------------:|
| Tasks | ✅ | ✅ |
| Dates | ✅ | ✅ |
| Local AI chat (on-device) | ✅ | ✅ |
| Home / Settings | ✅ | ✅ |
| Google Calendar (readonly) | ✅ | ✅ |
| Bills / Shopping / Life / News | ❌ | ✅ |
| Evening Clear | ❌ | ✅ |
| **Plan day** auto slots | ❌ | ✅ |
| Smart morning brief | ❌ | ✅ |
| Bill + loop push reminders | ❌ | ✅ |
| Evening digest + reflect | ❌ | ✅ |
| Home Screen widget (Next) | ❌ | ✅ |
| Cloud AI chat (400/day) | ❌ | ✅ |
| Voice (200/day) | ❌ | ✅ |
| Invest quotes | ❌ | ✅ |
| Weekly brief | ❌ | ✅ |

**Formula:** Free = Tasks + Dates + local chat. Pro = spaces + autopilot + cloud AI.

SKU: `com.wahrly.assistant.pro.monthly`. Base **$9.99/mo** (Apple/Google set local prices by region).  
Net after store cut ≈ **$7.00 / Pro / month** at the $9.99 tier.

## Free cost model (~1–2¢)

| Item | Free? | Why cheap |
|------|:-----:|-----------|
| Cloud LLM chat | ❌ | Local AI only on device |
| Whisper voice | ❌ | Pro only |
| News / Bills / Shopping / Life | ❌ | Pro spaces (zero Free COGS) |
| Plan day / morning / reminders / evening | ❌ | Pro only |
| Calendar list (readonly) | ✅ | Google quota, ~$0 |
| Supabase row | ✅ | Tiny per idle user |

**Target Free COGS: $0.01–0.02 / MAU / month**.

## Pro COGS (order of magnitude)

| Driver | $/Pro / month |
|--------|-------------:|
| Cloud chat | $0.20–0.70 |
| Whisper | $0.05–0.30 |
| Infra share | $0.03–0.08 |
| **Total** | **~$0.30–1.10** |

Contribution ≈ **$5.90–6.70 / Pro / month** (at $9.99 US; other regions scale with local price).

> **Free should be almost free to run. Pro pays for AI, spaces, and autopilot.**
