import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { brand } from '../brand'
import { lessons, type Lesson } from '../data/kids'

type AgeFilter = 'Усі' | Lesson['age']

export function Kids() {
  const [age, setAge] = useState<AgeFilter>('Усі')
  const [active, setActive] = useState<Lesson | null>(null)
  const [picked, setPicked] = useState<number | null>(null)

  const list = useMemo(
    () => lessons.filter((l) => age === 'Усі' || l.age === age),
    [age],
  )

  return (
    <div className="page">
      <h1 className="section-title">Дітям</h1>
      <p className="section-lead">Біблійні історії, уроки віри та короткі квізи.</p>

      <div className="chip-row">
        {(['Усі', '3–6', '7–10', '11–14'] as const).map((a) => (
          <button
            key={a}
            type="button"
            className={`chip${age === a ? ' active' : ''}`}
            onClick={() => {
              setAge(a)
              setActive(null)
              setPicked(null)
            }}
          >
            {a === 'Усі' ? 'Усі віки' : `${a} р.`}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {!active ? (
          <motion.div
            key="list"
            className="stack"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {list.map((lesson) => (
              <button
                key={lesson.id}
                type="button"
                className="tile"
                style={{ textAlign: 'left', cursor: 'pointer', width: '100%' }}
                onClick={() => {
                  if (lesson.premium) return
                  setActive(lesson)
                  setPicked(null)
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <strong>{lesson.title}</strong>
                  <span className={`badge${lesson.premium ? ' premium' : ''}`}>
                    {lesson.premium ? brand.plus : 'Безкоштовно'}
                  </span>
                </div>
                <span>
                  {lesson.age} р. · {lesson.minutes} хв
                </span>
                {lesson.premium && (
                  <span>
                    Преміум-урок.{' '}
                    <Link to="/shop" style={{ color: 'var(--gold-deep)', fontWeight: 700 }}>
                      Відкрити в крамниці
                    </Link>
                  </span>
                )}
              </button>
            ))}
          </motion.div>
        ) : (
          <motion.article
            key={active.id}
            className="reader"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
          >
            <button
              className="btn btn-outline"
              type="button"
              onClick={() => {
                setActive(null)
                setPicked(null)
              }}
              style={{ marginBottom: 14 }}
            >
              ← До уроків
            </button>
            <h2 className="section-title" style={{ fontSize: '1.7rem' }}>
              {active.title}
            </h2>
            <p>{active.story}</p>
            <p style={{ marginTop: 14 }}>
              <strong>Висновок: </strong>
              {active.moral}
            </p>

            <h3 style={{ marginTop: 22, fontFamily: 'Cormorant Infant, Georgia, serif', fontSize: '1.45rem' }}>
              Перевіримо?
            </h3>
            <p style={{ color: 'var(--muted)' }}>{active.quiz.question}</p>
            <div className="stack" style={{ marginTop: 10 }}>
              {active.quiz.options.map((opt, idx) => {
                let cls = 'quiz-option'
                if (picked !== null) {
                  if (idx === active.quiz.answer) cls += ' correct'
                  else if (idx === picked) cls += ' wrong'
                }
                return (
                  <button
                    key={opt}
                    type="button"
                    className={cls}
                    onClick={() => setPicked(idx)}
                    disabled={picked !== null}
                  >
                    {opt}
                  </button>
                )
              })}
            </div>
            {picked !== null && (
              <p style={{ marginTop: 14, fontWeight: 600 }}>
                {picked === active.quiz.answer
                  ? 'Чудово! Так тримати.'
                  : `Правильна відповідь: ${active.quiz.options[active.quiz.answer]}`}
              </p>
            )}
          </motion.article>
        )}
      </AnimatePresence>
    </div>
  )
}
