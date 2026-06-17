import type {
  PublicSiteAstroRouteOwnershipRow,
  PublicSiteAstroStaticBinding
} from '@/lib/public-site/astro/binding-types'

export const PUBLIC_SITE_ASTRO_BINDING_MANIFEST_PATH =
  'docs/operations/public-site-astro-runtime-binding-20260616.json'

export const PUBLIC_SITE_ASTRO_ROUTE_OWNERSHIP_MATRIX_PATH =
  'docs/operations/public-site-route-ownership-matrix-20260616.md'

export const PUBLIC_SITE_ASTRO_STATIC_BINDING: PublicSiteAstroStaticBinding = {
  canonicalUrl: 'https://efeoncepro.com',
  primarySeoSurface: 'https://efeoncepro.com',
  currentProductionRuntime: 'wordpress-kinsta',
  targetFrontendRuntime: 'astro-vercel',
  cmsOriginTarget: 'https://cms.efeoncepro.com',
  isCurrentLiveSourceOfTruth: false,
  isTargetFrontendRail: true,
  repository: {
    provider: 'github',
    owner: 'efeoncepro',
    name: 'efeonce-web',
    url: 'https://github.com/efeoncepro/efeonce-web',
    defaultBranch: 'main',
    trackedBranches: ['main', 'develop']
  },
  vercel: {
    teamSlug: 'efeonce-7670142f',
    teamId: 'team_gmNiF4YCHmc1wqsHUTCvqjmN',
    projectName: 'efeonce-web',
    projectId: 'prj_i52CnPvaoNB0Lweqk7L7cLimv7W9'
  },
  sourceManifest: PUBLIC_SITE_ASTRO_BINDING_MANIFEST_PATH
}

export const PUBLIC_SITE_ASTRO_ROUTE_OWNERSHIP: PublicSiteAstroRouteOwnershipRow[] = [
  {
    route: '/',
    currentOwner: 'WordPress/Kinsta',
    targetOwner: 'Astro/Vercel',
    transitionPosture: 'Cut over only with core-page parity',
    rule: 'No placeholder/scaffold; canonical apex only'
  },
  {
    route: '/servicio-* and /servicios-*',
    currentOwner: 'WordPress/Elementor',
    targetOwner: 'Astro/Vercel',
    transitionPosture: 'First coded landing pilot after SEO foundation',
    rule: 'Same-domain only; no indexable subdomain'
  },
  {
    route: 'Business cases / campaign pages',
    currentOwner: 'WordPress/Elementor or absent',
    targetOwner: 'Astro/Vercel',
    transitionPosture: 'New pages start as Vercel previews, noindex until approved',
    rule: 'HubSpot attribution and canonical required'
  },
  {
    route: '/blog',
    currentOwner: 'WordPress/Kinsta',
    targetOwner: 'Astro/Vercel rendering WordPress content',
    transitionPosture: 'Do not cut over until blog listing/card/meta parity exists',
    rule: 'Sitemap/canonical must not duplicate WordPress-rendered listing'
  },
  {
    route: 'Blog posts',
    currentOwner: 'WordPress Gutenberg content',
    targetOwner: 'Astro/Vercel rendering WordPress content',
    transitionPosture: 'Headless render preferred; proxy only temporary and gated',
    rule: 'Preserve Yoast/meta/schema or deliberate replacement'
  },
  {
    route: '/wp-admin/* and /wp-login.php',
    currentOwner: 'WordPress/Kinsta',
    targetOwner: 'cms.efeoncepro.com',
    transitionPosture: 'Keep admin off public Astro runtime',
    rule: 'Never proxy admin through public Astro unless explicitly security-reviewed'
  },
  {
    route: '/wp-json/*',
    currentOwner: 'WordPress/Kinsta',
    targetOwner: 'cms.efeoncepro.com/wp-json or internal origin',
    transitionPosture: 'Consumers use CMS/origin host',
    rule: 'Public frontend should not expose API as content surface'
  },
  {
    route: 'sitemap.xml / robots.txt / redirects',
    currentOwner: 'WordPress/Yoast',
    targetOwner: 'Astro/Vercel',
    transitionPosture: 'Astro owns after apex cutover',
    rule: 'Include only canonical production URLs; exclude previews/demo routes'
  }
]
