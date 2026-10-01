import type { NewsInterest, YesterdayNewsDigest } from '../types'
import { defaultNewsInterests, normalizeNewsInterests } from '../types'
import { apiUrl } from './api'
import { deviceTimeZone } from './localDate'

const PER_SECTION = 8

export async function fetchYesterdayNews(params: {
  interests: NewsInterest[]
  language?: string
  demo?: boolean
  refresh?: boolean
  timeZone?: string
}): Promise<YesterdayNewsDigest> {
  const interests = normalizeNewsInterests(params.interests)
  const q = new URLSearchParams({
    interests: interests.join(','),
    timezone: params.timeZone || deviceTimeZone(),
    lang: params.language || 'en',
  })
  if (params.demo) q.set('demo', '1')
  if (params.refresh) q.set('refresh', '1')

  try {
    const res = await fetch(`${apiUrl}/api/news/yesterday?${q.toString()}`)
    if (!res.ok) throw new Error(`news ${res.status}`)
    const data = (await res.json()) as YesterdayNewsDigest
    const items = (Array.isArray(data.items) ? data.items : []).map((item, idx) => ({
      ...item,
      url: uniqueStoryUrl(item.url, item.title, item.source, item.id || String(idx)),
    }))
    return {
      ...data,
      interests: normalizeNewsInterests(data.interests),
      items,
      perSection: data.perSection || PER_SECTION,
    }
  } catch {
    return localDemoNews(interests, params.language || 'en', params.timeZone || deviceTimeZone())
  }
}

/** Avoid section homepages / blank links so every row opens a distinct destination. */
function uniqueStoryUrl(url: string, title: string, source: string, id: string): string {
  const cleaned = (url || '').trim()
  if (cleaned && !isSectionHome(cleaned)) return cleaned
  return searchUrlForStory(title, source, id)
}

function isSectionHome(url: string): boolean {
  try {
    const u = new URL(url)
    const path = u.pathname.replace(/\/+$/, '') || '/'
    if (path === '/' || path === '/news' || path === '/news/world') return true
    const parts = path.split('/').filter(Boolean)
    if (parts.length <= 1) return true
    if (parts.length === 2 && ['news', 'world', 'sport', 'sports', 'business', 'technology'].includes(parts[1])) {
      return true
    }
    return false
  } catch {
    return true
  }
}

function searchUrlForStory(title: string, source: string, id: string): string {
  const q = `${title} ${source}`.trim() || id
  const enc = encodeURIComponent(q)
  const host = (source || '').toLowerCase()
  if (host.includes('guardian')) return `https://www.theguardian.com/search?q=${enc}`
  if (host.includes('nyt') || host.includes('new york')) {
    return `https://www.nytimes.com/search?query=${enc}`
  }
  if (host.includes('npr')) return `https://www.npr.org/search?query=${enc}`
  if (host.includes('reuters')) return `https://www.reuters.com/site-search/?query=${enc}`
  if (host.includes('al jazeera')) return `https://www.aljazeera.com/search/${enc}`
  if (host.includes('bbc')) return `https://www.bbc.com/search?q=${enc}`
  return `https://news.google.com/search?q=${enc}&hl=en`
}

function localDemoNews(
  interests: NewsInterest[],
  language: string,
  timeZone: string,
): YesterdayNewsDigest {
  const day = (() => {
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
  })()

  let dayLabel = day
  try {
    dayLabel = new Date(`${day}T12:00:00`).toLocaleDateString(language, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      timeZone,
    })
  } catch {
    // keep iso
  }

  const samples: Record<NewsInterest, { title: string; source: string }[]> = {
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

  const list = interests.length ? interests : defaultNewsInterests()
  const items = list.flatMap((interest) =>
    (samples[interest] || []).slice(0, PER_SECTION).map((row, j) => {
      const id = `local_${interest}_${j}`
      return {
        id,
        title: row.title,
        url: searchUrlForStory(row.title, row.source, id),
        source: row.source,
        interest,
        publishedAt: `${day}T${String(10 + (j % 8)).padStart(2, '0')}:15:00.000Z`,
      }
    }),
  )

  const parts = list.map((k) => `${k} ${items.filter((i) => i.interest === k).length}`)
  return {
    demo: true,
    day,
    dayLabel,
    timeZone,
    interests: list,
    items,
    perSection: PER_SECTION,
    summary: `${items.length} top stories · ${dayLabel} · ${parts.join(' · ')}`,
    generatedAt: new Date().toISOString(),
  }
}
