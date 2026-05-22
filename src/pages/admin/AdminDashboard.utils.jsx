import { socialPlatforms } from './AdminDashboard.constants'

export function emptyToUndefined(value) {
  const trimmed = String(value ?? '').trim()
  return trimmed ? trimmed : undefined
}

export function toDateInputValue(value) {
  if (!value) {
    return ''
  }

  return new Date(value).toISOString().slice(0, 10)
}

export function toDateTimeLocalValue(value) {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 16)
}

export function toIsoDateTime(value) {
  if (!value) {
    return undefined
  }

  return new Date(value).toISOString()
}

export function toLabelCase(value) {
  const normalized = String(value || '')

  if (normalized === 'cod') {
    return 'COD'
  }

  if (normalized === 'delivered') {
    return 'Completed'
  }

  if (normalized === 'non_veg') {
    return 'Non-Veg'
  }

  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

export function getSidebarBrandName(restaurantName) {
  const value = String(restaurantName || '').trim()

  if (!value) {
    return 'PalavuCentre'
  }

  if (value.toLowerCase().includes('palavucentre')) {
    return 'PalavuCentre'
  }

  if (value.length <= 20) {
    return value
  }

  return value.split(/\s+/).slice(0, 2).join(' ')
}

export function getSidebarAdminName(admin) {
  const name = String(admin?.name || '').trim()
  const emailName = String(admin?.email || '')
    .split('@')[0]
    .trim()

  const simplifiedName = name
    .replace(/\bpalavucentre\b/gi, '')
    .replace(/\badmin\b/gi, '')
    .trim()

  if (simplifiedName) {
    const firstWord = simplifiedName.split(/\s+/)[0]
    if (firstWord.length <= 14) {
      return firstWord
    }
  }

  if (emailName && emailName.length <= 14) {
    return emailName
  }

  if (simplifiedName) {
    return simplifiedName.split(/\s+/).slice(0, 2).join(' ')
  }

  return 'Admin'
}

export function buildSettingsForm(settings) {
  const socialLinkMap = new Map((settings?.socialLinks || []).map((link) => [link.platform, link]))
  const primaryHero = settings?.heroMedia?.[0]

  return {
    restaurantName: settings?.restaurantName || '',
    tagline: settings?.tagline || '',
    restaurantDescription: settings?.restaurantDescription || '',
    logoUrl: settings?.logoUrl || '',
    heroMediaType: primaryHero?.type || 'image',
    heroMediaUrl: primaryHero?.url || '',
    primaryCtaLabel: settings?.cta?.primary?.label || '',
    primaryCtaHref: settings?.cta?.primary?.href || '/menu',
    secondaryCtaLabel: settings?.cta?.secondary?.label || '',
    secondaryCtaHref: settings?.cta?.secondary?.href || '/catering',
    addressText: settings?.contact?.address || '',
    mapEmbedUrl: settings?.contact?.mapEmbedUrl || '',
    mapLink: settings?.contact?.mapLink || '',
    phone: settings?.contact?.phone || '',
    email: settings?.contact?.email || '',
    hoursText: settings?.contact?.hours || '',
    whatsappNumber: settings?.contact?.whatsappNumber || '',
    floatingWhatsappEnabled: settings?.contact?.floatingWhatsappEnabled ?? true,
    cuisineType: settings?.seo?.cuisineType || '',
    city: settings?.seo?.city || '',
    areaKeywords: (settings?.seo?.areaKeywords || []).join(', '),
    metaTitle: settings?.seo?.metaTitle || '',
    metaDescription: settings?.seo?.metaDescription || '',
    metaKeywords: (settings?.seo?.metaKeywords || []).join(', '),
    googleReviewUrl: settings?.seo?.googleReviewUrl || '',
    deliveryFee: '0',
    freeDeliveryThreshold: '0',
    orderTaxPercent: String(settings?.ordering?.taxPercent ?? 0),
    currency: settings?.ordering?.currency || 'INR',
    socialLinks: socialPlatforms.map((platform, index) => {
      const existing = socialLinkMap.get(platform.platform)
      return {
        id: existing?.id,
        platform: platform.platform,
        label: existing?.label || platform.label,
        url: existing?.url || '',
        isActive: existing?.isActive ?? false,
        sortOrder: String(existing?.sortOrder ?? index),
      }
    }),
  }
}

export function buildSettingsPayload(form) {
  return {
    restaurantName: emptyToUndefined(form.restaurantName),
    tagline: emptyToUndefined(form.tagline),
    restaurantDescription: emptyToUndefined(form.restaurantDescription),
    logoUrl: emptyToUndefined(form.logoUrl),
    heroMedia: form.heroMediaUrl
      ? [
          {
            type: form.heroMediaType,
            url: form.heroMediaUrl.trim(),
          },
        ]
      : [],
    primaryCtaLabel: emptyToUndefined(form.primaryCtaLabel),
    primaryCtaHref: emptyToUndefined(form.primaryCtaHref),
    secondaryCtaLabel: emptyToUndefined(form.secondaryCtaLabel),
    secondaryCtaHref: emptyToUndefined(form.secondaryCtaHref),
    addressText: emptyToUndefined(form.addressText),
    mapEmbedUrl: emptyToUndefined(form.mapEmbedUrl),
    mapLink: emptyToUndefined(form.mapLink),
    phone: emptyToUndefined(form.phone),
    email: emptyToUndefined(form.email),
    hoursText: emptyToUndefined(form.hoursText),
    whatsappNumber: emptyToUndefined(form.whatsappNumber),
    floatingWhatsappEnabled: form.floatingWhatsappEnabled,
    cuisineType: emptyToUndefined(form.cuisineType),
    city: emptyToUndefined(form.city),
    areaKeywords: String(form.areaKeywords || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    metaTitle: emptyToUndefined(form.metaTitle),
    metaDescription: emptyToUndefined(form.metaDescription),
    metaKeywords: String(form.metaKeywords || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
    googleReviewUrl: emptyToUndefined(form.googleReviewUrl),
    deliveryFee: 0,
    freeDeliveryThreshold: 0,
    orderTaxPercent: Number(form.orderTaxPercent || 0),
    currency: emptyToUndefined(form.currency),
    socialLinks: form.socialLinks
      .filter((link) => emptyToUndefined(link.url))
      .map((link, index) => ({
        id: link.id,
        platform: link.platform,
        label: emptyToUndefined(link.label) || socialPlatforms.find((item) => item.platform === link.platform)?.label,
        url: link.url.trim(),
        isActive: link.isActive,
        sortOrder: Number(link.sortOrder || index),
      })),
  }
}
