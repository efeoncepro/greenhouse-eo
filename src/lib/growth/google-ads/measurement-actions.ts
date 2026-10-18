import { z } from 'zod'

import { buildWritePlan } from './writes'

export const GOOGLE_ADS_MEASUREMENT_ACTION_KEYS = ['commercial_lead', 'meeting_booking'] as const
export type GoogleAdsMeasurementActionKey = typeof GOOGLE_ADS_MEASUREMENT_ACTION_KEYS[number]

const customer = 'customers/6862539491'
const actionResource = z.string().regex(/^customers\/6862539491\/conversionActions\/[1-9]\d{0,18}$/)

const snippetSchema = z.object({
  type: z.enum(['WEBPAGE', 'WEBPAGE_ONCLICK']), pageFormat: z.enum(['HTML', 'AMP']),
  eventSnippet: z.string().min(1).max(16_384), globalSiteTag: z.string().max(16_384).optional(),
}).strict()

/** A provider readback, never permission inferred from a caller's bare AW/label pair. */
export const measurementActionReadbackSchema = z.object({
  actionKey: z.enum(GOOGLE_ADS_MEASUREMENT_ACTION_KEYS),
  resourceName: actionResource,
  ownerCustomer: z.literal(customer), type: z.literal('WEBPAGE'), status: z.literal('ENABLED'),
  category: z.enum(['SUBMIT_LEAD_FORM', 'BOOK_APPOINTMENT']),
  countingType: z.literal('ONE_PER_CLICK'), primaryForGoal: z.literal(false),
  tagSnippets: z.array(snippetSchema).min(1).max(4),
}).strict()

export interface GoogleAdsMeasurementBinding {
  actionKey: GoogleAdsMeasurementActionKey
  customerId: '6862539491'
  resourceName: string
  conversionId: string
  conversionLabel: string
}

const invalid = (): never => { throw new Error('google_ads_measurement_binding_invalid') }

/** Extract only a send_to literal. Provider JavaScript is never evaluated or copied into a tag. */
export const parseMeasurementActionBinding = (input: unknown): GoogleAdsMeasurementBinding => {
  const result = measurementActionReadbackSchema.safeParse(input)

  if (!result.success) return invalid()
  const row = result.data
  const expectedCategory = row.actionKey === 'commercial_lead' ? 'SUBMIT_LEAD_FORM' : 'BOOK_APPOINTMENT'

  if (row.category !== expectedCategory || !row.tagSnippets.some(snippet => snippet.pageFormat === 'HTML')) return invalid()
  const pairs = new Set<string>()

  for (const snippet of row.tagSnippets) {
    // Google emits an array literal in AMP and a scalar literal in ordinary HTML.
    const pattern = snippet.pageFormat === 'AMP'
      ? /['"]send_to['"]\s*:\s*\[\s*(['"])(AW-([1-9]\d{0,18})\/([A-Za-z0-9_-]{1,128}))\1\s*\]/g
      : /['"]send_to['"]\s*:\s*(['"])(AW-([1-9]\d{0,18})\/([A-Za-z0-9_-]{1,128}))\1/g

    const matches = [...snippet.eventSnippet.matchAll(pattern)]

    if (matches.length !== 1 || (snippet.eventSnippet.match(/send_to/g) ?? []).length !== 1) return invalid()
    pairs.add(matches[0][2])
  }

  if (pairs.size !== 1) return invalid()
  const [conversionId, conversionLabel] = [...pairs][0].split('/')

  return { actionKey: row.actionKey, customerId: '6862539491', resourceName: row.resourceName, conversionId, conversionLabel }
}

/** Two secondary actions, no campaign/goals changes. Zero is an explicit placeholder, never revenue. */
export const buildMeasurementActionCreationPlans = () => GOOGLE_ADS_MEASUREMENT_ACTION_KEYS.map(actionKey => ({
  actionKey,
  valueSemantics: 'unvalued_lead_zero_placeholder_not_revenue' as const,
  plan: buildWritePlan({
    operation: 'conversionAction.create',
    fields: {
      name: actionKey === 'commercial_lead' ? 'Efeonce - Solicitud comercial aceptada' : 'Efeonce - Agenda confirmada',
      type: 'WEBPAGE', category: actionKey === 'commercial_lead' ? 'SUBMIT_LEAD_FORM' : 'BOOK_APPOINTMENT',
      primaryForGoal: false, countingType: 'ONE_PER_CLICK',
      valueSettings: { defaultValue: 0, defaultCurrencyCode: 'CLP', alwaysUseDefaultValue: true },
    },
  }),
}))
