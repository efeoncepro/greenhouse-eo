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
  left?: string
  right?: string
  bottom?: string
  width: number
  height: number
  border: string
}

export const DECORATIVE_CIRCLES: DecorativeCircle[] = [
  {
    top: '-8%',
    right: '-12%',
    width: 340,
    height: 340,
    border: '1.5px solid rgba(27, 122, 78, 0.18)'
  },
  {
    top: '5%',
    right: '2%',
    width: 200,
    height: 200,
    border: '1px solid rgba(255, 255, 255, 0.06)'
  },
  {
    bottom: '-5%',
    right: '-6%',
    width: 280,
    height: 280,
    border: '1px solid rgba(27, 122, 78, 0.1)'
  },
  {
    bottom: '10%',
    left: '-15%',
    width: 180,
    height: 180,
    border: '1px solid rgba(255, 255, 255, 0.04)'
  }
]

/** Custom breakpoint for brand panel visibility (spec: >=1024px) */
export const BRAND_PANEL_BREAKPOINT = 1024
