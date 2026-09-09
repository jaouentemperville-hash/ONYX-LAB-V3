import { NextResponse } from 'next/server'
import { chat, chatVision, extractJson } from '@/lib/emergent'

export const runtime = 'nodejs'

function cors(res) {
  res.headers.set('Access-Control-Allow-Origin', '*')
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  return res
}

export async function OPTIONS() {
  return cors(new NextResponse(null, { status: 200 }))
}

async function handleRoute(request, { params }) {
  const { path = [] } = await params
  const route = `/${path.join('/')}`
  const method = request.method

  try {
    if (route === '/health' && method === 'GET') {
      return cors(NextResponse.json({ status: 'ok', service: 'coach-ai' }))
    }

    // ==============================
    // Generate today's training program
    // ==============================
    if (route === '/coach/program' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const {
        sport = 'MMA',
        goals = '',
        level = 'intermédiaire',
        hrv = null,
        sleep_hours = null,
        recovery_score = null,
        fatigue = null,
        joints = '',
        envies = '',
        recent_sessions = [],
      } = body

      const system = `Tu es un coach sportif ELITE spécialisé en athlétisation, MMA et Grappling No-Gi.
Tu construis des séances progressives, sécurisées, ultra-personnalisées et pragmatiques.
Tu adaptes toujours l'intensité à la récupération (HRV, sommeil, fatigue déclarée).
Tu réponds EXCLUSIVEMENT en français.
Tu réponds STRICTEMENT en JSON valide, sans texte autour, sans markdown.`

      const prompt = `Génère le PROGRAMME D'ENTRAINEMENT DU JOUR pour cet athlète.

SPORT: ${sport}
NIVEAU: ${level}
OBJECTIFS: ${goals || 'polyvalence'}
ENVIES DU JOUR: ${envies || 'aucune préférence particulière'}
ARTICULATIONS SENSIBLES: ${joints || 'aucune'}

DONNEES DE RECUPERATION:
- HRV: ${hrv ?? 'non renseigné'}
- Sommeil (heures): ${sleep_hours ?? 'non renseigné'}
- Score de récupération (0-100): ${recovery_score ?? 'non renseigné'}
- Fatigue perçue (1-10): ${fatigue ?? 'non renseigné'}

DERNIERES SEANCES: ${JSON.stringify(recent_sessions).slice(0, 800)}

Adapte l'intensité: si récup faible (HRV bas, sommeil<6h, fatigue>7) fais une séance légère mobilité/technique.
Si récup bonne (HRV bon, sommeil>7h, fatigue<5) fais une séance de forte intensité (force/HIIT ou sparring/travail spécifique).

Réponds STRICTEMENT au format JSON suivant:
{
  "date": "YYYY-MM-DD",
  "intensite": "légère|modérée|forte",
  "focus": "...",
  "duree_minutes": 60,
  "echauffement": [{"nom": "...", "duree": "5 min", "note": "..."}],
  "corps_seance": [{"bloc": "...", "exercices": [{"nom": "...", "series": "3", "reps": "8", "charge": "70%", "repos": "90s", "note": "..."}]}],
  "retour_au_calme": [{"nom": "...", "duree": "..."}],
  "conseil_coach": "une phrase motivante et technique",
  "attention": "points de vigilance santé/articulations"
}`

      const raw = await chat({ system, prompt })
      const json = extractJson(raw)
      return cors(NextResponse.json({ program: json || { raw }, raw }))
    }

    // ==============================
    // Post-session intelligent feedback (RPA)
    // ==============================
    if (route === '/coach/feedback' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const { transcript = '', last_program = null, sport = 'MMA' } = body

      if (!transcript.trim()) {
        return cors(NextResponse.json({ error: 'transcript required' }, { status: 400 }))
      }

      const system = `Tu es un coach sportif ELITE (athlétisation, MMA, Grappling No-Gi).
Tu analyses le ressenti brut post-séance d'un athlète (transcription vocale).
Tu extrais les signaux importants: charge perçue, fatigue, articulations, technique, motivation.
Tu poses 2-3 questions PRÉCISES et courtes pour affiner l'ajustement (ex: "L'épaule droite, ça a tiré à quel moment exactement?").
Tu proposes des ajustements CONCRETS pour la prochaine séance.
Tu réponds STRICTEMENT en JSON, sans markdown.`

      const prompt = `SPORT: ${sport}
SEANCE DU JOUR (référence): ${JSON.stringify(last_program).slice(0, 1200)}

RESSENTI BRUT DE L'ATHLETE (transcription vocale, non nettoyée):
"""${transcript}"""

Réponds strictement au format JSON:
{
  "resume": "1-2 phrases synthèse",
  "charge_percue": "légère|modérée|forte|excessive",
  "points_positifs": ["..."],
  "points_attention": ["..."],
  "articulations": [{"zone": "...", "gravite": "faible|moyenne|elevee", "note": "..."}],
  "questions_precises": ["Question 1?", "Question 2?"],
  "ajustements_prochaine_seance": ["..."],
  "drapeau_rouge": false
}`

      const raw = await chat({ system, prompt })
      const json = extractJson(raw)
      return cors(NextResponse.json({ feedback: json || { raw }, raw }))
    }

    // ==============================
    // Analyze imported link/image description (Gemini)
    // ==============================
    if (route === '/analyze/link' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const { url = '', description = '', kind = 'video', sport = 'MMA' } = body

      if (!url && !description) {
        return cors(NextResponse.json({ error: 'url or description required' }, { status: 400 }))
      }

      const system = `Tu es un préparateur physique expert en athlétisation pour sports de combat (MMA, No-Gi).
A partir d'un lien vidéo/image et d'une description faite par l'athlète, tu construis une SEANCE STRUCTUREE prête à être exécutée.
Tu identifies le TYPE de travail (force, pliométrie, technique, cardio, mobilité...), les EXERCICES et propose des progressions.
Tu réponds en JSON strict.`

      const prompt = `SPORT CIBLE: ${sport}
TYPE DE MEDIA: ${kind}
LIEN: ${url || 'non fourni'}
DESCRIPTION PAR L'ATHLETE: ${description || 'aucune description'}

Réponds strictement en JSON:
{
  "titre": "...",
  "type_travail": "force|pliometrie|technique|cardio|mobilite|mixte",
  "objectif_transfert_mma": "...",
  "seance_structuree": {
    "echauffement": [{"nom": "...", "duree": "..."}],
    "bloc_principal": [{"exercice": "...", "series": "...", "reps": "...", "tempo": "...", "repos": "..."}],
    "finisher": [{"nom": "...", "format": "..."}]
  },
  "progressions": ["..."],
  "pieges_a_eviter": ["..."],
  "materiel": ["..."]
}`

      const raw = await chat({ system, prompt })
      const json = extractJson(raw)
      return cors(NextResponse.json({ analysis: json || { raw }, raw }))
    }

    // ==============================
    // Analyze uploaded image (Gemini Vision) - body/physique/exercise form
    // ==============================
    if (route === '/analyze/image' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const { imageBase64 = '', mimeType = 'image/jpeg', context = 'physique', sport = 'MMA', goals = '' } = body

      if (!imageBase64) {
        return cors(NextResponse.json({ error: 'imageBase64 required' }, { status: 400 }))
      }

      const system = `Tu es un préparateur physique expert en sports de combat (MMA, No-Gi).
Tu analyses des images de physique/composition corporelle OU des postures d'exercices.
Tu ne diagnostiques JAMAIS de blessure. Tu donnes une analyse visuelle prudente + un plan d'action.
Tu réponds STRICTEMENT en JSON valide français.`

      const isPhysique = context === 'physique'
      const prompt = isPhysique
        ? `Analyse ce PHYSIQUE pour un athlète de ${sport}.
Objectifs déclarés: ${goals || 'polyvalence combat'}.

Réponds strictement en JSON:
{
  "estimation_composition": {"masse_musculaire": "faible|moyenne|bonne|elevee", "gras_visible": "bas|moyen|eleve", "symetrie": "..."},
  "atouts_visibles": ["..."],
  "zones_a_developper": ["..."],
  "plan_4_semaines": {
    "focus_principal": "...",
    "seances_par_semaine": 4,
    "repartition": [{"jour": "L", "type": "..."}, {"jour": "Ma", "type": "..."}],
    "priorites_musculaires": ["..."],
    "cardio": "..."
  },
  "conseils_nutrition": ["..."],
  "avertissement": "L'analyse d'une image ne remplace pas un bilan pro."
}`
        : `Analyse cette POSTURE / TECHNIQUE pour un athlète de ${sport}.

Réponds strictement en JSON:
{
  "exercice_identifie": "...",
  "alignement": "...",
  "erreurs_probables": ["..."],
  "corrections_prioritaires": ["..."],
  "exercices_correctifs": ["..."],
  "avertissement": "Une seule image ne permet pas de diagnostiquer une blessure."
}`

      const raw = await chatVision({ system, prompt, imageBase64, mimeType })
      const json = extractJson(raw)
      return cors(NextResponse.json({ analysis: json || { raw }, raw }))
    }

    // ==============================
    // Estimate macros from meal description (Gemini)
    // ==============================
    if (route === '/nutrition/estimate' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const { description = '' } = body
      if (!description.trim()) return cors(NextResponse.json({ error: 'description required' }, { status: 400 }))

      const system = `Tu es un diététicien du sport. Tu estimes les macronutriments d'un repas décrit en langage naturel.
Sois RÉALISTE et prudent. Base-toi sur des portions standards en France.
Réponds STRICTEMENT en JSON.`
      const prompt = `Description du repas: "${description}"

Réponds strictement en JSON:
{
  "name": "nom résumé du repas",
  "portion": "portion estimée en g ou description",
  "calories": 550,
  "protein": 40,
  "carbs": 60,
  "fat": 15,
  "note": "assomption faite pour l'estimation"
}`
      const raw = await chat({ system, prompt })
      const json = extractJson(raw)
      return cors(NextResponse.json({ estimate: json || { raw }, raw }))
    }

    // ==============================
    // Weekly nutrition analysis (Gemini)
    // ==============================
    if (route === '/nutrition/analyze' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const { meals = [], sport = 'MMA', goals = '' } = body
      if (!meals.length) return cors(NextResponse.json({ error: 'meals required' }, { status: 400 }))

      const system = `Tu es un diététicien du sport spécialisé en sports de combat (MMA, No-Gi).
Tu analyses 7 jours d'alimentation d'un athlète et donnes un feedback pragmatique et actionnable.
Réponds STRICTEMENT en JSON français.`
      const totals = meals.reduce((acc, m) => ({
        calories: acc.calories + (Number(m.calories) || 0),
        protein: acc.protein + (Number(m.protein) || 0),
        carbs: acc.carbs + (Number(m.carbs) || 0),
        fat: acc.fat + (Number(m.fat) || 0),
      }), { calories: 0, protein: 0, carbs: 0, fat: 0 })

      const prompt = `SPORT: ${sport}
OBJECTIFS: ${goals || 'performance combat + composition corporelle'}
NOMBRE DE REPAS SUR LA PÉRIODE: ${meals.length}
TOTAUX PÉRIODE: ${JSON.stringify(totals)}
EXEMPLES DE REPAS: ${JSON.stringify(meals.slice(0, 15).map(m => ({ n: m.name, p: m.portion, k: m.calories, pr: m.protein })))}

Réponds strictement en JSON:
{
  "score_qualite": 75,
  "moyennes_quotidiennes": {"calories": 2400, "protein": 150, "carbs": 280, "fat": 80},
  "verdict": "1-2 phrases synthèse",
  "points_forts": ["..."],
  "points_amelioration": ["..."],
  "conseils_actions": ["..."],
  "hydratation_rappel": "..."
}`
      const raw = await chat({ system, prompt })
      const json = extractJson(raw)
      return cors(NextResponse.json({ analysis: json || { raw }, raw }))
    }

    return cors(NextResponse.json({ error: `Route ${route} not found` }, { status: 404 }))
  } catch (err) {
    console.error('API Error:', err)
    return cors(NextResponse.json({ error: 'Internal server error', detail: String(err?.message || err) }, { status: 500 }))
  }
}

export const GET = handleRoute
export const POST = handleRoute
export const PUT = handleRoute
export const DELETE = handleRoute
export const PATCH = handleRoute
