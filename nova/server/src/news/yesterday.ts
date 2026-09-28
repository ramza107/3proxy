/** Yesterday news digest from public RSS (no API key). */

import { createHash } from 'crypto'

export const NEWS_INTERESTS = [
  'world',
  'tech',
  'business',
  'science',
  'sports',
  'culture',
  'health',
] as const

export type NewsInterest = (typeof NEWS_INTERESTS)[number]

export type NewsItem = {
  id: string
  title: string
  url: string
  source: string
  interest: NewsInterest
  publishedAt: string
}

export type YesterdayNewsDigest = {
  demo: boolean
  day: string
  dayLabel: string
  timeZone: string
  interests: NewsInterest[]
  items: NewsItem[]
  summary: string
  generatedAt: string
}

type LocalePack = { hl: string; gl: string; ceid: string }

const LOCALE_BY_LANG: Record<string, LocalePack> = {
  en: { hl: 'en-US', gl: 'US', ceid: 'US:en' },
  ru: { hl: 'ru', gl: 'RU', ceid: 'RU:ru' },
  uk: { hl: 'uk', gl: 'UA', ceid: 'UA:uk' },
  de: { hl: 'de', gl: 'DE', ceid: 'DE:de' },
  es: { hl: 'es', gl: 'ES', ceid: 'ES:es' },
  fr: { hl: 'fr', gl: 'FR', ceid: 'FR:fr' },
  pt: { hl: 'pt-BR', gl: 'BR', ceid: 'BR:pt-419' },
  zh: { hl: 'zh-CN', gl: 'CN', ceid: 'CN:zh-Hans' },
  hi: { hl: 'hi', gl: 'IN', ceid: 'IN:hi' },
  ar: { hl: 'ar', gl: 'AE', ceid: 'AE:ar' },
}

const GOOGLE_TOPIC: Record<NewsInterest, string> = {
  world: 'WORLD',
  tech: 'TECHNOLOGY',
  business: 'BUSINESS',
  science: 'SCIENCE',
  sports: 'SPORTS',
  culture: 'ENTERTAINMENT',
  health: 'HEALTH',
}

const BBC_FEED: Record<NewsInterest, string> = {
  world: 'https://feeds.bbci.co.uk/news/world/rss.xml',
  tech: 'https://feeds.bbci.co.uk/news/technology/rss.xml',
  business: 'https://feeds.bbci.co.uk/news/business/rss.xml',
  science: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
  sports: 'https://feeds.bbci.co.uk/sport/rss.xml',
  culture: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',
  health: 'https://feeds.bbci.co.uk/news/health/rss.xml',
}

const cache = new Map<string, { at: number; data: YesterdayNewsDigest }>()
const CACHE_MS = 20 * 60 * 1000

export function isNewsInterest(v: string): v is NewsInterest {
  return (NEWS_INTERESTS as readonly string[]).includes(v)
}

export function normalizeInterests(raw: string[] | undefined): NewsInterest[] {
  const picked = (raw || []).filter(isNewsInterest)
  return picked.length ? [...new Set(picked)] : ['world', 'tech', 'business']
}

function localeFor(lang: string): LocalePack {
  return LOCALE_BY_LANG[lang] || LOCALE_BY_LANG.en
}

function googleFeed(interest: NewsInterest, lang: string): string {
  const { hl, gl, ceid } = localeFor(lang)
  const topic = GOOGLE_TOPIC[interest]
  return `https://news.google.com/rss/headlines/section/topic/${topic}?hl=${encodeURIComponent(hl)}&gl=${encodeURIComponent(gl)}&ceid=${encodeURIComponent(ceid)}`
}

function stripTags(s: string) {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}

function decodeEntities(s: string) {
  return stripTags(s)
}

type RawItem = { title: string; link: string; pubDate: string; source?: string }

function parseRssItems(xml: string): RawItem[] {
  const items: RawItem[] = []
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || []
  for (const block of blocks) {
    const title = block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || ''
    const link =
      block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ||
      block.match(/<link[^>]*href=["']([^"']+)["']/i)?.[1] ||
      ''
    const pubDate =
      block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] ||
      block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1] ||
      ''
    const source = block.match(/<source[^>]*>([\s\S]*?)<\/source>/i)?.[1] || ''
    const cleanTitle = decodeEntities(title)
    const cleanLink = decodeEntities(link)
    if (!cleanTitle || !cleanLink) continue
    items.push({
      title: cleanTitle.slice(0, 180),
      link: cleanLink,
      pubDate: decodeEntities(pubDate),
      source: source ? decodeEntities(source).slice(0, 40) : undefined,
    })
  }
  return items
}

/** Calendar YYYY-MM-DD for `date` in `timeZone`. */
export function zonedISODate(date: Date, timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date)
    const y = parts.find((p) => p.type === 'year')?.value
    const m = parts.find((p) => p.type === 'month')?.value
    const d = parts.find((p) => p.type === 'day')?.value
    if (y && m && d) return `${y}-${m}-${d}`
  } catch {
    // fall through
  }
  return date.toISOString().slice(0, 10)
}

function addCalendarDays(iso: string, delta: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, (m || 1) - 1, d || 1))
  dt.setUTCDate(dt.getUTCDate() + delta)
  return dt.toISOString().slice(0, 10)
}

export function yesterdayISO(timeZone: string, now = new Date()): string {
  return addCalendarDays(zonedISODate(now, timeZone), -1)
}

function dayLabelFor(iso: string, timeZone: string, lang: string): string {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString(lang || 'en', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone,
    })
  } catch {
    return iso
  }
}

async function fetchFeed(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'WahrlyNews/1.0 (+https://wahrly.app)',
      Accept: 'application/rss+xml, application/xml, text/xml, */*',
    },
    signal: AbortSignal.timeout(8000),
  })
  if (!res.ok) throw new Error(`feed ${res.status}`)
  return res.text()
}

function sourceFromUrl(url: string, fallback: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    if (host.includes('google.')) return fallback
    return host.split('.').slice(-2).join('.')
  } catch {
    return fallback
  }
}

function demoItems(interests: NewsInterest[], day: string): NewsItem[] {
  const catalog: Record<NewsInterest, { title: string; source: string }[]> = {
    world: [
      { title: 'Leaders meet on ceasefire talks after overnight developments', source: 'World Desk' },
      { title: 'Storms disrupt travel across several regions', source: 'World Desk' },
    ],
    tech: [
      { title: 'Chipmakers outline next-gen AI accelerator plans', source: 'Tech Wire' },
      { title: 'Major app stores tighten account recovery rules', source: 'Tech Wire' },
    ],
    business: [
      { title: 'Markets close mixed as energy prices ease', source: 'Markets' },
      { title: 'Retail chains report quieter weekend traffic', source: 'Markets' },
    ],
    science: [
      { title: 'Researchers publish clearer map of deep-ocean currents', source: 'Science Daily' },
      { title: 'New study tracks wildfire smoke and air quality', source: 'Science Daily' },
    ],
    sports: [
      { title: 'Underdogs advance after late equalizer', source: 'Sports Wire' },
      { title: 'Season opener sets attendance record', source: 'Sports Wire' },
    ],
    culture: [
      { title: 'Festival lineup highlights emerging directors', source: 'Arts' },
      { title: 'Streaming drama draws record first-week viewers', source: 'Arts' },
    ],
    health: [
      { title: 'Clinics expand same-week vaccination slots', source: 'Health' },
      { title: 'Sleep guidelines updated for desk workers', source: 'Health' },
    ],
  }
  const out: NewsItem[] = []
  for (const interest of interests) {
    for (const row of catalog[interest] || []) {
      out.push({
        id: `demo_${interest}_${out.length}`,
        title: row.title,
        url: `https://news.google.com/search?q=${encodeURIComponent(row.title)}`,
        source: row.source,
        interest,
        publishedAt: `${day}T15:00:00.000Z`,
      })
    }
  }
  return out.slice(0, 14)
}

function summarize(items: NewsItem[], dayLabel: string, demo: boolean): string {
  if (!items.length) {
    return demo
      ? `Quiet preview for ${dayLabel} — pick interests and refresh.`
      : `No clear headlines for ${dayLabel} in your interests yet.`
  }
  const by = new Map<NewsInterest, number>()
  for (const it of items) by.set(it.interest, (by.get(it.interest) || 0) + 1)
  const parts = [...by.entries()].map(([k, n]) => `${k} ${n}`)
  return `${items.length} headlines from ${dayLabel} · ${parts.join(' · ')}`
}

async function loadInterest(
  interest: NewsInterest,
  lang: string,
  timeZone: string,
  day: string,
): Promise<NewsItem[]> {
  const urls = [googleFeed(interest, lang), BBC_FEED[interest]]
  const collected: NewsItem[] = []
  for (const url of urls) {
    try {
      const xml = await fetchFeed(url)
      const parsed = parseRssItems(xml)
      for (const raw of parsed) {
        const ts = Date.parse(raw.pubDate)
        const idSeed = `${interest}|${raw.link}|${raw.title}`
        collected.push({
          id: `${interest}_${createHash('sha1').update(idSeed).digest('hex').slice(0, 12)}`,
          title: raw.title,
          url: raw.link,
          source: raw.source || sourceFromUrl(raw.link, url.includes('bbc') ? 'BBC' : 'News'),
          interest,
          publishedAt: Number.isFinite(ts) ? new Date(ts).toISOString() : `${day}T12:00:00.000Z`,
        })
      }
      if (collected.length) break
    } catch {
      // try next feed
    }
  }
  return collected
}

export async function buildYesterdayNews(params: {
  interests: string[]
  timeZone?: string
  language?: string
  demo?: boolean
  refresh?: boolean
}): Promise<YesterdayNewsDigest> {
  const interests = normalizeInterests(params.interests)
  const timeZone = params.timeZone || 'UTC'
  const language = (params.language || 'en').slice(0, 8)
  const day = yesterdayISO(timeZone)
  const dayLabel = dayLabelFor(day, timeZone, language)
  const cacheKey = `${day}|${timeZone}|${language}|${interests.join(',')}`

  if (!params.refresh && !params.demo) {
    const hit = cache.get(cacheKey)
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.data
  }

  if (params.demo) {
    const items = demoItems(interests, day)
    return {
      demo: true,
      day,
      dayLabel,
      timeZone,
      interests,
      items,
      summary: summarize(items, dayLabel, true),
      generatedAt: new Date().toISOString(),
    }
  }

  const pools = await Promise.all(
    interests.map((interest) => loadInterest(interest, language, timeZone, day)),
  )

  const yesterday: NewsItem[] = []
  const recent: NewsItem[] = []
  const seen = new Set<string>()

  for (const pool of pools) {
    for (const item of pool) {
      const key = item.title.toLowerCase().replace(/\s+/g, ' ').slice(0, 80)
      if (seen.has(key)) continue
      seen.add(key)
      const pDay = zonedISODate(new Date(item.publishedAt), timeZone)
      if (pDay === day) yesterday.push(item)
      else recent.push(item)
    }
  }

  // Round-robin across interests for balance
  const pickBalanced = (list: NewsItem[], limit: number) => {
    const byInterest = new Map<NewsInterest, NewsItem[]>()
    for (const it of list) {
      const arr = byInterest.get(it.interest) || []
      arr.push(it)
      byInterest.set(it.interest, arr)
    }
    for (const arr of byInterest.values()) {
      arr.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
    }
    const out: NewsItem[] = []
    let guard = 0
    while (out.length < limit && guard < limit * interests.length + 5) {
      guard++
      let added = false
      for (const interest of interests) {
        const arr = byInterest.get(interest)
        if (arr?.length) {
          out.push(arr.shift()!)
          added = true
          if (out.length >= limit) break
        }
      }
      if (!added) break
    }
    return out
  }

  let items = pickBalanced(yesterday, 14)
  let demo = false
  if (items.length < 4) {
    const filled = pickBalanced([...yesterday, ...recent], 14)
    items = filled
  }
  if (items.length === 0) {
    items = demoItems(interests, day)
    demo = true
  }

  const data: YesterdayNewsDigest = {
    demo,
    day,
    dayLabel,
    timeZone,
    interests,
    items,
    summary: summarize(items, dayLabel, demo),
    generatedAt: new Date().toISOString(),
  }
  cache.set(cacheKey, { at: Date.now(), data })
  return data
}
