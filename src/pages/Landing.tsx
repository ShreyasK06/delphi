import { useRef, useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

const FEATURES = [
  'Budget Builder',
  'Debt Payoff Planner',
  'Financial Health Score',
  'Investing 101',
  'Savings Goals',
  'Extra Cash Advisor',
  'Student Discounts',
  'Coach Chat',
]

function FloatingCard({
  className,
  parallax,
  px,
  py,
  children,
}: {
  className: string
  parallax: { x: number; y: number }
  px: number
  py: number
  children: React.ReactNode
}) {
  return (
    <div
      className={`absolute rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-xl px-4 py-3 ${className}`}
      style={{ transform: `translate3d(${parallax.x * px}px, ${parallax.y * py}px, 0)` }}
    >
      {children}
    </div>
  )
}

function AuthCard() {
  const navigate = useNavigate()
  const { login, signup } = useAuth()
  const [mode, setMode] = useState<'signup' | 'login'>('signup')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setNotice(null)
    const result = mode === 'signup' ? await signup(name, email, password) : await login(email, password)
    setSubmitting(false)
    if (result === 'CONFIRM_EMAIL') {
      setError(null)
      setNotice(`Check your email - we sent a confirmation link to ${email}. Click it, then log in here.`)
      return
    }
    // Map Supabase's unconfirmed-email error to friendlier copy
    const mappedError = result === 'Email not confirmed'
      ? "You haven't confirmed your email yet. Check your inbox for the link we sent."
      : result
    setError(mappedError)
    if (!mappedError) navigate('/dashboard')
  }

  const inputCls =
    'w-full rounded-xl bg-white/10 border border-white/15 px-4 py-3 text-sm text-white placeholder-emerald-100/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white/15 transition-colors'

  return (
    <div className="w-full max-w-md rounded-3xl bg-white/8 backdrop-blur-xl border border-white/15 shadow-2xl p-8 animate-pop" style={{ animationDelay: '0.15s' }}>
      <div className="flex rounded-xl bg-white/10 p-1">
        {(['signup', 'login'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setError(null) }}
            className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
              mode === m ? 'bg-white text-emerald-950' : 'text-emerald-100/80 hover:text-white'
            }`}
          >
            {m === 'signup' ? 'Create account' : 'Log in'}
          </button>
        ))}
      </div>

      <h2 className="mt-5 text-xl font-bold text-white">
        {mode === 'signup' ? 'Get your money score in 2 minutes' : 'Welcome back'}
      </h2>
      <p className="mt-1 text-sm text-emerald-100/60">
        {mode === 'signup'
          ? 'Free forever. No bank logins. Your data is stored securely in your account, never sold or shared.'
          : 'Your coach kept your seat warm.'}
      </p>

      <form onSubmit={submit} className="mt-5 space-y-3">
        {mode === 'signup' && (
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="First name" autoComplete="given-name" className={inputCls} />
        )}
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="School email (any email works)" autoComplete="email" className={inputCls} />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          className={inputCls}
        />
        {notice && (
          <p className="text-sm text-emerald-200 bg-emerald-500/10 border border-emerald-400/20 rounded-lg px-3 py-2">{notice}</p>
        )}
        {error && (
          <p className="text-sm text-rose-300 bg-rose-500/10 border border-rose-400/20 rounded-lg px-3 py-2">{error}</p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-emerald-500 py-3 text-sm font-bold text-emerald-950 hover:bg-emerald-400 hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {submitting ? 'One moment...' : mode === 'signup' ? 'Start free' : 'Log in'}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-emerald-100/50">
        {mode === 'signup' ? (
          <>Already here? <button type="button" onClick={() => setMode('login')} className="font-semibold text-white hover:underline">Log in</button></>
        ) : (
          <>New here? <button type="button" onClick={() => setMode('signup')} className="font-semibold text-white hover:underline">Create a free account</button></>
        )}
      </p>
    </div>
  )
}

export default function Landing() {
  const { user } = useAuth()
  const heroRef = useRef<HTMLDivElement>(null)
  const [parallax, setParallax] = useState({ x: 0, y: 0 })

  if (user) return <Navigate to="/dashboard" replace />

  const onMouseMove = (e: React.MouseEvent) => {
    const rect = heroRef.current?.getBoundingClientRect()
    if (!rect) return
    setParallax({
      x: (e.clientX - rect.left) / rect.width - 0.5,
      y: (e.clientY - rect.top) / rect.height - 0.5,
    })
  }

  return (
    <div
      ref={heroRef}
      onMouseMove={onMouseMove}
      className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#03201a] via-[#04231c] to-[#06302a] flex flex-col"
    >
      {/* drifting ambient blobs (landing page is the one place looping motion is allowed) */}
      <div className="pointer-events-none absolute -top-32 -left-32 w-[34rem] h-[34rem] rounded-full bg-emerald-500/15 blur-3xl animate-blob" />
      <div className="pointer-events-none absolute top-1/3 -right-40 w-[30rem] h-[30rem] rounded-full bg-teal-400/10 blur-3xl animate-blob-slow" />
      <div className="pointer-events-none absolute -bottom-40 left-1/3 w-[28rem] h-[28rem] rounded-full bg-emerald-300/10 blur-3xl animate-blob" style={{ animationDelay: '8s' }} />

      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-6">
        <div className="flex items-center gap-2.5">
          <img src={`${import.meta.env.BASE_URL}logo-mark.png`} alt="" className="w-9 h-9 object-contain" />
          <span className="font-display text-white font-bold text-xl tracking-tight">delphi<span className="text-emerald-400">.</span></span>
        </div>
        <span className="hidden sm:block text-xs text-emerald-100/50">money, decoded for college</span>
      </header>

      <div className="relative z-10 flex-1 grid lg:grid-cols-2 gap-10 items-center px-6 md:px-12 pb-10 max-w-7xl mx-auto w-full">
        <div className="relative">
          <div className="animate-fade-up inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3.5 py-1.5 text-xs font-medium text-emerald-100/90">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Built for college students
          </div>

          <h1 className="animate-fade-up mt-5 text-4xl md:text-6xl font-bold text-white leading-[1.05] tracking-tight" style={{ animationDelay: '0.08s' }}>
            Your money,<br />
            <span className="text-gradient">finally decoded.</span>
          </h1>

          <p className="animate-fade-up mt-5 text-base md:text-lg text-emerald-100/70 max-w-md leading-relaxed" style={{ animationDelay: '0.16s' }}>
            Budgets, debt, goals, and a coach that knows <em>your</em> numbers, not
            "skip the latte" advice. Two minutes to your Financial Health Score.
          </p>

          <div className="animate-fade-up mt-6 flex flex-wrap gap-x-3 gap-y-2 text-sm text-emerald-100/50" style={{ animationDelay: '0.24s' }}>
            <span>2-min setup</span>
            <span aria-hidden="true">·</span>
            <span>Private by default</span>
            <span aria-hidden="true">·</span>
            <span>No bank logins</span>
            <span aria-hidden="true">·</span>
            <span>Free forever</span>
          </div>

          {/* floating preview cards */}
          <div className="relative hidden md:block h-60 mt-6">
            <FloatingCard className="left-0 top-2 animate-float" parallax={parallax} px={18} py={12}>
              <div className="text-[11px] uppercase tracking-wide text-emerald-100/50">Health score</div>
              <div className="text-3xl font-display font-bold text-white">65<span className="text-sm font-medium text-emerald-100/40">/100</span></div>
              <div className="text-xs font-semibold text-emerald-300">+10 this month</div>
            </FloatingCard>
            <FloatingCard className="left-44 top-24 animate-float-delayed" parallax={parallax} px={-24} py={16}>
              <div className="text-xs text-emerald-50/90 font-medium">Spring break trip</div>
              <div className="mt-1.5 w-36 h-1.5 rounded-full bg-white/15 overflow-hidden">
                <div className="h-full w-[42%] rounded-full bg-emerald-400" />
              </div>
              <div className="mt-1 text-[11px] text-emerald-100/50">42% saved · on pace</div>
            </FloatingCard>
            <FloatingCard className="left-8 top-40 animate-float-slow" parallax={parallax} px={12} py={-14}>
              <div className="flex items-start gap-2">
                <img src={`${import.meta.env.BASE_URL}logo-mark.png`} alt="" className="w-6 h-6 rounded-full object-contain shrink-0" />
                <p className="text-xs text-emerald-50/90 max-w-[13rem] leading-snug">
                  Refund landed? Put $500 on the 22% card first. That's a guaranteed win.
                </p>
              </div>
            </FloatingCard>
          </div>
        </div>

        <div className="flex justify-center lg:justify-end">
          <AuthCard />
        </div>
      </div>

      {/* scrolling feature marquee */}
      <div className="relative z-10 border-t border-white/10 bg-white/5 backdrop-blur-sm py-3 overflow-hidden">
        <div className="flex w-max animate-marquee gap-3 px-3">
          {[...FEATURES, ...FEATURES].map((f, i) => (
            <span key={i} className="whitespace-nowrap rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-emerald-100/60">
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
