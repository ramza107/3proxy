import { getSupabase, isSupabaseConfigured } from './supabase'
import { useNovaStore } from './store'

const META_KEY = 'onboarding_complete'

function metaFlag(meta: Record<string, unknown> | undefined | null): boolean {
  if (!meta) return false
  return meta[META_KEY] === true || meta.onboardingComplete === true
}

/** Apply remote onboarding + name into local settings (after login / session restore). */
export function hydrateOnboardingFromUser(user: {
  user_metadata?: Record<string, unknown> | null
}) {
  const meta = user.user_metadata || {}
  const patch: { onboardingComplete?: boolean; name?: string } = {}

  if (metaFlag(meta)) {
    patch.onboardingComplete = true
  }

  const name =
    (typeof meta.name === 'string' && meta.name.trim()) ||
    (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
    (typeof meta.given_name === 'string' && meta.given_name.trim()) ||
    ''
  if (name) patch.name = name

  if (Object.keys(patch).length) {
    useNovaStore.getState().updateSettings(patch)
  }
}

/** Persist onboarding completion so logout → login skips Welcome. */
export async function persistOnboardingComplete() {
  useNovaStore.getState().updateSettings({ onboardingComplete: true })
  if (!isSupabaseConfigured) return
  const supabase = getSupabase()
  if (!supabase) return
  try {
    const name = useNovaStore.getState().settings.name || null
    await supabase.auth.updateUser({
      data: {
        [META_KEY]: true,
        ...(name ? { name } : {}),
      },
    })
  } catch {
    // Offline / auth optional — local flag still set
  }
}
