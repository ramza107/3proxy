import type { InvestmentHolding, InvestQuote } from '../types'

export type HoldingPnL = {
  holding: InvestmentHolding
  price: number | null
  marketValue: number | null
  costValue: number
  pnlAbs: number | null
  pnlPct: number | null
  dayChangePct: number | null
}

export function holdingCost(h: InvestmentHolding) {
  return Math.max(0, h.quantity) * Math.max(0, h.costBasisPerUnit)
}

export function holdingMarketValue(h: InvestmentHolding, price?: number | null) {
  const p = price ?? h.lastPrice
  if (p == null || !Number.isFinite(p)) return null
  return Math.max(0, h.quantity) * p
}

export function holdingPnL(
  h: InvestmentHolding,
  quote?: InvestQuote | null,
): HoldingPnL {
  const price = quote?.price ?? h.lastPrice
  const costValue = holdingCost(h)
  const marketValue = holdingMarketValue(h, price)
  const pnlAbs = marketValue == null ? null : marketValue - costValue
  const pnlPct =
    pnlAbs == null || costValue <= 0 ? null : (pnlAbs / costValue) * 100
  return {
    holding: h,
    price: price ?? null,
    marketValue,
    costValue,
    pnlAbs,
    pnlPct,
    dayChangePct: quote?.changePct ?? h.lastChangePct ?? null,
  }
}

export function portfolioSummary(rows: HoldingPnL[]) {
  let cost = 0
  let value = 0
  let priced = 0
  for (const r of rows) {
    cost += r.costValue
    if (r.marketValue != null) {
      value += r.marketValue
      priced += 1
    }
  }
  const pnlAbs = priced ? value - cost : null
  const pnlPct = pnlAbs == null || cost <= 0 ? null : (pnlAbs / cost) * 100
  return { cost, value, pnlAbs, pnlPct, priced, total: rows.length }
}

export function normalizeInvestSymbol(raw: string) {
  let s = raw.trim().toUpperCase().replace(/\s+/g, '')
  if (s === 'BITCOIN') s = 'BTC-USD'
  if (s === 'ETHEREUM') s = 'ETH-USD'
  if (s === 'BTC' || s === 'ETH' || s === 'SOL' || s === 'DOGE' || s === 'XRP') {
    s = `${s}-USD`
  }
  return s
}

export function guessKind(symbol: string): InvestmentHolding['kind'] {
  const s = normalizeInvestSymbol(symbol)
  if (s.endsWith('-USD') || ['BTC', 'ETH', 'SOL'].includes(s.replace('-USD', ''))) {
    return 'crypto'
  }
  if (['SPY', 'VOO', 'QQQ', 'IWM', 'VTI', 'ARKK'].includes(s)) return 'etf'
  return 'stock'
}
