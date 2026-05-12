import { apiRequest } from '../shared/api/request'

function buildQueryString(params = {}) {
  const searchParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '' || value === 'all') {
      return
    }

    searchParams.set(key, String(value))
  })

  const queryString = searchParams.toString()
  return queryString ? `?${queryString}` : ''
}

const defaultPageParams = {
  page: 1,
  limit: 20,
}

export const adminApi = {
  login: (body) => apiRequest('/admin/login', { method: 'POST', body }),
  logout: () => apiRequest('/admin/logout', { method: 'POST' }),
  me: () => apiRequest('/admin/me'),
  getDashboard: () => apiRequest('/admin/dashboard'),

  getMenuCategories: () => apiRequest('/admin/menu/categories'),
  createMenuCategory: (body) => apiRequest('/admin/menu/categories', { method: 'POST', body }),
  updateMenuCategory: (id, body) => apiRequest(`/admin/menu/categories/${id}`, { method: 'PATCH', body }),
  deleteMenuCategory: (id) => apiRequest(`/admin/menu/categories/${id}`, { method: 'DELETE' }),

  getMenuItems: (params = defaultPageParams) => apiRequest(`/admin/menu/items${buildQueryString(params)}`),
  createMenuItem: (body) => apiRequest('/admin/menu/items', { method: 'POST', body }),
  updateMenuItem: (id, body) => apiRequest(`/admin/menu/items/${id}`, { method: 'PATCH', body }),
  deleteMenuItem: (id) => apiRequest(`/admin/menu/items/${id}`, { method: 'DELETE' }),

  getGallery: (params = defaultPageParams) => apiRequest(`/admin/gallery${buildQueryString(params)}`),
  createGalleryItem: (body) => apiRequest('/admin/gallery', { method: 'POST', body }),
  updateGalleryItem: (id, body) => apiRequest(`/admin/gallery/${id}`, { method: 'PATCH', body }),
  deleteGalleryItem: (id) => apiRequest(`/admin/gallery/${id}`, { method: 'DELETE' }),

  getReviews: (params = defaultPageParams) => apiRequest(`/admin/reviews${buildQueryString(params)}`),
  createReview: (body) => apiRequest('/admin/reviews', { method: 'POST', body }),
  updateReview: (id, body) => apiRequest(`/admin/reviews/${id}`, { method: 'PATCH', body }),
  deleteReview: (id) => apiRequest(`/admin/reviews/${id}`, { method: 'DELETE' }),

  getOffers: (params = defaultPageParams) => apiRequest(`/admin/offers${buildQueryString(params)}`),
  createOffer: (body) => apiRequest('/admin/offers', { method: 'POST', body }),
  updateOffer: (id, body) => apiRequest(`/admin/offers/${id}`, { method: 'PATCH', body }),
  deleteOffer: (id) => apiRequest(`/admin/offers/${id}`, { method: 'DELETE' }),

  getPromoCodes: (params = defaultPageParams) => apiRequest(`/admin/promocodes${buildQueryString(params)}`),
  createPromoCode: (body) => apiRequest('/admin/promocodes', { method: 'POST', body }),
  updatePromoCode: (id, body) => apiRequest(`/admin/promocodes/${id}`, { method: 'PATCH', body }),
  deletePromoCode: (id) => apiRequest(`/admin/promocodes/${id}`, { method: 'DELETE' }),

  getOrders: (params = defaultPageParams) => apiRequest(`/admin/orders${buildQueryString(params)}`),
  updateOrder: (id, body) => apiRequest(`/admin/orders/${id}`, { method: 'PATCH', body }),

  getInquiries: (params = {}) => apiRequest(`/admin/inquiries${buildQueryString({ ...defaultPageParams, ...params })}`),
  updateInquiry: (type, id, body) => apiRequest(`/admin/inquiries/${type}/${id}`, { method: 'PATCH', body }),
  deleteInquiry: (uid) => apiRequest(`/admin/inquiries/${encodeURIComponent(uid)}`, { method: 'DELETE' }),
  bulkDeleteInquiries: (ids) => apiRequest('/admin/inquiries/bulk', { method: 'DELETE', body: { ids } }),

  getSettings: () => apiRequest('/admin/settings'),
  updateSettings: (body) => apiRequest('/admin/settings', { method: 'PATCH', body }),
  uploadImage: ({ file, folder = 'general' }) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)
    return apiRequest('/admin/media/upload', { method: 'POST', body: formData })
  },
}
