import type { NewsInterest, NewsItem, YesterdayNewsDigest } from '../types'
import { defaultNewsInterests, normalizeNewsInterests } from '../types'
import { apiUrl } from './api'
import { deviceTimeZone } from './localDate'

const PER_SECTION = 8

/** Direct publisher RSS — same set the server uses. */
const FEEDS: Record<NewsInterest, { url: string; source: string }[]> = {
  world: [
    { url: 'https://feeds.bbci.co.uk/news/world/rss.xml', source: 'BBC' },
    { url: 'https://www.theguardian.com/world/rss', source: 'The Guardian' },
    { url: 'https://feeds.npr.org/1004/rss.xml', source: 'NPR' },
  ],
  tech: [
    { url: 'https://feeds.bbci.co.uk/news/technology/rss.xml', source: 'BBC' },
    { url: 'https://www.theguardian.com/technology/rss', source: 'The Guardian' },
    { url: 'https://feeds.npr.org/1019/rss.xml', source: 'NPR' },
  ],
  business: [
    { url: 'https://feeds.bbci.co.uk/news/business/rss.xml', source: 'BBC' },
    { url: 'https://www.theguardian.com/business/rss', source: 'The Guardian' },
    { url: 'https://feeds.npr.org/1006/rss.xml', source: 'NPR' },
  ],
  science: [
    { url: 'https://feeds.bbci.co.uk/news/science_and_environment/rss.xml', source: 'BBC' },
    { url: 'https://www.theguardian.com/science/rss', source: 'The Guardian' },
    { url: 'https://feeds.npr.org/1007/rss.xml', source: 'NPR' },
  ],
  sports: [
    { url: 'https://feeds.bbci.co.uk/sport/rss.xml', source: 'BBC' },
    { url: 'https://www.theguardian.com/sport/rss', source: 'The Guardian' },
  ],
  culture: [
    { url: 'https://feeds.bbci.co.uk/news/entertainment_and_arts/rss.xml', source: 'BBC' },
    { url: 'https://www.theguardian.com/culture/rss', source: 'The Guardian' },
    { url: 'https://feeds.npr.org/1008/rss.xml', source: 'NPR' },
  ],
  health: [
    { url: 'https://feeds.bbci.co.uk/news/health/rss.xml', source: 'BBC' },
    { url: 'https://www.theguardian.com/society/health/rss', source: 'The Guardian' },
    { url: 'https://feeds.npr.org/1128/rss.xml', source: 'NPR' },
  ],
}

export async function fetchYesterdayNews(params: {
  interests: NewsInterest[]
  language?: string
  demo?: boolean
  refresh?: boolean
  timeZone?: string
}): Promise<YesterdayNewsDigest> {
  const interests = normalizeNewsInterests(params.interests)
  const timeZone = params.timeZone || deviceTimeZone()
  const language = params.language || 'en'

  if (!params.demo) {
    try {
      const q = new URLSearchParams({
        interests: interests.join(','),
        timezone: timeZone,
        lang: language,
      })
      if (params.refresh) q.set('refresh', '1')
      const res = await fetch(`${apiUrl}/api/news/yesterday?${q.toString()}`)
      if (res.ok) {
        const data = (await res.json()) as YesterdayNewsDigest
        const items = (Array.isArray(data.items) ? data.items : [])
          .map(normalizeItem)
          .filter((x): x is NewsItem => Boolean(x))
        if (items.length) {
          return {
            ...data,
            interests: normalizeNewsInterests(data.interests),
            items,
            perSection: data.perSection || PER_SECTION,
          }
        }
      }
    } catch {
      // fall through to live RSS
    }
  }

  return fetchLiveRssDigest(interests, language, timeZone)
}

function normalizeItem(raw: Partial<NewsItem> & { url?: string; title?: string }): NewsItem | null {
  const title = (raw.title || '').trim()
  const url = cleanArticleUrl((raw.url || '').trim())
  if (!title || !isArticleUrl(url)) return null
  return {
    id: raw.id || hashId(`${raw.interest || 'world'}|${url}|${title}`),
    title: title.slice(0, 200),
    url,
    source: (raw.source || 'News').trim() || 'News',
    interest: (raw.interest as NewsInterest) || 'world',
    publishedAt: raw.publishedAt || new Date().toISOString(),
  }
}

function cleanArticleUrl(url: string): string {
  try {
    const u = new URL(url)
    if (!/^https?:$/i.test(u.protocol)) return ''
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
    return ''
  }
}

function isArticleUrl(url: string): boolean {
  if (!url) return false
  try {
    const u = new URL(url)
    if (u.hostname.includes('news.google.')) return false
    if (u.hostname.includes('google.') && u.pathname.includes('/search')) return false
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
      'search',
    ])
    if (parts.length <= 2 && sectionRoots.has(last)) return false
    return true
  } catch {
    return false
  }
}

function hashId(seed: string): string {
  let h = 0
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0
  return `n_${Math.abs(h).toString(36)}`
}

function yesterdayISO(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(new Date())
    const y = parts.find((p) => p.type === 'year')?.value
    const m = parts.find((p) => p.type === 'month')?.value
    const d = parts.find((p) => p.type === 'day')?.value
    if (y && m && d) {
      const dt = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))
      dt.setUTCDate(dt.getUTCDate() - 1)
      return dt.toISOString().slice(0, 10)
    }
  } catch {
    // fall through
  }
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

function dayLabelFor(iso: string, timeZone: string, language: string): string {
  try {
    return new Date(`${iso}T12:00:00`).toLocaleDateString(language, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone,
    })
  } catch {
    return iso
  }
}

type Rss2JsonItem = {
  title?: string
  link?: string
  pubDate?: string
  guid?: string
}

async function fetchFeedItems(
  feed: { url: string; source: string },
  interest: NewsInterest,
): Promise<NewsItem[]> {
  const endpoints = [
    `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feed.url)}&count=12`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(feed.url)}`,
  ]

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint)
      if (!res.ok) continue
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('json') || endpoint.includes('rss2json')) {
        const data = (await res.json()) as {
          status?: string
          items?: Rss2JsonItem[]
          contents?: string
        }
        if (Array.isArray(data.items) && data.items.length) {
          return data.items
            .map((raw) =>
              normalizeItem({
                title: raw.title,
                url: raw.link || raw.guid,
                source: feed.source,
                interest,
                publishedAt: raw.pubDate ? new Date(raw.pubDate).toISOString() : undefined,
              }),
            )
            .filter((x): x is NewsItem => Boolean(x))
        }
        if (typeof data.contents === 'string') {
          return parseRssXml(data.contents, feed.source, interest)
        }
      } else {
        const xml = await res.text()
        return parseRssXml(xml, feed.source, interest)
      }
    } catch {
      // try next endpoint
    }
  }
  return []
}

function parseRssXml(xml: string, source: string, interest: NewsInterest): NewsItem[] {
  const blocks =
    xml.match(/<item[\s\S]*?<\/item>/gi) || xml.match(/<entry[\s\S]*?<\/entry>/gi) || []
  const out: NewsItem[] = []
  for (const block of blocks) {
    const title = stripTags(block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '')
    const link = stripTags(
      block.match(/<link[^>]*href=["']([^"']+)["'][^>]*\/?>/i)?.[1] ||
        block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ||
        block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i)?.[1] ||
        '',
    )
    const pubDate = stripTags(
      block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i)?.[1] ||
        block.match(/<updated[^>]*>([\s\S]*?)<\/updated>/i)?.[1] ||
        '',
    )
    const item = normalizeItem({
      title,
      url: link,
      source,
      interest,
      publishedAt: pubDate ? new Date(pubDate).toISOString() : undefined,
    })
    if (item) out.push(item)
  }
  return out
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

async function fetchLiveRssDigest(
  interests: NewsInterest[],
  language: string,
  timeZone: string,
): Promise<YesterdayNewsDigest> {
  const day = yesterdayISO(timeZone)
  const dayLabel = dayLabelFor(day, timeZone, language)
  const list = interests.length ? interests : defaultNewsInterests()

  const sections = await Promise.all(
    list.map(async (interest) => {
      const feeds = FEEDS[interest] || []
      const batches = await Promise.all(feeds.map((f) => fetchFeedItems(f, interest)))
      const merged: NewsItem[] = []
      const seen = new Set<string>()
      const queues = batches.map((b) => [...b])
      let guard = 0
      while (merged.length < PER_SECTION && guard < 80) {
        guard++
        let added = false
        for (const q of queues) {
          while (q.length) {
            const item = q.shift()!
            const key = item.title.toLowerCase().replace(/\s+/g, ' ').slice(0, 90)
            if (seen.has(key) || seen.has(item.url)) continue
            seen.add(key)
            seen.add(item.url)
            merged.push(item)
            added = true
            break
          }
        }
        if (!added) break
      }
      return merged.slice(0, PER_SECTION)
    }),
  )

  const items = sections.flat()
  const parts = list.map((k) => `${k} ${items.filter((i) => i.interest === k).length}`)

  return {
    demo: false,
    day,
    dayLabel,
    timeZone,
    interests: list,
    items,
    perSection: PER_SECTION,
    summary: items.length
      ? `${items.length} top stories · ${dayLabel} · ${parts.join(' · ')}`
      : `No stories yet for ${dayLabel}`,
    generatedAt: new Date().toISOString(),
  }
}
