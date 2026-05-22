import { Check, ChevronDown, ChevronUp, Clock3, MapPin, MessageSquare, Printer, RotateCcw } from 'lucide-react'

import { formatCurrency, formatDateTime } from '../../shared/formatters.js'
import { paymentStatuses, orderStatuses } from './AdminDashboard.constants'
import { toLabelCase } from './AdminDashboard.utils'

function getLatestPayment(order) {
  if (!Array.isArray(order?.payments) || order.payments.length === 0) {
    return null
  }

  const paidPayment = order.payments.find((payment) => payment.status === 'paid' && payment.providerPaymentId)
  return paidPayment || order.payments[0]
}

function getOrderNotes(order) {
  return String(order?.notes || '').trim()
}

function getNotesPreview(notes) {
  if (!notes) {
    return '—'
  }

  return notes.length > 60 ? `${notes.slice(0, 60)}...` : notes
}

function getMinutesSince(value) {
  const timestamp = new Date(value).getTime()

  if (!Number.isFinite(timestamp)) {
    return 0
  }

  return Math.max(0, Math.floor((Date.now() - timestamp) / 60000))
}

function getAgeBadge(order) {
  const minutes = getMinutesSince(order.createdAt)
  const label = minutes < 1 ? 'Placed now' : `Placed ${minutes} min${minutes === 1 ? '' : 's'} ago`

  if (order.orderStatus === 'pending' && minutes >= 15) {
    return { label, className: 'border-red-200 bg-red-50 text-red-700' }
  }

  if (order.orderStatus === 'pending' && minutes >= 5) {
    return { label, className: 'border-amber-200 bg-amber-50 text-amber-700' }
  }

  return { label, className: 'border-slate-200 bg-slate-50 text-slate-600' }
}

export function SectionCard({ title, description, actions, children }) {
  return (
    <section className="rounded-[20px] border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-[20px] font-semibold tracking-[-0.01em] text-slate-950">{title}</p>
          {description && <p className="mt-1.5 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  )
}

export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[1.6px] text-slate-500">{label}</span>
      {children}
      {hint && <span className="mt-2 block text-xs text-slate-500">{hint}</span>}
    </label>
  )
}

export function TextInput(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100 ${
        props.className || ''
      }`}
    />
  )
}

export function TextArea(props) {
  return (
    <textarea
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100 ${
        props.className || ''
      }`}
    ></textarea>
  )
}

export function SelectInput(props) {
  return (
    <select
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100 ${
        props.className || ''
      }`}
    />
  )
}

export function ToggleInput({ label, checked, onChange }) {
  return (
    <label className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700">
      <input type="checkbox" checked={checked} onChange={onChange} className="h-4 w-4 accent-blue-600" />
      <span>{label}</span>
    </label>
  )
}

export function ActionButton({ children, variant = 'primary', ...props }) {
  const variants = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800',
    secondary: 'border border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  }

  return (
    <button
      {...props}
      className={`rounded-xl px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
        variants[variant]
      } ${props.className || ''}`}
    >
      {children}
    </button>
  )
}

export function ImageUploadField({
  label,
  value,
  onChange,
  onFileSelect,
  isUploading,
  previewAlt = '',
  placeholder = 'Paste image URL or upload below',
  hint = 'Local uploads are stored on this server. Large images are auto-optimized down to 5MB, with 50 saved images total.',
}) {
  return (
    <div className="grid gap-3">
      <Field label={label} hint={hint}>
        <TextInput value={value} onChange={onChange} placeholder={placeholder} />
      </Field>

      <div className="rounded-[22px] border border-dashed border-slate-300 bg-slate-50 p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Upload from device</p>
            <p className="mt-1 text-xs text-slate-500">JPG, PNG, WEBP, or AVIF. Menu uploads create thumbnail, medium, and large WebP versions.</p>
          </div>
          <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={isUploading}
              onChange={(event) => {
                const file = event.target.files?.[0]
                onFileSelect(file)
                event.target.value = ''
              }}
            />
            {isUploading ? 'Uploading...' : 'Choose Image'}
          </label>
        </div>
      </div>

      {value && (
        <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50">
          <img src={value} alt={previewAlt || ''} className="h-40 w-full object-cover" />
        </div>
      )}
    </div>
  )
}

export function MetricTile({ label, value, hint }) {
  return (
    <div className="rounded-[18px] border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold uppercase tracking-[1.6px] text-slate-500">{label}</p>
      <p className="mt-3 text-[30px] font-semibold leading-none text-slate-950">{value}</p>
      {hint && <p className="mt-2 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

export function StatusBadge({ value, kind = 'order' }) {
  const toneMap = {
    order: {
      pending: 'border-amber-200 bg-amber-50 text-amber-700',
      accepted: 'border-blue-200 bg-blue-50 text-blue-700',
      preparing: 'border-violet-200 bg-violet-50 text-violet-700',
      ready: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      delivered: 'border-slate-200 bg-slate-50 text-emerald-700',
      cancelled: 'border-red-200 bg-red-50 text-red-700',
    },
    payment: {
      unpaid: 'border-amber-200 bg-amber-50 text-amber-700',
      pending: 'border-sky-200 bg-sky-50 text-sky-700',
      paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      failed: 'border-red-200 bg-red-50 text-red-700',
      refunded: 'border-violet-200 bg-violet-50 text-violet-700',
    },
    method: {
      cod: 'border-slate-200 bg-slate-50 text-slate-700',
      online: 'border-blue-200 bg-blue-50 text-blue-700',
    },
    menu: {
      available: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      unavailable: 'border-red-200 bg-red-50 text-red-700',
      bestseller: 'border-slate-900 bg-slate-900 text-white',
      out_of_stock: 'border-red-200 bg-red-50 text-red-700',
    },
    print: {
      not_printed: 'border-slate-200 bg-slate-50 text-slate-600',
      queued: 'border-amber-200 bg-amber-50 text-amber-700',
      sent: 'border-blue-200 bg-blue-50 text-blue-700',
      printing: 'border-violet-200 bg-violet-50 text-violet-700',
      printed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      failed: 'border-red-200 bg-red-50 text-red-700',
    },
  }

  const classes = toneMap[kind]?.[value] || 'border-blue-200 bg-blue-50 text-blue-700'

  return (
    <span className={`inline-flex rounded-lg border px-2.5 py-1 text-[11px] font-medium ${classes}`}>
      {toLabelCase(value)}
    </span>
  )
}

export function StatusSelectCard({ label, value, options, onChange, disabled, hint }) {
  return (
    <div className="rounded-[16px] border border-slate-200 bg-slate-50 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[1.8px] text-slate-500">{label}</p>
      <SelectInput value={value} onChange={onChange} disabled={disabled} className="mt-4 bg-white">
        {options.map((option) => (
          <option key={option} value={option}>
            {toLabelCase(option)}
          </option>
        ))}
      </SelectInput>
      {hint && <p className="mt-3 text-xs leading-6 text-slate-500">{hint}</p>}
    </div>
  )
}

export function QuickPillButton({ active, onClick, disabled, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg border px-3 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
        active
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900'
      }`}
    >
      {children}
    </button>
  )
}

export function OrdersList({
  filteredOrders,
  expandedOrderId,
  setExpandedOrderId,
  busyKey,
  updateOrderField,
  onPrintOrder,
  isLoading = false,
}) {
  return (
    <div className="mt-6 overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">Order Queue</p>
            <p className="mt-1 text-xs text-slate-500">Live fulfilment and payment handling</p>
          </div>
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600">
            {filteredOrders.length} results
          </span>
        </div>
      </div>

      <div>
        <div className="divide-y divide-slate-200">
          {isLoading && (
            <>
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="grid gap-4 px-5 py-5 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_minmax(180px,0.7fr)_minmax(220px,0.9fr)_minmax(240px,1fr)_minmax(190px,0.7fr)]">
                  {Array.from({ length: 5 }).map((__, cellIndex) => (
                    <div key={cellIndex} className="space-y-3">
                      <div className="h-3 w-20 animate-pulse rounded bg-slate-200" />
                      <div className="h-5 w-full animate-pulse rounded bg-slate-200" />
                      <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
                    </div>
                  ))}
                </div>
              ))}
            </>
          )}

          {!isLoading && filteredOrders.map((order) => {
            const isExpanded = expandedOrderId === order.id
            const isUpdatingOrder = busyKey === `order-${order.id}`
            const latestPayment = getLatestPayment(order)
            const customerName = order.customer?.name || 'Guest Customer'
            const customerContact = order.account?.email || order.customer?.phone || 'No contact info'
            const createdAtLabel = formatDateTime(order.createdAt)
            const notes = getOrderNotes(order)
            const ageBadge = getAgeBadge(order)
            const quickStatuses = ['accepted', 'preparing', 'ready', 'delivered']

            return (
              <article key={order.id} className={`${isExpanded ? 'bg-slate-50/60' : 'bg-white hover:bg-slate-50/40'} transition`}>
                <div className="grid gap-4 px-5 py-5 md:grid-cols-2 xl:grid-cols-[minmax(240px,1fr)_minmax(180px,0.7fr)_minmax(220px,0.9fr)_minmax(240px,1fr)_minmax(190px,0.7fr)] xl:items-start">
                  <div className="min-w-0">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[1.6px] text-slate-500">Order</p>
                    <button
                      type="button"
                      onClick={() => setExpandedOrderId((current) => (current === order.id ? null : order.id))}
                      className="break-words text-left text-[18px] font-semibold leading-7 tracking-[-0.01em] text-blue-700 transition hover:text-blue-800 md:text-[19px]"
                    >
                      {order.orderNumber}
                    </button>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                        {order.items.length} items
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${order.storeLocation ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-500'}`}>
                        <MapPin className="h-3 w-3" />
                        {order.storeLocation ? toLabelCase(order.storeLocation) : 'No branch'}
                      </span>
                      {order.promo?.code && (
                        <span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                          Promo {order.promo.code}
                        </span>
                      )}
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium ${ageBadge.className}`}>
                        <Clock3 className="h-3 w-3" />
                        {ageBadge.label}
                      </span>
                    </div>
                    {order.items && order.items.length > 0 && (
                      <div className="mt-3 whitespace-normal text-[13px] leading-5 font-medium text-slate-700">
                        {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[1.6px] text-slate-500">Notes</p>
                    <p
                      title={notes || undefined}
                      className={`break-words text-sm leading-6 ${notes ? 'text-slate-600' : 'text-slate-400'}`}
                    >
                      {getNotesPreview(notes)}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[1.6px] text-slate-500">Customer</p>
                    <p className="break-words text-base font-semibold leading-6 text-slate-950">{customerName}</p>
                    <p className="mt-1 break-words text-sm text-slate-600">{customerContact}</p>
                    {order.customer?.address && <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">Pickup: {order.customer.address}</p>}
                  </div>

                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[1.6px] text-slate-500">Fulfilment</p>
                    <SelectInput
                      value={order.orderStatus}
                      onChange={(event) => updateOrderField(order.id, { orderStatus: event.target.value })}
                      disabled={isUpdatingOrder}
                      className="rounded-full border-slate-300 bg-white py-3 font-medium shadow-none"
                    >
                      {orderStatuses.map((status) => (
                        <option key={status} value={status}>
                          {toLabelCase(status)}
                        </option>
                      ))}
                    </SelectInput>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <StatusBadge value={order.orderStatus} kind="order" />
                      <StatusBadge value={order.paymentStatus} kind="payment" />
                      <StatusBadge value={order.printStatus || 'not_printed'} kind="print" />
                      <StatusBadge value={order.paymentMethod} kind="method" />
                    </div>
                    {latestPayment?.providerPaymentId && (
                      <p className="mt-2 break-all text-[11px] leading-5 text-slate-500">
                        Razorpay ID: <span className="font-semibold text-slate-700">{latestPayment.providerPaymentId}</span>
                      </p>
                    )}

                    <p className="mt-3 text-[20px] font-semibold tracking-[-0.01em] text-slate-950">{formatCurrency(order.pricing?.grandTotal)}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {order.pricing?.discountAmount ? `Discount ${formatCurrency(order.pricing.discountAmount)}` : 'No discount'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{createdAtLabel}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {quickStatuses.map((status) => (
                        <QuickPillButton
                          key={status}
                          active={order.orderStatus === status}
                          disabled={isUpdatingOrder || order.orderStatus === status}
                          onClick={() => updateOrderField(order.id, { orderStatus: status })}
                        >
                          {toLabelCase(status)}
                        </QuickPillButton>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-start gap-2 xl:justify-end">
                    <button
                      type="button"
                      onClick={() => onPrintOrder?.(order, 'print')}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </button>
                    <button
                      type="button"
                      onClick={() => onPrintOrder?.(order, 'reprint')}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reprint
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpandedOrderId((current) => (current === order.id ? null : order.id))}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950"
                    >
                      {isExpanded ? 'Hide' : 'Open'}
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-200 bg-white px-5 py-5">
                    <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.95fr)_minmax(420px,1.15fr)] 2xl:grid-cols-[minmax(280px,0.9fr)_minmax(420px,1.15fr)_minmax(320px,0.95fr)]">
                      <div className="rounded-[18px] border border-slate-200 bg-slate-50/70 p-4">
                        <p className="text-[11px] font-semibold uppercase tracking-[1.6px] text-slate-500">Customer Details</p>
                        <div className="mt-4 grid gap-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[1.8px] text-slate-500">Name</p>
                            <p className="mt-2 text-sm font-semibold text-slate-950">{customerName}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[1.8px] text-slate-500">Phone</p>
                            <p className="mt-2 text-sm text-slate-800">{order.customer?.phone || 'No phone provided'}</p>
                          </div>
                          {order.account?.email && (
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-[1.8px] text-slate-500">Email</p>
                              <p className="mt-2 break-words text-sm text-slate-800">{order.account.email}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[1.8px] text-slate-500">Branch</p>
                            <p className={`mt-2 inline-flex items-center gap-1.5 text-sm font-semibold ${order.storeLocation ? 'text-emerald-700' : 'text-slate-400'}`}>
                              <MapPin className="h-3.5 w-3.5" />
                              {order.storeLocation ? toLabelCase(order.storeLocation) : 'Not selected'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[1.8px] text-slate-500">Pickup Store</p>
                            <p className="mt-2 text-sm leading-6 text-slate-800">
                              {order.customer?.address || 'No pickup store captured'}
                            </p>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[1.8px] text-slate-500">
                              <MessageSquare className="h-3.5 w-3.5" />
                              Customer Notes
                            </div>
                            {notes ? (
                              <div className="mt-3 rounded-xl border border-amber-200 border-l-4 border-l-amber-500 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-950">
                                {notes}
                              </div>
                            ) : (
                              <p className="mt-2 text-sm italic text-slate-400">No special instructions</p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[18px] border border-slate-200 bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[11px] font-semibold uppercase tracking-[1.6px] text-slate-500">Items</p>
                          <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
                            {order.items.length} items
                          </span>
                        </div>
                        <div className="mt-4 divide-y divide-slate-200">
                          {order.items.map((item) => (
                            <div key={item.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-950">{item.name}</p>
                                <p className="mt-1 text-sm text-slate-600">
                                  {item.quantity} x {formatCurrency(item.unitPrice)}
                                </p>
                              </div>
                              <p className="text-sm font-semibold text-slate-950">{formatCurrency(item.total)}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid gap-4">
                        <div className="rounded-[18px] border border-slate-200 bg-slate-50/70 p-4 xl:col-span-2 2xl:col-span-1">
                          <p className="text-[11px] font-semibold uppercase tracking-[1.6px] text-slate-500">Payment Handling</p>
                          <div className="mt-4">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[1.8px] text-slate-500">Payment Status</p>
                            <SelectInput
                              value={order.paymentStatus}
                              onChange={(event) => updateOrderField(order.id, { paymentStatus: event.target.value })}
                              disabled={isUpdatingOrder}
                              className="rounded-full border-slate-300 bg-white py-3 font-medium shadow-none"
                            >
                              {paymentStatuses.map((status) => (
                                <option key={status} value={status}>
                                  {toLabelCase(status)}
                                </option>
                              ))}
                            </SelectInput>
                          </div>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                              <p className="text-[10px] font-semibold uppercase tracking-[1.6px] text-slate-500">Method</p>
                              <p className="mt-2 text-sm font-semibold text-slate-950">{toLabelCase(order.paymentMethod)}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                              <p className="text-[10px] font-semibold uppercase tracking-[1.6px] text-slate-500">Updated</p>
                              <p className="mt-2 text-sm font-semibold text-slate-950">{formatDateTime(order.updatedAt)}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 sm:col-span-2">
                              <p className="text-[10px] font-semibold uppercase tracking-[1.6px] text-slate-500">Razorpay Payment ID</p>
                              <p className="mt-2 break-all font-mono text-xs text-slate-900">
                                {latestPayment?.providerPaymentId || 'Not captured yet'}
                              </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 sm:col-span-2">
                              <p className="text-[10px] font-semibold uppercase tracking-[1.6px] text-slate-500">Webhook Verified</p>
                              <p className="mt-2 break-all font-mono text-xs text-slate-900">
                                {latestPayment?.webhookVerifiedAt ? formatDateTime(latestPayment.webhookVerifiedAt) : 'Not verified by webhook yet'}
                              </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 sm:col-span-2">
                              <p className="text-[10px] font-semibold uppercase tracking-[1.6px] text-slate-500">Razorpay Order ID</p>
                              <p className="mt-2 break-all font-mono text-xs text-slate-900">
                                {latestPayment?.providerOrderId || 'Not captured yet'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-[18px] border border-slate-200 bg-white p-4">
                          <div className="mb-4 flex flex-wrap gap-2">
                            <ActionButton
                              type="button"
                              variant="secondary"
                              onClick={() => onPrintOrder?.(order, 'print')}
                              className="inline-flex items-center gap-2"
                            >
                              <Printer className="h-4 w-4" />
                              Print Bill
                            </ActionButton>
                            <ActionButton
                              type="button"
                              variant="secondary"
                              onClick={() => onPrintOrder?.(order, 'reprint')}
                              className="inline-flex items-center gap-2"
                            >
                              <RotateCcw className="h-4 w-4" />
                              Reprint
                            </ActionButton>
                            <ActionButton
                              type="button"
                              variant="secondary"
                              disabled={isUpdatingOrder || order.orderStatus === 'cancelled'}
                              onClick={() => updateOrderField(order.id, { orderStatus: 'cancelled' })}
                              className="inline-flex items-center gap-2 text-red-700"
                            >
                              Cancel
                            </ActionButton>
                          </div>
                          <p className="text-[11px] font-semibold uppercase tracking-[1.6px] text-slate-500">Pricing</p>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <p className="text-[10px] font-semibold uppercase tracking-[1.6px] text-slate-500">Subtotal</p>
                              <p className="mt-2 text-sm font-semibold text-slate-950">{formatCurrency(order.pricing?.subTotal)}</p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <p className="text-[10px] font-semibold uppercase tracking-[1.6px] text-slate-500">Discount</p>
                              <p className="mt-2 text-sm font-semibold text-slate-950">
                                {order.pricing?.discountAmount ? formatCurrency(order.pricing.discountAmount) : 'No discount'}
                              </p>
                            </div>
                            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                              <p className="text-[10px] font-semibold uppercase tracking-[1.6px] text-slate-500">Tax</p>
                              <p className="mt-2 text-sm font-semibold text-slate-950">{formatCurrency(order.pricing?.taxAmount)}</p>
                            </div>
                            <div className="rounded-xl border border-slate-900 bg-slate-900 px-4 py-3">
                              <p className="text-[10px] font-semibold uppercase tracking-[1.6px] text-slate-300">Grand Total</p>
                              <p className="mt-2 text-sm font-semibold text-white">{formatCurrency(order.pricing?.grandTotal)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            )
          })}

          {!isLoading && filteredOrders.length === 0 && (
            <div className="px-5 py-12 text-center">
              <Check className="mx-auto h-9 w-9 text-emerald-500" />
              <p className="mt-3 text-sm font-semibold text-slate-900">No orders match the current filters.</p>
              <p className="mt-1 text-sm text-slate-500">Clear filters or refresh when the next order arrives.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
