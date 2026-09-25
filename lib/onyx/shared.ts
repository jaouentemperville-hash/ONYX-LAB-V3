// ONYX — types + helpers purs (importables partout, aucune dépendance client)

export const DAY_ORDER = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'] as const
export const JOURS_SEMAINE = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const
export const SPORTS = ['MMA', 'No-Gi', 'Boxe', 'Lutte', 'Athlétisation', 'JJB', 'Grappling'] as const
export const NIVEAUX = ['debutant', 'intermediaire', 'avance', 'competiteur'] as const
export const NIVEAUX_ACTIVITE = ['sedentaire', 'leger', 'modere', 'intense', 'athlete'] as const

export interface ClubSlot {
  jour: string
  heure: string
  label: string
}

export interface Profile {
  id: string
  display_name: string | null
  sport: string
  niveau: string
  poids_kg: number | null
  taille_cm: number | null
  poids_objectif_kg: number | null
  age: number | null
  sexe: string | null
  niveau_activite: string | null
  objectifs: string | null
  club_schedule: ClubSlot[]
  sync_token: string
}

export interface HealthData {
  id: string
  date: string
  sleep_hours: number | null
  hrv: number | null
  recovery_score: number | null
  fatigue: number | null
  charge: number | null
}

export interface Exercice {
  nom: string
  type?: string
  series?: string
  reps?: string
  charge?: string
  repos?: string
  note?: string
  done?: boolean
}

export interface Bloc {
  bloc: string
  exercices: Exercice[]
}

export interface SimpleItem {
  nom: string
  duree?: string
  note?: string
  zone?: string
}

export interface ProgramJson {
  date?: string
  type?: string
  intensite?: string
  focus?: string
  duree_minutes?: number
  justification_choix?: string
  echauffement?: SimpleItem[]
  corps_seance?: Bloc[]
  etirements?: SimpleItem[]
  retour_au_calme?: SimpleItem[]
  conseil_coach?: string
  attention?: string
  notification?: string
  rpe_reel?: number
}

export interface Workout {
  id: string
  user_id: string
  date: string
  sport: string | null
  type_seance: string | null
  program_json: ProgramJson | null
  status: string | null
}

export interface OneRm {
  id: string
  exercise: string
  value_kg: number
  reps?: number
  date: string
}

export interface WeekDayPlan {
  jour?: string
  date?: string
  type?: string
  focus?: string
  intensite?: string
  duree_minutes?: number
  club?: string
  note?: string
  exercices_cles?: string[]
}

export interface WeekPlan {
  objectif_semaine: string
  week: WeekDayPlan[]
}

export interface WeekFocusRow {
  id: string
  week_key: string
  focus: string
  parsed: WeekPlan
}

export interface Meal {
  id: string
  date: string
  meal_type: string | null
  name: string | null
  portion: string | null
  calories: number | null
  protein: number | null
  carbs: number | null
  fat: number | null
}

export interface ChatMsg {
  role: 'user' | 'assistant'
  content: string
}

// ---------------- date helpers ----------------
export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}
export function daysAgoStr(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}
export function getWeekKey(d: Date = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  const dayNum = date.getUTCDay() || 7
  date.setUTCDate(date.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`
}
export function frDate(iso: string): string {
  try {
    return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })
  } catch { return iso }
}

// ---------------- training helpers ----------------
export const INTENSITE_FACTOR: Record<string, number> = {
  repos: 0, 'repos actif': 0.15, légère: 0.35, legere: 0.35, moderee: 0.6, modérée: 0.6, forte: 1,
}

export function computeStrain(program: ProgramJson | null, fatigue: number | null): number {
  if (!program) return 0
  const factor = INTENSITE_FACTOR[(program.intensite || '').toLowerCase()] ?? 0.4
  const duree = program.duree_minutes || 0
  let strain = factor * Math.min(duree / 90, 1) * 21
  if (fatigue && fatigue >= 7) strain *= 0.9
  return Math.round(Math.min(Math.max(strain, 0), 21) * 10) / 10
}

export function nextClubSlot(clubSchedule: ClubSlot[]): { jour: string; heure: string; label: string; dayLabel: string } | null {
  if (!clubSchedule?.length) return null
  const now = new Date()
  const todayIdx = now.getDay()
  let best: { diff: number; slot: ClubSlot } | null = null
  for (const slot of clubSchedule) {
    const slotIdx = DAY_ORDER.indexOf(slot.jour as typeof DAY_ORDER[number])
    if (slotIdx === -1) continue
    let diff = (slotIdx - todayIdx + 7) % 7
    if (diff === 0) {
      const [h, m] = (slot.heure || '00:00').split(':').map(Number)
      const slotTime = new Date(now)
      slotTime.setHours(h || 0, m || 0, 0, 0)
      if (slotTime.getTime() <= now.getTime()) diff = 7
    }
    if (best === null || diff < best.diff) best = { diff, slot }
  }
  if (!best) return null
  const dayLabel = best.diff === 0 ? "Aujourd'hui" : best.diff === 1 ? 'Demain' : best.slot.jour
  return { jour: best.slot.jour, heure: best.slot.heure, label: best.slot.label, dayLabel }
}

// Palette violette selon l'intensité (dégradés)
export function intensityColors(intensite?: string): { from: string; to: string } {
  const key = (intensite || '').toLowerCase()
  if (key.includes('forte')) return { from: '#7C3AED', to: '#DB2777' }
  if (key.includes('mod')) return { from: '#8B5CF6', to: '#6366F1' }
  if (key.includes('lég') || key.includes('leg')) return { from: '#A78BFA', to: '#818CF8' }
  if (key.includes('repos')) return { from: '#C4B5FD', to: '#A5B4FC' }
  return { from: '#8B5CF6', to: '#A855F7' }
}

export function typeLabel(type?: string): string {
  const t = (type || '').toLowerCase()
  if (t === 'repos_actif') return 'Repos actif'
  if (t === 'repos_complet') return 'Repos complet'
  if (t === 'seance') return 'Séance'
  return type || 'Séance'
}

// IMC + estimation besoins caloriques (Mifflin-St Jeor) — pour un profil "intelligent"
export function computeBmi(poids: number | null, taille: number | null): number | null {
  if (!poids || !taille) return null
  const m = taille / 100
  return Math.round((poids / (m * m)) * 10) / 10
}

export function bmiLabel(bmi: number | null): string {
  if (bmi == null) return '—'
  if (bmi < 18.5) return 'Insuffisant'
  if (bmi < 25) return 'Normal'
  if (bmi < 30) return 'Surpoids'
  return 'Élevé'
}

export function activityFactor(niveau: string | null): number {
  switch ((niveau || 'modere')) {
    case 'sedentaire': return 1.2
    case 'leger': return 1.375
    case 'modere': return 1.55
    case 'intense': return 1.725
    case 'athlete': return 1.9
    default: return 1.55
  }
}

export function estimateTdee(p: { poids_kg: number | null; taille_cm: number | null; age: number | null; sexe: string | null; niveau_activite: string | null }): number | null {
  if (!p.poids_kg || !p.taille_cm || !p.age) return null
  const s = (p.sexe || '').toLowerCase().startsWith('f') ? -161 : 5
  const bmr = 10 * p.poids_kg + 6.25 * p.taille_cm - 5 * p.age + s
  return Math.round(bmr * activityFactor(p.niveau_activite))
}
