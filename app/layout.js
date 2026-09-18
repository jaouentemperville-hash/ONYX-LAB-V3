import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from './providers'

export const metadata = {
  title: 'ONYX 🧬 — Coach IA Athlétisation, MMA & No-Gi',
  description: 'ONYX · Coaching sportif intelligent piloté par IA — programmes du jour, RPA vocal, analyse vidéo, nutrition photo',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ONYX',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#8b5cf6',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr" className="dark">
      <body className="min-h-screen bg-neutral-950 text-neutral-50 antialiased">
        <Providers>
          {children}
          <Toaster theme="dark" position="top-center" richColors />
        </Providers>
      </body>
    </html>
  )
}
