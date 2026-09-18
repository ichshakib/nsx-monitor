// NSX Monitor Landing Page Logic

document.addEventListener('DOMContentLoaded', () => {
  initTelemetrySimulation()
  initTabs()
})

// Simulated live telemetry animation for the preview card
function initTelemetrySimulation() {
  const canvas = document.getElementById('telemetryChart')
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  let width = (canvas.width = canvas.parentElement.clientWidth)
  let height = (canvas.height = canvas.parentElement.clientHeight)

  window.addEventListener('resize', () => {
    width = canvas.width = canvas.parentElement.clientWidth
    height = canvas.height = canvas.parentElement.clientHeight
  })

  const pointsCount = 40
  const downloadHistory = Array(pointsCount).fill(45)
  const uploadHistory = Array(pointsCount).fill(12)

  const downloadEl = document.getElementById('val-download')
  const uploadEl = document.getElementById('val-upload')
  const latencyEl = document.getElementById('val-latency')

  let currentDown = 48.5
  let currentUp = 12.3
  let currentLatency = 14

  function updateMetrics() {
    // Subtle realistic fluctuation
    currentDown += (Math.random() - 0.48) * 6
    if (currentDown < 10) currentDown = 15
    if (currentDown > 95) currentDown = 85

    currentUp += (Math.random() - 0.48) * 3
    if (currentUp < 2) currentUp = 4
    if (currentUp > 40) currentUp = 32

    currentLatency = Math.floor(12 + Math.random() * 5)

    if (downloadEl) downloadEl.textContent = `${currentDown.toFixed(1)} MB/s`
    if (uploadEl) uploadEl.textContent = `${currentUp.toFixed(1)} MB/s`
    if (latencyEl) latencyEl.textContent = `${currentLatency} ms`

    downloadHistory.shift()
    downloadHistory.push(currentDown)

    uploadHistory.shift()
    uploadHistory.push(currentUp)
  }

  function renderChart() {
    ctx.clearRect(0, 0, width, height)

    // Render Grid Lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'
    ctx.lineWidth = 1
    ctx.beginPath()
    for (let y = 0; y < height; y += 30) {
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
    }
    ctx.stroke()

    // Draw Line helper
    function drawStream(data, color, fillColor) {
      const step = width / (pointsCount - 1)
      const maxVal = 100

      ctx.beginPath()
      data.forEach((val, i) => {
        const x = i * step
        const y = height - (val / maxVal) * (height - 20) - 10
        if (i === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      })

      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.stroke()

      // Gradient fill
      ctx.lineTo(width, height)
      ctx.lineTo(0, height)
      ctx.fillStyle = fillColor
      ctx.fill()
    }

    // Gradient fills
    const downGradient = ctx.createLinearGradient(0, 0, 0, height)
    downGradient.addColorStop(0, 'rgba(56, 189, 248, 0.25)')
    downGradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)')

    const upGradient = ctx.createLinearGradient(0, 0, 0, height)
    upGradient.addColorStop(0, 'rgba(16, 185, 129, 0.2)')
    upGradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)')

    drawStream(downloadHistory, '#38bdf8', downGradient)
    drawStream(uploadHistory, '#10b981', upGradient)
  }

  setInterval(updateMetrics, 800)

  function loop() {
    renderChart()
    requestAnimationFrame(loop)
  }
  requestAnimationFrame(loop)
}

// Tab Switching for Demo Views
function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn')
  const darkImg = document.getElementById('demo-dark')
  const lightImg = document.getElementById('demo-light')

  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'))
      tab.classList.add('active')

      const mode = tab.getAttribute('data-tab')
      if (mode === 'dark') {
        if (darkImg) darkImg.style.display = 'block'
        if (lightImg) lightImg.style.display = 'none'
      } else {
        if (darkImg) darkImg.style.display = 'none'
        if (lightImg) lightImg.style.display = 'block'
      }
    })
  })
}
