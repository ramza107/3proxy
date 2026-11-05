import type { SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient | null | undefined

/** Service-role client for privileged Auth / DB ops. Null when not configured. */
export async function getSupabaseAdmin(): Promise<SupabaseClient | null> {
  if (cached !== undefined) return cached
  const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !key || key.includes('your_supabase')) {
    cached = null
    return null
  }
  const { createClient } = await import('@supabase/supabase-js')
  cached = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return cached
}
