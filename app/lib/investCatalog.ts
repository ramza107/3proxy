/** Curated Top ~100 investible names — search by ticker, name, or alias (offline-first). */

export type InvestCatalogKind = 'stock' | 'etf' | 'crypto' | 'metal' | 'other'

export type InvestSearchHit = {
  symbol: string
  name: string
  kind: InvestCatalogKind
  source?: 'catalog' | 'yahoo'
}

type CatalogRow = {
  symbol: string
  name: string
  kind: InvestCatalogKind
  aliases: string[]
}

/**
 * Popular holdings people actually buy — stocks, ETFs, crypto, metals.
 * Keep aliases for EN/RU nicknames and tickers so “platinum” / “платина” resolve.
 */
export const INVEST_TOP100: CatalogRow[] = [
  // Metals & commodities
  { symbol: 'GC=F', name: 'Gold Futures', kind: 'metal', aliases: ['gold', 'xau', 'xauusd', 'золото'] },
  { symbol: 'SI=F', name: 'Silver Futures', kind: 'metal', aliases: ['silver', 'xag', 'xagusd', 'серебро'] },
  {
    symbol: 'PL=F',
    name: 'Platinum Futures',
    kind: 'metal',
    aliases: ['platinum', 'xpt', 'платина', 'plt'],
  },
  {
    symbol: 'PA=F',
    name: 'Palladium Futures',
    kind: 'metal',
    aliases: ['palladium', 'xpd', 'палладий'],
  },
  { symbol: 'HG=F', name: 'Copper Futures', kind: 'other', aliases: ['copper', 'медь'] },
  { symbol: 'CL=F', name: 'Crude Oil Futures', kind: 'other', aliases: ['oil', 'crude', 'wti', 'нефть'] },
  { symbol: 'NG=F', name: 'Natural Gas Futures', kind: 'other', aliases: ['gas', 'natgas', 'газ'] },
  { symbol: 'GLD', name: 'SPDR Gold Shares', kind: 'etf', aliases: ['gold etf', 'gld', 'spdr gold'] },
  { symbol: 'SLV', name: 'iShares Silver Trust', kind: 'etf', aliases: ['silver etf', 'slv'] },
  { symbol: 'PPLT', name: 'abrdn Physical Platinum Shares', kind: 'etf', aliases: ['platinum etf', 'pplt'] },
  { symbol: 'PALL', name: 'abrdn Physical Palladium Shares', kind: 'etf', aliases: ['palladium etf', 'pall'] },
  { symbol: 'IAU', name: 'iShares Gold Trust', kind: 'etf', aliases: ['iau', 'gold trust'] },

  // Mega-cap US
  { symbol: 'AAPL', name: 'Apple Inc.', kind: 'stock', aliases: ['apple', 'эппл'] },
  { symbol: 'MSFT', name: 'Microsoft', kind: 'stock', aliases: ['microsoft', 'майкрософт'] },
  { symbol: 'NVDA', name: 'NVIDIA', kind: 'stock', aliases: ['nvidia', 'нвидиа'] },
  { symbol: 'GOOGL', name: 'Alphabet', kind: 'stock', aliases: ['google', 'alphabet', 'гугл'] },
  { symbol: 'AMZN', name: 'Amazon', kind: 'stock', aliases: ['amazon', 'амазон'] },
  { symbol: 'META', name: 'Meta Platforms', kind: 'stock', aliases: ['meta', 'facebook', 'фейсбук'] },
  { symbol: 'TSLA', name: 'Tesla', kind: 'stock', aliases: ['tesla', 'тесла'] },
  { symbol: 'BRK-B', name: 'Berkshire Hathaway B', kind: 'stock', aliases: ['berkshire', 'brk', 'баффет'] },
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
  { symbol: 'CSCO', name: 'Cisco', kind: 'stock', aliases: ['cisco'] },
  { symbol: 'ADBE', name: 'Adobe', kind: 'stock', aliases: ['adobe'] },
  { symbol: 'PEP', name: 'PepsiCo', kind: 'stock', aliases: ['pepsi', 'pepsico'] },
  { symbol: 'KO', name: 'Coca-Cola', kind: 'stock', aliases: ['coke', 'coca-cola', 'coca cola'] },
  { symbol: 'DIS', name: 'Disney', kind: 'stock', aliases: ['disney'] },
  { symbol: 'BAC', name: 'Bank of America', kind: 'stock', aliases: ['bofa', 'bank of america'] },
  { symbol: 'WFC', name: 'Wells Fargo', kind: 'stock', aliases: ['wells fargo'] },
  { symbol: 'CVX', name: 'Chevron', kind: 'stock', aliases: ['chevron'] },
  { symbol: 'ABBV', name: 'AbbVie', kind: 'stock', aliases: ['abbvie'] },
  { symbol: 'MRK', name: 'Merck', kind: 'stock', aliases: ['merck'] },
  { symbol: 'TMO', name: 'Thermo Fisher', kind: 'stock', aliases: ['thermo fisher'] },
  { symbol: 'ACN', name: 'Accenture', kind: 'stock', aliases: ['accenture'] },
  { symbol: 'MCD', name: "McDonald's", kind: 'stock', aliases: ['mcdonalds', "mcdonald's"] },
  { symbol: 'NKE', name: 'Nike', kind: 'stock', aliases: ['nike'] },
  { symbol: 'SBUX', name: 'Starbucks', kind: 'stock', aliases: ['starbucks'] },
  { symbol: 'BA', name: 'Boeing', kind: 'stock', aliases: ['boeing'] },
  { symbol: 'GE', name: 'GE Aerospace', kind: 'stock', aliases: ['ge', 'general electric'] },
  { symbol: 'CAT', name: 'Caterpillar', kind: 'stock', aliases: ['caterpillar'] },
  { symbol: 'IBM', name: 'IBM', kind: 'stock', aliases: ['ibm'] },
  { symbol: 'QCOM', name: 'Qualcomm', kind: 'stock', aliases: ['qualcomm'] },
  { symbol: 'TXN', name: 'Texas Instruments', kind: 'stock', aliases: ['texas instruments'] },
  { symbol: 'AMAT', name: 'Applied Materials', kind: 'stock', aliases: ['applied materials'] },
  { symbol: 'UBER', name: 'Uber', kind: 'stock', aliases: ['uber'] },
  { symbol: 'SHOP', name: 'Shopify', kind: 'stock', aliases: ['shopify'] },
  { symbol: 'SQ', name: 'Block', kind: 'stock', aliases: ['block', 'square'] },
  { symbol: 'PYPL', name: 'PayPal', kind: 'stock', aliases: ['paypal'] },
  { symbol: 'COIN', name: 'Coinbase', kind: 'stock', aliases: ['coinbase'] },
  { symbol: 'PLTR', name: 'Palantir', kind: 'stock', aliases: ['palantir'] },
  { symbol: 'SNOW', name: 'Snowflake', kind: 'stock', aliases: ['snowflake'] },
  { symbol: 'ARM', name: 'Arm Holdings', kind: 'stock', aliases: ['arm'] },
  { symbol: 'SMCI', name: 'Super Micro Computer', kind: 'stock', aliases: ['supermicro', 'smci'] },
  { symbol: 'BABA', name: 'Alibaba', kind: 'stock', aliases: ['alibaba', 'алибаба'] },
  { symbol: 'TSM', name: 'TSMC', kind: 'stock', aliases: ['tsmc', 'taiwan semiconductor'] },
  { symbol: 'ASML', name: 'ASML', kind: 'stock', aliases: ['asml'] },
  { symbol: 'SAP', name: 'SAP', kind: 'stock', aliases: ['sap'] },
  { symbol: 'NVO', name: 'Novo Nordisk', kind: 'stock', aliases: ['novo', 'novo nordisk'] },
  { symbol: 'TM', name: 'Toyota', kind: 'stock', aliases: ['toyota'] },
  { symbol: 'SONY', name: 'Sony', kind: 'stock', aliases: ['sony'] },

  // Index / bond / sector ETFs
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF', kind: 'etf', aliases: ['spy', 's&p', 's&p 500', 'sp500'] },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF', kind: 'etf', aliases: ['voo', 'vanguard 500'] },
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
  { symbol: 'LQD', name: 'iShares Investment Grade Corporate Bond', kind: 'etf', aliases: ['lqd'] },
  { symbol: 'HYG', name: 'iShares High Yield Corporate Bond', kind: 'etf', aliases: ['hyg', 'high yield'] },
  { symbol: 'VNQ', name: 'Vanguard Real Estate ETF', kind: 'etf', aliases: ['vnq', 'reit', 'real estate'] },
  { symbol: 'XLF', name: 'Financial Select Sector SPDR', kind: 'etf', aliases: ['xlf', 'financials'] },
  { symbol: 'XLK', name: 'Technology Select Sector SPDR', kind: 'etf', aliases: ['xlk', 'tech etf'] },
  { symbol: 'XLE', name: 'Energy Select Sector SPDR', kind: 'etf', aliases: ['xle', 'energy etf'] },
  { symbol: 'XLV', name: 'Health Care Select Sector SPDR', kind: 'etf', aliases: ['xlv', 'healthcare etf'] },
  { symbol: 'ARKK', name: 'ARK Innovation ETF', kind: 'etf', aliases: ['arkk', 'ark'] },
  { symbol: 'SCHD', name: 'Schwab US Dividend Equity', kind: 'etf', aliases: ['schd', 'dividend'] },
  { symbol: 'VIG', name: 'Vanguard Dividend Appreciation', kind: 'etf', aliases: ['vig'] },
  { symbol: 'JEPI', name: 'JPMorgan Equity Premium Income', kind: 'etf', aliases: ['jepi'] },

  // Crypto
  { symbol: 'BTC-USD', name: 'Bitcoin', kind: 'crypto', aliases: ['bitcoin', 'btc', 'биткоин', 'биткойн'] },
  { symbol: 'ETH-USD', name: 'Ethereum', kind: 'crypto', aliases: ['ethereum', 'eth', 'ether', 'эфир', 'эфириум'] },
  { symbol: 'SOL-USD', name: 'Solana', kind: 'crypto', aliases: ['solana', 'sol'] },
  { symbol: 'XRP-USD', name: 'XRP', kind: 'crypto', aliases: ['xrp', 'ripple'] },
  { symbol: 'DOGE-USD', name: 'Dogecoin', kind: 'crypto', aliases: ['doge', 'dogecoin'] },
  { symbol: 'ADA-USD', name: 'Cardano', kind: 'crypto', aliases: ['ada', 'cardano'] },
  { symbol: 'AVAX-USD', name: 'Avalanche', kind: 'crypto', aliases: ['avax', 'avalanche'] },
  { symbol: 'LINK-USD', name: 'Chainlink', kind: 'crypto', aliases: ['link', 'chainlink'] },
  { symbol: 'DOT-USD', name: 'Polkadot', kind: 'crypto', aliases: ['dot', 'polkadot'] },
  { symbol: 'MATIC-USD', name: 'Polygon', kind: 'crypto', aliases: ['matic', 'polygon'] },
]

const LOCAL_SEARCH = INVEST_TOP100

const ALIASES: Record<string, { symbol: string; name: string; kind: InvestCatalogKind }> = {}
for (const row of INVEST_TOP100) {
  ALIASES[row.symbol.toUpperCase()] = { symbol: row.symbol, name: row.name, kind: row.kind }
  for (const a of row.aliases) {
    ALIASES[a.toUpperCase().replace(/\s+/g, '')] = {
      symbol: row.symbol,
      name: row.name,
      kind: row.kind,
    }
  }
}
// Extra shorthand without spaces / hyphens
ALIASES.GOLD = { symbol: 'GC=F', name: 'Gold Futures', kind: 'metal' }
ALIASES.SILVER = { symbol: 'SI=F', name: 'Silver Futures', kind: 'metal' }
ALIASES.PLATINUM = { symbol: 'PL=F', name: 'Platinum Futures', kind: 'metal' }
ALIASES.PALLADIUM = { symbol: 'PA=F', name: 'Palladium Futures', kind: 'metal' }
ALIASES.BRKB = { symbol: 'BRK-B', name: 'Berkshire Hathaway B', kind: 'stock' }
ALIASES['BRK.B'] = { symbol: 'BRK-B', name: 'Berkshire Hathaway B', kind: 'stock' }

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

export function searchLocalCatalog(query: string, limit = 12): InvestSearchHit[] {
  const q = query.trim().toLowerCase()
  if (!q) {
    return LOCAL_SEARCH.slice(0, limit).map((h) => ({
      symbol: h.symbol,
      name: h.name,
      kind: h.kind,
      source: 'catalog',
    }))
  }

  const scored = LOCAL_SEARCH.map((h) => {
    const sym = h.symbol.toLowerCase()
    const name = h.name.toLowerCase()
    let score = 0
    if (sym === q || h.aliases.includes(q)) score = 100
    else if (sym.startsWith(q)) score = 85
    else if (h.aliases.some((a) => a === q || a.startsWith(q))) score = 80
    else if (name.startsWith(q)) score = 70
    else if (name.includes(q)) score = 55
    else if (h.aliases.some((a) => a.includes(q) || q.includes(a))) score = 45
    else if (sym.includes(q)) score = 30
    // fuzzy: query tokens vs name
    else if (q.length >= 3 && name.split(/\s+/).some((w) => w.startsWith(q) || q.startsWith(w))) {
      score = 35
    }
    return { h, score }
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.h.name.localeCompare(b.h.name))

  return scored.slice(0, limit).map(({ h }) => ({
    symbol: h.symbol,
    name: h.name,
    kind: h.kind,
    source: 'catalog' as const,
  }))
}
