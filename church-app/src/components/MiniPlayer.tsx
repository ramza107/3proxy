import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useRadioPlayer } from '../context/RadioPlayerContext'

function IconPrev() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6 6h2.2v12H6V6Zm3.1 6.1 8.9 5.7V6.2l-8.9 5.9Z"
      />
    </svg>
  )
}

function IconNext() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M15.8 6H18v12h-2.2V6ZM6 17.8l8.9-5.7L6 6.2v11.6Z"
      />
    </svg>
  )
}

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M8.2 5.8v12.4L19 12 8.2 5.8Z" />
    </svg>
  )
}

function IconPause() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M7.4 6.2h3.2v11.6H7.4V6.2Zm6 0h3.2v11.6H13.4V6.2Z" />
    </svg>
  )
}

function IconClose() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.7 6.7a1 1 0 0 1 1.4 0L12 10.6l3.9-3.9a1 1 0 1 1 1.4 1.4L13.4 12l3.9 3.9a1 1 0 0 1-1.4 1.4L12 13.4l-3.9 3.9a1 1 0 0 1-1.4-1.4L10.6 12 6.7 8.1a1 1 0 0 1 0-1.4Z"
      />
    </svg>
  )
}

export function MiniPlayer() {
  const { station, playing, loading, toggle, stop, playPrev, playNext } = useRadioPlayer()

  return (
    <AnimatePresence>
      {station && (
        <motion.div
          className="mini-player"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
        >
          <Link to="/radio" className="mini-player-meta" aria-label="Відкрити радіо">
            <span className="mini-player-art" aria-hidden="true">
              <span className={`mini-player-eq${playing && !loading ? ' is-on' : ''}`}>
                <i />
                <i />
                <i />
              </span>
            </span>
            <span className="mini-player-text">
              <strong>{station.name}</strong>
              <span>{loading ? 'Зʼєднання…' : playing ? 'В ефірі' : 'Пауза'}</span>
            </span>
          </Link>

          <div className="mini-player-controls" role="group" aria-label="Керування радіо">
            <button type="button" className="mp-btn" onClick={playPrev} aria-label="Попереднє радіо">
              <IconPrev />
            </button>
            <button
              type="button"
              className="mp-btn mp-btn-main"
              onClick={toggle}
              aria-label={playing ? 'Пауза' : 'Грати'}
            >
              {playing ? <IconPause /> : <IconPlay />}
            </button>
            <button type="button" className="mp-btn" onClick={playNext} aria-label="Наступне радіо">
              <IconNext />
            </button>
            <button type="button" className="mp-btn mp-btn-close" onClick={stop} aria-label="Закрити плеєр">
              <IconClose />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
