(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  // Mark key blocks for reveal
  const targets = document.querySelectorAll(
    '.quiet-kicker, .quiet-title, .show, .strip-copy > *, .finale-inner > *',
  )
  targets.forEach((el) => el.classList.add('reveal'))

  if (reduce) {
    targets.forEach((el) => el.classList.add('in'))
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
      { threshold: 0.18, rootMargin: '0px 0px -8% 0px' },
    )
    targets.forEach((el) => io.observe(el))
  } else {
    targets.forEach((el) => el.classList.add('in'))
  }

  // Soft pointer parallax on hero product
  const product = document.querySelector('.hero-product')
  if (product && !reduce) {
    window.addEventListener(
      'pointermove',
      (e) => {
        const x = (e.clientX / window.innerWidth - 0.5) * 12
        const y = (e.clientY / window.innerHeight - 0.5) * 8
        product.style.setProperty('--tx', `${x.toFixed(2)}px`)
        product.style.setProperty('--ty', `${y.toFixed(2)}px`)
      },
      { passive: true },
    )
  }
})()
