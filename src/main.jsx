import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'
import { initObservability } from './lib/observability'

const queryClient = new QueryClient()

// Fire-and-forget — observability init shouldn't block app render.
// When VITE_SENTRY_DSN / VITE_POSTHOG_KEY are unset (today), this no-ops.
initObservability();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
