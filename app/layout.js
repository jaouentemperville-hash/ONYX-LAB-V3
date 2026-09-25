import './globals.css'
import { Toaster } from '@/components/ui/sonner'
import { Providers } from './providers'

export const metadata = {
  title: 'ONYX 🧬 — Coach IA Athlétisation, MMA & No-Gi',
  description: 'ONYX · Coaching sportif intelligent piloté par IA — programmes du jour, plan hebdo, force, nutrition',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
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
    <html lang="fr">
      <body className="onyx-body min-h-screen antialiased">
        <Providers>
          {children}
          <Toaster theme="light" position="top-center" richColors />
        </Providers>
      </body>
    </html>
  )
}
