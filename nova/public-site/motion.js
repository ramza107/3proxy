(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const reveals = document.querySelectorAll('.reveal')
  if (reduce) {
    reveals.forEach((el) => el.classList.add('in'))
  } else {
    // Hero reveals on load
    requestAnimationFrame(() => {
      reveals.forEach((el) => el.classList.add('in'))
    })
  }

  // Soft parallax on hero phone
  const phone = document.querySelector('.hero .phone')
  if (phone && !reduce) {
    window.addEventListener(
      'pointermove',
      (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 10
        const y = (e.clientY / window.innerHeight - 0.5) * 8
        phone.style.transform = `translate3d(${x}px, ${y}px, 0)`
      },
      { passive: true },
    )
  }

  // Drag-to-scroll for the screens rail on desktop
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
  rail.addEventListener('pointermove', (e) => {
    if (!down) return
    const x = e.pageX - rail.offsetLeft
    rail.scrollLeft = scrollLeft - (x - startX)
  })
})()
