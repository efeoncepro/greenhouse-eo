import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { describe, expect, it, vi, beforeEach } from 'vitest'

import sharp from 'sharp'

vi.mock('server-only',()=>({}))
vi.mock('@/lib/secrets/secret-manager',()=>({resolveSecret:vi.fn(async()=>({value:'test-only-credential'}))}))

import { BYTEPLUS_MODELS, bytePlusImageRate, bytePlusVideoDimensions, estimateBytePlusVideo, findBytePlusModel } from './byteplus-catalog'
import { bytePlusRequest, generateBytePlusImages, getBytePlusVideo } from './byteplus'
import { collectBytePlusTts } from './byteplus-speech'
import { decodeBytePlusAsr, encodeBytePlusAsr, encodeBytePlusInterpretation } from './byteplus-speech-stream'
import { mainBytePlus } from '../../../scripts/ai/byteplus'

beforeEach(()=>vi.unstubAllGlobals())

describe('BytePlus contratos de transporte y costo',()=>{
  it('declara 21 modelos activados, con identidades únicas y dos modelos con capas',()=>{
    expect(BYTEPLUS_MODELS).toHaveLength(21)
    expect(new Set(BYTEPLUS_MODELS.map(m=>m.id)).size).toBe(21)
    expect(BYTEPLUS_MODELS.filter(m=>m.layers).map(m=>m.id)).toEqual(['seedream5-flash','seedream5-pro'])
    expect(()=>findBytePlusModel('seedance15')).toThrow()
  })
  it('aplica tarifas de la cuenta y no estima inputs de video sujetos a mínimos',()=>{
    expect(bytePlusImageRate(findBytePlusModel('seedream5-pro'),2048**2,true)).toBe(0.0405)
    expect(bytePlusImageRate(findBytePlusModel('seedream5-pro'),1536**2,true)).toBe(0.02025)
    expect(estimateBytePlusVideo(findBytePlusModel('seedance2-fast'),{width:1280,height:720,duration:10,resolution:'720p'})).toBeCloseTo(0.6048)
    expect(estimateBytePlusVideo(findBytePlusModel('seedance25'),{width:1280,height:720,duration:10,resolution:'720p',inputVideoSeconds:5})).toBeNull()
    expect(bytePlusVideoDimensions('480p','1:1')).toEqual([640,640])
  })
  it('envía la operación de capas del fabricante, no el slug de Fal',async()=>{
    const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({data:[],usage:{generated_images:0}}),{status:200}))

    vi.stubGlobal('fetch',fetcher)
    await generateBytePlusImages({model:findBytePlusModel('seedream5-pro').model,image:'test',layer_decomposition:true})
    const [url,options]=fetcher.mock.calls[0]

    expect(url).toBe('https://ark.ap-southeast.bytepluses.com/api/v3/images/generations')
    expect(options.headers.Authorization).toBe('Bearer test-only-credential')
    expect(JSON.parse(options.body).layer_decomposition).toBe(true)
  })
  it('Seedream 4 no recibe output_format y un PNG pedido conserva bytes PNG',async()=>{
    const dir=await mkdtemp(join(tmpdir(),'byteplus-cli-'))
    const jpeg=await sharp({create:{width:10,height:10,channels:3,background:'#888'}}).jpeg().toBuffer()
    const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({data:[{b64_json:jpeg.toString('base64')}],usage:{generated_images:1}}),{status:200}))

    vi.stubGlobal('fetch',fetcher)

    try {
      await mainBytePlus(['--model','seedream4','--prompt','Test','--out',join(dir,'output.png'),'--out-dir',dir,'--yes'])
      expect(JSON.parse(fetcher.mock.calls[0][1].body)).not.toHaveProperty('output_format')
      expect((await sharp(await readFile(join(dir,'output.png'))).metadata()).format).toBe('png')
    } finally { await rm(dir,{recursive:true,force:true}) }
  })
  it('no reintenta generación ni expone el mensaje de error',async()=>{
    const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({error:{code:'InvalidParameter',message:'private prompt and credential'}}),{status:422}))

    vi.stubGlobal('fetch',fetcher)
    await expect(generateBytePlusImages({})).rejects.toThrow('InvalidParameter')
    expect(fetcher).toHaveBeenCalledTimes(1)
    await expect(generateBytePlusImages({})).rejects.not.toThrow('private prompt')
  })
  it('Seedance 2.5 exige 4 s y envía adaptive para primer cuadro',async()=>{
    const dir=await mkdtemp(join(tmpdir(),'byteplus-frames-'))
    const image=join(dir,'input.png')
    const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({id:'test-task'}),{status:200}))

    vi.stubGlobal('fetch',fetcher)

    try {
      await expect(mainBytePlus(['--model','seedance25','--prompt','Test','--duration','2','--yes'])).rejects.toThrow('Duración')
      expect(fetcher).not.toHaveBeenCalled()
      await writeFile(image,await sharp({create:{width:10,height:20,channels:3,background:'#888'}}).png().toBuffer())
      await mainBytePlus(['--model','seedance25','--prompt','Test','--duration','4','--image',image,'--out-dir',dir,'--detach','--yes'])
      expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ratio:'adaptive',duration:4})
    } finally { await rm(dir,{recursive:true,force:true}) }
  })
  it('rechaza URLs externas antes de resolver credenciales y recupera tareas sin POST',async()=>{
    const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify({id:'task-1',status:'failed',error:{code:'Safety'}}),{status:200}))

    vi.stubGlobal('fetch',fetcher)
    await expect(bytePlusRequest('ark','https://other.example')).rejects.toThrow('Ruta')
    expect(fetcher).not.toHaveBeenCalled()
    expect((await getBytePlusVideo('task-1')).data.status).toBe('failed')
    expect(fetcher.mock.calls[0][1].method).toBe('GET')
  })
  it('ensambla TTS NDJSON con fragmentos y exige evento terminal',async()=>{
    const bytes=new TextEncoder().encode('{"code":0,"data":"aG9sYQ=="}\n{"code":20000000,"data":null}')
    const stream=new ReadableStream<Uint8Array>({start(c){c.enqueue(bytes.slice(0,16));c.enqueue(bytes.slice(16));c.close()}})

    expect((await collectBytePlusTts(stream)).toString()).toBe('hola')
    await expect(collectBytePlusTts(new ReadableStream({start(c){c.enqueue(new TextEncoder().encode('{"code":0,"data":"aG9sYQ=="}'));c.close()}}))).rejects.toThrow('incompleto')
  })
  it('ASR usa secuencia negativa en el último paquete y detecta truncamiento',()=>{
    const frame=encodeBytePlusAsr(Buffer.from('{"result":{"text":"hola"}}'),2,true,true)

    expect(frame[1]).toBe(0x23)
    expect(frame.readInt32BE(4)).toBe(-2)
    // La respuesta del fabricante usa type=9 con la misma envoltura, gzip JSON.
    frame[1]=0x93
    expect(decodeBytePlusAsr(frame)).toMatchObject({sequence:-2,complete:true,data:{result:{text:'hola'}}})
    expect(()=>decodeBytePlusAsr(frame.subarray(0,frame.length-1))).toThrow('truncado')
  })
  it('interpretación codifica audio en binary_data=14 y SessionID=6',()=>{
    const bytes=encodeBytePlusInterpretation({event:200,request_meta:{SessionID:'test'},source_audio:{binary_data:Buffer.from([1,2,3])}})

    expect(bytes.includes(Buffer.from([0x72,3,1,2,3]))).toBe(true)
    expect(bytes.includes(Buffer.from([0x32,4,116,101,115,116]))).toBe(true)
  })
})
