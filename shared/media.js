const ABSOLUTE_URL_PATTERN = /^[a-z][a-z0-9+.-]*:/i
const MANAGED_UPLOAD_PREFIX = '/uploads/'
const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1'])

function isPrivateIpv4(hostname) {
  const parts = hostname.split('.').map((part) => Number(part))
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return false
  }

  if (parts[0] === 10 || parts[0] === 127) {
    return true
  }

  if (parts[0] === 192 && parts[1] === 168) {
    return true
  }

  return parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31
}

function isLocalHostname(hostname) {
  const normalized = String(hostname || '').trim().toLowerCase()
  if (!normalized) {
    return false
  }

  return LOCAL_HOSTNAMES.has(normalized) || normalized.endsWith('.local') || isPrivateIpv4(normalized)
}

function mapItems(items, mapper) {
  return Array.isArray(items) ? items.map(mapper) : []
}

function normalizeUploadsPath(value) {
  if (!value) {
    return null
  }

  const path = String(value).startsWith('/') ? String(value) : `/${String(value).replace(/^\/+/, '')}`
  return path.startsWith(MANAGED_UPLOAD_PREFIX) ? path : null
}

function resolveManagedAssetUrl(pathname, assetBaseUrl) {
  const normalizedPath = normalizeUploadsPath(pathname)
  if (!normalizedPath) {
    return null
  }

  return assetBaseUrl ? `${assetBaseUrl}${normalizedPath}` : normalizedPath
}

export function getAssetBaseUrl(apiBaseUrl) {
  if (!apiBaseUrl || typeof window === 'undefined') {
    return ''
  }

  try {
    const resolvedUrl = new URL(apiBaseUrl, window.location.origin)
    return resolvedUrl.origin === window.location.origin ? '' : resolvedUrl.origin
  } catch {
    return ''
  }
}

export function sanitizeAssetUrl(value, { assetBaseUrl = '' } = {}) {
  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) {
    return trimmed
  }

  if (trimmed.startsWith(MANAGED_UPLOAD_PREFIX)) {
    return resolveManagedAssetUrl(trimmed, assetBaseUrl)
  }

  if (trimmed.startsWith('/')) {
    return trimmed
  }

  if (!ABSOLUTE_URL_PATTERN.test(trimmed)) {
    return null
  }

  try {
    const parsedUrl = new URL(trimmed)
    if (parsedUrl.pathname.startsWith(MANAGED_UPLOAD_PREFIX)) {
      return resolveManagedAssetUrl(parsedUrl.pathname, assetBaseUrl || parsedUrl.origin)
    }

    if (typeof window !== 'undefined' && window.location.protocol === 'https:' && parsedUrl.protocol === 'http:') {
      return null
    }

    if (typeof window !== 'undefined' && isLocalHostname(parsedUrl.hostname) && parsedUrl.origin !== window.location.origin) {
      return null
    }

    return parsedUrl.toString()
  } catch {
    return null
  }
}

function normalizeMenuItem(item, options) {
  if (!item || typeof item !== 'object') {
    return item
  }

  return {
    ...item,
    img: sanitizeAssetUrl(item.img, options),
  }
}

function normalizeMenuCategory(category, options) {
  if (!category || typeof category !== 'object') {
    return category
  }

  return {
    ...category,
    items: Array.isArray(category.items) ? category.items.map((item) => normalizeMenuItem(item, options)) : category.items,
  }
}

function normalizeGalleryItem(item, options) {
  if (!item || typeof item !== 'object') {
    return item
  }

  return {
    ...item,
    url: sanitizeAssetUrl(item.url, options),
  }
}

function normalizeOffer(item, options) {
  if (!item || typeof item !== 'object') {
    return item
  }

  return {
    ...item,
    imageUrl: sanitizeAssetUrl(item.imageUrl, options),
  }
}

function normalizeOrder(order, options) {
  if (!order || typeof order !== 'object') {
    return order
  }

  return {
    ...order,
    items: mapItems(order.items, (item) => ({
      ...item,
      img: sanitizeAssetUrl(item?.img, options),
    })),
  }
}

function normalizeSiteSettings(settings, options) {
  if (!settings || typeof settings !== 'object') {
    return settings
  }

  return {
    ...settings,
    logoUrl: sanitizeAssetUrl(settings.logoUrl, options),
    heroMedia: mapItems(settings.heroMedia, (item) => ({
      ...item,
      url: sanitizeAssetUrl(item?.url, options),
    })).filter((item) => Boolean(item.url)),
  }
}

function normalizeListContainer(data, mapper) {
  if (Array.isArray(data)) {
    return data.map(mapper)
  }

  if (data && typeof data === 'object' && Array.isArray(data.items)) {
    return {
      ...data,
      items: data.items.map(mapper),
    }
  }

  return mapper(data)
}

function normalizeMenuPayload(data, options) {
  if (!data || typeof data !== 'object') {
    return data
  }

  const groupedItems = Object.fromEntries(
    Object.entries(data.groupedItems || {}).map(([key, items]) => [
      key,
      mapItems(items, (item) => normalizeMenuItem(item, options)),
    ]),
  )

  return {
    ...data,
    items: mapItems(data.items, (item) => normalizeMenuItem(item, options)),
    groupedItems,
    categories: Array.isArray(data.categories) ? data.categories.map((category) => normalizeMenuCategory(category, options)) : data.categories,
  }
}

function normalizeProfilePayload(data, options) {
  if (!data || typeof data !== 'object') {
    return data
  }

  return {
    ...data,
    orders: mapItems(data.orders, (order) => normalizeOrder(order, options)),
  }
}

function normalizeOrderPayload(data, options) {
  if (!data || typeof data !== 'object') {
    return data
  }

  return {
    ...data,
    order: data.order ? normalizeOrder(data.order, options) : data.order,
    items: Array.isArray(data.items) ? data.items.map((item) => normalizeOrder(item, options)) : data.items,
  }
}

export function normalizeApiData(path, data, options = {}) {
  if (!data || typeof data !== 'object') {
    return data
  }

  if (path.startsWith('/menu')) {
    return normalizeMenuPayload(data, options)
  }

  if (path.startsWith('/gallery')) {
    const normalized = normalizeListContainer(data, (item) => normalizeGalleryItem(item, options))
    if (normalized && typeof normalized === 'object' && Array.isArray(normalized.items)) {
      return {
        ...normalized,
        items: normalized.items.filter((item) => Boolean(item?.url)),
      }
    }

    return normalized
  }

  if (path.startsWith('/offers')) {
    return normalizeListContainer(data, (item) => normalizeOffer(item, options))
  }

  if (path.startsWith('/site-settings')) {
    return normalizeSiteSettings(data, options)
  }

  if (path.startsWith('/account/profile')) {
    return normalizeProfilePayload(data, options)
  }

  if (path.startsWith('/account/orders')) {
    return normalizeListContainer(data, (item) => normalizeOrder(item, options))
  }

  if (path.startsWith('/orders')) {
    return normalizeOrderPayload(data, options)
  }

  if (path.startsWith('/payments/razorpay/')) {
    return normalizeOrderPayload(data, options)
  }

  if (path.startsWith('/admin/menu/categories')) {
    return normalizeListContainer(data, (item) => normalizeMenuCategory(item, options))
  }

  if (path.startsWith('/admin/menu/items')) {
    return normalizeListContainer(data, (item) => normalizeMenuItem(item, options))
  }

  if (path.startsWith('/admin/gallery')) {
    return normalizeListContainer(data, (item) => normalizeGalleryItem(item, options))
  }

  if (path.startsWith('/admin/offers')) {
    return normalizeListContainer(data, (item) => normalizeOffer(item, options))
  }

  if (path.startsWith('/admin/orders')) {
    return normalizeListContainer(data, (item) => normalizeOrder(item, options))
  }

  if (path.startsWith('/admin/settings')) {
    return normalizeSiteSettings(data, options)
  }

  return data
}
