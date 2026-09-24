'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Calendar, Dumbbell, Flame, Trophy, Activity, X, Plus, Clock,
  Target, Shield, Zap, User, HeartPulse, Loader2, Copy, Send,
  Settings, ChevronDown, Minus, MessageCircle,
} from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase/browser'

// ============================================================
// TYPES
// ============================================================

const DAY_ORDER = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'] as const
const JOURS_SEMAINE = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const

interface ClubSlot {
  jour: string
  heure: string
  label: string
}

interface Profile {
  id: string
  display_name: string | null
  sport: string
  niveau: string
  poids_kg: number | null
  taille_cm: number | null
  poids_objectif_kg: number | null
  objectifs: string | null
  club_schedule: ClubSlot[]
  sync_token: string
}

interface HealthData {
  id: string
  date: string
  sleep_hours: number | null
  hrv: number | null
  recovery_score: number | null
  fatigue: number | null
  charge: number | null
}

interface Exercice {
  nom: string
  type?: string
  series?: string
  reps?: string
  charge?: string
  repos?: string
  note?: string
}

interface Bloc {
  bloc: string
  exercices: Exercice[]
}

interface SimpleItem {
  nom: string
  duree?: string
  note?: string
  zone?: string
}

interface ProgramJson {
  date?: string
  type?: string
  intensite?: string
  focus?: string
  duree_minutes?: number
  justification_choix?: string
  echauffement?: SimpleItem[]
  corps_seance?: Bloc[]
  etirements?: SimpleItem[]
  retour_au_calme?: SimpleItem[]
  conseil_coach?: string
  attention?: string
  notification?: string
  rpe_reel?: number
}

interface Workout {
  id: string
  user_id: string
  date: string
  sport: string | null
  type_seance: string | null
  program_json: ProgramJson | null
  status: string | null
}

interface OneRm {
  id: string
  exercise: string
  value_kg: number
  date: string
}

interface WeekDayPlan {
  jour?: string
  date?: string
  type?: string
  focus?: string
  intensite?: string
  duree_minutes?: number
  club?: string
}

interface WeekPlan {
  objectif_semaine: string
  week: WeekDayPlan[]
}

interface WeekFocusRow {
  id: string
  week_key: string
  focus: string
  parsed: WeekPlan
}

interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

// ============================================================
// HELPERS
// ============================================================

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoStr(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

function getWeekKey(d: Date = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

const INTENSITE_FACTOR: Record<string, number> = {
  repos: 0, 'repos actif': 0.15, légère: 0.35, moderee: 0.6, modérée: 0.6, forte: 1,
}

function computeStrain(program: ProgramJson | null, fatigue: number | null): number {
  if (!program) return 0
  const factor = INTENSITE_FACTOR[(program.intensite || '').toLowerCase()] ?? 0.4
  const duree = program.duree_minutes || 0
  let strain = factor * Math.min(duree / 90, 1) * 21
  if (fatigue && fatigue >= 7) strain *= 0.9
  return Math.round(Math.min(Math.max(strain, 0), 21) * 10) / 10
}

function nextClubSlot(clubSchedule: ClubSlot[]): { jour: string; heure: string; label: string; dayLabel: string } | null {
  if (!clubSchedule?.length) return null
  const now = new Date()
  const todayIdx = now.getDay()
  let best: { diff: number; slot: ClubSlot } | null = null
  for (const slot of clubSchedule) {
    const slotIdx = DAY_ORDER.indexOf(slot.jour as typeof DAY_ORDER[number])
    if (slotIdx === -1) continue
    let diff = (slotIdx - todayIdx + 7) % 7
    if (diff === 0) {
      const [h, m] = (slot.heure || '00:00').split(':').map(Number)
      const slotTime = new Date(now)
      slotTime.setHours(h || 0, m || 0, 0, 0)
      if (slotTime.getTime() <= now.getTime()) diff = 7
    }
    if (best === null || diff < best.diff) best = { diff, slot }
  }
  if (!best) return null
  const dayLabel = best.diff === 0 ? "Aujourd'hui" : best.diff === 1 ? 'Demain' : best.slot.jour
  return { jour: best.slot.jour, heure: best.slot.heure, label: best.slot.label, dayLabel }
}

// ============================================================
// UI PRIMITIVES
// ============================================================

function CircularGauge({
  value, max, size = 128, stroke = 10, colorFrom = '#A855F7', colorTo = '#6366F1',
  label, unit,
}: {
  value: number; max: number; size?: number; stroke?: number
  colorFrom?: string; colorTo?: string; label: string; unit?: string
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(Math.max(value / max, 0), 1)
  const offset = circumference * (1 - pct)
  const gradId = `grad-${label.replace(/\s+/g, '-')}`

  return (
    <div className="flex flex-col items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorFrom} />
            <stop offset="100%" stopColor={colorTo} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#241236" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={`url(#${gradId})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="-mt-[76px] flex flex-col items-center">
        <span className="text-2xl font-black text-white">{value}{unit}</span>
      </div>
      <span className="mt-2 text-xs font-semibold text-purple-300/70 uppercase tracking-wider">{label}</span>
    </div>
  )
}

function GlassCard({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`bg-[#150A29]/70 backdrop-blur-xl border border-[#3B1A66]/60 rounded-3xl shadow-[0_0_25px_rgba(88,28,135,0.15)] ${className}`}
    >
      {children}
    </div>
  )
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function OnyxDashboard() {
  const router = useRouter()
  const supabase = getSupabaseBrowser()
  const queryClient = useQueryClient()

  const [userId, setUserId] = useState<string | null>(null)
  const [authChecked, setAuthChecked] = useState<boolean>(false)
  const [profileDrawerOpen, setProfileDrawerOpen] = useState<boolean>(false)
  const [newRm, setNewRm] = useState<{ exercise: string; value_kg: string }>({ exercise: '', value_kg: '' })
  const [showAddRm, setShowAddRm] = useState<boolean>(false)
  const [rpeValue, setRpeValue] = useState<number>(7)
  const [activeDay, setActiveDay] = useState<string | null>(null)
  const [newSlot, setNewSlot] = useState<{ heure: string; label: string }>({ heure: '19:00', label: '' })
  const [chatOpen, setChatOpen] = useState<boolean>(false)
  const [chatInput, setChatInput] = useState<string>('')
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([])
  const [chatLoading, setChatLoading] = useState<boolean>(false)

  const [profileForm, setProfileForm] = useState<{
    display_name: string; sport: string; niveau: string
    poids_kg: string; taille_cm: string; poids_objectif_kg: string; objectifs: string
  }>({ display_name: '', sport: 'MMA', niveau: 'intermediaire', poids_kg: '', taille_cm: '', poids_objectif_kg: '', objectifs: '' })

  // --- Auth guard ---
  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return
      if (!session?.user) {
        router.replace('/onboarding')
      } else {
        setUserId(session.user.id)
      }
      setAuthChecked(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user) router.replace('/onboarding')
    })
    return () => { mounted = false; sub.subscription.unsubscribe() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const today = todayStr()
  const weekKey = getWeekKey()

  // --- Queries ---
  const profileQ = useQuery<Profile>({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId as string).single()
      if (error) throw error
      return data as Profile
    },
  })

  const healthTodayQ = useQuery<HealthData | null>({
    queryKey: ['health_today', userId, today],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('health_data').select('*').eq('user_id', userId as string).eq('date', today).maybeSingle()
      if (error) throw error
      return data as HealthData | null
    },
  })

  const todayWorkoutQ = useQuery<Workout | null>({
    queryKey: ['workout_today', userId, today],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workouts').select('*').eq('user_id', userId as string).eq('date', today)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (error) throw error
      return data as Workout | null
    },
  })

  const weekWorkoutsQ = useQuery<Workout[]>({
    queryKey: ['workouts_week', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workouts').select('*').eq('user_id', userId as string)
        .gte('date', daysAgoStr(6)).order('date', { ascending: true })
      if (error) throw error
      return (data as Workout[]) || []
    },
  })

  const recentWorkoutsQ = useQuery<Workout[]>({
    queryKey: ['workouts_recent', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workouts').select('*').eq('user_id', userId as string)
        .order('date', { ascending: false }).limit(8)
      if (error) throw error
      return (data as Workout[]) || []
    },
  })

  const oneRmQ = useQuery<OneRm[]>({
    queryKey: ['one_rm', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('one_rm').select('*').eq('user_id', userId as string).order('date', { ascending: false })
      if (error) throw error
      const latestByExercise: Record<string, OneRm> = {}
      for (const row of (data as OneRm[]) || []) {
        if (!latestByExercise[row.exercise]) latestByExercise[row.exercise] = row
      }
      return Object.values(latestByExercise)
    },
  })

  const weekFocusQ = useQuery<WeekFocusRow | null>({
    queryKey: ['week_focus', userId, weekKey],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('week_focus').select('*').eq('user_id', userId as string).eq('week_key', weekKey).maybeSingle()
      if (error) throw error
      if (!data) return null
      try {
        return { ...data, parsed: JSON.parse(data.focus) } as WeekFocusRow
      } catch {
        return { ...data, parsed: { objectif_semaine: data.focus, week: [] } } as WeekFocusRow
      }
    },
  })

  const profile = profileQ.data
  const program = todayWorkoutQ.data?.program_json || null
  const recovery = healthTodayQ.data?.recovery_score ?? null
  const strain = computeStrain(program, healthTodayQ.data?.fatigue ?? null)
  const oneRepMaxes = oneRmQ.data || []

  // Sync profile form when profile loads / drawer opens
  useEffect(() => {
    if (profile) {
      setProfileForm({
        display_name: profile.display_name || '',
        sport: profile.sport || 'MMA',
        niveau: profile.niveau || 'intermediaire',
        poids_kg: profile.poids_kg != null ? String(profile.poids_kg) : '',
        taille_cm: profile.taille_cm != null ? String(profile.taille_cm) : '',
        poids_objectif_kg: profile.poids_objectif_kg != null ? String(profile.poids_objectif_kg) : '',
        objectifs: profile.objectifs || '',
      })
    }
  }, [profile])

  const isClubToday = useMemo(() => {
    const dayName = DAY_ORDER[new Date().getDay()]
    return (profile?.club_schedule || []).some((s) => s.jour === dayName)
  }, [profile])

  const nextClub = useMemo(() => nextClubSlot(profile?.club_schedule || []), [profile])

  const weekBars = useMemo(() => {
    const bars: { date: string; label: string; load: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const dayLabel = ['D', 'L', 'M', 'M', 'J', 'V', 'S'][d.getDay()]
      const dayWorkouts = (weekWorkoutsQ.data || []).filter((w) => w.date === dateStr)
      const load = dayWorkouts.reduce((sum, w) => sum + computeStrain(w.program_json, null), 0)
      bars.push({ date: dateStr, label: dayLabel, load: Math.round(load * 10) / 10 })
    }
    return bars
  }, [weekWorkoutsQ.data])

  const maxBarLoad = Math.max(...weekBars.map((b) => b.load), 1)

  // --- Mutations ---
  const generateProgramM = useMutation({
    mutationFn: async () => {
      const one_rm_map: Record<string, number> = {}
      for (const r of oneRmQ.data || []) one_rm_map[r.exercise] = r.value_kg
      const res = await fetch('/api/coach/program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sport: profile?.sport || 'MMA',
          goals: profile?.objectifs || '',
          level: profile?.niveau || 'intermediaire',
          poids_kg: profile?.poids_kg,
          taille_cm: profile?.taille_cm,
          club_schedule: profile?.club_schedule || [],
          one_rm: one_rm_map,
          is_club_day: isClubToday,
          hrv: healthTodayQ.data?.hrv ?? null,
          sleep_hours: healthTodayQ.data?.sleep_hours ?? null,
          recovery_score: healthTodayQ.data?.recovery_score ?? null,
          fatigue: healthTodayQ.data?.fatigue ?? null,
          recent_sessions: (recentWorkoutsQ.data || []).slice(0, 5),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Erreur génération programme')
      if (!json.program) throw new Error('Réponse IA invalide')

      const { error } = await supabase.from('workouts').upsert({
        user_id: userId,
        date: today,
        sport: profile?.sport || 'MMA',
        type_seance: 'manuel',
        program_json: json.program,
        status: 'planifie',
      })
      if (error) throw error
      return json.program as ProgramJson
    },
    onSuccess: () => {
      toast.success('Séance du jour générée.')
      queryClient.invalidateQueries({ queryKey: ['workout_today'] })
      queryClient.invalidateQueries({ queryKey: ['workouts_recent'] })
      queryClient.invalidateQueries({ queryKey: ['workouts_week'] })
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur'),
  })

  const saveRpeM = useMutation({
    mutationFn: async () => {
      if (!todayWorkoutQ.data) throw new Error('Aucune séance à noter')
      const updatedProgram: ProgramJson = { ...(program || {}), rpe_reel: rpeValue }
      const { error } = await supabase
        .from('workouts')
        .update({ program_json: updatedProgram, status: 'fait' })
        .eq('id', todayWorkoutQ.data.id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('RPE enregistré.')
      queryClient.invalidateQueries({ queryKey: ['workout_today'] })
      queryClient.invalidateQueries({ queryKey: ['workouts_recent'] })
      queryClient.invalidateQueries({ queryKey: ['workouts_week'] })
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur'),
  })

  const generateWeekM = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/coach/week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sport: profile?.sport || 'MMA',
          goals: profile?.objectifs || '',
          level: profile?.niveau || 'intermediaire',
          poids_kg: profile?.poids_kg,
          club_schedule: profile?.club_schedule || [],
          hrv: healthTodayQ.data?.hrv ?? null,
          sleep_hours: healthTodayQ.data?.sleep_hours ?? null,
          recovery_score: healthTodayQ.data?.recovery_score ?? null,
          fatigue: healthTodayQ.data?.fatigue ?? null,
          recent_sessions: (recentWorkoutsQ.data || []).slice(0, 5),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Erreur génération semaine')
      if (!json.plan) throw new Error('Réponse IA invalide')
      const { error } = await supabase.from('week_focus').upsert({
        user_id: userId, week_key: weekKey, focus: JSON.stringify(json.plan),
      })
      if (error) throw error
      return json.plan as WeekPlan
    },
    onSuccess: () => {
      toast.success('Focus de la semaine généré.')
      queryClient.invalidateQueries({ queryKey: ['week_focus'] })
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur'),
  })

  const addOneRmM = useMutation({
    mutationFn: async () => {
      if (!newRm.exercise.trim() || !newRm.value_kg) throw new Error('Exercice et charge requis')
      const { error } = await supabase.from('one_rm').insert({
        user_id: userId, exercise: newRm.exercise.trim(), value_kg: Number(newRm.value_kg),
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('1RM enregistré.')
      setNewRm({ exercise: '', value_kg: '' })
      setShowAddRm(false)
      queryClient.invalidateQueries({ queryKey: ['one_rm'] })
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur'),
  })

  const saveProfileM = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Non connecté')
      const { error } = await supabase.from('profiles').update({
        display_name: profileForm.display_name || null,
        sport: profileForm.sport,
        niveau: profileForm.niveau,
        poids_kg: profileForm.poids_kg === '' ? null : Number(profileForm.poids_kg),
        taille_cm: profileForm.taille_cm === '' ? null : Number(profileForm.taille_cm),
        poids_objectif_kg: profileForm.poids_objectif_kg === '' ? null : Number(profileForm.poids_objectif_kg),
        objectifs: profileForm.objectifs || null,
      }).eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Profil mis à jour.')
      setProfileDrawerOpen(false)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur'),
  })

  const clubScheduleM = useMutation({
    mutationFn: async (nextSchedule: ClubSlot[]) => {
      if (!userId) throw new Error('Non connecté')
      const { error } = await supabase.from('profiles').update({ club_schedule: nextSchedule }).eq('id', userId)
      if (error) throw error
      return nextSchedule
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
    onError: (e: Error) => toast.error(e.message || 'Erreur'),
  })

  function addClubSlot(jour: string) {
    if (!newSlot.label.trim()) { toast.error('Ajoute un nom de séance'); return }
    const current = profile?.club_schedule || []
    const next = [...current, { jour, heure: newSlot.heure, label: newSlot.label.trim() }]
    clubScheduleM.mutate(next)
    setNewSlot({ heure: '19:00', label: '' })
    setActiveDay(null)
  }

  function removeClubSlot(idx: number) {
    const current = profile?.club_schedule || []
    clubScheduleM.mutate(current.filter((_, i) => i !== idx))
  }

  async function sendChat() {
    const text = chatInput.trim()
    if (!text) return
    const nextHistory: ChatMsg[] = [...chatHistory, { role: 'user', content: text }]
    setChatHistory(nextHistory)
    setChatInput('')
    setChatLoading(true)
    try {
      const res = await fetch('/api/coach/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: nextHistory,
          sport: profile?.sport || 'MMA',
          context: { profile: { niveau: profile?.niveau, objectifs: profile?.objectifs }, seance_du_jour: program },
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Erreur du coach')
      setChatHistory((h) => [...h, { role: 'assistant', content: json.reply || '…' }])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur du coach')
    } finally {
      setChatLoading(false)
    }
  }

  function copyToken() {
    if (!profile?.sync_token) return
    navigator.clipboard.writeText(profile.sync_token)
    toast.success('Token copié.')
  }

  if (!authChecked || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0B0512] text-purple-300">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0B0512] text-zinc-100 font-sans selection:bg-purple-500 selection:text-white pb-32">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-b from-purple-900/30 via-fuchsia-900/10 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-[#0B0512]/80 backdrop-blur-xl border-b border-[#3B1A66]/40 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-600/40">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider bg-gradient-to-r from-white via-purple-200 to-fuchsia-400 bg-clip-text text-transparent">
              ONYX <span className="text-purple-400 font-light">LAB</span>
            </h1>
            <p className="text-xs text-purple-300/60 font-medium">{profile?.display_name || 'Performance & Conditionnement'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyToken}
            title="Copier le token de synchro Apple Health"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1E0F35] border border-[#3B1A66] text-xs text-purple-300 hover:border-purple-400 transition-colors"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${healthTodayQ.data ? 'bg-emerald-400' : 'bg-zinc-500'}`} />
            Sync <Copy className="w-3 h-3" />
          </button>
          <button
            onClick={() => setProfileDrawerOpen(true)}
            className="w-9 h-9 rounded-full bg-[#1E0F35] border border-[#3B1A66] flex items-center justify-center text-purple-200 hover:border-purple-400 transition-colors"
          >
            <User className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">

        {/* TOP SECTION — GAUGES */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <GlassCard className="p-4 flex flex-col items-center justify-center col-span-1">
            <CircularGauge value={recovery ?? 0} max={100} unit="%" label="Forme" colorFrom="#34D399" colorTo="#A855F7" />
            <p className="text-[10px] text-purple-300/60 mt-1 text-center">
              {recovery == null ? 'Pas de sync aujourd’hui' : recovery >= 70 ? 'Récup optimale' : recovery >= 40 ? 'Récup correcte' : 'Récup basse'}
            </p>
          </GlassCard>

          <GlassCard className="p-4 flex flex-col items-center justify-center col-span-1">
            <CircularGauge value={strain} max={21} label="Strain" colorFrom="#F472B6" colorTo="#6366F1" />
            <p className="text-[10px] text-purple-300/60 mt-1 text-center">Charge estimée du jour</p>
          </GlassCard>

          <GlassCard className="p-4 col-span-2 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-purple-300/70 uppercase tracking-wider">Poids actuel</span>
              <Shield className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex items-end gap-3">
              <span className="text-3xl font-black text-white">{profile?.poids_kg ?? '—'}<span className="text-sm font-normal text-purple-400 ml-1">kg</span></span>
              {profile?.poids_objectif_kg != null && (
                <span className="text-xs text-purple-300/70 mb-1">
                  Objectif : <span className="text-white font-semibold">{profile.poids_objectif_kg} kg</span>
                  {profile.poids_kg != null && (
                    <span className={`ml-1 ${profile.poids_kg > profile.poids_objectif_kg ? 'text-amber-400' : 'text-emerald-400'}`}>
                      ({profile.poids_kg > profile.poids_objectif_kg ? '−' : '+'}{Math.abs(profile.poids_kg - profile.poids_objectif_kg).toFixed(1)} kg à faire)
                    </span>
                  )}
                </span>
              )}
            </div>
            {profile?.poids_objectif_kg == null && (
              <button onClick={() => setProfileDrawerOpen(true)} className="text-[11px] text-purple-400 underline mt-2 self-start">
                Définir un objectif de poids
              </button>
            )}
          </GlassCard>
        </section>

        {/* WEEKLY LOAD BARS */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Charge hebdomadaire</h3>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-end justify-between gap-2 h-24">
            {weekBars.map((b) => (
              <div key={b.date} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full rounded-t-md bg-gradient-to-t from-purple-700 via-fuchsia-500 to-indigo-400"
                    style={{ height: `${Math.max((b.load / maxBarLoad) * 100, 4)}%` }}
                  />
                </div>
                <span className={`text-[10px] font-semibold ${b.date === today ? 'text-fuchsia-400' : 'text-purple-300/50'}`}>{b.label}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* SEANCE IA DU JOUR */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-purple-600/20 text-purple-300 border border-purple-500/30">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Séance IA du Jour</h3>
                <p className="text-xs text-purple-300/60">{isClubToday ? 'Jour de club détecté' : 'Athlétisation personnalisée'}</p>
              </div>
            </div>
            {!program && (
              <button
                onClick={() => generateProgramM.mutate()}
                disabled={generateProgramM.isPending}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-indigo-500 text-white font-semibold text-xs inline-flex items-center gap-2 disabled:opacity-50 shrink-0"
              >
                {generateProgramM.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Générer la séance
              </button>
            )}
          </div>

          {!program && (
            <p className="text-sm text-purple-300/60 py-4">Aucune séance générée pour aujourd'hui. ONYX peut analyser ta récupération et tes dernières séances pour décider.</p>
          )}

          {program && (
            <div className="space-y-4">
              <div className="bg-purple-950/40 border border-purple-500/20 rounded-2xl p-4">
                <div className="text-xs text-purple-300 uppercase tracking-wider font-semibold mb-1">{program.type} · {program.intensite}</div>
                <h4 className="text-lg font-bold text-white">{program.focus}</h4>
                <p className="text-xs text-purple-300/70 mt-1">{program.duree_minutes} min · {program.justification_choix}</p>
              </div>

              {program.echauffement && program.echauffement.length > 0 && (
                <details className="group rounded-xl bg-purple-950/20 border border-purple-500/10 p-3">
                  <summary className="cursor-pointer flex items-center justify-between text-sm font-bold text-purple-300 list-none">
                    Échauffement <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="mt-3 space-y-1.5">
                    {program.echauffement.map((e, i) => (
                      <div key={i} className="text-xs text-white flex justify-between border-b border-purple-900/30 pb-1.5 last:border-0">
                        <span>{e.nom}</span><span className="text-purple-300/70">{e.duree}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {program.corps_seance && program.corps_seance.length > 0 && (
                <details open className="group rounded-xl bg-purple-950/20 border border-purple-500/10 p-3">
                  <summary className="cursor-pointer flex items-center justify-between text-sm font-bold text-purple-300 list-none">
                    Corps de séance <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="mt-3 space-y-3">
                    {program.corps_seance.map((bloc, i) => (
                      <div key={i} className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/10">
                        <div className="text-sm font-semibold text-white mb-2">{bloc.bloc}</div>
                        <div className="space-y-1.5">
                          {bloc.exercices?.map((ex, j) => (
                            <div key={j} className="text-xs text-purple-200/80 flex justify-between border-b border-purple-900/30 pb-1.5 last:border-0">
                              <span>{ex.nom}</span>
                              <span className="text-purple-300/70 text-right">{ex.series}x{ex.reps} · {ex.charge} · repos {ex.repos}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {program.retour_au_calme && program.retour_au_calme.length > 0 && (
                <details className="group rounded-xl bg-purple-950/20 border border-purple-500/10 p-3">
                  <summary className="cursor-pointer flex items-center justify-between text-sm font-bold text-purple-300 list-none">
                    Retour au calme <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                  </summary>
                  <div className="mt-3 space-y-1.5">
                    {program.retour_au_calme.map((e, i) => (
                      <div key={i} className="text-xs text-white flex justify-between border-b border-purple-900/30 pb-1.5 last:border-0">
                        <span>{e.nom}</span><span className="text-purple-300/70">{e.duree}</span>
                      </div>
                    ))}
                  </div>
                </details>
              )}

              {program.etirements && program.etirements.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {program.etirements.map((e, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      {e.nom} · {e.duree}
                    </span>
                  ))}
                </div>
              )}

              {program.conseil_coach && (
                <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-sm text-indigo-200">💡 {program.conseil_coach}</div>
              )}
              {program.attention && (
                <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/20 text-sm text-amber-200">⚠️ {program.attention}</div>
              )}

              {/* RPE post-séance */}
              <div className="p-4 rounded-xl bg-fuchsia-950/20 border border-fuchsia-500/20">
                {program.rpe_reel != null ? (
                  <p className="text-sm text-white">RPE enregistré pour cette séance : <span className="font-black text-fuchsia-300">{program.rpe_reel}/10</span></p>
                ) : (
                  <>
                    <p className="text-xs text-purple-300/70 mb-2 font-semibold uppercase tracking-wider">Ressenti post-séance (RPE)</p>
                    <div className="flex items-center gap-3">
                      <input
                        type="range" min={1} max={10} value={rpeValue}
                        onChange={(e) => setRpeValue(Number(e.target.value))}
                        className="flex-1 accent-fuchsia-500"
                      />
                      <span className="text-lg font-black text-white w-8 text-center">{rpeValue}</span>
                      <button
                        onClick={() => saveRpeM.mutate()}
                        disabled={saveRpeM.isPending}
                        className="px-3 py-1.5 rounded-lg bg-fuchsia-600 hover:bg-fuchsia-500 text-white text-xs font-semibold disabled:opacity-50"
                      >
                        Valider
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </GlassCard>

        <div className="grid md:grid-cols-2 gap-4 sm:gap-6">
          {/* FOCUS SEMAINE */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/30">
                  <Target className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-white">Focus Semaine</h3>
              </div>
            </div>
            {!weekFocusQ.data ? (
              <div className="space-y-3">
                <p className="text-sm text-purple-300/60">Pas encore de plan pour la semaine {weekKey}.</p>
                <button
                  onClick={() => generateWeekM.mutate()}
                  disabled={generateWeekM.isPending}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-semibold text-xs inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {generateWeekM.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Générer le focus
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-900/30 to-fuchsia-900/20 border border-purple-500/20">
                  <p className="text-sm text-purple-200/80 leading-relaxed">{weekFocusQ.data.parsed.objectif_semaine}</p>
                </div>
                <div className="space-y-1.5 max-h-52 overflow-y-auto">
                  {(weekFocusQ.data.parsed.week || []).map((d, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-purple-950/30 border border-purple-500/10 text-xs flex justify-between">
                      <span className="text-white font-semibold">{d.jour || d.date} · {d.focus}</span>
                      <span className="text-purple-300/60">{d.intensite}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </GlassCard>

          {/* 1RM MATRIX */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-lg text-white">Matrice 1RM</h3>
              </div>
              <button onClick={() => setShowAddRm((v) => !v)} className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-200 hover:bg-indigo-600/50">
                {showAddRm ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              </button>
            </div>

            <div className="space-y-2">
              {oneRepMaxes.map((item) => (
                <div key={item.id} className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/15 flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">{item.exercise}</span>
                  <span className="text-lg font-black text-white">{item.value_kg} <span className="text-xs font-normal text-purple-400">kg</span></span>
                </div>
              ))}
              {oneRepMaxes.length === 0 && <p className="text-sm text-purple-300/60">Aucun max enregistré.</p>}
            </div>

            {showAddRm && (
              <div className="mt-3 p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex gap-2">
                <input
                  placeholder="Exercice" value={newRm.exercise}
                  onChange={(e) => setNewRm((s) => ({ ...s, exercise: e.target.value }))}
                  className="flex-1 bg-purple-950/60 border border-purple-500/30 rounded-lg px-2.5 py-2 text-xs text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-400"
                />
                <input
                  type="number" placeholder="kg" value={newRm.value_kg}
                  onChange={(e) => setNewRm((s) => ({ ...s, value_kg: e.target.value }))}
                  className="w-20 bg-purple-950/60 border border-purple-500/30 rounded-lg px-2.5 py-2 text-xs text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-400"
                />
                <button
                  onClick={() => addOneRmM.mutate()}
                  disabled={addOneRmM.isPending}
                  className="px-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold disabled:opacity-50"
                >
                  OK
                </button>
              </div>
            )}
          </GlassCard>
        </div>

        {/* PLANNING & CLUB */}
        <GlassCard className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-2xl bg-violet-600/20 text-violet-300 border border-violet-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Planning & Club</h3>
              <p className="text-xs text-purple-300/60">Clique un jour pour ajouter un créneau</p>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-4">
            {JOURS_SEMAINE.map((jour) => {
              const slots = (profile?.club_schedule || []).filter((s) => s.jour === jour)
              const isToday = DAY_ORDER[new Date().getDay()] === jour
              return (
                <button
                  key={jour}
                  onClick={() => setActiveDay(activeDay === jour ? null : jour)}
                  className={`rounded-xl p-2 text-center border transition-colors ${
                    activeDay === jour ? 'bg-purple-600/30 border-purple-400' : isToday ? 'bg-fuchsia-950/30 border-fuchsia-500/40' : 'bg-purple-950/30 border-purple-500/15 hover:border-purple-400/50'
                  }`}
                >
                  <div className="text-[10px] font-bold text-purple-300 uppercase">{jour.slice(0, 3)}</div>
                  <div className="text-sm font-black text-white mt-1">{slots.length}</div>
                </button>
              )
            })}
          </div>

          {activeDay && (
            <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/20 space-y-3 mb-2">
              <h4 className="text-sm font-bold text-white">{activeDay}</h4>
              {(profile?.club_schedule || []).map((s, idx) => s.jour === activeDay && (
                <div key={idx} className="flex items-center justify-between text-xs bg-purple-900/30 rounded-lg px-3 py-2">
                  <span className="text-white">{s.heure} — {s.label}</span>
                  <button onClick={() => removeClubSlot(idx)} className="text-red-400 hover:text-red-300">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <div className="flex gap-2">
                <input
                  type="time" value={newSlot.heure}
                  onChange={(e) => setNewSlot((s) => ({ ...s, heure: e.target.value }))}
                  className="bg-purple-950/60 border border-purple-500/30 rounded-lg px-2 py-2 text-xs text-white"
                />
                <input
                  placeholder="Ex: Sparring MMA" value={newSlot.label}
                  onChange={(e) => setNewSlot((s) => ({ ...s, label: e.target.value }))}
                  className="flex-1 bg-purple-950/60 border border-purple-500/30 rounded-lg px-2 py-2 text-xs text-white placeholder-purple-400/50"
                />
                <button
                  onClick={() => addClubSlot(activeDay)}
                  disabled={clubScheduleM.isPending}
                  className="px-3 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold disabled:opacity-50"
                >
                  Ajouter
                </button>
              </div>
            </div>
          )}
        </GlassCard>
      </main>

      {/* PROFILE DRAWER */}
      {profileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setProfileDrawerOpen(false)} />
          <div className="relative w-full max-w-sm h-full bg-[#120A24] border-l border-[#3B1A66] p-6 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2"><Settings className="w-5 h-5 text-purple-400" /> Mon profil</h2>
              <button onClick={() => setProfileDrawerOpen(false)} className="p-2 rounded-full bg-purple-900/30 text-purple-300 hover:bg-purple-800/40">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-purple-300/70 mb-1">Nom / pseudo</label>
                <input
                  value={profileForm.display_name}
                  onChange={(e) => setProfileForm((p) => ({ ...p, display_name: e.target.value }))}
                  className="w-full bg-purple-950/50 border border-purple-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-purple-300/70 mb-1">Sport</label>
                  <select
                    value={profileForm.sport}
                    onChange={(e) => setProfileForm((p) => ({ ...p, sport: e.target.value }))}
                    className="w-full bg-purple-950/50 border border-purple-500/30 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    {['MMA', 'No-Gi', 'Boxe', 'Lutte', 'Athlétisation'].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-purple-300/70 mb-1">Niveau</label>
                  <select
                    value={profileForm.niveau}
                    onChange={(e) => setProfileForm((p) => ({ ...p, niveau: e.target.value }))}
                    className="w-full bg-purple-950/50 border border-purple-500/30 rounded-lg px-3 py-2 text-sm text-white"
                  >
                    {['debutant', 'intermediaire', 'avance', 'competiteur'].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-purple-300/70 mb-1">Poids (kg)</label>
                  <input
                    type="number" step="0.1" value={profileForm.poids_kg}
                    onChange={(e) => setProfileForm((p) => ({ ...p, poids_kg: e.target.value }))}
                    className="w-full bg-purple-950/50 border border-purple-500/30 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-purple-300/70 mb-1">Objectif (kg)</label>
                  <input
                    type="number" step="0.1" value={profileForm.poids_objectif_kg}
                    onChange={(e) => setProfileForm((p) => ({ ...p, poids_objectif_kg: e.target.value }))}
                    className="w-full bg-purple-950/50 border border-purple-500/30 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-purple-300/70 mb-1">Taille (cm)</label>
                  <input
                    type="number" value={profileForm.taille_cm}
                    onChange={(e) => setProfileForm((p) => ({ ...p, taille_cm: e.target.value }))}
                    className="w-full bg-purple-950/50 border border-purple-500/30 rounded-lg px-3 py-2 text-sm text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-purple-300/70 mb-1">Objectifs</label>
                <textarea
                  rows={3} value={profileForm.objectifs}
                  onChange={(e) => setProfileForm((p) => ({ ...p, objectifs: e.target.value }))}
                  className="w-full bg-purple-950/50 border border-purple-500/30 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>

              <button
                onClick={() => { setProfileDrawerOpen(false); setActiveDay(JOURS_SEMAINE[0]) }}
                className="text-xs text-purple-400 underline"
              >
                Gérer mes créneaux de club ↓
              </button>

              {profile?.sync_token && (
                <div className="bg-violet-950/40 border border-violet-800/40 rounded-lg p-3">
                  <p className="text-[11px] text-purple-300/70 mb-1">Token de synchro Apple Health</p>
                  <div className="flex items-center gap-2">
                    <code className="text-[11px] text-violet-300 break-all">{profile.sync_token}</code>
                    <button onClick={copyToken} className="text-[11px] text-purple-400 underline shrink-0">Copier</button>
                  </div>
                </div>
              )}

              <button
                onClick={() => saveProfileM.mutate()}
                disabled={saveProfileM.isPending}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-fuchsia-500 to-indigo-500 text-white font-semibold text-sm disabled:opacity-50"
              >
                {saveProfileM.isPending ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING COACH CHAT BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-40 px-4 pb-4">
        <div className="max-w-2xl mx-auto">
          {chatOpen && (
            <div className="mb-2 max-h-72 overflow-y-auto bg-[#150A29]/95 backdrop-blur-xl border border-[#3B1A66] rounded-2xl p-4 space-y-2">
              {chatHistory.length === 0 && <p className="text-xs text-purple-300/50 text-center py-4">Pose une question à ton coach ONYX.</p>}
              {chatHistory.map((m, i) => (
                <div key={i} className={`text-xs px-3 py-2 rounded-xl max-w-[85%] ${m.role === 'user' ? 'bg-purple-600/40 text-white ml-auto' : 'bg-purple-950/60 text-purple-100'}`}>
                  {m.content}
                </div>
              ))}
              {chatLoading && <div className="text-xs text-purple-300/60 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> ONYX réfléchit…</div>}
            </div>
          )}
          <div className="flex items-center gap-2 bg-[#150A29]/95 backdrop-blur-xl border border-[#3B1A66] rounded-full px-2 py-2 shadow-[0_0_30px_rgba(88,28,135,0.3)]">
            <button
              onClick={() => setChatOpen((v) => !v)}
              className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-tr from-purple-600 to-fuchsia-500 flex items-center justify-center text-white"
            >
              <MessageCircle className="w-4 h-4" />
            </button>
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onFocus={() => setChatOpen(true)}
              onKeyDown={(e) => { if (e.key === 'Enter') sendChat() }}
              placeholder="Demande quelque chose à ton coach…"
              className="flex-1 bg-transparent text-sm text-white placeholder-purple-400/50 focus:outline-none px-2"
            />
            <button
              onClick={sendChat}
              disabled={chatLoading || !chatInput.trim()}
              className="w-9 h-9 shrink-0 rounded-full bg-purple-700 hover:bg-purple-600 flex items-center justify-center text-white disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
