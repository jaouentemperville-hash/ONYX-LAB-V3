import './globals.css'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
  title: 'Coach IA — Athlétisation, MMA & No-Gi',
  description: 'Coaching sportif intelligent piloté par IA — programmes du jour, RPA vocal, analyse vidéo',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Coach IA',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#ef4444',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className="dark">
      <body className="min-h-screen bg-neutral-950 text-neutral-50 antialiased">
        {children}
        <Toaster theme="dark" position="top-center" richColors />
      </body>
    </html>
  )
}
