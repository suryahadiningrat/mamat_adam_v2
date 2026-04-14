import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/ThemeProvider'
import { Providers } from '@/components/Providers'
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
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>
          <ThemeProvider attribute="data-theme" defaultTheme="dark" enableSystem={false}>
            {children}
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  )
}
