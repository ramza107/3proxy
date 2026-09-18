# Wahrly — AI Life Assistant (MVP)

Personal AI assistant for everyday life. You tell Wahrly what you need to do — it turns that into tasks, reminders, and a calm daily plan.

> Wahrly should feel like an AI that happens to have a task list — not a task manager with AI bolted on.

## Stack

- Expo + React Native + TypeScript + Expo Router
- Supabase (Auth + Postgres + RLS)
- Express AI backend (`POST /api/ai/chat`) with OpenAI
- Expo Notifications
- AsyncStorage / Zustand local cache
- Offline local AI fallback when the server or OpenAI key is missing

## Quick start (website demo)

After deploy to GitHub Pages:

**https://ramza107.github.io/3proxy/nova/**

AI backend (Groq): `https://threeproxy-x9bi.onrender.com`

Locally in the browser:

```bash
cd nova
npm install --legacy-peer-deps
npx expo start --web
```

Or static export:

```bash
npx expo export --platform web
npx serve dist
```

Demo mode works in the browser without OpenAI/Supabase keys (local AI fallback + AsyncStorage).

## Quick start (mobile / Expo Go)

```bash
cd nova
cp .env.example .env
npm install --legacy-peer-deps
npm --prefix server install

# Terminal 1 — AI server
npm run server

# Terminal 2 — Expo app
npm start
```

### Demo mode (no credentials)

Leave `.env` placeholders as-is.

1. Open the app
2. Sign up / sign in with any email + password (6+ chars)
3. Complete onboarding
4. In Chat, try:
   - `Remind me to call Mom tomorrow at 7 PM`
   - `I need to clean my apartment, buy food and do laundry tomorrow`
   - `What do I need to do today?`
   - `I finished buying food`

Tasks appear on **Home** and **Tasks**. Timed tasks schedule local notifications when permissions allow.

## Configure Supabase + AI (Groq / OpenAI)

1. Create a Supabase project
2. Run `supabase/schema.sql` in the SQL editor
3. Enable Email auth
4. Get a **free Groq key**: [console.groq.com/keys](https://console.groq.com/keys)
5. Fill `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_API_URL=http://localhost:8787
GROQ_API_KEY=gsk_...
GROQ_MODEL=openai/gpt-oss-20b
# optional fallback:
# OPENAI_API_KEY=sk-...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

6. Restart Expo and the AI server

> Never put `GROQ_API_KEY` / `OPENAI_API_KEY` in the mobile app. Only the server uses them.
> Provider order: Groq → OpenAI → built-in local AI.

## Deploy AI server (Render)

Самый простой вариант для продакшена — [Render](https://render.com) (есть free tier).

### 1. Запушь репозиторий на GitHub
Убедись, что ветка с `nova/server` уже на GitHub.

### 2. Создай Web Service на Render
1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service**
2. Подключи репозиторий `ramza107/3proxy`
3. Настройки:
   - **Root Directory:** `nova/server`
   - **Runtime:** Node
   - **Build Command:** `npm ci`
   - **Start Command:** `npm start`
   - **Health Check Path:** `/health`
4. Environment variables:
   - `GROQ_API_KEY` = ключ с [console.groq.com/keys](https://console.groq.com/keys) *(рекомендуется, free tier)*
   - `GROQ_MODEL` = `openai/gpt-oss-20b` (или другая модель Groq)
   - `OPENAI_API_KEY` = опциональный fallback
   - `OPENAI_MODEL` = `gpt-4o-mini`
   - `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` = опционально

Приоритет провайдера: **Groq → OpenAI → local AI**.

Или через Blueprint: в корне репо есть `render.yaml` → **New** → **Blueprint**.

### 3. Проверь
После деплоя Render даст URL вида `https://nova-ai-xxxx.onrender.com`.

```bash
curl https://YOUR-SERVICE.onrender.com/health
# {"ok":true,"openai":true}
```

### 4. Подключи приложение
В `nova/.env` (и в GitHub Pages / EAS secrets):

```env
EXPO_PUBLIC_API_URL=https://YOUR-SERVICE.onrender.com
```

Пересобери веб/приложение. Чат пойдёт на сервер → OpenAI.

> Free tier на Render «засыпает» без трафика (~50с cold start). Для продакшена лучше платный Starter.

### Docker (любой хост)

```bash
cd nova/server
docker build -t nova-ai .
docker run -p 8787:8787 -e OPENAI_API_KEY=sk-... nova-ai
```

## Project structure

```
nova/
├── app/                 # Expo Router screens
├── components/
├── lib/                 # supabase, api, store, notifications
├── services/            # AI action application
├── server/              # Express OpenAI endpoint
├── supabase/schema.sql
├── types/
├── .env.example
└── README.md
```

## AI contract

`POST /api/ai/chat`

```json
{
  "message": "Tomorrow at 6 PM remind me to buy groceries",
  "user_id": "...",
  "tasks": [],
  "history": []
}
```

Response:

```json
{
  "reply": "Done. I'll remind you tomorrow at 6 PM.",
  "actions": [
    {
      "type": "create_reminder",
      "title": "Buy groceries",
      "date": "2026-09-18",
      "time": "18:00"
    }
  ]
}
```

Supported actions: `create_task`, `update_task`, `complete_task`, `delete_task`, `create_reminder`.

## Screens

- **Home** — greeting, morning inbox brief, today plan, composer
- **Chat** — primary AI interface
- **Tasks** — Today / Tomorrow / Upcoming / Completed
- **Settings** — name, Gmail connect, morning/evening rituals, AI tone, sign out

## Morning inbox (automatic from Gmail)

**For users:** Settings → **Connect with Google** → tap **Allow** on Google’s screen. No passwords.

**For the app owner (once):** follow [`docs/gmail-oauth-setup.md`](docs/gmail-oauth-setup.md) — add `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` on Render.

## Voice

Mic button is present and wired for future speech-to-text. MVP accepts typed text (or pasted transcripts) through the same AI pipeline.

## MVP boundaries

Not included yet: banking, shopping, WhatsApp automation, maps, bookings, social, subscriptions, ads. Gmail is read-only digest (who wrote), not full inbox automation.
