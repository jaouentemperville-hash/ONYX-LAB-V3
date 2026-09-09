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
    // Apple Health Sync + AUTO PROGRAM GENERATION
    // ==============================
    if (route === '/health/sync' && (method === 'POST' || method === 'GET')) {
      let params = {}
      if (method === 'POST') {
        params = await request.json().catch(() => ({}))
      } else {
        const url = new URL(request.url)
        params = Object.fromEntries(url.searchParams.entries())
      }
      const token = params.token || params.t
      if (!token) return cors(NextResponse.json({ error: 'token required' }, { status: 400 }))
      const autoProgram = String(params.auto_program ?? params.auto ?? 'true') !== 'false'

      const num = (v) => (v === undefined || v === null || v === '' ? null : Number(v))
      const payload = {
        p_token: token,
        p_sleep_hours: num(params.sleep_hours ?? params.sleep),
        p_hrv: num(params.hrv),
        p_recovery_score: num(params.recovery_score ?? params.recovery),
        p_fatigue: num(params.fatigue) != null ? Math.round(num(params.fatigue)) : null,
        p_resting_hr: num(params.resting_hr ?? params.hr),
      }

      const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      const rpcRes = await fetch(`${supaUrl}/rest/v1/rpc/apple_health_sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': supaKey, 'Authorization': `Bearer ${supaKey}` },
        body: JSON.stringify(payload),
      })
      const rpcData = await rpcRes.json().catch(() => ({}))
      if (!rpcRes.ok) return cors(NextResponse.json({ error: 'sync failed', detail: rpcData }, { status: 500 }))
      if (rpcData?.ok === false) return cors(NextResponse.json({ error: rpcData.error || 'invalid_token' }, { status: 401 }))

      let program = null
      let programError = null
      if (autoProgram) {
        try {
          const profile = rpcData?.profile || {}
          const sport = profile.sport || 'MMA'
          const level = profile.niveau || 'intermédiaire'
          const goals = profile.objectifs || ''
          const recent_sessions = rpcData?.recent_sessions || []

          const system = `Tu es un coach ELITE (athlétisation, MMA, No-Gi). Tu décides SEANCE ou REPOS selon la récupération et la charge récente, tu inclus étirements + durée + notification courte. Tu réponds STRICTEMENT en JSON français.`
          const prompt = `Sync AUTO du matin — décide séance ou repos pour aujourd'hui.

SPORT: ${sport} · NIVEAU: ${level} · OBJECTIFS: ${goals || 'polyvalence'}
HEALTH: sommeil=${payload.p_sleep_hours ?? 'nr'}h HRV=${payload.p_hrv ?? 'nr'} recup=${payload.p_recovery_score ?? 'nr'} fatigue=${payload.p_fatigue ?? 'nr'} FC_repos=${payload.p_resting_hr ?? 'nr'}
DERNIÈRES SÉANCES: ${JSON.stringify(recent_sessions).slice(0, 1500)}

RÈGLES: 2+ séances fortes consécutives OR recup<40 OR fatigue>7 → repos actif. Bonne récup → forte. Sinon modérée. Durée cohérente.

JSON strict:
{
  "date": "YYYY-MM-DD",
  "type": "seance|repos_actif|repos_complet",
  "intensite": "repos|légère|modérée|forte",
  "focus": "titre court",
  "duree_minutes": 60,
  "justification_choix": "pourquoi",
  "echauffement": [{"nom":"...","duree":"5 min","note":"..."}],
  "corps_seance": [{"bloc":"...","exercices":[{"nom":"...","series":"3","reps":"8","charge":"70%","repos":"90s","note":"..."}]}],
  "etirements": [{"nom":"...","duree":"30s x2","zone":"..."}],
  "retour_au_calme": [{"nom":"...","duree":"..."}],
  "conseil_coach": "...",
  "attention": "...",
  "notification": "message court (max 80 car.)"
}`
          const raw = await chat({ system, prompt })
          program = extractJson(raw)

          if (program) {
            await fetch(`${supaUrl}/rest/v1/rpc/save_auto_workout`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'apikey': supaKey, 'Authorization': `Bearer ${supaKey}` },
              body: JSON.stringify({ p_token: token, p_sport: sport, p_program: program }),
            })
          }
        } catch (e) {
          programError = String(e?.message || e)
        }
      }

      return cors(NextResponse.json({
        ok: true,
        synced: payload,
        auto_program: !!program,
        program,
        program_error: programError,
      }))
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
        poids_kg = null,
        taille_cm = null,
        club_schedule = [],
        one_rm = {},
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
Tu adaptes l'intensité à la récupération (HRV, sommeil, fatigue).
Tu prescris des JOURS DE REPOS si nécessaire (charge cumulée élevée, HRV bas, fatigue >7, récupération <40, ou après 2-3 jours d'intensité forte consécutifs).
Tu inclus TOUJOURS des étirements ciblés dans la récupération.
Tu réponds EXCLUSIVEMENT en français, STRICTEMENT en JSON valide sans markdown.`

      const prompt = `Décide si aujourd'hui c'est SÉANCE ou REPOS pour cet athlète.

SPORT: ${sport}
NIVEAU: ${level}
OBJECTIFS: ${goals || 'polyvalence combat'}
POIDS DE CORPS: ${poids_kg ? poids_kg + ' kg' : 'non renseigné'} ${taille_cm ? '· TAILLE: ' + taille_cm + ' cm' : ''}
1RM CONNUS (kg): ${JSON.stringify(one_rm)} ${Object.keys(one_rm || {}).length ? '(utilise ces 1RM pour calculer les charges kg RÉELLES sur ces exercices)' : ''}
HORAIRES CLUB: ${JSON.stringify(club_schedule)} ${(club_schedule || []).length ? '(intègre ces créneaux si compatibles avec aujourd\'hui)' : ''}
ENVIES DU JOUR: ${envies || 'aucune préférence'}
ARTICULATIONS SENSIBLES: ${joints || 'aucune'}

DONNÉES DE RÉCUPÉRATION:
- HRV: ${hrv ?? 'non renseigné'}
- Sommeil (heures): ${sleep_hours ?? 'non renseigné'}
- Score de récupération (0-100): ${recovery_score ?? 'non renseigné'}
- Fatigue perçue (1-10): ${fatigue ?? 'non renseigné'}

DERNIÈRES SÉANCES (7 derniers jours): ${JSON.stringify(recent_sessions).slice(0, 1500)}

RÈGLES:
- 2+ séances "forte" consécutives OU récup <40 OU fatigue >7 → REPOS ACTIF (mobilité + étirements)
- Bonne récup (HRV bon, sommeil>7h, fatigue<5) et pas de séance dure hier → intensité FORTE
- Sinon → MODÉRÉE
- Durée cohérente: 30-45 min repos actif / 60 min modéré / 75-90 min forte
- IMPORTANT: si 1RM est renseigné pour l'exercice (squat/dc/sdt/etc), exprime la charge en KG RÉEL calculé sur le 1RM (ex: "70% de 140kg → 98 kg").
- Sinon si poids de corps est renseigné pour un exercice au poids de corps ou % du poids, exprime en KG RÉEL.
- Sinon en pourcentage.
- N'utilise PAS de caractères "@" dans les valeurs de charge ; écris "à 70% du poids de corps" ou "avec 55 kg".
- Chaque exercice: précise "type" simple parmi: squat|hinge|push|pull|core|plyo|cardio|mobilite|combat|technique.

Réponds STRICTEMENT au format JSON:
{
  "date": "YYYY-MM-DD",
  "type": "seance|repos_actif|repos_complet",
  "intensite": "repos|légère|modérée|forte",
  "focus": "titre court",
  "duree_minutes": 60,
  "justification_choix": "pourquoi",
  "echauffement": [{"nom":"...","duree":"5 min","note":"..."}],
  "corps_seance": [{"bloc":"...","exercices":[{"nom":"...","type":"squat","series":"3","reps":"8","charge":"55 kg","repos":"90s","note":"..."}]}],
  "etirements": [{"nom":"...","duree":"30s x2","zone":"..."}],
  "retour_au_calme": [{"nom":"...","duree":"..."}],
  "conseil_coach": "phrase motivante",
  "attention": "vigilances santé",
  "notification": "message court (max 80 car.)"
}`

      const raw = await chat({ system, prompt })
      const json = extractJson(raw)
      return cors(NextResponse.json({ program: json || { raw }, raw }))
    }

    // ==============================
    // Weekly plan (7 upcoming days) — AI decides sessions/rest
    // ==============================
    if (route === '/coach/week' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const {
        sport = 'MMA', goals = '', level = 'intermédiaire',
        poids_kg = null, club_schedule = [],
        hrv = null, sleep_hours = null, recovery_score = null, fatigue = null,
        recent_sessions = [],
      } = body

      // Compute next 7 dates
      const dates = []
      for (let i = 0; i < 7; i++) {
        const d = new Date(); d.setDate(d.getDate() + i)
        dates.push(d.toISOString().slice(0, 10))
      }

      const system = `Tu es un coach ELITE (athlétisation, MMA, No-Gi).
Tu conçois un PLAN HEBDOMADAIRE équilibré pour un athlète:
- Alterner intensités fortes / modérées / repos actif / repos complet
- Cibler différents systèmes (force, puissance, capacité aérobie, technique, mobilité)
- Prévoir 1-2 jours de repos par semaine minimum
- Adapter le volume au niveau et à la récupération actuelle
Tu réponds STRICTEMENT en JSON français, sans markdown.`

      const prompt = `Génère le PLAN 7 JOURS pour cet athlète.

SPORT: ${sport}
NIVEAU: ${level}
OBJECTIFS: ${goals || 'polyvalence combat'}
POIDS: ${poids_kg ? poids_kg + ' kg' : 'nr'}
HORAIRES CLUB (à respecter/intégrer): ${JSON.stringify(club_schedule)}

ÉTAT ACTUEL:
- HRV: ${hrv ?? 'nr'} · Sommeil: ${sleep_hours ?? 'nr'}h · Récup: ${recovery_score ?? 'nr'}/100 · Fatigue: ${fatigue ?? 'nr'}/10

DERNIÈRES SÉANCES: ${JSON.stringify(recent_sessions).slice(0, 800)}

DATES À PLANIFIER: ${JSON.stringify(dates)}

RÈGLES: alterner intensités, 1-2 jours repos, respecter les horaires club si listés (types "combat"/"technique" ces jours-là).
N'utilise PAS le caractère "@" dans les textes.

Réponds STRICTEMENT en JSON:
{
  "objectif_semaine": "1-2 phrases",
  "week": [
    {"date":"YYYY-MM-DD","jour":"Lun|Mar|...","type":"seance|repos_actif|repos_complet","intensite":"légère|modérée|forte|repos","focus":"titre court","duree_minutes":60,"club":"oui|non","exercices_cles":["ex1","ex2","ex3"],"note":"1 phrase"}
  ]
}`

      const raw = await chat({ system, prompt })
      const json = extractJson(raw)
      return cors(NextResponse.json({ plan: json || { raw }, raw }))
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
    // Estimate macros from meal PHOTO (Gemini Vision)
    // ==============================
    if (route === '/nutrition/photo' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const { imageBase64 = '', mimeType = 'image/jpeg', hint = '' } = body
      if (!imageBase64) return cors(NextResponse.json({ error: 'imageBase64 required' }, { status: 400 }))

      const system = `Tu es un diététicien du sport. Tu identifies les aliments visibles sur une photo de repas et estimes les macronutriments TOTAUX de l'assiette.
Sois RÉALISTE sur les portions visibles. Réponds STRICTEMENT en JSON.`
      const prompt = `Analyse cette photo de repas.${hint ? ` Indication utilisateur: "${hint}".` : ''}

Réponds strictement en JSON:
{
  "name": "résumé du repas",
  "aliments_detectes": ["poulet", "riz", "légumes"],
  "portion": "estimation totale en g ou description",
  "calories": 650,
  "protein": 45,
  "carbs": 70,
  "fat": 18,
  "confiance": "faible|moyenne|elevee",
  "note": "assomptions faites"
}`
      const raw = await chatVision({ system, prompt, imageBase64, mimeType })
      const json = extractJson(raw)
      return cors(NextResponse.json({ estimate: json || { raw }, raw }))
    }

    // ==============================
    // Compare user physique to a TARGET physique (Gemini Vision, 2 images)
    // ==============================
    if (route === '/photo/compare' && method === 'POST') {
      const body = await request.json().catch(() => ({}))
      const { userImage = null, targetImage = null, sport = 'MMA', goals = '' } = body
      if (!userImage?.base64 || !targetImage?.base64) {
        return cors(NextResponse.json({ error: 'userImage and targetImage required' }, { status: 400 }))
      }

      const system = `Tu es un préparateur physique expert en sports de combat.
Tu compares le physique ACTUEL d'un athlète (image 1) à un physique CIBLE souhaité (image 2).
Tu identifies les groupes musculaires à développer en priorité et proposes un plan concret.
Tu réponds STRICTEMENT en JSON français. Reste bienveillant et prudent.`

      const prompt = `IMAGE 1 = PHYSIQUE ACTUEL de l'athlète.
IMAGE 2 = PHYSIQUE CIBLE (objectif visuel).

SPORT: ${sport}
OBJECTIFS DÉCLARÉS: ${goals || 'esthétique + performance combat'}

Réponds strictement en JSON:
{
  "estimation_actuel": {"masse_musculaire": "faible|moyenne|bonne|elevee", "gras_visible": "bas|moyen|eleve"},
  "estimation_cible": {"masse_musculaire": "faible|moyenne|bonne|elevee", "gras_visible": "bas|moyen|eleve"},
  "ecart_principal": "1-2 phrases sur ce qui distingue les 2 physiques",
  "muscles_a_developper": [
    {"zone": "épaules", "priorite": "haute|moyenne|basse", "raison": "...", "exercices_cles": ["développé militaire","élévations latérales"]},
    {"zone": "dos", "priorite": "haute", "raison": "...", "exercices_cles": ["tractions","rowing"]}
  ],
  "muscles_a_maintenir": ["jambes", "..."],
  "recommandation_nutrition": "prise de masse|maintien|sèche legère",
  "delai_realiste_semaines": 24,
  "avertissement": "Une seule image ne remplace pas un bilan pro, et la génétique fait varier les résultats."
}`

      const raw = await chatVision({
        system, prompt,
        images: [
          { base64: userImage.base64, mime: userImage.mimeType || 'image/jpeg' },
          { base64: targetImage.base64, mime: targetImage.mimeType || 'image/jpeg' },
        ],
      })
      const json = extractJson(raw)
      return cors(NextResponse.json({ analysis: json || { raw }, raw }))
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
