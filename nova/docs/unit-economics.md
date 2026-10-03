# Wahrly unit economics

Free is designed for **~$0–0.02 COGS / MAU**. All expensive usage is Pro-only.

## Plans

| Plan | Price | What you get |
|------|------:|--------------|
| **Free** | $0 | Tasks, calendar (readonly), news RSS, morning/evening local rituals, **on-device local chat** |
| **Pro** | **$6.99 / mo** (target) | Cloud AI chat (400/day), voice (200/day), invest, weekly brief |

Net after store cut ≈ **$5.00 / Pro / month**.

## Free cost model (~1–2¢)

| Item | Free? | Why cheap |
|------|:-----:|-----------|
| Cloud LLM chat | ❌ | Local AI only on device |
| Whisper voice | ❌ | Pro only |
| News RSS | ✅ | Shared cache, no AI |
| Calendar list (readonly) | ✅ | Google quota, ~$0 |
| Supabase row | ✅ | Tiny per idle user |
| Hosting share | ✅ | Free barely hits AI server |

**Target Free COGS: $0.01–0.02 / MAU / month** (DB + crumbs of hosting).

## Pro COGS (order of magnitude)

| Driver | $/Pro / month |
|--------|-------------:|
| Cloud chat | $0.20–0.70 |
| Whisper | $0.05–0.30 |
| Infra share | $0.03–0.08 |
| **Total** | **~$0.30–1.10** |

Contribution ≈ **$3.90–4.70 / Pro / month**.

## Daily-use at 100k registered

Assume **80k daily Free** + **4% Pro of MAU**. If MAU≈80k → Pro ≈ **3.2k**.

| | |
|--|--:|
| Free COGS @ $0.02 | **$1.6k** |
| Pro COGS @ $0.70 | **$2.2k** |
| **Total COGS** | **~$3.8k** |
| Pro revenue @ $5 net | **~$16k** |
| **Gross margin** | **~$12k / month** |

Even at heavy daily use, Free no longer sinks the business.

## Code guards

- Client: Free → `clientLocalAI` only; no mic Whisper
- Server: `/api/ai/chat` requires `is_pro`; `/api/ai/transcribe` 402 without Pro
- Calendar readonly works on Free (Google quota only)

## Rule of thumb

> **Free should be almost free to run. Pro pays for AI.**

1 Pro @ $5 net covers **~250 Free MAU** at $0.02 — or the whole Free base is noise next to Pro COGS.
