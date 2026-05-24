import {
  Activity,
  BadgePercent,
  BarChart3,
  Building2,
  ClipboardList,
  CreditCard,
  ImagePlus,
  LayoutDashboard,
  MenuSquare,
  MessageSquare,
  Package,
  Printer,
  ReceiptText,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Store,
  Tag,
  Truck,
  Users,
} from 'lucide-react'

import { DEFAULT_MENU_CATEGORY_ICON } from '../../shared/menu-icons.js'

export const orderStatuses = ['pending', 'accepted', 'preparing', 'ready', 'delivered', 'cancelled']
export const paymentStatuses = ['unpaid', 'pending', 'paid', 'failed', 'refunded']
export const inquiryStatuses = ['new', 'contacted', 'closed']
export const offerStatuses = ['draft', 'scheduled', 'active', 'expired']
export const discountTypes = ['percentage', 'fixed']
export const reviewSources = ['manual', 'google', 'internal']
export const mediaTypes = ['image', 'video']
export const socialPlatforms = [
  { platform: 'instagram', label: 'Instagram' },
  { platform: 'facebook', label: 'Facebook' },
  { platform: 'linkedin', label: 'LinkedIn' },
  { platform: 'whatsapp', label: 'WhatsApp' },
  { platform: 'youtube', label: 'YouTube' },
]

export const tabs = [
  {
    id: 'overview',
    label: 'Overview',
    icon: LayoutDashboard,
    group: 'Dashboard',
    description: 'Track orders, revenue, lead flow, and the latest activity from one calm overview.',
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: ShoppingBag,
    group: 'Dashboard',
    description: 'Review live orders, payment state, customer details, and fulfilment progress.',
  },
  {
    id: 'orders-print',
    label: 'Print Monitor',
    icon: Printer,
    group: 'Dashboard',
    description: 'Monitor live orders, print bills directly from the admin browser, and handle sound alerts.',
  },
  {
    id: 'menu',
    label: 'Menu',
    icon: MenuSquare,
    group: 'Restaurant',
    description: 'Manage dishes, images, pricing, availability, best sellers, and bulk item updates.',
  },
  {
    id: 'categories',
    label: 'Categories',
    icon: Store,
    group: 'Restaurant',
    description: 'Maintain menu category names, icons, display order, active state, and item counts.',
  },
  {
    id: 'gallery',
    label: 'Gallery',
    icon: ImagePlus,
    group: 'Restaurant',
    description: 'Refresh food photography and brand media shown across the public website.',
  },
  {
    id: 'reviews',
    label: 'Reviews',
    icon: MessageSquare,
    group: 'Restaurant',
    description: 'Curate testimonials and control which customer reviews are visible on the site.',
  },
  {
    id: 'inventory',
    label: 'Inventory',
    icon: Package,
    group: 'Restaurant',
    description: 'Keep menu stock status current and quickly mark dishes out of stock.',
  },
  {
    id: 'offers',
    label: 'Offers',
    icon: Tag,
    group: 'Growth',
    description: 'Launch banners, featured offers, and campaign messaging for the storefront.',
  },
  {
    id: 'promocodes',
    label: 'Promo Codes',
    icon: BadgePercent,
    group: 'Growth',
    description: 'Create checkout promo codes, control limits, and monitor usage without confusion.',
  },
  {
    id: 'customers',
    label: 'Customers',
    icon: Users,
    group: 'Growth',
    description: 'Review customer spend, order history, and recent activity from order data.',
  },
  {
    id: 'inquiries',
    label: 'Inquiries',
    icon: ClipboardList,
    group: 'Growth',
    description: 'Respond to contact, catering, and franchise leads without jumping between tools.',
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: CreditCard,
    group: 'Business',
    description: 'Audit COD, Razorpay, paid, unpaid, failed, and refunded payments.',
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: BarChart3,
    group: 'Business',
    description: 'Review revenue, order volume, payment method, and item performance.',
  },
  {
    id: 'expenses',
    label: 'Expenses',
    icon: ReceiptText,
    group: 'Business',
    description: 'Capture daily operating expenses for reporting and reconciliation.',
  },
  {
    id: 'branches',
    label: 'Branches',
    icon: Building2,
    group: 'System',
    description: 'Review branch order activity, contact details, and revenue.',
  },
  {
    id: 'staff',
    label: 'Staff & Roles',
    icon: ShieldCheck,
    group: 'System',
    description: 'Plan staff roles and permissions for order, menu, print, and report access.',
  },
  {
    id: 'activity',
    label: 'Activity Logs',
    icon: Activity,
    group: 'System',
    description: 'See operational changes from orders, payments, menu, print, and settings.',
  },
  {
    id: 'print-settings',
    label: 'Print Settings',
    icon: Printer,
    group: 'System',
    description: 'Configure bill printing, sound alerts, paper size, and receipt details.',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    group: 'System',
    description: 'Update brand, contact, SEO, and ordering settings for the public experience.',
  },
  {
    id: 'ordering',
    label: 'Ordering',
    icon: Truck,
    group: 'System',
    description: 'Configure pickup checkout tax. Delivery pricing is disabled for now.',
  },
]

export const tabGroups = [
  { label: 'Dashboard', items: tabs.filter((tab) => tab.group === 'Dashboard') },
  { label: 'Restaurant', items: tabs.filter((tab) => tab.group === 'Restaurant') },
  { label: 'Growth', items: tabs.filter((tab) => tab.group === 'Growth') },
  { label: 'Business', items: tabs.filter((tab) => tab.group === 'Business') },
  { label: 'System', items: tabs.filter((tab) => tab.group === 'System') },
]

export const initialCategoryForm = {
  id: null,
  name: '',
  description: '',
  icon: DEFAULT_MENU_CATEGORY_ICON,
  sortOrder: '0',
  isActive: true,
}

export const initialMenuItemForm = {
  id: null,
  categoryId: '',
  name: '',
  shortDescription: '',
  description: '',
  imageUrl: '',
  imagePublicId: '',
  imageThumbnailUrl: '',
  imageMediumUrl: '',
  imageLargeUrl: '',
  imageAlt: '',
  imageSize: '',
  imageMimeType: '',
  price: '',
  variants: [],
  dietaryType: 'non_veg',
  preparationTimeMinutes: '',
  spiceLevel: 'medium',
  tags: [],
  isVeg: false,
  isBestseller: false,
  isAvailable: true,
  sortOrder: '0',
}

export const initialGalleryForm = {
  id: null,
  title: '',
  altText: '',
  url: '',
  publicId: '',
  mediaType: 'image',
  category: 'food',
  sortOrder: '0',
  visible: true,
}

export const initialReviewForm = {
  id: null,
  name: '',
  rating: '5',
  text: '',
  date: '',
  source: 'manual',
  googleReviewUrl: '',
  visible: true,
  sortOrder: '0',
}

export const initialOfferForm = {
  id: null,
  title: '',
  description: '',
  imageUrl: '',
  imagePublicId: '',
  ctaLabel: '',
  ctaHref: '/menu',
  status: 'draft',
  isFeatured: false,
  startDate: '',
  endDate: '',
  sortOrder: '0',
}

export const initialPromoCodeForm = {
  id: null,
  code: '',
  title: '',
  description: '',
  discountType: 'percentage',
  discountValue: '10',
  minOrder: '0',
  maxDiscount: '',
  maxUses: '',
  isActive: true,
  startDate: '',
  endDate: '',
}
