/** Curated aliases + search hits for Invest (names → Yahoo/Coinbase tickers). */

export type InvestCatalogKind = 'stock' | 'etf' | 'crypto' | 'metal' | 'other'

export type InvestCatalogHit = {
  symbol: string
  name: string
  kind: InvestCatalogKind
  /** Lowercase query aliases that should surface this hit. */
  aliases: string[]
}

export const INVEST_CATALOG: InvestCatalogHit[] = [
  {
    symbol: 'GC=F',
    name: 'Gold Futures',
    kind: 'metal',
    aliases: ['gold', 'xau', 'xauusd', 'золото', 'золота'],
  },
  {
    symbol: 'GLD',
    name: 'SPDR Gold Shares',
    kind: 'etf',
    aliases: ['gold etf', 'gld', 'spdr gold'],
  },
  {
    symbol: 'SI=F',
    name: 'Silver Futures',
    kind: 'metal',
    aliases: ['silver', 'xag', 'xagusd', 'серебро'],
  },
  {
    symbol: 'SLV',
    name: 'iShares Silver Trust',
    kind: 'etf',
    aliases: ['silver etf', 'slv'],
  },
  {
    symbol: 'CL=F',
    name: 'Crude Oil Futures',
    kind: 'other',
    aliases: ['oil', 'crude', 'wti', 'нефть'],
  },
  {
    symbol: 'BTC-USD',
    name: 'Bitcoin',
    kind: 'crypto',
    aliases: ['bitcoin', 'btc', 'биткоин', 'биткойн'],
  },
  {
    symbol: 'ETH-USD',
    name: 'Ethereum',
    kind: 'crypto',
    aliases: ['ethereum', 'eth', 'ether', 'эфир', 'эфириум'],
  },
  {
    symbol: 'SOL-USD',
    name: 'Solana',
    kind: 'crypto',
    aliases: ['solana', 'sol'],
  },
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    kind: 'stock',
    aliases: ['apple', 'эппл'],
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft',
    kind: 'stock',
    aliases: ['microsoft', 'майкрософт'],
  },
  {
    symbol: 'NVDA',
    name: 'NVIDIA',
    kind: 'stock',
    aliases: ['nvidia', 'нвидиа'],
  },
  {
    symbol: 'TSLA',
    name: 'Tesla',
    kind: 'stock',
    aliases: ['tesla', 'тесла'],
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet',
    kind: 'stock',
    aliases: ['google', 'alphabet', 'гугл'],
  },
  {
    symbol: 'AMZN',
    name: 'Amazon',
    kind: 'stock',
    aliases: ['amazon', 'амазон'],
  },
  {
    symbol: 'META',
    name: 'Meta Platforms',
    kind: 'stock',
    aliases: ['meta', 'facebook', 'фейсбук'],
  },
  {
    symbol: 'SPY',
    name: 'SPDR S&P 500 ETF',
    kind: 'etf',
    aliases: ['spy', 's&p', 's&p 500', 'sp500'],
  },
  {
    symbol: 'VOO',
    name: 'Vanguard S&P 500 ETF',
    kind: 'etf',
    aliases: ['voo', 'vanguard'],
  },
  {
    symbol: 'QQQ',
    name: 'Invesco QQQ',
    kind: 'etf',
    aliases: ['qqq', 'nasdaq'],
  },
]

/** Map free-text / nickname → canonical ticker for quotes. */
export const SYMBOL_ALIASES: Record<string, string> = {
  GOLD: 'GC=F',
  XAU: 'GC=F',
  XAUUSD: 'GC=F',
  'XAUUSD=X': 'GC=F',
  ЗОЛОТО: 'GC=F',
  SILVER: 'SI=F',
  XAG: 'SI=F',
  XAGUSD: 'SI=F',
  СЕРЕБРО: 'SI=F',
  OIL: 'CL=F',
  CRUDE: 'CL=F',
  WTI: 'CL=F',
  НЕФТЬ: 'CL=F',
  BITCOIN: 'BTC-USD',
  BTC: 'BTC-USD',
  ETHEREUM: 'ETH-USD',
  ETH: 'ETH-USD',
  ETHER: 'ETH-USD',
  SOLANA: 'SOL-USD',
  SOL: 'SOL-USD',
  DOGE: 'DOGE-USD',
  DOGECOIN: 'DOGE-USD',
  XRP: 'XRP-USD',
  APPLE: 'AAPL',
  MICROSOFT: 'MSFT',
  NVIDIA: 'NVDA',
  TESLA: 'TSLA',
  GOOGLE: 'GOOGL',
  ALPHABET: 'GOOGL',
  AMAZON: 'AMZN',
  FACEBOOK: 'META',
}

export function resolveInvestSymbol(raw: string): string {
  let s = raw.trim().toUpperCase().replace(/\s+/g, '')
  if (!s) return ''
  if (SYMBOL_ALIASES[s]) return SYMBOL_ALIASES[s]
  return s
}

export function searchCatalog(query: string, limit = 8): InvestCatalogHit[] {
  const q = query.trim().toLowerCase()
  if (!q) return INVEST_CATALOG.slice(0, limit)

  const scored = INVEST_CATALOG.map((hit) => {
    const sym = hit.symbol.toLowerCase()
    const name = hit.name.toLowerCase()
    let score = 0
    if (sym === q || hit.aliases.includes(q)) score = 100
    else if (sym.startsWith(q)) score = 80
    else if (hit.aliases.some((a) => a.startsWith(q))) score = 70
    else if (name.includes(q)) score = 50
    else if (hit.aliases.some((a) => a.includes(q))) score = 40
    else if (sym.includes(q)) score = 30
    return { hit, score }
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, limit).map((x) => x.hit)
}
