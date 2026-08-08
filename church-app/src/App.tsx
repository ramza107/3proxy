import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Bible } from './pages/Bible'
import { BibleReader } from './pages/BibleReader'
import { CalendarPage } from './pages/CalendarPage'
import { Kids } from './pages/Kids'
import { Shop } from './pages/Shop'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="bible" element={<Bible />} />
          <Route path="bible/:bookId/:chapter" element={<BibleReader />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="kids" element={<Kids />} />
          <Route path="shop" element={<Shop />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
