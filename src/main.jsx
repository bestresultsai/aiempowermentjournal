import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'
import { initObservability } from './lib/observability'
import { initSupabase } from './lib/supabase'

const queryClient = new QueryClient()

// Fire-and-forget — observability init shouldn't block app render.
// When VITE_SENTRY_DSN / VITE_POSTHOG_KEY are unset (today), this no-ops.
initObservability();

// Fire-and-forget — Supabase client init runs early so the SDK can consume
// any `#access_token` URL hash from a magic-link landing BEFORE the app
// tree mounts. When VITE_SUPABASE_URL is unset, this no-ops.
initSupabase();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
