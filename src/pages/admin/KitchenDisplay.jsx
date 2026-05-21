import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { API_BASE_URL } from '../../shared/api/api-config'
import { adminApi } from '../../api/adminApi'
import { playNotificationSound, requestNotificationPermission, showBrowserNotification } from '../../shared/notifications'

const WS_URL = (() => {
  const base = API_BASE_URL
  // Remove /api suffix to get the server root
  if (base.startsWith('http')) return base.replace(/\/api\/?$/, '')
  // If relative, use current origin
  return window.location.origin
})()

function formatCurrency(amount) {
  return `₹${Number(amount || 0).toFixed(2)}`
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function BillPrint({ order, onClose }) {
  const printRef = useRef(null)

  if (!order) return null

  const customerName = order.customer?.name || order.customerName || 'Guest'
  const customerPhone = order.customer?.phone || order.phone || ''
  const items = order.items || []
  const pricing = order.pricing || {}
  const orderNumber = order.orderNumber || ''
  const storeLocation = order.storeLocation || ''
  const paymentMethod = order.paymentMethod || 'cod'
  const paymentStatus = order.paymentStatus || 'unpaid'
  const createdAt = order.createdAt || new Date().toISOString()

  return (
    <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-[400px] w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 border-b flex justify-between items-center no-print">
          <h3 className="font-bold text-lg text-red-600">Print Bill</h3>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">Print</button>
            <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg text-sm font-medium">Close</button>
          </div>
        </div>

        {/* Printable Bill */}
        <div ref={printRef} className="p-6 print-bill" style={{ fontFamily: 'monospace', fontSize: '12px', color: '#000' }}>
          <div className="text-center mb-4">
            <h2 className="text-base font-bold text-black">RajaMahendravaram Palavu Centre</h2>
            <p className="text-xs text-gray-600">Order Receipt</p>
          </div>

          <div className="border-t border-dashed border-gray-400 my-2" />

          <div className="space-y-1 text-xs text-black">
            <div className="flex justify-between"><span>Order #:</span><span className="font-bold">{orderNumber}</span></div>
            <div className="flex justify-between"><span>Date:</span><span>{new Date(createdAt).toLocaleDateString('en-IN')} {formatTime(createdAt)}</span></div>
            <div className="flex justify-between"><span>Customer:</span><span>{customerName}</span></div>
            <div className="flex justify-between"><span>Phone:</span><span>{customerPhone}</span></div>
            {storeLocation && <div className="flex justify-between"><span>Branch:</span><span className="capitalize">{storeLocation}</span></div>}
            <div className="flex justify-between"><span>Payment:</span><span className="capitalize">{paymentMethod} ({paymentStatus})</span></div>
          </div>

          <div className="border-t border-dashed border-gray-400 my-3" />

          <table className="w-full text-xs text-black">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="text-left py-1">Item</th>
                <th className="text-center py-1">Qty</th>
                <th className="text-right py-1">Amt</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-1">{item.name || item.itemName}</td>
                  <td className="text-center py-1">{item.quantity}</td>
                  <td className="text-right py-1">{formatCurrency(item.total || item.unitPrice * item.quantity || 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t border-dashed border-gray-400 my-3" />

          <div className="text-xs space-y-1 text-black">
            <div className="flex justify-between"><span>Subtotal:</span><span>{formatCurrency(pricing.subTotal || 0)}</span></div>
            {pricing.discountAmount > 0 && <div className="flex justify-between"><span>Discount:</span><span>-{formatCurrency(pricing.discountAmount)}</span></div>}
            <div className="flex justify-between"><span>Tax:</span><span>{formatCurrency(pricing.taxAmount || 0)}</span></div>
            <div className="flex justify-between font-bold text-sm border-t border-gray-300 pt-1 mt-1">
              <span>TOTAL:</span><span>{formatCurrency(pricing.grandTotal || 0)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-400 my-3" />

          <div className="text-center text-xs text-gray-500">
            <p>Thank you for your order!</p>
            <p>Ph: 9966655997</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function KitchenDisplay() {
  const [orders, setOrders] = useState([])
  const [connected, setConnected] = useState(false)
  const [printOrder, setPrintOrder] = useState(null)
  const [printQueue, setPrintQueue] = useState([])
  const socketRef = useRef(null)
  const audioUnlocked = useRef(false)

  // Unlock audio on first user interaction
  const unlockAudio = () => {
    if (!audioUnlocked.current) {
      audioUnlocked.current = true
      requestNotificationPermission()
    }
  }

  // Fetch recent orders
  const fetchOrders = async () => {
    try {
      const res = await adminApi.getOrders({ page: 1, limit: 20 })
      setOrders(res.data?.items || [])
    } catch (e) {
      console.error('Failed to fetch orders', e)
    }
  }

  useEffect(() => {
    fetchOrders()

    // Connect WebSocket
    const socket = io(WS_URL, { path: '/ws/', transports: ['websocket', 'polling'], withCredentials: true })

    socket.on('connect', () => {
      setConnected(true)
      socket.emit('join-admin')
    })

    socket.on('disconnect', () => setConnected(false))

    socket.on('new-order', (data) => {
      // Play sound
      playNotificationSound()
      showBrowserNotification('🛒 New Order!', `Order ${data?.orderNumber || ''} received`)

      // Refresh orders then auto-print newest
      adminApi.getOrders({ page: 1, limit: 20 }).then((res) => {
        const items = res.data?.items || []
        setOrders(items)
        // Auto-print the newest order immediately
        if (items.length > 0 && items[0].orderStatus === 'pending') {
          setPrintOrder(items[0])
        }
      }).catch(() => fetchOrders())
    })

    socket.on('order-updated', () => {
      fetchOrders()
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
    }
  }, [])

  // Process print queue one by one
  useEffect(() => {
    if (!printOrder && printQueue.length > 0) {
      setPrintOrder(printQueue[0])
      setPrintQueue((q) => q.slice(1))
    }
  }, [printOrder, printQueue])

  return (
    <div className="min-h-screen bg-gray-900 text-white" onClick={unlockAudio}>
      {/* Header */}
      <div className="sticky top-0 z-50 bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-amber-400">🍳 Kitchen Display</h1>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
              {connected ? '● Live' : '● Offline'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchOrders} className="px-3 py-1.5 bg-gray-700 rounded-lg text-sm hover:bg-gray-600">Refresh</button>
            <button onClick={() => playNotificationSound()} className="px-3 py-1.5 bg-amber-600 rounded-lg text-sm hover:bg-amber-500">Test Sound</button>
          </div>
        </div>
      </div>

      {/* Orders Grid */}
      <div className="max-w-6xl mx-auto p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {orders.map((order) => {
            const isPending = order.orderStatus === 'pending'
            const isNew = Date.now() - new Date(order.createdAt).getTime() < 300000 // 5 min

            return (
              <div
                key={order.id}
                className={`rounded-xl border p-4 transition ${
                  isPending && isNew
                    ? 'border-amber-500 bg-amber-500/10 animate-pulse'
                    : isPending
                    ? 'border-amber-500/50 bg-gray-800'
                    : 'border-gray-700 bg-gray-800'
                }`}
              >
                {/* Order Header */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-amber-400 font-mono text-sm font-bold">{order.orderNumber}</p>
                    <p className="text-gray-400 text-xs mt-0.5">{formatTime(order.createdAt)}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      order.orderStatus === 'pending' ? 'bg-amber-500/20 text-amber-400' :
                      order.orderStatus === 'preparing' ? 'bg-blue-500/20 text-blue-400' :
                      order.orderStatus === 'ready' ? 'bg-green-500/20 text-green-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>{order.orderStatus}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      order.paymentStatus === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>{order.paymentStatus}</span>
                  </div>
                </div>

                {/* Customer */}
                <div className="mb-3 text-sm">
                  <p className="font-semibold text-white">{order.customer?.name}</p>
                  <p className="text-gray-400 text-xs">{order.customer?.phone}</p>
                  {order.storeLocation && <p className="text-amber-400/70 text-xs capitalize mt-0.5">📍 {order.storeLocation}</p>}
                </div>

                {/* Items */}
                <div className="border-t border-gray-700 pt-2 mb-3">
                  {(order.items || []).map((item, i) => (
                    <div key={i} className="flex justify-between text-sm py-0.5">
                      <span className="text-gray-300">{item.quantity}x {item.name}</span>
                      <span className="text-gray-400">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>

                {/* Total + Print */}
                <div className="flex justify-between items-center border-t border-gray-700 pt-2">
                  <span className="text-lg font-bold text-amber-400">{formatCurrency(order.pricing?.grandTotal)}</span>
                  <button
                    onClick={() => setPrintOrder(order)}
                    className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-xs font-medium hover:bg-white/20 transition"
                  >
                    🖨️ Print Bill
                  </button>
                </div>
              </div>
            )
          })}

          {orders.length === 0 && (
            <div className="col-span-full text-center py-20 text-gray-500">
              <p className="text-4xl mb-4">🍽️</p>
              <p className="text-lg">No orders yet</p>
              <p className="text-sm mt-1">New orders will appear here with sound alerts</p>
            </div>
          )}
        </div>
      </div>

      {/* Print Modal */}
      {printOrder && <BillPrint order={printOrder} onClose={() => setPrintOrder(null)} />}

      {/* Print Styles */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-bill, .print-bill * { visibility: visible; }
          .print-bill { position: absolute; left: 0; top: 0; width: 80mm; padding: 4mm; }
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  )
}
