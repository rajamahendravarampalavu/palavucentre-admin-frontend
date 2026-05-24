import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import ScrollToTop from './components/ScrollToTop.tsx'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminLogin from './pages/admin/AdminLogin'
import { ADMIN_DASHBOARD_PATH, ADMIN_LOGIN_PATH } from './lib/admin-routing'

export default function AdminApp() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Navigate to={ADMIN_LOGIN_PATH} replace />} />
        <Route path={ADMIN_LOGIN_PATH} element={<AdminLogin />} />
        <Route path={ADMIN_DASHBOARD_PATH} element={<AdminDashboard />} />
        <Route path="/admin/menu" element={<AdminDashboard initialTab="menu" />} />
        <Route path="/admin/categories" element={<AdminDashboard initialTab="categories" />} />
        <Route path="/admin/orders-print" element={<AdminDashboard initialTab="orders-print" />} />
        <Route path="/admin/print-monitor" element={<AdminDashboard initialTab="orders-print" />} />
        <Route path="/admin/print-settings" element={<AdminDashboard initialTab="print-settings" />} />
        <Route path="/admin/kitchen" element={<Navigate to="/admin/print-monitor" replace />} />
        <Route path="/admin/print-station" element={<Navigate to="/admin/print-monitor" replace />} />
        <Route path="*" element={<Navigate to={ADMIN_LOGIN_PATH} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
