let audioContext = null

function getAudioContext() {
  if (!audioContext || audioContext.state === 'closed') {
    audioContext = new (window.AudioContext || window.webkitAudioContext)()
  }
  if (audioContext.state === 'suspended') {
    audioContext.resume()
  }
  return audioContext
}

function playTone(ctx, freq, startTime, duration, volume = 0.5) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.frequency.setValueAtTime(freq, startTime)
  gain.gain.setValueAtTime(volume, startTime)
  gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration)
  osc.start(startTime)
  osc.stop(startTime + duration)
}

export function playNotificationSound() {
  try {
    const ctx = getAudioContext()
    const now = ctx.currentTime

    // Three-tone alert pattern (ding-ding-ding) — louder and longer
    playTone(ctx, 880, now, 0.2, 0.6)
    playTone(ctx, 1100, now + 0.25, 0.2, 0.6)
    playTone(ctx, 1320, now + 0.5, 0.3, 0.7)

    // Repeat after 1 second for urgency
    playTone(ctx, 880, now + 1.2, 0.2, 0.5)
    playTone(ctx, 1100, now + 1.45, 0.2, 0.5)
    playTone(ctx, 1320, now + 1.7, 0.3, 0.6)
  } catch (e) {
    // silent fail
  }
}

export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

export function showBrowserNotification(title, body) {
  if (!('Notification' in window)) return
  if (Notification.permission === 'default') {
    Notification.requestPermission().then((perm) => {
      if (perm === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico', requireInteraction: true })
      }
    })
    return
  }
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico', requireInteraction: true })
  }
}

export function updateTabTitle(count) {
  const base = 'Palavu Admin'
  document.title = count > 0 ? `(${count}) ${base}` : base
}
