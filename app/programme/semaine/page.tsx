'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Sparkles, Save, RefreshCw } from 'lucide-react'
import { Profile, HealthData, Workout, WeekFocusRow, WeekPlan, WeekDayPlan, getWeekKey, daysAgoStr, intensityColors, typeLabel } from '@/lib/onyx/shared'
import { useAuthGuard } from '@/lib/onyx/client'
import { AppShell, BackBar, GlassCard, FullLoader, Field, TextInput, TextArea, Select, PrimaryButton, Pill } from '@/components/onyx/ui'

const TYPES = ['seance', 'repos_actif', 'repos_complet']
const INTENSITES = ['repos', 'légère', 'modérée', 'forte']

export default function WeekProgramPage() {
  const router = useRouter()
  const { userId, authChecked, supabase } = useAuthGuard()
  const queryClient = useQueryClient()
  const weekKey = getWeekKey()
  const [plan, setPlan] = useState<WeekPlan | null>(null)

  const profileQ = useQuery<Profile>({
    queryKey: ['profile', userId], enabled: !!userId,
    queryFn: async () => { const { data, error } = await supabase.from('profiles').select('*').eq('id', userId as string).single(); if (error) throw error; return data as Profile },
  })
  const healthQ = useQuery<HealthData | null>({
    queryKey: ['health_today', userId], enabled: !!userId,
    queryFn: async () => { const { data } = await supabase.from('health_data').select('*').eq('user_id', userId as string).order('date', { ascending: false }).limit(1).maybeSingle(); return (data as HealthData) || null },
  })
  const recentQ = useQuery<Workout[]>({
    queryKey: ['workouts_recent', userId], enabled: !!userId,
    queryFn: async () => { const { data } = await supabase.from('workouts').select('*').eq('user_id', userId as string).gte('date', daysAgoStr(6)).order('date', { ascending: false }).limit(8); return (data as Workout[]) || [] },
  })
  const weekFocusQ = useQuery<WeekFocusRow | null>({
    queryKey: ['week_focus', userId, weekKey], enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from('week_focus').select('*').eq('user_id', userId as string).eq('week_key', weekKey).maybeSingle()
      if (error) throw error
      if (!data) return null
      try { return { ...data, parsed: JSON.parse(data.focus) } as WeekFocusRow } catch { return { ...data, parsed: { objectif_semaine: data.focus, week: [] } } as WeekFocusRow }
    },
  })

  useEffect(() => { if (weekFocusQ.data) setPlan(JSON.parse(JSON.stringify(weekFocusQ.data.parsed))) }, [weekFocusQ.data])

  const profile = profileQ.data

  const saveM = useMutation({
    mutationFn: async (p: WeekPlan) => {
      const { error } = await supabase.from('week_focus').upsert({ user_id: userId, week_key: weekKey, focus: JSON.stringify(p) }, { onConflict: 'user_id,week_key' })
      if (error) throw error
    },
    onSuccess: () => { toast.success('Programme enregistré.'); queryClient.invalidateQueries({ queryKey: ['week_focus'] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const genM = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/coach/week', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sport: profile?.sport || 'MMA', goals: profile?.objectifs || '', level: profile?.niveau || 'intermediaire', poids_kg: profile?.poids_kg, club_schedule: profile?.club_schedule || [], hrv: healthQ.data?.hrv ?? null, sleep_hours: healthQ.data?.sleep_hours ?? null, recovery_score: healthQ.data?.recovery_score ?? null, fatigue: healthQ.data?.fatigue ?? null, recent_sessions: (recentQ.data || []).slice(0, 5) }),
      })
      const json = await res.json()
      if (!res.ok || !json.plan) throw new Error(json?.error || 'Réponse IA invalide')
      const { error } = await supabase.from('week_focus').upsert({ user_id: userId, week_key: weekKey, focus: JSON.stringify(json.plan) }, { onConflict: 'user_id,week_key' })
      if (error) throw error
      return json.plan as WeekPlan
    },
    onSuccess: () => { toast.success('Nouveau plan généré par l’IA.'); queryClient.invalidateQueries({ queryKey: ['week_focus'] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  function updateDay(i: number, patch: Partial<WeekDayPlan>) {
    setPlan((prev) => { if (!prev) return prev; const week = [...prev.week]; week[i] = { ...week[i], ...patch }; return { ...prev, week } })
  }

  if (!authChecked || !userId) return <FullLoader />

  return (
    <AppShell>
      <BackBar title="Programme de la semaine" subtitle={weekKey} />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 space-y-5 animate-onyx-pop">
        {!weekFocusQ.data && !plan ? (
          <GlassCard className="p-8 text-center">
            <Sparkles className="w-8 h-8 text-violet-400 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 mb-1">Aucun plan pour cette semaine</h3>
            <p className="text-sm text-slate-500 mb-4">ONYX peut construire un plan 7 jours équilibré (force, technique, repos) adapté à ta récup et ton club.</p>
            <PrimaryButton onClick={() => genM.mutate()} disabled={genM.isPending} className="mx-auto">{genM.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Générer le plan</PrimaryButton>
          </GlassCard>
        ) : plan ? (
          <>
            <GlassCard className="p-5">
              <Field label="Objectif de la semaine">
                <TextArea rows={2} value={plan.objectif_semaine} onChange={(e) => setPlan((p) => p ? { ...p, objectif_semaine: e.target.value } : p)} />
              </Field>
            </GlassCard>

            <div className="space-y-3">
              {(plan.week || []).map((d, i) => {
                const ic = intensityColors(d.intensite)
                return (
                  <GlassCard key={i} className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-xs" style={{ background: `linear-gradient(135deg, ${ic.from}, ${ic.to})` }}>{(d.jour || '').slice(0, 2) || (i + 1)}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-800 text-sm">{d.jour || d.date}</span>
                          <Pill tone="violet">{typeLabel(d.type)}</Pill>
                          {d.club === 'oui' && <Pill tone="fuchsia">Club</Pill>}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <Field label="Type"><Select value={d.type || 'seance'} onChange={(e) => updateDay(i, { type: e.target.value })}>{TYPES.map((t) => <option key={t} value={t}>{typeLabel(t)}</option>)}</Select></Field>
                      <Field label="Intensité"><Select value={d.intensite || 'modérée'} onChange={(e) => updateDay(i, { intensite: e.target.value })}>{INTENSITES.map((t) => <option key={t} value={t}>{t}</option>)}</Select></Field>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-3">
                      <div className="col-span-2"><Field label="Focus"><TextInput value={d.focus || ''} onChange={(e) => updateDay(i, { focus: e.target.value })} /></Field></div>
                      <Field label="Durée (min)"><TextInput type="number" value={d.duree_minutes ?? ''} onChange={(e) => updateDay(i, { duree_minutes: e.target.value === '' ? undefined : Number(e.target.value) })} /></Field>
                    </div>
                    <Field label="Note"><TextInput value={d.note || ''} onChange={(e) => updateDay(i, { note: e.target.value })} placeholder="Précision / consigne…" /></Field>
                  </GlassCard>
                )
              })}
            </div>

            <div className="flex gap-3 sticky bottom-24">
              <PrimaryButton onClick={() => plan && saveM.mutate(plan)} disabled={saveM.isPending} className="flex-1"><Save className="w-4 h-4" /> {saveM.isPending ? 'Enregistrement…' : 'Enregistrer'}</PrimaryButton>
              <button onClick={() => genM.mutate()} disabled={genM.isPending} className="px-4 rounded-xl bg-white border border-violet-200 text-violet-600 font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-50">{genM.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Regénérer</button>
            </div>
          </>
        ) : <FullLoader />}
      </main>
    </AppShell>
  )
}
