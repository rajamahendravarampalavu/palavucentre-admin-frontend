const NOTIFICATION_SOUND_URL = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgipGQfWBRW3yNk4x3YFRfgIuLhXZiVWGAi4uFdmJVYYCLi4V2YlVhgIuLhXZiVWGAi4uFdmJVYYCLi4V2YlVhgIuLhXZiVWGAi4uFdmJVYF/iYmDdmFUYH+JiYN2YVRgf4mJg3ZhVGB/iYmDdmFUYH+JiYN2YVRgf4mJg3ZhVGB/iYmDdmFUYH+JiYN2YVRgf4mJg3ZhVGB/iYmDdmFUYH+JiYN2YVRgf4mJg3ZhVGB/iYmDdmFUYH+JiYN2YVRgf4mJg3ZhVGB/iYmDdmFUYH+JiYN2YVRgf4mJg3ZhVGB/iYmDdmFUYH+JiYN2YVRgf4mJg3ZhVGB/iYmDdmFUYH+JiYN2YVRgf4mJg3ZhVGB/iYmDdmFUYH+JiYN2YVRgf4mJg3ZhVA=='

let audioContext = null

export function playNotificationSound() {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }
    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)
    oscillator.frequency.setValueAtTime(830, audioContext.currentTime)
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1)
    oscillator.frequency.setValueAtTime(830, audioContext.currentTime + 0.2)
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4)
    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.4)
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
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico', tag: 'palavu-order' })
  }
}

export function updateTabTitle(count) {
  const base = 'Palavu Admin'
  document.title = count > 0 ? `(${count}) ${base}` : base
}
