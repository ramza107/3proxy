/** Market quotes for Invest tab — Yahoo (stocks/ETFs) + Coinbase (crypto). */

export type InvestQuote = {
  symbol: string
  name: string | null
  price: number
  currency: string
  changePct: number | null
  kind: 'stock' | 'etf' | 'crypto' | 'other'
  source: string
  asOf: string
}

const CRYPTO_MAP: Record<string, { base: string; name: string }> = {
  BTC: { base: 'BTC', name: 'Bitcoin' },
  'BTC-USD': { base: 'BTC', name: 'Bitcoin' },
  BITCOIN: { base: 'BTC', name: 'Bitcoin' },
  ETH: { base: 'ETH', name: 'Ethereum' },
  'ETH-USD': { base: 'ETH', name: 'Ethereum' },
  ETHEREUM: { base: 'ETH', name: 'Ethereum' },
  SOL: { base: 'SOL', name: 'Solana' },
  'SOL-USD': { base: 'SOL', name: 'Solana' },
  SOLANA: { base: 'SOL', name: 'Solana' },
  DOGE: { base: 'DOGE', name: 'Dogecoin' },
  'DOGE-USD': { base: 'DOGE', name: 'Dogecoin' },
  XRP: { base: 'XRP', name: 'XRP' },
  'XRP-USD': { base: 'XRP', name: 'XRP' },
}

function normalizeSymbol(raw: string) {
  return raw.trim().toUpperCase().replace(/\s+/g, '')
}

function isCrypto(symbol: string) {
  if (CRYPTO_MAP[symbol]) return true
  if (symbol.endsWith('-USD') && CRYPTO_MAP[symbol.replace('-USD', '')]) return true
  return false
}

async function fetchCrypto(symbol: string): Promise<InvestQuote | null> {
  const key = normalizeSymbol(symbol)
  const mapped =
    CRYPTO_MAP[key] ||
    (key.endsWith('-USD') ? CRYPTO_MAP[key.replace('-USD', '')] : null) ||
    CRYPTO_MAP[`${key}-USD`]
  const base = mapped?.base || key.replace('-USD', '')
  try {
    const res = await fetch(`https://api.coinbase.com/v2/prices/${base}-USD/spot`, {
      headers: { Accept: 'application/json' },
    })
    if (!res.ok) return null
    const json = (await res.json()) as { data?: { amount?: string } }
    const price = Number(json?.data?.amount)
    if (!Number.isFinite(price) || price <= 0) return null
    return {
      symbol: `${base}-USD`,
      name: mapped?.name || base,
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

async function fetchYahoo(symbol: string): Promise<InvestQuote | null> {
  const sym = normalizeSymbol(symbol)
  try {
    const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    })
    if (!res.ok) return null
    const json = (await res.json()) as {
      chart?: {
        result?: Array<{
          meta?: {
            symbol?: string
            shortName?: string
            longName?: string
            currency?: string
            regularMarketPrice?: number
            chartPreviousClose?: number
            previousClose?: number
            instrumentType?: string
          }
        }>
      }
    }
    const meta = json?.chart?.result?.[0]?.meta
    const price = Number(meta?.regularMarketPrice)
    if (!Number.isFinite(price) || price <= 0) return null
    const prev = Number(meta?.previousClose ?? meta?.chartPreviousClose)
    const changePct =
      Number.isFinite(prev) && prev > 0 ? ((price - prev) / prev) * 100 : null
    const instrument = String(meta?.instrumentType || '').toUpperCase()
    const kind: InvestQuote['kind'] =
      instrument.includes('ETF') ? 'etf' : instrument.includes('CRYPTO') ? 'crypto' : 'stock'
    return {
      symbol: meta?.symbol || sym,
      name: meta?.shortName || meta?.longName || null,
      price,
      currency: meta?.currency || 'USD',
      changePct,
      kind,
      source: 'yahoo',
      asOf: new Date().toISOString(),
    }
  } catch {
    return null
  }
}

async function fetchNasdaq(
  symbol: string,
  assetClass: 'stocks' | 'etf' = 'stocks',
): Promise<InvestQuote | null> {
  const sym = normalizeSymbol(symbol)
  try {
    const url = `https://api.nasdaq.com/api/quote/${encodeURIComponent(sym)}/info?assetclass=${assetClass}`
    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
    })
    if (!res.ok) return null
    const json = (await res.json()) as {
      data?: {
        symbol?: string
        companyName?: string
        primaryData?: {
          lastSalePrice?: string
          percentageChange?: string
        } | null
      } | null
    }
    if (!json?.data?.primaryData?.lastSalePrice) return null
    const rawPrice = String(json.data.primaryData.lastSalePrice).replace(/[$,]/g, '')
    const price = Number(rawPrice)
    if (!Number.isFinite(price) || price <= 0) return null
    const pctRaw = String(json.data.primaryData.percentageChange || '').replace(/%/g, '')
    const changePct = Number(pctRaw)
    return {
      symbol: json.data.symbol || sym,
      name: json.data.companyName || null,
      price,
      currency: 'USD',
      changePct: Number.isFinite(changePct) ? changePct : null,
      kind: assetClass === 'etf' ? 'etf' : 'stock',
      source: 'nasdaq',
      asOf: new Date().toISOString(),
    }
  } catch {
    return null
  }
}

/** Demo fallback so the Pro screen always demos for investors. */
const DEMO: Record<string, { price: number; name: string; kind: InvestQuote['kind'] }> = {
  AAPL: { price: 330.32, name: 'Apple Inc.', kind: 'stock' },
  MSFT: { price: 512.8, name: 'Microsoft', kind: 'stock' },
  NVDA: { price: 185.5, name: 'NVIDIA', kind: 'stock' },
  TSLA: { price: 248.2, name: 'Tesla', kind: 'stock' },
  GOOGL: { price: 168.4, name: 'Alphabet', kind: 'stock' },
  AMZN: { price: 192.1, name: 'Amazon', kind: 'stock' },
  META: { price: 575.0, name: 'Meta Platforms', kind: 'stock' },
  SPY: { price: 575.2, name: 'SPDR S&P 500 ETF', kind: 'etf' },
  VOO: { price: 528.4, name: 'Vanguard S&P 500 ETF', kind: 'etf' },
  QQQ: { price: 492.1, name: 'Invesco QQQ', kind: 'etf' },
  'BTC-USD': { price: 85200, name: 'Bitcoin', kind: 'crypto' },
  BTC: { price: 85200, name: 'Bitcoin', kind: 'crypto' },
  'ETH-USD': { price: 2715, name: 'Ethereum', kind: 'crypto' },
  ETH: { price: 2715, name: 'Ethereum', kind: 'crypto' },
}

export async function fetchQuote(symbol: string, allowDemo = true): Promise<InvestQuote | null> {
  const sym = normalizeSymbol(symbol)
  if (!sym) return null

  if (isCrypto(sym) || CRYPTO_MAP[sym] || CRYPTO_MAP[`${sym}-USD`]) {
    const crypto = await fetchCrypto(sym)
    if (crypto) return crypto
  }

  const yahoo = await fetchYahoo(sym)
  if (yahoo) return yahoo

  const nasdaqStock = await fetchNasdaq(sym, 'stocks')
  if (nasdaqStock) return nasdaqStock

  const nasdaqEtf = await fetchNasdaq(sym, 'etf')
  if (nasdaqEtf) return nasdaqEtf

  // Crypto retry if user typed BTC without mapping hit earlier
  const crypto = await fetchCrypto(sym)
  if (crypto) return crypto

  if (allowDemo && DEMO[sym]) {
    const d = DEMO[sym]
    return {
      symbol:
        d.kind === 'crypto'
          ? sym.includes('-')
            ? sym
            : `${sym.replace('-USD', '')}-USD`
          : sym,
      name: d.name,
      price: d.price,
      currency: 'USD',
      changePct: null,
      kind: d.kind,
      source: 'demo',
      asOf: new Date().toISOString(),
    }
  }
  return null
}

export async function fetchQuotes(
  symbols: string[],
  opts?: { demo?: boolean },
): Promise<{ quotes: InvestQuote[]; demo: boolean }> {
  const unique = [...new Set(symbols.map(normalizeSymbol).filter(Boolean))].slice(0, 40)
  const quotes: InvestQuote[] = []
  let usedDemo = false
  await Promise.all(
    unique.map(async (sym) => {
      const q = await fetchQuote(sym, opts?.demo !== false)
      if (q) {
        if (q.source === 'demo') usedDemo = true
        quotes.push(q)
      }
    }),
  )
  return { quotes, demo: usedDemo || Boolean(opts?.demo) }
}
