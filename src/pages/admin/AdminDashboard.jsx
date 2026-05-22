import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
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
import { useNavigate } from 'react-router-dom'

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
  print: false,
  operations: false,
}

const initialPaginationState = {
  menu: { page: 1, totalPages: 1 },
  gallery: { page: 1, totalPages: 1 },
  reviews: { page: 1, totalPages: 1 },
  offers: { page: 1, totalPages: 1 },
  promocodes: { page: 1, totalPages: 1 },
  orders: { page: 1, totalPages: 1 },
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

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function MiniBarChart({ items = [], valueKey = 'value', formatter = (value) => value }) {
  const maxValue = Math.max(...items.map((item) => Number(item[valueKey] || 0)), 1)

  return (
    <div className="flex h-40 items-end gap-2">
      {items.map((item) => {
        const value = Number(item[valueKey] || 0)
        return (
          <div key={`${item.label}-${item.date || ''}`} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-28 w-full items-end rounded-lg bg-slate-100 px-1">
              <div
                className="w-full rounded-md bg-blue-600"
                style={{ height: `${Math.max(8, (value / maxValue) * 100)}%` }}
                title={`${item.label}: ${formatter(value)}`}
              />
            </div>
            <span className="text-[10px] font-medium text-slate-500">{item.label}</span>
          </div>
        )
      })}
    </div>
  )
}

function EmptyPanel({ title, description }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center">
      <p className="text-sm font-semibold text-slate-900">{title}</p>
      {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
    </div>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const confirmResolverRef = useRef(null)
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
  const [menuSubTab, setMenuSubTab] = useState('items')
  const [menuSearch, setMenuSearch] = useState('')
  const [menuCategoryFilter, setMenuCategoryFilter] = useState('all')
  const [menuDietFilter, setMenuDietFilter] = useState('all')
  const [menuAvailabilityFilter, setMenuAvailabilityFilter] = useState('all')
  const [menuBestsellerFilter, setMenuBestsellerFilter] = useState('all')
  const [menuImageFilter, setMenuImageFilter] = useState('all')
  const [menuPriceMin, setMenuPriceMin] = useState('')
  const [menuPriceMax, setMenuPriceMax] = useState('')
  const [menuSortBy, setMenuSortBy] = useState('sortOrder')
  const [selectedMenuIds, setSelectedMenuIds] = useState([])
  const [bulkCategoryId, setBulkCategoryId] = useState('')
  const [bulkPriceDelta, setBulkPriceDelta] = useState('')
  const [orderSearch, setOrderSearch] = useState('')
  const [orderStatusFilter, setOrderStatusFilter] = useState('all')
  const [orderPaymentFilter, setOrderPaymentFilter] = useState('all')
  const [orderPaymentMethodFilter, setOrderPaymentMethodFilter] = useState('all')
  const [orderDateFilter, setOrderDateFilter] = useState('all')
  const [orderBranchFilter, setOrderBranchFilter] = useState('all')
  const [orderDateFrom, setOrderDateFrom] = useState('')
  const [orderDateTo, setOrderDateTo] = useState('')
  const [orderPage, setOrderPage] = useState(1)
  const ORDERS_PER_PAGE = 10
  const [expandedOrderId, setExpandedOrderId] = useState(null)
  const [printJobs, setPrintJobs] = useState([])
  const [printSettings, setPrintSettings] = useState(null)
  const [printStationStatus, setPrintStationStatus] = useState([])
  const [customerSearch, setCustomerSearch] = useState('')
  const [paymentSearch, setPaymentSearch] = useState('')
  const [expenseForm, setExpenseForm] = useState({ category: '', amount: '', notes: '', date: toDateInputValue(new Date()) })
  const [expenses, setExpenses] = useState([])
  const [confirmDialog, setConfirmDialog] = useState(null)
  const operationalSections = new Set(['customers', 'payments', 'reports', 'inventory', 'branches', 'staff', 'activity', 'expenses'])
  const activeSectionKey =
    activeTab === 'ordering'
      ? 'settings'
      : activeTab === 'orders-print' || activeTab === 'print-settings'
        ? 'print'
        : activeTab === 'categories'
          ? 'menu'
          : operationalSections.has(activeTab)
            ? 'operations'
            : activeTab

  const showAdminAlert = (message) => {
    setError(message)
    setNotice('')
  }

  const requestConfirmation = ({ title = 'Confirm action', message, actionLabel = 'Confirm', danger = true }) =>
    new Promise((resolve) => {
      confirmResolverRef.current = resolve
      setConfirmDialog({ title, message, actionLabel, danger })
    })

  const resolveConfirmation = (confirmed) => {
    confirmResolverRef.current?.(confirmed)
    confirmResolverRef.current = null
    setConfirmDialog(null)
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
    const minPrice = menuPriceMin === '' ? null : Number(menuPriceMin)
    const maxPrice = menuPriceMax === '' ? null : Number(menuPriceMax)

    return menuItems.filter((item) => {
      const matchesCategory =
        menuCategoryFilter === 'all' || String(item.category?.id || '') === String(menuCategoryFilter)
      const itemDiet = item.dietaryType || (item.veg ? 'veg' : 'non_veg')
      const matchesDiet = menuDietFilter === 'all' || itemDiet === menuDietFilter
      const matchesAvailability =
        menuAvailabilityFilter === 'all' ||
        (menuAvailabilityFilter === 'available' && item.available) ||
        (menuAvailabilityFilter === 'unavailable' && !item.available)
      const matchesBestseller =
        menuBestsellerFilter === 'all' ||
        (menuBestsellerFilter === 'bestseller' && item.bestseller) ||
        (menuBestsellerFilter === 'not_bestseller' && !item.bestseller)
      const matchesImage =
        menuImageFilter === 'all' ||
        (menuImageFilter === 'missing' && !item.img) ||
        (menuImageFilter === 'has_image' && Boolean(item.img))
      const matchesSubTab =
        menuSubTab === 'items' ||
        menuSubTab === 'bulk' ||
        (menuSubTab === 'bestsellers' && item.bestseller) ||
        (menuSubTab === 'missing-images' && !item.img)
      const matchesPrice =
        (minPrice === null || Number(item.price || 0) >= minPrice) &&
        (maxPrice === null || Number(item.price || 0) <= maxPrice)
      const matchesQuery =
        !query ||
        item.name.toLowerCase().includes(query) ||
        (item.desc || '').toLowerCase().includes(query) ||
        (item.category?.name || '').toLowerCase().includes(query) ||
        (item.tags || []).some((tag) => String(tag).toLowerCase().includes(query))

      return (
        matchesCategory &&
        matchesDiet &&
        matchesAvailability &&
        matchesBestseller &&
        matchesImage &&
        matchesSubTab &&
        matchesPrice &&
        matchesQuery
      )
    }).sort((left, right) => {
      if (menuSortBy === 'name') {
        return left.name.localeCompare(right.name)
      }

      if (menuSortBy === 'price') {
        return Number(left.price || 0) - Number(right.price || 0)
      }

      if (menuSortBy === 'newest') {
        return new Date(right.createdAt || 0) - new Date(left.createdAt || 0)
      }

      return Number(left.sortOrder || 0) - Number(right.sortOrder || 0)
    })
  }, [
    menuAvailabilityFilter,
    menuBestsellerFilter,
    menuCategoryFilter,
    menuDietFilter,
    menuImageFilter,
    menuItems,
    menuPriceMax,
    menuPriceMin,
    menuSearch,
    menuSortBy,
    menuSubTab,
  ])

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
    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(startOfToday); startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    return [...orders]
      .filter((order) => {
      const matchesStatus = orderStatusFilter === 'all' || order.orderStatus === orderStatusFilter
      const matchesPayment = orderPaymentFilter === 'all' || order.paymentStatus === orderPaymentFilter
      const matchesPaymentMethod = orderPaymentMethodFilter === 'all' || order.paymentMethod === orderPaymentMethodFilter
      const matchesBranch = orderBranchFilter === 'all' || (order.storeLocation || '') === orderBranchFilter
      const orderDate = new Date(order.createdAt)
      const fromDate = orderDateFrom ? new Date(`${orderDateFrom}T00:00:00`) : null
      const toDate = orderDateTo ? new Date(`${orderDateTo}T23:59:59`) : null
      const matchesDate = orderDateFilter === 'all' ||
        (orderDateFilter === 'today' && orderDate >= startOfToday) ||
        (orderDateFilter === 'week' && orderDate >= startOfWeek) ||
        (orderDateFilter === 'month' && orderDate >= startOfMonth)
      const matchesDateRange = (!fromDate || orderDate >= fromDate) && (!toDate || orderDate <= toDate)
      const matchesQuery =
        !query ||
        order.orderNumber.toLowerCase().includes(query) ||
        (order.customer?.name || '').toLowerCase().includes(query) ||
        (order.customer?.phone || '').toLowerCase().includes(query) ||
        (order.account?.email || '').toLowerCase().includes(query) ||
        (order.promo?.code || '').toLowerCase().includes(query)

        return matchesStatus && matchesPayment && matchesPaymentMethod && matchesBranch && matchesDate && matchesDateRange && matchesQuery
      })
      .sort((firstOrder, secondOrder) => new Date(secondOrder.createdAt) - new Date(firstOrder.createdAt))
  }, [
    orderBranchFilter,
    orderDateFilter,
    orderDateFrom,
    orderDateTo,
    orderPaymentFilter,
    orderPaymentMethodFilter,
    orderSearch,
    orderStatusFilter,
    orders,
  ])

  const totalOrderPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE) || 1
  const paginatedOrders = filteredOrders.slice((orderPage - 1) * ORDERS_PER_PAGE, orderPage * ORDERS_PER_PAGE)

  const customerRows = useMemo(() => {
    const customerMap = new Map()

    orders.forEach((order) => {
      const key = order.customer?.phone || order.customer?.email || order.account?.email || order.customer?.name || `order-${order.id}`
      const existing = customerMap.get(key) || {
        key,
        name: order.customer?.name || order.account?.name || 'Guest Customer',
        phone: order.customer?.phone || '',
        email: order.customer?.email || order.account?.email || '',
        totalOrders: 0,
        totalSpend: 0,
        lastOrderDate: order.createdAt,
        orders: [],
      }

      existing.totalOrders += 1
      existing.totalSpend += Number(order.pricing?.grandTotal || 0)
      existing.lastOrderDate =
        new Date(order.createdAt) > new Date(existing.lastOrderDate) ? order.createdAt : existing.lastOrderDate
      existing.orders.push(order)
      customerMap.set(key, existing)
    })

    const query = customerSearch.trim().toLowerCase()
    return [...customerMap.values()]
      .filter((customer) =>
        !query ||
        customer.name.toLowerCase().includes(query) ||
        customer.phone.toLowerCase().includes(query) ||
        customer.email.toLowerCase().includes(query),
      )
      .sort((left, right) => new Date(right.lastOrderDate) - new Date(left.lastOrderDate))
  }, [customerSearch, orders])

  const paymentRows = useMemo(() => {
    const query = paymentSearch.trim().toLowerCase()

    return orders
      .map((order) => {
        const latestPayment = Array.isArray(order.payments) && order.payments.length > 0 ? order.payments[0] : null
        return {
          id: latestPayment?.id || `order-${order.id}`,
          order,
          customerName: order.customer?.name || 'Guest Customer',
          method: order.paymentMethod,
          status: order.paymentStatus,
          amount: order.pricing?.grandTotal || latestPayment?.amount || 0,
          providerOrderId: latestPayment?.providerOrderId || '',
          providerPaymentId: latestPayment?.providerPaymentId || '',
          webhookVerifiedAt: latestPayment?.webhookVerifiedAt || '',
          failureReason: latestPayment?.failureReason || '',
          createdAt: latestPayment?.createdAt || order.createdAt,
        }
      })
      .filter((payment) => {
        const matchesSearch =
          !query ||
          payment.order.orderNumber.toLowerCase().includes(query) ||
          payment.customerName.toLowerCase().includes(query) ||
          payment.providerPaymentId.toLowerCase().includes(query) ||
          payment.providerOrderId.toLowerCase().includes(query)
        const matchesStatus = orderPaymentFilter === 'all' || payment.status === orderPaymentFilter
        const matchesMethod = orderPaymentMethodFilter === 'all' || payment.method === orderPaymentMethodFilter
        return matchesSearch && matchesStatus && matchesMethod
      })
      .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt))
  }, [orderPaymentFilter, orderPaymentMethodFilter, orders, paymentSearch])

  const branchRows = useMemo(() => {
    const branchMap = new Map([
      ['kukatpally', { id: 'kukatpally', name: 'Kukatpally', orders: 0, revenue: 0, pending: 0 }],
      ['bachupally', { id: 'bachupally', name: 'Bachupally', orders: 0, revenue: 0, pending: 0 }],
    ])

    orders.forEach((order) => {
      const branchId = order.storeLocation || 'unassigned'
      const row = branchMap.get(branchId) || { id: branchId, name: toLabelCase(branchId), orders: 0, revenue: 0, pending: 0 }
      row.orders += 1
      row.revenue += Number(order.pricing?.grandTotal || 0)
      if (order.orderStatus === 'pending') {
        row.pending += 1
      }
      branchMap.set(branchId, row)
    })

    return [...branchMap.values()]
  }, [orders])

  const activityRows = useMemo(() => {
    const rows = [
      ...orders.slice(0, 12).map((order) => ({
        id: `order-${order.id}`,
        user: 'System',
        action: `Order ${toLabelCase(order.orderStatus)}`,
        entity: order.orderNumber,
        time: order.updatedAt || order.createdAt,
        details: `${toLabelCase(order.paymentMethod)} / ${toLabelCase(order.paymentStatus)} / ${formatCurrency(order.pricing?.grandTotal)}`,
      })),
      ...menuItems.slice(0, 8).map((item) => ({
        id: `menu-${item.id}`,
        user: 'Admin',
        action: item.available ? 'Menu item available' : 'Menu item unavailable',
        entity: item.name,
        time: item.updatedAt || item.createdAt,
        details: `${item.category?.name || 'No category'} / ${formatCurrency(item.price)}`,
      })),
      ...printJobs.slice(0, 8).map((job) => ({
        id: `print-${job.id}`,
        user: 'Print station',
        action: `Print job ${toLabelCase(job.status)}`,
        entity: job.order?.orderNumber || `Job #${job.id}`,
        time: job.updatedAt || job.createdAt,
        details: job.errorMessage || job.printerName || 'No printer message',
      })),
    ]

    return rows.sort((left, right) => new Date(right.time) - new Date(left.time)).slice(0, 24)
  }, [menuItems, orders, printJobs])

  const fetchDashboard = async () => {
    const response = await adminApi.getDashboard()
    setDashboard(response.data)
  }

  const fetchMenuData = async ({ page = 1, limit = 100, append = false } = {}) => {
    const [categoriesResponse, itemsResponse] = await Promise.all([
      adminApi.getMenuCategories(),
      adminApi.getMenuItems({ page, limit }),
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

  const fetchOrders = async ({ page = 1, limit = 100, append = false } = {}) => {
    const response = await adminApi.getOrders({ page, limit })
    setOrders((current) => (append ? [...current, ...(response.data.items || [])] : response.data.items || []))
    setSectionPagination((current) => ({
      ...current,
      orders: response.data.pagination || current.orders,
    }))
  }

  const fetchInquiries = async () => {
    const response = await adminApi.getInquiries({ page: 1, limit: 20 })
    setInquiries(response.data)
  }

  const fetchSettings = async () => {
    const response = await adminApi.getSettings()
    setSettings(response.data)
    setSettingsForm(buildSettingsForm(response.data))
  }

  const fetchPrintData = async () => {
    const [jobsResponse, settingsResponse] = await Promise.all([
      adminApi.getPrintJobs({ page: 1, limit: 50 }).catch(() => ({ data: { items: [] } })),
      adminApi.getPrintSettings().catch(() => ({ data: null })),
    ])

    setPrintJobs(jobsResponse.data?.items || [])
    setPrintStationStatus(jobsResponse.data?.stationStatus || [])
    setPrintSettings(settingsResponse.data || null)
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
      } else if (sectionKey === 'print') {
        await Promise.all([fetchPrintData(), fetchOrders()])
      } else if (sectionKey === 'operations') {
        await Promise.all([fetchDashboard(), fetchOrders(), fetchMenuData(), fetchInquiries(), fetchPrintData()])
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
    if (activeTab === 'categories') {
      setMenuSubTab('categories')
    }
  }, [activeTab])

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

  const parseMenuTags = (value) =>
    String(value || '')
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 8)

  const addMenuVariant = (label = '') => {
    setMenuItemForm((current) => ({
      ...current,
      variants: [...(current.variants || []), { label, pricePaise: '' }],
    }))
  }

  const addSingleFullVariants = () => {
    setMenuItemForm((current) => {
      const variants = current.variants || []
      const labels = new Set(variants.map((variant) => String(variant.label || '').trim().toLowerCase()))
      const nextVariants = [...variants]

      if (!labels.has('single')) {
        nextVariants.push({ label: 'Single', pricePaise: '' })
      }

      if (!labels.has('full')) {
        nextVariants.push({ label: 'Full', pricePaise: '' })
      }

      return {
        ...current,
        variants: nextVariants,
      }
    })
  }

  const updateMenuVariant = (index, patch) => {
    setMenuItemForm((current) => ({
      ...current,
      variants: (current.variants || []).map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, ...patch } : variant,
      ),
    }))
  }

  const removeMenuVariant = (index) => {
    setMenuItemForm((current) => ({
      ...current,
      variants: (current.variants || []).filter((_, variantIndex) => variantIndex !== index),
    }))
  }

  const buildMenuVariantsPayload = () => {
    const rows = (menuItemForm.variants || []).map((variant) => ({
      label: String(variant.label || '').trim(),
      pricePaise: Number(variant.pricePaise || 0),
    }))
    const hasIncompleteRow = rows.some((variant) => {
      const hasLabel = Boolean(variant.label)
      const hasPrice = Number.isFinite(variant.pricePaise) && variant.pricePaise > 0
      return hasLabel !== hasPrice
    })

    if (hasIncompleteRow) {
      showAdminAlert('Each size option needs both a label and a price.')
      return null
    }

    const variants = rows.filter((variant) => variant.label && variant.pricePaise > 0)
    const labels = variants.map((variant) => variant.label.toLowerCase())
    const hasDuplicateLabel = labels.some((label, index) => labels.indexOf(label) !== index)

    if (hasDuplicateLabel) {
      showAdminAlert('Size option labels must be unique for this dish.')
      return null
    }

    return variants
  }

  const prepareNewItemForCategory = (category) => {
    setMenuCategoryFilter(String(category.id))
    setMenuItemForm((current) => ({
      ...initialMenuItemForm,
      categoryId: String(category.id),
      isVeg: current.isVeg,
      dietaryType: current.dietaryType || (current.isVeg ? 'veg' : 'non_veg'),
      spiceLevel: current.spiceLevel || 'medium',
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

    const variants = buildMenuVariantsPayload()

    if (!variants) {
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
        imageThumbnailUrl: emptyToUndefined(menuItemForm.imageThumbnailUrl),
        imageMediumUrl: emptyToUndefined(menuItemForm.imageMediumUrl),
        imageLargeUrl: emptyToUndefined(menuItemForm.imageLargeUrl),
        imageAlt: emptyToUndefined(menuItemForm.imageAlt) || emptyToUndefined(menuItemForm.name),
        imageSize: menuItemForm.imageSize ? Number(menuItemForm.imageSize) : undefined,
        imageMimeType: emptyToUndefined(menuItemForm.imageMimeType),
        price: Number(menuItemForm.price),
        variants,
        dietaryType: menuItemForm.dietaryType,
        preparationTimeMinutes: menuItemForm.preparationTimeMinutes
          ? Number(menuItemForm.preparationTimeMinutes)
          : undefined,
        spiceLevel: emptyToUndefined(menuItemForm.spiceLevel),
        tags: Array.isArray(menuItemForm.tags) ? menuItemForm.tags : [],
        isVeg: menuItemForm.dietaryType === 'veg' || menuItemForm.isVeg,
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
          dietaryType: menuItemForm.dietaryType,
          spiceLevel: menuItemForm.spiceLevel,
          tags: menuItemForm.tags,
          isVeg: menuItemForm.dietaryType === 'veg' || menuItemForm.isVeg,
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
    const confirmed = await requestConfirmation({
      title: 'Delete item',
      message: confirmation,
      actionLabel: 'Delete',
      danger: true,
    })

    if (!confirmed) {
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
    if (payload.orderStatus === 'cancelled') {
      const confirmed = await requestConfirmation({
        title: 'Cancel order',
        message: 'Cancel this order? This action should only be used when the restaurant cannot fulfil it.',
        actionLabel: 'Cancel Order',
        danger: true,
      })

      if (!confirmed) {
        return
      }
    }

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

  const duplicateMenuItem = (item) => {
    setMenuItemForm({
      ...initialMenuItemForm,
      categoryId: String(item.category?.id || ''),
      name: `${item.name} Copy`,
      shortDescription: item.desc || '',
      description: item.description || '',
      imageUrl: item.imageMediumUrl || item.imageUrl || item.img || '',
      imageThumbnailUrl: item.imageThumbnailUrl || '',
      imageMediumUrl: item.imageMediumUrl || '',
      imageLargeUrl: item.imageLargeUrl || '',
      imageAlt: item.imageAlt || item.name,
      imageSize: item.imageSize ? String(item.imageSize) : '',
      imageMimeType: item.imageMimeType || '',
      price: String(item.price),
      variants: item.variants || [],
      dietaryType: item.dietaryType || (item.veg ? 'veg' : 'non_veg'),
      preparationTimeMinutes: item.preparationTimeMinutes ? String(item.preparationTimeMinutes) : '',
      spiceLevel: item.spiceLevel || 'medium',
      tags: item.tags || [],
      isVeg: item.veg,
      isBestseller: item.bestseller,
      isAvailable: item.available,
      sortOrder: String(Number(item.sortOrder || 0) + 1),
    })
    setNotice('Dish copied into the form. Review the name and save to create it.')
  }

  const selectedMenuItems = menuItems.filter((item) => selectedMenuIds.includes(item.id))

  const applyBulkMenuPatch = async (payload, successMessage) => {
    if (selectedMenuIds.length === 0) {
      showAdminAlert('Select at least one dish first.')
      return
    }

    const confirmed = await requestConfirmation({
      title: 'Bulk update dishes',
      message: `Update ${selectedMenuIds.length} selected dish${selectedMenuIds.length === 1 ? '' : 'es'}?`,
      actionLabel: 'Update',
      danger: false,
    })

    if (!confirmed) {
      return
    }

    try {
      setBusyKey('menu-bulk')
      setError('')
      setNotice('')
      await Promise.all(selectedMenuIds.map((id) => adminApi.updateMenuItem(id, payload)))
      setNotice(successMessage)
      setSelectedMenuIds([])
      await Promise.all([fetchMenuData(), fetchDashboard()])
    } catch (requestError) {
      setError(requestError.message || 'Bulk update failed')
    } finally {
      setBusyKey('')
    }
  }

  const applyBulkPriceUpdate = async () => {
    const delta = Number(bulkPriceDelta || 0)

    if (!Number.isFinite(delta) || delta === 0) {
      showAdminAlert('Enter a valid price change amount.')
      return
    }

    if (selectedMenuItems.length === 0) {
      showAdminAlert('Select at least one dish first.')
      return
    }

    const confirmed = await requestConfirmation({
      title: 'Bulk price update',
      message: `Apply ${delta > 0 ? '+' : ''}${delta} INR to ${selectedMenuItems.length} selected dish prices?`,
      actionLabel: 'Update Prices',
      danger: delta < 0,
    })

    if (!confirmed) {
      return
    }

    try {
      setBusyKey('menu-bulk')
      setError('')
      setNotice('')
      await Promise.all(
        selectedMenuItems.map((item) =>
          adminApi.updateMenuItem(item.id, {
            price: Math.max(1, Number(item.price || 0) + delta),
          }),
        ),
      )
      setNotice('Bulk price update applied')
      setBulkPriceDelta('')
      setSelectedMenuIds([])
      await Promise.all([fetchMenuData(), fetchDashboard()])
    } catch (requestError) {
      setError(requestError.message || 'Bulk price update failed')
    } finally {
      setBusyKey('')
    }
  }

  const bulkDeleteMenuItems = async () => {
    if (selectedMenuIds.length === 0) {
      showAdminAlert('Select at least one dish first.')
      return
    }

    const confirmed = await requestConfirmation({
      title: 'Bulk delete dishes',
      message: `Delete ${selectedMenuIds.length} selected dish${selectedMenuIds.length === 1 ? '' : 'es'}? This cannot be undone.`,
      actionLabel: 'Delete',
      danger: true,
    })

    if (!confirmed) {
      return
    }

    try {
      setBusyKey('menu-bulk')
      setError('')
      setNotice('')
      await Promise.all(selectedMenuIds.map((id) => adminApi.deleteMenuItem(id)))
      setNotice('Selected dishes deleted')
      setSelectedMenuIds([])
      await Promise.all([fetchMenuData(), fetchDashboard()])
    } catch (requestError) {
      setError(requestError.message || 'Bulk delete failed')
    } finally {
      setBusyKey('')
    }
  }

  const handlePrintOrder = (order, mode = 'print') => {
    if (typeof window === 'undefined') {
      return
    }

    const printWindow = window.open('', '_blank', 'width=420,height=720')
    if (!printWindow) {
      showAdminAlert('Popup blocked. Allow popups or open Orders & Print.')
      return
    }

    const itemRows = (order.items || [])
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.name)}</td>
            <td class="center">${item.quantity}</td>
            <td class="right">${formatCurrency(item.unitPrice)}</td>
            <td class="right">${formatCurrency(item.total)}</td>
          </tr>
        `,
      )
      .join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>${escapeHtml(order.orderNumber)}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 12px; color: #111; }
            .bill { width: 80mm; max-width: 100%; margin: 0 auto; }
            h1 { font-size: 18px; margin: 0 0 6px; text-align: center; }
            p { margin: 3px 0; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
            th, td { border-bottom: 1px dashed #999; padding: 6px 2px; vertical-align: top; text-align: left; }
            .center { text-align: center; }
            .right { text-align: right; }
            .total { font-size: 16px; font-weight: 700; }
            @media print { @page { size: 80mm auto; margin: 4mm; } body { padding: 0; } }
          </style>
        </head>
        <body>
          <div class="bill">
            <h1>${escapeHtml(settings?.restaurantName || 'PalavuCentre')}</h1>
            <p><strong>Order:</strong> ${escapeHtml(order.orderNumber)}</p>
            <p><strong>Date:</strong> ${formatDateTime(order.createdAt)}</p>
            <p><strong>Customer:</strong> ${escapeHtml(order.customer?.name || 'Guest')}</p>
            <p><strong>Phone:</strong> ${escapeHtml(order.customer?.phone || '-')}</p>
            <p><strong>Branch:</strong> ${toLabelCase(order.storeLocation || 'not selected')}</p>
            <p><strong>Payment:</strong> ${toLabelCase(order.paymentMethod)} / ${toLabelCase(order.paymentStatus)}</p>
            ${order.notes ? `<p><strong>Special Request:</strong> ${escapeHtml(order.notes)}</p>` : ''}
            <table>
              <thead><tr><th>Item</th><th class="center">Qty</th><th class="right">Rate</th><th class="right">Total</th></tr></thead>
              <tbody>${itemRows}</tbody>
            </table>
            <p class="right">Subtotal: ${formatCurrency(order.pricing?.subTotal)}</p>
            <p class="right">Discount: ${formatCurrency(order.pricing?.discountAmount || 0)}</p>
            <p class="right">Tax: ${formatCurrency(order.pricing?.taxAmount || 0)}</p>
            <p class="right total">Grand Total: ${formatCurrency(order.pricing?.grandTotal)}</p>
            <p style="text-align:center;margin-top:14px;">Thank you</p>
          </div>
          <script>window.onload = () => { window.print(); setTimeout(() => window.close(), 300); };</script>
        </body>
      </html>
    `)
    printWindow.document.close()
    setNotice(`${mode === 'reprint' ? 'Reprint' : 'Print'} opened for ${order.orderNumber}`)
  }

  const savePrintSettings = async (patch) => {
    try {
      setBusyKey('print-settings')
      setError('')
      setNotice('')
      const response = await adminApi.updatePrintSettings({ ...(printSettings || {}), ...patch })
      setPrintSettings(response.data)
      setNotice('Print settings updated')
      await fetchPrintData()
    } catch (requestError) {
      setError(requestError.message || 'Could not update print settings')
    } finally {
      setBusyKey('')
    }
  }

  const exportCsv = (filename, rows) => {
    if (!rows.length) {
      showAdminAlert('No rows available to export.')
      return
    }

    const headers = Object.keys(rows[0])
    const csv = [
      headers.join(','),
      ...rows.map((row) =>
        headers
          .map((header) => `"${String(row[header] ?? '').replaceAll('"', '""')}"`)
          .join(','),
      ),
    ].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  const addExpense = (event) => {
    event.preventDefault()

    if (!expenseForm.category.trim() || !Number(expenseForm.amount)) {
      showAdminAlert('Expense category and amount are required.')
      return
    }

    setExpenses((current) => [
      {
        id: Date.now(),
        category: expenseForm.category.trim(),
        amount: Number(expenseForm.amount),
        notes: expenseForm.notes.trim(),
        date: expenseForm.date || toDateInputValue(new Date()),
      },
      ...current,
    ])
    setExpenseForm({ category: '', amount: '', notes: '', date: toDateInputValue(new Date()) })
    setNotice('Expense added to this admin session')
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
                  alt={sidebarBrandName}
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
                            onClick={() => setActiveTab(tab.id)}
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
                  <a
                    href="/admin/kitchen"
                    target="_blank"
                    className="inline-flex items-center justify-center rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700 transition hover:bg-amber-100"
                  >
                    🖨️ Orders & Print
                  </a>
                  <ActionButton type="button" variant="danger" onClick={handleLogout} className="inline-flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    Logout
                  </ActionButton>
                </div>
              </div>
            </div>
          </header>

          <main className="px-0 py-6 pr-2">
            {error && (
              <div className="mb-6 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700 sm:flex-row sm:items-center sm:justify-between">
                <span>{error}</span>
                <button
                  type="button"
                  onClick={refreshActiveSection}
                  className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100"
                >
                  Retry
                </button>
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
                    onClick={() => setActiveTab(tab.id)}
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
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {[
                  { label: 'Today Orders', value: dashboard?.stats?.todayOrders || 0, hint: 'Today' },
                  { label: 'Pending Orders', value: dashboard?.stats?.pendingOrders || 0, hint: 'Needs action' },
                  { label: 'Completed Orders', value: dashboard?.stats?.completedOrders || 0, hint: 'All time' },
                  { label: 'Today Revenue', value: formatCurrency(dashboard?.stats?.todayRevenue || 0), hint: 'Paid today' },
                  { label: 'Paid Revenue', value: formatCurrency(dashboard?.stats?.paidRevenue || dashboard?.stats?.revenue || 0), hint: 'All paid orders' },
                  { label: 'Unpaid Amount', value: formatCurrency(dashboard?.stats?.unpaidAmount || 0), hint: 'Pending collection' },
                  { label: 'Total Menu Items', value: dashboard?.stats?.totalMenuItems || 0, hint: 'Live catalog' },
                  { label: 'New Inquiries', value: dashboard?.stats?.newInquiries || 0, hint: 'Needs reply' },
                  { label: 'Active Offers', value: dashboard?.stats?.activeOffers || 0, hint: 'Running now' },
                  { label: 'Visible Reviews', value: dashboard?.stats?.visibleReviews || 0, hint: 'Public reviews' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <p className="text-[11px] font-bold uppercase tracking-[2px] text-slate-500">{stat.label}</p>
                    <p className="mt-3 text-3xl font-black text-slate-900">{stat.value}</p>
                    <p className="mt-2 text-xs text-slate-500">{stat.hint}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
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
                          <div className="flex flex-wrap justify-end gap-2 text-sm">
                            <StatusBadge value={order.orderStatus} kind="order" />
                            <StatusBadge value={order.paymentStatus} kind="payment" />
                            <span className="font-semibold text-slate-900">{formatCurrency(order.pricing?.grandTotal)}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs text-slate-500">{formatDateTime(order.createdAt)}</p>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab('orders')
                              setExpandedOrderId(order.id)
                            }}
                            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            View
                          </button>
                        </div>
                      </div>
                    ))}
                    {(!dashboard?.recentOrders || dashboard.recentOrders.length === 0) && (
                      <EmptyPanel title="No recent orders" description="New customer orders will appear here." />
                    )}
                  </div>
                </SectionCard>

                <SectionCard title="Quick Actions" description="Common admin workflows for counter and back-office staff.">
                  <div className="grid gap-3">
                    {[
                      ['Add Dish', 'menu', () => setMenuSubTab('items')],
                      ['View Pending Orders', 'orders', () => setOrderStatusFilter('pending')],
                      ['Open Orders & Print', 'orders-print'],
                      ['Add Offer', 'offers'],
                      ['Create Promo Code', 'promocodes'],
                      ['Upload Gallery Image', 'gallery'],
                    ].map(([label, tab, before]) => (
                      <button
                        key={label}
                        type="button"
                        onClick={() => {
                          before?.()
                          setActiveTab(tab)
                        }}
                        className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-semibold text-slate-800 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </SectionCard>
              </div>

              <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
                <SectionCard title="Business Snapshot" description="Today's operational mix by payment and collection state.">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      ['Revenue today', formatCurrency(dashboard?.businessSnapshot?.revenueToday || 0)],
                      ['Orders today', dashboard?.businessSnapshot?.ordersToday || 0],
                      ['COD orders', dashboard?.businessSnapshot?.codOrders || 0],
                      ['Online paid orders', dashboard?.businessSnapshot?.onlinePaidOrders || 0],
                      ['Unpaid orders', dashboard?.businessSnapshot?.unpaidOrders || 0],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[1.6px] text-slate-500">{label}</p>
                        <p className="mt-2 text-xl font-semibold text-slate-950">{value}</p>
                      </div>
                    ))}
                  </div>
                </SectionCard>

                <SectionCard title="Charts" description="Fast, lightweight summaries without loading a heavy chart library.">
                  <div className="grid gap-5 xl:grid-cols-2">
                    <div>
                      <p className="mb-3 text-sm font-semibold text-slate-900">Daily Revenue</p>
                      <MiniBarChart items={dashboard?.charts?.dailyRevenue || []} formatter={(value) => formatCurrency(value)} />
                    </div>
                    <div>
                      <p className="mb-3 text-sm font-semibold text-slate-900">Orders By Day</p>
                      <MiniBarChart items={dashboard?.charts?.ordersByDay || []} />
                    </div>
                    <div className="xl:col-span-2">
                      <p className="mb-3 text-sm font-semibold text-slate-900">Payment Status / Best Sellers</p>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          {(dashboard?.charts?.paymentStatus || []).map((item) => (
                            <div key={item.label} className="mb-2 flex items-center justify-between text-sm last:mb-0">
                              <span className="text-slate-600">{toLabelCase(item.label)}</span>
                              <span className="font-semibold text-slate-900">{item.value}</span>
                            </div>
                          ))}
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          {(dashboard?.charts?.bestSellingItems || []).map((item) => (
                            <div key={item.label} className="mb-2 flex items-center justify-between gap-3 text-sm last:mb-0">
                              <span className="truncate text-slate-600">{item.label}</span>
                              <span className="font-semibold text-slate-900">{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </div>
            </>
          )}

          {(activeTab === 'menu' || activeTab === 'categories') && (
            <div className="grid gap-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {menuMetrics.map((metric) => (
                  <MetricTile key={metric.label} label={metric.label} value={metric.value} hint={metric.hint} />
                ))}
              </div>

              <div className="rounded-[18px] border border-slate-200 bg-white p-2 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="scrollbar-hide flex gap-2 overflow-x-auto">
                  {[
                    ['categories', 'Categories'],
                    ['items', 'Menu Items'],
                    ['bestsellers', 'Best Sellers'],
                    ['missing-images', 'Missing Images'],
                    ['bulk', 'Bulk Update'],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setMenuSubTab(id)}
                      className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                        menuSubTab === id
                          ? 'bg-slate-900 text-white'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-6">
              {menuSubTab === 'categories' && (
              <SectionCard title="Menu Categories" description="Create and organize menu groups.">
                <form onSubmit={submitCategory} noValidate className="grid gap-4">
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
                            <QuickPillButton
                              active={category.isActive}
                              disabled={busyKey === `category-active-${category.id}`}
                              onClick={async () => {
                                try {
                                  setBusyKey(`category-active-${category.id}`)
                                  await adminApi.updateMenuCategory(category.id, { isActive: !category.isActive })
                                  setNotice(category.isActive ? 'Category marked inactive' : 'Category marked active')
                                  await fetchMenuData()
                                } catch (requestError) {
                                  setError(requestError.message || 'Could not update category')
                                } finally {
                                  setBusyKey('')
                                }
                              }}
                            >
                              {category.isActive ? 'Active' : 'Inactive'}
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
              )}
 
              {menuSubTab !== 'categories' && (
              <SectionCard title="Menu Items" description="Manage dishes, pricing, availability, and images.">
                <form onSubmit={submitMenuItem} noValidate className="grid gap-4">
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
                          imageThumbnailUrl: '',
                          imageMediumUrl: '',
                          imageLargeUrl: '',
                          imageSize: '',
                          imageMimeType: '',
                        }))
                      }
                      onFileSelect={(file) =>
                        uploadImageToField({
                          file,
                          folder: 'menu',
                          busyId: 'upload-menu-item-image',
                          successMessage: 'Dish image uploaded',
                          onSuccess: ({ url, publicId, thumbnailUrl, mediumUrl, largeUrl, size, mimeType }) =>
                            setMenuItemForm((current) => ({
                              ...current,
                              imageUrl: mediumUrl || largeUrl || url,
                              imagePublicId: publicId,
                              imageThumbnailUrl: thumbnailUrl || '',
                              imageMediumUrl: mediumUrl || '',
                              imageLargeUrl: largeUrl || url || '',
                              imageAlt: current.imageAlt || current.name,
                              imageSize: size ? String(size) : '',
                              imageMimeType: mimeType || '',
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
                    <Field label="Food Type">
                      <SelectInput
                        value={menuItemForm.dietaryType}
                        onChange={(event) =>
                          setMenuItemForm((current) => ({
                            ...current,
                            dietaryType: event.target.value,
                            isVeg: event.target.value === 'veg',
                          }))
                        }
                      >
                        <option value="veg">Veg</option>
                        <option value="non_veg">Non-Veg</option>
                        <option value="egg">Egg</option>
                        <option value="seafood">Seafood</option>
                      </SelectInput>
                    </Field>
                    <Field label="Preparation Time">
                      <TextInput
                        type="number"
                        min="1"
                        max="180"
                        value={menuItemForm.preparationTimeMinutes}
                        onChange={(event) =>
                          setMenuItemForm((current) => ({ ...current, preparationTimeMinutes: event.target.value }))
                        }
                        placeholder="25"
                      />
                    </Field>
                    <Field label="Spice Level">
                      <SelectInput
                        value={menuItemForm.spiceLevel}
                        onChange={(event) =>
                          setMenuItemForm((current) => ({ ...current, spiceLevel: event.target.value }))
                        }
                      >
                        <option value="none">None</option>
                        <option value="mild">Mild</option>
                        <option value="medium">Medium</option>
                        <option value="hot">Hot</option>
                      </SelectInput>
                    </Field>
                    <Field label="Tags" hint="Comma separated: Popular, New, Chef Special, Spicy, Family Pack">
                      <TextInput
                        value={(menuItemForm.tags || []).join(', ')}
                        onChange={(event) =>
                          setMenuItemForm((current) => ({ ...current, tags: parseMenuTags(event.target.value) }))
                        }
                        placeholder="Popular, Chef Special"
                      />
                    </Field>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[1.6px] text-slate-500">Size Options</p>
                        <p className="mt-1 text-xs text-slate-500">Add Single and Full prices in INR for the same dish.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={addSingleFullVariants}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Single/Full
                        </button>
                        <button
                          type="button"
                          onClick={() => addMenuVariant()}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          + Custom
                        </button>
                      </div>
                    </div>
                    {(!menuItemForm.variants || menuItemForm.variants.length === 0) && (
                      <p className="text-xs italic text-slate-400">No size options. Customers will see the base price only.</p>
                    )}
                    <div className="space-y-2">
                      {(menuItemForm.variants || []).map((v, idx) => (
                        <div key={`${v.label || 'variant'}-${idx}`} className="grid gap-2 md:grid-cols-[1fr_180px_auto] md:items-center">
                          <TextInput
                            placeholder="Single / Full"
                            value={v.label}
                            onChange={(event) => updateMenuVariant(idx, { label: event.target.value })}
                          />
                          <TextInput
                            type="number"
                            min="1"
                            step="0.01"
                            placeholder="Price (INR)"
                            value={v.pricePaise ? Number(v.pricePaise) / 100 : ''}
                            onChange={(event) =>
                              updateMenuVariant(idx, {
                                pricePaise: Math.round(Number(event.target.value) * 100) || '',
                              })
                            }
                          />
                          <button
                            type="button"
                            onClick={() => removeMenuVariant(idx)}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-red-200 text-red-500 hover:bg-red-50"
                            aria-label="Remove size option"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <Field label="Base Price (INR)" hint="Used when no size option is selected or configured.">
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
                        label="Veg"
                        checked={menuItemForm.dietaryType === 'veg'}
                        onChange={(event) =>
                          setMenuItemForm((current) => ({
                            ...current,
                            dietaryType: event.target.checked ? 'veg' : 'non_veg',
                            isVeg: event.target.checked,
                          }))
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
                        setMenuDietFilter('all')
                        setMenuAvailabilityFilter('all')
                        setMenuBestsellerFilter('all')
                        setMenuImageFilter('all')
                        setMenuPriceMin('')
                        setMenuPriceMax('')
                        setMenuSortBy('sortOrder')
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

                  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <SelectInput value={menuDietFilter} onChange={(event) => setMenuDietFilter(event.target.value)}>
                      <option value="all">All Food Types</option>
                      <option value="veg">Veg</option>
                      <option value="non_veg">Non-Veg</option>
                      <option value="egg">Egg</option>
                      <option value="seafood">Seafood</option>
                    </SelectInput>
                    <SelectInput
                      value={menuAvailabilityFilter}
                      onChange={(event) => setMenuAvailabilityFilter(event.target.value)}
                    >
                      <option value="all">All Availability</option>
                      <option value="available">Available</option>
                      <option value="unavailable">Unavailable</option>
                    </SelectInput>
                    <SelectInput
                      value={menuBestsellerFilter}
                      onChange={(event) => setMenuBestsellerFilter(event.target.value)}
                    >
                      <option value="all">All Bestseller States</option>
                      <option value="bestseller">Bestseller</option>
                      <option value="not_bestseller">Not Bestseller</option>
                    </SelectInput>
                    <SelectInput value={menuImageFilter} onChange={(event) => setMenuImageFilter(event.target.value)}>
                      <option value="all">All Images</option>
                      <option value="missing">Missing Image</option>
                      <option value="has_image">Has Image</option>
                    </SelectInput>
                    <TextInput
                      type="number"
                      min="0"
                      value={menuPriceMin}
                      onChange={(event) => setMenuPriceMin(event.target.value)}
                      placeholder="Min price"
                    />
                    <TextInput
                      type="number"
                      min="0"
                      value={menuPriceMax}
                      onChange={(event) => setMenuPriceMax(event.target.value)}
                      placeholder="Max price"
                    />
                    <SelectInput value={menuSortBy} onChange={(event) => setMenuSortBy(event.target.value)}>
                      <option value="sortOrder">Sort Order</option>
                      <option value="name">Name</option>
                      <option value="price">Price</option>
                      <option value="newest">Newest</option>
                    </SelectInput>
                    <ActionButton
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        setMenuSearch('')
                        setMenuCategoryFilter('all')
                        setMenuDietFilter('all')
                        setMenuAvailabilityFilter('all')
                        setMenuBestsellerFilter('all')
                        setMenuImageFilter('all')
                        setMenuPriceMin('')
                        setMenuPriceMax('')
                        setMenuSortBy('sortOrder')
                      }}
                    >
                      Clear All Filters
                    </ActionButton>
                  </div>
                </div>

                {menuSubTab === 'bulk' && (
                  <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{selectedMenuIds.length} dishes selected</p>
                        <p className="mt-1 text-xs text-slate-500">Use checkboxes below, then apply one bulk action at a time.</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <ActionButton
                          type="button"
                          variant="secondary"
                          disabled={busyKey === 'menu-bulk'}
                          onClick={() => applyBulkMenuPatch({ isAvailable: true }, 'Selected dishes marked available')}
                        >
                          Mark Available
                        </ActionButton>
                        <ActionButton
                          type="button"
                          variant="secondary"
                          disabled={busyKey === 'menu-bulk'}
                          onClick={() => applyBulkMenuPatch({ isAvailable: false }, 'Selected dishes marked unavailable')}
                        >
                          Mark Out of Stock
                        </ActionButton>
                        <ActionButton
                          type="button"
                          variant="secondary"
                          disabled={busyKey === 'menu-bulk'}
                          onClick={() => applyBulkMenuPatch({ isBestseller: true }, 'Selected dishes marked bestseller')}
                        >
                          Mark Bestseller
                        </ActionButton>
                        <ActionButton
                          type="button"
                          variant="secondary"
                          disabled={busyKey === 'menu-bulk' || !bulkCategoryId}
                          onClick={() => applyBulkMenuPatch({ categoryId: Number(bulkCategoryId) }, 'Selected dishes moved')}
                        >
                          Move Category
                        </ActionButton>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-[220px_160px_auto_auto]">
                      <SelectInput value={bulkCategoryId} onChange={(event) => setBulkCategoryId(event.target.value)}>
                        <option value="">Bulk category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </SelectInput>
                      <TextInput
                        type="number"
                        step="0.01"
                        value={bulkPriceDelta}
                        onChange={(event) => setBulkPriceDelta(event.target.value)}
                        placeholder="+/- INR"
                      />
                      <ActionButton
                        type="button"
                        variant="secondary"
                        disabled={busyKey === 'menu-bulk'}
                        onClick={applyBulkPriceUpdate}
                      >
                        Apply Price Change
                      </ActionButton>
                      <ActionButton
                        type="button"
                        variant="danger"
                        disabled={busyKey === 'menu-bulk'}
                        onClick={bulkDeleteMenuItems}
                      >
                        Delete Selected
                      </ActionButton>
                    </div>
                  </div>
                )}

                <div className="mt-6 grid gap-4">
                  {filteredMenuItems.map((item) => (
                    <div key={item.id} className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex gap-4">
                          {menuSubTab === 'bulk' && (
                            <input
                              type="checkbox"
                              checked={selectedMenuIds.includes(item.id)}
                              onChange={(event) =>
                                setSelectedMenuIds((current) =>
                                  event.target.checked
                                    ? [...new Set([...current, item.id])]
                                    : current.filter((id) => id !== item.id),
                                )
                              }
                              className="mt-8 h-4 w-4 accent-blue-600"
                              aria-label={`Select ${item.name}`}
                            />
                          )}
                          <img
                            src={item.img || 'https://placehold.co/160x120/120805/F5ECD7?text=Menu'}
                            alt={item.name}
                            className="h-20 w-24 rounded-xl object-cover"
                          />
                          <div>
                            <p className="font-semibold text-slate-900">{item.name}</p>
                            <p className="mt-1 text-sm font-semibold text-slate-900">{formatCurrency(item.price)}</p>
                            {item.variants?.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {item.variants.map((variant) => (
                                  <span
                                    key={`${item.id}-${variant.label}`}
                                    className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600"
                                  >
                                    {variant.label}: {formatCurrency(variant.price)}
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="mt-1 text-sm text-slate-600">{item.desc}</p>
                            <p className="mt-2 text-xs text-slate-500">
                              {item.category?.name} | {toLabelCase(item.dietaryType || (item.veg ? 'veg' : 'non_veg'))} |{' '}
                              {item.preparationTimeMinutes ? `${item.preparationTimeMinutes} mins | ` : ''}
                              {item.spiceLevel ? `${toLabelCase(item.spiceLevel)} spice | ` : ''}
                              sort {item.sortOrder || 0}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <StatusBadge value={item.available ? 'available' : 'unavailable'} kind="menu" />
                              {item.bestseller && <StatusBadge value="bestseller" kind="menu" />}
                              {!item.img && (
                                <span className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700">
                                  Missing Image
                                </span>
                              )}
                              {(item.tags || []).map((tag) => (
                                <span key={`${item.id}-${tag}`} className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600">
                                  {tag}
                                </span>
                              ))}
                            </div>
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
                          <QuickPillButton active={false} onClick={() => duplicateMenuItem(item)}>
                            Duplicate
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
                                imageUrl: item.imageMediumUrl || item.imageUrl || item.img || '',
                                imagePublicId: '',
                                imageThumbnailUrl: item.imageThumbnailUrl || '',
                                imageMediumUrl: item.imageMediumUrl || '',
                                imageLargeUrl: item.imageLargeUrl || '',
                                imageAlt: item.imageAlt || item.name,
                                imageSize: item.imageSize ? String(item.imageSize) : '',
                                imageMimeType: item.imageMimeType || '',
                                price: String(item.price),
                                variants: item.variants || [],
                                dietaryType: item.dietaryType || (item.veg ? 'veg' : 'non_veg'),
                                preparationTimeMinutes: item.preparationTimeMinutes
                                  ? String(item.preparationTimeMinutes)
                                  : '',
                                spiceLevel: item.spiceLevel || 'medium',
                                tags: item.tags || [],
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
              )}
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <SectionCard
              title="Orders"
              description="Review backend-stored orders, linked customer accounts, promo usage, and update order statuses in real time."
            >
              <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1.15fr)_180px_180px_170px_150px_150px] xl:items-center">
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

                  <SelectInput
                    value={orderPaymentMethodFilter}
                    onChange={(event) => {
                      setOrderPaymentMethodFilter(event.target.value)
                      setOrderPage(1)
                    }}
                    className="bg-slate-50"
                  >
                    <option value="all">COD / Online</option>
                    <option value="cod">COD</option>
                    <option value="online">Razorpay / Online</option>
                  </SelectInput>

                  <SelectInput value={orderDateFilter} onChange={(event) => { setOrderDateFilter(event.target.value); setOrderPage(1) }} className="bg-slate-50">
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">This Week</option>
                    <option value="month">This Month</option>
                  </SelectInput>

                  <SelectInput value={orderBranchFilter} onChange={(event) => { setOrderBranchFilter(event.target.value); setOrderPage(1) }} className="bg-slate-50">
                    <option value="all">All Branches</option>
                    <option value="kukatpally">Kukatpally</option>
                    <option value="bachupally">Bachupally</option>
                  </SelectInput>

                  <TextInput
                    type="date"
                    value={orderDateFrom}
                    onChange={(event) => {
                      setOrderDateFrom(event.target.value)
                      setOrderPage(1)
                    }}
                    className="bg-slate-50"
                  />

                  <TextInput
                    type="date"
                    value={orderDateTo}
                    onChange={(event) => {
                      setOrderDateTo(event.target.value)
                      setOrderPage(1)
                    }}
                    className="bg-slate-50"
                  />

                  <ActionButton
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setOrderSearch('')
                      setOrderStatusFilter('all')
                      setOrderPaymentFilter('all')
                      setOrderPaymentMethodFilter('all')
                      setOrderDateFilter('all')
                      setOrderBranchFilter('all')
                      setOrderDateFrom('')
                      setOrderDateTo('')
                      setOrderPage(1)
                      setExpandedOrderId(null)
                    }}
                  >
                    Reset Filters
                  </ActionButton>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4">
                  <p className="text-sm text-slate-600">
                    Showing <span className="font-semibold text-slate-900">{paginatedOrders.length}</span> of{' '}
                    <span className="font-semibold text-slate-900">{filteredOrders.length}</span> orders (Page {orderPage}/{totalOrderPages})
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
                filteredOrders={paginatedOrders}
                expandedOrderId={expandedOrderId}
                setExpandedOrderId={setExpandedOrderId}
                busyKey={busyKey}
                updateOrderField={updateOrderField}
                onPrintOrder={handlePrintOrder}
              />
              {totalOrderPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button type="button" onClick={() => setOrderPage((p) => Math.max(1, p - 1))} disabled={orderPage === 1}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40 hover:bg-slate-50">← Prev</button>
                  {Array.from({ length: Math.min(totalOrderPages, 7) }, (_, i) => {
                    const page = totalOrderPages <= 7 ? i + 1 : orderPage <= 4 ? i + 1 : orderPage >= totalOrderPages - 3 ? totalOrderPages - 6 + i : orderPage - 3 + i
                    return (
                      <button key={page} type="button" onClick={() => setOrderPage(page)}
                        className={`rounded-lg px-3 py-2 text-sm font-medium transition ${orderPage === page ? 'bg-slate-900 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{page}</button>
                    )
                  })}
                  <button type="button" onClick={() => setOrderPage((p) => Math.min(totalOrderPages, p + 1))} disabled={orderPage === totalOrderPages}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40 hover:bg-slate-50">Next →</button>
                </div>
              )}
              {canLoadMoreSection('orders') && (
                <div className="mt-4 text-center">
                  <ActionButton
                    type="button"
                    variant="secondary"
                    onClick={() => loadMoreSection('orders')}
                    disabled={sectionLoading.orders}
                  >
                    {sectionLoading.orders ? 'Loading...' : 'Load More From Server'}
                  </ActionButton>
                </div>
              )}
            </SectionCard>
          )}

          {activeTab === 'orders-print' && (
            <div className="grid gap-6">
              <div className="grid gap-4 md:grid-cols-3">
                <MetricTile label="Queued Jobs" value={printJobs.filter((job) => job.status === 'pending').length} hint="Waiting for station" />
                <MetricTile label="Failed Jobs" value={printJobs.filter((job) => job.status === 'failed').length} hint="Needs retry" />
                <MetricTile label="Print Station" value={printStationStatus.length > 0 ? 'Online' : 'Offline'} hint="Browser station status" />
              </div>
              <SectionCard
                title="Orders & Print"
                description="Queued print jobs stay on the VPS until a local print station receives them."
                actions={
                  <a
                    href="/admin/print-station"
                    target="_blank"
                    className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Open Print Station
                  </a>
                }
              >
                <div className="grid gap-4">
                  {printJobs.map((job) => (
                    <div key={job.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                          <p className="font-semibold text-slate-950">{job.order?.orderNumber || `Print Job #${job.id}`}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {toLabelCase(job.branchId || 'default')} | {formatCurrency(job.order?.grandTotal || 0)} | {formatDateTime(job.createdAt)}
                          </p>
                          {job.errorMessage && <p className="mt-2 text-sm text-red-600">{job.errorMessage}</p>}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge value={job.status} kind="print" />
                          <ActionButton
                            type="button"
                            variant="secondary"
                            disabled={busyKey === `retry-print-${job.id}`}
                            onClick={async () => {
                              try {
                                setBusyKey(`retry-print-${job.id}`)
                                await adminApi.retryPrintJob(job.id)
                                setNotice('Print job queued for retry')
                                await fetchPrintData()
                              } catch (requestError) {
                                setError(requestError.message || 'Could not retry print job')
                              } finally {
                                setBusyKey('')
                              }
                            }}
                          >
                            Retry
                          </ActionButton>
                          <ActionButton
                            type="button"
                            variant="secondary"
                            disabled={busyKey === `mark-print-${job.id}`}
                            onClick={async () => {
                              try {
                                setBusyKey(`mark-print-${job.id}`)
                                await adminApi.markPrintJobPrinted(job.id)
                                setNotice('Print job marked printed')
                                await fetchPrintData()
                              } catch (requestError) {
                                setError(requestError.message || 'Could not mark print job printed')
                              } finally {
                                setBusyKey('')
                              }
                            }}
                          >
                            Mark Printed
                          </ActionButton>
                        </div>
                      </div>
                    </div>
                  ))}
                  {printJobs.length === 0 && <EmptyPanel title="No print jobs yet" description="New orders will create queued jobs automatically." />}
                </div>
              </SectionCard>
            </div>
          )}

          {activeTab === 'customers' && (
            <SectionCard
              title="Customers"
              description="Customers are derived from order history so existing checkout data stays intact."
              actions={
                <ActionButton
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    exportCsv(
                      'customers.csv',
                      customerRows.map((customer) => ({
                        name: customer.name,
                        phone: customer.phone,
                        email: customer.email,
                        totalOrders: customer.totalOrders,
                        totalSpend: customer.totalSpend,
                        lastOrderDate: formatDateTime(customer.lastOrderDate),
                      })),
                    )
                  }
                >
                  Export CSV
                </ActionButton>
              }
            >
              <div className="mb-4">
                <TextInput
                  value={customerSearch}
                  onChange={(event) => setCustomerSearch(event.target.value)}
                  placeholder="Search customers by name, phone, or email"
                />
              </div>
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <div className="hidden grid-cols-[1.2fr_1fr_1.4fr_110px_130px_160px] gap-3 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[1.4px] text-slate-500 lg:grid">
                  <span>Name</span><span>Phone</span><span>Email</span><span>Orders</span><span>Spend</span><span>Last Order</span>
                </div>
                {customerRows.map((customer) => (
                  <div key={customer.key} className="grid gap-3 border-t border-slate-200 px-4 py-4 text-sm lg:grid-cols-[1.2fr_1fr_1.4fr_110px_130px_160px]">
                    <span className="font-semibold text-slate-950">{customer.name}</span>
                    <span>{customer.phone || '-'}</span>
                    <span className="break-all">{customer.email || '-'}</span>
                    <span>{customer.totalOrders}</span>
                    <span>{formatCurrency(customer.totalSpend)}</span>
                    <span>{formatDate(customer.lastOrderDate)}</span>
                  </div>
                ))}
              </div>
              {customerRows.length === 0 && <EmptyPanel title="No customers found" description="Customer records appear after orders are placed." />}
            </SectionCard>
          )}

          {activeTab === 'payments' && (
            <SectionCard
              title="Payments"
              description="Audit COD and Razorpay payment status from order payment records."
              actions={
                <ActionButton
                  type="button"
                  variant="secondary"
                  onClick={() =>
                    exportCsv(
                      'payments.csv',
                      paymentRows.map((payment) => ({
                        order: payment.order.orderNumber,
                        customer: payment.customerName,
                        method: payment.method,
                        status: payment.status,
                        amount: payment.amount,
                        razorpayOrderId: payment.providerOrderId,
                        razorpayPaymentId: payment.providerPaymentId,
                      })),
                    )
                  }
                >
                  Export CSV
                </ActionButton>
              }
            >
              <div className="mb-4 grid gap-3 md:grid-cols-3">
                <TextInput value={paymentSearch} onChange={(event) => setPaymentSearch(event.target.value)} placeholder="Search payment or order" />
                <SelectInput value={orderPaymentFilter} onChange={(event) => setOrderPaymentFilter(event.target.value)}>
                  <option value="all">All Payment Statuses</option>
                  {paymentStatuses.map((status) => <option key={status} value={status}>{toLabelCase(status)}</option>)}
                </SelectInput>
                <SelectInput value={orderPaymentMethodFilter} onChange={(event) => setOrderPaymentMethodFilter(event.target.value)}>
                  <option value="all">All Methods</option>
                  <option value="cod">COD</option>
                  <option value="online">Razorpay / Online</option>
                </SelectInput>
              </div>
              <div className="grid gap-3">
                {paymentRows.map((payment) => (
                  <div key={payment.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <div className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr] lg:items-center">
                      <div>
                        <p className="font-semibold text-slate-950">{payment.order.orderNumber}</p>
                        <p className="mt-1 text-sm text-slate-500">{payment.customerName}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge value={payment.method} kind="method" />
                        <StatusBadge value={payment.status} kind="payment" />
                      </div>
                      <p className="font-semibold text-slate-950">{formatCurrency(payment.amount)}</p>
                      <p className="break-all font-mono text-xs text-slate-500">{payment.providerPaymentId || payment.failureReason || 'COD / not captured'}</p>
                    </div>
                  </div>
                ))}
                {paymentRows.length === 0 && <EmptyPanel title="No payments found" description="Change filters or wait for new orders." />}
              </div>
            </SectionCard>
          )}

          {activeTab === 'reports' && (
            <div className="grid gap-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <MetricTile label="Revenue Today" value={formatCurrency(dashboard?.businessSnapshot?.revenueToday || 0)} hint="Paid today" />
                <MetricTile label="Orders Today" value={dashboard?.businessSnapshot?.ordersToday || 0} hint="All methods" />
                <MetricTile label="COD Orders" value={dashboard?.businessSnapshot?.codOrders || 0} hint="Today" />
                <MetricTile label="Online Paid" value={dashboard?.businessSnapshot?.onlinePaidOrders || 0} hint="Today" />
              </div>
              <SectionCard
                title="Reports"
                description="Revenue, order, best-seller, category, branch, and payment method summaries."
                actions={
                  <ActionButton
                    type="button"
                    variant="secondary"
                    onClick={() =>
                      exportCsv(
                        'reports-orders.csv',
                        filteredOrders.map((order) => ({
                          order: order.orderNumber,
                          status: order.orderStatus,
                          payment: order.paymentStatus,
                          method: order.paymentMethod,
                          branch: order.storeLocation,
                          amount: order.pricing?.grandTotal,
                          createdAt: formatDateTime(order.createdAt),
                        })),
                      )
                    }
                  >
                    Export CSV
                  </ActionButton>
                }
              >
                <div className="grid gap-5 xl:grid-cols-2">
                  <div>
                    <p className="mb-3 text-sm font-semibold text-slate-900">Daily Revenue</p>
                    <MiniBarChart items={dashboard?.charts?.dailyRevenue || []} formatter={(value) => formatCurrency(value)} />
                  </div>
                  <div>
                    <p className="mb-3 text-sm font-semibold text-slate-900">Orders By Day</p>
                    <MiniBarChart items={dashboard?.charts?.ordersByDay || []} />
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-3 text-sm font-semibold text-slate-900">Best Sellers</p>
                    {(dashboard?.charts?.bestSellingItems || []).map((item) => (
                      <div key={item.label} className="mb-2 flex justify-between gap-3 text-sm last:mb-0">
                        <span className="truncate text-slate-600">{item.label}</span>
                        <span className="font-semibold">{item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-3 text-sm font-semibold text-slate-900">Branch Performance</p>
                    {branchRows.map((branch) => (
                      <div key={branch.id} className="mb-2 flex justify-between gap-3 text-sm last:mb-0">
                        <span className="text-slate-600">{branch.name}</span>
                        <span className="font-semibold">{branch.orders} / {formatCurrency(branch.revenue)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </SectionCard>
            </div>
          )}

          {activeTab === 'inventory' && (
            <SectionCard title="Inventory" description="Mark dishes available or out of stock without editing the full dish form.">
              <div className="grid gap-3">
                {menuItems.map((item) => (
                  <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">{item.name}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.category?.name || 'No category'} | {formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge value={item.available ? 'available' : 'out_of_stock'} kind="menu" />
                      <ActionButton
                        type="button"
                        variant="secondary"
                        onClick={() => quickUpdateMenuItem(item.id, { isAvailable: !item.available }, item.available ? 'Marked out of stock' : 'Marked available')}
                      >
                        {item.available ? 'Mark Out of Stock' : 'Mark Available'}
                      </ActionButton>
                    </div>
                  </div>
                ))}
                {menuItems.length === 0 && <EmptyPanel title="No dishes found" description="Create dishes from the Menu page first." />}
              </div>
            </SectionCard>
          )}

          {activeTab === 'branches' && (
            <SectionCard title="Branches" description="Branch-level order activity and print station status.">
              <div className="grid gap-4 md:grid-cols-2">
                {branchRows.map((branch) => (
                  <div key={branch.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-950">{branch.name}</p>
                        <p className="mt-1 text-sm text-slate-500">Active branch</p>
                      </div>
                      <StatusBadge value={printStationStatus.some((station) => station.branchId === branch.id) ? 'printed' : 'not_printed'} kind="print" />
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-3">
                      <MetricTile label="Orders" value={branch.orders} hint="Loaded" />
                      <MetricTile label="Pending" value={branch.pending} hint="Needs action" />
                      <MetricTile label="Revenue" value={formatCurrency(branch.revenue)} hint="Loaded" />
                    </div>
                  </div>
                ))}
              </div>
            </SectionCard>
          )}

          {activeTab === 'staff' && (
            <SectionCard title="Staff & Roles" description="Role model for production staff access. Current admin auth remains unchanged.">
              <div className="grid gap-4 xl:grid-cols-[0.8fr_1.2fr]">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-950">{admin?.name || 'Admin'}</p>
                  <p className="mt-1 break-all text-sm text-slate-600">{admin?.email}</p>
                  <StatusBadge value="accepted" kind="order" />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  {[
                    ['Super Admin', 'All permissions'],
                    ['Admin', 'Manage orders, menu, offers, reports, and settings'],
                    ['Manager', 'Orders, reports, print, and inventory'],
                    ['Kitchen Staff', 'View and update kitchen orders'],
                    ['Counter Staff', 'View orders and print bills'],
                  ].map(([role, permissions]) => (
                    <div key={role} className="rounded-xl border border-slate-200 bg-white p-4">
                      <p className="font-semibold text-slate-950">{role}</p>
                      <p className="mt-1 text-sm text-slate-500">{permissions}</p>
                    </div>
                  ))}
                </div>
              </div>
            </SectionCard>
          )}

          {activeTab === 'activity' && (
            <SectionCard title="Activity Logs" description="Operational activity derived from orders, print jobs, and menu changes.">
              <div className="grid gap-3">
                {activityRows.map((row) => (
                  <div key={row.id} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm md:grid-cols-[140px_1fr_1fr_170px]">
                    <span className="font-semibold text-slate-950">{row.user}</span>
                    <span>{row.action}</span>
                    <span className="truncate text-slate-600">{row.entity} | {row.details}</span>
                    <span className="text-slate-500">{formatDateTime(row.time)}</span>
                  </div>
                ))}
                {activityRows.length === 0 && <EmptyPanel title="No activity yet" description="Changes will appear here after orders and menu updates." />}
              </div>
            </SectionCard>
          )}

          {activeTab === 'expenses' && (
            <SectionCard title="Expenses" description="Capture simple daily expenses for the current admin session.">
              <form onSubmit={addExpense} className="mb-5 grid gap-3 md:grid-cols-[1fr_140px_150px_1fr_auto]">
                <TextInput value={expenseForm.category} onChange={(event) => setExpenseForm((current) => ({ ...current, category: event.target.value }))} placeholder="Category" />
                <TextInput type="number" min="1" step="0.01" value={expenseForm.amount} onChange={(event) => setExpenseForm((current) => ({ ...current, amount: event.target.value }))} placeholder="Amount" />
                <TextInput type="date" value={expenseForm.date} onChange={(event) => setExpenseForm((current) => ({ ...current, date: event.target.value }))} />
                <TextInput value={expenseForm.notes} onChange={(event) => setExpenseForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Notes" />
                <ActionButton type="submit">Add</ActionButton>
              </form>
              <div className="grid gap-3">
                {expenses.map((expense) => (
                  <div key={expense.id} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm md:grid-cols-[1fr_140px_140px_1fr]">
                    <span className="font-semibold">{expense.category}</span>
                    <span>{formatCurrency(expense.amount)}</span>
                    <span>{expense.date}</span>
                    <span className="text-slate-500">{expense.notes || '-'}</span>
                  </div>
                ))}
                {expenses.length === 0 && <EmptyPanel title="No expenses added" description="Add a daily expense above." />}
              </div>
            </SectionCard>
          )}

          {activeTab === 'print-settings' && (
            <SectionCard title="Print Settings" description="Configure automatic bill printing and browser print station behavior.">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <ToggleInput
                  label="Auto Print Enabled"
                  checked={printSettings?.autoPrintEnabled ?? true}
                  onChange={(event) => savePrintSettings({ autoPrintEnabled: event.target.checked })}
                />
                <ToggleInput
                  label="Sound Alert Enabled"
                  checked={printSettings?.soundEnabled ?? true}
                  onChange={(event) => savePrintSettings({ soundEnabled: event.target.checked })}
                />
                <Field label="Paper Size">
                  <SelectInput value={printSettings?.paperSize || '80mm'} onChange={(event) => savePrintSettings({ paperSize: event.target.value })}>
                    <option value="58mm">58mm</option>
                    <option value="80mm">80mm</option>
                    <option value="A4">A4</option>
                  </SelectInput>
                </Field>
                <Field label="Restaurant Name">
                  <TextInput value={printSettings?.restaurantName || ''} onChange={(event) => setPrintSettings((current) => ({ ...(current || {}), restaurantName: event.target.value }))} onBlur={(event) => savePrintSettings({ restaurantName: event.target.value })} />
                </Field>
                <Field label="Printer Name">
                  <TextInput value={printSettings?.defaultPrinterName || ''} onChange={(event) => setPrintSettings((current) => ({ ...(current || {}), defaultPrinterName: event.target.value }))} onBlur={(event) => savePrintSettings({ defaultPrinterName: event.target.value })} />
                </Field>
                <Field label="Copies">
                  <TextInput type="number" min="1" max="5" value={printSettings?.copies || 1} onChange={(event) => setPrintSettings((current) => ({ ...(current || {}), copies: event.target.value }))} onBlur={(event) => savePrintSettings({ copies: Number(event.target.value || 1) })} />
                </Field>
              </div>
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-950">Station Status</p>
                <p className="mt-1 text-sm text-slate-600">
                  {printStationStatus.length > 0 ? `${printStationStatus.length} print station connected.` : 'Print station offline. New bills will be queued.'}
                </p>
              </div>
            </SectionCard>
          )}

          {activeTab === 'gallery' && (
            <SectionCard title="Gallery" description="Upload gallery photos locally or paste a media URL when needed.">
              <form onSubmit={submitGalleryItem} noValidate className="grid gap-4">
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
                    previewAlt={galleryForm.title || 'Gallery image'}
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
                      <img src={item.url} alt={item.altText || item.title || 'Gallery'} className="h-48 w-full object-cover" />
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
              <form onSubmit={submitReview} noValidate className="grid gap-4">
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
              <form onSubmit={submitOffer} noValidate className="grid gap-4">
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

              <form onSubmit={submitPromoCode} noValidate className="mt-6 grid gap-4">
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
              ].map((group) => (
                <SectionCard
                  key={group.key}
                  title={group.label}
                  description="Update inquiry status as the team follows up."
                >
                  <div className="space-y-4">
                    {(inquiries[group.key]?.items || []).map((item) => (
                      <div key={item.id} className="rounded-xl border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] p-4">
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        <p className="mt-1 text-sm text-slate-600">{item.phone}</p>
                        {item.email && <p className="text-sm text-slate-600">{item.email}</p>}
                        {item.city && <p className="text-sm text-slate-600">City: {item.city}</p>}
                        {item.eventType && (
                          <p className="text-sm text-slate-600">
                            {item.eventType} | {item.guestCount} guests
                          </p>
                        )}
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
                    ))}

                    {(!inquiries[group.key]?.items || inquiries[group.key].items.length === 0) && (
                      <p className="text-sm text-slate-600">No {group.key} inquiries yet.</p>
                    )}
                  </div>
                </SectionCard>
              ))}
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
                    previewAlt="Restaurant logo"
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
                        previewAlt="Hero media"
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
      {(notice || error) && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm">
          <div
            className={`rounded-xl border px-5 py-4 text-sm shadow-xl ${
              error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <p>{error || notice}</p>
              <button
                type="button"
                onClick={() => {
                  setError('')
                  setNotice('')
                }}
                className="font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 px-4">
          <div className="w-full max-w-md rounded-[20px] border border-slate-200 bg-white p-6 shadow-2xl">
            <p className="text-xl font-semibold text-slate-950">{confirmDialog.title}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{confirmDialog.message}</p>
            <div className="mt-6 flex justify-end gap-3">
              <ActionButton type="button" variant="secondary" onClick={() => resolveConfirmation(false)}>
                Cancel
              </ActionButton>
              <ActionButton
                type="button"
                variant={confirmDialog.danger ? 'danger' : 'primary'}
                onClick={() => resolveConfirmation(true)}
              >
                {confirmDialog.actionLabel}
              </ActionButton>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}






