/** Curated Top ~100 aliases + search hits for Invest (names → Yahoo/Coinbase tickers). */

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
    symbol: 'PL=F',
    name: 'Platinum Futures',
    kind: 'metal',
    aliases: ['platinum', 'xpt', 'платина', 'plt'],
  },
  {
    symbol: 'PPLT',
    name: 'abrdn Physical Platinum Shares',
    kind: 'etf',
    aliases: ['platinum etf', 'pplt'],
  },
  {
    symbol: 'PA=F',
    name: 'Palladium Futures',
    kind: 'metal',
    aliases: ['palladium', 'xpd', 'палладий'],
  },
  {
    symbol: 'PALL',
    name: 'abrdn Physical Palladium Shares',
    kind: 'etf',
    aliases: ['palladium etf', 'pall'],
  },
  {
    symbol: 'HG=F',
    name: 'Copper Futures',
    kind: 'other',
    aliases: ['copper', 'медь'],
  },
  {
    symbol: 'CL=F',
    name: 'Crude Oil Futures',
    kind: 'other',
    aliases: ['oil', 'crude', 'wti', 'нефть'],
  },
  {
    symbol: 'NG=F',
    name: 'Natural Gas Futures',
    kind: 'other',
    aliases: ['gas', 'natgas', 'газ'],
  },
  {
    symbol: 'IAU',
    name: 'iShares Gold Trust',
    kind: 'etf',
    aliases: ['iau', 'gold trust'],
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
    symbol: 'XRP-USD',
    name: 'XRP',
    kind: 'crypto',
    aliases: ['xrp', 'ripple'],
  },
  {
    symbol: 'DOGE-USD',
    name: 'Dogecoin',
    kind: 'crypto',
    aliases: ['doge', 'dogecoin'],
  },
  {
    symbol: 'ADA-USD',
    name: 'Cardano',
    kind: 'crypto',
    aliases: ['ada', 'cardano'],
  },
  {
    symbol: 'AVAX-USD',
    name: 'Avalanche',
    kind: 'crypto',
    aliases: ['avax', 'avalanche'],
  },
  {
    symbol: 'LINK-USD',
    name: 'Chainlink',
    kind: 'crypto',
    aliases: ['link', 'chainlink'],
  },
  { symbol: 'AAPL', name: 'Apple Inc.', kind: 'stock', aliases: ['apple', 'эппл'] },
  { symbol: 'MSFT', name: 'Microsoft', kind: 'stock', aliases: ['microsoft', 'майкрософт'] },
  { symbol: 'NVDA', name: 'NVIDIA', kind: 'stock', aliases: ['nvidia', 'нвидиа'] },
  { symbol: 'GOOGL', name: 'Alphabet', kind: 'stock', aliases: ['google', 'alphabet', 'гугл'] },
  { symbol: 'AMZN', name: 'Amazon', kind: 'stock', aliases: ['amazon', 'амазон'] },
  { symbol: 'META', name: 'Meta Platforms', kind: 'stock', aliases: ['meta', 'facebook', 'фейсбук'] },
  { symbol: 'TSLA', name: 'Tesla', kind: 'stock', aliases: ['tesla', 'тесла'] },
  {
    symbol: 'BRK-B',
    name: 'Berkshire Hathaway B',
    kind: 'stock',
    aliases: ['berkshire', 'brk', 'brk.b', 'brkb', 'баффет'],
  },
  { symbol: 'AVGO', name: 'Broadcom', kind: 'stock', aliases: ['broadcom'] },
  { symbol: 'JPM', name: 'JPMorgan Chase', kind: 'stock', aliases: ['jpmorgan', 'jp morgan'] },
  { symbol: 'V', name: 'Visa', kind: 'stock', aliases: ['visa'] },
  { symbol: 'MA', name: 'Mastercard', kind: 'stock', aliases: ['mastercard'] },
  { symbol: 'UNH', name: 'UnitedHealth', kind: 'stock', aliases: ['unitedhealth'] },
  { symbol: 'XOM', name: 'Exxon Mobil', kind: 'stock', aliases: ['exxon', 'exxonmobil'] },
  { symbol: 'LLY', name: 'Eli Lilly', kind: 'stock', aliases: ['lilly', 'eli lilly'] },
  { symbol: 'JNJ', name: 'Johnson & Johnson', kind: 'stock', aliases: ['jnj', 'johnson'] },
  { symbol: 'WMT', name: 'Walmart', kind: 'stock', aliases: ['walmart'] },
  { symbol: 'PG', name: 'Procter & Gamble', kind: 'stock', aliases: ['pg', 'procter'] },
  { symbol: 'HD', name: 'Home Depot', kind: 'stock', aliases: ['home depot'] },
  { symbol: 'COST', name: 'Costco', kind: 'stock', aliases: ['costco'] },
  { symbol: 'ORCL', name: 'Oracle', kind: 'stock', aliases: ['oracle'] },
  { symbol: 'CRM', name: 'Salesforce', kind: 'stock', aliases: ['salesforce'] },
  { symbol: 'NFLX', name: 'Netflix', kind: 'stock', aliases: ['netflix'] },
  { symbol: 'AMD', name: 'AMD', kind: 'stock', aliases: ['amd'] },
  { symbol: 'INTC', name: 'Intel', kind: 'stock', aliases: ['intel'] },
  { symbol: 'ADBE', name: 'Adobe', kind: 'stock', aliases: ['adobe'] },
  { symbol: 'PEP', name: 'PepsiCo', kind: 'stock', aliases: ['pepsi', 'pepsico'] },
  { symbol: 'KO', name: 'Coca-Cola', kind: 'stock', aliases: ['coke', 'coca-cola', 'coca cola'] },
  { symbol: 'DIS', name: 'Disney', kind: 'stock', aliases: ['disney'] },
  { symbol: 'BAC', name: 'Bank of America', kind: 'stock', aliases: ['bofa', 'bank of america'] },
  { symbol: 'CVX', name: 'Chevron', kind: 'stock', aliases: ['chevron'] },
  { symbol: 'MCD', name: "McDonald's", kind: 'stock', aliases: ['mcdonalds', "mcdonald's"] },
  { symbol: 'NKE', name: 'Nike', kind: 'stock', aliases: ['nike'] },
  { symbol: 'BA', name: 'Boeing', kind: 'stock', aliases: ['boeing'] },
  { symbol: 'UBER', name: 'Uber', kind: 'stock', aliases: ['uber'] },
  { symbol: 'COIN', name: 'Coinbase', kind: 'stock', aliases: ['coinbase'] },
  { symbol: 'PLTR', name: 'Palantir', kind: 'stock', aliases: ['palantir'] },
  { symbol: 'BABA', name: 'Alibaba', kind: 'stock', aliases: ['alibaba', 'алибаба'] },
  { symbol: 'TSM', name: 'TSMC', kind: 'stock', aliases: ['tsmc', 'taiwan semiconductor'] },
  { symbol: 'ASML', name: 'ASML', kind: 'stock', aliases: ['asml'] },
  { symbol: 'NVO', name: 'Novo Nordisk', kind: 'stock', aliases: ['novo', 'novo nordisk'] },
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', kind: 'etf', aliases: ['spy', 's&p', 's&p 500', 'sp500'] },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', kind: 'etf', aliases: ['voo', 'vanguard', 'vanguard 500'] },
  { symbol: 'IVV', name: 'iShares Core S&P 500', kind: 'etf', aliases: ['ivv'] },
  { symbol: 'QQQ', name: 'Invesco QQQ', kind: 'etf', aliases: ['qqq', 'nasdaq'] },
  { symbol: 'DIA', name: 'SPDR Dow Jones ETF', kind: 'etf', aliases: ['dia', 'dow'] },
  { symbol: 'IWM', name: 'iShares Russell 2000', kind: 'etf', aliases: ['iwm', 'russell', 'small cap'] },
  { symbol: 'VTI', name: 'Vanguard Total Stock Market', kind: 'etf', aliases: ['vti', 'total market'] },
  { symbol: 'VXUS', name: 'Vanguard Total International Stock', kind: 'etf', aliases: ['vxus', 'international'] },
  { symbol: 'VEA', name: 'Vanguard FTSE Developed Markets', kind: 'etf', aliases: ['vea'] },
  { symbol: 'VWO', name: 'Vanguard FTSE Emerging Markets', kind: 'etf', aliases: ['vwo', 'emerging'] },
  { symbol: 'EFA', name: 'iShares MSCI EAFE', kind: 'etf', aliases: ['efa'] },
  { symbol: 'EEM', name: 'iShares MSCI Emerging Markets', kind: 'etf', aliases: ['eem'] },
  { symbol: 'AGG', name: 'iShares Core US Aggregate Bond', kind: 'etf', aliases: ['agg', 'bonds', 'bond'] },
  { symbol: 'BND', name: 'Vanguard Total Bond Market', kind: 'etf', aliases: ['bnd', 'bond etf'] },
  { symbol: 'TLT', name: 'iShares 20+ Year Treasury', kind: 'etf', aliases: ['tlt', 'treasury'] },
  { symbol: 'VNQ', name: 'Vanguard Real Estate ETF', kind: 'etf', aliases: ['vnq', 'reit', 'real estate'] },
  { symbol: 'XLF', name: 'Financial Select Sector SPDR', kind: 'etf', aliases: ['xlf', 'financials'] },
  { symbol: 'XLK', name: 'Technology Select Sector SPDR', kind: 'etf', aliases: ['xlk', 'tech etf'] },
  { symbol: 'XLE', name: 'Energy Select Sector SPDR', kind: 'etf', aliases: ['xle', 'energy etf'] },
  { symbol: 'XLV', name: 'Health Care Select Sector SPDR', kind: 'etf', aliases: ['xlv', 'healthcare etf'] },
  { symbol: 'ARKK', name: 'ARK Innovation ETF', kind: 'etf', aliases: ['arkk', 'ark'] },
  { symbol: 'SCHD', name: 'Schwab US Dividend Equity', kind: 'etf', aliases: ['schd', 'dividend'] },
  { symbol: 'VIG', name: 'Vanguard Dividend Appreciation', kind: 'etf', aliases: ['vig'] },
  { symbol: 'JEPI', name: 'JPMorgan Equity Premium Income', kind: 'etf', aliases: ['jepi'] },
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
  PLATINUM: 'PL=F',
  XPT: 'PL=F',
  ПЛАТИНА: 'PL=F',
  PALLADIUM: 'PA=F',
  XPD: 'PA=F',
  ПАЛЛАДИЙ: 'PA=F',
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
  BRKB: 'BRK-B',
  'BRK.B': 'BRK-B',
}

export function resolveInvestSymbol(raw: string): string {
  let s = raw.trim().toUpperCase().replace(/\s+/g, '')
  if (!s) return ''
  if (SYMBOL_ALIASES[s]) return SYMBOL_ALIASES[s]
  return s
}

export function searchCatalog(query: string, limit = 12): InvestCatalogHit[] {
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
    else if (hit.aliases.some((a) => a.includes(q) || q.includes(a))) score = 40
    else if (sym.includes(q)) score = 30
    return { hit, score }
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored.slice(0, limit).map((x) => x.hit)
}
