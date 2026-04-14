'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import { WorkspaceProvider } from '@/contexts/WorkspaceContext'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    }
  }, [status, router])

  if (status === 'loading') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="logo-mark fade-up" style={{ width: 48, height: 48, fontSize: 24, borderRadius: 14 }}>F</div>
      </div>
    )
  }

  if (status === 'authenticated') {
    return (
      <WorkspaceProvider>
        <div className="app-shell">
          <Sidebar />
          <Topbar />
          <main className="main-content">
            {children}
          </main>
        </div>
      </WorkspaceProvider>
    )
  }

  return null
}
