'use client'

/**
 * Global Error Boundary — catches errors that occur outside the root layout.
 * This is the last line of defense. It must render its own <html> and <body>
 * since the root layout may not have rendered.
 *
 * Primary use case: chunk load errors from stale deployments.
 */

import { useEffect } from 'react'

import { isChunkLoadError, attemptChunkRecovery } from '@/lib/chunk-error'

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (isChunkLoadError(error)) {
      const recovered = attemptChunkRecovery()

      if (recovered) return // Page is reloading
    }

    // Log non-chunk errors for observability
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <html lang='es'>
      <body
        style={{
          margin: 0,
          fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
          backgroundColor: '#f5f5f9',
          color: '#3a3541'
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 480, padding: 32 }}>
          <div
            style={{
              width: 64,
              height: 64,
              margin: '0 auto 24px',
              borderRadius: 12,
              backgroundColor: '#7367f01a',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28
            }}
          >
            &#x26A0;
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 600 }}>
            Hay una nueva version disponible
          </h2>
          <p style={{ margin: '0 0 24px', fontSize: 14, color: '#8692a6', lineHeight: 1.6 }}>
            Se ha desplegado una actualizacion del portal. Recarga la pagina para obtener la ultima version.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 500,
              color: '#fff',
              backgroundColor: '#7367f0',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              marginRight: 8
            }}
          >
            Recargar pagina
          </button>
          <button
            onClick={() => reset()}
            style={{
              padding: '10px 24px',
              fontSize: 14,
              fontWeight: 500,
              color: '#7367f0',
              backgroundColor: 'transparent',
              border: '1px solid #7367f0',
              borderRadius: 8,
              cursor: 'pointer'
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}
