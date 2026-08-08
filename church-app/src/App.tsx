import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { RadioPlayerProvider } from './context/RadioPlayerContext'
import { Home } from './pages/Home'
import { Library } from './pages/Library'
import { LibrarySection } from './pages/LibrarySection'
import { LibraryReader } from './pages/LibraryReader'
import { FreeBooks } from './pages/FreeBooks'
import { FreeBookReader } from './pages/FreeBookReader'
import { Bible } from './pages/Bible'
import { BibleReader } from './pages/BibleReader'
import { CalendarPage } from './pages/CalendarPage'
import { Kids } from './pages/Kids'
import { Shop } from './pages/Shop'
import { Support } from './pages/Support'
import { Radio } from './pages/Radio'

const routerBasename = import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

export default function App() {
  return (
    <RadioPlayerProvider>
      <BrowserRouter basename={routerBasename}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="library" element={<Library />} />
            <Route path="library/free-books" element={<FreeBooks />} />
            <Route path="library/free-books/:bookId" element={<FreeBookReader />} />
            <Route path="library/read/:textId" element={<LibraryReader />} />
            <Route path="library/:categoryId" element={<LibrarySection />} />
            <Route path="bible" element={<Bible />} />
            <Route path="bible/:bookId/:chapter" element={<BibleReader />} />
            <Route path="radio" element={<Radio />} />
            <Route path="calendar" element={<CalendarPage />} />
            <Route path="kids" element={<Kids />} />
            <Route path="shop" element={<Shop />} />
            <Route path="support" element={<Support />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </RadioPlayerProvider>
  )
}
