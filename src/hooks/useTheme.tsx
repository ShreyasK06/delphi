import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

export type Theme = 'system' | 'light' | 'dark'

const KEY = 'delphi_theme_v1'

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
  /** cycles system, then light, then dark */
  cycle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem(KEY)
    return saved === 'light' || saved === 'dark' ? saved : 'system'
  })

  useEffect(() => {
    // light-dark() tokens resolve against the root color-scheme, so this one line themes the app
    document.documentElement.style.colorScheme = theme === 'system' ? 'light dark' : theme
    localStorage.setItem(KEY, theme)
  }, [theme])

  const cycle = () =>
    setTheme((t) => (t === 'system' ? 'light' : t === 'light' ? 'dark' : 'system'))

  return <ThemeContext.Provider value={{ theme, setTheme, cycle }}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
