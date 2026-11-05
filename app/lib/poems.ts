/** Short public-domain lines for the Plan day sheet (world classics). */

export type DayPoem = {
  lines: string
  author: string
  work: string
}

const POEMS: DayPoem[] = [
  {
    lines: 'To be yourself in a world that is constantly trying to make you something else is the greatest accomplishment.',
    author: 'Ralph Waldo Emerson',
    work: 'Essay',
  },
  {
    lines: 'Hope is the thing with feathers\nThat perches in the soul —\nAnd sings the tune without the words.',
    author: 'Emily Dickinson',
    work: 'Hope is the thing…',
  },
  {
    lines: 'What is now proved was once only imagined.',
    author: 'William Blake',
    work: 'The Marriage of Heaven and Hell',
  },
  {
    lines: 'The journey of a thousand miles begins with a single step.',
    author: 'Laozi',
    work: 'Tao Te Ching',
  },
  {
    lines: 'We are such stuff\nAs dreams are made on, and our little life\nIs rounded with a sleep.',
    author: 'William Shakespeare',
    work: 'The Tempest',
  },
  {
    lines: 'I celebrate myself, and sing myself,\nAnd what I assume you shall assume.',
    author: 'Walt Whitman',
    work: 'Song of Myself',
  },
  {
    lines: 'A thing of beauty is a joy for ever:\nIts loveliness increases; it will never\nPass into nothingness.',
    author: 'John Keats',
    work: 'Endymion',
  },
  {
    lines: 'Я помню чудное мгновенье:\nПередо мной явилась ты…',
    author: 'А. С. Пушкин',
    work: 'К ***',
  },
  {
    lines: 'Садок вишневий коло хати,\nХрущі над вишнями гудуть.',
    author: 'Т. Шевченко',
    work: 'Садок вишневий…',
  },
  {
    lines: 'Zwei Seelen wohnen, ach! in meiner Brust.',
    author: 'Johann Wolfgang von Goethe',
    work: 'Faust',
  },
  {
    lines: 'Il faut cultiver notre jardin.',
    author: 'Voltaire',
    work: 'Candide',
  },
  {
    lines: 'There is a pleasure in the pathless woods,\nThere is a rapture on the lonely shore.',
    author: 'Lord Byron',
    work: 'Childe Harold',
  },
]

/** Stable daily pick — same poem for a given day string (YYYY-MM-DD). */
export function poemForDay(day: string): DayPoem {
  let h = 0
  for (let i = 0; i < day.length; i++) h = (h * 31 + day.charCodeAt(i)) >>> 0
  return POEMS[h % POEMS.length]
}
