'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Loader2, LogOut, Copy, CalendarClock } from 'lucide-react'
import { Profile, SPORTS, NIVEAUX, NIVEAUX_ACTIVITE, computeBmi, bmiLabel, estimateTdee } from '@/lib/onyx/shared'
import { useAuthGuard } from '@/lib/onyx/client'
import { AppShell, BackBar, GlassCard, FullLoader, Field, TextInput, TextArea, Select, PrimaryButton } from '@/components/onyx/ui'

export default function ProfilPage() {
  const router = useRouter()
  const { userId, authChecked, supabase } = useAuthGuard()
  const queryClient = useQueryClient()
  const [pf, setPf] = useState({ display_name: '', sport: 'MMA', niveau: 'intermediaire', age: '', sexe: 'homme', poids_kg: '', taille_cm: '', poids_objectif_kg: '', niveau_activite: 'modere', objectifs: '' })

  const profileQ = useQuery<Profile>({
    queryKey: ['profile', userId], enabled: !!userId,
    queryFn: async () => { const { data, error } = await supabase.from('profiles').select('*').eq('id', userId as string).single(); if (error) throw error; return data as Profile },
  })
  const profile = profileQ.data

  useEffect(() => { if (profile) setPf({
    display_name: profile.display_name || '', sport: profile.sport || 'MMA', niveau: profile.niveau || 'intermediaire',
    age: profile.age != null ? String(profile.age) : '', sexe: profile.sexe || 'homme',
    poids_kg: profile.poids_kg != null ? String(profile.poids_kg) : '', taille_cm: profile.taille_cm != null ? String(profile.taille_cm) : '',
    poids_objectif_kg: profile.poids_objectif_kg != null ? String(profile.poids_objectif_kg) : '', niveau_activite: profile.niveau_activite || 'modere', objectifs: profile.objectifs || '',
  }) }, [profile])

  const saveM = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('profiles').update({
        display_name: pf.display_name || null, sport: pf.sport, niveau: pf.niveau,
        age: pf.age === '' ? null : Number(pf.age), sexe: pf.sexe || null,
        poids_kg: pf.poids_kg === '' ? null : Number(pf.poids_kg), taille_cm: pf.taille_cm === '' ? null : Number(pf.taille_cm),
        poids_objectif_kg: pf.poids_objectif_kg === '' ? null : Number(pf.poids_objectif_kg), niveau_activite: pf.niveau_activite || null, objectifs: pf.objectifs || null,
      }).eq('id', userId as string)
      if (error) throw error
    },
    onSuccess: () => { toast.success('Profil mis à jour.'); queryClient.invalidateQueries({ queryKey: ['profile'] }) },
    onError: (e: Error) => toast.error(e.message),
  })

  const bmi = computeBmi(pf.poids_kg ? Number(pf.poids_kg) : null, pf.taille_cm ? Number(pf.taille_cm) : null)
  const tdee = estimateTdee({ poids_kg: pf.poids_kg ? Number(pf.poids_kg) : null, taille_cm: pf.taille_cm ? Number(pf.taille_cm) : null, age: pf.age ? Number(pf.age) : null, sexe: pf.sexe, niveau_activite: pf.niveau_activite })

  if (!authChecked || !userId) return <FullLoader />

  return (
    <AppShell>
      <BackBar title="Mon profil" subtitle="Édite tes informations à tout moment" />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 space-y-5 animate-onyx-pop">
        <div className="grid grid-cols-3 gap-3">
          <GlassCard className="p-4 text-center"><div className="text-2xl font-black text-slate-800">{bmi ?? '—'}</div><div className="text-[10px] text-violet-400 font-bold uppercase mt-0.5">IMC · {bmiLabel(bmi)}</div></GlassCard>
          <GlassCard className="p-4 text-center"><div className="text-2xl font-black text-slate-800">{tdee ?? '—'}</div><div className="text-[10px] text-violet-400 font-bold uppercase mt-0.5">Kcal/jour</div></GlassCard>
          <GlassCard className="p-4 text-center"><div className="text-2xl font-black text-slate-800">{pf.poids_objectif_kg && pf.poids_kg ? (Number(pf.poids_kg) - Number(pf.poids_objectif_kg)).toFixed(1) : '—'}</div><div className="text-[10px] text-violet-400 font-bold uppercase mt-0.5">kg à faire</div></GlassCard>
        </div>

        <GlassCard className="p-5 space-y-4">
          <Field label="Nom / pseudo"><TextInput value={pf.display_name} onChange={(e) => setPf((p) => ({ ...p, display_name: e.target.value }))} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Sport"><Select value={pf.sport} onChange={(e) => setPf((p) => ({ ...p, sport: e.target.value }))}>{SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}</Select></Field>
            <Field label="Niveau"><Select value={pf.niveau} onChange={(e) => setPf((p) => ({ ...p, niveau: e.target.value }))}>{NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Âge"><TextInput type="number" value={pf.age} onChange={(e) => setPf((p) => ({ ...p, age: e.target.value }))} /></Field>
            <Field label="Sexe"><Select value={pf.sexe} onChange={(e) => setPf((p) => ({ ...p, sexe: e.target.value }))}><option value="homme">Homme</option><option value="femme">Femme</option></Select></Field>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Poids (kg)"><TextInput type="number" step="0.1" value={pf.poids_kg} onChange={(e) => setPf((p) => ({ ...p, poids_kg: e.target.value }))} /></Field>
            <Field label="Objectif (kg)"><TextInput type="number" step="0.1" value={pf.poids_objectif_kg} onChange={(e) => setPf((p) => ({ ...p, poids_objectif_kg: e.target.value }))} /></Field>
            <Field label="Taille (cm)"><TextInput type="number" value={pf.taille_cm} onChange={(e) => setPf((p) => ({ ...p, taille_cm: e.target.value }))} /></Field>
          </div>
          <Field label="Niveau d'activité"><Select value={pf.niveau_activite} onChange={(e) => setPf((p) => ({ ...p, niveau_activite: e.target.value }))}>{NIVEAUX_ACTIVITE.map((n) => <option key={n} value={n}>{n}</option>)}</Select></Field>
          <Field label="Objectifs"><TextArea rows={3} value={pf.objectifs} onChange={(e) => setPf((p) => ({ ...p, objectifs: e.target.value }))} placeholder="Ex: prise de masse sèche, combat dans 8 semaines…" /></Field>
          <PrimaryButton onClick={() => saveM.mutate()} disabled={saveM.isPending} className="w-full">{saveM.isPending && <Loader2 className="w-4 h-4 animate-spin" />} Enregistrer</PrimaryButton>
        </GlassCard>

        <button onClick={() => router.push('/planning')} className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-white border border-violet-200 text-violet-600 font-semibold text-sm"><CalendarClock className="w-4 h-4" /> Gérer mes créneaux de club</button>

        {profile?.sync_token && (
          <GlassCard className="p-4">
            <p className="text-[11px] text-violet-500 mb-1 font-semibold uppercase tracking-wide">Token de synchro Apple Health</p>
            <div className="flex items-center gap-2">
              <code className="text-[11px] text-slate-600 break-all flex-1">{profile.sync_token}</code>
              <button onClick={() => { navigator.clipboard.writeText(profile.sync_token); toast.success('Token copié.') }} className="text-violet-500 hover:text-violet-700"><Copy className="w-4 h-4" /></button>
            </div>
          </GlassCard>
        )}

        <button onClick={async () => { await supabase.auth.signOut(); router.replace('/onboarding') }} className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-slate-400 hover:text-rose-500 font-semibold text-sm"><LogOut className="w-4 h-4" /> Se déconnecter</button>
      </main>
    </AppShell>
  )
}
