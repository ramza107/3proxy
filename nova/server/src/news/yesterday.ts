/** Yesterday / overnight top news by interest — public RSS, no API key. */

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
  /** Target stories per interest section */
  perSection: number
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

/** Premium / wire outlets preferred when ranking. */
const TOP_SOURCES = [
  'reuters',
  'associated press',
  'ap news',
  'bbc',
  'the guardian',
  'nytimes',
  'new york times',
  'washington post',
  'al jazeera',
  'cnn',
  'npr',
  'bloomberg',
  'financial times',
  'ft.com',
  'the economist',
  'wsj',
  'wall street journal',
  'abc news',
  'cbs news',
  'nbc news',
  'politico',
  'axios',
  'time',
  'nature',
  'science',
  'espn',
  'sky news',
  'dw',
  'france 24',
  'rbc',
  'lenta',
  'meduza',
  'interfax',
  'kommersant',
  'tass',
]

/** Top-tier RSS per interest (fetched in parallel with Google News topic). */
const PREMIUM_FEEDS: Record<NewsInterest, string[]> = {
  world: [
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    'https://www.theguardian.com/world/rss',
    'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    'https://www.aljazeera.com/xml/rss/all.xml',
    'https://feeds.npr.org/1004/rss.xml',
    'http://rss.cnn.com/rss/edition_world.rss',
  ],
  tech: [
    'https://feeds.bbci.co.uk/news/technology/rss.xml',
    'https://www.theguardian.com/technology/rss',
    'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml',
    'https://feeds.npr.org/1019/rss.xml',
    'http://rss.cnn.com/rss/edition_technology.rss',
  ],
  business: [
    'https://feeds.bbci.co.uk/news/business/rss.xml',
    'https://www.theguardian.com/business/rss',
    'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml',
    'https://feeds.npr.org/1006/rss.xml',
    'http://rss.cnn.com/rss/money_news_international.rss',
  ],
  science: [
    'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml',
    'https://www.theguardian.com/science/rss',
    'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml',
    'https://feeds.npr.org/1007/rss.xml',
  ],
  sports: [
    'https://feeds.bbci.co.uk/sport/rss.xml',
    'https://www.theguardian.com/sport/rss',
    'https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml',
    'https://feeds.npr.org/1055/rss.xml',
    'http://rss.cnn.com/rss/edition_sport.rss',
  ],
  culture: [
    'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml',
    'https://www.theguardian.com/culture/rss',
    'https://rss.nytimes.com/services/xml/rss/nyt/Arts.xml',
    'https://feeds.npr.org/1008/rss.xml',
    'http://rss.cnn.com/rss/edition_entertainment.rss',
  ],
  health: [
    'https://feeds.bbci.co.uk/news/health/rss.xml',
    'https://www.theguardian.com/society/health/rss',
    'https://rss.nytimes.com/services/xml/rss/nyt/Health.xml',
    'https://feeds.npr.org/1128/rss.xml',
  ],
}

const PER_SECTION_MIN = 5
const PER_SECTION_MAX = 10
const PER_SECTION_TARGET = 8

const cache = new Map<string, { at: number; data: YesterdayNewsDigest }>()
const CACHE_MS = 15 * 60 * 1000

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

function googleTopicFeed(interest: NewsInterest, lang: string): string {
  const { hl, gl, ceid } = localeFor(lang)
  const topic = GOOGLE_TOPIC[interest]
  return `https://news.google.com/rss/headlines/section/topic/${topic}?hl=${encodeURIComponent(hl)}&gl=${encodeURIComponent(gl)}&ceid=${encodeURIComponent(ceid)}`
}

/** Google “top stories” + topic query for the last day. */
function googleTopQueryFeed(interest: NewsInterest, lang: string): string {
  const { hl, gl, ceid } = localeFor(lang)
  const q: Record<NewsInterest, string> = {
    world: 'world news when:1d',
    tech: 'technology OR AI when:1d',
    business: 'business markets when:1d',
    science: 'science research when:1d',
    sports: 'sports when:1d',
    culture: 'arts culture entertainment when:1d',
    health: 'health medicine when:1d',
  }
  return `https://news.google.com/rss/search?q=${encodeURIComponent(q[interest])}&hl=${encodeURIComponent(hl)}&gl=${encodeURIComponent(gl)}&ceid=${encodeURIComponent(ceid)}`
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
    const cleanTitle = stripTags(title)
    const cleanLink = stripTags(link)
    if (!cleanTitle || !cleanLink) continue
    // Drop Google News chrome titles
    if (/^Google News$/i.test(cleanTitle)) continue
    items.push({
      title: cleanTitle.slice(0, 200),
      link: cleanLink,
      pubDate: stripTags(pubDate),
      source: source ? stripTags(source).slice(0, 48) : undefined,
    })
  }
  return items
}

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
      'User-Agent':
        'Mozilla/5.0 (compatible; WahrlyNews/1.1; +https://wahrly.app) AppleWebKit/537.36',
      Accept: 'application/rss+xml, application/xml, text/xml, */*',
    },
    signal: AbortSignal.timeout(9000),
  })
  if (!res.ok) throw new Error(`feed ${res.status}`)
  return res.text()
}

function sourceFromUrl(url: string, fallback: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '')
    if (host.includes('google.')) return fallback
    if (host.includes('bbc.')) return 'BBC'
    if (host.includes('nytimes')) return 'NYT'
    if (host.includes('theguardian')) return 'The Guardian'
    if (host.includes('aljazeera')) return 'Al Jazeera'
    if (host.includes('npr.org')) return 'NPR'
    if (host.includes('cnn.com')) return 'CNN'
    return host.split('.').slice(-2).join('.')
  } catch {
    return fallback
  }
}

function isTopSource(source: string) {
  const s = source.toLowerCase()
  return TOP_SOURCES.some((t) => s.includes(t))
}

function rankScore(item: NewsItem, day: string, timeZone: string): number {
  let score = 0
  if (isTopSource(item.source)) score += 40
  const pDay = zonedISODate(new Date(item.publishedAt), timeZone)
  if (pDay === day) score += 30
  else {
    const ageH = (Date.now() - Date.parse(item.publishedAt)) / 3600000
    if (ageH <= 36) score += 18
    else if (ageH <= 72) score += 8
  }
  // Prefer shorter wire-style headlines slightly
  if (item.title.length >= 40 && item.title.length <= 120) score += 4
  return score
}

function demoItems(interests: NewsInterest[], day: string): NewsItem[] {
  const catalog: Record<NewsInterest, { title: string; source: string }[]> = {
    world: [
      { title: 'UN Security Council debates overnight ceasefire proposal', source: 'Reuters' },
      { title: 'Pacific storm forces evacuations across island capitals', source: 'AP' },
      { title: 'European leaders convene emergency energy summit', source: 'BBC' },
      { title: 'Border talks resume after week of diplomatic silence', source: 'The Guardian' },
      { title: 'Aid agencies report rising needs after weekend flooding', source: 'Al Jazeera' },
      { title: 'Global flight delays ease after overnight ATC outage', source: 'CNN' },
      { title: 'Election observers arrive ahead of regional runoff', source: 'NPR' },
      { title: 'Maritime corridor reopens under new escort rules', source: 'Reuters' },
    ],
    tech: [
      { title: 'Chipmakers unveil next AI accelerator roadmaps', source: 'Reuters' },
      { title: 'Major cloud outage traced to cascading DNS failure', source: 'AP' },
      { title: 'Regulators open inquiry into app-store billing rules', source: 'BBC' },
      { title: 'Open-source model release redraws enterprise AI race', source: 'The Guardian' },
      { title: 'Smartphone makers cut midrange prices after weak quarter', source: 'Bloomberg' },
      { title: 'Cyber agencies warn of new ransomware campaign', source: 'NPR' },
      { title: 'Satellite broadband expands to remote research stations', source: 'NYT' },
      { title: 'Browser makers tighten third-party cookie defaults', source: 'CNN' },
    ],
    business: [
      { title: 'Global markets mixed as oil slips and yields steady', source: 'Reuters' },
      { title: 'Central banks signal patience on further rate cuts', source: 'FT' },
      { title: 'Retail sales beat forecasts in overnight data dump', source: 'Bloomberg' },
      { title: 'Shipping rates climb after Red Sea route disruptions', source: 'AP' },
      { title: 'Auto makers revise EV timelines amid softer demand', source: 'BBC' },
      { title: 'Bank stress tests show stronger capital buffers', source: 'WSJ' },
      { title: 'IPO window reopens with two mid-cap tech listings', source: 'NYT' },
      { title: 'Currency markets watch dollar after jobs revision', source: 'Reuters' },
    ],
    science: [
      { title: 'Researchers map deep-ocean currents with new float array', source: 'Nature' },
      { title: 'Mars rover finds mineral clues of ancient groundwater', source: 'BBC' },
      { title: 'Climate study revises wildfire smoke health estimates', source: 'AP' },
      { title: 'Gene therapy trial reports durable rare-disease gains', source: 'NYT' },
      { title: 'Astronomers spot brightest early-universe galaxy yet', source: 'The Guardian' },
      { title: 'Lab-grown meat clears another regulatory milestone', source: 'Reuters' },
      { title: 'Earthquake early-warning network expands coverage', source: 'NPR' },
      { title: 'Scientists sequence ancient DNA from alpine ice core', source: 'Science' },
    ],
    sports: [
      { title: 'Underdogs force replay after late equalizer', source: 'BBC Sport' },
      { title: 'Grand slam final set after overnight semifinal thrillers', source: 'AP' },
      { title: 'Transfer window closes with record midfield deal', source: 'Reuters' },
      { title: 'Olympic qualifiers reshuffled after weather delay', source: 'The Guardian' },
      { title: 'NBA preseason opener draws arena attendance record', source: 'ESPN' },
      { title: 'Formula 1 stewards clear contested overnight penalty', source: 'BBC' },
      { title: 'World Cup warm-up cancelled due to travel chaos', source: 'AP' },
      { title: 'Marathon course record falls in cool morning conditions', source: 'Reuters' },
    ],
    culture: [
      { title: 'Venice lineup highlights new wave of debut directors', source: 'The Guardian' },
      { title: 'Streaming drama posts record first-week global audience', source: 'BBC' },
      { title: 'Museum recovers looted bronze after decades abroad', source: 'NYT' },
      { title: 'Booker longlist mixes debut novelists and veterans', source: 'AP' },
      { title: 'Broadway revival opens to standing ovations', source: 'Reuters' },
      { title: 'Jazz festival expands free outdoor stages', source: 'NPR' },
      { title: 'Photo archive of the 1970s goes on public display', source: 'The Guardian' },
      { title: 'Classical orchestra announces world premiere season', source: 'BBC' },
    ],
    health: [
      { title: 'WHO updates guidance on seasonal respiratory vaccines', source: 'Reuters' },
      { title: 'Study links desk work to sleep disruption patterns', source: 'AP' },
      { title: 'Hospitals report steadier ER demand after holiday spike', source: 'BBC' },
      { title: 'New oral antiviral clears mid-stage trial goals', source: 'NYT' },
      { title: 'Public clinics expand same-week primary care slots', source: 'NPR' },
      { title: 'Nutrition agencies revise ultraprocessed food advice', source: 'The Guardian' },
      { title: 'Mental health hotlines add overnight multilingual lines', source: 'AP' },
      { title: 'Wearable makers publish heart-rhythm accuracy study', source: 'Reuters' },
    ],
  }

  const out: NewsItem[] = []
  for (const interest of interests) {
    const rows = catalog[interest] || []
    rows.slice(0, PER_SECTION_TARGET).forEach((row, j) => {
      out.push({
        id: `demo_${interest}_${j}`,
        title: row.title,
        url: `https://news.google.com/search?q=${encodeURIComponent(row.title)}`,
        source: row.source,
        interest,
        publishedAt: `${day}T${String(10 + (j % 8)).padStart(2, '0')}:15:00.000Z`,
      })
    })
  }
  return out
}

function summarize(items: NewsItem[], dayLabel: string, demo: boolean, interests: NewsInterest[]): string {
  if (!items.length) {
    return demo
      ? `Quiet preview for ${dayLabel} — pick interests and refresh.`
      : `No clear headlines for ${dayLabel} in your interests yet.`
  }
  const parts = interests.map((k) => {
    const n = items.filter((i) => i.interest === k).length
    return n ? `${k} ${n}` : null
  }).filter(Boolean)
  return `${items.length} top stories · ${dayLabel} · ${parts.join(' · ')}`
}

async function fetchUrlItems(
  url: string,
  interest: NewsInterest,
  day: string,
  sourceHint: string,
): Promise<NewsItem[]> {
  try {
    const xml = await fetchFeed(url)
    return parseRssItems(xml).map((raw) => {
      const ts = Date.parse(raw.pubDate)
      const idSeed = `${interest}|${raw.link}|${raw.title}`
      return {
        id: `${interest}_${createHash('sha1').update(idSeed).digest('hex').slice(0, 12)}`,
        title: raw.title,
        url: raw.link,
        source: raw.source || sourceFromUrl(raw.link, sourceHint),
        interest,
        publishedAt: Number.isFinite(ts) ? new Date(ts).toISOString() : `${day}T12:00:00.000Z`,
      }
    })
  } catch {
    return []
  }
}

async function loadInterestSection(
  interest: NewsInterest,
  lang: string,
  timeZone: string,
  day: string,
): Promise<NewsItem[]> {
  const urls: { url: string; hint: string }[] = [
    { url: googleTopicFeed(interest, lang), hint: 'Google News' },
    { url: googleTopQueryFeed(interest, lang), hint: 'Google News' },
    ...PREMIUM_FEEDS[interest].map((url) => ({ url, hint: sourceFromUrl(url, 'News') })),
  ]

  const batches = await Promise.all(urls.map((u) => fetchUrlItems(u.url, interest, day, u.hint)))

  // Split premium wire feeds vs Google aggregator noise.
  const premiumHosts = [
    'bbc.',
    'nytimes',
    'theguardian',
    'aljazeera',
    'npr.org',
    'cnn.com',
    'reuters',
    'apnews',
    'bloomberg',
    'wsj',
    'ft.com',
    'politico',
    'axios',
    'france24',
    'dw.com',
  ]
  const fromPremium: NewsItem[] = []
  const fromGoogle: NewsItem[] = []
  const seen = new Set<string>()

  for (let bi = 0; bi < batches.length; bi++) {
    const batch = batches[bi]
    const isGoogle = urls[bi].url.includes('news.google.com')
    for (const item of batch) {
      const key = item.title.toLowerCase().replace(/\s+/g, ' ').slice(0, 90)
      if (seen.has(key)) continue
      seen.add(key)
      if (isGoogle) fromGoogle.push(item)
      else fromPremium.push(item)
    }
  }

  const score = (item: NewsItem) => rankScore(item, day, timeZone)
  fromPremium.sort((a, b) => score(b) - score(a))
  fromGoogle.sort((a, b) => {
    const ta = premiumHosts.some((h) => a.source.toLowerCase().includes(h.replace('.', '')) || a.url.includes(h))
    const tb = premiumHosts.some((h) => b.source.toLowerCase().includes(h.replace('.', '')) || b.url.includes(h))
    if (ta !== tb) return ta ? -1 : 1
    return score(b) - score(a)
  })

  const pool = [...fromPremium, ...fromGoogle]
  const yesterday = pool.filter((i) => zonedISODate(new Date(i.publishedAt), timeZone) === day)
  const recent = pool.filter((i) => zonedISODate(new Date(i.publishedAt), timeZone) !== day)

  const picked: NewsItem[] = []
  for (const item of [...yesterday, ...recent]) {
    if (picked.length >= PER_SECTION_TARGET) break
    picked.push(item)
  }

  return picked.slice(0, PER_SECTION_MAX)
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
  const cacheKey = `v2|${day}|${timeZone}|${language}|${interests.join(',')}`

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
      perSection: PER_SECTION_TARGET,
      summary: summarize(items, dayLabel, true, interests),
      generatedAt: new Date().toISOString(),
    }
  }

  const sections = await Promise.all(
    interests.map((interest) => loadInterestSection(interest, language, timeZone, day)),
  )

  let items = sections.flat()
  let demo = false

  // If a section is thin, top up from demo for that interest only.
  if (items.length === 0) {
    items = demoItems(interests, day)
    demo = true
  } else {
    const topped: NewsItem[] = []
    for (let i = 0; i < interests.length; i++) {
      const interest = interests[i]
      let section = sections[i] || []
      if (section.length < PER_SECTION_MIN) {
        const fillers = demoItems([interest], day).filter(
          (d) => !section.some((s) => s.title.toLowerCase() === d.title.toLowerCase()),
        )
        section = [...section, ...fillers].slice(0, PER_SECTION_TARGET)
        if (section.some((s) => s.id.startsWith('demo_'))) demo = true
      }
      topped.push(...section)
    }
    items = topped
  }

  const data: YesterdayNewsDigest = {
    demo,
    day,
    dayLabel,
    timeZone,
    interests,
    items,
    perSection: PER_SECTION_TARGET,
    summary: summarize(items, dayLabel, demo, interests),
    generatedAt: new Date().toISOString(),
  }
  cache.set(cacheKey, { at: Date.now(), data })
  return data
}
