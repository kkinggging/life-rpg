import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// FIX: Removed outer <StoreProvider> — App.tsx already wraps <AppInner> in its own <StoreProvider>.
// Having two StoreProviders created two independent store instances sharing the same localStorage key,
// causing the orphaned outer store to potentially overwrite the inner store's state on every render.
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
