import { GH_MESSAGES, GH_COLORS } from '@/config/greenhouse-nomenclature'

export interface ValueCardData {
  icon: 'visibility' | 'data' | 'improvement'
  iconBg: string
  iconColor: string
  title: string
  subtitle: string
}

export const LOGIN_VALUE_CARDS: ValueCardData[] = [
  {
    icon: 'visibility',
    iconBg: 'rgba(27,122,78, 0.25)',
    iconColor: GH_COLORS.brand.leaf,
    title: GH_MESSAGES.login_vp_1_title,
    subtitle: GH_MESSAGES.login_vp_1_subtitle
  },
  {
    icon: 'data',
    iconBg: 'rgba(3,117,219, 0.25)',
    iconColor: GH_COLORS.brand.softBlue,
    title: GH_MESSAGES.login_vp_2_title,
    subtitle: GH_MESSAGES.login_vp_2_subtitle
  },
  {
    icon: 'improvement',
    iconBg: 'rgba(255,255,255, 0.08)',
    iconColor: 'rgba(255,255,255, 0.5)',
    title: GH_MESSAGES.login_vp_3_title,
    subtitle: GH_MESSAGES.login_vp_3_subtitle
  }
]

export interface DecorativeCircle {
  top?: string
  right?: string
  bottom?: string
  width: number
  height: number
  borderColor: string
}

export const DECORATIVE_CIRCLES: DecorativeCircle[] = [
  {
    top: '8%',
    right: '-5%',
    width: 180,
    height: 180,
    borderColor: 'rgba(27, 122, 78, 0.15)'
  },
  {
    top: '2%',
    right: '8%',
    width: 120,
    height: 120,
    borderColor: 'rgba(255, 255, 255, 0.06)'
  },
  {
    bottom: '15%',
    right: '-8%',
    width: 220,
    height: 220,
    borderColor: 'rgba(27, 122, 78, 0.08)'
  }
]

/** Custom breakpoint for brand panel visibility (spec: >=1024px) */
export const BRAND_PANEL_BREAKPOINT = 1024
