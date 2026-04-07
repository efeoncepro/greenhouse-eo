'use client'

/**
 * Clears the chunk error retry flag on successful page load.
 * Renders nothing — mount this once in the authenticated layout.
 */

import { useEffect } from 'react'

import { clearChunkRetryFlag } from '@/lib/chunk-error'

const ChunkRecoveryClear = () => {
  useEffect(() => {
    clearChunkRetryFlag()
  }, [])

  return null
}

export default ChunkRecoveryClear
