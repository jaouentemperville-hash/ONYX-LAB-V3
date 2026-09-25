'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, RefreshCw, CheckCircle2, Circle, Flame, Save } from 'lucide-react'
import { Profile, HealthData, Workout, OneRm, ProgramJson, todayStr, daysAgoStr, intensityColors, typeLabel } from '@/lib/onyx/shared'
import { useAuthGuard } from '@/lib/onyx/client'
import { AppShell, BackBar, GlassCard, FullLoader, PrimaryButton, Pill } from '@/components/onyx/ui'

export default function DayProgramPage() {
  const router = useRouter()
  const { userId, authChecked, supabase } = useAuthGuard()
  const queryClient = useQueryClient()
  const today = todayStr()
  const [prog, setProg] = useState<ProgramJson | null>(null)
  const [rpe, setRpe] = useState(7)

  const profileQ = useQuery<Profile>({ queryKey: ['profile', userId], enabled: !!userId, queryFn: async () => { const { data, error } = await supabase.from('profiles').select('*').eq('id', userId as string).single(); if (error) throw error; return data as Profile } })
  const healthQ = useQuery<HealthData | null>({ queryKey: ['health_today', userId, today], enabled: !!userId, queryFn: async () => { const { data } = await supabase.from('health_data').select('*').eq('user_id', userId as string).eq('date', today).maybeSingle(); return (data as HealthData) || null } })
  const recentQ = useQuery<Workout[]>({ queryKey: ['workouts_recent', userId], enabled: !!userId, queryFn: async () => { const { data } = await supabase.from('workouts').select('*').eq('user_id', userId as string).gte('date', daysAgoStr(6)).order('date', { ascending: false }).limit(8); return (data as Workout[]) || [] } })
  const oneRmQ = useQuery<OneRm[]>({ queryKey: ['one_rm', userId], enabled: !!userId, queryFn: async () => { const { data } = await supabase.from('one_rm').select('*').eq('user_id', userId as string).order('date', { ascending: false }); const latest: Record<string, OneRm> = {}; for (const r of (data as OneRm[]) || []) if (!latest[r.exercise]) latest[r.exercise] = r; return Object.values(latest) } })
  const workoutQ = useQuery<Workout | null>({
    queryKey: ['workout_today', userId, today], enabled: !!userId,
    queryFn: async () => { const { data, error } = await supabase.from('workouts').select('*').eq('user_id', userId as string).eq('date', today).order('created_at', { ascending: false }).limit(1).maybeSingle(); if (error) throw error; return data as Workout | null },
  })

  useEffect(() => { if (workoutQ.data?.program_json) { setProg(JSON.parse(JSON.stringify(workoutQ.data.program_json))); if (workoutQ.data.program_json.rpe_reel != null) setRpe(workoutQ.data.program_json.rpe_reel) } }, [workoutQ.data])

  const profile = profileQ.data

  const saveProgM = useMutation({
    mutationFn: async (p: ProgramJson) => {
      if (!workoutQ.data) throw new Error('Aucune séance')
      const { error } = await supabase.from('workouts').update({ program_json: p }).eq('id', workoutQ.data.id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Progression enregistrée.'); queryClient.invalidateQueries({ queryKey: ['workout_today'] }) },
    onError: (e: Error) => toast.error(e.message),
  })
  const finishM = useMutation({
    mutationFn: async () => {
      if (!workoutQ.data) throw new Error('Aucune séance')
      const p = { ...(prog || {}), rpe_reel: rpe }
      const { error } = await supabase.from('workouts').update({ program_json: p, status: 'fait' }).eq('id', workoutQ.data.id)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Séance terminée · RPE enregistré.'); queryClient.invalidateQueries({ queryKey: ['workout_today'] }); queryClient.invalidateQueries({ queryKey: ['workouts_week'] }) },
    onError: (e: Error) => toast.error(e.message),
  })
  const genM = useMutation({
    mutationFn: async () => {
      const one_rm_map: Record<string, number> = {}
      for (const r of oneRmQ.data || []) one_rm_map[r.exercise] = r.value_kg
      const isClub = (profile?.club_schedule || []).some((s) => s.jour === ['Dimanche','Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi'][new Date().getDay()])
      const res = await fetch('/api/coach/program', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sport: profile?.sport || 'MMA', goals: profile?.objectifs || '', level: profile?.niveau || 'intermediaire', poids_kg: profile?.poids_kg, taille_cm: profile?.taille_cm, club_schedule: profile?.club_schedule || [], one_rm: one_rm_map, is_club_day: isClub, hrv: healthQ.data?.hrv ?? null, sleep_hours: healthQ.data?.sleep_hours ?? null, recovery_score: healthQ.data?.recovery_score ?? null, fatigue: healthQ.data?.fatigue ?? null, recent_sessions: (recentQ.data || []).slice(0, 5) }) })
      const json = await res.json()
      if (!res.ok || !json.program) throw new Error(json?.error || 'Réponse IA invalide')
      const { error } = await supabase.from('workouts').upsert({ user_id: userId, date: today, sport: profile?.sport || 'MMA', type_seance: 'manuel', program_json: json.program, status: 'planifie' })
      if (error) throw error
    },
    onSuccess: () => { toast.success('Nouvelle séance générée.'); queryClient.invalidateQueries({ queryKey: ['workout_today'] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  function toggleExo(bi: number, ei: number) {
    setProg((prev) => { if (!prev) return prev; const corps = JSON.parse(JSON.stringify(prev.corps_seance || [])); corps[bi].exercices[ei].done = !corps[bi].exercices[ei].done; return { ...prev, corps_seance: corps } })
  }

  if (!authChecked || !userId) return <FullLoader />
  const ic = intensityColors(prog?.intensite)
  const totalExos = (prog?.corps_seance || []).reduce((s, b) => s + (b.exercices?.length || 0), 0)
  const doneExos = (prog?.corps_seance || []).reduce((s, b) => s + (b.exercices || []).filter((e) => e.done).length, 0)

  return (
    <AppShell>
      <BackBar title="Séance du jour" subtitle={new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 space-y-5 animate-onyx-pop">
        {!prog ? (
          <GlassCard className="p-8 text-center">
            <Flame className="w-8 h-8 text-violet-400 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 mb-1">Aucune séance aujourd’hui</h3>
            <p className="text-sm text-slate-500 mb-4">Laisse ONYX décider séance ou repos selon ta récupération.</p>
            <PrimaryButton onClick={() => genM.mutate()} disabled={genM.isPending} className="mx-auto">{genM.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Générer</PrimaryButton>
          </GlassCard>
        ) : (
          <>
            <div className="rounded-3xl p-5 text-white shadow-lg" style={{ background: `linear-gradient(135deg, ${ic.from}, ${ic.to})` }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-wide bg-white/20 rounded-full px-2.5 py-0.5">{typeLabel(prog.type)}</span>
                <span className="text-xs font-bold uppercase tracking-wide bg-white/20 rounded-full px-2.5 py-0.5">{prog.intensite}</span>
              </div>
              <h2 className="text-2xl font-black">{prog.focus}</h2>
              <p className="text-sm text-white/85 mt-1">{prog.duree_minutes} min · {prog.justification_choix}</p>
              {totalExos > 0 && (
                <div className="mt-3">
                  <div className="h-2 bg-white/25 rounded-full overflow-hidden"><div className="h-full bg-white rounded-full transition-all" style={{ width: `${(doneExos / totalExos) * 100}%` }} /></div>
                  <p className="text-[11px] text-white/80 mt-1">{doneExos}/{totalExos} exercices terminés</p>
                </div>
              )}
            </div>

            {prog.echauffement && prog.echauffement.length > 0 && (
              <GlassCard className="p-5">
                <h3 className="text-sm font-bold text-violet-600 uppercase tracking-wide mb-3">Échauffement</h3>
                <div className="space-y-2">{prog.echauffement.map((e, i) => <div key={i} className="flex justify-between text-sm border-b border-violet-50 pb-2 last:border-0"><span className="text-slate-700">{e.nom}</span><span className="text-violet-400">{e.duree}</span></div>)}</div>
              </GlassCard>
            )}

            {prog.corps_seance && prog.corps_seance.length > 0 && (
              <GlassCard className="p-5">
                <h3 className="text-sm font-bold text-violet-600 uppercase tracking-wide mb-3">Corps de séance · coche tes exercices</h3>
                <div className="space-y-4">
                  {prog.corps_seance.map((bloc, bi) => (
                    <div key={bi}>
                      <div className="text-sm font-bold text-slate-800 mb-2">{bloc.bloc}</div>
                      <div className="space-y-1.5">
                        {(bloc.exercices || []).map((ex, ei) => (
                          <button key={ei} onClick={() => toggleExo(bi, ei)} className={`w-full text-left flex items-start gap-3 p-3 rounded-2xl border transition-colors ${ex.done ? 'bg-emerald-50 border-emerald-200' : 'bg-violet-50/50 border-violet-100 hover:border-violet-300'}`}>
                            {ex.done ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> : <Circle className="w-5 h-5 text-violet-300 shrink-0 mt-0.5" />}
                            <div className="flex-1">
                              <div className={`text-sm font-semibold ${ex.done ? 'text-emerald-700 line-through' : 'text-slate-800'}`}>{ex.nom}</div>
                              <div className="text-xs text-slate-500 mt-0.5">{[ex.series && ex.reps ? `${ex.series}x${ex.reps}` : '', ex.charge, ex.repos ? `repos ${ex.repos}` : ''].filter(Boolean).join(' · ')}</div>
                              {ex.note && <div className="text-[11px] text-violet-400 mt-0.5">{ex.note}</div>}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => prog && saveProgM.mutate(prog)} disabled={saveProgM.isPending} className="mt-4 w-full py-2.5 rounded-xl bg-white border border-violet-200 text-violet-600 font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"><Save className="w-4 h-4" /> Enregistrer la progression</button>
              </GlassCard>
            )}

            {prog.etirements && prog.etirements.length > 0 && (
              <GlassCard className="p-5">
                <h3 className="text-sm font-bold text-violet-600 uppercase tracking-wide mb-3">Étirements</h3>
                <div className="flex flex-wrap gap-2">{prog.etirements.map((e, i) => <span key={i} className="text-xs px-2.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">{e.nom} · {e.duree}</span>)}</div>
              </GlassCard>
            )}

            {(prog.conseil_coach || prog.attention) && (
              <div className="space-y-2">
                {prog.conseil_coach && <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-sm text-indigo-800">💡 {prog.conseil_coach}</div>}
                {prog.attention && <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-800">⚠️ {prog.attention}</div>}
              </div>
            )}

            {/* RPE */}
            <GlassCard className="p-5">
              <h3 className="text-sm font-bold text-violet-600 uppercase tracking-wide mb-1">Ressenti post-séance (RPE)</h3>
              <p className="text-xs text-slate-500 mb-3">À quel point la séance était dure ? 1 = très facile, 10 = maximal.</p>
              <div className="flex items-center gap-4">
                <input type="range" min={1} max={10} value={rpe} onChange={(e) => setRpe(Number(e.target.value))} className="onyx-range flex-1" />
                <span className="text-2xl font-black text-violet-600 w-10 text-center">{rpe}</span>
              </div>
              <PrimaryButton onClick={() => finishM.mutate()} disabled={finishM.isPending} className="w-full mt-4">{finishM.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Terminer la séance</PrimaryButton>
            </GlassCard>

            <button onClick={() => genM.mutate()} disabled={genM.isPending} className="w-full py-2.5 rounded-xl bg-white border border-violet-200 text-violet-600 font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50">{genM.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Regénérer une autre séance</button>
          </>
        )}
      </main>
    </AppShell>
  )
}
