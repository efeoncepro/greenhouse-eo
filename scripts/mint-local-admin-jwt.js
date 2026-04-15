const loadNextAuthSecret = async () => {
  if (process.env.NEXTAUTH_SECRET) {
    return
  }

  const [{ readFile }, { join }] = await Promise.all([import('node:fs/promises'), import('node:path')])

  for (const fileName of ['.env.local', '.env.production.local']) {
    try {
      const content = await readFile(join(process.cwd(), fileName), 'utf8')

      for (const line of content.split(/\r?\n/)) {
        if (!line || line.trim().startsWith('#')) {
          continue
        }

        const [rawKey, ...rest] = line.split('=')
        const key = rawKey?.trim()

        if (key !== 'NEXTAUTH_SECRET') {
          continue
        }

        const rawValue = rest.join('=').trim()

        process.env.NEXTAUTH_SECRET =
          rawValue.startsWith('"') && rawValue.endsWith('"') ? rawValue.slice(1, -1) : rawValue

        return
      }
    } catch {
      // Try the next env file candidate.
    }
  }
}

;(async () => {
  await loadNextAuthSecret()

  const { encode } = await import('next-auth/jwt')

  const token = await encode({
    secret: process.env.NEXTAUTH_SECRET,
    token: {
      sub: 'user-efeonce-admin-julio-reyes',
      userId: 'user-efeonce-admin-julio-reyes',
      email: 'julio.reyes@efeonce.org',
      name: 'Julio Reyes',
      clientId: '',
      clientName: 'Efeonce Internal',
      tenantType: 'efeonce_internal',
      roleCodes: ['efeonce_admin'],
      primaryRoleCode: 'efeonce_admin',
      routeGroups: ['internal', 'admin'],
      projectScopes: [],
      campaignScopes: [],
      businessLines: [],
      serviceModules: [],
      projectIds: [],
      role: 'efeonce_admin',
      featureFlags: [],
      timezone: 'America/Santiago',
      portalHomePath: '/home',
      authMode: 'both',
      provider: 'credentials',
      microsoftEmail: 'julio.reyes@efeonce.org'
    },
    maxAge: 3600
  })

  process.stdout.write(token)
})().catch(error => {
  console.error(error)
  process.exit(1)
})
