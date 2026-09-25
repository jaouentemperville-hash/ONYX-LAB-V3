'use client'

import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, X, Plus, Clock } from 'lucide-react'
import { Profile, ClubSlot, JOURS_SEMAINE, DAY_ORDER, nextClubSlot } from '@/lib/onyx/shared'
import { useAuthGuard } from '@/lib/onyx/client'
import { AppShell, BackBar, GlassCard, FullLoader, Field, TextInput, PrimaryButton, Pill } from '@/components/onyx/ui'

export default function PlanningPage() {
  const { userId, authChecked, supabase } = useAuthGuard()
  const queryClient = useQueryClient()
  const [activeDay, setActiveDay] = useState<string | null>(null)
  const [newSlot, setNewSlot] = useState({ heure: '19:00', label: '' })

  const profileQ = useQuery<Profile>({
    queryKey: ['profile', userId], enabled: !!userId,
    queryFn: async () => { const { data, error } = await supabase.from('profiles').select('*').eq('id', userId as string).single(); if (error) throw error; return data as Profile },
  })
  const profile = profileQ.data
  const nextClub = nextClubSlot(profile?.club_schedule || [])

  const saveM = useMutation({
    mutationFn: async (next: ClubSlot[]) => { const { error } = await supabase.from('profiles').update({ club_schedule: next }).eq('id', userId as string); if (error) throw error; return next },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['profile'] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  function addSlot(jour: string) {
    if (!newSlot.label.trim()) { toast.error('Ajoute un nom de séance'); return }
    const next = [...(profile?.club_schedule || []), { jour, heure: newSlot.heure, label: newSlot.label.trim() }]
    saveM.mutate(next); setNewSlot({ heure: '19:00', label: '' })
  }
  function removeSlot(idx: number) { saveM.mutate((profile?.club_schedule || []).filter((_, i) => i !== idx)) }

  if (!authChecked || !userId) return <FullLoader />

  return (
    <AppShell>
      <BackBar title="Planning & Club" subtitle="Tes créneaux d’entraînement collectif" />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 space-y-5 animate-onyx-pop">
        {nextClub && (
          <div className="rounded-3xl p-5 text-white bg-gradient-to-br from-violet-600 to-fuchsia-500 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/80">Prochain créneau</p>
            <h2 className="text-xl font-black mt-1">{nextClub.label}</h2>
            <p className="text-sm text-white/85">{nextClub.dayLabel} · {nextClub.heure}</p>
          </div>
        )}

        <GlassCard className="p-5">
          <div className="flex items-center gap-2 mb-4"><Clock className="w-5 h-5 text-violet-500" /><h3 className="font-bold text-slate-800">Clique un jour pour gérer les créneaux</h3></div>
          <div className="grid grid-cols-7 gap-1.5 mb-3">
            {JOURS_SEMAINE.map((jour) => {
              const slots = (profile?.club_schedule || []).filter((s) => s.jour === jour)
              const isToday = DAY_ORDER[new Date().getDay()] === jour
              return (
                <button key={jour} onClick={() => setActiveDay(activeDay === jour ? null : jour)} className={`rounded-2xl p-2 text-center border transition-all ${activeDay === jour ? 'bg-gradient-to-tr from-violet-600 to-fuchsia-500 text-white border-transparent' : isToday ? 'bg-fuchsia-50 border-fuchsia-200' : 'bg-violet-50/50 border-violet-100 hover:border-violet-300'}`}>
                  <div className={`text-[10px] font-bold uppercase ${activeDay === jour ? 'text-white/90' : 'text-violet-400'}`}>{jour.slice(0, 3)}</div>
                  <div className={`text-base font-black mt-0.5 ${activeDay === jour ? 'text-white' : 'text-slate-800'}`}>{slots.length}</div>
                </button>
              )
            })}
          </div>

          {activeDay && (
            <div className="p-4 rounded-2xl bg-violet-50/60 border border-violet-100 space-y-3">
              <h4 className="text-sm font-bold text-slate-800">{activeDay}</h4>
              {(profile?.club_schedule || []).map((s, idx) => s.jour === activeDay && (
                <div key={idx} className="flex items-center justify-between text-sm bg-white rounded-xl px-3 py-2 border border-violet-100">
                  <span className="text-slate-700"><span className="font-semibold">{s.heure}</span> — {s.label}</span>
                  <button onClick={() => removeSlot(idx)} className="text-rose-400 hover:text-rose-600"><X className="w-4 h-4" /></button>
                </div>
              ))}
              <div className="flex gap-2">
                <TextInput type="time" value={newSlot.heure} onChange={(e) => setNewSlot((s) => ({ ...s, heure: e.target.value }))} className="w-28" />
                <TextInput placeholder="Ex: Sparring MMA" value={newSlot.label} onChange={(e) => setNewSlot((s) => ({ ...s, label: e.target.value }))} className="flex-1" />
                <button onClick={() => addSlot(activeDay)} disabled={saveM.isPending} className="px-4 rounded-xl bg-violet-600 text-white text-sm font-semibold inline-flex items-center gap-1 disabled:opacity-50">{saveM.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}</button>
              </div>
            </div>
          )}
        </GlassCard>

        <GlassCard className="p-5">
          <h3 className="font-bold text-slate-800 mb-3">Vue d’ensemble</h3>
          {(profile?.club_schedule || []).length === 0 ? (
            <p className="text-sm text-slate-500">Aucun créneau. Ajoute tes horaires ci-dessus — l’IA en tiendra compte pour alléger ta charge les jours de club.</p>
          ) : (
            <div className="space-y-2">
              {JOURS_SEMAINE.map((j) => { const slots = (profile?.club_schedule || []).filter((s) => s.jour === j); if (!slots.length) return null; return (
                <div key={j} className="flex items-start gap-3">
                  <span className="text-xs font-bold text-violet-500 w-16 pt-1">{j}</span>
                  <div className="flex flex-wrap gap-1.5">{slots.map((s, i) => <Pill key={i} tone="violet">{s.heure} {s.label}</Pill>)}</div>
                </div>
              ) })}
            </div>
          )}
        </GlassCard>
      </main>
    </AppShell>
  )
}
