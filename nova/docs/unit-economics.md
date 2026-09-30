# Wahrly unit economics

Free is designed for **~$0–0.02 COGS / MAU**. All expensive usage is Pro-only.

## Plans

| Plan | Price | What you get |
|------|------:|--------------|
| **Free** | $0 | Tasks, calendar (readonly), news RSS, morning/evening local rituals, **on-device local chat** |
| **Pro** | **$6.99 / mo** (target) | Cloud AI chat (400/day), voice (200/day), Gmail digest, open loops, meeting push, auto-promises, weekly brief |

Net after store cut ≈ **$5.00 / Pro / month**.

## Free cost model (~1–2¢)

| Item | Free? | Why cheap |
|------|:-----:|-----------|
| Cloud LLM chat | ❌ | Local AI only on device |
| Whisper voice | ❌ | Pro only |
| Gmail digest / meetings / promises | ❌ | Pro only (+ server 402) |
| Background meeting push poll | ❌ | Tokens not registered for Free |
| News RSS | ✅ | Shared cache, no AI |
| Calendar list | ✅ | Google quota, ~$0 |
| Supabase row | ✅ | Tiny per idle user |
| Hosting share | ✅ | Free barely hits AI server |

**Target Free COGS: $0.01–0.02 / MAU / month** (DB + crumbs of hosting).

## Pro COGS (order of magnitude)

| Driver | $/Pro / month |
|--------|-------------:|
| Cloud chat + email AI | $0.25–0.80 |
| Whisper | $0.05–0.30 |
| Gmail polls (active) | ~$0 (quota) |
| Infra share | $0.03–0.08 |
| **Total** | **~$0.35–1.20** |

Contribution ≈ **$3.80–4.65 / Pro / month**.

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

- Client: Free → `clientLocalAI` only; no Gmail UI scans; no mic Whisper; no push register
- Server: `/api/ai/chat` requires `is_pro`; `/api/ai/transcribe` 402 without Pro; Gmail digest/promises/meetings 402 without Pro; push register skipped for Free
- Background poll: Pro + active 14d only, local heuristics, 90 min

## Rule of thumb

> **Free should be almost free to run. Pro pays for AI.**

1 Pro @ $5 net covers **~250 Free MAU** at $0.02 — or the whole Free base is noise next to Pro COGS.
