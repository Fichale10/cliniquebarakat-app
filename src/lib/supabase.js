import { createClient } from '@supabase/supabase-js'

const SB_URL = import.meta.env.VITE_SUPABASE_URL
const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SB_URL || !SB_KEY) {
  throw new Error('Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY manquantes dans .env')
}

export const sb = createClient(SB_URL, SB_KEY)
