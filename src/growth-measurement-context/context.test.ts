import { describe, expect, it } from 'vitest'

import { readPublicMeasurementContext } from './context'

const visitor=(ads='granted',analytics='granted',gpc=false,hostname='efeoncepro.com')=>({
 location:{hostname,href:`https://${hostname}/contacto/?fbclid=real-click-id`},navigator:{globalPrivacyControl:gpc},
 document:{cookie:'_ga=GA1.1.123.456; _fbp=fb.1.1791921600000.1234',documentElement:{getAttribute:(name:string)=>name==='data-efeonce-ads-consent'?ads:name==='data-efeonce-analytics-consent'?analytics:null}},
}) as unknown as Window

describe('new visitor consent context',()=>{
 it('keeps unknown consent untrackable',()=>expect(readPublicMeasurementContext(visitor('',''))).toBeUndefined())
 it('does not invent GA identity when analytics is denied',()=>{
  const context=readPublicMeasurementContext(visitor('granted','denied'))!

  expect(context.clientId).toBeUndefined();expect(context.fbc).toContain('real-click-id')
 })
 it('GPC vetoes advertising cookies and click data',()=>{
  const context=readPublicMeasurementContext(visitor('granted','granted',true))!

  expect(context.advertisement).toBe(false);expect(context.fbp).toBeUndefined();expect(context.fbc).toBeUndefined()
 })
 it('reads only an actual GA cookie after analytics consent',()=>expect(readPublicMeasurementContext(visitor())?.clientId).toBe('123.456'))
 it('reads the consented bridge fallback at submit after cookies are blocked',()=>{
  const win=visitor('granted','denied') as Window & {efeonceReadMetaAttribution?:()=>{fbp:string;fbc:string}}

  win.document.cookie=''
  win.efeonceReadMetaAttribution=()=>({fbp:'fb.1.1791921600000.1234',fbc:'fb.1.1791921600000.landing-click'})
  expect(readPublicMeasurementContext(win)).toMatchObject({fbp:'fb.1.1791921600000.1234',fbc:'fb.1.1791921600000.landing-click'})
 })
 it('never invokes attribution storage when advertising is denied',()=>{
  const win=visitor('denied','granted') as Window & {efeonceReadMetaAttribution?:()=>never}

  win.efeonceReadMetaAttribution=()=>{throw Error('must not access attribution')}
  expect(readPublicMeasurementContext(win)?.advertisement).toBe(false)
 })
 it('excludes noncanonical hosts',()=>expect(readPublicMeasurementContext(visitor('granted','granted',false,'greenhouse.efeoncepro.com'))).toBeUndefined())
})

describe('explicit Google consent/context', () => {
 const googleVisitor = () => {
  const win = visitor() as Window & { efeonceReadGoogleAdsAttribution?: () => unknown }
  const original = win.document.documentElement.getAttribute
  const values: Record<string, string | undefined> = {}

  for (const key of ['ad-storage','ad-user-data','ad-personalization','analytics-storage']) values[`data-efeonce-google-${key}`]='granted'
  win.document.documentElement.getAttribute = key => key.startsWith('data-efeonce-google-') ? values[key] ?? null : original(key)
  win.efeonceReadGoogleAdsAttribution = () => ({source:'landing_query',capturedAt:new Date().toISOString(),gclid:'observed-click'})

  return {win,values}
 }

 it('old advertisement grant cannot stand in for Google consent',()=>{
  expect(readPublicMeasurementContext(visitor())?.googleConsent).toBeUndefined()
  const {win,values}=googleVisitor()

  delete values['data-efeonce-google-ad-user-data']
  expect(readPublicMeasurementContext(win)?.googleConsent).toBeUndefined()
  expect(readPublicMeasurementContext(win)?.googleClick).toBeUndefined()
 })
 it('carries only validated observed Ads click identifiers after explicit consent',()=>{
  const {win}=googleVisitor()
  const context=readPublicMeasurementContext(win)

  expect(context?.googleConsent).toMatchObject({adStorage:'granted',adUserData:'granted',analyticsStorage:'granted'})
  expect(context?.googleClick?.gclid).toBe('observed-click')
 })
 it('blocks invalid/expired identifiers and never reads Ads storage on deny',()=>{
  const {win,values}=googleVisitor()

  win.efeonceReadGoogleAdsAttribution=()=>({source:'landing_query',capturedAt:new Date(Date.now()-31*86400_000).toISOString(),gclid:'expired'})
  expect(readPublicMeasurementContext(win)?.googleClick).toBeUndefined()
  values['data-efeonce-google-ad-storage']='denied'
  win.efeonceReadGoogleAdsAttribution=()=>{throw Error('must not read')}
  expect(readPublicMeasurementContext(win)?.googleClick).toBeUndefined()
 })
})
