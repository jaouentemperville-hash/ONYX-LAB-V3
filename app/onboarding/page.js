'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { getSupabaseBrowser } from '@/lib/supabase/browser'

const SPORTS = ['MMA', 'No-Gi', 'Boxe', 'Lutte', 'Athlétisation']
const NIVEAUX = ['debutant', 'intermediaire', 'avance', 'competiteur']
const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = getSupabaseBrowser()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [user, setUser] = useState(null)

  // Auth form
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  // Profile form
  const [profile, setProfile] = useState({
    display_name: '',
    sport: 'MMA',
    niveau: 'intermediaire',
    poids_kg: '',
    taille_cm: '',
    objectifs: '',
    club_schedule: [],
    sync_token: null,
  })
  const [newSlot, setNewSlot] = useState({ jour: 'Lundi', heure: '19:00', label: '' })

  useEffect(() => {
    let mounted = true

    async function init() {
      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      if (session?.user) {
        setUser(session.user)
        await loadProfile(session.user.id)
      }
      setLoading(false)
    }
    init()

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user)
        await loadProfile(session.user.id)
      } else {
        setUser(null)
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error(error)
      return
    }

    if (data) {
      setProfile({
        display_name: data.display_name || '',
        sport: data.sport || 'MMA',
        niveau: data.niveau || 'intermediaire',
        poids_kg: data.poids_kg ?? '',
        taille_cm: data.taille_cm ?? '',
        objectifs: data.objectifs || '',
        club_schedule: Array.isArray(data.club_schedule) ? data.club_schedule : [],
        sync_token: data.sync_token,
      })
    } else {
      // Le trigger handle_new_user aurait dû créer la ligne. Filet de sécurité :
      const { data: created, error: insertErr } = await supabase
        .from('profiles')
        .insert({ id: userId })
        .select()
        .single()
      if (!insertErr && created) {
        setProfile((p) => ({ ...p, sync_token: created.sync_token }))
      }
    }
  }

  async function handleAuth(e) {
    e.preventDefault()
    setAuthError('')
    setSaving(true)
    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        toast.success('Compte créé ! Vérifie ta boîte mail si une confirmation est requise, sinon connecte-toi.')
        setMode('login')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        toast.success('Connecté.')
      }
    } catch (err) {
      setAuthError(err.message || 'Erreur d’authentification')
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveProfile(e) {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: profile.display_name || null,
          sport: profile.sport,
          niveau: profile.niveau,
          poids_kg: profile.poids_kg === '' ? null : Number(profile.poids_kg),
          taille_cm: profile.taille_cm === '' ? null : Number(profile.taille_cm),
          objectifs: profile.objectifs || null,
          club_schedule: profile.club_schedule,
        })
        .eq('id', user.id)

      if (error) throw error
      toast.success('Profil enregistré.')
      router.push('/')
    } catch (err) {
      toast.error(err.message || 'Erreur lors de l’enregistrement')
    } finally {
      setSaving(false)
    }
  }

  function addSlot() {
    if (!newSlot.label.trim()) {
      toast.error('Ajoute un nom de séance (ex: Sparring MMA)')
      return
    }
    setProfile((p) => ({ ...p, club_schedule: [...p.club_schedule, newSlot] }))
    setNewSlot({ jour: 'Lundi', heure: '19:00', label: '' })
  }

  function removeSlot(idx) {
    setProfile((p) => ({ ...p, club_schedule: p.club_schedule.filter((_, i) => i !== idx) }))
  }

  function copyToken() {
    if (!profile.sync_token) return
    navigator.clipboard.writeText(profile.sync_token)
    toast.success('Token copié.')
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-neutral-400">
        Chargement…
      </div>
    )
  }

  // --- Non connecté : formulaire login / signup ---
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6">
          <h1 className="text-2xl font-bold mb-1">ONYX 🧬</h1>
          <p className="text-sm text-neutral-400 mb-6">
            {mode === 'login' ? 'Connecte-toi à ton coach IA' : 'Crée ton compte ONYX'}
          </p>

          <form onSubmit={handleAuth} className="space-y-3">
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm outline-none focus:border-violet-500"
            />
            <input
              type="password"
              required
              minLength={6}
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm outline-none focus:border-violet-500"
            />
            {authError && <p className="text-sm text-red-400">{authError}</p>}
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-violet-600 hover:bg-violet-500 transition py-2 text-sm font-medium disabled:opacity-50"
            >
              {saving ? 'Patiente…' : mode === 'login' ? 'Se connecter' : 'Créer le compte'}
            </button>
          </form>

          <button
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="mt-4 text-sm text-neutral-400 hover:text-neutral-200 underline"
          >
            {mode === 'login' ? "Pas encore de compte ? S'inscrire" : 'Déjà un compte ? Se connecter'}
          </button>
        </div>
      </div>
    )
  }

  // --- Connecté : formulaire profil ---
  return (
    <div className="min-h-screen px-4 py-8">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Ton profil ONYX</h1>
          <button onClick={handleLogout} className="text-xs text-neutral-500 hover:text-neutral-300 underline">
            Se déconnecter
          </button>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-5 bg-neutral-900/60 border border-neutral-800 rounded-2xl p-6">
          <div>
            <label className="block text-sm text-neutral-400 mb-1">Nom / pseudo</label>
            <input
              value={profile.display_name}
              onChange={(e) => setProfile((p) => ({ ...p, display_name: e.target.value }))}
              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm outline-none focus:border-violet-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Sport principal</label>
              <select
                value={profile.sport}
                onChange={(e) => setProfile((p) => ({ ...p, sport: e.target.value }))}
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm outline-none focus:border-violet-500"
              >
                {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Niveau</label>
              <select
                value={profile.niveau}
                onChange={(e) => setProfile((p) => ({ ...p, niveau: e.target.value }))}
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm outline-none focus:border-violet-500"
              >
                {NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Poids (kg)</label>
              <input
                type="number" step="0.1"
                value={profile.poids_kg}
                onChange={(e) => setProfile((p) => ({ ...p, poids_kg: e.target.value }))}
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm outline-none focus:border-violet-500"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">Taille (cm)</label>
              <input
                type="number"
                value={profile.taille_cm}
                onChange={(e) => setProfile((p) => ({ ...p, taille_cm: e.target.value }))}
                className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm outline-none focus:border-violet-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-1">Objectifs</label>
            <textarea
              rows={3}
              value={profile.objectifs}
              onChange={(e) => setProfile((p) => ({ ...p, objectifs: e.target.value }))}
              placeholder="Ex: prise de masse sèche, préparation combat dans 8 semaines…"
              className="w-full rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-2">Créneaux club (planning fixe)</label>
            <div className="space-y-2 mb-3">
              {profile.club_schedule.map((slot, idx) => (
                <div key={idx} className="flex items-center justify-between bg-neutral-800/60 rounded-lg px-3 py-2 text-sm">
                  <span>{slot.jour} · {slot.heure} — {slot.label}</span>
                  <button type="button" onClick={() => removeSlot(idx)} className="text-red-400 hover:text-red-300 text-xs">
                    Retirer
                  </button>
                </div>
              ))}
              {profile.club_schedule.length === 0 && (
                <p className="text-xs text-neutral-500">Aucun créneau ajouté.</p>
              )}
            </div>
            <div className="flex gap-2">
              <select
                value={newSlot.jour}
                onChange={(e) => setNewSlot((s) => ({ ...s, jour: e.target.value }))}
                className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-2 text-xs outline-none"
              >
                {JOURS.map((j) => <option key={j} value={j}>{j}</option>)}
              </select>
              <input
                type="time"
                value={newSlot.heure}
                onChange={(e) => setNewSlot((s) => ({ ...s, heure: e.target.value }))}
                className="rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-2 text-xs outline-none"
              />
              <input
                placeholder="Ex: Sparring MMA"
                value={newSlot.label}
                onChange={(e) => setNewSlot((s) => ({ ...s, label: e.target.value }))}
                className="flex-1 rounded-lg bg-neutral-800 border border-neutral-700 px-2 py-2 text-xs outline-none"
              />
              <button type="button" onClick={addSlot} className="rounded-lg bg-neutral-700 hover:bg-neutral-600 px-3 py-2 text-xs">
                Ajouter
              </button>
            </div>
          </div>

          {profile.sync_token && (
            <div className="bg-violet-950/40 border border-violet-800/40 rounded-lg p-3">
              <p className="text-xs text-neutral-400 mb-1">Token de synchronisation Apple Health (à mettre dans ton Raccourci)</p>
              <div className="flex items-center gap-2">
                <code className="text-xs text-violet-300 break-all">{profile.sync_token}</code>
                <button type="button" onClick={copyToken} className="text-xs text-neutral-400 hover:text-neutral-200 underline shrink-0">
                  Copier
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-lg bg-violet-600 hover:bg-violet-500 transition py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Enregistrement…' : 'Enregistrer et accéder à mon dashboard'}
          </button>
        </form>
      </div>
    </div>
  )
}
