import { describe, expect, it } from 'vitest'

import { buildMeasurementActionCreationPlans, parseMeasurementActionBinding } from './measurement-actions'

const fixture = () => ({
  actionKey: 'commercial_lead', resourceName: 'customers/6862539491/conversionActions/123',
  ownerCustomer: 'customers/6862539491', type: 'WEBPAGE', status: 'ENABLED',
  category: 'SUBMIT_LEAD_FORM', countingType: 'ONE_PER_CLICK', primaryForGoal: false,
  tagSnippets: [{ type: 'WEBPAGE', pageFormat: 'HTML', eventSnippet: "<script>gtag('event','conversion',{'send_to':'AW-18432951465/abc_X-2'});</script>" }],
})

describe('Google Ads measurement action bindings', () => {
  it('extracts AW/label from a fixed-account native action, independently of account/action IDs', () => {
    expect(parseMeasurementActionBinding(fixture())).toEqual({
      actionKey: 'commercial_lead', customerId: '6862539491',
      resourceName: 'customers/6862539491/conversionActions/123', conversionId: 'AW-18432951465', conversionLabel: 'abc_X-2',
    })
  })

  it.each([
    { ownerCustomer: 'customers/9531478329' }, { resourceName: 'customers/1111111111/conversionActions/123' },
    { type: 'GOOGLE_ANALYTICS_4_GENERATE_LEAD' }, { status: 'HIDDEN' }, { primaryForGoal: true },
    { countingType: 'MANY_PER_CLICK' }, { category: 'BOOK_APPOINTMENT' }, { conversionLabel: 'injected' },
    { tagSnippets: [] }, { actionKey: 'purchase' },
  ])('rejects incompatible or expanded bindings %j', change => {
    expect(() => parseMeasurementActionBinding({ ...fixture(), ...change })).toThrow('google_ads_measurement_binding_invalid')
  })

  it.each([
    "{'send_to':'AW-18432951465/abc','send_to':'AW-1/other'}",
    "{'send_to':'AW-18432951465/abc@example.com'}",
    "{'send_to':getDestination()}", "{'send_to':'AW-18432951465/abc/other'}",
  ])('rejects ambiguous or nonliteral snippets without evaluating them', eventSnippet => {
    const row = fixture()

    row.tagSnippets[0].eventSnippet = eventSnippet
    expect(() => parseMeasurementActionBinding(row)).toThrow()
  })

  it('rejects inconsistent snippets for the same action', () => {
    const row = fixture()

    row.tagSnippets.push({ ...row.tagSnippets[0], eventSnippet: "{'send_to':'AW-1/different'}" })
    expect(() => parseMeasurementActionBinding(row)).toThrow()
  })

  it('accepts the four HTML/AMP and page/on-click variants returned by the real provider', () => {
    const row = fixture()

    const tagSnippets = ['WEBPAGE_ONCLICK', 'WEBPAGE'].flatMap(type => ['HTML', 'AMP'].map(pageFormat => ({
      type, pageFormat, globalSiteTag: '<provider script deliberately not evaluated>',
      eventSnippet: pageFormat === 'AMP' ? '{"send_to":["AW-18432951465/leadLabel"]}' : "{'send_to':'AW-18432951465/leadLabel'}",
    })))

    expect(parseMeasurementActionBinding({ ...row, tagSnippets })).toMatchObject({ conversionLabel: 'leadLabel', conversionId: 'AW-18432951465' })
  })

  it('still requires an HTML snippet and rejects inconsistent AMP labels', () => {
    const row = fixture()

    expect(() => parseMeasurementActionBinding({ ...row, tagSnippets: [{ ...row.tagSnippets[0], pageFormat: 'AMP' }] })).toThrow()
    expect(() => parseMeasurementActionBinding({ ...row, tagSnippets: [row.tagSnippets[0], {
      ...row.tagSnippets[0], pageFormat: 'AMP', eventSnippet: '{"send_to":["AW-18432951465/otherLabel"]}',
    }] })).toThrow()
  })

  it('rejects multi-destination AMP arrays instead of selecting the first label', () => {
    const row = fixture()

    expect(() => parseMeasurementActionBinding({ ...row, tagSnippets: [row.tagSnippets[0], {
      ...row.tagSnippets[0], pageFormat: 'AMP', eventSnippet: '{"send_to":["AW-18432951465/abc_X-2","AW-18432951465/other"]}',
    }] })).toThrow()
  })

  it('builds reviewable creation plans with zero explicitly described as nonrevenue', () => {
    const plans = buildMeasurementActionCreationPlans()

    expect(plans.map(item => item.actionKey)).toEqual(['commercial_lead', 'meeting_booking'])
    expect(plans[1].plan.summary.fields).toMatchObject({ category: 'BOOK_APPOINTMENT', primaryForGoal: false, countingType: 'ONE_PER_CLICK' })
    expect(plans.every(item => item.valueSemantics === 'unvalued_lead_zero_placeholder_not_revenue')).toBe(true)
    expect(plans[0].plan.summary.fields.valueSettings).toEqual({ defaultValue: 0, defaultCurrencyCode: 'CLP', alwaysUseDefaultValue: true })
  })
})
