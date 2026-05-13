import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { API_BASE_URL, ASSET_BASE_URL } from '../../shared/api/api-config'
import { playNotificationSound, requestNotificationPermission, showBrowserNotification, updateTabTitle } from '../../shared/notifications'
import {
  BadgePercent,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  MenuSquare,
  MessageSquare,
  Pencil,
  RefreshCw,
  Search,
  Settings,
  ShoppingBag,
  Store,
  Tag,
  Trash2,
} from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { adminApi } from '../../api/adminApi'
import { formatCurrency, formatDate, formatDateTime } from '../../shared/formatters.js'
import { ADMIN_LOGIN_PATH, PUBLIC_SITE_URL } from '../../lib/admin-routing'
import {
  DEFAULT_MENU_CATEGORY_ICON,
  getMenuCategoryIcon,
  getMenuCategoryIconLabel,
  MENU_CATEGORY_ICON_OPTIONS,
} from '../../shared/menu-icons.js'
import {
  orderStatuses,
  paymentStatuses,
  inquiryStatuses,
  offerStatuses,
  discountTypes,
  reviewSources,
  mediaTypes,
  tabs,
  tabGroups,
  initialCategoryForm,
  initialMenuItemForm,
  initialGalleryForm,
  initialReviewForm,
  initialOfferForm,
  initialPromoCodeForm,
  emptyToUndefined,
  toDateInputValue,
  toDateTimeLocalValue,
  toIsoDateTime,
  toLabelCase,
  getSidebarBrandName,
  getSidebarAdminName,
  buildSettingsForm,
  buildSettingsPayload,
  SectionCard,
  Field,
  TextInput,
  TextArea,
  SelectInput,
  ToggleInput,
  ActionButton,
  ImageUploadField,
  MetricTile,
  StatusBadge,
  StatusSelectCard,
  QuickPillButton,
  OrdersList,
} from './AdminDashboard.shared'

const initialSectionLoadingState = {
  overview: false,
  menu: false,
  gallery: false,
  reviews: false,
  offers: false,
  promocodes: false,
  orders: false,
  inquiries: false,
  settings: false,
}

const initialPaginationState = {
  menu: { page: 1, totalPages: 1 },
  gallery: { page: 1, totalPages: 1 },
  reviews: { page: 1, totalPages: 1 },
  offers: { page: 1, totalPages: 1 },
  promocodes: { page: 1, totalPages: 1 },
  orders: { page: 1, totalPages: 1 },
}

const orderDatePresets = [
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'last7', label: 'Last 7 days' },
  { key: 'last30', label: 'Last 30 days' },
  { key: 'thisMonth', label: 'This Month' },
  { key: 'lastMonth', label: 'Last Month' },
  { key: 'custom', label: 'Custom' },
]

const supportedOrderDatePresets = new Set(orderDatePresets.filter((preset) => preset.key !== 'custom').map((preset) => preset.key))

function dateInputToIstIso(value, endOfDay = false) {
  if (!value) {
    return undefined
  }

  return `${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}+05:30`
}

function getInquiryUid(type, item) {
  return item.uid || `${type}:${item.id}`
}

function SectionSkeleton({ cards = 3 }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: cards }).map((_, index) => (
        <div
          key={index}
          className="h-28 animate-pulse rounded-[20px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        />
      ))}
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const contentRef = useRef(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [admin, setAdmin] = useState(null)
  const [dashboard, setDashboard] = useState(null)
  const [categories, setCategories] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [galleryItems, setGalleryItems] = useState([])
  const [reviews, setReviews] = useState([])
  const [offers, setOffers] = useState([])
  const [promoCodes, setPromoCodes] = useState([])
  const [orders, setOrders] = useState([])
  const [inquiries, setInquiries] = useState({
    contact: { items: [] },
    franchise: { items: [] },
    catering: { items: [] },
  })
  const [settings, setSettings] = useState(null)
  const [settingsForm, setSettingsForm] = useState(buildSettingsForm(null))

  const [categoryForm, setCategoryForm] = useState(initialCategoryForm)
  const [menuItemForm, setMenuItemForm] = useState(initialMenuItemForm)
  const [galleryForm, setGalleryForm] = useState(initialGalleryForm)
  const [reviewForm, setReviewForm] = useState(initialReviewForm)
  const [offerForm, setOfferForm] = useState(initialOfferForm)
  const [promoCodeForm, setPromoCodeForm] = useState(initialPromoCodeForm)

  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busyKey, setBusyKey] = useState('')
  const [sectionLoading, setSectionLoading] = useState(initialSectionLoadingState)
  const [loadedSections, setLoadedSections] = useState({})
  const [sectionPagination, setSectionPagination] = useState(initialPaginationState)
  const [menuSearch, setMenuSearch] = useState('')
  const [menuCategoryFilter, setMenuCategoryFilter] = useState('all')
  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState('all')
  const [orderPaymentFilter, setOrderPaymentFilter] = useState('all')
  const [orderDatePreset, setOrderDatePreset] = useState(
    () => searchParams.get('datePreset') || (searchParams.get('dateFrom') || searchParams.get('dateTo') ? 'custom' : 'all'),
  )
  const [orderDateFrom, setOrderDateFrom] = useState(() => searchParams.get('dateFrom') || '')
  const [orderDateTo, setOrderDateTo] = useState(() => searchParams.get('dateTo') || '')
  const [orderSummary, setOrderSummary] = useState({
    filteredCount: 0,
    filteredRevenue: 0,
    dateFrom: null,
    dateTo: null,
  })
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [selectedInquiryIds, setSelectedInquiryIds] = useState([])
  const activeSectionKey = activeTab === 'ordering' ? 'settings' : activeTab
  const categoryFormRef = useRef(null)
  const menuItemFormRef = useRef(null)
  const galleryFormRef = useRef(null)
  const reviewFormRef = useRef(null)
  const offerFormRef = useRef(null)
  const promoCodeFormRef = useRef(null)

  // Scroll to specific form section when entering edit mode
  useEffect(() => { if (categoryForm.id) categoryFormRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' }) }, [categoryForm.id])
  useEffect(() => { if (menuItemForm.id) menuItemFormRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' }) }, [menuItemForm.id])
  useEffect(() => { if (galleryForm.id) galleryFormRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' }) }, [galleryForm.id])
  useEffect(() => { if (reviewForm.id) reviewFormRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' }) }, [reviewForm.id])
  useEffect(() => { if (offerForm.id) offerFormRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' }) }, [offerForm.id])
  useEffect(() => { if (promoCodeForm.id) promoCodeFormRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' }) }, [promoCodeForm.id])

  const scrollContentToTop = () => {
    contentRef.current?.scrollIntoView({ behavior: 'instant', block: 'start' })
  }

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    scrollContentToTop()
  }

  const showAdminAlert = (message) => {
    setError(message)
    setNotice('')
    if (typeof window !== 'undefined') {
      window.alert(message)
    }
  }

  const validateAdminForm = (form, message) => {
    if (!form.checkValidity()) {
      form.reportValidity()
      showAdminAlert(message)
      return false
    }

    return true
  }

  const validatePositiveNumber = (value, label) => {
    const numericValue = Number(value)

    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      showAdminAlert(`${label} must be greater than 0.`)
      return false
    }

    return true
  }

  const validateNumberRange = (value, label, min, max) => {
    const numericValue = Number(value)

    if (!Number.isFinite(numericValue) || numericValue < min || numericValue > max) {
      showAdminAlert(`${label} must be between ${min} and ${max}.`)
      return false
    }

    return true
  }

  const validateDateRange = (startValue, endValue, message) => {
    if (startValue && endValue && new Date(startValue) > new Date(endValue)) {
      showAdminAlert(message)
      return false
    }

    return true
  }

  const validateImageFile = (file) => {
    if (!file) {
      return false
    }

    if (!file.type?.startsWith('image/')) {
      showAdminAlert('Please upload a correct image file. JPG, PNG, WEBP, GIF, SVG, and AVIF are supported.')
      return false
    }

    if (file.size > 20 * 1024 * 1024) {
      showAdminAlert('Please upload an image smaller than 20MB before optimization.')
      return false
    }

    return true
  }

  const menuMetrics = useMemo(
    () => [
      { label: 'Categories', value: categories.length, hint: 'Organized groups' },
      { label: 'Live Dishes', value: menuItems.filter((item) => item.available).length, hint: 'Currently orderable' },
      { label: 'Best Sellers', value: menuItems.filter((item) => item.bestseller).length, hint: 'Homepage highlights' },
      { label: 'Missing Image', value: menuItems.filter((item) => !item.img).length, hint: 'Needs photo URL' },
    ],
    [categories, menuItems],
  )
  const SelectedCategoryIcon = getMenuCategoryIcon(categoryForm.icon)
  const selectedCategoryIconLabel = getMenuCategoryIconLabel(categoryForm.icon)

  const filteredMenuItems = useMemo(() => {
    const query = menuSearch.trim().toLowerCase()

    return menuItems.filter((item) => {
      const matchesCategory =
        menuCategoryFilter === 'all' || String(item.category?.id || '') === String(menuCategoryFilter)
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        (item.desc || '').toLowerCase().includes(query) ||
        (item.category?.name || '').toLowerCase().includes(query)

      return matchesCategory && matchesQuery
    })
  }, [menuCategoryFilter, menuItems, menuSearch])

  const promoMetrics = useMemo(
    () => [
      { label: 'Active Codes', value: promoCodes.filter((promo) => promo.isActive).length, hint: 'Currently usable' },
      { label: 'Expired', value: promoCodes.filter((promo) => promo.endDate && new Date(promo.endDate) < new Date()).length, hint: 'Needs refresh' },
      { label: 'Usage Total', value: promoCodes.reduce((totalUsed, promo) => totalUsed + Number(promo.usedCount || 0), 0), hint: 'Orders with promo codes' },
      { label: 'Limited Codes', value: promoCodes.filter((promo) => promo.maxUses).length, hint: 'Codes with caps' },
    ],
    [promoCodes],
  )

  const filteredOrders = useMemo(() => {
    const query = orderSearch.trim().toLowerCase()

    return [...orders]
      .filter((order) => {
      const matchesStatus = orderStatusFilter === 'all' || order.orderStatus === orderStatusFilter
      const matchesPayment = orderPaymentFilter === 'all' || order.paymentStatus === orderPaymentFilter
      const matchesQuery =
        !query ||
        order.orderNumber.toLowerCase().includes(query) ||
        (order.customer?.name || '').toLowerCase().includes(query) ||
        (order.customer?.phone || '').toLowerCase().includes(query) ||
        (order.account?.email || '').toLowerCase().includes(query) ||
        (order.promo?.code || '').toLowerCase().includes(query)

        return matchesStatus && matchesPayment && matchesQuery
      })
      .sort((firstOrder, secondOrder) => new Date(secondOrder.createdAt) - new Date(firstOrder.createdAt))
  }, [orderPaymentFilter, orderSearch, orderStatusFilter, orders])

  const orderDateApiParams = useMemo(() => {
    if (supportedOrderDatePresets.has(orderDatePreset)) {
      return { datePreset: orderDatePreset }
    }

    if (orderDatePreset === 'custom') {
      return {
        dateFrom: dateInputToIstIso(orderDateFrom),
        dateTo: dateInputToIstIso(orderDateTo, true),
      }
    }

    return {}
  }, [orderDateFrom, orderDatePreset, orderDateTo])

  const orderDateRangeLabel =
    orderSummary.dateFrom || orderSummary.dateTo
      ? `${formatDate(orderSummary.dateFrom)} - ${formatDate(orderSummary.dateTo)}`
      : 'All dates'

  const persistOrderDateFilter = ({ preset, dateFrom, dateTo }) => {
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('datePreset')
    nextParams.delete('dateFrom')
    nextParams.delete('dateTo')

    if (preset && preset !== 'all') {
      nextParams.set('datePreset', preset)
    }

    if (dateFrom) {
      nextParams.set('dateFrom', dateFrom)
    }

    if (dateTo) {
      nextParams.set('dateTo', dateTo)
    }

    setSearchParams(nextParams, { replace: true })
  }

  const changeOrderDatePreset = (preset) => {
    const nextFrom = preset === 'custom' ? orderDateFrom : ''
    const nextTo = preset === 'custom' ? orderDateTo : ''

    setOrderDatePreset(preset)
    setOrderDateFrom(nextFrom)
    setOrderDateTo(nextTo)
    setExpandedOrderId(null)
    persistOrderDateFilter({ preset, dateFrom: nextFrom, dateTo: nextTo })
  }

  const changeCustomOrderDate = (field, value) => {
    const nextFrom = field === 'from' ? value : orderDateFrom
    const nextTo = field === 'to' ? value : orderDateTo

    setOrderDatePreset('custom')
    setOrderDateFrom(nextFrom)
    setOrderDateTo(nextTo)
    setExpandedOrderId(null)
    persistOrderDateFilter({ preset: 'custom', dateFrom: nextFrom, dateTo: nextTo })
  }

  const clearOrderDateFilter = () => {
    setOrderDatePreset('all')
    setOrderDateFrom('')
    setOrderDateTo('')
    setExpandedOrderId(null)
    persistOrderDateFilter({ preset: 'all', dateFrom: '', dateTo: '' })
  }

  const fetchDashboard = async () => {
    const response = await adminApi.getDashboard()
    setDashboard(response.data)
  }

  const fetchMenuData = async ({ page = 1, append = false } = {}) => {
    const [categoriesResponse, itemsResponse] = await Promise.all([
      adminApi.getMenuCategories(),
      adminApi.getMenuItems({ page, limit: 20 }),
    ])

    setCategories(categoriesResponse.data.items || [])
    setMenuItems((current) => (append ? [...current, ...(itemsResponse.data.items || [])] : itemsResponse.data.items || []))
    setSectionPagination((current) => ({
      ...current,
      menu: itemsResponse.data.pagination || current.menu,
    }))
  }

  const fetchGallery = async ({ page = 1, append = false } = {}) => {
    const response = await adminApi.getGallery({ page, limit: 20 })
    setGalleryItems((current) => (append ? [...current, ...(response.data.items || [])] : response.data.items || []))
    setSectionPagination((current) => ({
      ...current,
      gallery: response.data.pagination || current.gallery,
    }))
  }

  const fetchReviews = async ({ page = 1, append = false } = {}) => {
    const response = await adminApi.getReviews({ page, limit: 20 })
    setReviews((current) => (append ? [...current, ...(response.data.items || [])] : response.data.items || []))
    setSectionPagination((current) => ({
      ...current,
      reviews: response.data.pagination || current.reviews,
    }))
  }

  const fetchOffers = async ({ page = 1, append = false } = {}) => {
    const response = await adminApi.getOffers({ page, limit: 20 })
    setOffers((current) => (append ? [...current, ...(response.data.items || [])] : response.data.items || []))
    setSectionPagination((current) => ({
      ...current,
      offers: response.data.pagination || current.offers,
    }))
  }

  const fetchPromoCodes = async ({ page = 1, append = false } = {}) => {
    const response = await adminApi.getPromoCodes({ page, limit: 20 })
    setPromoCodes((current) => (append ? [...current, ...(response.data.items || [])] : response.data.items || []))
    setSectionPagination((current) => ({
      ...current,
      promocodes: response.data.pagination || current.promocodes,
    }))
  }

  const fetchOrders = async ({ page = 1, append = false } = {}) => {
    const response = await adminApi.getOrders({ page, limit: 20, ...orderDateApiParams })
    setOrders((current) => (append ? [...current, ...(response.data.items || [])] : response.data.items || []))
    setOrderSummary({
      filteredCount: response.data.filteredCount || 0,
      filteredRevenue: response.data.filteredRevenue || 0,
      dateFrom: response.data.dateFrom || null,
      dateTo: response.data.dateTo || null,
    })
    setSectionPagination((current) => ({
      ...current,
      orders: response.data.pagination || current.orders,
    }))
  }

  const fetchInquiries = async () => {
    const response = await adminApi.getInquiries({ page: 1, limit: 20 })
    setInquiries(response.data)
    const availableIds = new Set(
      Object.entries(response.data || {}).flatMap(([type, group]) =>
        (group.items || []).map((item) => getInquiryUid(type, item)),
      ),
    )
    setSelectedInquiryIds((current) => current.filter((uid) => availableIds.has(uid)))
  }

  const fetchSettings = async () => {
    const response = await adminApi.getSettings()
    setSettings(response.data)
    setSettingsForm(buildSettingsForm(response.data))
  }

  const loadSection = async (sectionKey, { force = false, silent = false } = {}) => {
    if (!force && loadedSections[sectionKey]) {
      return
    }

    try {
      if (!silent) {
        setIsRefreshing(true)
        setError('')
      }

      setSectionLoading((current) => ({ ...current, [sectionKey]: true }))

      if (sectionKey === 'overview') {
        await fetchDashboard()
      } else if (sectionKey === 'menu') {
        await fetchMenuData()
      } else if (sectionKey === 'gallery') {
        await fetchGallery()
      } else if (sectionKey === 'reviews') {
        await fetchReviews()
      } else if (sectionKey === 'offers') {
        await fetchOffers()
      } else if (sectionKey === 'promocodes') {
        await fetchPromoCodes()
      } else if (sectionKey === 'orders') {
        await fetchOrders()
      } else if (sectionKey === 'inquiries') {
        await fetchInquiries()
      } else if (sectionKey === 'settings') {
        await fetchSettings()
      }

      setLoadedSections((current) => ({ ...current, [sectionKey]: true }))
    } catch (requestError) {
      setError(requestError.message || 'Failed to refresh admin data')
    } finally {
      setSectionLoading((current) => ({ ...current, [sectionKey]: false }))
      if (!silent) {
        setIsRefreshing(false)
      }
    }
  }
  const loadSectionEvent = useEffectEvent(loadSection)

  useEffect(() => {
    let isMounted = true

    const bootstrap = async () => {
      try {
        setIsLoading(true)
        setError('')

        const sessionResponse = await adminApi.me()
        if (!isMounted) {
          return
        }

        setAdmin(sessionResponse.data.admin)
        requestNotificationPermission()
        await loadSectionEvent('overview', { force: true, silent: true })
      } catch (requestError) {
        if (!isMounted) {
          return
        }

        if (requestError.status === 401) {
          navigate(ADMIN_LOGIN_PATH, { replace: true })
          return
        }

        setError(requestError.message || 'Failed to load dashboard')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    bootstrap()

    return () => {
      isMounted = false
    }
  }, [navigate])

  useEffect(() => {
    if (!admin) {
      return
    }

    loadSectionEvent(activeSectionKey, { silent: true })
  }, [activeSectionKey, admin])

  useEffect(() => {
    if (!admin || activeSectionKey !== 'orders' || !loadedSections.orders) {
      return
    }

    loadSectionEvent('orders', { force: true, silent: true })
  }, [activeSectionKey, admin, loadedSections.orders, orderDateApiParams])

  useEffect(() => {
    if (!admin) return
    const wsUrl = API_BASE_URL.startsWith('http') ? API_BASE_URL.replace(/\/api$/, '') : `${window.location.protocol}//${window.location.host}`
    const socket = io(wsUrl, { path: '/ws/', withCredentials: true, transports: ['websocket', 'polling'] })
    socket.on('connect', () => socket.emit('join-admin'))
    socket.on('new-order', (data) => {
      playNotificationSound()
      showBrowserNotification('🔔 New Order!', `Order ${data?.orderNumber || ''} received`)
      loadSectionEvent('orders', { force: true, silent: true })
      loadSectionEvent('overview', { force: true, silent: true })
    })
    socket.on('order-updated', () => {
      loadSectionEvent('orders', { force: true, silent: true })
      loadSectionEvent('overview', { force: true, silent: true })
    })
    socket.on('payment-verified', () => {
      loadSectionEvent('orders', { force: true, silent: true })
      loadSectionEvent('overview', { force: true, silent: true })
    })
    socket.on('payment-webhook', () => {
      loadSectionEvent('orders', { force: true, silent: true })
      loadSectionEvent('overview', { force: true, silent: true })
    })
    return () => socket.disconnect()
  }, [admin])

  const refreshActiveSection = () => loadSection(activeSectionKey, { force: true })

  const canLoadMoreSection = (sectionKey) =>
    Number(sectionPagination[sectionKey]?.page || 1) < Number(sectionPagination[sectionKey]?.totalPages || 1)

  const loadMoreSection = async (sectionKey) => {
    const nextPage = Number(sectionPagination[sectionKey]?.page || 1) + 1

    try {
      setSectionLoading((current) => ({ ...current, [sectionKey]: true }))

      if (sectionKey === 'menu') {
        await fetchMenuData({ page: nextPage, append: true })
      } else if (sectionKey === 'gallery') {
        await fetchGallery({ page: nextPage, append: true })
      } else if (sectionKey === 'reviews') {
        await fetchReviews({ page: nextPage, append: true })
      } else if (sectionKey === 'offers') {
        await fetchOffers({ page: nextPage, append: true })
      } else if (sectionKey === 'promocodes') {
        await fetchPromoCodes({ page: nextPage, append: true })
      } else if (sectionKey === 'orders') {
        await fetchOrders({ page: nextPage, append: true })
      }
    } catch (requestError) {
      setError(requestError.message || 'Failed to load more admin data')
    } finally {
      setSectionLoading((current) => ({ ...current, [sectionKey]: false }))
    }
  }

  const resetCategoryForm = () => setCategoryForm(initialCategoryForm)
  const resetMenuItemForm = () => setMenuItemForm(initialMenuItemForm)
  const resetGalleryForm = () => setGalleryForm(initialGalleryForm)
  const resetReviewForm = () => setReviewForm(initialReviewForm)
  const resetOfferForm = () => setOfferForm(initialOfferForm)
  const resetPromoCodeForm = () => setPromoCodeForm(initialPromoCodeForm)

  const prepareNewItemForCategory = (category) => {
    setMenuCategoryFilter(String(category.id))
    setMenuItemForm((current) => ({
      ...initialMenuItemForm,
      categoryId: String(category.id),
      isVeg: current.isVeg,
      isAvailable: true,
    }))
  }

  const handleLogout = async () => {
    try {
      await adminApi.logout()
    } finally {
      navigate(ADMIN_LOGIN_PATH, { replace: true })
    }
  }

  const uploadImageToField = async ({ file, folder, busyId, successMessage, onSuccess }) => {
    if (!file) {
      return
    }

    if (!validateImageFile(file)) {
      return
    }

    try {
      setBusyKey(busyId)
      setError('')
      setNotice('')

      const response = await adminApi.uploadImage({ file, folder })
      onSuccess(response.data)
      setNotice(
        response.data?.optimized ? `${successMessage}. Image was optimized to fit the 5MB storage limit` : successMessage,
      )
    } catch (requestError) {
      setError(requestError.message || 'Could not upload image')
    } finally {
      setBusyKey('')
    }
  }

  const submitCategory = async (event) => {
    event.preventDefault()

    if (!validateAdminForm(event.currentTarget, 'Please enter the category name before saving.')) {
      return
    }

    try {
      setBusyKey('category-form')
      setError('')
      setNotice('')

      const payload = {
        name: categoryForm.name.trim(),
        description: emptyToUndefined(categoryForm.description),
        icon: categoryForm.icon || DEFAULT_MENU_CATEGORY_ICON,
        sortOrder: Number(categoryForm.sortOrder || 0),
        isActive: categoryForm.isActive,
      }

      if (categoryForm.id) {
        await adminApi.updateMenuCategory(categoryForm.id, payload)
        setNotice('Menu category updated')
      } else {
        await adminApi.createMenuCategory(payload)
        setNotice('Menu category created')
      }

      resetCategoryForm()
      await Promise.all([fetchMenuData(), fetchDashboard()])
    } catch (requestError) {
      setError(requestError.message || 'Could not save category')
    } finally {
      setBusyKey('')
    }
  }

  const submitMenuItem = async (event) => {
    event.preventDefault()

    if (!validateAdminForm(event.currentTarget, 'Please fill the dish details before saving the menu item.')) {
      return
    }

    if (!menuItemForm.categoryId) {
      showAdminAlert('Please choose a category for this dish.')
      return
    }

    if (!validatePositiveNumber(menuItemForm.price, 'Price')) {
      return
    }

    try {
      setBusyKey('menu-item-form')
      setError('')
      setNotice('')

      const payload = {
        categoryId: Number(menuItemForm.categoryId),
        name: menuItemForm.name.trim(),
        shortDescription: emptyToUndefined(menuItemForm.shortDescription),
        description: emptyToUndefined(menuItemForm.description),
        imageUrl: emptyToUndefined(menuItemForm.imageUrl),
        imagePublicId: emptyToUndefined(menuItemForm.imagePublicId),
        price: Number(menuItemForm.price),
        isVeg: menuItemForm.isVeg,
        isBestseller: menuItemForm.isBestseller,
        isAvailable: menuItemForm.isAvailable,
        sortOrder: Number(menuItemForm.sortOrder || 0),
      }

      if (menuItemForm.id) {
        await adminApi.updateMenuItem(menuItemForm.id, payload)
        setNotice('Menu item updated')
        resetMenuItemForm()
      } else {
        await adminApi.createMenuItem(payload)
        setNotice('Menu item created')
        setMenuItemForm({
          ...initialMenuItemForm,
          categoryId: menuItemForm.categoryId,
          isVeg: menuItemForm.isVeg,
          isAvailable: true,
          sortOrder: String(Number(menuItemForm.sortOrder || 0) + 1),
        })
      }

      await Promise.all([fetchMenuData(), fetchDashboard()])
    } catch (requestError) {
      setError(requestError.message || 'Could not save menu item')
    } finally {
      setBusyKey('')
    }
  }

  const submitGalleryItem = async (event) => {
    event.preventDefault()

    if (
      !validateAdminForm(
        event.currentTarget,
        galleryForm.mediaType === 'image'
          ? 'Please upload or paste a correct image before saving gallery media.'
          : 'Please complete the gallery media details before saving.',
      )
    ) {
      return
    }

    try {
      setBusyKey('gallery-form')
      setError('')
      setNotice('')

      const payload = {
        title: emptyToUndefined(galleryForm.title),
        altText: emptyToUndefined(galleryForm.altText),
        url: galleryForm.url.trim(),
        publicId: emptyToUndefined(galleryForm.publicId),
        mediaType: galleryForm.mediaType,
        category: galleryForm.category.trim(),
        sortOrder: Number(galleryForm.sortOrder || 0),
        visible: galleryForm.visible,
      }

      if (galleryForm.id) {
        await adminApi.updateGalleryItem(galleryForm.id, payload)
        setNotice('Gallery media updated')
      } else {
        await adminApi.createGalleryItem(payload)
        setNotice('Gallery media added')
      }

      resetGalleryForm()
      await fetchGallery()
    } catch (requestError) {
      setError(requestError.message || 'Could not save gallery media')
    } finally {
      setBusyKey('')
    }
  }

  const submitReview = async (event) => {
    event.preventDefault()

    if (!validateAdminForm(event.currentTarget, 'Please complete the review details before saving.')) {
      return
    }

    try {
      setBusyKey('review-form')
      setError('')
      setNotice('')

      const payload = {
        name: reviewForm.name.trim(),
        rating: Number(reviewForm.rating),
        text: reviewForm.text.trim(),
        date: reviewForm.date || undefined,
        source: reviewForm.source,
        googleReviewUrl: emptyToUndefined(reviewForm.googleReviewUrl),
        visible: reviewForm.visible,
        sortOrder: Number(reviewForm.sortOrder || 0),
      }

      if (reviewForm.id) {
        await adminApi.updateReview(reviewForm.id, payload)
        setNotice('Review updated')
      } else {
        await adminApi.createReview(payload)
        setNotice('Review created')
      }

      resetReviewForm()
      await Promise.all([fetchReviews(), fetchDashboard()])
    } catch (requestError) {
      setError(requestError.message || 'Could not save review')
    } finally {
      setBusyKey('')
    }
  }

  const submitOffer = async (event) => {
    event.preventDefault()

    if (!validateAdminForm(event.currentTarget, 'Please complete the offer details before saving.')) {
      return
    }

    if (!validateDateRange(offerForm.startDate, offerForm.endDate, 'Offer end date must be after the start date.')) {
      return
    }

    try {
      setBusyKey('offer-form')
      setError('')
      setNotice('')

      const payload = {
        title: offerForm.title.trim(),
        description: offerForm.description.trim(),
        imageUrl: emptyToUndefined(offerForm.imageUrl),
        imagePublicId: emptyToUndefined(offerForm.imagePublicId),
        ctaLabel: emptyToUndefined(offerForm.ctaLabel),
        ctaHref: emptyToUndefined(offerForm.ctaHref),
        status: offerForm.status,
        isFeatured: offerForm.isFeatured,
        startDate: toIsoDateTime(offerForm.startDate),
        endDate: toIsoDateTime(offerForm.endDate),
        sortOrder: Number(offerForm.sortOrder || 0),
      }

      if (offerForm.id) {
        await adminApi.updateOffer(offerForm.id, payload)
        setNotice('Offer updated')
      } else {
        await adminApi.createOffer(payload)
        setNotice('Offer created')
      }

      resetOfferForm()
      await Promise.all([fetchOffers(), fetchDashboard()])
    } catch (requestError) {
      setError(requestError.message || 'Could not save offer')
    } finally {
      setBusyKey('')
    }
  }

  const submitPromoCode = async (event) => {
    event.preventDefault()

    if (!validateAdminForm(event.currentTarget, 'Please complete the promo code details before saving.')) {
      return
    }

    if (!validatePositiveNumber(promoCodeForm.discountValue, 'Discount value')) {
      return
    }

    if (promoCodeForm.discountType === 'percentage' && Number(promoCodeForm.discountValue) > 100) {
      showAdminAlert('Percentage discount cannot be more than 100.')
      return
    }

    if (
      !validateDateRange(
        promoCodeForm.startDate,
        promoCodeForm.endDate,
        'Promo code end date must be after the start date.',
      )
    ) {
      return
    }

    try {
      setBusyKey('promo-code-form')
      setError('')
      setNotice('')

      const payload = {
        code: promoCodeForm.code.trim().toUpperCase(),
        title: emptyToUndefined(promoCodeForm.title),
        description: emptyToUndefined(promoCodeForm.description),
        discountType: promoCodeForm.discountType,
        discountValue: Number(promoCodeForm.discountValue),
        minOrder: Number(promoCodeForm.minOrder || 0),
        maxDiscount: emptyToUndefined(promoCodeForm.maxDiscount)
          ? Number(promoCodeForm.maxDiscount)
          : undefined,
        maxUses: emptyToUndefined(promoCodeForm.maxUses) ? Number(promoCodeForm.maxUses) : undefined,
        isActive: promoCodeForm.isActive,
        startDate: toIsoDateTime(promoCodeForm.startDate),
        endDate: toIsoDateTime(promoCodeForm.endDate),
      }

      if (promoCodeForm.id) {
        await adminApi.updatePromoCode(promoCodeForm.id, payload)
        setNotice('Promo code updated')
      } else {
        await adminApi.createPromoCode(payload)
        setNotice('Promo code created')
      }

      resetPromoCodeForm()
      await fetchPromoCodes()
    } catch (requestError) {
      setError(requestError.message || 'Could not save promo code')
    } finally {
      setBusyKey('')
    }
  }

  const submitSettings = async (event) => {
    event.preventDefault()

    if (!validateNumberRange(settingsForm.orderTaxPercent, 'Order tax percent', 0, 100)) {
      return
    }

    if (!settingsForm.restaurantName.trim()) {
      showAdminAlert('Restaurant name is required before saving site settings.')
      return
    }

    try {
      setBusyKey('settings-form')
      setError('')
      setNotice('')

      const response = await adminApi.updateSettings(buildSettingsPayload(settingsForm))
      setSettings(response.data)
      setSettingsForm(buildSettingsForm(response.data))
      setNotice('Site settings updated')
      await Promise.all([fetchSettings(), fetchDashboard()])
    } catch (requestError) {
      setError(requestError.message || 'Could not update site settings')
    } finally {
      setBusyKey('')
    }
  }

  const deleteWithRefresh = async ({ id, key, action, successMessage, refreshers, confirmation }) => {
    if (!window.confirm(confirmation)) {
      return
    }

    try {
      setBusyKey(key)
      setError('')
      setNotice('')
      await action(id)
      setNotice(successMessage)
      await Promise.all(refreshers.map((fn) => fn()))
    } catch (requestError) {
      setError(requestError.message || 'Delete failed')
    } finally {
      setBusyKey('')
    }
  }

  const updateOrderField = async (id, payload) => {
    try {
      setBusyKey(`order-${id}`)
      setError('')
      setNotice('')
      await adminApi.updateOrder(id, payload)
      setNotice('Order updated')
      await Promise.all([fetchOrders(), fetchDashboard()])
    } catch (requestError) {
      setError(requestError.message || 'Could not update order')
    } finally {
      setBusyKey('')
    }
  }

  const quickUpdateMenuItem = async (id, payload, successMessage) => {
    try {
      setBusyKey(`menu-quick-${id}`)
      setError('')
      setNotice('')
      await adminApi.updateMenuItem(id, payload)
      setNotice(successMessage)
      await Promise.all([fetchMenuData(), fetchDashboard()])
    } catch (requestError) {
      setError(requestError.message || 'Could not update menu item')
    } finally {
      setBusyKey('')
    }
  }

  const updateInquiryField = async (type, id, status) => {
    try {
      setBusyKey(`inquiry-${type}-${id}`)
      setError('')
      setNotice('')
      await adminApi.updateInquiry(type, id, { status })
      setNotice('Inquiry updated')
      await Promise.all([fetchInquiries(), fetchDashboard()])
    } catch (requestError) {
      setError(requestError.message || 'Could not update inquiry')
    } finally {
      setBusyKey('')
    }
  }

  const removeInquiryIdsFromState = (ids) => {
    const idSet = new Set(ids)

    setInquiries((current) =>
      Object.fromEntries(
        Object.entries(current).map(([type, group]) => [
          type,
          {
            ...group,
            items: (group.items || []).filter((item) => !idSet.has(getInquiryUid(type, item))),
          },
        ]),
      ),
    )
  }

  const getAllInquiryUids = (type) => (inquiries[type]?.items || []).map((item) => getInquiryUid(type, item))

  const isInquirySelected = (uid) => selectedInquiryIds.includes(uid)

  const toggleInquirySelection = (uid) => {
    setSelectedInquiryIds((current) =>
      current.includes(uid) ? current.filter((item) => item !== uid) : [...current, uid],
    )
  }

  const toggleInquiryGroupSelection = (type) => {
    const groupIds = getAllInquiryUids(type)
    const allSelected = groupIds.length > 0 && groupIds.every((uid) => selectedInquiryIds.includes(uid))

    setSelectedInquiryIds((current) => {
      if (allSelected) {
        return current.filter((uid) => !groupIds.includes(uid))
      }

      return Array.from(new Set([...current, ...groupIds]))
    })
  }

  const deleteSingleInquiry = async (type, item) => {
    const uid = getInquiryUid(type, item)

    if (!window.confirm(`Delete this inquiry from ${item.name}? This cannot be undone.`)) {
      return
    }

    const previousInquiries = inquiries
    const previousSelectedIds = selectedInquiryIds

    removeInquiryIdsFromState([uid])
    setSelectedInquiryIds((current) => current.filter((selectedId) => selectedId !== uid))

    try {
      setBusyKey(`delete-inquiry-${uid}`)
      setError('')
      setNotice('')
      await adminApi.deleteInquiry(uid)
      setNotice('Inquiry deleted')
      await fetchDashboard()
    } catch (requestError) {
      setInquiries(previousInquiries)
      setSelectedInquiryIds(previousSelectedIds)
      setError(requestError.message || 'Could not delete inquiry')
    } finally {
      setBusyKey('')
    }
  }

  const deleteSelectedInquiries = async () => {
    if (selectedInquiryIds.length === 0 || !window.confirm(`Delete ${selectedInquiryIds.length} inquiries? This cannot be undone.`)) {
      return
    }

    const ids = selectedInquiryIds
    const previousInquiries = inquiries

    removeInquiryIdsFromState(ids)
    setSelectedInquiryIds([])

    try {
      setBusyKey('bulk-delete-inquiries')
      setError('')
      setNotice('')
      const response = await adminApi.bulkDeleteInquiries(ids)
      setNotice(`${response.deleted || response.data?.deleted || ids.length} inquiries deleted`)
      await fetchDashboard()
    } catch (requestError) {
      setInquiries(previousInquiries)
      setSelectedInquiryIds(ids)
      setError(requestError.message || 'Could not delete selected inquiries')
    } finally {
      setBusyKey('')
    }
  }

  const activeTabConfig = tabs.find((tab) => tab.id === activeTab) || tabs[0]
  const sidebarBrandName = getSidebarBrandName(settings?.restaurantName)
  const sidebarAdminName = getSidebarAdminName(admin)

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fb] px-4 text-slate-600">
        Loading admin dashboard...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900">
      <div className="mx-auto flex max-w-[1600px] gap-5 px-4 py-4 md:px-5 lg:px-6">
        <aside className="hidden h-full min-h-0 w-[276px] shrink-0 overflow-hidden rounded-[22px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] lg:grid lg:grid-rows-[auto_auto_minmax(0,1fr)]">
          <div className="shrink-0 border-b border-slate-200 px-5 py-5">
            <div className="flex items-center gap-4">
              {settings?.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt="PalavuCentre logo"
                  className="h-12 w-12 rounded-xl border border-slate-200 object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700">
                  <Store className="h-6 w-6" strokeWidth={2.2} />
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-[18px] font-semibold leading-none text-slate-950">{sidebarBrandName}</p>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-b border-slate-200 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-base font-semibold text-slate-700">
                {sidebarAdminName.trim().charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-900">{sidebarAdminName}</p>
              </div>
            </div>
          </div>

          <div className="relative min-h-0 px-3 py-4">
            <div className="admin-scroll admin-sidebar-scroll h-full overflow-y-auto px-2 pr-2">
              <nav className="space-y-4 py-1">
                {tabGroups.map((group) => (
                  <div key={group.label}>
                    <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[1.8px] text-slate-400">
                      {group.label}
                    </p>
                    <div className="space-y-1.5">
                      {group.items.map((tab) => {
                        const Icon = tab.icon

                        return (
                          <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left transition ${
                              activeTab === tab.id
                                ? 'bg-slate-900 text-white'
                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                          >
                            <Icon className="h-4.5 w-4.5" />
                            <span className="text-sm font-medium">{tab.label}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="shrink-0 rounded-[20px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="px-5 py-5 md:px-6">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[1.8px] text-slate-500">{activeTabConfig.group}</p>
                  <p className="mt-2 text-[28px] font-semibold leading-none tracking-[-0.02em] text-slate-950">{activeTabConfig.label}</p>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    {activeTabConfig.description}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <ActionButton
                    type="button"
                    variant="secondary"
                    onClick={refreshActiveSection}
                    disabled={isRefreshing}
                    className="inline-flex items-center gap-2"
                  >
                    <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </ActionButton>
                  <a
                    href={PUBLIC_SITE_URL}
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    View Site
                  </a>
                  <ActionButton type="button" variant="danger" onClick={handleLogout} className="inline-flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    Logout
                  </ActionButton>
                </div>
              </div>
            </div>
          </header>

          <main ref={contentRef} className="px-0 py-6 pr-2">
            {error && (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
                {error}
              </div>
            )}

            {notice && (
              <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-700">
                {notice}
              </div>
            )}

            <div className="scrollbar-hide mb-6 flex gap-3 overflow-x-auto pb-2 lg:hidden">
              {tabs.map((tab) => {
                const Icon = tab.icon

                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`flex shrink-0 items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                      activeTab === tab.id
                        ? 'border-blue-600 bg-blue-600 text-white'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:text-blue-700'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>

            {sectionLoading[activeSectionKey] && !loadedSections[activeSectionKey] ? (
              <SectionSkeleton cards={activeSectionKey === 'overview' ? 4 : 3} />
            ) : (
              <div className="space-y-6">
          {activeTab === 'overview' && (
            <>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: 'Total Orders', value: dashboard?.stats?.totalOrders || 0 },
                  { label: 'Pending Orders', value: dashboard?.stats?.pendingOrders || 0 },
                  { label: 'Today Orders', value: dashboard?.stats?.todayOrders || 0 },
                  { label: 'New Inquiries', value: dashboard?.stats?.newInquiries || 0 },
                  { label: 'Menu Items', value: dashboard?.stats?.totalMenuItems || 0 },
                  { label: 'Active Offers', value: dashboard?.stats?.activeOffers || 0 },
                  { label: 'Visible Reviews', value: dashboard?.stats?.visibleReviews || 0 },
                  { label: 'Paid Revenue', value: formatCurrency(dashboard?.stats?.revenue || 0) },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-[18px] border border-slate-200 bg-white p-5">
                    <p className="text-[11px] font-bold uppercase tracking-[2px] text-slate-500">{stat.label}</p>
                    <p className="mt-3 text-3xl font-black text-slate-900">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-2">
                <SectionCard
                  title="Recent Orders"
                  description="Latest guest orders with current status, customer details, and billing totals."
                >
                  <div className="space-y-4">
                    {(dashboard?.recentOrders || []).map((order) => (
                      <div key={order.id} className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{order.orderNumber}</p>
                            <p className="mt-1 text-sm text-slate-600">
                              {order.customer?.name} | {order.customer?.phone}
                            </p>
                          </div>
                          <div className="text-right text-sm">
                            <p className="capitalize text-slate-900">{order.orderStatus}</p>
                            <p className="text-slate-500">{formatCurrency(order.pricing?.grandTotal)}</p>
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-slate-500">{formatDateTime(order.createdAt)}</p>
                      </div>
                    ))}
                    {(!dashboard?.recentOrders || dashboard.recentOrders.length === 0) && (
                      <p className="text-sm text-slate-600">No orders yet.</p>
                    )}
                  </div>
                </SectionCard>

                <SectionCard
                  title="Recent Inquiries"
                  description="Most recent contact, catering, and franchise leads."
                >
                  <div className="space-y-4">
                    {(dashboard?.recentInquiries || []).map((item) => (
                      <div key={`${item.type}-${item.id}`} className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="font-semibold capitalize text-slate-900">
                              {item.type} | {item.name}
                            </p>
                            <p className="mt-1 text-sm text-slate-600">{item.phone}</p>
                          </div>
                          <p className="text-sm capitalize text-slate-900">{item.status}</p>
                        </div>
                        <p className="mt-3 text-xs text-slate-500">{formatDateTime(item.createdAt)}</p>
                      </div>
                    ))}
                    {(!dashboard?.recentInquiries || dashboard.recentInquiries.length === 0) && (
                      <p className="text-sm text-slate-600">No inquiries yet.</p>
                    )}
                  </div>
                </SectionCard>
              </div>
            </>
          )}

          {activeTab === 'menu' && (
            <div className="grid gap-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {menuMetrics.map((metric) => (
                  <MetricTile key={metric.label} label={metric.label} value={metric.value} hint={metric.hint} />
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
              <SectionCard title="Menu Categories" description="Create and organize menu groups.">
                <form ref={categoryFormRef} onSubmit={submitCategory} noValidate className="grid gap-4">
                  <Field label="Category Name">
                    <TextInput
                      required
                      value={categoryForm.name}
                      onChange={(event) => setCategoryForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Starters"
                    />
                  </Field>
                  <Field label="Description">
                    <TextArea
                      rows="3"
                      value={categoryForm.description}
                      onChange={(event) =>
                        setCategoryForm((current) => ({ ...current, description: event.target.value }))
                      }
                      placeholder="Classic Andhra and Godavari starters"
                    />
                  </Field>
                  <div className="grid gap-4 md:grid-cols-[160px_minmax(0,1fr)]">
                    <Field label="Sort Order">
                      <TextInput
                        type="number"
                        value={categoryForm.sortOrder}
                        onChange={(event) =>
                          setCategoryForm((current) => ({ ...current, sortOrder: event.target.value }))
                        }
                      />
                    </Field>
                    <Field label="Menu Icon" hint="Shown on public menu section headers.">
                      <SelectInput
                        value={categoryForm.icon}
                        onChange={(event) => setCategoryForm((current) => ({ ...current, icon: event.target.value }))}
                      >
                        {MENU_CATEGORY_ICON_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </SelectInput>
                    </Field>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
                        <SelectedCategoryIcon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">Category header preview</p>
                        <p className="text-xs text-slate-500">{selectedCategoryIconLabel}</p>
                      </div>
                    </div>
                    <div className="flex items-end">
                      <ToggleInput
                        label="Category Active"
                        checked={categoryForm.isActive}
                        onChange={(event) =>
                          setCategoryForm((current) => ({ ...current, isActive: event.target.checked }))
                        }
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <ActionButton type="submit" disabled={busyKey === 'category-form'}>
                      {busyKey === 'category-form'
                        ? 'Saving...'
                        : categoryForm.id
                          ? 'Update Category'
                          : 'Create Category'}
                    </ActionButton>
                    {categoryForm.id && (
                      <ActionButton type="button" variant="secondary" onClick={resetCategoryForm}>
                        Cancel Edit
                      </ActionButton>
                    )}
                  </div>
                </form>

                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-7 text-slate-600">
                  Use categories as the base for rapid dish entry. Select a category below to prefill the dish form on
                  the right.
                </div>

                <div className="mt-6 space-y-3">
                  {categories.map((category) => {
                    const CategoryIcon = getMenuCategoryIcon(category.icon)

                    return (
                      <div
                        key={category.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700">
                              <CategoryIcon className="h-5 w-5" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900">{category.name}</p>
                              <p className="mt-1 text-sm text-slate-600">{category.description || 'No description'}</p>
                              <p className="mt-2 text-xs text-slate-500">
                                {getMenuCategoryIconLabel(category.icon)} | {category.itemCount} items | sort {category.sortOrder} |{' '}
                                {category.isActive ? 'active' : 'inactive'}
                              </p>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <QuickPillButton
                              active={String(menuItemForm.categoryId) === String(category.id)}
                              onClick={() => prepareNewItemForCategory(category)}
                            >
                              Add Dish
                            </QuickPillButton>
                            <button
                              type="button"
                              onClick={() =>
                                setCategoryForm({
                                  id: category.id,
                                  name: category.name,
                                  description: category.description || '',
                                  icon: category.icon || DEFAULT_MENU_CATEGORY_ICON,
                                  sortOrder: String(category.sortOrder || 0),
                                  isActive: category.isActive,
                                })
                              }
                              className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 hover:text-blue-700"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                deleteWithRefresh({
                                  id: category.id,
                                  key: `delete-category-${category.id}`,
                                  action: adminApi.deleteMenuCategory,
                                  successMessage: 'Category deleted',
                                  refreshers: [fetchMenuData, fetchDashboard],
                                  confirmation: 'Delete this category? It must have no menu items.',
                                })
                              }
                              className="rounded-full border border-red-200 p-2 text-red-600 transition hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </SectionCard>
 
              <SectionCard title="Menu Items" description="Manage dishes, pricing, availability, and images.">
                <form ref={menuItemFormRef} onSubmit={submitMenuItem} noValidate className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Item Name">
                      <TextInput
                        required
                        value={menuItemForm.name}
                        onChange={(event) => setMenuItemForm((current) => ({ ...current, name: event.target.value }))}
                        placeholder="Natu Kodi Biryani"
                      />
                    </Field>
                    <Field label="Category">
                      <SelectInput
                        required
                        value={menuItemForm.categoryId}
                        onChange={(event) =>
                          setMenuItemForm((current) => ({ ...current, categoryId: event.target.value }))
                        }
                      >
                        <option value="">Select category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </SelectInput>
                    </Field>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Short Description">
                      <TextInput
                        value={menuItemForm.shortDescription}
                        onChange={(event) =>
                          setMenuItemForm((current) => ({ ...current, shortDescription: event.target.value }))
                        }
                        placeholder="Country chicken biryani with aromatic spices"
                      />
                    </Field>
                    <ImageUploadField
                      label="Dish Image"
                      value={menuItemForm.imageUrl}
                      onChange={(event) =>
                        setMenuItemForm((current) => ({
                          ...current,
                          imageUrl: event.target.value,
                          imagePublicId: '',
                        }))
                      }
                      onFileSelect={(file) =>
                        uploadImageToField({
                          file,
                          folder: 'menu',
                          busyId: 'upload-menu-item-image',
                          successMessage: 'Dish image uploaded',
                          onSuccess: ({ url, publicId }) =>
                            setMenuItemForm((current) => ({
                              ...current,
                              imageUrl: url,
                              imagePublicId: publicId,
                            })),
                        })
                      }
                      isUploading={busyKey === 'upload-menu-item-image'}
                      previewAlt={menuItemForm.name || 'Menu item image'}
                      placeholder="Paste image URL or upload a dish photo"
                    />
                  </div>

                  <Field label="Full Description">
                    <TextArea
                      rows="3"
                      value={menuItemForm.description}
                      onChange={(event) =>
                        setMenuItemForm((current) => ({ ...current, description: event.target.value }))
                      }
                      placeholder="Longer dish description"
                    />
                  </Field>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Field label="Price (INR)">
                      <TextInput
                        required
                        type="number"
                        min="1"
                        step="0.01"
                        value={menuItemForm.price}
                        onChange={(event) => setMenuItemForm((current) => ({ ...current, price: event.target.value }))}
                      />
                    </Field>
                    <Field label="Sort Order">
                      <TextInput
                        type="number"
                        value={menuItemForm.sortOrder}
                        onChange={(event) =>
                          setMenuItemForm((current) => ({ ...current, sortOrder: event.target.value }))
                        }
                      />
                    </Field>
                    <div className="flex items-end">
                      <ToggleInput
                        label="Vegetarian"
                        checked={menuItemForm.isVeg}
                        onChange={(event) =>
                          setMenuItemForm((current) => ({ ...current, isVeg: event.target.checked }))
                        }
                      />
                    </div>
                    <div className="flex items-end">
                      <ToggleInput
                        label="Bestseller"
                        checked={menuItemForm.isBestseller}
                        onChange={(event) =>
                          setMenuItemForm((current) => ({ ...current, isBestseller: event.target.checked }))
                        }
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <ToggleInput
                      label="Available"
                      checked={menuItemForm.isAvailable}
                      onChange={(event) =>
                        setMenuItemForm((current) => ({ ...current, isAvailable: event.target.checked }))
                      }
                    />
                    <ActionButton type="submit" disabled={busyKey === 'menu-item-form'}>
                      {busyKey === 'menu-item-form'
                        ? 'Saving...'
                        : menuItemForm.id
                          ? 'Update Dish'
                          : 'Create Dish'}
                    </ActionButton>
                    {menuItemForm.id && (
                      <ActionButton type="button" variant="secondary" onClick={resetMenuItemForm}>
                        Cancel Edit
                      </ActionButton>
                    )}
                  </div>
                </form>

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <TextInput
                        value={menuSearch}
                        onChange={(event) => setMenuSearch(event.target.value)}
                        placeholder="Search dish name, description, or category"
                        className="pl-11"
                      />
                    </div>
                    <ActionButton
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setMenuSearch('')
                        setMenuCategoryFilter('all')
                      }}
                    >
                      Reset Filters
                    </ActionButton>
                  </div>

                  <div className="scrollbar-hide mt-4 flex gap-2 overflow-x-auto pb-1">
                    <QuickPillButton active={menuCategoryFilter === 'all'} onClick={() => setMenuCategoryFilter('all')}>
                      All Dishes
                    </QuickPillButton>
                    {categories.map((category) => (
                      <QuickPillButton
                        key={category.id}
                        active={String(menuCategoryFilter) === String(category.id)}
                        onClick={() => setMenuCategoryFilter(String(category.id))}
                      >
                        {category.name}
                      </QuickPillButton>
                    ))}
                  </div>
                </div>

                <div className="mt-6 grid gap-4">
                  {filteredMenuItems.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex gap-4">
                          <img
                            src={item.img || 'https://placehold.co/160x120/120805/F5ECD7?text=Menu'}
                            alt={item.name}
                            className="h-20 w-24 rounded-xl object-cover"
                          />
                          <div>
                            <p className="font-semibold text-slate-900">{item.name}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(item.price)}</p>
                            <p className="mt-1 text-sm text-slate-600">{item.desc}</p>
                            <p className="mt-2 text-xs text-slate-500">
                              {item.category?.name} | {item.veg ? 'veg' : 'non-veg'} |{' '}
                              {item.available ? 'available' : 'unavailable'} | sort {item.sortOrder || 0}
                            </p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <QuickPillButton
                            active={item.available}
                            disabled={busyKey === `menu-quick-${item.id}`}
                            onClick={() =>
                              quickUpdateMenuItem(
                                item.id,
                                { isAvailable: !item.available },
                                item.available ? 'Dish marked unavailable' : 'Dish marked available',
                              )
                            }
                          >
                            {item.available ? 'Available' : 'Unavailable'}
                          </QuickPillButton>
                          <QuickPillButton
                            active={item.bestseller}
                            disabled={busyKey === `menu-quick-${item.id}`}
                            onClick={() =>
                              quickUpdateMenuItem(
                                item.id,
                                { isBestseller: !item.bestseller },
                                item.bestseller ? 'Removed from bestsellers' : 'Marked as bestseller',
                              )
                            }
                          >
                            {item.bestseller ? 'Bestseller' : 'Make Bestseller'}
                          </QuickPillButton>
                          <button
                            type="button"
                            onClick={() =>
                              setMenuItemForm({
                                id: item.id,
                                categoryId: String(item.category?.id || ''),
                                name: item.name,
                              shortDescription: item.desc || '',
                              description: item.description || '',
                              imageUrl: item.img || '',
                              imagePublicId: '',
                              price: String(item.price),
                              isVeg: item.veg,
                              isBestseller: item.bestseller,
                              isAvailable: item.available,
                                sortOrder: String(item.sortOrder || 0),
                              })
                            }
                            className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 hover:text-blue-700"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              deleteWithRefresh({
                                id: item.id,
                                key: `delete-item-${item.id}`,
                                action: adminApi.deleteMenuItem,
                                successMessage: 'Menu item deleted',
                                refreshers: [fetchMenuData, fetchDashboard],
                                confirmation: 'Delete this menu item?',
                              })
                            }
                            className="rounded-full border border-red-200 p-2 text-red-600 transition hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {filteredMenuItems.length === 0 && (
                    <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
                      No menu items match the current filters.
                    </p>
                  )}
                  {canLoadMoreSection('menu') && (
                    <div className="pt-2">
                      <ActionButton
                        type="button"
                        variant="secondary"
                        onClick={() => loadMoreSection('menu')}
                        disabled={sectionLoading.menu}
                      >
                        {sectionLoading.menu ? 'Loading...' : 'Load More Dishes'}
                      </ActionButton>
                    </div>
                  )}
                </div>
              </SectionCard>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <SectionCard
              title="Orders"
              description="Review backend-stored orders, linked customer accounts, promo usage, and update order statuses in real time."
            >
              <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="mb-5 border-b border-slate-200 pb-5">
                  <div className="flex flex-wrap gap-2">
                    {orderDatePresets.map((preset) => (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => changeOrderDatePreset(preset.key)}
                        className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                          orderDatePreset === preset.key
                            ? 'border-amber-500 bg-amber-50 text-amber-700'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                    {orderDatePreset !== 'all' && (
                      <button
                        type="button"
                        onClick={clearOrderDateFilter}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-500 transition hover:border-slate-300 hover:bg-slate-50"
                      >
                        Clear ×
                      </button>
                    )}
                  </div>

                  {orderDatePreset === 'custom' && (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:max-w-xl">
                      <Field label="From">
                        <TextInput
                          type="date"
                          value={orderDateFrom}
                          onChange={(event) => changeCustomOrderDate('from', event.target.value)}
                          className="bg-slate-50"
                        />
                      </Field>
                      <Field label="To">
                        <TextInput
                          type="date"
                          value={orderDateTo}
                          onChange={(event) => changeCustomOrderDate('to', event.target.value)}
                          className="bg-slate-50"
                        />
                      </Field>
                    </div>
                  )}

                  <p className="mt-4 text-sm text-slate-600">
                    Showing <span className="font-semibold text-slate-900">{orderSummary.filteredCount}</span> orders ·{' '}
                    {orderDateRangeLabel} · Total:{' '}
                    <span className="font-semibold text-slate-900">{formatCurrency(orderSummary.filteredRevenue)}</span>
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_210px_210px_auto] xl:items-center">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <TextInput
                      value={orderSearch}
                      onChange={(event) => setOrderSearch(event.target.value)}
                      placeholder="Search order number, customer, phone, email, or promo"
                      className="pl-11"
                    />
                  </div>

                  <SelectInput value={orderStatusFilter} onChange={(event) => setOrderStatusFilter(event.target.value)} className="bg-slate-50">
                    <option value="all">All Statuses</option>
                    {orderStatuses.map((status) => (
                      <option key={status} value={status}>
                        {toLabelCase(status)}
                      </option>
                    ))}
                  </SelectInput>

                  <SelectInput
                    value={orderPaymentFilter}
                    onChange={(event) => setOrderPaymentFilter(event.target.value)}
                    className="bg-slate-50"
                  >
                    <option value="all">All Payments</option>
                    {paymentStatuses.map((status) => (
                      <option key={status} value={status}>
                        {toLabelCase(status)}
                      </option>
                    ))}
                  </SelectInput>

                  <ActionButton
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setOrderSearch('')
                      setOrderStatusFilter('all')
                      setOrderPaymentFilter('all')
                      setExpandedOrderId(null)
                    }}
                  >
                    Reset Filters
                  </ActionButton>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                  <p className="text-sm text-slate-600">
                    Showing <span className="font-semibold text-slate-900">{filteredOrders.length}</span> of{' '}
                    <span className="font-semibold text-slate-900">{orders.length}</span> orders
                  </p>
                  <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                      Pending {orders.filter((order) => order.orderStatus === 'pending').length}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                      Paid {orders.filter((order) => order.paymentStatus === 'paid').length}
                    </span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">
                      Unpaid {orders.filter((order) => order.paymentStatus === 'unpaid').length}
                    </span>
                  </div>
                </div>
              </div>

              <OrdersList
                filteredOrders={filteredOrders}
                expandedOrderId={expandedOrderId}
                setExpandedOrderId={setExpandedOrderId}
                busyKey={busyKey}
                updateOrderField={updateOrderField}
                isLoading={sectionLoading.orders && loadedSections.orders}
              />
              {canLoadMoreSection('orders') && (
                <div className="mt-4">
                  <ActionButton
                    type="button"
                    variant="secondary"
                    onClick={() => loadMoreSection('orders')}
                    disabled={sectionLoading.orders}
                  >
                    {sectionLoading.orders ? 'Loading...' : 'Load More Orders'}
                  </ActionButton>
                </div>
              )}
            </SectionCard>
          )}

          {activeTab === 'gallery' && (
            <SectionCard title="Gallery" description="Upload gallery photos locally or paste a media URL when needed.">
              <form ref={galleryFormRef} onSubmit={submitGalleryItem} noValidate className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Title">
                    <TextInput
                      value={galleryForm.title}
                      onChange={(event) => setGalleryForm((current) => ({ ...current, title: event.target.value }))}
                    />
                  </Field>
                  <Field label="Alt Text">
                    <TextInput
                      value={galleryForm.altText}
                      onChange={(event) => setGalleryForm((current) => ({ ...current, altText: event.target.value }))}
                    />
                  </Field>
                </div>
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Media Type">
                      <SelectInput
                        value={galleryForm.mediaType}
                        onChange={(event) => setGalleryForm((current) => ({ ...current, mediaType: event.target.value }))}
                      >
                        {mediaTypes.map((type) => (
                          <option key={type} value={type}>
                            {toLabelCase(type)}
                          </option>
                        ))}
                      </SelectInput>
                  </Field>
                  <Field label="Category">
                    <TextInput
                      value={galleryForm.category}
                      onChange={(event) => setGalleryForm((current) => ({ ...current, category: event.target.value }))}
                    />
                  </Field>
                  <Field label="Sort Order">
                    <TextInput
                      type="number"
                      value={galleryForm.sortOrder}
                      onChange={(event) =>
                        setGalleryForm((current) => ({ ...current, sortOrder: event.target.value }))
                      }
                    />
                  </Field>
                </div>

                {galleryForm.mediaType === 'image' ? (
                  <ImageUploadField
                    label="Gallery Image"
                    value={galleryForm.url}
                    onChange={(event) =>
                      setGalleryForm((current) => ({
                        ...current,
                        url: event.target.value,
                        publicId: '',
                      }))
                    }
                    onFileSelect={(file) =>
                      uploadImageToField({
                        file,
                        folder: 'gallery',
                        busyId: 'upload-gallery-image',
                        successMessage: 'Gallery image uploaded',
                        onSuccess: ({ url, publicId }) =>
                          setGalleryForm((current) => ({
                            ...current,
                            url,
                            publicId,
                          })),
                      })
                    }
                    isUploading={busyKey === 'upload-gallery-image'}
                    previewAlt={galleryForm.title || 'Gallery photo'}
                    placeholder="Paste image URL or upload from your device"
                  />
                ) : (
                  <Field label="Video URL" hint="Video uploads stay URL-based for now.">
                    <TextInput
                      required
                      value={galleryForm.url}
                      onChange={(event) =>
                        setGalleryForm((current) => ({
                          ...current,
                          url: event.target.value,
                          publicId: '',
                        }))
                      }
                      placeholder="https://..."
                    />
                  </Field>
                )}

                <div className="flex flex-wrap gap-3">
                  <ToggleInput
                    label="Visible"
                    checked={galleryForm.visible}
                    onChange={(event) => setGalleryForm((current) => ({ ...current, visible: event.target.checked }))}
                  />
                  <ActionButton type="submit" disabled={busyKey === 'gallery-form'}>
                    {busyKey === 'gallery-form'
                      ? 'Saving...'
                      : galleryForm.id
                        ? 'Update Media'
                        : 'Add Media'}
                  </ActionButton>
                  {galleryForm.id && (
                    <ActionButton type="button" variant="secondary" onClick={resetGalleryForm}>
                      Cancel Edit
                    </ActionButton>
                  )}
                </div>
              </form>

              <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {galleryItems.map((item) => (
                  <div key={item.id} className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    {item.mediaType === 'video' ? (
                      <video src={item.url} controls className="h-48 w-full bg-black object-cover" />
                    ) : (
                      <img src={item.url} alt={item.altText || item.title || 'Gallery photo'} className="h-48 w-full object-cover" />
                    )}
                    <div className="p-4">
                      <p className="font-semibold text-slate-900">{item.title || 'Untitled media'}</p>
                      <p className="mt-1 text-sm text-slate-600">{item.category}</p>
                      <p className="mt-2 text-xs text-slate-500">{item.visible ? 'Visible' : 'Hidden'}</p>
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() =>
                            setGalleryForm({
                              id: item.id,
                              title: item.title || '',
                              altText: item.altText || '',
                              url: item.url,
                              publicId: item.publicId || '',
                              mediaType: item.mediaType,
                              category: item.category,
                              sortOrder: String(item.sortOrder || 0),
                              visible: item.visible,
                            })
                          }
                          className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 hover:text-blue-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            deleteWithRefresh({
                              id: item.id,
                              key: `delete-gallery-${item.id}`,
                              action: adminApi.deleteGalleryItem,
                              successMessage: 'Gallery item deleted',
                              refreshers: [fetchGallery],
                              confirmation: 'Delete this gallery item?',
                            })
                          }
                          className="rounded-full border border-red-200 p-2 text-red-600 transition hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {canLoadMoreSection('gallery') && (
                <div className="mt-4">
                  <ActionButton
                    type="button"
                    variant="secondary"
                    onClick={() => loadMoreSection('gallery')}
                    disabled={sectionLoading.gallery}
                  >
                    {sectionLoading.gallery ? 'Loading...' : 'Load More Media'}
                  </ActionButton>
                </div>
              )}
            </SectionCard>
          )}

          {activeTab === 'reviews' && (
            <SectionCard title="Reviews" description="Manually curate visible testimonials and copied review content.">
              <form ref={reviewFormRef} onSubmit={submitReview} noValidate className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Reviewer Name">
                    <TextInput
                      required
                      value={reviewForm.name}
                      onChange={(event) => setReviewForm((current) => ({ ...current, name: event.target.value }))}
                    />
                  </Field>
                  <Field label="Rating">
                    <SelectInput
                      value={reviewForm.rating}
                      onChange={(event) => setReviewForm((current) => ({ ...current, rating: event.target.value }))}
                    >
                      {[5, 4, 3, 2, 1].map((rating) => (
                        <option key={rating} value={rating}>
                          {rating}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                  <Field label="Date">
                    <TextInput
                      type="date"
                      value={reviewForm.date}
                      onChange={(event) => setReviewForm((current) => ({ ...current, date: event.target.value }))}
                    />
                  </Field>
                  <Field label="Source">
                    <SelectInput
                      value={reviewForm.source}
                      onChange={(event) => setReviewForm((current) => ({ ...current, source: event.target.value }))}
                    >
                      {reviewSources.map((source) => (
                        <option key={source} value={source}>
                          {source}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                </div>

                <Field label="Review Text">
                  <TextArea
                    required
                    rows="4"
                    value={reviewForm.text}
                    onChange={(event) => setReviewForm((current) => ({ ...current, text: event.target.value }))}
                  />
                </Field>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Google Review URL">
                    <TextInput
                      type="url"
                      value={reviewForm.googleReviewUrl}
                      onChange={(event) =>
                        setReviewForm((current) => ({ ...current, googleReviewUrl: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Sort Order">
                    <TextInput
                      type="number"
                      value={reviewForm.sortOrder}
                      onChange={(event) => setReviewForm((current) => ({ ...current, sortOrder: event.target.value }))}
                    />
                  </Field>
                  <div className="flex items-end">
                    <ToggleInput
                      label="Visible Publicly"
                      checked={reviewForm.visible}
                      onChange={(event) => setReviewForm((current) => ({ ...current, visible: event.target.checked }))}
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <ActionButton type="submit" disabled={busyKey === 'review-form'}>
                    {busyKey === 'review-form'
                      ? 'Saving...'
                      : reviewForm.id
                        ? 'Update Review'
                        : 'Create Review'}
                  </ActionButton>
                  {reviewForm.id && (
                    <ActionButton type="button" variant="secondary" onClick={resetReviewForm}>
                      Cancel Edit
                    </ActionButton>
                  )}
                </div>
              </form>

              <div className="mt-6 space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="rounded-[18px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <p className="font-semibold text-slate-900">{review.name}</p>
                          <span className="text-sm text-slate-600">{'★'.repeat(review.rating)}</span>
                          <span className="text-xs uppercase tracking-[2px] text-slate-500">{review.source}</span>
                        </div>
                        <p className="mt-3 text-sm leading-7 text-slate-600">{review.text}</p>
                        <p className="mt-3 text-xs text-slate-500">
                          {formatDate(review.date)} | {review.visible ? 'Visible' : 'Hidden'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setReviewForm({
                              id: review.id,
                              name: review.name,
                              rating: String(review.rating),
                              text: review.text,
                              date: toDateInputValue(review.date),
                              source: review.source,
                              googleReviewUrl: review.googleReviewUrl || '',
                              visible: review.visible,
                              sortOrder: String(review.sortOrder || 0),
                            })
                          }
                          className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 hover:text-blue-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            deleteWithRefresh({
                              id: review.id,
                              key: `delete-review-${review.id}`,
                              action: adminApi.deleteReview,
                              successMessage: 'Review deleted',
                              refreshers: [fetchReviews, fetchDashboard],
                              confirmation: 'Delete this review? It will be hidden from public view.',
                            })
                          }
                          className="rounded-full border border-red-200 p-2 text-red-600 transition hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {canLoadMoreSection('reviews') && (
                <div className="mt-4">
                  <ActionButton
                    type="button"
                    variant="secondary"
                    onClick={() => loadMoreSection('reviews')}
                    disabled={sectionLoading.reviews}
                  >
                    {sectionLoading.reviews ? 'Loading...' : 'Load More Reviews'}
                  </ActionButton>
                </div>
              )}
            </SectionCard>
          )}

          {activeTab === 'offers' && (
            <SectionCard title="Offers" description="Create public promotions and CTA-driven campaigns.">
              <form ref={offerFormRef} onSubmit={submitOffer} noValidate className="grid gap-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Offer Title">
                    <TextInput
                      required
                      value={offerForm.title}
                      onChange={(event) => setOfferForm((current) => ({ ...current, title: event.target.value }))}
                    />
                  </Field>
                  <ImageUploadField
                    label="Offer Image"
                    value={offerForm.imageUrl}
                    onChange={(event) =>
                      setOfferForm((current) => ({
                        ...current,
                        imageUrl: event.target.value,
                        imagePublicId: '',
                      }))
                    }
                    onFileSelect={(file) =>
                      uploadImageToField({
                        file,
                        folder: 'offers',
                        busyId: 'upload-offer-image',
                        successMessage: 'Offer image uploaded',
                        onSuccess: ({ url, publicId }) =>
                          setOfferForm((current) => ({
                            ...current,
                            imageUrl: url,
                            imagePublicId: publicId,
                          })),
                      })
                    }
                    isUploading={busyKey === 'upload-offer-image'}
                    previewAlt={offerForm.title || 'Offer image'}
                    placeholder="Paste banner URL or upload an offer image"
                  />
                </div>

                <Field label="Description">
                  <TextArea
                    required
                    rows="4"
                    value={offerForm.description}
                    onChange={(event) =>
                      setOfferForm((current) => ({ ...current, description: event.target.value }))
                    }
                  />
                </Field>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="CTA Label">
                    <TextInput
                      value={offerForm.ctaLabel}
                      onChange={(event) => setOfferForm((current) => ({ ...current, ctaLabel: event.target.value }))}
                    />
                  </Field>
                  <Field label="CTA Href">
                    <TextInput
                      value={offerForm.ctaHref}
                      onChange={(event) => setOfferForm((current) => ({ ...current, ctaHref: event.target.value }))}
                    />
                  </Field>
                  <Field label="Status">
                    <SelectInput
                      value={offerForm.status}
                      onChange={(event) => setOfferForm((current) => ({ ...current, status: event.target.value }))}
                    >
                      {offerStatuses.map((status) => (
                        <option key={status} value={status}>
                          {toLabelCase(status)}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                  <Field label="Sort Order">
                    <TextInput
                      type="number"
                      value={offerForm.sortOrder}
                      onChange={(event) => setOfferForm((current) => ({ ...current, sortOrder: event.target.value }))}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Start Date">
                    <TextInput
                      type="datetime-local"
                      value={offerForm.startDate}
                      onChange={(event) => setOfferForm((current) => ({ ...current, startDate: event.target.value }))}
                    />
                  </Field>
                  <Field label="End Date">
                    <TextInput
                      type="datetime-local"
                      value={offerForm.endDate}
                      onChange={(event) => setOfferForm((current) => ({ ...current, endDate: event.target.value }))}
                    />
                  </Field>
                </div>

                <div className="flex flex-wrap gap-3">
                  <ToggleInput
                    label="Featured Offer"
                    checked={offerForm.isFeatured}
                    onChange={(event) => setOfferForm((current) => ({ ...current, isFeatured: event.target.checked }))}
                  />
                  <ActionButton type="submit" disabled={busyKey === 'offer-form'}>
                    {busyKey === 'offer-form'
                      ? 'Saving...'
                      : offerForm.id
                        ? 'Update Offer'
                        : 'Create Offer'}
                  </ActionButton>
                  {offerForm.id && (
                    <ActionButton type="button" variant="secondary" onClick={resetOfferForm}>
                      Cancel Edit
                    </ActionButton>
                  )}
                </div>
              </form>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {offers.map((offer) => (
                  <div key={offer.id} className="overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    {offer.imageUrl && <img src={offer.imageUrl} alt={offer.title} className="h-44 w-full object-cover" />}
                    <div className="p-5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-blue-600 px-3 py-1 text-[10px] font-semibold uppercase tracking-[1.6px] text-white">
                          {offer.status}
                        </span>
                        {offer.isFeatured && (
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[1.6px] text-slate-600">
                            Featured
                          </span>
                        )}
                      </div>
                      <p className="mt-3 font-semibold text-slate-900">{offer.title}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-600">{offer.description}</p>
                      <p className="mt-3 text-xs text-slate-500">
                        {offer.startDate ? formatDateTime(offer.startDate) : 'No start'} |{' '}
                        {offer.endDate ? formatDateTime(offer.endDate) : 'No end'}
                      </p>
                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() =>
                            setOfferForm({
                              id: offer.id,
                              title: offer.title,
                              description: offer.description,
                              imageUrl: offer.imageUrl || '',
                              imagePublicId: '',
                              ctaLabel: offer.ctaLabel || '',
                              ctaHref: offer.ctaHref || '/menu',
                              status: offer.status,
                              isFeatured: offer.isFeatured,
                              startDate: toDateTimeLocalValue(offer.startDate),
                              endDate: toDateTimeLocalValue(offer.endDate),
                              sortOrder: String(offer.sortOrder || 0),
                            })
                          }
                          className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 hover:text-blue-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            deleteWithRefresh({
                              id: offer.id,
                              key: `delete-offer-${offer.id}`,
                              action: adminApi.deleteOffer,
                              successMessage: 'Offer deleted',
                              refreshers: [fetchOffers, fetchDashboard],
                              confirmation: 'Delete this offer?',
                            })
                          }
                          className="rounded-full border border-red-200 p-2 text-red-600 transition hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {canLoadMoreSection('offers') && (
                <div className="mt-4">
                  <ActionButton
                    type="button"
                    variant="secondary"
                    onClick={() => loadMoreSection('offers')}
                    disabled={sectionLoading.offers}
                  >
                    {sectionLoading.offers ? 'Loading...' : 'Load More Offers'}
                  </ActionButton>
                </div>
              )}
            </SectionCard>
          )}

          {activeTab === 'promocodes' && (
            <SectionCard
              title="Promo Codes"
              description="Create admin-managed promo codes that customers can apply during checkout."
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {promoMetrics.map((metric) => (
                  <MetricTile key={metric.label} label={metric.label} value={metric.value} hint={metric.hint} />
                ))}
              </div>

              <form ref={promoCodeFormRef} onSubmit={submitPromoCode} noValidate className="mt-6 grid gap-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Code">
                    <TextInput
                      required
                      value={promoCodeForm.code}
                      onChange={(event) =>
                        setPromoCodeForm((current) => ({ ...current, code: event.target.value.toUpperCase() }))
                      }
                      placeholder="WELCOME10"
                    />
                  </Field>
                  <Field label="Title">
                    <TextInput
                      value={promoCodeForm.title}
                      onChange={(event) => setPromoCodeForm((current) => ({ ...current, title: event.target.value }))}
                      placeholder="Welcome offer"
                    />
                  </Field>
                  <Field label="Discount Type">
                    <SelectInput
                      value={promoCodeForm.discountType}
                      onChange={(event) =>
                        setPromoCodeForm((current) => ({ ...current, discountType: event.target.value }))
                      }
                    >
                      {discountTypes.map((type) => (
                        <option key={type} value={type}>
                          {toLabelCase(type)}
                        </option>
                      ))}
                    </SelectInput>
                  </Field>
                  <Field label={promoCodeForm.discountType === 'percentage' ? 'Discount Percent' : 'Discount Amount'}>
                    <TextInput
                      required
                      type="number"
                      min="0"
                      step="0.01"
                      value={promoCodeForm.discountValue}
                      onChange={(event) =>
                        setPromoCodeForm((current) => ({ ...current, discountValue: event.target.value }))
                      }
                    />
                  </Field>
                </div>

                <Field label="Description">
                  <TextArea
                    rows="3"
                    value={promoCodeForm.description}
                    onChange={(event) =>
                      setPromoCodeForm((current) => ({ ...current, description: event.target.value }))
                    }
                  />
                </Field>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Minimum Order">
                    <TextInput
                      type="number"
                      min="0"
                      step="0.01"
                      value={promoCodeForm.minOrder}
                      onChange={(event) => setPromoCodeForm((current) => ({ ...current, minOrder: event.target.value }))}
                    />
                  </Field>
                  <Field label="Max Discount">
                    <TextInput
                      type="number"
                      min="0"
                      step="0.01"
                      value={promoCodeForm.maxDiscount}
                      onChange={(event) =>
                        setPromoCodeForm((current) => ({ ...current, maxDiscount: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Max Uses">
                    <TextInput
                      type="number"
                      min="1"
                      step="1"
                      value={promoCodeForm.maxUses}
                      onChange={(event) => setPromoCodeForm((current) => ({ ...current, maxUses: event.target.value }))}
                    />
                  </Field>
                  <div className="flex items-end">
                    <ToggleInput
                      label="Promo Is Active"
                      checked={promoCodeForm.isActive}
                      onChange={(event) =>
                        setPromoCodeForm((current) => ({ ...current, isActive: event.target.checked }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Start Date">
                    <TextInput
                      type="datetime-local"
                      value={promoCodeForm.startDate}
                      onChange={(event) =>
                        setPromoCodeForm((current) => ({ ...current, startDate: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="End Date">
                    <TextInput
                      type="datetime-local"
                      value={promoCodeForm.endDate}
                      onChange={(event) => setPromoCodeForm((current) => ({ ...current, endDate: event.target.value }))}
                    />
                  </Field>
                </div>

                <div className="flex flex-wrap gap-3">
                  <ActionButton type="submit" disabled={busyKey === 'promo-code-form'}>
                    {busyKey === 'promo-code-form'
                      ? 'Saving...'
                      : promoCodeForm.id
                        ? 'Update Promo Code'
                        : 'Create Promo Code'}
                  </ActionButton>
                  {promoCodeForm.id && (
                    <ActionButton type="button" variant="secondary" onClick={resetPromoCodeForm}>
                      Cancel Edit
                    </ActionButton>
                  )}
                </div>
              </form>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                {promoCodes.map((promo) => (
                  <div key={promo.id} className="rounded-[18px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[1.6px] ${
                          promo.isActive ? 'bg-blue-600 text-white' : 'border border-slate-200 text-slate-500'
                        }`}
                      >
                        {promo.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-semibold uppercase tracking-[1.6px] text-slate-600">
                        {promo.discountType}
                      </span>
                    </div>

                    <p className="mt-3 font-semibold text-slate-900">{promo.code}</p>
                    {promo.title && <p className="mt-2 text-sm font-semibold text-slate-900">{promo.title}</p>}
                    {promo.description && <p className="mt-2 text-sm leading-7 text-slate-600">{promo.description}</p>}

                    <div className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-2">
                      <p>
                        Discount:{' '}
                        <span className="font-semibold text-slate-900">
                          {promo.discountType === 'percentage'
                            ? `${promo.discountValue}%`
                            : formatCurrency(promo.discountValue)}
                        </span>
                      </p>
                      <p>
                        Min Order: <span className="font-semibold text-slate-900">{formatCurrency(promo.minOrder)}</span>
                      </p>
                      <p>
                        Max Discount:{' '}
                        <span className="font-semibold text-slate-900">
                          {promo.maxDiscount ? formatCurrency(promo.maxDiscount) : 'No cap'}
                        </span>
                      </p>
                      <p>
                        Uses:{' '}
                        <span className="font-semibold text-slate-900">
                          {promo.usedCount}
                          {promo.maxUses ? ` / ${promo.maxUses}` : ''}
                        </span>
                      </p>
                    </div>

                    <p className="mt-3 text-xs text-slate-500">
                      {promo.startDate ? formatDateTime(promo.startDate) : 'No start'} |{' '}
                      {promo.endDate ? formatDateTime(promo.endDate) : 'No end'}
                    </p>

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() =>
                          setPromoCodeForm({
                            id: promo.id,
                            code: promo.code,
                            title: promo.title || '',
                            description: promo.description || '',
                            discountType: promo.discountType,
                            discountValue: String(promo.discountValue ?? ''),
                            minOrder: String(promo.minOrder ?? 0),
                            maxDiscount: promo.maxDiscount !== null && promo.maxDiscount !== undefined ? String(promo.maxDiscount) : '',
                            maxUses: promo.maxUses ? String(promo.maxUses) : '',
                            isActive: promo.isActive,
                            startDate: toDateTimeLocalValue(promo.startDate),
                            endDate: toDateTimeLocalValue(promo.endDate),
                          })
                        }
                        className="rounded-full border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100 hover:text-blue-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() =>
                          deleteWithRefresh({
                            id: promo.id,
                            key: `delete-promo-${promo.id}`,
                            action: adminApi.deletePromoCode,
                            successMessage: 'Promo code deleted',
                            refreshers: [fetchPromoCodes],
                            confirmation: 'Delete this promo code?',
                          })
                        }
                        className="rounded-full border border-red-200 p-2 text-red-600 transition hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {promoCodes.length === 0 && (
                  <p className="text-sm text-slate-600">No promo codes created yet.</p>
                )}
                {canLoadMoreSection('promocodes') && (
                  <div className="pt-2">
                    <ActionButton
                      type="button"
                      variant="secondary"
                      onClick={() => loadMoreSection('promocodes')}
                      disabled={sectionLoading.promocodes}
                    >
                      {sectionLoading.promocodes ? 'Loading...' : 'Load More Promo Codes'}
                    </ActionButton>
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {activeTab === 'inquiries' && (
            <div className="grid gap-6 xl:grid-cols-3">
              {[
                { key: 'contact', label: 'Contact Inquiries' },
                { key: 'franchise', label: 'Franchise Inquiries' },
                { key: 'catering', label: 'Catering Inquiries' },
              ].map((group) => {
                const groupItems = inquiries[group.key]?.items || []
                const groupIds = getAllInquiryUids(group.key)
                const allSelected = groupIds.length > 0 && groupIds.every((uid) => selectedInquiryIds.includes(uid))

                return (
                  <SectionCard
                    key={group.key}
                    title={group.label}
                    description="Update inquiry status as the team follows up."
                    actions={
                      <label className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          disabled={groupIds.length === 0}
                          onChange={() => toggleInquiryGroupSelection(group.key)}
                          className="h-4 w-4 accent-slate-900"
                        />
                        Select all
                      </label>
                    }
                  >
                    <div className="space-y-4">
                      {groupItems.map((item) => {
                        const uid = getInquiryUid(group.key, item)

                        return (
                          <div
                            key={uid}
                            className="group relative rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                          >
                            <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] gap-3">
                              <input
                                type="checkbox"
                                checked={isInquirySelected(uid)}
                                onChange={() => toggleInquirySelection(uid)}
                                className="mt-1 h-4 w-4 accent-slate-900"
                                aria-label={`Select inquiry from ${item.name}`}
                              />
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-900">{item.name}</p>
                                {item.subject && <p className="mt-1 text-sm font-medium text-slate-700">{item.subject}</p>}
                                {item.phone && <p className="mt-1 text-sm text-slate-600">{item.phone}</p>}
                                {item.email && <p className="text-sm text-slate-600">{item.email}</p>}
                                {item.city && <p className="text-sm text-slate-600">City: {item.city}</p>}
                                {item.eventType && (
                                  <p className="text-sm text-slate-600">
                                    {item.eventType} | {item.guestCount} guests
                                  </p>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => deleteSingleInquiry(group.key, item)}
                                disabled={busyKey === `delete-inquiry-${uid}`}
                                className="rounded-full border border-red-100 p-2 text-red-400 opacity-0 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 group-hover:opacity-100"
                                aria-label={`Delete inquiry from ${item.name}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>

                            {item.message && <p className="mt-3 text-sm leading-7 text-slate-600">{item.message}</p>}
                            <p className="mt-3 text-xs text-slate-500">{formatDateTime(item.createdAt)}</p>
                            <div className="mt-4">
                              <SelectInput
                                value={item.status}
                                onChange={(event) => updateInquiryField(group.key, item.id, event.target.value)}
                                disabled={busyKey === `inquiry-${group.key}-${item.id}`}
                              >
                                {inquiryStatuses.map((status) => (
                                  <option key={status} value={status}>
                                    {toLabelCase(status)}
                                  </option>
                                ))}
                              </SelectInput>
                            </div>
                          </div>
                        )
                      })}

                      {groupItems.length === 0 && (
                        <p className="text-sm text-slate-600">No {group.key} inquiries yet.</p>
                      )}
                    </div>
                  </SectionCard>
                )
              })}
            </div>
          )}

          {activeTab === 'inquiries' && selectedInquiryIds.length > 0 && (
            <div className="fixed bottom-5 left-1/2 z-50 flex w-[calc(100%-2rem)] max-w-xl -translate-x-1/2 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-950 px-4 py-3 text-white shadow-[0_18px_50px_rgba(15,23,42,0.28)]">
              <p className="text-sm font-semibold">{selectedInquiryIds.length} selected</p>
              <ActionButton
                type="button"
                variant="danger"
                onClick={deleteSelectedInquiries}
                disabled={busyKey === 'bulk-delete-inquiries'}
                className="inline-flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {busyKey === 'bulk-delete-inquiries' ? 'Deleting...' : 'Delete Selected'}
              </ActionButton>
            </div>
          )}

          {activeTab === 'settings' && (
            <SectionCard
              title="Site Settings"
              description="Homepage hero, SEO fields, CTAs, contact details, and social links for the public site."
            >
              <form onSubmit={submitSettings} noValidate className="grid gap-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Restaurant Name">
                    <TextInput
                      value={settingsForm.restaurantName}
                      onChange={(event) =>
                        setSettingsForm((current) => ({ ...current, restaurantName: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Tagline">
                    <TextInput
                      value={settingsForm.tagline}
                      onChange={(event) => setSettingsForm((current) => ({ ...current, tagline: event.target.value }))}
                    />
                  </Field>
                </div>

                <Field label="Restaurant Description">
                  <TextArea
                    rows="4"
                    value={settingsForm.restaurantDescription}
                    onChange={(event) =>
                      setSettingsForm((current) => ({ ...current, restaurantDescription: event.target.value }))
                    }
                  />
                </Field>

                <div className="grid gap-4 lg:grid-cols-2">
                  <ImageUploadField
                    label="Logo"
                    value={settingsForm.logoUrl}
                    onChange={(event) =>
                      setSettingsForm((current) => ({
                        ...current,
                        logoUrl: event.target.value,
                      }))
                    }
                    onFileSelect={(file) =>
                      uploadImageToField({
                        file,
                        folder: 'settings',
                        busyId: 'upload-settings-logo',
                        successMessage: 'Logo uploaded',
                        onSuccess: ({ url }) =>
                          setSettingsForm((current) => ({
                            ...current,
                            logoUrl: url,
                          })),
                      })
                    }
                    isUploading={busyKey === 'upload-settings-logo'}
                    previewAlt="PalavuCentre logo"
                    placeholder="Paste logo URL or upload a logo"
                  />

                  <div className="grid gap-4">
                    <Field label="Hero Media Type">
                      <SelectInput
                        value={settingsForm.heroMediaType}
                        onChange={(event) =>
                          setSettingsForm((current) => ({ ...current, heroMediaType: event.target.value }))
                        }
                      >
                        {mediaTypes.map((type) => (
                          <option key={type} value={type}>
                            {toLabelCase(type)}
                          </option>
                        ))}
                      </SelectInput>
                    </Field>

                    {settingsForm.heroMediaType === 'image' ? (
                      <ImageUploadField
                        label="Hero Image"
                        value={settingsForm.heroMediaUrl}
                        onChange={(event) =>
                          setSettingsForm((current) => ({
                            ...current,
                            heroMediaUrl: event.target.value,
                          }))
                        }
                        onFileSelect={(file) =>
                          uploadImageToField({
                            file,
                            folder: 'settings',
                            busyId: 'upload-settings-hero',
                            successMessage: 'Hero image uploaded',
                            onSuccess: ({ url }) =>
                              setSettingsForm((current) => ({
                                ...current,
                                heroMediaUrl: url,
                              })),
                          })
                        }
                        isUploading={busyKey === 'upload-settings-hero'}
                        previewAlt="PalavuCentre restaurant"
                        placeholder="Paste hero image URL or upload from device"
                        hint="Only the first hero media item is edited here."
                      />
                    ) : (
                      <Field label="Hero Video URL" hint="Only the first hero item is edited here for now.">
                        <TextInput
                          value={settingsForm.heroMediaUrl}
                          onChange={(event) =>
                            setSettingsForm((current) => ({ ...current, heroMediaUrl: event.target.value }))
                          }
                          placeholder="https://..."
                        />
                      </Field>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Primary CTA Label">
                    <TextInput
                      value={settingsForm.primaryCtaLabel}
                      onChange={(event) =>
                        setSettingsForm((current) => ({ ...current, primaryCtaLabel: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Primary CTA Href">
                    <TextInput
                      value={settingsForm.primaryCtaHref}
                      onChange={(event) =>
                        setSettingsForm((current) => ({ ...current, primaryCtaHref: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Secondary CTA Label">
                    <TextInput
                      value={settingsForm.secondaryCtaLabel}
                      onChange={(event) =>
                        setSettingsForm((current) => ({ ...current, secondaryCtaLabel: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Secondary CTA Href">
                    <TextInput
                      value={settingsForm.secondaryCtaHref}
                      onChange={(event) =>
                        setSettingsForm((current) => ({ ...current, secondaryCtaHref: event.target.value }))
                      }
                    />
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Address">
                    <TextArea
                      rows="3"
                      value={settingsForm.addressText}
                      onChange={(event) =>
                        setSettingsForm((current) => ({ ...current, addressText: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Map Embed URL">
                    <TextArea
                      rows="3"
                      value={settingsForm.mapEmbedUrl}
                      onChange={(event) =>
                        setSettingsForm((current) => ({ ...current, mapEmbedUrl: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Map Link">
                    <TextInput
                      type="url"
                      value={settingsForm.mapLink}
                      onChange={(event) => setSettingsForm((current) => ({ ...current, mapLink: event.target.value }))}
                    />
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <Field label="Phone">
                    <TextInput
                      value={settingsForm.phone}
                      onChange={(event) => setSettingsForm((current) => ({ ...current, phone: event.target.value }))}
                    />
                  </Field>
                  <Field label="Email">
                    <TextInput
                      type="email"
                      value={settingsForm.email}
                      onChange={(event) => setSettingsForm((current) => ({ ...current, email: event.target.value }))}
                    />
                  </Field>
                  <Field label="WhatsApp Number">
                    <TextInput
                      value={settingsForm.whatsappNumber}
                      onChange={(event) =>
                        setSettingsForm((current) => ({ ...current, whatsappNumber: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Currency">
                    <TextInput
                      value={settingsForm.currency}
                      onChange={(event) =>
                        setSettingsForm((current) => ({ ...current, currency: event.target.value.toUpperCase() }))
                      }
                    />
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Hours">
                    <TextInput
                      value={settingsForm.hoursText}
                      onChange={(event) =>
                        setSettingsForm((current) => ({ ...current, hoursText: event.target.value }))
                      }
                    />
                  </Field>
                  <div className="flex items-end">
                    <ToggleInput
                      label="Floating WhatsApp Button Enabled"
                      checked={settingsForm.floatingWhatsappEnabled}
                      onChange={(event) =>
                        setSettingsForm((current) => ({
                          ...current,
                          floatingWhatsappEnabled: event.target.checked,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <Field label="Cuisine Type">
                    <TextInput
                      value={settingsForm.cuisineType}
                      onChange={(event) =>
                        setSettingsForm((current) => ({ ...current, cuisineType: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="City">
                    <TextInput
                      value={settingsForm.city}
                      onChange={(event) => setSettingsForm((current) => ({ ...current, city: event.target.value }))}
                    />
                  </Field>
                  <Field label="Google Review URL">
                    <TextInput
                      type="url"
                      value={settingsForm.googleReviewUrl}
                      onChange={(event) =>
                        setSettingsForm((current) => ({ ...current, googleReviewUrl: event.target.value }))
                      }
                    />
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Area Keywords" hint="Comma separated">
                    <TextArea
                      rows="3"
                      value={settingsForm.areaKeywords}
                      onChange={(event) =>
                        setSettingsForm((current) => ({ ...current, areaKeywords: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Meta Keywords" hint="Comma separated">
                    <TextArea
                      rows="3"
                      value={settingsForm.metaKeywords}
                      onChange={(event) =>
                        setSettingsForm((current) => ({ ...current, metaKeywords: event.target.value }))
                      }
                    />
                  </Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Meta Title">
                    <TextInput
                      value={settingsForm.metaTitle}
                      onChange={(event) =>
                        setSettingsForm((current) => ({ ...current, metaTitle: event.target.value }))
                      }
                    />
                  </Field>
                  <Field label="Meta Description">
                    <TextArea
                      rows="3"
                      value={settingsForm.metaDescription}
                      onChange={(event) =>
                        setSettingsForm((current) => ({ ...current, metaDescription: event.target.value }))
                      }
                    />
                  </Field>
                </div>

                <div className="rounded-[18px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">Social Links</p>
                      <p className="mt-1 text-sm text-slate-600">
                        Social links stay URL-based. Local image uploads are enabled in the sections above.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {settingsForm.socialLinks.map((link, index) => (
                      <div key={link.platform} className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[160px_1fr_120px_auto]">
                        <Field label="Platform">
                          <TextInput value={link.label} readOnly />
                        </Field>
                        <Field label="URL">
                          <TextInput
                            type="url"
                            value={link.url}
                            onChange={(event) =>
                              setSettingsForm((current) => ({
                                ...current,
                                socialLinks: current.socialLinks.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, url: event.target.value } : item,
                                ),
                              }))
                            }
                          />
                        </Field>
                        <Field label="Sort Order">
                          <TextInput
                            type="number"
                            value={link.sortOrder}
                            onChange={(event) =>
                              setSettingsForm((current) => ({
                                ...current,
                                socialLinks: current.socialLinks.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, sortOrder: event.target.value } : item,
                                ),
                              }))
                            }
                          />
                        </Field>
                        <div className="flex items-end">
                          <ToggleInput
                            label="Active"
                            checked={link.isActive}
                            onChange={(event) =>
                              setSettingsForm((current) => ({
                                ...current,
                                socialLinks: current.socialLinks.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, isActive: event.target.checked } : item,
                                ),
                              }))
                            }
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <ActionButton type="submit" disabled={busyKey === 'settings-form'}>
                    {busyKey === 'settings-form' ? 'Saving...' : 'Update Site Settings'}
                  </ActionButton>
                  <ActionButton type="button" variant="secondary" onClick={() => setSettingsForm(buildSettingsForm(settings))}>
                    Reset Form
                  </ActionButton>
                </div>
              </form>
            </SectionCard>
          )}
          {activeTab === 'ordering' && (
            <SectionCard
              title="Ordering"
              description="Pickup-only checkout uses item subtotal plus tax. Delivery pricing is disabled for now."
            >
              <form onSubmit={submitSettings} noValidate className="grid gap-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Order Tax Percent" hint="Applied to the pickup order subtotal.">
                    <TextInput
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={settingsForm.orderTaxPercent}
                      onChange={(event) =>
                        setSettingsForm((current) => ({ ...current, orderTaxPercent: event.target.value }))
                      }
                    />
                  </Field>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
                    Delivery fee and free-delivery threshold are locked at 0 while pickup-only ordering is active.
                  </div>
                </div>

                <div className="rounded-[18px] border border-slate-200 bg-white p-5 text-sm leading-7 text-slate-600">
                  These values are saved in the backend and used by the order page, promo previews, and order history pricing.
                </div>

                <div className="flex flex-wrap gap-3">
                  <ActionButton type="submit" disabled={busyKey === 'settings-form'}>
                    {busyKey === 'settings-form' ? 'Saving...' : 'Save Ordering Settings'}
                  </ActionButton>
                </div>
              </form>
            </SectionCard>
          )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}






