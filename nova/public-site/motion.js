(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const reveals = document.querySelectorAll('.reveal')
  if (reduce) {
    reveals.forEach((el) => el.classList.add('in'))
  } else {
    requestAnimationFrame(() => {
      reveals.forEach((el) => el.classList.add('in'))
    })
  }

  // Soft parallax on a wrapper so it never fights the float animation.
  const stage = document.querySelector('.hero-stage .phone-hero')
  if (stage && !reduce) {
    window.addEventListener(
      'pointermove',
      (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 8
        const y = (e.clientY / window.innerHeight - 0.5) * 6
        stage.style.setProperty('--px', `${x.toFixed(2)}px`)
        stage.style.setProperty('--py', `${y.toFixed(2)}px`)
      },
      { passive: true },
    )
  }

  const rail = document.querySelector('[data-rail]')
  if (!rail) return
  let down = false
  let startX = 0
  let scrollLeft = 0
  rail.addEventListener('pointerdown', (e) => {
    down = true
    startX = e.pageX - rail.offsetLeft
    scrollLeft = rail.scrollLeft
    rail.setPointerCapture(e.pointerId)
  })
  rail.addEventListener('pointerup', () => {
    down = false
  })
  rail.addEventListener('pointerleave', () => {
    down = false
  })
  rail.addEventListener('pointermove', (e) => {
    if (!down) return
    e.preventDefault()
    const x = e.pageX - rail.offsetLeft
    rail.scrollLeft = scrollLeft - (x - startX)
  })
})()
