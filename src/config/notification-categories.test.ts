import { describe, expect, it } from 'vitest'

import { getMicrocopy, type NotificationCategoryCopyCode } from '@/lib/copy'
import { getCategoriesForAudience, getCategoryConfig, NOTIFICATION_CATEGORIES } from './notification-categories'

const EXPECTED_CATEGORY_CODES = [
  'delivery_update',
  'sprint_milestone',
  'feedback_requested',
  'report_ready',
  'leave_status',
  'leave_review',
  'payroll_ready',
  'assignment_change',
  'ico_alert',
  'capacity_warning',
  'payroll_ops',
  'finance_alert',
  'system_event'
] as const satisfies readonly NotificationCategoryCopyCode[]

const EXPECTED_RUNTIME_CONTRACT = {
  delivery_update: {
    icon: 'tabler-package',
    audience: 'client',
    defaultChannels: ['in_app'],
    priority: 'normal'
  },
  sprint_milestone: {
    icon: 'tabler-flag',
    audience: 'client',
    defaultChannels: ['in_app'],
    priority: 'normal'
  },
  feedback_requested: {
    icon: 'tabler-message-circle',
    audience: 'client',
    defaultChannels: ['in_app', 'email'],
    priority: 'high'
  },
  report_ready: {
    icon: 'tabler-file-analytics',
    audience: 'client',
    defaultChannels: ['in_app', 'email'],
    priority: 'low'
  },
  leave_status: {
    icon: 'tabler-calendar-event',
    audience: 'collaborator',
    defaultChannels: ['in_app', 'email'],
    priority: 'high'
  },
  leave_review: {
    icon: 'tabler-calendar-time',
    audience: 'internal',
    defaultChannels: ['in_app', 'email'],
    priority: 'high'
  },
  payroll_ready: {
    icon: 'tabler-currency-dollar',
    audience: 'collaborator',
    defaultChannels: ['in_app', 'email'],
    priority: 'high'
  },
  assignment_change: {
    icon: 'tabler-user-plus',
    audience: 'collaborator',
    defaultChannels: ['in_app'],
    priority: 'normal'
  },
  ico_alert: {
    icon: 'tabler-alert-triangle',
    audience: 'internal',
    defaultChannels: ['in_app', 'email'],
    priority: 'high'
  },
  capacity_warning: {
    icon: 'tabler-users',
    audience: 'internal',
    defaultChannels: ['in_app'],
    priority: 'normal'
  },
  payroll_ops: {
    icon: 'tabler-calculator',
    audience: 'internal',
    defaultChannels: ['in_app', 'email'],
    priority: 'high'
  },
  finance_alert: {
    icon: 'tabler-chart-bar',
    audience: 'internal',
    defaultChannels: ['in_app', 'email'],
    priority: 'high'
  },
  system_event: {
    icon: 'tabler-settings',
    audience: 'admin',
    defaultChannels: ['in_app'],
    priority: 'low'
  }
} as const

describe('notification categories', () => {
  it('keeps the runtime category contract stable while sourcing visible copy from the dictionary', () => {
    const copy = getMicrocopy().emails.notificationCategories

    expect(Object.keys(NOTIFICATION_CATEGORIES)).toEqual([...EXPECTED_CATEGORY_CODES])

    for (const code of EXPECTED_CATEGORY_CODES) {
      const category = NOTIFICATION_CATEGORIES[code]

      expect(category.code).toBe(code)
      expect(category.label).toBe(copy[code].label)
      expect(category.description).toBe(copy[code].description)
      expect({
        icon: category.icon,
        audience: category.audience,
        defaultChannels: category.defaultChannels,
        priority: category.priority
      }).toEqual(EXPECTED_RUNTIME_CONTRACT[code])
    }
  })

  it('keeps helpers compatible with existing notification consumers', () => {
    expect(getCategoryConfig('payroll_ready')).toMatchObject({
      code: 'payroll_ready',
      label: 'Liquidación disponible',
      defaultChannels: ['in_app', 'email']
    })

    expect(() => getCategoryConfig('unknown_category')).toThrow('Unknown notification category: unknown_category')
    expect(getCategoriesForAudience('client').map(category => category.code)).toEqual([
      'delivery_update',
      'sprint_milestone',
      'feedback_requested',
      'report_ready'
    ])
  })
})
