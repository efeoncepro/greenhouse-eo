import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import sharp from 'sharp'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only',()=>({}))
const {generate,readOutput}=vi.hoisted(()=>({generate:vi.fn(),readOutput:vi.fn()}))

vi.mock('@/lib/ai/byteplus',()=>({generateBytePlusImages:generate,readBytePlusOutput:readOutput}))

import { runBytePlusLayerize } from './layerize-byteplus'
import { maskFromLayers } from '../layers'

let dir=''

afterEach(async()=>{if(dir)await rm(dir,{recursive:true,force:true});vi.clearAllMocks()})

describe('Layerize BytePlus compatible con inpainting',()=>{
  it('ordena por z_index, conserva alfa/cajas, cobra cada salida y reutiliza sin generar',async()=>{
    dir=await mkdtemp(join(tmpdir(),'byteplus-layers-'))
    const source=join(dir,'source.png')
    const base=await sharp({create:{width:1600,height:1700,channels:3,background:'#888'}}).png().toBuffer()
    const layer=await sharp({create:{width:100,height:100,channels:4,background:{r:255,g:0,b:0,alpha:0.75}}}).png().toBuffer()

    await writeFile(source,base)
    generate.mockResolvedValue({requestId:'test',data:{data:[
      {z_index:1,url:'layer',name:'object',bounding_box:{absolute:[10,20,110,120]}},
      {z_index:0,url:'base'}],usage:{generated_images:2}}})
    readOutput.mockImplementation(async item=>item.url==='base' ? base : layer)
    const result=await runBytePlusLayerize({imagePath:source,runRoot:dir,yes:true,log:()=>undefined})

    expect(result.document?.base.width).toBe(1600)
    expect(result.document?.layers[1].box).toEqual({left:10,top:20,right:110,bottom:120})
    expect(result.document?.layers[1].alphaCoverage).toBe(1)
    expect(result.document?.cost.estimatedUsd).toBeCloseTo(0.0405+0.02025)
    expect(result.document?.cost.perLayerUsd).toBeNull() // los tiers varían por capa
    expect(await readFile(result.layersJson,'utf8')).not.toContain('https://')
    expect((await maskFromLayers(result.layersJson,['object'],{width:1600,height:1700})).data.some(value=>value>0)).toBe(true)
    expect((await runBytePlusLayerize({imagePath:source,runRoot:dir,log:()=>undefined})).reused).toBe(true)
    expect(generate).toHaveBeenCalledTimes(1)
  })
  it('dry-run nunca contacta BytePlus',async()=>{
    dir=await mkdtemp(join(tmpdir(),'byteplus-layers-'))
    const source=join(dir,'source.png')

    await writeFile(source,await sharp({create:{width:1024,height:1024,channels:3,background:'#777'}}).png().toBuffer())
    expect((await runBytePlusLayerize({imagePath:source,runRoot:dir,dryRun:true,log:()=>undefined})).document).toBeNull()
    expect(generate).not.toHaveBeenCalled()
  })
})
