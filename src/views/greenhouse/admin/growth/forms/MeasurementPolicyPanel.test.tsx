// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react'

import { renderWithTheme } from '@/test/render'
import { policyFixture } from '@/lib/growth/measurement/__tests__/policy-fixture'
import { GH_GROWTH_MEASUREMENT as C } from '@/lib/copy/growth-measurement'

import type { MeasurementCatalog } from './measurement-policy-client'
import MeasurementPolicyPanel from './MeasurementPolicyPanel'

const policy=policyFixture()
const source={scope:policy.scope,name:'Source A',formSlug:'source-a',sourceVersion:policy.config.sourceVersion,origins:['https://efeoncepro.com'],fields:[{key:'email',type:'email' as const},{key:'phone',type:'tel' as const},{key:'firstName',type:'text' as const},{key:'lastName',type:'text' as const}],blockingReasons:[]}
const catalog:MeasurementCatalog={sources:[source,{...source,name:'Source B',formSlug:'source-b',scope:{...source.scope,sourceKey:'a879b155-a143-40bd-9b15-731c2b62d180'}}],policies:[policy],permissions:{read:true,author:true,publish:true,disable:true}}
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status})

afterEach(()=>{cleanup();vi.unstubAllGlobals()})

describe('measurement operator workflow',()=>{
  it('preserves reviewed Google Ads opt-in when an operator edits the shared policy',async()=>{
    const googleAds={conversionKey:'commercial_lead' as const,enhancedConversions:true,activationAt:'2026-10-17T00:00:00.000Z'}
    const adsPolicy={...policy,config:{...policy.config,googleAds}}
    const data:MeasurementCatalog={...catalog,sources:catalog.sources.map(s=>({...s,googleAdsEligible:true})),policies:[adsPolicy]}
    const bodies:Array<Record<string,unknown>>=[]

    vi.stubGlobal('fetch',vi.fn(async(_url:unknown,options?:RequestInit)=>{
      if(options?.method!=='POST') return json(data)
      const body=JSON.parse(options.body as string)

      bodies.push(body)

      return json({ok:false,error:'policy_unavailable',blockingReasons:[]},503)
    }))
    renderWithTheme(<MeasurementPolicyPanel initialCatalog={data} />)
    fireEvent.click(await screen.findByRole('button',{name:C.edit}))
    fireEvent.click(await screen.findByRole('button',{name:C.save}))
    await waitFor(()=>expect(bodies).toHaveLength(1))
    expect(bodies[0]).toMatchObject({action:'draft',config:{googleAds}})
  })
  it('defaults a new source to destinations OFF and requires typed identity mapping',async()=>{
    renderWithTheme(<MeasurementPolicyPanel initialCatalog={catalog} preferredFormSlug='source-b' />)
    const save=await screen.findByRole('button',{name:C.save})

    expect(screen.getByRole('switch',{name:C.meta})).not.toBeChecked()
    expect(screen.getByRole('switch',{name:C.google_upd})).not.toBeChecked()
    expect(save).toBeDisabled()
    expect(screen.getByText(C.blockers.identity_mapping_required)).toBeInTheDocument()
  })
  it('keeps the active revision and uses server write plus readback through draft, review and publish',async()=>{
    let data=structuredClone(catalog)
    const bodies:Array<Record<string,unknown>>=[]

    const fetcher=vi.fn(async(_url:unknown,options?:RequestInit)=>{
      if(options?.method!=='POST') return json(data)
      const body=JSON.parse(options.body as string)

      bodies.push(body)
      const next={...policy,revision:2,revisionId:'a879b155-a143-40bd-9b15-731c2b62d181',state:body.action==='publish'?'published':body.action,config:body.config??data.policies[0].config,publishedRevisionId:body.action==='publish'?'a879b155-a143-40bd-9b15-731c2b62d181':policy.revisionId}

      data={...data,policies:[next,{...policy,state:body.action==='publish'?'superseded':'published',publishedRevisionId:next.publishedRevisionId}]}

      return json({ok:true,policy:next,blockingReasons:[]})
    })

    vi.stubGlobal('fetch',fetcher)
    renderWithTheme(<MeasurementPolicyPanel initialCatalog={catalog} />)
    fireEvent.click(await screen.findByRole('button',{name:C.edit}))
    expect(screen.getByText(C.activeRevision(1))).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button',{name:C.save}))
    fireEvent.click(await screen.findByRole('button',{name:C.review}))
    fireEvent.click(await screen.findByRole('button',{name:C.publish}))
    await waitFor(()=>expect(screen.getByText(C.activeRevision(2))).toBeInTheDocument())
    expect(bodies.map(body=>body.action)).toEqual(['draft','review','publish'])
    expect(bodies.every(body=>body.expectedPublishedRevisionId===policy.revisionId)).toBe(true)
    expect(new Set(bodies.map(body=>body.idempotencyKey)).size).toBe(3)
  })
  it('locks edits after an unknown outcome and retries exactly the original command',async()=>{
    const fetcher=vi.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValueOnce(json({ok:true,policy:{...policy,state:'draft'}})).mockResolvedValueOnce(json({...catalog,policies:[{...policy,state:'draft'}]}))

    vi.stubGlobal('fetch',fetcher)
    renderWithTheme(<MeasurementPolicyPanel initialCatalog={catalog} />)
    fireEvent.click(await screen.findByRole('button',{name:C.edit}))
    fireEvent.click(screen.getByRole('button',{name:C.save}))
    fireEvent.click(await screen.findByRole('button',{name:C.retry}))
    await screen.findByText(C.saved)
    expect(fetcher.mock.calls[0][1].body).toBe(fetcher.mock.calls[1][1].body)
  })
  it('preserves unsaved mapping and destination values across conflict and reload',async()=>{
    const fetcher=vi.fn().mockResolvedValueOnce(json({},409)).mockResolvedValueOnce(json(catalog))

    vi.stubGlobal('fetch',fetcher)
    renderWithTheme(<MeasurementPolicyPanel initialCatalog={catalog} />)
    fireEvent.click(await screen.findByRole('button',{name:C.edit}))
    fireEvent.click(screen.getByRole('switch',{name:C.google_upd}))
    fireEvent.click(screen.getByRole('button',{name:C.save}))
    await screen.findByText(C.conflict)
    fireEvent.click(screen.getByRole('button',{name:C.reload}))
    await waitFor(()=>expect(fetcher).toHaveBeenCalledTimes(2))
    expect(screen.getByRole('switch',{name:C.google_upd})).not.toBeChecked()
    expect(screen.getByRole('button',{name:C.save})).toBeInTheDocument()
  })
  it('requires explicit confirmation before disable and offers no mutation actions to read-only users',async()=>{
    const fetcher=vi.fn()

    vi.stubGlobal('fetch',fetcher)
    const view=renderWithTheme(<MeasurementPolicyPanel initialCatalog={catalog} />)

    fireEvent.click(await screen.findByRole('button',{name:C.disable}))
    expect(screen.getByText(C.confirmDisable)).toBeInTheDocument()
    expect(fetcher).not.toHaveBeenCalled()
    view.unmount()
    renderWithTheme(<MeasurementPolicyPanel initialCatalog={{...catalog,permissions:{read:true,author:false,publish:false,disable:false}}} />)
    await screen.findByText(C.readOnly)
    expect(screen.queryByRole('button',{name:C.edit})).not.toBeInTheDocument()
    expect(screen.queryByRole('button',{name:C.disable})).not.toBeInTheDocument()
    expect(screen.getByRole('combobox',{name:C.email})).toHaveAttribute('aria-disabled','true')
  })
  it('warns before leaving dirty source and retains the selection on keep editing',async()=>{
    renderWithTheme(<MeasurementPolicyPanel initialCatalog={catalog} />)
    fireEvent.click(await screen.findByRole('button',{name:C.edit}))
    fireEvent.click(screen.getByRole('switch',{name:C.google_upd}))
    fireEvent.mouseDown(screen.getByRole('combobox',{name:C.source}))
    fireEvent.click(await screen.findByRole('option',{name:/Source B/}))
    await screen.findByText(C.confirmDiscard)
    fireEvent.click(screen.getByRole('button',{name:C.keepEditing}))
    expect(screen.getByRole('combobox',{name:C.source})).toHaveTextContent('Source A')
    expect(screen.getByRole('switch',{name:C.google_upd})).not.toBeChecked()
  })
})
