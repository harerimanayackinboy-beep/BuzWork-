import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './auth'
import { I18nProvider } from './i18n'
import './styles.css'
import { initTheme } from './lib/theme'

initTheme()

createRoot(document.getElementById('root')).render(
  <HashRouter>
    <I18nProvider>
      <AuthProvider>
        <App />
      </AuthProvider>
    </I18nProvider>
  </HashRouter>
)
