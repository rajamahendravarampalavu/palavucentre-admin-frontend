import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'

import { adminApi } from '../../api/adminApi'
import { API_BASE_URL } from '../../shared/api/api-config'
import { playNotificationSound, requestNotificationPermission, showBrowserNotification } from '../../shared/notifications'

const WS_URL = (() => {
  if (API_BASE_URL.startsWith('http')) return API_BASE_URL.replace(/\/api\/?$/, '')
  return window.location.origin
})()

const DEFAULT_BRANCH_ID = 'kukatpally'
const PRINT_AGENT_TOKEN = import.meta.env.VITE_PRINT_AGENT_TOKEN || ''

function formatCurrency(amount) {
  return `Rs. ${Number(amount || 0).toFixed(2)}`
}

function formatTime(dateStr) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function timeAgo(dateStr) {
  if (!dateStr) return 'Unknown time'
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  return `${hours} hr ${minutes % 60} min ago`
}

function toLabel(value) {
  return String(value || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function normalizeBranchId(value) {
  return String(value || DEFAULT_BRANCH_ID).trim().toLowerCase() || DEFAULT_BRANCH_ID
}

function getPrintStatusLabel(value) {
  const labels = {
    not_printed: 'Not Printed',
    pending: 'Queued',
    queued: 'Queued',
    sent: 'Queued',
    printing: 'Queued',
    printed: 'Printed',
    failed: 'Failed',
  }

  return labels[value] || toLabel(value)
}

function badgeClass(value, type = 'order') {
  const maps = {
    order: {
      pending: 'border-amber-200 bg-amber-50 text-amber-700',
      accepted: 'border-blue-200 bg-blue-50 text-blue-700',
      preparing: 'border-violet-200 bg-violet-50 text-violet-700',
      ready: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      delivered: 'border-slate-200 bg-slate-50 text-slate-700',
      cancelled: 'border-red-200 bg-red-50 text-red-700',
    },
    payment: {
      paid: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      unpaid: 'border-amber-200 bg-amber-50 text-amber-700',
      pending: 'border-sky-200 bg-sky-50 text-sky-700',
      failed: 'border-red-200 bg-red-50 text-red-700',
      refunded: 'border-violet-200 bg-violet-50 text-violet-700',
    },
    print: {
      not_printed: 'border-slate-200 bg-slate-50 text-slate-600',
      queued: 'border-amber-200 bg-amber-50 text-amber-700',
      pending: 'border-amber-200 bg-amber-50 text-amber-700',
      sent: 'border-blue-200 bg-blue-50 text-blue-700',
      printing: 'border-violet-200 bg-violet-50 text-violet-700',
      printed: 'border-emerald-200 bg-emerald-50 text-emerald-700',
      failed: 'border-red-200 bg-red-50 text-red-700',
    },
  }

  return maps[type]?.[value] || 'border-slate-200 bg-slate-50 text-slate-600'
}

function getOrderTotal(order) {
  return order?.pricing?.grandTotal ?? order?.grandTotal ?? 0
}

function orderToPrintJob(order) {
  return {
    id: null,
    orderId: order.id,
    status: order.printStatus || 'not_printed',
    payload: {
      restaurant: {
        name: 'RajaMahendravaram PalavuCentre',
        phone: '9966655997',
      },
      branch: {
        name: toLabel(order.storeLocation || 'Branch'),
        address: order.customer?.address || '',
      },
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        createdAt: order.createdAt,
        status: order.orderStatus,
        notes: order.notes || '',
      },
      customer: {
        name: order.customer?.name || 'Guest',
        phone: order.customer?.phone || '',
      },
      payment: {
        method: order.paymentMethod,
        status: order.paymentStatus,
      },
      items: (order.items || []).map((item) => ({
        name: item.name,
        variantLabel: item.variantLabel,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        total: item.total,
      })),
      totals: {
        subtotal: order.pricing?.subTotal || 0,
        discount: order.pricing?.discountAmount || 0,
        tax: order.pricing?.taxAmount || 0,
        grandTotal: getOrderTotal(order),
      },
      print: {
        paperSize: '80mm',
        footerMessage: 'Thank you for your order!',
        copies: 1,
      },
    },
  }
}

function BillPrint({ job, onManualPrint, onClose }) {
  if (!job?.payload) return null

  const payload = job.payload
  const paperSize = payload.print?.paperSize || '80mm'
  const items = payload.items || []

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4">
      <div className="max-h-[92vh] w-full max-w-[430px] overflow-y-auto rounded-xl bg-white shadow-xl">
        <div className="no-print flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-950">Bill Preview</p>
            <p className="text-xs text-slate-500">{payload.order?.orderNumber}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={onManualPrint} className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white">
              Print
            </button>
            <button onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
              Close
            </button>
          </div>
        </div>

        <div className={`print-bill p-5 text-black ${paperSize === '58mm' ? 'bill-58' : paperSize === 'A4' ? 'bill-a4' : 'bill-80'}`}>
          <div className="text-center">
            <p className="text-[15px] font-bold uppercase">{payload.restaurant?.name || 'PalavuCentre'}</p>
            {payload.branch?.name && <p className="mt-1 text-[11px]">{payload.branch.name}</p>}
            {payload.branch?.address && <p className="mt-1 text-[10px] leading-4">{payload.branch.address}</p>}
            {payload.restaurant?.phone && <p className="mt-1 text-[10px]">Phone: {payload.restaurant.phone}</p>}
            {payload.restaurant?.gstNumber && <p className="mt-1 text-[10px]">GST: {payload.restaurant.gstNumber}</p>}
          </div>

          <div className="my-3 border-t border-dashed border-black" />

          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between gap-3">
              <span>Order</span>
              <span className="font-bold">{payload.order?.orderNumber}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Date</span>
              <span>{new Date(payload.order?.createdAt || Date.now()).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Customer</span>
              <span className="text-right">{payload.customer?.name || 'Guest'}</span>
            </div>
            {payload.customer?.phone && (
              <div className="flex justify-between gap-3">
                <span>Phone</span>
                <span>{payload.customer.phone}</span>
              </div>
            )}
            <div className="flex justify-between gap-3">
              <span>Payment</span>
              <span className="font-bold uppercase">
                {payload.payment?.method || 'cod'} / {payload.payment?.status || 'unpaid'}
              </span>
            </div>
          </div>

          <div className="my-3 border-t border-dashed border-black" />

          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-black">
                <th className="py-1 text-left">Item</th>
                <th className="py-1 text-center">Qty</th>
                <th className="py-1 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.name}-${index}`} className="avoid-break border-b border-dashed border-slate-400">
                  <td className="py-1 pr-2">
                    <span>{item.name}</span>
                    {item.variantLabel && <span className="block text-[10px]">Size: {item.variantLabel}</span>}
                  </td>
                  <td className="py-1 text-center">{item.quantity}</td>
                  <td className="py-1 text-right">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {payload.order?.notes && (
            <>
              <div className="my-3 border-t border-dashed border-black" />
              <div className="text-[11px]">
                <p className="font-bold">Special Request</p>
                <p className="mt-1 leading-4">{payload.order.notes}</p>
              </div>
            </>
          )}

          <div className="my-3 border-t border-dashed border-black" />

          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatCurrency(payload.totals?.subtotal)}</span>
            </div>
            {Number(payload.totals?.discount || 0) > 0 && (
              <div className="flex justify-between">
                <span>Discount</span>
                <span>-{formatCurrency(payload.totals.discount)}</span>
              </div>
            )}
            {Number(payload.totals?.tax || 0) > 0 && (
              <div className="flex justify-between">
                <span>Tax</span>
                <span>{formatCurrency(payload.totals.tax)}</span>
              </div>
            )}
            <div className="mt-2 flex justify-between border-t border-black pt-2 text-[13px] font-bold">
              <span>Total</span>
              <span>{formatCurrency(payload.totals?.grandTotal)}</span>
            </div>
          </div>

          <div className="my-3 border-t border-dashed border-black" />
          <p className="text-center text-[10px]">{payload.print?.footerMessage || 'Thank you for your order!'}</p>
        </div>
      </div>
    </div>
  )
}

export default function KitchenDisplay() {
  const [orders, setOrders] = useState([])
  const [printJobs, setPrintJobs] = useState([])
  const [settings, setSettings] = useState(null)
  const [settingsForm, setSettingsForm] = useState(null)
  const [connected, setConnected] = useState(false)
  const [stationJoined, setStationJoined] = useState(false)
  const [stationError, setStationError] = useState('')
  const [stationStatuses, setStationStatuses] = useState([])
  const [printQueue, setPrintQueue] = useState([])
  const [activePrintJob, setActivePrintJob] = useState(null)
  const [lastRefreshedAt, setLastRefreshedAt] = useState(null)
  const [busyKey, setBusyKey] = useState('')
  const socketRef = useRef(null)
  const audioUnlocked = useRef(false)
  const printedJobIds = useRef(new Set())
  const activePrintJobRef = useRef(null)

  const configuredBranchId = settingsForm?.branchId || settings?.branchId
  const branchId = configuredBranchId || DEFAULT_BRANCH_ID
  const hasConfiguredBranch = Boolean(configuredBranchId)
  const autoPrintEnabled = settings?.autoPrintEnabled !== false
  const soundEnabled = settings?.soundEnabled !== false

  const pendingPrintJobs = useMemo(
    () => printJobs.filter((job) => normalizeBranchId(job.branchId) === normalizeBranchId(branchId) && ['pending', 'sent', 'failed'].includes(job.status)),
    [branchId, printJobs],
  )

  const refreshOrders = useCallback(async () => {
    const response = await adminApi.getOrders({ page: 1, limit: 30 })
    setOrders(response.data?.items || [])
    setLastRefreshedAt(new Date())
  }, [])

  const refreshPrintJobs = useCallback(async () => {
    const response = await adminApi.getPrintJobs({ page: 1, limit: 50, branchId })
    const items = response.data?.items || []
    setPrintJobs(items)
    setStationStatuses(response.data?.stationStatus || [])
    setLastRefreshedAt(new Date())
    return items
  }, [branchId])

  const refreshSettings = useCallback(async () => {
    const response = await adminApi.getPrintSettings()
    setSettings(response.data)
    setSettingsForm(response.data)
    return response.data
  }, [])

  const refreshAll = useCallback(async () => {
    await Promise.all([refreshOrders(), refreshPrintJobs(), refreshSettings()])
  }, [refreshOrders, refreshPrintJobs, refreshSettings])

  const unlockAudio = () => {
    if (!audioUnlocked.current) {
      audioUnlocked.current = true
      requestNotificationPermission()
    }
  }

  const enqueuePrintJob = useCallback((job) => {
    if (!job?.id || printedJobIds.current.has(job.id)) return
    if (normalizeBranchId(job.branchId) !== normalizeBranchId(branchId)) return
    if (!['pending', 'sent'].includes(job.status)) return

    setPrintQueue((current) => {
      if (current.some((item) => item.id === job.id)) return current
      return [...current, job]
    })
  }, [branchId])

  const markPrinted = useCallback(async (job) => {
    if (!job?.id) {
      setActivePrintJob(null)
      return
    }

    try {
      printedJobIds.current.add(job.id)
      await adminApi.markPrintJobPrinted(job.id)
      await Promise.all([refreshOrders(), refreshPrintJobs()])
    } catch (error) {
      await adminApi.failPrintJob(job.id, { errorMessage: error?.message || 'Browser print station could not mark printed' }).catch(() => null)
      await refreshPrintJobs()
    } finally {
      setActivePrintJob(null)
    }
  }, [refreshOrders, refreshPrintJobs])

  const printActiveJob = useCallback(() => {
    if (!activePrintJob) return
    window.print()
  }, [activePrintJob])

  useEffect(() => {
    activePrintJobRef.current = activePrintJob
  }, [activePrintJob])

  useEffect(() => {
    refreshAll().catch((error) => console.error('Failed to load print screen', error))
  }, [refreshAll])

  useEffect(() => {
    const socket = io(WS_URL, { path: '/ws/', transports: ['websocket', 'polling'], withCredentials: true })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
      setStationError('')
      socket.emit('join-admin')
      socket.emit('join-print-station', { branchId, token: PRINT_AGENT_TOKEN })
      refreshPrintJobs()
        .then((jobs) => jobs.filter((job) => ['pending', 'sent'].includes(job.status)).forEach(enqueuePrintJob))
        .catch(() => null)
    })

    socket.on('disconnect', () => {
      setConnected(false)
      setStationJoined(false)
    })

    socket.on('print-station-joined', () => {
      setStationJoined(true)
      setStationError('')
    })

    socket.on('print-station-error', (payload) => {
      setStationJoined(false)
      setStationError(payload?.message || 'Print station authentication failed')
    })

    socket.on('print-station-status', (payload) => {
      setStationStatuses(Array.isArray(payload) ? payload : [])
    })

    socket.on('new_print_job', (job) => {
      if (normalizeBranchId(job?.branchId) !== normalizeBranchId(branchId)) return
      if (soundEnabled) playNotificationSound()
      showBrowserNotification('New bill ready', `Order ${job?.payload?.order?.orderNumber || job?.order?.orderNumber || ''}`)
      enqueuePrintJob(job)
      refreshOrders().catch(() => null)
      refreshPrintJobs().catch(() => null)
    })

    socket.on('new-order', (data) => {
      if (data?.branchId && normalizeBranchId(data.branchId) !== normalizeBranchId(branchId)) return
      if (soundEnabled) playNotificationSound()
      showBrowserNotification('New order', `Order ${data?.orderNumber || ''} received`)
      refreshOrders().catch(() => null)
    })

    socket.on('order-updated', () => {
      refreshOrders().catch(() => null)
    })

    socket.on('payment-verified', () => {
      refreshOrders().catch(() => null)
      refreshPrintJobs().catch(() => null)
    })

    socket.on('payment-webhook', () => {
      refreshOrders().catch(() => null)
      refreshPrintJobs().catch(() => null)
    })

    socket.on('print-job-created', refreshPrintJobs)
    socket.on('print-job-sent', refreshPrintJobs)
    socket.on('print-job-printed', refreshPrintJobs)
    socket.on('print-job-failed', refreshPrintJobs)

    const pingTimer = window.setInterval(() => socket.emit('print-station-ping'), 30000)

    return () => {
      window.clearInterval(pingTimer)
      socket.disconnect()
    }
  }, [branchId, enqueuePrintJob, refreshOrders, refreshPrintJobs, soundEnabled])

  useEffect(() => {
    if (!autoPrintEnabled || activePrintJob || printQueue.length === 0) return

    const [nextJob, ...remainingJobs] = printQueue
    setPrintQueue(remainingJobs)
    setActivePrintJob(nextJob)
  }, [activePrintJob, autoPrintEnabled, printQueue])

  useEffect(() => {
    if (!activePrintJob || !autoPrintEnabled || !activePrintJob.id) return undefined

    const afterPrint = () => {
      markPrinted(activePrintJobRef.current).catch(() => null)
    }

    window.addEventListener('afterprint', afterPrint)
    const printTimer = window.setTimeout(() => window.print(), 550)

    return () => {
      window.clearTimeout(printTimer)
      window.removeEventListener('afterprint', afterPrint)
    }
  }, [activePrintJob, autoPrintEnabled, markPrinted])

  const saveSettings = async (event) => {
    event.preventDefault()
    setBusyKey('settings')
    try {
      setStationError('')
      const response = await adminApi.updatePrintSettings(settingsForm)
      setSettings(response.data)
      setSettingsForm(response.data)
      socketRef.current?.emit('join-print-station', { branchId: response.data?.branchId || DEFAULT_BRANCH_ID, token: PRINT_AGENT_TOKEN })
      await refreshPrintJobs()
    } catch (error) {
      setStationError(error?.message || 'Could not save print settings')
    } finally {
      setBusyKey('')
    }
  }

  const updateOrderStatus = async (order, orderStatus) => {
    setBusyKey(`order-${order.id}`)
    try {
      await adminApi.updateOrder(order.id, { orderStatus })
      await refreshOrders()
    } finally {
      setBusyKey('')
    }
  }

  const queueOrderPrintJob = async (order, kind = 'original') => {
    setBusyKey(`order-print-${order.id}-${kind}`)
    try {
      setStationError('')
      const response = await adminApi.createOrderPrintJob(order.id, { kind })
      enqueuePrintJob(response.data)
      await Promise.all([refreshOrders(), refreshPrintJobs()])
    } catch (error) {
      setStationError(error?.message || 'Could not queue print job')
    } finally {
      setBusyKey('')
    }
  }

  const retryJob = async (job) => {
    setBusyKey(`print-${job.id}`)
    try {
      setStationError('')
      const response = await adminApi.retryPrintJob(job.id)
      enqueuePrintJob(response.data)
      await refreshPrintJobs()
    } catch (error) {
      setStationError(error?.message || 'Could not retry print job')
    } finally {
      setBusyKey('')
    }
  }

  const runTestPrint = () => {
    setActivePrintJob({
      id: null,
      payload: {
        restaurant: {
          name: settings?.restaurantName || 'PalavuCentre',
          phone: settings?.phone || '9966655997',
        },
        branch: {
          id: branchId,
          name: toLabel(branchId),
          address: settings?.branchAddress || 'Print station test',
        },
        order: {
          orderNumber: 'TEST PRINT',
          createdAt: new Date().toISOString(),
          notes: 'Printer test receipt',
        },
        customer: {
          name: 'Print Station',
          phone: '',
        },
        payment: {
          method: 'test',
          status: 'paid',
        },
        items: [
          { name: 'Test Item', quantity: 1, total: 1 },
        ],
        totals: {
          subtotal: 1,
          discount: 0,
          tax: 0,
          grandTotal: 1,
        },
        print: {
          paperSize: settings?.paperSize || '80mm',
          footerMessage: settings?.footerMessage || 'Print station test successful',
          copies: 1,
        },
      },
    })
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-900" onClick={unlockAudio}>
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <h1 className="text-[22px] font-semibold text-slate-950">Print Station</h1>
              <p className="mt-1 text-xs text-slate-500">Keep this page open on the browser connected to the receipt printer.</p>
            </div>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${connected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-red-200 bg-red-50 text-red-700'}`}>
              {connected ? 'Online' : 'Offline'}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${stationJoined ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
              {stationJoined ? `Print station: ${branchId}` : 'Print station not joined'}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${autoPrintEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
              Auto print {autoPrintEnabled ? 'on' : 'off'}
            </span>
            <span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${soundEnabled ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-slate-50 text-slate-600'}`}>
              Sound {soundEnabled ? 'on' : 'off'}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
              {settings?.paperSize || '80mm'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {lastRefreshedAt && <span className="text-xs text-slate-500">Last refreshed {formatTime(lastRefreshedAt)}</span>}
            <button onClick={refreshAll} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Refresh
            </button>
            <button onClick={runTestPrint} className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Test Print
            </button>
            <button onClick={() => {
              if (!playNotificationSound()) {
                setStationError('Browser blocked sound. Click anywhere on this page, then test sound again')
              }
            }} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
              Test Sound
            </button>
          </div>
        </div>
        {!hasConfiguredBranch && (
          <div className="mx-auto mt-3 max-w-7xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            No branch is saved for this print station yet. Using {toLabel(branchId)} until settings are saved.
          </div>
        )}
        {stationError && (
          <div className="mx-auto mt-3 max-w-7xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {stationError}. New bills will stay queued until the print station joins successfully.
          </div>
        )}
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="grid gap-5">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <p className="text-[11px] font-semibold uppercase tracking-[1.6px] text-slate-500">Live Orders</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{orders.length}</p>
              <p className="mt-1 text-xs text-slate-500">Latest 30 orders</p>
            </div>
            <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <p className="text-[11px] font-semibold uppercase tracking-[1.6px] text-slate-500">Print Queue</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{pendingPrintJobs.length}</p>
              <p className="mt-1 text-xs text-slate-500">Pending, sent, or failed</p>
            </div>
            <div className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
              <p className="text-[11px] font-semibold uppercase tracking-[1.6px] text-slate-500">Station Status</p>
              <p className="mt-3 text-3xl font-semibold text-slate-950">{stationJoined ? 'Online' : 'Offline'}</p>
              <p className="mt-1 text-xs text-slate-500">{toLabel(branchId)} / {settings?.paperSize || '80mm'} / sound {soundEnabled ? 'on' : 'off'} / stations {stationStatuses.length}</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {orders.map((order) => {
              const minutesOld = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000)
              const isUrgent = order.orderStatus === 'pending' && minutesOld >= 15
              const isDelayed = order.orderStatus === 'pending' && minutesOld >= 5
              const cardClass = isUrgent
                ? 'border-red-300 shadow-[0_8px_24px_rgba(220,38,38,0.12)]'
                : isDelayed
                  ? 'border-amber-300 shadow-[0_8px_24px_rgba(245,158,11,0.12)]'
                  : 'border-slate-200'

              return (
                <article key={order.id} className={`rounded-[18px] border bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${cardClass}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono text-sm font-bold text-blue-700">{order.orderNumber}</p>
                      <p className="mt-1 text-xs text-slate-500">{formatTime(order.createdAt)} - {timeAgo(order.createdAt)}</p>
                    </div>
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase ${badgeClass(order.orderStatus, 'order')}`}>{toLabel(order.orderStatus)}</span>
                      <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase ${badgeClass(order.paymentStatus, 'payment')}`}>{toLabel(order.paymentStatus)}</span>
                      <span className={`rounded-lg border px-2.5 py-1 text-[10px] font-semibold uppercase ${badgeClass(order.printStatus, 'print')}`}>{getPrintStatusLabel(order.printStatus || 'not_printed')}</span>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
                    <div>
                      <p className="font-semibold text-slate-950">{order.customer?.name || 'Guest'}</p>
                      <p className="text-sm text-slate-600">{order.customer?.phone || 'No phone'}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">{toLabel(order.storeLocation || 'No branch')}</p>
                    </div>
                    <p className="text-right text-[22px] font-semibold text-slate-950">{formatCurrency(getOrderTotal(order))}</p>
                  </div>

                  {order.notes && (
                    <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                      {order.notes}
                    </div>
                  )}

                  <div className="mt-4 divide-y divide-slate-100 border-y border-slate-100">
                    {(order.items || []).map((item) => (
                      <div key={item.id} className="flex justify-between gap-3 py-2 text-sm">
                        <span className="text-slate-700">
                          {item.quantity} x {item.name}
                        </span>
                        <span className="font-medium text-slate-900">{formatCurrency(item.total)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {['accepted', 'preparing', 'ready', 'delivered'].map((status) => (
                      <button
                        key={status}
                        disabled={busyKey === `order-${order.id}` || order.orderStatus === status}
                        onClick={() => updateOrderStatus(order, status)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {toLabel(status)}
                      </button>
                    ))}
                    <button
                      disabled={busyKey === `order-print-${order.id}-original`}
                      onClick={() => queueOrderPrintJob(order, 'original')}
                      className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
                    >
                      {busyKey === `order-print-${order.id}-original` ? 'Sending...' : 'Send to Queue'}
                    </button>
                    <button
                      onClick={() => setActivePrintJob(orderToPrintJob(order))}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Browser Print
                    </button>
                  </div>
                </article>
              )
            })}

            {orders.length === 0 && (
              <div className="rounded-[18px] border border-slate-200 bg-white p-12 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:col-span-2">
                <p className="text-lg font-semibold text-slate-900">No orders yet</p>
                <p className="mt-1 text-sm text-slate-500">New orders will appear here with sound alerts and print jobs.</p>
              </div>
            )}
          </div>
        </section>

        <aside className="grid content-start gap-5">
          <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mb-4">
              <p className="text-sm font-semibold text-slate-950">Print Settings</p>
              <p className="mt-1 text-xs text-slate-500">This browser tab acts as the local print station.</p>
            </div>
            {settingsForm && (
              <form onSubmit={saveSettings} className="grid gap-3">
                <label className="grid gap-1 text-xs font-semibold uppercase tracking-[1.4px] text-slate-500">
                  Branch
                  <select
                    value={settingsForm.branchId || DEFAULT_BRANCH_ID}
                    onChange={(event) => setSettingsForm((current) => ({ ...current, branchId: event.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm normal-case tracking-normal text-slate-900"
                  >
                    <option value="kukatpally">Kukatpally</option>
                    <option value="bachupally">Bachupally / Nizampet</option>
                    <option value="default">Default</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-semibold uppercase tracking-[1.4px] text-slate-500">
                  Paper Size
                  <select
                    value={settingsForm.paperSize || '80mm'}
                    onChange={(event) => setSettingsForm((current) => ({ ...current, paperSize: event.target.value }))}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm normal-case tracking-normal text-slate-900"
                  >
                    <option value="58mm">58mm</option>
                    <option value="80mm">80mm</option>
                    <option value="A4">A4</option>
                  </select>
                </label>
                <label className="grid gap-1 text-xs font-semibold uppercase tracking-[1.4px] text-slate-500">
                  Restaurant Name
                  <input
                    value={settingsForm.restaurantName || ''}
                    onChange={(event) => setSettingsForm((current) => ({ ...current, restaurantName: event.target.value }))}
                    className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm normal-case tracking-normal text-slate-900"
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold uppercase tracking-[1.4px] text-slate-500">
                  Branch Address
                  <textarea
                    value={settingsForm.branchAddress || ''}
                    onChange={(event) => setSettingsForm((current) => ({ ...current, branchAddress: event.target.value }))}
                    className="min-h-20 rounded-xl border border-slate-200 px-3 py-2.5 text-sm normal-case tracking-normal text-slate-900"
                  />
                </label>
                <div className="grid gap-2">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={settingsForm.autoPrintEnabled !== false}
                      onChange={(event) => setSettingsForm((current) => ({ ...current, autoPrintEnabled: event.target.checked }))}
                      className="h-4 w-4 accent-blue-600"
                    />
                    Auto print enabled
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={settingsForm.soundEnabled !== false}
                      onChange={(event) => setSettingsForm((current) => ({ ...current, soundEnabled: event.target.checked }))}
                      className="h-4 w-4 accent-blue-600"
                    />
                    Sound alert enabled
                  </label>
                </div>
                <button disabled={busyKey === 'settings'} className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60">
                  {busyKey === 'settings' ? 'Saving...' : 'Save Print Settings'}
                </button>
              </form>
            )}
          </section>

          <section className="rounded-[18px] border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-950">Print Jobs</p>
                <p className="mt-1 text-xs text-slate-500">Retry failed or queued bills.</p>
              </div>
              <button onClick={refreshPrintJobs} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700">
                Reload
              </button>
            </div>
            <div className="grid gap-3">
              {pendingPrintJobs.slice(0, 8).map((job) => (
                <div key={job.id} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">{job.payload?.order?.orderNumber || job.order?.orderNumber}</p>
                      <p className="mt-1 text-xs text-slate-500">{toLabel(job.branchId || 'default')} - attempts {job.attempts || 0}</p>
                    </div>
                    <span className={`rounded-lg border px-2 py-1 text-[10px] font-semibold uppercase ${badgeClass(job.status, 'print')}`}>{getPrintStatusLabel(job.status)}</span>
                  </div>
                  {job.errorMessage && <p className="mt-2 text-xs text-red-700">{job.errorMessage}</p>}
                  <div className="mt-3 flex gap-2">
                    <button
                      disabled={job.status === 'failed'}
                      onClick={() => enqueuePrintJob(job)}
                      className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Print
                    </button>
                    <button
                      disabled={busyKey === `print-${job.id}` || !['pending', 'failed'].includes(job.status)}
                      onClick={() => retryJob(job)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 disabled:opacity-50"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ))}
              {pendingPrintJobs.length === 0 && <p className="rounded-xl border border-dashed border-slate-200 px-3 py-8 text-center text-sm text-slate-500">No pending print jobs.</p>}
            </div>
          </section>
        </aside>
      </main>

      {activePrintJob && (
        <BillPrint
          job={activePrintJob}
          onManualPrint={printActiveJob}
          onClose={() => setActivePrintJob(null)}
        />
      )}

      <style>{`
        @media print {
          @page { margin: 0; }
          body * { visibility: hidden; }
          .print-bill, .print-bill * { visibility: visible; }
          .print-bill {
            position: absolute;
            left: 0;
            top: 0;
            padding: 4mm;
            font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
            color: #000;
            background: #fff;
          }
          .bill-58 { width: 58mm; }
          .bill-80 { width: 80mm; }
          .bill-a4 { width: 190mm; padding: 12mm; }
          .no-print { display: none !important; }
          .avoid-break { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>
    </div>
  )
}
