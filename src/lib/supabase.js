import { createClient } from '@supabase/supabase-js'

export const SB_URL = 'https://pfqveujmopssenkapjrw.supabase.co'
export const SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmcXZldWptb3Bzc2Vua2FwanJ3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5ODI4NzksImV4cCI6MjA4OTU1ODg3OX0.D-xAJPGb_NF9XfCJQlc0391mjh0grcleglMPc9VhGRE'

export const sb = createClient(SB_URL, SB_KEY)
