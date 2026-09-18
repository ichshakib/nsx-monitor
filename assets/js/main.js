// NSX Monitor Landing Page Controller

document.addEventListener('DOMContentLoaded', () => {
  initTheme()
  initTabs()
  initThroughputSimulator()
})

// Theme toggle (Dark / Light)
function initTheme() {
  const toggleBtn = document.getElementById('themeToggleBtn')
  const root = document.documentElement

  // Default to dark mode
  const savedTheme = localStorage.getItem('nsx-theme') || 'dark'
  root.className = savedTheme

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const isDark = root.classList.contains('dark')
      const newTheme = isDark ? 'light' : 'dark'
      root.className = newTheme
      localStorage.setItem('nsx-theme', newTheme)
    })
  }
}

// Screenshot Showcase Tab Switching
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn')
  const darkImg = document.getElementById('previewDark')
  const lightImg = document.getElementById('previewLight')

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'))
      btn.classList.add('active')

      const target = btn.getAttribute('data-tab')
      if (target === 'dark') {
        if (darkImg) darkImg.style.display = 'block'
        if (lightImg) lightImg.style.display = 'none'
      } else {
        if (darkImg) darkImg.style.display = 'none'
        if (lightImg) lightImg.style.display = 'block'
      }
    })
  })
}

// Live simulated bandwidth throughput numbers in Bento Box
function initThroughputSimulator() {
  const downVal = document.getElementById('bento-down')
  const upVal = document.getElementById('bento-up')
  if (!downVal || !upVal) return

  let currentDown = 42.5
  let currentUp = 8.2

  setInterval(() => {
    currentDown += (Math.random() - 0.48) * 4
    if (currentDown < 10) currentDown = 25
    if (currentDown > 90) currentDown = 75

    currentUp += (Math.random() - 0.48) * 2
    if (currentUp < 2) currentUp = 5
    if (currentUp > 40) currentUp = 28

    downVal.textContent = `${currentDown.toFixed(1)} MB/s`
    upVal.textContent = `${currentUp.toFixed(1)} MB/s`
  }, 900)
}
