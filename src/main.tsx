import './polyfills';
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@mysten/dapp-kit/dist/index.css'
import App from './App.tsx'
import { SuiWalletContextProvider } from './contexts/SuiWalletContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SuiWalletContextProvider>
      <App />
    </SuiWalletContextProvider>
  </StrictMode>,
)
