import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { createApiClient } from '@project/sdk'
import { queryClient } from './lib/queryClient'
import { ToastRegion } from './components/patterns/Toast'
import { App } from './App'
import './styles/index.css'

createApiClient({ baseUrl: import.meta.env.VITE_API_URL ?? '/api' })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <ToastRegion />
    </QueryClientProvider>
  </React.StrictMode>,
)
