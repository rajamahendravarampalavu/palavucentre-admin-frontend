export function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(Number(value || 0))
}

export function formatDate(value) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatDateTime(value) {
  if (!value) {
    return '-'
  }

  return new Date(value).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function normalizePhoneNumber(value) {
  const digits = String(value || '').replace(/[^\d]/g, '')

  if (digits.length === 14 && digits.startsWith('0091')) {
    return digits.slice(4)
  }

  if (digits.length === 13 && digits.startsWith('091')) {
    return digits.slice(3)
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2)
  }

  if (digits.length === 11 && digits.startsWith('0')) {
    return digits.slice(1)
  }

  return digits
}
