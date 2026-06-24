import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'
import { initObservability } from './lib/observability'
import { initSupabase } from './lib/supabase'
import { hydrateProgramsFromSupabase } from './lib/programs'
import { hydrateCohortsFromSupabase } from './lib/cohortAdmin'
import { hydrateResourcesFromSupabase } from './lib/resources'
import { hydrateFeedbacksFromSupabase } from './lib/feedbacks'

const queryClient = new QueryClient()

// Fire-and-forget — observability init shouldn't block app render.
// When VITE_SENTRY_DSN / VITE_POSTHOG_KEY are unset (today), this no-ops.
initObservability();

// Fire-and-forget — Supabase client init runs early so the SDK can consume
// any `#access_token` URL hash from a magic-link landing BEFORE the app
// tree mounts. When VITE_SUPABASE_URL is unset, this no-ops.
initSupabase().then(async () => {
  // After the client is up, pull domain data from Supabase and merge into
  // the local overlays. Programs hydrate first because cohort hydration
  // resolves cohort.program_id (UUID) via the programs lookup map.
  // No-ops when Supabase is disabled.
  await hydrateProgramsFromSupabase();
  await hydrateCohortsFromSupabase();
  await hydrateResourcesFromSupabase();
  await hydrateFeedbacksFromSupabase();
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
