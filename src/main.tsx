import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import { StatusBar, Style } from '@capacitor/status-bar'
import { AuthProvider } from './auth/AuthProvider'
import { SyncProvider } from './drive/SyncProvider'
import App from './App.tsx'

// Configure native status bar (no overlay, light content over dark bg)
StatusBar.setOverlaysWebView({ overlay: false }).catch(()=>{})
StatusBar.setStyle({ style: Style.Light }).catch(()=>{})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <SyncProvider>
          <App />
        </SyncProvider>
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)
