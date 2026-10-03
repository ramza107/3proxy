export type GoogleConnection = {
  userId: string
  provider: 'google'
  email: string
  accessToken: string
  refreshToken: string
  expiryDate: number | null
  updatedAt: string
}

/** In-memory fallback when Supabase service role is not configured. */
const memory = new Map<string, GoogleConnection>()

export async function getConnection(userId: string): Promise<GoogleConnection | null> {
  const fromDb = await getFromSupabase(userId)
  if (fromDb) return fromDb
  return memory.get(userId) || null
}

export async function saveConnection(conn: GoogleConnection): Promise<void> {
  memory.set(conn.userId, conn)
  await saveToSupabase(conn)
}

export async function deleteConnection(userId: string): Promise<void> {
  memory.delete(userId)
  await deleteFromSupabase(userId)
}

async function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url || !key || key.includes('your_supabase')) return null
  const { createClient } = await import('@supabase/supabase-js')
  return createClient(url, key, { auth: { persistSession: false } })
}

async function getFromSupabase(userId: string): Promise<GoogleConnection | null> {
  try {
    const sb = await getSupabaseAdmin()
    if (!sb) return null
    // Table name kept for existing deployments (tokens are calendar-only now).
    const { data, error } = await sb
      .from('email_connections')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()
    if (error || !data) return null
    return {
      userId: data.user_id,
      provider: 'google',
      email: data.email,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiryDate: data.expiry_date ? Number(data.expiry_date) : null,
      updatedAt: data.updated_at,
    }
  } catch {
    return null
  }
}

async function saveToSupabase(conn: GoogleConnection): Promise<void> {
  try {
    const sb = await getSupabaseAdmin()
    if (!sb) return
    await sb.from('email_connections').upsert(
      {
        user_id: conn.userId,
        provider: 'google',
        email: conn.email,
        access_token: conn.accessToken,
        refresh_token: conn.refreshToken,
        expiry_date: conn.expiryDate,
        updated_at: conn.updatedAt,
      },
      { onConflict: 'user_id' },
    )
  } catch (e) {
    console.warn('google_connections upsert skipped:', e)
  }
}

async function deleteFromSupabase(userId: string): Promise<void> {
  try {
    const sb = await getSupabaseAdmin()
    if (!sb) return
    await sb.from('email_connections').delete().eq('user_id', userId)
  } catch {
    // ignore
  }
}
