import type { InvestQuote } from '../types'
import { apiUrl } from './api'
import { normalizeInvestSymbol } from './invest'
import { searchLocalCatalog, type InvestSearchHit } from './investCatalog'

/** Curated demo quotes when the AI server is offline. */
const DEMO: Record<string, InvestQuote> = {
  AAPL: {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    price: 330.32,
    currency: 'USD',
    changePct: -0.81,
    kind: 'stock',
    source: 'demo',
    asOf: new Date().toISOString(),
  },
  MSFT: {
    symbol: 'MSFT',
    name: 'Microsoft',
    price: 512.8,
    currency: 'USD',
    changePct: -0.02,
    kind: 'stock',
    source: 'demo',
    asOf: new Date().toISOString(),
  },
  NVDA: {
    symbol: 'NVDA',
    name: 'NVIDIA',
    price: 185.5,
    currency: 'USD',
    changePct: 1.2,
    kind: 'stock',
    source: 'demo',
    asOf: new Date().toISOString(),
  },
  TSLA: {
    symbol: 'TSLA',
    name: 'Tesla',
    price: 248.2,
    currency: 'USD',
    changePct: 0.4,
    kind: 'stock',
    source: 'demo',
    asOf: new Date().toISOString(),
  },
  SPY: {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF',
    price: 575.2,
    currency: 'USD',
    changePct: 0.1,
    kind: 'etf',
    source: 'demo',
    asOf: new Date().toISOString(),
  },
  VOO: {
    symbol: 'VOO',
    name: 'Vanguard S&P 500 ETF',
    price: 528.4,
    currency: 'USD',
    changePct: 0.1,
    kind: 'etf',
    source: 'demo',
    asOf: new Date().toISOString(),
  },
  'BTC-USD': {
    symbol: 'BTC-USD',
    name: 'Bitcoin',
    price: 85200,
    currency: 'USD',
    changePct: null,
    kind: 'crypto',
    source: 'demo',
    asOf: new Date().toISOString(),
  },
  BTC: {
    symbol: 'BTC-USD',
    name: 'Bitcoin',
    price: 85200,
    currency: 'USD',
    changePct: null,
    kind: 'crypto',
    source: 'demo',
    asOf: new Date().toISOString(),
  },
  'ETH-USD': {
    symbol: 'ETH-USD',
    name: 'Ethereum',
    price: 2715,
    currency: 'USD',
    changePct: null,
    kind: 'crypto',
    source: 'demo',
    asOf: new Date().toISOString(),
  },
  ETH: {
    symbol: 'ETH-USD',
    name: 'Ethereum',
    price: 2715,
    currency: 'USD',
    changePct: null,
    kind: 'crypto',
    source: 'demo',
    asOf: new Date().toISOString(),
  },
  'GC=F': {
    symbol: 'GC=F',
    name: 'Gold Futures',
    price: 2350,
    currency: 'USD',
    changePct: 0.4,
    kind: 'metal',
    source: 'demo',
    asOf: new Date().toISOString(),
  },
  GOLD: {
    symbol: 'GC=F',
    name: 'Gold Futures',
    price: 2350,
    currency: 'USD',
    changePct: 0.4,
    kind: 'metal',
    source: 'demo',
    asOf: new Date().toISOString(),
  },
  'SI=F': {
    symbol: 'SI=F',
    name: 'Silver Futures',
    price: 28.5,
    currency: 'USD',
    changePct: -0.2,
    kind: 'metal',
    source: 'demo',
    asOf: new Date().toISOString(),
  },
  GLD: {
    symbol: 'GLD',
    name: 'SPDR Gold Shares',
    price: 215,
    currency: 'USD',
    changePct: 0.3,
    kind: 'etf',
    source: 'demo',
    asOf: new Date().toISOString(),
  },
}

function normalizeSymbol(raw: string) {
  return normalizeInvestSymbol(raw)
}

export async function searchInvestSymbols(query: string): Promise<InvestSearchHit[]> {
  const q = query.trim()
  const local = searchLocalCatalog(q, 8)
  try {
    const params = new URLSearchParams({ q })
    const res = await fetch(`${apiUrl}/api/invest/search?${params.toString()}`)
    if (res.ok) {
      const data = (await res.json()) as { results?: InvestSearchHit[] }
      const remote = Array.isArray(data.results) ? data.results : []
      if (remote.length) return remote
    }
  } catch {
    // offline / server down
  }
  return local
}

async function fetchCoinbaseSpot(symbol: string): Promise<InvestQuote | null> {
  const sym = normalizeSymbol(symbol)
  const metal =
    sym === 'GC=F' || sym === 'GOLD' || sym === 'XAU'
      ? { base: 'XAU', symbol: 'GC=F', name: 'Gold', kind: 'metal' as const }
      : sym === 'SI=F' || sym === 'SILVER' || sym === 'XAG'
        ? { base: 'XAG', symbol: 'SI=F', name: 'Silver', kind: 'metal' as const }
        : null
  if (metal) {
    try {
      const res = await fetch(`https://api.coinbase.com/v2/prices/${metal.base}-USD/spot`)
      if (!res.ok) return null
      const json = (await res.json()) as { data?: { amount?: string } }
      const price = Number(json?.data?.amount)
      if (!Number.isFinite(price) || price <= 0) return null
      return {
        symbol: metal.symbol,
        name: metal.name,
        price,
        currency: 'USD',
        changePct: null,
        kind: metal.kind,
        source: 'coinbase',
        asOf: new Date().toISOString(),
      }
    } catch {
      return null
    }
  }
  const base = sym.replace('-USD', '').replace('USDT', '')
  if (!['BTC', 'ETH', 'SOL', 'DOGE', 'XRP', 'ADA', 'AVAX', 'LINK'].includes(base)) {
    return null
  }
  try {
    const res = await fetch(`https://api.coinbase.com/v2/prices/${base}-USD/spot`)
    if (!res.ok) return null
    const json = (await res.json()) as { data?: { amount?: string } }
    const price = Number(json?.data?.amount)
    if (!Number.isFinite(price) || price <= 0) return null
    return {
      symbol: `${base}-USD`,
      name: base === 'BTC' ? 'Bitcoin' : base === 'ETH' ? 'Ethereum' : base,
      price,
      currency: 'USD',
      changePct: null,
      kind: 'crypto',
      source: 'coinbase',
      asOf: new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export async function fetchInvestQuotes(symbols: string[]): Promise<{
  quotes: InvestQuote[]
  demo: boolean
}> {
  const unique = [...new Set(symbols.map(normalizeSymbol).filter(Boolean))].slice(0, 40)
  if (!unique.length) return { quotes: [], demo: false }

  try {
    const q = new URLSearchParams({ symbols: unique.join(',') })
    const res = await fetch(`${apiUrl}/api/invest/quotes?${q.toString()}`)
    if (res.ok) {
      const data = (await res.json()) as { quotes?: InvestQuote[]; demo?: boolean }
      const quotes = Array.isArray(data.quotes) ? data.quotes : []
      if (quotes.length) {
        return { quotes, demo: Boolean(data.demo) }
      }
    }
  } catch {
    // fall through
  }

  // Client fallbacks: Coinbase crypto + curated demo
  const quotes: InvestQuote[] = []
  let demo = false
  await Promise.all(
    unique.map(async (sym) => {
      const crypto = await fetchCoinbaseSpot(sym)
      if (crypto) {
        quotes.push(crypto)
        return
      }
      const d = DEMO[sym] || DEMO[`${sym}-USD`]
      if (d) {
        quotes.push({ ...d, asOf: new Date().toISOString() })
        demo = true
      }
    }),
  )
  return { quotes, demo }
}

export function formatMoney(amount: number, currency = 'USD', digits = 2) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: digits,
      minimumFractionDigits: digits > 0 ? Math.min(2, digits) : 0,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(digits)}`
  }
}

export function formatPct(pct: number) {
  const sign = pct > 0 ? '+' : ''
  return `${sign}${pct.toFixed(2)}%`
}
