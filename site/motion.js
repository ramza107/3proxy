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
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
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

  // —— Quiet: white band expands + Morning/Evening phones ——
  const quiet = document.querySelector('[data-quiet]')
  const qBand = document.querySelector('[data-qband]')
  const qPhoneL = document.querySelector('[data-qphone-l]')
  const qPhoneR = document.querySelector('[data-qphone-r]')

  let target = 0
  let current = 0
  let cTarget = 0
  let cCurrent = 0
  let qTarget = 0
  let qCurrent = 0
  let activeShot = -1
  let copyGen = 0
  let raf = 0
  let lastTs = 0
  let orbitDirty = false

  // Cached layout — avoid getBoundingClientRect layout thrash every frame
  const metrics = {
    vh: window.innerHeight,
    vw: window.innerWidth,
    cineTop: 0,
    cineRange: 1,
    convergeTop: 0,
    convergeRange: 1,
    quietTop: 0,
    quietRange: 1,
  }

  const narrow = () => metrics.vw <= 900

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n))
  }

  function lerp(a, b, t) {
    return a + (b - a) * t
  }

  function easeInOut(t) {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
  }

  /** Critically-damped-ish follow: stable across frame rates, no rubber-band hitch. */
  function follow(cur, tgt, dt, speed) {
    const t = 1 - Math.exp(-speed * dt)
    const next = cur + (tgt - cur) * t
    return Math.abs(tgt - next) < 0.0004 ? tgt : next
  }

  function measure() {
    metrics.vh = window.innerHeight
    metrics.vw = window.innerWidth
    const y = window.scrollY || window.pageYOffset || 0

    const measureSection = (el) => {
      if (!el) return { top: 0, range: 1 }
      const top = el.getBoundingClientRect().top + y
      const range = Math.max(1, el.offsetHeight - metrics.vh)
      return { top, range }
    }

    const c = measureSection(cine)
    metrics.cineTop = c.top
    metrics.cineRange = c.range
    const g = measureSection(converge)
    metrics.convergeTop = g.top
    metrics.convergeRange = g.range
    const q = measureSection(quiet)
    metrics.quietTop = q.top
    metrics.quietRange = q.range
  }

  function progressOf(top, range) {
    const y = window.scrollY || window.pageYOffset || 0
    return clamp((y - top) / range, 0, 1)
  }

  function setShot(index) {
    if (index === activeShot) return
    activeShot = index
    shots.forEach((img, i) => img.classList.toggle('is-active', i === index))
    dots.forEach((d, i) => d.classList.toggle('is-on', i === index))
    const ch = CHAPTERS[index] || CHAPTERS[0]
    const gen = ++copyGen

    const swapCopy = (el, text, dy) => {
      if (!el) return
      el.classList.add('is-swap')
      el.style.setProperty('--swap-y', `${dy}px`)
      window.setTimeout(() => {
        if (gen !== copyGen) return
        el.textContent = text
        el.classList.remove('is-swap')
      }, 160)
    }
    swapCopy(chapterEl, ch.name, 6)
    swapCopy(lineEl, ch.line, 8)

    // Light sweep only on wide screens — never touches the product phone
    if (sweep && !narrow()) {
      sweep.classList.remove('is-run')
      // next frame restart without forced layout read when possible
      requestAnimationFrame(() => {
        if (gen !== copyGen) return
        sweep.classList.add('is-run')
      })
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
    const enterE = easeInOut(enter)
    const exitE = easeInOut(exit)

    // Upright phone only: translate + scale. Never rotateX/Y (iOS squash).
    const scale = small ? lerp(0.96, 1, enterE) : lerp(0.9, 1, enterE)
    const y = small
      ? lerp(12, 0, enterE) + lerp(0, -4, exitE)
      : lerp(28, 0, enterE) + lerp(0, -10, exitE)

    if (product) {
      // Float is baked into JS so it never fights CSS keyframes on the same transform.
      const float = p > 0.18 && p < 0.82 ? Math.sin(performance.now() / 900) * 3.2 : 0
      product.style.transform = `translate3d(0, ${(y + float).toFixed(2)}px, 0) scale(${scale.toFixed(4)})`
    }

    const shotIndex = clamp(Math.floor(mid * CHAPTERS.length), 0, CHAPTERS.length - 1)
    setShot(p < 0.12 ? 0 : shotIndex)

    if (hint) {
      hint.style.opacity = String(clamp(1 - p * 3.2, 0, 1) * 0.75)
    }

    if (video) {
      video.style.transform = `translate3d(0,0,0) scale(${(1.05 + mid * 0.035).toFixed(4)})`
    }
  }

  function applyConverge(p) {
    if (!converge) return
    const small = narrow()
    const rx = small ? metrics.vw * 0.42 : Math.min(metrics.vw * 0.38, 460)
    const ry = small ? metrics.vh * 0.36 : Math.min(metrics.vh * 0.34, 320)

    chips.forEach((chip, i) => {
      const ox = parseFloat(chip.dataset.ox || '0') / 50
      const oy = parseFloat(chip.dataset.oy || '0') / 50
      const stagger = (i / Math.max(chips.length - 1, 1)) * 0.28
      const local = clamp((p - 0.04 - stagger) / 0.52, 0, 1)
      const e = easeInOut(local)
      const x = ox * rx * (1 - e)
      const y = oy * ry * (1 - e)
      const s = lerp(1, 0.28, e)
      const fade = local < 0.78 ? 1 : clamp(1 - (local - 0.78) / 0.22, 0, 1)
      chip.style.transform = `translate3d(calc(-50% + ${x.toFixed(2)}px), calc(-50% + ${y.toFixed(2)}px), 0) scale(${s.toFixed(4)})`
      chip.style.opacity = fade.toFixed(3)
    })

    const phoneIn = easeInOut(clamp((p - 0.12) / 0.45, 0, 1))
    if (cPhone) {
      cPhone.style.transform = `translate3d(0,0,0) scale(${lerp(0.82, 1, phoneIn).toFixed(4)})`
      cPhone.style.opacity = lerp(0.18, 1, phoneIn).toFixed(3)
    }

    const light = easeInOut(clamp((p - 0.58) / 0.28, 0, 1))
    if (cAura) {
      cAura.style.opacity = (light * 0.95).toFixed(3)
      cAura.style.transform = `translate3d(-50%, -50%, 0) scale(${lerp(0.55, 1.12, light).toFixed(4)})`
    }
    if (cBrand) {
      cBrand.style.opacity = light.toFixed(3)
      cBrand.style.transform = `translate3d(0, ${lerp(12, 0, light).toFixed(2)}px, 0)`
      cBrand.classList.toggle('is-lit', light > 0.55)
    }
    if (cTag) {
      const tag = easeInOut(clamp((p - 0.72) / 0.2, 0, 1))
      cTag.style.opacity = (tag * 0.9).toFixed(3)
      cTag.style.transform = `translate3d(0, ${lerp(8, 0, tag).toFixed(2)}px, 0)`
    }
  }

  function applyQuiet(p) {
    if (!quiet) return
    const small = narrow()
    // GPU-only expand: scaleY from mid stripe → full viewport (no height/top layout)
    const expand = easeInOut(clamp(p / 0.48, 0, 1))
    const startS = small ? 0.54 : 0.52
    const scaleY = lerp(startS, 1, expand)
    if (qBand) {
      qBand.style.transform = `translate3d(0, -50%, 0) scaleY(${scaleY.toFixed(4)})`
    }

    const phoneIn = easeInOut(clamp((p - 0.22) / 0.42, 0, 1))
    const slide = small ? 36 : 80
    if (qPhoneL) {
      qPhoneL.style.opacity = phoneIn.toFixed(3)
      qPhoneL.style.transform = `translate3d(${lerp(-slide, 0, phoneIn).toFixed(2)}px, ${lerp(18, 0, phoneIn).toFixed(2)}px, 0)`
    }
    if (qPhoneR) {
      qPhoneR.style.opacity = phoneIn.toFixed(3)
      qPhoneR.style.transform = `translate3d(${lerp(slide, 0, phoneIn).toFixed(2)}px, ${lerp(18, 0, phoneIn).toFixed(2)}px, 0)`
    }
  }

  function sampleTargets() {
    target = progressOf(metrics.cineTop, metrics.cineRange)
    cTarget = progressOf(metrics.convergeTop, metrics.convergeRange)
    qTarget = progressOf(metrics.quietTop, metrics.quietRange)
  }

  function frame(ts) {
    if (!lastTs) lastTs = ts
    const dt = clamp((ts - lastTs) / 1000, 0, 0.048)
    lastTs = ts

    // Slightly snappy follow — high enough to feel locked to scroll, smooth across 30–120Hz
    current = follow(current, target, dt, 16)
    cCurrent = follow(cCurrent, cTarget, dt, 15)
    qCurrent = follow(qCurrent, qTarget, dt, 15)

    applyCine(current)
    applyConverge(cCurrent)
    applyQuiet(qCurrent)

    const moving =
      current !== target || cCurrent !== cTarget || qCurrent !== qTarget ||
      (current > 0.18 && current < 0.82) // keep float breathing while in mid cine

    if (moving) {
      raf = requestAnimationFrame(frame)
    } else {
      raf = 0
      lastTs = 0
    }
  }

  function kick() {
    sampleTargets()
    if (!raf) {
      lastTs = 0
      raf = requestAnimationFrame(frame)
    }
  }

  // —— Orbit: native horizontal snap ——
  const orbit = document.querySelector('[data-orbit]')
  const orbitCards = [...document.querySelectorAll('[data-orbit-card]')]

  function markNearOrbitCard() {
    if (!orbit || !orbitCards.length) return
    const midX = metrics.vw / 2
    let best = null
    let bestDist = Infinity
    for (let i = 0; i < orbitCards.length; i++) {
      const card = orbitCards[i]
      const r = card.getBoundingClientRect()
      const dist = Math.abs(r.left + r.width / 2 - midX)
      card.classList.remove('is-near')
      if (dist < bestDist) {
        bestDist = dist
        best = card
      }
    }
    if (best && bestDist < metrics.vw * 0.55) best.classList.add('is-near')
  }

  function onScroll() {
    kick()
    orbitDirty = true
    // Nav tone is cheap enough a few times per second
    if (!onScroll._nav) {
      onScroll._nav = true
      requestAnimationFrame(() => {
        onScroll._nav = false
        updateNavTone()
        if (orbitDirty) {
          orbitDirty = false
          markNearOrbitCard()
        }
      })
    }
  }

  if (orbit) {
    orbit.addEventListener(
      'scroll',
      () => {
        orbitDirty = true
        if (!orbit._raf) {
          orbit._raf = requestAnimationFrame(() => {
            orbit._raf = 0
            markNearOrbitCard()
          })
        }
      },
      { passive: true },
    )
  }

  // Explicit px ratio lock — iOS Safari flex/aspect-ratio was stretching phones
  const ratioBoxes = () => [
    ...document.querySelectorAll(
      '.cine-stack, .orbit-frame, .converge-phone .orbit-frame, .quiet-phone .orbit-frame',
    ),
  ]

  function lockPhoneRatio() {
    ratioBoxes().forEach((el) => {
      const w = el.clientWidth || el.getBoundingClientRect().width
      if (!w) return
      el.style.height = '0px'
      el.style.paddingBottom = `${((w * 1836) / 912).toFixed(2)}px`
    })
  }

  let resizeTimer = 0
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener(
    'resize',
    () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => {
        measure()
        lockPhoneRatio()
        kick()
        markNearOrbitCard()
      }, 80)
    },
    { passive: true },
  )

  measure()
  lockPhoneRatio()
  Promise.all(
    [...document.querySelectorAll('.cine-shot, .orbit-frame img')].map((img) =>
      img.decode ? img.decode().catch(() => undefined) : Promise.resolve(),
    ),
  ).then(() => {
    measure()
    lockPhoneRatio()
    kick()
  })
  window.setTimeout(() => {
    measure()
    lockPhoneRatio()
  }, 120)

  kick()
  applyCine(0)
  applyConverge(0)
  applyQuiet(0)

  if (video) {
    video.play?.().catch(() => undefined)
  }
})()
