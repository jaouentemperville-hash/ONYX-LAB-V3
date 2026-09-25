'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getSupabaseBrowser } from '@/lib/supabase/browser'

const SPORTS = ['MMA', 'No-Gi', 'Boxe', 'Lutte', 'Athlétisation', 'JJB', 'Grappling']
const NIVEAUX = ['debutant', 'intermediaire', 'avance', 'competiteur']

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowser()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)

  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  const [profile, setProfile] = useState({
    display_name: '', sport: 'MMA', niveau: 'intermediaire',
    poids_kg: '', taille_cm: '', objectifs: '',
  })

  useEffect(() => {
    let mounted = true
    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      if (session?.user) { setUser(session.user); await loadProfile(session.user.id) }
      setLoading(false)
    }
    init()
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) { setUser(session.user); await loadProfile(session.user.id) } else setUser(null)
    })
    return () => { mounted = false; sub.subscription.unsubscribe() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadProfile(userId) {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (error && error.code !== 'PGRST116') { console.error(error); return }
    if (data) {
      setProfile({
        display_name: data.display_name || '', sport: data.sport || 'MMA', niveau: data.niveau || 'intermediaire',
        poids_kg: data.poids_kg ?? '', taille_cm: data.taille_cm ?? '', objectifs: data.objectifs || '',
      })
    } else {
      await supabase.from('profiles').insert({ id: userId }).select().single()
    }
  }

  async function handleAuth(e) {
    e.preventDefault(); setAuthError(''); setSaving(true)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        toast.success('Compte créé ! Connecte-toi.')
        setMode('login')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        toast.success('Connecté.')
      }
    } catch (err) { setAuthError(err.message || 'Erreur d’authentification') }
    finally { setSaving(false) }
  }

  async function handleSaveProfile(e) {
    e.preventDefault(); if (!user) return; setSaving(true)
    try {
      const { error } = await supabase.from('profiles').update({
        display_name: profile.display_name || null, sport: profile.sport, niveau: profile.niveau,
        poids_kg: profile.poids_kg === '' ? null : Number(profile.poids_kg),
        taille_cm: profile.taille_cm === '' ? null : Number(profile.taille_cm),
        objectifs: profile.objectifs || null,
      }).eq('id', user.id)
      if (error) throw error
      toast.success('Profil enregistré.')
      router.push('/')
    } catch (err) { toast.error(err.message || 'Erreur') }
    finally { setSaving(false) }
  }

  const inputCls = 'w-full rounded-xl bg-violet-50/60 border border-violet-200 px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200 transition'
  const btnCls = 'w-full rounded-xl bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 text-white py-2.5 text-sm font-semibold shadow-lg shadow-violet-500/25 disabled:opacity-50 transition active:scale-[0.98]'

  if (loading) return <div className="min-h-screen flex items-center justify-center text-violet-400">Chargement…</div>

  if (!user) {
    return (
      <div className="onyx-body min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-white/80 backdrop-blur-xl border border-violet-100 rounded-3xl p-6 shadow-[0_20px_60px_rgba(139,92,246,0.20)]">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-violet-600 via-purple-500 to-fuchsia-500 flex items-center justify-center text-white text-lg font-black shadow-lg shadow-violet-500/30">O</div>
            <div>
              <h1 className="text-xl font-black text-slate-800">ONYX <span className="text-violet-500 font-light">LAB</span></h1>
              <p className="text-xs text-violet-500">{mode === 'login' ? 'Connecte-toi à ton coach IA' : 'Crée ton compte'}</p>
            </div>
          </div>
          <form onSubmit={handleAuth} className="space-y-3">
            <input type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
            <input type="password" required minLength={6} placeholder="Mot de passe" value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} />
            {authError && <p className="text-sm text-rose-500">{authError}</p>}
            <button type="submit" disabled={saving} className={btnCls}>{saving ? 'Patiente…' : mode === 'login' ? 'Se connecter' : 'Créer le compte'}</button>
          </form>
          <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} className="mt-4 text-sm text-violet-500 hover:text-violet-700 underline">
            {mode === 'login' ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="onyx-body min-h-screen px-4 py-8">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-black text-slate-800">Ton profil ONYX</h1>
          <button onClick={async () => { await supabase.auth.signOut(); setUser(null) }} className="text-xs text-slate-400 hover:text-slate-600 underline">Se déconnecter</button>
        </div>
        <form onSubmit={handleSaveProfile} className="space-y-5 bg-white/80 backdrop-blur-xl border border-violet-100 rounded-3xl p-6 shadow-[0_12px_40px_rgba(139,92,246,0.12)]">
          <div>
            <label className="block text-xs font-semibold text-violet-500 uppercase tracking-wide mb-1">Nom / pseudo</label>
            <input value={profile.display_name} onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-violet-500 uppercase tracking-wide mb-1">Sport principal</label>
              <select value={profile.sport} onChange={(e) => setProfile((p) => ({ ...p, sport: e.target.value }))} className={inputCls}>{SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-violet-500 uppercase tracking-wide mb-1">Niveau</label>
              <select value={profile.niveau} onChange={(e) => setProfile((p) => ({ ...p, niveau: e.target.value }))} className={inputCls}>{NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}</select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-violet-500 uppercase tracking-wide mb-1">Poids (kg)</label>
              <input type="number" step="0.1" value={profile.poids_kg} onChange={(e) => setProfile((p) => ({ ...p, poids_kg: e.target.value }))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-violet-500 uppercase tracking-wide mb-1">Taille (cm)</label>
              <input type="number" value={profile.taille_cm} onChange={(e) => setProfile((p) => ({ ...p, taille_cm: e.target.value }))} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-violet-500 uppercase tracking-wide mb-1">Objectifs</label>
            <textarea rows={3} value={profile.objectifs} onChange={(e) => setProfile((p) => ({ ...p, objectifs: e.target.value }))} placeholder="Ex: prise de masse sèche, préparation combat dans 8 semaines…" className={inputCls} />
          </div>
          <button type="submit" disabled={saving} className={btnCls}>{saving ? 'Enregistrement…' : 'Accéder à mon dashboard'}</button>
          <p className="text-[11px] text-slate-400 text-center">Tu pourras compléter âge, sexe, objectif de poids et niveau d’activité dans ton profil.</p>
        </form>
      </div>
    </div>
  )
}
