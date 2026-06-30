import { describe, expect, it } from 'vitest'

import { EMBED_KEY_ID_PREFIX, EMBED_KEY_SECRET_PREFIX, hashEmbedKeySecret, mintEmbedKey, verifyEmbedKeySecret } from '../embed-key'

describe('embed-key (credencial per-site TASK-1258)', () => {
  it('mintea secreto + id con prefijos y hash verificable', () => {
    const minted = mintEmbedKey()

    expect(minted.secret.startsWith(EMBED_KEY_SECRET_PREFIX)).toBe(true)
    expect(minted.embedKeyId.startsWith(EMBED_KEY_ID_PREFIX)).toBe(true)
    expect(minted.embedKeyHash).toBe(hashEmbedKeySecret(minted.secret))
    expect(verifyEmbedKeySecret(minted.secret, minted.embedKeyHash)).toBe(true)
  })

  it('cada mint es único (alta entropía)', () => {
    const a = mintEmbedKey()
    const b = mintEmbedKey()

    expect(a.secret).not.toBe(b.secret)
    expect(a.embedKeyHash).not.toBe(b.embedKeyHash)
    expect(verifyEmbedKeySecret(a.secret, b.embedKeyHash)).toBe(false)
  })

  it('verify es fail-closed: secreto equivocado, prefijo equivocado, o faltantes ⇒ false', () => {
    const minted = mintEmbedKey()

    expect(verifyEmbedKeySecret('ghek_otro-secreto', minted.embedKeyHash)).toBe(false)
    expect(verifyEmbedKeySecret('sin-prefijo', minted.embedKeyHash)).toBe(false)
    expect(verifyEmbedKeySecret(null, minted.embedKeyHash)).toBe(false)
    expect(verifyEmbedKeySecret(minted.secret, null)).toBe(false)
    expect(verifyEmbedKeySecret('', '')).toBe(false)
  })
})
