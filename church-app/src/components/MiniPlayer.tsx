import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useRadioPlayer } from '../context/RadioPlayerContext'

export function MiniPlayer() {
  const { station, playing, loading, toggle, stop } = useRadioPlayer()

  return (
    <AnimatePresence>
      {station && (
        <motion.div
          className="mini-player"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
        >
          <Link to="/radio" className="mini-player-meta">
            <strong>{station.name}</strong>
            <span>{loading ? 'Зʼєднання…' : playing ? 'В ефірі' : 'Пауза'}</span>
          </Link>
          <div className="mini-player-actions">
            <button type="button" className="btn btn-primary" onClick={toggle} aria-label={playing ? 'Пауза' : 'Грати'}>
              {playing ? '❚❚' : '▶'}
            </button>
            <button type="button" className="btn btn-outline" onClick={stop} aria-label="Зупинити">
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
