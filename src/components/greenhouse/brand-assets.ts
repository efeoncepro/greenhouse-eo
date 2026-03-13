'use client'

export type BrandAssetEntry = {
  label: string
  wordmarkSrc?: string
  negativeWordmarkSrc?: string
  markSrc?: string
  negativeMarkSrc?: string
}

const normalizeBrand = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

const brandAssetRegistry: Record<string, BrandAssetEntry> = {
  globe: {
    label: 'Globe',
    wordmarkSrc: '/branding/SVG/globe-full.svg',
    negativeWordmarkSrc: '/branding/SVG/globe-negativo.svg',
    markSrc: '/branding/SVG/isotipo-goble-full.svg',
    negativeMarkSrc: '/branding/SVG/isotipo-globe-negativo.svg'
  },
  reach: {
    label: 'Reach',
    wordmarkSrc: '/branding/SVG/reach-full.svg',
    negativeWordmarkSrc: '/branding/SVG/reach-negativo.svg',
    markSrc: '/branding/SVG/isotipo-reach-full.svg',
    negativeMarkSrc: '/branding/SVG/isotipo-reach-negativo.svg'
  },
  wave: {
    label: 'Wave',
    wordmarkSrc: '/branding/SVG/wave-full.svg',
    negativeWordmarkSrc: '/branding/SVG/wave-negativo.svg',
    markSrc: '/branding/SVG/isotipo-wave.svg',
    negativeMarkSrc: '/branding/SVG/isotipo-negativo-wave.svg'
  },
  efeonce: {
    label: 'Efeonce',
    wordmarkSrc: '/branding/logo-full.svg',
    negativeWordmarkSrc: '/branding/logo-negative.svg',
    markSrc: '/branding/SVG/isotipo-full-efeonce.svg',
    negativeMarkSrc: '/branding/SVG/isotipo-efeonce-negativo.svg'
  },
  'efeonce digital': {
    label: 'Efeonce',
    wordmarkSrc: '/branding/logo-full.svg',
    negativeWordmarkSrc: '/branding/logo-negative.svg',
    markSrc: '/branding/SVG/isotipo-full-efeonce.svg',
    negativeMarkSrc: '/branding/SVG/isotipo-efeonce-negativo.svg'
  },
  efeonce_digital: {
    label: 'Efeonce',
    wordmarkSrc: '/branding/logo-full.svg',
    negativeWordmarkSrc: '/branding/logo-negative.svg',
    markSrc: '/branding/SVG/isotipo-full-efeonce.svg',
    negativeMarkSrc: '/branding/SVG/isotipo-efeonce-negativo.svg'
  }
}

export const resolveBrandAssets = (brand: string) => {
  const normalizedBrand = normalizeBrand(brand)

  if (brandAssetRegistry[normalizedBrand]) {
    return brandAssetRegistry[normalizedBrand]
  }

  return Object.entries(brandAssetRegistry).find(([key]) => normalizedBrand.includes(key))?.[1] || null
}

export const getBrandDisplayLabel = (brand: string) => resolveBrandAssets(brand)?.label || brand
