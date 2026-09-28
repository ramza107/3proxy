/** Top-outlet RSS digest — direct article links only (no Google redirects). */

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
  perSection: number
  summary: string
  generatedAt: string
}

/** Direct article feeds from major outlets — no Google News redirect URLs. */
const PREMIUM_FEEDS: Record<NewsInterest, { url: string; source: string }[]> = {
  world: [
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC' },
    { url: 'https://www.theguardian.com/world/rss', source: 'The Guardian' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', source: 'NYT' },
    { url: 'https://feeds.npr.org/1004/rss.xml', source: 'NPR' },
    { url: 'https://www.aljazeera.com/xml/rss/all.xml', source: 'Al Jazeera' },
    { url: 'https://rss.dw.com/rdf/rss-en-world', source: 'DW' },
    { url: 'https://www.france24.com/en/rss', source: 'France 24' },
    { url: 'https://feeds.skynews.com/feeds/rss/world.xml', source: 'Sky News' },
  ],
  tech: [
    { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', source: 'BBC' },
    { url: 'https://www.theguardian.com/technology/rss', source: 'The Guardian' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml', source: 'NYT' },
    { url: 'https://feeds.npr.org/1019/rss.xml', source: 'NPR' },
  ],
  business: [
    { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', source: 'BBC' },
    { url: 'https://www.theguardian.com/business/rss', source: 'The Guardian' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml', source: 'NYT' },
    { url: 'https://feeds.npr.org/1006/rss.xml', source: 'NPR' },
  ],
  science: [
    { url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', source: 'BBC' },
    { url: 'https://www.theguardian.com/science/rss', source: 'The Guardian' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml', source: 'NYT' },
    { url: 'https://feeds.npr.org/1007/rss.xml', source: 'NPR' },
  ],
  sports: [
    { url: 'https://feeds.bbci.co.uk/sport/rss.xml', source: 'BBC' },
    { url: 'https://www.theguardian.com/sport/rss', source: 'The Guardian' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Sports.xml', source: 'NYT' },
    { url: 'https://feeds.skynews.com/feeds/rss/sports.xml', source: 'Sky News' },
  ],
  culture: [
    { url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', source: 'BBC' },
    { url: 'https://www.theguardian.com/culture/rss', source: 'The Guardian' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Arts.xml', source: 'NYT' },
    { url: 'https://feeds.npr.org/1008/rss.xml', source: 'NPR' },
  ],
  health: [
    { url: 'https://feeds.bbci.co.uk/news/health/rss.xml', source: 'BBC' },
    { url: 'https://www.theguardian.com/society/health/rss', source: 'The Guardian' },
    { url: 'https://rss.nytimes.com/services/xml/rss/nyt/Health.xml', source: 'NYT' },
    { url: 'https://feeds.npr.org/1128/rss.xml', source: 'NPR' },
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

type RawItem = { title: string; link: string; pubDate: string }

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
    const cleanTitle = stripTags(title)
    const cleanLink = stripTags(link)
    if (!cleanTitle || !cleanLink) continue
    if (/^Google News$/i.test(cleanTitle)) continue
    items.push({
      title: cleanTitle.slice(0, 200),
      link: cleanLink,
      pubDate: stripTags(pubDate),
    })
  }
  return items
}

/** Strip tracking junk; keep a clean publisher URL. */
export function cleanArticleUrl(url: string): string {
  try {
    const u = new URL(url)
    for (const key of [...u.searchParams.keys()]) {
      if (/^(utm_|at_|maca|traffic_source|oc$|CMP|ns_)/i.test(key)) {
        u.searchParams.delete(key)
      }
    }
    u.hash = ''
    let out = u.toString()
    if (out.endsWith('?')) out = out.slice(0, -1)
    return out
  } catch {
    return url
  }
}

/** Reject section homepages / Google redirects / non-article URLs. */
export function isArticleUrl(url: string): boolean {
  try {
    const u = new URL(url)
    if (u.hostname.includes('news.google.')) return false
    const parts = u.pathname.replace(/\/+$/, '').split('/').filter(Boolean)
    if (parts.length < 2) return false
    const last = parts[parts.length - 1].toLowerCase()
    const sectionRoots = new Set([
      'world',
      'technology',
      'business',
      'sport',
      'sports',
      'health',
      'science',
      'culture',
      'arts',
      'news',
      'index.html',
      'index',
      'english',
    ])
    if (parts.length <= 2 && sectionRoots.has(last)) return false
    return true
  } catch {
    return false
  }
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
        'Mozilla/5.0 (compatible; WahrlyNews/1.2; +https://wahrly.app) AppleWebKit/537.36',
      Accept: 'application/rss+xml, application/xml, text/xml, */*',
    },
    signal: AbortSignal.timeout(9000),
  })
  if (!res.ok) throw new Error(`feed ${res.status}`)
  return res.text()
}

function cleanTitle(title: string, source: string): string {
  let out = title.trim()
  const suffixes = [
    source,
    'BBC News',
    'BBC Sport',
    'The Guardian',
    'NPR',
    'NYT',
    'Al Jazeera',
    'Sky News',
    'France 24',
    'DW',
  ]
  for (const s of suffixes) {
    const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    out = out.replace(new RegExp(`\\s*[-–—|]\\s*${escaped}\\s*$`, 'i'), '')
  }
  return out.slice(0, 200)
}

function demoItems(interests: NewsInterest[], day: string): NewsItem[] {
  const catalog: Record<NewsInterest, { title: string; source: string; path: string }[]> = {
    world: [
      {
        title: 'Leaders meet on ceasefire talks after overnight developments',
        source: 'BBC',
        path: 'https://www.bbc.com/news/articles/cge2k1example',
      },
      {
        title: 'Storms disrupt travel across several regions',
        source: 'The Guardian',
        path: 'https://www.theguardian.com/world/2026/sep/27/storms-travel',
      },
      {
        title: 'European capitals weigh energy security options',
        source: 'NYT',
        path: 'https://www.nytimes.com/2026/09/27/world/europe/energy.html',
      },
      {
        title: 'Aid corridors open after weekend flooding',
        source: 'NPR',
        path: 'https://www.npr.org/2026/09/27/nx-s1-aid-corridors',
      },
      {
        title: 'Diplomatic talks resume on contested border',
        source: 'Al Jazeera',
        path: 'https://www.aljazeera.com/news/2026/9/27/border-talks',
      },
      {
        title: 'Election observers deploy ahead of runoff',
        source: 'DW',
        path: 'https://www.dw.com/en/election-observers-runoff/a-79450001',
      },
      {
        title: 'Flight disruptions ease after ATC outage',
        source: 'France 24',
        path: 'https://www.france24.com/en/20260927-flight-disruptions',
      },
      {
        title: 'Maritime corridor reopens under escort rules',
        source: 'Sky News',
        path: 'https://news.sky.com/story/maritime-corridor-reopens-13592001',
      },
    ],
    tech: [
      {
        title: 'Chipmakers outline next-gen AI accelerator plans',
        source: 'BBC',
        path: 'https://www.bbc.com/news/articles/cge2k1tech1',
      },
      {
        title: 'Cloud outage traced to cascading DNS failure',
        source: 'The Guardian',
        path: 'https://www.theguardian.com/technology/2026/sep/27/cloud-outage',
      },
      {
        title: 'Regulators examine app-store billing rules',
        source: 'NYT',
        path: 'https://www.nytimes.com/2026/09/27/technology/app-store.html',
      },
      {
        title: 'Open-source model release reshapes enterprise AI race',
        source: 'NPR',
        path: 'https://www.npr.org/2026/09/27/nx-s1-opensource-ai',
      },
      {
        title: 'Browser makers tighten third-party cookie defaults',
        source: 'BBC',
        path: 'https://www.bbc.com/news/articles/cge2k1tech2',
      },
      {
        title: 'Cyber agencies warn of new ransomware campaign',
        source: 'The Guardian',
        path: 'https://www.theguardian.com/technology/2026/sep/27/ransomware',
      },
      {
        title: 'Satellite broadband expands to remote stations',
        source: 'NYT',
        path: 'https://www.nytimes.com/2026/09/27/technology/satellite.html',
      },
      {
        title: 'Phone makers cut midrange prices after soft quarter',
        source: 'NPR',
        path: 'https://www.npr.org/2026/09/27/nx-s1-phones',
      },
    ],
    business: [
      {
        title: 'Markets close mixed as energy prices ease',
        source: 'BBC',
        path: 'https://www.bbc.com/news/articles/cge2k1biz1',
      },
      {
        title: 'Central banks signal patience on further cuts',
        source: 'The Guardian',
        path: 'https://www.theguardian.com/business/2026/sep/27/central-banks',
      },
      {
        title: 'Retail sales beat forecasts in overnight data',
        source: 'NYT',
        path: 'https://www.nytimes.com/2026/09/27/business/retail.html',
      },
      {
        title: 'Shipping rates climb after route disruptions',
        source: 'NPR',
        path: 'https://www.npr.org/2026/09/27/nx-s1-shipping',
      },
      {
        title: 'Auto makers revise EV timelines amid softer demand',
        source: 'BBC',
        path: 'https://www.bbc.com/news/articles/cge2k1biz2',
      },
      {
        title: 'Bank stress tests show stronger capital buffers',
        source: 'The Guardian',
        path: 'https://www.theguardian.com/business/2026/sep/27/banks',
      },
      {
        title: 'IPO window reopens with two mid-cap listings',
        source: 'NYT',
        path: 'https://www.nytimes.com/2026/09/27/business/ipo.html',
      },
      {
        title: 'Currency markets watch the dollar after jobs data',
        source: 'NPR',
        path: 'https://www.npr.org/2026/09/27/nx-s1-dollar',
      },
    ],
    science: [
      {
        title: 'Researchers map deep-ocean currents with new floats',
        source: 'BBC',
        path: 'https://www.bbc.com/news/articles/cge2k1sci1',
      },
      {
        title: 'Mars rover finds clues of ancient groundwater',
        source: 'The Guardian',
        path: 'https://www.theguardian.com/science/2026/sep/27/mars',
      },
      {
        title: 'Climate study revises wildfire smoke estimates',
        source: 'NYT',
        path: 'https://www.nytimes.com/2026/09/27/science/wildfire.html',
      },
      {
        title: 'Gene therapy trial reports durable gains',
        source: 'NPR',
        path: 'https://www.npr.org/2026/09/27/nx-s1-gene',
      },
      {
        title: 'Astronomers spot bright early-universe galaxy',
        source: 'BBC',
        path: 'https://www.bbc.com/news/articles/cge2k1sci2',
      },
      {
        title: 'Lab-grown meat clears another regulatory step',
        source: 'The Guardian',
        path: 'https://www.theguardian.com/science/2026/sep/27/lab-meat',
      },
      {
        title: 'Earthquake early-warning network expands',
        source: 'NYT',
        path: 'https://www.nytimes.com/2026/09/27/science/earthquake.html',
      },
      {
        title: 'Ancient DNA sequenced from alpine ice core',
        source: 'NPR',
        path: 'https://www.npr.org/2026/09/27/nx-s1-dna',
      },
    ],
    sports: [
      {
        title: 'Underdogs force replay after late equalizer',
        source: 'BBC',
        path: 'https://www.bbc.com/sport/articles/cge2k1sp1',
      },
      {
        title: 'Grand slam final set after overnight semis',
        source: 'The Guardian',
        path: 'https://www.theguardian.com/sport/2026/sep/27/final',
      },
      {
        title: 'Transfer window closes with record midfield deal',
        source: 'NYT',
        path: 'https://www.nytimes.com/2026/09/27/sports/transfer.html',
      },
      {
        title: 'Olympic qualifiers reshuffled after weather delay',
        source: 'Sky News',
        path: 'https://news.sky.com/story/olympic-qualifiers-13592002',
      },
      {
        title: 'Season opener draws attendance record',
        source: 'BBC',
        path: 'https://www.bbc.com/sport/articles/cge2k1sp2',
      },
      {
        title: 'Stewards clear contested overnight penalty',
        source: 'The Guardian',
        path: 'https://www.theguardian.com/sport/2026/sep/27/stewards',
      },
      {
        title: 'Warm-up cancelled due to travel chaos',
        source: 'NYT',
        path: 'https://www.nytimes.com/2026/09/27/sports/warmup.html',
      },
      {
        title: 'Marathon course record falls in cool conditions',
        source: 'Sky News',
        path: 'https://news.sky.com/story/marathon-record-13592003',
      },
    ],
    culture: [
      {
        title: 'Festival lineup highlights emerging directors',
        source: 'BBC',
        path: 'https://www.bbc.com/news/articles/cge2k1cul1',
      },
      {
        title: 'Streaming drama draws record first-week viewers',
        source: 'The Guardian',
        path: 'https://www.theguardian.com/culture/2026/sep/27/streaming',
      },
      {
        title: 'Museum recovers looted bronze after decades',
        source: 'NYT',
        path: 'https://www.nytimes.com/2026/09/27/arts/museum.html',
      },
      {
        title: 'Prize longlist mixes debut novelists and veterans',
        source: 'NPR',
        path: 'https://www.npr.org/2026/09/27/nx-s1-prize',
      },
      {
        title: 'Revival opens to standing ovations',
        source: 'BBC',
        path: 'https://www.bbc.com/news/articles/cge2k1cul2',
      },
      {
        title: 'Festival expands free outdoor stages',
        source: 'The Guardian',
        path: 'https://www.theguardian.com/culture/2026/sep/27/festival',
      },
      {
        title: 'Photo archive of the 1970s goes on display',
        source: 'NYT',
        path: 'https://www.nytimes.com/2026/09/27/arts/photos.html',
      },
      {
        title: 'Orchestra announces world premiere season',
        source: 'NPR',
        path: 'https://www.npr.org/2026/09/27/nx-s1-orchestra',
      },
    ],
    health: [
      {
        title: 'WHO updates guidance on seasonal vaccines',
        source: 'BBC',
        path: 'https://www.bbc.com/news/articles/cge2k1hlt1',
      },
      {
        title: 'Study links desk work to sleep disruption',
        source: 'The Guardian',
        path: 'https://www.theguardian.com/society/2026/sep/27/sleep',
      },
      {
        title: 'Hospitals report steadier ER demand',
        source: 'NYT',
        path: 'https://www.nytimes.com/2026/09/27/health/er.html',
      },
      {
        title: 'New oral antiviral clears mid-stage trial goals',
        source: 'NPR',
        path: 'https://www.npr.org/2026/09/27/nx-s1-antiviral',
      },
      {
        title: 'Clinics expand same-week primary care slots',
        source: 'BBC',
        path: 'https://www.bbc.com/news/articles/cge2k1hlt2',
      },
      {
        title: 'Agencies revise ultraprocessed food advice',
        source: 'The Guardian',
        path: 'https://www.theguardian.com/society/2026/sep/27/food',
      },
      {
        title: 'Hotlines add overnight multilingual lines',
        source: 'NYT',
        path: 'https://www.nytimes.com/2026/09/27/health/hotlines.html',
      },
      {
        title: 'Wearables publish heart-rhythm accuracy study',
        source: 'NPR',
        path: 'https://www.npr.org/2026/09/27/nx-s1-wearables',
      },
    ],
  }

  const out: NewsItem[] = []
  for (const interest of interests) {
    const rows = catalog[interest] || []
    rows.slice(0, PER_SECTION_TARGET).forEach((row, j) => {
      out.push({
        id: `demo_${interest}_${j}`,
        title: row.title,
        url: row.path,
        source: row.source,
        interest,
        publishedAt: `${day}T${String(10 + (j % 8)).padStart(2, '0')}:15:00.000Z`,
      })
    })
  }
  return out
}

function summarize(
  items: NewsItem[],
  dayLabel: string,
  demo: boolean,
  interests: NewsInterest[],
): string {
  if (!items.length) {
    return demo
      ? `Quiet preview for ${dayLabel} — pick interests and refresh.`
      : `No clear headlines for ${dayLabel} in your interests yet.`
  }
  const parts = interests
    .map((k) => {
      const n = items.filter((i) => i.interest === k).length
      return n ? `${k} ${n}` : null
    })
    .filter(Boolean)
  return `${items.length} top stories · ${dayLabel} · ${parts.join(' · ')}`
}

async function fetchUrlItems(
  feed: { url: string; source: string },
  interest: NewsInterest,
  day: string,
): Promise<NewsItem[]> {
  try {
    const xml = await fetchFeed(feed.url)
    return parseRssItems(xml)
      .map((raw) => {
        const cleaned = cleanArticleUrl(raw.link)
        if (!isArticleUrl(cleaned)) return null
        const ts = Date.parse(raw.pubDate)
        const title = cleanTitle(raw.title, feed.source)
        const idSeed = `${interest}|${cleaned}|${title}`
        return {
          id: `${interest}_${createHash('sha1').update(idSeed).digest('hex').slice(0, 12)}`,
          title,
          url: cleaned,
          source: feed.source,
          interest,
          publishedAt: Number.isFinite(ts) ? new Date(ts).toISOString() : `${day}T12:00:00.000Z`,
        } satisfies NewsItem
      })
      .filter((x): x is NewsItem => Boolean(x))
  } catch {
    return []
  }
}

async function loadInterestSection(
  interest: NewsInterest,
  _lang: string,
  timeZone: string,
  day: string,
): Promise<NewsItem[]> {
  const feeds = PREMIUM_FEEDS[interest]
  const batches = await Promise.all(feeds.map((f) => fetchUrlItems(f, interest, day)))

  const merged: NewsItem[] = []
  const seen = new Set<string>()
  // Round-robin across outlets so one source doesn't dominate
  const queues = batches.map((b) => [...b])
  let guard = 0
  while (merged.length < PER_SECTION_MAX * 2 && guard < 200) {
    guard++
    let added = false
    for (const q of queues) {
      while (q.length) {
        const item = q.shift()!
        const key = item.title.toLowerCase().replace(/\s+/g, ' ').slice(0, 90)
        if (seen.has(key)) continue
        seen.add(key)
        merged.push(item)
        added = true
        break
      }
    }
    if (!added) break
  }

  const yesterday = merged.filter((i) => zonedISODate(new Date(i.publishedAt), timeZone) === day)
  const recent = merged.filter((i) => zonedISODate(new Date(i.publishedAt), timeZone) !== day)
  const ordered = [
    ...yesterday.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    ...recent.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
  ]

  return ordered.slice(0, PER_SECTION_TARGET)
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
  const cacheKey = `v3|${day}|${timeZone}|${language}|${interests.join(',')}`

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
