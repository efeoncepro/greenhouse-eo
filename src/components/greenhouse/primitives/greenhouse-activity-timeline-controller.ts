/**
 * greenhouse-activity-timeline-controller — visual chrome tokens for the
 * reusable Activity Timeline primitive.
 *
 * Consumers own domain events and copy. This namespace owns primitive geometry,
 * motion timing, opacity roles and shadow strength so utilities labs/product
 * views do not scatter AXIS-derived literals.
 */

export const GREENHOUSE_ACTIVITY_TIMELINE_TOKENS = Object.freeze({
  card: {
    compactMaxInlineSize: 460,
    maxInlineSize: 554
  },
  icon: {
    header: 22,
    actionSpacer: 34,
    attachmentInlineSize: 18,
    attachmentBlockSize: 22,
    attachmentGlyph: 14,
    contractSignal: 18,
    contractSignalContainer: 32,
    fitAvatar: 28,
    fitAvatarGlyph: 16
  },
  dot: {
    railInlineSize: 18,
    size: 18,
    innerSize: 10,
    connectorTop: 22,
    connectorBlockOffset: -22,
    connectorInlineOffset: 8.5,
    surfaceRing: 3
  },
  avatar: {
    person: 34,
    cluster: 34
  },
  opacity: {
    connector: 0.12,
    border: 0.08,
    personBorder: 0.06,
    personSurface: 0.025,
    headerIcon: 0.78,
    neutralDotSurface: 0.11,
    semanticDotSurface: 0.18,
    attachmentSurface: 0.86,
    attachmentShadow: 0.05,
    cardGradientStop: 0.96,
    cardShadow: 0.1
  },
  shadow: {
    attachmentOffsetY: 8,
    attachmentBlur: 18,
    cardOffsetY: 22,
    cardBlur: 54
  },
  motion: {
    connectorDuration: 0.34,
    itemDuration: 0.26,
    itemDelayStep: 0.045,
    itemOffsetY: 8,
    easing: [0.2, 0, 0, 1]
  },
  spacing: {
    attachmentGap: 1,
    attachmentPaddingX: 1,
    attachmentPaddingY: 0.65,
    personPaddingX: 1,
    personPaddingY: 0.75
  }
} as const)
