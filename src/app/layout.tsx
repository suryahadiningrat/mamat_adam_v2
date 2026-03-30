import type { Metadata } from 'next'
import './globals.css'

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
        {children}
      </body>
    </html>
  )
}
