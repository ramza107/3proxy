import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { getUpcoming } from '../data/calendar'
import { brand } from '../brand'

const fade = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.45, ease: 'easeOut' as const },
  }),
}

export function Home() {
  const upcoming = getUpcoming(new Date(), 3)

  return (
    <div className="page">
      <motion.section
        className="hero"
        initial={{ opacity: 0, scale: 1.03 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        <p style={{ letterSpacing: '0.14em', textTransform: 'uppercase', fontSize: '0.72rem', marginBottom: 8 }}>
          Церковний застосунок
        </p>
        <h1 className="brand">{brand.name}</h1>
        <p>{brand.tagline}</p>
        <div className="cta-row">
          <Link className="btn btn-primary" to="/library">
            Бібліотека
          </Link>
          <Link className="btn btn-ghost" to="/radio">
            Слухати радіо
          </Link>
        </div>
      </motion.section>

      <motion.h2 className="section-title" custom={1} variants={fade} initial="hidden" animate="show">
        Сьогодні у вірі
      </motion.h2>
      <motion.p className="section-lead" custom={2} variants={fade} initial="hidden" animate="show">
        Один шлях: молитва, Писання, родина.
      </motion.p>

      <div className="stack">
        {[
          {
            to: '/library',
            title: 'Бібліотека',
            text: 'Біблія, акафісти, молитвослов і духовне читання.',
            accent: true,
          },
          {
            to: '/radio',
            title: 'Церковне радіо',
            text: 'Безкоштовні ефіри: Світле, Дзвони, Марія, Світанок та інші.',
            accent: true,
          },
          {
            to: '/calendar',
            title: 'Церковний календар',
            text: 'Свята, пости й памʼятні дні українського церковного року.',
          },
          {
            to: '/kids',
            title: 'Дітям про віру',
            text: 'Історії, уроки й квізи для різного віку — частина безкоштовно.',
          },
          {
            to: '/shop/courses',
            title: 'Курси на місяць',
            text: `Щодня нове заняття: діти, молитва, родина, піст. Або підписка ${brand.plus}.`,
          },
          {
            to: '/support',
            title: 'Підтримка проєкту',
            text: 'Добровільна допомога на розвиток застосунку.',
            accent: true,
          },
        ].map((item, i) => (
          <motion.div key={item.to} custom={i + 3} variants={fade} initial="hidden" animate="show">
            <Link className={`tile${'accent' in item && item.accent ? ' tile-accent' : ''}`} to={item.to}>
              <strong>{item.title}</strong>
              <span>{item.text}</span>
            </Link>
          </motion.div>
        ))}
      </div>

      <h2 className="section-title" style={{ marginTop: 28 }}>
        Найближчі свята
      </h2>
      <div className="stack" style={{ marginTop: 12 }}>
        {upcoming.map((feast) => {
          const day = Number(feast.date.slice(8, 10))
          const month = feast.date.slice(5, 7)
          return (
            <Link key={feast.id} className="tile calendar-day" to="/calendar">
              <div className="date-badge">
                <small>{month}</small>
                <strong>{day}</strong>
              </div>
              <div>
                <strong>{feast.title}</strong>
                <p>{feast.description}</p>
              </div>
            </Link>
          )
        })}
      </div>

    </div>
  )
}
