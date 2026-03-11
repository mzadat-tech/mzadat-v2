import { createClient } from '@supabase/supabase-js'
import { env } from './env.js'

// Service role client — bypasses RLS (for API server-side operations)
export const supabaseAdmin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  },
)
