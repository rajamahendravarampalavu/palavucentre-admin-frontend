import {
  BadgePercent,
  ClipboardList,
  ImagePlus,
  LayoutDashboard,
  MenuSquare,
  MessageSquare,
  Settings,
  ShoppingBag,
  Tag,
  Truck,
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
    group: 'Workspace',
    description: 'Track orders, revenue, lead flow, and the latest activity from one calm overview.',
  },
  {
    id: 'orders',
    label: 'Orders',
    icon: ShoppingBag,
    group: 'Workspace',
    description: 'Review live orders, payment state, customer details, and fulfilment progress.',
  },
  {
    id: 'inquiries',
    label: 'Inquiries',
    icon: ClipboardList,
    group: 'Workspace',
    description: 'Respond to contact, catering, and franchise leads without jumping between tools.',
  },
  {
    id: 'menu',
    label: 'Menu',
    icon: MenuSquare,
    group: 'Restaurant',
    description: 'Organize categories, dishes, availability, images, and pricing from one section.',
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
  { label: 'Workspace', items: tabs.filter((tab) => tab.group === 'Workspace') },
  { label: 'Restaurant', items: tabs.filter((tab) => tab.group === 'Restaurant') },
  { label: 'Growth', items: tabs.filter((tab) => tab.group === 'Growth') },
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
  price: '',
  variants: [],
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
