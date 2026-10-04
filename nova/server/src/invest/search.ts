import { resolveInvestSymbol, searchCatalog, type InvestCatalogHit } from './catalog.js'

export type InvestSearchResult = {
  symbol: string
  name: string
  kind: InvestCatalogHit['kind']
  source: 'catalog' | 'yahoo'
}

type YahooSearchQuote = {
  symbol?: string
  shortname?: string
  longname?: string
  quoteType?: string
  exchDisp?: string
}

function mapYahooKind(quoteType?: string): InvestCatalogHit['kind'] {
  const t = String(quoteType || '').toUpperCase()
  if (t.includes('ETF')) return 'etf'
  if (t.includes('CRYPTO')) return 'crypto'
  if (t.includes('FUTURE') || t.includes('CURRENCY')) return 'metal'
  return 'stock'
}

async function searchYahoo(query: string, limit = 8): Promise<InvestSearchResult[]> {
  const q = query.trim()
  if (q.length < 1) return []
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(q)}&quotesCount=${limit}&newsCount=0&listsCount=0`
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    })
    if (!res.ok) return []
    const json = (await res.json()) as { quotes?: YahooSearchQuote[] }
    const quotes = Array.isArray(json.quotes) ? json.quotes : []
    return quotes
      .map((row) => {
        const symbol = resolveInvestSymbol(String(row.symbol || ''))
        if (!symbol) return null
        // Skip junk / options chains
        if (symbol.includes('^') && !symbol.includes('=')) return null
        return {
          symbol,
          name: row.shortname || row.longname || symbol,
          kind: mapYahooKind(row.quoteType),
          source: 'yahoo' as const,
        }
      })
      .filter((x): x is InvestSearchResult => Boolean(x))
      .slice(0, limit)
  } catch {
    return []
  }
}

export async function searchInvest(query: string): Promise<InvestSearchResult[]> {
  const q = query.trim()
  if (!q) {
    return searchCatalog('', 8).map((h) => ({
      symbol: h.symbol,
      name: h.name,
      kind: h.kind,
      source: 'catalog' as const,
    }))
  }

  const catalog = searchCatalog(q, 8).map((h) => ({
    symbol: h.symbol,
    name: h.name,
    kind: h.kind,
    source: 'catalog' as const,
  }))

  // Exact alias / short ticker: catalog is enough for gold/bitcoin/etc.
  const exactAlias = resolveInvestSymbol(q)
  const catalogCovers =
    catalog.length > 0 &&
    (catalog.some((h) => h.symbol === exactAlias) ||
      q.length <= 3 ||
      searchCatalog(q, 1)[0]?.aliases.includes(q.toLowerCase()))

  if (catalogCovers && catalog.length >= 3) {
    return catalog.slice(0, 8)
  }

  const yahoo = await searchYahoo(q, 8)
  const seen = new Set(catalog.map((h) => h.symbol.toUpperCase()))
  const merged = [...catalog]
  for (const hit of yahoo) {
    const key = hit.symbol.toUpperCase()
    if (seen.has(key)) continue
    seen.add(key)
    merged.push(hit)
    if (merged.length >= 10) break
  }
  return merged
}
