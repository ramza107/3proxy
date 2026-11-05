import { apiUrl } from './api'
import { getSupabase, isSupabaseConfigured, supabaseAnonKey, supabaseUrl } from './supabase'

/**
 * Delete the signed-in Supabase Auth user (App Store account deletion).
 * Prefer our API (service role). Fall back to Auth DELETE /user when the
 * project allows self-service deletion.
 */
export async function deleteCloudAccount(): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured) return { ok: true }

  const supabase = getSupabase()
  if (!supabase) return { ok: true }

  const { data: sessionData } = await supabase.auth.getSession()
  const accessToken = sessionData.session?.access_token
  if (!accessToken) {
    // No cloud session (demo / already signed out) — nothing to delete remotely.
    return { ok: true }
  }

  // 1) Server path (works when SUPABASE_SERVICE_ROLE_KEY is set on Render).
  try {
    const res = await fetch(`${apiUrl}/api/account/delete`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: '{}',
    })
    if (res.ok) return { ok: true }
    // Fall through if misconfigured / old deploy.
    const text = await res.text().catch(() => '')
    if (res.status !== 503 && res.status !== 404) {
      // Auth failed or delete failed — still try self-delete below.
      console.warn('account delete api', res.status, text)
    }
  } catch (e) {
    console.warn('account delete api unreachable', e)
  }

  // 2) Self-service Auth endpoint (dashboard: allow users to delete accounts).
  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/user`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: supabaseAnonKey,
      },
    })
    if (res.ok || res.status === 200) return { ok: true }
    const text = await res.text().catch(() => '')
    return { ok: false, error: text || `auth delete failed (${res.status})` }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : 'auth delete failed',
    }
  }
}
