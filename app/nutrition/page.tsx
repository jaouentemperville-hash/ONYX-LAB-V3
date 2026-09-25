'use client'

import React, { useMemo, useRef, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, Plus, Camera, Trash2, Sparkles, Salad } from 'lucide-react'
import { Profile, Meal, todayStr, daysAgoStr } from '@/lib/onyx/shared'
import { useAuthGuard } from '@/lib/onyx/client'
import { AppShell, BackBar, GlassCard, FullLoader, Field, TextInput, PrimaryButton, Ring } from '@/components/onyx/ui'

function fileToBase64(file: File): Promise<{ base64: string; mime: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => { const res = String(reader.result); const base64 = res.split(',')[1] || ''; resolve({ base64, mime: file.type || 'image/jpeg' }) }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function NutritionPage() {
  const { userId, authChecked, supabase } = useAuthGuard()
  const queryClient = useQueryClient()
  const today = todayStr()
  const [desc, setDesc] = useState('')
  const [analysis, setAnalysis] = useState<any>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const profileQ = useQuery<Profile>({ queryKey: ['profile', userId], enabled: !!userId, queryFn: async () => { const { data, error } = await supabase.from('profiles').select('*').eq('id', userId as string).single(); if (error) throw error; return data as Profile } })
  const mealsQ = useQuery<Meal[]>({
    queryKey: ['meals_week', userId], enabled: !!userId,
    queryFn: async () => { const { data, error } = await supabase.from('meals').select('*').eq('user_id', userId as string).gte('date', daysAgoStr(6)).order('created_at', { ascending: false }); if (error) throw error; return (data as Meal[]) || [] },
  })
  const profile = profileQ.data
  const todayMeals = (mealsQ.data || []).filter((m) => m.date === today)
  const totals = useMemo(() => todayMeals.reduce((a, m) => ({ calories: a.calories + (Number(m.calories) || 0), protein: a.protein + (Number(m.protein) || 0), carbs: a.carbs + (Number(m.carbs) || 0), fat: a.fat + (Number(m.fat) || 0) }), { calories: 0, protein: 0, carbs: 0, fat: 0 }), [todayMeals])

  const addFromEstimate = useMutation({
    mutationFn: async (est: any) => {
      const { error } = await supabase.from('meals').insert({ user_id: userId, date: today, name: est.name || 'Repas', portion: est.portion || null, calories: est.calories ?? null, protein: est.protein ?? null, carbs: est.carbs ?? null, fat: est.fat ?? null })
      if (error) throw error
    },
    onSuccess: () => { toast.success('Repas ajouté.'); setDesc(''); setAnalysis(null); queryClient.invalidateQueries({ queryKey: ['meals_week'] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const estimateM = useMutation({
    mutationFn: async () => {
      if (!desc.trim()) throw new Error('Décris ton repas')
      const res = await fetch('/api/nutrition/estimate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: desc }) })
      const json = await res.json(); if (!res.ok) throw new Error(json?.error || 'Erreur')
      return json.estimate
    },
    onSuccess: (est) => setAnalysis(est),
    onError: (e: Error) => toast.error(e.message),
  })

  const photoM = useMutation({
    mutationFn: async (file: File) => {
      const { base64, mime } = await fileToBase64(file)
      const res = await fetch('/api/nutrition/photo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageBase64: base64, mimeType: mime, hint: desc }) })
      const json = await res.json(); if (!res.ok) throw new Error(json?.error || 'Erreur photo')
      return json.estimate
    },
    onSuccess: (est) => { setAnalysis(est); toast.success('Photo analysée.') },
    onError: (e: Error) => toast.error(e.message),
  })

  const delM = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('meals').delete().eq('id', id); if (error) throw error },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['meals_week'] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const [weekAnalysis, setWeekAnalysis] = useState<any>(null)
  const analyzeWeekM = useMutation({
    mutationFn: async () => {
      if (!(mealsQ.data || []).length) throw new Error('Aucun repas à analyser')
      const res = await fetch('/api/nutrition/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ meals: mealsQ.data, sport: profile?.sport || 'MMA', goals: profile?.objectifs || '' }) })
      const json = await res.json(); if (!res.ok) throw new Error(json?.error || 'Erreur analyse')
      return json.analysis
    },
    onSuccess: (a) => setWeekAnalysis(a),
    onError: (e: Error) => toast.error(e.message),
  })

  if (!authChecked || !userId) return <FullLoader />

  return (
    <AppShell>
      <BackBar title="Nutrition" subtitle="Journal, macros par photo & analyse IA" />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 space-y-5 animate-onyx-pop">
        {/* Totaux du jour */}
        <GlassCard className="p-5">
          <div className="flex items-center gap-4">
            <Ring value={totals.calories} max={Math.max(totals.calories, 2500)} label="Kcal" from="#8B5CF6" to="#34D399" size={104} />
            <div className="flex-1 grid grid-cols-3 gap-2 text-center">
              <div><div className="text-lg font-black text-slate-800">{Math.round(totals.protein)}<span className="text-xs text-violet-400">g</span></div><div className="text-[10px] text-violet-400 font-bold uppercase">Prot</div></div>
              <div><div className="text-lg font-black text-slate-800">{Math.round(totals.carbs)}<span className="text-xs text-violet-400">g</span></div><div className="text-[10px] text-violet-400 font-bold uppercase">Gluc</div></div>
              <div><div className="text-lg font-black text-slate-800">{Math.round(totals.fat)}<span className="text-xs text-violet-400">g</span></div><div className="text-[10px] text-violet-400 font-bold uppercase">Lip</div></div>
            </div>
          </div>
        </GlassCard>

        {/* Ajouter un repas */}
        <GlassCard className="p-5 space-y-3">
          <h3 className="font-bold text-slate-800">Ajouter un repas</h3>
          <Field label="Décris ton repas (ou indice pour la photo)"><TextInput value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex: poulet, riz, brocolis + yaourt" /></Field>
          <div className="flex gap-2">
            <PrimaryButton onClick={() => estimateM.mutate()} disabled={estimateM.isPending} className="flex-1">{estimateM.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Estimer (texte)</PrimaryButton>
            <button onClick={() => fileRef.current?.click()} disabled={photoM.isPending} className="px-4 rounded-xl bg-white border border-violet-200 text-violet-600 font-semibold text-sm inline-flex items-center gap-2 disabled:opacity-50">{photoM.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />} Photo</button>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) photoM.mutate(f); e.currentTarget.value = '' }} />
          </div>

          {analysis && (
            <div className="p-4 rounded-2xl bg-violet-50 border border-violet-100">
              <div className="flex items-center justify-between mb-2"><span className="font-bold text-slate-800">{analysis.name}</span><span className="text-sm font-black text-violet-600">{analysis.calories} kcal</span></div>
              {analysis.aliments_detectes && <p className="text-xs text-slate-500 mb-2">{(analysis.aliments_detectes || []).join(', ')}</p>}
              <div className="flex gap-3 text-xs text-slate-600 mb-3"><span>P {analysis.protein}g</span><span>G {analysis.carbs}g</span><span>L {analysis.fat}g</span>{analysis.portion && <span className="text-violet-400">· {analysis.portion}</span>}</div>
              <PrimaryButton onClick={() => addFromEstimate.mutate(analysis)} disabled={addFromEstimate.isPending} className="w-full"><Plus className="w-4 h-4" /> Ajouter au journal</PrimaryButton>
            </div>
          )}
        </GlassCard>

        {/* Repas du jour */}
        <GlassCard className="p-5">
          <h3 className="font-bold text-slate-800 mb-3">Repas d’aujourd’hui</h3>
          {todayMeals.length === 0 ? <p className="text-sm text-slate-500">Aucun repas enregistré aujourd’hui.</p> : (
            <div className="space-y-2">{todayMeals.map((m) => (
              <div key={m.id} className="flex items-center justify-between bg-violet-50/50 rounded-xl px-3 py-2.5 border border-violet-100">
                <div><div className="text-sm font-semibold text-slate-800">{m.name}</div><div className="text-xs text-slate-500">{m.calories} kcal · P{m.protein} G{m.carbs} L{m.fat}</div></div>
                <button onClick={() => delM.mutate(m.id)} className="text-rose-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}</div>
          )}
        </GlassCard>

        {/* Analyse hebdo */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-2"><h3 className="font-bold text-slate-800 flex items-center gap-2"><Salad className="w-4 h-4 text-emerald-500" /> Analyse de la semaine</h3></div>
          <p className="text-sm text-slate-500 mb-3">{(mealsQ.data || []).length} repas sur 7 jours.</p>
          <button onClick={() => analyzeWeekM.mutate()} disabled={analyzeWeekM.isPending} className="w-full py-2.5 rounded-xl bg-white border border-violet-200 text-violet-600 font-semibold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50">{analyzeWeekM.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Analyser avec l’IA</button>
          {weekAnalysis && (
            <div className="mt-4 space-y-3">
              {weekAnalysis.score_qualite != null && <div className="flex items-center gap-3"><Ring value={weekAnalysis.score_qualite} max={100} label="Score" size={84} /><p className="text-sm text-slate-600 flex-1">{weekAnalysis.verdict}</p></div>}
              {weekAnalysis.conseils_actions && <div className="space-y-1.5">{(weekAnalysis.conseils_actions || []).map((c: string, i: number) => <div key={i} className="text-sm text-slate-600 flex gap-2"><span className="text-violet-400">•</span>{c}</div>)}</div>}
            </div>
          )}
        </GlassCard>
      </main>
    </AppShell>
  )
}
