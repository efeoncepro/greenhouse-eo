/**
 * Design System lab tokens.
 *
 * Internal museum pages can compose examples, but their chrome must still read
 * from a named token namespace instead of scattering visual constants in views.
 * Color values are always resolved from the active AXIS/MUI theme at the call
 * site; this file only owns layout, opacity, focus, and specimen sizing roles.
 */

export const DESIGN_SYSTEM_LAB_TOKENS = Object.freeze({
  routes: {
    root: '/admin/design-system'
  },
  layout: {
    pageMaxInlineSize: 1100,
    introMaxInlineSize: 820,
    logoBlockSize: 32,
    sectionGap: 4,
    headerGap: 1.5,
    gridGap: 4,
    asideMinInlineSize: 280,
    narrowAsideMinInlineSize: 260
  },
  spacing: {
    hairline: 0.5,
    tight: 1,
    related: 1.5,
    compactGroup: 2,
    sectionInset: 4
  },
  opacity: {
    codeBackground: 0.055,
    subtleBorder: 0.08,
    subtleFill: 0.018,
    softAccentSurface: 0.08,
    elevatedShadow: 0.06
  },
  icon: {
    inline: 16,
    badge: 18,
    badgeContainer: 32
  },
  focus: {
    outlineWidth: 2,
    outlineOffset: 2,
    insetOutlineOffset: -2
  },
  shadow: {
    cardOffsetY: 18,
    cardBlur: 42
  }
} as const)
