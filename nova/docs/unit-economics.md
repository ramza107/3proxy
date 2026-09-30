# Wahrly unit economics

How Free vs Pro keeps the product from running at a loss at ~100k users.

## Pricing target (until StoreKit)

| Plan | Price | Included fair-use |
|------|------:|-------------------|
| Free | $0 | Morning brief, News, 40 AI chat/day, 5 voice/day, manual open-loops |
| Pro | **$6.99 / month** (target) | Auto-promises, weekly brief, 400 chat/day, 200 voice/day |

Store take ~15–30%. Model **net Pro revenue ≈ $5.00 / Pro / month**.

## Cost stack (what we actually pay)

| Driver | Notes |
|--------|--------|
| AI chat (Groq primary) | 1 completion / chat turn |
| AI email (Home open) | Up to 3 calls: digest + promises + meetings (then cache) |
| Whisper | Voice only; Free hard-capped at 5/day |
| Gmail API | Quota, not $ — still expensive if over-polled |
| Supabase | Auth + rows |
| Hosting | Render/equivalent — not free at scale |
| Background meeting push | **Local heuristics only**, every **90 min**, active installs (**14 days**) |

## Guardrails shipped in code

1. **Chat fair-use** — Free 40/day, Pro 400/day (client + server `chatGuard`).
2. **Voice fair-use** — Free 5/day, Pro 200/day (client + server `voiceGuard`).
3. **Gmail cache** — **45 min** default (was 8).
4. **Home soft poll** — **30 min** (was 5–10).
5. **Server push poll** — **90 min**, skip dormant tokens, **no AI** on sweep.
6. **Precise meeting/report classifier** — fewer false “important” scans/pushes.

## Unit cost assumptions (order of magnitude)

Using Groq-class pricing (~cheap chat) + Whisper:

| Per active Free user / month | Low | High |
|------------------------------|----:|-----:|
| Chat (avg 15 msgs × 30d, many under cap) | $0.04 | $0.12 |
| Email AI (1–2 Home opens/day, warm cache) | $0.03 | $0.10 |
| Voice (≤5/day, most use ≪5) | $0.01 | $0.05 |
| Infra share (host + DB) | $0.02 | $0.06 |
| **COGS / Free MAU** | **~$0.10** | **~$0.33** |

| Per active Pro user / month | Low | High |
|-----------------------------|----:|-----:|
| Chat + email + voice (heavier) | $0.25 | $0.90 |
| Infra share | $0.03 | $0.08 |
| **COGS / Pro MAU** | **~$0.28** | **~$0.98** |

Contribution on Pro at $5 net: **~$4.00–4.70 / Pro / month**.

## 100k registered — scenario math

Assume:

- **MAU** = 35% of registered → **35 000**
- **DAU** = 20% of MAU → **7 000**
- **Gmail connected** = 40% of MAU → **14 000**
- **Pro conversion** = 4% of MAU → **1 400** paying

### Revenue

`1 400 × $5 net ≈ **$7 000 / month**`

### COGS (with guards)

| Segment | Users | COGS/user | Total |
|---------|------:|----------:|------:|
| Free MAU | 33 600 | $0.20 | $6 720 |
| Pro MAU | 1 400 | $0.60 | $840 |
| **Total COGS** | | | **~$7 500** |

Near break-even at 4% conversion and mid COGS. To run **clearly profitable**:

- Pro at **$7.99** net ~$5.60, or
- Conversion **6–8%**, or
- Keep Free chat closer to avg **8–12 msgs/day** (product copy + UX), or
- Hosting reserved instances only when DAU demands it.

### What would put us in the red (avoided)

Old shape without guards:

- Push poll every **10 min** × all tokens × **AI** each miss  
- Unlimited Free chat  
- 8‑min cache + 5‑min client poll  

That path is **tens of thousands $/month** in AI alone at 100k — not viable.

## Break-even shortcuts

| Lever | Effect |
|-------|--------|
| Pro price $6.99→$7.99 | +~$1k/mo at 1.4k Pro |
| Conversion 4%→6% | +~$3.5k net/mo |
| Free chat 40→30 | Cuts Free AI tail |
| Gmail Pub/Sub later | Removes remaining push Gmail burn |

## Contribution formula

```
Monthly profit ≈
  (Pro_MAU × net_price)
  − (Free_MAU × cogs_free)
  − (Pro_MAU × cogs_pro)
  − fixed_hosting
```

With shipped caps, **fixed hosting** should stay in the low hundreds–low thousands $, not the AI bill.

## Product rule of thumb

> One Pro subscriber should fund **~15–25 Free MAU**.

At $5 net and ~$0.20 Free COGS → **~25 Free MAU per Pro**.  
Target conversion **≥4%** of MAU (or higher ARPU) to stay green as usage grows.
