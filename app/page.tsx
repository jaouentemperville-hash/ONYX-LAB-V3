'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Calendar, Dumbbell, Flame, Trophy, Activity, X, ChevronRight, Plus,
  Clock, TrendingUp, Target, Shield, Zap, CheckCircle2, User, HeartPulse, Loader2
} from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase/browser'

const DAY_ORDER = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function getWeekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}

function nextClubSlot(clubSchedule) {
  if (!clubSchedule?.length) return null
  const now = new Date()
  const todayIdx = now.getDay()
  let best = null
  for (const slot of clubSchedule) {
    const slotIdx = DAY_ORDER.indexOf(slot.jour)
    if (slotIdx === -1) continue
    let diff = (slotIdx - todayIdx + 7) % 7
    if (diff === 0) {
      const [h, m] = (slot.heure || '00:00').split(':').map(Number)
      const slotTime = new Date(now); slotTime.setHours(h, m, 0, 0)
      if (slotTime.getTime() <= now.getTime()) diff = 7
    }
    if (best === null || diff < best.diff) best = { diff, slot }
  }
  if (!best) return null
  const dayLabel = best.diff === 0 ? "Aujourd'hui" : best.diff === 1 ? 'Demain' : best.slot.jour
  // best.slot = { jour, heure, label } où label = nom de la séance (ex: "Sparring MMA")
  return { jour: best.slot.jour, heure: best.slot.heure, label: dayLabel, label_seance: best.slot.label }
}

export default function OnyxDashboard() {
  const router = useRouter()
  const supabase = getSupabaseBrowser()
  const queryClient = useQueryClient()

  const [userId, setUserId] = useState(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [activeModal, setActiveModal] = useState(null)
  const [newRm, setNewRm] = useState({ exercise: '', value_kg: '' })

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

  // --- Data queries ---
  const profileQ = useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
      if (error) throw error
      return data
    },
  })

  const healthTodayQ = useQuery({
    queryKey: ['health_today', userId, today],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('health_data').select('*').eq('user_id', userId).eq('date', today).maybeSingle()
      if (error) throw error
      return data
    },
  })

  const todayWorkoutQ = useQuery({
    queryKey: ['workout_today', userId, today],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workouts').select('*').eq('user_id', userId).eq('date', today)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (error) throw error
      return data
    },
  })

  const recentWorkoutsQ = useQuery({
    queryKey: ['workouts_recent', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workouts').select('*').eq('user_id', userId)
        .order('date', { ascending: false }).limit(6)
      if (error) throw error
      return data || []
    },
  })

  const oneRmQ = useQuery({
    queryKey: ['one_rm', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('one_rm').select('*').eq('user_id', userId)
        .order('date', { ascending: false })
      if (error) throw error
      const latestByExercise = {}
      for (const row of data || []) {
        if (!latestByExercise[row.exercise]) latestByExercise[row.exercise] = row
      }
      return Object.values(latestByExercise)
    },
  })

  const weekFocusQ = useQuery({
    queryKey: ['week_focus', userId, weekKey],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('week_focus').select('*').eq('user_id', userId).eq('week_key', weekKey).maybeSingle()
      if (error) throw error
      if (!data) return null
      try { return { ...data, parsed: JSON.parse(data.focus) } }
      catch { return { ...data, parsed: { objectif_semaine: data.focus, week: [] } } }
    },
  })

  const profile = profileQ.data
  const isClubToday = useMemo(() => {
    const dayName = DAY_ORDER[new Date().getDay()]
    return (profile?.club_schedule || []).some((s) => s.jour === dayName)
  }, [profile])

  const nextClub = useMemo(() => nextClubSlot(profile?.club_schedule || []), [profile])

  // --- Mutations ---
  const generateProgramM = useMutation({
    mutationFn: async () => {
      const one_rm_map = {}
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
      return json.program
    },
    onSuccess: () => {
      toast.success('Séance du jour générée.')
      queryClient.invalidateQueries({ queryKey: ['workout_today'] })
      queryClient.invalidateQueries({ queryKey: ['workouts_recent'] })
    },
    onError: (e) => toast.error(e.message || 'Erreur'),
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
        user_id: userId,
        week_key: weekKey,
        focus: JSON.stringify(json.plan),
      })
      if (error) throw error
      return json.plan
    },
    onSuccess: () => {
      toast.success('Focus de la semaine généré.')
      queryClient.invalidateQueries({ queryKey: ['week_focus'] })
    },
    onError: (e) => toast.error(e.message || 'Erreur'),
  })

  const addOneRmM = useMutation({
    mutationFn: async () => {
      if (!newRm.exercise.trim() || !newRm.value_kg) throw new Error('Exercice et charge requis')
      const { error } = await supabase.from('one_rm').insert({
        user_id: userId,
        exercise: newRm.exercise.trim(),
        value_kg: Number(newRm.value_kg),
      })
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('1RM enregistré.')
      setNewRm({ exercise: '', value_kg: '' })
      queryClient.invalidateQueries({ queryKey: ['one_rm'] })
    },
    onError: (e) => toast.error(e.message || 'Erreur'),
  })

  if (!authChecked || (authChecked && !userId)) {
    return (
      <div className="min-h-screen flex items-center justify-center text-purple-300">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    )
  }

  const oneRepMaxes = oneRmQ.data || []
  const oneRmTotal = oneRepMaxes.reduce((s, r) => s + (Number(r.value_kg) || 0), 0)
  const program = todayWorkoutQ.data?.program_json || null
  const recovery = healthTodayQ.data?.recovery_score

  return (
    <div className="min-h-screen bg-[#0b0813] text-zinc-100 font-sans selection:bg-purple-500 selection:text-white pb-12">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-purple-900/30 via-indigo-900/10 to-transparent blur-3xl pointer-events-none -z-10" />

      <header className="sticky top-0 z-30 bg-[#0b0813]/80 backdrop-blur-xl border-b border-purple-900/30 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-purple-600/30">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
              ONYX <span className="text-purple-400 font-light">LAB</span>
            </h1>
            <p className="text-xs text-purple-300/60 font-medium">{profile?.display_name || 'Performance & Conditionnement'}</p>
          </div>
        </div>
        <button
          onClick={() => router.push('/onboarding')}
          className="w-9 h-9 rounded-full bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-purple-200 hover:border-purple-400 transition-colors"
        >
          <User className="w-4 h-4" />
        </button>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">

        {/* METRIQUES RAPIDES */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#130d24]/80 border border-purple-500/20 rounded-2xl p-4 backdrop-blur-md">
            <div className="flex items-center justify-between text-purple-400 mb-2">
              <span className="text-xs font-medium text-purple-300/70">Forme / Charge</span>
              <HeartPulse className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {recovery != null ? recovery : '—'} <span className="text-xs text-purple-400 font-normal">/100</span>
            </div>
            <p className="text-[11px] text-emerald-400 font-medium mt-1">
              {recovery == null ? 'Pas de sync aujourd’hui' : recovery >= 70 ? 'Récupération optimale' : recovery >= 40 ? 'Récupération correcte' : 'Récupération basse'}
            </p>
          </div>

          <div className="bg-[#130d24]/80 border border-purple-500/20 rounded-2xl p-4 backdrop-blur-md">
            <div className="flex items-center justify-between text-purple-400 mb-2">
              <span className="text-xs font-medium text-purple-300/70">Séances récentes</span>
              <Flame className="w-4 h-4 text-fuchsia-400" />
            </div>
            <div className="text-2xl font-black text-white">{(recentWorkoutsQ.data || []).length}</div>
            <p className="text-[11px] text-purple-300/70 font-medium mt-1">sur les 6 derniers jours</p>
          </div>

          <div className="bg-[#130d24]/80 border border-purple-500/20 rounded-2xl p-4 backdrop-blur-md">
            <div className="flex items-center justify-between text-purple-400 mb-2">
              <span className="text-xs font-medium text-purple-300/70">Prochain Club</span>
              <Shield className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-lg font-bold text-white">{nextClub ? `${nextClub.label} • ${nextClub.heure}` : 'Aucun créneau'}</div>
            <p className="text-[11px] text-indigo-300 font-medium mt-1">{nextClub?.label_seance || nextClub?.jour || (profile?.club_schedule?.length ? '' : 'Ajoute tes créneaux dans le profil')}</p>
          </div>

          <div className="bg-[#130d24]/80 border border-purple-500/20 rounded-2xl p-4 backdrop-blur-md">
            <div className="flex items-center justify-between text-purple-400 mb-2">
              <span className="text-xs font-medium text-purple-300/70">Total 1RM</span>
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white">{oneRmTotal || '—'} <span className="text-xs text-purple-400 font-normal">kg</span></div>
            <p className="text-[11px] text-amber-300 font-medium mt-1">{oneRepMaxes.length} exercice{oneRepMaxes.length > 1 ? 's' : ''} suivi{oneRepMaxes.length > 1 ? 's' : ''}</p>
          </div>
        </section>

        {/* CARTES EXPANDABLES */}
        <section className="grid md:grid-cols-2 gap-4 sm:gap-6">

          {/* PLANNING DU JOUR */}
          <div
            onClick={() => setActiveModal('planning')}
            className="group relative bg-gradient-to-br from-[#160f2e] to-[#110b22] border border-purple-500/20 hover:border-purple-500/50 rounded-3xl p-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(124,58,237,0.2)] cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-600/20 text-purple-300 border border-purple-500/30">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white group-hover:text-purple-300 transition-colors">Séance du Jour</h3>
                  <p className="text-xs text-purple-300/60">{isClubToday ? 'Jour de club' : 'Athlétisation'}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-purple-400/60 group-hover:translate-x-1 transition-transform" />
            </div>

            {program ? (
              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/10">
                  <div className="text-sm font-semibold text-white">{program.focus}</div>
                  <div className="text-xs text-purple-300/70 mt-1">{program.type} · {program.intensite} · {program.duree_minutes} min</div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-purple-300/60">Aucune séance générée pour aujourd'hui.</p>
            )}

            <div className="mt-4 pt-3 border-t border-purple-900/30 flex justify-between items-center text-xs text-purple-400 font-medium">
              <span>{program ? 'Cliquer pour le détail complet' : 'Clique pour générer ta séance'}</span>
              <span className="underline">Détails →</span>
            </div>
          </div>

          {/* FOCUS SEMAINE */}
          <div
            onClick={() => setActiveModal('focus')}
            className="group relative bg-gradient-to-br from-[#160f2e] to-[#110b22] border border-purple-500/20 hover:border-purple-500/50 rounded-3xl p-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(124,58,237,0.2)] cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/30">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white group-hover:text-fuchsia-300 transition-colors">Focus Onyx Semaine</h3>
                  <p className="text-xs text-purple-300/60">Objectifs & priorités physiques</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-purple-400/60 group-hover:translate-x-1 transition-transform" />
            </div>

            {weekFocusQ.data?.parsed ? (
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-900/30 to-fuchsia-900/20 border border-purple-500/20">
                <p className="text-sm text-purple-200/80 leading-relaxed">{weekFocusQ.data.parsed.objectif_semaine}</p>
              </div>
            ) : (
              <p className="text-sm text-purple-300/60">Pas encore de plan pour cette semaine.</p>
            )}

            <div className="mt-4 pt-3 border-t border-purple-900/30 flex justify-between items-center text-xs text-purple-400 font-medium">
              <span>{weekFocusQ.data ? 'Voir la programmation complète' : 'Clique pour générer le plan'}</span>
              <span className="underline">Détails →</span>
            </div>
          </div>

          {/* 1RM */}
          <div
            onClick={() => setActiveModal('1rm')}
            className="group relative bg-gradient-to-br from-[#160f2e] to-[#110b22] border border-purple-500/20 hover:border-purple-500/50 rounded-3xl p-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(124,58,237,0.2)] cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white group-hover:text-indigo-300 transition-colors">Performances 1RM</h3>
                  <p className="text-xs text-purple-300/60">Suivi des charges maximales</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-purple-400/60 group-hover:translate-x-1 transition-transform" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {oneRepMaxes.slice(0, 4).map((item) => (
                <div key={item.id} className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/15">
                  <div className="text-xs text-purple-300/70 font-medium truncate">{item.exercise}</div>
                  <div className="text-xl font-black text-white mt-0.5">{item.value_kg} <span className="text-xs font-normal text-purple-400">kg</span></div>
                </div>
              ))}
              {oneRepMaxes.length === 0 && <p className="text-sm text-purple-300/60 col-span-2">Aucun max enregistré.</p>}
            </div>

            <div className="mt-4 pt-3 border-t border-purple-900/30 flex justify-between items-center text-xs text-purple-400 font-medium">
              <span>Gérer et ajouter de nouveaux max</span>
              <span className="underline">Ouvrir le suivi →</span>
            </div>
          </div>

          {/* HISTORIQUE */}
          <div
            onClick={() => setActiveModal('workouts')}
            className="group relative bg-gradient-to-br from-[#160f2e] to-[#110b22] border border-purple-500/20 hover:border-purple-500/50 rounded-3xl p-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(124,58,237,0.2)] cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-violet-600/20 text-violet-300 border border-violet-500/30">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white group-hover:text-violet-300 transition-colors">Dernières Séances</h3>
                  <p className="text-xs text-purple-300/60">Journal des entraînements</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-purple-400/60 group-hover:translate-x-1 transition-transform" />
            </div>

            <div className="space-y-3">
              {(recentWorkoutsQ.data || []).slice(0, 2).map((w) => (
                <div key={w.id} className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/10 flex justify-between items-center">
                  <div>
                    <div className="text-xs text-purple-400 font-semibold">{w.date}</div>
                    <div className="text-sm font-bold text-white">{w.program_json?.focus || w.type_seance}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-purple-300">{w.program_json?.intensite || '—'}</div>
                    <div className="text-[10px] text-purple-300/60">{w.program_json?.duree_minutes ? `${w.program_json.duree_minutes} min` : ''}</div>
                  </div>
                </div>
              ))}
              {(recentWorkoutsQ.data || []).length === 0 && <p className="text-sm text-purple-300/60">Aucune séance enregistrée.</p>}
            </div>

            <div className="mt-4 pt-3 border-t border-purple-900/30 flex justify-between items-center text-xs text-purple-400 font-medium">
              <span>Voir l'historique complet</span>
              <span className="underline">Détails →</span>
            </div>
          </div>
        </section>
      </main>

      {/* MODAL PLANNING / SÉANCE DU JOUR */}
      {activeModal === 'planning' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6">
          <div className="bg-[#120a24] border border-purple-500/30 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-[0_0_50px_rgba(124,58,237,0.3)]">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-bold text-white">Séance du Jour — Détail</h2>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 rounded-full bg-purple-900/30 text-purple-300 hover:bg-purple-800/40">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!program && (
              <div className="text-center py-8 space-y-4">
                <p className="text-sm text-purple-300/70">Aucune séance générée pour aujourd'hui. ONYX peut analyser ton profil, ta récupération et tes dernières séances pour décider séance ou repos.</p>
                <button
                  onClick={() => generateProgramM.mutate()}
                  disabled={generateProgramM.isPending}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {generateProgramM.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Générer la séance du jour
                </button>
              </div>
            )}

            {program && (
              <div className="space-y-5">
                <div className="bg-purple-950/40 border border-purple-500/20 rounded-2xl p-4">
                  <div className="text-xs text-purple-300 uppercase tracking-wider font-semibold mb-1">{program.type} · {program.intensite}</div>
                  <h3 className="text-lg font-bold text-white">{program.focus}</h3>
                  <p className="text-xs text-purple-300/70 mt-1">{program.duree_minutes} min · {program.justification_choix}</p>
                </div>

                {program.echauffement?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-purple-300 uppercase tracking-wider mb-2">Échauffement</h4>
                    <div className="space-y-2">
                      {program.echauffement.map((e, i) => (
                        <div key={i} className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/10 text-sm text-white flex justify-between">
                          <span>{e.nom}</span><span className="text-purple-300/70">{e.duree}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {program.corps_seance?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-purple-300 uppercase tracking-wider mb-2">Corps de séance</h4>
                    <div className="space-y-3">
                      {program.corps_seance.map((bloc, i) => (
                        <div key={i} className="p-3.5 rounded-xl bg-purple-950/30 border border-purple-500/10">
                          <div className="text-sm font-semibold text-white mb-2">{bloc.bloc}</div>
                          <div className="space-y-1.5">
                            {bloc.exercices?.map((ex, j) => (
                              <div key={j} className="text-xs text-purple-200/80 flex justify-between border-b border-purple-900/30 pb-1.5 last:border-0">
                                <span>{ex.nom}</span>
                                <span className="text-purple-300/70">{ex.series}x{ex.reps} · {ex.charge} · repos {ex.repos}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {program.etirements?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-purple-300 uppercase tracking-wider mb-2">Étirements</h4>
                    <div className="flex flex-wrap gap-2">
                      {program.etirements.map((e, i) => (
                        <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          {e.nom} · {e.duree}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {program.conseil_coach && (
                  <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-500/20 text-sm text-indigo-200">
                    💡 {program.conseil_coach}
                  </div>
                )}
                {program.attention && (
                  <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-500/20 text-sm text-amber-200">
                    ⚠️ {program.attention}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL FOCUS SEMAINE */}
      {activeModal === 'focus' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6">
          <div className="bg-[#120a24] border border-fuchsia-500/30 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-[0_0_50px_rgba(217,70,239,0.25)]">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <Target className="w-6 h-6 text-fuchsia-400" />
                <h2 className="text-xl font-bold text-white">Focus Onyx Semaine</h2>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 rounded-full bg-purple-900/30 text-purple-300 hover:bg-purple-800/40">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!weekFocusQ.data && (
              <div className="text-center py-8 space-y-4">
                <p className="text-sm text-purple-300/70">Pas encore de plan pour la semaine du {weekKey}.</p>
                <button
                  onClick={() => generateWeekM.mutate()}
                  disabled={generateWeekM.isPending}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-50"
                >
                  {generateWeekM.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Générer le focus de la semaine
                </button>
              </div>
            )}

            {weekFocusQ.data?.parsed && (
              <div className="space-y-4">
                <div className="bg-gradient-to-br from-fuchsia-950/40 to-purple-950/40 border border-fuchsia-500/30 rounded-2xl p-5">
                  <h3 className="text-lg font-bold text-white mb-2">Objectif de la semaine</h3>
                  <p className="text-sm text-purple-200/80 leading-relaxed">{weekFocusQ.data.parsed.objectif_semaine}</p>
                </div>
                <div className="space-y-2">
                  {(weekFocusQ.data.parsed.week || []).map((d, i) => (
                    <div key={i} className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/20 flex items-center gap-3">
                      {d.type === 'seance' ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <Clock className="w-5 h-5 text-purple-400 shrink-0" />}
                      <div className="flex-1">
                        <div className="text-sm text-white font-semibold">{d.jour} · {d.focus}</div>
                        <div className="text-xs text-purple-300/60">{d.intensite} {d.duree_minutes ? `· ${d.duree_minutes} min` : ''} {d.club === 'oui' ? '· Club' : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1RM */}
      {activeModal === '1rm' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6">
          <div className="bg-[#120a24] border border-indigo-500/30 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-[0_0_50px_rgba(99,102,241,0.25)]">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <Dumbbell className="w-6 h-6 text-indigo-400" />
                <h2 className="text-xl font-bold text-white">Suivi des Charges Maximales (1RM)</h2>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 rounded-full bg-purple-900/30 text-purple-300 hover:bg-purple-800/40">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid gap-3">
                {oneRepMaxes.map((item) => (
                  <div key={item.id} className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/20 flex items-center justify-between">
                    <div className="text-base font-bold text-white">{item.exercise}</div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-white">{item.value_kg}</span>
                      <span className="text-xs text-purple-400 font-bold ml-1">kg</span>
                    </div>
                  </div>
                ))}
                {oneRepMaxes.length === 0 && <p className="text-sm text-purple-300/60">Aucun max enregistré pour l'instant.</p>}
              </div>

              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-3">
                <h4 className="text-sm font-bold text-white">Ajouter / mettre à jour un max</h4>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Exercice (ex: Squat)"
                    value={newRm.exercise}
                    onChange={(e) => setNewRm((s) => ({ ...s, exercise: e.target.value }))}
                    className="bg-purple-950/60 border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-400"
                  />
                  <input
                    type="number"
                    placeholder="Charge (kg)"
                    value={newRm.value_kg}
                    onChange={(e) => setNewRm((s) => ({ ...s, value_kg: e.target.value }))}
                    className="bg-purple-950/60 border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-400"
                  />
                </div>
                <button
                  onClick={() => addOneRmM.mutate()}
                  disabled={addOneRmM.isPending}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors disabled:opacity-50"
                >
                  Enregistrer la performance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HISTORIQUE */}
      {activeModal === 'workouts' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6">
          <div className="bg-[#120a24] border border-violet-500/30 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-[0_0_50px_rgba(139,92,246,0.25)]">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <Activity className="w-6 h-6 text-violet-400" />
                <h2 className="text-xl font-bold text-white">Journal des Séances</h2>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 rounded-full bg-purple-900/30 text-purple-300 hover:bg-purple-800/40">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {(recentWorkoutsQ.data || []).map((w) => (
                <div key={w.id} className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/20">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-xs text-purple-400 font-bold">{w.date}</span>
                      <h3 className="text-base font-bold text-white">{w.program_json?.focus || w.type_seance}</h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
                      {w.status}
                    </span>
                  </div>
                  {w.program_json?.conseil_coach && (
                    <p className="text-xs text-purple-200/80 leading-relaxed">{w.program_json.conseil_coach}</p>
                  )}
                </div>
              ))}
              {(recentWorkoutsQ.data || []).length === 0 && <p className="text-sm text-purple-300/60">Aucune séance enregistrée pour l'instant.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
