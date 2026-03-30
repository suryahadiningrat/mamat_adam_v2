import type { Metadata } from 'next'
import './globals.css'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'

export const metadata: Metadata = {
  title: 'FCE — Floothink Content Engine',
  description: 'AI-powered brand content operating system',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <Sidebar />
          <Topbar />
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
