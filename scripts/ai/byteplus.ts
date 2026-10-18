import 'server-only'

import { randomUUID } from 'node:crypto'
import { readFile, mkdir, writeFile, access } from 'node:fs/promises'
import { dirname, extname, join, resolve } from 'node:path'

import { config as loadEnv } from 'dotenv'
import sharp from 'sharp'

import { BYTEPLUS_MODELS, buildBytePlusDraftFinalRequest, bytePlusDraftExpiry, bytePlusImageRate, bytePlusVideoDimensions, estimateBytePlusVideo, findBytePlusModel } from '@/lib/ai/byteplus-catalog'
import { BytePlusError, bytePlusDoctor, bytePlusRequest, createBytePlusVideo, generateBytePlusImages, getBytePlusVideo, readBytePlusOutput } from '@/lib/ai/byteplus'
import { generateBytePlusAudio, generateBytePlusTts, queryBytePlusAsrFile, submitBytePlusAsrFile } from '@/lib/ai/byteplus-speech'

import { runBytePlusLayerize } from './inpaint/adapters/layerize-byteplus'

loadEnv({ path: join(process.cwd(), '.env.local'), quiet: true })

const HELP = `pnpm ai:byteplus — media directa de BytePlus (Johor)

  --list / --doctor                         Catálogo o autenticación, sin generar
  --model <id>                             Identidad de --list (o model ID exacto)
  --prompt <texto> / --prompt-file <ruta>    Texto de imagen/video/audio/TTS
  --image <ruta|https>                      Imagen de edición / primer cuadro (repetible)
  --end-image <ruta|https>                  Último cuadro de video
  --video <https> / --audio <ruta|https>     Referencias; audio local para streaming
  --references                             Imágenes como reference_image, no primer cuadro
  --layers                                 Separación en capas Pro/Flash
  --size 1K|1.5K|2K|3K|4K|WxH               Imágenes (default 2K)
  --resolution 480p|720p|1080p|4k            Video (default 720p)
  --duration <s> --aspect 16:9               Video (default 5 s, 16:9)
  --operation generate|edit|extend|enroll   Video 2.5 / enrollment de voz
  --speaker <id>                           Timbre TTS o voz propia ya autorizada
  --input-file <json>                      Campos avanzados del contrato del fabricante
  --out <ruta> / --out-dir <dir>            Archivos locales; no se publican
  --estimate / --dry-run                    Preparación y precio sin llamadas de generación
  --yes                                    Ejecuta explícitamente; sin él no se genera
  --max-usd <n>                            Rechaza una estimación que excede el tope
  --task-id <id> / --status / --detach      Recuperar/consultar video o ASR sin reencolar
  --draft                                  Seedance 2.5: borrador barato a 480p (vigente 7 días)
  --from-draft <task-id>                   Seedance 2.5: final 1080p de ese borrador; sin prompt ni referencias
  --no-audio                               Video silencioso
  --consent                                Enrollment: declaración explícita de consentimiento

Ejemplos:
  pnpm ai:byteplus --model seedream5-flash --prompt 'Un objeto sobre fondo blanco' --out imagen.png --yes
  pnpm ai:layers --provider byteplus --image imagen.png --dry-run
  pnpm ai:byteplus --model seedance25 --prompt 'Un paisaje al amanecer' --duration 5 --estimate
  pnpm ai:byteplus --model tts2 --prompt 'Hola' --speaker <voice-id> --out voz.mp3 --yes
  pnpm ai:byteplus --model seedance25 --draft --image cuadro.png --prompt-file toma.txt --duration 4 --out borrador.mp4 --yes
  pnpm ai:byteplus --model seedance25 --from-draft <task-id-del-borrador> --out final-1080p.mp4 --yes
Los servicios de voz tienen tarifa variable: --yes confirma uso; enrollment nunca compra slots.
`

type Flags = Record<string, string | boolean>

export const parseBytePlusArgs = (argv: string[]) => {
  const flags: Flags = {}
  const media: Record<'image' | 'video' | 'audio', string[]> = { image: [], video: [], audio: [] }
  const booleans = ['list','doctor','layers','references','estimate','dry-run','yes','status','detach','no-audio','consent','help','draft']
  const values = ['model','prompt','prompt-file','end-image','size','resolution','duration','aspect','operation','speaker','input-file','out','out-dir','max-usd','task-id','from-draft']

  for (let i=0; i<argv.length; i++) {
    if (argv[i] === '--') continue
    const name = argv[i].replace(/^--/,'')

    if (booleans.includes(name)) { flags[name] = true; continue }
    if (![...values,'image','video','audio'].includes(name) || !argv[i+1] || argv[i+1].startsWith('--')) throw new Error(`Flag inválida: ${argv[i]}.`)
    const value = argv[++i]

    if (['image','video','audio'].includes(name)) media[name as keyof typeof media].push(value)
    else flags[name] = value
  }

  return { flags, media }
}

const stringFlag = (f: Flags, name: string, fallback = '') => typeof f[name] === 'string' ? f[name] as string : fallback

const httpsMedia = (value: string) => {
  const url = new URL(value)

  if (url.protocol !== 'https:') throw new Error('Video/audio de referencia requiere URL HTTPS del proveedor o recurso autorizado.')

  return value
}

/**
 * PNG/JPEG/WebP viajan con sus bytes originales: la confianza de ModelArk en salidas propias con rostro (Seedream 5,
 * Seedance 2.x, misma cuenta, 30 días) se pierde si el archivo se recomprime. Sólo otros formatos se convierten a PNG.
 */
export const bytePlusImageInput = async (value: string) => {
  if (/^https:\/\//.test(value)) return value
  // Personaje de la biblioteca privada de retratos virtuales (estado Active tras la revisión del fabricante).
  if (/^asset:\/\/[a-zA-Z0-9_-]+$/.test(value)) return value
  if (value.startsWith('asset://')) throw new Error('Referencia asset:// inválida; usa asset://<id> tal como lo entrega la biblioteca de BytePlus.')
  const original = await readFile(resolve(value))
  const format = (await sharp(original).metadata()).format

  if (format === 'png' || format === 'jpeg' || format === 'webp') return `data:image/${format};base64,${original.toString('base64')}`

  return `data:image/png;base64,${(await sharp(original).png().toBuffer()).toString('base64')}`
}

const imageInput = bytePlusImageInput

/** Traduce rechazos accionables del fabricante; el resto conserva el código seguro de BytePlusError. */
export const explainBytePlusError = (error: unknown): unknown => {
  if (error instanceof BytePlusError && error.cause_ === 'asset_service_not_activated') {
    return new Error(`${error.message}. La cuenta no tiene activado el Asset Service: los asset:// no se pueden usar hasta activarlo en la consola de ModelArk (Open Management, región ap-southeast-1). Lo activa el operador; ver el ledger de retratos.`)
  }

  if (error instanceof BytePlusError && /PrivacyInformation/i.test(error.code)) {
    return new Error(`${error.message}. Seedance 2.x no acepta rostros humanos reales como entrada. Vías oficiales: una salida original de Seedream 5 o Seedance 2.x de esta misma cuenta (menos de 30 días, sin editar ni recomprimir), un personaje de la biblioteca digital (asset://) o un retrato autorizado. Ver el manual de BytePlus directo.`)
  }

  return error
}

const writeOutput = async (path: string, value: Buffer | string) => {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, value, { flag: 'wx' })
}

const exists = async (path: string) => {
  try { await access(path);

return true }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve,ms))

export const mainBytePlus = async (argv = process.argv.slice(2)) => {
  const { flags: f, media } = parseBytePlusArgs(argv)

  if (f.help || !argv.length) { process.stdout.write(HELP);

return }

  if (f.list) {
    for (const m of BYTEPLUS_MODELS) process.stdout.write(`${m.id.padEnd(20)} ${m.kind.padEnd(15)} ${m.model}${m.layers ? ' · Layerize' : ''}\n`)

    return
  }

  if (f.doctor) { process.stdout.write(`${JSON.stringify(await bytePlusDoctor())}\n`);

return }

  const model = findBytePlusModel(stringFlag(f,'model','seedream5-pro'))
  const prompt = f['prompt-file'] ? await readFile(resolve(String(f['prompt-file'])),'utf8') : stringFlag(f,'prompt')
  let raw: Record<string, unknown> = {}

  if (f['input-file']) {
    try { raw = JSON.parse(await readFile(resolve(String(f['input-file'])),'utf8')) }
    catch { throw new Error('--input-file debe contener JSON válido.') }

    if (!raw || Array.isArray(raw) || typeof raw !== 'object') throw new Error('--input-file debe contener un objeto JSON.')
  }

  const dry = Boolean(f.estimate || f['dry-run'])
  const root = resolve(stringFlag(f,'out-dir',join('ai-generations',`${new Date().toISOString().slice(0,10)}_byteplus`,randomUUID())))
  const out = resolve(stringFlag(f,'out',join(root,model.kind === 'image' ? 'image.png' : model.kind === 'video' ? 'video.mp4' : 'audio.mp3')))
  const taskId = stringFlag(f,'task-id')
  const maxUsd = f['max-usd'] ? Number(f['max-usd']) : null

  if (maxUsd !== null && (!Number.isFinite(maxUsd) || maxUsd <= 0)) throw new Error('--max-usd debe ser positivo.')

  const confirm = (usd: number | null) => {
    process.stdout.write(`BytePlus ${model.id}: ${usd === null ? 'precio variable, sin cota calculable' : `estimado USD ${usd.toFixed(4)}`}\n`)
    if (dry) return false
    if (!f.yes) throw new Error('Sólo preparación; --yes es obligatorio para generar.')
    if (usd !== null && maxUsd !== null && usd > maxUsd) throw new Error('La estimación supera --max-usd.')
    if (usd === null && maxUsd !== null) throw new Error('No hay cota verificable para aplicar --max-usd; usa el input exacto y confirma sin un tope ficticio.')

    return true
  }

  const receipt = async (data: Record<string,unknown>) => {
    await mkdir(root,{recursive:true})
    await writeFile(join(root,'receipt.json'),JSON.stringify({provider:'byteplus',model:model.model,...data},null,2)+'\n')
  }

  if (f.layers || stringFlag(f,'model').endsWith('-layerize')) {
    if (!model.layers || media.image.length !== 1 || /^https:/.test(media.image[0])) throw new Error('Layerize Pro/Flash necesita una imagen local.')
    if (!dry && !f.yes) throw new Error('--yes es obligatorio para separar capas.')
    await runBytePlusLayerize({ imagePath:resolve(media.image[0]), model:model.id as 'seedream5-pro'|'seedream5-flash', runRoot:root,
      prompt:prompt || undefined, dryRun:dry, yes:Boolean(f.yes), maxUsd:maxUsd ?? 1,
      imageSize:({ '1K':'auto_1K','1.5K':'auto_1.5K','2K':'auto_2K',auto:'auto' } as const)[stringFlag(f,'size','auto') as '1K'|'1.5K'|'2K'|'auto'] })

    return
  }

  if (!dry && !taskId && (await exists(out) || await exists(join(root,'receipt.json')))) throw new Error('Ya existe una salida o recibo; usa otra corrida o recupera por --task-id, sin generar de nuevo.')

  if (model.kind === 'image') {
    if (!prompt && typeof raw.prompt !== 'string') throw new Error('--prompt es obligatorio.')
    const size = String(raw.size ?? stringFlag(f,'size','2K'))
    const match = /^(\d+)x(\d+)$/.exec(size)
    const area = match ? Number(match[1])*Number(match[2]) : ({'1K':1024**2,'1.5K':1536**2,'2K':2048**2,'3K':3072**2,'4K':4096**2} as Record<string,number>)[size]

    if (!area) throw new Error('Tamaño no calculable; usa 1K|1.5K|2K|3K|4K|WxH.')
    if (raw.stream === true || raw.layer_decomposition === true) throw new Error('Usa --layers para capas; streaming de imagen no se expone en este comando.')
    const imageCount = media.image.length || (Array.isArray(raw.image) ? raw.image.length : raw.image ? 1 : 0)

    if (imageCount > 10) throw new Error('Máximo 10 referencias.')
    const count = raw.sequential_image_generation === 'auto' ? Number((raw.sequential_image_generation_options as {max_images?:number})?.max_images ?? 0) : 1

    if (!Number.isInteger(count) || count < 1 || count > 6 || (count > 1 && model.id !== 'seedream5-lite' && model.id !== 'seedream45' && model.id !== 'seedream4')) throw new Error('Número de imágenes inválido/no soportado.')
    const usd = bytePlusImageRate(model,area)*count + (model.id === 'seedream5-pro' ? Math.max(0,imageCount-1)*0.0027 : 0)

    if (!confirm(usd)) return
    const format = extname(out).toLowerCase() === '.png' ? 'png' : 'jpeg'

    const request = { ...raw, model:model.model, prompt:prompt || raw.prompt, size, output_format:format, response_format:'url',
      ...(media.image.length ? {image:await Promise.all(media.image.map(imageInput))} : {}) }

    // Seedream 4/4.5 sólo devuelve JPEG; la conversión local respeta la extensión pedida.
    if (model.id === 'seedream4' || model.id === 'seedream45') delete (request as Partial<typeof request>).output_format
    const result = await generateBytePlusImages(request).catch(error => { throw explainBytePlusError(error) })

    await receipt({ requestId:result.requestId, usage:result.data.usage, estimatedUsd:usd })

    for (let i=0;i<result.data.data.length;i++) {
      const item = result.data.data[i]

      if (item.error) throw new Error(`BytePlus no generó la imagen ${i}; receipt.json conserva la respuesta de uso.`)
      const file = result.data.data.length === 1 ? out : join(root,`image-${i+1}.${format === 'jpeg' ? 'jpg' : 'png'}`)
      const bytes = await readBytePlusOutput(item)
      const metadata = await sharp(bytes).metadata()
      const output = metadata.format === format ? bytes : format === 'png' ? await sharp(bytes).png().toBuffer() : await sharp(bytes).jpeg().toBuffer()

      await writeOutput(file,output)
      process.stdout.write(`${file}\n`)
    }

    return
  }

  if (model.kind === 'video') {
    let id = taskId
    let receiptMeta: Record<string, unknown> = {}
    const fromDraft = stringFlag(f,'from-draft')

    if (f.draft && fromDraft) throw new Error('Usa --draft para crear un borrador o --from-draft para finalizarlo, no ambos.')
    if ((f.draft || fromDraft) && !model.draft) throw new Error(`${model.id} no admite modo borrador; usa seedance25.`)

    if (fromDraft && !id) {
      // El fabricante reutiliza prompt, referencias, duración, ratio, seed y audio del borrador: reenviarlos es error.
      const resent = ['prompt','prompt-file','end-image','duration','aspect','operation','references','no-audio'].filter(key => f[key] !== undefined)

      if (resent.length || media.image.length || media.video.length || media.audio.length) {
        throw new Error(`Al finalizar un borrador no se reenvían prompt, referencias, duración, ratio ni audio (${[...resent, ...(media.image.length ? ['image'] : []), ...(media.video.length ? ['video'] : []), ...(media.audio.length ? ['audio'] : [])].join(', ')}).`)
      }

      const draftTask = (await getBytePlusVideo(fromDraft)).data

      if (draftTask.status !== 'succeeded') throw new Error(`El borrador ${fromDraft} está en ${draftTask.status}; sólo se finaliza un borrador terminado.`)
      if (draftTask.draft === false) throw new Error(`${fromDraft} no es un borrador.`)
      const expiry = bytePlusDraftExpiry(model, draftTask.created_at)

      if (expiry.known && expiry.expired) throw new Error(`El borrador ${fromDraft} venció el ${expiry.expiresAt}; genera uno nuevo.`)
      const resolution = stringFlag(f,'resolution',model.draft!.finalResolutions[0])
      const request = buildBytePlusDraftFinalRequest(model, fromDraft, { resolution, extra: raw })
      let usd: number | null = null

      // Cota con la tarifa sin video de entrada: si el borrador usó video, el cobro real es menor, nunca mayor.
      if (draftTask.ratio && draftTask.ratio !== 'adaptive' && Number.isInteger(draftTask.duration) && (draftTask.duration as number) > 0) {
        try {
          const [width,height] = bytePlusVideoDimensions(resolution, draftTask.ratio)

          usd = estimateBytePlusVideo(model,{ width, height, duration: draftTask.duration as number, resolution })
        } catch { usd = null }
      }

      if (!confirm(usd)) return
      const created = await createBytePlusVideo(request).catch(error => { throw explainBytePlusError(error) })

      id = created.data.id
      receiptMeta = { fromDraftTaskId: fromDraft, draftCreatedAt: draftTask.created_at ?? null, resolution }
      await receipt({ taskId:id, ...receiptMeta, estimatedUsd:usd })
      process.stdout.write(`Final ${id} desde el borrador ${fromDraft}; recuperar con --model ${model.id} --task-id ${id}.\n`)
      if (f.detach) return
    }

    if (!id) {
      if (!prompt && !Array.isArray(raw.content)) throw new Error('--prompt o content es obligatorio.')
      const requestedResolution = String(raw.resolution ?? stringFlag(f,'resolution', f.draft ? model.draft!.resolution : '720p'))

      if (f.draft && requestedResolution !== model.draft!.resolution) throw new Error(`El borrador sólo se genera a ${model.draft!.resolution}; la resolución final se elige al finalizar.`)
      if (f.draft && raw.draft === false) throw new Error('--draft contradice draft=false en --input-file.')
      const resolution = requestedResolution
      const operation = stringFlag(f,'operation','generate')
      const duration = Number(raw.duration ?? stringFlag(f,'duration','5'))
      const ratio = String(raw.ratio ?? stringFlag(f,'aspect','16:9'))

      if (!model.resolutions?.includes(resolution)) throw new Error('Resolución no soportada por este modelo.')
      if (!['generate','edit','extend'].includes(operation)) throw new Error('Operación de video inválida.')
      if (operation !== 'generate' && (model.id !== 'seedance25' || !media.video.length)) throw new Error('Editar/extender requiere Seedance 2.5 y video de entrada.')
      if (!Number.isInteger(duration) || duration < (model.id.startsWith('seedance2') ? 4 : 2) || duration > (model.maxDuration ?? 15)) throw new Error('Duración fuera del rango del modelo.')
      const shortSide = ({'480p':480,'720p':720,'1080p':1080,'4k':2160} as Record<string,number>)[resolution]
      const ratios = ratio.split(':').map(Number)

      if (ratios.length !== 2 || ratios.some(n=>!Number.isFinite(n)||n<=0)) throw new Error('Ratio debe ser ancho:alto positivo.')

      const [width,height] = model.id.startsWith('seedance2') ? bytePlusVideoDimensions(resolution,ratio) :
        ratios[0]>=ratios[1] ? [Math.round(shortSide*ratios[0]/ratios[1]),shortSide] : [shortSide,Math.round(shortSide*ratios[1]/ratios[0])]

      const hasInputVideo = media.video.length > 0 || Array.isArray(raw.content) && raw.content.some(item=>(item as {type?:string}).type==='video_url')
      const hasFirstFrame = !f.references && media.image.length > 0 || Array.isArray(raw.content) && raw.content.some(item=>(item as {role?:string}).role==='first_frame')
      const adaptive = model.id === 'seedance25' && (operation !== 'generate' || hasFirstFrame)
      const usd = operation !== 'generate' || hasInputVideo || adaptive ? null : estimateBytePlusVideo(model,{width,height,duration,resolution})

      if (!confirm(usd)) return
      const content: Record<string,unknown>[] = prompt ? [{type:'text',text:prompt}] : []

      for (let i=0;i<media.image.length;i++) content.push({type:'image_url',image_url:{url:await imageInput(media.image[i])},role:f.references ? 'reference_image' : 'first_frame'})
      if (!f.references && media.image.length > 1) throw new Error('Para múltiples referencias usa --references; --end-image fija el último cuadro.')
      if (f['end-image']) content.push({type:'image_url',image_url:{url:await imageInput(String(f['end-image']))},role:'last_frame'})
      for (const url of media.video) content.push({type:'video_url',video_url:{url:httpsMedia(url)},role:'reference_video'})
      for (const url of media.audio) content.push({type:'audio_url',audio_url:{url:httpsMedia(url)},role:'reference_audio'})

      const created = await createBytePlusVideo({ ...raw, model:model.model, content:content.length ? content : raw.content, resolution,
        ratio:adaptive ? 'adaptive' : ratio, duration:operation==='edit' ? -1 : duration,
        ...(!model.id.startsWith('seedance1-') ? { generate_audio:f['no-audio'] ? false : raw.generate_audio ?? true } : {}),
        ...(operation!=='generate' ? {omni_reference_task_type:operation} : {}),
        ...(f.draft ? {draft:true} : {}) }).catch(error => { throw explainBytePlusError(error) })

      id = created.data.id
      receiptMeta = f.draft ? { draft:true, resolution } : {}
      await receipt({taskId:id,...receiptMeta,estimatedUsd:usd})
      process.stdout.write(`${f.draft ? 'Borrador' : 'Tarea'} ${id}; recuperar con --model ${model.id} --task-id ${id}.\n`)
      if (f.detach) return
    }

    const deadline = Date.now()+30*60_000

    for (;;) {
      const result = await getBytePlusVideo(id)

      if (f.status) {process.stdout.write(`${JSON.stringify({id,status:result.data.status,usage:result.data.usage})}\n`);

return}

      if (result.data.status==='succeeded') {
        const isDraft = result.data.draft === true || receiptMeta.draft === true
        const expiry = isDraft ? bytePlusDraftExpiry(model, result.data.created_at) : { known: false as const }

        await receipt({taskId:id,...receiptMeta,status:result.data.status,usage:result.data.usage,
          ...(isDraft ? { draft:true, createdAt:result.data.created_at ?? null, draftExpiresAt:expiry.known ? expiry.expiresAt : null } : {})})
        if (!result.data.content?.video_url) throw new Error('Video succeeded sin salida; recuperar por task ID.')
        await writeOutput(out,await readBytePlusOutput({url:result.data.content.video_url}))
        process.stdout.write(`${out}\n`)
        if (isDraft) process.stdout.write(`Borrador listo. Final: --model ${model.id} --from-draft ${id}${expiry.known ? ` (vence ${expiry.expiresAt})` : ''}.\n`)

        return
      }

      if (['failed','cancelled','expired'].includes(result.data.status)) throw new Error(`Video ${id}: ${result.data.status}.`)
      if (Date.now()>deadline) throw new Error(`Timeout; la tarea sigue en ${id}. No reencolar.`)
      await sleep(5_000)
    }
  }

  if (model.kind==='audio') {
    if (!prompt && !raw.text_prompt) throw new Error('--prompt es obligatorio para Seed Audio.')
    if (!confirm(null)) return
    const result = await generateBytePlusAudio({...raw,text_prompt:prompt || raw.text_prompt,audio_config:raw.audio_config ?? {format:'mp3',sample_rate:24000}})
    const audio = result.data.audio ? Buffer.from(result.data.audio,'base64') : await readBytePlusOutput({url:result.data.url})

    await receipt({requestId:result.requestId,duration:result.data.duration,originalDuration:result.data.original_duration})
    await writeOutput(out,audio)
    process.stdout.write(`${out}\n`)

    return
  }

  if (model.kind==='tts') {
    if (stringFlag(f,'operation')==='enroll') {
      if (!model.id.startsWith('voice') || !f.consent || !raw.speaker_id || !raw.audio) throw new Error('Enrollment exige voice1|voice2, --consent y JSON con speaker_id adquirido + audio.')
      if (!confirm(null)) return
      const result = await bytePlusRequest<Record<string,unknown>>('speech','/api/v3/tts/voice_clone',{method:'POST',body:raw})

      await receipt({requestId:result.requestId,status:result.data.status})
      process.stdout.write(`Enrollment enviado; estado ${result.data.status}. No se compraron slots.\n`)

      return
    }

    const req = raw.req_params as Record<string,unknown> | undefined
    const speaker = stringFlag(f,'speaker',typeof req?.speaker==='string' ? req.speaker : '')

    if (!speaker || (!prompt && !req?.text)) throw new Error('TTS necesita --speaker y --prompt, o req_params completo.')
    if (!confirm(null)) return

    const result = await generateBytePlusTts(model.resource!,{...raw,user:raw.user ?? {uid:'efeonce-operator'},
      req_params:{...req,text:prompt || req?.text,speaker,audio_params:req?.audio_params ?? {format:'mp3',sample_rate:24000}}})

    await receipt({requestId:result.requestId,resource:model.resource})
    await writeOutput(out,result.audio)
    process.stdout.write(`${out}\n`)

    return
  }

  if (model.kind==='asr-file') {
    let id=taskId

    if (!id) {
      if (!raw.audio && media.audio.length!==1) throw new Error('ASR file exige --audio https://... o JSON con audio.url.')
      if (!confirm(null)) return
      id=randomUUID()
      const input = {...raw,user:raw.user ?? {uid:'efeonce-operator'},audio:raw.audio ?? {url:httpsMedia(media.audio[0])},request:raw.request ?? {model_name:'bigmodel',enable_itn:true,enable_punc:true}}

      await submitBytePlusAsrFile(model.resource!,input,id)
      await receipt({taskId:id,resource:model.resource})
      process.stdout.write(`ASR task ${id}; recuperar con --model ${model.id} --task-id ${id}.\n`)
      if (f.detach) return
    }

    const deadline=Date.now()+30*60_000

    for (;;) {
      const result=await queryBytePlusAsrFile(model.resource!,id)

      if (f.status) {process.stdout.write(`ASR ${id}: ${result.status}\n`);

return}

      if (result.data) {const file=f.out ? out : join(root,'transcript.json');

await writeOutput(file,JSON.stringify(result.data,null,2)+'\n');process.stdout.write(`${file}\n`);

return}

      if (Date.now()>deadline) throw new Error(`Timeout ASR; recuperar task ${id}, sin reencolar.`)
      await sleep(5_000)
    }
  }

  if (model.kind==='asr-stream' || model.kind==='interpretation') {
    if (media.audio.length!==1 || /^https?:/.test(media.audio[0])) throw new Error('Streaming requiere un archivo local PCM/WAV y configuración --input-file.')
    if (!confirm(null)) return
    const {runBytePlusSpeechStream}=await import('@/lib/ai/byteplus-speech-stream')
    const result=await runBytePlusSpeechStream(model,await readFile(resolve(media.audio[0])),raw)

    await receipt({requestId:result.requestId,resource:model.resource})
    const file=f.out ? out : join(root,'transcript.json')

    await writeOutput(file,JSON.stringify(result.events,null,2)+'\n')
    if (result.audio?.length) await writeOutput(join(root,'interpreted.pcm'),result.audio)
    process.stdout.write(`${file}\n`)

    return
  }

  throw new Error('Transporte no implementado para este modelo.')
}

if (process.argv[1]?.endsWith('/byteplus.ts')) mainBytePlus().catch(error=>{
  // Errores fetch no imprimen URL, stack, prompt ni credenciales.
  console.error(error instanceof Error && !/fetch failed|ENOTFOUND|ECONN/.test(error.message) ? error.message : 'BytePlus: fallo de transporte; no se reintentó la generación.')
  process.exitCode=1
})
