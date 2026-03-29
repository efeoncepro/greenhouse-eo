import type { NextConfig } from 'next'
import { withSentryConfig } from '@sentry/nextjs'

const sourcemapsReady =
  Boolean(process.env.SENTRY_AUTH_TOKEN?.trim()) &&
  Boolean(process.env.SENTRY_ORG?.trim()) &&
  Boolean(process.env.SENTRY_PROJECT?.trim())

const nextConfig: NextConfig = {
  basePath: process.env.BASEPATH,
  distDir: process.env.NEXT_DIST_DIR || '.next',
  redirects: async () => {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: true,
        locale: false
      }
    ]
  }
}

export default withSentryConfig(nextConfig, {
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: true,
  telemetry: false,
  sourcemaps: {
    disable: !sourcemapsReady
  }
})
