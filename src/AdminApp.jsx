import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import ScrollToTop from './components/ScrollToTop.tsx'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminLogin from './pages/admin/AdminLogin'
import KitchenDisplay from './pages/admin/KitchenDisplay'
import { ADMIN_DASHBOARD_PATH, ADMIN_LOGIN_PATH } from './lib/admin-routing'

export default function AdminApp() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Navigate to={ADMIN_LOGIN_PATH} replace />} />
        <Route path={ADMIN_LOGIN_PATH} element={<AdminLogin />} />
        <Route path={ADMIN_DASHBOARD_PATH} element={<AdminDashboard />} />
        <Route path="/admin/kitchen" element={<KitchenDisplay />} />
        <Route path="*" element={<Navigate to={ADMIN_LOGIN_PATH} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
