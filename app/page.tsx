'use client'

import React, { useState } from 'react'
import {
  Calendar,
  Dumbbell,
  Flame,
  Trophy,
  Activity,
  X,
  ChevronRight,
  Plus,
  Clock,
  TrendingUp,
  Target,
  Shield,
  Zap,
  CheckCircle2,
  BarChart3,
  User,
  HeartPulse
} from 'lucide-react'

export default function OnyxDashboard() {
  // Gestion de la modal active ('planning' | 'focus' | '1rm' | 'workouts' | null)
  const [activeModal, setActiveModal] = useState<string | null>(null)

  // Exemple de state pour les 1RM (interactif dans la modal)
  const [oneRepMaxes, setOneRepMaxes] = useState([
    { exercise: 'Squat', weight: 140, unit: 'kg', delta: '+5kg ce mois' },
    { exercise: 'Développé Couché', weight: 105, unit: 'kg', delta: '+2.5kg' },
    { exercise: 'Soulevé de Terre', weight: 175, unit: 'kg', delta: '+10kg' },
    { exercise: 'Traction Lestée', weight: 35, unit: 'kg', delta: '+5kg' }
  ])

  // Données de simulation pour le planning du jour
  const daySchedule = [
    { time: '08:00 - 08:30', title: 'Mobilité & Activation', type: 'Récup', status: 'completed' },
    { time: '12:30 - 13:45', title: 'Renforcement & Force 1RM', type: 'Musculation', status: 'upcoming' },
    { time: '18:30 - 20:30', title: 'Grappling / JJB No-Gi', type: 'Club', status: 'upcoming' }
  ]

  return (
    <div className="min-h-screen bg-[#0b0813] text-zinc-100 font-sans selection:bg-purple-500 selection:text-white pb-12">
      {/* EFFET DE LUEUR D'ARRIÈRE-PLAN (PURPLE GLOW) */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-purple-900/30 via-indigo-900/10 to-transparent blur-3xl pointer-events-none -z-10" />

      {/* HEADER / NAVIGATION */}
      <header className="sticky top-0 z-30 bg-[#0b0813]/80 backdrop-blur-xl border-b border-purple-900/30 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-purple-600/30">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-wider bg-gradient-to-r from-white via-purple-200 to-purple-400 bg-clip-text text-transparent">
              ONYX <span className="text-purple-400 font-light">LAB</span>
            </h1>
            <p className="text-xs text-purple-300/60 font-medium">Performance & Conditionnement</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden sm:inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-purple-950/60 border border-purple-500/30 text-purple-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Statut : Prêt pour la séance
          </span>
          <div className="w-9 h-9 rounded-full bg-purple-900/40 border border-purple-500/30 flex items-center justify-center text-purple-200 hover:border-purple-400 transition-colors">
            <User className="w-4 h-4" />
          </div>
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">

        {/* METRIQUES RAPIDES (Aperçu Style Zepp) */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-[#130d24]/80 border border-purple-500/20 rounded-2xl p-4 backdrop-blur-md">
            <div className="flex items-center justify-between text-purple-400 mb-2">
              <span className="text-xs font-medium text-purple-300/70">Forme / Charge</span>
              <HeartPulse className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-white">88 <span className="text-xs text-purple-400 font-normal">/100</span></div>
            <p className="text-[11px] text-emerald-400 font-medium mt-1">Récupération optimale</p>
          </div>

          <div className="bg-[#130d24]/80 border border-purple-500/20 rounded-2xl p-4 backdrop-blur-md">
            <div className="flex items-center justify-between text-purple-400 mb-2">
              <span className="text-xs font-medium text-purple-300/70">Intensité Semaine</span>
              <Flame className="w-4 h-4 text-fuchsia-400" />
            </div>
            <div className="text-2xl font-black text-white">74%</div>
            <p className="text-[11px] text-purple-300/70 font-medium mt-1">3 séances validées</p>
          </div>

          <div className="bg-[#130d24]/80 border border-purple-500/20 rounded-2xl p-4 backdrop-blur-md">
            <div className="flex items-center justify-between text-purple-400 mb-2">
              <span className="text-xs font-medium text-purple-300/70">Prochain Club</span>
              <Shield className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-lg font-bold text-white">Ce soir • 18:30</div>
            <p className="text-[11px] text-indigo-300 font-medium mt-1">JJB No-Gi / Grappling</p>
          </div>

          <div className="bg-[#130d24]/80 border border-purple-500/20 rounded-2xl p-4 backdrop-blur-md">
            <div className="flex items-center justify-between text-purple-400 mb-2">
              <span className="text-xs font-medium text-purple-300/70">Objectif 1RM</span>
              <Trophy className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-white">455 <span className="text-xs text-purple-400 font-normal">kg total</span></div>
            <p className="text-[11px] text-amber-300 font-medium mt-1">+17.5kg ce cycle</p>
          </div>
        </section>

        {/* CARTES EXPANDABLES PRINCIPALES (STYLE ZEPP HEALTH) */}
        <section className="grid md:grid-cols-2 gap-4 sm:gap-6">

          {/* CARTE 1 : PLANNING HORAIRE */}
          <div
            onClick={() => setActiveModal('planning')}
            className="group relative bg-gradient-to-br from-[#160f2e] to-[#110b22] border border-purple-500/20 hover:border-purple-500/50 rounded-3xl p-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(124,58,237,0.2)] cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-purple-600/20 text-purple-300 border border-purple-500/30">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white group-hover:text-purple-300 transition-colors">Planning du Jour</h3>
                  <p className="text-xs text-purple-300/60">Vue horaire & séances prévues</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-purple-400/60 group-hover:translate-x-1 transition-transform" />
            </div>

            <div className="space-y-3">
              {daySchedule.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-purple-950/30 border border-purple-500/10">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-purple-400" />
                    <div>
                      <div className="text-xs text-purple-300/70 font-mono">{item.time}</div>
                      <div className="text-sm font-semibold text-white">{item.title}</div>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.type === 'Club' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                    item.type === 'Musculation' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' :
                    'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {item.type}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-purple-900/30 flex justify-between items-center text-xs text-purple-400 font-medium">
              <span>Cliquer pour ouvrir le planning complet</span>
              <span className="underline">Détails →</span>
            </div>
          </div>

          {/* CARTE 2 : FOCUS DE LA SEMAINE (ONYX SEMAINE) */}
          <div
            onClick={() => setActiveModal('focus')}
            className="group relative bg-gradient-to-br from-[#160f2e] to-[#110b22] border border-purple-500/20 hover:border-purple-500/50 rounded-3xl p-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(124,58,237,0.2)] cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-fuchsia-600/20 text-fuchsia-300 border border-fuchsia-500/30">
                  <Target className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white group-hover:text-fuchsia-300 transition-colors">Focus Onyx Semaine</h3>
                  <p className="text-xs text-purple-300/60">Objectifs & priorités physiques</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-purple-400/60 group-hover:translate-x-1 transition-transform" />
            </div>

            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-900/30 to-fuchsia-900/20 border border-purple-500/20">
                <div className="text-xs text-purple-300 font-semibold uppercase tracking-wider mb-1">Thème athlétique</div>
                <div className="text-base font-bold text-white">Puissance Explosive & Grip No-Gi</div>
                <p className="text-xs text-purple-300/70 mt-1">Accent sur le tirage lourd et le conditionnement métabolique en Chipper.</p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/10 text-center">
                  <div className="text-[10px] text-purple-300/60">Volume Muscu</div>
                  <div className="text-sm font-bold text-purple-200">Haute Intensité</div>
                </div>
                <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/10 text-center">
                  <div className="text-[10px] text-purple-300/60">Séances Club</div>
                  <div className="text-sm font-bold text-fuchsia-300">3 Sessions</div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-purple-900/30 flex justify-between items-center text-xs text-purple-400 font-medium">
              <span>Voir la programmation de la semaine</span>
              <span className="underline">Détails →</span>
            </div>
          </div>

          {/* CARTE 3 : PERFORMANCES 1RM */}
          <div
            onClick={() => setActiveModal('1rm')}
            className="group relative bg-gradient-to-br from-[#160f2e] to-[#110b22] border border-purple-500/20 hover:border-purple-500/50 rounded-3xl p-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(124,58,237,0.2)] cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30">
                  <Dumbbell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white group-hover:text-indigo-300 transition-colors">Performances 1RM</h3>
                  <p className="text-xs text-purple-300/60">Suivi des charges maximales</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-purple-400/60 group-hover:translate-x-1 transition-transform" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {oneRepMaxes.slice(0, 4).map((item, idx) => (
                <div key={idx} className="p-3 rounded-2xl bg-purple-950/40 border border-purple-500/15">
                  <div className="text-xs text-purple-300/70 font-medium truncate">{item.exercise}</div>
                  <div className="text-xl font-black text-white mt-0.5">{item.weight} <span className="text-xs font-normal text-purple-400">{item.unit}</span></div>
                  <div className="text-[10px] text-emerald-400 font-semibold mt-1 flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> {item.delta}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-purple-900/30 flex justify-between items-center text-xs text-purple-400 font-medium">
              <span>Gérer et ajouter de nouveaux max</span>
              <span className="underline">Ouvrir le suivi →</span>
            </div>
          </div>

          {/* CARTE 4 : HISTORIQUE & SÉANCES */}
          <div
            onClick={() => setActiveModal('workouts')}
            className="group relative bg-gradient-to-br from-[#160f2e] to-[#110b22] border border-purple-500/20 hover:border-purple-500/50 rounded-3xl p-6 transition-all duration-300 hover:shadow-[0_0_30px_rgba(124,58,237,0.2)] cursor-pointer"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-violet-600/20 text-violet-300 border border-violet-500/30">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-white group-hover:text-violet-300 transition-colors">Dernières Séances</h3>
                  <p className="text-xs text-purple-300/60">Journal des entraînements & RPE</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-purple-400/60 group-hover:translate-x-1 transition-transform" />
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/10 flex justify-between items-center">
                <div>
                  <div className="text-xs text-purple-400 font-semibold">Hier • Musculation</div>
                  <div className="text-sm font-bold text-white">Upper Body & Grips</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-purple-300">RPE 8.5/10</div>
                  <div className="text-[10px] text-purple-300/60">55 min</div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/10 flex justify-between items-center">
                <div>
                  <div className="text-xs text-indigo-400 font-semibold">Lundi • Club No-Gi</div>
                  <div className="text-sm font-bold text-white">Sparring Spécifique Guard Passing</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-bold text-indigo-300">RPE 9/10</div>
                  <div className="text-[10px] text-purple-300/60">1h30</div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-purple-900/30 flex justify-between items-center text-xs text-purple-400 font-medium">
              <span>Voir l'historique complet & vocal</span>
              <span className="underline">Détails →</span>
            </div>
          </div>

        </section>
      </main>

      {/* ========================================================================= */}
      {/* MODALES DÉTAILLÉES PLEINE PAGE (STYLE ZEPP HEALTH) */}
      {/* ========================================================================= */}

      {/* 1. MODAL PLANNING HORAIRE */}
      {activeModal === 'planning' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#120a24] border border-purple-500/30 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-[0_0_50px_rgba(124,58,237,0.3)]">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <Calendar className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-bold text-white">Planning Détail & Timeline</h2>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 rounded-full bg-purple-900/30 text-purple-300 hover:bg-purple-800/40">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-purple-300/70">
                Organise ta journée d'entraînement. Alterne judicieusement entre tes séances de renforcement, tes cours de club No-Gi / MMA et tes phases de récupération active.
              </p>

              <div className="relative border-l-2 border-purple-500/30 ml-4 pl-6 space-y-6 my-6">
                {daySchedule.map((item, idx) => (
                  <div key={idx} className="relative">
                    <span className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-purple-600 ring-4 ring-[#120a24]" />
                    <div className="bg-purple-950/40 border border-purple-500/20 rounded-2xl p-4">
                      <div className="text-xs font-mono text-purple-400 mb-1">{item.time}</div>
                      <h4 className="text-base font-bold text-white">{item.title}</h4>
                      <p className="text-xs text-purple-300/70 mt-1">Intensité ciblée : Élevée • Prévoir hydratation & électrolytes.</p>
                    </div>
                  </div>
                ))}
              </div>

              <button className="w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                <Plus className="w-4 h-4" /> Ajouter un créneau horaire
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MODAL FOCUS SEMAINE */}
      {activeModal === 'focus' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#120a24] border border-fuchsia-500/30 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-[0_0_50px_rgba(217,70,239,0.25)]">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <Target className="w-6 h-6 text-fuchsia-400" />
                <h2 className="text-xl font-bold text-white">Focus Onyx Semaine</h2>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 rounded-full bg-purple-900/30 text-purple-300 hover:bg-purple-800/40">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="bg-gradient-to-br from-fuchsia-950/40 to-purple-950/40 border border-fuchsia-500/30 rounded-2xl p-5">
                <h3 className="text-lg font-bold text-white mb-2">Objectif Prioritaire</h3>
                <p className="text-sm text-purple-200/80 leading-relaxed">
                  Cette semaine, l'accent est mis sur le développement de la force explosive au tirage pour maximiser le contrôle en Wrestling/Grappling et prévenir la fatigue du grip.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-bold text-purple-300 uppercase tracking-wider">Priorités de la semaine</h4>
                <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/20 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm text-white">3 séances de club (Grappling / No-Gi)</span>
                </div>
                <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/20 flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-sm text-white">2 blocs de renforcement musculaire lourds (1RM)</span>
                </div>
                <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/20 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-purple-400" />
                  <span className="text-sm text-purple-300">1 session complète de mobilité de hanche & récupération</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. MODAL PERFORMANCES 1RM */}
      {activeModal === '1rm' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#120a24] border border-indigo-500/30 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-[0_0_50px_rgba(99,102,241,0.25)]">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <Dumbbell className="w-6 h-6 text-indigo-400" />
                <h2 className="text-xl font-bold text-white">Suivi des Charges Maximales (1RM)</h2>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 rounded-full bg-purple-900/30 text-purple-300 hover:bg-purple-800/40">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid gap-3">
                {oneRepMaxes.map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/20 flex items-center justify-between">
                    <div>
                      <div className="text-base font-bold text-white">{item.exercise}</div>
                      <div className="text-xs text-emerald-400 mt-0.5">{item.delta}</div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-black text-white">{item.weight}</span>
                      <span className="text-xs text-purple-400 font-bold ml-1">{item.unit}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 space-y-3">
                <h4 className="text-sm font-bold text-white">Mettre à jour un Max</h4>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Exercice (ex: Squat)"
                    className="bg-purple-950/60 border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-400"
                  />
                  <input
                    type="number"
                    placeholder="Charge (kg)"
                    className="bg-purple-950/60 border border-purple-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder-purple-400/50 focus:outline-none focus:border-purple-400"
                  />
                </div>
                <button className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-colors">
                  Enregistrer la performance
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL HISTORIQUE SÉANCES */}
      {activeModal === 'workouts' && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
          <div className="bg-[#120a24] border border-violet-500/30 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 shadow-[0_0_50px_rgba(139,92,246,0.25)]">
            <div className="flex items-center justify-between border-b border-purple-900/40 pb-4 mb-6">
              <div className="flex items-center gap-3">
                <Activity className="w-6 h-6 text-violet-400" />
                <h2 className="text-xl font-bold text-white">Journal des Séances</h2>
              </div>
              <button onClick={() => setActiveModal(null)} className="p-2 rounded-full bg-purple-900/30 text-purple-300 hover:bg-purple-800/40">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-500/20">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-xs text-purple-400 font-bold">15 Septembre 2026</span>
                    <h3 className="text-base font-bold text-white">Upper Body & Grip Conditioning</h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
                    RPE 8.5
                  </span>
                </div>
                <p className="text-xs text-purple-200/80 leading-relaxed mb-3">
                  Excellente séance. Tractions lestées à +35kg validées sur 4 séries de 3 reps. Bonnes sensations sur le tirage horizontal.
                </p>
                <div className="text-[11px] text-purple-400 font-mono">
                  Exercices : Tractions Lestées (4x3), Row Halère (3x8), Wrist Curls (3x15)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
