'use client'

import { useEffect } from 'react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div style={{ padding: 40, fontFamily: 'system-ui, sans-serif' }}>
      <h2>Something went wrong!</h2>
      <p style={{ color: 'red' }}>{error.message}</p>
      <button
        onClick={() => reset()}
        style={{ padding: '8px 16px', background: '#333', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer' }}
      >
        Try again
      </button>
    </div>
  )
}