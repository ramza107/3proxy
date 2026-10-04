import type { InvestmentHolding, InvestQuote } from '../types'
import { resolveInvestAlias } from './investCatalog'

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
  const { symbol } = resolveInvestAlias(raw)
  return symbol
}

export function guessKind(symbol: string): InvestmentHolding['kind'] {
  const alias = resolveInvestAlias(symbol)
  if (alias.kind) return alias.kind
  const s = normalizeInvestSymbol(symbol)
  if (s.endsWith('-USD') || ['BTC', 'ETH', 'SOL'].includes(s.replace('-USD', ''))) {
    return 'crypto'
  }
  if (/^(GC|SI|HG)=F$/i.test(s) || s === 'XAUUSD=X' || s === 'XAGUSD=X') return 'metal'
  if (['SPY', 'VOO', 'QQQ', 'IWM', 'VTI', 'ARKK', 'GLD', 'SLV'].includes(s)) return 'etf'
  return 'stock'
}
