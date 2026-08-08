import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { format, addMonths, subMonths } from 'date-fns'
import { uk } from 'date-fns/locale'
import { feasts2026, getMonthFeasts } from '../data/calendar'

const typeLabel: Record<string, string> = {
  велике: 'Велике свято',
  середнє: 'Свято',
  "памʼять": 'Памʼять',
  піст: 'Піст',
}

export function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date(2026, new Date().getMonth(), 1))
  const monthFeasts = useMemo(
    () => getMonthFeasts(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  )

  return (
    <div className="page">
      <h1 className="section-title">Календар</h1>
      <p className="section-lead">Церковні свята й пости українського року.</p>

      <div className="topbar">
        <button className="icon-btn" type="button" onClick={() => setCursor((d) => subMonths(d, 1))}>
          ←
        </button>
        <h2 className="section-title" style={{ margin: 0, flex: 1, textAlign: 'center', fontSize: '1.5rem' }}>
          {format(cursor, 'LLLL yyyy', { locale: uk })}
        </h2>
        <button className="icon-btn" type="button" onClick={() => setCursor((d) => addMonths(d, 1))}>
          →
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={format(cursor, 'yyyy-MM')}
          className="stack"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          {monthFeasts.length === 0 && (
            <p className="empty">У цьому місяці немає ключових дат у демо-календарі.</p>
          )}
          {monthFeasts.map((feast) => {
            const day = Number(feast.date.slice(8, 10))
            return (
              <article key={feast.id} className="tile calendar-day">
                <div className="date-badge">
                  <small>{format(cursor, 'LLL', { locale: uk })}</small>
                  <strong>{day}</strong>
                </div>
                <div>
                  <span className="badge">{typeLabel[feast.type]}</span>
                  <strong style={{ display: 'block', marginTop: 8 }}>{feast.title}</strong>
                  <p>{feast.description}</p>
                </div>
              </article>
            )
          })}
        </motion.div>
      </AnimatePresence>

      <h2 className="section-title" style={{ marginTop: 28, fontSize: '1.55rem' }}>
        Весь рік
      </h2>
      <div className="stack" style={{ marginTop: 12 }}>
        {feasts2026
          .slice()
          .sort((a, b) => a.date.localeCompare(b.date))
          .map((feast) => (
            <div key={feast.id} className="tile">
              <strong>
                {feast.date.slice(8, 10)}.{feast.date.slice(5, 7)} — {feast.title}
              </strong>
              <span>{typeLabel[feast.type]}</span>
            </div>
          ))}
      </div>
    </div>
  )
}
