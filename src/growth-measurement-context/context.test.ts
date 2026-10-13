import { describe, expect, it } from 'vitest'

import { readPublicMeasurementContext } from './context'

const visitor=(ads='granted',analytics='granted',gpc=false,hostname='efeoncepro.com')=>({
 location:{hostname,href:`https://${hostname}/contacto/?fbclid=real-click-id`},navigator:{globalPrivacyControl:gpc},
 document:{cookie:'_ga=GA1.1.123.456; _fbp=fb.1.1791921600000.1234',documentElement:{getAttribute:(name:string)=>name.includes('ads')?ads:analytics}},
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
 it('excludes noncanonical hosts',()=>expect(readPublicMeasurementContext(visitor('granted','granted',false,'greenhouse.efeoncepro.com'))).toBeUndefined())
})
