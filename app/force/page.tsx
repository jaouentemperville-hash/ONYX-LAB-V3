'use client'

import React, { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, TrendingUp, Dumbbell } from 'lucide-react'
import { OneRm, todayStr, frDate } from '@/lib/onyx/shared'
import { useAuthGuard } from '@/lib/onyx/client'
import { AppShell, BackBar, GlassCard, FullLoader, Field, TextInput, PrimaryButton, LineChart, Pill } from '@/components/onyx/ui'

export default function ForcePage() {
  const { userId, authChecked, supabase } = useAuthGuard()
  const queryClient = useQueryClient()
  const [form, setForm] = useState({ exercise: '', value_kg: '', date: todayStr(), reps: '1' })
  const [showAdd, setShowAdd] = useState(false)

  const oneRmQ = useQuery<OneRm[]>({
    queryKey: ['one_rm_all', userId], enabled: !!userId,
    queryFn: async () => { const { data, error } = await supabase.from('one_rm').select('*').eq('user_id', userId as string).order('date', { ascending: true }); if (error) throw error; return (data as OneRm[]) || [] },
  })

  const grouped = useMemo(() => {
    const g: Record<string, OneRm[]> = {}
    for (const r of oneRmQ.data || []) { (g[r.exercise] = g[r.exercise] || []).push(r) }
    return g
  }, [oneRmQ.data])

  const addM = useMutation({
    mutationFn: async () => {
      if (!form.exercise.trim() || !form.value_kg) throw new Error('Exercice et charge requis')
      const { error } = await supabase.from('one_rm').insert({ user_id: userId, exercise: form.exercise.trim(), value_kg: Number(form.value_kg), date: form.date, reps: form.reps ? Number(form.reps) : 1 })
      if (error) throw error
    },
    onSuccess: () => { toast.success('1RM enregistré.'); setForm({ exercise: '', value_kg: '', date: todayStr(), reps: '1' }); setShowAdd(false); queryClient.invalidateQueries({ queryKey: ['one_rm_all'] }); queryClient.invalidateQueries({ queryKey: ['one_rm'] }) },
    onError: (e: Error) => toast.error(e.message),
  })
  const delM = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('one_rm').delete().eq('id', id); if (error) throw error },
    onSuccess: () => { toast.success('Supprimé.'); queryClient.invalidateQueries({ queryKey: ['one_rm_all'] }); queryClient.invalidateQueries({ queryKey: ['one_rm'] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  if (!authChecked || !userId) return <FullLoader />
  const exercises = Object.keys(grouped)

  return (
    <AppShell>
      <BackBar title="Force · Historique 1RM" subtitle="Suis ta progression et recalibre tes charges" />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 space-y-5 animate-onyx-pop">
        <div className="flex justify-between items-center">
          <p className="text-sm text-slate-500">{exercises.length} exercice{exercises.length > 1 ? 's' : ''} suivi{exercises.length > 1 ? 's' : ''}</p>
          <PrimaryButton onClick={() => setShowAdd((v) => !v)}><Plus className="w-4 h-4" /> Ajouter un max</PrimaryButton>
        </div>

        {showAdd && (
          <GlassCard className="p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Exercice"><TextInput list="exos" value={form.exercise} onChange={(e) => setForm((s) => ({ ...s, exercise: e.target.value }))} placeholder="Squat, Développé…" /><datalist id="exos">{['Squat', 'Développé couché', 'Soulevé de terre', 'Traction', 'Développé militaire', 'Hip thrust'].map((x) => <option key={x} value={x} />)}</datalist></Field>
              <Field label="Charge (kg)"><TextInput type="number" step="0.5" value={form.value_kg} onChange={(e) => setForm((s) => ({ ...s, value_kg: e.target.value }))} /></Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date"><TextInput type="date" value={form.date} onChange={(e) => setForm((s) => ({ ...s, date: e.target.value }))} /></Field>
              <Field label="Reps (réf)"><TextInput type="number" value={form.reps} onChange={(e) => setForm((s) => ({ ...s, reps: e.target.value }))} /></Field>
            </div>
            <PrimaryButton onClick={() => addM.mutate()} disabled={addM.isPending} className="w-full">{addM.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Enregistrer</PrimaryButton>
          </GlassCard>
        )}

        {exercises.length === 0 && !showAdd && (
          <GlassCard className="p-8 text-center">
            <Dumbbell className="w-8 h-8 text-violet-400 mx-auto mb-3" />
            <h3 className="font-bold text-slate-800 mb-1">Aucun max enregistré</h3>
            <p className="text-sm text-slate-500">Ajoute tes 1RM pour que l’IA calcule tes charges réelles en kg.</p>
          </GlassCard>
        )}

        {exercises.map((ex) => {
          const rows = grouped[ex]
          const values = rows.map((r) => Number(r.value_kg))
          const latest = values[values.length - 1]
          const first = values[0]
          const delta = latest - first
          return (
            <GlassCard key={ex} className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-bold text-slate-800">{ex}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-2xl font-black text-slate-800">{latest}<span className="text-sm font-normal text-violet-400"> kg</span></span>
                    {rows.length > 1 && <Pill tone={delta >= 0 ? 'green' : 'amber'}><TrendingUp className="w-3 h-3" /> {delta >= 0 ? '+' : ''}{delta.toFixed(1)} kg</Pill>}
                  </div>
                </div>
              </div>
              {rows.length > 1 && <LineChart points={values} />}
              <div className="mt-3 space-y-1">
                {rows.slice().reverse().map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-xs bg-violet-50/50 rounded-lg px-3 py-2">
                    <span className="text-slate-500">{frDate(r.date)}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-800">{r.value_kg} kg</span>
                      <button onClick={() => delM.mutate(r.id)} className="text-rose-400 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          )
        })}
      </main>
    </AppShell>
  )
}
