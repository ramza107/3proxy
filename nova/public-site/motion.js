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
      { threshold: 0.16, rootMargin: '0px 0px -6% 0px' },
    )
    reveals.forEach((el) => io.observe(el))
  } else {
    reveals.forEach((el) => el.classList.add('in'))
  }

  if (reduce) return

  // —— Cinematic scroll scrub ——
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
  const lightSections = [...document.querySelectorAll('[data-light]')]

  let target = 0
  let current = 0
  let activeShot = -1
  let ticking = false
  let copyGen = 0

  const isMobile = () => window.matchMedia('(max-width: 900px)').matches

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
    // light sweep when chapter changes (desktop only — quieter on phones)
    if (sweep && !isMobile()) {
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
    const y = 28
    const overLight = lightSections.some((sec) => {
      const r = sec.getBoundingClientRect()
      return r.top <= y && r.bottom >= y + 40
    })
    nav.classList.toggle('on-light', overLight)
  }

  function applyCine(p) {
    // Entrance → orbit → settle
    const enter = clamp(p / 0.15, 0, 1)
    const mid = clamp((p - 0.15) / 0.7, 0, 1)
    const exit = clamp((p - 0.85) / 0.15, 0, 1)
    const mobile = isMobile()

    // Mobile: upright + float only. 3D rotateY made iOS look crushed/left-skewed.
    const scale = mobile ? lerp(0.94, 1, enter) : lerp(0.78, 1, enter)
    const y = mobile
      ? lerp(18, 0, enter) + lerp(0, -8, exit)
      : lerp(70, 0, enter) + lerp(0, -18, exit)
    const rotY = mobile ? 0 : lerp(-22, 0, enter) + Math.sin(mid * Math.PI * 2) * 14 * (1 - exit)
    const rotX = mobile ? 0 : lerp(8, 0, enter) + Math.sin(mid * Math.PI) * -3

    if (product) {
      product.classList.toggle('is-idle', p < 0.08 || (mobile && p > 0.2 && p < 0.85))
      product.style.transform = mobile
        ? `translate3d(0, ${y.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`
        : `translate3d(0, ${y.toFixed(1)}px, 0) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(
            2,
          )}deg) scale(${scale.toFixed(3)})`
    }

    const shotIndex = clamp(Math.floor(mid * CHAPTERS.length), 0, CHAPTERS.length - 1)
    setShot(p < 0.12 ? 0 : shotIndex)

    if (hint) {
      hint.style.opacity = String(clamp(1 - p * 3, 0, 1) * 0.7)
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
    updateOrbit()
    updateNavTone()
  }

  function frame() {
    current = lerp(current, target, 0.12)
    if (Math.abs(current - target) < 0.0008) current = target
    applyCine(current)
    if (Math.abs(current - target) > 0.0008) {
      requestAnimationFrame(frame)
    } else {
      ticking = false
    }
  }

  // —— Horizontal orbit section ——
  const orbit = document.querySelector('[data-orbit]')
  const orbitCards = [...document.querySelectorAll('[data-orbit-card]')]

  function updateOrbit() {
    if (!orbit) return
    // Mobile uses native horizontal scroll — never apply 3D / translate hacks.
    if (isMobile()) {
      orbit.style.transform = ''
      orbitCards.forEach((card) => {
        card.style.transform = ''
        card.classList.remove('is-near')
      })
      return
    }
    const section = orbit.closest('.orbit')
    if (!section) return
    const rect = section.getBoundingClientRect()
    const view = window.innerHeight
    const start = view * 0.85
    const end = -rect.height * 0.2
    const raw = (start - rect.top) / (start - end)
    const p = clamp(raw, 0, 1)
    const maxX = Math.max(0, orbit.scrollWidth - window.innerWidth + 80)
    orbit.style.transform = `translate3d(${(-maxX * p).toFixed(1)}px, 0, 0)`

    const midX = window.innerWidth / 2
    orbitCards.forEach((card) => {
      const r = card.getBoundingClientRect()
      const c = r.left + r.width / 2
      const dist = Math.abs(c - midX) / (window.innerWidth * 0.45)
      card.classList.toggle('is-near', dist < 0.55)
      const tilt = clamp((c - midX) / midX, -1, 1)
      if (!card.classList.contains('is-near')) {
        card.style.transform = `rotateY(${(-14 - tilt * 6).toFixed(1)}deg) rotateX(3deg) scale(0.97)`
      } else {
        card.style.transform = ''
      }
    })
  }

  // Pointer parallax on product (subtle, layered on scroll transform via CSS vars)
  let px = 0
  let py = 0
  window.addEventListener(
    'pointermove',
    (e) => {
      px = (e.clientX / window.innerWidth - 0.5) * 10
      py = (e.clientY / window.innerHeight - 0.5) * 6
      if (product && !cine?.matches(':hover')) {
        // Applied as additional translate in a child would fight scroll — skip while scrubbing hard.
      }
      void px
      void py
    },
    { passive: true },
  )

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  onScroll()
  applyCine(0)

  // Ensure video plays
  if (video) {
    video.play?.().catch(() => undefined)
  }
})()
