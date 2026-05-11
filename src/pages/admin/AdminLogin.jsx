import { useEffect, useState } from 'react'
import { LockKeyhole, Mail, ShieldCheck } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

import { adminApi } from '../../api/adminApi'
import { ADMIN_DASHBOARD_PATH } from '../../lib/admin-routing'

export default function AdminLogin() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', password: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCheckingSession, setIsCheckingSession] = useState(true)
  const [error, setError] = useState('')
  const [fieldError, setFieldError] = useState('')

  useEffect(() => {
    let isMounted = true

    const checkSession = async () => {
      try {
        await adminApi.me()
        if (isMounted) {
          navigate(ADMIN_DASHBOARD_PATH, { replace: true })
        }
      } catch {
        if (isMounted) {
          setIsCheckingSession(false)
        }
      }
    }

    checkSession()

    return () => {
      isMounted = false
    }
  }, [navigate])

  const handleSubmit = async (event) => {
    event.preventDefault()

    try {
      setIsSubmitting(true)
      setError('')
      setFieldError('')

      if (!form.email.trim()) {
        setFieldError('Email is required.')
        return
      }

      await adminApi.login({
        email: form.email.trim(),
        password: form.password,
      })

      navigate(ADMIN_DASHBOARD_PATH, { replace: true })
    } catch (requestError) {
      setError(requestError.message || 'Login failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isCheckingSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f6f8fb] px-4 text-slate-600">
        Checking admin session...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f6f8fb] px-4 py-8 md:px-6 md:py-10">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-5xl items-center">
        <div className="grid w-full overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] md:grid-cols-[1.02fr_0.98fr]">
          <div className="border-b border-slate-200 bg-slate-50 p-8 md:border-b-0 md:border-r md:p-10">
            <div className="inline-flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-[11px] font-semibold uppercase tracking-[1.8px] text-slate-700">
              <ShieldCheck className="h-4 w-4" />
              Admin Access
            </div>

            <p className="mt-6 text-left text-[34px] font-semibold leading-[1.05] tracking-[-0.02em] text-slate-950 md:text-[42px]">
              PalavuCentre admin
            </p>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-slate-600">
              Orders, menu, offers, promo codes, content, and storefront settings in one workspace.
            </p>

            <div className="mt-10 grid gap-4">
              {[
                {
                  title: 'Orders and inquiries',
                  description: 'Watch live orders, update status, and keep follow-ups in one place.',
                },
                {
                  title: 'Menu and campaigns',
                  description: 'Manage dishes, gallery media, offers, and promo codes without a cluttered layout.',
                },
                {
                  title: 'Site settings',
                  description: 'Control brand content, contact details, and public storefront configuration.',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-[18px] border border-slate-200 bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                  <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {['Orders', 'Promo Codes', 'Menu', 'Gallery', 'Settings'].map((item) => (
                <span
                  key={item}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[1.6px] text-slate-600"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="bg-white p-8 md:p-10">
            <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-6">
              <p className="text-[11px] font-semibold uppercase tracking-[1.8px] text-slate-500">Admin Login</p>
              <p className="mt-3 text-[30px] font-semibold leading-none tracking-[-0.02em] text-slate-950">Sign in</p>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                Use your admin email and password to access the dashboard.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="mt-8 space-y-5">
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <label className="ml-1 text-[11px] font-semibold uppercase tracking-[1.6px] text-slate-500">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={form.email}
                    onChange={(event) => {
                      setForm((current) => ({ ...current, email: event.target.value }))
                      if (fieldError) {
                        setFieldError('')
                      }
                    }}
                    placeholder="admin@palavucentre.com"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
                  />
                </div>
                {fieldError && <p className="ml-1 text-xs text-red-600">{fieldError}</p>}
              </div>

              <div className="space-y-2">
                <label className="ml-1 text-[11px] font-semibold uppercase tracking-[1.6px] text-slate-500">Password</label>
                <div className="relative">
                  <LockKeyhole className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={form.password}
                    onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Enter admin password"
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-900 focus:ring-4 focus:ring-slate-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Signing In...' : 'Login To Dashboard'}
              </button>

              <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm leading-6 text-slate-600">
                Keep this route only for admin access. The customer website stays separate, while this panel manages
                operations and content.
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
