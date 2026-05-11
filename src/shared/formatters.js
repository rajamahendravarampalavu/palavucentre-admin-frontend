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
  return String(value || '').replace(/[^\d]/g, '')
}
