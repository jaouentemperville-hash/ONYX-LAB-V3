'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase/browser'

// Garde d'authentification partagée par toutes les pages ONYX.
// Redirige vers /onboarding si pas de session.
export function useAuthGuard() {
  const router = useRouter()
  const supabase = getSupabaseBrowser()
  const [userId, setUserId] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState<boolean>(false)

  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }: any) => {
      if (!mounted) return
      if (!session?.user) {
        router.replace('/onboarding')
      } else {
        setUserId(session.user.id)
      }
      setAuthChecked(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e: any, session: any) => {
      if (!session?.user) router.replace('/onboarding')
      else setUserId(session.user.id)
    })
    return () => { mounted = false; sub.subscription.unsubscribe() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { userId, authChecked, supabase }
}
