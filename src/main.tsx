import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { I18nextProvider } from 'react-i18next'
import './index.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary'
import i18n from './i18n'
import { initializeTheme } from './theme/theme'

initializeTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </I18nextProvider>
  </StrictMode>,
)
