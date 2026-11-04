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

  let target = 0
  let current = 0
  let activeShot = -1
  let ticking = false
  let copyGen = 0

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
    // light sweep when chapter changes
    if (sweep) {
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

  function applyCine(p) {
    // Entrance → orbit → settle
    // 0–0.15: rise + scale in
    // 0.15–0.85: rotate & cycle screens
    // 0.85–1: straighten
    const enter = clamp(p / 0.15, 0, 1)
    const mid = clamp((p - 0.15) / 0.7, 0, 1)
    const exit = clamp((p - 0.85) / 0.15, 0, 1)

    const scale = lerp(0.72, 1, enter)
    const y = lerp(80, 0, enter) + lerp(0, -20, exit)
    const rotY = lerp(-28, 0, enter) + Math.sin(mid * Math.PI * 2) * 16 * (1 - exit)
    const rotX = lerp(12, 0, enter) + Math.sin(mid * Math.PI) * -4

    if (product) {
      product.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0) rotateX(${rotX.toFixed(
        2,
      )}deg) rotateY(${rotY.toFixed(2)}deg) scale(${scale.toFixed(3)})`
    }

    const shotIndex = clamp(Math.floor(mid * CHAPTERS.length), 0, CHAPTERS.length - 1)
    // Hold first shot during entrance
    setShot(p < 0.12 ? 0 : shotIndex)

    if (hint) {
      hint.style.opacity = String(clamp(1 - p * 3, 0, 1) * 0.7)
    }

    // Subtle video scrub for depth (also keep looping)
    if (video && video.duration && Number.isFinite(video.duration)) {
      const t = (video.duration * 0.15 + mid * video.duration * 0.7) % video.duration
      // Only nudge when paused path — keep autoplay; soft currentTime can hitch.
      // Instead scale video slightly with progress:
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

    const mid = window.innerWidth / 2
    orbitCards.forEach((card) => {
      const r = card.getBoundingClientRect()
      const c = r.left + r.width / 2
      const dist = Math.abs(c - mid) / (window.innerWidth * 0.45)
      card.classList.toggle('is-near', dist < 0.55)
      const tilt = clamp((c - mid) / mid, -1, 1)
      if (!card.classList.contains('is-near')) {
        card.style.transform = `rotateY(${(-18 - tilt * 8).toFixed(1)}deg) rotateX(4deg) scale(0.96)`
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
