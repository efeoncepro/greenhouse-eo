/**
 * TASK-2066/2067: the bearer travels only in the canonical Rooms fragment.
 * Reject normalized equivalents too: no query (even bare ?), credentials, alternate paths or escaping.
 * The caller separately validates whether a configured HTTP loopback origin is allowed for local use.
 */
export function isCanonicalRoomsInvitationUrl(value: string, roomsOrigin: string): boolean {
  try {
    const origin = new URL(roomsOrigin)
    const url = new URL(value)

    return origin.origin === roomsOrigin && url.origin === roomsOrigin &&
      url.pathname === '/invite' && url.search === '' && !url.username && !url.password &&
      /^#token=[A-Za-z0-9_-]{43}$/.test(url.hash) && value === `${roomsOrigin}/invite${url.hash}`
  } catch { return false }
}
