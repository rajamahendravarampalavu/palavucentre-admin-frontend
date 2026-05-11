import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

import AdminDashboard from './pages/admin/AdminDashboard'
import AdminLogin from './pages/admin/AdminLogin'
import { ADMIN_DASHBOARD_PATH, ADMIN_LOGIN_PATH } from './lib/admin-routing'

export default function AdminApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to={ADMIN_LOGIN_PATH} replace />} />
        <Route path={ADMIN_LOGIN_PATH} element={<AdminLogin />} />
        <Route path={ADMIN_DASHBOARD_PATH} element={<AdminDashboard />} />
        <Route path="*" element={<Navigate to={ADMIN_LOGIN_PATH} replace />} />
      </Routes>
    </BrowserRouter>
  )
}
