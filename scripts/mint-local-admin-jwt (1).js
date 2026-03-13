const { encode } = require('next-auth/jwt')

;(async () => {
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
      portalHomePath: '/internal/dashboard',
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
