import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { applyTheme } from './lib/theme.js'
import { loadSettings } from './lib/persistence.js'

// Apply the saved theme before first render. App.jsx also does this in an
// effect, but the error boundary can render INSTEAD of App — if App's own
// module or first render throws, that effect never runs, and the boundary
// would otherwise paint with whatever the theme defaults happened to be.
try { applyTheme(loadSettings().appearance, null) } catch { /* fall back to defaults */ }

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

// Only register in production builds — in dev, the SW's fetch handler would
// intercept Vite's own module/HMR requests and break live reload.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
