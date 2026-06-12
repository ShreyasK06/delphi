import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ProfileProvider, useProfile } from './hooks/useProfile'
import { ThemeProvider } from './hooks/useTheme'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Onboarding from './pages/Onboarding'
import Dashboard from './pages/Dashboard'
import Budget from './pages/Budget'
import DebtPlanner from './pages/DebtPlanner'
import Goals from './pages/Goals'
import Invest from './pages/Invest'
import ExtraCash from './pages/ExtraCash'
import Discounts from './pages/Discounts'
import Coach from './pages/Coach'

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-canvas">
      <div className="w-8 h-8 rounded-full border-2 border-brand border-t-transparent animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/" replace />
  return <>{children}</>
}

function RequireProfile({ children }: { children: React.ReactNode }) {
  const { state } = useProfile()
  if (!state) return <Navigate to="/onboarding" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProfileProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route
              path="/onboarding"
              element={
                <RequireAuth>
                  <Onboarding />
                </RequireAuth>
              }
            />
            <Route
              element={
                <RequireAuth>
                  <RequireProfile>
                    <Layout />
                  </RequireProfile>
                </RequireAuth>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/budget" element={<Budget />} />
              <Route path="/debt" element={<DebtPlanner />} />
              <Route path="/goals" element={<Goals />} />
              <Route path="/invest" element={<Invest />} />
              <Route path="/extra-cash" element={<ExtraCash />} />
              <Route path="/windfall" element={<Navigate to="/extra-cash" replace />} />
              <Route path="/discounts" element={<Discounts />} />
              <Route path="/coach" element={<Coach />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </ProfileProvider>
      </AuthProvider>
    </ThemeProvider>
  )
}
