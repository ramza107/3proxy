import type { NewsInterest, YesterdayNewsDigest } from '../types'
import { defaultNewsInterests, normalizeNewsInterests } from '../types'
import { apiUrl } from './api'
import { deviceTimeZone } from './localDate'

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
    return {
      ...data,
      interests: normalizeNewsInterests(data.interests),
      items: Array.isArray(data.items) ? data.items : [],
    }
  } catch {
    // Offline / server down — local demo so the tab still works.
    return localDemoNews(interests, params.language || 'en', params.timeZone || deviceTimeZone())
  }
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

  const samples: Record<NewsInterest, string[]> = {
    world: ['Overnight talks reshape the week’s diplomatic calendar'],
    tech: ['AI tools ship quieter updates after a busy launch cycle'],
    business: ['Markets digest mixed signals from overnight futures'],
    science: ['Researchers share a clearer picture of weekend storm paths'],
    sports: ['Late scores flip the table before today’s fixtures'],
    culture: ['Festival premieres draw early reviews overnight'],
    health: ['Clinics report steadier appointment demand after the weekend'],
  }

  const list = interests.length ? interests : defaultNewsInterests()
  const items = list.flatMap((interest, i) =>
    (samples[interest] || []).map((title, j) => ({
      id: `local_${interest}_${j}`,
      title,
      url: `https://news.google.com/search?q=${encodeURIComponent(title)}`,
      source: 'Demo',
      interest,
      publishedAt: `${day}T1${i}:30:00.000Z`,
    })),
  )

  return {
    demo: true,
    day,
    dayLabel,
    timeZone,
    interests: list,
    items,
    summary: `${items.length} demo headlines · ${dayLabel}`,
    generatedAt: new Date().toISOString(),
  }
}
