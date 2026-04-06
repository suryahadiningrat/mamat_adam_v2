'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, ArrowLeft, Loader2, Sparkles, CheckCircle2, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('') // Just for UI completeness
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/`
        }
      })

      if (error) throw error

      // If email confirmation is disabled in Supabase, the user is auto-confirmed
      // and has an active session — redirect straight to the dashboard
      if (data.session) {
        router.push('/')
        return
      }

      // Otherwise show "check your email" screen
      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign up.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      position: 'relative'
    }}>
      {/* Background glowing effects */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px',
        height: '600px',
        background: 'radial-gradient(circle, var(--accent-glow) 0%, transparent 60%)',
        filter: 'blur(60px)',
        zIndex: -1,
        pointerEvents: 'none'
      }} />

      <div className="panel fade-up" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '32px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        border: '1px solid var(--border-accent)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Subtle top border highlight */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, var(--accent), transparent)', opacity: 0.6 }} />

        {success ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'var(--green-bg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid rgba(34, 211, 160, 0.2)'
              }}>
                <Mail size={32} style={{ color: 'var(--green)' }} />
              </div>
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: '12px' }}>
              Check your email
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '8px' }}>
              We've sent a verification link to <strong style={{ color: 'var(--text-primary)' }}>{email}</strong>.
            </p>
            <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', lineHeight: 1.5, marginBottom: '24px' }}>
              Click the link in the email to verify your account. Check your spam folder if you don't see it within a few minutes.
            </p>
            <button
              onClick={() => router.push('/login')}
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center', padding: '10px' }}
            >
              Return to login
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '32px' }}>
              <div className="logo-mark" style={{ width: '48px', height: '48px', fontSize: '24px', borderRadius: '14px', marginBottom: '16px' }}>
                F
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', fontWeight: 700, letterSpacing: '-0.5px', marginBottom: '6px' }}>
                Create your account
              </h1>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                Start supercharging your brand's content today
              </p>
            </div>

            {error && (
              <div style={{
                background: 'var(--red-bg)',
                border: '1px solid rgba(244,63,94,0.2)',
                color: 'var(--red)',
                padding: '12px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Full name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  required
                  style={{
                    width: '100%',
                    background: 'var(--surface-3)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                    outline: 'none',
                    transition: 'border-color 0.15s, background 0.15s'
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-accent)'; e.currentTarget.style.background = 'var(--surface-4)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface-3)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  required
                  style={{
                    width: '100%',
                    background: 'var(--surface-3)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                    outline: 'none',
                    transition: 'border-color 0.15s, background 0.15s'
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-accent)'; e.currentTarget.style.background = 'var(--surface-4)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface-3)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a strong password"
                  required
                  minLength={8}
                  style={{
                    width: '100%',
                    background: 'var(--surface-3)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-body)',
                    outline: 'none',
                    transition: 'border-color 0.15s, background 0.15s'
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-accent)'; e.currentTarget.style.background = 'var(--surface-4)' }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface-3)' }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '12px',
                  marginTop: '8px',
                  fontSize: '14px',
                  opacity: loading ? 0.7 : 1,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {loading ? 'Creating account...' : 'Create workspace account'}
              </button>
            </form>

            <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '13px', color: 'var(--text-tertiary)' }}>
              Already have an account?{' '}
              <a href="/login" style={{ color: 'var(--accent)', fontWeight: 500, textDecoration: 'none' }}>
                <ArrowLeft size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> Sign in
              </a>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
