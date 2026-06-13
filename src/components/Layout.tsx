import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useTheme, type Theme } from '../hooks/useTheme'
import CoachWidget from './CoachWidget'
import {
  HomeIcon,
  WalletIcon,
  TrendDownIcon,
  TargetIcon,
  TrendUpIcon,
  GiftIcon,
  TagIcon,
  CreditCardIcon,
  BookOpenIcon,
  ChatIcon,
  LogoutIcon,
  SunIcon,
  MoonIcon,
  MonitorIcon,
  ChartLineIcon,
} from './icons'

const navItems = [
  { to: '/dashboard', label: 'Dashboard', Icon: HomeIcon },
  { to: '/budget', label: 'Budget', Icon: WalletIcon },
  { to: '/debt', label: 'Debt Planner', Icon: TrendDownIcon },
  { to: '/goals', label: 'Goals', Icon: TargetIcon },
  { to: '/invest', label: 'Invest', Icon: TrendUpIcon },
  { to: '/portfolio', label: 'Portfolio', Icon: ChartLineIcon },
  { to: '/extra-cash', label: 'Extra Cash', Icon: GiftIcon },
  { to: '/discounts', label: 'Discounts', Icon: TagIcon },
  { to: '/credit-cards', label: 'Credit Cards', Icon: CreditCardIcon },
  { to: '/learn', label: 'Learn', Icon: BookOpenIcon },
  { to: '/coach', label: 'Coach', Icon: ChatIcon },
]

const themeMeta: Record<Theme, { Icon: typeof SunIcon; label: string }> = {
  system: { Icon: MonitorIcon, label: 'Theme: system' },
  light: { Icon: SunIcon, label: 'Theme: light' },
  dark: { Icon: MoonIcon, label: 'Theme: dark' },
}

function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, cycle } = useTheme()
  const { Icon, label } = themeMeta[theme]
  return (
    <button
      type="button"
      onClick={cycle}
      title={label}
      aria-label={label}
      className={`flex items-center gap-2 rounded-lg text-emerald-100/60 hover:text-white hover:bg-white/10 transition-colors ${
        compact ? 'p-1.5' : 'px-3 py-2 text-xs font-medium w-full'
      }`}
    >
      <Icon className="w-4 h-4" />
      {!compact && <span>{label}</span>}
    </button>
  )
}

function Wordmark({ size = 'lg' }: { size?: 'lg' | 'sm' }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center font-black text-white ${
          size === 'lg' ? 'w-9 h-9 text-lg' : 'w-7 h-7 text-sm'
        }`}
      >
        d
      </div>
      <span className={`font-display font-bold tracking-tight text-white ${size === 'lg' ? 'text-lg' : ''}`}>
        delphi<span className="text-emerald-400">.</span>
      </span>
    </div>
  )
}

function BackToTop() {
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  if (!visible) return null
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className="fixed bottom-24 right-6 z-50 flex items-center gap-1.5 rounded-full bg-surface border border-line-strong shadow-lg px-4 py-2 text-xs font-medium text-ink-mid hover:border-brand hover:text-brand transition-colors"
    >
      ↑ Top
    </button>
  )
}

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('delphi_sidebar_collapsed') === '1'
    } catch {
      return false
    }
  })
  const toggleSidebar = () =>
    setCollapsed((c) => {
      const next = !c
      try {
        localStorage.setItem('delphi_sidebar_collapsed', next ? '1' : '0')
      } catch {
        // ignore storage errors
      }
      return next
    })

  const onLogout = async () => {
    await logout()
    navigate('/')
  }

  const [syncError, setSyncError] = useState(false)

  useEffect(() => {
    const handler = () => {
      setSyncError(true)
      setTimeout(() => setSyncError(false), 4000)
    }
    window.addEventListener('delphi:sync-error', handler)
    return () => window.removeEventListener('delphi:sync-error', handler)
  }, [])

  return (
    <div className="min-h-screen relative">
      {/* static ambient tint so the glass sidebar has something to blur */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-canvas">
        <div className="absolute -top-32 -left-24 w-[30rem] h-[30rem] rounded-full bg-brand-line/40 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[26rem] h-[26rem] rounded-full bg-brand-soft blur-3xl" />
      </div>

      {/* floating translucent sidebar (desktop), always-dark brand chrome */}
      <aside
        className={`hidden md:flex flex-col fixed left-4 top-4 bottom-4 rounded-3xl bg-[#04231c]/80 backdrop-blur-xl border border-white/10 shadow-2xl shadow-emerald-950/30 text-white z-40 overflow-hidden transition-[width] duration-200 ${
          collapsed ? 'w-[4.5rem]' : 'w-60'
        }`}
      >
        <div className={`border-b border-white/10 ${collapsed ? 'px-3 py-4 flex justify-center' : 'px-5 py-5'}`}>
          {collapsed ? (
            <button
              type="button"
              onClick={toggleSidebar}
              title="Expand sidebar"
              aria-label="Expand sidebar"
              aria-expanded={false}
              className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center font-black text-white text-lg hover:scale-105 transition-transform"
            >
              d
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={toggleSidebar}
                  title="Collapse sidebar"
                  aria-label="Collapse sidebar"
                  aria-expanded={true}
                  className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center font-black text-white text-lg hover:scale-105 transition-transform shrink-0"
                >
                  d
                </button>
                <span className="font-display font-bold tracking-tight text-white text-lg">
                  delphi<span className="text-emerald-400">.</span>
                </span>
              </div>
              <div className="mt-1.5 text-[11px] text-emerald-100/50">money, decoded for college</div>
            </>
          )}
        </div>
        <nav className="flex flex-col px-3 py-3 gap-1 flex-1">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                `flex items-center rounded-xl py-2.5 text-sm transition-colors ${
                  collapsed ? 'justify-center px-0' : 'gap-3 px-3.5'
                } ${
                  isActive
                    ? 'bg-white/15 text-white font-semibold'
                    : 'text-emerald-100/70 hover:bg-white/8 hover:text-white'
                }`
              }
            >
              <Icon />
              {!collapsed && label}
            </NavLink>
          ))}
        </nav>
        <div className={`pb-4 ${collapsed ? 'px-2 flex flex-col items-center gap-2' : 'px-3 space-y-2'}`}>
          <ThemeToggle compact={collapsed} />
          {collapsed ? (
            <>
              <div
                title={user?.name}
                className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-xs font-bold uppercase"
              >
                {user?.name?.[0] ?? '?'}
              </div>
              <button
                type="button"
                onClick={onLogout}
                aria-label="Log out"
                title="Log out"
                className="text-emerald-100/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <LogoutIcon />
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2.5 rounded-xl bg-white/5 border border-white/10 px-3 py-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-xs font-bold uppercase shrink-0">
                  {user?.name?.[0] ?? '?'}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold truncate">{user?.name}</div>
                  <div className="text-[11px] text-emerald-100/50 truncate">{user?.email}</div>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  aria-label="Log out"
                  className="text-emerald-100/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors shrink-0"
                >
                  <LogoutIcon />
                </button>
              </div>
              <p className="px-1 text-[10px] text-emerald-100/40 leading-snug">
                Educational tool, not a licensed advisor. Your data stays private to your account.
              </p>
            </>
          )}
        </div>
      </aside>

      {/* mobile top bar */}
      <header className="md:hidden sticky top-0 z-40 bg-[#04231c]/85 backdrop-blur-xl border-b border-white/10 text-white">
        <div className="flex items-center justify-between px-4 py-3">
          <Wordmark size="sm" />
          <div className="flex items-center gap-1">
            <ThemeToggle compact />
            <button type="button" onClick={onLogout} aria-label="Log out" className="text-emerald-100/60 hover:text-white p-1.5">
              <LogoutIcon />
            </button>
          </div>
        </div>
        <nav className="flex overflow-x-auto px-2 pb-2 gap-1">
          {navItems.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs whitespace-nowrap transition-colors ${
                  isActive ? 'bg-white/15 text-white font-semibold' : 'text-emerald-100/70 hover:bg-white/8'
                }`
              }
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main
        className={`px-4 md:px-8 py-6 transition-[margin] duration-200 ${
          collapsed ? 'md:ml-[6rem]' : 'md:ml-[17rem]'
        }`}
      >
        <Outlet />
        <p className="mt-10 text-xs text-ink-faint text-center pb-6">
          delphi is an educational tool, not a licensed financial advisor.
        </p>
      </main>

      <CoachWidget />
      <BackToTop />
      {syncError && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed bottom-36 right-6 z-50 flex items-center gap-2 rounded-xl bg-surface border border-[var(--color-warn)] shadow-lg px-4 py-3 text-sm text-ink animate-pop"
        >
          <span style={{ color: 'var(--color-warn)' }}>⚠</span>
          Sync failed. Changes saved locally.
        </div>
      )}
    </div>
  )
}
