import { describe, expect, it } from 'vitest'

import { isCanonicalRoomsInvitationUrl } from './invitation-url'

const origin = 'https://rooms.example.test'
const token = 'aB_9-'.repeat(8) + 'xY0'
const valid = `${origin}/invite#token=${token}`

describe('canonical Rooms invitation URL', () => {
  it('allows exactly the configured origin, /invite and a 43-character token fragment', () => {
    expect(isCanonicalRoomsInvitationUrl(valid, origin)).toBe(true)
    expect(isCanonicalRoomsInvitationUrl(`http://127.0.0.1:3020/invite#token=${token}`, 'http://127.0.0.1:3020')).toBe(true)
  })
  it.each([
    `${origin}/invite`, `${origin}/invite#token=`, `${origin}/invite#token=${token.slice(1)}`,
    `${valid}a`, `${valid}&x=1`, `${origin}/invite#code=${token}`, `${origin}/invite#token=${'a'.repeat(42)}%`,
    `${origin}/invite#token=${'a'.repeat(42)}=`, `${origin}/invite?token=${token}`,
    `${origin}/invite?source=email#token=${token}`, `${origin}/invite?#token=${token}`,
    `${origin}/invite/#token=${token}`, `${origin}/other#token=${token}`, `${origin}/i/../invite#token=${token}`,
    `${origin}/%69nvite#token=${token}`, `https://elsewhere.test/invite#token=${token}`,
    `https://rooms.example.test.evil.test/invite#token=${token}`, `http://rooms.example.test/invite#token=${token}`,
    `https://user:password@rooms.example.test/invite#token=${token}`, `https://@rooms.example.test/invite#token=${token}`,
    `${origin}:443/invite#token=${token}`, ` ${valid}`, `${valid}\n`, `${origin}/in\tvite#token=${token}`,
    `https://rooms.example.test\\invite#token=${token}`, `/invite#token=${token}`
  ])('rejects alternate or ambiguous URL %s', value => {
    expect(isCanonicalRoomsInvitationUrl(value, origin)).toBe(false)
  })
})
