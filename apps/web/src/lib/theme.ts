import { useSyncExternalStore } from 'react'

type Theme = 'light' | 'dark'
const KEY = 'riverly.theme'
const listeners = new Set<() => void>()

function read(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* storage unavailable — theme still applies for this session */
  }
  listeners.forEach((l) => l())
}

export function useTheme() {
  const theme = useSyncExternalStore((cb) => {
    listeners.add(cb)
    return () => listeners.delete(cb)
  }, read)
  return { theme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') }
}
