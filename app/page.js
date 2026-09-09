'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { getSupabaseBrowser } from '@/lib/supabase/browser'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  Activity, Flame, Mic, MicOff, Sparkles, Loader2, LogOut, Dumbbell,
  Link2, HeartPulse, Moon, Zap, ShieldAlert, ChevronRight, Play, Trash2, ClipboardList,
  Bell, BellRing, Image as ImageIcon, Volume2, VolumeX, History, TrendingUp, Upload,
  Utensils, Apple, Plus, Gauge, Calendar, CalendarDays,
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

const SPORTS = ['MMA', 'Grappling No-Gi', 'Athlétisation', 'Boxe', 'Muay Thai']

function AuthGate({ onAuthed }) {
  const supabase = getSupabaseBrowser()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { data: { display_name: displayName } },
        })
        if (error) throw error
        if (!data.session) {
          toast.success('Compte créé — vérifie ton email pour confirmer')
        } else {
          toast.success('Bienvenue ⚡')
          onAuthed?.(data.session.user)
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        toast.success('Connecté')
        onAuthed?.(data.session.user)
      }
    } catch (err) {
      toast.error(err.message || 'Erreur d\'authentification')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-neutral-950 via-neutral-900 to-violet-950/40">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Flame className="h-7 w-7 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-black tracking-tight">ONYX 🧬</h1>
              <p className="text-xs text-neutral-400 uppercase tracking-widest">MMA — No-Gi — Athlé</p>
            </div>
          </div>
          <p className="text-neutral-400 text-sm">Ton coach intelligent, dans ta poche.</p>
        </div>

        <Card className="bg-neutral-900/80 backdrop-blur border-neutral-800">
          <CardHeader>
            <CardTitle>{mode === 'login' ? 'Connexion' : 'Créer un compte'}</CardTitle>
            <CardDescription>Ton espace privé sécurisé</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              {mode === 'signup' && (
                <div className="space-y-1.5">
                  <Label>Nom / Pseudo</Label>
                  <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ton nom" />
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="space-y-1.5">
                <Label>Mot de passe</Label>
                <Input type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••" />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 font-bold h-11">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (mode === 'login' ? 'Se connecter' : "S'inscrire")}
              </Button>
            </form>
            <div className="text-center mt-4 text-sm text-neutral-400">
              {mode === 'login' ? (
                <>Pas de compte ? <button className="text-violet-400 underline" onClick={() => setMode('signup')}>S&apos;inscrire</button></>
              ) : (
                <>Déjà inscrit ? <button className="text-violet-400 underline" onClick={() => setMode('login')}>Se connecter</button></>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-neutral-500 text-center mt-6">RLS Supabase strict — tes données restent privées.</p>
      </div>
    </div>
  )
}

function HealthCard({ userId, onSaved, latest }) {
  const supabase = getSupabaseBrowser()
  const [sleep, setSleep] = useState(latest?.sleep_hours ?? '')
  const [hrv, setHrv] = useState(latest?.hrv ?? '')
  const [recovery, setRecovery] = useState(latest?.recovery_score ?? '')
  const [fatigue, setFatigue] = useState(latest?.fatigue ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setSleep(latest?.sleep_hours ?? '')
    setHrv(latest?.hrv ?? '')
    setRecovery(latest?.recovery_score ?? '')
    setFatigue(latest?.fatigue ?? '')
  }, [latest])

  async function save() {
    setSaving(true)
    try {
      const payload = {
        user_id: userId,
        date: new Date().toISOString().slice(0, 10),
        sleep_hours: sleep ? Number(sleep) : null,
        hrv: hrv ? Number(hrv) : null,
        recovery_score: recovery ? Number(recovery) : null,
        fatigue: fatigue ? Number(fatigue) : null,
      }
      // Upsert-like: delete today's then insert (simple)
      await supabase.from('health_data').delete().eq('user_id', userId).eq('date', payload.date)
      const { error } = await supabase.from('health_data').insert(payload)
      if (error) throw error
      toast.success('Données de forme sauvegardées')
      onSaved?.(payload)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card className="bg-gradient-to-br from-neutral-900 to-neutral-900/50 border-neutral-800">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-violet-400" />
            <CardTitle className="text-base">Forme du jour</CardTitle>
          </div>
          {latest && <Badge variant="secondary" className="bg-neutral-800 text-neutral-300">MAJ</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <MetricInput icon={<Moon className="h-3.5 w-3.5" />} label="Sommeil (h)" value={sleep} onChange={setSleep} placeholder="7.5" />
          <MetricInput icon={<Activity className="h-3.5 w-3.5" />} label="HRV (ms)" value={hrv} onChange={setHrv} placeholder="65" />
          <MetricInput icon={<Zap className="h-3.5 w-3.5" />} label="Récup (0-100)" value={recovery} onChange={setRecovery} placeholder="78" />
          <MetricInput icon={<Flame className="h-3.5 w-3.5" />} label="Fatigue (1-10)" value={fatigue} onChange={setFatigue} placeholder="4" />
        </div>
        <Button onClick={save} disabled={saving} variant="outline" className="w-full border-neutral-700 hover:bg-neutral-800">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer la forme du jour'}
        </Button>
      </CardContent>
    </Card>
  )
}

function MetricInput({ icon, label, value, onChange, placeholder }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-neutral-400 flex items-center gap-1">{icon}{label}</Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} type="number" step="0.1" className="bg-neutral-950/80 border-neutral-800" />
    </div>
  )
}

function ProgramCard({ userId, sport, latestHealth, recentWorkouts = [], onNewProgram }) {
  const supabase = getSupabaseBrowser()
  const [loading, setLoading] = useState(false)
  const [program, setProgram] = useState(null)
  const [envies, setEnvies] = useState('')
  const [joints, setJoints] = useState('')

  async function generate() {
    setLoading(true)
    try {
      const body = {
        sport,
        envies,
        joints,
        hrv: latestHealth?.hrv ?? null,
        sleep_hours: latestHealth?.sleep_hours ?? null,
        recovery_score: latestHealth?.recovery_score ?? null,
        fatigue: latestHealth?.fatigue ?? null,
        recent_sessions: recentWorkouts.map(w => ({
          date: w.date,
          type: w.type_seance,
          intensite: w.program_json?.intensite,
          focus: w.program_json?.focus,
          duree: w.program_json?.duree_minutes,
        })),
      }
      const res = await fetch('/api/coach/program', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || data.error || 'Erreur IA')
      const prog = data.program || {}
      setProgram(prog)
      onNewProgram?.(prog)
      // Save to Supabase
      await supabase.from('workouts').insert({
        user_id: userId,
        date: new Date().toISOString().slice(0, 10),
        sport,
        type_seance: prog?.type || prog?.focus || 'IA',
        program_json: prog,
        status: 'planifie',
      })
      // Notification native
      if (prog?.notification && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
        try {
          const isRest = String(prog.type || '').startsWith('repos')
          new Notification(isRest ? '🧘 ONYX · Repos aujourd\'hui' : '⚡ ONYX · Séance du jour', {
            body: prog.notification,
            icon: '/icon-192.png',
            tag: 'onyx-program',
          })
        } catch {}
      }
      toast.success('Programme généré ⚡')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-gradient-to-br from-violet-950/30 via-neutral-900 to-neutral-900 border-red-900/40">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Dumbbell className="h-5 w-5 text-fuchsia-400" />
          <CardTitle className="text-base">Programme du jour — {sport}</CardTitle>
        </div>
        <CardDescription>Adapté à ta récupération en temps réel</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-neutral-400">Envies du jour (optionnel)</Label>
            <Input value={envies} onChange={(e) => setEnvies(e.target.value)} placeholder="Ex: travail explosivité, sparring léger..." className="bg-neutral-950/80 border-neutral-800" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-neutral-400">Articulations sensibles (optionnel)</Label>
            <Input value={joints} onChange={(e) => setJoints(e.target.value)} placeholder="Ex: épaule droite" className="bg-neutral-950/80 border-neutral-800" />
          </div>
        </div>
        <Button onClick={generate} disabled={loading} className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 font-bold h-12">
          {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Le coach réfléchit...</> : <><Sparkles className="h-4 w-4 mr-2" /> Générer ma séance IA</>}
        </Button>
        {program && <ProgramView program={program} />}
      </CardContent>
    </Card>
  )
}

function ProgramView({ program }) {
  if (!program) return null
  if (program.raw) return <pre className="text-xs text-neutral-300 whitespace-pre-wrap p-3 bg-neutral-950 rounded border border-neutral-800">{program.raw}</pre>
  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap gap-2">
        {program.type && <Badge className={`${String(program.type).startsWith('repos') ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' : 'bg-violet-500/20 text-violet-300 border-violet-500/40'}`}>{program.type === 'repos_actif' ? '🧘 Repos actif' : program.type === 'repos_complet' ? '💤 Repos complet' : '⚡ Séance'}</Badge>}
        {program.intensite && <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/40">Intensité: {program.intensite}</Badge>}
        {program.duree_minutes && <Badge variant="secondary" className="bg-neutral-800">⏱ {program.duree_minutes} min</Badge>}
        {program.focus && <Badge variant="secondary" className="bg-neutral-800">{program.focus}</Badge>}
      </div>
      {program.justification_choix && (
        <div className="p-2 bg-neutral-950/50 border border-neutral-800 rounded text-[11px] text-neutral-400 italic">💡 {program.justification_choix}</div>
      )}
      {program.echauffement?.length > 0 && (
        <Block title="Échauffement" items={program.echauffement.map(x => `${x.nom}${x.duree ? ` — ${x.duree}` : ''}${x.note ? ` (${x.note})` : ''}`)} />
      )}
      {program.corps_seance?.map((bloc, i) => (
        <div key={i} className="border border-neutral-800 rounded-lg p-3 bg-neutral-950/50">
          <div className="font-semibold text-fuchsia-300 text-sm mb-2">{bloc.bloc}</div>
          <div className="space-y-1.5">
            {bloc.exercices?.map((ex, j) => (
              <div key={j} className="text-xs text-neutral-300 flex items-start gap-2">
                <ChevronRight className="h-3 w-3 mt-0.5 text-violet-400 shrink-0" />
                <div>
                  <span className="font-medium text-neutral-100">{ex.nom}</span>
                  <span className="text-neutral-400"> — {ex.series} × {ex.reps}{ex.charge ? ` @ ${ex.charge}` : ''}{ex.repos ? ` / repos ${ex.repos}` : ''}</span>
                  {ex.note && <div className="text-neutral-500 italic">{ex.note}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      {program.etirements?.length > 0 && (
        <div className="border border-violet-500/30 rounded-lg p-3 bg-violet-500/5">
          <div className="text-xs uppercase text-violet-300 tracking-widest mb-2">🧘 Étirements</div>
          <ul className="space-y-1 text-xs text-neutral-300">
            {program.etirements.map((s, i) => (
              <li key={i} className="flex gap-2"><span className="text-violet-400">•</span>{s.nom}{s.duree ? ` — ${s.duree}` : ''}{s.zone ? ` (${s.zone})` : ''}</li>
            ))}
          </ul>
        </div>
      )}
      {program.retour_au_calme?.length > 0 && (
        <Block title="Retour au calme" items={program.retour_au_calme.map(x => `${x.nom}${x.duree ? ` — ${x.duree}` : ''}`)} />
      )}
      {program.conseil_coach && (
        <div className="p-3 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-lg text-orange-200 text-xs italic">“{program.conseil_coach}”</div>
      )}
      {program.attention && (
        <div className="p-3 bg-violet-500/10 border border-violet-500/30 rounded-lg text-red-200 text-xs flex gap-2"><ShieldAlert className="h-4 w-4 shrink-0" /> {program.attention}</div>
      )}
    </div>
  )
}

function Block({ title, items }) {
  return (
    <div>
      <div className="text-xs uppercase text-neutral-400 tracking-widest mb-1">{title}</div>
      <ul className="space-y-1 text-xs text-neutral-300">
        {items.map((it, i) => <li key={i} className="flex gap-2"><span className="text-violet-400">•</span>{it}</li>)}
      </ul>
    </div>
  )
}

function VoiceFeedbackCard({ userId, lastProgram, sport }) {
  const supabase = getSupabaseBrowser()
  const [recording, setRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const recognitionRef = useRef(null)
  const supported = useMemo(() => typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition), [])

  function toggleRecord() {
    if (!supported) {
      toast.error('Speech-to-text non supporté sur ce navigateur. Utilise Chrome mobile.')
      return
    }
    if (recording) {
      recognitionRef.current?.stop()
      setRecording(false)
      return
    }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.lang = 'fr-FR'
    rec.continuous = true
    rec.interimResults = true
    let finalText = transcript
    rec.onresult = (event) => {
      let interim = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript
        if (event.results[i].isFinal) finalText += t + ' '
        else interim += t
      }
      setTranscript(finalText + interim)
    }
    rec.onerror = (e) => {
      toast.error('Erreur micro: ' + e.error)
      setRecording(false)
    }
    rec.onend = () => setRecording(false)
    rec.start()
    recognitionRef.current = rec
    setRecording(true)
  }

  async function analyze() {
    if (!transcript.trim()) return toast.error('Ressenti vide')
    setLoading(true)
    try {
      const res = await fetch('/api/coach/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript, last_program: lastProgram, sport }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || data.error)
      setAnalysis(data.feedback)
      await supabase.from('session_feedback').insert({
        user_id: userId, transcript, ai_analysis: data.feedback,
      })
      toast.success('Analyse terminée')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-gradient-to-br from-neutral-900 to-violet-950/20 border-neutral-800">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-violet-400" />
          <CardTitle className="text-base">Retour de séance vocal (RPA)</CardTitle>
        </div>
        <CardDescription>Parle ton ressenti — l'IA analyse et ajuste</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-center">
          <button
            onClick={toggleRecord}
            className={`h-24 w-24 rounded-full flex items-center justify-center transition-all shadow-xl ${recording ? 'bg-violet-500 animate-pulse shadow-violet-500/50' : 'bg-gradient-to-br from-violet-500 to-fuchsia-500 hover:scale-105 shadow-violet-500/30'}`}
          >
            {recording ? <MicOff className="h-10 w-10 text-white" /> : <Mic className="h-10 w-10 text-white" />}
          </button>
        </div>
        <p className="text-center text-xs text-neutral-500">{recording ? 'Enregistrement en cours… parle librement' : 'Appuie pour dicter ton ressenti'}</p>
        <Textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Ta transcription apparaîtra ici — tu peux aussi taper directement"
          className="min-h-24 bg-neutral-950/80 border-neutral-800"
        />
        <div className="flex gap-2">
          <Button onClick={analyze} disabled={loading || !transcript.trim()} className="flex-1 bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 font-bold">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-2" /> Analyser</>}
          </Button>
          <Button variant="outline" size="icon" onClick={() => { setTranscript(''); setAnalysis(null) }} className="border-neutral-700">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        {analysis && <FeedbackView f={analysis} />}
      </CardContent>
    </Card>
  )
}

function FeedbackView({ f }) {
  if (f?.raw) return <pre className="text-xs text-neutral-300 whitespace-pre-wrap p-3 bg-neutral-950 rounded border border-neutral-800">{f.raw}</pre>
  return (
    <div className="space-y-3 text-sm">
      {f.resume && <div className="p-3 bg-neutral-950 border border-neutral-800 rounded-lg text-neutral-200 italic">{f.resume}</div>}
      <div className="flex flex-wrap gap-2">
        {f.charge_percue && <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/40">Charge: {f.charge_percue}</Badge>}
        {f.drapeau_rouge && <Badge className="bg-violet-600 text-white">⚠ Drapeau rouge</Badge>}
      </div>
      {f.questions_precises?.length > 0 && (
        <div className="p-3 bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-lg">
          <div className="text-xs uppercase text-fuchsia-300 tracking-widest mb-2">Le coach te demande</div>
          <ul className="space-y-1.5 text-orange-100 text-xs">
            {f.questions_precises.map((q, i) => <li key={i} className="flex gap-2"><ChevronRight className="h-3 w-3 mt-0.5 shrink-0" /> {q}</li>)}
          </ul>
        </div>
      )}
      {f.ajustements_prochaine_seance?.length > 0 && (
        <Block title="Ajustements pour la prochaine" items={f.ajustements_prochaine_seance} />
      )}
      {f.points_attention?.length > 0 && <Block title="Points d'attention" items={f.points_attention} />}
      {f.articulations?.length > 0 && (
        <div>
          <div className="text-xs uppercase text-neutral-400 tracking-widest mb-1">Articulations</div>
          <div className="flex flex-wrap gap-1.5">
            {f.articulations.map((a, i) => (
              <Badge key={i} variant="outline" className={`border-neutral-700 ${a.gravite === 'elevee' ? 'bg-violet-500/20 text-violet-300' : a.gravite === 'moyenne' ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'bg-neutral-800 text-neutral-300'}`}>
                {a.zone}: {a.note}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ImportCard({ userId, sport }) {
  const supabase = getSupabaseBrowser()
  const [url, setUrl] = useState('')
  const [desc, setDesc] = useState('')
  const [kind, setKind] = useState('video')
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState(null)

  async function run() {
    if (!url && !desc) return toast.error('Colle un lien ou une description')
    setLoading(true)
    try {
      const res = await fetch('/api/analyze/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, description: desc, kind, sport }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || data.error)
      setAnalysis(data.analysis)
      await supabase.from('imports').insert({
        user_id: userId, source_type: kind, source_url: url, description: desc, ai_analysis: data.analysis,
      })
      toast.success('Séance structurée par Gemini 2.5 Pro')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-gradient-to-br from-neutral-900 to-fuchsia-950/20 border-neutral-800">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-fuchsia-400" />
          <CardTitle className="text-base">Import / Analyse</CardTitle>
        </div>
        <CardDescription>Colle un lien YouTube/Insta ou décris un exercice</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-neutral-400">Type</Label>
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger className="bg-neutral-950/80 border-neutral-800"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="video">Vidéo</SelectItem>
                <SelectItem value="image">Image / Physique</SelectItem>
                <SelectItem value="exercice">Exercice</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 col-span-1">
            <Label className="text-xs text-neutral-400">URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" className="bg-neutral-950/80 border-neutral-800" />
          </div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-neutral-400">Description / Contexte</Label>
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ce que tu veux travailler, ce que tu vois dans la vidéo…" className="min-h-20 bg-neutral-950/80 border-neutral-800" />
        </div>
        <Button onClick={run} disabled={loading} className="w-full bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:from-fuchsia-600 hover:to-violet-600 font-bold">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-2" /> Structurer la séance</>}
        </Button>
        {analysis && <ImportView a={analysis} />}
      </CardContent>
    </Card>
  )
}

function ImportView({ a }) {
  if (a?.raw) return <pre className="text-xs text-neutral-300 whitespace-pre-wrap p-3 bg-neutral-950 rounded border border-neutral-800">{a.raw}</pre>
  return (
    <div className="space-y-3 text-sm">
      {a.titre && <div className="font-bold text-fuchsia-300">{a.titre}</div>}
      <div className="flex flex-wrap gap-2">
        {a.type_travail && <Badge className="bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40">{a.type_travail}</Badge>}
      </div>
      {a.objectif_transfert_mma && <div className="text-xs text-neutral-400 italic">Transfert: {a.objectif_transfert_mma}</div>}
      {a.seance_structuree?.bloc_principal?.length > 0 && (
        <div className="border border-neutral-800 rounded-lg p-3 bg-neutral-950/50">
          <div className="text-xs uppercase text-fuchsia-300 tracking-widest mb-2">Bloc principal</div>
          <div className="space-y-1.5">
            {a.seance_structuree.bloc_principal.map((ex, i) => (
              <div key={i} className="text-xs text-neutral-300 flex items-start gap-2">
                <ChevronRight className="h-3 w-3 mt-0.5 text-fuchsia-400 shrink-0" />
                <span><span className="font-medium text-neutral-100">{ex.exercice}</span> — {ex.series} × {ex.reps}{ex.tempo ? ` (tempo ${ex.tempo})` : ''}{ex.repos ? ` / repos ${ex.repos}` : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {a.pieges_a_eviter?.length > 0 && <Block title="Pièges à éviter" items={a.pieges_a_eviter} />}
      {a.progressions?.length > 0 && <Block title="Progressions" items={a.progressions} />}
    </div>
  )
}

function ReminderBell() {
  const [enabled, setEnabled] = useState(false)
  const [time, setTime] = useState('08:00')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem('coachReminder') || '{}')
      if (s.enabled) setEnabled(true)
      if (s.time) setTime(s.time)
    } catch {}
  }, [])

  useEffect(() => {
    if (!enabled) return
    const interval = setInterval(() => {
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      const today = now.toISOString().slice(0, 10)
      const last = localStorage.getItem('coachReminder_last')
      if (`${hh}:${mm}` === time && last !== today) {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('🔥 Coach IA', { body: 'C\'est l\'heure de saisir ta forme du jour et de recevoir ton programme.', icon: '/icon-192.png' })
          localStorage.setItem('coachReminder_last', today)
        }
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [enabled, time])

  async function toggle() {
    if (!enabled) {
      if (typeof Notification === 'undefined') { toast.error('Notifications non supportées'); return }
      const perm = await Notification.requestPermission()
      if (perm !== 'granted') { toast.error('Permission refusée'); return }
      const next = { enabled: true, time }
      localStorage.setItem('coachReminder', JSON.stringify(next))
      setEnabled(true)
      toast.success(`Rappel activé pour ${time}`)
    } else {
      localStorage.setItem('coachReminder', JSON.stringify({ enabled: false, time }))
      setEnabled(false)
      toast.success('Rappel désactivé')
    }
  }

  function updateTime(v) {
    setTime(v)
    if (enabled) localStorage.setItem('coachReminder', JSON.stringify({ enabled: true, time: v }))
  }

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" onClick={() => setOpen(!open)} className="h-9 w-9 relative">
        {enabled ? <BellRing className="h-4 w-4 text-fuchsia-400" /> : <Bell className="h-4 w-4" />}
        {enabled && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-fuchsia-400 animate-pulse" />}
      </Button>
      {open && (
        <div className="absolute right-0 top-11 z-50 w-64 rounded-xl border border-neutral-800 bg-neutral-900 shadow-2xl p-4 space-y-3">
          <div className="text-xs uppercase text-neutral-400 tracking-widest">Rappel quotidien</div>
          <p className="text-xs text-neutral-400">Une notification t&apos;invite à saisir ta forme du matin.</p>
          <div className="space-y-1">
            <Label className="text-xs">Heure</Label>
            <Input type="time" value={time} onChange={(e) => updateTime(e.target.value)} className="bg-neutral-950 border-neutral-800" />
          </div>
          <Button onClick={toggle} className={`w-full ${enabled ? 'bg-neutral-800 hover:bg-neutral-700' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'}`}>
            {enabled ? 'Désactiver' : 'Activer les rappels'}
          </Button>
          <p className="text-[10px] text-neutral-500">Fonctionne quand l&apos;app est ouverte (onglet actif ou PWA installée).</p>
        </div>
      )}
    </div>
  )
}

function speakText(text) {
  if (typeof window === 'undefined' || !window.speechSynthesis) return toast.error('TTS non supporté')
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'fr-FR'
  u.rate = 1.05
  window.speechSynthesis.speak(u)
}

function VocalHistoryList({ userId }) {
  const supabase = getSupabaseBrowser()
  const [items, setItems] = useState([])
  const [playing, setPlaying] = useState(null)

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('session_feedback').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(10)
      setItems(data || [])
    })()
  }, [userId, supabase])

  function play(item) {
    if (playing === item.id) {
      window.speechSynthesis?.cancel()
      setPlaying(null)
      return
    }
    speakText(item.transcript || '')
    setPlaying(item.id)
    const u = new SpeechSynthesisUtterance('')
    setTimeout(() => setPlaying(null), Math.max(3000, (item.transcript?.length || 0) * 60))
  }

  if (!items.length) return null
  return (
    <Card className="bg-neutral-900/60 border-neutral-800">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-neutral-400" />
          <CardTitle className="text-sm">Ressentis récents</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map(it => (
          <div key={it.id} className="flex items-start gap-2 p-2 rounded-lg bg-neutral-950/50 border border-neutral-800">
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => play(it)}>
              {playing === it.id ? <VolumeX className="h-4 w-4 text-violet-400" /> : <Volume2 className="h-4 w-4 text-fuchsia-400" />}
            </Button>
            <div className="flex-1 min-w-0">
              <div className="text-[10px] text-neutral-500">{new Date(it.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
              <div className="text-xs text-neutral-300 line-clamp-2">{it.transcript}</div>
              {it.ai_analysis?.charge_percue && <Badge className="mt-1 bg-violet-500/20 text-violet-300 border-violet-500/40 text-[10px]">Charge: {it.ai_analysis.charge_percue}</Badge>}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function TimelineTab({ userId }) {
  const supabase = getSupabaseBrowser()
  const [health, setHealth] = useState([])
  const [workouts, setWorkouts] = useState([])
  const [feedbacks, setFeedbacks] = useState([])

  useEffect(() => {
    (async () => {
      const [h, w, f] = await Promise.all([
        supabase.from('health_data').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(7),
        supabase.from('workouts').select('*').eq('user_id', userId).order('date', { ascending: false }).limit(7),
        supabase.from('session_feedback').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(7),
      ])
      setHealth((h.data || []).reverse())
      setWorkouts(w.data || [])
      setFeedbacks(f.data || [])
    })()
  }, [userId, supabase])

  const chartData = health.map(h => ({
    date: new Date(h.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    Fatigue: h.fatigue ?? null,
    HRV: h.hrv ?? null,
    Récup: h.recovery_score ?? null,
    Sommeil: h.sleep_hours ?? null,
  }))

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-neutral-900 to-neutral-900/60 border-neutral-800">
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-fuchsia-400" />
            <CardTitle className="text-base">Tendances 7 derniers jours</CardTitle>
          </div>
          <CardDescription>Fatigue, HRV, récupération</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-xs text-neutral-500 text-center py-6">Aucune donnée. Enregistre ta forme du jour pour voir les tendances.</p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                  <XAxis dataKey="date" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: '#0a0a0a', border: '1px solid #262626', borderRadius: 8, fontSize: 12 }} />
                  <Line type="monotone" dataKey="Fatigue" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="HRV" stroke="#f97316" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Récup" stroke="#22c55e" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="Sommeil" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-neutral-900/60 border-neutral-800">
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Dumbbell className="h-4 w-4 text-fuchsia-400" />
            <CardTitle className="text-sm">Dernières séances</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {workouts.length === 0 && <p className="text-xs text-neutral-500">Aucune séance générée.</p>}
          {workouts.map(w => (
            <div key={w.id} className="p-2 rounded-lg bg-neutral-950/50 border border-neutral-800">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-neutral-200">{w.program_json?.focus || w.type_seance || 'Séance'}</div>
                <div className="text-[10px] text-neutral-500">{new Date(w.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</div>
              </div>
              <div className="flex gap-1.5 mt-1 flex-wrap">
                {w.program_json?.intensite && <Badge className="bg-violet-500/20 text-violet-300 border-violet-500/40 text-[10px]">{w.program_json.intensite}</Badge>}
                {w.program_json?.duree_minutes && <Badge variant="secondary" className="bg-neutral-800 text-[10px]">{w.program_json.duree_minutes} min</Badge>}
                <Badge variant="outline" className="border-neutral-700 text-neutral-400 text-[10px]">{w.sport}</Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <VocalHistoryList userId={userId} />
    </div>
  )
}

function ImageUploadBlock({ userId, sport }) {
  const supabase = getSupabaseBrowser()
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [ctx, setCtx] = useState('physique')
  const [goals, setGoals] = useState('')
  const fileRef = useRef(null)

  async function pick(file) {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return toast.error('Max 5 Mo')
    const reader = new FileReader()
    reader.onload = () => setPreview({ data: reader.result, mime: file.type, name: file.name })
    reader.readAsDataURL(file)
  }

  async function analyze() {
    if (!preview) return toast.error('Choisis une image')
    setLoading(true)
    try {
      const base64 = preview.data.split(',')[1]
      const res = await fetch('/api/analyze/image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: preview.mime, context: ctx, sport, goals }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || data.error)
      setAnalysis(data.analysis)
      await supabase.from('imports').insert({
        user_id: userId, source_type: `image-${ctx}`, description: goals || preview.name, ai_analysis: data.analysis,
      })
      toast.success('Image analysée par Gemini Vision')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-gradient-to-br from-neutral-900 to-fuchsia-950/10 border-neutral-800">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-fuchsia-400" />
          <CardTitle className="text-base">Analyse d&apos;image</CardTitle>
        </div>
        <CardDescription>Upload une photo physique ou posture d&apos;exercice</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-neutral-400">Type d&apos;analyse</Label>
            <Select value={ctx} onValueChange={setCtx}>
              <SelectTrigger className="bg-neutral-950/80 border-neutral-800"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="physique">Physique / composition</SelectItem>
                <SelectItem value="posture">Posture / technique</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-neutral-400">Objectif (optionnel)</Label>
            <Input value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="Ex: prise de masse sèche" className="bg-neutral-950/80 border-neutral-800" />
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        <Button variant="outline" onClick={() => fileRef.current?.click()} className="w-full border-neutral-700 hover:bg-neutral-800">
          <Upload className="h-4 w-4 mr-2" /> {preview ? 'Changer l\'image' : 'Choisir une image'}
        </Button>
        {preview && (
          <div className="relative rounded-lg overflow-hidden border border-neutral-800">
            <img src={preview.data} alt="preview" className="w-full max-h-64 object-cover" />
          </div>
        )}
        <Button onClick={analyze} disabled={loading || !preview} className="w-full bg-gradient-to-r from-fuchsia-500 to-violet-500 hover:from-fuchsia-600 hover:to-violet-600 font-bold">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-2" /> Analyser avec Gemini Vision</>}
        </Button>
        {analysis && <ImageAnalysisView a={analysis} ctx={ctx} />}
      </CardContent>
    </Card>
  )
}

function ImageAnalysisView({ a, ctx }) {
  if (a?.raw) return <pre className="text-xs text-neutral-300 whitespace-pre-wrap p-3 bg-neutral-950 rounded border border-neutral-800">{a.raw}</pre>
  if (ctx === 'physique') {
    return (
      <div className="space-y-3 text-sm">
        {a.estimation_composition && (
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-neutral-950 rounded border border-neutral-800"><div className="text-[10px] text-neutral-500 uppercase">Muscle</div><div className="text-xs font-semibold text-fuchsia-300 capitalize">{a.estimation_composition.masse_musculaire}</div></div>
            <div className="p-2 bg-neutral-950 rounded border border-neutral-800"><div className="text-[10px] text-neutral-500 uppercase">Gras</div><div className="text-xs font-semibold text-violet-300 capitalize">{a.estimation_composition.gras_visible}</div></div>
            <div className="p-2 bg-neutral-950 rounded border border-neutral-800"><div className="text-[10px] text-neutral-500 uppercase">Symétrie</div><div className="text-xs font-semibold text-neutral-200 capitalize">{a.estimation_composition.symetrie}</div></div>
          </div>
        )}
        {a.atouts_visibles?.length > 0 && <Block title="Atouts" items={a.atouts_visibles} />}
        {a.zones_a_developper?.length > 0 && <Block title="Zones à développer" items={a.zones_a_developper} />}
        {a.plan_4_semaines && (
          <div className="border border-fuchsia-500/30 rounded-lg p-3 bg-fuchsia-500/5">
            <div className="text-xs uppercase text-fuchsia-300 tracking-widest mb-1">Plan 4 semaines</div>
            <div className="text-xs text-neutral-200 font-semibold">{a.plan_4_semaines.focus_principal}</div>
            <div className="text-xs text-neutral-400 mt-1">{a.plan_4_semaines.seances_par_semaine} séances/sem · Cardio: {a.plan_4_semaines.cardio}</div>
          </div>
        )}
        {a.conseils_nutrition?.length > 0 && <Block title="Nutrition" items={a.conseils_nutrition} />}
        {a.avertissement && <div className="text-[10px] text-neutral-500 italic">{a.avertissement}</div>}
      </div>
    )
  }
  return (
    <div className="space-y-3 text-sm">
      {a.exercice_identifie && <div className="font-bold text-fuchsia-300">{a.exercice_identifie}</div>}
      {a.alignement && <div className="text-xs text-neutral-300 italic">{a.alignement}</div>}
      {a.erreurs_probables?.length > 0 && <Block title="Erreurs probables" items={a.erreurs_probables} />}
      {a.corrections_prioritaires?.length > 0 && <Block title="Corrections" items={a.corrections_prioritaires} />}
      {a.exercices_correctifs?.length > 0 && <Block title="Exercices correctifs" items={a.exercices_correctifs} />}
      {a.avertissement && <div className="text-[10px] text-neutral-500 italic">{a.avertissement}</div>}
    </div>
  )
}

function computeFormScore(h) {
  if (!h) return null
  const parts = []
  if (h.hrv != null) parts.push(Math.max(0, Math.min(100, ((Number(h.hrv) - 20) / 80) * 100)))
  if (h.sleep_hours != null) {
    const s = Number(h.sleep_hours)
    parts.push(Math.max(0, Math.min(100, s >= 8 ? 100 : s >= 6 ? 60 + (s - 6) * 20 : s * 10)))
  }
  if (h.recovery_score != null) parts.push(Math.max(0, Math.min(100, Number(h.recovery_score))))
  if (h.fatigue != null) parts.push(Math.max(0, Math.min(100, (10 - Number(h.fatigue)) * 10)))
  if (!parts.length) return null
  return Math.round(parts.reduce((a, b) => a + b, 0) / parts.length)
}

function FormScoreCard({ latestHealth }) {
  const score = computeFormScore(latestHealth)
  if (score == null) {
    return (
      <Card className="bg-neutral-900/60 border-neutral-800">
        <CardContent className="py-6 text-center">
          <Gauge className="h-8 w-8 text-neutral-600 mx-auto mb-2" />
          <p className="text-xs text-neutral-500">Renseigne ta forme ci-dessous pour voir ton score du jour</p>
        </CardContent>
      </Card>
    )
  }
  const color = score >= 70 ? 'from-green-500 to-emerald-500' : score >= 40 ? 'from-fuchsia-500 to-yellow-500' : 'from-violet-600 to-violet-500'
  const label = score >= 70 ? 'GO ⚡' : score >= 40 ? 'MODÉRÉ' : 'RÉCUP'
  const advice = score >= 70 ? 'Tu peux pousser fort' : score >= 40 ? 'Séance à intensité contrôlée' : 'Récupération active recommandée'
  return (
    <Card className={`bg-gradient-to-br ${color} border-0 shadow-2xl`}>
      <CardContent className="py-5 text-white">
        <div className="flex items-center gap-4">
          <div className="text-5xl font-black leading-none">{score}</div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-widest opacity-90">Score de forme</div>
            <div className="text-2xl font-black">{label}</div>
            <div className="text-xs opacity-95 mt-1">{advice}</div>
          </div>
          <Gauge className="h-10 w-10 opacity-90" />
        </div>
      </CardContent>
    </Card>
  )
}

const MEAL_TYPES = ['Petit-déj', 'Déjeuner', 'Dîner', 'Collation']

function NutritionCard({ userId }) {
  const supabase = getSupabaseBrowser()
  const [desc, setDesc] = useState('')
  const [mealType, setMealType] = useState('Déjeuner')
  const [loading, setLoading] = useState(false)
  const [photoLoading, setPhotoLoading] = useState(false)
  const [photoPreview, setPhotoPreview] = useState(null)
  const [todayMeals, setTodayMeals] = useState([])
  const photoRef = useRef(null)

  async function refresh() {
    const today = new Date().toISOString().slice(0, 10)
    const { data } = await supabase.from('meals').select('*').eq('user_id', userId).eq('date', today).order('created_at', { ascending: true })
    setTodayMeals(data || [])
  }
  useEffect(() => { refresh() }, [userId]) // eslint-disable-line

  async function analyzePhoto(file) {
    if (!file) return
    if (file.size > 5 * 1024 * 1024) return toast.error('Photo trop grosse (max 5 Mo)')
    setPhotoLoading(true)
    try {
      const dataUrl = await new Promise((resolve) => {
        const r = new FileReader(); r.onload = () => resolve(r.result); r.readAsDataURL(file)
      })
      setPhotoPreview(dataUrl)
      const base64 = dataUrl.split(',')[1]
      const res = await fetch('/api/nutrition/photo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType: file.type, hint: desc }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || data.error)
      const est = data.estimate || {}
      const payload = {
        user_id: userId, date: new Date().toISOString().slice(0, 10), meal_type: mealType,
        name: est.name || 'Repas photo', portion: est.portion || '',
        calories: est.calories, protein: est.protein, carbs: est.carbs, fat: est.fat,
        notes: `📸 ${(est.aliments_detectes || []).join(', ')} · confiance: ${est.confiance || 'moyenne'}`,
      }
      const { error } = await supabase.from('meals').insert(payload)
      if (error) throw error
      toast.success(`📸 ${est.name || 'Repas'} · ${est.calories || 0} kcal · ${est.protein || 0}g prot`)
      setDesc('')
      setPhotoPreview(null)
      refresh()
    } catch (err) {
      toast.error(err.message)
      setPhotoPreview(null)
    } finally {
      setPhotoLoading(false)
    }
  }

  async function addMeal() {
    if (!desc.trim()) return toast.error('Décris ton repas')
    setLoading(true)
    try {
      const res = await fetch('/api/nutrition/estimate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: desc }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || data.error)
      const est = data.estimate || {}
      const payload = {
        user_id: userId, date: new Date().toISOString().slice(0, 10), meal_type: mealType,
        name: est.name || desc.slice(0, 40), portion: est.portion || '',
        calories: est.calories, protein: est.protein, carbs: est.carbs, fat: est.fat,
      }
      const { error } = await supabase.from('meals').insert(payload)
      if (error) throw error
      toast.success(`+${est.calories || 0} kcal · ${est.protein || 0}g prot`)
      setDesc('')
      refresh()
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function del(id) {
    await supabase.from('meals').delete().eq('id', id)
    refresh()
  }

  const totals = todayMeals.reduce((a, m) => ({
    kcal: a.kcal + (Number(m.calories) || 0),
    p: a.p + (Number(m.protein) || 0),
    c: a.c + (Number(m.carbs) || 0),
    f: a.f + (Number(m.fat) || 0),
  }), { kcal: 0, p: 0, c: 0, f: 0 })

  return (
    <Card className="bg-gradient-to-br from-neutral-900 to-green-950/20 border-neutral-800">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Utensils className="h-5 w-5 text-green-400" />
          <CardTitle className="text-base">Journal nutrition</CardTitle>
        </div>
        <CardDescription>Décris ou photographie — l&apos;IA estime les macros</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="p-2 bg-neutral-950 rounded border border-neutral-800"><div className="text-[10px] text-neutral-500">kcal</div><div className="text-sm font-bold text-fuchsia-300">{Math.round(totals.kcal)}</div></div>
          <div className="p-2 bg-neutral-950 rounded border border-neutral-800"><div className="text-[10px] text-neutral-500">Prot</div><div className="text-sm font-bold text-violet-300">{Math.round(totals.p)}g</div></div>
          <div className="p-2 bg-neutral-950 rounded border border-neutral-800"><div className="text-[10px] text-neutral-500">Gluc</div><div className="text-sm font-bold text-yellow-300">{Math.round(totals.c)}g</div></div>
          <div className="p-2 bg-neutral-950 rounded border border-neutral-800"><div className="text-[10px] text-neutral-500">Lip</div><div className="text-sm font-bold text-blue-300">{Math.round(totals.f)}g</div></div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Select value={mealType} onValueChange={setMealType}>
            <SelectTrigger className="bg-neutral-950/80 border-neutral-800 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MEAL_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Ex: poulet riz 400g" className="col-span-2 bg-neutral-950/80 border-neutral-800 text-xs" onKeyDown={(e) => e.key === 'Enter' && addMeal()} />
        </div>
        <input ref={photoRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => analyzePhoto(e.target.files?.[0])} />
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={addMeal} disabled={loading || photoLoading || !desc.trim()} className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 font-bold">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1" /> Texte</>}
          </Button>
          <Button onClick={() => photoRef.current?.click()} disabled={photoLoading || loading} variant="outline" className="border-green-700/60 hover:bg-green-900/30 font-bold">
            {photoLoading ? <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Analyse…</> : <><ImageIcon className="h-4 w-4 mr-1" /> 📸 Photo</>}
          </Button>
        </div>
        {photoPreview && (
          <div className="relative rounded-lg overflow-hidden border border-green-500/30">
            <img src={photoPreview} alt="Aperçu repas" className="w-full max-h-40 object-cover opacity-80" />
            {photoLoading && <div className="absolute inset-0 flex items-center justify-center bg-black/60"><Loader2 className="h-8 w-8 animate-spin text-green-400" /></div>}
          </div>
        )}
        {todayMeals.length > 0 && (
          <div className="space-y-1.5">
            {todayMeals.map(m => (
              <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg bg-neutral-950/50 border border-neutral-800">
                <Apple className="h-3.5 w-3.5 text-green-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-neutral-200 truncate">{m.name}</div>
                  <div className="text-[10px] text-neutral-500">{m.meal_type} · {Math.round(m.calories || 0)}kcal · {Math.round(m.protein || 0)}g prot{m.notes ? ` · ${m.notes.slice(0, 30)}` : ''}</div>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => del(m.id)}><Trash2 className="h-3.5 w-3.5 text-neutral-500" /></Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function NutritionWeekly({ userId, sport }) {
  const supabase = getSupabaseBrowser()
  const [meals, setMeals] = useState([])
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState(null)

  useEffect(() => {
    (async () => {
      const since = new Date(); since.setDate(since.getDate() - 7)
      const { data } = await supabase.from('meals').select('*').eq('user_id', userId).gte('date', since.toISOString().slice(0, 10)).order('date', { ascending: false })
      setMeals(data || [])
    })()
  }, [userId, supabase])

  async function run() {
    if (!meals.length) return toast.error('Aucun repas sur 7 jours')
    setLoading(true)
    try {
      const res = await fetch('/api/nutrition/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meals, sport }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || data.error)
      setAnalysis(data.analysis)
      toast.success('Analyse nutrition prête')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="bg-neutral-900/60 border-neutral-800">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Utensils className="h-4 w-4 text-green-400" />
          <CardTitle className="text-sm">Analyse nutrition (7 jours)</CardTitle>
        </div>
        <CardDescription className="text-xs">{meals.length} repas enregistrés</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={run} disabled={loading || !meals.length} className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 font-bold text-xs">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-1" /> Analyser ma semaine</>}
        </Button>
        {analysis && !analysis.raw && (
          <div className="space-y-2 text-sm">
            {analysis.score_qualite != null && (
              <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                <div className="text-3xl font-black text-green-300">{analysis.score_qualite}</div>
                <div className="text-xs text-neutral-300 flex-1">{analysis.verdict}</div>
              </div>
            )}
            {analysis.moyennes_quotidiennes && (
              <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                <div className="p-1.5 bg-neutral-950 rounded"><div className="text-neutral-500">kcal/j</div><div className="font-bold text-fuchsia-300">{Math.round(analysis.moyennes_quotidiennes.calories || 0)}</div></div>
                <div className="p-1.5 bg-neutral-950 rounded"><div className="text-neutral-500">Prot/j</div><div className="font-bold text-violet-300">{Math.round(analysis.moyennes_quotidiennes.protein || 0)}g</div></div>
                <div className="p-1.5 bg-neutral-950 rounded"><div className="text-neutral-500">Gluc/j</div><div className="font-bold text-yellow-300">{Math.round(analysis.moyennes_quotidiennes.carbs || 0)}g</div></div>
                <div className="p-1.5 bg-neutral-950 rounded"><div className="text-neutral-500">Lip/j</div><div className="font-bold text-blue-300">{Math.round(analysis.moyennes_quotidiennes.fat || 0)}g</div></div>
              </div>
            )}
            {analysis.points_forts?.length > 0 && <Block title="Points forts" items={analysis.points_forts} />}
            {analysis.points_amelioration?.length > 0 && <Block title="À améliorer" items={analysis.points_amelioration} />}
            {analysis.conseils_actions?.length > 0 && <Block title="Actions" items={analysis.conseils_actions} />}
            {analysis.hydratation_rappel && <div className="p-2 bg-blue-500/10 border border-blue-500/30 rounded text-[11px] text-blue-200">💧 {analysis.hydratation_rappel}</div>}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function WeekPlanCard({ userId, sport, latestHealth, recentWorkouts = [] }) {
  const supabase = getSupabaseBrowser()
  const [loading, setLoading] = useState(false)
  const [plan, setPlan] = useState(null)
  const [goals, setGoals] = useState('')

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10)
      const { data } = await supabase.from('workouts').select('*').eq('user_id', userId).eq('type_seance', 'week_plan').gte('date', today).order('created_at', { ascending: false }).limit(1)
      if (data?.[0]?.program_json) setPlan(data[0].program_json)
    })()
  }, [userId, supabase])

  async function generate() {
    setLoading(true)
    try {
      const body = {
        sport, level: 'intermédiaire', goals,
        hrv: latestHealth?.hrv, sleep_hours: latestHealth?.sleep_hours,
        recovery_score: latestHealth?.recovery_score, fatigue: latestHealth?.fatigue,
        recent_sessions: recentWorkouts.slice(0, 5).map(w => ({
          date: w.date, type: w.type_seance,
          intensite: w.program_json?.intensite, focus: w.program_json?.focus,
        })),
      }
      const res = await fetch('/api/coach/week', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail || data.error)
      setPlan(data.plan)
      // Save under a special row
      await supabase.from('workouts').insert({
        user_id: userId, date: new Date().toISOString().slice(0, 10),
        sport, type_seance: 'week_plan', program_json: data.plan, status: 'planifie',
      })
      toast.success('Ta semaine ONYX est prête 📅')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const dayColor = (type) => {
    if (type === 'repos_complet') return { bg: 'from-neutral-800 to-neutral-900', text: 'text-neutral-400', label: '💤' }
    if (type === 'repos_actif') return { bg: 'from-blue-900/70 to-blue-950/70', text: 'text-blue-200', label: '🧘' }
    return { bg: 'from-violet-700 to-fuchsia-700', text: 'text-white', label: '⚡' }
  }

  return (
    <Card className="bg-gradient-to-br from-neutral-900 to-violet-950/20 border-violet-900/40">
      <CardHeader>
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-violet-400" />
          <CardTitle className="text-base">Semaine ONYX</CardTitle>
        </div>
        <CardDescription>7 jours planifiés par l&apos;IA — séances & repos équilibrés</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <Label className="text-xs text-neutral-400">Objectif de la semaine (optionnel)</Label>
          <Input value={goals} onChange={(e) => setGoals(e.target.value)} placeholder="Ex: préparation combat dans 6 semaines" className="bg-neutral-950/80 border-neutral-800 text-xs" />
        </div>
        <Button onClick={generate} disabled={loading} className="w-full bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 font-bold">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Sparkles className="h-4 w-4 mr-2" /> {plan ? 'Regénérer la semaine' : 'Générer ma semaine'}</>}
        </Button>

        {plan?.objectif_semaine && (
          <div className="p-3 bg-violet-500/10 border border-violet-500/30 rounded-lg text-xs text-violet-200 italic">🎯 {plan.objectif_semaine}</div>
        )}

        {plan?.week?.length > 0 && (
          <div className="grid grid-cols-2 gap-2">
            {plan.week.map((d, i) => {
              const c = dayColor(d.type)
              const isToday = d.date === new Date().toISOString().slice(0, 10)
              return (
                <div key={i} className={`bg-gradient-to-br ${c.bg} rounded-lg p-2.5 border ${isToday ? 'border-violet-400 ring-2 ring-violet-500/50' : 'border-neutral-800'} relative`}>
                  {isToday && <div className="absolute top-1 right-1 text-[9px] uppercase tracking-widest text-violet-200 font-bold">AUJ.</div>}
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-lg leading-none">{c.label}</span>
                    <div>
                      <div className={`text-[10px] font-bold ${c.text} opacity-80`}>{d.jour}</div>
                      <div className={`text-[10px] ${c.text} opacity-60`}>{new Date(d.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}</div>
                    </div>
                  </div>
                  <div className={`text-xs font-semibold ${c.text} leading-tight line-clamp-2`}>{d.focus}</div>
                  <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                    {d.intensite && <span className={`text-[9px] px-1.5 py-0.5 rounded bg-black/30 ${c.text} uppercase`}>{d.intensite}</span>}
                    {d.duree_minutes && <span className={`text-[9px] px-1.5 py-0.5 rounded bg-black/30 ${c.text}`}>⏱ {d.duree_minutes}m</span>}
                  </div>
                  {d.exercices_cles?.length > 0 && (
                    <div className={`mt-1 text-[9px] ${c.text} opacity-70 line-clamp-2`}>
                      {d.exercices_cles.slice(0, 3).join(' · ')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Dashboard({ user, onSignOut }) {
  const supabase = getSupabaseBrowser()
  const [sport, setSport] = useState('MMA')
  const [latestHealth, setLatestHealth] = useState(null)
  const [lastProgram, setLastProgram] = useState(null)
  const [recentWorkouts, setRecentWorkouts] = useState([])

  useEffect(() => {
    (async () => {
      const today = new Date().toISOString().slice(0, 10)
      const { data: h } = await supabase.from('health_data').select('*').eq('user_id', user.id).eq('date', today).order('created_at', { ascending: false }).limit(1)
      if (h?.[0]) setLatestHealth(h[0])
      const { data: w } = await supabase.from('workouts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(7)
      if (w?.[0]) setLastProgram(w[0].program_json)
      setRecentWorkouts(w || [])
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
      if (p?.sport) setSport(p.sport)
      // Request notification permission proactively
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        try { await Notification.requestPermission() } catch {}
      }
    })()
  }, [user.id, supabase])

  return (
    <div className="min-h-screen bg-neutral-950 pb-24">
      <header className="sticky top-0 z-40 backdrop-blur bg-neutral-950/80 border-b border-neutral-900">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center">
              <Flame className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-black leading-none">ONYX 🧬</div>
              <div className="text-[10px] text-neutral-500 uppercase tracking-widest">{user.email?.split('@')[0]}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={sport} onValueChange={async (v) => {
              setSport(v)
              await supabase.from('profiles').upsert({ id: user.id, sport: v })
            }}>
              <SelectTrigger className="w-28 h-9 bg-neutral-900 border-neutral-800 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SPORTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
            <ReminderBell />
            <Button variant="ghost" size="icon" onClick={onSignOut} className="h-9 w-9"><LogOut className="h-4 w-4" /></Button>
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4">
        <Tabs defaultValue="today" className="w-full">
          <TabsList className="grid grid-cols-4 bg-neutral-900 mb-4">
            <TabsTrigger value="today" className="data-[state=active]:bg-violet-500 data-[state=active]:text-white text-xs">
              <Flame className="h-3.5 w-3.5 mr-1" /> Jour
            </TabsTrigger>
            <TabsTrigger value="rpa" className="data-[state=active]:bg-violet-500 data-[state=active]:text-white text-xs">
              <Mic className="h-3.5 w-3.5 mr-1" /> RPA
            </TabsTrigger>
            <TabsTrigger value="import" className="data-[state=active]:bg-violet-500 data-[state=active]:text-white text-xs">
              <Link2 className="h-3.5 w-3.5 mr-1" /> Import
            </TabsTrigger>
            <TabsTrigger value="history" className="data-[state=active]:bg-violet-500 data-[state=active]:text-white text-xs">
              <History className="h-3.5 w-3.5 mr-1" /> Suivi
            </TabsTrigger>
          </TabsList>

          <TabsContent value="today" className="space-y-4 mt-0">
            <FormScoreCard latestHealth={latestHealth} />
            <HealthCard userId={user.id} latest={latestHealth} onSaved={setLatestHealth} />
            <ProgramCard userId={user.id} sport={sport} latestHealth={latestHealth} recentWorkouts={recentWorkouts} onNewProgram={setLastProgram} />
            <NutritionCard userId={user.id} />
          </TabsContent>

          <TabsContent value="rpa" className="space-y-4 mt-0">
            <VoiceFeedbackCard userId={user.id} lastProgram={lastProgram} sport={sport} />
            <VocalHistoryList userId={user.id} />
          </TabsContent>

          <TabsContent value="import" className="space-y-4 mt-0">
            <ImportCard userId={user.id} sport={sport} />
            <ImageUploadBlock userId={user.id} sport={sport} />
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-0">
            <WeekPlanCard userId={user.id} sport={sport} latestHealth={latestHealth} recentWorkouts={recentWorkouts} />
            <TimelineTab userId={user.id} />
            <NutritionWeekly userId={user.id} sport={sport} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = getSupabaseBrowser()
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function signOut() {
    const supabase = getSupabaseBrowser()
    await supabase.auth.signOut()
    setUser(null)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-neutral-950">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    )
  }

  if (!user) return <AuthGate onAuthed={setUser} />
  return <Dashboard user={user} onSignOut={signOut} />
}
