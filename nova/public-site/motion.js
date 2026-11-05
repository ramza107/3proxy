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

  // —— Converge: tasks → phone → Wahrly glow ——
  const converge = document.querySelector('[data-converge]')
  const chips = [...document.querySelectorAll('[data-chip]')]
  const cPhone = document.querySelector('[data-cphone]')
  const cAura = document.querySelector('[data-caura]')
  const cBrand = document.querySelector('[data-cbrand]')
  const cTag = document.querySelector('[data-ctag]')
  let cTarget = 0
  let cCurrent = 0

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

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
  }

  function sectionProgress(el) {
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    const total = el.offsetHeight - window.innerHeight
    if (total <= 0) return 0
    return clamp(-rect.top / total, 0, 1)
  }

  function cineProgress() {
    return sectionProgress(cine)
  }

  function convergeProgress() {
    return sectionProgress(converge)
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

  function applyConverge(p) {
    if (!converge) return
    const small = narrow()
    const vw = window.innerWidth
    const vh = window.innerHeight
    // Scatter radius in px — chips start far, fly to center
    const rx = small ? vw * 0.42 : Math.min(vw * 0.38, 460)
    const ry = small ? vh * 0.36 : Math.min(vh * 0.34, 320)

    chips.forEach((chip, i) => {
      const ox = parseFloat(chip.dataset.ox || '0') / 50 // -1..1-ish
      const oy = parseFloat(chip.dataset.oy || '0') / 50
      const stagger = (i / Math.max(chips.length - 1, 1)) * 0.28
      const local = clamp((p - 0.04 - stagger) / 0.52, 0, 1)
      const e = easeInOut(local)
      const x = ox * rx * (1 - e)
      const y = oy * ry * (1 - e)
      const s = lerp(1, 0.28, e)
      const fade = local < 0.78 ? 1 : clamp(1 - (local - 0.78) / 0.22, 0, 1)
      chip.style.transform = `translate3d(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px), 0) scale(${s.toFixed(3)})`
      chip.style.opacity = fade.toFixed(3)
    })

    // Phone rises as chips arrive
    const phoneIn = easeInOut(clamp((p - 0.12) / 0.45, 0, 1))
    if (cPhone) {
      const ps = lerp(0.78, 1, phoneIn)
      const po = lerp(0.18, 1, phoneIn)
      cPhone.style.transform = `scale(${ps.toFixed(3)})`
      cPhone.style.opacity = po.toFixed(3)
    }

    // Aura + brand light after gather
    const light = easeInOut(clamp((p - 0.58) / 0.28, 0, 1))
    if (cAura) {
      cAura.style.opacity = (light * 0.95).toFixed(3)
      cAura.style.transform = `translate(-50%, -50%) scale(${lerp(0.55, 1.12, light).toFixed(3)})`
    }
    if (cBrand) {
      cBrand.style.opacity = light.toFixed(3)
      cBrand.style.transform = `translateY(${lerp(14, 0, light).toFixed(1)}px)`
      cBrand.classList.toggle('is-lit', light > 0.55)
    }
    if (cTag) {
      const tag = easeInOut(clamp((p - 0.72) / 0.2, 0, 1))
      cTag.style.opacity = (tag * 0.9).toFixed(3)
      cTag.style.transform = `translateY(${lerp(10, 0, tag).toFixed(1)}px)`
    }
  }

  function onScroll() {
    target = cineProgress()
    cTarget = convergeProgress()
    if (!ticking) {
      ticking = true
      requestAnimationFrame(frame)
    }
    updateNavTone()
    markNearOrbitCard()
  }

  function frame() {
    current = lerp(current, target, 0.14)
    cCurrent = lerp(cCurrent, cTarget, 0.16)
    if (Math.abs(current - target) < 0.0008) current = target
    if (Math.abs(cCurrent - cTarget) < 0.0008) cCurrent = cTarget
    applyCine(current)
    applyConverge(cCurrent)
    if (Math.abs(current - target) > 0.0008 || Math.abs(cCurrent - cTarget) > 0.0008) {
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

  // Explicit px ratio lock — iOS Safari flex/aspect-ratio was stretching phones ~2.5× tall
  const ratioBoxes = () => [
    ...document.querySelectorAll('.cine-stack, .orbit-frame, .converge-phone .orbit-frame'),
  ]

  function lockPhoneRatio() {
    ratioBoxes().forEach((el) => {
      const w = el.clientWidth || el.getBoundingClientRect().width
      if (!w) return
      el.style.height = '0px'
      el.style.paddingBottom = `${((w * 1836) / 912).toFixed(2)}px`
    })
  }

  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', () => {
    lockPhoneRatio()
    onScroll()
  }, { passive: true })
  lockPhoneRatio()
  // After device images decode, width is stable
  Promise.all(
    [...document.querySelectorAll('.cine-shot, .orbit-frame img')].map(
      (img) => (img.decode ? img.decode().catch(() => undefined) : Promise.resolve()),
    ),
  ).then(lockPhoneRatio)
  window.setTimeout(lockPhoneRatio, 100)
  window.setTimeout(lockPhoneRatio, 600)

  onScroll()
  applyCine(0)
  applyConverge(0)

  if (video) {
    video.play?.().catch(() => undefined)
  }
})()
