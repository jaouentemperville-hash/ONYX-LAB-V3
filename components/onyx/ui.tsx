'use client'

import React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Home, CalendarDays, Dumbbell, Salad, User, ChevronLeft, Loader2 } from 'lucide-react'

// ============================================================
// AppShell : fond violet lumineux + halos + barre de navigation
// ============================================================
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen text-slate-800 pb-28 overflow-x-hidden">
      {/* halos décoratifs */}
      <div className="pointer-events-none fixed -top-32 -left-24 w-[420px] h-[420px] rounded-full bg-violet-300/40 blur-[120px] -z-10" />
      <div className="pointer-events-none fixed top-10 right-[-120px] w-[380px] h-[380px] rounded-full bg-fuchsia-300/30 blur-[120px] -z-10" />
      <div className="pointer-events-none fixed bottom-0 left-1/3 w-[500px] h-[300px] rounded-full bg-indigo-300/30 blur-[120px] -z-10" />
      {children}
      <BottomNav />
    </div>
  )
}

const NAV = [
  { href: '/', label: 'Accueil', icon: Home, match: (p: string) => p === '/' },
  { href: '/programme/semaine', label: 'Programme', icon: CalendarDays, match: (p: string) => p.startsWith('/programme') },
  { href: '/force', label: 'Force', icon: Dumbbell, match: (p: string) => p.startsWith('/force') },
  { href: '/nutrition', label: 'Nutrition', icon: Salad, match: (p: string) => p.startsWith('/nutrition') },
  { href: '/profil', label: 'Profil', icon: User, match: (p: string) => p.startsWith('/profil') },
]

export function BottomNav() {
  const router = useRouter()
  const pathname = usePathname() || '/'
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 px-3 pb-3 pt-2">
      <div className="max-w-md mx-auto flex items-center justify-between bg-white/80 backdrop-blur-xl border border-violet-100 rounded-[26px] px-2 py-1.5 shadow-[0_10px_40px_rgba(139,92,246,0.25)]">
        {NAV.map((n) => {
          const active = n.match(pathname)
          const Icon = n.icon
          return (
            <button
              key={n.href}
              onClick={() => router.push(n.href)}
              className={`flex flex-col items-center gap-0.5 rounded-2xl px-3 py-2 transition-all ${active ? 'bg-gradient-to-tr from-violet-600 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30' : 'text-violet-400 hover:text-violet-600'}`}
            >
              <Icon className="w-[18px] h-[18px]" />
              <span className="text-[9px] font-semibold tracking-wide">{n.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// ============================================================
// Cartes & primitives
// ============================================================
export function GlassCard({
  children, className = '', onClick, interactive = false,
}: { children: React.ReactNode; className?: string; onClick?: () => void; interactive?: boolean }) {
  return (
    <div
      onClick={onClick}
      className={`bg-white/75 backdrop-blur-xl border border-violet-100 rounded-3xl shadow-[0_8px_30px_rgba(139,92,246,0.10)] ${interactive ? 'cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_40px_rgba(139,92,246,0.20)] active:translate-y-0' : ''} ${className}`}
    >
      {children}
    </div>
  )
}

export function BackBar({ title, subtitle }: { title: string; subtitle?: string }) {
  const router = useRouter()
  return (
    <header className="sticky top-0 z-30 bg-white/70 backdrop-blur-xl border-b border-violet-100 px-4 py-3 flex items-center gap-3">
      <button
        onClick={() => router.back()}
        className="w-9 h-9 rounded-full bg-violet-50 border border-violet-200 flex items-center justify-center text-violet-600 hover:bg-violet-100 transition-colors"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <div>
        <h1 className="text-base font-extrabold text-slate-800 leading-tight">{title}</h1>
        {subtitle && <p className="text-[11px] text-violet-500 font-medium">{subtitle}</p>}
      </div>
    </header>
  )
}

export function FullLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center text-violet-500">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  )
}

export function Pill({ children, tone = 'violet' }: { children: React.ReactNode; tone?: 'violet' | 'green' | 'amber' | 'indigo' | 'fuchsia' }) {
  const tones: Record<string, string> = {
    violet: 'bg-violet-100 text-violet-700 border-violet-200',
    green: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    amber: 'bg-amber-100 text-amber-700 border-amber-200',
    indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    fuchsia: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
  }
  return <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${tones[tone]}`}>{children}</span>
}

// Jauge circulaire (violet lumineux)
export function Ring({
  value, max, size = 120, stroke = 11, from = '#8B5CF6', to = '#D946EF', unit = '', label,
}: { value: number; max: number; size?: number; stroke?: number; from?: string; to?: string; unit?: string; label?: string }) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(Math.max(value / max, 0), 1)
  const offset = circumference * (1 - pct)
  const gradId = `g-${Math.round(from.length + to.length + size + max)}-${label || ''}`.replace(/[^a-zA-Z0-9-]/g, '')
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#EDE7FE" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={`url(#${gradId})`} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-black text-slate-800">{value}{unit}</span>
        {label && <span className="text-[9px] font-bold text-violet-400 uppercase tracking-widest mt-0.5">{label}</span>}
      </div>
    </div>
  )
}

// Champs de formulaire (light)
const inputCls = 'w-full bg-violet-50/60 border border-violet-200 rounded-xl px-3 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-200 transition'

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-violet-500 mb-1 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  )
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className || ''}`} />
}
export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${inputCls} ${props.className || ''}`} />
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${inputCls} ${props.className || ''}`}>{props.children}</select>
}

export function PrimaryButton({ children, className = '', ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button {...rest} className={`inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 text-white font-semibold text-sm px-4 py-2.5 shadow-lg shadow-violet-500/25 disabled:opacity-50 transition active:scale-[0.98] ${className}`}>
      {children}
    </button>
  )
}

// Mini line chart SVG (progression 1RM)
export function LineChart({ points, from = '#8B5CF6', to = '#D946EF', height = 90 }: { points: number[]; from?: string; to?: string; height?: number }) {
  if (!points || points.length === 0) return null
  const w = 300
  const h = height
  const pad = 8
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const step = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0
  const coords = points.map((p, i) => {
    const x = pad + i * step
    const y = h - pad - ((p - min) / range) * (h - pad * 2)
    return [x, y]
  })
  const path = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c[0].toFixed(1)} ${c[1].toFixed(1)}`).join(' ')
  const area = `${path} L ${coords[coords.length - 1][0].toFixed(1)} ${h - pad} L ${coords[0][0].toFixed(1)} ${h - pad} Z`
  const gid = `lc-${points.length}-${Math.round(max)}`
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none" style={{ height }}>
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={from} />
          <stop offset="100%" stopColor={to} />
        </linearGradient>
        <linearGradient id={`${gid}-a`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={from} stopOpacity="0.25" />
          <stop offset="100%" stopColor={to} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gid}-a)`} />
      <path d={path} fill="none" stroke={`url(#${gid})`} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {coords.map((c, i) => (
        <circle key={i} cx={c[0]} cy={c[1]} r={3} fill="#fff" stroke={to} strokeWidth={2} />
      ))}
    </svg>
  )
}
