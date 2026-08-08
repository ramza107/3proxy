type IconName = 'tablets' | 'cross' | 'angel' | 'saint' | 'lyre' | 'beads' | 'book' | 'quill'

const gold = '#D4B56A'
const ink = '#1A1A1A'

export function LibraryIcon({ name }: { name: IconName }) {
  switch (name) {
    case 'tablets':
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <rect x="10" y="12" width="18" height="40" rx="3" fill={gold} stroke={ink} strokeWidth="2.2" />
          <rect x="36" y="12" width="18" height="40" rx="3" fill={gold} stroke={ink} strokeWidth="2.2" />
          <path d="M15 24h8M15 32h8M15 40h6M41 24h8M41 32h8M41 40h6" stroke={ink} strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    case 'cross':
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M32 8v48M18 22h28M22 34h20" stroke={ink} strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="32" cy="22" r="3.2" fill={gold} stroke={ink} strokeWidth="1.5" />
        </svg>
      )
    case 'angel':
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="18" r="7" fill={gold} stroke={ink} strokeWidth="2" />
          <path d="M20 50c2-12 8-18 12-18s10 6 12 18" fill="none" stroke={ink} strokeWidth="2.2" />
          <path d="M14 28c8 2 12 8 12 14M50 28c-8 2-12 8-12 14" fill="none" stroke={ink} strokeWidth="2" />
          <path d="M32 10l2 4 4 .5-3 3 .8 4L32 19l-3.8 2.5.8-4-3-3 4-.5 2-4z" fill={gold} stroke={ink} strokeWidth="1.2" />
        </svg>
      )
    case 'saint':
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="16" r="8" fill="none" stroke={gold} strokeWidth="2.4" />
          <circle cx="32" cy="18" r="5.5" fill="#f3e6c8" stroke={ink} strokeWidth="1.8" />
          <path d="M20 52c2-14 7-20 12-20s10 6 12 20" fill="none" stroke={ink} strokeWidth="2.2" />
          <path d="M26 20c2 6 4 8 6 8s4-2 6-8" fill="none" stroke={ink} strokeWidth="1.8" />
        </svg>
      )
    case 'lyre':
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <path d="M18 22c0-8 6-14 14-14s14 6 14 14v20c0 6-4 10-10 12" fill="none" stroke={ink} strokeWidth="2.2" />
          <path d="M22 24v18M28 22v22M34 22v22M40 24v18" stroke={gold} strokeWidth="2" strokeLinecap="round" />
          <path d="M16 48h20" stroke={ink} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      )
    case 'beads':
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <circle cx="32" cy="14" r="4" fill={gold} stroke={ink} strokeWidth="1.6" />
          <circle cx="20" cy="22" r="3.5" fill="none" stroke={ink} strokeWidth="1.8" />
          <circle cx="44" cy="22" r="3.5" fill="none" stroke={ink} strokeWidth="1.8" />
          <circle cx="16" cy="34" r="3.5" fill="none" stroke={ink} strokeWidth="1.8" />
          <circle cx="48" cy="34" r="3.5" fill="none" stroke={ink} strokeWidth="1.8" />
          <circle cx="22" cy="46" r="3.5" fill="none" stroke={ink} strokeWidth="1.8" />
          <circle cx="42" cy="46" r="3.5" fill="none" stroke={ink} strokeWidth="1.8" />
          <circle cx="32" cy="52" r="4" fill={gold} stroke={ink} strokeWidth="1.6" />
        </svg>
      )
    case 'book':
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <rect x="14" y="12" width="36" height="42" rx="3" fill="#f7f1e4" stroke={ink} strokeWidth="2.2" />
          <path d="M32 12v42" stroke={ink} strokeWidth="1.8" />
          <path d="M32 22v18M25 28h14" stroke={gold} strokeWidth="2.4" strokeLinecap="round" />
        </svg>
      )
    case 'quill':
      return (
        <svg viewBox="0 0 64 64" aria-hidden="true">
          <ellipse cx="24" cy="42" rx="10" ry="7" fill={gold} stroke={ink} strokeWidth="1.8" />
          <path d="M28 38c8-10 18-20 26-26-2 10-10 22-22 30" fill="none" stroke={ink} strokeWidth="2.2" />
          <path d="M48 14l4-2" stroke={ink} strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
  }
}
