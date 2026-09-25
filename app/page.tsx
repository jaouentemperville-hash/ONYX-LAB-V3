'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  Calendar, Dumbbell, Activity, X, Clock, Target, Zap, User, Loader2,
  Copy, Send, Settings, MessageCircle, ChevronRight, Salad, Flame, HeartPulse, Scale,
} from 'lucide-react'
import {
  Profile, HealthData, Workout, OneRm, WeekFocusRow, ProgramJson, WeekPlan, ChatMsg,
  todayStr, daysAgoStr, getWeekKey, computeStrain, nextClubSlot, intensityColors, typeLabel,
  computeBmi, bmiLabel, estimateTdee, DAY_ORDER, SPORTS, NIVEAUX, NIVEAUX_ACTIVITE,
} from '@/lib/onyx/shared'
import { useAuthGuard } from '@/lib/onyx/client'
import {
  AppShell, GlassCard, Ring, Pill, FullLoader, Field, TextInput, TextArea, Select, PrimaryButton,
} from '@/components/onyx/ui'

export default function OnyxHome() {
  const router = useRouter()
  const { userId, authChecked, supabase } = useAuthGuard()
  const queryClient = useQueryClient()

  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false)
  const [chatOpen, setChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatHistory, setChatHistory] = useState<ChatMsg[]>([])
  const [chatLoading, setChatLoading] = useState(false)

  const [pf, setPf] = useState({
    display_name: '', sport: 'MMA', niveau: 'intermediaire', age: '', sexe: 'homme',
    poids_kg: '', taille_cm: '', poids_objectif_kg: '', niveau_activite: 'modere', objectifs: '',
  })

  const today = todayStr()
  const weekKey = getWeekKey()

  const profileQ = useQuery<Profile>({
    queryKey: ['profile', userId], enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', userId as string).single()
      if (error) throw error
      return data as Profile
    },
  })
  const healthTodayQ = useQuery<HealthData | null>({
    queryKey: ['health_today', userId, today], enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('health_data').select('*').eq('user_id', userId as string).eq('date', today).maybeSingle()
      if (error) throw error
      return data as HealthData | null
    },
  })
  const todayWorkoutQ = useQuery<Workout | null>({
    queryKey: ['workout_today', userId, today], enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('workouts').select('*').eq('user_id', userId as string).eq('date', today)
        .order('created_at', { ascending: false }).limit(1).maybeSingle()
      if (error) throw error
      return data as Workout | null
    },
  })
  const weekWorkoutsQ = useQuery<Workout[]>({
    queryKey: ['workouts_week', userId], enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('workouts').select('*').eq('user_id', userId as string)
        .gte('date', daysAgoStr(6)).order('date', { ascending: true })
      if (error) throw error
      return (data as Workout[]) || []
    },
  })
  const recentWorkoutsQ = useQuery<Workout[]>({
    queryKey: ['workouts_recent', userId], enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('workouts').select('*').eq('user_id', userId as string)
        .order('date', { ascending: false }).limit(8)
      if (error) throw error
      return (data as Workout[]) || []
    },
  })
  const oneRmQ = useQuery<OneRm[]>({
    queryKey: ['one_rm', userId], enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('one_rm').select('*').eq('user_id', userId as string).order('date', { ascending: false })
      if (error) throw error
      const latest: Record<string, OneRm> = {}
      for (const row of (data as OneRm[]) || []) if (!latest[row.exercise]) latest[row.exercise] = row
      return Object.values(latest)
    },
  })
  const weekFocusQ = useQuery<WeekFocusRow | null>({
    queryKey: ['week_focus', userId, weekKey], enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('week_focus').select('*').eq('user_id', userId as string).eq('week_key', weekKey).maybeSingle()
      if (error) throw error
      if (!data) return null
      try { return { ...data, parsed: JSON.parse(data.focus) } as WeekFocusRow }
      catch { return { ...data, parsed: { objectif_semaine: data.focus, week: [] } } as WeekFocusRow }
    },
  })

  const profile = profileQ.data
  const program = todayWorkoutQ.data?.program_json || null
  const recovery = healthTodayQ.data?.recovery_score ?? null
  const strain = computeStrain(program, healthTodayQ.data?.fatigue ?? null)
  const oneRepMaxes = oneRmQ.data || []
  const bmi = computeBmi(profile?.poids_kg ?? null, profile?.taille_cm ?? null)
  const tdee = profile ? estimateTdee(profile) : null

  useEffect(() => {
    if (profile) setPf({
      display_name: profile.display_name || '', sport: profile.sport || 'MMA', niveau: profile.niveau || 'intermediaire',
      age: profile.age != null ? String(profile.age) : '', sexe: profile.sexe || 'homme',
      poids_kg: profile.poids_kg != null ? String(profile.poids_kg) : '',
      taille_cm: profile.taille_cm != null ? String(profile.taille_cm) : '',
      poids_objectif_kg: profile.poids_objectif_kg != null ? String(profile.poids_objectif_kg) : '',
      niveau_activite: profile.niveau_activite || 'modere', objectifs: profile.objectifs || '',
    })
  }, [profile])

  const isClubToday = useMemo(() => {
    const dayName = DAY_ORDER[new Date().getDay()]
    return (profile?.club_schedule || []).some((s) => s.jour === dayName)
  }, [profile])
  const nextClub = useMemo(() => nextClubSlot(profile?.club_schedule || []), [profile])

  const weekBars = useMemo(() => {
    const bars: { date: string; label: string; load: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const dayLabel = ['D', 'L', 'M', 'M', 'J', 'V', 'S'][d.getDay()]
      const dayWorkouts = (weekWorkoutsQ.data || []).filter((w) => w.date === dateStr)
      const load = dayWorkouts.reduce((sum, w) => sum + computeStrain(w.program_json, null), 0)
      bars.push({ date: dateStr, label: dayLabel, load: Math.round(load * 10) / 10 })
    }
    return bars
  }, [weekWorkoutsQ.data])
  const maxBarLoad = Math.max(...weekBars.map((b) => b.load), 1)

  const generateProgramM = useMutation({
    mutationFn: async () => {
      const one_rm_map: Record<string, number> = {}
      for (const r of oneRmQ.data || []) one_rm_map[r.exercise] = r.value_kg
      const res = await fetch('/api/coach/program', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sport: profile?.sport || 'MMA', goals: profile?.objectifs || '', level: profile?.niveau || 'intermediaire',
          poids_kg: profile?.poids_kg, taille_cm: profile?.taille_cm, club_schedule: profile?.club_schedule || [],
          one_rm: one_rm_map, is_club_day: isClubToday, hrv: healthTodayQ.data?.hrv ?? null,
          sleep_hours: healthTodayQ.data?.sleep_hours ?? null, recovery_score: healthTodayQ.data?.recovery_score ?? null,
          fatigue: healthTodayQ.data?.fatigue ?? null, recent_sessions: (recentWorkoutsQ.data || []).slice(0, 5),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Erreur g\u00e9n\u00e9ration')
      if (!json.program) throw new Error('R\u00e9ponse IA invalide')
      const { error } = await supabase.from('workouts').upsert({
        user_id: userId, date: today, sport: profile?.sport || 'MMA', type_seance: 'manuel', program_json: json.program, status: 'planifie',
      })
      if (error) throw error
      return json.program as ProgramJson
    },
    onSuccess: () => {
      toast.success('S\u00e9ance du jour g\u00e9n\u00e9r\u00e9e.')
      queryClient.invalidateQueries({ queryKey: ['workout_today'] })
      queryClient.invalidateQueries({ queryKey: ['workouts_recent'] })
      queryClient.invalidateQueries({ queryKey: ['workouts_week'] })
      router.push('/programme/jour')
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur'),
  })

  const generateWeekM = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/coach/week', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sport: profile?.sport || 'MMA', goals: profile?.objectifs || '', level: profile?.niveau || 'intermediaire',
          poids_kg: profile?.poids_kg, club_schedule: profile?.club_schedule || [], hrv: healthTodayQ.data?.hrv ?? null,
          sleep_hours: healthTodayQ.data?.sleep_hours ?? null, recovery_score: healthTodayQ.data?.recovery_score ?? null,
          fatigue: healthTodayQ.data?.fatigue ?? null, recent_sessions: (recentWorkoutsQ.data || []).slice(0, 5),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Erreur g\u00e9n\u00e9ration semaine')
      if (!json.plan) throw new Error('R\u00e9ponse IA invalide')
      const { error } = await supabase.from('week_focus').upsert({ user_id: userId, week_key: weekKey, focus: JSON.stringify(json.plan) })
      if (error) throw error
      return json.plan as WeekPlan
    },
    onSuccess: () => {
      toast.success('Plan de la semaine g\u00e9n\u00e9r\u00e9.')
      queryClient.invalidateQueries({ queryKey: ['week_focus'] })
      router.push('/programme/semaine')
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur'),
  })

  const saveProfileM = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error('Non connect\u00e9')
      const { error } = await supabase.from('profiles').update({
        display_name: pf.display_name || null, sport: pf.sport, niveau: pf.niveau,
        age: pf.age === '' ? null : Number(pf.age), sexe: pf.sexe || null,
        poids_kg: pf.poids_kg === '' ? null : Number(pf.poids_kg),
        taille_cm: pf.taille_cm === '' ? null : Number(pf.taille_cm),
        poids_objectif_kg: pf.poids_objectif_kg === '' ? null : Number(pf.poids_objectif_kg),
        niveau_activite: pf.niveau_activite || null, objectifs: pf.objectifs || null,
      }).eq('id', userId)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Profil mis \u00e0 jour.')
      setProfileDrawerOpen(false)
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: (e: Error) => toast.error(e.message || 'Erreur'),
  })

  async function sendChat() {
    const text = chatInput.trim()
    if (!text) return
    const nextHistory: ChatMsg[] = [...chatHistory, { role: 'user', content: text }]
    setChatHistory(nextHistory); setChatInput(''); setChatLoading(true)
    try {
      const res = await fetch('/api/coach/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextHistory, sport: profile?.sport || 'MMA', context: { profile: { niveau: profile?.niveau, objectifs: profile?.objectifs }, seance_du_jour: program } }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error || 'Erreur du coach')
      setChatHistory((h) => [...h, { role: 'assistant', content: json.reply || '\u2026' }])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur du coach')
    } finally { setChatLoading(false) }
  }

  function copyToken() {
    if (!profile?.sync_token) return
    navigator.clipboard.writeText(profile.sync_token)
    toast.success('Token copi\u00e9.')
  }

  if (!authChecked || !userId) return <FullLoader />

  const ic = intensityColors(program?.intensite)

  return (
    <AppShell>
      {/* HEADER */}
      <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-violet-100 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-violet-600 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-slate-800">ONYX <span className="text-violet-500 font-light">LAB</span></h1>
            <p className="text-[11px] text-violet-500/80 font-medium">Bonjour {profile?.display_name || 'athl\u00e8te'} \u00b7 {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={copyToken} title="Copier token de synchro" className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-50 border border-violet-200 text-xs text-violet-600 hover:border-violet-400 transition-colors">
            <span className={`w-1.5 h-1.5 rounded-full ${healthTodayQ.data ? 'bg-emerald-400' : 'bg-slate-300'}`} /> Sync <Copy className="w-3 h-3" />
          </button>
          <button onClick={() => setProfileDrawerOpen(true)} className="w-9 h-9 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center text-white shadow-md shadow-violet-500/30">
            <User className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-5 space-y-5 animate-onyx-pop">
        {/* RINGS */}
        <section className="grid grid-cols-2 gap-3">
          <GlassCard className="p-4 flex flex-col items-center justify-center">
            <Ring value={recovery ?? 0} max={100} unit="%" label="Forme" from="#34D399" to="#8B5CF6" />
            <p className="text-[11px] text-slate-500 mt-2 text-center">{recovery == null ? 'Pas de sync aujourd\u2019hui' : recovery >= 70 ? 'R\u00e9cup optimale' : recovery >= 40 ? 'R\u00e9cup correcte' : 'R\u00e9cup basse'}</p>
          </GlassCard>
          <GlassCard className="p-4 flex flex-col items-center justify-center">
            <Ring value={strain} max={21} label="Charge" from="#A855F7" to="#DB2777" />
            <p className="text-[11px] text-slate-500 mt-2 text-center">Effort estim\u00e9 du jour</p>
          </GlassCard>
        </section>

        {/* POIDS + BMI + TDEE */}
        <GlassCard className="p-5" interactive onClick={() => setProfileDrawerOpen(true)}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-violet-500 uppercase tracking-wider flex items-center gap-1.5"><Scale className="w-4 h-4" /> Corps & \u00e9nergie</span>
            <ChevronRight className="w-4 h-4 text-violet-300" />
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-2xl font-black text-slate-800">{profile?.poids_kg ?? '\u2014'}<span className="text-xs font-normal text-violet-400 ml-0.5">kg</span></div>
              <div className="text-[10px] text-slate-400 font-semibold mt-0.5">POIDS{profile?.poids_objectif_kg != null ? ` \u2192 ${profile.poids_objectif_kg}kg` : ''}</div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-800">{bmi ?? '\u2014'}</div>
              <div className="text-[10px] text-slate-400 font-semibold mt-0.5">IMC \u00b7 {bmiLabel(bmi)}</div>
            </div>
            <div>
              <div className="text-2xl font-black text-slate-800">{tdee ?? '\u2014'}</div>
              <div className="text-[10px] text-slate-400 font-semibold mt-0.5">KCAL/JOUR</div>
            </div>
          </div>
        </GlassCard>

        {/* WEEKLY LOAD */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Charge hebdomadaire</h3>
            <Activity className="w-4 h-4 text-violet-400" />
          </div>
          <div className="flex items-end justify-between gap-2 h-24">
            {weekBars.map((b) => (
              <div key={b.date} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex-1 flex items-end">
                  <div className="w-full rounded-t-lg bg-gradient-to-t from-violet-500 via-purple-400 to-fuchsia-400" style={{ height: `${Math.max((b.load / maxBarLoad) * 100, 5)}%` }} />
                </div>
                <span className={`text-[10px] font-bold ${b.date === today ? 'text-fuchsia-500' : 'text-violet-300'}`}>{b.label}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* SEANCE DU JOUR */}
        <GlassCard className="p-5" interactive={!!program} onClick={program ? () => router.push('/programme/jour') : undefined}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-violet-100 text-violet-600"><Calendar className="w-5 h-5" /></div>
              <div>
                <h3 className="font-bold text-base text-slate-800">S\u00e9ance IA du jour</h3>
                <p className="text-[11px] text-violet-500">{isClubToday ? 'Jour de club d\u00e9tect\u00e9' : 'Athl\u00e9tisation personnalis\u00e9e'}</p>
              </div>
            </div>
            {program && <ChevronRight className="w-5 h-5 text-violet-300" />}
          </div>
          {!program ? (
            <div className="space-y-3">
              <p className="text-sm text-slate-500">Aucune s\u00e9ance g\u00e9n\u00e9r\u00e9e. ONYX analyse ta r\u00e9cup et tes derni\u00e8res s\u00e9ances pour d\u00e9cider s\u00e9ance ou repos.</p>
              <PrimaryButton onClick={() => generateProgramM.mutate()} disabled={generateProgramM.isPending}>
                {generateProgramM.isPending && <Loader2 className="w-4 h-4 animate-spin" />} G\u00e9n\u00e9rer ma s\u00e9ance
              </PrimaryButton>
            </div>
          ) : (
            <div className="rounded-2xl p-4 text-white" style={{ background: `linear-gradient(135deg, ${ic.from}, ${ic.to})` }}>
              <div className="flex items-center gap-2 mb-1">
                <Pill tone="violet"><span className="text-white/90">{typeLabel(program.type)}</span></Pill>
                <span className="text-xs font-semibold uppercase tracking-wide bg-white/20 rounded-full px-2 py-0.5">{program.intensite}</span>
              </div>
              <h4 className="text-lg font-black">{program.focus}</h4>
              <p className="text-xs text-white/80 mt-1">{program.duree_minutes} min \u00b7 {(program.corps_seance || []).length} blocs {program.rpe_reel != null ? `\u00b7 RPE ${program.rpe_reel}/10` : ''}</p>
              <div className="mt-3 inline-flex items-center gap-1 text-xs font-semibold bg-white/20 rounded-full px-3 py-1.5">Voir le d\u00e9tail <ChevronRight className="w-3.5 h-3.5" /></div>
            </div>
          )}
        </GlassCard>

        {/* GRID : Focus semaine + Force */}
        <div className="grid sm:grid-cols-2 gap-4">
          <GlassCard className="p-5" interactive onClick={() => router.push('/programme/semaine')}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-fuchsia-100 text-fuchsia-600"><Target className="w-5 h-5" /></div>
                <h3 className="font-bold text-base text-slate-800">Programme semaine</h3>
              </div>
              <ChevronRight className="w-5 h-5 text-violet-300" />
            </div>
            {weekFocusQ.data ? (
              <>
                <p className="text-sm text-slate-600 line-clamp-2">{weekFocusQ.data.parsed.objectif_semaine}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(weekFocusQ.data.parsed.week || []).slice(0, 4).map((d, i) => (
                    <span key={i} className="text-[10px] font-semibold px-2 py-1 rounded-lg bg-violet-50 text-violet-600 border border-violet-100">{(d.jour || '').slice(0, 3)} \u00b7 {d.intensite}</span>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">Pas encore de plan pour {weekKey}. Ouvre pour g\u00e9n\u00e9rer.</p>
            )}
          </GlassCard>

          <GlassCard className="p-5" interactive onClick={() => router.push('/force')}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-indigo-100 text-indigo-600"><Dumbbell className="w-5 h-5" /></div>
                <h3 className="font-bold text-base text-slate-800">Force \u00b7 1RM</h3>
              </div>
              <ChevronRight className="w-5 h-5 text-violet-300" />
            </div>
            {oneRepMaxes.length ? (
              <div className="space-y-1.5">
                {oneRepMaxes.slice(0, 3).map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600 font-medium truncate">{r.exercise}</span>
                    <span className="font-black text-slate-800">{r.value_kg}<span className="text-xs font-normal text-violet-400"> kg</span></span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">Aucun max enregistr\u00e9. Ouvre pour suivre ta progression.</p>
            )}
          </GlassCard>
        </div>

        {/* PLANNING & NUTRITION */}
        <div className="grid sm:grid-cols-2 gap-4">
          <GlassCard className="p-5" interactive onClick={() => router.push('/planning')}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-violet-100 text-violet-600"><Clock className="w-5 h-5" /></div>
                <h3 className="font-bold text-base text-slate-800">Planning & Club</h3>
              </div>
              <ChevronRight className="w-5 h-5 text-violet-300" />
            </div>
            {nextClub ? (
              <p className="text-sm text-slate-600">Prochain : <span className="font-semibold text-slate-800">{nextClub.label}</span> \u00b7 {nextClub.dayLabel} {nextClub.heure}</p>
            ) : (
              <p className="text-sm text-slate-500">Aucun cr\u00e9neau. Ajoute tes horaires de club.</p>
            )}
          </GlassCard>

          <GlassCard className="p-5" interactive onClick={() => router.push('/nutrition')}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-600"><Salad className="w-5 h-5" /></div>
                <h3 className="font-bold text-base text-slate-800">Nutrition</h3>
              </div>
              <ChevronRight className="w-5 h-5 text-violet-300" />
            </div>
            <p className="text-sm text-slate-500">Journal repas, estimation macros par photo & analyse IA.</p>
          </GlassCard>
        </div>
      </main>

      {/* PROFILE MODAL */}
      {profileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setProfileDrawerOpen(false)} />
          <div className="relative w-full max-w-md h-full bg-gradient-to-b from-white to-violet-50 border-l border-violet-100 p-5 overflow-y-auto onyx-scroll animate-onyx-pop">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><Settings className="w-5 h-5 text-violet-500" /> Mon profil</h2>
              <button onClick={() => setProfileDrawerOpen(false)} className="p-2 rounded-full bg-violet-100 text-violet-600 hover:bg-violet-200"><X className="w-4 h-4" /></button>
            </div>

            {/* Live stats */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              <div className="bg-white rounded-2xl border border-violet-100 p-3 text-center"><div className="text-xl font-black text-slate-800">{computeBmi(pf.poids_kg ? Number(pf.poids_kg) : null, pf.taille_cm ? Number(pf.taille_cm) : null) ?? '\u2014'}</div><div className="text-[9px] text-violet-400 font-bold uppercase">IMC</div></div>
              <div className="bg-white rounded-2xl border border-violet-100 p-3 text-center"><div className="text-xl font-black text-slate-800">{estimateTdee({ poids_kg: pf.poids_kg ? Number(pf.poids_kg) : null, taille_cm: pf.taille_cm ? Number(pf.taille_cm) : null, age: pf.age ? Number(pf.age) : null, sexe: pf.sexe, niveau_activite: pf.niveau_activite }) ?? '\u2014'}</div><div className="text-[9px] text-violet-400 font-bold uppercase">Kcal/j</div></div>
              <div className="bg-white rounded-2xl border border-violet-100 p-3 text-center"><div className="text-xl font-black text-slate-800">{pf.poids_objectif_kg && pf.poids_kg ? `${(Number(pf.poids_kg) - Number(pf.poids_objectif_kg)).toFixed(1)}` : '\u2014'}</div><div className="text-[9px] text-violet-400 font-bold uppercase">kg \u00e0 faire</div></div>
            </div>

            <div className="space-y-4">
              <Field label="Nom / pseudo"><TextInput value={pf.display_name} onChange={(e) => setPf((p) => ({ ...p, display_name: e.target.value }))} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Sport"><Select value={pf.sport} onChange={(e) => setPf((p) => ({ ...p, sport: e.target.value }))}>{SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
                <Field label="Niveau"><Select value={pf.niveau} onChange={(e) => setPf((p) => ({ ...p, niveau: e.target.value }))}>{NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="\u00c2ge"><TextInput type="number" value={pf.age} onChange={(e) => setPf((p) => ({ ...p, age: e.target.value }))} /></Field>
                <Field label="Sexe"><Select value={pf.sexe} onChange={(e) => setPf((p) => ({ ...p, sexe: e.target.value }))}><option value="homme">Homme</option><option value="femme">Femme</option></Select></Field>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Poids (kg)"><TextInput type="number" step="0.1" value={pf.poids_kg} onChange={(e) => setPf((p) => ({ ...p, poids_kg: e.target.value }))} /></Field>
                <Field label="Objectif (kg)"><TextInput type="number" step="0.1" value={pf.poids_objectif_kg} onChange={(e) => setPf((p) => ({ ...p, poids_objectif_kg: e.target.value }))} /></Field>
                <Field label="Taille (cm)"><TextInput type="number" value={pf.taille_cm} onChange={(e) => setPf((p) => ({ ...p, taille_cm: e.target.value }))} /></Field>
              </div>
              <Field label="Niveau d'activit\u00e9"><Select value={pf.niveau_activite} onChange={(e) => setPf((p) => ({ ...p, niveau_activite: e.target.value }))}>{NIVEAUX_ACTIVITE.map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field>
              <Field label="Objectifs"><TextArea rows={3} value={pf.objectifs} onChange={(e) => setPf((p) => ({ ...p, objectifs: e.target.value }))} placeholder="Ex: prise de masse s\u00e8che, combat dans 8 semaines\u2026" /></Field>

              <button onClick={() => { setProfileDrawerOpen(false); router.push('/planning') }} className="text-xs text-violet-500 underline font-medium">G\u00e9rer mes cr\u00e9neaux de club \u2192</button>

              {profile?.sync_token && (
                <div className="bg-violet-100/60 border border-violet-200 rounded-xl p-3">
                  <p className="text-[11px] text-violet-600 mb-1 font-semibold">Token de synchro Apple Health</p>
                  <div className="flex items-center gap-2">
                    <code className="text-[11px] text-violet-700 break-all">{profile.sync_token}</code>
                    <button onClick={copyToken} className="text-[11px] text-violet-500 underline shrink-0">Copier</button>
                  </div>
                </div>
              )}

              <PrimaryButton onClick={() => saveProfileM.mutate()} disabled={saveProfileM.isPending} className="w-full">
                {saveProfileM.isPending ? 'Enregistrement\u2026' : 'Enregistrer'}
              </PrimaryButton>
              <button onClick={async () => { await supabase.auth.signOut(); router.replace('/onboarding') }} className="w-full text-xs text-slate-400 hover:text-slate-600 underline">Se d\u00e9connecter</button>
            </div>
          </div>
        </div>
      )}

      {/* COACH CHAT */}
      <div className="fixed bottom-24 left-0 right-0 z-40 px-4">
        <div className="max-w-2xl mx-auto">
          {chatOpen && (
            <div className="mb-2 max-h-72 overflow-y-auto onyx-scroll bg-white/95 backdrop-blur-xl border border-violet-100 rounded-2xl p-4 space-y-2 shadow-xl">
              {chatHistory.length === 0 && <p className="text-xs text-slate-400 text-center py-4">Pose une question \u00e0 ton coach ONYX \ud83e\uddec</p>}
              {chatHistory.map((m, i) => (
                <div key={i} className={`text-sm px-3 py-2 rounded-2xl max-w-[85%] ${m.role === 'user' ? 'bg-gradient-to-tr from-violet-600 to-fuchsia-500 text-white ml-auto' : 'bg-violet-50 text-slate-700'}`}>{m.content}</div>
              ))}
              {chatLoading && <div className="text-xs text-violet-500 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin" /> ONYX r\u00e9fl\u00e9chit\u2026</div>}
            </div>
          )}
          <div className="flex items-center gap-2 bg-white/95 backdrop-blur-xl border border-violet-100 rounded-full px-2 py-2 shadow-[0_10px_40px_rgba(139,92,246,0.25)]">
            <button onClick={() => setChatOpen((v) => !v)} className="w-9 h-9 shrink-0 rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center text-white"><MessageCircle className="w-4 h-4" /></button>
            <input value={chatInput} onChange={(e) => setChatInput(e.target.value)} onFocus={() => setChatOpen(true)} onKeyDown={(e) => { if (e.key === 'Enter') sendChat() }} placeholder="Demande \u00e0 ton coach\u2026" className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 focus:outline-none px-2" />
            <button onClick={sendChat} disabled={chatLoading || !chatInput.trim()} className="w-9 h-9 shrink-0 rounded-full bg-violet-600 hover:bg-violet-500 flex items-center justify-center text-white disabled:opacity-40"><Send className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
