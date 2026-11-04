(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const CHAPTERS = [
    { name: 'Home', line: 'Your life, clearly.' },
    { name: 'Tasks', line: 'The week, laid gently.' },
    { name: 'Chat', line: 'Say it. Wahrly places it.' },
    { name: 'Dates', line: 'Remember what matters.' },
    { name: 'Bills', line: 'Money loops, on time.' },
  ]

  // —— Reveal blocks ——
  const reveals = document.querySelectorAll('.reveal')
  if (reduce) {
    reveals.forEach((el) => el.classList.add('in'))
  } else if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.08, rootMargin: '0px 0px -4% 0px' },
    )
    reveals.forEach((el) => io.observe(el))
  } else {
    reveals.forEach((el) => el.classList.add('in'))
  }

  if (reduce) return

  // —— Cinematic scroll scrub (2D only — no rotateX/Y; those crush phones on iOS) ——
  const cine = document.querySelector('[data-cine]')
  const product = document.querySelector('[data-product]')
  const shots = [...document.querySelectorAll('[data-shot]')]
  const chapterEl = document.querySelector('[data-chapter]')
  const lineEl = document.querySelector('[data-line]')
  const hint = document.querySelector('[data-hint]')
  const sweep = document.querySelector('[data-sweep]')
  const video = document.querySelector('.cine-video')
  const dots = [...document.querySelectorAll('[data-dots] span')]
  const nav = document.querySelector('[data-nav]')

  let target = 0
  let current = 0
  let activeShot = -1
  let ticking = false
  let copyGen = 0

  const narrow = () => window.matchMedia('(max-width: 900px)').matches

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n))
  }

  function lerp(a, b, t) {
    return a + (b - a) * t
  }

  function cineProgress() {
    if (!cine) return 0
    const rect = cine.getBoundingClientRect()
    const total = cine.offsetHeight - window.innerHeight
    if (total <= 0) return 0
    return clamp(-rect.top / total, 0, 1)
  }

  function setShot(index) {
    if (index === activeShot) return
    activeShot = index
    shots.forEach((img, i) => img.classList.toggle('is-active', i === index))
    dots.forEach((d, i) => d.classList.toggle('is-on', i === index))
    const ch = CHAPTERS[index] || CHAPTERS[0]
    const gen = ++copyGen
    if (chapterEl) {
      chapterEl.style.opacity = '0'
      chapterEl.style.transform = 'translateY(8px)'
      window.setTimeout(() => {
        if (gen !== copyGen) return
        chapterEl.textContent = ch.name
        chapterEl.style.opacity = '1'
        chapterEl.style.transform = 'translateY(0)'
      }, 140)
    }
    if (lineEl) {
      lineEl.style.opacity = '0'
      lineEl.style.transform = 'translateY(10px)'
      window.setTimeout(() => {
        if (gen !== copyGen) return
        lineEl.textContent = ch.line
        lineEl.style.opacity = '1'
        lineEl.style.transform = 'translateY(0)'
      }, 180)
    }
    // Light sweep only on wide screens — never touches the product phone
    if (sweep && !narrow()) {
      sweep.style.transition = 'none'
      sweep.style.opacity = '0'
      sweep.style.transform = 'translateX(-40%) skewX(-12deg)'
      void sweep.offsetWidth
      sweep.style.transition = 'transform 0.9s ease, opacity 0.5s ease'
      sweep.style.opacity = '1'
      sweep.style.transform = 'translateX(280%) skewX(-12deg)'
      window.setTimeout(() => {
        if (gen !== copyGen) return
        sweep.style.opacity = '0'
      }, 700)
    }
  }

  function updateNavTone() {
    if (!nav) return
    const y = 48
    const onLight = [...document.querySelectorAll('[data-light]')].some((sec) => {
      const r = sec.getBoundingClientRect()
      return r.top <= y && r.bottom > y + 24
    })
    nav.classList.toggle('on-light', onLight)
  }

  function applyCine(p) {
    const enter = clamp(p / 0.15, 0, 1)
    const mid = clamp((p - 0.15) / 0.7, 0, 1)
    const exit = clamp((p - 0.85) / 0.15, 0, 1)
    const small = narrow()

    // Upright phone only: translate + scale. Never rotateX/Y (iOS squash).
    const scale = small ? lerp(0.94, 1, enter) : lerp(0.86, 1, enter)
    const y = small
      ? lerp(16, 0, enter) + lerp(0, -6, exit)
      : lerp(40, 0, enter) + lerp(0, -14, exit)

    if (product) {
      product.classList.toggle('is-idle', p < 0.1 || (p > 0.2 && p < 0.85))
      product.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`
    }

    const shotIndex = clamp(Math.floor(mid * CHAPTERS.length), 0, CHAPTERS.length - 1)
    setShot(p < 0.12 ? 0 : shotIndex)

    if (hint) {
      hint.style.opacity = String(clamp(1 - p * 3.2, 0, 1) * 0.75)
    }

    if (video) {
      video.style.transform = `scale(${(1.06 + mid * 0.04).toFixed(3)})`
    }
  }

  function onScroll() {
    target = cineProgress()
    if (!ticking) {
      ticking = true
      requestAnimationFrame(frame)
    }
    updateNavTone()
    markNearOrbitCard()
  }

  function frame() {
    current = lerp(current, target, 0.14)
    if (Math.abs(current - target) < 0.0008) current = target
    applyCine(current)
    if (Math.abs(current - target) > 0.0008) {
      requestAnimationFrame(frame)
    } else {
      ticking = false
    }
  }

  // —— Orbit: native horizontal snap on every device (no 3D, no JS translate) ——
  const orbit = document.querySelector('[data-orbit]')
  const orbitCards = [...document.querySelectorAll('[data-orbit-card]')]

  function markNearOrbitCard() {
    if (!orbit || !orbitCards.length) return
    const midX = window.innerWidth / 2
    let best = null
    let bestDist = Infinity
    orbitCards.forEach((card) => {
      const r = card.getBoundingClientRect()
      const c = r.left + r.width / 2
      const dist = Math.abs(c - midX)
      card.classList.toggle('is-near', false)
      if (dist < bestDist) {
        bestDist = dist
        best = card
      }
    })
    if (best && bestDist < window.innerWidth * 0.55) best.classList.add('is-near')
  }

  if (orbit) {
    orbit.addEventListener('scroll', markNearOrbitCard, { passive: true })
  }

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  onScroll()
  applyCine(0)

  if (video) {
    video.play?.().catch(() => undefined)
  }
})()
