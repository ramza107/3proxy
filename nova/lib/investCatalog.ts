/** Client-side aliases mirroring server catalog (works offline / before search). */

export type InvestCatalogKind = 'stock' | 'etf' | 'crypto' | 'metal' | 'other'

export type InvestSearchHit = {
  symbol: string
  name: string
  kind: InvestCatalogKind
  source?: 'catalog' | 'yahoo'
}

const ALIASES: Record<string, { symbol: string; name: string; kind: InvestCatalogKind }> = {
  GOLD: { symbol: 'GC=F', name: 'Gold Futures', kind: 'metal' },
  XAU: { symbol: 'GC=F', name: 'Gold Futures', kind: 'metal' },
  XAUUSD: { symbol: 'GC=F', name: 'Gold Futures', kind: 'metal' },
  ЗОЛОТО: { symbol: 'GC=F', name: 'Gold Futures', kind: 'metal' },
  SILVER: { symbol: 'SI=F', name: 'Silver Futures', kind: 'metal' },
  XAG: { symbol: 'SI=F', name: 'Silver Futures', kind: 'metal' },
  СЕРЕБРО: { symbol: 'SI=F', name: 'Silver Futures', kind: 'metal' },
  OIL: { symbol: 'CL=F', name: 'Crude Oil Futures', kind: 'other' },
  CRUDE: { symbol: 'CL=F', name: 'Crude Oil Futures', kind: 'other' },
  WTI: { symbol: 'CL=F', name: 'Crude Oil Futures', kind: 'other' },
  НЕФТЬ: { symbol: 'CL=F', name: 'Crude Oil Futures', kind: 'other' },
  BITCOIN: { symbol: 'BTC-USD', name: 'Bitcoin', kind: 'crypto' },
  BTC: { symbol: 'BTC-USD', name: 'Bitcoin', kind: 'crypto' },
  ETHEREUM: { symbol: 'ETH-USD', name: 'Ethereum', kind: 'crypto' },
  ETH: { symbol: 'ETH-USD', name: 'Ethereum', kind: 'crypto' },
  ETHER: { symbol: 'ETH-USD', name: 'Ethereum', kind: 'crypto' },
  SOLANA: { symbol: 'SOL-USD', name: 'Solana', kind: 'crypto' },
  SOL: { symbol: 'SOL-USD', name: 'Solana', kind: 'crypto' },
  DOGE: { symbol: 'DOGE-USD', name: 'Dogecoin', kind: 'crypto' },
  XRP: { symbol: 'XRP-USD', name: 'XRP', kind: 'crypto' },
  APPLE: { symbol: 'AAPL', name: 'Apple Inc.', kind: 'stock' },
  MICROSOFT: { symbol: 'MSFT', name: 'Microsoft', kind: 'stock' },
  NVIDIA: { symbol: 'NVDA', name: 'NVIDIA', kind: 'stock' },
  TESLA: { symbol: 'TSLA', name: 'Tesla', kind: 'stock' },
  GOOGLE: { symbol: 'GOOGL', name: 'Alphabet', kind: 'stock' },
  ALPHABET: { symbol: 'GOOGL', name: 'Alphabet', kind: 'stock' },
  AMAZON: { symbol: 'AMZN', name: 'Amazon', kind: 'stock' },
  FACEBOOK: { symbol: 'META', name: 'Meta Platforms', kind: 'stock' },
}

const LOCAL_SEARCH: Array<{
  symbol: string
  name: string
  kind: InvestCatalogKind
  aliases: string[]
}> = [
  { symbol: 'GC=F', name: 'Gold Futures', kind: 'metal', aliases: ['gold', 'xau', 'золото'] },
  { symbol: 'GLD', name: 'SPDR Gold Shares', kind: 'etf', aliases: ['gold etf', 'gld'] },
  { symbol: 'SI=F', name: 'Silver Futures', kind: 'metal', aliases: ['silver', 'xag', 'серебро'] },
  { symbol: 'SLV', name: 'iShares Silver Trust', kind: 'etf', aliases: ['silver etf', 'slv'] },
  { symbol: 'CL=F', name: 'Crude Oil Futures', kind: 'other', aliases: ['oil', 'crude', 'нефть'] },
  { symbol: 'BTC-USD', name: 'Bitcoin', kind: 'crypto', aliases: ['bitcoin', 'btc', 'биткоин'] },
  { symbol: 'ETH-USD', name: 'Ethereum', kind: 'crypto', aliases: ['ethereum', 'eth', 'эфир'] },
  { symbol: 'SOL-USD', name: 'Solana', kind: 'crypto', aliases: ['solana', 'sol'] },
  { symbol: 'AAPL', name: 'Apple Inc.', kind: 'stock', aliases: ['apple', 'эппл'] },
  { symbol: 'MSFT', name: 'Microsoft', kind: 'stock', aliases: ['microsoft'] },
  { symbol: 'NVDA', name: 'NVIDIA', kind: 'stock', aliases: ['nvidia'] },
  { symbol: 'TSLA', name: 'Tesla', kind: 'stock', aliases: ['tesla'] },
  { symbol: 'GOOGL', name: 'Alphabet', kind: 'stock', aliases: ['google', 'alphabet'] },
  { symbol: 'AMZN', name: 'Amazon', kind: 'stock', aliases: ['amazon'] },
  { symbol: 'META', name: 'Meta Platforms', kind: 'stock', aliases: ['meta', 'facebook'] },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', kind: 'etf', aliases: ['spy', 's&p'] },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', kind: 'etf', aliases: ['voo', 'vanguard'] },
  { symbol: 'QQQ', name: 'Invesco QQQ', kind: 'etf', aliases: ['qqq', 'nasdaq'] },
]

export function resolveInvestAlias(raw: string): {
  symbol: string
  name: string | null
  kind: InvestCatalogKind | null
} {
  const key = raw.trim().toUpperCase().replace(/\s+/g, '')
  if (!key) return { symbol: '', name: null, kind: null }
  const hit = ALIASES[key]
  if (hit) return { symbol: hit.symbol, name: hit.name, kind: hit.kind }
  return { symbol: key, name: null, kind: null }
}

export function searchLocalCatalog(query: string, limit = 8): InvestSearchHit[] {
  const q = query.trim().toLowerCase()
  if (!q) {
    return LOCAL_SEARCH.slice(0, limit).map((h) => ({
      symbol: h.symbol,
      name: h.name,
      kind: h.kind,
      source: 'catalog',
    }))
  }
  return LOCAL_SEARCH.filter((h) => {
    const sym = h.symbol.toLowerCase()
    return (
      sym.includes(q) ||
      h.name.toLowerCase().includes(q) ||
      h.aliases.some((a) => a.includes(q) || q.includes(a))
    )
  })
    .slice(0, limit)
    .map((h) => ({
      symbol: h.symbol,
      name: h.name,
      kind: h.kind,
      source: 'catalog' as const,
    }))
}
