document.addEventListener('DOMContentLoaded', () => {
  // Smooth scroll for in-page anchors
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href')
      if (targetId === '#') return

      const target = document.querySelector(targetId)
      if (target) {
        e.preventDefault()
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }
    })
  })
})
